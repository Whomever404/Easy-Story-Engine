@echo off
cd /d "%~dp0"

echo ========================================================
echo       Easy Story Engine (ESE) 快速启动器
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] 检测到 Node.js 环境，正在启动内置服务...
    node server.js
    goto end
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] 检测到 Python 环境，正在启动内置服务...
    start "" "http://localhost:3000"
    python -m http.server 3000
    goto end
)

echo [提示] 未检测到 Node 或 Python，正在直接打开 index.html...
start "" "%~dp0index.html"

:end
pause
