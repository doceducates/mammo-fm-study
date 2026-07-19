"""Minimal standalone pilot test.

Goal: confirm Mammo-FM weights load and produce a malignancy score on a
SINGLE public test image (VinDr-Mammo / RSNA) BEFORE touching patient data.

Run:
    python pilot_test.py path/to/public_image.dcm
"""
import sys
import torch
from utils.dicom_utils import dicom_to_array, preprocess_for_model
from model.mammo_fm_wrapper import MammoFM


def main(path):
    print("CUDA available:", torch.cuda.is_available())
    if torch.cuda.is_available():
        print("GPU:", torch.cuda.get_device_name(0))

    if path.lower().endswith(".dcm"):
        raw = dicom_to_array(path)
    else:
        import numpy as np
        from PIL import Image
        raw = np.array(Image.open(path).convert("L"))

    img = preprocess_for_model(raw)
    print("Preprocessed image shape:", img.shape)

    model = MammoFM(
        checkpoint_path="model/weights/Mammo-FM_BatmanlabTrained_CLIP.tar")
    prob = model.predict(img)
    print(f"Malignancy probability: {prob:.4f}")
    print("Predicted class:", "Malignant" if prob >= 0.5 else "Benign")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python pilot_test.py <image.dcm|image.png>")
        sys.exit(1)
    main(sys.argv[1])
