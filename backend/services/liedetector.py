"""
ATHENA Segment 2: empirical complexity lie detector.

Pipeline:
  1. Benchmark the algorithm at several input sizes.
  2. Fit the measurements to common Big-O curves.
  3. Compare the claimed complexity against the measured one.
"""

from __future__ import annotations

import asyncio
import logging
import random
import re
from typing import List, Optional, Tuple

from models.analysis_models import ComplexityResult, DataPoint, LieDetectorResult
from utils.curve_fitting import fit_complexity

logger = logging.getLogger(__name__)

try:
    from modules.tracer_bridge import run_trace as _run_trace_sync  # type: ignore

    _ENGINE_AVAILABLE = True
except ImportError:
    _run_trace_sync = None  # type: ignore
    _ENGINE_AVAILABLE = False

_RANK: dict[str, int] = {
    "O(1)": 0,
    "O(log n)": 1,
    "O(n)": 2,
    "O(n log n)": 3,
    "O(n^2)": 4,
    "O(n^3)": 5,
    "O(2^n)": 6,
    "O(n!)": 7,
}

DEFAULT_BENCHMARK_SIZES: List[int] = [10, 50, 100, 200, 500, 1000]

_NORMALIZED_LABELS: List[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^o\(1\)$", re.IGNORECASE), "O(1)"),
    (re.compile(r"^o\(log\s*n\)$", re.IGNORECASE), "O(log n)"),
    (re.compile(r"^o\(n\)$", re.IGNORECASE), "O(n)"),
    (re.compile(r"^o\(n\s*log\s*n\)$", re.IGNORECASE), "O(n log n)"),
    (re.compile(r"^o\(n(?:\^2|²)\)$", re.IGNORECASE), "O(n^2)"),
    (re.compile(r"^o\(n(?:\^3|³)\)$", re.IGNORECASE), "O(n^3)"),
    (re.compile(r"^o\(2(?:\^n|ⁿ)\)$", re.IGNORECASE), "O(2^n)"),
    (re.compile(r"^o\(n!\)$", re.IGNORECASE), "O(n!)"),
]


def _normalize_complexity_label(label: str | None) -> str:
    if not label:
        return "UNVERIFIABLE"

    cleaned = (
        label.replace("Ãƒâ€šÃ‚Â²", "²")
        .replace("Ã‚Â²", "²")
        .replace("Â²", "²")
        .replace("Ãƒâ€šÃ‚Â³", "³")
        .replace("Ã‚Â³", "³")
        .replace("Â³", "³")
        .replace("2Ã¢ÂÂ¿", "2ⁿ")
        .replace("â¿", "ⁿ")
        .strip()
    )
    cleaned = re.sub(r"\s+", " ", cleaned)

    for pattern, normalized in _NORMALIZED_LABELS:
        if pattern.fullmatch(cleaned):
            return normalized

    return cleaned


def _random_array(size: int) -> List[int]:
    """Generate a benchmark input array."""
    return [random.randint(0, size * 10) for _ in range(size)]


def _benchmark_one_size(algo: str, n: int) -> Optional[DataPoint]:
    """Run the C++ engine once and return a timing sample."""
    if not _ENGINE_AVAILABLE or _run_trace_sync is None:
        raise RuntimeError(
            "C++ engine not available. "
            "Ensure athena_engine is compiled and backend/modules/tracer_bridge.py exists."
        )

    arr = _random_array(n)
    try:
        result = _run_trace_sync(algo, arr, "benchmark")
        return DataPoint(n=n, time_ms=float(result.wall_ms))
    except Exception as exc:
        logger.warning("Benchmark failed for %s n=%d: %s", algo, n, exc)
        return None


def _benchmark_all_sizes_sync(algo: str, sizes: List[int]) -> List[DataPoint]:
    if sizes:
        _benchmark_one_size(algo, sizes[0])

    data_points: List[DataPoint] = []
    for n in sizes:
        dp = _benchmark_one_size(algo, n)
        if dp is not None:
            data_points.append(dp)
    return data_points


async def run_benchmark(
    algo: str,
    sizes: Optional[List[int]] = None,
) -> List[DataPoint]:
    effective_sizes = sizes if sizes else DEFAULT_BENCHMARK_SIZES
    loop = asyncio.get_event_loop()
    data_points: List[DataPoint] = await loop.run_in_executor(
        None,
        _benchmark_all_sizes_sync,
        algo,
        effective_sizes,
    )
    return data_points


def check_verdict(
    claimed: str,
    measured: ComplexityResult,
) -> LieDetectorResult:
    """Compare a claimed complexity class against the measured fit."""
    claimed_label = _normalize_complexity_label(claimed)
    measured_label = _normalize_complexity_label(measured.label)
    r2 = measured.r_squared

    if measured_label == "UNVERIFIABLE" or r2 < 0.85:
        return LieDetectorResult(
            claimed=claimed_label,
            measured=measured_label,
            r_squared=round(r2, 4),
            verdict="UNVERIFIABLE",
            explanation=(
                f"Empirical curve fit achieved R^2={r2:.3f}, below the 0.85 "
                "confidence threshold."
            ),
        )

    claimed_rank = _RANK.get(claimed_label, -1)
    if claimed_rank == -1:
        return LieDetectorResult(
            claimed=claimed_label,
            measured=measured_label,
            r_squared=round(r2, 4),
            verdict="UNVERIFIABLE",
            explanation=(
                f"'{claimed_label}' is not a recognised complexity class. "
                f"Known classes: {', '.join(_RANK.keys())}."
            ),
        )

    measured_rank = _RANK.get(measured_label, -1)
    if measured_rank == -1:
        return LieDetectorResult(
            claimed=claimed_label,
            measured=measured_label,
            r_squared=round(r2, 4),
            verdict="UNVERIFIABLE",
            explanation=f"Measured complexity '{measured_label}' could not be ranked.",
        )

    if claimed_rank == measured_rank:
        verdict = "MATCH"
        explanation = (
            f"Empirical benchmark confirms {measured_label} (R^2={r2:.3f}), "
            f"which matches the claimed {claimed_label}."
        )
    elif measured_rank > claimed_rank:
        verdict = "WORSE_THAN_CLAIMED"
        explanation = (
            f"Empirical benchmark measured {measured_label} (R^2={r2:.3f}), "
            f"which is worse than the claimed {claimed_label}."
        )
    else:
        verdict = "BETTER_THAN_CLAIMED"
        explanation = (
            f"Empirical benchmark measured {measured_label} (R^2={r2:.3f}), "
            f"which is better than the claimed {claimed_label}."
        )

    return LieDetectorResult(
        claimed=claimed_label,
        measured=measured_label,
        r_squared=round(r2, 4),
        verdict=verdict,
        explanation=explanation,
    )


async def full_lie_detection(
    algo: str,
    claimed_complexity: str,
    sizes: Optional[List[int]] = None,
) -> Tuple[List[DataPoint], ComplexityResult, LieDetectorResult]:
    data_points = await run_benchmark(algo, sizes)
    complexity_result = fit_complexity(data_points)
    lie_result = check_verdict(claimed_complexity, complexity_result)
    return data_points, complexity_result, lie_result
