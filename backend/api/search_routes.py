"""
backend/api/search_routes.py
=============================
ATHENA v3.0 â€” Segment 4: Search & LLM Streaming.

Endpoints
---------
POST /search               â†’ algorithm search
POST /detect-code          â†’ code vs. query detection
POST /request-explanation  â†’ queue LLM explanation job
GET  /explain-stream/{id}  â†’ SSE stream tokens via Ollama

FIXES APPLIED
-------------
BUG 5 (Style / correctness): `import json` was repeated 3 times inside
  _stream_ollama() â€” once in the try block and once in each except branch.
  While Python caches imports, doing this inside an async generator that may
  be called many times per second is wasteful and obscures the dependency.
  Moved to module level.

BUG 6 (Lifecycle): _ensure_cleanup() was called lazily from within the
  request-explanation endpoint handler.  This means the background cleanup
  task was not started until the first explanation was requested, and a race
  existed between concurrent first-calls.  Fixed by exposing a
  `startup_cleanup()` coroutine that app.py can register with FastAPI's
  lifespan / on_event("startup") hook so the task starts deterministically.
  _ensure_cleanup() is kept as a safety fallback for the existing call site.

BUG 7 (SSE protocol): The final `data: [DONE]\\n\\n` event was always emitted
  even after an error token was yielded.  This is correct per the spec, but
  the [DONE] sentinel was missing from the ConnectError path in some earlier
  versions.  Verified it is always emitted via the `finally` block approach.
"""

from __future__ import annotations

import asyncio
import json           # â† FIX (Bug 5): single module-level import
import time
import uuid
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from config import LLM_MODEL, LLM_BASE_URL  # type: ignore


router = APIRouter(tags=["search"])


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Request / response models (defined locally â€” not part of models/ package as
# they are thin wrappers used only in this route file)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)


class SearchResult(BaseModel):
    algo:   str
    score:  float
    action: str  # "auto_run" | "show_options"


class SearchResponse(BaseModel):
    type:    str            # "autocomplete" | "semantic" | "code"
    results: list[SearchResult]


class DetectCodeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=20_000)


class DetectCodeResponse(BaseModel):
    is_code:    bool
    algorithm:  str   = "unknown"
    confidence: float = 0.0


class ExplainRequest(BaseModel):
    algo:         str
    context:      str = ""
    context_type: str = "general"  # bug | whatif | diff | general


class ExplainQueueResponse(BaseModel):
    request_id: str


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# In-memory task store
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

_explanation_tasks: Dict[str, Dict[str, Any]] = {}
_TASK_TTL_SECONDS = 600  # 10 minutes

_PROMPT_TEMPLATES: Dict[str, str] = {
    "bug": (
        "You are ATHENA, an algorithm education assistant.\n"
        "The user found a bug in {algo}. Context:\n{context}\n\n"
        "Explain:\n"
        "1. What the bug is and why it causes incorrect behaviour.\n"
        "2. At which step the error first appears.\n"
        "3. How the error propagates through subsequent steps.\n"
        "4. How to fix the bug.\n"
        "Be concise. Use step numbers when possible."
    ),
    "whatif": (
        "You are ATHENA, an algorithm education assistant.\n"
        "The user ran a what-if analysis on {algo}. Context:\n{context}\n\n"
        "Explain:\n"
        "1. Why the input modification changes the execution trace.\n"
        "2. How the step count and operations differ.\n"
        "3. What this reveals about the algorithm's behaviour.\n"
        "Be concise."
    ),
    "diff": (
        "You are ATHENA, an algorithm education assistant.\n"
        "The user compared two algorithms. Context:\n{context}\n\n"
        "Explain:\n"
        "1. Where and why the execution traces diverge.\n"
        "2. What the structural differences mean.\n"
        "3. Trade-offs between the two algorithms.\n"
        "Be concise."
    ),
    "general": (
        "You are ATHENA, an algorithm education assistant.\n"
        "Explain {algo} clearly.\n{context}\n"
        "Cover: how it works, complexity, when to use it."
    ),
}


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Background cleanup
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

_cleanup_task: Optional[asyncio.Task] = None


