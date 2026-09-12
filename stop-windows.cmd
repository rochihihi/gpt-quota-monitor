@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-server.ps1"
timeout /t 2 /nobreak >nul
