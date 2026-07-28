"""Find and load mammogram images from a folder (DICOM / PNG / JPG).

Handles any folder layout (subfolders are searched too). DICOMs are
anonymized on load.
"""
import os
import re
import numpy as np
from PIL import Image
from utils.dicom_utils import dicom_to_array, preprocess_for_model, extract_dicom_metadata

IMAGE_EXTS = (".dcm", ".dicom", ".png", ".jpg", ".jpeg")

# Standard mammography acquisition order (Series 1-4)
SERIES_TO_VIEW = {1: "LCC", 2: "RCC", 3: "L-MLO", 4: "R-MLO"}


def find_images(folder):
    """Recursively find all supported images under `folder`."""
    hits = []
    for root, _dirs, files in os.walk(folder):
        for f in files:
            if f.lower().endswith(IMAGE_EXTS):
                hits.append(os.path.join(root, f))
    return sorted(hits)


def load_image(path):
    """Load one file -> preprocessed uint8 array (DICOM is anonymized)."""
    if path.lower().endswith((".dcm", ".dicom")):
        raw = dicom_to_array(path)
    else:
        raw = np.array(Image.open(path).convert("L"))
    return preprocess_for_model(raw)


def load_image_raw(path):
    """Load one file -> uncropped, original-resolution uint8 array for interactive PACS viewing."""
    if path.lower().endswith((".dcm", ".dicom")):
        return dicom_to_array(path, apply_voi=True)
    else:
        return np.array(Image.open(path).convert("L"))


def _extract_patient_key(path):
    """Extract a stable patient grouping key from the folder path.
    
    Folder structure is:
      .../PATIENT_NAME MRN/DATE TIME/IMG-NNNN-NNNNN.dcm
    OR:
      .../JPEG-Cases/PATIENT_NAME MRN/DATE TIME/IMG-NNNN-NNNNN.jpg
    OR:
      .../All Cases/ALPHANUMERICID.dcm
    
    We group by the patient-name-level directory.
    """
    parts = path.replace("\\", "/").split("/")
    fname = parts[-1]
    
    # Walk up from the file to find the patient-name directory
    # Skip known non-patient directories
    skip_dirs = {"jpeg-cases", "dicom-cases", "all cases", "organized_studies"}
    
    for i in range(len(parts) - 2, -1, -1):
        dirname = parts[i]
        if dirname.lower() in skip_dirs:
            continue
        # Check if this looks like a patient folder (has letters + optional MRN digits)
        if re.search(r'[A-Za-z]', dirname) and dirname.lower() not in skip_dirs:
            # Extract MRN if present (trailing digits)
            mrn_match = re.search(r'(\d{5,})$', dirname.strip())
            mrn = mrn_match.group(1) if mrn_match else ""
            name_part = dirname[:mrn_match.start()].strip() if mrn_match else dirname
            name_clean = name_part.replace("_", " ").replace("-", " ").strip()
            return name_clean, mrn, dirname
    
    # Fallback: use parent directory name
    parent = parts[-2] if len(parts) >= 2 else "Unknown"
    return parent, "", parent


def _detect_view_from_series(path):
    """Detect mammographic view from DICOM tags, filenames, or SeriesNumber."""
    _, ext = os.path.splitext(path)
    
    if ext.lower() in (".dcm", ".dicom"):
        try:
            import pydicom
            ds = pydicom.dcmread(path, stop_before_pixels=True)
            
            # Try explicit DICOM tags first
            lat = str(ds.get("ImageLaterality", ds.get("Laterality", ""))).strip()
            vp = str(ds.get("ViewPosition", "")).strip()
            if lat and vp:
                side = "Right" if lat == "R" else "Left"
                return f"{lat}{vp}", f"{side} Breast"
            
            # Fall back to SeriesNumber convention
            sn = int(ds.get("SeriesNumber", 0))
            if sn in SERIES_TO_VIEW:
                view = SERIES_TO_VIEW[sn]
                side = "Right Breast" if "R" in view else "Left Breast"
                return view, side
        except Exception:
            pass
    
    # Try filename-based detection
    fname_upper = os.path.splitext(os.path.basename(path))[0].upper()
    if "RCC" in fname_upper or "R_CC" in fname_upper:
        return "RCC", "Right Breast"
    elif "LCC" in fname_upper or "L_CC" in fname_upper:
        return "LCC", "Left Breast"
    elif "RMLO" in fname_upper or "R_MLO" in fname_upper:
        return "R-MLO", "Right Breast"
    elif "LMLO" in fname_upper or "L_MLO" in fname_upper:
        return "L-MLO", "Left Breast"
    
    # Last resort: use IMG number in filename
    m = re.search(r'IMG-(\d+)', os.path.basename(path).upper())
    if m:
        img_num = int(m.group(1))
        if img_num in SERIES_TO_VIEW:
            view = SERIES_TO_VIEW[img_num]
            side = "Right Breast" if "R" in view else "Left Breast"
            return view, side
    
    return "Standard", "Unspecified"


