import numpy as np
import pandas as pd
import streamlit as st
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, roc_auc_score, cohen_kappa_score
from utils.data_store import load_data

st.title("📊 Analysis Dashboard")

df = load_data()

st.subheader("1. Enter / update histopathology (reference standard)")
edited = st.data_editor(df, num_rows="dynamic", use_container_width=True)
if st.button("💾 Save histopathology edits"):
    edited.to_csv("data/results.csv", index=False)
    df = edited
    st.success("Saved.")


def norm_truth(v):
    s = str(v).strip().lower()
    if s in ("malignant", "m", "1", "positive", "pos", "cancer"):
        return 1
    if s in ("benign", "b", "0", "negative", "neg"):
        return 0
    return np.nan


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
    yhat = (work["prob"].values >= thr).astype(int)

    TP = int(((yhat == 1) & (y == 1)).sum())
    TN = int(((yhat == 0) & (y == 0)).sum())
    FP = int(((yhat == 1) & (y == 0)).sum())
    FN = int(((yhat == 0) & (y == 1)).sum())

    def wilson(k, n):
        if n == 0:
            return (np.nan, np.nan, np.nan)
        p, z = k / n, 1.96
        d = 1 + z * z / n
        centre = (p + z * z / (2 * n)) / d
        half = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
        return p, max(0, centre - half), min(1, centre + half)

    sens, spec = wilson(TP, TP + FN), wilson(TN, TN + FP)
    ppv, npv = wilson(TP, TP + FP), wilson(TN, TN + FN)
    acc = wilson(TP + TN, TP + TN + FP + FN)

    a, b, c = st.columns(3)
    a.metric("Sensitivity", f"{sens[0]*100:.1f}%",
             f"95% CI {sens[1]*100:.1f}-{sens[2]*100:.1f}")
    b.metric("Specificity", f"{spec[0]*100:.1f}%",
             f"95% CI {spec[1]*100:.1f}-{spec[2]*100:.1f}")
    c.metric("Accuracy", f"{acc[0]*100:.1f}%",
             f"95% CI {acc[1]*100:.1f}-{acc[2]*100:.1f}")
    d, e, _ = st.columns(3)
    d.metric("PPV", f"{ppv[0]*100:.1f}%",
             f"95% CI {ppv[1]*100:.1f}-{ppv[2]*100:.1f}")
    e.metric("NPV", f"{npv[0]*100:.1f}%",
             f"95% CI {npv[1]*100:.1f}-{npv[2]*100:.1f}")

    st.markdown("**2x2 contingency table**")
    st.table(pd.DataFrame([[TP, FP], [FN, TN]],
                          index=["AI +", "AI -"],
                          columns=["Histo + (malignant)", "Histo - (benign)"]))

    if len(np.unique(y)) == 2:
        auc = roc_auc_score(y, work["prob"].values)
        fpr, tpr, _ = roc_curve(y, work["prob"].values)
        fig, ax = plt.subplots(figsize=(4, 4))
        ax.plot(fpr, tpr, label=f"AUC = {auc:.3f}")
        ax.plot([0, 1], [0, 1], "--", color="gray")
        ax.set_xlabel("1 - Specificity")
        ax.set_ylabel("Sensitivity")
        ax.set_title("ROC - Mammo-FM")
        ax.legend()
        st.pyplot(fig)
        st.metric("AUC", f"{auc:.3f}")

    def birads_pos(v):
        s = str(v).upper()
        return 1 if s.startswith("4") or s == "5" else 0

    try:
        rad = work["radiologist_birads"].apply(birads_pos)
        kappa = cohen_kappa_score(rad, yhat)
        st.metric("Cohen's kappa (AI vs radiologist BI-RADS)", f"{kappa:.3f}")
    except Exception:
        pass

st.download_button("⬇ Download results.csv",
                   data=df.to_csv(index=False), file_name="results.csv")
