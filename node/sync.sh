#!/bin/sh
# Copies events both ways between this node and other relays (negentropy sync).
#   ./sync.sh wss://relay.one.example wss://relay.two.example
# Run it from cron to keep nodes mirrored, e.g. every 15 minutes:
#   */15 * * * * /path/to/rastro/node/sync.sh wss://other-node.example
set -e
cd "$(dirname "$0")"
[ $# -gt 0 ] || { echo "usage: $0 wss://relay [wss://relay …]"; exit 1; }
# Only Rastro events: profiles, actions, witnesses, groups, comments and deletions.
filter='{"kinds":[0,3910,3911,33910,1111,5]}'
for peer in "$@"; do
  echo "Syncing with $peer"
  docker compose exec -T relay /app/strfry sync "$peer" --filter "$filter" --dir both
done
