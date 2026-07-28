import os
import shutil
from pathlib import Path
from utils.dicom_utils import extract_dicom_metadata

def scan_and_categorize_folder(root_folder):
    """Scan a folder and categorize files into DICOM vs JPEG/PNG studies."""
    dicom_files = []
    jpeg_files = []
    
    if not os.path.exists(root_folder):
        return dicom_files, jpeg_files
        
    for root, _, files in os.walk(root_folder):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            full_path = os.path.join(root, f)
            if ext in (".dcm", ".dicom"):
                dicom_files.append(full_path)
            elif ext in (".jpg", ".jpeg", ".png"):
                jpeg_files.append(full_path)
                
    return sorted(dicom_files), sorted(jpeg_files)

def organize_cases_into_folders(root_folder, dest_folder=None, mode="copy"):
    """Organize scattered DICOM and JPEG cases into structured subdirectories:
    /Organized_Studies/DICOM_Cases/<PatientName_ID>/<file.dcm>
    /Organized_Studies/JPEG_Cases/<PatientFolder>/<file.jpg>
    """
    if dest_folder is None:
        dest_folder = os.path.join(root_folder, "Organized_Studies")
        
    dicom_dir = os.path.join(dest_folder, "DICOM_Cases")
    jpeg_dir = os.path.join(dest_folder, "JPEG_Cases")
    
    os.makedirs(dicom_dir, exist_ok=True)
    os.makedirs(jpeg_dir, exist_ok=True)
    
    dicom_files, jpeg_files = scan_and_categorize_folder(root_folder)
    
    stats = {"dicom_moved": 0, "jpeg_moved": 0, "errors": 0}
    
    # Process DICOMs
    for fpath in dicom_files:
        # Don't re-process if already in destination
        if os.path.commonpath([fpath, dest_folder]) == dest_folder:
            continue
        try:
            meta = extract_dicom_metadata(fpath)
            p_name = meta.get("PatientName", "Unknown").replace(" ", "_").replace("/", "_")
            p_id = meta.get("PatientID", "0000")
            subfolder = os.path.join(dicom_dir, f"{p_name}_{p_id}")
            os.makedirs(subfolder, exist_ok=True)
            
            dest_file = os.path.join(subfolder, os.path.basename(fpath))
            if mode == "copy":
                shutil.copy2(fpath, dest_file)
            else:
                shutil.move(fpath, dest_file)
            stats["dicom_moved"] += 1
        except Exception:
            stats["errors"] += 1
            
    # Process JPEGs
    for fpath in jpeg_files:
        if os.path.commonpath([fpath, dest_folder]) == dest_folder:
            continue
        try:
            # Group by parent folder name
            parent_name = os.path.basename(os.path.dirname(fpath))
            subfolder = os.path.join(jpeg_dir, parent_name)
            os.makedirs(subfolder, exist_ok=True)
            
            dest_file = os.path.join(subfolder, os.path.basename(fpath))
            if mode == "copy":
                shutil.copy2(fpath, dest_file)
            else:
                shutil.move(fpath, dest_file)
            stats["jpeg_moved"] += 1
        except Exception:
            stats["errors"] += 1
            
    return stats
