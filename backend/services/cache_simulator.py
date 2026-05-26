"""
ATHENA v3.0 â€” Segment 2: L1 Cache Simulator
8-line fully-associative LRU cache simulation.

FIXES APPLIED
-------------
BUG 13 (Unbounded global state): `_dynamic_base_counter` and `_dynamic_bases`
  are module-level globals that accumulate indefinitely across the lifetime of
  the server process.  If many requests introduce new unknown container names,
  the dict grows without bound.

  Fix: capped at 256 dynamic entries (highly conservative â€” the C++ engine
  only uses ~8 container names in practice).  When the cap is reached, new
  unknown containers fall back to address 0x00FF0000 (a fixed sentinel that
  at least keeps them in their own cache lines away from known containers).

BUG 14 (Thread safety): `_dynamic_bases` is a global dict mutated without a
  lock.  FastAPI runs endpoints on a thread pool via asyncio.to_thread(), so
  two requests that concurrently introduce the same new container name could
  both check `container not in _dynamic_bases`, both decide it is absent, and
  write different counter values to `_dynamic_base_counter`, causing one to
  overwrite the other.

  Fix: added a threading.Lock() around the dynamic-address assignment block.
  For the known containers (the common path) no lock is needed since they are
  read-only after module import.
"""

from __future__ import annotations

import threading
from collections import OrderedDict
from typing import Dict, List, Optional, Tuple

from models.analysis_models import CacheEvent, MemAccessInput


_CACHE_LINES = 8
_LINE_WIDTH  = 64

_KNOWN_BASES: Dict[str, int] = {
    "arr":   0x00000000,
    "left":  0x00010000,
    "right": 0x00020000,
    "stack": 0x00030000,
    "temp":  0x00040000,
    "aux":   0x00050000,
    "heap":  0x00060000,
    "buf":   0x00070000,
}

# BUG 13/14 FIX: dynamic state is protected by a lock and capped
_DYNAMIC_CAP             = 256
_DYNAMIC_FALLBACK_ADDR   = 0x00FF0000
_dynamic_base_counter    = 0x00080000
_dynamic_bases: Dict[str, int] = {}
_dynamic_lock = threading.Lock()


def _base_address(container: str) -> int:
    global _dynamic_base_counter

    # Fast path: known containers (read-only after module import)
    if container in _KNOWN_BASES:
        return _KNOWN_BASES[container]

    # Already assigned dynamically â€” read with lock for visibility
    with _dynamic_lock:
        if container in _dynamic_bases:
            return _dynamic_bases[container]

        # BUG 13 FIX: cap to prevent unbounded growth
        if len(_dynamic_bases) >= _DYNAMIC_CAP:
            return _DYNAMIC_FALLBACK_ADDR

        # Assign a new address
        addr = _dynamic_base_counter
        _dynamic_bases[container] = addr
        _dynamic_base_counter += 0x00010000
        return addr


class CacheSimulator:
    def __init__(self, num_lines: int = _CACHE_LINES, line_width: int = _LINE_WIDTH):
        self.num_lines  = num_lines
        self.line_width = line_width
        self.cache: OrderedDict[int, bool] = OrderedDict()
        self.hits   = 0
        self.misses = 0

    def process_access(self, access: MemAccessInput) -> CacheEvent:
        byte_addr = _base_address(access.container) + access.index * access.element_size
        tag = byte_addr // self.line_width

        if tag in self.cache:
            self.hits += 1
            self.cache.move_to_end(tag)
            return CacheEvent(
                step_id=access.step_id,
                cache_line=tag % self.num_lines,
                hit=True,
                evicted=None,
            )

        self.misses += 1
        evicted: Optional[int] = None
        if len(self.cache) >= self.num_lines:
            evicted_tag, _ = self.cache.popitem(last=False)
            evicted = evicted_tag

        self.cache[tag] = True
        return CacheEvent(
            step_id=access.step_id,
            cache_line=tag % self.num_lines,
            hit=False,
            evicted=evicted,
        )

    def simulate(self, accesses: List[MemAccessInput]) -> List[CacheEvent]:
        return [self.process_access(a) for a in accesses]

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    @property
    def occupancy(self) -> int:
        return len(self.cache)


def simulate_cache(
    accesses: List[MemAccessInput],
) -> Tuple[List[CacheEvent], int, int, float]:
    sim    = CacheSimulator()
    events = sim.simulate(accesses)
    return events, sim.hits, sim.misses, sim.hit_rate


def extract_accesses_from_trace(trace_steps: List[dict]) -> List[MemAccessInput]:
    result: List[MemAccessInput] = []
    for step in trace_steps:
        mem = step.get("mem")
        if mem is not None:
            try:
                result.append(MemAccessInput(
                    step_id=step["step_id"],
                    container=mem["container"],
                    index=mem["index"],
                    element_size=mem["element_size"],
                ))
            except (KeyError, TypeError):
                continue
    return result