def ocr_enrich_patient_data(patient_group, progress_callback=None):
    """Run OCR on each view to extract burned-in projection labels, age, etc.
    
    Updates the patient_group dict in place with OCR-extracted data.
    Returns a summary dict of OCR-extracted metadata per patient.
    
    Parameters
    ----------
    patient_group : dict
        A single patient entry from group_files_by_patient().
    progress_callback : callable, optional
        Called with (current_idx, total) for progress tracking.
    
    Returns
    -------
    dict with keys: ocr_age, ocr_views_detected, ocr_raw_texts
    """
    from utils.ocr import ocr_mammogram
    
    views = patient_group["views"]
    ocr_summary = {"ocr_age": None, "ocr_views_detected": 0, "ocr_raw_texts": []}
    
    for i, v in enumerate(views):
        if progress_callback:
            progress_callback(i, len(views))
        
        try:
            raw = load_image_raw(v["path"])
            ocr_result = ocr_mammogram(raw)
            
            # Update projection from OCR if detected (more reliable than SeriesNumber)
            if ocr_result["view"]:
                v["projection"] = ocr_result["view"]
                v["side"] = ocr_result["side"]
                ocr_summary["ocr_views_detected"] += 1
            
            # Capture age (same across all views for a patient)
            if ocr_result["age"] and not ocr_summary["ocr_age"]:
                ocr_summary["ocr_age"] = ocr_result["age"]
            
            # Store raw OCR text
            v["ocr_text"] = ocr_result["all_text"]
            v["ocr_raw"] = ocr_result["raw_texts"]
            ocr_summary["ocr_raw_texts"].append({
                "file": v["filename"],
                "text": ocr_result["all_text"]
            })
        except Exception as e:
            v["ocr_text"] = f"OCR Error: {e}"
            v["ocr_raw"] = []
    
    if progress_callback:
        progress_callback(len(views), len(views))
    
    return ocr_summary


def group_files_by_patient(file_list):
    """Group image files into patient studies with exactly 4 deduplicated views."""
    patients = {}
    
    for path in file_list:
        _, ext = os.path.splitext(path)
        is_dicom = ext.lower() in (".dcm", ".dicom")
        
        name_clean, mrn, raw_dir = _extract_patient_key(path)
        patient_key = f"{name_clean.upper()}|{mrn}"
        
        if patient_key not in patients:
            patients[patient_key] = {
                "patient_name": name_clean.title(),
                "patient_id": mrn or "N/A",
                "folder": raw_dir,
                "proj_map": {}
            }
        
        proj, side = _detect_view_from_series(path)
        
        view_entry = {
            "path": path,
            "filename": os.path.basename(path),
            "projection": proj,
            "side": side,
            "is_dicom": is_dicom
        }
        
        # Deduplicate: DICOM takes priority over JPEG for same projection
        existing = patients[patient_key]["proj_map"].get(proj)
        if not existing or (is_dicom and not existing["is_dicom"]):
            patients[patient_key]["proj_map"][proj] = view_entry
    
    # Format output with standard view ordering
    result = []
    standard_order = ["LCC", "RCC", "L-MLO", "R-MLO"]
    
    for p_key, p_data in patients.items():
        ordered_views = []
        for view_name in standard_order:
            if view_name in p_data["proj_map"]:
                ordered_views.append(p_data["proj_map"][view_name])
        # Append non-standard views
        for proj_k, v_obj in p_data["proj_map"].items():
            if proj_k not in standard_order:
                ordered_views.append(v_obj)
        
        result.append({
            "patient_name": p_data["patient_name"],
            "patient_id": p_data["patient_id"],
            "folder": p_data["folder"],
            "views": ordered_views
        })
    
    # Sort patients alphabetically
    result.sort(key=lambda x: x["patient_name"])
    return result
