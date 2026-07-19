"""Shared model loader: hardware info, Hugging Face download, cached load.

Both the Model Setup page and the Inference page import get_model() from here
so the model is loaded ONCE and reused (cached) across the whole app.
"""
import os
import shutil
import streamlit as st
import torch

WEIGHTS_DIR = "model/weights"
DEFAULT_WEIGHTS = os.path.join(WEIGHTS_DIR, "mammo_fm.pth")


def weights_present(path=DEFAULT_WEIGHTS):
    return os.path.exists(path) and os.path.getsize(path) > 0


def weights_size_mb(path=DEFAULT_WEIGHTS):
    return os.path.getsize(path) / (1024 * 1024) if os.path.exists(path) else 0.0


def download_weights(repo_id, filename, dest=DEFAULT_WEIGHTS):
    """Download weights from the Hugging Face Hub (needs internet).

    Requires the `huggingface_hub` package. Confirm the exact `filename`
    from the model repo's Files tab before downloading.
    """
    from huggingface_hub import hf_hub_download
    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    cached = hf_hub_download(repo_id=repo_id, filename=filename)
    if os.path.abspath(cached) != os.path.abspath(dest):
        shutil.copy(cached, dest)
    return dest


def device_info():
    info = {"cuda": torch.cuda.is_available()}
    if info["cuda"]:
        info["gpu"] = torch.cuda.get_device_name(0)
        try:
            free, total = torch.cuda.mem_get_info()
            info["vram_total_gb"] = round(total / 1e9, 2)
            info["vram_free_gb"] = round(free / 1e9, 2)
        except Exception:
            pass
    return info


@st.cache_resource(show_spinner=False)
def get_model(checkpoint_path=DEFAULT_WEIGHTS):
    """Load the model once and cache it in memory for the whole app."""
    from model.mammo_fm_wrapper import MammoFM
    return MammoFM(checkpoint_path=checkpoint_path)
