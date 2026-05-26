import requests
r = requests.post('http://127.0.0.1:8001/run-whatif', json={'algo':'knapsack01','base_input':[10,20,30,60,100,120,50], 'modification':'reverse'})
print(r.status_code)
print(r.text)
