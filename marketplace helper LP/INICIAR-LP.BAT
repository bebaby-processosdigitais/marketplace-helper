@echo off
chcp 65001 >nul
title Marketplace Helper - Landing Page
cd /d "%~dp0"

echo ============================================
echo   Marketplace Helper - Landing Page
echo ============================================
echo.

REM --- Libera a porta 8080 (encerra LP antiga presa, se houver) ---
echo Liberando a porta 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo Iniciando a landing page na porta 8080...
start "Landing Page ML" cmd /k "npm start"

timeout /t 3 /nobreak >nul
echo Abrindo no Google Chrome...

set "URL=http://localhost:8080"
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%URL%"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%URL%"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%URL%"
) else (
    start "" "%URL%"
)

echo.
echo Pronto! A landing page esta na janela "Landing Page ML".
echo Para encerrar, feche aquela janela.
timeout /t 3 /nobreak >nul
exit
