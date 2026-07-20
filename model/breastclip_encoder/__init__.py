"""Vendored, torch-only subset of the official Mammo-FM / Mammo-CLIP image
encoder (github.com/batmanlab/Mammo-FM, Apache-2.0).

Only the EfficientNet image-encoder path is vendored here so the study app is
self-contained and does NOT need the full training repo (wandb/deepspeed/etc.).
These two files are copied verbatim from the repo:
  - efficientnet_custom.py
  - efficient_net_custom_utils.py
"""
from .encoder_loader import load_image_encoder

__all__ = ["load_image_encoder"]
