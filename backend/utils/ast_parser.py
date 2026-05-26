"""
ATHENA v3.0 â€” Segment 2: AST / Code Structure Parser
Analyses source code (C++ or Python) to extract:
  - Maximum loop nesting depth
  - Recursion presence and type (linear vs divide-and-conquer)

Python uses the stdlib `ast` module.
C++ uses robust regex-based structural scanning (no external dep required).
"""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from typing import Dict, List, Set


# ---------------------------------------------------------------------------
# Shared result dataclass
# ---------------------------------------------------------------------------

@dataclass
class ParseResult:
    language: str
    max_loop_depth: int
    loop_count: int
    nested_loop_pairs: int       # number of (loop, inner-loop) pairs
    has_recursion: bool
    has_divide_conquer: bool     # True when any function calls itself â‰¥ 2 times
    recursive_calls: List[str]   # names of self-calling functions
    function_names: List[str]    # all defined function names


# ===========================================================================
# PYTHON â€” stdlib ast
# ===========================================================================

class _LoopDepthVisitor(ast.NodeVisitor):
    """Walk the AST and track the maximum loop nesting depth."""

    def __init__(self) -> None:
        self.max_depth: int = 0
        self.loop_count: int = 0
        self.nested_pairs: int = 0
        self._depth: int = 0

    def _enter_loop(self, node: ast.AST) -> None:
        self.loop_count += 1
        self._depth += 1
        if self._depth > self.max_depth:
            self.max_depth = self._depth
        if self._depth >= 2:
            self.nested_pairs += 1
        self.generic_visit(node)
        self._depth -= 1

    visit_For = _enter_loop      # type: ignore[assignment]
    visit_While = _enter_loop    # type: ignore[assignment]


class _RecursionVisitor(ast.NodeVisitor):
    """Detect calls from a function to itself (direct recursion)."""

    def __init__(self) -> None:
        self._current_func: str = ""
        # Maps func_name â†’ count of self-calls found inside it
        self.self_call_counts: Dict[str, int] = {}

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        prev = self._current_func
        self._current_func = node.name
        if node.name not in self.self_call_counts:
            self.self_call_counts[node.name] = 0
        self.generic_visit(node)
        self._current_func = prev

    visit_AsyncFunctionDef = visit_FunctionDef  # type: ignore[assignment]

    def visit_Call(self, node: ast.Call) -> None:
        if not self._current_func:
            self.generic_visit(node)
            return
        called: str | None = None
        if isinstance(node.func, ast.Name):
            called = node.func.id
        elif isinstance(node.func, ast.Attribute):
            called = node.func.attr
        if called and called == self._current_func:
            self.self_call_counts[called] = self.self_call_counts.get(called, 0) + 1
        self.generic_visit(node)


