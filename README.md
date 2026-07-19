# Mammo-FM Diagnostic Accuracy Study - Research Console

Local, offline **Streamlit** app for external validation of **Mammo-FM** against
histopathology at PGMI / Lahore General Hospital, Department of Radiology.

> Companion tool to the UHS MD Radiology synopsis:
> *"Diagnostic Accuracy of a Breast-Specific AI Foundation Model (Mammo-FM) in
> Detection of Breast Cancer on Mammograms, Taking Histopathology as the Gold
> Standard."*

## Features
- **Inference & Logging** - anonymize a DICOM, run Mammo-FM, log a *blinded*
  malignancy score (histopathology is entered separately to preserve blinding).
- **Analysis Dashboard** - 2x2 table, sensitivity / specificity / PPV / NPV /
  accuracy (Wilson 95% CI), ROC/AUC, Cohen's kappa vs radiologist BI-RADS.
- **Two storage backends** - simple `results.csv` (default) OR a normalised
  **SQLite** database (`db/schema.sql`) that also supports Mammo-CLIP comparison.

## Project structure
```
mammo-fm-study/
|- app.py                    # Home
|- pages/
|  |- 1_Inference.py         # Blinded inference + logging
|  |- 2_Dashboard.py         # Metrics + ROC/AUC
|- model/
|  |- mammo_fm_wrapper.py    # Loads Mammo-FM  [FILL THE ADAPT BLOCK]
|  |- weights/               # Put mammo_fm.pth here (not committed)
|- utils/
|  |- dicom_utils.py         # Anonymize + preprocess DICOM
|  |- data_store.py          # CSV backend
|  |- db.py                  # SQLite backend
|- db/
|  |- schema.sql             # SQLite tables + analysis view
|- pilot_test.py             # Single-image smoke test (run this FIRST)
|- seed_demo_db.py           # Synthetic data to preview the dashboard
|- requirements.txt
```

## Setup (Windows + RTX 4050 6GB, via WSL2)
```bash
wsl --install                         # PowerShell (admin), then reboot
conda create -n mammofm python=3.10 -y
conda activate mammofm
pip install torch==2.2.2 torchvision==0.17.2 \
  --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt
```

## Before real data (pilot)
1. Download Mammo-FM weights into `model/weights/mammo_fm.pth`
   (huggingface.co/batmanLab/Mammo-FM, Apache-2.0).
2. Fill the `# ===== ADAPT TO REPO =====` block in
   `model/mammo_fm_wrapper.py` using the repo README.
3. Smoke-test on a PUBLIC image (not patient data):
   ```bash
   python pilot_test.py path/to/public_image.dcm
   ```

## Preview the dashboard with synthetic data
```bash
python seed_demo_db.py       # creates data/study.db with fake cases
sqlite3 data/study.db "SELECT * FROM v_analysis LIMIT 5;"
```

## Run the app
```bash
streamlit run app.py
```

## SQLite quick reference
```bash
sqlite3 data/study.db < db/schema.sql      # build schema
# confusion matrix in one query:
sqlite3 data/study.db "SELECT model_name, \
  SUM(y_true=1 AND y_pred=1) tp, SUM(y_true=0 AND y_pred=0) tn, \
  SUM(y_true=0 AND y_pred=1) fp, SUM(y_true=1 AND y_pred=0) fn \
  FROM v_analysis WHERE y_true IS NOT NULL GROUP BY model_name;"
```

## Ethics & privacy
- Process **anonymized** images only; PHI tags are stripped on load.
- All computation is **offline**; nothing is uploaded to any cloud service.
- Requires Institutional ERC approval before use on patient data.
- AI output is research-only and must not influence clinical management.

## Fallback
If Mammo-FM deployment is infeasible, the same app works with **Mammo-CLIP** -
only `model/mammo_fm_wrapper.py` changes.
