import importlib, json, sys

try:
    a = importlib.import_module('app')
    paths = [r.path for r in a.app.routes]
    print(json.dumps(paths, indent=2))
except Exception as e:
    print('ERROR', e)
    raise
sys.exit(0)
