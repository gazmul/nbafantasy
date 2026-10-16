# Fantasy Dual v0.4 — ONE Cloudflare project

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

## Play — neutral arcade by default

Practice: choose your team and two roster players, then press PLAY NOW · VS CPU. No weekly stats or injury checkbox is needed for neutral tests.

Play a friend:

1. Select your fantasy team and press CREATE MATCH & INVITE.
2. Copy the match link shown in the lobby and send it to your rival (or paste it in an incognito window).
3. Your rival opens that exact link. The host's team is excluded so both owners choose different teams.
4. Two players per owner are preselected. Change them if desired, then both press READY · LET'S PLAY.
5. A shared 3–2–1 countdown starts the same two-minute server-controlled duel.

FIND ONLINE RIVAL remains available for automatic pairing: both owners must choose that button and use the same match mode/week. Creating two private matches independently will not pair them; share the invite for the court you want to use.

Neutral arcade uses listed height/weight and identical weekly ability baselines. All roster players are selectable for the trial. Injury eligibility is not verified. Real weekly figures remain optional inside the collapsed advanced section and require confirmed injury eligibility.

Keep both live game windows visible. Disconnecting or switching away pauses the shared clock. Return to the original browser or use RESUME MY ROOM. Rooms expire after four hours. This prototype has no login or team ownership verification; anyone with a match link can claim its second place.

## v0.4 fixes and arcade presentation

The court renderer now imports its maths helper, fixing the first-frame exception that froze practice and live rendering. New client runtime regression coverage executes the real UI and canvas code with adapters through countdown, movement, shooting, pause/resume, portrait restart and invitation join. This supplements the server tests; it is not real-browser or phone QA.

Warm parquet, saturated blue/coral/gold, outlined arcade typography, larger character heads, running and shooting poses, boost trails and scoring confetti use original code-native artwork.

## Controls

Laptop: WASD/arrows move; hold/release Space to shoot; E passes/switches; Shift boosts. Mobile: thumbstick, Shoot, Pass/Switch and Boost. Blue attacks up in portrait and right in landscape; orange attacks the opposite way. Two-point baskets, three-pointers, dunks, a 24-second clock and overtime are included.

## Checks

`npm test` runs the engine/catalogue and client runtime checks. For live runtime validation:

```sh
npx wrangler deploy --dry-run --outdir .build
node test/realtime.integration.mjs
```

The realtime test checks automatic pairing without names/codes, simultaneous arrivals, queue abandonment, match-mode separation, readiness/countdown, shared input/state, timed shooting, disconnect pause and reconnect. Browser visual QA and real-phone touch testing remain outstanding. Cloudflare Git builds deploy pushes to main when enabled.

## Data

Nine supplied fantasy teams, 117 players. Height/weight and individual source links are in public/league.json, verified in the prior build against official NBA profiles on 15 October 2026. Original character art; no NBA/ESPN logos or copied likenesses. Weekly scores are entered by owners and do not update ESPN automatically.
