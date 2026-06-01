# Friend Setup Requirements

This project can be copied to another Windows PC, but the copied `.venv` should not be reused. Recreate the Python environment on the new machine.

## What your friend needs

- VS Code
- Python 3.11 or newer
- Node.js 18 or newer
- WSL on Windows if the C++ engine is used as-is on Windows

## What can be skipped if already installed

- Python setup steps if `python` or `py` already works
- Node.js setup steps if `node` and `npm` already work
- WSL setup if the machine already has WSL and an Ubuntu distro available

## Recommended project location

- `C:\project\UMANG\athena`

The project works best if the copied folder keeps the same root path. If the path must change, run `tools\transfer_project_paths.ps1` to rewrite saved absolute paths in text files.

## Important note about `.venv`

- Do not copy the existing `.venv` from another machine.
- Create a fresh `.venv` on the new PC so Python points to the local installation.

## Setup commands

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd frontend
npm install
```

## Start commands

```powershell
# from repo root
.\run_backend.ps1
```

```powershell
# from repo root
.\run_frontend.ps1
```

## If the root path changes

Run this from the copied project root:

```powershell
.\tools\transfer_project_paths.ps1 -OldRoot 'C:\project\UMANG\athena' -NewRoot $PWD.Path
```

## Backend and frontend dependencies

- Python backend packages are listed in [requirements.txt](requirements.txt)
- Frontend packages are installed from [frontend/package.json](frontend/package.json)
