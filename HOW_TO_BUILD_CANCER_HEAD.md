# How to Build the Cancer Head (Two Methods)

Mammo-FM is a foundation model that extracts 2048-dimensional feature vectors from mammogram images. The **cancer head** is a linear classifier (logistic regression) that converts those feature vectors into a malignant/benign probability.

To ensure your research is scientifically defensible for your thesis defense before the Advanced Research Board (UHS), you must train this head **once** on an **external public dataset**, freezing the classifier before evaluating on your local LGH patient cohort. This maintains a rigorous external-validation design.

---

## Method 1: Google Colab / Kaggle with VinDr-Mammo (⭐ RECOMMENDED FOR THESIS)

Why is this recommended over local CMMD training?
1. **20x More Training Data:** ~20,000 images vs. CMMD's ~1,026 images.
2. **Zero Preprocessing:** VinDr-Mammo PNG images on Kaggle are already preprocessed to `1520x912`—the exact resolution Mammo-FM requires.
3. **Paper Verification:** Mammo-FM was evaluated on VinDr in the official paper (arXiv:2512.00198), allowing direct cross-checking of your 5-fold cross-validation AUC against published benchmarks.
4. **No TCIA/NBIA Retriever Needed:** Downloads cleanly via the Kaggle API directly in the cloud GPU environment.

### Step 1: Open Google Colab or Kaggle Notebooks
1. Create a new notebook on Google Colab or Kaggle.
2. Set the runtime/accelerator to **T4 GPU** (or A100 if available).

### Step 2: Upload and Run the Script
1. Upload `train_linear_probe_colab.py` (located in this repository) to your Colab/Kaggle environment.
2. Run the script in a notebook cell:
   ```python
   !python train_linear_probe_colab.py
   ```
3. The script will automatically:
   - Download the official Mammo-FM backbone checkpoint from HuggingFace.
   - Clone the official `batmanlab/Mammo-FM` repository for architecture definitions.
   - Download the VinDr-Mammo dataset and map breast-level BI-RADS scores to binary labels (BI-RADS 4/5 = Malignant, 1–3 = Benign).
   - Extract 2048-dim features and perform **5-Fold Stratified Cross-Validation**.
   - Output the trained weights file: `linear_head.joblib`.

### Step 3: Deploy to Local App
1. Download `linear_head.joblib` from Colab/Kaggle.
2. Place it into your local project folder:
   ```
   E:\Research\mammo-fm-study\model\weights\linear_head.joblib
   ```
3. Restart your Streamlit application (`streamlit run app.py`). Your tool is now running with a clinically valid, scientifically defensible cancer head.

---

## Method 2: Local UI with CMMD Dataset (Alternative / Offline)

If you prefer to build the classifier locally using your own PC:

### Step 1: Download CMMD (One-Time)
1. Visit The Cancer Imaging Archive (TCIA): https://www.cancerimagingarchive.net/collection/cmmd/
2. Download the **DICOM images** via the NBIA Data Retriever and the clinical data spreadsheet `CMMD_clinicaldata_revision.xlsx`.
3. Save them to a local directory, e.g., `data/cmmd/`.

### Step 2: Sort Images via UI
1. Open the local app (`streamlit run app.py`) and navigate to the **🧠 Build Cancer Head** page.
2. In Section 2, enter your CMMD directory path and the clinical spreadsheet path.
3. Click **📥 Sort CMMD into benign / malignant**. The app will parse patient IDs and laterality, copying images into `data/labeled/benign/` and `data/labeled/malignant/`.

### Step 3: Train via UI or CLI
1. In Section 4 of the UI, click **🚀 Train Cancer Head**.
2. Alternatively, run via terminal:
   ```bash
   python train_linear_probe.py
   ```
3. This extracts features, trains the logistic regression probe, and writes `model/weights/linear_head.joblib`.

---

## Thesis & Defense Documentation Notes

When defending your research or writing your methodology chapter, use the following wording to describe the cancer classification head:

> *"The classification head (logistic regression with balanced class weights) was trained using frozen 2048-dimensional feature representations extracted by the Mammo-FM foundation backbone. To prevent data leakage and ensure an unbiased external validation design, the classification probe was developed strictly on external public mammography data (VinDr-Mammo / CMMD) and evaluated using 5-fold stratified cross-validation. The classifier weights were completely frozen prior to evaluation on the primary institutional research cohort (LGH cases)."*
