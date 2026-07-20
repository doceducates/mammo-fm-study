# How to build the cancer head (all from the UI)

Mammo-FM only turns an image into numbers. The **cancer head** is the small
classifier that turns those numbers into a malignant/benign probability. You
build it **once**, on **external public data (CMMD)**, so your LGH cases stay
an untouched test set (the proper external-validation design).

Everything below is done with clicks on the **🧠 Build Cancer Head** page in the
app. No command line needed.

## Step 1 - Download CMMD (free, one-time)

1. Open CMMD on The Cancer Imaging Archive:
   https://www.cancerimagingarchive.net/collection/cmmd/
2. Download the **DICOM images** (via TCIA's *NBIA Data Retriever*) and the
   **clinical-data file** `CMMD_clinicaldata_revision.xlsx`.
3. Put them on this PC, e.g. in a folder `data/cmmd/` that holds the patient
   subfolders (`D1-0001`, `D1-0002`, ...) and the `.xlsx` file.

CMMD = 1,026 biopsy-confirmed benign/malignant cases, free for non-commercial
research (matches Mammo-FM's academic licence).

## Step 2 - Import CMMD (one click)

On the **🧠 Build Cancer Head** page, section 2:
- Enter the CMMD folder path and the clinical-data file path.
- Click **📥 Sort CMMD into benign / malignant**.

The app reads each image's patient ID + breast side, looks up the biopsy label,
and copies it into `data/labeled/benign/` or `data/labeled/malignant/`.

## Step 3 - Train (one click)

Still on the same page, section 4:
- Click **🚀 Train Cancer Head**.
- It extracts features for every labeled image and fits the classifier
  (seconds to a couple of minutes), saves `model/weights/linear_head.joblib`,
  and reloads the model automatically.

Done. **🔬 Inference** and **📁 Batch Import** now output real malignancy
probabilities.

## Notes

- The "AUC" shown after training is a **rough check on the training data**, not
  your study result. Your real numbers come from the LGH test set in the
  📊 Dashboard.
- You can also drop your own extra labeled images directly into
  `data/labeled/benign` / `data/labeled/malignant` before training.
- CLI equivalent (optional): `python train_linear_probe.py`.
- For your ERC/protocol, state: *"The AI model was developed on external public
  data (CMMD) and frozen prior to evaluation; LGH patient data was used only
  for prospective testing."*
