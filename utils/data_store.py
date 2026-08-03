import os
import pandas as pd

import os
import pandas as pd

COLUMNS = [
    "serial_no", "patient_name", "anonymized_id", "date", "age", "breast_side",
    "lesion_side", "lesion_quadrant", "radiological_finding",
    "breast_density", "lesion_size_mm", "radiologist_birads",
    "mammo_fm_prob", "mammo_fm_class", "histopathology",
    "histopath_type", "examiner",
]


def load_data(path="data/results.csv"):
    if os.path.exists(path):
        df = pd.read_csv(path)
        # Ensure all columns exist in df
        for col in COLUMNS:
            if col not in df.columns:
                df[col] = ""
        return df[COLUMNS]
    return pd.DataFrame(columns=COLUMNS)


def save_data(df, path="data/results.csv"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for col in COLUMNS:
        if col not in df.columns:
            df[col] = ""
    df[COLUMNS].to_csv(path, index=False)
    return df


