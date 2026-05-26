import re
import json
from pathlib import Path

log_path = Path('test_results.log')
registry_path = Path('data') / 'algo_registry.json'

log_text = log_path.read_text(encoding='utf8')
lines = log_text.splitlines()

results = {}
current = None
for line in lines:
    m = re.match(r'^Testing Algorithm:\s*(.+)$', line)
    if m:
        current = m.group(1).strip().lower()
        results[current] = {}
        continue
    if current and '/benchmark' in line:
        # Extract Claimed, Measured, Verdict
        # Example: [PASS] /benchmark | Claimed: O(N log N) | Measured: O(n log n) | Verdict: MATCH
        mm = re.search(r'Claimed:\s*([^|]+)\|\s*Measured:\s*([^|]+)\|\s*Verdict:\s*([A-Z_]+)', line)
        if mm:
            claimed = mm.group(1).strip()
            measured = mm.group(2).strip()
            verdict = mm.group(3).strip()
            results[current]['bench_claimed'] = claimed
            results[current]['measured'] = measured
            results[current]['verdict'] = verdict

# Load registry
registry = {}
if registry_path.exists():
    registry = json.loads(registry_path.read_text(encoding='utf8'))
else:
    print('Registry file not found:', registry_path)

# Combine
summary = {}
for algo, data in results.items():
    reg_claim = None
    if algo in registry:
        reg_claim = registry[algo].get('claimed_complexity')
    else:
        # try capitalized forms
        for k in registry.keys():
            if k.lower() == algo:
                reg_claim = registry[k].get('claimed_complexity')
                break
    summary[algo] = {
        'registry_claimed': reg_claim,
        'bench_claimed': data.get('bench_claimed'),
        'measured': data.get('measured'),
        'verdict': data.get('verdict')
    }

out_path = Path('benchmark_summary.json')
out_path.write_text(json.dumps(summary, indent=2), encoding='utf8')
print('Wrote', out_path)

# Also produce a quick stats
matches = []
mismatches = []
for a, d in summary.items():
    reg = (d.get('registry_claimed') or '').lower() if d.get('registry_claimed') else None
    bench = (d.get('bench_claimed') or '').lower() if d.get('bench_claimed') else None
    verdict = d.get('verdict')
    if reg and bench and reg in bench:
        matches.append(a)
    else:
        mismatches.append({'algo': a, 'registry': d.get('registry_claimed'), 'bench': d.get('bench_claimed'), 'verdict': verdict})

report = {'total': len(summary), 'matches': len(matches), 'mismatches': len(mismatches), 'mismatches_list': mismatches}
rep_path = Path('complexity_comparison.json')
rep_path.write_text(json.dumps(report, indent=2), encoding='utf8')
print('Wrote', rep_path)
