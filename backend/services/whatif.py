"""
whatif.py
=========
What-If Engine for ATHENA Segment 3.

Runs the same algorithm on two inputs â€” a base and a modified variant â€” and
diffs the resulting traces to expose behavioural differences.

Critical rule (from architecture Â§8.3)
---------------------------------------
* BOTH traces must be fully executed *before* any LLM contact.
* The algorithm is always re-run from scratch on the modified input.
* No mid-state mutation is ever performed â€” each call to ``run_trace`` is
  completely independent.

Supported named modifications
------------------------------
``"reverse"``      : Reverse the base input list.
``"sorted"``       : Sort the base input in ascending order.
``"sorted_desc"``  : Sort the base input in descending order.
``"custom"``       : Caller provides ``modified_input`` directly (pass-through).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from modules.tracer_bridge import run_trace
import services.dnadiff as dnadiff

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Named modification registry
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

_NAMED_MODIFICATIONS = frozenset({"reverse", "sorted", "sorted_desc", "custom"})


def _apply_modification(base_input: List[int], modification: str) -> List[int]:
    """Transform ``base_input`` according to the named modification.

    Returns a *new* list â€” the original is never mutated.

    Parameters
    ----------
    base_input    : The original input array.
    modification  : One of the supported modification names.

    Returns
    -------
    List[int]  â€”  the transformed array.

    Raises
    ------
    ValueError
        If ``modification`` is not a recognised name.

    Edge cases
    ----------
    * Empty input           â†’ each modification returns ``[]``.
    * Single-element input  â†’ reverse / sort are no-ops.
    * Already sorted input  â†’ ``"sorted"`` is a no-op (still re-runs the algo).
    * ``"custom"``          â†’ caller must supply ``modified_input`` separately;
                              this function returns the base unchanged.
    """
    if modification == "reverse":
        return list(reversed(base_input))
    if modification == "sorted":
        return sorted(base_input)
    if modification == "sorted_desc":
        return sorted(base_input, reverse=True)
    if modification == "custom":
        # Caller is responsible for supplying the modified_input array.
        return list(base_input)
    raise ValueError(
        f"Unknown modification '{modification}'. "
        f"Supported values: {sorted(_NAMED_MODIFICATIONS)}"
    )

def _apply_modification_spec(base_input: List[int], spec: Any) -> List[int]:
    """Transform `base_input` according to the structured modification spec.

    Supported operations: 'replace', 'append', 'prepend', 'remove'.
    Invalid indices are ignored or result in ValueError to be safe.
    """
    result = list(base_input)
    # The spec is usually a Pydantic object, but we access attributes safely.
    # Note: `spec` will be of type ModificationSpec.
    op_type = getattr(spec, "type", None)
    index = getattr(spec, "index", None)
    value = getattr(spec, "value", None)

    if op_type == "replace":
        if index is not None and 0 <= index < len(result) and value is not None:
            result[index] = value
        else:
            raise ValueError(f"Invalid index {index} or missing value for replace.")
    elif op_type == "append":
        if value is not None:
            result.append(value)
        else:
            raise ValueError("Missing value for append.")
    elif op_type == "prepend":
        if value is not None:
            result.insert(0, value)
        else:
            raise ValueError("Missing value for prepend.")
    elif op_type == "remove":
        if index is not None and 0 <= index < len(result):
            result.pop(index)
        else:
            raise ValueError(f"Invalid index {index} for remove.")
    else:
        raise ValueError(f"Unknown structured modification type: {op_type}")
    return result

# ——————————————————————————————————————————————————————————————————————————————
# Public API
# ——————————————————————————————————————————————————————————————————————————————

def run_whatif(
    algo: str,
    base_input: List[int],
    modified_input: Optional[List[int]] = None,
    modification: Optional[Any] = None,
) -> Dict[str, Any]:
    """Run ``algo`` on ``base_input`` and a modified input; diff the traces.

    The caller must supply *either* a pre-built ``modified_input`` list *or* a
    named ``modification`` string (but not both).  When both are supplied,
    ``modified_input`` takes precedence.

    Parameters
    ----------
    algo            : Algorithm name (e.g. ``"quicksort"``, ``"mergesort"``).
    base_input      : The reference input array.
    modified_input  : Explicit modified input.  Mutually exclusive with
                      ``modification`` (``modified_input`` wins if both given).
    modification    : Named transformation applied to ``base_input``.
                      One of ``"reverse"``, ``"sorted"``, ``"sorted_desc"``.

    Returns
    -------
    dict  â€”  WhatIfResult schema::

        {
            "algo":               str,
            "base_step_count":    int,
            "modified_step_count": int,
            "new_trace":          list[TraceStep],   â† modified trace steps
            "diff":               DiffResult,
            "llm_explanation":    "",
        }

    Raises
    ------
    ValueError
        If neither ``modified_input`` nor ``modification`` is supplied, or if
        ``modification`` is not a recognised name.
    RuntimeError
        If the C++ engine returns a non-zero exit code for either trace.

    Edge cases
    ----------
    * Same effective input (e.g. ``modification="sorted"`` on already-sorted
      data): both traces run independently; diff will show all-equal segments.
    * Empty ``base_input``: handled â€” the C++ engine receives an empty array.
    * ``modified_input`` equals ``base_input``: traces may still differ if the
      algorithm is non-deterministic, but for deterministic algorithms the diff
      will be all-equal.
    * Very large inputs (â‰¤ 500 elements enforced by the API layer):
      RLE compression keeps the diff fast.
    """
    # â”€â”€ Resolve effective modified input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if modified_input is not None:
        # Explicit modified_input takes precedence over modification string
        effective_modified: List[int] = list(modified_input)
    elif modification is not None:
        if isinstance(modification, str):
            if modification not in _NAMED_MODIFICATIONS:
                raise ValueError(
                    f"Unknown modification '{modification}'. "
                    f"Supported values: {sorted(_NAMED_MODIFICATIONS)}"
                )
            if modification == "custom":
                raise ValueError(
                    "modification='custom' requires an explicit 'modified_input' list."
                )
            effective_modified = _apply_modification(base_input, modification)
        else:
            # Structured modification (ModificationSpec)
            effective_modified = _apply_modification_spec(base_input, modification)
    else:
        raise ValueError(
            "Either 'modified_input' or 'modification' must be provided. "
            "Supported modification strings: 'reverse', 'sorted', 'sorted_desc'."
        )

    # â”€â”€ Execute base trace â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    base_result = run_trace(algo, base_input, "trace")
    if base_result.exit_code not in {0, -9, None}:
        raise RuntimeError(
            f"Algorithm '{algo}' failed on base_input (exit code "
            f"{base_result.exit_code}). Stderr: {base_result.stderr!r}"
        )

    # â”€â”€ Execute modified trace â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    modified_result = run_trace(algo, effective_modified, "trace")
    if modified_result.exit_code not in {0, -9, None}:
        raise RuntimeError(
            f"Algorithm '{algo}' failed on modified_input (exit code "
            f"{modified_result.exit_code}). Stderr: {modified_result.stderr!r}"
        )

    base_steps: List[dict] = base_result.steps
    modified_steps: List[dict] = modified_result.steps

    # â”€â”€ DNA Diff â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    diff_result: Dict[str, Any] = dnadiff.diff(base_steps, modified_steps)

    return {
        "algo": algo,
        "base_step_count": len(base_steps),
        "modified_step_count": len(modified_steps),
        "new_trace": modified_steps,
        "diff": diff_result,
        "llm_explanation": "",  # filled by Segment 4 SSE endpoint
    }
