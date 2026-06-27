@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo ============================================================
echo  ClaudeOne 打包脚本
echo ============================================================
echo.

rem 读取 package.json 里的当前版本号
for /f "tokens=2 delims=:, " %%a in ('findstr /r /c:"\"version\"" package.json') do (
    set "VERSION=%%~a"
    goto :gotver
)
:gotver

echo  当前版本号 version = %VERSION%
echo.
echo  [提醒] 每次发版前请先把 package.json 的 version 加一位
echo         例如 0.1.2 -^> 0.1.3，否则 portable 会复用旧缓存代码，
echo         用户跑到的还是旧版！
echo.

set /p CONFIRM=是否已修改版本号并继续打包? (Y/N):
if /i not "%CONFIRM%"=="Y" (
    echo 已取消打包。请先修改 package.json 的 version 后重试。
    pause
    exit /b 0
)

echo.
echo 设置国内镜像源...
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
set "ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/"

echo 开始打包（electron-vite build ^&^& electron-builder --win）...
echo.
call npm run package

if errorlevel 1 (
    echo.
    echo ============================================================
    echo  打包失败！请查看上方错误信息。
    echo  若提示 app.asar 被占用，请先关闭所有 ClaudeOne 进程后重试。
    echo ============================================================
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  打包完成！产物在 dist 目录下：
echo  ClaudeOne-%VERSION%-win-x64.exe
echo ============================================================
pause
endlocal
