import requests
import json

url = 'http://127.0.0.1:8001/run-algorithm'
payload = {"algo": "knapsack01", "input": [10,20,30,60,100,120,50], "mode": "trace"}
try:
    r = requests.post(url, json=payload, timeout=30)
    print('status_code:', r.status_code)
    try:
        print(json.dumps(r.json(), indent=2) if r.headers.get('Content-Type','').startswith('application/json') else r.text)
    except Exception:
        print(r.text)
except Exception as e:
    print('request error:', e)
