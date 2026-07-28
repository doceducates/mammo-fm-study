"""Standalone Batch Evaluation Script for LGH Institutional Cases.

This script executes Mammo-FM inference across all DICOM/JPEG images in your institutional
research cohort (e.g., E:\\Research\\Mammo-Cases-LGH\\All Cases\\).

It serves as the verification step after you place your newly trained `linear_head.joblib`
into `model/weights/linear_head.joblib`.

Usage:
    python run_lgh_batch_evaluation.py [path_to_cases_folder]

Example:
    python run_lgh_batch_evaluation.py "E:\\Research\\Mammo-Cases-LGH\\All Cases"
"""

import os
import sys
import glob
import pandas as pd
import numpy as np
import torch
from tqdm import tqdm

# Add local project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from model.mammo_fm_wrapper import MammoFM
from utils.dicom_utils import dicom_to_array, preprocess_for_model


def check_head_validity(head_path="model/weights/linear_head.joblib"):
    """Verify that the linear head exists and is not the dummy/noise fallback."""
    if not os.path.exists(head_path):
        print(f"[ERROR] Linear head not found at '{head_path}'.")
        print("        Please train the probe first using 'train_linear_probe_colab.py' on Colab/Kaggle.")
        sys.exit(1)
    
    size_kb = os.path.getsize(head_path) / 1024.0
    print(f"[OK] Found linear head: {head_path} ({size_kb:.1f} KB)")
    if size_kb < 1.0:
        print("[WARNING] The linear_head.joblib file is suspiciously small (< 1 KB).")
        print("          Make sure you replaced the dummy weight file with the Colab-trained weight file!")


def extract_patient_id(filename):
    """Simple heuristic to extract patient/study ID from LGH filenames."""
    base = os.path.splitext(os.path.basename(filename))[0]
    # Remove common view suffixes if present (e.g., _LCC, _RCC, _RMLO, _LMLO)
    for view in ["_LCC", "_RCC", "_RMLO", "_LMLO", "-LCC", "-RCC", "-RMLO", "-LMLO"]:
        if base.endswith(view):
            return base[:-len(view)], view[1:]
    return base, "Unknown"


def main(cases_dir="E:\\Research\\Mammo-Cases-LGH\\All Cases"):
    print("=" * 70)
    print("MAMMO-FM INSTITUTIONAL COHORT BATCH EVALUATION")
    print("=" * 70)
    
    if not os.path.exists(cases_dir):
        # Try relative or alternative paths
        alt_paths = [
            r"e:\Research\Mammo-Cases-LGH\All Cases",
            r"e:\Research\Mammo-Cases-LGH\JPEG-Cases",
            r"data\incoming",
        ]
        for p in alt_paths:
            if os.path.exists(p):
                cases_dir = p
                break
        else:
            print(f"[ERROR] Cannot find cases directory: {cases_dir}")
            sys.exit(1)

    print(f"[INFO] Scanning directory: {cases_dir}")
    check_head_validity()

    # Locate files
    dcm_files = glob.glob(os.path.join(cases_dir, "**", "*.dcm"), recursive=True)
    jpg_files = glob.glob(os.path.join(cases_dir, "**", "*.jpg"), recursive=True)
    png_files = glob.glob(os.path.join(cases_dir, "**", "*.png"), recursive=True)
    all_files = sorted(dcm_files + jpg_files + png_files)

    if not all_files:
        print(f"[ERROR] No DICOM, JPG, or PNG files found in {cases_dir}")
        sys.exit(1)

    print(f"[INFO] Found {len(all_files)} images ({len(dcm_files)} DICOM, {len(jpg_files)+len(png_files)} Image).")
    print("\n[INFO] Loading Mammo-FM model...")
    model = MammoFM(
        checkpoint_path="model/weights/Mammo-FM_BatmanlabTrained_CLIP.tar",
        head_path="model/weights/linear_head.joblib"
    )

    results = []
    errors = 0

    print("\n[INFO] Running batch inference...")
    for filepath in tqdm(all_files, desc="Evaluating cases", unit="img"):
        filename = os.path.basename(filepath)
        patient_id, view = extract_patient_id(filename)
        
        try:
            if filepath.lower().endswith(".dcm"):
                raw = dicom_to_array(filepath)
            else:
                from PIL import Image
                raw = np.array(Image.open(filepath).convert("L"))
            
            img_u8 = preprocess_for_model(raw)
            prob = model.predict(img_u8)
            pred_class = "Malignant" if prob >= 0.5 else "Benign"
            
            results.append({
                "filename": filename,
                "patient_id": patient_id,
                "view": view,
                "mammo_fm_prob": round(prob, 4),
                "mammo_fm_class": pred_class,
                "filepath": filepath
            })
        except Exception as e:
            errors += 1
            tqdm.write(f"[WARNING] Error processing {filename}: {str(e)}")

    if not results:
        print("[ERROR] No cases were processed successfully.")
        sys.exit(1)

    df_res = pd.DataFrame(results)
    out_csv = os.path.join("data", "lgh_pilot_batch_results.csv")
    os.makedirs("data", exist_ok=True)
    df_res.to_csv(out_csv, index=False)

    # Summary Statistics
    n_total = len(df_res)
    n_mal = (df_res["mammo_fm_class"] == "Malignant").sum()
    n_ben = (df_res["mammo_fm_class"] == "Benign").sum()
    mean_prob = df_res["mammo_fm_prob"].mean()
    std_prob = df_res["mammo_fm_prob"].std()
    min_prob = df_res["mammo_fm_prob"].min()
    max_prob = df_res["mammo_fm_prob"].max()

    print("\n" + "=" * 70)
    print("BATCH EVALUATION SUMMARY")
    print("=" * 70)
    print(f"Total Images Evaluated: {n_total} (Errors: {errors})")
    print(f"Predicted Malignant:    {n_mal} ({n_mal/n_total*100:.1f}%)")
    print(f"Predicted Benign:       {n_ben} ({n_ben/n_total*100:.1f}%)")
    print("-" * 70)
    print(f"Probability Distribution:")
    print(f"  Mean +/- Std:         {mean_prob:.4f} +/- {std_prob:.4f}")
    print(f"  Range (Min - Max):    {min_prob:.4f} - {max_prob:.4f}")
    print("=" * 70)
    print(f"[OK] Detailed results saved to: {out_csv}")
    
    # Check if probabilities look like random noise
    if std_prob < 0.05 and 0.40 <= mean_prob <= 0.60:
        print("\n[WARNING] The probabilities are tightly clustered around 0.5.")
        print("          This strongly indicates that linear_head.joblib was trained on dummy/noise data.")
        print("          Please run 'train_linear_probe_colab.py' on Colab/Kaggle and replace linear_head.joblib!")
    else:
        print("\n[OK] The probability distribution shows healthy variance across patient cases!")
        print("     You can now merge these results with your histopathology gold standard")
        print("     using `python compute_metrics.py`.")


if __name__ == "__main__":
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "E:\\Research\\Mammo-Cases-LGH\\All Cases"
    main(target_dir)
