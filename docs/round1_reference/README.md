Your original Round 1 submission script, kept here for reference.

Its logic (sentence-fingerprint course detection, opener restoration,
TF-IDF + cosine similarity retrieval) now lives as a trainable,
persistable model in `backend/ml/review_model.py`, used by the app's
Course Insights feature (`/api/reviews/similar`, `/api/reviews/courses`).
