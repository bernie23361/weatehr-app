@echo off
setlocal
cd /d "%~dp0"
echo Starting Expo Go preview...
set EXPO_OFFLINE=1
set EXPO_NO_TELEMETRY=1
"C:\Users\Z370\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "node_modules\expo\bin\cli" start --go --clear --port 8082
if errorlevel 1 pause
