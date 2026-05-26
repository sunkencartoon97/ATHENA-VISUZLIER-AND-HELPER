"""
ATHENA v3.0 â€” Segment 2 Pydantic Models
Canonical data contracts for all analysis-layer services.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------


class MemAccessInput(BaseModel):
    """One memory access event extracted from a trace step's 'mem' field."""

    step_id: int
    container: str
    index: int
    element_size: int


class CacheEvent(BaseModel):
    """Result of simulating one memory access through the L1 cache."""

    step_id: int
    cache_line: int
    hit: bool
    evicted: Optional[int] = None


class DataPoint(BaseModel):
    """Single (input-size, wall-clock time) benchmark sample."""

    n: int
    time_ms: float


class ComplexityResult(BaseModel):
    """
    Output of the curve-fitting analysis.

    label     : Best-fit complexity class, e.g. 'O(n log n)'. 'UNVERIFIABLE' if RÂ² < 0.85.
    r_squared : Goodness-of-fit for the winning curve (0.0 â€“ 1.0).
    coeffs    : [a, b] coefficients for the fitted model  a*f(n) + b  (original ms scale).
    all_fits  : RÂ² score for every candidate curve.
    """

    label: str
    r_squared: float
    coeffs: List[float]
    all_fits: Dict[str, float]


class LieDetectorResult(BaseModel):
    """
    Verdict comparing a claimed Big-O against the empirically measured one.
    No LLM is involved.
    """

    claimed: str
    measured: str
    r_squared: float
    verdict: str  # MATCH | WORSE_THAN_CLAIMED | BETTER_THAN_CLAIMED | UNVERIFIABLE
    explanation: str


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class AnalyzeComplexityRequest(BaseModel):
    """
    POST /analyze-complexity â€” two operating modes:

    Mode 1 (AST): supply 'code' (and optionally 'language').
    Mode 2 (Empirical): supply 'algo' (and optionally 'sizes').
    """

    code: Optional[str] = Field(
        default=None,
        description="Source code snippet for AST-based analysis.",
    )
    language: Optional[str] = Field(
        default="cpp",
        description="Language of the code snippet: 'cpp' or 'python'.",
    )
    algo: Optional[str] = Field(
        default=None,
        description="Algorithm name to benchmark empirically via the C++ engine.",
    )
    sizes: Optional[List[int]] = Field(
        default=None,
        description="Input sizes for empirical benchmark (e.g. [10, 50, 100, 500, 1000]).",
    )


class BenchmarkRequest(BaseModel):
    """
    POST /benchmark â€” two operating modes:

    Simple mode   : supply 'algorithm' â†’ measure and fit, no lie detection.
    Lie-detector  : also supply 'claimed_complexity' â†’ full verdict.
    """

    algorithm: Optional[str] = Field(
        default=None,
        description="Algorithm name (accepts spaces/hyphens, normalised internally).",
    )
    algo: Optional[str] = Field(
        default=None,
        description="Alias for 'algorithm'.",
    )
    claimed_complexity: Optional[str] = Field(
        default=None,
        description="Claimed Big-O, e.g. 'O(n log n)'. Triggers lie-detector mode.",
    )
    sizes: Optional[List[int]] = Field(
        default=None,
        description="Optional custom benchmark sizes (e.g. [10, 50, 100, 500]).",
    )


class CacheSimulationRequest(BaseModel):
    """POST /simulate-cache â€” list of raw memory access events from a trace."""

    memory_accesses: List[MemAccessInput]


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class AnalyzeComplexityCodeResponse(BaseModel):
    """Response for AST-based complexity analysis (Mode 1)."""

    estimated_complexity: str
    recurrence: str
    loop_depth: int
    has_recursion: bool
    explanation: str


class AnalyzeComplexityBenchmarkResponse(BaseModel):
    """Response for empirical benchmark analysis (Mode 2)."""

    data_points: List[DataPoint]
    fit: ComplexityResult


class BenchmarkResponse(BaseModel):
    """Response for POST /benchmark."""

    measured_complexity: str
    data_points: List[DataPoint]
    lie_detector: Optional[LieDetectorResult] = None
    llm_explanation: str = ""
