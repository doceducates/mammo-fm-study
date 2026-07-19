import os
import streamlit as st
from datetime import date
from utils.ingest import find_images, load_image
from utils.data_store import append_row, load_data
from model.loader import get_model, weights_present, head_present

st.title("📁 Batch Import (whole folder)")
st.caption("Point this at a folder of mammograms (DICOM / PNG / JPG, subfolders "
           "included). It anonymizes and runs Mammo-FM on every image and logs "
           "a blinded score. Enter histopathology later in the Dashboard.")

default_dir = "data/incoming"
folder = st.text_input(
    "Folder path", default_dir,
    help="Easiest: copy all your images into data/incoming/ (any layout), "
         "or paste any folder path here.")

if st.button("🔍 Scan folder"):
    if not os.path.isdir(folder):
        st.error(f"Folder not found: {folder}")
    else:
        st.session_state["batch_files"] = find_images(folder)
        st.success(f"Found {len(st.session_state['batch_files'])} image(s).")

files = st.session_state.get("batch_files", [])
if files:
    st.write(f"**{len(files)} image(s) ready.**")
    with st.expander("Preview file list (first 50)"):
        st.write(files[:50])

    if not weights_present():
        st.warning("Model weights not found — go to ⚙️ Model Setup first.")
    if not head_present():
        st.warning("No cancer head trained yet — run train_linear_probe.py. "
                   "See ⚙️ Model Setup for how.")

    can_run = weights_present() and head_present()
    if st.button("▶ Run Mammo-FM on all images", type="primary",
                 disabled=not can_run):
        model = get_model()
        prog = st.progress(0.0)
        n = len(files)
        start = len(load_data())
        ok, failed = 0, 0
        for i, path in enumerate(files, 1):
            try:
                img = load_image(path)
                prob = model.predict(img)
                append_row({
                    "serial_no": start + i,
                    "anonymized_id": os.path.splitext(os.path.basename(path))[0],
                    "date": str(date.today()),
                    "age": "", "breast_side": "", "breast_density": "",
                    "lesion_size_mm": "", "radiologist_birads": "",
                    "mammo_fm_prob": round(prob, 4),
                    "mammo_fm_class": "Malignant" if prob >= 0.5 else "Benign",
                    "histopathology": "", "histopath_type": "",
                    "examiner": "batch",
                })
                ok += 1
            except Exception as e:  # noqa: BLE001
                failed += 1
                st.warning(f"Skipped {os.path.basename(path)}: {e}")
            prog.progress(i / n)
        st.success(f"Done. Logged {ok} image(s)"
                   + (f", skipped {failed}." if failed else ".")
                   + " Open 📊 Dashboard to add histopathology and see metrics.")
