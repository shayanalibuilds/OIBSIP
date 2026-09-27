#!/usr/bin/env bash
# Boots server + client, runs the full browser test suite, then tears down.
set -u

PROJECT_ROOT="/home/z/my-project/OIBSIP/WebDev-L3-PizzaDelivery"

pkill -f "tsx.*src/index" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start server
cd "$PROJECT_ROOT/server"
npx tsx src/index.ts > /tmp/server.log 2>&1 &
SRV=$!

# Start client
cd "$PROJECT_ROOT/client"
npx vite > /tmp/client.log 2>&1 &
CLT=$!

# Wait for both
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -sf http://localhost:8800/api/health > /dev/null 2>&1 && curl -sf http://localhost:5173/ > /dev/null 2>&1; then
    echo "BOTH UP"
    break
  fi
  sleep 1
done

curl -s -w "SERVER HTTP:%{http_code}\n" http://localhost:8800/api/health
curl -s -w "CLIENT HTTP:%{http_code}\n" -o /dev/null http://localhost:5173/

# Close any existing browser
agent-browser close 2>&1 | tail -1

# Run the test suite
bash "$PROJECT_ROOT/scripts/browser-test.sh"
TEST_EXIT=$?

# Cleanup
kill $SRV $CLT 2>/dev/null
echo "TEST_EXIT=$TEST_EXIT"
exit $TEST_EXIT