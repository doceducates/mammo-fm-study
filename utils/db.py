"""Optional SQLite backend (alternative to results.csv).

Usage:
    from utils.db import init_db, add_case, add_inference, analysis_df
    init_db()  # creates study.db from db/schema.sql
"""
import os
import sqlite3
import pandas as pd

DB_PATH = os.environ.get("MAMMO_DB", "data/study.db")
SCHEMA_PATH = "db/schema.sql"


def _connect():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(schema_path=SCHEMA_PATH):
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = f.read()
    with _connect() as conn:
        conn.executescript(schema)


def add_case(anonymized_id, **fields):
    cols = ["anonymized_id"] + list(fields.keys())
    vals = [anonymized_id] + list(fields.values())
    placeholders = ", ".join("?" * len(cols))
    sql = (f"INSERT INTO study_case ({', '.join(cols)}) "
           f"VALUES ({placeholders}) "
           f"ON CONFLICT(anonymized_id) DO UPDATE SET "
           + ", ".join(f"{c}=excluded.{c}" for c in cols if c != 'anonymized_id'))
    with _connect() as conn:
        cur = conn.execute(sql, vals)
        row = conn.execute(
            "SELECT id FROM study_case WHERE anonymized_id = ?",
            (anonymized_id,)).fetchone()
        return row[0]


def add_inference(case_id, prob, model_name="Mammo-FM",
                  model_version=None, threshold=0.5):
    predicted = "Malignant" if prob >= threshold else "Benign"
    with _connect() as conn:
        conn.execute(
            "INSERT INTO ai_inference "
            "(case_id, model_name, model_version, prob, threshold, predicted_class) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (case_id, model_name, model_version, prob, threshold, predicted))


def analysis_df(model_name="Mammo-FM"):
    with _connect() as conn:
        return pd.read_sql_query(
            "SELECT * FROM v_analysis WHERE model_name = ?",
            conn, params=(model_name,))
