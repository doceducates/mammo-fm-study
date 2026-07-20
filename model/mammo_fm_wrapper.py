"""Mammo-FM wrapper -- REAL loader wired from the official repo code.

Mammo-FM is a FEATURE EXTRACTOR (image encoder = EfficientNet-B5). By itself it
does NOT output 'cancer / benign'. To get a malignancy score:
  1. extract_features() turns each image into a 2048-dim feature vector, and
  2. train a small linear head on labeled cases (train_linear_probe.py).
Once model/weights/linear_head.joblib exists, predict() returns a real
malignancy probability in [0, 1].

The encoder build + checkpoint load and the feature-extraction forward pass
below are taken directly from github.com/batmanlab/Mammo-FM
(Classifiers/models/breast_clip_classifier.py + Datasets/dataset_concepts.py).
The EfficientNet code itself is vendored under model/breastclip_encoder/.
"""
import os
import numpy as np
import torch
from PIL import Image

from .breastclip_encoder import load_image_encoder

# Preprocessing constants -- copied verbatim from the repo's train_classifier.py
#   parser.add_argument("--mean", default=0.3089279)
#   parser.add_argument("--std",  default=0.25053555408335154)
#   parser.add_argument("--img-size", default=[1520, 912])  # [width, height]
MAMMO_MEAN = 0.3089279
MAMMO_STD = 0.25053555408335154


class MammoFM:
    def __init__(self, checkpoint_path, device=None, img_size=(1520, 912),
                 head_path="model/weights/linear_head.joblib"):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        # img_size = (width, height) exactly like the repo's --img-size
        self.img_w, self.img_h = int(img_size[0]), int(img_size[1])
        self.image_encoder_type = "cnn"
        self.model = self._load_model(checkpoint_path)
        self.model.eval()
        self.head = self._maybe_load_head(head_path)

    def _maybe_load_head(self, path):
        if path and os.path.exists(path):
            import joblib
            return joblib.load(path)
        return None

    def _load_model(self, checkpoint_path):
        # ===== Mammo-FM encoder build + checkpoint load =====
        # Mirrors BreastClipClassifier.__init__ in the official repo:
        #   ckpt = torch.load(path, map_location="cpu")
        #   image_encoder = load_image_encoder(ckpt["config"]["model"]["image_encoder"])
        #   keep only "image_encoder.*" weights and load them strict=True.
        ckpt = torch.load(checkpoint_path, map_location="cpu")
        if "config" not in ckpt or "model" not in ckpt:
            raise RuntimeError(
                "This does not look like a Mammo-FM CLIP checkpoint. Expected a "
                ".tar with 'config' and 'model' keys "
                "(e.g. Mammo-FM_BatmanlabTrained_CLIP.tar).")

        enc_cfg = ckpt["config"]["model"]["image_encoder"]
        self.image_encoder_type = enc_cfg.get("model_type", "cnn")
        encoder = load_image_encoder(enc_cfg)

        image_encoder_weights = {}
        for k in ckpt["model"].keys():
            if k.startswith("image_encoder."):
                image_encoder_weights[".".join(k.split(".")[1:])] = ckpt["model"][k]
        if not image_encoder_weights:
            raise RuntimeError(
                "No 'image_encoder.*' weights found in the checkpoint -- the file "
                "may be corrupt or a different checkpoint format.")
        encoder.load_state_dict(image_encoder_weights, strict=True)
        return encoder.to(self.device)
        # ===== end encoder build =====

    def _to_tensor(self, img_u8):
        # Mirrors MammoDataset.__getitem__ (val path) + the (0,3,1,2) permute
        # applied in the training/eval loop, so the encoder sees (B, 3, H, W).
        pil = Image.fromarray(img_u8).convert("RGB")
        pil = pil.resize((self.img_w, self.img_h))  # PIL takes (width, height)
        img = np.array(pil).astype("float32")       # (H, W, 3)
        img -= img.min()
        denom = img.max()
        if denom > 0:
            img /= denom
        img = (img - MAMMO_MEAN) / MAMMO_STD
        t = torch.from_numpy(img).permute(2, 0, 1).unsqueeze(0)  # (1, 3, H, W)
        return t.to(self.device, dtype=torch.float32)

    @torch.no_grad()
    def extract_features(self, img_u8):
        """Return the 2048-dim image embedding as a 1D numpy array."""
        x = self._to_tensor(img_u8)
        use_amp = (self.device == "cuda")  # FP16 to fit 6GB VRAM
        with torch.autocast(device_type="cuda", dtype=torch.float16,
                            enabled=use_amp):
            # Mirrors BreastClipClassifier.encode_image for CNN encoders:
            #   image_features, raw_features = image_encoder(
            #       {"image": image, "breast_clip_train_mode": True})
            out = self.model({"image": x, "breast_clip_train_mode": True})
            feats = out[0] if isinstance(out, (tuple, list)) else out
        return feats.flatten().float().cpu().numpy()

    def predict(self, img_u8):
        """Return malignancy probability in [0, 1].

        Requires a trained linear head (train_linear_probe.py). Without it a
        real malignancy score is not possible, so we raise a clear error.
        """
        if self.head is None:
            raise RuntimeError(
                "No cancer head found. Train one first with "
                "`python train_linear_probe.py`, then reload the app.")
        feats = self.extract_features(img_u8).reshape(1, -1)
        return float(self.head.predict_proba(feats)[0, 1])
