@echo off
title Darf UI Launcher
cls
:: Launch the concurrent dev environment (banner + browser handled by Node launcher)
call npm run start
pause
