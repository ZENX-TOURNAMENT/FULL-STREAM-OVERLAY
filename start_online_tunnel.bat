@echo off
title HEL Valorant Online Tunnel (Qatar to India)
color 0b
echo ===================================================
echo   VALORANT OVERLAY ONLINE INTERNET TUNNEL
echo ===================================================
echo.
echo Connecting to instant secure tunnel...
echo.
echo [!] Keep this window OPEN during your stream!
echo [!] Copy the https:// link shown below and send it to your spectator in India.
echo.
ssh -p 443 -R0:localhost:25565 -o StrictHostKeyChecking=no a.pinggy.io
pause
