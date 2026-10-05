# Game Design Document — Plague Rat

> **This file is the source of truth for the game's rules.**
> The designer owns this document. Code must match what is written here.
> A rule only changes when the designer explicitly approves the change,
> and every change is recorded in the Change Log at the bottom.

## 1. Concept
A top-down 2D pixel-art game. The player is a plague-bearing rat running through a district of a city, spreading the plague. Each level lasts a couple of minutes, and the goal is to infect a set percentage of the population. Spreading the plague grows the player into a swarm of rats, and the swarm dwindles over time; if it dies out, the level is failed.

## 1a. Platform (Locked)
- Browser game: HTML + JavaScript, no install, playable on desktop and phone.

## 2. Core Loop
- **Seconds:** steer the swarm into townsfolk → they turn sick, the swarm grows.
- **Level (~2 min):** race the steady die-off of your rats to reach the infection target.
- **Tension:** every rat lost is a timer ticking down; every infection buys time.

## 3. Rules & Mechanics
Each rule has a stable ID so we can refer to it precisely.
Status: **Locked** (agreed, must be honored), **Draft** (being tried out), **Retired** (replaced; kept for history).

| ID | Rule | Status |
|----|------|--------|
| R1 | The player steers a lead rat. The rest of the swarm follows the leader's path in a column up to three rats wide. | Draft |
| R2 | The swarm size is the number of rats, the leader included. A level starts with `startRats` rats. | Draft |
| R3 | Any rat in the swarm touching a healthy townsperson infects them instantly. | Draft |
| R4 | Each infection adds `ratsPerInfection` new rats to the swarm (they join at the tail). | Draft |
| R5 | Die-off countdown: if `decayInterval` seconds pass without an infection, the swarm loses one rat from the tail and the countdown starts again. Every infection restarts the countdown, so as long as the player keeps infecting within the window, no rats die. The countdown length is set by R13. | Locked |
| R5a | *(old R5)* The swarm loses one rat every `decayInterval` seconds, from the tail, at all times, whatever the player does. Still available via `decayResetOnInfect: false`. | Retired (kept for comparison) |
| R6 | **Lose:** the swarm reaches 0 rats. | Draft |
| R7 | **Win:** the infected share of the population reaches `targetPercent`. | Draft |
| R8 | Infected townsfolk stay infected and keep wandering, more slowly. They do not spread the plague themselves. | Draft |
| R9 | Townsfolk wander the streets at random and do not react to rats. | Draft |
| R10 | A level is a fixed hand-set district (same layout every play). There is no clock; level length comes from the die-off (R5). | Draft |
| R11 | Controls: WASD / arrow keys on keyboard. On touch screens, a virtual joystick sits at the bottom middle of the screen: the leader runs in the direction it is pushed, faster the further it is pushed (full speed at `stickFullAt`, nothing inside `stickDeadZone`). Touching the rest of the screen does nothing. With the joystick showing, the camera keeps the leader in the middle of the space above it. | Draft |
| R11a | *(old R11 touch control)* Press and drag anywhere on screen; the leader runs toward the finger. Replaced because the hand covered the play area. | Retired |
| R12 | A super-minimal minimap in the bottom-left corner shows the whole district with only two things on it: the player (blinking green marker) and each healthy townsperson (pale dot). No streets, buildings or infected people. | Draft |
| R13 | The die-off countdown shrinks as the swarm grows: `decayInterval` (1.5 s) for 1–10 rats, then `decayStep` (0.1 s) shorter for every further `decayStepEvery` (10) rats: 11–20 → 1.4 s, 21–30 → 1.3 s, … 60 → 1.0 s. It never goes below `decayMin` (0.5 s). The countdown gets longer again when the swarm shrinks. The HUD shows the current countdown in seconds next to the bar. | Draft |

## 3a. Visual Language
| ID | Rule | Status |
|----|------|--------|
| V1 | **Purple means plague.** Vibrant purple is reserved for the plague: infected people, the rats' haze, the plague HUD and effects. Healthy townsfolk never wear purple. Green is allowed anywhere (grass, trees, moss, clothes, awnings). | Draft |
| V1a | *(old V1)* Green means plague; nothing healthy shows green. | Retired |
| V2 | Infected townsfolk are marked by: lavender-grey skin, dark plague sores on face and arm, clothes dulled toward deep purple, a bright purple outline, a pulsing purple glow on the ground, and rising purple bubbles. Healthy townsfolk have a thin dark outline. | Draft |
| V3 | **Bill of Mortality.** Every end screen (win or lose) shows a comic death report styled after the old London Bills of Mortality. It lists up to 5 gross, cartoonish causes picked at random from a pool of 20, with numbers that add up to the number of people infected that run. A new mix every play. | Draft |
| V4 | **A filthy district.** Streets: uneven cobbles with missing stones, patchy mud, filth banked against walls, an open sewer channel down the middle of main streets, puddles (clear and murky), stains and a little litter. Parks are churchyards: green grass with tufts and flowers, a clean dirt path, headstones in rows, fresh graves, leafy and dead trees. Layout is the same every play (seeded). | Draft |
| V5 | **Buildings are rows of individual houses.** Each block is split into 2–4 houses (24–48 px wide), and deep blocks have a back row of roofs too, so no two blocks look alike. Neighbouring houses never share a roof material. Roofs are drawn as clean shaded planes lit from the top-left: hipped (four faces) or gabled (two), in six materials (terracotta, slate, thatch, old tile, wooden shingle, lead) with tidy tile rows, ridge and hip lines. Wear comes from a few deliberate details instead of random specks: moss clumps, holes with rafters (some boarded over), chimneys, dormer windows. Each house has its own street-facing wall: timber-framed plaster (sometimes with X braces or fallen plaster), stone, brick, or a shopfront with a striped awning. Windows are dark, candle-lit, shuttered or boarded; doors are arched, and some carry a red plague cross. One landmark church per level: a long slate nave, a bell tower with a gold cross, stained-glass windows and a double door, placed beside a churchyard. | Draft |

