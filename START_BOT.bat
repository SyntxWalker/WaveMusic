@echo off
title WaveMusic Bot (Running)
color 0b
cd /d "%~dp0"
cls
echo ======================================================================
echo                      W A V E M U S I C   B O T
echo           High-Fidelity Discord Music Engine (48kHz Opus)
echo ======================================================================
echo.
echo [1/2] Checking for existing instances...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*src/index.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo [2/2] Starting WaveMusic on Localhost...
echo.
echo ----------------------------------------------------------------------
echo  Dashboard : http://localhost:3000
echo  To Stop   : Simply close this window OR double-click STOP_BOT.bat
echo ----------------------------------------------------------------------
echo.

node --max-http-header-size=65536 src/index.js

echo.
echo ======================================================================
echo WaveMusic stopped.
echo ======================================================================
pause
