@echo off
chcp 65001 >nul
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo ========================================================
echo   Iniciando Ecossistema Fabrica de Software + Projetos
echo ========================================================

echo [1/6] Iniciando Orquestrador de IA (FastAPI - Porta 8000)...
start "Orquestrador IA (8000)" /D "%ROOT%" cmd /k ""%ROOT%\.venv\Scripts\python.exe" -u -m uvicorn ai_software_factory.main:app_api --host 0.0.0.0 --port 8000"

echo [2/6] Iniciando Portal Fabrica - Backend (Node.js - Porta 5000)...
start "Portal Fabrica Backend (5000)" /D "%ROOT%\workspace\portal_fabrica\backend" cmd /k "npm run dev"

echo [3/6] Iniciando Portal Fabrica - Frontend (Vite - Porta 5173)...
start "Portal Fabrica Frontend (5173)" /D "%ROOT%\workspace\portal_fabrica" cmd /k "npm run dev -- --port 5173"

echo [4/6] Iniciando WhatsApp CRM (Next.js - Porta 3000)...
start "WhatsApp CRM (3000)" /D "%ROOT%\wacrm" cmd /k "npm run dev"

echo [5/6] Iniciando Campeiro Fogo - Frontend (Vite - Porta 5174)...
start "Campeiro Fogo Frontend (5174)" /D "%ROOT%\workspace\campeiro_fogo\frontend" cmd /k "npm run dev -- --port 5174"

echo [6/6] Iniciando 20barranove - Frontend (Vite - Porta 5175)...
start "20barranove Frontend (5175)" /D "%ROOT%\workspace\20barranove\frontend" cmd /k "npm run dev -- --port 5175"

echo.
echo Todos os 6 servicos foram disparados em janelas dedicadas!
echo - Orquestrador IA:         http://localhost:8000
echo - Portal Fabrica Backend:  http://localhost:5000
echo - Portal Fabrica Frontend: http://localhost:5173
echo - WhatsApp CRM:            http://localhost:3000
echo - Campeiro Fogo Frontend:  http://localhost:5174
echo - 20barranove Frontend:    http://localhost:5175
echo.
pause
