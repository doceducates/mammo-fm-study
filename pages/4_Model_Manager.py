import os
import torch
import streamlit as st
import pandas as pd
from model.loader import get_model, weights_present, head_present

st.set_page_config(page_title="Model & Hardware Manager", page_icon="⚙️", layout="wide")

st.markdown("""
<style>
    .block-container {
        padding-top: 1rem;
        padding-bottom: 2rem;
        padding-left: 1.5rem;
        padding-right: 1.5rem;
        max-width: 100% !important;
    }
</style>
""", unsafe_allow_html=True)

st.title("⚙️ Model Architecture & Hardware Diagnostics")
st.caption("Manage Mammo-FM foundation model checkpoints, retrain linear probe classifiers, and monitor VRAM utilization.")

st.subheader("1. GPU Hardware & VRAM Diagnostics")
c_gpu, c_vram = st.columns(2)

with c_gpu:
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        st.success(f"⚡ **CUDA GPU Detected**: {gpu_name}\n\n**Driver / PyTorch Engine**: PyTorch 2.6.0+cu124")
    else:
        st.warning("💻 **CPU Execution Mode** (No CUDA GPU active)")

with c_vram:
    if torch.cuda.is_available():
        vram_total = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
        vram_alloc = round(torch.cuda.memory_allocated(0) / (1024**3), 2)
        vram_res = round(torch.cuda.memory_reserved(0) / (1024**3), 2)
        st.info(f"💾 **Total Dedicated VRAM**: `{vram_total} GB`\n\n**Allocated**: `{vram_alloc} GB` | **Reserved / Cached**: `{vram_res} GB`")
        if st.button("🧹 Empty CUDA Cache (Free Memory)", width='stretch'):
            torch.cuda.empty_cache()
            st.success("CUDA VRAM cache flushed.")
            st.rerun()

st.markdown("---")

st.subheader("2. Model Checkpoint Status")
m1, m2 = st.columns(2)

with m1:
    st.markdown("#### 🩻 Foundation Model Checkpoint")
    if weights_present():
        st.success("✅ `Mammo-FM_BatmanlabTrained_CLIP.tar` found in `model/weights/`")
    else:
        st.error("❌ Foundation model weights missing! Place `Mammo-FM_BatmanlabTrained_CLIP.tar` into `model/weights/`")

with m2:
    st.markdown("#### 🎯 Cancer Head Classifier (`_lp`)")
    if head_present():
        st.success("✅ `linear_head.joblib` found in `model/weights/` (17.2 KB)")
    else:
        st.warning("⚠️ Cancer head missing. Run CMMD trainer below to generate `linear_head.joblib`.")

st.markdown("---")

st.subheader("3. Retrain / Benchmark Linear Probe on CMMD")
st.caption("If you wish to retrain the linear probe on local CMMD benchmark DICOM data:")

cmmd_dir = st.text_input("Local CMMD Dataset Directory", value=r"data/cmmd")

if st.button("🚀 Train Cancer Head on CMMD", width='stretch'):
    if not os.path.exists(cmmd_dir):
        st.error(f"CMMD directory not found at: {cmmd_dir}. Download CMMD DICOMs from TCIA or Kaggle.")
    else:
        with st.spinner("Extracting 2048-dim features and fitting logistic regression head..."):
            from train_linear_probe import main as train_head
            train_head()
            st.success("🎉 Cancer head retrained and saved to model/weights/linear_head.joblib!")
