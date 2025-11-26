@echo off
echo ========================================================
echo   OTP MANAGER - CLOUDFLARE TUNNEL LAUNCHER
echo ========================================================
echo.

:: 1. Kiem tra va tai cloudflared neu chua co
if not exist "cloudflared.exe" (
    echo [!] Chua tim thay cloudflared.exe. Dang tai xuong...
    powershell -ExecutionPolicy Bypass -File setup_cloudflare.ps1
)

:: 2. Khoi dong Web Server
echo [1/2] Dang khoi dong Web Server (app.py)...
tasklist /FI "WINDOWTITLE eq OTP Manager Server" 2>NUL | find /I /N "py.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Server da chay san.
) else (
    start "OTP Manager Server" py app.py
)
timeout /t 5 /nobreak >nul

:reconnect
cls
echo ========================================================
echo   OTP MANAGER - CLOUDFLARE TUNNEL LAUNCHER
echo ========================================================
echo.
echo [2/2] Dang ket noi ra Internet (Cloudflare)...
echo       Link se hien ra ben duoi (dang https://....trycloudflare.com)
echo.
echo ========================================================
echo   COPY LINK BEN DUOI GUI CHO KHACH HANG
echo ========================================================
echo.
:: Chay Quick Tunnel
cloudflared.exe tunnel --url http://127.0.0.1:5000

echo.
echo !!! Mat ket noi. Dang tu dong ket noi lai sau 3 giay... !!!
timeout /t 3 /nobreak >nul
goto reconnect
