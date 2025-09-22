@echo off
echo Starting StationaryHub with High Memory Optimization...
echo Memory Limit: 8GB
echo Garbage Collection: Enabled
echo Debug Mode: Enabled
echo.

set NODE_OPTIONS=--max-old-space-size=8192 --expose-gc --inspect
npx next dev -p 3000

pause

