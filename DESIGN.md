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
| R5 | The swarm loses one rat every `decayInterval` seconds, from the tail, at all times. | Draft |
| R6 | **Lose:** the swarm reaches 0 rats. | Draft |
| R7 | **Win:** the infected share of the population reaches `targetPercent`. | Draft |
| R8 | Infected townsfolk stay infected and keep wandering, more slowly. They do not spread the plague themselves. | Draft |
| R9 | Townsfolk wander the streets at random and do not react to rats. | Draft |
| R10 | A level is a fixed hand-set district (same layout every play). There is no clock; level length comes from the die-off (R5). | Draft |
| R11 | Controls: WASD / arrow keys, or press-and-drag on screen (the leader runs toward the finger/cursor). | Draft |

## 4. Tunable Numbers
All live in the `CONFIG` object at the top of the script in `index.html`. Tuning these never changes a rule.

| Name | Value | Notes |
|------|-------|-------|
| `population` | 140 | Townsfolk in Level 1 |
| `targetPercent` | 60 | 84 infections needed |
| `startRats` | 8 | |
| `ratsPerInfection` | 1 | |
| `decayInterval` | 1.5 s | One rat dies every 1.5 s |
| `ratSpeed` | 80 px/s | |
| `citizenSpeed` | 16 px/s | |
| `infectedSpeedMult` | 0.6 | |
| `infectRadius` | 7 px | How close counts as touching |

Balance note: a pathfinding test bot (which always runs straight to the nearest healthy person) wins Level 1 in about 1:45 with ~20 rats left. A human player will be less efficient, so expect closer runs.

## 5. Open Questions (need the designer's call)
- **Q1:** Should there also be a hard level timer, or is the die-off the only clock (current)?
- **Q2:** Should infected townsfolk spread the plague to others (chain reactions)? Currently no (R8).
- **Q3:** Should the die-off speed up as the swarm grows? Currently flat, so a big swarm makes the level easier.
- **Q4:** Should townsfolk react to rats (flee, scream, stomp rats)? Currently no (R9).

## 6. Ideas Parking Lot (Claude's suggestions, not in the game)
- Indicators at the screen edge pointing to nearby healthy townsfolk, or a minimap.
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
