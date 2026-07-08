@echo off
setlocal
set DIR=%~dp0
set LOGDIR=%LOCALAPPDATA%\PaperCupRadioLite\logs
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
start "" "%DIR%server-lite.exe"
powershell.exe -NoProfile -Command "Start-Sleep -Milliseconds 1200; Start-Process 'http://127.0.0.1:8765/d'"
