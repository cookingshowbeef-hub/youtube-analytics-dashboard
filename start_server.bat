@echo off
title TubePulse Analytics Dashboard Server
echo ========================================================
echo  Khoi dong TubePulse YouTube Analytics Hub tai:
echo  http://localhost:4173
echo ========================================================
start "" http://localhost:4173
python -m http.server 4173
pause
