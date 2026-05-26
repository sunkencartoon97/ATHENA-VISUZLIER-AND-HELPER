import requests
import time
import json
import os

BASE_URL = "http://127.0.0.1:8001"
LOG_FILE = "test_results.log"

def log(msg):
    print(msg)
    with open(LOG_FILE, "a") as f:
        f.write(msg + "\n")

ALGOS_TO_TEST = [
    {"name": "quicksort", "input": [5, 3, 8, 1, 9, 2], "expected_o": "O(N log N)", "compare_to": "mergesort"},
    {"name": "mergesort", "input": [5, 3, 8, 1, 9, 2], "expected_o": "O(N log N)", "compare_to": "quicksort"},
    {"name": "binarysearch", "input": [1, 2, 3, 5, 8, 9], "expected_o": "O(log N)", "compare_to": "linearsearch"},
    {"name": "linearsearch", "input": [1, 2, 3, 5, 8, 9], "expected_o": "O(N)", "compare_to": "binarysearch"},
    {"name": "bfs", "input": [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0], "expected_o": "O(V + E)", "compare_to": "dfs"},
    {"name": "dfs", "input": [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0], "expected_o": "O(V + E)", "compare_to": "bfs"},
    {"name": "nqueens", "input": [4], "expected_o": "O(N!)", "compare_to": "nqueens"},
    {"name": "fibonacci", "input": [5], "expected_o": "O(2^N)", "compare_to": "fibonaccidp"},
    {"name": "knapsack01", "input": [10, 20, 30, 60, 100, 120, 50], "expected_o": "O(N * W)", "compare_to": "fractionalknapsack"},
    {"name": "chaining", "input": [10, 20, 10, 30, 40], "expected_o": "O(1)", "compare_to": "linearprobing"},
]

# Load local algorithm registry so we only request bugs that actually exist
import json as _json
_REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "algo_registry.json")
try:
    with open(_REGISTRY_PATH, "r", encoding="utf-8") as _f:
        _ALGO_REGISTRY = _json.load(_f)
except Exception:
    _ALGO_REGISTRY = {}

def run_tests():
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)
    
    log(f"--- Starting ATHENA Algorithm Tests at {time.ctime()} ---")

    for algo in ALGOS_TO_TEST:
        name = algo["name"]
        inp = algo["input"]
        expected_o = algo["expected_o"]
        compare_to = algo["compare_to"]

        log(f"\n=========================================")
        log(f"Testing Algorithm: {name.upper()}")
        log(f"=========================================")

        # 1. TRACE
        try:
            res = requests.post(f"{BASE_URL}/run-algorithm", json={"algo": name, "input": inp, "mode": "trace"}, timeout=10)
            if res.status_code == 200:
                data = res.json()
                log(f"[PASS] /run-algorithm (trace) | Step Count: {data.get('step_count')}")
            else:
                log(f"[FAIL] /run-algorithm (trace) | Status: {res.status_code} | {res.text}")
        except Exception as e:
            log(f"[ERROR] /run-algorithm (trace): {e}")

        # 2. CACHE
        try:
            res = requests.post(f"{BASE_URL}/run-algorithm", json={"algo": name, "input": inp, "mode": "cache"}, timeout=10)
            if res.status_code == 200:
                data = res.json()
                cache_len = len(data.get("cache_events", []))
                log(f"[PASS] /run-algorithm (cache) | Cache Events: {cache_len}")
            else:
                log(f"[FAIL] /run-algorithm (cache) | Status: {res.status_code} | {res.text}")
        except Exception as e:
            log(f"[ERROR] /run-algorithm (cache): {e}")

        # 3. BENCHMARK & COMPLEXITY (Empirical)
        try:
            res = requests.post(f"{BASE_URL}/benchmark", json={"algorithm": name, "claimed_complexity": expected_o}, timeout=20)
            if res.status_code == 200:
                data = res.json()
                measured = data.get("measured_complexity", "Unknown")
                lie_detector = data.get("lie_detector", {})
                verdict = lie_detector.get("verdict", "N/A") if lie_detector else "N/A"
                log(f"[PASS] /benchmark | Claimed: {expected_o} | Measured: {measured} | Verdict: {verdict}")
            else:
                log(f"[FAIL] /benchmark | Status: {res.status_code} | {res.text}")
        except Exception as e:
            log(f"[ERROR] /benchmark: {e}")

        # 4. RUN-BUG (only if registry lists bug variants for this algo)
        try:
            algo_entry = _ALGO_REGISTRY.get(name, {})
            bug_variants = algo_entry.get("bug_variants", []) if isinstance(algo_entry, dict) else []
            if not bug_variants:
                log(f"[SKIP] /run-bug | No registered bug variants for {name}")
            else:
                # Prefer 'fence_post' if present, otherwise use the first variant
                chosen_bug = "fence_post" if "fence_post" in bug_variants else bug_variants[0]
                res = requests.post(f"{BASE_URL}/run-bug", json={"algo": name, "bug_id": chosen_bug, "input": inp}, timeout=15)
                if res.status_code == 200:
                    data = res.json()
                    diff = data.get("diff", {})
                    log(f"[PASS] /run-bug | Segments differing: {len(diff.get('segments', []))}")
                else:
                    log(f"[FAIL] /run-bug | Status: {res.status_code} | {res.text}")
        except Exception as e:
            log(f"[ERROR] /run-bug: {e}")

        # 5. WHAT-IF
        try:
            res = requests.post(f"{BASE_URL}/run-whatif", json={"algo": name, "base_input": inp, "modification": "reverse"}, timeout=15)
            if res.status_code == 200:
                data = res.json()
                log(f"[PASS] /run-whatif | Modified Steps: {data.get('modified_step_count')} vs Base: {data.get('base_step_count')}")
            else:
                log(f"[FAIL] /run-whatif | Status: {res.status_code} | {res.text}")
        except Exception as e:
            log(f"[ERROR] /run-whatif: {e}")

        # 6. DIFF
        try:
            res = requests.post(f"{BASE_URL}/run-diff", json={"algo1": name, "algo2": compare_to, "input": inp}, timeout=15)
            if res.status_code == 200:
                data = res.json()
                log(f"[PASS] /run-diff vs {compare_to} | Diff computed successfully")
            else:
                log(f"[FAIL] /run-diff vs {compare_to} | Status: {res.status_code} | {res.text}")
        except Exception as e:
            log(f"[ERROR] /run-diff: {e}")

if __name__ == "__main__":
    run_tests()
