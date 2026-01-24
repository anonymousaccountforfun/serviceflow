#!/bin/bash
pkill -f localtunnel 2>/dev/null
sleep 2
npx localtunnel --port 3001 | tee /tmp/tunnel-url.txt &
sleep 8
cat /tmp/tunnel-url.txt
