@echo off
chcp 65001 >nul
echo ========================================================
echo       Easy Story Engine (ESE) 快速启动器
echo ========================================================
echo.
echo 正在检查本地环境并启动预览服务器...
echo.

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [提示] 未在 PATH 中找到 npm，尝试直接使用浏览器打开 index.html...
    start "" "index.html"
    pause
    exit /b
)

echo 正在启动本地开发服务器并打开浏览器...
start "" http://localhost:3000
npm run dev
pause
