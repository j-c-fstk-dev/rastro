# Rastro community node

Keep your community's records on a computer you control. A node is three services:

| Service | What it does | Port |
|---|---|---|
| **relay** ([strfry](https://github.com/hoytech/strfry)) | Stores and serves the signed events: actions, witnesses, groups, profiles | 7777 |
| **photos** ([blossom-server](https://github.com/hzrd149/blossom-server)) | Stores photos by their hash, so they can't be swapped | 3000 |
| **tor** | Gives the node an `.onion` address that works behind any router and can't be blocked by IP | — |

Nodes don't depend on each other. When one goes offline, the others still have the records.

> **Status:** the configuration has been validated, but the stack has not been run end to end yet.
> Please report anything that breaks on the first run.

## Requirements

- Any computer that stays on: an old laptop, a mini PC or a Raspberry Pi 4/5 (64-bit)
- [Docker Engine with the compose plugin](https://docs.docker.com/engine/install/)
- About 2 GB of free disk to start

## Start

**Linux / macOS**

```sh
git clone https://github.com/j-c-fstk-dev/rastro
cd rastro/node
./start.sh
```

**Windows**

1. Install [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) (it sets up WSL 2 for you) and [Git for Windows](https://git-scm.com/download/win).
2. Open Docker Desktop once and wait until it says it is running.
3. In PowerShell:

```powershell
git clone https://github.com/j-c-fstk-dev/rastro
cd rastro\node
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

The first run compiles strfry from source, which takes a few minutes. The script then prints the
node's addresses, including the onion address.

### Keeping a Windows computer on as a node

- **Settings → System → Power**: set sleep to *Never* when plugged in.
- **Docker Desktop → Settings → General**: turn on *Start Docker Desktop when you sign in*.
  The node's containers restart on their own when Docker starts.
- Windows Update may restart the computer; after it signs in again, the node comes back by itself.
- If other devices on your network should reach it, allow ports 7777 and 3000 when Windows Firewall asks.

## Use it from the app

In Rastro, open **You → Servers** and add your node's relay and photo addresses.

Phones load Rastro over HTTPS, and browsers only allow secure connections from an HTTPS page.
So phones can reach a node through:

- **A public HTTPS address** (recommended, see below), or
- **Tor**, from the Tor Browser or Orbot, using the onion address.

Plain `ws://` addresses on your local network work from a computer's browser when the app is
served locally, but not from the public app on a phone.

## Public HTTPS address

The simplest way to give a home computer an HTTPS address, even behind carrier-grade NAT, is a
free [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):

1. Create a tunnel in the Cloudflare dashboard and copy its token.
2. Add two public hostnames to the tunnel: one pointing to `http://relay:7777`, one to `http://photos:3000`.
3. Put the token in `node/.env`:
   ```
   TUNNEL_TOKEN=eyJh...
   ```
4. Run `./start.sh --tunnel` (on Windows: `.\start.ps1 -Tunnel`).

Cloudflare can see the traffic metadata and could cut the tunnel. That is why the onion address
always runs too, and why records are copied to other nodes.

## Mirror other nodes

Copy Rastro events both ways between your node and others:

```sh
./sync.sh wss://other-node.example wss://relay.damus.io
```

Add it to cron to keep nodes in sync, for example every 15 minutes:

```
*/15 * * * * /home/you/rastro/node/sync.sh wss://other-node.example
```

On Windows: `powershell -ExecutionPolicy Bypass -File .\sync.ps1 wss://other-node.example`, and use
Task Scheduler instead of cron to repeat it.

## What this node accepts

- The relay accepts any valid signed Nostr event. Sync only copies Rastro kinds
  (profiles, actions, witnesses, groups, comments and deletion requests).
- The photo server accepts images only, up to 15 MB, from any Nostr key that signs the upload.
  Photos are kept for 5 years after they were last accessed.
- Each operator decides what their node keeps. Edit `strfry.conf` and `blossom.yml` to change it.

## Operate

```sh
docker compose ps          # status
docker compose logs -f     # logs
docker compose down        # stop (data is kept in Docker volumes)
docker compose pull && ./start.sh   # update
```
