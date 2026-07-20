# What was wired in from the official Mammo-FM repo

The app no longer has a blank "ADAPT" block. The real model-loading and
feature-extraction code has been filled in, taken directly from the official
repository (github.com/batmanlab/Mammo-FM, Apache-2.0 code license).

## What changed

1. **Vendored encoder** -- `model/breastclip_encoder/`
   - `efficientnet_custom.py` and `efficient_net_custom_utils.py` are copied
     **verbatim** from the repo (`src/codebase/breastclip/model/modules/`).
     This is the exact EfficientNet-B5 image encoder Mammo-FM was trained with,
     so the checkpoint weights load with a perfect (strict) match.
   - `encoder_loader.py` re-implements the repo's `load_image_encoder` for the
     EfficientNet-detector encoders. The only change from the repo is using
     `from_name` instead of `from_pretrained` so it does **not** try to
     download ImageNet weights from the internet -- those weights get
     overwritten by the checkpoint anyway, so the result is identical.

2. **Real loader** -- `model/mammo_fm_wrapper.py`
   - `_load_model()` now mirrors the repo's `BreastClipClassifier.__init__`:
     `torch.load(...)` the `.tar`, read `ckpt["config"]["model"]["image_encoder"]`,
     build the matching encoder, keep only the `image_encoder.*` weights, and
     load them with `strict=True`.
   - `extract_features()` now mirrors the repo's `encode_image` for CNN
     encoders: it calls the encoder with `{"image": x, "breast_clip_train_mode": True}`
     and returns the 2048-dim pooled image embedding.
   - Preprocessing (`_to_tensor`) now matches the repo's `MammoDataset`
     **exactly**: RGB, resize to width=1520 x height=912, per-image min-max to
     [0,1], then normalize with **mean=0.3089279, std=0.25053555408335154**
     (the repo defaults), and reorder to `(1, 3, H, W)`.

## What still cannot happen automatically (and why)

- **The model still needs a cancer head.** The Mammo-FM `.tar` is a CLIP
  checkpoint -- an image *encoder*, not a cancer classifier. It turns an image
  into 2048 numbers; it does not by itself say "malignant/benign". You still
  train the small head once on your labeled histopath cases:
  `python train_linear_probe.py`. This is exactly the repo's own "linear probe"
  (`_lp`) setup.
- **The weights still need downloading.** Drop
  `Mammo-FM_BatmanlabTrained_CLIP.tar` into `model/weights/` (Model Setup page
  can do this for you).

## Quick self-check once weights are in place

```bash
python pilot_test.py path/to/one_image.png   # prints a feature/prob sanity line
```

If you see a 2048-length feature vector, the encoder + checkpoint are loading
correctly. A malignancy probability only appears after the linear head exists.
