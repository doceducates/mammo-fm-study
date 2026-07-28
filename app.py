import torch
import streamlit as st
from model.loader import get_model, weights_present, head_present

st.set_page_config(
    page_title="Mammo-FM PACS Workstation",
    page_icon="🩻",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 100% Theme-Native Responsive CSS Injection
st.markdown("""
<style>
    /* Compact Global Padding */
    .block-container {
        padding-top: 1.2rem;
        padding-bottom: 2rem;
        padding-left: 1.8rem;
        padding-right: 1.8rem;
        max-width: 100% !important;
    }
    
    /* Dynamic Theme-Aware Cards */
    .home-card {
        background-color: var(--secondary-background-color) !important;
        color: var(--text-color) !important;
        border: 1px solid rgba(128, 128, 128, 0.2) !important;
        border-top: 4px solid var(--primary-color) !important;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        transition: transform 0.2s ease;
    }
    .home-card:hover {
        transform: translateY(-2px);
    }
    
    .sidebar-box {
        background-color: var(--secondary-background-color) !important;
        color: var(--text-color) !important;
        border: 1px solid rgba(128, 128, 128, 0.2) !important;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 15px;
    }
    
    .pacs-card {
        background-color: var(--secondary-background-color) !important;
        color: var(--text-color) !important;
        border: 1px solid rgba(128, 128, 128, 0.2) !important;
        border-left: 5px solid var(--primary-color) !important;
        border-radius: 6px;
        padding: 12px 18px;
        margin-bottom: 15px;
    }
    
    /* Status Badges */
    .badge-malignant {
        background-color: rgba(229, 62, 62, 0.2);
        color: #e53e3e !important;
        border: 1px solid #e53e3e;
        padding: 3px 8px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 0.85rem;
    }
    .badge-benign {
        background-color: rgba(56, 161, 105, 0.2);
        color: #38a169 !important;
        border: 1px solid #38a169;
        padding: 3px 8px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 0.85rem;
    }
    
    .element-container img {
        max-height: 400px !important;
        object-fit: contain !important;
        border-radius: 6px;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar Header Elements: PACS System Control & Hardware Status
with st.sidebar:
    st.markdown("## 🩻 Mammo-FM OS")
    st.caption("AI-Powered Clinical Mammography Workstation")
    st.markdown("---")
    
    # GPU Hardware Card
    gpu_available = torch.cuda.is_available()
    if gpu_available:
        gpu_name = torch.cuda.get_device_name(0)
        vram = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 1)
        st.markdown(f"""
        <div class="sidebar-box" style="border-left: 4px solid #38a169;">
            <b>⚡ CUDA GPU Active</b><br>
            <span style="font-size:0.85rem;">{gpu_name}</span><br>
            <b>💾 VRAM:</b> <span style="font-weight:bold;">{vram} GB dedicated</span>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div class="sidebar-box" style="border-left: 4px solid #dd6b20;">
            <b>💻 CPU Mode</b><br>
            <span style="font-size:0.85rem;">No CUDA GPU active in memory.</span>
        </div>
        """, unsafe_allow_html=True)

    # Model Status & Load / Unload Controls
    has_weights = weights_present()
    has_head = head_present()
    
    if "model_loaded" not in st.session_state:
        st.session_state["model_loaded"] = has_weights and has_head

    if st.session_state["model_loaded"]:
        st.success("🟢 **Mammo-FM**: Loaded in Memory")
        if st.button("⏹️ Unload Model (Free VRAM)", width='stretch'):
            if "mammo_model" in st.session_state:
                del st.session_state["mammo_model"]
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            st.session_state["model_loaded"] = False
            st.success("Model unloaded from VRAM.")
            st.rerun()
    else:
        st.warning("🔴 **Mammo-FM**: Unloaded / Idle")
        if st.button("▶️ Load Model into Memory", type="primary", width='stretch', disabled=not (has_weights and has_head)):
            with st.spinner("Loading Mammo-FM foundation model into VRAM..."):
                get_model()
                st.session_state["model_loaded"] = True
            st.success("Model loaded into memory!")
            st.rerun()

    st.markdown("---")
    st.markdown("### 🧭 Workstation Navigation")
    st.page_link("pages/1_PACS_Workstation.py", label="🖥️ 1. PACS Workstation & Chat", icon="🖥️")
    st.page_link("pages/2_Patient_Records.py", label="📋 2. Patient Database & SPSS", icon="📋")
    st.page_link("pages/3_Case_Organizer.py", label="🗂️ 3. Case Folder Organizer", icon="🗂️")
    st.page_link("pages/4_Model_Manager.py", label="⚙️ 4. Model & GPU Manager", icon="⚙️")
    st.markdown("---")
    st.caption("📍 PGMI / Lahore General Hospital\nDepartment of Diagnostic Radiology")

# Main Home Page Content
st.title("🩻 Mammo-FM Clinical PACS Workstation")
st.markdown("#### *Diagnostic Accuracy of Artificial Intelligence (Mammo-FM) in Detection of Breast Cancer on Mammograms Taking Histopathology as Gold Standard*")

st.markdown("<div style='margin-bottom: 20px;'></div>", unsafe_allow_html=True)

col1, col2 = st.columns(2, gap="large")

with col1:
    st.markdown("""
    <div class="home-card">
        <h3 style="margin-top:0;">🖥️ 1. Interactive PACS Workstation & AI Chat</h3>
        <p>The core clinical diagnostic viewer. Scan patient folders, review interactive X-rays with real-time windowing (Brightness/Contrast/Gamma/Invert), inspect DICOM metadata, view spatial attention heatmaps, and ask questions directly to our interactive <b>AI Clinical Assistant</b>.</p>
    </div>
    """, unsafe_allow_html=True)
    if st.button("🚀 Open PACS Workstation ➔", key="btn_w", type="primary", width='stretch'):
        st.switch_page("pages/1_PACS_Workstation.py")

    st.markdown("<div style='margin-bottom: 15px;'></div>", unsafe_allow_html=True)

    st.markdown("""
    <div class="home-card">
        <h3 style="margin-top:0;">📋 2. Master Patient Database & SPSS Coder</h3>
        <p>Dedicated clinical ground-truth entry station. Review logged patient cases, edit Patient Names, enter BI-RADS scores, specify tumor subtypes, and download coded (1/0) datasets ready for SPSS, MedCalc, and STATA statistical software.</p>
    </div>
    """, unsafe_allow_html=True)
    if st.button("📋 Open Patient Database ➔", key="btn_p", width='stretch'):
        st.switch_page("pages/2_Patient_Records.py")

with col2:
    st.markdown("""
    <div class="home-card">
        <h3 style="margin-top:0;">🗂️ 3. Study Case Folder Organizer</h3>
        <p>Tired of scattered 22 GB DICOM archives and loose JPEG files? This automatic tool scans your study directory and neatly separates and categorizes files into clean subdirectories (<code>/DICOM_Cases/</code> vs <code>/JPEG_Cases/</code>) grouped by Patient ID and Name.</p>
    </div>
    """, unsafe_allow_html=True)
    if st.button("🗂️ Open Case Organizer ➔", key="btn_o", width='stretch'):
        st.switch_page("pages/3_Case_Organizer.py")

    st.markdown("<div style='margin-bottom: 15px;'></div>", unsafe_allow_html=True)

    st.markdown("""
    <div class="home-card">
        <h3 style="margin-top:0;">⚙️ 4. Model Architecture & GPU Diagnostics</h3>
        <p>Monitor real-time NVIDIA GeForce RTX 4050 VRAM allocation, flush CUDA caches, validate checkpoint weights, and benchmark or retrain the logistic regression linear probe on local CMMD datasets in 1-click.</p>
    </div>
    """, unsafe_allow_html=True)
    if st.button("⚙️ Open Model Manager ➔", key="btn_m", width='stretch'):
        st.switch_page("pages/4_Model_Manager.py")

st.markdown("---")
st.caption("🔒 **UHS Ethical Compliance & Patient Privacy**: All DICOM studies, pixel data, and patient identifiers are processed locally in RAM/VRAM on this workstation. No data is transmitted to external cloud servers.")
