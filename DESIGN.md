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
- **Level (~1–2 min):** race the die-off of your rats to reach the infection target, while dodging rat hunters until the swarm is big enough to turn on them.
- **Campaign:** five districts in order, each harder and visually distinct. Winning one unlocks the next.
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
| R7 | **Win:** the infected share of the population reaches `targetPercent` **and** every rat hunter in the level has been eaten. Both must be true; the order doesn't matter. The HUD shows how many hunters are left, and once the target is reached it flashes "Target reached · eat N more hunters". | Draft |
| R7a | *(old R7)* Win as soon as the infected share reaches `targetPercent`, whatever hunters remain. | Retired |
| R8 | Infected townsfolk stay infected and keep wandering, more slowly. They do not spread the plague themselves. | Draft |
| R9 | Townsfolk wander the streets at random and do not react to rats. | Draft |
| R10 | Each level is a fixed district (same layout every play). There is no clock; level length comes from the die-off (R5). Streets are 3 tiles wide; blocks are 6×6 tiles; the district is 7×5 blocks (68×50 tiles). | Draft |
| R11 | Controls: WASD / arrow keys on keyboard. On touch screens, a virtual joystick sits at the bottom middle of the screen: the leader runs in the direction it is pushed, faster the further it is pushed (full speed at `stickFullAt`, nothing inside `stickDeadZone`). Touching the rest of the screen does nothing. With the joystick showing, the camera keeps the leader in the middle of the space above it. | Draft |
| R11a | *(old R11 touch control)* Press and drag anywhere on screen; the leader runs toward the finger. Replaced because the hand covered the play area. | Retired |
| R12 | A super-minimal minimap in the bottom-left corner shows the whole district with only two things on it: the player (blinking purple marker), each healthy townsperson (pale dot), and each living rat hunter (H2). No streets, buildings or infected people. On sewer levels it also shows the sewer key (blinking gold square) until it is found, then the four open grates (purple rings) (R16). | Draft |
| R13 | The die-off countdown shrinks as the swarm grows: `decayInterval` (1.5 s) for 1–10 rats, then `decayStep` (0.1 s) shorter for every further `decayStepEvery` (10) rats: 11–20 → 1.4 s, 21–30 → 1.3 s, … 60 → 1.0 s. It never goes below `decayMin` (0.5 s). The countdown gets longer again when the swarm shrinks. The HUD shows the current countdown in seconds next to the bar. | Draft |

