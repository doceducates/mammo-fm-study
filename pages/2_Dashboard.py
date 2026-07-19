import numpy as np
import pandas as pd
import streamlit as st
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, cohen_kappa_score
from utils.data_store import load_data
from utils.metrics import (norm_truth, birads_pos, diagnostic_metrics,
                           metrics_table, spss_ready)

st.title("📊 Analysis Dashboard")

df = load_data()

st.subheader("1. Enter / update histopathology (reference standard)")
edited = st.data_editor(df, num_rows="dynamic", use_container_width=True)
if st.button("💾 Save histopathology edits"):
    edited.to_csv("data/results.csv", index=False)
    df = edited
    st.success("Saved.")

work = df.copy()
work["y_true"] = work["histopathology"].apply(norm_truth)
work["prob"] = pd.to_numeric(work["mammo_fm_prob"], errors="coerce")
work = work.dropna(subset=["y_true", "prob"])

st.subheader("2. Diagnostic accuracy")
if len(work) < 5:
    st.warning("Need a few completed cases (with histopathology) to compute "
               "metrics.")
else:
    thr = st.slider("Operating threshold", 0.0, 1.0, 0.5, 0.01)
    y = work["y_true"].astype(int).values
    prob = work["prob"].values
    m = diagnostic_metrics(y, prob, threshold=thr)

    def pct(t):
        return f"{t[0]*100:.1f}%", f"95% CI {t[1]*100:.1f}-{t[2]*100:.1f}"

    a, b, c = st.columns(3)
    a.metric("Sensitivity", *pct(m["sensitivity"]))
    b.metric("Specificity", *pct(m["specificity"]))
    c.metric("Accuracy", *pct(m["accuracy"]))
    d, e, _ = st.columns(3)
    d.metric("PPV", *pct(m["ppv"]))
    e.metric("NPV", *pct(m["npv"]))

    st.markdown("**2x2 contingency table**")
    st.table(pd.DataFrame([[m["TP"], m["FP"]], [m["FN"], m["TN"]]],
                          index=["AI +", "AI -"],
                          columns=["Histo + (malignant)", "Histo - (benign)"]))

    if m["auc"] is not None:
        auc = m["auc"]
        fpr, tpr, _ = roc_curve(y, prob)
        fig, ax = plt.subplots(figsize=(4, 4))
        ax.plot(fpr, tpr, label=f"AUC = {auc:.3f}")
        ax.plot([0, 1], [0, 1], "--", color="gray")
        ax.set_xlabel("1 - Specificity")
        ax.set_ylabel("Sensitivity")
        ax.set_title("ROC - Mammo-FM")
        ax.legend()
        st.pyplot(fig)
        st.metric("AUC", f"{auc:.3f}")

    try:
        rad = work["radiologist_birads"].apply(birads_pos)
        yhat = (prob >= thr).astype(int)
        kappa = cohen_kappa_score(rad, yhat)
        st.metric("Cohen's kappa (AI vs radiologist BI-RADS)", f"{kappa:.3f}")
    except Exception:
        pass

    st.subheader("3. Export (for reporting + SPSS verification)")
    st.download_button(
        "⬇ Metrics summary (CSV)",
        data=metrics_table(m).to_csv(index=False),
        file_name="metrics_summary.csv")
    st.download_button(
        "⬇ SPSS-ready data (CSV)",
        data=spss_ready(df).to_csv(index=False),
        file_name="results_for_spss.csv",
        help="Numeric-coded (1/0) columns. See SPSS_VERIFICATION.md.")

st.subheader("Raw data export")
st.download_button("⬇ Download results.csv",
                   data=df.to_csv(index=False), file_name="results.csv")
