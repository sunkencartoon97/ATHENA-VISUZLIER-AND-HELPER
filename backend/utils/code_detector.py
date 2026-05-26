"""
backend/utils/code_detector.py
================================
Lightweight code detection and algorithm identification.

Two public functions:

  is_code(text)            â†’ bool
      Heuristic scoring: returns True when the text looks like source code
      rather than a natural-language query.  Works for both C++ and Python.
      No external dependencies.

  detect_algorithm(code)   â†’ (algorithm_name, confidence)
      Uses the existing utils/ast_parser to extract structural features,
      then maps those features to an algorithm label via a deterministic
      heuristic table.  Returns ("unknown", 0.0) when no match.

Design notes
------------
* Zero paid APIs â€” entirely local.
* Confidence scores are heuristic estimates, not probabilities.
* The function never raises; errors return ("unknown", 0.0).
* Keyword scanning is done on the *lowercased* source so that casing does
  not affect detection.
"""

from __future__ import annotations

import re
from typing import Tuple

# ---------------------------------------------------------------------------
# Code-detection constants
# ---------------------------------------------------------------------------

# Tokens that appear frequently in C++ / Python code but rarely in prose
_CODE_TOKENS = [
    # C++ specific
    "{", "}", ";", "->", "::", "<<", ">>",
    "int ", "void ", "return ", "nullptr", "#include", "std::",
    "++", "--", "+=", "-=", "==", "!= ", "<=", ">=",
    # Python specific
    "def ", "elif ", "import ", "lambda ", "print(", "range(",
    # Both
    "for(", "for ", "while(", "while ", "if(", "if ", "else{",
]

# If text contains â‰¥ this many code tokens it is treated as code
_CODE_TOKEN_THRESHOLD = 3

# Heavy indicators: presence of just one makes something almost certainly code
_HEAVY_CODE_INDICATORS = [
    r"\bfor\s*\(",          # C-style for loop
    r"\bwhile\s*\(",        # C-style while
    r"#include\s*<",        # C++ header
    r"\bvoid\s+\w+\s*\(",   # C++ function signature
    r"\bdef\s+\w+\s*\(",    # Python function def
    r"\bint\s+\w+\s*\[",    # C array declaration
    r"std::\w+",            # C++ STL
]

_HEAVY_RE = [re.compile(p) for p in _HEAVY_CODE_INDICATORS]

# ---------------------------------------------------------------------------
# Algorithm keyword fingerprints (checked on lowercased source)
# Ordered by specificity â€” first match wins among equal-confidence candidates
# ---------------------------------------------------------------------------

