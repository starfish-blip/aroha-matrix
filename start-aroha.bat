@echo off
title Aroha Matrix Master Controller
cd /d C:\Users\terry\aroha-matrix

echo [1/2] Launching TaskFlow Static Server (Port 5000)...
start "TaskFlow Frontend" cmd /k "npx http-server -p 5000"

echo [2/2] Launching Hermes Backend Engine (Port 8080)...
start "Hermes Backend" cmd /k "node src/engine/hermes.js"

echo ========================================================
echo Aroha Matrix fully operational. Access portal at:
echo http://localhost:5000/taskflow/index.html
echo ========================================================

