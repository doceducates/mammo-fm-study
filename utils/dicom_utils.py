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


def extract_dicom_metadata(path):
    """Safely extract DICOM header metadata before anonymization."""
    meta = {
        "PatientName": "Unknown / Anonymized",
        "PatientID": "Unknown ID",
        "StudyDate": "Unknown Date",
        "Laterality": "",
        "ViewPosition": "",
        "AcquisitionDeviceProcessingDescription": "",
        "Manufacturer": "",
        "KVP": "",
        "Exposure": "",
        "PhotometricInterpretation": "",
    }
    if not path.lower().endswith((".dcm", ".dicom")):
        return meta
    try:
        ds = pydicom.dcmread(path, force=True)
        if "PatientName" in ds and ds.PatientName:
            meta["PatientName"] = str(ds.PatientName).replace("^", " ").strip()
        if "PatientID" in ds and ds.PatientID:
            meta["PatientID"] = str(ds.PatientID).strip()
        if "StudyDate" in ds and ds.StudyDate:
            meta["StudyDate"] = str(ds.StudyDate).strip()
        if "Laterality" in ds and ds.Laterality:
            meta["Laterality"] = str(ds.Laterality).strip()
        if "ViewPosition" in ds and ds.ViewPosition:
            meta["ViewPosition"] = str(ds.ViewPosition).strip()
        if "AcquisitionDeviceProcessingDescription" in ds and ds.AcquisitionDeviceProcessingDescription:
            meta["AcquisitionDeviceProcessingDescription"] = str(ds.AcquisitionDeviceProcessingDescription).strip()
        if "Manufacturer" in ds and ds.Manufacturer:
            meta["Manufacturer"] = str(ds.Manufacturer).strip()
        if "KVP" in ds and ds.KVP:
            meta["KVP"] = str(ds.KVP).strip()
        if "Exposure" in ds and ds.Exposure:
            meta["Exposure"] = str(ds.Exposure).strip()
        if "PhotometricInterpretation" in ds and ds.PhotometricInterpretation:
            meta["PhotometricInterpretation"] = str(ds.PhotometricInterpretation).strip()
    except Exception:
        pass
    return meta


def adjust_image_window(img_u8, brightness=0, contrast=1.0, gamma=1.0):
    """Adjust brightness (-100 to 100), contrast (0.5 to 3.0), and gamma (0.5 to 2.5) for interactive PACS windowing."""
    img_float = img_u8.astype(np.float32)
    # Contrast & Brightness
    img_float = img_float * contrast + brightness
    img_float = np.clip(img_float, 0, 255)
    # Gamma correction
    if gamma != 1.0 and gamma > 0:
        img_float = 255.0 * ((img_float / 255.0) ** (1.0 / gamma))
    return np.clip(img_float, 0, 255).astype(np.uint8)


def invert_image(img_u8):
    """Invert image monochrome intensities (X-ray Negative mode)."""
    return 255 - img_u8


def manual_crop_image(img_u8, x_pct, y_pct, w_pct, h_pct):
    """Crop image based on percentage bounding box (0.0 to 1.0)."""
    h, w = img_u8.shape[:2]
    x1 = int(np.clip(x_pct * w, 0, w - 1))
    y1 = int(np.clip(y_pct * h, 0, h - 1))
    x2 = int(np.clip((x_pct + w_pct) * w, 0, w))
    y2 = int(np.clip((y_pct + h_pct) * h, 0, h))
    if x2 <= x1 or y2 <= y1:
        return img_u8
    return img_u8[y1:y2, x1:x2]

