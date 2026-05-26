"""
backend/models/segment1.py
==========================
Pydantic v2 data contracts for Segment 1 (Core Execution Engine).

FIX APPLIED
-----------
Original `models.py` used Pydantic v1 idioms:
  - @validator  â†’ replaced with @field_validator  (v2)
  - min_items / max_items in Field() â†’ replaced with min_length / max_length (v2)

All Pydantic v2 models use model_config instead of class Config.
The public API (class names, field names, JSON shapes) is UNCHANGED.
"""

from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

try:
    from config import KNOWN_ALGOS, STEP_BUDGET  # type: ignore
except ImportError:  # allow standalone import during testing
    KNOWN_ALGOS: List[str] = [
        "quicksort", "mergesort", "bubblesort", "heapsort",
        "binarysearch", "linearsearch",
        "bfs", "dfs", "dijkstra", "kruskal",
    ]
    STEP_BUDGET: int = 50_000


# ---------------------------------------------------------------------------
# Shared sub-models
# ---------------------------------------------------------------------------

class MemAccessModel(BaseModel):
    container:    str
    index:        int
    element_size: int
    rw:           Literal["r", "w"]


class TraceStepModel(BaseModel):
    step_id:     int
    parent_id:   int
    depth:       int
    op:          str  # call|return|compare|swap|assign|pivot|merge|visit
    array_state: List[int]
    vars:        Dict[str, str]
    heap_delta:  int
    run_length:  int = 1
    mem:         Optional[MemAccessModel] = None


class CacheEventModel(BaseModel):
    step_id:    int
    cache_line: int
    hit:        bool
    evicted:    Optional[int] = None


# ---------------------------------------------------------------------------
# /run-algorithm  (POST)
# ---------------------------------------------------------------------------

class RunAlgorithmRequest(BaseModel):
    algo:  str = Field(..., description="Algorithm name from KNOWN_ALGOS")
    input: List[int] = Field(..., min_length=1, max_length=500)
    mode:  Literal["trace", "benchmark", "cache"] = "trace"

    @field_validator("algo")
    @classmethod
    def algo_must_be_known(cls, v: str) -> str:
        if v not in KNOWN_ALGOS:
            raise ValueError(
                f"Unknown algorithm '{v}'. Known: {KNOWN_ALGOS}"
            )
        return v


class RunAlgorithmResponse(BaseModel):
    steps:        List[dict]       # TraceStep dicts from C++ engine
    cache_events: List[dict] = []
    truncated:    bool
    wall_ms:      float
    step_count:   int
