"""
backend/main.py â€” ATHENA v3.0 FastAPI Application
Segment 1: /run-algorithm, /health, /algos only.
Additional routes added in Segments 2â€“4 via app.py.

FIX APPLIED
-----------
- result.steps is now list[dict] (tracer_bridge fix) â€” removed [s.__dict__ for s in ...]
- cache_events serialized via .model_dump() instead of .__dict__ (Pydantic v2 compat)
- Uses from modules.cache_simulator import simulate (compatibility shim from modules/)
"""

from __future__ import annotations

import asyncio

import orjson
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import RunAlgorithmRequest, RunAlgorithmResponse
import modules.tracer_bridge as bridge
from config import KNOWN_ALGOS  # type: ignore


# â”€â”€â”€ App setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app = FastAPI(
    title="ATHENA v3.0",
    version="3.0.0",
    description="AI Algorithm Intelligence Platform",
)

import os

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3004",
    "http://127.0.0.1:3004",
]

origins = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", ",".join(default_origins)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# â”€â”€â”€ Health check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.get("/health")
async def health():
    return {"status": "ok", "version": "3.0.0"}


@app.get("/algos")
async def list_algos():
    """Returns list of all supported algorithm names as a plain array (string[])."""
    return KNOWN_ALGOS


# â”€â”€â”€ POST /run-algorithm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.post("/run-algorithm", response_model=RunAlgorithmResponse)
async def run_algorithm(req: RunAlgorithmRequest):
    """
    Execute an algorithm and return full step trace.

    Calls C++ binary via subprocess. Returns NDJSON-parsed steps as dicts.
    Cache events populated only when mode="cache".
    """
    try:
        result = await asyncio.to_thread(
            bridge.run_trace, req.algo, req.input, req.mode
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail={
            "error": "engine_not_built",
            "message": str(e),
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": "execution_error",
            "message": str(e),
        })

    # Non-zero exit code (not SIGKILL=-9) = C++ crash
    if result.exit_code not in (0, -9, None):
        # Transient engine segfaults (exit 139) have been observed intermittently
        # when the C++ binary is invoked from the server. Retry once quickly
        # before failing to reduce flakiness.
        if result.exit_code == 139:
            try:
                await asyncio.sleep(0.05)
                retry_result = await asyncio.to_thread(bridge.run_trace, req.algo, req.input, req.mode)
            except FileNotFoundError as e:
                raise HTTPException(status_code=503, detail={
                    "error": "engine_not_built",
                    "message": str(e),
                })
            except Exception as e:
                raise HTTPException(status_code=500, detail={
                    "error": "execution_error",
                    "message": str(e),
                })

            if retry_result.exit_code in (0, -9, None):
                result = retry_result
            else:
                raise HTTPException(status_code=500, detail={
                    "error": "execution_failed",
                    "exit_code": retry_result.exit_code,
                    "stderr": (result.stderr or "") + "\n---retry---\n" + (retry_result.stderr or ""),
                })
        else:
            raise HTTPException(status_code=500, detail={
                "error":     "execution_failed",
                "exit_code": result.exit_code,
                "stderr":    result.stderr[:500],
            })

    cache_events: list = []
    if req.mode == "cache":
        try:
            from modules.cache_simulator import simulate  # compatibility shim

            accesses_with_ids = [
                {**s["mem"], "step_id": s["step_id"]}
                for s in result.steps
                if s.get("mem") is not None
            ]
            raw_events = simulate(accesses_with_ids)
            # Support both Pydantic models (.model_dump) and plain dicts
            cache_events = [
                e.model_dump() if hasattr(e, "model_dump") else dict(e)
                for e in raw_events
            ]
        except ImportError:
            pass  # cache_simulator not yet available

    return RunAlgorithmResponse(
        steps        = result.steps,   # already list[dict] from tracer_bridge
        cache_events = cache_events,
        truncated    = result.truncated,
        wall_ms      = result.wall_ms,
        step_count   = len(result.steps),
    )