## 3b. Audio
| ID | Rule | Status |
|----|------|--------|
| A1 | Short synth sound effects: a squeak on each infection, a low blip when a rat dies, a jingle on win and lose. | Draft |
| A2 | One "Sound" button (bottom right, or the M key) mutes and unmutes everything, music included. | Draft |
| A3 | Background music: a looping music-box version of "Ring a Ring o' Roses" over a slow bass, about 12 s per loop. It plays during a level and stops at the end screen. | Draft |

## 4. Tunable Numbers
All live in the `CONFIG` object at the top of the script in `index.html`. Tuning these never changes a rule.

| Name | Value | Notes |
|------|-------|-------|
| `population` | 140 | Townsfolk in Level 1 |
| `targetPercent` | 60 | 84 infections needed |
| `startRats` | 8 | |
| `ratsPerInfection` | 1 | |
| `decayInterval` | 1.5 s | Countdown for a swarm of 1–10 rats |
| `decayStepEvery` | 10 rats | Swarm size per countdown step (R13) |
| `decayStep` | 0.1 s | How much shorter each step makes the countdown (R13) |
| `decayMin` | 0.5 s | Shortest the countdown can get (R13) |
| `decayResetOnInfect` | true | true = R5 (infection restarts the countdown); false = R5a (steady die-off) |
| `ratSpeed` | 80 px/s | |
| `citizenSpeed` | 16 px/s | |
| `infectedSpeedMult` | 0.6 | |
| `infectRadius` | 7 px | How close counts as touching |
| `stickDeadZone` | 0.15 | Joystick push ignored near its centre (0–1) |
| `stickFullAt` | 0.6 | Joystick push that gives full speed (0–1) |
| `musicEighth` | 0.22 s | Length of one eighth note; lower = faster tune (A3) |
| `musicVolume` | 0.03 | Melody volume (A3) |
| `minimapCell` | 2 | Map tiles per minimap pixel (lower = bigger, more detailed minimap) |

Balance note: a pathfinding test bot wins Level 1 in about 1:45 with ~20 rats left, but the bot always knows where everyone is. The designer found the level too hard without that knowledge, which is why R12 (minimap) was added. Numbers unchanged pending a replay.

With R5 (countdown reset), the same bot wins in ~1:55 and finishes with ~55 rats: it almost never loses a rat. Bot results at other values: 1.0 s → wins with ~25 rats left; 0.75 s → loses.

With R13 added, the bot wins in ~1:45 with ~45 rats (was ~55 without R13). Its swarm peaks around 50 rats, so it spends the late game at a 1.1 s countdown.

## 5. Open Questions (need the designer's call)
- **Q1:** Should there also be a hard level timer, or is the die-off the only clock (current)?
- **Q2:** Should the die-off speed up as the swarm grows? Currently flat, so a big swarm makes the level easier.
- **Q3:** Should townsfolk react to rats (flee, scream, stomp rats)? Currently no (R9).

## 6. Ideas Parking Lot (not in the game)
- **Chain spread** (designer likes it, parked for later): infected townsfolk pass the plague to healthy people they touch. Would change R8.
- Indicators at the screen edge pointing to nearby healthy townsfolk.
- Combo streak: infections in quick succession give bonus rats.
- Hazards: cats, rat-catchers, or guards that kill rats.
- Townsfolk types: e.g. a doctor who cures, a crowd that clusters at a market.
- A best time and star rating saved per level, with between-level unlocks.
- More levels (districts) with different layouts and targets.

## 7. Change Log
| Date | Change | Approved by |
|------|--------|-------------|
| 2026-10-05 | Document created | Designer |
| 2026-10-05 | Platform locked: browser game (HTML/JS) | Designer |
| 2026-10-05 | Concept recorded; first prototype with rules R1–R11 as Draft | Pending designer review |
| 2026-10-05 | Added R12: minimal minimap of the player and healthy townsfolk | Designer |
| 2026-10-05 | Chain spread moved to Parking Lot (former Q2) | Designer |
| 2026-10-05 | R5 changed to trial: an infection restarts the die-off countdown. Old rule kept as R5a. | Designer |
| 2026-10-05 | R5 (countdown reset on infection) locked | Designer |
| 2026-10-05 | Plague colour changed from green to vibrant purple (V1, V2); green now allowed anywhere (resolves former Q4) | Designer |
| 2026-10-05 | Added V5: buildings rebuilt as individual houses with cleaner, less noisy pixel art, plus a church | Designer |
| 2026-10-05 | Added V4: dirty streets, run-down buildings, churchyards | Designer |
| 2026-10-05 | Added V3 (Bill of Mortality end report) and A3 (Ring a Ring o' Roses music); recorded existing sound as A1, A2 | Designer |
| 2026-10-05 | R11 touch control changed to a bottom-middle virtual joystick; drag-to-move retired as R11a | Designer |
| 2026-10-05 | Added V1 (green = plague only) and V2 (stronger infected look) | Designer |
| 2026-10-05 | Added R13: countdown shortens by 0.1 s per 10 rats above 10 (min 0.5 s) | Designer |
