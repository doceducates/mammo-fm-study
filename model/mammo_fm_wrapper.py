import numpy as np
import torch
import torchvision.transforms as T
from PIL import Image


class MammoFM:
    """
    Thin wrapper around the Mammo-FM pretrained model.

    IMPORTANT - ADAPT TO THE OFFICIAL REPO:
    The exact model class, checkpoint file, and forward() output come from
    github.com/batmanlab/Mammo-FM and huggingface.co/batmanLab/Mammo-FM.
    Confirm these during the pilot and edit _load_model() / predict().
    """

    def __init__(self, checkpoint_path, device=None, img_size=(1520, 912)):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.img_size = img_size  # (H, W)
        self.model = self._load_model(checkpoint_path)
        self.model.eval()
        self.transform = T.Compose([
            T.Grayscale(num_output_channels=3),  # most backbones expect 3ch
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225]),
        ])

    def _load_model(self, checkpoint_path):
        # ===== ADAPT TO REPO START =====
        # The Mammo-FM checkpoints are .tar CLIP checkpoints:
        #   image encoder = EfficientNet-B5, text encoder = ModernBERT.
        # Use the official repo (github.com/batmanlab/Mammo-FM, which reuses
        # Mammo-CLIP code) to build the model and load the IMAGE encoder, e.g.:
        #   ckpt = torch.load(checkpoint_path, map_location="cpu")
        #   model = build_efficientnet_b5(...)          # per repo
        #   model.load_state_dict(ckpt["model"], strict=False)
        #   return model.to(self.device)
        #
        # IMPORTANT: the raw checkpoint has NO cancer classifier. To output a
        # malignancy probability you must attach + train a linear head
        # (linear probe) or fine-tune, as described in the paper. Until then
        # predict() cannot return a real malignancy score.
        raise NotImplementedError(
            "Plug in the official Mammo-FM loader here (see repo README).")
        # ===== ADAPT TO REPO END =====

    @torch.no_grad()
    def predict(self, img_u8):
        H, W = self.img_size
        pil = Image.fromarray(img_u8).convert("L").resize((W, H))
        x = self.transform(pil).unsqueeze(0).to(self.device)
        use_amp = (self.device == "cuda")  # FP16 to fit 6GB VRAM
        with torch.autocast(device_type="cuda", dtype=torch.float16,
                            enabled=use_amp):
            logits = self.model(x)
        # ===== ADAPT: map model output -> single malignancy probability =====
        if logits.ndim == 2 and logits.shape[1] == 1:
            prob = torch.sigmoid(logits)[0, 0].item()
        elif logits.ndim == 2 and logits.shape[1] == 2:
            prob = torch.softmax(logits, dim=1)[0, 1].item()
        else:
            prob = torch.sigmoid(logits.flatten()[0]).item()
        return float(prob)
