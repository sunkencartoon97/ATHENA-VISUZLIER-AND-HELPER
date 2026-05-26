"""
comparison_models.py
====================
Pydantic v2 request and response models for ATHENA Segment 3 comparison APIs.

FIXES APPLIED
-------------
BUG 10 (Response model gap): RunBugResponse was missing `buggy_crashed`.
  The fixed buginjection.py now sets this key in its return dict so the
  frontend can know when the buggy variant itself crashed (not just diverged).
  Added as Optional[bool] = False so existing callers are unaffected.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, model_validator


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Shared inner models
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class DiffSegment(BaseModel):
    """One contiguous region of the edit script produced by DNA Diff.

    ``kind`` is one of:
    * ``"equal"``   â€” same op in both traces
    * ``"delete"``  â€” op present in trace A but not trace B
    * ``"insert"``  â€” op present in trace B but not trace A
    * ``"replace"`` â€” different ops at the same logical position
    """

    kind:    str
    a_start: Optional[int] = None
    a_end:   Optional[int] = None
    b_start: Optional[int] = None
    b_end:   Optional[int] = None
    op_a:    Optional[str] = None
    op_b:    Optional[str] = None


class DiffResult(BaseModel):
    """Full structured output of a DNA Diff comparison."""

    first_divergence_a: Optional[int] = None
    first_divergence_b: Optional[int] = None
    segments:           List[DiffSegment] = Field(default_factory=list)
    a_compressed_len:   int = 0
    b_compressed_len:   int = 0


class PropagationStep(BaseModel):
    """One entry in the bug-injection propagation chain."""

    step_id:       int
    op:            str
    correct_state: Optional[List[Any]] = None
    buggy_state:   Optional[List[Any]] = None


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# /run-diff
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class RunDiffRequest(BaseModel):
    """POST /run-diff request body.

    Accepts both the architecture naming (``algo_a`` / ``algo_b``) and the
    simplified task-prompt aliases (``algo1`` / ``algo2``).
    """

    algo_a: Optional[str] = None
    algo_b: Optional[str] = None
    algo1:  Optional[str] = None   # alias
    algo2:  Optional[str] = None   # alias
    input:  List[int] = Field(..., min_length=1, max_length=500)

    @model_validator(mode="after")
    def _normalize_algos(self) -> "RunDiffRequest":
        if not self.algo_a and self.algo1:
            self.algo_a = self.algo1
        if not self.algo_b and self.algo2:
            self.algo_b = self.algo2
        if not self.algo_a:
            raise ValueError("'algo_a' (or 'algo1') is required.")
        if not self.algo_b:
            raise ValueError("'algo_b' (or 'algo2') is required.")
        return self

    model_config = {"populate_by_name": True}


class RunDiffResponse(BaseModel):
    """POST /run-diff response body."""

    trace_a:          List[Dict[str, Any]]
    trace_b:          List[Dict[str, Any]]
    diff:             DiffResult
    divergence_index: Optional[int] = None
    differences:      List[DiffSegment] = Field(default_factory=list)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# /run-bug
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class RunBugRequest(BaseModel):
    """POST /run-bug request body."""

    algo:      Optional[str] = None
    algorithm: Optional[str] = None   # alias
    bug_id:    str = "fence_post"
    input:     List[int] = Field(..., min_length=1, max_length=500)

    @model_validator(mode="after")
    def _normalize_algo(self) -> "RunBugRequest":
        if not self.algo and self.algorithm:
            self.algo = self.algorithm
        if not self.algo:
            raise ValueError("'algo' (or 'algorithm') is required.")
        return self

    model_config = {"populate_by_name": True}


class RunBugResponse(BaseModel):
    """POST /run-bug response body.

    BUG 10 FIX: added `buggy_crashed` (Optional[bool] = False).
    When the buggy C++ variant itself crashes (non-zero exit code, not SIGKILL),
    `buggy_crashed` is True and the buggy_trace may be empty or partial.
    """

    algo:               str
    bug_id:             str
    correct_trace:      List[Dict[str, Any]]
    buggy_trace:        List[Dict[str, Any]]
    first_error_step:   Optional[int] = None
    propagation_chain:  List[PropagationStep] = Field(default_factory=list)
    propagation_steps:  List[PropagationStep] = Field(default_factory=list)  # alias
    diff:               DiffResult
    llm_explanation:    str = ""
    buggy_crashed:      Optional[bool] = False   # â†  NEW FIELD


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# /run-whatif
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class ModificationSpec(BaseModel):
    """Structured modification operation for What-If analysis."""
    type: str  # "replace", "append", "prepend", "remove"
    index: Optional[int] = None
    value: Optional[int] = None

class RunWhatIfRequest(BaseModel):
    """POST /run-whatif request body.

    Two calling conventions:
        { "algo": "quicksort", "base_input": [...], "modified_input": [...] }
        { "algorithm": "quicksort", "input": [...], "modification": "reverse" }
    """

    algo:           Optional[str] = None
    algorithm:      Optional[str] = None   # alias
    base_input:     Optional[List[int]] = Field(default=None, max_length=500)
    input:          Optional[List[int]] = Field(default=None, max_length=500)   # alias
    modified_input: Optional[List[int]] = Field(default=None, max_length=500)
    modification:   Optional[Union[str, ModificationSpec]] = None

    @model_validator(mode="after")
    def _normalize_fields(self) -> "RunWhatIfRequest":
        if not self.algo and self.algorithm:
            self.algo = self.algorithm
        if not self.algo:
            raise ValueError("'algo' (or 'algorithm') is required.")

        if not self.base_input and self.input:
            self.base_input = self.input
        if not self.base_input:
            raise ValueError("'base_input' (or 'input') is required.")

        if self.modified_input is None and self.modification is None:
            raise ValueError(
                "Either 'modified_input' or 'modification' must be provided. "
                "Supported modification strings: 'reverse', 'sorted', 'sorted_desc'."
            )
        return self

    model_config = {"populate_by_name": True}


class RunWhatIfResponse(BaseModel):
    """POST /run-whatif response body."""

    algo:                str
    base_step_count:     int
    modified_step_count: int
    new_trace:           List[Dict[str, Any]]
    diff:                DiffResult
    llm_explanation:     str = ""
