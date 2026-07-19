"""Seed the SQLite DB with synthetic demo cases so you can preview the
Dashboard / SQL views WITHOUT any real data. Delete data/study.db to reset.

Run:
    python seed_demo_db.py
"""
import random
from utils.db import init_db, add_case, add_inference

random.seed(42)
DENSITY = ["A", "B", "C", "D"]
BIRADS = ["3", "4A", "4B", "4C", "5"]


def main(n=60, prevalence=0.4):
    init_db()
    for i in range(1, n + 1):
        malignant = random.random() < prevalence
        truth = "malignant" if malignant else "benign"
        # Simulate a decent-but-imperfect model: higher prob for malignant
        base = 0.72 if malignant else 0.28
        prob = min(0.999, max(0.001, random.gauss(base, 0.18)))
        case_id = add_case(
            f"STUDY-{i:03d}",
            enrolment_date="2026-08-01",
            age=random.randint(35, 75),
            breast_side=random.choice(["Right", "Left"]),
            breast_density=random.choice(DENSITY),
            lesion_size_mm=round(random.uniform(8, 45), 1),
            radiologist_birads=random.choice(BIRADS),
            histopathology=truth,
            histopath_type="IDC" if malignant else "Fibroadenoma",
            examiner="MM",
        )
        add_inference(case_id, prob=round(prob, 4), model_name="Mammo-FM")
    print(f"Seeded {n} synthetic cases into data/study.db")


if __name__ == "__main__":
    main()
