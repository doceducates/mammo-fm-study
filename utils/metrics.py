"""Shared diagnostic-accuracy metrics.

The dashboard AND the command-line tool (compute_metrics.py) both import from
here, so they always produce IDENTICAL numbers. This is also what you cross-
check against SPSS / MedCalc (see SPSS_VERIFICATION.md).
"""
import numpy as np
import pandas as pd

Z95 = 1.959963984540054  # z for a two-sided 95% interval


def norm_truth(v):
    """Map a histopathology label to 1 (malignant), 0 (benign) or NaN."""
    s = str(v).strip().lower()
    if s in ("malignant", "m", "1", "positive", "pos", "cancer"):
        return 1
    if s in ("benign", "b", "0", "negative", "neg"):
        return 0
    return np.nan


def birads_pos(v):
    """Radiologist BI-RADS 4/5 -> positive (1), else 0."""
    s = str(v).upper()
    return 1 if s.startswith("4") or s == "5" else 0


def wilson(k, n):
    """Wilson score 95% CI for a proportion k/n -> (point, low, high)."""
    if n == 0:
        return (np.nan, np.nan, np.nan)
    p = k / n
    d = 1 + Z95 * Z95 / n
    centre = (p + Z95 * Z95 / (2 * n)) / d
    half = Z95 * np.sqrt(p * (1 - p) / n + Z95 * Z95 / (4 * n * n)) / d
    return p, max(0.0, centre - half), min(1.0, centre + half)


def confusion(y_true, y_pred):
    y_true = np.asarray(y_true).astype(int)
    y_pred = np.asarray(y_pred).astype(int)
    TP = int(((y_pred == 1) & (y_true == 1)).sum())
    TN = int(((y_pred == 0) & (y_true == 0)).sum())
    FP = int(((y_pred == 1) & (y_true == 0)).sum())
    FN = int(((y_pred == 0) & (y_true == 1)).sum())
    return TP, TN, FP, FN


def diagnostic_metrics(y_true, prob, threshold=0.5):
    """All diagnostic metrics + 2x2 counts at a given probability threshold."""
    y_true = np.asarray(y_true).astype(int)
    prob = np.asarray(prob, dtype=float)
    y_pred = (prob >= threshold).astype(int)
    TP, TN, FP, FN = confusion(y_true, y_pred)
    out = {
        "n": int(len(y_true)),
        "threshold": float(threshold),
        "TP": TP, "TN": TN, "FP": FP, "FN": FN,
        "sensitivity": wilson(TP, TP + FN),
        "specificity": wilson(TN, TN + FP),
        "ppv": wilson(TP, TP + FP),
        "npv": wilson(TN, TN + FN),
        "accuracy": wilson(TP + TN, TP + TN + FP + FN),
        "auc": None,
    }
    if len(np.unique(y_true)) == 2:
        from sklearn.metrics import roc_auc_score
        out["auc"] = float(roc_auc_score(y_true, prob))
    return out


def metrics_table(m):
    """Tidy DataFrame of metrics as percentages with 95% CIs."""
    def row(name, tup):
        p, lo, hi = tup
        return {"Metric": name, "Value (%)": round(p * 100, 1),
                "95% CI low (%)": round(lo * 100, 1),
                "95% CI high (%)": round(hi * 100, 1)}
    rows = [row("Sensitivity", m["sensitivity"]),
            row("Specificity", m["specificity"]),
            row("PPV", m["ppv"]), row("NPV", m["npv"]),
            row("Accuracy", m["accuracy"])]
    df = pd.DataFrame(rows)
    if m.get("auc") is not None:
        df = pd.concat([df, pd.DataFrame([{
            "Metric": "AUC", "Value (%)": round(m["auc"] * 100, 1),
            "95% CI low (%)": np.nan, "95% CI high (%)": np.nan}])],
            ignore_index=True)
    return df


def spss_ready(df):
    """Numeric-coded table for SPSS / MedCalc import.

    Columns: anonymized_id, ai_prob, ai_positive (1/0), histo_positive (1/0),
    radiologist_positive (1/0). Blank cells become missing values.
    """
    out = pd.DataFrame()
    out["anonymized_id"] = df.get("anonymized_id", "")
    ai_prob = pd.to_numeric(df.get("mammo_fm_prob"), errors="coerce")
    out["ai_prob"] = ai_prob
    ai_pos = ai_prob.apply(
        lambda p: (1 if p >= 0.5 else 0) if pd.notna(p) else np.nan)
    out["ai_positive"] = pd.array(ai_pos, dtype="Int64")
    if "histopathology" in df.columns:
        out["histo_positive"] = pd.array(
            df["histopathology"].apply(norm_truth), dtype="Int64")
    if "radiologist_birads" in df.columns:
        out["radiologist_positive"] = pd.array(
            df["radiologist_birads"].apply(birads_pos), dtype="Int64")
    return out