_ALGO_FINGERPRINTS = [
    # (name, required_keywords_all_present, bonus_keywords_any_present, base_confidence)
    (
        "mergesort",
        ["merge"],
        ["mid", "left", "right", "mergesort", "merge_sort"],
        0.82,
    ),
    (
        "quicksort",
        ["partition", "pivot"],
        ["quicksort", "quick_sort", "lo", "hi"],
        0.85,
    ),
    (
        "quicksort",    # secondary fingerprint: pivot without explicit partition call
        ["pivot"],
        ["swap", "lo", "hi", "quicksort"],
        0.70,
    ),
    (
        "heapsort",
        ["heap"],
        ["heapify", "heapsort", "heap_sort", "parent", "child"],
        0.80,
    ),
    (
        "bubblesort",
        [],
        ["bubble", "bubblesort", "bubble_sort"],
        0.90,
    ),
    (
        "binarysearch",
        ["mid"],
        ["binary", "binarysearch", "binary_search", "left", "right", "found"],
        0.78,
    ),
    (
        "linearsearch",
        [],
        ["linearsearch", "linear_search", "linear search"],
        0.85,
    ),
    (
        "dijkstra",
        [],
        ["dijkstra", "dist[", "dist ", "priority_queue", "relaxation"],
        0.88,
    ),
    (
        "bfs",
        ["queue"],
        ["bfs", "breadth", "level", "visited"],
        0.80,
    ),
    (
        "dfs",
        [],
        ["dfs", "depth", "stack", "visited", "recursive"],
        0.72,
    ),
    (
        "kruskal",
        [],
        ["kruskal", "union", "find", "mst", "spanning"],
        0.85,
    ),
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def is_code(text: str) -> bool:
    """Return True if *text* appears to be source code rather than a query.

    Strategy
    --------
    1. Check for heavy structural indicators (C++ loops, Python defs, etc.)
       â†’ immediate True on first match.
    2. Count lightweight code tokens present in the text.
       â†’ True if count â‰¥ _CODE_TOKEN_THRESHOLD.
    3. Check if text contains newlines AND at least one code token
       (multi-line text with any code token is likely code).

    Parameters
    ----------
    text : Raw user input string.

    Returns
    -------
    bool
    """
    if not text or len(text.strip()) < 5:
        return False

    # 1. Heavy structural indicators
    for pattern in _HEAVY_RE:
        if pattern.search(text):
            return True

    # 2. Token count
    token_count = sum(1 for tok in _CODE_TOKENS if tok in text)
    if token_count >= _CODE_TOKEN_THRESHOLD:
        return True

    # 3. Multi-line with at least one code token
    if "\n" in text and token_count >= 1:
        return True

    return False


def detect_algorithm(code: str) -> Tuple[str, float]:
    """Identify which algorithm a code snippet most likely implements.

    Uses two layers:
    1. Keyword fingerprint matching on the lowercased source.
    2. Structural analysis via utils.ast_parser (loop depth, recursion,
       divide-and-conquer) for disambiguation and confidence adjustment.

    Parameters
    ----------
    code : Source code string (C++ or Python).

    Returns
    -------
    (algorithm_name, confidence)
      algorithm_name : One of KNOWN_ALGOS or "unknown".
      confidence     : Float in [0.0, 1.0].  0.0 means no match.
    """
    if not code or not code.strip():
        return "unknown", 0.0

    lower = code.lower()

    # â”€â”€ Layer 1: keyword fingerprints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    best_name = "unknown"
    best_conf = 0.0

    for name, required, bonus, base_conf in _ALGO_FINGERPRINTS:
        # All required keywords must be present
        if required and not all(kw in lower for kw in required):
            continue

        # Confidence boost based on bonus keyword hits
        bonus_hits = sum(1 for kw in bonus if kw in lower)
        if bonus_hits == 0 and required:
            continue  # required keys matched but no bonus â€” too weak
        if bonus_hits == 0 and not required:
            continue  # nothing matched at all

        conf = base_conf + min(bonus_hits * 0.04, 0.12)
        conf = min(conf, 0.97)

        if conf > best_conf:
            best_conf = conf
            best_name = name

    # â”€â”€ Layer 2: structural analysis via ast_parser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # (import lazily so this module remains usable without ast_parser on path)
    try:
        from utils.ast_parser import parse_code  # type: ignore

        lang = "cpp" if ("{" in code or "#include" in code) else "python"
        parsed = parse_code(code, lang)

        # Confidence adjustments from structural evidence
        if best_name == "unknown":
            # Fall back purely on structure
            if parsed.has_divide_conquer:
                # D&C + merge keyword â†’ mergesort; else â†’ quicksort
                if "merge" in lower:
                    return "mergesort", 0.65
                return "quicksort", 0.60

            if parsed.max_loop_depth >= 2 and not parsed.has_recursion:
                return "bubblesort", 0.55

            if parsed.max_loop_depth == 1 and not parsed.has_recursion:
                # Could be linear search or single-loop pattern
                if "mid" in lower or "binary" in lower:
                    return "binarysearch", 0.55
                return "linearsearch", 0.50

        else:
            # Validate / boost structural confidence
            if best_name in ("quicksort", "mergesort") and parsed.has_divide_conquer:
                best_conf = min(best_conf + 0.05, 0.97)
            if best_name == "bubblesort" and parsed.max_loop_depth >= 2:
                best_conf = min(best_conf + 0.05, 0.97)
            if best_name == "binarysearch" and parsed.max_loop_depth == 1:
                best_conf = min(best_conf + 0.03, 0.97)

    except Exception:
        pass  # ast_parser unavailable or failed â€” use keyword result as-is

    return best_name, round(best_conf, 3)
