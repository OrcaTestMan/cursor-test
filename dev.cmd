@echo off
rem Yarn breaks Korean folder paths under the default Korean code page (949).
chcp 65001 >nul
cd /d "%~dp0"
docker compose up -d --wait
call corepack yarn dev
