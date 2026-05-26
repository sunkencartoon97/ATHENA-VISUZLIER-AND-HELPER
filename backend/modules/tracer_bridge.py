"""
ATHENA v3.0 â€” Tracer Bridge
Single point of contact between Python and the C++ engine.

FIXES APPLIED
-------------
BUG 3 (Deadlock risk): When reading stdout line-by-line in a for-loop, if
  the C++ process simultaneously writes enough data to fill the OS stderr pipe
  buffer (~64 KB on Linux), the child process blocks waiting for a reader,
  while Python is blocked waiting for the next stdout line â†’ deadlock.

  The engine normally writes very little to stderr ("TRUNCATED:N" or an error
  message), so the buffer rarely fills.  But under memory-limit or CPU-limit
  triggers the engine may dump a larger error string.

  Fix: Read stderr in a background thread via threading.Thread so it is always
  consumed concurrently with stdout, eliminating the deadlock window entirely.

BUG 4 (Minor â€” post-kill stdout drain): After proc.kill() on step-budget
  breach we break out of the stdout for-loop, then call proc.wait().
  On some Linux kernels, if the child's stdout pipe write-end is still open
  (the SIGKILL is delivered asynchronously), proc.wait() can return before
  the pipe is fully closed, causing the subsequent proc.stderr.read() to
  sometimes race.  Draining the remaining stdout before wait() ensures the
  child has truly finished writing.

  Fix: after break, call proc.stdout.read() to drain any residual bytes, then
  call proc.wait().

  Note: this drain is cheap â€” after SIGKILL the remaining bytes are tiny
  and the child terminates almost immediately.
"""

from __future__ import annotations

import os
import platform
import subprocess
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

import orjson

from config import (
    BINARY_DIR,
    CPU_LIMIT_S,
    MEM_LIMIT_MB,
    PROC_TIMEOUT,
    STEP_BUDGET,
)


@dataclass
class TraceResult:
    steps:     List[dict] = field(default_factory=list)
    truncated: bool = False
    stderr:    str = ""
    exit_code: int = 0
    wall_ms:   float = 0.0


def _wsl_path(win_path: str) -> str:
    drive, rest = os.path.splitdrive(win_path)
    letter = drive[0].lower()
    rest = rest.replace("\\", "/")
    return f"/mnt/{letter}{rest}"


def _build_command(binary_path: Path) -> List[str]:
    if platform.system() == "Windows":
        wsl_bin = _wsl_path(str(binary_path))
        # Don't specify -d Ubuntu — use default distro, faster startup
        return ["wsl.exe", wsl_bin]
    return [str(binary_path)]


def _set_resource_limits():
    """Called as preexec_fn on Linux only â€” sets CPU/memory hard limits."""
    if platform.system() != "Windows":
        import resource
        resource.setrlimit(resource.RLIMIT_CPU, (CPU_LIMIT_S, CPU_LIMIT_S))
        mem_bytes = MEM_LIMIT_MB * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))


def _read_stderr_thread(proc: subprocess.Popen, buf: list) -> threading.Thread:
    """
    Start a daemon thread that reads stderr to completion.
    The collected text is stored in buf[0] when done.
    This prevents the stderr OS pipe from filling and deadlocking
    the main thread that is reading stdout.
    """
    def _reader():
        try:
            data = proc.stderr.read()
            buf.append(data.decode("utf-8", errors="replace"))
        except Exception:
            buf.append("")

    t = threading.Thread(target=_reader, daemon=True)
    t.start()
    return t


