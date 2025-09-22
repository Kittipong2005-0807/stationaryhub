@echo off
echo Starting StationaryHub with Memory Optimization...
echo Memory Limit: 4GB
echo Garbage Collection: Enabled
echo.

set NODE_OPTIONS=--max-old-space-size=4096 --expose-gc
npx next dev -p 3000

pause

