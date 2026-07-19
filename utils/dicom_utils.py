import numpy as np
import pydicom
from pydicom.pixel_data_handlers.util import apply_voi_lut
from PIL import Image
import cv2

# Common PHI tags to blank out before anything is shown or saved.
PHI_TAGS = [
    "PatientName", "PatientID", "PatientBirthDate", "PatientAddress",
    "OtherPatientIDs", "OtherPatientNames", "PatientTelephoneNumbers",
    "InstitutionName", "InstitutionAddress", "ReferringPhysicianName",
    "PerformingPhysicianName", "OperatorsName", "AccessionNumber",
    "StudyID", "StudyDate", "StudyTime", "ContentDate", "ContentTime",
    "DeviceSerialNumber", "StationName",
]


def anonymize_dataset(ds):
    """Blank common PHI tags in-place and strip private tags."""
    for tag in PHI_TAGS:
        if tag in ds:
            try:
                ds.data_element(tag).value = ""
            except Exception:
                pass
    ds.remove_private_tags()
    return ds


def dicom_to_array(path, apply_voi=True):
    ds = pydicom.dcmread(path, force=True)
    anonymize_dataset(ds)
    arr = ds.pixel_array.astype(np.float32)
    if apply_voi:
        try:
            arr = apply_voi_lut(ds.pixel_array, ds).astype(np.float32)
        except Exception:
            pass
    # MONOCHROME1 is inverted -> flip so bright = dense tissue
    if getattr(ds, "PhotometricInterpretation", "") == "MONOCHROME1":
        arr = arr.max() - arr
    arr = arr - arr.min()
    if arr.max() > 0:
        arr = arr / arr.max()
    return (arr * 255.0).astype(np.uint8)


def crop_breast_region(img_u8):
    """Crop to the breast using Otsu threshold + largest contour bbox."""
    _, mask = cv2.threshold(img_u8, 0, 255,
                            cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL,
                               cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return img_u8
    x, y, w, h = cv2.boundingRect(max(cnts, key=cv2.contourArea))
    return img_u8[y:y + h, x:x + w]


def preprocess_for_model(img_u8, size=(912, 1520), crop=True):
    """Return a uint8 image (W, H) ready for the model.
    NOTE: confirm the exact target size/orientation from the Mammo-FM repo."""
    if crop:
        img_u8 = crop_breast_region(img_u8)
    pil = Image.fromarray(img_u8).convert("L").resize(size)
    return np.array(pil)
