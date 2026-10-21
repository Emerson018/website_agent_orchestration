$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Iniciando Ecossistema Fábrica de Software + Campeiro Fogo" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "[1/5] Iniciando Orquestrador de IA (FastAPI - Porta 8000)..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory "$root" -ArgumentList "-NoExit", "-Command", "& '$root\.venv\Scripts\python.exe' -u -m uvicorn ai_software_factory.main:app_api --host 0.0.0.0 --port 8000"

Write-Host "[2/5] Iniciando Portal Fábrica - Backend (Node.js - Porta 5000)..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory "$root\workspace\portal_fabrica\backend" -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "[3/5] Iniciando Portal Fábrica - Frontend (Vite - Porta 5173)..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory "$root\workspace\portal_fabrica" -ArgumentList "-NoExit", "-Command", "npm run dev -- --port 5173"

Write-Host "[4/5] Iniciando WhatsApp CRM (Next.js - Porta 3000)..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory "$root\wacrm" -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "[5/5] Iniciando Campeiro Fogo - Frontend (Vite - Porta 5174)..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory "$root\workspace\campeiro_fogo\frontend" -ArgumentList "-NoExit", "-Command", "npm run dev -- --port 5174"

Write-Host "`nTodos os 5 serviços foram iniciados!" -ForegroundColor Green
Write-Host "- Orquestrador IA:         http://localhost:8000"
Write-Host "- Portal Fábrica Backend:  http://localhost:5000"
Write-Host "- Portal Fábrica Frontend: http://localhost:5173"
Write-Host "- WhatsApp CRM:            http://localhost:3000"
Write-Host "- Campeiro Fogo Frontend:  http://localhost:5174"
