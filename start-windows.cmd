@echo off
cd /d "%~dp0"
echo Stopping old monitor...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-server.ps1"
echo Starting monitor...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
if errorlevel 1 (
  echo Start failed. Check monitor-error.log
  pause
  exit /b 1
)
start "GPT Quota Monitor" "http://127.0.0.1:18787/?v=%RANDOM%"
echo Browser opened. This window will close in 3 seconds.
timeout /t 3 /nobreak >nul
