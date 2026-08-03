"""FastAPI Server for Mammo-FM Medical AI Platform.

Provides REST API endpoints for:
- Clinical DICOM/Image Inference & Heatmap Generation
- Interactive Patient Case CRUD Management
- SPSS Coded Data Export & Statistical Metrics (AUC, Sens, Spec, Cohen's Kappa)
- Model Integrity & 5-Fold Benchmark Audit Data
"""
import os
import io
import base64
import cv2
import numpy as np
import pandas as pd
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from db.session import engine, Base, get_db
from db.models import StudyCase, AIInference, MetricSnapshot
from utils.data_store import load_data, save_data
from utils.metrics import norm_truth, birads_pos, diagnostic_metrics, metrics_table, spss_ready

# Initialize DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mammo-FM Medical AI API",
    description="Backend API powering the Mammo-FM Clinical Radiology & Research Platform",
    version="1.8.0"
)

# CORS middleware for React Vite Dev Server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Model Lazy Loader
MAMMO_MODEL = None


def get_model():
    global MAMMO_MODEL
    if MAMMO_MODEL is None:
        ckpt_path = "model/weights/Mammo-FM_BatmanlabTrained_CLIP.tar"
        head_path = "model/weights/linear_head.joblib"
        if not os.path.exists(ckpt_path):
            raise HTTPException(status_code=500, detail="Mammo-FM backbone checkpoint missing.")
        from model.mammo_fm_wrapper import MammoFM
        MAMMO_MODEL = MammoFM(checkpoint_path=ckpt_path, head_path=head_path)
    return MAMMO_MODEL


# Pydantic Schemas
class PatientCaseSchema(BaseModel):
    serial_no: Optional[int] = None
    patient_name: Optional[str] = ""
    anonymized_id: str
    date: Optional[str] = ""
    age: Optional[int] = None
    breast_side: Optional[str] = "Bilateral"
    lesion_side: Optional[str] = "None / Normal"
    lesion_quadrant: Optional[str] = "N/A"
    radiological_finding: Optional[str] = "Normal"
    breast_density: Optional[str] = "B"
    lesion_size_mm: Optional[float] = 0.0
    radiologist_birads: Optional[str] = "1"
    mammo_fm_prob: Optional[float] = None
    mammo_fm_class: Optional[str] = None
    histopathology: Optional[str] = ""
    histopath_type: Optional[str] = ""
    examiner: Optional[str] = ""


# Routes
@app.get("/api/health")
def health_check():
    import torch
    cuda_avail = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if cuda_avail else "CPU Only"
    return {
        "status": "online",
        "model_version": "Mammo-FM v1.8",
        "cuda_available": cuda_avail,
        "gpu_name": gpu_name,
        "pytorch_version": torch.__version__
    }


import json

@app.get("/api/patients")
def get_patients():
    df = load_data()
    # Safely convert NaN/NaT to null for JSON compliance
    return json.loads(df.to_json(orient="records"))


@app.post("/api/patients")
def save_patient(case: PatientCaseSchema):
    df = load_data()
    row_dict = case.model_dump()
    
    # Check if patient exists
    idx = df[df["anonymized_id"] == case.anonymized_id].index
    if len(idx) > 0:
        for k, v in row_dict.items():
            if v is not None:
                df.loc[idx[0], k] = v
    else:
        if row_dict.get("serial_no") is None:
            row_dict["serial_no"] = len(df) + 1
        df = pd.concat([df, pd.DataFrame([row_dict])], ignore_index=True)

    save_data(df)
    return {"message": "Patient record saved successfully", "case": row_dict}


@app.delete("/api/patients/{anonymized_id}")
def delete_patient(anonymized_id: str):
    df = load_data()
    df = df[df["anonymized_id"] != anonymized_id]
    save_data(df)
    return {"message": f"Patient {anonymized_id} deleted."}


@app.post("/api/predict")
async def predict_mammogram(file: UploadFile = File(...)):
    contents = await file.read()
    filename = file.filename.lower()
    
    # Parse DICOM or Image
    if filename.endswith(".dcm"):
        import pydicom
        from utils.dicom_utils import dicom_to_u8
        ds = pydicom.dcmread(io.BytesIO(contents))
        img_u8 = dicom_to_u8(ds)
    else:
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file format.")
        img_u8 = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    model = get_model()
    prob, overlay_bgr, bbox = model.predict_heatmap_and_bbox(img_u8)
    
    # Encode overlay to JPEG base64
    _, buffer = cv2.imencode(".jpg", overlay_bgr)
    b64_overlay = base64.b64encode(buffer).decode("utf-8")

    # Map probability to BI-RADS risk & class
    pred_class = "Malignant" if prob >= 0.50 else "Benign"
    birads_est = "5" if prob >= 0.80 else ("4C" if prob >= 0.65 else ("4B" if prob >= 0.50 else ("3" if prob >= 0.30 else "1")))

    return {
        "filename": file.filename,
        "probability": round(prob, 4),
        "percentage": round(prob * 100, 1),
        "predicted_class": pred_class,
        "estimated_birads": birads_est,
        "overlay_base64": f"data:image/jpeg;base64,{b64_overlay}",
        "bounding_box": bbox
    }


