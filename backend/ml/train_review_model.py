"""
Trains ReviewSimilarityModel on backend/data/reviews/train.csv and saves the
fitted model to backend/ml/artifacts/review_model.joblib.

Run once (from backend/):
    python -m ml.train_review_model

Also regenerates submission.csv (same format as the Round 1 deliverable) if
data/reviews/test.csv is present, as a sanity check that training worked.
By default this only scores a sample of test rows (fast, ~seconds) since
it's just a smoke test -- pass --full to score every test row and produce
a complete Round 1-style submission (~5 min for ~11k rows).
"""
import argparse
import os
import time

import pandas as pd

from ml.review_model import ReviewSimilarityModel

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "..", "data", "reviews")
ARTIFACT_PATH = os.path.join(HERE, "artifacts", "review_model.joblib")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="score every test row, not just a sample")
    parser.add_argument("--sample", type=int, default=500, help="sample size when not --full")
    args = parser.parse_args()

    train_path = os.path.join(DATA_DIR, "train.csv")
    if not os.path.exists(train_path):
        raise FileNotFoundError(
            f"Expected training data at {train_path}. "
            "Place train.csv (and optionally test.csv) from Round 1 into backend/data/reviews/."
        )

    print(f"Loading {train_path} ...")
    train_df = pd.read_csv(train_path)
    print(f"{len(train_df)} training reviews across {train_df['Course'].nunique()} courses")

    t0 = time.time()
    model = ReviewSimilarityModel().fit(train_df)
    print(f"Fitted in {time.time() - t0:.1f}s")

    os.makedirs(os.path.dirname(ARTIFACT_PATH), exist_ok=True)
    model.save(ARTIFACT_PATH)
    print(f"Saved model to {ARTIFACT_PATH}")

    test_path = os.path.join(DATA_DIR, "test.csv")
    if os.path.exists(test_path):
        test_df = pd.read_csv(test_path)
        if not args.full:
            test_df = test_df.sample(min(args.sample, len(test_df)), random_state=42).sort_index()
            print(f"Scoring a sample of {len(test_df)} test rows as a smoke test (pass --full for all)...")
        else:
            print(f"Scoring all {len(test_df)} test rows (this takes a few minutes)...")

        t1 = time.time()
        results, _ = model.top_k_similar_batch(list(test_df["Reviews"]), k=10, batch_size=500)
        rows = [
            {"Index": idx, "Index_list": [n["train_index"] for n in neighbors]}
            for idx, neighbors in zip(test_df["Index"], results)
        ]
        sub = pd.DataFrame(rows)
        suffix = "" if args.full else "_sample"
        out_path = os.path.join(HERE, "artifacts", f"submission{suffix}.csv")
        sub.to_csv(out_path, index=False)
        print(f"Wrote {out_path} ({len(sub)} rows) in {time.time() - t1:.1f}s")


if __name__ == "__main__":
    main()



if __name__ == "__main__":
    main()
