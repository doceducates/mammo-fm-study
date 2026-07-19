"""Train the 'cancer head' (linear probe) on top of frozen Mammo-FM features.

WHY: Mammo-FM by itself only turns an image into numbers (features); it does
NOT say cancer/benign. This script trains a tiny classifier on labeled images
so the app can output a real malignancy probability.

HOW TO USE (do this once):
  1. Sort labeled, histopathology-proven images into:
         data/labeled/malignant/
         data/labeled/benign/
     (DICOM / PNG / JPG; subfolders are fine.)
  2. Run:  python train_linear_probe.py
  3. It saves model/weights/linear_head.joblib. Reload the app -> done.

NOTE: needs the encoder loader in model/mammo_fm_wrapper.py to be filled in
(the ADAPT block), because it reads image features from the model.
"""
import os
import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from utils.ingest import find_images, load_image
from model.mammo_fm_wrapper import MammoFM

LABELS = {"benign": 0, "malignant": 1}
HEAD_OUT = "model/weights/linear_head.joblib"


def main():
    model = MammoFM(
        checkpoint_path="model/weights/Mammo-FM_BatmanlabTrained_CLIP.tar")

    X, y = [], []
    for name, label in LABELS.items():
        folder = os.path.join("data/labeled", name)
        files = find_images(folder)
        print(f"{name:9s}: {len(files)} image(s) in {folder}")
        for p in files:
            try:
                feats = model.extract_features(load_image(p))
                X.append(feats)
                y.append(label)
            except Exception as e:  # noqa: BLE001
                print(f"  skipped {p}: {e}")

    X, y = np.array(X), np.array(y)
    if len(set(y.tolist())) < 2:
        raise SystemExit("Need BOTH benign AND malignant labeled images.")

    clf = LogisticRegression(max_iter=1000, class_weight="balanced")
    if len(y) >= 10:
        auc = cross_val_score(clf, X, y, cv=5, scoring="roc_auc").mean()
        print(f"5-fold cross-validated AUC (rough): {auc:.3f}")
    clf.fit(X, y)

    os.makedirs("model/weights", exist_ok=True)
    joblib.dump(clf, HEAD_OUT)
    print(f"Saved cancer head trained on {len(y)} image(s) -> {HEAD_OUT}")
    print("Reload the app (or use Unload + Load on the Model Setup page).")


if __name__ == "__main__":
    main()
