"""
backend/modules/cache_simulator.py
====================================
Compatibility shim for Segment 1's `main.py`.

WHY THIS FILE EXISTS
--------------------
Segment 1's `main.py` imports:
    from modules.cache_simulator import simulate

The actual cache simulator lives in `services/cache_simulator.py` (Segment 2)
and exposes `simulate_cache()`.  This shim bridges the naming gap so that
Segment 1 code works without modification, and both paths use the same
implementation.

PUBLIC SURFACE
--------------
simulate(accesses_with_ids) -> list[CacheEvent]
    accesses_with_ids : list of dicts with keys:
        step_id, container, index, element_size  (+ optional rw)
    Returns : list[CacheEvent] Pydantic models
"""

from __future__ import annotations

from typing import Any, Dict, List

from models.analysis_models import CacheEvent, MemAccessInput
from services.cache_simulator import simulate_cache


def simulate(accesses_with_ids: List[Dict[str, Any]]) -> List[CacheEvent]:
    """Segment 1 compatibility wrapper around services.cache_simulator.simulate_cache.

    Converts raw dicts (as assembled by main.py from trace step 'mem' fields)
    into MemAccessInput Pydantic models, runs the LRU cache simulation, and
    returns the list of CacheEvent models.

    Parameters
    ----------
    accesses_with_ids : list of dicts, each with at minimum:
        - step_id      (int)
        - container    (str)
        - index        (int)
        - element_size (int)
        Optional keys ('rw') are silently ignored.

    Returns
    -------
    list[CacheEvent]  â€” same length as input, one event per access.
    """
    mem_inputs: List[MemAccessInput] = []
    for a in accesses_with_ids:
        try:
            mem_inputs.append(
                MemAccessInput(
                    step_id=int(a["step_id"]),
                    container=str(a["container"]),
                    index=int(a["index"]),
                    element_size=int(a["element_size"]),
                )
            )
        except (KeyError, TypeError, ValueError):
            continue  # malformed entry â€” skip silently

    events, _hits, _misses, _rate = simulate_cache(mem_inputs)
    return events
