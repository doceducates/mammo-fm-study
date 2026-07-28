import pandas as pd
import streamlit as st
from utils.data_store import load_data
from utils.metrics import spss_ready

st.set_page_config(page_title="Patient Database & SPSS", page_icon="📋", layout="wide")

# 100% Theme-Native Responsive CSS
st.markdown("""
<style>
    .block-container {
        padding-top: 1rem;
        padding-bottom: 2rem;
        padding-left: 1.5rem;
        padding-right: 1.5rem;
        max-width: 100% !important;
    }
    .stDataEditor {
        border-radius: 6px;
        overflow: hidden;
    }
</style>
""", unsafe_allow_html=True)

st.title("📋 Master Patient Database & SPSS Coder")
st.caption("Review patient logs, manage Patient Names (anonymize prior to export if needed), record ground-truth histopathology, and download SPSS datasets.")

df = load_data()

st.subheader("1. Interactive Spreadsheet Database")
st.caption("💡 Click any cell to edit Patient Names, BI-RADS categories, or histopathology labels. Saved changes update the central CSV repository.")

min_rows = 15
if len(df) < min_rows:
    empty_rows = pd.DataFrame([{
        "serial_no": len(df) + i + 1,
        "patient_name": "", "anonymized_id": "", "date": "", "age": "", "breast_side": "",
        "lesion_side": "", "lesion_quadrant": "", "radiological_finding": "",
        "breast_density": "", "lesion_size_mm": "", "radiologist_birads": "",
        "mammo_fm_prob": "", "mammo_fm_class": "", "histopathology": "",
        "histopath_type": "", "examiner": ""
    } for i in range(min_rows - len(df))])
    display_df = pd.concat([df, empty_rows], ignore_index=True)
else:
    display_df = df.copy()

edited = st.data_editor(
    display_df,
    num_rows="dynamic",
    width='stretch',
    height=550,
    column_config={
        "serial_no": st.column_config.NumberColumn("S.No", width="small"),
        "patient_name": st.column_config.TextColumn("Patient Name", width="medium"),
        "anonymized_id": st.column_config.TextColumn("Case ID / File", width="medium"),
        "breast_side": st.column_config.SelectboxColumn("View Projection", options=["Right Breast", "Left Breast", "Bilateral", "Unspecified"]),
        "lesion_side": st.column_config.SelectboxColumn("Lesion Laterality", options=["Right Breast", "Left Breast", "Bilateral", "None / Normal"]),
        "lesion_quadrant": st.column_config.SelectboxColumn("Lesion Quadrant", options=["Upper Outer (UOQ)", "Upper Inner (UIQ)", "Lower Outer (LOQ)", "Lower Inner (LIQ)", "Subareolar", "Central", "N/A"]),
        "radiological_finding": st.column_config.SelectboxColumn("Finding Type", options=["Mass / Opacity", "Microcalcifications", "Architectural Distortion", "Asymmetry", "Normal"]),
        "breast_density": st.column_config.SelectboxColumn("Density (BI-RADS)", options=["A", "B", "C", "D"]),
        "radiologist_birads": st.column_config.SelectboxColumn("Radiologist BI-RADS", options=["0", "1", "2", "3", "4A", "4B", "4C", "5"]),
        "mammo_fm_prob": st.column_config.NumberColumn("AI Malignancy Score", format="%.4f"),
        "mammo_fm_class": st.column_config.TextColumn("AI Class"),
        "histopathology": st.column_config.SelectboxColumn("Histopathology (Gold Standard)", options=["Malignant", "Benign", "Normal", ""]),
        "histopath_type": st.column_config.SelectboxColumn("Tumor Subtype", options=["Invasive Ductal Carcinoma (IDC)", "Invasive Lobular Carcinoma (ILC)", "DCIS", "Fibroadenoma", "Fibrocystic Change", "Normal", ""]),
    }
)

c_save, c_ref = st.columns([1.5, 4])
with c_save:
    if st.button("💾 Save Database Changes", type="primary", width='stretch'):
        clean_df = edited[edited["anonymized_id"].astype(str).str.strip() != ""]
        clean_df.to_csv("data/results.csv", index=False)
        st.success("Database updated successfully!")
        st.rerun()

st.markdown("---")

st.subheader("2. Statistical & SPSS Data Export")
st.caption("Note: When exporting for research publication or external biostaticians, you can strip Patient Names from SPSS exports.")
e1, e2, e3 = st.columns(3)
with e1:
    st.download_button(
        "⬇️ Download Full Study Data (CSV)",
        data=df.to_csv(index=False),
        file_name="mammo_fm_study_database.csv",
        width='stretch'
    )
with e2:
    st.download_button(
        "⬇️ Download SPSS / MedCalc Coded Data",
        data=spss_ready(df).to_csv(index=False),
        file_name="mammo_fm_spss_ready.csv",
        help="Coded (1/0) format for SPSS, MedCalc, and STATA statistical analysis.",
        width='stretch'
    )
with e3:
    if st.button("🗑️ Reset Database", type="secondary", width='stretch'):
        if st.checkbox("Confirm database reset?"):
            pd.DataFrame(columns=df.columns).to_csv("data/results.csv", index=False)
            st.success("Database reset.")
            st.rerun()
