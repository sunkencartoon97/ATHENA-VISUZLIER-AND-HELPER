from modules import tracer_bridge

# Small repro for knapsack01
input_data = [10, 20, 30, 60, 100, 120, 50]
res = tracer_bridge.run_trace('knapsack01', input_data, 'trace')
print('exit_code:', res.exit_code)
print('truncated:', res.truncated)
print('stderr (len):', len(res.stderr) if res.stderr else 0)
print('stderr repr:', repr(res.stderr))
print('steps:', len(res.steps))
if res.steps:
    print('first_step:', res.steps[0] if len(res.steps)>0 else None)
    print('last_step_id:', res.steps[-1].get('step_id') if res.steps else None)
