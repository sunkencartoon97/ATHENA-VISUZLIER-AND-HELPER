"""
backend/api/main_router.py
===========================
Central API router for ATHENA v3.0 â€” aggregates ALL segment routers.

This module is the single file that connects Segments 1â€“4.
`backend/app.py` imports `main_router` and mounts it on the FastAPI app,
resulting in a fully integrated backend.

Route groups
------------
Segment 1  (in main.py):       /health, /algos, /run-algorithm
Segment 2  (analysis_routes):  /analyze-complexity, /benchmark, /simulate-cache
Segment 3  (comparison_routes):/run-diff, /run-bug, /run-whatif
Segment 4  (search_routes):    /search, /detect-code, /request-explanation,
                                /explain-stream/{request_id}

Tag organisation (visible in /docs Swagger UI)
----------------------------------------------
- analysis    : Segment 2 endpoints
- comparison  : Segment 3 endpoints
- search      : Segment 4 endpoints
"""

from __future__ import annotations

from fastapi import APIRouter

# â”€â”€ Segment 2: Analysis Engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
from api.analysis_routes import router as _analysis_router  # type: ignore

# â”€â”€ Segment 3: Comparison Engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
from api.comparison_routes import router as _comparison_router  # type: ignore

# â”€â”€ Segment 4: Search + LLM Streaming â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
from api.search_routes import router as _search_router  # type: ignore


# ---------------------------------------------------------------------------
# Combined router
# ---------------------------------------------------------------------------

main_router = APIRouter()

main_router.include_router(_analysis_router)
main_router.include_router(_comparison_router)
main_router.include_router(_search_router)


# ---------------------------------------------------------------------------
# Route summary (for documentation and debugging)
# ---------------------------------------------------------------------------

ROUTE_SUMMARY = {
    "segment_1": [
        "GET  /health",
        "GET  /algos",
        "POST /run-algorithm",
    ],
    "segment_2": [
        "POST /analyze-complexity",
        "POST /benchmark",
        "POST /simulate-cache",
    ],
    "segment_3": [
        "POST /run-diff",
        "POST /run-bug",
        "POST /run-whatif",
    ],
    "segment_4": [
        "POST /search",
        "POST /detect-code",
        "POST /request-explanation",
        "GET  /explain-stream/{request_id}",
    ],
}
