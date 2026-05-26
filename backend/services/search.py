"""
backend/services/search.py
===========================
Central search service for ATHENA Segment 4.

Pipeline (in order):
  1. Code detection  â€” if the query looks like source code, route to
                       code_detector.detect_algorithm() and return immediately.
  2. Trie exact match â€” if the query exactly matches a known algo name,
                        return a single "auto_run" result.
  3. Trie prefix search â€” if the query is a prefix of known algo names,
                          return autocomplete suggestions.
  4. TF-IDF semantic search â€” cosine similarity against algorithm description
                               corpus built from algo_registry.json at startup.

Action semantics (mirrors the frontend routing contract):
  "auto_run"     â€” frontend should navigate straight to /visualize/{algo}
  "show_options" â€” frontend should render a candidate dropdown

Result type field values:
  "autocomplete" â€” Trie matched a prefix
  "semantic"     â€” TF-IDF similarity matched
  "code"         â€” Input was identified as source code

All search logic is deterministic and free â€” no LLM, no paid APIs.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from utils.trie import Trie
from utils.code_detector import detect_algorithm, is_code

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# TF-IDF thresholds (matches architecture document Â§5, Flow 5)
_AUTO_RUN_THRESHOLD   = 0.85   # score â‰¥ this â†’ single result, auto-navigate
_SHOW_OPTIONS_THRESHOLD = 0.50  # score â‰¥ this â†’ dropdown of candidates
_TOP_K_CANDIDATES     = 5       # max candidates in show_options response

# Path to the algorithm registry JSON
_REGISTRY_PATH = Path(__file__).parent.parent / "data" / "algo_registry.json"

# ---------------------------------------------------------------------------
# Startup: build the search indices once
# ---------------------------------------------------------------------------

def _load_registry() -> Dict[str, Dict[str, Any]]:
    """Load algo_registry.json; fall back to KNOWN_ALGOS with empty descriptions."""
    if _REGISTRY_PATH.exists():
        with open(_REGISTRY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    # Fallback: build a minimal registry from config
    try:
        from config import KNOWN_ALGOS  # type: ignore
    except ImportError:
        KNOWN_ALGOS = [
            "quicksort", "mergesort", "bubblesort", "heapsort",
            "binarysearch", "linearsearch", "bfs", "dfs", "dijkstra", "kruskal",
        ]
    return {algo: {"description": algo.replace("sort", " sort").replace("search", " search")}
            for algo in KNOWN_ALGOS}


def _tokenize(text: str) -> List[str]:
    """Lowercase, split on non-alphanumeric, remove empty tokens."""
    return [t for t in re.split(r"[^a-z0-9]+", text.lower()) if t]


def _build_tfidf_index(
    registry: Dict[str, Dict[str, Any]],
) -> Tuple[Dict[str, List[float]], List[str], List[str]]:
    """Build a TF-IDF index from the registry corpus.

    Returns
    -------
    (tfidf_matrix, algo_names, vocab)
      tfidf_matrix : dict mapping algo_name â†’ TF-IDF vector (length = |vocab|)
      algo_names   : ordered list of algorithm names
      vocab        : ordered list of unique terms
    """
    # Build documents: algo_name + description tokens
    documents: Dict[str, List[str]] = {}
    for algo, info in registry.items():
        desc = info.get("description", "")
        # Include algo name itself as a token for direct-name queries
        tokens = _tokenize(f"{algo} {desc}")
        documents[algo] = tokens

    # Build vocabulary
    vocab_set: set = set()
    for tokens in documents.values():
        vocab_set.update(tokens)
    vocab: List[str] = sorted(vocab_set)
    term_to_idx = {term: i for i, term in enumerate(vocab)}
    n_docs = len(documents)
    n_terms = len(vocab)

    # Document frequency
    df: List[int] = [0] * n_terms
    for tokens in documents.values():
        seen = set(tokens)
        for term in seen:
            if term in term_to_idx:
                df[term_to_idx[term]] += 1

    # IDF (smoothed log)
    idf: List[float] = [
        math.log((n_docs + 1) / (df[i] + 1)) + 1.0
        for i in range(n_terms)
    ]

    # TF-IDF vectors (L2-normalised)
    algo_names = list(documents.keys())
    tfidf_matrix: Dict[str, List[float]] = {}

    for algo, tokens in documents.items():
        tf: List[float] = [0.0] * n_terms
        for term in tokens:
            if term in term_to_idx:
                tf[term_to_idx[term]] += 1
        # Multiply by IDF
        vec = [tf[i] * idf[i] for i in range(n_terms)]
        # L2 normalise
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        tfidf_matrix[algo] = [x / norm for x in vec]

    return tfidf_matrix, algo_names, vocab


def _cosine_similarity(
    query_vec: List[float],
    doc_vec: List[float],
) -> float:
    """Dot product of two L2-normalised vectors = cosine similarity."""
    return sum(a * b for a, b in zip(query_vec, doc_vec))


def _query_vector(
    tokens: List[str],
    vocab: List[str],
    tfidf_matrix: Dict[str, List[float]],
) -> List[float]:
    """Convert a tokenised query into a normalised TF-IDF-style vector.

    Uses the global IDF weights baked into the document vectors â€” we
    approximate by computing raw TF for the query and normalising.
    """
    term_to_idx = {term: i for i, term in enumerate(vocab)}
    n_terms = len(vocab)

    tf: List[float] = [0.0] * n_terms
    for token in tokens:
        if token in term_to_idx:
            tf[term_to_idx[token]] += 1.0

    norm = math.sqrt(sum(x * x for x in tf)) or 1.0
    return [x / norm for x in tf]


# ---------------------------------------------------------------------------
# Module-level singleton indices (built once at import time)
# ---------------------------------------------------------------------------

_REGISTRY = _load_registry()
_TRIE = Trie()
_TRIE.insert_many(list(_REGISTRY.keys()))
_TFIDF_MATRIX, _ALGO_NAMES, _VOCAB = _build_tfidf_index(_REGISTRY)


# ---------------------------------------------------------------------------
# Public search API
# ---------------------------------------------------------------------------

def search(query: str) -> Dict[str, Any]:
    """Run the full search pipeline on *query*.

    Parameters
    ----------
    query : Raw user query string (natural language or source code snippet).

    Returns
    -------
    dict matching the POST /search response contract::

        {
            "type":    "autocomplete" | "semantic" | "code",
            "results": [
                {
                    "algo":       str,
                    "score":      float,       # 0.0â€“1.0
                    "action":     "auto_run" | "show_options",
                    "confidence": float,       # code detection only
                }
            ]
        }

    An empty "results" list means no match above the minimum threshold.
    """
    query = query.strip()
    if not query:
        return {"type": "semantic", "results": []}

    # â”€â”€ Step 1: code detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if is_code(query):
        algo, confidence = detect_algorithm(query)
        if algo != "unknown" and confidence > 0.0:
            return {
                "type": "code",
                "results": [
                    {
                        "algo":       algo,
                        "score":      round(confidence, 3),
                        "action":     "auto_run" if confidence >= 0.70 else "show_options",
                        "confidence": round(confidence, 3),
                    }
                ],
            }
        # Code detected but algorithm unknown â€” fall through to semantic search
        return {"type": "code", "results": []}

    # â”€â”€ Step 2: Trie exact match â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if _TRIE.exact_match(query):
        return {
            "type": "autocomplete",
            "results": [{"algo": query.lower(), "score": 1.0, "action": "auto_run"}],
        }

    # â”€â”€ Step 3: Trie prefix autocomplete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    prefix_matches = _TRIE.search(query)
    if prefix_matches:
        if len(prefix_matches) == 1:
            return {
                "type": "autocomplete",
                "results": [
                    {"algo": prefix_matches[0], "score": 0.95, "action": "auto_run"}
                ],
            }
        # Multiple matches â†’ let user choose
        return {
            "type": "autocomplete",
            "results": [
                {"algo": m, "score": 0.90, "action": "show_options"}
                for m in prefix_matches
            ],
        }

    # â”€â”€ Step 4: TF-IDF semantic search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    query_tokens = _tokenize(query)
    if not query_tokens:
        return {"type": "semantic", "results": []}

    query_vec = _query_vector(query_tokens, _VOCAB, _TFIDF_MATRIX)

    scores: List[Tuple[str, float]] = []
    for algo in _ALGO_NAMES:
        doc_vec = _TFIDF_MATRIX[algo]
        sim = _cosine_similarity(query_vec, doc_vec)
        scores.append((algo, sim))

    scores.sort(key=lambda x: x[1], reverse=True)
    top = [s for s in scores if s[1] >= _SHOW_OPTIONS_THRESHOLD][:_TOP_K_CANDIDATES]

    if not top:
        return {"type": "semantic", "results": []}

    top_score = top[0][1]
    if top_score >= _AUTO_RUN_THRESHOLD:
        return {
            "type": "semantic",
            "results": [
                {"algo": top[0][0], "score": round(top_score, 3), "action": "auto_run"}
            ],
        }

    return {
        "type": "semantic",
        "results": [
            {"algo": algo, "score": round(score, 3), "action": "show_options"}
            for algo, score in top
        ],
    }


def top_k_semantic(query: str, k: int = 5) -> List[Tuple[str, float]]:
    """Return the top-k (algo, score) pairs for a natural-language query.

    Useful for programmatic callers that want raw scores.
    Does NOT run code detection or Trie matching â€” pure TF-IDF only.
    """
    tokens = _tokenize(query)
    if not tokens:
        return []

    query_vec = _query_vector(tokens, _VOCAB, _TFIDF_MATRIX)
    scores = [
        (algo, _cosine_similarity(query_vec, _TFIDF_MATRIX[algo]))
        for algo in _ALGO_NAMES
    ]
    scores.sort(key=lambda x: x[1], reverse=True)
    return [(algo, round(score, 4)) for algo, score in scores[:k]]
