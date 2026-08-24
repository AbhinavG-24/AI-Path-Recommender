"""
Stage 1 of the hybrid recommender: candidate retrieval.

Three retrieval signals are computed over the resource corpus:

1. TF-IDF cosine similarity      -- classic sparse lexical matching
2. BM25                          -- probabilistic ranking, better with short queries
3. Semantic similarity           -- dense embeddings via sentence-transformers if
                                     installed, otherwise a TruncatedSVD (LSA)
                                     projection of the TF-IDF space as an offline
                                     fallback that still captures latent topic
                                     similarity beyond exact keyword overlap.

All three run against a local JSON dataset -- no external API required.
"""
import json
import re
from pathlib import Path
from functools import lru_cache

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
from rank_bm25 import BM25Okapi

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str):
    return _TOKEN_RE.findall(text.lower())


def _resource_text(resource: dict) -> str:
    parts = [
        resource["title"],
        resource["description"],
        " ".join(resource.get("tags", [])),
        " ".join(resource.get("skills", [])),
        resource.get("category", ""),
    ]
    return " ".join(parts)


class ResourceIndex:
    def __init__(self, resources_path: Path = DATA_DIR / "resources.json"):
        raw = json.loads(resources_path.read_text())
        self.resources = raw["resources"]
        self.by_id = {r["id"]: r for r in self.resources}
        self.corpus_texts = [_resource_text(r) for r in self.resources]

        # --- TF-IDF ---
        self.tfidf_vectorizer = TfidfVectorizer(stop_words="english", max_features=4000)
        self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(self.corpus_texts)

        # --- BM25 ---
        self.tokenized_corpus = [_tokenize(t) for t in self.corpus_texts]
        self.bm25 = BM25Okapi(self.tokenized_corpus)

        # --- Semantic (LSA fallback, or sentence-transformers if available) ---
        self._semantic_backend = "lsa"
        self._sentence_model = None
        try:
            from sentence_transformers import SentenceTransformer  # optional heavy dep
            self._sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
            self.semantic_matrix = self._sentence_model.encode(self.corpus_texts, normalize_embeddings=True)
            self._semantic_backend = "sentence-transformers"
        except Exception:
            n_components = min(128, self.tfidf_matrix.shape[1] - 1, self.tfidf_matrix.shape[0] - 1)
            n_components = max(n_components, 2)
            self.svd = TruncatedSVD(n_components=n_components, random_state=42)
            self.semantic_matrix = self.svd.fit_transform(self.tfidf_matrix)

    @property
    def semantic_backend(self) -> str:
        return self._semantic_backend

    def _embed_query_semantic(self, query: str):
        if self._sentence_model is not None:
            return self._sentence_model.encode([query], normalize_embeddings=True)[0]
        vec = self.tfidf_vectorizer.transform([query])
        return self.svd.transform(vec)[0]

    def tfidf_scores(self, query: str) -> dict:
        vec = self.tfidf_vectorizer.transform([query])
        sims = cosine_similarity(vec, self.tfidf_matrix)[0]
        return {r["id"]: float(s) for r, s in zip(self.resources, sims)}

    def bm25_scores(self, query: str) -> dict:
        tokens = _tokenize(query)
        scores = self.bm25.get_scores(tokens)
        max_score = max(scores) if len(scores) and max(scores) > 0 else 1.0
        return {r["id"]: float(s / max_score) for r, s in zip(self.resources, scores)}

    def semantic_scores(self, query: str) -> dict:
        q_vec = self._embed_query_semantic(query).reshape(1, -1)
        sims = cosine_similarity(q_vec, self.semantic_matrix)[0]
        # min-max normalize into 0-1 since LSA cosine sims can be negative
        lo, hi = sims.min(), sims.max()
        if hi - lo < 1e-9:
            norm = np.zeros_like(sims)
        else:
            norm = (sims - lo) / (hi - lo)
        return {r["id"]: float(s) for r, s in zip(self.resources, norm)}

    def candidates_for_skills(self, skill_ids: list[str]):
        """All resources tagged with at least one of the given skills."""
        skill_set = set(skill_ids)
        return [r for r in self.resources if skill_set.intersection(r.get("skills", []))]

    def get(self, resource_id: str):
        return self.by_id.get(resource_id)


@lru_cache()
def get_resource_index() -> "ResourceIndex":
    return ResourceIndex()
