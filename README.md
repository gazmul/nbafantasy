# Fantasy Dual v0.3 — ONE Cloudflare project

One deployment. One website address. Practice and live multiplayer are included.

## Publish from your browser — no local installation

This repository contains the complete website, practice mode, matchmaking and live match server. Deploy it as one Cloudflare Worker, not a static Pages upload.

1. In Cloudflare, open Workers & Pages and create a Worker using the Git repository import/connection option.
2. Connect GitHub and choose `gazmul/nbafantasy`, branch `main`.
3. Worker name: **`nbafantasy`** (matches `wrangler.jsonc`).
4. Root directory: repository root. Build command: **`npm ci`**. Deploy command: **`npx wrangler deploy`**.
5. Deploy, then share the single `workers.dev` address with your group.

Cloudflare runs the publishing tools in its own build environment. You do not need Node.js on your Mac. Both Durable Object namespaces are configured in the repository and created by deployment; players need no accounts or Cloudflare access. Future pushes to main deploy automatically when connected Git builds are enabled.

If Cloudflare asks for a non-production branch command, leave the default in place and deploy `main` for the first test. Durable Object migrations must be applied with `wrangler deploy`.

### Optional terminal deployment

For developers who already have Node.js 22.12+ installed:

```sh
npm ci
npx wrangler login
npm run deploy
```

## Play

Practice: choose your team, two roster players and an AI opponent, then start a warm-up.

Live: both owners open the same website, select different fantasy teams, and press ENTER LIVE COURT. The first waits; the next owner in the same mode joins automatically. Each selects two players and confirms injury eligibility. Both press READY UP. A shared 3–2–1 countdown starts the same server-controlled two-minute match on both devices.

For your first trial, choose Gameplay test on both devices. This uses verified height and weight with neutral weekly abilities. Final-week duel instead requires the same week-ending date and manually entered final fantasy score and weekly player totals. There is no automatic stats or injury feed.

Keep both game tabs visible. Disconnecting or switching away pauses the shared clock; return to the original browser or use RESUME MY ROOM. Queue entries from owners who leave are skipped. Rooms expire after four hours. With more than two arrivals, owners pair in arrival order within their match mode/week; scheduled league pairings are not implemented.

This is deliberately account-free: anyone with the website address can select a team. Team selection is not proof of ownership. Auction prices do not affect gameplay.

## Controls

Laptop: WASD/arrows move; hold/release Space to shoot; E passes/switches; Shift boosts. Mobile: thumbstick, Shoot, Pass/Switch and Boost. Blue attacks up in portrait and right in landscape; orange attacks the opposite way. Two-point baskets, three-pointers, dunks, a 24-second clock and overtime are included.

## Checks

`npm test` runs the eight engine/catalogue checks. For live runtime validation:

```sh
npx wrangler deploy --dry-run --outdir .build
node test/realtime.integration.mjs
```

The realtime test checks automatic pairing without names/codes, simultaneous arrivals, queue abandonment, match-mode separation, readiness/countdown, shared input/state, timed shooting, disconnect pause and reconnect. Browser visual QA and real-phone touch testing remain outstanding. This package has not been deployed to your account.

## Data

Nine supplied fantasy teams, 117 players. Height/weight and individual source links are in public/league.json, verified in the prior build against official NBA profiles on 15 October 2026. Original character art; no NBA/ESPN logos or copied likenesses. Weekly scores are entered by owners and do not update ESPN automatically.
