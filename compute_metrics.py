"""Recompute all diagnostic metrics from data/results.csv in one command
(no app needed). Also writes SPSS-ready and metrics-summary CSVs so you can
reproduce/verify the same numbers in SPSS or MedCalc.

Run:  python compute_metrics.py            # threshold 0.5
      python compute_metrics.py 0.4         # custom threshold
"""
import sys
import pandas as pd
from utils.data_store import load_data
from utils.metrics import (norm_truth, diagnostic_metrics, metrics_table,
                           spss_ready)


def main(threshold=0.5):
    df = load_data()
    y = df["histopathology"].apply(norm_truth)
    prob = pd.to_numeric(df["mammo_fm_prob"], errors="coerce")
    mask = y.notna() & prob.notna()
    if mask.sum() == 0:
        raise SystemExit("No completed cases (need histopathology + AI prob).")
    y, prob = y[mask].astype(int).values, prob[mask].values

    m = diagnostic_metrics(y, prob, threshold=threshold)
    print(f"n = {m['n']}, threshold = {m['threshold']}")
    print(f"2x2:  TP={m['TP']}  FP={m['FP']}  FN={m['FN']}  TN={m['TN']}")
    print(metrics_table(m).to_string(index=False))
    if m["auc"] is not None:
        print(f"AUC = {m['auc']:.3f}")

    metrics_table(m).to_csv("data/metrics_summary.csv", index=False)
    spss_ready(df).to_csv("data/results_for_spss.csv", index=False)
    print("Wrote data/metrics_summary.csv and data/results_for_spss.csv")


if __name__ == "__main__":
    thr = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
    main(thr)