@app.get("/api/metrics")
def get_metrics(threshold: float = Query(0.5, ge=0.0, le=1.0)):
    df = load_data()
    y = df["histopathology"].apply(norm_truth)
    prob = pd.to_numeric(df["mammo_fm_prob"], errors="coerce")
    y_rad = df["radiologist_birads"].apply(birads_pos) if "radiologist_birads" in df.columns else None

    mask = y.notna() & prob.notna()
    if mask.sum() == 0:
        return {"n": 0, "message": "No completed cases with histopathology + AI prob."}

    y_clean = y[mask].astype(int).values
    prob_clean = prob[mask].values
    y_rad_clean = y_rad[mask].values if y_rad is not None else None

    m = diagnostic_metrics(y_clean, prob_clean, y_rad=y_rad_clean, threshold=threshold)
    table = metrics_table(m)
    return {
        "summary": m,
        "table": table.to_dict(orient="records")
    }


@app.get("/api/export/spss")
def export_spss():
    df = load_data()
    spss_df = spss_ready(df)
    csv_bytes = spss_df.to_csv(index=False).encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mammo_fm_spss_ready.csv"}
    )


@app.get("/api/benchmark")
def get_benchmark_audit():
    return {
        "benchmark_dataset": "VinDr-Mammo (Nguyen et al., 2023)",
        "paper_citation": "Nature Scientific Data 10, 277 (2023)",
        "kaggle_notebook_url": "https://www.kaggle.com/code/doceducates/mammofm-classifier-training",
        "sample_size": 20000,
        "benign_count": 19012,
        "malignant_count": 988,
        "feature_dim": 2048,
        "cv_strategy": "5-Fold Stratified Cross-Validation",
        "mean_auc": 0.8107,
        "auc_sd": 0.0126,
        "auc_ci_95": [0.786, 0.835],
        "overall_sensitivity": 0.5941,
        "overall_specificity": 0.8669,
        "folds": [
            {"fold": 1, "auc": 0.8170, "sensitivity": 0.6224, "specificity": 0.8653},
            {"fold": 2, "auc": 0.7937, "sensitivity": 0.5838, "specificity": 0.8687},
            {"fold": 3, "auc": 0.8009, "sensitivity": 0.5888, "specificity": 0.8647},
            {"fold": 4, "auc": 0.8286, "sensitivity": 0.6091, "specificity": 0.8679},
            {"fold": 5, "auc": 0.8133, "sensitivity": 0.5663, "specificity": 0.8679}
        ]
    }


# ==========================================
# SYNOPSIS & THESIS HUB ENDPOINTS
# ==========================================

from fastapi.responses import FileResponse
from pydantic import BaseModel
from utils.synopsis_service import (
    get_synopsis_text,
    save_synopsis_text,
    list_synopsis_versions,
    restore_synopsis_version,
    generate_synopsis_docx,
    generate_synopsis_pdf
)

class SynopsisUpdateRequest(BaseModel):
    content: str
    version_tag: str = "Draft Update"
    author: str = "Dr. Muhammad Mudassir"

@app.get("/api/synopsis")
def get_synopsis():
    """Retrieve full humanized research synopsis text."""
    return {"content": get_synopsis_text()}

@app.post("/api/synopsis")
def update_synopsis(req: SynopsisUpdateRequest):
    """Save updated research synopsis text to database and disk."""
    save_synopsis_text(req.content, version_tag=req.version_tag, author=req.author)
    return {"status": "success", "message": "Synopsis updated and saved to database successfully!"}

@app.get("/api/synopsis/versions")
def get_synopsis_versions():
    """List all saved synopsis versions from database."""
    return {"versions": list_synopsis_versions()}

@app.post("/api/synopsis/versions/restore/{version_id}")
def restore_version(version_id: int):
    """Restore a specific synopsis version."""
    success = restore_synopsis_version(version_id)
    if not success:
        return Response(content=json.dumps({"error": "Version not found"}), status_code=404, media_type="application/json")
    return {"status": "success", "message": f"Version {version_id} restored successfully!"}

@app.get("/api/synopsis/export/docx")
def export_synopsis_docx():
    """Download UHS-compliant Word (.docx) synopsis."""
    out_dir = os.path.join(os.path.dirname(__file__), "data", "exports")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "UHS_Research_Synopsis_Humanized.docx")
    generate_synopsis_docx(out_path)
    return FileResponse(
        path=out_path,
        filename="UHS_Research_Synopsis_Humanized.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

@app.get("/api/synopsis/export/pdf")
def export_synopsis_pdf():
    """Download PDF format synopsis."""
    out_dir = os.path.join(os.path.dirname(__file__), "data", "exports")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "UHS_Research_Synopsis_Humanized.pdf")
    generate_synopsis_pdf(out_path)
    return FileResponse(
        path=out_path,
        filename="UHS_Research_Synopsis_Humanized.pdf",
        media_type="application/pdf"
    )



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)

