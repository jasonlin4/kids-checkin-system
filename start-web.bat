@echo off
setlocal
cd /d "%~dp0"

if not exist "package.json" (
  echo [ERROR] package.json not found. Please run this script from the project root.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not detected. Please install Node.js and add it to PATH.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not detected. Please install Node.js/npm and add it to PATH.
  pause
  exit /b 1
)

echo [INFO] Starting integrated Vercel local runtime...
echo [INFO] Frontend + backend functions will run on the same origin.
npx vercel dev
