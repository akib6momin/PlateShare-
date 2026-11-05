@echo off
title Plate Share - Food Surplus Rescue Platform
color 0A
cls

cd /d "%~dp0"

echo ================================================================
echo                PLATE SHARE - SURPLUS FOOD RESCUE
echo ================================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

:: Check if database exists, seed if missing
if not exist "server\plateshare.db" (
    echo [INFO] Database not detected. Initializing seed data...
    node server/seed.js
    echo.
)

echo [1/2] Starting PlateShare Backend Server on http://localhost:5000...
echo [2/2] Launching your web browser...
echo.

:: Open the default browser after 2 seconds in the background
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"

:: Start the server process (keeps window active and logs crons)
node server/index.js

pause
