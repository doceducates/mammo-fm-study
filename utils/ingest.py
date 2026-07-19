"""Find and load mammogram images from a folder (DICOM / PNG / JPG).

Handles any folder layout (subfolders are searched too). DICOMs are
anonymized on load.
"""
import os
import numpy as np
from PIL import Image
from utils.dicom_utils import dicom_to_array, preprocess_for_model

IMAGE_EXTS = (".dcm", ".dicom", ".png", ".jpg", ".jpeg")


def find_images(folder):
    """Recursively find all supported images under `folder`."""
    hits = []
    for root, _dirs, files in os.walk(folder):
        for f in files:
            if f.lower().endswith(IMAGE_EXTS):
                hits.append(os.path.join(root, f))
    return sorted(hits)


def load_image(path):
    """Load one file -> preprocessed uint8 array (DICOM is anonymized)."""
    if path.lower().endswith((".dcm", ".dicom")):
        raw = dicom_to_array(path)
    else:
        raw = np.array(Image.open(path).convert("L"))
    return preprocess_for_model(raw)
