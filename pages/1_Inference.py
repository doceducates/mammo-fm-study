import tempfile
import numpy as np
import streamlit as st
from datetime import date
from PIL import Image
from utils.dicom_utils import dicom_to_array, preprocess_for_model
from utils.data_store import append_row, load_data
from model.loader import get_model, weights_present, head_present

st.title("🔬 Inference & Logging")
st.info("Blinding: histopathology is NOT entered here. Record it later in "
        "the Dashboard so the AI read stays blinded.")

if not weights_present():
    st.warning("Model weights not found. Go to the ⚙️ Model Setup page first.")
if not head_present():
    st.warning("No cancer head trained yet — go to the 🧠 Build Cancer Head "
               "page (import CMMD + one click). Inference needs it to score "
               "malignancy.")


c1, c2 = st.columns(2)
with c1:
    anon_id = st.text_input("Anonymized Patient ID (e.g. STUDY-001)")
    age = st.number_input("Age (years)", 18, 100, 45)
    side = st.selectbox("Breast side", ["Right", "Left", "Bilateral"])
    density = st.selectbox("Breast density (BI-RADS)", ["A", "B", "C", "D"])
    lesion = st.number_input("Lesion size (mm)", 0.0, 200.0, 0.0)
    birads = st.selectbox("Radiologist BI-RADS",
                          ["0", "1", "2", "3", "4A", "4B", "4C", "5"])
    examiner = st.text_input("Examiner initials")

with c2:
    up = st.file_uploader("Mammogram (DICOM / PNG / JPG)",
                          type=["dcm", "png", "jpg", "jpeg"])
    img = None
    if up is not None:
        if up.name.lower().endswith(".dcm"):
            with tempfile.NamedTemporaryFile(suffix=".dcm", delete=False) as f:
                f.write(up.getbuffer())
                raw = dicom_to_array(f.name)
        else:
            raw = np.array(Image.open(up).convert("L"))
        img = preprocess_for_model(raw)
        st.image(img, caption="Preprocessed (anonymized)",
                 use_column_width=True)

ready = img is not None and bool(anon_id)
if st.button("▶ Run Mammo-FM", type="primary", disabled=not ready):
    with st.spinner("Running inference..."):
        prob = get_model().predict(img)
    pred = "Malignant" if prob >= 0.5 else "Benign"
    m1, m2 = st.columns(2)
    m1.metric("Mammo-FM malignancy probability", f"{prob:.3f}")
    m2.metric("AI classification (thr 0.5)", pred)
    append_row({
        "serial_no": len(load_data()) + 1,
        "anonymized_id": anon_id, "date": str(date.today()),
        "age": age, "breast_side": side, "breast_density": density,
        "lesion_size_mm": lesion, "radiologist_birads": birads,
        "mammo_fm_prob": round(prob, 4), "mammo_fm_class": pred,
        "histopathology": "", "histopath_type": "", "examiner": examiner,
    })
    st.success(f"Saved {anon_id}. Enter histopathology later in the Dashboard.")
