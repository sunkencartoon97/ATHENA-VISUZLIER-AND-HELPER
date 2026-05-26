"""
trace_compression.py
====================
RLE-style compression of ATHENA trace steps.

Groups consecutive steps that share the same ``op`` into a single
CompressedSymbol.  The grouping accounts for any run_length already embedded
by the C++ engine, so the accumulated ``count`` field is always accurate.

Compression reduces a 50 000-step bubblesort trace to â‰ˆ 600 symbols, making
LCS feasible in milliseconds rather than seconds.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass
class CompressedSymbol:
    """One RLE group: all consecutive trace steps that share the same op.

    Attributes
    ----------
    op            : Operation string (e.g. ``"compare"``, ``"swap"``).
    count         : Total logical step count, including pre-existing run_length
                    values emitted by the C++ engine.
    start_step_id : ``step_id`` of the *first* raw step in this group.
    end_step_id   : ``step_id`` of the *last* raw step in this group.
    start_index   : Index of the first raw step in the original trace list.
    end_index     : Index of the last raw step in the original trace list
                    (inclusive).
    """

    op: str
    count: int
    start_step_id: int
    end_step_id: int
    start_index: int
    end_index: int


def compress(trace: List[dict]) -> List[CompressedSymbol]:
    """RLE-compress a trace into a list of :class:`CompressedSymbol` objects.

    Parameters
    ----------
    trace:
        A ``list[dict]`` as returned by ``TraceResult.steps``.  Each dict is
        expected to contain at least ``"op"`` and ``"step_id"`` keys; the
        optional ``"run_length"`` key (set by the C++ engine) is accumulated
        into the symbol's ``count`` so that logical step counts are exact.

    Returns
    -------
    List[CompressedSymbol]
        One symbol per run of consecutive identical ops.  Empty list when
        ``trace`` is empty.

    Edge cases
    ----------
    * Empty trace          â†’ returns ``[]``.
    * Single-step trace    â†’ returns one symbol with ``count = run_length``.
    * Trace already        â†’ ``run_length`` values are summed correctly;
      run-length encoded     no double-counting occurs.
    * Missing ``step_id``  â†’ falls back to the list index (0-based).
    * Missing ``run_length`` â†’ treated as 1.
    """
    if not trace:
        return []

    symbols: List[CompressedSymbol] = []

    first = trace[0]
    current_op: str = first.get("op", "")
    current_start_id: int = first.get("step_id", 0)
    current_end_id: int = current_start_id
    current_count: int = max(1, first.get("run_length", 1))
    current_start_idx: int = 0

    for i in range(1, len(trace)):
        step = trace[i]
        op: str = step.get("op", "")
        step_id: int = step.get("step_id", i)
        run_length: int = max(1, step.get("run_length", 1))

        if op == current_op:
            # Extend the current group
            current_count += run_length
            current_end_id = step_id
        else:
            # Flush the current group
            symbols.append(
                CompressedSymbol(
                    op=current_op,
                    count=current_count,
                    start_step_id=current_start_id,
                    end_step_id=current_end_id,
                    start_index=current_start_idx,
                    end_index=i - 1,
                )
            )
            # Begin a new group
            current_op = op
            current_start_id = step_id
            current_end_id = step_id
            current_count = run_length
            current_start_idx = i

    # Flush the final group
    last_step_id = trace[-1].get("step_id", len(trace) - 1)
    symbols.append(
        CompressedSymbol(
            op=current_op,
            count=current_count,
            start_step_id=current_start_id,
            end_step_id=last_step_id,
            start_index=current_start_idx,
            end_index=len(trace) - 1,
        )
    )

    return symbols
