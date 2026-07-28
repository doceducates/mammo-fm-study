"""OCR utilities for extracting burned-in text from mammogram images.

Many PACS/CR systems embed patient info and projection labels directly
into the pixel data. This module uses EasyOCR to extract that text.
"""
import re
import numpy as np
import functools

# Lazy-load EasyOCR reader (GPU model takes ~1s to init)
_reader = None


def _get_reader():
    global _reader
    if _reader is None:
        import easyocr
        _reader = easyocr.Reader(["en"], gpu=True, verbose=False)
    return _reader


# ── Known projection label patterns ────────────────────────────────────
VIEW_PATTERNS = {
    # (regex, normalized_view, side)
    (r"\bLCC\b",        "LCC",   "Left Breast"),
    (r"\bRCC\b",        "RCC",   "Right Breast"),
    (r"\bL[\s\-]?MLO\b","L-MLO", "Left Breast"),
    (r"\bR[\s\-]?MLO\b","R-MLO", "Right Breast"),
    (r"\bLT\s*MLO\b",   "L-MLO", "Left Breast"),
    (r"\bRT\s*MLO\b",   "R-MLO", "Right Breast"),
    (r"\bLMO\b",        "L-MLO", "Left Breast"),
    (r"\bRMO\b",        "R-MLO", "Right Breast"),
    (r"\bLAT\s*L\b",    "L-LAT", "Left Breast"),
    (r"\bLAT\s*R\b",    "R-LAT", "Right Breast"),
}

# Age patterns: "AGE: 45", "45Y", "45 YRS", "AGE 45Y"
AGE_REGEX = re.compile(
    r"(?:AGE\s*[:\-]?\s*(\d{1,3})\s*(?:Y(?:RS?|EARS?)?)?)|"
    r"\b(\d{2})\s*(?:Y(?:RS?|EARS?)?)\b",
    re.IGNORECASE
)


def ocr_mammogram(img_u8, confidence_threshold=0.2):
    """Run EasyOCR on a mammogram image and return structured results.
    
    Parameters
    ----------
    img_u8 : np.ndarray
        Grayscale uint8 mammogram image (original resolution).
    confidence_threshold : float
        Minimum OCR confidence to include a detection.
    
    Returns
    -------
    dict with keys:
        raw_texts : list[dict]  — all detections [{text, confidence, bbox}]
        view      : str|None    — detected projection label (LCC, RCC, etc.)
        side      : str|None    — derived breast side
        age       : int|None    — patient age if detected
        all_text  : str         — concatenated high-confidence text
    """
    reader = _get_reader()
    
    # Normalize to uint8 if needed
    if img_u8.dtype != np.uint8:
        mn, mx = img_u8.min(), img_u8.max()
        if mx > mn:
            img_u8 = ((img_u8 - mn) / (mx - mn) * 255).astype(np.uint8)
        else:
            img_u8 = np.zeros_like(img_u8, dtype=np.uint8)
    
    results = reader.readtext(img_u8)
    
    raw_texts = []
    all_high = []
    
    for bbox, text, conf in results:
        if conf >= confidence_threshold:
            raw_texts.append({
                "text": text.strip(),
                "confidence": round(float(conf), 3),
                "bbox": bbox
            })
            all_high.append(text.strip())
    
    combined = " ".join(all_high).upper()
    
    # ── Detect projection view ──────────────────────────────────────
    view = None
    side = None
    for pattern, norm_view, norm_side in VIEW_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            view = norm_view
            side = norm_side
            break
    
    # ── Detect age ──────────────────────────────────────────────────
    age = None
    age_match = AGE_REGEX.search(combined)
    if age_match:
        age_str = age_match.group(1) or age_match.group(2)
        age_val = int(age_str)
        if 10 <= age_val <= 120:  # sanity check
            age = age_val
    
    return {
        "raw_texts": raw_texts,
        "view": view,
        "side": side,
        "age": age,
        "all_text": " | ".join(all_high) if all_high else ""
    }


def ocr_detect_view(img_u8):
    """Quick OCR to detect just the projection view label.
    
    Returns (view_label, side) or (None, None).
    """
    result = ocr_mammogram(img_u8, confidence_threshold=0.3)
    return result["view"], result["side"]


def ocr_extract_all_metadata(img_u8):
    """Extract all readable metadata from the burned-in image text.
    
    Returns a dict suitable for display in a metadata table.
    """
    result = ocr_mammogram(img_u8, confidence_threshold=0.2)
    
    extracted = {}
    if result["view"]:
        extracted["OCR View Position"] = result["view"]
    if result["side"]:
        extracted["OCR Breast Side"] = result["side"]
    if result["age"]:
        extracted["OCR Patient Age"] = str(result["age"])
    if result["all_text"]:
        extracted["OCR Raw Text"] = result["all_text"]
    
    # Count detections
    extracted["OCR Detections"] = str(len(result["raw_texts"]))
    
    return extracted
