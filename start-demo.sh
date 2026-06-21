#!/bin/bash
# Fire up the whole Drunk Buddy stack in one shot (after closing it / sleeping the Mac).
# Run from the repo root:  ./start-demo.sh
# (The BlueBubbles app must be open on the Mac — that part is manual.)
set -e
cd "$(dirname "$0")"

echo "1/5  Redis (the database)…"
brew services start redis >/dev/null 2>&1 || redis-server --daemonize yes >/dev/null 2>&1 || true
sleep 1
(redis-cli ping 2>/dev/null || /opt/homebrew/opt/redis/bin/redis-cli ping 2>/dev/null) | grep -q PONG && echo "     ✓ redis up" || echo "     ! redis not responding"

echo "2/5  cloudflared tunnel (for the watch link)…"
pkill -f "cloudflared tunnel --url http://localhost:8787" 2>/dev/null || true
nohup cloudflared tunnel --url http://localhost:8787 > /tmp/db-tunnel.log 2>&1 &
URL=""
for i in $(seq 1 30); do
  URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/db-tunnel.log 2>/dev/null | head -1)
  [ -n "$URL" ] && break; sleep 1
done
if [ -n "$URL" ]; then
  grep -v '^PUBLIC_URL=' .env > .env.tmp && mv .env.tmp .env
  echo "PUBLIC_URL=$URL" >> .env
  echo "     ✓ tunnel: $URL"
else
  echo "     ! tunnel didn't come up — core demo still works, watch link won't"
fi

echo "3/5  Phoenix (Arize dashboard)…"
pkill -f "phoenix serve" 2>/dev/null || true
nohup "$HOME/.phoenix-venv/bin/phoenix" serve > /tmp/phoenix.log 2>&1 &
echo "     dashboard → http://localhost:6006"

echo "4/5  backend (the agent)…"
pkill -f "backend/src/index.ts" 2>/dev/null || true
sleep 1
nohup pnpm dev > /tmp/db.log 2>&1 &

echo "5/5  health check…"
sleep 3
curl -s --retry 25 --retry-delay 1 --retry-all-errors -m 5 http://localhost:8787/health && echo "  ✓ ALL UP"
echo ""
echo "Reminder: make sure the BlueBubbles app is OPEN on the Mac."
echo "To reset for a fresh demo convo:  redis-cli flushall"
