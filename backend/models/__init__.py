"""
backend/models/__init__.py
==========================
Converts the former flat `models.py` (Segment 1) into a proper Python package.

WHY THIS FILE EXISTS
--------------------
Segments 2 and 3 import from sub-modules:
    from models.analysis_models import ...
    from models.comparison_models import ...

Those imports require `models/` to be a directory (package), not a flat file.
At the same time, Segment 1's `main.py` imports:
    from models import RunAlgorithmRequest, RunAlgorithmResponse

This __init__.py satisfies BOTH conventions by re-exporting the Segment 1
models from the `models.segment1` sub-module.

MIGRATION NOTE
--------------
If your project still has a flat `backend/models.py` file, delete it and keep
only this `backend/models/` directory.  Python cannot have a directory and a
.py file with the same stem in the same location.
"""

from models.segment1 import (  # noqa: F401  â€” public re-exports
    MemAccessModel,
    TraceStepModel,
    CacheEventModel,
    RunAlgorithmRequest,
    RunAlgorithmResponse,
)

__all__ = [
    "MemAccessModel",
    "TraceStepModel",
    "CacheEventModel",
    "RunAlgorithmRequest",
    "RunAlgorithmResponse",
]
