"""
ATHENA v3.0 â€” Segment 2: Analysis API Routes

Endpoints defined here:

  POST /analyze-complexity
      Mode 1 (code):       { "code": "...", "language": "cpp" }
                           â†’ AST analysis  â†’ estimated_complexity + recurrence

      Mode 2 (empirical):  { "algo": "quicksort", "sizes": [10, 100, 500, 1000] }
                           â†’ C++ benchmarks â†’ curve-fit complexity

  POST /benchmark
      Simple mode:         { "algorithm": "merge_sort" }
                           â†’ benchmark with default sizes â†’ measured_complexity

      Lie-detector mode:   { "algorithm": "quicksort", "claimed_complexity": "O(n log n)" }
                           â†’ benchmark + verdict

  POST /simulate-cache
                           { "memory_accesses": [{step_id, container, index, element_size}, ...] }
                           â†’ list[CacheEvent] + hit / miss / hit_rate stats

Integration (add these two lines to backend/main.py):
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    from api.analysis_routes import router as analysis_router
    app.include_router(analysis_router)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from models.analysis_models import (
    AnalyzeComplexityBenchmarkResponse,
    AnalyzeComplexityCodeResponse,
    AnalyzeComplexityRequest,
    BenchmarkRequest,
    BenchmarkResponse,
    CacheSimulationRequest,
    CacheEvent,
    DataPoint,
)
from services.complexity import analyze_code, analyze_data_points
from services.liedetector import (
    DEFAULT_BENCHMARK_SIZES,
    check_verdict,
    fit_complexity,
    full_lie_detection,
    run_benchmark,
)
from services.cache_simulator import simulate_cache, extract_accesses_from_trace

logger = logging.getLogger(__name__)

router = APIRouter(tags=["analysis"])


# ===========================================================================
# POST /analyze-complexity
# ===========================================================================

@router.post(
    "/analyze-complexity",
    summary="Analyse algorithm complexity (AST or empirical)",
    response_description=(
        "AST mode: estimated_complexity + recurrence. "
        "Empirical mode: data_points + best-fit ComplexityResult."
    ),
)
async def analyze_complexity(request: AnalyzeComplexityRequest) -> JSONResponse:
    """
    Two operating modes selected by which field is present:

    **Mode 1 â€” Code / AST analysis** (fast, no C++ call):
    ```json
    { "code": "for(int i=0;i<n;i++) for(int j=0;j<n;j++) ...", "language": "cpp" }
    ```

    **Mode 2 â€” Empirical benchmark** (requires C++ engine):
    ```json
    { "algo": "quicksort", "sizes": [10, 50, 100, 500, 1000] }
    ```
    """
    # â”€â”€ Mode 1: AST analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if request.code is not None:
        code = request.code.strip()
        if not code:
            raise HTTPException(status_code=400, detail="'code' field must not be empty.")

        language = (request.language or "cpp").strip().lower()
        try:
            result: AnalyzeComplexityCodeResponse = analyze_code(code, language)
        except Exception as exc:
            logger.exception("AST analysis failed")
            raise HTTPException(
                status_code=500,
                detail=f"AST analysis error: {exc}",
            )
        return JSONResponse(content=result.model_dump())

    # â”€â”€ Mode 2: Empirical benchmark â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if request.algo is not None:
        algo = request.algo.strip().lower().replace(" ", "_").replace("-", "_")
        sizes: List[int] = request.sizes if request.sizes else DEFAULT_BENCHMARK_SIZES

        if not sizes:
            raise HTTPException(status_code=400, detail="'sizes' list must not be empty.")

        try:
            data_points: List[DataPoint] = await run_benchmark(algo, sizes)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc))
        except Exception as exc:
            logger.exception("Benchmark run failed for algo=%s", algo)
            raise HTTPException(status_code=500, detail=f"Benchmark error: {exc}")

        if not data_points:
            raise HTTPException(
                status_code=502,
                detail=(
                    f"C++ engine returned no data for algorithm '{algo}'. "
                    "Verify that athena_engine is compiled and the algorithm "
                    "name is registered in the engine's AlgoRegistry."
                ),
            )

        fit = analyze_data_points(data_points)
        response = AnalyzeComplexityBenchmarkResponse(data_points=data_points, fit=fit)
        return JSONResponse(content=response.model_dump())

    # â”€â”€ Neither field supplied â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    raise HTTPException(
        status_code=400,
        detail=(
            "Provide either 'code' (for AST analysis) "
            "or 'algo' (for empirical benchmark analysis)."
        ),
    )


# ===========================================================================
# POST /benchmark
# ===========================================================================

@router.post(
    "/benchmark",
    summary="Benchmark algorithm and optionally run the Lie Detector",
    response_description=(
        "measured_complexity, data_points, and optionally a lie_detector verdict."
    ),
)
async def benchmark(request: BenchmarkRequest) -> JSONResponse:
    """
    Benchmark an algorithm against the C++ engine.

    **Simple mode** (measure only):
    ```json
    { "algorithm": "merge_sort" }
    ```

    **Lie-detector mode** (measure + verdict):
    ```json
    { "algorithm": "quicksort", "claimed_complexity": "O(n log n)" }
    ```

    `algorithm` and `algo` are interchangeable.
    Algorithm names are normalised: spaces and hyphens â†’ underscores.
    """
    # Resolve algorithm name from either field
    raw_algo = request.algorithm or request.algo
    if not raw_algo or not raw_algo.strip():
        raise HTTPException(
            status_code=400,
            detail="Provide 'algorithm' (or 'algo') with the algorithm name.",
        )

    algo = raw_algo.strip().lower().replace(" ", "_").replace("-", "_")
    claimed = request.claimed_complexity
    sizes = request.sizes or DEFAULT_BENCHMARK_SIZES

    # â”€â”€ Lie-detector mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if claimed:
        claimed = claimed.strip()
        try:
            data_points, complexity_result, lie_result = await full_lie_detection(
                algo, claimed, sizes
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc))
        except Exception as exc:
            logger.exception("full_lie_detection failed for algo=%s", algo)
            raise HTTPException(status_code=500, detail=f"Lie detection error: {exc}")

        if not data_points:
            raise HTTPException(
                status_code=502,
                detail=f"C++ engine returned no data for algorithm '{algo}'.",
            )

        response = BenchmarkResponse(
            measured_complexity=complexity_result.label,
            data_points=data_points,
            lie_detector=lie_result,
            llm_explanation="",
        )
        return JSONResponse(content=response.model_dump())

    # â”€â”€ Simple benchmark mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    try:
        data_points = await run_benchmark(algo, sizes)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Benchmark failed for algo=%s", algo)
        raise HTTPException(status_code=500, detail=f"Benchmark error: {exc}")

    if not data_points:
        raise HTTPException(
            status_code=502,
            detail=f"C++ engine returned no data for algorithm '{algo}'.",
        )

    complexity_result = analyze_data_points(data_points)
    response = BenchmarkResponse(
        measured_complexity=complexity_result.label,
        data_points=data_points,
        llm_explanation="",
    )
    return JSONResponse(content=response.model_dump())


# ===========================================================================
# POST /simulate-cache
# ===========================================================================

@router.post(
    "/simulate-cache",
    summary="Simulate L1 cache behaviour for a sequence of memory accesses",
    response_description="Per-access CacheEvents with hit/miss/eviction data + aggregate stats.",
)
async def simulate_cache_endpoint(
    request: CacheSimulationRequest,
) -> Dict[str, Any]:
    """
    Simulate an 8-line, 64-byte-line LRU cache for the given access sequence.

    The `memory_accesses` list is taken directly from the `mem` fields of a
    trace produced by the C++ engine (Segment 1 output).

    ```json
    {
      "memory_accesses": [
        { "step_id": 2, "container": "arr", "index": 0, "element_size": 4 },
        { "step_id": 5, "container": "arr", "index": 3, "element_size": 4 }
      ]
    }
    ```
    """
    if not request.memory_accesses:
        return {
            "cache_events": [],
            "hits": 0,
            "misses": 0,
            "hit_rate": 0.0,
        }

    try:
        events, hits, misses, hit_rate = simulate_cache(request.memory_accesses)
    except Exception as exc:
        logger.exception("Cache simulation failed")
        raise HTTPException(status_code=500, detail=f"Cache simulation error: {exc}")

    return {
        "cache_events": [e.model_dump() for e in events],
        "hits": hits,
        "misses": misses,
        "hit_rate": round(hit_rate, 4),
    }
