# ATHENA v3.0 — AI Algorithm Intelligence Platform
### A full-stack DAA (Design and Analysis of Algorithms) visualization, analysis, and explanation tool

ATHENA is a full-stack algorithm lab for visualizing execution, comparing traces, simulating cache behavior, analyzing complexity, injecting bugs, running what-if scenarios, and serving local AI explanations through Ollama.

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack & Dependencies](#tech-stack--dependencies)
3. [File Structure](#file-structure)
4. [Architecture & Connections](#architecture--connections)
5. [Frontend Pages & Features](#frontend-pages--features)
6. [Backend API Reference](#backend-api-reference)
7. [C++ Engine](#c-engine)
8. [All 44 Algorithms — DAA Details, Working, Limits](#all-44-algorithms--daa-details-working-limits)
9. [How Each Feature Works End-to-End](#how-each-feature-works-end-to-end)
10. [Setup & Running](#setup--running)
11. [Known Issues](#known-issues)

---

## 🧠 Project Overview

**ATHENA** is a full-stack algorithm visualization and analysis platform built as a DAA (Design and Analysis of Algorithms) project. It allows users to:

- **Visualize** step-by-step execution of 44 algorithms across 10 DAA categories
- **Analyze** time complexity empirically via C++ benchmarking and theoretically via AST parsing
- **Compare** two algorithms side-by-side with DNA-diff trace comparison
- **Simulate** CPU cache behavior (L1 cache hit/miss) during algorithm execution
- **Inject Bugs** into algorithms and trace how errors propagate
- **Run What-If** scenarios — change input and see how algorithm behavior changes
- **Search** algorithms using Trie autocomplete, TF-IDF semantic search, and code detection
- **Explain** algorithms using a local LLM (Ollama/llama3.1:8b) via Server-Sent Events

---

## 🛠 Tech Stack & Dependencies

### Frontend (`frontend/`)
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 14.2.0 | React framework, routing, SSR |
| **TypeScript** | ^5 | Type safety |
| **TailwindCSS** | ^3.4.1 | Utility-first styling |
| **Recharts** | ^2.12.0 | Complexity/benchmark charts |
| **ReactFlow** | ^11.11.0 | Graph algorithm visualization |
| **Reagraph** | ^4.30.8 | Graph layout engine |
| **react-d3-tree** | ^3.6.6 | Recursion tree visualization |
| **Framer Motion** | ^10.16.4 | Animations |
| **Lucide React** | ^0.368.0 | Icons |
| **prism-react-renderer** | ^2.4.1 | Code syntax highlighting |
| **react-diff-viewer-continued** | ^4.2.2 | Diff view for trace comparison |
| **clsx** | ^2.1.0 | Conditional class names |
| **Playwright** | ^1.59.1 | Browser testing |

### Backend (`backend/`)
| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | latest | REST API framework |
| **Uvicorn** | latest | ASGI server |
| **Pydantic v2** | latest | Request/response validation |
| **orjson** | latest | Fast JSON parsing |
| **httpx** | latest | Async HTTP client (for Ollama) |
| **Python** | 3.11+ | Runtime |

### Engine (`engine/`)
| Technology | Purpose |
|---|---|
| **C++17** | All 44 algorithm implementations |
| **CMake** | Build system |
| **nlohmann/json** | JSON output from engine |
| **WSL** (Windows) | Run Linux binary on Windows |

---

## 📁 File Structure

```
athena/
├── .venv/                          # Python virtual environment (DO NOT copy between machines)
├── .vscode/                        # VS Code workspace settings
├── backend/                        # FastAPI Python backend
│   ├── app.py                      # ★ ENTRY POINT — Uvicorn starts here
│   ├── main.py                     # Segment 1: /health, /algos, /run-algorithm
│   ├── config.py                   # Central config: KNOWN_ALGOS, limits, LLM settings
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main_router.py          # Aggregates all segment routers
│   │   ├── analysis_routes.py      # Segment 2: /analyze-complexity, /benchmark, /simulate-cache
│   │   ├── comparison_routes.py    # Segment 3: /run-diff, /run-bug, /run-whatif
│   │   └── search_routes.py        # Segment 4: /search, /detect-code, /request-explanation, /explain-stream
│   ├── models/
│   │   ├── __init__.py             # Exports RunAlgorithmRequest, RunAlgorithmResponse
│   │   ├── analysis_models.py      # Pydantic models for complexity/benchmark/cache
│   │   ├── comparison_models.py    # Pydantic models for diff/bug/whatif
│   │   └── segment1.py             # Core request/response models
│   ├── modules/
│   │   ├── __init__.py
│   │   ├── tracer_bridge.py        # ★ Python ↔ C++ bridge (subprocess runner)
│   │   └── cache_simulator.py      # Compatibility shim for cache simulation
│   ├── services/
│   │   ├── __init__.py
│   │   ├── search.py               # TF-IDF + Trie search pipeline
│   │   ├── buginjection.py         # Bug injection + propagation chain builder
│   │   ├── whatif.py               # What-if analysis engine
│   │   ├── dnadiff.py              # DNA diff: RLE + LCS trace comparison
│   │   ├── complexity.py           # AST complexity analysis
│   │   ├── liedetector.py          # Empirical complexity lie detector
│   │   └── cache_simulator.py      # L1 LRU cache simulation (8-line, 64-byte)
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── ast_parser.py           # C++/Python AST loop/recursion detection
│   │   ├── code_detector.py        # Heuristic + token-based algorithm identifier
│   │   ├── curve_fitting.py        # Big-O curve fitting on benchmark data
│   │   ├── lcs.py                  # LCS table + edit-ops backtrack
│   │   ├── trie.py                 # Prefix trie for autocomplete
│   │   └── trace_compression.py    # RLE compression of trace steps
│   ├── data/
│   │   └── algo_registry.json      # Algorithm names + descriptions for TF-IDF
│   ├── requirements.txt            # Python dependencies
│   └── server_log.txt              # Runtime log
├── engine/                         # C++ algorithm engine
│   ├── src/
│   │   ├── main.cpp                # ★ ALL 44 algorithms implemented here (2648 lines)
│   │   └── CMakeLists.txt          # CMake build config
│   ├── include/
│   │   └── json.hpp                # nlohmann/json single-header library
│   └── build/
│       └── bin/
│           └── athena_engine       # Compiled binary (run via WSL on Windows)
├── frontend/                       # Next.js TypeScript frontend
│   ├── app/
│   │   ├── layout.tsx              # Root layout, Navbar, global fonts
│   │   ├── page.tsx                # ★ Home page — algorithm grid + search + sidebar
│   │   ├── globals.css             # Global CSS, theme tokens, animations
│   │   ├── run/[algo]/             # Algorithm execution lab (visualizer + analysis)
│   │   ├── compare/                # Compare/Diff/Bug/WhatIf page
│   │   ├── complexity/             # Complexity analysis page
│   │   ├── cache/                  # Cache simulation page
│   │   ├── bug-injection/          # Bug injection page
│   │   ├── whatif/                 # What-if analysis page
│   │   └── turing/                 # Turing machine page
│   ├── components/
│   │   ├── Navbar.tsx              # Top navigation bar
│   │   ├── AlgorithmCard.tsx       # Algorithm card component
│   │   ├── PlaybackControls.tsx    # Step-by-step playback controls
│   │   ├── ComplexityChart.tsx     # Recharts complexity graph
│   │   ├── CodePanel.tsx           # Syntax-highlighted code panel
│   │   ├── StreamingExplanation.tsx # SSE-based LLM explanation streamer
│   │   ├── visualizers/
│   │   │   ├── VisualizerRouter.tsx  # Routes to correct visualizer by algo type
│   │   │   ├── SortingVisualizer.tsx # Bar chart sorting animation
│   │   │   ├── GraphVisualizer.tsx   # ReactFlow graph visualization
│   │   │   ├── RecursionTree.tsx     # D3 tree for recursion
│   │   │   ├── DPTable.tsx           # Dynamic programming table fill
│   │   │   ├── HashVisualizer.tsx    # Hash table visualization
│   │   │   ├── StringMatcher.tsx     # String matching character comparison
│   │   │   ├── NQueensBoard.tsx      # N-Queens chess board
│   │   │   ├── HuffmanTree.tsx       # Huffman coding tree
│   │   │   ├── KnapsackVisualizer.tsx # Knapsack item selection
│   │   │   └── ActivityTimeline.tsx  # Activity selection timeline
│   │   ├── analysis/               # Complexity analysis components
│   │   ├── bug/                    # Bug injection UI components
│   │   └── layout/                 # Layout components
│   ├── lib/
│   │   ├── algorithms.ts           # ★ ALGORITHM_REGISTRY — all 44 algo definitions
│   │   ├── api.ts                  # ★ Frontend API client (all endpoint wrappers)
│   │   ├── types.ts                # ★ All TypeScript types (mirrors Pydantic models)
│   │   ├── constants.ts            # App-wide constants
│   │   ├── codeSamples.ts          # Code samples for all algorithms
│   │   ├── complexityConstants.ts  # Big-O labels and ordering
│   │   ├── complexityUtils.ts      # Complexity comparison utilities
│   │   ├── nav.ts                  # Navigation link definitions
│   │   ├── turing.ts               # Turing machine programs
│   │   ├── turingMachine.ts        # Turing machine simulator
│   │   ├── usePlayback.ts          # Playback state hook
│   │   ├── githubApi.ts            # GitHub API integration
│   │   └── hooks/
│   │       └── useDebounce.ts      # Debounce hook for search
│   ├── package.json                # Node.js dependencies
│   ├── next.config.js              # Next.js config
│   ├── tailwind.config.ts          # Tailwind theme config
│   └── .env.local                  # NEXT_PUBLIC_API_URL=http://localhost:8001
├── tools/
│   └── transfer_project_paths.ps1  # Rewrites paths if project root changes
├── scripts/                        # (empty — reserved)
├── not_used/                       # Archived old code
├── requirements.txt                # Root-level pip requirements
├── run_backend.ps1                 # PowerShell script to start backend
├── run_frontend.ps1                # PowerShell script to start frontend
├── ALGORITHMS_AND_FEATURES.md      # Feature summary
├── CONNECTIONS.md                  # Service URLs and API routes
├── FRIEND_REQUIREMENTS.md          # Setup guide for new machines
├── UI_SUMMARY.md                   # UI audit notes
└── README.md                       # ← THIS FILE
```

---

## 🔗 Architecture & Connections

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (localhost:3004)                   │
│                       Next.js Frontend                        │
│                                                               │
│  page.tsx → lib/api.ts → fetch() → NEXT_PUBLIC_API_URL      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP REST (JSON)
                       │ POST /run-algorithm
                       │ POST /analyze-complexity
                       │ POST /benchmark
                       │ POST /simulate-cache
                       │ POST /run-diff
                       │ POST /run-bug
                       │ POST /run-whatif
                       │ POST /search
                       │ POST /detect-code
                       │ POST /request-explanation
                       │ GET  /explain-stream/{id}  (SSE)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                FASTAPI BACKEND (localhost:8001)               │
│                                                               │
│  app.py                                                       │
│  ├── main.py (Segment 1 — core routes)                       │
│  └── api/main_router.py                                       │
│      ├── analysis_routes.py (Segment 2)                      │
│      ├── comparison_routes.py (Segment 3)                    │
│      └── search_routes.py (Segment 4)                        │
│                                                               │
│  services/ → complex logic                                    │
│  modules/tracer_bridge.py → subprocess                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ subprocess (stdin JSON → stdout NDJSON)
                       │ via WSL on Windows
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              C++ ENGINE (engine/build/bin/athena_engine)      │
│                                                               │
│  Reads JSON from stdin:                                       │
│  { "algo": "quicksort", "input": [3,1,2], "mode": "trace" } │
│                                                               │
│  Writes NDJSON to stdout (one step per line):                │
│  {"step_id":0,"op":"pivot","array_state":[3,1,2],...}       │
│  {"step_id":1,"op":"compare","array_state":[3,1,2],...}     │
│  ...                                                          │
└─────────────────────────────────────────────────────────────┘
                       │
                       │ (Optional — LLM explanations)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              OLLAMA (localhost:11434)                          │
│              Model: llama3.1:8b                               │
│              OpenAI-compatible /v1/chat/completions           │
│              Streams tokens via SSE                           │
└─────────────────────────────────────────────────────────────┘
```

### Key Connection Files

| File | Role |
|---|---|
| `frontend/.env.local` | Sets `NEXT_PUBLIC_API_URL=http://localhost:8001` |
| `frontend/lib/api.ts` | All API calls — `fetchAthena()` with error handling |
| `frontend/lib/types.ts` | TypeScript types mirroring backend Pydantic models |
| `backend/app.py` | Uvicorn entry point, mounts all routers |
| `backend/main.py` | Segment 1 FastAPI app + CORS setup |
| `backend/config.py` | `KNOWN_ALGOS` list, limits (`STEP_BUDGET=50000`, `CPU_LIMIT_S=3`, `MEM_LIMIT_MB=256`, `PROC_TIMEOUT=5`) |
| `backend/modules/tracer_bridge.py` | Runs C++ engine via `subprocess.Popen`, reads NDJSON output |
| `backend/api/main_router.py` | Combines Segments 2–4 into one router |
| `engine/src/main.cpp` | C++ implementation of all 44 algorithms |

---

## 🖥 Frontend Pages & Features

### 1. Home Page (`/` → `app/page.tsx`)
- Algorithm grid — all 44 algorithms shown as cards with category badges and complexity labels
- **Engine status pill** — shows if backend is online and how many algorithms are compiled
- **Smart search bar** — debounced (300ms), triggers:
  - Backend `/search` (TF-IDF + Trie) for semantic results
  - Backend `/detect-code` if input looks like source code
  - Autocomplete dropdown from search results
- **Category filter pills** — filter by Sorting, Graph, DP, etc.
- **Info sidebar** (xl+) — shows algo details on hover (complexity, tags, description)

### 2. Algorithm Execution Lab (`/run/[algo]`)
- **Run algorithm** with custom input
- **Step-by-step playback** — play, pause, forward, back, speed control (`PlaybackControls.tsx`)
- **Visualizer** — routes to correct visualizer by algorithm type (`VisualizerRouter.tsx`)
  - `SortingVisualizer` — animated bar chart
  - `GraphVisualizer` — ReactFlow interactive graph
  - `RecursionTree` — D3 tree for fibonacci, hanoi, etc.
  - `DPTable` — animated DP table fill (knapsack, LCS, etc.)
  - `HashVisualizer` — hash table buckets
  - `StringMatcher` — character-by-character comparison
  - `NQueensBoard` — chess board layout
  - `HuffmanTree` — Huffman coding tree
  - `KnapsackVisualizer` — item selection display
  - `ActivityTimeline` — Gantt-style timeline
- **Code panel** — syntax-highlighted pseudocode for each algorithm
- **Complexity tab** — empirical benchmark chart + LLM explanation
- **Cache tab** — L1 cache hit/miss simulation view
- **Benchmark tab** — timing data + lie detector result

### 3. Compare Page (`/compare`)
- **Diff tab** — run two algorithms on same input, view DNA-diff comparison
- **Bug tab** — inject a known bug into quicksort/mergesort, see error propagation
- **What-If tab** — run same algorithm on modified input (reverse, sorted, custom)

### 4. Complexity Page (`/complexity`)
- Submit C++ or Python code for AST complexity analysis
- Submit algorithm name for empirical benchmarking
- View complexity chart (Recharts) + lie detector result

### 5. Cache Page (`/cache`)
- Select algorithm + input
- See per-step cache events — hit/miss/eviction with line numbers
- Summary: total hits, misses, hit rate %

### 6. Bug Injection Page (`/bug-injection`)
- Available for: quicksort (fence_post, wrong_pivot), mergesort (base_case)
- Shows correct trace vs buggy trace side-by-side
- Propagation chain: steps where array state diverges

### 7. What-If Page (`/whatif`)
- Run quicksort/mergesort/etc. on original + modified input
- Modifications: Reverse, Pre-sorted, Reverse-sorted, Custom
- View step count difference + trace diff

### 8. Turing Page (`/turing`)
- Simulated Turing machine (runs in browser, no backend needed)
- Programs: invert bits, add one, two's complement
- Tape visualization with head position

---

## 🔌 Backend API Reference

Base URL: `http://127.0.0.1:8001`

### Segment 1 — Core Algorithm Execution (main.py)

#### `GET /health`
```json
Response: { "status": "ok", "version": "3.0.0" }
```

#### `GET /algos`
```json
Response: ["quicksort", "mergesort", "bubblesort", ...]  // 44 algorithm names
```

#### `POST /run-algorithm`
```json
Request:  { "algo": "quicksort", "input": [3, 1, 2], "mode": "trace" }
// mode options: "trace" | "benchmark" | "cache"

Response: {
  "steps": [ { "step_id": 0, "op": "pivot", "array_state": [3,1,2], ... }, ... ],
  "cache_events": [],
  "truncated": false,
  "wall_ms": 12.5,
  "step_count": 47
}
```

**Input Limits by Algorithm Type:**
- **Sorting** (array): recommended 2–50 elements; hard cap at `STEP_BUDGET=50,000` steps
- **Graph** (nodes): first element = node count (cap: 10 nodes), rest = adjacency matrix
- **Recursion** (n): single integer, e.g., `[6]` for fibonacci(6)
- **DP** (varies): knapsack=[items,capacity], LCS=[seq1_len,seq2_len]
- **Hashing** (keys): list of integer keys to insert
- **String Matching** (pattern encoded): first elements = pattern, rest = text (as char codes)
- **Greedy** (varies): activityselection=[n,start1,end1,start2,end2,...]

---

### Segment 2 — Analysis Engine (analysis_routes.py)

#### `POST /analyze-complexity`
**Mode 1 — AST Code Analysis:**
```json
Request:  { "code": "for(int i=0;i<n;i++) ...", "language": "cpp" }
Response: {
  "estimated_complexity": "O(n^2)",
  "recurrence": "T(n) = n * T(n) = O(n^2)",
  "loop_depth": 2,
  "has_recursion": false,
  "explanation": "Nested loops detected at depth 2..."
}
```

**Mode 2 — Empirical Benchmark:**
```json
Request:  { "algo": "quicksort", "sizes": [10, 50, 100, 500, 1000] }
Response: {
  "data_points": [{"n": 10, "time_ms": 0.002}, ...],
  "fit": { "label": "O(n log n)", "r_squared": 0.98, "coeffs": [...], "all_fits": {...} }
}
```

#### `POST /benchmark`
```json
// Simple mode:
Request:  { "algorithm": "quicksort" }
// Lie-detector mode:
Request:  { "algorithm": "quicksort", "claimed_complexity": "O(n log n)" }
Response: {
  "measured_complexity": "O(n log n)",
  "data_points": [...],
  "lie_detector": {
    "claimed": "O(n log n)",
    "measured": "O(n log n)",
    "r_squared": 0.97,
    "verdict": "MATCH",   // or "WORSE_THAN_CLAIMED" | "BETTER_THAN_CLAIMED" | "UNVERIFIABLE"
    "explanation": "Empirical benchmark confirms..."
  },
  "llm_explanation": ""
}
```

#### `POST /simulate-cache`
```json
Request:  {
  "memory_accesses": [
    { "step_id": 2, "container": "arr", "index": 0, "element_size": 4 },
    ...
  ]
}
Response: {
  "cache_events": [{ "step_id": 2, "cache_line": 0, "hit": false, "evicted": null }, ...],
  "hits": 42,
  "misses": 8,
  "hit_rate": 0.84
}
```
**Cache Model:** 8-line direct-mapped LRU, 64-byte cache lines, 4-byte element size.

---

### Segment 3 — Comparison Engine (comparison_routes.py)

#### `POST /run-diff`
```json
Request:  { "algo_a": "quicksort", "algo_b": "mergesort", "input": [3,1,2,4] }
Response: {
  "trace_a": [...steps...],
  "trace_b": [...steps...],
  "diff": {
    "first_divergence_a": 3,
    "first_divergence_b": 2,
    "segments": [{ "kind": "equal|delete|insert|replace", "a_start": 0, "a_end": 2, ... }],
    "a_compressed_len": 15,
    "b_compressed_len": 12
  }
}
```

#### `POST /run-bug`
```json
Request:  { "algo": "quicksort", "bug_id": "fence_post", "input": [5,2,8,1,9] }
// Available bugs: quicksort/fence_post, quicksort/wrong_pivot, mergesort/base_case
Response: {
  "algo": "quicksort",
  "bug_id": "fence_post",
  "correct_trace": [...],
  "buggy_trace": [...],
  "first_error_step": 12,
  "propagation_chain": [{ "step_id": 12, "op": "swap", "correct_state": [...], "buggy_state": [...] }],
  "diff": { ... },
  "buggy_crashed": false,
  "llm_explanation": ""
}
```

#### `POST /run-whatif`
```json
Request:  {
  "algo": "quicksort",
  "input": [5, 2, 8, 1],
  "modification": "reverse"   // "reverse" | "sorted" | "sorted_desc" | "custom"
  // or: "modified_input": [1, 2, 5, 8]
}
Response: {
  "algo": "quicksort",
  "base_step_count": 47,
  "modified_step_count": 23,
  "new_trace": [...],
  "diff": { ... },
  "llm_explanation": ""
}
```

---

### Segment 4 — Search & LLM Streaming (search_routes.py)

#### `POST /search`
```json
Request:  { "query": "sorting algorithm that splits array in half" }
Response: {
  "type": "semantic",    // "semantic" | "autocomplete" | "code"
  "results": [
    { "algo": "mergesort", "score": 0.92, "action": "auto_run" }
  ]
}
```

#### `POST /detect-code`
```json
Request:  { "code": "def quicksort(arr): pivot = arr[0]..." }
Response: { "is_code": true, "algorithm": "quicksort", "confidence": 0.87 }
```

#### `POST /request-explanation`
```json
Request:  { "algo": "quicksort", "context": "...", "context_type": "general" }
// context_type: "general" | "bug" | "whatif" | "diff"
Response: { "request_id": "uuid-string" }
```

#### `GET /explain-stream/{request_id}`
Server-Sent Events stream. Each event:
```
data: {"token": "Quicksort "}
data: {"token": "works by "}
...
data: [DONE]
```

---

## ⚙️ C++ Engine

**File:** `engine/src/main.cpp` (2648 lines)

**How it works:**
1. Reads JSON from `stdin`: `{ "algo": "...", "input": [...], "mode": "trace|benchmark|cache" }`
2. Dispatches to the correct algorithm function
3. Each algorithm calls `emit()` / `emit_graph()` / `emit_recursion()` at each significant step
4. Steps are written as NDJSON (one JSON object per line) to `stdout`
5. Python backend reads stdout line-by-line via `subprocess.Popen`

**Step Budget:** `g_step_budget = 50,000` steps. If exceeded, the engine writes `TRUNCATED:N` to stderr and stops.

**Benchmark mode:** Runs the algorithm `max(1, 10000/n)` times and outputs a single timing result.

---

## 📊 All 44 Algorithms — DAA Details, Working, Limits

### Category 1: Sorting (10 Algorithms)

| Algorithm | Time Complexity | Space | Stable | Working | Visualizer Input | Practical Limit |
|---|---|---|---|---|---|---|
| **Bubble Sort** | O(n²) avg/worst, O(n) best | O(1) | ✅ Yes | Repeatedly compares and swaps adjacent elements. n passes, each bubbles the largest to end. | Integer array `[38,27,43,3,9,82,10]` | ≤ 200 elements (≤50,000 steps) |
| **Insertion Sort** | O(n²) avg/worst, O(n) best | O(1) | ✅ Yes | Picks each element and inserts it in correct position in sorted prefix. Best for nearly sorted data. | Integer array | ≤ 200 elements |
| **Selection Sort** | O(n²) all cases | O(1) | ❌ No | Finds minimum in unsorted portion and places it at front. Always n(n-1)/2 comparisons. | Integer array | ≤ 200 elements |
| **Merge Sort** | O(n log n) all | O(n) | ✅ Yes | Divide-and-conquer: splits array in half recursively, merges sorted halves. Guaranteed O(n log n). | Integer array | ≤ 500 elements |
| **Quick Sort** | O(n log n) avg, O(n²) worst | O(log n) | ❌ No | Picks pivot (last element), partitions array, recursively sorts partitions. Worst case: sorted input. | Integer array | ≤ 500 elements |
| **Heap Sort** | O(n log n) all | O(1) | ❌ No | Builds max-heap, extracts max n times. In-place. Builds heap in O(n), then n extractions of O(log n). | Integer array | ≤ 300 elements |
| **Counting Sort** | O(n + k) | O(k) | ✅ Yes | Counts occurrences of each value, computes prefix sums, places elements. Only for integers with small range k. | Integers 0–999 | n ≤ 500, values 0–9999 |
| **Radix Sort** | O(nk) where k=digits | O(n+10) | ✅ Yes | Sorts digit-by-digit from LSD to MSD using counting sort at each digit position. | Non-negative integers | n ≤ 500, max value < 10^6 |
| **Bucket Sort** | O(n+k) avg, O(n²) worst | O(n) | ✅ Yes | Distributes elements into √n buckets, sorts each bucket, concatenates. | Any integers | n ≤ 500 |
| **Randomized Quicksort** | O(n log n) avg, O(n²) worst (rare) | O(log n) | ❌ No | Quicksort with random pivot selection to avoid adversarial worst cases. | Integer array | ≤ 500 elements |

> **Status:** All 10 sorting algorithms fully working and verified in trace mode. ✅

---

### Category 2: Searching (3 Algorithms)

| Algorithm | Time | Space | Working | Input | Practical Limit |
|---|---|---|---|---|---|
| **Linear Search** | O(n) | O(1) | Scans each element left-to-right. Searches for median element of the input array. | Integer array | ≤ 1000 elements |
| **Binary Search** | O(log n) | O(1) | Sorts input, searches for median using halving. Requires sorted array — engine sorts first. | Integer array | ≤ 1000 elements |
| **Exponential Search** | O(log n) | O(1) | Exponentially grows bound until target range found, then binary search within range. | Integer array | ≤ 1000 elements |

> **Status:** All 3 searching algorithms working. ✅ Note: all search for the **median value** of the input (demo behavior).

---

### Category 3: Graph (11 Algorithms)

**Graph Input Format:** First element = number of vertices V (capped at 10). If `input.size() >= V*V+1`, the rest is read as adjacency matrix. Otherwise a default 5-node demo graph is used.

| Algorithm | Time | Space | Working | Use Case | Limit |
|---|---|---|---|---|---|
| **BFS** | O(V+E) | O(V) | Queue-based level-order traversal. Visits all neighbors before going deeper. | Shortest path (unweighted) | V ≤ 10 |
| **DFS** | O(V+E) | O(V) | Stack-based deep traversal. Explores one branch fully before backtracking. | Cycle detection, topology | V ≤ 10 |
| **Dijkstra** | O((V+E) log V) | O(V) | Min-heap priority queue. Greedily finalizes shortest distance. No negative edges. | Shortest path weighted | V ≤ 10 |
| **Bellman-Ford** | O(VE) | O(V) | V-1 relaxation passes. Detects negative cycles. Slower than Dijkstra but handles negatives. | Negative edge weights | V ≤ 10 |
| **Floyd-Warshall** | O(V³) | O(V²) | Dynamic programming. All-pairs shortest path. dp[i][j][k] = shortest using nodes 0..k. | All-pairs shortest path | V ≤ 10 |
| **Kruskal's MST** | O(E log E) | O(V) | Sort edges by weight, add if doesn't create cycle (Union-Find). | Minimum spanning tree | V ≤ 10, E ≤ 20 |
| **Prim's MST** | O((V+E) log V) | O(V) | Grow MST from vertex 0 by always picking cheapest edge to unvisited vertex. | Minimum spanning tree | V ≤ 10 |
| **Topological Sort** | O(V+E) | O(V) | DFS-based. Post-order of DAG traversal gives topological order. Detects cycles. | DAG ordering | V ≤ 10 |
| **Hamiltonian Path** | O(n!) | O(n) | Backtracking: tries all vertex orderings until a path visiting all vertices is found. | Existence check | V ≤ 7 (O(n!) grows fast) |
| **Graph Coloring** | O(m^V) | O(V) | Backtracking: assigns minimum colors such that no two adjacent vertices share a color. | Map coloring, scheduling | V ≤ 8 |
| **Kosaraju's SCC** | O(V+E) | O(V) | Two DFS passes: 1st on original to get finish order, 2nd on transpose in reverse finish order. | Strongly connected components | V ≤ 10 |

> **Status:** All 11 graph algorithms working with default demo graph. ✅

---

### Category 4: Recursion (3 Algorithms)

| Algorithm | Time | Space | Working | Input | Limit |
|---|---|---|---|---|---|
| **Fibonacci (Recursive)** | O(2^n) | O(n) | Naive tree recursion: fib(n)=fib(n-1)+fib(n-2). Shows exponential explosion. | Single integer n in array: `[8]` | n ≤ 15 (n=20 → ~2M calls, hits step budget) |
| **Tower of Hanoi** | O(2^n) | O(n) | n disks from source to target via auxiliary peg. Exactly 2^n - 1 moves required. | Single integer n: `[5]` | n ≤ 15 (n=16 → 65535 moves > budget) |
| **Subset Sum** | O(2^n) | O(n) | Backtracking: tries all 2^n subsets. Emits each include/exclude decision. | Array with last element as target sum | n ≤ 18 (2^18 = 262144 steps) |

> **Status:** All 3 working. ✅ **Warning:** Large n values will hit STEP_BUDGET=50,000 and truncate.

---

### Category 5: Backtracking (1 Algorithm)

| Algorithm | Time | Space | Working | Input | Limit |
|---|---|---|---|---|---|
| **N-Queens** | O(n!) | O(n) | Places n queens on n×n board. Backtrack when row/col/diagonal conflicts detected. | Single integer n: `[6]` | n ≤ 10 (n=11 → millions of backtracks) |

> **Status:** Working. ✅ Recommended: n = 4–8.

---

### Category 6: Dynamic Programming (5 Algorithms)

| Algorithm | Time | Space | Working | Input Format | Limit |
|---|---|---|---|---|---|
| **0/1 Knapsack** | O(nW) | O(nW) | Fill DP table: dp[i][w] = max value using first i items with capacity w. | `[n, W, w1,v1, w2,v2, ...]` n=item count, W=capacity | n ≤ 20, W ≤ 100; **knapsack01 had a crash bug (FIXED)** |
| **LCS** | O(mn) | O(mn) | Fill LCS table: dp[i][j] = LCS length of seq1[0..i] and seq2[0..j]. | Encoded as integer arrays | m,n ≤ 50 |
| **Matrix Chain** | O(n³) | O(n²) | dp[i][j] = min scalar multiplications. Tries all split points k. | Array of matrix dimensions | n ≤ 15 matrices |
| **LIS** | O(n log n) | O(n) | Binary search + patience sorting. Maintains a "piles" array for optimal subsequence. | Integer array | n ≤ 1000 |
| **Fibonacci (DP)** | O(n) | O(n) | Bottom-up memoization. Fills dp[0..n]. Much more efficient than recursive version. | Single integer n: `[20]` | n ≤ 10000 (step budget allows ~50000 fills) |

> **Status:** All 5 working. ✅ `knapsack01` previously crashed on malformed input — **FIXED** by validating item count vs input length in engine.

---

### Category 7: Hashing (4 Algorithms)

**Input:** List of integer keys to insert into the hash table.  
**Table size:** Fixed (typically 11 or 13 — prime number) in the engine.

| Algorithm | Time | Space | Working | How Collision Resolved | Limit |
|---|---|---|---|---|---|
| **Hash Chaining** | O(1) avg, O(n) worst | O(n) | Keys hashed to buckets. Each bucket is a linked list. Chaining handles unlimited collisions. | Linked list per bucket | ≤ 50 keys |
| **Linear Probing** | O(1) avg, O(n) worst | O(n) | Hash(k), if occupied → try (k+1)%n, (k+2)%n, etc. Clustering can degrade performance. | Sequential probing | ≤ 30 keys (table fills up) |
| **Quadratic Probing** | O(1) avg | O(n) | Hash(k) + i² probing sequence. Reduces clustering vs linear probing. | Quadratic probe sequence | ≤ 30 keys |
| **Double Hashing** | O(1) avg | O(n) | Uses two hash functions: h1(k) + i*h2(k). Best distribution, least clustering. | Dual hash probe | ≤ 30 keys |

> **Status:** All 4 working. ✅

---

### Category 8: String Matching (3 Algorithms)

**Input:** Integer arrays where first half = pattern (as char codes), second half = text (as char codes). The engine uses these as character sequences for matching.

| Algorithm | Time | Space | Working | How It Works | Limit |
|---|---|---|---|---|---|
| **Naive Match** | O(nm) | O(1) | Tries matching pattern at every position in text. Worst case: O(nm). | Brute force character comparison | text ≤ 1000 chars, pattern ≤ 100 |
| **KMP** | O(n+m) | O(m) | Builds failure function (partial match table). Uses it to skip redundant comparisons after mismatch. | Failure function + linear scan | text ≤ 10000 chars |
| **Rabin-Karp** | O(nm) worst, O(n+m) avg | O(1) | Rolling hash comparison. Only does character comparison when hash matches. | Polynomial rolling hash | text ≤ 10000 chars |

> **Status:** All 3 working. ✅

---

### Category 9: Greedy (4 Algorithms)

| Algorithm | Time | Space | Working | Input Format | Limit |
|---|---|---|---|---|---|
| **Activity Selection** | O(n log n) | O(1) | Sort by end time, greedily select non-overlapping activities. | `[n, s1,e1, s2,e2, ...]` — start/end times | n ≤ 50 activities |
| **Job Sequencing** | O(n log n) | O(n) | Sort jobs by profit. For each job, schedule in latest available slot before deadline. | `[n, d1,p1, d2,p2, ...]` — deadline/profit | n ≤ 50 jobs |
| **Huffman Coding** | O(n log n) | O(n) | Build min-heap of character frequencies. Repeatedly combine two lowest-frequency nodes. | `[n, f1,f2,...fn]` — frequencies | n ≤ 26 characters |
| **Fractional Knapsack** | O(n log n) | O(1) | Sort items by value/weight ratio. Take fractions to fill capacity. | `[n, W, w1,v1, w2,v2, ...]` | n ≤ 50 items |

> **Status:** All 4 working. ✅

---

## 🔄 How Each Feature Works End-to-End

### Feature 1: Algorithm Trace Visualization
```
User selects algo + inputs values on /run/[algo]
→ frontend/lib/api.ts: runAlgorithm(algo, input, "trace")
→ POST /run-algorithm
→ backend/main.py: run_algorithm()
→ modules/tracer_bridge.py: run_trace(algo, input, "trace")
→ subprocess: wsl.exe /path/athena_engine (stdin: JSON)
→ engine/src/main.cpp: dispatches to run_quicksort() etc.
→ emit() writes NDJSON steps to stdout
→ tracer_bridge reads line-by-line, parses with orjson
→ Returns TraceResult(steps=[], wall_ms=...)
→ Response: { steps: [...], step_count: N, wall_ms: ... }
→ frontend: stores steps[], renders VisualizerRouter
→ PlaybackControls steps through steps[currentStep]
```

### Feature 2: Complexity Analysis
```
User types code or selects algo on /complexity
→ api.ts: analyzeComplexity(algo, sizes) or analyzeComplexityAST({code, language})
→ POST /analyze-complexity
→ analysis_routes.py:
  Mode 1 (code): utils/ast_parser.py → parse_code() → loop depth, recursion detection
                → services/complexity.py → _infer_complexity() → Big-O label
  Mode 2 (algo): services/liedetector.py → run_benchmark() → runs C++ engine at each size
                → utils/curve_fitting.py → fit_complexity() → curve fit to O(1)/O(n)/O(n log n)/etc.
→ Response includes estimated_complexity, recurrence, explanation, data_points
→ frontend: renders ComplexityChart (Recharts scatter + fit curve)
```

### Feature 3: Cache Simulation
```
User runs algo with mode="cache" on /cache page
→ /run-algorithm with mode="cache"
→ tracer_bridge.py reads each step, synthesizes mem field if missing
  (maps step fields like bucket, row, indices to mem.container/index/rw)
→ Then /simulate-cache called with memory_accesses from steps
→ services/cache_simulator.py: simulate_cache()
  - 8-line LRU cache, 64-byte lines, 4-byte elements
  - address = index * element_size → cache_line = (address / 64) % 8
  - Hit if cache_line already in cache_lines set; Miss if not
→ Returns per-step CacheEvents + aggregate hit_rate
```

### Feature 4: DNA Diff (Compare)
```
User selects algo_a, algo_b, input on /compare
→ api.ts: runDiff(algo_a, algo_b, input)
→ POST /run-diff
→ comparison_routes.py: runs BOTH algos concurrently via asyncio.gather()
→ services/dnadiff.py: diff(trace_a, trace_b)
  - utils/trace_compression.py: RLE compress both traces (run-length encode identical ops)
  - utils/lcs.py: lcs_table(comp_a, comp_b) → O(mn) DP table
  - lcs.py: backtrack_edit_ops() → list of (equal/delete/insert) operations
  - dnadiff._group_into_segments() → groups into DiffSegment objects
→ Response: trace_a, trace_b, diff.segments, first_divergence_a
→ frontend renders side-by-side step view with highlighted divergences
```

### Feature 5: Bug Injection
```
User picks algo + bug_id on /bug-injection
→ api.ts: runBug(algo, bug_id, input)
→ POST /run-bug
→ services/buginjection.py: run_bug_injection(algo, bug_id, input)
  - Looks up buggy_algo_name from BUG_REGISTRY:
    (quicksort, fence_post) → "quicksort_bug_fence"
  - Runs correct algo trace via tracer_bridge
  - Runs buggy variant trace via tracer_bridge
  - Diffs the traces: finds first_error_step
  - Builds propagation_chain: up to 20 steps after first error
    where array_state differs between correct and buggy
→ Response: correct_trace, buggy_trace, first_error_step, propagation_chain
→ frontend: dual trace playback + propagation chain table
```

### Feature 6: What-If Analysis
```
User picks algo + modification on /whatif
→ api.ts: runWhatIf(algo, input, "reverse")
→ POST /run-whatif
→ services/whatif.py: run_whatif(algo, base_input, modification="reverse")
  - _apply_modification("reverse") → reverses input list
  - Runs base trace + modified trace independently via tracer_bridge
  - Diffs both traces via dnadiff
→ Response: base_step_count, modified_step_count, new_trace, diff
→ frontend: shows step count delta + trace diff
```

### Feature 7: Intelligent Search
```
User types in search bar on home page
→ Debounced 300ms
→ api.ts: searchAlgorithms(query)
→ POST /search
→ services/search.py: search(query)
  Pipeline:
  1. is_code(query)? → detect_algorithm() → returns "code" type result
  2. Trie exact match → returns "autocomplete" with score=1.0, action="auto_run"
  3. Trie prefix match → returns autocomplete suggestions
  4. TF-IDF semantic search:
     - Tokenize query
     - Compute query TF-IDF vector
     - Cosine similarity against all 44 algo vectors
     - score ≥ 0.85 → auto_run, score ≥ 0.50 → show_options
→ frontend: renders search results panel + autocomplete dropdown
```

### Feature 8: LLM Explanation (SSE Streaming)
```
User clicks "Explain" button after running algo
→ api.ts: requestExplanation(algo, context, context_type)
→ POST /request-explanation
→ search_routes.py: creates explanation task with UUID, stores prompt in _explanation_tasks{}
→ Returns { request_id: "uuid" }
→ api.ts: createExplainStream(request_id, onToken, onDone, onError)
→ GET /explain-stream/{request_id}
→ search_routes.py: _stream_ollama(prompt)
  - httpx async streaming POST to Ollama /v1/chat/completions
  - Streams tokens as SSE: data: {"token": "..."}
  - Terminates with data: [DONE]
→ frontend StreamingExplanation.tsx: accumulates tokens, renders markdown
→ If Ollama offline: shows [Ollama not running] message gracefully
```

---

## 🚀 Setup & Running

### Prerequisites
- Python 3.11+
- Node.js 18+
- WSL with Ubuntu (for C++ engine on Windows)
- Optional: Ollama + llama3.1:8b (for AI explanations)

### Installation

```powershell
# From repo root (C:\project\UMANG\athena)

# 1. Python environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2. Frontend
cd frontend
npm install
cd ..

# 3. Build C++ engine (in WSL)
wsl
cd /mnt/c/project/UMANG/athena/engine/build
cmake ..
make
exit
```

### Running

```powershell
# Terminal 1 — Backend
.\run_backend.ps1
# or: cd backend; py -3 -m uvicorn app:app --port 8001

# Terminal 2 — Frontend
.\run_frontend.ps1
# or: cd frontend; npm run dev
```

### URLs
- **Frontend:** http://localhost:3004
- **Backend:** http://127.0.0.1:8001
- **API Docs:** http://127.0.0.1:8001/docs (Swagger UI)

---

## ⚠️ Known Issues

| Issue | Severity | Status |
|---|---|---|
| `knapsack01` engine crash (exit 139) when item count > available pairs | High | ✅ **FIXED** — engine validates input |
| WSL cold-start delay ~1–3s on first request | Medium | ✅ Mitigated — warmup run on startup |
| Ollama not running → LLM explanation shows offline message | Low | ✅ Handled gracefully |
| DNA diff insert→delete transition corrupted segment kind | High | ✅ **FIXED** — Bug 1 in dnadiff.py |
| Explanation cleanup task race condition on first request | Medium | ✅ **FIXED** — Bug 6, startup event |
| Buggy C++ crash not surfaced in response | Medium | ✅ **FIXED** — Bug 8, buggy_crashed field |
| Propagation chain walked past shorter trace | Low | ✅ **FIXED** — Bug 9, min() instead of max() |
| Stderr pipe deadlock on large error output | High | ✅ **FIXED** — Bug 3, background thread |
