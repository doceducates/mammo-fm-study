import os
import numpy as np
import torch
import torchvision.transforms as T
from PIL import Image


class MammoFM:
    """Wrapper around the Mammo-FM pretrained model.

    Mammo-FM is a FEATURE EXTRACTOR (image encoder = EfficientNet-B5). By
    itself it does NOT output 'cancer / benign'. To get a malignancy score:
      1. extract_features() turns each image into a feature vector, and
      2. train a small linear head on labeled cases (train_linear_probe.py).
    Once model/weights/linear_head.joblib exists, predict() returns a real
    malignancy probability in [0, 1].

    ADAPT TO THE OFFICIAL REPO: the encoder build + checkpoint load and the
    feature-extraction forward pass come from github.com/batmanlab/Mammo-FM
    (which reuses Mammo-CLIP code). Fill the two ADAPT blocks below.
    """

    def __init__(self, checkpoint_path, device=None, img_size=(1520, 912),
                 head_path="model/weights/linear_head.joblib"):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.img_size = img_size  # (H, W)
        self.model = self._load_model(checkpoint_path)
        self.model.eval()
        self.head = self._maybe_load_head(head_path)
        self.transform = T.Compose([
            T.Grayscale(num_output_channels=3),  # most backbones expect 3ch
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225]),
        ])

    def _maybe_load_head(self, path):
        if path and os.path.exists(path):
            import joblib
            return joblib.load(path)
        return None

    def _load_model(self, checkpoint_path):
        # ===== ADAPT TO REPO START (build encoder + load .tar) =====
        # The Mammo-FM checkpoints are .tar CLIP checkpoints:
        #   image encoder = EfficientNet-B5, text encoder = ModernBERT.
        # Use the official repo (github.com/batmanlab/Mammo-FM, which reuses
        # Mammo-CLIP code) to build the encoder and load the IMAGE weights:
        #   ckpt = torch.load(checkpoint_path, map_location="cpu")
        #   model = build_efficientnet_b5(...)          # per repo
        #   model.load_state_dict(ckpt["model"], strict=False)
        #   return model.to(self.device)
        raise NotImplementedError(
            "Plug in the official Mammo-FM encoder loader here (see repo).")
        # ===== ADAPT TO REPO END =====

    def _to_tensor(self, img_u8):
        H, W = self.img_size
        pil = Image.fromarray(img_u8).convert("L").resize((W, H))
        return self.transform(pil).unsqueeze(0).to(self.device)

    @torch.no_grad()
    def extract_features(self, img_u8):
        """Return the image embedding as a 1D numpy array."""
        x = self._to_tensor(img_u8)
        use_amp = (self.device == "cuda")  # FP16 to fit 6GB VRAM
        with torch.autocast(device_type="cuda", dtype=torch.float16,
                            enabled=use_amp):
            # ===== ADAPT: return the encoder embedding, NOT a class logit =====
            feats = self.model(x)            # e.g. self.model.encode_image(x)
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
