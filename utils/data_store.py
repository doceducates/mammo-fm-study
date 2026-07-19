import os
import pandas as pd

COLUMNS = [
    "serial_no", "anonymized_id", "date", "age", "breast_side",
    "breast_density", "lesion_size_mm", "radiologist_birads",
    "mammo_fm_prob", "mammo_fm_class", "histopathology",
    "histopath_type", "examiner",
]


def load_data(path="data/results.csv"):
    if os.path.exists(path):
        return pd.read_csv(path)
    return pd.DataFrame(columns=COLUMNS)


def append_row(row, path="data/results.csv"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df = load_data(path)
    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    df.to_csv(path, index=False)
    return df
