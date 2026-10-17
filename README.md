# Fantasy Dual v0.6 — ONE Cloudflare project

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

Practice: choose your team and its featured pair, then press PLAY NOW · VS CPU. No weekly stats or injury checkbox is needed for neutral tests.

Play a friend:

1. Select your fantasy team and press CREATE MATCH & INVITE.
2. Copy the match link shown in the lobby and send it to your rival (or paste it in an incognito window).
3. Your rival opens that exact link. The host's team is excluded so both owners choose different teams.
4. Two players per owner are preselected. Change them if desired, then both press READY · LET'S PLAY.
5. A shared 3–2–1 countdown starts the same two-minute server-controlled duel.

FIND ONLINE RIVAL remains available for automatic pairing: both owners must choose that button and use the same match mode/week. Creating two private matches independently will not pair them; share the invite for the court you want to use.

Neutral arcade uses listed height/weight and identical weekly ability baselines. All roster players are selectable for the trial. Injury eligibility is not verified. Real weekly figures remain optional inside the collapsed advanced section and require confirmed injury eligibility.

Keep both live game windows visible. Disconnecting or switching away pauses the shared clock. Return to the original browser or use RESUME MY ROOM. Rooms expire after four hours. This prototype has no login or team ownership verification; anyone with a match link can claim its second place.

## v0.6 — Featured 18, smoother movement, dunks and fire

The playable set is now the first two players in each supplied fantasy roster (18 in total). The complete 117-player catalogue remains retained as source data. Every featured athlete has individual transparent pixel artwork. The Character Lab at `/characters` covers all 18, both uniform palettes, eight run-cycle slots, shot gather/release, dunk, landing, defence and celebration. Flagg's generated atlas has fifteen distinct poses; its eight-slot run cycle reuses one stride pose. Asset mappings account for that layout explicitly.

Running uses eight-phase cycles, movement-distance timing, short pose transitions, a subtle continuous body bounce, and smoother acceleration/deceleration. Game art loads lazily for active players. The atlas cache is capped at eight resources so visiting the full lab does not retain every team's decoded textures.

### Dunk

Within 108 court units of your attacking rim, press Shoot/Space once for a dunk. The action label becomes TAP DUNK. You do not need to charge a jump shot near the rim. The server moves the dunker towards the hoop during flight, resolves defensive pressure/blocks and awards two points if made. A dunk is not guaranteed.

### Fire

Three consecutive personal makes without a miss or an opposing basket ignite that player for 25 seconds. An opponent's made basket extinguishes earned fire. Fire grants +13 percentage points to normal shot probability (subject to the existing cap), +8 percentage points to dunk probability, 10% extra pace and faster stamina recovery. It adds visible flames, ball effects and a player timer. It is not invincibility.

The selected weekly top guard, forward and centre start with 30 seconds of fire. That opening bonus survives an opponent's basket until its timer ends. Countdown, pauses and possession resets do not consume fire timers; only active play does.

For neutral testing, DEMO PICKS are clearly labelled and configurable before creating a match. Defaults are Edwards (guard), Barnes (forward) and Jokic (centre); these are demonstration choices, not claims about current NBA/fantasy results. The host's choices apply to both owners and appear in the shared lobby. Choose Nobody to disable a slot.

For an actual final-week duel, select and confirm the real positional winners; no winner is invented if none is supplied. Weekly leaderboard data is not fetched from ESPN. Position groups are this prototype's single primary G/F/C grouping in `public/featured.js`, rather than imported multi-position ESPN eligibility. Winner selection is currently manual, not an automated league-wide ranking service.

The server chooses opening fire from the room configuration; a ready/input message cannot grant itself fire. Weekly stat payloads are whitelisted so they also cannot override identity, measurements or fire status. No new database namespace or migration is required.

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

### v0.6.1 animation fix

Sprite metadata follows complete silhouettes instead of cutting poses at uniform tile edges. Corrected shorter pose sheets and added court side clearance. `npm test` includes decoded-PNG running crop checks. To rebuild metadata from unchanged source PNGs: `python scripts/build-atlas.py` (Pillow, NumPy, SciPy required for this optional art tooling).

### v0.7.0 · Midnight Arena

Midnight Arena is the active visual direction: navy/graphite surfaces, warm maple court, cobalt and ivory kits, and amber fire effects. Shared presentation colours live in `public/themes.js`. Concrete Club, Coastal Heat and Original Arcade remain saved there for future themed games; there is no theme selector yet. Both sprite kits and roster previews use the same pigment conversion while preserving skin/hair colours and source shading. Gameplay, sprite frame bounds, team rosters and room protocol are unchanged.

### v0.8.0 · Four-player rosters

Every team now has four individually illustrated players available. Choose exactly two for practice or a live duel; this remains 2v2. The next two players are catalogue-order entries3 and4, preserving the existing fantasy teams and measurements. New artwork has sixteen complete poses and supports both Midnight Arena kits.

Roster expansion continuity and recovery are in `docs/ROSTER-PRODUCTION.md` and `docs/roster-progress.json`. The owner's scheduled overnight task adds balanced batches until all117 players are reviewed, available and verified live, then disables itself.

### v0.8.1 · Perspective court and raised baskets

The court now uses a low sideline perspective in landscape and an end-court perspective in portrait. Glass backboards, elevated rims, nets and shot clocks sit above the floor, with players scaled and layered by court depth. Shots finish at the elevated rim; dunk lift follows each athlete's actual sprite reach. No crowd is drawn. World positions, control directions, match physics, roster selection and the existing network protocol remain authoritative and unchanged.

`node scripts/render-court-qa.mjs` renders portrait/landscape views and left/right dunks with the real canvas modules, also asserting that rendering never mutates match state. This does not replace browser or real-phone QA.
