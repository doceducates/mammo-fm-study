import os
import tkinter as tk
from tkinter import filedialog
import pandas as pd
import numpy as np
import streamlit as st
from datetime import date

from PIL import Image
from utils.ingest import find_images, load_image, load_image_raw, group_files_by_patient, ocr_enrich_patient_data
from utils.data_store import append_row, load_data
from utils.dicom_utils import dicom_to_array, extract_dicom_metadata, adjust_image_window, invert_image
from utils.ai_chat import get_clinical_chat_response
from utils.ocr import ocr_mammogram, ocr_extract_all_metadata
from model.loader import get_model, weights_present, head_present

st.set_page_config(page_title="PACS Workstation", page_icon="🖥️", layout="wide")

# ── Clean, Theme-Native CSS ──────────────────────────────────────────────
st.markdown("""
<style>
    .block-container {
        padding-top: 0.8rem;
        padding-bottom: 2rem;
        max-width: 100% !important;
    }
    .patient-card {
        background: var(--secondary-background-color);
        border: 1px solid rgba(128,128,128,0.2);
        border-radius: 10px;
        padding: 16px 20px;
        margin-bottom: 14px;
    }
    .patient-card h4 { margin: 0 0 6px 0; }
    .view-chip {
        display: inline-block;
        background: var(--secondary-background-color);
        border: 1px solid rgba(128,128,128,0.3);
        border-radius: 6px;
        padding: 6px 10px;
        margin: 2px 4px 2px 0;
        font-size: 0.82rem;
        text-align: center;
        min-width: 80px;
    }
    .pill { padding: 3px 10px; border-radius: 12px; font-weight: 700; font-size: 0.78rem; }
    .pill-mal { background: rgba(229,62,62,0.15); color: #e53e3e; border: 1px solid #e53e3e; }
    .pill-ben { background: rgba(56,161,105,0.15); color: #38a169; border: 1px solid #38a169; }
    .pill-pend { background: rgba(49,130,206,0.15); color: #3182ce; border: 1px solid #3182ce; }
    .inspector-card {
        background: var(--secondary-background-color);
        border: 1px solid rgba(128,128,128,0.2);
        border-radius: 10px;
        padding: 14px 18px;
        margin-bottom: 12px;
    }
    .element-container img {
        max-height: 360px !important;
        object-fit: contain !important;
        border-radius: 6px;
    }
</style>
""", unsafe_allow_html=True)

# ── Session State ────────────────────────────────────────────────────────
if "folder_path" not in st.session_state:
    st.session_state["folder_path"] = r"E:\Research\Mammo-Cases-LGH"
if "selected_view_path" not in st.session_state:
    st.session_state["selected_view_path"] = None
if "chat_messages" not in st.session_state:
    st.session_state["chat_messages"] = []
if "show_inspector" not in st.session_state:
    st.session_state["show_inspector"] = True

# ── TOP TOOLBAR ──────────────────────────────────────────────────────────
st.markdown("### 🖥️ PACS Mammography Workstation")

tb1, tb2, tb3, tb4 = st.columns([3.5, 1.2, 0.8, 1.0])

with tb1:
    folder_val = st.text_input(
        "folder", value=st.session_state["folder_path"],
        label_visibility="collapsed",
        placeholder="Paste study folder path here..."
    )
    if folder_val != st.session_state["folder_path"]:
        st.session_state["folder_path"] = folder_val
        if os.path.isdir(folder_val):
            st.session_state["scanned_files"] = find_images(folder_val)

with tb2:
    if st.button("📁 Browse Folder", width="stretch", type="primary"):
        try:
            root = tk.Tk(); root.withdraw(); root.wm_attributes("-topmost", 1)
            sel = filedialog.askdirectory(master=root)
            if sel and os.path.isdir(sel):
                st.session_state["folder_path"] = sel
                st.session_state["scanned_files"] = find_images(sel)
                st.rerun()
        except Exception as e:
            st.error(str(e))

with tb3:
    if st.button("🔄 Refresh", width="stretch"):
        if "scanned_files" in st.session_state:
            del st.session_state["scanned_files"]
        st.rerun()

with tb4:
    label = "◀ Close Inspector" if st.session_state["show_inspector"] else "▶ Open Inspector"
    if st.button(label, width="stretch"):
        st.session_state["show_inspector"] = not st.session_state["show_inspector"]
        st.rerun()

# ── Auto-scan on first load ──────────────────────────────────────────────
folder = st.session_state["folder_path"]
if "scanned_files" not in st.session_state and os.path.isdir(folder):
    st.session_state["scanned_files"] = find_images(folder)

