#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
Write-Host "Starting backend (must be run from project root)."
Push-Location -Path "$PSScriptRoot\backend"
try {
    Write-Host "Running: py -3 -m uvicorn app:app --port 8001"
    py -3 -m uvicorn app:app --port 8001
} finally {
    Pop-Location
}
