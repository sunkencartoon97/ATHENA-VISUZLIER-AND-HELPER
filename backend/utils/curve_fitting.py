"""
Curve fitting helpers for empirical complexity analysis.

The backend benchmarks an algorithm at several input sizes, then fits the
measured timings to a small set of common Big-O basis functions.
"""

from __future__ import annotations

import math
from typing import Callable, Dict, Iterable, List, Tuple

from models.analysis_models import ComplexityResult, DataPoint

_VERIFY_THRESHOLD = 0.85


def _log2(n: int) -> float:
    return math.log2(max(n, 2))


def _basis_constant(n: int) -> float:
    return 1.0


def _basis_log_n(n: int) -> float:
    return _log2(n)


def _basis_n(n: int) -> float:
    return float(max(n, 1))


def _basis_n_log_n(n: int) -> float:
    safe_n = max(n, 1)
    return float(safe_n) * _log2(safe_n)


def _basis_n_squared(n: int) -> float:
    safe_n = float(max(n, 1))
    return safe_n * safe_n


def _basis_n_cubed(n: int) -> float:
    safe_n = float(max(n, 1))
    return safe_n * safe_n * safe_n


_CANDIDATES: List[Tuple[str, Callable[[int], float]]] = [
    ("O(1)", _basis_constant),
    ("O(log n)", _basis_log_n),
    ("O(n)", _basis_n),
    ("O(n log n)", _basis_n_log_n),
    ("O(n^2)", _basis_n_squared),
    ("O(n^3)", _basis_n_cubed),
]


def _linear_fit(xs: Iterable[float], ys: Iterable[float]) -> Tuple[float, float]:
    x_values = list(xs)
    y_values = list(ys)
    if not x_values or len(x_values) != len(y_values):
        return 0.0, 0.0

    mean_x = sum(x_values) / len(x_values)
    mean_y = sum(y_values) / len(y_values)

    var_x = sum((x - mean_x) ** 2 for x in x_values)
    if var_x == 0:
        return 0.0, mean_y

    cov_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_values, y_values))
    slope = cov_xy / var_x
    intercept = mean_y - slope * mean_x
    return slope, intercept


def _r_squared(actual: List[float], predicted: List[float]) -> float:
    if not actual or len(actual) != len(predicted):
        return 0.0

    mean_actual = sum(actual) / len(actual)
    ss_tot = sum((value - mean_actual) ** 2 for value in actual)
    ss_res = sum((a - p) ** 2 for a, p in zip(actual, predicted))

    if ss_tot == 0:
        return 1.0 if ss_res == 0 else 0.0

    score = 1.0 - (ss_res / ss_tot)
    if math.isnan(score) or math.isinf(score):
        return 0.0
    return score


def fit_complexity(data_points: List[DataPoint]) -> ComplexityResult:
    """
    Fit measured benchmark samples to standard Big-O curves.

    Each candidate is modeled as:
        time_ms ~= a * basis(n) + b
    """
    if not data_points:
        return ComplexityResult(
            label="UNVERIFIABLE",
            r_squared=0.0,
            coeffs=[0.0, 0.0],
            all_fits={},
        )

    ns = [point.n for point in data_points]
    ys = [point.time_ms for point in data_points]

    all_fits: Dict[str, float] = {}
    best_label = "UNVERIFIABLE"
    best_score = float("-inf")
    best_coeffs = [0.0, 0.0]

    for label, basis in _CANDIDATES:
        transformed = [basis(n) for n in ns]
        slope, intercept = _linear_fit(transformed, ys)
        predicted = [slope * x + intercept for x in transformed]
        score = _r_squared(ys, predicted)
        all_fits[label] = round(score, 6)

        if score > best_score:
            best_label = label
            best_score = score
            best_coeffs = [round(slope, 6), round(intercept, 6)]

    label = best_label if best_score >= _VERIFY_THRESHOLD else "UNVERIFIABLE"

    return ComplexityResult(
        label=label,
        r_squared=round(max(best_score, 0.0), 6),
        coeffs=best_coeffs,
        all_fits=all_fits,
    )
