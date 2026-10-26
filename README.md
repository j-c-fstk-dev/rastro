# Rastro

**Real actions, signed by who did them, confirmed by who was there.**

Rastro records real-world regenerative actions, starting with community cleanups, and lets the
people who were there confirm them with their own signature. It works without signal, needs no
account or wallet, and runs on [Nostr](https://nostr.com), so no single company or government can
take the records down.

It follows the principles of Aletheia: a record holds because it is signed and witnessed, not
because an authority approved it or a majority voted.

*Português: o app está disponível em inglês e português (botão EN/PT).*

## How it works

1. **Identity in ten seconds.** Open the app and type a name. A key is created on the device.
2. **Record the action.** Before and after photos, place, numbers (kg, bags, area…). No signal? It waits on the phone and goes out later.
3. **Show the presence QR.** People who were there scan it and tap "I was there". Each testimony is signed with their own key.
4. **The trail fills up.** *Observed* → *Confirmed* (2 witnesses) → *Consolidated* (5 witnesses, or 2 group members who were there). Nobody approves anything.
5. **Prove it.** Group pages, a printable impact report with a map and verification links, and export in the [DeCleanup Network](https://decleanup.net) format.

Private by default: public location is rounded to about 5 km and photo metadata is stripped.

## Repository

```
src/          the app (React + Vite PWA)
├── model/    actions, witnesses, groups and status rules (with tests)
├── nostr/    keys, relays, local storage, offline outbox
├── media/    photo compression and Blossom upload
├── i18n/     English (source) and Portuguese
├── screens/  app screens
└── ui/       shared components
site/         landing page
node/         community node: relay + photo server + Tor (see node/README.md)
docs/         v1 specification
```

## Develop

```bash
npm install
npm run dev        # http://localhost:5173/rastro/app/
npm test           # data model and status rules
npm run build      # production PWA in dist/
```

## Publish

Every push to `main` publishes to GitHub Pages: the landing page at `/rastro/` and the app at
`/rastro/app/` (`.github/workflows/deploy.yml`). The first time, set
**Settings → Pages → Source: GitHub Actions**.

## Infrastructure

By default the app uses public Nostr relays and public [Blossom](https://github.com/hzrd149/blossom)
photo servers. Communities can run their own node with one command (see [node/](node/README.md))
and point the app to it under **You → Servers**.

## License

[AGPL-3.0](LICENSE). If you run a modified version as a service, you must share its source.
