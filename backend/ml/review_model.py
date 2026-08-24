"""
Review-similarity recommender, trained on the HCL Round 1 dataset
(backend/data/reviews/{train,test}.csv).

This wraps the exact logic from the Round 1 submission (model.py) into a
reusable, persistable model:

  1. Sentence fingerprinting: a sentence that only ever appears under one
     course in the training set is a reliable signal of that course.
  2. Course detection: a review's course is inferred from any fingerprint
     sentences it contains.
  3. Opener restoration: test reviews have their first sentence replaced by
     a generic, de-identified "opener" not seen in training. We map each
     generic opener back to the most similar named opener actually used for
     the detected course (word-overlap / Jaccard similarity), so the
     restored review looks like a real training review.
  4. TF-IDF + cosine similarity retrieval: rank training reviews by
     similarity to a (possibly restored) query review.

`fit()` trains everything from train.csv. `save()`/`load()` persist the
fitted state with joblib so the API doesn't retrain on every server start.
"""
from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def _words(s: str) -> set[str]:
    return set(re.sub(r"[^a-z ]", "", s.lower()).split())


@dataclass
class ReviewSimilarityModel:
    """Fit on labeled course reviews; retrieve similar reviews for any query text."""

    vectorizer: TfidfVectorizer | None = None
    train_matrix=None  # sparse TF-IDF matrix over training reviews
    train_ids: np.ndarray | None = None
    train_courses: np.ndarray | None = None
    train_reviews: np.ndarray | None = None
    fingerprints: dict[str, str] = field(default_factory=dict)  # sentence -> course
    openers_by_course: dict[str, set[str]] = field(default_factory=dict)
    course_counts: dict[str, int] = field(default_factory=dict)

    # ---------------------------------------------------------------- fit
    def fit(self, train_df: pd.DataFrame) -> "ReviewSimilarityModel":
        sent_courses: dict[str, set[str]] = defaultdict(set)
        openers_by_course: dict[str, set[str]] = defaultdict(set)

        for course, review in zip(train_df["Course"], train_df["Reviews"]):
            sentences = split_sentences(review)
            for s in sentences:
                sent_courses[s].add(course)
            if sentences:
                openers_by_course[course].add(sentences[0])

        self.fingerprints = {s: next(iter(cs)) for s, cs in sent_courses.items() if len(cs) == 1}
        self.openers_by_course = dict(openers_by_course)
        self.course_counts = train_df["Course"].value_counts().to_dict()

        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
        self.train_matrix = self.vectorizer.fit_transform(train_df["Reviews"])
        self.train_ids = train_df["Index"].values
        self.train_courses = train_df["Course"].values
        self.train_reviews = train_df["Reviews"].values
        return self

    # ------------------------------------------------------ course detect
    def detect_course(self, review: str) -> str | None:
        found = {self.fingerprints[s] for s in split_sentences(review) if s in self.fingerprints}
        return found.pop() if len(found) == 1 else None

    # ------------------------------------------------------ restore opener
    def restore_opener(self, review: str, course: str | None) -> str:
        """If the review's opening sentence looks generic/anonymized, replace it
        with the closest real opener used for `course` in training."""
        parts = split_sentences(review)
        if not parts:
            return review
        opener = parts[0]
        if course is None or course not in self.openers_by_course:
            return review

        known_openers = self.openers_by_course[course]
        if opener in known_openers:
            return review  # already a real opener, nothing to restore

        target_words = _words(re.sub(re.escape(course), "", opener, flags=re.IGNORECASE))
        if not target_words:
            return review

        best = max(
            known_openers,
            key=lambda cand: len(_words(cand) & target_words) / max(1, len(_words(cand) | target_words)),
        )
        return " ".join([best] + parts[1:])

    # ------------------------------------------------------------ retrieve
    def top_k_similar(self, query_text: str, k: int = 10, course_hint: str | None = None):
        if self.vectorizer is None:
            raise RuntimeError("Model not fitted/loaded")

        course = course_hint or self.detect_course(query_text)
        restored = self.restore_opener(query_text, course) if course else query_text

        query_vec = self.vectorizer.transform([restored])
        sim = cosine_similarity(query_vec, self.train_matrix)[0]
        top = np.lexsort((self.train_ids, -sim))[:k]

        return [
            {
                "train_index": int(self.train_ids[i]),
                "course": str(self.train_courses[i]),
                "review": str(self.train_reviews[i]),
                "similarity": round(float(sim[i]), 4),
            }
            for i in top
        ], course

    def top_k_similar_batch(self, query_texts: list[str], k: int = 10, course_hints: list[str | None] | None = None, batch_size: int = 500):
        """Efficient batched retrieval for many queries at once (used by the
        training script's sanity check / bulk scoring, mirroring the
        original Round 1 submission's chunked cosine_similarity approach)."""
        if self.vectorizer is None:
            raise RuntimeError("Model not fitted/loaded")

        n = len(query_texts)
        course_hints = course_hints or [None] * n
        courses = [hint or self.detect_course(q) for q, hint in zip(query_texts, course_hints)]
        restored = [self.restore_opener(q, c) if c else q for q, c in zip(query_texts, courses)]

        query_matrix = self.vectorizer.transform(restored)
        results: list[list[dict]] = [None] * n  # type: ignore

        for start in range(0, n, batch_size):
            end = min(start + batch_size, n)
            sim = cosine_similarity(query_matrix[start:end], self.train_matrix)
            for row in range(end - start):
                top = np.lexsort((self.train_ids, -sim[row]))[:k]
                results[start + row] = [
                    {
                        "train_index": int(self.train_ids[i]),
                        "course": str(self.train_courses[i]),
                        "review": str(self.train_reviews[i]),
                        "similarity": round(float(sim[row][i]), 4),
                    }
                    for i in top
                ]
        return results, courses

    def course_list(self):
        return [
            {"course": c, "review_count": int(n)}
            for c, n in sorted(self.course_counts.items(), key=lambda x: -x[1])
        ]

    # ------------------------------------------------------------- persist
    def save(self, path: str) -> None:
        joblib.dump(self, path)

    @staticmethod
    def load(path: str) -> "ReviewSimilarityModel":
        return joblib.load(path)
