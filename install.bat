@echo off
title Darf UI Installer
cls
echo ===================================================================
echo                            ✦ DARF UI INSTALLER ✦
echo ===================================================================
echo.
echo [SYSTEM]: Verifying environment prerequisites...
echo.

:: Check Node.js
set HAS_NODE=1
where node >nul 2>nul
if %errorlevel% neq 0 (
    set HAS_NODE=0
    if exist static\index.html (
        echo [INFO]: Node.js was not detected, but pre-compiled static assets were found.
        echo         Darf UI will run in high-performance portable mode (no npm required).
    ) else (
        echo [ERROR]: Node.js was not found in your system PATH!
        echo          Please install Node.js (v18+) from: https://nodejs.org
        echo.
        pause
        exit /b 1
    )
)
if "%HAS_NODE%"=="1" (
    echo [OK]: Node.js detected.
)

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR]: Python was not found in your system PATH!
    echo          Please install Python (v3.10+) from: https://python.org
    echo          Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)
echo [OK]: Python detected.
echo.
echo ===================================================================
echo [SYSTEM]: Initialising Python Virtual Environment (venv)...
echo ===================================================================
if not exist venv (
    python -m venv venv
    echo [OK]: Virtual environment created.
) else (
    echo [INFO]: venv folder already exists. Skipping creation.
)

echo.
echo ===================================================================
echo [SYSTEM]: Installing Python packages inside venv...
echo ===================================================================
call venv\Scripts\python -m pip install --upgrade pip
call venv\Scripts\pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR]: Failed to install Python dependencies!
    echo.
    pause
    exit /b 1
)
echo [OK]: Python packages installed successfully.

if "%HAS_NODE%"=="1" (
    echo.
    echo ===================================================================
    echo [SYSTEM]: Installing Frontend Node dependencies...
    echo ===================================================================
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR]: Failed to install Node dependencies!
        echo.
        pause
        exit /b 1
    )
    echo [OK]: Node modules installed successfully.
) else (
    echo.
    echo [INFO]: Skipping npm install because Node.js is not present (portable mode active).
)

echo.
echo ===================================================================
echo                  ✦ INSTALLATION COMPLETE SUCCESS ✦
echo ===================================================================
echo.
echo [SUCCESS]: Darf UI is fully configured and ready!
echo.
echo [PLAY]: Double-click "start.bat" in the project root to run
echo         both backend and frontend concurrently!
echo.
echo ===================================================================
pause
