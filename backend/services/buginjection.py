"""
ATHENA v3.0 â€” Segment 3: Bug Injection Service
Runs correct and buggy variants, returns propagation chain.

FIXES APPLIED
-------------
BUG 8 (Missing guard): `buggy_result.exit_code` was never checked.  If the
  buggy C++ variant crashed (non-zero exit, non-SIGKILL), `buggy_result.steps`
  would be empty or partial and the downstream diff/propagation code would
  silently produce empty/misleading output with no indication of what happened.

  Fix: check buggy exit_code and, if it indicates a real crash (not SIGKILL
  which is the step-budget enforcement), surface it in the returned dict as
  `buggy_crashed: True` with the exit code.  The propagation chain is still
  returned (possibly empty) so the caller can decide how to present it â€” a
  crash IS a valid "bug outcome" worth showing to the user.

BUG 9 (Propagation chain limit edge case): `_build_propagation_chain` used
  `max(len(correct_steps), len(buggy_steps))` as the upper limit, which means
  on very long traces (50k steps) the `limit` variable could equal
  `first_error_idx + max_chain` only when the trace is also short.  The intent
  is to walk at most `max_chain` steps past the first error, capped by the
  shorter of the two traces â€” not the longer.  Changed to `min(...)` for both
  lengths so we never index beyond what BOTH traces actually have.
  (The original code already min'd with `first_error_idx + max_chain` so this
  is only a tightening, not a behaviour reversal.)
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import modules.tracer_bridge as bridge
from services.dnadiff import diff as dna_diff, find_trace_index


BUG_REGISTRY: Dict[tuple, str] = {
    ("quicksort", "fence_post"):  "quicksort_bug_fence",
    ("quicksort", "wrong_pivot"): "quicksort_bug_pivot",
    ("mergesort", "base_case"):   "mergesort_bug_base",
}

# Exit codes that are NOT crashes (step-budget kill or clean exit)
_NONFATAL_EXIT_CODES = {0, -9, None}


def _build_propagation_chain(
    correct_steps: List[dict],
    buggy_steps: List[dict],
    first_error_idx: int,
    max_chain: int = 20,
) -> List[Dict[str, Any]]:
    """
    Walk up to `max_chain` steps past `first_error_idx`, collecting positions
    where correct and buggy array_state differ.

    BUG 9 FIX: upper bound is now min(both lengths) so we never go past what
    either trace has.  The original used max(), which could walk into indices
    only present in one trace and produce None/None propagation entries.
    """
    # Cap to the shorter trace length so we never exceed either side
    safe_upper = min(len(correct_steps), len(buggy_steps))
    limit = min(safe_upper, first_error_idx + max_chain)

    chain: List[Dict[str, Any]] = []

    for i in range(first_error_idx, limit):
        c_state = correct_steps[i].get("array_state") if i < len(correct_steps) else None
        b_state = buggy_steps[i].get("array_state")   if i < len(buggy_steps)   else None

        if c_state == b_state:
            continue

        # Prefer the buggy op for clarity (that's where the error lives)
        if i < len(buggy_steps):
            op       = buggy_steps[i].get("op", "")
            step_id  = buggy_steps[i].get("step_id", i)
        elif i < len(correct_steps):
            op       = correct_steps[i].get("op", "")
            step_id  = correct_steps[i].get("step_id", i)
        else:
            op, step_id = "", i

        chain.append({
            "step_id":       step_id,
            "op":            op,
            "correct_state": c_state,
            "buggy_state":   b_state,
        })

    return chain


def run_bug_injection(
    algo: str,
    bug_id: str,
    input_data: List[int],
) -> Dict[str, Any]:
    key = (algo, bug_id)
    if key not in BUG_REGISTRY:
        raise ValueError(
            f"Unknown bug: ({algo!r}, {bug_id!r}). "
            f"Registered: {list(BUG_REGISTRY.keys())}"
        )

    buggy_algo_name = BUG_REGISTRY[key]

    # â”€â”€ Run correct algorithm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    correct_result = bridge.run_trace(algo, input_data[:], "trace")
    if correct_result.exit_code not in _NONFATAL_EXIT_CODES:
        raise RuntimeError(
            f"Correct algorithm '{algo}' crashed: exit={correct_result.exit_code}\n"
            f"stderr: {correct_result.stderr[:300]}"
        )

    # â”€â”€ Run buggy variant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    buggy_result = bridge.run_trace(buggy_algo_name, input_data[:], "trace")

    # BUG 8 FIX: detect a real crash (not just SIGKILL from step budget)
    buggy_crashed = buggy_result.exit_code not in _NONFATAL_EXIT_CODES

    # â”€â”€ Diff â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    diff_result = dna_diff(correct_result.steps, buggy_result.steps)

    first_error_step: Optional[int] = diff_result.get("first_divergence_a")
    first_error_idx  = 0
    if first_error_step is not None:
        idx = find_trace_index(correct_result.steps, first_error_step)
        if idx is not None:
            first_error_idx = idx

    chain = _build_propagation_chain(
        correct_result.steps,
        buggy_result.steps,
        first_error_idx,
    )

    result: Dict[str, Any] = {
        "algo":             algo,
        "bug_id":           bug_id,
        "correct_trace":    correct_result.steps,
        "buggy_trace":      buggy_result.steps,
        "first_error_step": first_error_step,
        "propagation_chain": chain,
        "diff":             diff_result,
    }

    # BUG 8 FIX: surface buggy crash info so the route / frontend can show it
    if buggy_crashed:
        result["buggy_crashed"]   = True
        result["buggy_exit_code"] = buggy_result.exit_code
        result["buggy_stderr"]    = buggy_result.stderr[:300]
    else:
        result["buggy_crashed"] = False

    return result
