"""
backend/config.py
=================
ATHENA v3.0 â€” Central configuration constants.

All segments import from this file. Never hard-code these values
in individual modules.

CHANGE LOG
----------
Original (Segment 1): missing PROC_TIMEOUT.
Fixed    (Segment 4): PROC_TIMEOUT = 5 added â€” required by tracer_bridge.py.
"""

from pathlib import Path

# â”€â”€ Directory layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

BASE_DIR   = Path(__file__).parent.parent        # athena/
BINARY_DIR = BASE_DIR / "engine" / "build" / "bin"
CFG_DIR    = BASE_DIR / "engine" / "cfg"

# â”€â”€ C++ subprocess resource limits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

STEP_BUDGET  = 50_000   # Hard cap on emitted trace steps (C++ halts at this count)
CPU_LIMIT_S  = 3        # RLIMIT_CPU: max CPU seconds per subprocess
MEM_LIMIT_MB = 256      # RLIMIT_AS:  max virtual memory per subprocess (MB)
PROC_TIMEOUT = 5        # proc.wait() wall-clock timeout before SIGKILL (seconds)

# â”€â”€ Known algorithms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#
# IMPORTANT: Only list algorithms that are COMPILED into the C++ engine.
# Algorithms listed here but absent from the engine will cause 500 errors.
#
# Currently compiled (Segment 1):
#   quicksort, mergesort, bubblesort, binarysearch, linearsearch, bfs, dfs
#
# NOT YET compiled (remove from list or implement in engine/src/algorithms/):
#   heapsort, dijkstra, kruskal
#
KNOWN_ALGOS = [
    # ── Sorting (10) ─────────────────────────────────────────────────────────
    "quicksort",
    "mergesort",
    "bubblesort",
    "insertionsort",
    "selectionsort",
    "heapsort",
    "countingsort",
    "radixsort",
    "bucketsort",
    "randomizedquicksort",
    # ── Searching (3) ────────────────────────────────────────────────────────
    "linearsearch",
    "binarysearch",
    "exponentialsearch",
    # ── Graph (9) ────────────────────────────────────────────────────────────
    "bfs",
    "dfs",
    "dijkstra",
    "bellmanford",
    "floydwarshall",
    "kruskal",
    "prim",
    "topological",
    "hamiltonpath",
    "graphcoloring",
    "kosaraju",
    # ── Recursion / Backtracking (4) ─────────────────────────────────────────
    "fibonacci",
    "hanoi",
    "subsetsum",
    "nqueens",
    # ── Dynamic Programming (5) ──────────────────────────────────────────────
    "knapsack01",
    "lcs",
    "matrixchain",
    "lis",
    "fibonaccidp",
    # ── Hashing (4) ──────────────────────────────────────────────────────────
    "chaining",
    "linearprobing",
    "quadraticprobing",
    "doublehashing",
    # ── String Matching (3) ──────────────────────────────────────────────────
    "naivematch",
    "kmp",
    "rabinkarp",
    # ── Greedy (4) ───────────────────────────────────────────────────────────
    "activityselection",
    "jobsequencing",
    "huffman",
    "fractionalknapsack",
]

# â”€â”€ LLM configuration (Ollama â€” local GPU) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#
# Requires Ollama running locally:  ollama serve
# Pull the model first:             ollama pull llama3.1:8b
# No API key needed â€” everything runs on your local GPU.
# The backend degrades gracefully (returns empty explanation) if Ollama is down.
#
LLM_MODEL    = "llama3.1:8b"
LLM_BASE_URL = "http://localhost:11434/v1"
