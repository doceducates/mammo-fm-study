import streamlit as st
from model.loader import (
    weights_present, weights_size_mb, download_weights,
    device_info, get_model, DEFAULT_WEIGHTS, head_present,
)

st.title("⚙️ Model Setup")
st.caption("Check hardware, get the Mammo-FM weights, and load the model into "
           "memory. Do this before running inference.")

# ------------------------------------------------------------------ 1. Hardware
st.subheader("1. Hardware")
info = device_info()
if info["cuda"]:
    st.success(f"GPU detected: {info['gpu']}")
    c1, c2 = st.columns(2)
    c1.metric("VRAM total", f"{info.get('vram_total_gb', '?')} GB")
    c2.metric("VRAM free", f"{info.get('vram_free_gb', '?')} GB")
    if info.get("vram_total_gb", 99) <= 6.5:
        st.info("6 GB VRAM: inference runs with batch size 1 + FP16. "
                "If you hit out-of-memory, switch to CPU in the wrapper.")
else:
    st.warning("No CUDA GPU detected — the model will run on CPU "
               "(slower, but fine for one image at a time).")

# ------------------------------------------------------------------- 2. Weights
st.subheader("2. Model weights")
if weights_present():
    st.success(f"Weights found: `{DEFAULT_WEIGHTS}` ({weights_size_mb():.1f} MB)")
else:
    st.error("Weights not found. Download them below, or copy the file "
             "manually into `model/weights/`.")

with st.expander("⬇ Download from Hugging Face (needs internet)", expanded=not weights_present()):
    repo = st.text_input("Repo ID", "batmanLab/Mammo-FM")
    fname = st.text_input(
        "Weights filename", "Mammo-FM_BatmanlabTrained_CLIP.tar",
        help="Multi-institution checkpoint (BU+UPMC+EMBED). The other file, "
             "Mammo-FM_ASU_Trained_CLIP.tar, is Mayo-only.")
    if st.button("Download weights"):
        try:
            with st.spinner("Downloading from Hugging Face… (may take a while)"):
                path = download_weights(repo, fname)
            st.success(f"Downloaded to {path}")
            st.rerun()
        except ModuleNotFoundError:
            st.error("`huggingface_hub` is not installed. Run: "
                     "`pip install huggingface_hub`")
        except Exception as e:  # noqa: BLE001
            st.exception(e)

st.caption("Terminal alternative: "
           "`huggingface-cli download batmanLab/Mammo-FM <file> "
           "--local-dir model/weights`")

# --------------------------------------------------------- 3. Load into memory
st.subheader("3. Load model into memory")
if not weights_present():
    st.info("Add the weights first.")
else:
    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("🚀 Load / warm up model", type="primary"):
            try:
                with st.spinner("Loading model into memory…"):
                    model = get_model()
                st.session_state["model_loaded"] = True
                st.success(f"Model loaded on **{model.device}**. It stays "
                           "cached across pages until you clear it.")
            except NotImplementedError:
                st.error("The `# ===== ADAPT TO REPO =====` block in "
                         "`model/mammo_fm_wrapper.py` is not filled in yet. "
                         "Add the repo's real loader code, then retry.")
            except Exception as e:  # noqa: BLE001
                st.exception(e)
    with col_b:
        if st.button("🧹 Unload from memory"):
            get_model.clear()
            st.session_state.pop("model_loaded", None)
            st.success("Cleared the cached model from memory.")

if st.session_state.get("model_loaded"):
    st.success("✅ Model is currently loaded and ready for inference.")
else:
    st.caption("Model not loaded yet. It will also auto-load on first inference.")

# ----------------------------------------------------- 4. Cancer head status
st.subheader("4. Cancer head (malignancy classifier)")
if head_present():
    st.success("✅ Cancer head found — the app can output malignancy scores.")
else:
    st.warning(
        "No cancer head yet. Mammo-FM alone only extracts features; it does "
        "not output cancer/benign by itself. To create the head:\n\n"
        "1. Put labeled images in `data/labeled/malignant/` and "
        "`data/labeled/benign/`.\n"
        "2. Run `python train_linear_probe.py` once.\n"
        "3. Come back and press *Load / warm up model*.")
