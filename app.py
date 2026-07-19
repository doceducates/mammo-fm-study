import streamlit as st

st.set_page_config(page_title="Mammo-FM Diagnostic Accuracy Study",
                   page_icon="🩻", layout="wide")

st.title("🩻 Mammo-FM Diagnostic Accuracy Study")
st.caption("PGMI / Lahore General Hospital — Department of Radiology")

st.markdown(
    """
    **Local, offline research console for external validation of Mammo-FM.**

    Use the sidebar:
    - **🔬 Inference & Logging** — anonymize a mammogram, run Mammo-FM,
      log the blinded AI score.
    - **📊 Analysis Dashboard** — sensitivity, specificity, PPV, NPV,
      accuracy, ROC/AUC, Cohen's kappa.

    > ⚠️ Ethics: process anonymized images only. All computation stays
    > on this machine — nothing is uploaded.
    """
)
