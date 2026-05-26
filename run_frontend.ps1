#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
Write-Host "Starting frontend dev server (Next.js)."
Push-Location -Path "$PSScriptRoot\frontend"
try {
    if (-not (Test-Path node_modules)) {
        Write-Host "Installing npm dependencies..."
        npm install
    }
    Write-Host "Running: npm run dev"
    npm run dev
} finally {
    Pop-Location
}
