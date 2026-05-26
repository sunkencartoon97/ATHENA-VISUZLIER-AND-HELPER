"""
backend/app.py
===============
ATHENA v3.0 â€” Unified Backend Entry Point (Segments 1â€“4).

Run with:
    uvicorn app:app --reload --port 8001
    (must be run from the backend/ directory)

This file:
  1. Imports the Segment 1 FastAPI app from main.py (untouched).
  2. Mounts ALL remaining routers (Segments 2â€“4) via api/main_router.py.
  3. Re-exports `app` so uvicorn can find it.

Architecture principle: main.py is NEVER modified between segments.
Each new segment adds its router via include_router() here in app.py.

FIXES APPLIED
-------------
BUG 6 (Lifecycle â€” from search_routes.py): The explanation-task cleanup
  coroutine was started lazily inside an endpoint handler, creating a race
  condition on the first request.  The fix registers a proper FastAPI startup
  event that starts the cleanup task once, on the running event loop,
  before any requests are served.
"""

from __future__ import annotations

from main import app  # noqa: F401  â€” Segment 1 app, all Segment 1 routes intact

from api.main_router import main_router, ROUTE_SUMMARY  # type: ignore

# Mount all Segments 2â€“4 routers in one call
app.include_router(main_router)


# ---------------------------------------------------------------------------
# Startup: launch background tasks that need a running event loop
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def _on_startup():
    """
    BUG 6 FIX: start the explanation-task cleanup coroutine once at startup.
    PERF FIX:  warm up WSL by running a tiny trace in the background so the
               first real user request doesn't pay the ~1-3s WSL cold-start cost.
    """
    from api.search_routes import startup_cleanup  # type: ignore
    await startup_cleanup()

    # WSL warm-up — fire and forget, don't block startup
    import asyncio
    import threading

    def _warmup():
        try:
            import modules.tracer_bridge as bridge
            bridge.run_trace("bubblesort", [3, 1, 2], "trace")
        except Exception:
            pass  # warm-up failure is non-fatal

    threading.Thread(target=_warmup, daemon=True).start()


# ---------------------------------------------------------------------------
# Debug endpoint â€” lists all registered routes grouped by segment
# ---------------------------------------------------------------------------

@app.get("/routes", tags=["debug"], include_in_schema=False)
async def list_routes():
    """Returns all registered API routes grouped by segment. Not in OpenAPI schema."""
    return ROUTE_SUMMARY


# â”€â”€ Re-export for uvicorn â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
__all__ = ["app"]
