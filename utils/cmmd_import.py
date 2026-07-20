"""Import the CMMD (Chinese Mammography Database) into data/labeled/.

CMMD is a FREE, biopsy-confirmed public dataset (benign / malignant) from The
Cancer Imaging Archive (CC BY-NC). Training the cancer head on CMMD keeps your
LGH cases as an untouched test set -- the proper external-validation design.

Download: https://www.cancerimagingarchive.net/collection/cmmd/
You get:
  - DICOM images (one subfolder per patient, e.g. D1-0001/...)
  - a clinical-data file (CMMD_clinicaldata_revision.xlsx) whose
    'classification' column is Benign / Malignant, per patient per breast.

This reads each DICOM's PatientID + laterality (L/R), looks up its
benign/malignant label, and copies it into data/labeled/benign or
data/labeled/malignant so the cancer head can train on it immediately.
"""
import os
import shutil

LABEL_DIRS = {
    "benign": "data/labeled/benign",
    "malignant": "data/labeled/malignant",
}


def _find_col(cols, needles):
    """Find a column whose normalized name contains any of `needles`."""
    norm = {c.lower().replace(" ", "").replace("_", ""): c for c in cols}
    for n in needles:
        for key, orig in norm.items():
            if n in key:
                return orig
    return None


def read_label_map(meta_path):
    """Return {(PATIENT_ID, 'L'/'R'/None): 'benign'/'malignant'}."""
    import pandas as pd
    if meta_path.lower().endswith((".xlsx", ".xls")):
        df = pd.read_excel(meta_path)
    else:
        df = pd.read_csv(meta_path)
    df.columns = [str(c).strip() for c in df.columns]

    id_col = _find_col(df.columns, ["id1", "patientid", "id"])
    lr_col = _find_col(df.columns, ["leftright", "laterality", "side"])
    cls_col = _find_col(df.columns,
                        ["classification", "class", "pathology", "label"])
    if not id_col or not cls_col:
        raise ValueError(
            "Could not find the patient-ID and/or classification columns in "
            f"{os.path.basename(meta_path)}. Columns found: {list(df.columns)}")

    mapping = {}
    for _, row in df.iterrows():
        pid = str(row[id_col]).strip().upper()
        cls = str(row[cls_col]).strip().lower()
        if not pid or pid == "NAN":
            continue
        label = "malignant" if cls.startswith("m") else "benign"
        lr = None
        if lr_col is not None:
            raw = str(row[lr_col]).strip().upper()
            if raw and raw != "NAN":
                lr = raw[:1]  # 'L' or 'R'
        mapping[(pid, lr)] = label
    return mapping


def _dicom_meta(path):
    import pydicom
    ds = pydicom.dcmread(path, stop_before_pixels=True, force=True)
    pid = str(ds.get("PatientID", "")).strip().upper()
    lat = ds.get("ImageLaterality", None) or ds.get("Laterality", None)
    lat = str(lat).strip().upper()[:1] if lat else None
    view = str(ds.get("ViewPosition", "")).strip().upper()
    return pid, lat, view


def import_cmmd(dicom_root, meta_path, copy=True, progress_cb=None):
    """Sort CMMD DICOMs into data/labeled/{benign,malignant}/.

    Returns a summary dict: total_dicoms, benign, malignant, unmatched.
    """
    mapping = read_label_map(meta_path)
    for d in LABEL_DIRS.values():
        os.makedirs(d, exist_ok=True)

    dcms = []
    for root, _dirs, files in os.walk(dicom_root):
        for f in files:
            if f.lower().endswith((".dcm", ".dicom")):
                dcms.append(os.path.join(root, f))
    dcms.sort()

    counts = {"benign": 0, "malignant": 0}
    unmatched = 0
    total = len(dcms)
    for i, path in enumerate(dcms, 1):
        try:
            pid, lat, view = _dicom_meta(path)
        except Exception:  # noqa: BLE001
            unmatched += 1
            if progress_cb:
                progress_cb(i, total)
            continue

        label = None
        if lat is not None and (pid, lat) in mapping:
            label = mapping[(pid, lat)]
        elif (pid, None) in mapping:
            label = mapping[(pid, None)]
        else:
            for (mpid, _mlat), lbl in mapping.items():
                if mpid == pid:
                    label = lbl
                    break

        if label is None:
            unmatched += 1
        else:
            base = f"{pid}_{lat or 'NA'}_{view or 'NA'}_{os.path.basename(path)}"
            dest = os.path.join(LABEL_DIRS[label], base)
            try:
                shutil.copy2(path, dest)
                counts[label] += 1
            except Exception:  # noqa: BLE001
                unmatched += 1
        if progress_cb:
            progress_cb(i, total)

    return {
        "total_dicoms": total,
        "benign": counts["benign"],
        "malignant": counts["malignant"],
        "unmatched": unmatched,
    }
