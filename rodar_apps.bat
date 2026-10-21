@echo off
chcp 65001 >nul
echo ========================================================
echo   Iniciando Ecossistema Fabrica de Software + Campeiro Fogo
echo ========================================================

echo [1/5] Iniciando Orquestrador de IA (FastAPI - Porta 8000)...
start "Orquestrador IA (8000)" /D "d:\full_stack" "d:\full_stack\.venv\Scripts\python.exe" -u -m uvicorn ai_software_factory.main:app_api --host 0.0.0.0 --port 8000

echo [2/5] Iniciando Portal Fabrica - Backend (Node.js - Porta 5000)...
start "Portal Fabrica Backend (5000)" /D "d:\full_stack\workspace\portal_fabrica\backend" cmd /k "npm run dev"

echo [3/5] Iniciando Portal Fabrica - Frontend (Vite - Porta 5173)...
start "Portal Fabrica Frontend (5173)" /D "d:\full_stack\workspace\portal_fabrica" cmd /k "npm run dev -- --port 5173"

echo [4/5] Iniciando WhatsApp CRM (Next.js - Porta 3000)...
start "WhatsApp CRM (3000)" /D "d:\full_stack\wacrm" cmd /k "npm run dev"

echo [5/5] Iniciando Campeiro Fogo - Frontend (Vite - Porta 5174)...
start "Campeiro Fogo Frontend (5174)" /D "d:\full_stack\workspace\campeiro_fogo\frontend" cmd /k "npm run dev -- --port 5174"

echo.
echo Todos os 5 servicos foram disparados em janelas dedicadas!
echo - Orquestrador IA:         http://localhost:8000
echo - Portal Fabrica Backend:  http://localhost:5000
echo - Portal Fabrica Frontend: http://localhost:5173
echo - WhatsApp CRM:            http://localhost:3000
echo - Campeiro Fogo Frontend:  http://localhost:5174
pause
