"""
lcs.py
======
True Longest Common Subsequence (LCS) over CompressedSymbol sequences.

Uses the classic O(m Ã— n) dynamic-programming algorithm with a full table so
that backtracking is exact.  Greedy and approximate methods are explicitly
avoided â€” the architecture requires correctness over speed, and RLE
compression already reduces trace lengths to â‰ˆ 600 symbols, so the quadratic
DP is fast in practice.

Two symbols are considered equal when their ``op`` strings match.  Count /
run-length differences within the same op are intentionally ignored at the LCS
level; they are visible in the downstream diff segments as-is.
"""

from __future__ import annotations

from typing import List, Tuple

from utils.trace_compression import CompressedSymbol

# (kind, a_index, b_index)
# * "equal"  â†’ a[a_index] matches b[b_index]
# * "delete" â†’ a[a_index] has no partner in b  (b_index == -1)
# * "insert" â†’ b[b_index] has no partner in a  (a_index == -1)
EditOp = Tuple[str, int, int]


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Internal helpers
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _match(sym_a: CompressedSymbol, sym_b: CompressedSymbol) -> bool:
    """Return True iff both symbols represent the same operation."""
    return sym_a.op == sym_b.op


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Public API
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def lcs_table(
    a: List[CompressedSymbol],
    b: List[CompressedSymbol],
) -> List[List[int]]:
    """Build the full LCS dynamic-programming table.

    ``dp[i][j]`` is the length of the LCS of ``a[:i]`` and ``b[:j]``.
    Row 0 and column 0 are the base case (empty prefix â†’ length 0).

    Time complexity:  O(m Ã— n)
    Space complexity: O(m Ã— n)  â€” full table is required for exact backtracking

    Parameters
    ----------
    a, b:
        Compressed symbol sequences to compare.

    Returns
    -------
    List[List[int]]
        DP table of shape ``(len(a)+1) Ã— (len(b)+1)``.

    Edge cases
    ----------
    * Either sequence empty  â†’ table filled with zeros (LCS = 0).
    * Identical sequences    â†’ diagonal is 1, 2, â€¦, len(a).
    * Completely disjoint    â†’ table filled with zeros.
    """
    m = len(a)
    n = len(b)

    # Allocate the full table up front (avoids repeated append overhead)
    dp: List[List[int]] = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        row_prev = dp[i - 1]
        row_curr = dp[i]
        sym_a = a[i - 1]
        for j in range(1, n + 1):
            if _match(sym_a, b[j - 1]):
                row_curr[j] = row_prev[j - 1] + 1
            else:
                left = row_curr[j - 1]
                up = row_prev[j]
                row_curr[j] = left if left > up else up

    return dp


def backtrack_edit_ops(
    dp: List[List[int]],
    a: List[CompressedSymbol],
    b: List[CompressedSymbol],
) -> List[EditOp]:
    """Backtrack the LCS DP table to produce a minimal edit script.

    The backtrack follows the standard LCS path:

    1. If ``a[i-1]`` matches ``b[j-1]``, emit ``"equal"`` and move diagonally.
    2. Else if moving left (in *b*) is at least as good, emit ``"insert"``.
    3. Otherwise emit ``"delete"`` and move up (in *a*).

    This tie-breaking (prefer insert over delete when equal) produces stable
    diffs consistent with Myers' diff convention.

    Parameters
    ----------
    dp : DP table from :func:`lcs_table`.
    a, b : The same symbol sequences passed to :func:`lcs_table`.

    Returns
    -------
    List[EditOp]
        Edit operations in *forward* order (index 0 = start of sequences).

    Edge cases
    ----------
    * Empty a, non-empty b â†’ all "insert" ops.
    * Non-empty a, empty b â†’ all "delete" ops.
    * Both empty           â†’ empty list.
    * Identical sequences  â†’ all "equal" ops.
    """
    ops: List[EditOp] = []
    i = len(a)
    j = len(b)

    while i > 0 or j > 0:
        if i > 0 and j > 0 and _match(a[i - 1], b[j - 1]):
            ops.append(("equal", i - 1, j - 1))
            i -= 1
            j -= 1
        elif j > 0 and (i == 0 or dp[i][j - 1] > dp[i - 1][j]):
            # Move left in b (insert from b) only when strictly better;
            # on ties, fall through to delete (move up in a) so that
            # earlier symbols in a are matched with earlier symbols in b
            # â€” this gives "front-anchored" diffs and correct shared-prefix
            # detection.
            ops.append(("insert", -1, j - 1))
            j -= 1
        else:
            ops.append(("delete", i - 1, -1))
            i -= 1

    # Reverse to get forward order
    ops.reverse()
    return ops