def parse_python(code: str) -> ParseResult:
    """Return a ParseResult for a Python code snippet."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        # Treat unparse-able snippets as structurally empty
        return ParseResult(
            language="python",
            max_loop_depth=0,
            loop_count=0,
            nested_loop_pairs=0,
            has_recursion=False,
            has_divide_conquer=False,
            recursive_calls=[],
            function_names=[],
        )

    function_names: List[str] = [
        node.name
        for node in ast.walk(tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]

    loop_v = _LoopDepthVisitor()
    loop_v.visit(tree)

    rec_v = _RecursionVisitor()
    rec_v.visit(tree)

    recursive_funcs = [
        name for name, cnt in rec_v.self_call_counts.items() if cnt > 0
    ]
    has_divide_conquer = any(
        cnt >= 2 for cnt in rec_v.self_call_counts.values()
    )

    return ParseResult(
        language="python",
        max_loop_depth=loop_v.max_depth,
        loop_count=loop_v.loop_count,
        nested_loop_pairs=loop_v.nested_pairs,
        has_recursion=len(recursive_funcs) > 0,
        has_divide_conquer=has_divide_conquer,
        recursive_calls=recursive_funcs,
        function_names=function_names,
    )


# ===========================================================================
# C++ â€” Regex / token-scan based
# ===========================================================================

# Strips // and /* */ comments
_RE_LINE_COMMENT = re.compile(r"//[^\n]*")
_RE_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)

# Conservative function-definition pattern: captures the function name
# Matches patterns like: `void mergeSort(int* arr, int n) {`
_RE_FUNC_DEF = re.compile(
    r"""
    (?:^|[\s;}\)])                   # start boundary
    (?:[\w:<>*&\s]+?\s)              # return type (lazy)
    (\w+)                            # â† function name
    \s*\([^)]*\)                     # parameter list
    \s*(?:const\s*)?                 # optional const
    (?:noexcept\s*)?                 # optional noexcept
    \{                               # opening brace
    """,
    re.VERBOSE | re.MULTILINE,
)

# Anything that looks like a call:  identifier(
_RE_CALL = re.compile(r"\b(\w+)\s*\(")

# C++ keywords that should never be treated as function names
_CPP_KEYWORDS: Set[str] = {
    "if", "else", "while", "for", "do", "switch", "case", "return",
    "break", "continue", "class", "struct", "enum", "namespace",
    "template", "void", "int", "long", "short", "float", "double",
    "bool", "char", "auto", "const", "static", "inline", "virtual",
    "override", "explicit", "operator", "new", "delete", "try",
    "catch", "throw", "using", "typedef", "typename", "sizeof",
    "alignof", "decltype", "constexpr", "mutable", "volatile",
    "public", "private", "protected", "friend", "extern", "register",
}


def _strip_cpp_comments(code: str) -> str:
    code = _RE_LINE_COMMENT.sub("", code)
    code = _RE_BLOCK_COMMENT.sub("", code)
    return code


def _cpp_function_names(code: str) -> List[str]:
    matches = _RE_FUNC_DEF.findall(code)
    return [m for m in matches if m not in _CPP_KEYWORDS]


def _cpp_loop_stats(code: str) -> tuple[int, int, int]:
    """
    Scan C++ tokens for loop keywords and brace structure.
    Returns (max_depth, loop_count, nested_pairs).

    Strategy: emit a token stream of {for|while|do} and {|} characters,
    then simulate depth transitions.
    """
    tokens = re.findall(r"\b(for|while|do)\b|([{}])", code)

    max_depth = 0
    current_depth = 0
    loop_count = 0
    nested_pairs = 0
    brace_depth = 0
    # Stack: brace_depth at which each active loop started
    loop_brace_depths: List[int] = []

    for kw, brace in tokens:
        if kw:  # loop keyword
            loop_count += 1
            loop_brace_depths.append(brace_depth)
            current_depth += 1
            if current_depth > max_depth:
                max_depth = current_depth
            if current_depth >= 2:
                nested_pairs += 1
        elif brace == "{":
            brace_depth += 1
        elif brace == "}":
            brace_depth -= 1
            # Any loop that opened at or after the closing brace depth has ended
            while loop_brace_depths and loop_brace_depths[-1] >= brace_depth:
                loop_brace_depths.pop()
                current_depth -= 1

    return max_depth, loop_count, nested_pairs


def _cpp_recursion(code: str, function_names: List[str]) -> tuple[List[str], bool]:
    """
    For each known function, count how many times it appears as a called name
    in the source (minus 1 for the definition itself).
    Returns (recursive_funcs, has_divide_conquer).
    """
    all_calls = _RE_CALL.findall(code)
    call_counts: Dict[str, int] = {}
    for c in all_calls:
        call_counts[c] = call_counts.get(c, 0) + 1

    recursive_funcs: List[str] = []
    has_divide_conquer = False

    for name in function_names:
        total = call_counts.get(name, 0)
        # Subtract 1 for the function's own definition line
        self_call_count = max(0, total - 1)
        if self_call_count > 0:
            recursive_funcs.append(name)
            if self_call_count >= 2:
                has_divide_conquer = True

    return recursive_funcs, has_divide_conquer


def parse_cpp(code: str) -> ParseResult:
    """Return a ParseResult for a C++ code snippet."""
    clean = _strip_cpp_comments(code)
    function_names = _cpp_function_names(clean)
    max_depth, loop_count, nested_pairs = _cpp_loop_stats(clean)
    recursive_funcs, has_dc = _cpp_recursion(clean, function_names)

    return ParseResult(
        language="cpp",
        max_loop_depth=max_depth,
        loop_count=loop_count,
        nested_loop_pairs=nested_pairs,
        has_recursion=len(recursive_funcs) > 0,
        has_divide_conquer=has_dc,
        recursive_calls=recursive_funcs,
        function_names=function_names,
    )


# ===========================================================================
# Dispatcher
# ===========================================================================

def parse_code(code: str, language: str = "cpp") -> ParseResult:
    """
    Parse code in the given language and return structural features.

    Parameters
    ----------
    code     : source code string
    language : 'cpp', 'c', 'c++', 'python', or 'py'
    """
    lang = language.lower().strip()
    if lang in ("python", "py"):
        return parse_python(code)
    elif lang in ("cpp", "c++", "c"):
        return parse_cpp(code)
    else:
        # Unknown language: attempt Python, fall back to C++ heuristics
        try:
            result = parse_python(code)
            if result.function_names or result.loop_count > 0:
                return result
        except Exception:
            pass
        return parse_cpp(code)
