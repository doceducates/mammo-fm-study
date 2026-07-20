"""Shared 'cancer head' training logic (used by both the UI page and the CLI).

Mammo-FM only turns an image into 2048 numbers (features); it does NOT say
cancer/benign. This trains a tiny logistic-regression 'head' on labeled images
so the app can output a real malignancy probability.

Labeled images live in:
    data/labeled/benign/       (histopathology-proven NOT cancer)
    data/labeled/malignant/    (histopathology-proven cancer)
Any layout / DICOM / PNG / JPG is fine; subfolders are searched.
"""
import os
import numpy as np
import joblib

from utils.ingest import find_images, load_image

LABELS = {"benign": 0, "malignant": 1}
HEAD_OUT = "model/weights/linear_head.joblib"


def count_labeled():
    """How many labeled images are currently available per class."""
    return {name: len(find_images(os.path.join("data/labeled", name)))
            for name in LABELS}


def train_head(model, progress_cb=None):
    """Extract features for every labeled image and fit the linear head.

    `model` is a loaded MammoFM. `progress_cb(i, total)` is optional.
    Returns a summary dict. Raises ValueError if data is insufficient.
    """
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import cross_val_score

    items = []
    for name, label in LABELS.items():
        for p in find_images(os.path.join("data/labeled", name)):
            items.append((p, label))

    total = len(items)
    if total == 0:
        raise ValueError("No labeled images found in data/labeled/.")

    X, y, skipped = [], [], []
    for i, (p, label) in enumerate(items, 1):
        try:
            feats = model.extract_features(load_image(p))
            X.append(feats)
            y.append(label)
        except Exception as e:  # noqa: BLE001
            skipped.append((p, str(e)))
        if progress_cb:
            progress_cb(i, total)

    X, y = np.array(X), np.array(y)
    if len(y) == 0 or len(set(y.tolist())) < 2:
        raise ValueError(
            "Need BOTH benign AND malignant labeled images (at least one each).")

    clf = LogisticRegression(max_iter=1000, class_weight="balanced")
    auc = None
    if len(y) >= 10:
        # Rough, optimistic sanity check ON THE TRAINING DATA -- this is NOT
        # your study result. Your real numbers come from the LGH test set.
        auc = float(cross_val_score(clf, X, y, cv=5, scoring="roc_auc").mean())
    clf.fit(X, y)

    os.makedirs("model/weights", exist_ok=True)
    joblib.dump(clf, HEAD_OUT)

    return {
        "n": int(len(y)),
        "n_benign": int((y == 0).sum()),
        "n_malignant": int((y == 1).sum()),
        "auc": auc,
        "skipped": skipped,
        "path": HEAD_OUT,
    }
