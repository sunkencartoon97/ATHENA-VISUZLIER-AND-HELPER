import requests
r = requests.post('http://127.0.0.1:8001/run-bug', json={'algo':'mergesort','bug_id':'fence_post','input':[5,3,8,1,9,2]})
print(r.status_code)
print(r.text)
