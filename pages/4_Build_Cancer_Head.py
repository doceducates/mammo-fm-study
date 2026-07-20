import os
import streamlit as st

from utils.train_head import count_labeled, train_head
from utils.cmmd_import import import_cmmd
from model.loader import get_model, weights_present, head_present

st.title("🧠 Build Cancer Head")
st.caption("Teach the model to output malignant / benign. Do this ONCE, on "
           "external public data (CMMD), so your LGH cases stay an untouched "
           "test set — the proper external-validation design.")

with st.expander("❓ What is this and why do I need it?", expanded=False):
    st.markdown(
        """
        Mammo-FM is a **feature extractor** — it turns a mammogram into 2048
        numbers, but by itself it does **not** say cancer / benign. The small
        **cancer head** you build here reads those numbers and outputs a
        malignancy probability.

        **Why train it on public data (CMMD) and not your own cases?**
        Your study measures how well the AI works on LGH patients. For that to
        be valid, the AI must be **built and frozen BEFORE it sees any LGH
        patient**. Training on external data (CMMD) and then testing on your
        LGH cases is the clean, publishable **external-validation** design.
        Training on your own test cases would be circular and get rejected.
        """
    )

# ---------------------------------------------------------------------------
st.header("1. Get the CMMD dataset (free, one-time)")
st.markdown(
    """
    1. Open **[CMMD on The Cancer Imaging Archive]"""
    """(https://www.cancerimagingarchive.net/collection/cmmd/)**.
    2. Download the **images** (DICOM) using TCIA's *NBIA Data Retriever*, and
       the **clinical-data file** `CMMD_clinicaldata_revision.xlsx`.
    3. Put them anywhere on this PC — e.g. a folder called `data/cmmd/`
       containing the patient subfolders (`D1-0001`, `D1-0002`, …) and the
       `.xlsx` file.

    CMMD is biopsy-confirmed benign/malignant and free for non-commercial
    research (matches Mammo-FM's academic licence).
    """
)

# ---------------------------------------------------------------------------
st.header("2. Import CMMD into labeled folders")
col1, col2 = st.columns(2)
dicom_root = col1.text_input(
    "CMMD DICOM folder", "data/cmmd",
    help="Folder that contains the CMMD patient subfolders (D1-0001, ...).")
meta_path = col2.text_input(
    "CMMD clinical-data file", "data/cmmd/CMMD_clinicaldata_revision.xlsx",
    help="The .xlsx/.csv with the 'classification' (Benign/Malignant) column.")

if st.button("📥 Sort CMMD into benign / malignant"):
    if not os.path.isdir(dicom_root):
        st.error(f"Folder not found: {dicom_root}")
    elif not os.path.isfile(meta_path):
        st.error(f"Clinical-data file not found: {meta_path}")
    else:
        prog = st.progress(0.0)

        def _cb(i, n):
            prog.progress(i / max(n, 1))

        with st.spinner("Reading DICOMs and sorting by biopsy label…"):
            try:
                res = import_cmmd(dicom_root, meta_path, progress_cb=_cb)
                st.success(
                    f"Imported {res['benign']} benign + {res['malignant']} "
                    f"malignant image(s) from {res['total_dicoms']} DICOM(s). "
                    f"Unmatched/skipped: {res['unmatched']}.")
            except Exception as e:  # noqa: BLE001
                st.error(f"Import failed: {e}")

# ---------------------------------------------------------------------------
st.header("3. Labeled images ready")
counts = count_labeled()
c1, c2 = st.columns(2)
c1.metric("Benign", counts["benign"])
c2.metric("Malignant", counts["malignant"])
st.caption("You can also drop your own images straight into "
           "data/labeled/benign and data/labeled/malignant — anything here is "
           "used for training.")

# ---------------------------------------------------------------------------
st.header("4. Train the cancer head")
if not weights_present():
    st.warning("Model weights not found — go to ⚙️ Model Setup first.")
enough = counts["benign"] > 0 and counts["malignant"] > 0
if not enough:
    st.info("Need at least some benign AND some malignant images (step 3).")

if st.button("🚀 Train Cancer Head", type="primary",
             disabled=not (weights_present() and enough)):
    prog = st.progress(0.0)
    status = st.empty()

    def _cb(i, n):
        prog.progress(i / max(n, 1))
        status.write(f"Extracting features… {i}/{n}")

    with st.spinner("Loading model + extracting features…"):
        model = get_model()
        try:
            res = train_head(model, progress_cb=_cb)
        except Exception as e:  # noqa: BLE001
            st.error(f"Training failed: {e}")
            res = None

    if res:
        st.success(
            f"✅ Cancer head trained on {res['n']} image(s) "
            f"({res['n_benign']} benign, {res['n_malignant']} malignant).")
        if res["auc"] is not None:
            st.metric("5-fold CV AUC (rough, on TRAINING data — not your study "
                      "result)", f"{res['auc']:.3f}")
        if res["skipped"]:
            st.caption(f"Skipped {len(res['skipped'])} unreadable file(s).")
        # Clear the cached model so it reloads WITH the new head.
        get_model.clear()
        st.info("Model reloaded with the new head. 🔬 Inference and 📁 Batch "
                "Import now output real malignancy probabilities.")

if head_present():
    st.success("A trained cancer head is already in place. ✔")
