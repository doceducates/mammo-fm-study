# Verifying the numbers in SPSS / MedCalc

You asked for an *officially verified* cross-check of the app's calculations.
This is good scientific practice. The app's math is standard, but reviewers
and your ERC will trust it more if you reproduce it in SPSS (and/or MedCalc).

## Step 0 - Get the data file

In the app: **Dashboard -> Export -> SPSS-ready data (CSV)** (or run
`python compute_metrics.py`, which writes `data/results_for_spss.csv`).

Columns and coding:

| Column | Meaning | Codes |
| --- | --- | --- |
| `anonymized_id` | case id | text |
| `ai_prob` | Mammo-FM malignancy probability | 0.0 - 1.0 |
| `ai_positive` | AI call at threshold 0.5 | 1 = malignant, 0 = benign |
| `histo_positive` | **reference standard** (histopathology) | 1 = malignant, 0 = benign |
| `radiologist_positive` | radiologist BI-RADS 4/5 = positive | 1 / 0 |

> `histo_positive` is the gold standard ("truth"). `ai_positive` is the test.

## Step 1 - Import into SPSS

`File -> Import Data -> CSV Data...` -> pick `results_for_spss.csv`.
In *Variable View*, set `ai_positive`, `histo_positive`,
`radiologist_positive` to **Measure = Nominal**.

## Step 2 - AUC (ROC curve)  [SPSS does this directly]

`Analyze -> Classify -> ROC Curve...`
- **Test Variable:** `ai_prob`
- **State Variable:** `histo_positive`
- **Value of State Variable:** `1`
- Check: *With diagonal reference line*, *Standard error & confidence interval*,
  *Coordinate points of the ROC curve*.

SPSS reports **Area Under the Curve + 95% CI**. This should match the app's AUC.
The coordinate table also lists sensitivity and (1 - specificity) at every
threshold.

## Step 3 - Sensitivity / Specificity / PPV / NPV

SPSS base has no one-click diagnostic-test report, so use the 2x2 counts:

`Analyze -> Descriptive Statistics -> Crosstabs...`
- **Rows:** `ai_positive`   **Columns:** `histo_positive`
- *Cells...* -> check *Observed counts*.

Read the four counts and apply (same formulas the app uses):

```
Sensitivity = TP / (TP + FN)
Specificity = TN / (TN + FP)
PPV         = TP / (TP + FP)
NPV         = TN / (TN + FN)
Accuracy    = (TP + TN) / total
```
where TP = ai_positive 1 & histo_positive 1, etc.

## Step 4 - Agreement (Cohen's kappa)  [SPSS does this directly]

`Analyze -> Descriptive Statistics -> Crosstabs...`
- **Rows:** `ai_positive`   **Columns:** `radiologist_positive`
- *Statistics...* -> check **Kappa**.

This matches the app's "Cohen's kappa (AI vs radiologist)".

## Easiest official route: MedCalc (recommended for diagnostic tests)

Most radiology diagnostic-accuracy papers cite **MedCalc**, which gives
sensitivity, specificity, PPV, NPV, accuracy **with 95% CIs in one click**:
`Statistics -> Diagnostic test (2x2 table)`, entering your TP/FP/FN/TN.
MedCalc + SPSS together are a strong, reviewer-friendly verification.

## Expected tiny differences (important, and normal)

- **Point estimates** (sensitivity, specificity, PPV, NPV, accuracy, AUC,
  kappa) will match the app exactly.
- **95% confidence intervals may differ by a fraction of a percent.** The app
  uses the **Wilson score** method; SPSS ROC and MedCalc may use different CI
  methods (e.g. exact/efficient-score). All are valid - just state which method
  you used in your methods section. For proportions, Wilson is a modern,
  recommended choice.