| R14 | **Ten levels**, played in order (see §3d). Winning a level unlocks the next; progress is remembered on this device. **Title screen:** "Begin the plague" starts the next level in line, "Choose level" opens a separate level-select screen (list of all ten, locked ones can't be picked, Play and Back buttons), and a small "Reset progress" link opens an on-page confirmation ("Yes, reset" / "Cancel"); confirming locks every district except the first and shows "Progress reset". Menus scroll on phones. After a win the main button goes to the next level; after a loss it retries; "Choose level" on the end screen opens the level select. | Draft |
| R15 | **The well.** Every level has a well at the centre of the district. Each level opens with the swarm climbing out of it one rat at a time (lead rat first) and hopping down to the plaza, with a splash and a squeak. It takes about 1.5–2.5 s. Until the last rat is out, nothing else runs: no control, no countdown, no clock, no townsfolk or hunters moving. | Draft |
| R16 | **Sewers (levels 6–10).** Four round iron grates sit at the four corner crossroads of the district. A **sewer key** lies somewhere on the streets, at least 18 tiles from the start. Until the Rat King touches the key, the grates are just scenery: rats walk over them like any street. The moment the key is picked up, all four grates **open at once** (cover slid aside, black hole with a ladder, purple glow). When the Rat King steps onto an open grate, the whole swarm drops in and comes out of **one of the other three grates, picked at random**, with a splash. To use a sewer again the King must first step away from all grates (more than 1 tile), so arriving doesn't bounce you straight back. The key lasts for the rest of that attempt only. | Draft |
| R17 | **Street fires (levels 6 and 10).** Fire pits on single street tiles, each on its own 5 s cycle (`fireCycle`): **smouldering** (glowing embers and smoke, safe to cross) for 1.2 s, **burning** (tall flames, deadly) until 3.0 s, then **out** (safe) for the rest. A burning fire kills rats standing in it, at most one every `hazardBite` (0.35 s) per fire. If the Rat King is in the flames, the tail rat dies instead (the King never dies to a hazard directly). Fires never sit near the start, a grate, or another fire. | Draft |
| R18 | **Floodwater (level 7).** Patches of street are flooded (dark water with a pale tide line). Anyone wading through moves at `floodSlow` (55%) speed: rats, townsfolk and hunters alike. Two dry **causeways** cross the district each way (one through the start), so there's always a fast route. It rains all level. | Draft |
| R19 | **Portcullises (levels 8 and 10).** Iron gates between stone posts across the middle of some streets, each on its own 7 s cycle (`gateCycle`): **up** (open, spikes just visible) for 3.6 s, **dropping** (bars fading in, a warning) until 4.2 s, then **shut** (solid wall for everyone) for the rest. A gate never drops onto the Rat King, a townsperson or a hunter: it waits until the gap is clear. Hunters path around shut gates. | Draft |
| R20 | **Carts (levels 9 and 10).** Horse-drawn covered carts roll back and forth along whole streets at `cartSpeed` (40 px/s), turning at the map edges. A cart crushes rats it runs over (at most one every `hazardBite` per cart). If it hits the Rat King, the tail rat dies instead and the King is knocked to the side of the road. Carts never use the streets around the start. | Draft |

### Rat hunters (built from the designer's H-rules)
| ID | Rule | Status |
|----|------|--------|
| H1 | Rat hunters walk the level. Each has a **number above his head**: red while he's dangerous, gold once he's prey. Numbers are fixed per hunter (see §3d). | Draft |
| H2 | Hunters are **highlighted on the minimap** as larger squares: red while dangerous, gold when prey. Purple stays the plague's colour (V1). | Draft |
| H3 | When the swarm is **equal to or larger than** his number, he is **killable**: any rat in the swarm touching him kills him, and the swarm gains `hunterBounty` (**5**) rats when the feast ends (H7). | Draft |
| H4 | While the swarm is **smaller** than his number, he **chases the swarm as soon as he appears on screen**, pathing along the streets toward the lead rat. He runs at `hunterSpeed` (68 px/s), a little slower than the rats (80). If he drops off screen he loses track and goes back to wandering. A whistle and a "!" mark the start of a chase. | Draft |
| H5 | **Caught = fail.** He catches the swarm only by **touching the lead rat** while the swarm is smaller than his number. Touching other rats does nothing. | Draft |
| H6 | When the swarm is **equal to or larger than** his number he **stops chasing and flees** whenever he's on screen, running along the streets away from the lead rat at `hunterFleeSpeed` (56 px/s, slower than his chase so a big swarm can run him down). Off screen he wanders. This switches instantly whenever the swarm crosses his number, in either direction. | Draft |
| H7 | **The feast.** Eating a hunter plays a 2.6 s animation (`feastTime`): the rats swarm in and circle him while he shakes, pile on until he disappears (crunching, gore), then pull back to reveal his skeleton, which fades away. During the feast **everything else is paused**: player control, the die-off countdown, the level clock, townsfolk and other hunters. When it ends the 5 bonus rats appear ("+5") and play resumes. | Draft |

## 3a. Visual Language
| ID | Rule | Status |
|----|------|--------|
| V1 | **Purple means plague.** Vibrant purple is reserved for the plague: infected people, the rats' haze, the plague HUD and effects. Healthy townsfolk never wear purple. Green is allowed anywhere (grass, trees, moss, clothes, awnings). | Draft |
| V1a | *(old V1)* Green means plague; nothing healthy shows green. | Retired |
| V2 | Infected townsfolk are marked by: lavender-grey skin, dark plague sores on face and arm, clothes dulled toward deep purple, a bright purple outline, a pulsing purple glow on the ground, and rising purple bubbles. Healthy townsfolk have a thin dark outline. | Draft |
| V3 | **Bill of Mortality.** Every end screen (win or lose) shows a comic death report styled after the old London Bills of Mortality. It lists up to 5 gross, cartoonish causes picked at random from a pool of 20, with numbers that add up to the number of people infected that run. A new mix every play. | Draft |
| V4 | **A filthy district.** Streets: uneven cobbles with missing stones, patchy mud, filth banked against walls, an open sewer channel down the middle of main streets, puddles (clear and murky), stains and a little litter. Parks are churchyards: green grass with tufts and flowers, a clean dirt path, headstones in rows, fresh graves, leafy and dead trees. Layout is the same every play (seeded). | Draft |
| V5 | **Buildings are rows of individual houses.** Each block is split into 2–4 houses (24–48 px wide), and deep blocks have a back row of roofs too, so no two blocks look alike. Neighbouring houses never share a roof material. Roofs are drawn as clean shaded planes lit from the top-left: hipped (four faces) or gabled (two), in six materials (terracotta, slate, thatch, old tile, wooden shingle, lead) with tidy tile rows, ridge and hip lines. Wear comes from a few deliberate details instead of random specks: moss clumps, holes with rafters (some boarded over), chimneys, dormer windows. Each house has its own street-facing wall: timber-framed plaster (sometimes with X braces or fallen plaster), stone, brick, or a shopfront with a striped awning. Windows are dark, candle-lit, shuttered or boarded; doors are arched, and some carry a red plague cross. One landmark church per level: a long slate nave, a bell tower with a gold cross, stained-glass windows and a double door, placed beside a churchyard. | Draft |
| V7 | **Each level has its own look** (§3d): Market District (brown cobbles, all roof types), The Docks (blue-grey wet stone, a canal with plank bridges and moored rowboats, brick warehouses with slate and lead roofs, sea fog), The Shambles (mud streets with ruts and planks, thatch and shingle shacks, many holes and boarded windows, laundry strung across streets, more dead trees), Frostgate (snow-covered streets with trampled tracks and footprints, snow on roofs and chimney caps, icicles, frozen puddles, bare snowy trees, falling snow, cold tint), The Palace Ward (grand flagstones, stone and brick fronts, iron street lamps, and night: the screen is dark except around the swarm, lamps, lit businesses, infected people and the hunters' lanterns). | Draft |
| V8 | **Richer pixel art, still clean.** Detail comes from shading and structure, never random specks. Townsfolk are 10×13 sprites in four outfits (capped tunic, bare-headed tunic, dress with apron and headscarf, hooded robe), each with lit and shaded skin and cloth, eyes, belt or apron, and two walking frames. Rats are 14×7 with a dark back, lighter belly, ear, red eye and tail, and a soft outline. Hunters have a wide-brimmed hat, dark cloak, red sash, buckled belt and a dead rat hanging from it. Figures cast a soft oval shadow. Roofs darken toward the eaves and catch light near the ridge. Every building front has a kerb of dressed stones, windows have stone sills and timber lintels, and doors have a worn step. | Draft |
| V9 | **The well** sits in a ring of radiating setts: a curb of 16 shaded stones lit from the top-left, dark water with a ripple and glint, oak posts, a winch beam with rope wound on its drum, a crank handle, and a bucket on the rim. In Frostgate the curb and beam carry snow and the water is frozen. | Draft |
| V10 | **Opening story.** On launch a black screen says "Tap or press any key to begin" (browsers only allow sound after a tap). Then a ~23 s side-on pixel-art cutscene plays on a letterboxed stage with captions at the top: **1. The street (0–6 s)**: a rat nibbling crumbs is stamped at by a man, swept by a woman with a broom, and escapes down a drain while the man shakes his fist. *"The people of the city kicked us, swept us and stamped on us."* **2. The sewer (6–12 s)**: the rats huddle trembling on a ledge in the dark, red eyes glinting, water dripping; the street rat drops through the grate and swims over. *"So we hid below, in the dark and the filth."* **3. The plague (12–18 s)**: purple sickness pours from a broken pipe into a glowing pool. The lead rat creeps over and drinks, turns purple with a burst, then the rest rush in and turn one by one; they rise together as the screen flashes purple. *"Then the sickness came down the drains. We drank it gladly."* **4. The title (18–23 s)**: "Plague Rat" glows in, and a purple swarm streams across. *"Now the city will catch what we carry."* Any tap or key skips straight to the title screen. It plays on every launch; "Watch the intro" on the title screen replays it. | Draft |
| V14 | **Studio logo.** After "Tap to begin" and before the opening story, the Pixel Mullet logo plays: a 10-second silent portrait video ("A bit of fun, brought to you by" types out, then the mullet character and the PIXEL MULLET wordmark), shown full-screen on portrait phones and centred over a matching cyan-to-pink gradient elsewhere. A tap or key skips to the story. Files: `assets/pixel-mullet-intro.mp4` (H.264, as supplied) with a WebM copy as a fallback; if neither can play, the game goes straight to the story. "Watch the intro" replays only the story. | Draft |
| V15 | **Districts 6–10 each have their own look.** **6 The Burning Quarter:** dark soot-black cobbles, charred roofs, smoke rising from smouldering roofs with drifting embers, an orange cast; scorched rings of stones mark each fire pit. **7 The Drowned Ward:** wet blue-grey cobbles, floodwater with tide lines, steady rain, a cold blue cast. **8 The Walled Quarter:** pale limestone flags, stone and slate garrison buildings hung with heraldic banners, portcullis gates. **9 The Midsummer Fair:** packed straw-strewn dirt, striped red, blue and gold tents among the houses, strings of pennant bunting across the streets, a warm summer cast. **10 The Cathedral Close:** dark flagstones, green verdigris roofs, iron lamp posts and flaming braziers along the streets, a deep red cast. On all five, the sewer grates and the gold sewer key are drawn on the street. A short HUD line under the hunter count gives the district's obstacle tip for the first 6 s, then the sewer status ("Find the sewer key" / "Sewers open"). | Draft |
| V11 | **The opening story is drawn in a higher-resolution style** than the game, so it feels like its own illustrated piece while keeping the game's palette and character designs. The stage is 480×270 (twice the old one) and is drawn on its own full-resolution canvas. Characters are built from shaded shapes rather than tiny sprites, so they can animate properly: rats have a fur-shaded body, belly, ear, glinting eye, whiskers, a curling tail and running legs; townsfolk walk with swinging arms, the man lifts his boot to stamp, and the woman swings her broom with both arms. Backdrops: the street has a banded night sky with stars, a moon and drifting cloud, a skyline with a church spire, jettied timber-framed houses with leaded diamond windows, shutters, plaster stains, exposed brick, arched doors with hinges, a bullseye-glass shop window, a hanging tavern sign, a flickering wall lantern, chimney smoke, perspective cobbles, a puddle and a drain. The sewer has a brick arch with radiating stones, moss and slime, a pipe on brackets, a ladder up to a grate, a light shaft with drifting dust and its broken reflection in the water. | Draft |
| V12 | **Portrait phones are the primary target.** On screens taller than they are wide (width/height under 1.2), the opening story zooms in so the stage fills about 68% of the screen height, sitting below the caption, and a camera pans across the wider scene to follow the action: the rat at its crumbs, the stamp and sweep, the dash to the drain; the huddle and the grate; the pool as the rats drink; the swarm under the title. Landscape screens still show the whole stage. | Draft |
| V13 | **Rat designs and the Rat King.** In the game, rats are generated from shapes (16×8 top-down): a tapered body lit from the top-left with a dark spine, a pointed snout, ears, red eyes, a whip tail and paws that patter as they run. **The lead rat (the one the player steers) is the Rat King**: bigger (21×11), black-furred, with glowing purple eyes, a purple outline and a small gold crown, so the player can always pick it out of the swarm. In the opening story, people are drawn as lean, angular figures in a woodcut-like style: long limbs with knees and pointed shoes, a stooped coat with tails or a long gown with apron and shawl, profile faces with a long skull, brow, sunken eye and hooked nose, a tall felt hat or a starched wimple, flat light and shadow planes and an ink outline. Rats are sleek and arched with a dark saddle, moonlit spine, pointed ear, slanted eye, long whip tail and clawed legs. The rat that drinks first is crowned with a burst of gold and becomes the Rat King: larger and black-furred, it leads the swarm under the title. | Draft |
| V6 | **Taverns, shops and trades.** About 30% of street-facing houses (`businessShare`) are businesses, cycling through: tavern (×2 in the cycle, needs a wider house), bakery, butcher, smithy, apothecary, cobbler, chandler. Each has a hanging iron sign with a pixel icon (tankard, loaf, ham, anvil, bottle, boot, candle), its own wall type and goods out front: taverns get barrels, a bench, all windows lit and a flickering lantern; bakeries flour sacks and bread; butchers a chopping block, blood and hams on the wall; smithies an anvil, iron bars and a glowing open forge; apothecaries a window of coloured bottles and drying herbs; cobblers boots on a bench; chandlers candles and a crate. Bakeries and smithies have smoking chimneys. Business doors never carry a plague cross. Purely visual: no effect on gameplay. | Draft |

## 3b. Audio
| ID | Rule | Status |
|----|------|--------|
| A1 | Short synth sound effects: a squeak on each infection, a low blip when a rat dies, a jingle on win and lose. | Draft |
| A2 | One "Sound" button (bottom right, or the M key) mutes and unmutes everything, music included. | Draft |
| A4 | A rising whistle when a hunter starts chasing; a crunch when the swarm eats a hunter. | Draft |
| A3 | Background music: "Ring a Ring o' Roses" as a driving chase theme. The nursery-rhyme melody is played by a punchy saw/square lead over a darker A-minor progression (Am Am Am Em F F G Am, then an instrumental fill bar over E that pulls back to Am). Two verses alternate: plain, then ornamented with passing notes. 6/8 time; tempo and layers follow A5. It plays during a level (including the well intro and feasts) and fades out at the end screen. | Draft |
| A3a | *(old A3)* Music-box square-wave melody over a slow triangle bass, about 12 s per loop. | Retired |
| A3b | *(second A3)* Gentle small-band arrangement in C major: rounded lead, chord pad, bass, arpeggio, frame drum, reverb; fixed tempo (0.24 s per eighth). Replaced because it lacked pace. | Retired |
| A5 | **The music builds with the plague.** Five tiers, chosen on each bar line from the spread so far (as a share of the level's target): **0** (under 25%) lead, kick on the beats, bass pulse; **1** (25%+) adds a snare backbeat, running bass and an arpeggio; **2** (50%+) adds hi-hats, a harmony line, a string pad and an octave-pumping bass; **3** (75%+) doubles the lead an octave up, adds off-beat hats, an extra kick and snare rolls into each verse; **4** (target reached but hunters still alive) adds a shrill high pad for the final hunt. Each tier is a little faster (eighth note 170 → 163 → 156 → 150 → 143 ms) and a cymbal crash marks every step up. | Draft |
| A6 | **Intro jingle**, scored to the cutscene: a slow, low statement of the rhyme over a drone on the street, with hits on the stamp, a whoosh for the broom, a scurrying run and a drop for the drain; a cold drone, a heartbeat and drip notes in the sewer; climbing chords, a quickening bass and a noise riser through the drinking, with a big hit on the transformation; then the rhyme at full gallop with drums and harmony over the title, ending on a held A-minor chord. Skipping fades it out. | Draft |
| A7 | **Logo startup sound**, an original 90s-console-style sting synchronised to the Pixel Mullet video (it starts when the video starts playing, so it stays in step): a dark synth chord swelling open under the typed text with soft typing ticks (0.5–3 s); a deep boom, a falling whoosh and a crystal shimmer as the mullet appears (3.3 s); a rising bell chime for each letter of PIXEL MULLET (3.9–6 s); then a lush, wide chord bloom with a shimmering top that fades out with the video (6.2–10 s). Skipping the logo fades it out. | Draft |

## 4. Tunable Numbers
All live in the `CONFIG` object at the top of the script in `index.html`. Tuning these never changes a rule.

| Name | Value | Notes |
|------|-------|-------|
| `population` / `targetPercent` / `startRats` | per level | See §3d |
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
| `musicEighth` | 0.17 s | Length of one eighth note at tier 0; each tier above is 4% faster (A5) |
| `musicVolume` | 0.03 | Overall music level; each part is scaled from it (A3) |
| `businessShare` | 0.3 | Share of street-facing houses that are businesses (V6) |
| `hunterSpeed` | 68 px/s | Hunter speed when chasing or fleeing (H4, H6) |
| `hunterFleeSpeed` | 56 px/s | Hunter speed when fleeing (H6) |
| `hunterBounty` | 5 | Rats gained for eating a hunter (H3) |
| `feastTime` | 2.6 s | Length of the feast animation (H7) |
| `hunterWanderSpeed` | 22 px/s | Hunter speed while off screen |
| `hunterCatchRadius` | 6 px | How close to the lead rat counts as caught (H5) |
| `minimapCell` | 2 | Map tiles per minimap pixel (lower = bigger, more detailed minimap) |
| `floodSlow` | 0.55 | Speed multiplier in floodwater (R18) |
| `cartSpeed` | 40 px/s | Cart speed (R20) |
| `hazardBite` | 0.35 s | Fastest a single fire or cart can kill rats, one at a time (R17, R20) |
| `fireCycle` / `fireLit` / `fireOut` | 5 s / 1.2 s / 3.0 s | Fire cycle: smoulder until `fireLit`, burn until `fireOut`, then out (R17) |
| `gateCycle` / `gateWarn` / `gateShut` | 7 s / 3.6 s / 4.2 s | Gate cycle: up until `gateWarn`, dropping until `gateShut`, then shut (R19) |

Balance note: a pathfinding test bot wins Level 1 in about 1:45 with ~20 rats left, but the bot always knows where everyone is. The designer found the level too hard without that knowledge, which is why R12 (minimap) was added. Numbers unchanged pending a replay.

With R5 (countdown reset), the same bot wins in ~1:55 and finishes with ~55 rats: it almost never loses a rat. Bot results at other values: 1.0 s → wins with ~25 rats left; 0.75 s → loses.

With R13 added, the bot wins in ~1:45 with ~45 rats (was ~55 without R13). Its swarm peaks around 50 rats, so it spends the late game at a 1.1 s countdown.

**Five-level build (smaller map, hunters).** The bot now also steers around dangerous hunters and goes after killable ones. Two runs per level:

| Level | Bot result |
|---|---|
| 1 Market District | won, won (~1:00–1:10, 30–40 rats left) |
| 2 The Docks | won, won (~1:10) |
| 3 The Shambles | won, won (~1:05–1:35) |
| 4 Frostgate | caught at 0:17; won at ~2:00 with 14 rats |
| 5 The Palace Ward | caught at 1:24; won at ~1:40 |

## 3d. Levels
| # | Name | Theme | Townsfolk | Target | Start rats | Countdown (`decayInterval`) | Hunters (numbers) | Layout notes |
|---|------|-------|-----------|--------|-----------|-----------|-----------|------|
| 1 | The Market District | market | 90 | 60% | 8 | 1.5 s | none | Mixed blocks, a few alleys and churchyards |
| 2 | The Docks | docks | 95 | 60% | 8 | 1.5 s | 12, 16 | A canal cuts the district in two; only 4 bridges cross it |
| 3 | The Shambles | slums | 100 | 65% | 8 | 1.5 s | 14, 18, 22 | Most blocks split by alleys: a maze |
| 4 | Frostgate | winter | 100 | 65% | 12 | 1.4 s | 14, 18, 22, 26 | |
| 5 | The Palace Ward | night | 120 | 70% | 12 | 1.3 s | 16, 20, 24, 28, 32 | Dark: you only see what's lit |
| 6 | The Burning Quarter | ash | 125 | 70% | 14 | 1.3 s | 16, 20, 24, 28, 32 | **Sewers** (R16) + 26 street **fires** (R17) |
| 7 | The Drowned Ward | flood | 130 | 70% | 14 | 1.35 s | 14, 18, 22, 26, 28 | Sewers + **floodwater** over ~40% of the streets, dry causeways (R18) |
| 8 | The Walled Quarter | fort | 140 | 72% | 14 | 1.25 s | 14, 18, 22, 26, 30, 34 | Sewers + ~40 **portcullis gates** (R19) |
| 9 | The Midsummer Fair | fair | 140 | 72% | 14 | 1.25 s | 14, 18, 22, 26, 30, 34 | Sewers + 4 **cart** routes (R20) |
| 10 | The Cathedral Close | cathedral | 160 | 75% | 14 | 1.25 s | 14, 18, 22, 26, 28, 32 | Sewers + 14 fires + ~16 gates + 2 carts: everything at once |

Hunters start at least 16 tiles from the swarm and at least 10 tiles from each other.

**Balance after R7 (hunters must be eaten) and H3 bounty.** At first, levels 3–5 became nearly unwinnable for the bot: it ate everyone in town and then starved chasing a fleeing hunter, and Level 5's 45 was above the largest swarm it could build (~40–50, because R13 shortens the countdown as the swarm grows). Fixes, all tunables: flee speed 56 instead of 68; Level 4 numbers 14/18/22/26 and 12 starting rats; Level 5 numbers 16/20/24/28/32, 12 starting rats, 120 townsfolk. Bot results after the fixes:

| Level | Bot result |
|---|---|
| 1 | 3/3 won, ~1:00 |
| 2 | 3/3 won, ~2:10–2:40 |
| 3 | 3/3 won, ~2:20–2:30 |
| 4 | 3/4 won, ~2:05–2:55 (the loss starved with one hunter left) |
| 5 | 4/4 won, ~2:30–3:05, infecting nearly all 120 townsfolk (the bot isn't affected by the darkness) |

**Ten-level build (levels 6–10, obstacles and sewers).** The bot now also steps around burning or about-to-burn fires and the road just ahead of a cart; shut gates count as walls. It never uses the sewers, which a player can use to cross the map and escape hunters, so it underrates the player on these levels. These runs were three at a time, which makes the bot react a little slower, so Level 5 was rerun alongside as the yardstick:

| Level | Bot result |
|---|---|
| 5 (yardstick) | 2/4 won |
| 6 | 2/4 won, ~2:25 |
| 7 | 1/3 won, ~3:30; the losses had 1–2 hunters left |
| 8 | 2/4 won, ~3:00–3:10 |
| 9 | 1/4 won, ~3:10 |
| 10 | 1/6 won, ~3:00; most losses had 1–3 hunters left |

On the first numbers (hunters up to 36–40, 12 start rats, a deadly fire or cart killing every rat it touched) the bot won 1 of 15 runs on levels 6–10. Fixes, all tunables: 14 start rats from Level 6; lower hunter numbers on levels 7–10; more townsfolk; floodwater thinned (`flood` 0.4) and `floodSlow` 0.65; each fire or cart kills at most one rat every 0.35 s (`hazardBite`), so obstacles bleed the swarm instead of wiping it.

## 3c. Planned Mechanics (designer's ideas, NOT in the build yet)
Status **Planned** = recorded for later; not built until the designer says so.

*(None at the moment. The Rat Hunter, H1–H6, was built on 2026-10-06. See §3.)*

## 5. Open Questions (need the designer's call)
- **Q1:** Should there also be a hard level timer, or is the die-off the only clock (current)?
- **Q3:** Should townsfolk react to rats (flee, scream, stomp rats)? Currently no (R9).

## 6. Ideas Parking Lot (not in the game)
- Businesses with gameplay: e.g. crowds gather outside taverns, the apothecary slows the plague nearby, or the market plaza gets stalls that rats can run under.
- **Chain spread** (designer likes it, parked for later): infected townsfolk pass the plague to healthy people they touch. Would change R8.
- Indicators at the screen edge pointing to nearby healthy townsfolk.
- Combo streak: infections in quick succession give bonus rats.
- More hazards: cats, or guards that kill rats.
- Townsfolk types: e.g. a doctor who cures, a crowd that clusters at a market.
- A best time and star rating saved per level.

## 7. Change Log
| Date | Change | Approved by |
|------|--------|-------------|
| 2026-10-08 | Ten levels (R14, §3d). New levels 6–10, each with its own look (V15) and a new movement obstacle: street fires (R17), floodwater (R18), portcullis gates (R19), carts (R20). Sewer grates and the sewer key from Level 6 on (R16). Minimap shows the key and open grates (R12). | Designer (obstacle designs, key on minimap and HUD tip line by Claude, pending designer review) |
| 2026-10-08 | Balance for levels 6–10: 14 start rats, hunter numbers, townsfolk, flood coverage and `floodSlow`, `hazardBite` (see §4) | Claude (tuning), pending designer review |
| 2026-10-05 | Document created | Designer |
| 2026-10-05 | Platform locked: browser game (HTML/JS) | Designer |
| 2026-10-05 | Concept recorded; first prototype with rules R1–R11 as Draft | Pending designer review |
| 2026-10-05 | Added R12: minimal minimap of the player and healthy townsfolk | Designer |
| 2026-10-05 | Chain spread moved to Parking Lot (former Q2) | Designer |
| 2026-10-05 | R5 changed to trial: an infection restarts the die-off countdown. Old rule kept as R5a. | Designer |
| 2026-10-05 | R5 (countdown reset on infection) locked | Designer |
| 2026-10-05 | Recorded the Rat Hunter idea (H1–H6) as Planned, for later levels / difficulty; not built | Designer |
| 2026-10-06 | Logo startup sound (A7); reset progress fixed: on-page confirmation instead of a timed double tap, and menus now scroll on phones (R14) | Designer |
| 2026-10-06 | Pixel Mullet studio logo video plays before the opening story (V14) | Designer |
| 2026-10-06 | Stylised woodcut-like people and sleeker rats in the opening story; new in-game rat sprites; the lead rat becomes the crowned Rat King (V13) | Designer |
| 2026-10-06 | Portrait phones are the primary target; the opening story zooms in and pans to follow the action in portrait (V12) | Designer |
| 2026-10-06 | Opening story redrawn in a higher-resolution, more detailed style (V11) | Designer |
| 2026-10-06 | Opening story cutscene with tap-to-begin, skip and replay (V10) and its jingle (A6) | Designer |
| 2026-10-06 | Music rewritten as an action theme that builds in five tiers with the plague spread (A3, A5; previous arrangement retired as A3b) | Designer |
| 2026-10-06 | Art pass (V8), detailed well (V9) and well intro (R15); music rearranged (A3, old A3a retired); title screen split from a separate level select, plus reset progress (R14) | Designer |
| 2026-10-06 | Eating a hunter gives 5 bonus rats (H3); Level 1 has no hunters; win now also needs every hunter eaten (R7, old rule R7a retired); feast animation that pauses play (H7) | Designer |
| 2026-10-06 | Balance tunables after the new win rule: hunter flee speed 56; Level 4 and 5 hunter numbers lowered and start rats raised to 12; Level 5 townsfolk 120 | Claude (tuning), pending designer review |
| 2026-10-06 | Map 20% smaller (84×68 → 68×50 tiles) with 3-wide streets (R10) | Designer |
| 2026-10-06 | Rat hunters built (H1–H6): killable and fleeing at equal-or-more rats, chase on sight, slower than rats, catch only by touching the lead rat | Designer |
| 2026-10-06 | Five levels with rising difficulty and distinct looks (R14, V7, §3d); level select and unlocks | Designer |
| 2026-10-06 | Added A4 (hunter whistle and crunch) | Designer |
| 2026-10-05 | Added V6: taverns, shops and trades with signs, props, lantern glow and chimney smoke | Designer |
| 2026-10-05 | Plague colour changed from green to vibrant purple (V1, V2); green now allowed anywhere (resolves former Q4) | Designer |
| 2026-10-05 | Added V5: buildings rebuilt as individual houses with cleaner, less noisy pixel art, plus a church | Designer |
| 2026-10-05 | Added V4: dirty streets, run-down buildings, churchyards | Designer |
| 2026-10-05 | Added V3 (Bill of Mortality end report) and A3 (Ring a Ring o' Roses music); recorded existing sound as A1, A2 | Designer |
| 2026-10-05 | R11 touch control changed to a bottom-middle virtual joystick; drag-to-move retired as R11a | Designer |
| 2026-10-05 | Added V1 (green = plague only) and V2 (stronger infected look) | Designer |
| 2026-10-05 | Added R13: countdown shortens by 0.1 s per 10 rats above 10 (min 0.5 s) | Designer |