def run_trace(
    algo: str,
    input_data: List[int],
    mode: str = "trace",
) -> TraceResult:
    binary_path = BINARY_DIR / "athena_engine"

    if platform.system() != "Windows" and not binary_path.exists():
        raise FileNotFoundError(
            f"C++ engine not found at {binary_path}. "
            f"Build with: cd engine/build && cmake .. && make"
        )

    cmd = _build_command(binary_path)

    payload = orjson.dumps({
        "algo":  algo,
        "input": input_data,
        "mode":  mode,
    })

    preexec = _set_resource_limits if platform.system() != "Windows" else None

    t0 = time.perf_counter()

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=preexec,
    )

    # â”€â”€ FIX (Bug 3): drain stderr in a background thread so it never blocks â”€â”€
    stderr_buf: list = []
    stderr_thread = _read_stderr_thread(proc, stderr_buf)

    proc.stdin.write(payload)
    proc.stdin.close()

    steps: List[dict] = []
    truncated = False

    for raw_line in proc.stdout:
        line = raw_line.strip()
        if not line:
            continue
        try:
            step = orjson.loads(line)
            # Synthesize mem field from indices if engine didn't emit one
            # This ensures cache simulation always has data to work with
            if mode == "cache" and step.get("mem") is None:
                indices = step.get("indices", [])
                
                # Heuristic: Extract index for Hash, Graph, DP, String algorithms
                if not indices:
                    if step.get("bucket", -1) >= 0:
                        indices = [step["bucket"]]
                    elif step.get("target_node", -1) >= 0:
                        indices = [step["target_node"]]
                    elif step.get("source_node", -1) >= 0:
                        indices = [step["source_node"]]
                    elif step.get("row", -1) >= 0:
                        indices = [step["row"]]
                    elif step.get("idx1", -1) >= 0:
                        indices = [step["idx1"]]
                    elif "vars" in step and isinstance(step["vars"], dict):
                        for k in ["i", "j", "q", "node", "char_id", "window_start", "match_at"]:
                            val = step["vars"].get(k)
                            if val and str(val).lstrip('-').isdigit():
                                idx_val = int(val)
                                if idx_val >= 0:
                                    indices = [idx_val]
                                    break
                
                # Fallback to prevent cache simulator failure for unmapped algorithms
                if not indices:
                    indices = [0]

                op = step.get("op", "")
                rw = "w" if op in ("swap", "assign", "insert", "fill_cell") else "r"
                
                if indices:
                    step["mem"] = {
                        "step_id": step.get("step_id", len(steps)),
                        "container": "arr",
                        "index": indices[0],
                        "element_size": 4,
                        "rw": rw,
                    }
            steps.append(step)
        except Exception:
            continue

        if len(steps) >= STEP_BUDGET:
            truncated = True
            proc.kill()
            break

    # â”€â”€ FIX (Bug 4): drain remaining stdout before wait so pipe is closed â”€â”€
    try:
        proc.stdout.read()
    except Exception:
        pass

    try:
        proc.wait(timeout=PROC_TIMEOUT)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()
        truncated = True

    t1 = time.perf_counter()
    
    engine_wall_ms = None
    for step in steps:
        if "wall_ms" in step:
            engine_wall_ms = step["wall_ms"]
            
    wall_ms = engine_wall_ms if (mode == "benchmark" and engine_wall_ms is not None) \
              else round((t1 - t0) * 1000.0, 2)

    # Wait for the stderr-reader thread to finish (it finishes as soon as the
    # child exits, so this join is almost instantaneous at this point).
    stderr_thread.join(timeout=2.0)
    stderr_text = stderr_buf[0] if stderr_buf else ""

    if "TRUNCATED:" in stderr_text:
        truncated = True

    # Diagnostic dump for segmentation faults (exit code 139) to aid debugging
    # Writes a compact JSON with context so we can inspect engine crashes offline.
    try:
        if proc.returncode == 139:
            try:
                from pathlib import Path
                import json as _json
                ts = int(time.time() * 1000)
                logs_dir = Path(__file__).resolve().parent.parent / "engine_crash_logs"
                logs_dir.mkdir(parents=True, exist_ok=True)
                fname = logs_dir / f"{algo}_crash_{ts}.json"
                dump = {
                    "algo": algo,
                    "input": input_data,
                    "exit_code": proc.returncode,
                    "stderr": stderr_text,
                    "steps_len": len(steps),
                    "first_steps": steps[:50],
                    "last_steps": steps[-50:],
                    "truncated": truncated,
                }
                with open(fname, "w", encoding="utf-8") as _f:
                    _json.dump(dump, _f, default=str)
            except Exception:
                pass
    except Exception:
        pass

    return TraceResult(
        steps=steps,
        truncated=truncated,
        stderr=stderr_text,
        exit_code=proc.returncode,
        wall_ms=wall_ms,
    )
