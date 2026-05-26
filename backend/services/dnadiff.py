"""
ATHENA v3.0 â€” Segment 3: DNA Diff Engine
Compares two algorithm traces using RLE compression + LCS.

FIXES APPLIED
-------------
BUG 1 (Critical): _group_into_segments â€” insertâ†’delete transition was broken.
  When current_kind == "insert" and the next edit op is a "delete", the code
  was NOT promoting the kind to "replace". It silently appended to buf_a and
  left current_kind as "insert". This produced DiffSegments with kind="insert"
  that had BOTH a_start/a_end (from buf_a) AND b_start/b_end (from buf_b)
  populated â€” contradicting the "insert" semantic (no A content).

  Real-world trigger: LCS backtrack can produce interleaved inserts and deletes
  in a disagreement region when dp[i][j-1] and dp[i-1][j] are not tied.
  Example edit_ops sequence: [equal, insert, delete, equal] â€” before the fix,
  the "delete" following an "insert" would corrupt the segment.

  Fix: added `elif current_kind == "insert": current_kind = "replace"` in the
  "delete" branch, mirroring the existing deleteâ†’insertâ†’replace logic.

BUG 2 (Minor): Dead variables op_a / op_b declared in outer scope of
  _group_into_segments but never read or correctly maintained.  flush() uses
  a[buf_a[0]].op and b[buf_b[0]].op directly.  Removed the dead declarations
  and the nonlocal listing of these names to prevent future confusion.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from utils.trace_compression import compress, CompressedSymbol
from utils.lcs import lcs_table, backtrack_edit_ops, EditOp


def _first_divergence(
    segments: List[Dict[str, Any]],
) -> Tuple[Optional[int], Optional[int]]:
    for seg in segments:
        if seg["kind"] != "equal":
            return seg.get("a_start"), seg.get("b_start")
    return None, None


def _group_into_segments(
    edit_ops: List[EditOp],
    a: List[CompressedSymbol],
    b: List[CompressedSymbol],
) -> List[Dict[str, Any]]:
    if not edit_ops:
        return []

    segments: List[Dict[str, Any]] = []
    current_kind: Optional[str] = None
    buf_a: List[int] = []
    buf_b: List[int] = []

    def flush():
        nonlocal current_kind, buf_a, buf_b
        if current_kind is None:
            return

        seg: Dict[str, Any] = {"kind": current_kind}

        if buf_a:
            seg["a_start"] = a[buf_a[0]].start_step_id
            seg["a_end"]   = a[buf_a[-1]].end_step_id
            seg["op_a"]    = a[buf_a[0]].op
        else:
            seg["a_start"] = None
            seg["a_end"]   = None
            seg["op_a"]    = None

        if buf_b:
            seg["b_start"] = b[buf_b[0]].start_step_id
            seg["b_end"]   = b[buf_b[-1]].end_step_id
            seg["op_b"]    = b[buf_b[0]].op
        else:
            seg["b_start"] = None
            seg["b_end"]   = None
            seg["op_b"]    = None

        segments.append(seg)
        current_kind = None
        buf_a.clear()
        buf_b.clear()

    for kind, ai, bi in edit_ops:

        if kind == "equal":
            if current_kind is not None and current_kind != "equal":
                flush()
            current_kind = "equal"
            buf_a.append(ai)
            buf_b.append(bi)

        elif kind == "delete":
            if current_kind == "equal":
                flush()
            # â”€â”€ FIX (Bug 1): promote insertâ†’replace when a delete follows â”€â”€â”€â”€
            if current_kind is None:
                current_kind = "delete"
            elif current_kind == "insert":
                current_kind = "replace"
            # current_kind already "delete" or "replace" â†’ no change needed
            buf_a.append(ai)

        elif kind == "insert":
            if current_kind == "equal":
                flush()
            if current_kind == "delete":
                current_kind = "replace"
            elif current_kind is None:
                current_kind = "insert"
            # current_kind already "insert" or "replace" â†’ no change needed
            buf_b.append(bi)

    flush()
    return segments


def find_trace_index(steps: List[dict], target_step_id: int) -> Optional[int]:
    for i, s in enumerate(steps):
        if s.get("step_id") == target_step_id:
            return i
    return None


def diff(trace_a: List[dict], trace_b: List[dict]) -> Dict[str, Any]:
    comp_a = compress(trace_a)
    comp_b = compress(trace_b)

    dp   = lcs_table(comp_a, comp_b)
    ops  = backtrack_edit_ops(dp, comp_a, comp_b)
    segs = _group_into_segments(ops, comp_a, comp_b)
    div_a, div_b = _first_divergence(segs)

    return {
        "first_divergence_a": div_a,
        "first_divergence_b": div_b,
        "segments":           segs,
        "a_compressed_len":   len(comp_a),
        "b_compressed_len":   len(comp_b),
    }
