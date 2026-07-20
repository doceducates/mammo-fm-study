import streamlit as st

st.set_page_config(page_title="Mammo-FM Diagnostic Accuracy Study",
                   page_icon="🩻", layout="wide")

st.title("🩻 Mammo-FM Diagnostic Accuracy Study")
st.caption("PGMI / Lahore General Hospital — Department of Radiology")

st.markdown(
    """
    **Local, offline research console for external validation of Mammo-FM.**

    Use the sidebar, roughly in this order:
    - **⚙️ Model Setup** — download / load the Mammo-FM weights.
    - **🧠 Build Cancer Head** — one-time: import public CMMD data and train
      the head so the model can output malignant / benign.
    - **🔬 Inference & Logging** — anonymize a mammogram, run Mammo-FM, log the
      blinded AI score.
    - **📁 Batch Import** — run Mammo-FM over a whole folder at once.
    - **📊 Analysis Dashboard** — sensitivity, specificity, PPV, NPV, accuracy,
      ROC/AUC, Cohen's kappa, plus SPSS-ready exports.

    > ⚠️ Ethics: process anonymized images only. All computation stays on this
    > machine — nothing is uploaded.
    """
)
