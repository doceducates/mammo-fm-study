"""One-command GPU / PyTorch CUDA diagnostic.

Run:  python check_gpu.py

Tells you WHY the app says 'No CUDA GPU detected' and exactly what to do.
"""
import shutil
import subprocess
import sys


def sh(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True).stdout.strip()
    except Exception as e:  # noqa: BLE001
        return f"(could not run: {e})"


def main():
    print("=" * 60)
    print("PyTorch / CUDA diagnostic")
    print("=" * 60)
    print(f"Python executable : {sys.executable}")

    # 1) Driver / OS level -------------------------------------------------
    if shutil.which("nvidia-smi"):
        print("\n[nvidia-smi] found. GPU visible to the OS/driver:")
        print(sh(["nvidia-smi",
                  "--query-gpu=name,driver_version,memory.total",
                  "--format=csv,noheader"]) or "(no output)")
    else:
        print("\n[nvidia-smi] NOT found on PATH.")
        print("  -> The driver layer can't see the GPU in THIS shell.")
        print("     On WSL2 you need a recent Windows NVIDIA driver + WSL GPU")
        print("     support (run 'nvidia-smi' inside WSL to confirm).")

    # 2) PyTorch level -----------------------------------------------------
    try:
        import torch
        print(f"\ntorch version           : {torch.__version__}")
        print(f"torch built with CUDA   : {torch.version.cuda}")
        print(f"torch.cuda.is_available : {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"GPU                     : {torch.cuda.get_device_name(0)}")
            print("\nRESULT: GPU works for PyTorch. You're all set.")
        else:
            print("\nRESULT: PyTorch cannot use the GPU.")
            if torch.version.cuda is None:
                print("  CAUSE: CPU-ONLY build of PyTorch "
                      "(torch.version.cuda is None).")
                print("  FIX  : reinstall the CUDA build:")
                print("    pip uninstall -y torch torchvision")
                print("    pip install torch==2.2.2 torchvision==0.17.2 \\")
                print("      --index-url "
                      "https://download.pytorch.org/whl/cu118")
            else:
                print("  CAUSE: CUDA build installed, but no GPU is visible.")
                print("  CHECK: correct env? driver ok? WSL GPU passthrough?")
                print("         Make sure 'nvidia-smi' works in THIS shell.")
    except ImportError:
        print("\ntorch is NOT installed in THIS environment.")
        print("  -> You likely installed it in a different conda/venv env.")
        print("     Activate the right env, or: pip install -r requirements.txt")

    print("\nNOTE: Ollama / llama.cpp (how you ran Gemma) bundle their OWN")
    print("CUDA runtime, so Gemma working does NOT mean PyTorch has CUDA.")
    print("They are completely separate installs.")
    print("\nFor 4 test images, CPU is totally fine. GPU only speeds up bulk")
    print("runs and training the cancer head.")


if __name__ == "__main__":
    main()
