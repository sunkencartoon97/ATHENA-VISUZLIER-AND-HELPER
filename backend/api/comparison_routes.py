"""
backend/api/comparison_routes.py
================================
ATHENA v3.0 â€” Segment 3 routes.

Endpoints
---------
POST /run-diff
POST /run-bug
POST /run-whatif

FIXES APPLIED
-------------
BUG 10 (Response model alignment): RunBugResponse does not have a
  `buggy_crashed` field.  The fixed buginjection.py now returns that key.
  Rather than adding it to the Pydantic response model (which would be a
  breaking API change), we extract it and include it in the response via a
  custom dict, OR we add it as an Optional field.  Here we add it as
  `Optional[bool]` to RunBugResponse in comparison_models.py (see that file's
  fix) and pass it through.

BUG 11 (run_whatif None guard): `req.base_input` is guaranteed non-None by
  the model validator, but mypy and runtime safety are improved by adding an
  explicit guard before `list(req.base_input)`.

BUG 12 (run_diff concurrent crash handling): the crash check used a for-loop
  with label strings.  Improved to short-circuit immediately with clear errors.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

from models.comparison_models import (
    DiffResult,
    DiffSegment,
    PropagationStep,
    RunBugRequest,
    RunBugResponse,
    RunDiffRequest,
    RunDiffResponse,
    RunWhatIfRequest,
    RunWhatIfResponse,
)
import modules.tracer_bridge as bridge
from services.dnadiff import diff as dna_diff    # type: ignore
from services.buginjection import run_bug_injection  # type: ignore
from services.whatif import run_whatif           # type: ignore


router = APIRouter(tags=["comparison"])


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Helpers: raw dict â†’ Pydantic model
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _to_diff_result(raw: Dict[str, Any]) -> DiffResult:
    """Convert a raw diff dict (from dnadiff.diff()) to a DiffResult model."""
    segments = [
        DiffSegment(**seg) if isinstance(seg, dict) else seg
        for seg in raw.get("segments", [])
    ]
    return DiffResult(
        first_divergence_a=raw.get("first_divergence_a"),
        first_divergence_b=raw.get("first_divergence_b"),
        segments=segments,
        a_compressed_len=raw.get("a_compressed_len", 0),
        b_compressed_len=raw.get("b_compressed_len", 0),
    )


def _to_propagation_steps(raw: List[Dict[str, Any]]) -> List[PropagationStep]:
    """Convert raw propagation dicts to PropagationStep models."""
    return [PropagationStep(**p) if isinstance(p, dict) else p for p in raw]


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# POST /run-diff
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/run-diff", response_model=RunDiffResponse)
async def run_diff(req: RunDiffRequest) -> RunDiffResponse:
    """Run two algorithms on the same input and diff their execution traces."""

    input_data: List[int] = list(req.input)

    # Run both algorithms concurrently in thread pool
    try:
        result_a, result_b = await asyncio.gather(
            asyncio.to_thread(bridge.run_trace, req.algo_a, input_data[:], "trace"),
            asyncio.to_thread(bridge.run_trace, req.algo_b, input_data[:], "trace"),
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail={
            "error": "engine_not_built", "message": str(e),
        })

    # BUG 12 FIX: check both results clearly with labelled errors
    _NONFATAL = {0, -9, None}
    if result_a.exit_code not in _NONFATAL:
        raise HTTPException(status_code=502, detail={
            "error":     "algo_a_crashed",
            "exit_code": result_a.exit_code,
            "stderr":    result_a.stderr[:500],
        })
    if result_b.exit_code not in _NONFATAL:
        raise HTTPException(status_code=502, detail={
            "error":     "algo_b_crashed",
            "exit_code": result_b.exit_code,
            "stderr":    result_b.stderr[:500],
        })

    diff_raw   = dna_diff(result_a.steps, result_b.steps)
    diff_model = _to_diff_result(diff_raw)

    return RunDiffResponse(
        trace_a=result_a.steps,
        trace_b=result_b.steps,
        diff=diff_model,
        divergence_index=diff_model.first_divergence_a,
        differences=diff_model.segments,
    )


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# POST /run-bug
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/run-bug", response_model=RunBugResponse)
async def run_bug(req: RunBugRequest) -> RunBugResponse:
    """Run correct and buggy variants side-by-side, return propagation chain."""

    try:
        result = await asyncio.to_thread(
            run_bug_injection, req.algo, req.bug_id, list(req.input)
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail={
            "error": "engine_not_built", "message": str(e),
        })
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # Correct algorithm crashed â€” propagate as 502
        raise HTTPException(status_code=502, detail={
            "error":   "correct_algo_crashed",
            "message": str(e),
        })
    except Exception as e:
        raise HTTPException(status_code=502, detail={
            "error": "execution_failed", "message": str(e),
        })

    diff_model   = _to_diff_result(result.get("diff", {}))
    propagation  = _to_propagation_steps(result.get("propagation_chain", []))

    return RunBugResponse(
        algo=result["algo"],
        bug_id=result["bug_id"],
        correct_trace=result.get("correct_trace", []),
        buggy_trace=result.get("buggy_trace", []),
        first_error_step=result.get("first_error_step"),
        propagation_chain=propagation,
        propagation_steps=propagation,   # alias field
        diff=diff_model,
        llm_explanation="",
        # BUG 10: pass through crash info if the buggy variant crashed
        buggy_crashed=result.get("buggy_crashed", False),
    )


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# POST /run-whatif
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/run-whatif", response_model=RunWhatIfResponse)
async def run_whatif_endpoint(req: RunWhatIfRequest) -> RunWhatIfResponse:
    """Run the same algorithm on two inputs and diff the execution traces."""

    # BUG 11 FIX: explicit guard (model validator ensures non-None, but guard
    # here is cheap and makes static analysis happy)
    if req.base_input is None:
        raise HTTPException(status_code=400, detail="'base_input' (or 'input') is required.")

    try:
        result = await asyncio.to_thread(
            run_whatif,
            req.algo,
            list(req.base_input),
            req.modified_input,
            req.modification,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail={
            "error": "engine_not_built", "message": str(e),
        })
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": "whatif_failed", "message": str(e),
        })

    diff_model = _to_diff_result(result.get("diff", {}))

    return RunWhatIfResponse(
        algo=result["algo"],
        base_step_count=result["base_step_count"],
        modified_step_count=result["modified_step_count"],
        new_trace=result.get("new_trace", []),
        diff=diff_model,
        llm_explanation="",
    )
