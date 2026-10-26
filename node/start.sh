#!/bin/sh
# Starts a Rastro community node and prints how to use it.
#   ./start.sh            relay + photos + Tor onion address
#   ./start.sh --tunnel   also a public HTTPS address (needs TUNNEL_TOKEN in .env)
set -e
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Docker with the compose plugin is required: https://docs.docker.com/engine/install/"
  exit 1
fi

if [ "$1" = "--tunnel" ]; then
  [ -f .env ] && . ./.env
  if [ -z "$TUNNEL_TOKEN" ]; then
    echo "Set TUNNEL_TOKEN=... in node/.env first (see README.md, 'Public HTTPS address')."
    exit 1
  fi
  docker compose --profile tunnel up -d --build
else
  docker compose up -d --build
fi

echo "Waiting for the onion address…"
onion=""
for _ in $(seq 1 60); do
  onion=$(docker compose exec -T tor cat /var/lib/tor/rastro/hostname 2>/dev/null || true)
  [ -n "$onion" ] && break
  sleep 2
done

ip=$(hostname -I 2>/dev/null | awk '{print $1}')
cat <<INFO

Rastro node is running.

  On this computer:  relay ws://localhost:${RELAY_PORT:-7777}   photos http://localhost:${PHOTOS_PORT:-3000}
  On your network:   relay ws://${ip:-<this-ip>}:${RELAY_PORT:-7777}   photos http://${ip:-<this-ip>}:${PHOTOS_PORT:-3000}
  Over Tor:          relay ws://${onion:-<not ready yet, run ./start.sh again>}   photos http://${onion:-…}:3000

To mirror another community node:  ./sync.sh wss://their-relay.example
To stop:                            docker compose down
INFO
