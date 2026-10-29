@echo off
title TubePulse Analytics Dashboard Server
echo ========================================================
echo  Khoi dong TubePulse YouTube Analytics Hub tai:
echo  http://localhost:4173
echo  Tich hop API OAuth 2.0 & YouTube Analytics API v2
echo ========================================================
start  http://localhost:4173
python dashboard_server.py
pause
