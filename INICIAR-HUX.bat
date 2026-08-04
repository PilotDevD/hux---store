@echo off
title HUX - Servidor Local
cd /d "%~dp0"
echo ============================================
echo   HUX - iniciando o servidor local...
echo   Acesse depois em: http://localhost:4100
echo   (NAO feche esta janela enquanto usar o site)
echo ============================================
echo.
call npm run dev
echo.
echo O servidor foi encerrado. Pressione qualquer tecla para fechar.
pause >nul
