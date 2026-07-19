-- =====================================================================
--  Mammo-FM Diagnostic Accuracy Study - SQLite schema
--  PGMI / Lahore General Hospital, Department of Radiology
--
--  Normalised alternative to results.csv. One study_case row per patient
--  case; one or more ai_inference rows per case (supports re-runs and
--  comparing Mammo-FM vs Mammo-CLIP). A view joins them for analysis.
--
--  Build:   sqlite3 study.db < db/schema.sql
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 1. Study cases (reference standard + clinical/imaging metadata)
--    NOTE: store ONLY anonymized identifiers here. No PHI.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_case (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    anonymized_id      TEXT    NOT NULL UNIQUE,          -- e.g. STUDY-001
    enrolment_date     TEXT,                             -- ISO YYYY-MM-DD
    age                INTEGER CHECK (age >= 0 AND age <= 120),
    breast_side        TEXT    CHECK (breast_side IN ('Right','Left','Bilateral')),
    breast_density     TEXT    CHECK (breast_density IN ('A','B','C','D')),
    lesion_size_mm     REAL,
    radiologist_birads TEXT,                             -- 0,1,2,3,4A,4B,4C,5
    histopathology     TEXT    CHECK (histopathology IN ('malignant','benign','') OR histopathology IS NULL),
    histopath_type     TEXT,                             -- e.g. IDC, fibroadenoma
    examiner           TEXT,
    created_at         TEXT    DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- 2. AI inference runs (index test output)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_inference (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id        INTEGER NOT NULL REFERENCES study_case(id) ON DELETE CASCADE,
    model_name     TEXT    NOT NULL DEFAULT 'Mammo-FM',
    model_version  TEXT,
    prob           REAL    NOT NULL CHECK (prob >= 0 AND prob <= 1),
    threshold      REAL    NOT NULL DEFAULT 0.5,
    predicted_class TEXT   CHECK (predicted_class IN ('Malignant','Benign')),
    run_at         TEXT    DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- 3. Analysis run snapshots (optional: store computed metrics)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_snapshot (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name   TEXT,
    threshold    REAL,
    n_cases      INTEGER,
    tp INTEGER, tn INTEGER, fp INTEGER, fn INTEGER,
    sensitivity  REAL, specificity REAL,
    ppv REAL, npv REAL, accuracy REAL, auc REAL,
    computed_at  TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_infer_case  ON ai_inference(case_id);
CREATE INDEX IF NOT EXISTS idx_infer_model ON ai_inference(model_name);
CREATE INDEX IF NOT EXISTS idx_case_histo  ON study_case(histopathology);

-- ---------------------------------------------------------------------
-- Analysis view: latest inference per case + reference standard.
-- Use this for the 2x2 table, sensitivity/specificity, ROC/AUC.
-- ---------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_analysis AS
SELECT
    c.id                AS case_id,
    c.anonymized_id,
    c.age,
    c.breast_density,
    c.lesion_size_mm,
    c.radiologist_birads,
    c.histopathology,
    i.model_name,
    i.prob,
    i.threshold,
    i.predicted_class,
    CASE WHEN c.histopathology = 'malignant' THEN 1
         WHEN c.histopathology = 'benign'    THEN 0
         ELSE NULL END AS y_true,
    CASE WHEN i.prob >= i.threshold THEN 1 ELSE 0 END AS y_pred
FROM study_case c
JOIN ai_inference i ON i.case_id = c.id
WHERE i.id = (
    SELECT id FROM ai_inference
    WHERE case_id = c.id AND model_name = i.model_name
    ORDER BY run_at DESC, id DESC LIMIT 1
);

-- ---------------------------------------------------------------------
-- Example: confusion-matrix counts for a model in one query
-- ---------------------------------------------------------------------
-- SELECT model_name,
--   SUM(y_true=1 AND y_pred=1) AS tp,
--   SUM(y_true=0 AND y_pred=0) AS tn,
--   SUM(y_true=0 AND y_pred=1) AS fp,
--   SUM(y_true=1 AND y_pred=0) AS fn
-- FROM v_analysis WHERE y_true IS NOT NULL GROUP BY model_name;
