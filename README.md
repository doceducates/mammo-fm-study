# Mammo-FM Diagnostic Accuracy Study - Research Console

Local, offline **Streamlit** app for external validation of **Mammo-FM** against
histopathology at PGMI / Lahore General Hospital, Department of Radiology.

> Companion tool to the UHS MD Radiology synopsis:
> *"Diagnostic Accuracy of a Breast-Specific AI Foundation Model (Mammo-FM) in
> Detection of Breast Cancer on Mammograms, Taking Histopathology as the Gold
> Standard."*

## Features
- **Model Setup** - check GPU/VRAM, download Mammo-FM weights from Hugging Face,
  and load/unload the model in memory (cached across pages).
- **Inference & Logging** - anonymize a DICOM, run Mammo-FM, log a *blinded*
  malignancy score (histopathology is entered separately to preserve blinding).
- **Analysis Dashboard** - 2x2 table, sensitivity / specificity / PPV / NPV /
  accuracy (Wilson 95% CI), ROC/AUC, Cohen's kappa vs radiologist BI-RADS.
- **Two storage backends** - simple `results.csv` (default) OR a normalised
  **SQLite** database (`db/schema.sql`) that also supports Mammo-CLIP comparison.
- **Batch Import** - point at a folder of mammograms and score them all at once.
- **Exports + SPSS verification** - metrics summary, SPSS-ready CSV, and a step-
  by-step guide (SPSS_VERIFICATION.md) to reproduce every number in SPSS/MedCalc.

## In plain English: what does the model output?

Mammo-FM is a *feature extractor*, not a ready-made cancer detector. On its own
it turns each mammogram into a list of numbers (an "embedding") describing the
image - it does NOT say "cancer" or "benign" by itself.

To get a malignancy score you do this ONCE:
1. Collect labeled images (histopathology-proven benign vs malignant).
2. Run `python train_linear_probe.py` - this trains a tiny classifier on top.

After that, the app outputs a **malignancy probability between 0 and 1**
(e.g. 0.87 = 87% suspicious). Default threshold is 0.5: >=0.5 -> "Malignant".

## How to add your data (DICOM / PNG / JPG / whole folders)

No renaming or special structure needed:

**Option A - one folder for everything (best for bulk):**
1. Copy ALL your mammograms into `data/incoming/` (subfolders are fine).
2. Open the app -> **Batch Import** page -> *Scan folder* -> *Run*.
3. It anonymizes + scores every image and logs the results automatically.

**Option B - one image at a time:**
Use the **Inference & Logging** page and upload a single DICOM/PNG/JPG.

**For TRAINING the cancer head**, sort labeled images into:
```
data/labeled/malignant/   <- histopathology-proven cancers
data/labeled/benign/      <- histopathology-proven benign
```
then run `python train_linear_probe.py`.

DICOM files are anonymized on load (patient name / ID / dates are stripped).

## Project structure
```
mammo-fm-study/
|- app.py                    # Home
|- pages/
|  |- 0_Model_Setup.py       # Download weights + load into memory
|  |- 1_Inference.py         # Blinded inference + logging
|  |- 2_Dashboard.py         # Metrics + ROC/AUC
|  |- 3_Batch_Import.py      # Import + score a whole folder at once
|- model/
|  |- mammo_fm_wrapper.py    # Loads Mammo-FM  [FILL THE ADAPT BLOCK]
|  |- loader.py              # Cached loader + HF download + device info
|  |- weights/               # Put mammo_fm.pth here (not committed)
|- utils/
|  |- dicom_utils.py         # Anonymize + preprocess DICOM
|  |- data_store.py          # CSV backend
|  |- db.py                  # SQLite backend
|  |- ingest.py              # Folder scanning + image loading
|  |- metrics.py             # Shared metric formulas (dashboard + CLI identical)
|- db/
|  |- schema.sql             # SQLite tables + analysis view
|- check_gpu.py              # Diagnose 'No CUDA GPU detected'
|- pilot_test.py             # Single-image smoke test (run this FIRST)
|- train_linear_probe.py     # Train the cancer head on labeled images
|- compute_metrics.py        # Recompute all metrics from CSV (SPSS cross-check)
|- SPSS_VERIFICATION.md      # How to verify every metric in SPSS / MedCalc
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
1. Download the checkpoint **`Mammo-FM_BatmanlabTrained_CLIP.tar`** into
   `model/weights/` (trained on BU + UPMC + EMBED -> best external
   generalization; used in the repo's own eval scripts). The other file,
   `Mammo-FM_ASU_Trained_CLIP.tar`, is the Mayo-only checkpoint.
   Note: weights are under a **Custom Academic License** (non-commercial
   academic research only, no clinical/diagnostic deployment) - fine for this
   validation study; cite the paper. The image encoder is EfficientNet-B5 and
   the checkpoint has **no cancer head**, so you must add a linear probe / fine-
   tune to get malignancy scores.
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
