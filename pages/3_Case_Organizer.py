import os
import tkinter as tk
from tkinter import filedialog
import streamlit as st
import pandas as pd
from utils.organizer import scan_and_categorize_folder, organize_cases_into_folders

st.set_page_config(page_title="Case Folder Organizer", page_icon="🗂️", layout="wide")

st.markdown("""
<style>
    .block-container {
        padding-top: 1rem;
        padding-bottom: 2rem;
        padding-left: 1.5rem;
        padding-right: 1.5rem;
        max-width: 100% !important;
    }
    .org-card {
        background-color: var(--secondary-background-color) !important;
        color: var(--text-color) !important;
        border: 1px solid rgba(128, 128, 128, 0.2) !important;
        border-radius: 6px;
        padding: 15px;
        margin-bottom: 15px;
    }
</style>
""", unsafe_allow_html=True)

st.title("🗂️ Study Case Organizer & DICOM Archive Manager")
st.caption("Automatically scan your messy study directories and sort scattered DICOM (.dcm) and JPEG (.jpg) cases into structured subfolders.")

if "org_source" not in st.session_state:
    st.session_state["org_source"] = r"E:\Research\Mammo-Cases-LGH"
if "org_dest" not in st.session_state:
    st.session_state["org_dest"] = r"E:\Research\Mammo-Cases-LGH\Organized_Studies"

st.markdown("### 1. Select Directories")

c1, c2 = st.columns([3, 1])
with c1:
    src_input = st.text_input("Source Directory (Folder containing scattered cases):", value=st.session_state["org_source"])
    st.session_state["org_source"] = src_input
with c2:
    st.markdown("<div style='margin-top: 28px;'></div>", unsafe_allow_html=True)
    if st.button("📁 Browse Source...", width='stretch'):
        try:
            root = tk.Tk()
            root.withdraw()
            root.wm_attributes("-topmost", 1)
            sel = filedialog.askdirectory(master=root)
            if sel:
                st.session_state["org_source"] = sel
                st.rerun()
        except Exception as e:
            st.error(f"Error: {e}")

c3, c4 = st.columns([3, 1])
with c3:
    dest_input = st.text_input("Destination Directory (Where organized folders will be created):", value=st.session_state["org_dest"])
    st.session_state["org_dest"] = dest_input
with c4:
    st.markdown("<div style='margin-top: 28px;'></div>", unsafe_allow_html=True)
    if st.button("📁 Browse Destination...", width='stretch'):
        try:
            root = tk.Tk()
            root.withdraw()
            root.wm_attributes("-topmost", 1)
            sel = filedialog.askdirectory(master=root)
            if sel:
                st.session_state["org_dest"] = sel
                st.rerun()
        except Exception as e:
            st.error(f"Error: {e}")

st.markdown("---")

st.markdown("### 2. Scan & Preview Categorization")

if st.button("🔍 Analyze Source Directory", type="primary", width='stretch'):
    if not os.path.isdir(src_input):
        st.error("Source directory does not exist!")
    else:
        with st.spinner("Scanning files and parsing DICOM headers..."):
            dcm_list, jpg_list = scan_and_categorize_folder(src_input)
            st.session_state["org_dcm"] = dcm_list
            st.session_state["org_jpg"] = jpg_list
            st.success(f"Scan complete! Found {len(dcm_list)} DICOM files and {len(jpg_list)} JPEG/PNG files.")

dcm_files = st.session_state.get("org_dcm", [])
jpg_files = st.session_state.get("org_jpg", [])

if len(dcm_files) > 0 or len(jpg_files) > 0:
    col_d, col_j = st.columns(2)
    with col_d:
        st.markdown(f"#### 🩻 DICOM Archives (`{len(dcm_files)}` files)")
        st.info("Will be organized into: `/DICOM_Cases/<PatientName_ID>/<file.dcm>`")
        st.dataframe(pd.DataFrame({"DICOM File Path": dcm_files}), height=250, width='stretch')
        
    with col_j:
        st.markdown(f"#### 🖼️ JPEG / PNG Cases (`{len(jpg_files)}` files)")
        st.info("Will be organized into: `/JPEG_Cases/<PatientFolder>/<file.jpg>`")
        st.dataframe(pd.DataFrame({"JPEG File Path": jpg_files}), height=250, width='stretch')

    st.markdown("---")
    st.markdown("### 3. Execute Organization")
    
    mode = st.radio("File Operation Mode:", ["Copy Files (Safe - leaves original files untouched)", "Move Files (Clean up source folder)"], index=0)
    op_mode = "copy" if "Copy" in mode else "move"
    
    if st.button("🚀 Start Case Organization", type="primary", width='stretch'):
        with st.spinner(f"Organizing study files into {dest_input}..."):
            res = organize_cases_into_folders(src_input, dest_folder=dest_input, mode=op_mode)
            st.success(f"🎉 Organization Complete! Successfully sorted {res['dicom_moved']} DICOM cases and {res['jpeg_moved']} JPEG cases into clean folders! ({res['errors']} errors skipped).")
            st.balloons()
