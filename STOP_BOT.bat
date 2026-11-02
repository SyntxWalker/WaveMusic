@echo off
title Stop WaveMusic Bot
color 0c
cls
echo ======================================================================
echo                     STOPPING WAVEMUSIC BOT
echo ======================================================================
echo.
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*src/index.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo.
echo [OK] WaveMusic has been completely stopped.
timeout /t 3 >nul