files = st.session_state.get("scanned_files", [])
patients = group_files_by_patient(files) if files else []
df = load_data()

# ── LAYOUT: Patient List (left)  |  Inspector Drawer (right) ────────────
if st.session_state["show_inspector"]:
    col_list, col_insp = st.columns([1.55, 1.0], gap="medium")
else:
    col_list = st.container()
    col_insp = None

# ═══════════════════════════════════════════════════════════════════════════
#  LEFT PANEL – Patient Case List
# ═══════════════════════════════════════════════════════════════════════════
with col_list:
    # Search & Bulk Action bar
    s1, s2 = st.columns([3.5, 1.2])
    with s1:
        search_q = st.text_input("search", placeholder="🔍 Search by patient name or MRN...",
                                 label_visibility="collapsed", key="pacs_search")
    with s2:
        can_bulk = weights_present() and head_present() and len(files) > 0
        if st.button("⚡ Bulk AI Analysis", type="primary", disabled=not can_bulk, width="stretch"):
            model = get_model()
            prog = st.progress(0.0)
            total = sum(len(p["views"]) for p in patients)
            done = 0
            for pg in patients:
                for v in pg["views"]:
                    try:
                        img = load_image(v["path"])
                        prob = model.predict(img)
                        fname_id = os.path.splitext(v["filename"])[0]
                        append_row({
                            "serial_no": len(load_data()) + 1,
                            "patient_name": pg["patient_name"],
                            "anonymized_id": fname_id,
                            "date": str(date.today()), "age": "",
                            "breast_side": v["side"],
                            "lesion_side": v["side"] if prob >= 0.5 else "None / Normal",
                            "lesion_quadrant": "", "radiological_finding": "",
                            "breast_density": "", "lesion_size_mm": "",
                            "radiologist_birads": "",
                            "mammo_fm_prob": round(prob, 4),
                            "mammo_fm_class": "Malignant" if prob >= 0.5 else "Benign",
                            "histopathology": "", "histopath_type": "",
                            "examiner": "Mammo-FM AI",
                        })
                    except Exception:
                        pass
                    done += 1
                    prog.progress(done / total)
            st.success(f"Analyzed {done} views across {len(patients)} patients!")
            st.rerun()

    # Initialize pagination state
    if "pacs_page" not in st.session_state:
        st.session_state["pacs_page"] = 1
    if "pacs_page_size" not in st.session_state:
        st.session_state["pacs_page_size"] = 5

    # Filter
    filtered = patients
    if search_q.strip():
        sq = search_q.strip().lower()
        filtered = [p for p in patients if sq in p["patient_name"].lower() or sq in p["patient_id"].lower()]

    # Pagination math
    page_size = st.session_state["pacs_page_size"]
    total_patients = len(filtered)
    total_pages = max(1, (total_patients + page_size - 1) // page_size)
    
    if st.session_state["pacs_page"] > total_pages:
        st.session_state["pacs_page"] = total_pages
    current_page = st.session_state["pacs_page"]

    start_idx = (current_page - 1) * page_size
    end_idx = min(start_idx + page_size, total_patients)
    page_patients = filtered[start_idx:end_idx]

    # Top Control & Pagination Header Bar
    p_info, p_ctrl1, p_ctrl2, p_ctrl3 = st.columns([2.5, 0.8, 1.2, 0.8])
    with p_info:
        st.caption(f"Showing **{start_idx + 1 if total_patients > 0 else 0}–{end_idx}** of **{total_patients}** patients ({sum(len(p['views']) for p in filtered)} total views)")
    with p_ctrl1:
        if st.button("◀ Prev", key="page_prev_top", disabled=(current_page <= 1), width="stretch"):
            st.session_state["pacs_page"] = max(1, current_page - 1)
            st.rerun()
    with p_ctrl2:
        st.markdown(f"<div style='text-align:center; padding-top:4px; font-size:0.85rem;'><b>Page {current_page} / {total_pages}</b></div>", unsafe_allow_html=True)
    with p_ctrl3:
        if st.button("Next ▶", key="page_next_top", disabled=(current_page >= total_pages), width="stretch"):
            st.session_state["pacs_page"] = min(total_pages, current_page + 1)
            st.rerun()

    # Structured Table Header
    st.markdown("""
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--secondary-background-color); border:1px solid rgba(128,128,128,0.25); border-radius:8px 8px 0 0; padding:10px 16px; font-weight:700; font-size:0.82rem; letter-spacing:0.05em; opacity:0.85; margin-bottom:8px;">
        <div style="flex:2;">PATIENT / CASE ID</div>
        <div style="flex:2.5;">PROJECTIONS / VIEWS</div>
        <div style="flex:1.5; text-align:right;">AI STATUS & RISK</div>
    </div>
    """, unsafe_allow_html=True)

    if not filtered:
        st.info("No patients found. Browse to a folder containing mammogram DICOM/JPEG files.")
    
    for idx_on_page, pg in enumerate(page_patients):
        global_idx = start_idx + idx_on_page
        p_name = pg["patient_name"]
        p_id = pg["patient_id"]
        views = pg["views"]

        # Look up results for this patient
        p_rows = df[df["patient_name"].astype(str).str.upper() == p_name.upper()]
        has_results = len(p_rows) > 0 and (p_rows["mammo_fm_prob"] != "").any()
        max_prob = float(p_rows["mammo_fm_prob"].astype(float).max()) if has_results else None

        if max_prob is not None:
            pill = f"<span class='pill pill-mal'>Malignant {max_prob*100:.0f}%</span>" if max_prob >= 0.5 \
                else f"<span class='pill pill-ben'>Benign {max_prob*100:.0f}%</span>"
        else:
            pill = "<span class='pill pill-pend'>Pending</span>"

        # View chips
        chip_html = ""
        for v in views:
            chip_html += f"<span class='view-chip'>{v['projection']}<br><small>{v['side'][:5]}</small></span>"

        st.markdown(f"""
        <div class="patient-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4 style="margin:0;">👤 {p_name}</h4>
                    <small style="opacity:0.6;">MRN: {p_id} · {len(views)} views</small>
                </div>
                <div>{pill}</div>
            </div>
            <div style="margin:10px 0 6px 0;">{chip_html}</div>
        </div>
        """, unsafe_allow_html=True)

        # Action row under card
        act_cols = st.columns([1.2] + [1]*len(views))

        with act_cols[0]:
            if st.button(f"⚡ Analyze All", key=f"anlz_{global_idx}", width="stretch",
                         type="primary", disabled=not (weights_present() and head_present())):
                model = get_model()
                for v in views:
                    try:
                        img = load_image(v["path"])
                        prob = model.predict(img)
                        fname_id = os.path.splitext(v["filename"])[0]
                        append_row({
                            "serial_no": len(load_data()) + 1,
                            "patient_name": p_name,
                            "anonymized_id": fname_id,
                            "date": str(date.today()), "age": "",
                            "breast_side": v["side"],
                            "lesion_side": v["side"] if prob >= 0.5 else "None / Normal",
                            "lesion_quadrant": "", "radiological_finding": "",
                            "breast_density": "", "lesion_size_mm": "",
                            "radiologist_birads": "",
                            "mammo_fm_prob": round(prob, 4),
                            "mammo_fm_class": "Malignant" if prob >= 0.5 else "Benign",
                            "histopathology": "", "histopath_type": "",
                            "examiner": "Mammo-FM AI",
                        })
                    except Exception:
                        pass
                st.success(f"Analyzed {p_name}!")
                st.rerun()

        for vi, v in enumerate(views):
            with act_cols[vi + 1]:
                if st.button(f"▶ {v['projection']}", key=f"view_{global_idx}_{vi}", width="stretch"):
                    st.session_state["selected_view_path"] = v["path"]
                    st.session_state["show_inspector"] = True
                    st.rerun()

        st.markdown("<div style='margin-bottom:12px;'></div>", unsafe_allow_html=True)

    # Bottom Pagination Controls & Page Size Selector
    st.divider()
    bot1, bot2, bot3, bot4 = st.columns([2.0, 1.0, 1.2, 1.0])
    with bot1:
        new_size = st.selectbox(
            "Patients per page", options=[5, 10, 20, 50],
            index=[5, 10, 20, 50].index(page_size) if page_size in [5, 10, 20, 50] else 0,
            key="pacs_page_size_select"
        )
        if new_size != page_size:
            st.session_state["pacs_page_size"] = new_size
            st.session_state["pacs_page"] = 1
            st.rerun()
    with bot2:
        if st.button("◀ Previous", key="page_prev_bot", disabled=(current_page <= 1), width="stretch"):
            st.session_state["pacs_page"] = max(1, current_page - 1)
            st.rerun()
    with bot3:
        st.markdown(f"<div style='text-align:center; padding-top:8px; font-size:0.85rem;'><b>Page {current_page} of {total_pages}</b></div>", unsafe_allow_html=True)
    with bot4:
        if st.button("Next ▶", key="page_next_bot", disabled=(current_page >= total_pages), width="stretch"):
            st.session_state["pacs_page"] = min(total_pages, current_page + 1)
            st.rerun()

# ═══════════════════════════════════════════════════════════════════════════
#  RIGHT PANEL – Collapsible Inspector Drawer
# ═══════════════════════════════════════════════════════════════════════════
if st.session_state["show_inspector"] and col_insp is not None:
    with col_insp:
        st.markdown("### 🔬 Inspector")

        sel = st.session_state.get("selected_view_path")
        if not sel and patients and patients[0]["views"]:
            sel = patients[0]["views"][0]["path"]
            st.session_state["selected_view_path"] = sel

        if sel and os.path.exists(sel):
            fname = os.path.basename(sel)
            fname_id = os.path.splitext(fname)[0]
            row = df[df["anonymized_id"] == fname_id]

            prob_val = float(row.iloc[0]["mammo_fm_prob"]) if not row.empty and row.iloc[0]["mammo_fm_prob"] != "" else 0.0
            is_mal = prob_val >= 0.5
            p_name = row.iloc[0].get("patient_name", "Unknown") if not row.empty else os.path.basename(os.path.dirname(sel))

            pill_cls = "pill-mal" if is_mal else "pill-ben"
            st.markdown(f"""
            <div class="inspector-card">
                <h4 style="margin:0;">👤 {p_name}</h4>
                <p style="margin:4px 0 0 0;">
                    File: <code>{fname}</code><br>
                    AI Score: <b>{prob_val*100:.1f}%</b> &nbsp;
                    <span class="pill {pill_cls}">{"Malignant" if is_mal else "Benign"}</span>
                </p>
            </div>
            """, unsafe_allow_html=True)

            if st.button("⚡ Analyze THIS View", type="primary", width="stretch",
                         disabled=not (weights_present() and head_present())):
                model = get_model()
                img = load_image(sel)
                prob = model.predict(img)
                meta = extract_dicom_metadata(sel) if sel.lower().endswith((".dcm", ".dicom")) else {}
                side = meta.get("Laterality", "Unspecified") or "Unspecified"
                append_row({
                    "serial_no": len(load_data()) + 1,
                    "patient_name": p_name, "anonymized_id": fname_id,
                    "date": str(date.today()), "age": "",
                    "breast_side": side,
                    "lesion_side": side if prob >= 0.5 else "None / Normal",
                    "lesion_quadrant": "", "radiological_finding": "",
                    "breast_density": "", "lesion_size_mm": "",
                    "radiologist_birads": "",
                    "mammo_fm_prob": round(prob, 4),
                    "mammo_fm_class": "Malignant" if prob >= 0.5 else "Benign",
                    "histopathology": "", "histopath_type": "",
                    "examiner": "Mammo-FM AI",
                })
                st.success(f"Score: {prob:.4f}")
                st.rerun()

            # ── Tabs ─────────────────────────────────────────────────────
            t_view, t_ocr, t_heat, t_chat, t_meta = st.tabs([
                "🖥️ Viewer", "🔍 OCR Extract", "🔥 Heatmap", "💬 AI Chat", "ℹ️ DICOM"
            ])

            with t_view:
                raw = load_image_raw(sel)
                c1, c2 = st.columns(2)
                with c1:
                    bright = st.slider("Brightness", -100, 100, 0, 5, key="br")
                    cont = st.slider("Contrast", 0.5, 3.0, 1.0, 0.1, key="co")
                with c2:
                    gamma = st.slider("Gamma", 0.5, 2.5, 1.0, 0.1, key="gm")
                    inv = st.checkbox("Invert X-ray", key="iv")

                adj = adjust_image_window(raw, brightness=bright, contrast=cont, gamma=gamma)
                if inv:
                    adj = invert_image(adj)
                st.image(adj, width="stretch",
                         caption=f"{adj.shape[1]}×{adj.shape[0]} px")

            with t_ocr:
                st.markdown("##### 🔍 OCR — Burned-In Text Extraction")
                st.caption("Reads text labels burned into the mammogram pixels (view labels, age, etc.)")

                ocr_key = f"ocr_result_{sel}"
                if st.button("▶ Run OCR on This Image", type="primary", width="stretch", key="run_ocr_single"):
                    with st.spinner("Running EasyOCR..."):
                        raw_for_ocr = load_image_raw(sel)
                        ocr_res = ocr_mammogram(raw_for_ocr)
                        st.session_state[ocr_key] = ocr_res

                if ocr_key in st.session_state:
                    res = st.session_state[ocr_key]
                    # Show detected fields
                    m1, m2, m3 = st.columns(3)
                    with m1:
                        st.metric("View", res["view"] or "—")
                    with m2:
                        st.metric("Side", res["side"] or "—")
                    with m3:
                        st.metric("Age", str(res["age"]) if res["age"] else "—")

                    # Raw detections table
                    if res["raw_texts"]:
                        st.markdown("###### All Detected Text")
                        ocr_df = pd.DataFrame([
                            {"Text": r["text"], "Confidence": f"{r['confidence']*100:.0f}%"}
                            for r in res["raw_texts"]
                        ])
                        st.dataframe(ocr_df, use_container_width=True, hide_index=True)
                    else:
                        st.info("No text detected in this image.")
                else:
                    st.info("Click **Run OCR** to extract burned-in text from this scan.")

                st.divider()
                st.markdown("##### 🔄 Batch OCR — Scan All Patients")
                st.caption("Run OCR on all loaded patients to extract view labels and age for the entire cohort.")
                if st.button("⚡ OCR Scan All Patients", width="stretch", key="ocr_bulk"):
                    prog = st.progress(0.0, text="Starting OCR scan...")
                    total_views = sum(len(p["views"]) for p in patients)
                    done_views = 0
                    results_summary = []
                    for pi, pg in enumerate(patients):
                        summary = ocr_enrich_patient_data(pg)
                        done_views += len(pg["views"])
                        prog.progress(done_views / max(total_views, 1),
                                      text=f"OCR: {pg['patient_name']} ({done_views}/{total_views} views)")
                        results_summary.append({
                            "Patient": pg["patient_name"],
                            "MRN": pg["patient_id"],
                            "Views Detected": summary["ocr_views_detected"],
                            "Age": summary["ocr_age"] or "—",
                        })
                    prog.progress(1.0, text="OCR scan complete!")
                    st.success(f"✅ Scanned {total_views} views across {len(patients)} patients")
                    st.dataframe(pd.DataFrame(results_summary), use_container_width=True, hide_index=True)

            with t_heat:
                if weights_present() and head_present():
                    model = get_model()
                    img_u8 = load_image(sel)
                    _, overlay, bbox = model.predict_heatmap_and_bbox(img_u8)
                    st.image(overlay, channels="BGR", width="stretch",
                             caption="Feature Activation Heatmap")
                    if bbox:
                        xb, yb, wb, hb = bbox
                        st.success(f"🎯 Bounding Box: ({xb},{yb}) {wb}×{hb} px")
                    else:
                        st.info("🟢 No focal lesion detected.")
                else:
                    st.info("Load model first via Model Manager.")

            with t_chat:
                for msg in st.session_state["chat_messages"]:
                    with st.chat_message(msg["role"]):
                        st.markdown(msg["content"])
                if prompt := st.chat_input("Ask about this case..."):
                    st.session_state["chat_messages"].append({"role": "user", "content": prompt})
                    with st.chat_message("user"):
                        st.markdown(prompt)
                    with st.chat_message("assistant"):
                        with st.spinner("Thinking..."):
                            ctx = row.iloc[0].to_dict() if not row.empty else {"patient_name": p_name}
                            reply = get_clinical_chat_response(st.session_state["chat_messages"], patient_context=ctx)
                            st.markdown(reply)
                    st.session_state["chat_messages"].append({"role": "assistant", "content": reply})

            with t_meta:
                if sel.lower().endswith((".dcm", ".dicom")):
                    meta = extract_dicom_metadata(sel)
                    # Also add OCR-extracted metadata if available
                    ocr_key = f"ocr_result_{sel}"
                    if ocr_key in st.session_state:
                        ocr_res = st.session_state[ocr_key]
                        meta["OCR View Position"] = ocr_res["view"] or "—"
                        meta["OCR Breast Side"] = ocr_res["side"] or "—"
                        meta["OCR Patient Age"] = str(ocr_res["age"]) if ocr_res["age"] else "—"
                        meta["OCR Raw Text"] = ocr_res["all_text"] or "—"
                    st.table(pd.DataFrame(list(meta.items()), columns=["Tag", "Value"]))
                else:
                    st.info("DICOM metadata only available for .dcm files.")
        else:
            st.info("Click any **▶ View** button on the left to inspect a scan.")