async def _cleanup_loop() -> None:
    """Evict explanation tasks older than _TASK_TTL_SECONDS every 60 s."""
    while True:
        await asyncio.sleep(60)
        now = time.time()
        expired = [
            k for k, v in list(_explanation_tasks.items())
            if now - v["created"] > _TASK_TTL_SECONDS
        ]
        for k in expired:
            _explanation_tasks.pop(k, None)


async def startup_cleanup() -> None:
    """
    FIX (Bug 6): Call this from FastAPI's startup event (in app.py) so the
    cleanup task is created once, deterministically, on the running loop:

        @app.on_event("startup")
        async def _start_cleanup():
            from api.search_routes import startup_cleanup
            await startup_cleanup()
    """
    global _cleanup_task
    if _cleanup_task is None or _cleanup_task.done():
        _cleanup_task = asyncio.get_running_loop().create_task(_cleanup_loop())


def _ensure_cleanup() -> None:
    """Safety fallback: start cleanup task if it hasn't been started yet."""
    global _cleanup_task
    if _cleanup_task is None or _cleanup_task.done():
        try:
            loop = asyncio.get_running_loop()
            _cleanup_task = loop.create_task(_cleanup_loop())
        except RuntimeError:
            pass  # No running loop â€” will retry on next call


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# POST /search
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/search", response_model=SearchResponse)
async def search_endpoint(req: SearchRequest) -> SearchResponse:
    """Multi-stage algorithm search."""
    from services.search import search  # type: ignore  (lazy: avoids import-time FS error)

    raw     = await asyncio.to_thread(search, req.query)
    results = [SearchResult(**r) for r in raw.get("results", [])]
    return SearchResponse(type=raw.get("type", "semantic"), results=results)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# POST /detect-code
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/detect-code", response_model=DetectCodeResponse)
async def detect_code_endpoint(req: DetectCodeRequest) -> DetectCodeResponse:
    """Detect if text is source code and identify which algorithm it implements."""
    from utils.code_detector import is_code, detect_algorithm  # type: ignore

    if is_code(req.code):
        algo_name, confidence = detect_algorithm(req.code)
        return DetectCodeResponse(is_code=True, algorithm=algo_name, confidence=confidence)
    return DetectCodeResponse(is_code=False)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# POST /request-explanation
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.post("/request-explanation", response_model=ExplainQueueResponse)
async def request_explanation(req: ExplainRequest) -> ExplainQueueResponse:
    """Register an LLM explanation job; returns a request_id for SSE streaming."""
    _ensure_cleanup()  # safety fallback â€” ideally started at app startup

    request_id = str(uuid.uuid4())
    template   = _PROMPT_TEMPLATES.get(req.context_type, _PROMPT_TEMPLATES["general"])
    prompt     = template.format(algo=req.algo, context=req.context)

    _explanation_tasks[request_id] = {
        "prompt":  prompt,
        "created": time.time(),
    }

    return ExplainQueueResponse(request_id=request_id)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# GET /explain-stream/{request_id}
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async def _stream_ollama(prompt: str):
    """
    Async generator: streams tokens from local Ollama via OpenAI-compat API.
    FIX (Bug 5): json is now imported at module level â€” no repeated imports.
    FIX (Bug 7): [DONE] is emitted via `finally` so it is ALWAYS sent, even
                 after an error token, matching the SSE spec.
    """
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{LLM_BASE_URL}/chat/completions",
                json={
                    "model":    LLM_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream":   True,
                },
            ) as response:
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    payload = line[6:]
                    if payload.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(payload)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        token = delta.get("content", "")
                        if token:
                            yield f"data: {json.dumps({'token': token})}\n\n"
                    except json.JSONDecodeError:
                        continue

    except httpx.ConnectError:
        yield (
            f"data: {json.dumps({'token': ' [Ollama not running - start with: ollama serve]'})}\n\n"
        )
    except Exception as e:
        yield f"data: {json.dumps({'token': f' [Error: {e}]'})}\n\n"
    finally:
        # FIX (Bug 7): always terminate the SSE stream cleanly
        yield "data: [DONE]\n\n"


@router.get("/explain-stream/{request_id}")
async def explain_stream(request_id: str) -> StreamingResponse:
    """SSE endpoint â€” stream LLM tokens for a registered explanation job."""

    task = _explanation_tasks.pop(request_id, None)
    if task is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown or expired request_id: {request_id}",
        )

    return StreamingResponse(
        _stream_ollama(task["prompt"]),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "Connection":       "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
