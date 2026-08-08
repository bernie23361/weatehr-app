@echo off
setlocal
cd /d "%~dp0"
"C:\Users\Z370\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "node_modules\expo\bin\cli" start --clear
if errorlevel 1 pause
