@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   新闻热榜 RAG - 端口清理工具
echo ========================================
echo.

:: 检查并清理3000-3006端口
echo 🔍 检查端口占用情况...

for %%p in (3000,3001,3002,3003,3004,3005,3006) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr :%%p 2^>nul') do (
        if "%%i" neq "" (
            echo 🔄 清理端口 %%p - PID: %%i
            taskkill /PID %%i /F >nul 2>&1
        )
    )
)

echo.
echo 🧹 额外清理残留Node进程...
:: 清理可能残留的node进程
for /f "skip=3 tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo table 2^>nul') do (
    taskkill /PID %%i /F >nul 2>&1
)

echo.
echo ✅ 端口清理完成！

:: 验证清理结果
echo.
echo 📊 验证端口状态:
for %%p in (3000,3001,3002,3003,3004,3005,3006) do (
    netstat -ano | findstr :%%p >nul
    if errorlevel 1 (
        echo   ✅ 端口 %%p - 空闲
    ) else (
        echo   ❌ 端口 %%p - 仍被占用
    )
)

echo.
echo 按任意键退出...
pause >nul