"""CLI to train the cancer head -- identical to the '🧠 Build Cancer Head' UI page.

Most people should just use the UI page. This exists for scripted/headless use.

Usage (once labeled images are in data/labeled/{benign,malignant}/):
    python train_linear_probe.py
"""
from model.mammo_fm_wrapper import MammoFM
from utils.train_head import train_head, count_labeled
from model.loader import DEFAULT_WEIGHTS


def main():
    print("Labeled images:", count_labeled())
    model = MammoFM(checkpoint_path=DEFAULT_WEIGHTS)

    def cb(i, n):
        if i == 1 or i % 20 == 0 or i == n:
            print(f"  features {i}/{n}")

    res = train_head(model, progress_cb=cb)
    print(f"Saved cancer head on {res['n']} image(s) "
          f"({res['n_benign']} benign, {res['n_malignant']} malignant) "
          f"-> {res['path']}")
    if res["auc"] is not None:
        print(f"5-fold CV AUC (rough, training data only): {res['auc']:.3f}")
    if res["skipped"]:
        print(f"Skipped {len(res['skipped'])} unreadable file(s).")
    print("Reload the app to use the new head.")


if __name__ == "__main__":
    main()
