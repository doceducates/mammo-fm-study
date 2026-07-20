"""Faithful re-implementation of the repo's `load_image_encoder` for the CNN
EfficientNet-detector encoders used by the released Mammo-FM checkpoints.

The recommended checkpoint (Mammo-FM_BatmanlabTrained_CLIP.tar) uses
arch `breast_clip_det_b5`, whose image encoder config is:
    {"source": "cnn", "name": "tf_efficientnet_b5_ns-detect", "model_type": "cnn"}

In the original repo this branch calls:
    EfficientNet.from_pretrained("efficientnet-b5", num_classes=1); out_dim=2048
`from_pretrained` downloads ImageNet weights from the internet and then those
weights are immediately OVERWRITTEN by the checkpoint's image-encoder weights
(strict load). To keep this offline-friendly we use `from_name` instead, which
builds the IDENTICAL architecture (same state_dict keys) without any download.
The end result after loading the checkpoint is exactly the same.
"""
from typing import Dict

from .efficientnet_custom import EfficientNet


def load_image_encoder(config_image_encoder: Dict):
    source = str(config_image_encoder.get("source", "")).lower()
    name = str(config_image_encoder.get("name", "")).lower()

    if source == "cnn" and name == "tf_efficientnet_b5_ns-detect":
        enc = EfficientNet.from_name("efficientnet-b5", num_classes=1)
        enc.out_dim = 2048
        return enc
    if source == "cnn" and name == "tf_efficientnetv2-detect":
        enc = EfficientNet.from_name("efficientnet-b2", num_classes=1)
        enc.out_dim = 1408
        return enc

    raise KeyError(
        "This standalone study app only vendors the EfficientNet-detector image "
        "encoder used by the released Mammo-FM CLIP checkpoints "
        f"(got source={source!r}, name={name!r}). Use the recommended checkpoint "
        "'Mammo-FM_BatmanlabTrained_CLIP.tar' (arch breast_clip_det_b5), or run "
        "the full official repo for other encoder types."
    )
