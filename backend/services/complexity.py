"""
ATHENA Segment 2: complexity analysis services.

Two modes are supported:
  1. Structural analysis of source code.
  2. Empirical curve fitting of benchmark data.
"""

from __future__ import annotations

from typing import List

from models.analysis_models import (
    AnalyzeComplexityCodeResponse,
    ComplexityResult,
    DataPoint,
)
from utils.ast_parser import ParseResult, parse_code
from utils.curve_fitting import fit_complexity

_COMPLEXITY_ORDER = {
    "O(1)": 0,
    "O(log n)": 1,
    "O(n)": 2,
    "O(n log n)": 3,
    "O(n^2)": 4,
    "O(n^3)": 5,
}


def _infer_complexity(result: ParseResult) -> str:
    """Map structural features from parsed code to a Big-O label."""
    depth = result.max_loop_depth
    has_rec = result.has_recursion
    has_dc = result.has_divide_conquer

    if has_dc:
        if depth >= 2:
            return "O(n^2 log n)"
        return "O(n log n)"
    if has_rec:
        return "O(n^2)" if depth >= 1 else "O(n)"
    if depth == 0:
        return "O(1)"
    if depth == 1:
        return "O(n)"
    if depth == 2:
        return "O(n^2)"
    return "O(n^3)"


def _generate_recurrence(result: ParseResult) -> str:
    """Produce a simple symbolic recurrence relation."""
    depth = result.max_loop_depth
    has_rec = result.has_recursion
    has_dc = result.has_divide_conquer

    if has_dc:
        return "T(n) = 2T(n/2) + n"
    if has_rec:
        return "T(n) = T(n-1) + O(1)"
    if depth == 0:
        return "T(n) = O(1)"
    if depth == 1:
        return "T(n) = n * O(1) = O(n)"
    if depth == 2:
        return "T(n) = n * T(n) = O(n^2)"
    return "T(n) = n * n * T(n) = O(n^3)"


def _build_explanation(complexity: str, result: ParseResult) -> str:
    """Generate a concise human-readable explanation."""
    parts: List[str] = []

    if result.max_loop_depth > 0:
        if result.max_loop_depth == 1:
            parts.append(
                "A single loop over the input drives linear growth (loop depth = 1)"
            )
        else:
            parts.append(
                f"Nested loops detected at depth {result.max_loop_depth}, "
                "yielding polynomial growth"
            )

    if result.has_divide_conquer:
        parts.append(
            "Divide-and-conquer recursion found: the function calls itself at "
            "least twice per invocation, consistent with O(n log n)."
        )
    elif result.has_recursion:
        parts.append(
            "Linear recursion detected: the function calls itself once per "
            "invocation with constant work at each level, giving O(n)."
        )

    if not parts:
        parts.append("No loops or recursion detected, so the code is likely O(1)")

    return ". ".join(parts) + f". Estimated complexity: {complexity}."


def analyze_code(code: str, language: str = "cpp") -> AnalyzeComplexityCodeResponse:
    """Run structural complexity analysis on source code."""
    parse_result: ParseResult = parse_code(code, language)
    estimated_complexity = _infer_complexity(parse_result)
    recurrence = _generate_recurrence(parse_result)
    explanation = _build_explanation(estimated_complexity, parse_result)

    return AnalyzeComplexityCodeResponse(
        estimated_complexity=estimated_complexity,
        recurrence=recurrence,
        loop_depth=parse_result.max_loop_depth,
        has_recursion=parse_result.has_recursion,
        explanation=explanation,
    )


def analyze_data_points(data_points: List[DataPoint]) -> ComplexityResult:
    """Fit benchmark samples to a standard Big-O family."""
    return fit_complexity(data_points)
