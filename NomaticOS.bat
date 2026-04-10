@echo off
title Nomatic OS
color 0A
echo.
echo   ╔══════════════════════════════════════╗
echo   ║         NOMATIC OS - Starting        ║
echo   ║       Agency Operating System        ║
echo   ╚══════════════════════════════════════╝
echo.
echo   Starting servers...
echo.

cd /d "c:\Users\Deepak\Downloads\antigravity-new\nomatic-productivity"

:: Start the dev server in background
start /min cmd /c "npm run dev"

echo   Waiting for servers to boot...
timeout /t 5 /nobreak >nul

echo   Opening Nomatic OS in browser...
start http://localhost:5173

echo.
echo   ✓ Nomatic OS is running!
echo   ✓ App: http://localhost:5173
echo.
echo   Keep this window open while using the app.
echo   Press any key to STOP the server and exit.
echo.
pause >nul

:: Kill node processes when user presses a key
taskkill /f /im node.exe >nul 2>&1
echo.
echo   Nomatic OS stopped. Goodbye!
timeout /t 2 /nobreak >nul
