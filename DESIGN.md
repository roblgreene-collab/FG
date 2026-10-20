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
- **Campaign:** ten districts in order, each harder and visually distinct. Winning one unlocks the next.
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
| R5 | Die-off countdown: if `decayInterval` seconds pass without an infection, the swarm loses one rat from the tail and the countdown starts again. Every infection restarts the countdown, so as long as the player keeps infecting within the window, no rats die. **Eating a hunter also restarts it** (H7; approved by the designer on 2026-10-20). The countdown length is set by R13. | Locked |
| R5a | *(old R5)* The swarm loses one rat every `decayInterval` seconds, from the tail, at all times, whatever the player does. Still available via `decayResetOnInfect: false`. | Retired (kept for comparison) |
| R6 | **Lose:** the swarm reaches 0 rats. | Draft |
| R7 | **Win:** the infected share of the population reaches `targetPercent` **and** every rat hunter in the level has been eaten. Both must be true; the order doesn't matter. The HUD shows how many hunters are left, and once the target is reached its hunters chip pulses "Eat N more!" (V16). | Draft |
| R7a | *(old R7)* Win as soon as the infected share reaches `targetPercent`, whatever hunters remain. | Retired |
| R8 | Infected townsfolk stay infected and keep wandering, more slowly. They do not spread the plague themselves. | Draft |
| R9 | Townsfolk wander the streets at random and don't chase or avoid the swarm. But when someone within `scatterRadius` (32 px) is infected, the healthy townsfolk there **scatter**: a white "!" pops over each one and they run away from the infection along the streets at `scatterSpeedMult` (2.5×) their walking speed for `scatterTime` (1 s), then go back to wandering. A crowd can't be eaten in one sweep; it has to be herded or cut off. (Answers Q3.) | Draft |
| R10 | Each level is a fixed district (same layout every play). There is no time limit: a level ends through the die-off (R5) or the win (R7). The level clock only counts toward stars (R23). Streets are 3 tiles wide; blocks are 6×6 tiles; the district is 7×5 blocks (68×50 tiles). | Draft |
| R11 | Controls: WASD / arrow keys on keyboard. On touch screens, a virtual joystick sits at the bottom middle of the screen: the leader runs in the direction it is pushed, faster the further it is pushed (full speed at `stickFullAt`, nothing inside `stickDeadZone`). Touching the rest of the screen does nothing. The joystick sits in the bottom HUD bar, off the level (V16), so the camera simply keeps the leader centred in the play area. | Draft |
| R11a | *(old R11 touch control)* Press and drag anywhere on screen; the leader runs toward the finger. Replaced because the hand covered the play area. | Retired |
| R12 | A super-minimal minimap at the left of the bottom HUD bar (V16) shows the whole district with only a few things on it: the player (blinking purple marker), each healthy townsperson (pale dot) and each living rat hunter (H2). No streets, buildings or infected people. On sewer levels it also shows the sewer key (blinking gold square) until it is found, then the four open grates (purple rings) (R16). | Draft |
| R13 | The die-off countdown shrinks as the swarm grows: `decayInterval` (1.5 s) for 1–10 rats, then `decayStep` (0.1 s) shorter for every further `decayStepEvery` (10) rats: 11–20 → 1.4 s, 21–30 → 1.3 s, … 60 → 1.0 s. It never goes below `decayMin` (0.5 s). The countdown gets longer again when the swarm shrinks. The HUD shows the current countdown in seconds next to the bar. | Draft |
| R14 | **Ten levels**, played in order (see §3c). Winning a level unlocks the next; progress is remembered on this device. **Title screen (V21):** the Plague Rat logo, a big **Play** button showing the district it will start ("District 3 · The Shambles"), a **Districts** button with progress ("4 / 10"), and three icon buttons: **How to play** (five one-line tips with icons), **Settings** (sound on/off, which side the powerup buttons sit, screen shake & vibration on/off (V22), watch the opening story, reset progress with an on-page "Yes, reset" / "Cancel" confirmation), and **Intro**. Plague points show in a chip in the corner. **Districts screen:** a header with the star total ("9/30") and plague points, then a scrolling list of cards, one per district, each with a thumbnail of its map, its number and name, its target, hunter count and obstacles as small icons, its best stars once taken (R23), and a lock with "Take <previous district>" while locked; tapping an open card selects it and the Play button pinned at the bottom starts it. After a win the main button goes to the next district; after a loss it retries. Menus scroll on phones; Escape closes a panel or goes back. | Draft |
| R15 | **The well.** Every level has a well at the centre of the district. Each level opens with the swarm climbing out of it one rat at a time (lead rat first) and hopping down to the plaza, with a splash and a squeak. It takes about 1.5–2.5 s. Until the last rat is out, nothing else runs: no control, no countdown, no clock, no townsfolk or hunters moving. Then the level title card appears (R21). | Draft |
| R16 | **Sewers (levels 3–10).** Four round iron grates sit at the four corner crossroads of the district. A **sewer key** lies somewhere on the streets, at least 18 tiles from the start. Until the Rat King touches the key, the grates are just scenery: rats walk over them like any street. The moment the key is picked up, all four grates **open at once** (cover slid aside, black hole with a ladder, purple glow). When the Rat King steps onto an open grate, the whole swarm drops in and comes out of **one of the other three grates, picked at random**, with a splash. To use a sewer again the King must first step away from all grates (more than 1 tile), so arriving doesn't bounce you straight back. The key lasts for the rest of that attempt only. | Draft |
| R17 | **Street fires (levels 6 and 10).** Fire pits on single street tiles, each on its own 5 s cycle (`fireCycle`): **smouldering** (glowing embers and smoke, safe to cross) for 1.2 s, **burning** (tall flames, deadly) until 3.0 s, then **out** (safe) for the rest. A burning fire kills rats standing in it, at most one every `hazardBite` (0.35 s) per fire. If the Rat King is in the flames, the tail rat dies instead (the King never dies to a hazard directly). Fires never sit near the start, a grate, or another fire. | Draft |
| R18 | **Floodwater (level 7).** Patches of street are flooded (dark water with a pale tide line). Anyone wading through moves at `floodSlow` (55%) speed: rats, townsfolk and hunters alike. Two dry **causeways** cross the district each way (one through the start), so there's always a fast route. It rains all level. | Draft |
| R19 | **Portcullises (levels 8 and 10).** Iron gates between stone posts across the middle of some streets, each on its own 7 s cycle (`gateCycle`): **up** (open, spikes just visible) for 3.6 s, **dropping** (bars fading in, a warning) until 4.2 s, then **shut** (solid wall for everyone) for the rest. A gate never drops onto the Rat King, a townsperson or a hunter: it waits until the gap is clear. Hunters path around shut gates. | Draft |
| R20 | **Carts (levels 9 and 10).** Horse-drawn covered carts roll back and forth along whole streets at `cartSpeed` (40 px/s), turning at the map edges. A cart crushes rats it runs over (at most one every `hazardBite` per cart). If it hits the Rat King, the tail rat dies instead and the King is knocked to the side of the road. Carts never use the streets around the start. | Draft |
| R21 | **Level title card.** When the last rat is out of the well, a card rises over the map with: "District N of 10", the district's name, three tiles (the target %, with the number of people to infect; the hunters and their numbers; Sewers, or the starting swarm if there are none), the star time goals and the best time so far (R23), short obstacle tags (Canal, Maze of alleys, Dark, Fires, Flood, Gates, Carts, Find the key) that show their full explanation when tapped, and the powerup shop (P2). Everything stays paused (as in R15) until the player taps **Start** or presses Enter/Space. | Draft |
| R22 | **Pause.** While playing, a pause button sits beside the sound button in the bottom bar (or press Escape or P). Pausing stops everything (the swarm, countdown, clock, townsfolk, hunters, hazards and all sound) and shows a small panel: **Resume** (also Escape, P, Enter or tapping outside the panel), **Restart district**, **Districts** and **Menu**. **Auto-pause:** if the phone switches app, the screen locks or the tab is hidden during a level, the game pauses itself and goes quiet, and waits on the pause panel when you come back; on menus the sound just stops and resumes. Not available on the level title card or end screen, which already wait. | Draft |
| R23 | **Stars for speed.** Winning a district earns **1 star**; finishing under its first time goal earns **2**; under its second, **3** (per-district goals in §3c, set from the test bot's times so a good player can beat them). While playing, the clock sits in the spread meter's label row with three small stars, each dimming when its time goal passes. The level card shows the goals and the best time; the end screen shows the stars popping in, with "New best time!" or the time needed for the next star. The best stars and best time per district are kept on this device (cleared by Reset progress); each district card shows its best stars and the Districts header shows the total. Stars don't unlock anything. | Draft |
| R24 | **District 1 teaches as you play.** Until District 1 has been won once, short tips appear one at a time in a small banner at the top of the play area, each moving on when done: "Push the joystick to run" (or "WASD or arrows to run" on keyboards), until the Rat King has moved a little; "Run into townsfolk to infect them", until the first infection; "Each one adds a rat to your swarm" (3.5 s); "Keep biting! When the timer runs out a rat dies" (4.5 s); "Infect N people to take the district" (4.5 s). They never block play and hide while paused. | Draft |
| R25 | **Swarm milestones.** The first time in a round that the swarm reaches 20, 30 and 40 rats (`swarmMilestones`), a big banner pops up in the middle of the play area: **"Big swarm!"**, **"Huge swarm!"**, **"Mega swarm!"**, with the number underneath. Shrinking and growing back doesn't repeat it; a new attempt starts fresh. | Draft |
| R26 | **Hunter banners.** When a feast ends, a banner says **"Hunter eaten!"** with how many are left ("2 hunters left"); after the last one, **"All hunters eaten!"** (with "Now spread the plague" if the infection target isn't reached yet). Banners (R25, R26) are gothic lettering with a black outline that pops in and fades after about 1.8 s; they never block play, wait their turn if several come at once, freeze while paused and are cleared when the round ends. | Draft |

### Plague points and powerups
| ID | Rule | Status |
|----|------|--------|
| P1 | **Plague points** (currency): **1** for every person infected (any way, including a super spreader's burst) and **3** for every hunter eaten, **scaled by the district**: ×`pointsBaseMult` (0.6) in District 1, rising by `pointsPerDistrict` (0.15) per district to ×1.95 in District 10, so harder districts pay more than replaying easy ones. Fractions carry over between awards, so nothing is lost to rounding. They are added the moment they're earned and kept on this device between levels, **including after a failed level**. The total shows in a chip on the title, Districts and level title card, in the in-game HUD, and the points earned in the attempt show on the end screen ("+N"). Reset progress also sets them back to 0. | Draft |
| P2 | **Buying powerups** happens on the level title card (R21), before Start. You can **own at most one of each** powerup (no stacking); the price is taken straight away. Each powerup is a tile with its icon, name and price; with too few points (or none) its price button is greyed out, and with none at all one line says how to earn them. The full description shows when you hover or long-press the tile. Owned powerups are shown as "Owned" and come into every attempt automatically. **Unused powerups are kept** on this device (after a win, a loss or closing the game) until used. Each powerup gives **3 uses**: once its first use is spent (the first super spreader made, or the first dash), it is used up **at the end of that level**, so any remaining uses are lost then. Reset progress also clears owned powerups. Keys on the card: 1 / 2 buy, Enter or Space starts. | Draft |
| P3 | **Super spreader bite** (`biteCost` 60). Gives **3 bites** for the attempt (`biteCharges`). Tap **Bite** (key 1 / Q, button shows "N left") to ready one; the **next person the swarm infects becomes a super spreader**: glowing green and purple, with a green ring showing the reach of the burst. They stagger along the streets (`spreaderSpeed` 30 px/s) to the nearest crowd of healthy people, and **burst** when they reach it (or after `spreaderFuse` 8 s wherever they are), infecting every healthy person within `blastRadius` (30 px). Each one counts as a normal infection: +1 infected, +1 rat, +1 plague point, countdown restarted. The super spreader is used up in the burst (still counted as infected). The burst **never harms or infects hunters or rats**, and **hunters back away** from a super spreader within `spreaderAvoid` (64 px). Only one super spreader at a time. Once the first bite is used, the bite is spent at the end of that level (P2). | Draft |
| P4 | **Speed boost** (`boostCost` 40). Gives **3 dashes** for the attempt (`boostCharges`). Tap **Boost** (key 2 / E) for `boostTime` (3 s) at `boostMult` (160%) speed for the Rat King (the swarm follows). A dash can't be started while one is running. Once the first dash is used, the boost is spent at the end of that level (P2). | Draft |

**Powerup buttons** sit together on one side of the joystick, set by the handedness option (V17). They react the instant a finger touches them, even while another finger holds the joystick, so the player never has to stop steering; keys 1 / Q and 2 / E work mid-run too. Each button has a pixel-art icon (green-dripping fangs for the bite, a lightning bolt with speed lines for the boost) and shows its state clearly: **none** (faded empty slot), **ready** (lit border, "tap" or "N left"), **armed / active** (fills bright green or gold, glows and pulses; the boost also shows a draining time bar and its bolt shakes), **used** (greyed). On the map, a dripping green ring circles the Rat King while the bite is armed, and gold speed lines stream behind him during a dash.

**Plague points on screen:** the top HUD bar shows the current total in a chip at the end of its status row (purple coin icon, flashes when it goes up), and the shop on the title card shows it large ("purse") and updates as you buy.

### Rat hunters (built from the designer's H-rules)
| ID | Rule | Status |
|----|------|--------|
| H1 | Rat hunters walk the level. Each has a **number above his head**: red while he's dangerous, **cyan** once he's prey (was gold; changed so it can't be confused with the gold sewer key). Numbers are fixed per hunter (see §3c). | Draft |
| H2 | Hunters are **highlighted on the minimap** as larger squares: red while dangerous, cyan when prey. Purple stays the plague's colour (V1). | Draft |
| H3 | When the swarm is **equal to or larger than** his number, he is **killable**: any rat in the swarm touching him kills him, and the swarm gains `hunterBounty` (**5**) rats when the feast ends (H7). | Draft |
| H4 | While the swarm is **smaller** than his number, he **chases the swarm as soon as he appears on screen**, pathing along the streets toward the lead rat. He runs at `hunterSpeed` (68 px/s), a little slower than the rats (80). If he drops off screen he loses track and goes back to wandering. A whistle and a "!" mark the start of a chase. | Draft |
| H5 | **Caught = fail.** He catches the swarm only by **touching the lead rat** while the swarm is smaller than his number. Touching other rats does nothing. | Draft |
| H6 | When the swarm is **equal to or larger than** his number he **stops chasing and flees** whenever he's on screen, running along the streets away from the lead rat at `hunterFleeSpeed` (56 px/s, slower than his chase so a big swarm can run him down). Off screen he wanders. This switches instantly whenever the swarm crosses his number, in either direction. | Draft |
| H7 | **The feast.** Eating a hunter plays a 2.6 s animation (`feastTime`): the rats swarm in and circle him while he shakes, pile on until he disappears (crunching, gore), then pull back to reveal his skeleton, which fades away. During the feast **everything else is paused**: player control, the die-off countdown, the level clock, townsfolk and other hunters. When it ends the 5 bonus rats appear ("+5"), the die-off countdown restarts (R5) and play resumes. | Draft |
| H8 | **Arrows to the hunters.** At all times, every living hunter who is off screen gets a small bobbing arrow at the edge of the play area pointing toward him, in his colour (red dangerous, cyan prey) with his number beside it. Hunters on screen get no arrow. | Draft |
| H9 | **Warning flash.** A prey (cyan) hunter flashes red and cyan (about 3 times a second) while the swarm is only `hunterWarnMargin` (3) rats or fewer above his number, so losing a few more rats would turn him dangerous. His outline, his number, his arrow (H8) and his minimap square all flash together; he stops flashing once the swarm grows clear of him, and turns solid red if it drops below his number. | Draft |

## 3a. Visual Language
| ID | Rule | Status |
|----|------|--------|
| V1 | **Purple means plague.** Vibrant purple is reserved for the plague: infected people, the rats' haze, the plague HUD and effects. Healthy townsfolk never wear purple. Green is allowed anywhere (grass, trees, moss, clothes, awnings). | Draft |
| V1a | *(old V1)* Green means plague; nothing healthy shows green. | Retired |
| V2 | Infected townsfolk are marked by: lavender-grey skin, dark plague sores on face and arm, clothes dulled toward deep purple, a bright purple outline, a pulsing purple glow on the ground, and rising purple bubbles. Healthy townsfolk have a thin dark outline. | Draft |
| V3 | **Bill of Mortality.** Every end screen (win or lose) has a comic death report styled after the old London Bills of Mortality, folded away behind a "Bill of Mortality" button that opens it in place. It lists up to 5 gross, cartoonish causes picked at random from a pool of 20, with numbers that add up to the number of people infected that run. A new mix every play. **End screen (V21):** a headline ("District taken" with a gold crown, or "Swarm died out", "Caught!" or "Hunters escaped"), a bar showing how far the spread got against the target marker, captioned with the % infected and the time, the % needed, the hunter who caught you, or how many hunters were left; three tiles (top swarm, hunters eaten, plague points earned); then the main button (Next district / Try again) and Districts and Menu buttons. | Draft |
| V4 | **A filthy district.** Streets: uneven cobbles with missing stones, patchy mud, filth banked against walls, an open sewer channel down the middle of main streets, puddles (clear and murky), stains and a little litter. Parks are churchyards: green grass with tufts and flowers, a clean dirt path, headstones in rows, fresh graves, leafy and dead trees. Layout is the same every play (seeded). | Draft |
| V5 | **Buildings are rows of individual houses.** Each block is split into 2–4 houses (24–48 px wide), and deep blocks have a back row of roofs too, so no two blocks look alike. Neighbouring houses never share a roof material. Roofs are drawn as clean shaded planes lit from the top-left: hipped (four faces) or gabled (two), in six materials (terracotta, slate, thatch, old tile, wooden shingle, lead) with tidy tile rows, ridge and hip lines. Wear comes from a few deliberate details instead of random specks: moss clumps, holes with rafters (some boarded over), chimneys, dormer windows. Each house has its own street-facing wall: timber-framed plaster (sometimes with X braces or fallen plaster), stone, brick, or a shopfront with a striped awning. Windows are dark, candle-lit, shuttered or boarded; doors are arched, and some carry a red plague cross. One landmark church per level: a long slate nave, a bell tower with a gold cross, stained-glass windows and a double door, placed beside a churchyard. | Draft |
| V6 | **Taverns, shops and trades.** About 30% of street-facing houses (`businessShare`) are businesses, cycling through: tavern (×2 in the cycle, needs a wider house), bakery, butcher, smithy, apothecary, cobbler, chandler. Each has a hanging iron sign with a pixel icon (tankard, loaf, ham, anvil, bottle, boot, candle), its own wall type and goods out front: taverns get barrels, a bench, all windows lit and a flickering lantern; bakeries flour sacks and bread; butchers a chopping block, blood and hams on the wall; smithies an anvil, iron bars and a glowing open forge; apothecaries a window of coloured bottles and drying herbs; cobblers boots on a bench; chandlers candles and a crate. Bakeries and smithies have smoking chimneys. Business doors never carry a plague cross. Purely visual: no effect on gameplay. | Draft |
| V7 | **Each level has its own look** (§3c): Market District (brown cobbles, all roof types), The Docks (blue-grey wet stone, a canal with plank bridges and moored rowboats, brick warehouses with slate and lead roofs, sea fog), The Shambles (mud streets with ruts and planks, thatch and shingle shacks, many holes and boarded windows, laundry strung across streets, more dead trees), Frostgate (snow-covered streets with trampled tracks and footprints, snow on roofs and chimney caps, icicles, frozen puddles, bare snowy trees, falling snow, cold tint), The Palace Ward (grand flagstones, stone and brick fronts, iron street lamps, and night: the screen is dark except around the swarm, lamps, lit businesses, infected people and the hunters' lanterns). | Draft |
| V8 | **Richer pixel art, still clean.** Detail comes from shading and structure, never random specks. Townsfolk are 10×13 sprites in four outfits (capped tunic, bare-headed tunic, dress with apron and headscarf, hooded robe), each with lit and shaded skin and cloth, eyes, belt or apron, and two walking frames. Rats are 14×7 with a dark back, lighter belly, ear, red eye and tail, and a soft outline. Hunters have a wide-brimmed hat, dark cloak, red sash, buckled belt and a dead rat hanging from it. Figures cast a soft oval shadow. Roofs darken toward the eaves and catch light near the ridge. Every building front has a kerb of dressed stones, windows have stone sills and timber lintels, and doors have a worn step. | Draft |
| V9 | **The well** sits in a ring of radiating setts: a curb of 16 shaded stones lit from the top-left, dark water with a ripple and glint, oak posts, a winch beam with rope wound on its drum, a crank handle, and a bucket on the rim. In Frostgate the curb and beam carry snow and the water is frozen. | Draft |
| V10 | **Opening story.** On launch a black screen says "Tap or press any key to begin" (browsers only allow sound after a tap). Then a ~23 s side-on pixel-art cutscene plays on a letterboxed stage with captions at the top: **1. The street (0–6 s)**: the designer's painted street (V19). A rat scurries in between the townsfolk's feet, sniffs at a woman's sack and is shooed off, darts to some crumbs by a man with a tankard, gets kicked spinning through the air, and bolts down a drain. *"The people of the city kicked us and chased us away."* **2. The sewer (6–12 s)**: the rats huddle trembling on a ledge in the dark, red eyes glinting, water dripping; the street rat drops through the grate and swims over. *"So we hid below, in the dark and the filth."* **3. The plague (12–18 s)**: purple sickness pours from a broken pipe into a glowing pool. The lead rat creeps over and drinks, turns purple with a burst, then the rest rush in and turn one by one; they rise together as the screen flashes purple. *"Then the sickness came down the drains. We drank it gladly."* **4. The title (18–23 s)**: "Plague Rat" glows in, and a purple swarm streams across. *"Now the city will catch what we carry."* Any tap or key skips straight to the title screen. It plays on every launch; "Watch the intro" on the title screen replays it. | Draft |
| V11 | **The opening story is drawn in a higher-resolution style** than the game, so it feels like its own illustrated piece while keeping the game's palette and character designs. The stage is 480×270 (twice the old one) and is drawn on its own full-resolution canvas. Characters are built from shaded shapes rather than tiny sprites, so they can animate properly: rats have a fur-shaded body, belly, ear, glinting eye, whiskers, a curling tail and running legs; townsfolk walk with swinging arms, the man lifts his boot to stamp, and the woman swings her broom with both arms. Backdrops: the street has a banded night sky with stars, a moon and drifting cloud, a skyline with a church spire, jettied timber-framed houses with leaded diamond windows, shutters, plaster stains, exposed brick, arched doors with hinges, a bullseye-glass shop window, a hanging tavern sign, a flickering wall lantern, chimney smoke, perspective cobbles, a puddle and a drain. The sewer has a brick arch with radiating stones, moss and slime, a pipe on brackets, a ladder up to a grate, a light shaft with drifting dust and its broken reflection in the water. | Retired (replaced by V18) |
| V12 | **Portrait phones are the primary target.** On screens taller than they are wide (width/height under 1.2), the opening story zooms in so the stage fills about 68% of the screen height, sitting below the caption, and a camera pans across the wider scene to follow the action: the rat at its crumbs, the stamp and sweep, the dash to the drain; the huddle and the grate; the pool as the rats drink; the swarm under the title. Landscape screens still show the whole stage. | Draft |
| V13 | **Rat designs and the Rat King.** In the game, rats are generated from shapes (16×8 top-down): a tapered body lit from the top-left with a dark spine, a pointed snout, ears, red eyes, a whip tail and paws that patter as they run. **The lead rat (the one the player steers) is the Rat King**: bigger (21×11), black-furred, with glowing purple eyes, a purple outline and a small gold crown, so the player can always pick it out of the swarm. In the opening story (V20), the rat that drinks first is crowned with a burst of gold and becomes the Rat King: larger and black-furred, it leads the swarm under the title. | Draft |
| V14 | **Studio logo.** After "Tap to begin" and before the opening story, the Pixel Mullet logo plays: a 10-second silent portrait video ("A bit of fun, brought to you by" types out, then the mullet character and the PIXEL MULLET wordmark), shown full-screen on portrait phones and centred over a matching cyan-to-pink gradient elsewhere. A tap or key skips to the story. Files: `assets/pixel-mullet-intro.mp4` (H.264, as supplied) with a WebM copy as a fallback; if neither can play, the game goes straight to the story. "Watch the intro" replays only the story. | Draft |
| V15 | **Districts 6–10 each have their own look.** **6 The Burning Quarter:** dark soot-black cobbles, charred roofs, smoke rising from smouldering roofs with drifting embers, an orange cast; scorched rings of stones mark each fire pit. **7 The Drowned Ward:** wet blue-grey cobbles, floodwater with tide lines, steady rain, a cold blue cast. **8 The Walled Quarter:** pale limestone flags, stone and slate garrison buildings hung with heraldic banners, portcullis gates. **9 The Midsummer Fair:** packed straw-strewn dirt, striped red, blue and gold tents among the houses, strings of pennant bunting across the streets, a warm summer cast. **10 The Cathedral Close:** dark flagstones, green verdigris roofs, iron lamp posts and flaming braziers along the streets, a deep red cast. On all five, the sewer grates and the gold sewer key are drawn on the street. On sewer levels a HUD chip shows the sewer status ("Find the key" / "Sewers open", V16); the obstacle tips are on the title card (R21). | Draft |
| V16 | **Framed HUD bars.** While playing, the screen is split into three: a **top bar** in the menu style (V21): the plague spread meter (a framed bar with the target marker; its label row has a target icon, "Plague spread" (just "Spread" on narrow screens), the clock with its stars (R23) and the %), a swarm tile (rat count over the die-off countdown), then one row of icon chips that always fit on one line: hunters ("3 left", "Eat 2 more!" pulsing gold once the target is reached, "All eaten" in green), the sewer key ("Find the key" / "Sewers open") and plague points, the **level** in the middle, and a **bottom bar** (minimap on the left with the pause (R22) and sound buttons under it, powerup buttons, and the joystick on touch screens or a short controls reminder on keyboards). Nothing is drawn over the level. Both bars are dark panels in a simple frame: an earthy border with a black outline, a faint purple inner line, a small brass stud in each corner, a faint diagonal texture, and a row of square "teeth" along the edge that faces the level. On short screens the bars and joystick shrink a little. **On landscape screens** (wider than 1.2 × their height) the bars stand at the **sides** of the level instead: the HUD bar on the left (meter, swarm, status stacked), the controls bar on the right (minimap, joystick or controls reminder, powerup buttons, sound), with the teeth on the edges facing the level. Menus, the title card and end screens still appear over the whole screen. | Draft |
| V17 | **Handedness.** Settings has a "Powerup buttons" option, remembered on this device: **Left of stick (right-handed, default)** or **Right of stick (left-handed)**. Right-handed: the controls bar reads minimap · Bite · Boost · joystick. Left-handed: it is mirrored to joystick · Bite · Boost · minimap. In landscape the two buttons stack beside the joystick, and for left-handed players the side bars swap too, so the controls bar (with the joystick) is on the left and the HUD bar on the right. | Draft |
| V18 | **Opening story art: bright storybook pixel painting** (after the designer's reference image). Clean flat colour with one shadow and one light tone per material, no noisy texture, and a soft dark-brown outline traced round every figure. **The street** is the designer's own painting (V19). **Rats** are brown with pink ears, nose, feet and tail; plague rats turn bright purple with pale spots; the Rat King is near-black with a gold crown. **The sewer** is the same clean style: tidy brickwork, a pale stone arch, a dark tunnel mouth, a green pipe on brackets, a wooden ladder up to a bright grate, stone ledge slabs and teal water with ripples. **The title** shows the town's rooftops in silhouette, their windows lighting up purple one by one as the swarm runs past. The story, timing, captions and portrait camera (V10, V12) are unchanged. | Retired (replaced by V19, V20) |
| V19 | **The street scene is the designer's painting** (`assets/intro-street.jpg`, 1408×768), shown full width with its painted rat removed and its tavern sign repainted to read **THE RAT & CROWN** (cream pixel capitals on the green board, slanted to follow the sign). The townsfolk stay still; only the rat is animated (the painted rat, cut out and reused so it matches the art): it scurries, bobs and tilts as it runs, hops when shooed and spins through the air when kicked. The people react only with effects: a red "!" over their heads, white motion swooshes at their feet and dust bursts. A small drain is added at the left for the escape. On portrait phones the story is framed wider (over half the stage is visible, centred on screen), so the camera only drifts after the rat instead of panning hard. If the image can't be read as pixels (e.g. the game opened straight from a file) the drawn rat stands in. | Draft |
| V20 | **The sewer and title match the painting.** **Sewer:** painted on a coarse grid (each cell = four of the painting's pixels) and scaled up the same way: bevelled brick walls with damp and green streaks, a pale stone vault, a tunnel mouth stepping back into the dark with a faint far light, a copper pipe on iron brackets, the broken rusty pipe, a wooden ladder up to a grate letting in daylight, a stone ledge with moss, a bone, a skull and a broken crate, and teal water with ripples. It is lit from the grate, with the light stepped into bands like the painting's shading; dust, drips, the light shaft and ripples are animated on top. **Drinking:** the same sewer; purple ooze pours from the pipe into a glowing pool. **Title:** the painted street by night (deep blue-purple), its windows, tavern door and lantern glowing plague-purple one by one, purple mist drifting, while the swarm floods through led by the Rat King. **Rats** in every scene are the rat from the painting: brown, recoloured purple once infected, or near-black for the Rat King with a gold crown painted on his head in the painting's chunky pixels; a purple glow sits beneath infected rats. Rats are drawn back to front, so nearer rats overlap farther ones; at the pool the King stands just behind the front row, so his crown shows above the pile without covering the rats in front of him. | Draft |
| V21 | **Menus.** Few words, big buttons and icon badges instead of paragraphs. Every panel uses the same frame as the HUD bars (earthy border, black outline, faint purple inner line, brass corner studs, faint diagonal texture, a row of teeth along the bottom edge; district cards leave out the teeth). Headings use the gothic pixel font (Jacquard 12), everything else Pixelify Sans. Main buttons are big and plague-purple with a pressed-in edge and an optional small sub-label; secondary buttons are dark with a brass border; icon buttons are square brass-framed tiles with a label underneath. Icons are small pixel drawings: target (spread %), skull (hunters), grate (sewers), lock, tick, scroll, cog, film, question mark and one per obstacle. The title, Districts, How to play and Settings sit over the painted street at night with a purple glow; the level card and end screen sit over the dimmed map. On touch screens no button is auto-focused; with a keyboard the main button is. | Draft |
| V22 | **Shake, buzz and the low-swarm warning.** The picture shakes briefly (and phones vibrate) on big moments, in game pixels: caught by a hunter (7, strongest), the swarm dying out (5), a super spreader burst (5), a feast starting (4), a district won (3, shake only), and a rat lost to a fire or cart (2, a small tick). The shake is a fast wobble that dies away and moves only the picture, never the camera or the controls. **Vibration** works where the browser allows it (Android phones; it may be blocked when the game is shown inside another page). iPhones don't let web pages vibrate, so there the game instead taps a hidden switch control, which gives a small haptic tick on iOS 18 and later (best effort). A Settings option **Shake & buzz** turns both off; it starts off on devices set to reduce motion. **Low-swarm warning:** with `warnRats` (3) rats or fewer, a red glow pulses in from the edges of the play area, stronger and faster as the die-off countdown runs down, the swarm tile's border flashes red, and a heartbeat (A9) plays each time the countdown passes halfway. | Draft |

## 3b. Audio
| ID | Rule | Status |
|----|------|--------|
| A1 | Short synth sound effects: a low blip when a rat dies, and a short chirp when a feast's bonus rats appear. (The infection sound now follows A10; win and lose jingles follow A8.) | Draft |
| A2 | One "Sound" button (in the bottom bar beside the pause button while playing, the Sound setting in Settings, or the M key) mutes and unmutes everything, music included. | Draft |
| A3 | Background music: "Ring a Ring o' Roses" as a driving chase theme. The nursery-rhyme melody is played by a punchy saw/square lead over a darker A-minor progression (Am Am Am Em F F G Am, then an instrumental fill bar over E that pulls back to Am). Two verses alternate: plain, then ornamented with passing notes. 6/8 time; tempo and layers follow A5. It plays during a level (including the well intro and feasts) and fades out at the end screen. | Draft |
| A3a | *(old A3)* Music-box square-wave melody over a slow triangle bass, about 12 s per loop. | Retired |
| A3b | *(second A3)* Gentle small-band arrangement in C major: rounded lead, chord pad, bass, arpeggio, frame drum, reverb; fixed tempo (0.24 s per eighth). Replaced because it lacked pace. | Retired |
| A4 | A rising whistle when a hunter starts chasing; a crunch when the swarm eats a hunter. | Draft |
| A5 | **The music builds with the plague.** Five tiers, chosen on each bar line from the spread so far (as a share of the level's target): **0** (under 25%) lead, kick on the beats, bass pulse; **1** (25%+) adds a snare backbeat, running bass and an arpeggio; **2** (50%+) adds hi-hats, a harmony line, a string pad and an octave-pumping bass; **3** (75%+) doubles the lead an octave up, adds off-beat hats, an extra kick and snare rolls into each verse; **4** (target reached but hunters still alive) adds a shrill high pad for the final hunt. Each tier is a little faster (eighth note 170 → 163 → 156 → 150 → 143 ms) and a cymbal crash marks every step up. | Draft |
| A6 | **Intro jingle**, scored to the cutscene: a slow, low statement of the rhyme over a drone on the street, with hits on the stamp, a whoosh for the broom, a scurrying run and a drop for the drain; a cold drone, a heartbeat and drip notes in the sewer; climbing chords, a quickening bass and a noise riser through the drinking, with a big hit on the transformation; then the rhyme at full gallop with drums and harmony over the title, ending on a held A-minor chord. Skipping fades it out. | Draft |
| A7 | **Logo startup sound**, an original 90s-console-style sting synchronised to the Pixel Mullet video (it starts when the video starts playing, so it stays in step): a dark synth chord swelling open under the typed text with soft typing ticks (0.5–3 s); a deep boom, a falling whoosh and a crystal shimmer as the mullet appears (3.3 s); a rising bell chime for each letter of PIXEL MULLET (3.9–6 s); then a lush, wide chord bloom with a shimmering top that fades out with the video (6.2–10 s). Skipping the logo fades it out. | Draft |
| A8 | **End-of-level jingles**, played with the music instruments as the end screen appears (about 0.7 s after the level ends; the chase music stops first). **Win:** a ~2.5 s triumphant fanfare in A major: a snare flam, a bright lead with harmony over A → D → E with driving bass and drums, a snare roll, then a crash on a held A chord with a rising sparkle. **Lose:** a ~4 s sad tune in A minor: a slow falling lead with harmony over Am → Dm → E → low Am with heartbeat kicks, ending on a falling squeak. They follow the Sound setting and fade out if the next level starts while they're still ringing. Replaces the old win/lose beeps from A1. | Draft |
| A9 | A soft double heartbeat thump for the low-swarm warning (V22). | Draft |
| A10 | **Infection sound** (chosen from samples): a rat squeak plus a short sick "ugh" from the person (the voice's pitch varies each time), loud enough to be heard clearly over the music. **Streaks climb:** each infection within `streakWindow` (0.9 s) of the last plays its squeak one step higher on an A-minor pentatonic scale (A5 C6 D6 E6 G6 A6 C7 D7 E7, the music's key), staying on the top note after that; a longer gap starts again at the bottom. Many infections in the same instant (a super spreader burst) sound once. | Draft |
| A11 | **Scatter scream:** a short panicked "eek!" when townsfolk scatter from a nearby infection (R9), quieter than the infection sound and at most one every 0.35 s. | Draft |
| A12 | **Realistic sound palette** (chosen from samples; on by default with `realisticSounds`). Sounds that stand for something real are synthesised to sound like it, in several variants each, picked at random with a slight speed change so nothing repeats exactly: **rat squeaks** (fast warbling chirps around 3–5 kHz; on infection they still climb the A10 scale) and **dying squeals** when a rat dies; **infection**: a squeak plus a wet chesty cough (1–3 coughs) or a sick groan; **scatter**: short women's and men's screams (A11); **hunter spots the swarm**: a man shouting "Oi!" or "Hey!" (replaces A4's whistle); **feast**: the hunter screams, then bone crunches, wet tearing, squelches and squealing rats (replaces A4's crunch); **super spreader burst**: a wet pop and splatter with droplets, then coughing; **portcullis**: a heavy iron clank with ringing bars; **sewer key**: a jingle of keys; **sewer drop**: a splash with bubbles. Voices are built like a real voice (a buzzing vocal-cord pulse with natural wobble and breath, shaped into vowels by the throat's resonances). Menu and powerup sounds (buy, arm, boost, bonus chirp), the heartbeat (A9) and the music are unchanged. The sounds are made when sound first starts, a little each frame, so the game never stalls. **To go back** to the earlier synth sounds, set `realisticSounds` to false. | Draft |

## 3c. Levels
| # | Name | Theme | Townsfolk | Target | Start rats | Countdown (`decayInterval`) | Hunters (numbers) | ★★ / ★★★ under (R23) | Layout notes |
|---|------|-------|-----------|--------|-----------|-----------|-----------|------|------|
| 1 | The Market District | market | 90 | 60% | 8 | 1.5 s | none | 1:05 / 0:50 | Mixed blocks, a few alleys and churchyards |
| 2 | The Docks | docks | 95 | 60% | 8 | 1.5 s | 12, 16 | 1:50 / 1:20 | A canal cuts the district in two; only 4 bridges cross it |
| 3 | The Shambles | slums | 100 | 65% | 8 | 1.5 s | 14, 18, 22 | 2:30 / 2:00 | Most blocks split by alleys: a maze. **Sewers** from here on (R16) |
| 4 | Frostgate | winter | 100 | 65% | 12 | 1.4 s | 14, 18, 22, 26 | 2:15 / 1:50 | Sewers |
| 5 | The Palace Ward | night | 120 | 70% | 12 | 1.3 s | 16, 20, 24, 28, 32 | 2:40 / 2:15 | Dark: you only see what's lit. Sewers |
| 6 | The Burning Quarter | ash | 125 | 70% | 14 | 1.3 s | 16, 20, 24, 28, 32 | 2:50 / 2:20 | **Sewers** (R16) + 26 street **fires** (R17) |
| 7 | The Drowned Ward | flood | 130 | 70% | 14 | 1.35 s | 14, 18, 22, 26, 28 | 3:15 / 2:45 | Sewers + **floodwater** over ~40% of the streets, dry causeways (R18) |
| 8 | The Walled Quarter | fort | 140 | 72% | 14 | 1.25 s | 14, 18, 22, 26, 30, 34 | 3:00 / 2:30 | Sewers + ~40 **portcullis gates** (R19) |
| 9 | The Midsummer Fair | fair | 140 | 72% | 14 | 1.25 s | 14, 18, 22, 26, 30, 34 | 3:10 / 2:40 | Sewers + 4 **cart** routes (R20) |
| 10 | The Cathedral Close | cathedral | 160 | 75% | 14 | 1.25 s | 14, 18, 22, 26, 28, 32 | 3:30 / 3:00 | Sewers + 14 fires + ~16 gates + 2 carts: everything at once |

Hunters start at least 16 tiles from the swarm and at least 10 tiles from each other.

## 3d. Balance Notes
Results from the test bot (`tools/bot.js`): it plays a district headless, knows where everyone is, paths to the nearest healthy townsperson or killable hunter, keeps clear of dangerous hunters and hazards, and never uses the sewers or powerups. Newest results first.

**2026-10-20 build (pause, stars, scatter, hunter countdown reset, district points; `tools/bot.js` fast mode, 10 games per district).** The bot now steps the game directly with no drawing, so 100 games take about 3 minutes. Same 10 games per district on the build from before these changes, for comparison:

| District | Wins now | Winning times now | Wins before |
|---|---|---|---|
| 1 | 10/10 | 0:55–1:03 | 10/10 |
| 2 | 8/10 | 1:02–2:30 | 10/10 |
| 3 | 10/10 | 1:48–2:44 | 8/10 |
| 4 | 8/10 | 1:54–2:26 | 10/10 |
| 5 | 6/10 | 2:23–2:58 | 6/10 |
| 6 | 3/10 | 2:00–3:00 | 2/10 |
| 7 | 6/10 | 2:55–3:18 | 6/10 |
| 8 | 2/10 | 2:24–2:52 | 3/10 |
| 9 | 3/10 | 2:18–3:23 | 1/10 |
| 10 | 3/10 | 3:06–3:39 | 4/10 |

Overall 59/100 now against 60/100 before: scattering townsfolk (R9) and the countdown reset after a feast (R5) roughly cancel out. Most losses on districts 6–10 still have 1–4 hunters left. The star goals (§3c) were set from these times: ★★ around the bot's typical winning time, ★★★ about 20% faster, which should take the sewers, powerups or a sharper route. The bot never uses the sewers or powerups, so a good player should beat it.

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

## 3e. Planned Mechanics (designer's ideas, NOT in the build yet)
Status **Planned** = recorded for later; not built until the designer says so.

*(None at the moment. The Rat Hunter, H1–H6, was built on 2026-10-06. See §3.)*

## 4. Tunable Numbers
All live in the `CONFIG` object in `js/config.js`. Tuning these never changes a rule.

| Name | Value | Notes |
|------|-------|-------|
| `population` / `targetPercent` / `startRats` | per level | See §3c |
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
| `pointsPerInfection` / `pointsPerHunter` | 1 / 3 | Plague points earned, before the district scaling (P1) |
| `pointsBaseMult` / `pointsPerDistrict` | 0.6 / 0.15 | District 1 pays ×0.6; each later district adds 0.15 (District 10: ×1.95) (P1) |
| `scatterRadius` / `scatterTime` / `scatterSpeedMult` | 32 px / 1 s / 2.5 | Townsfolk this close to an infection run off for this long at this × their speed (R9) |
| `realisticSounds` | true | true = the realistic sound palette (A12); false = the earlier synth sounds |
| `streakWindow` | 0.9 s | Infections this close together climb the scale (A10) |
| `hunterWarnMargin` | 3 | A prey hunter flashes while the swarm is this many rats or fewer above his number (H9) |
| `swarmMilestones` | 20, 30, 40 | Swarm sizes that get a banner (R25) |
| `warnRats` | 3 | Low-swarm warning at this many rats or fewer (V22) |
| `stars` (per level) | see §3c | Time goals for 2 and 3 stars (R23) |
| `biteCost` / `boostCost` | 60 / 40 | Powerup prices in plague points (P2) |
| `biteCharges` | 3 | Super spreader bites per purchase (P3) |
| `spreaderSpeed` / `spreaderFuse` | 30 px/s / 8 s | Super spreader walking speed and time before bursting anyway (P3) |
| `blastRadius` / `spreaderAvoid` | 30 px / 64 px | Burst reach; how close a super spreader makes hunters back away (P3) |
| `boostCharges` / `boostTime` / `boostMult` | 3 / 3 s / 1.6 | Speed boost dashes, length and speed (P4) |
| `gateCycle` / `gateWarn` / `gateShut` | 7 s / 3.6 s / 4.2 s | Gate cycle: up until `gateWarn`, dropping until `gateShut`, then shut (R19) |

## 5. Open Questions (need the designer's call)
- **Q1:** Should there also be a hard level timer, or is the die-off the only clock (current)?

## 6. Ideas Parking Lot (not in the game)
- Businesses with gameplay: e.g. crowds gather outside taverns, the apothecary slows the plague nearby, or the market plaza gets stalls that rats can run under.
- **Chain spread** (designer likes it, parked for later): infected townsfolk pass the plague to healthy people they touch. Would change R8.
- Indicators at the screen edge pointing to nearby healthy townsfolk.
- Combo streak: infections in quick succession give bonus rats.
- More hazards: cats, or guards that kill rats.
- Townsfolk types: e.g. a doctor who cures, a crowd that clusters at a market.
- *(From Claude's review, 2026-10-20, not chosen yet; the chosen ones are now R9, R22–R24, H8, P1 and V22)*
  - **Last hunters come to you:** when only one or two are left they panic and run toward the swarm (would change H6).
  - **Late townsfolk:** new people walk in at the district edges late in the level so the swarm doesn't starve.
  - **Refund on a loss:** if the level is lost, keep the unused bites and dashes (would change P2).
  - **Install and offline:** a web-app manifest and offline cache so it can be added to the home screen and played offline (still a browser game, 1a); bundle the two fonts.
  - **Accessibility options:** a colour-blind check of red/cyan hunter numbers and the green bite ring; separate music and effects volumes.
  - **Tips for later districts:** like R24, a one-time tip the first time a hunter, the sewer key or each obstacle appears.
- *Tried and declined (2026-10-08):* repainting the in-game town and townsfolk to look more like the intro painting. Three mock-ups were made (a flat repaint, a brighter palette, and redrawn people and house fronts); the designer prefers the original in-game style, so it stays as it is.

## 7. Change Log
| Date | Change | Approved by |
|------|--------|-------------|
| 2026-10-20 | Added A12: realistic sound palette (rat squeaks and squeals, coughs, groans, screams, hunter shouts, devouring, splatter, iron clank, keys, splash), chosen from samples. The earlier synth sounds are kept behind `realisticSounds` (set false to revert) | Designer |
| 2026-10-20 | Added H9 (prey hunters flash red when the swarm is within 3 rats of their number; arrows and minimap too), R25 (Big / Huge / Mega swarm banners at 20, 30, 40 rats) and R26 (hunter-eaten banners with how many are left, then All hunters eaten) | Designer |
| 2026-10-20 | New infection sound chosen from samples: squeak plus a sick groan, louder, climbing a scale during quick streaks (A10); scatter scream (A11); the old chirp kept for a feast's bonus rats (A1) | Designer |
| 2026-10-20 | Hunter arrows shown all the time for every off-screen hunter, not only in the endgame (H8; `hunterArrowsAt` removed). Screen shake made much stronger; iPhone haptic fallback added (V22) | Designer |
| 2026-10-20 | From the review, the designer chose: arrows to the last hunters (H8); eating a hunter restarts the die-off countdown (R5, Locked, approved; H7); plague points scale with the district (P1); stars for finishing under per-district time goals (R23, R10); townsfolk scatter from a nearby infection (R9, answers Q3); pause and auto-pause (R22, A2); screen shake and vibration with a Settings switch, and a low-swarm warning with a heartbeat (V22, A9); District 1 tips (R24); test bot moved into the repo (`tools/bot.js`); code split into `style.css` and `js/`; DESIGN.md tidied (section order, rule order, broken table, out-of-date R7/R12/V13/V15/V16/V17 text) | Designer |
| 2026-10-08 | Powerups made pricier so points don't pile up: bite 40 → 60, speed boost 25 → 40. The super spreader bite now gives 3 bites like the boost's 3 dashes; remaining bites are lost at the end of the level where the first was used (P2, P3, P4) | Designer |
| 2026-10-08 | Added A8: triumphant win jingle and sad lose jingle on the end screen, approved from audio samples (replaces the A1 win/lose beeps) | Designer |
| 2026-10-08 | In-game HUD restyled to match the menus: framed spread meter, swarm tile, one row of short icon chips; fixes status text spilling out of the top bar on phones (V16) | Designer |
| 2026-10-08 | Menus redesigned from the approved mock-ups: title with Play / Districts and How to play, Settings, Intro icon buttons; district cards with map thumbnails; compact level card with tappable obstacle tags and powerup tiles; end screen with progress bar, tiles and a folding Bill of Mortality (V21; R14, R21, V3, P1, P2 updated) | Designer |
| 2026-10-08 | In-game art repaint toward the intro style mocked up three ways and declined; original in-game style kept (recorded in §6) | Designer |
| 2026-10-08 | Rat King's crown is part of his own picture and rats are drawn back to front, so the crown shows in the pile without covering rats in front (V20) | Designer |
| 2026-10-08 | Sewer, drinking and title scenes repainted to match the street painting; all rats use the painted rat (V20; V18 retired) | Designer |
| 2026-10-08 | Townsfolk animation in the intro removed again (people stay still); the wider portrait framing stays (V19) | Designer |
| 2026-10-08 | Intro framed wider on portrait phones so the camera pans less; the painted townsfolk now breathe, sway, nod and react (V19, V12) | Designer |
| 2026-10-08 | Tavern sign in the opening street painting changed to "The Rat & Crown" (V19) | Designer |
| 2026-10-08 | Opening street scene now uses the designer's painting with only the rat animated (shooed, kicked, escapes down a drain); caption changed to "kicked us and chased us away" (V19, V10) | Designer |
| 2026-10-08 | Opening story townsfolk rebuilt to look more like the reference figures: shaded tapered limbs, shaped clothes, proper faces (V18) | Designer |
| 2026-10-08 | Opening story redrawn in a bright storybook pixel style from the designer's reference image (V18; old V11 style retired, V13 intro description moved to V18) | Designer |
| 2026-10-08 | Handedness option: both powerup buttons on one side of the joystick, left for right-handed and right for left-handed; landscape side bars swap for left-handed (V17) | Designer |
| 2026-10-08 | Powerup buttons moved beside the joystick and fire on touch-down with a second finger; pixel icons with clear none/ready/armed/used states and on-map effects; plague points shown in the HUD and as a large purse in the shop (P1–P4) | Designer |
| 2026-10-08 | Unused powerups are kept between attempts and levels; a speed boost whose first dash was used is lost (with any remaining dashes) at the end of that level (P2, P4) | Designer |
| 2026-10-08 | Plague points and a powerup shop (P1–P4): super spreader bite and speed boost. Prices, burst size and boost numbers chosen by Claude, pending designer review. HUD bars move to the sides on landscape screens (V16). | Designer |
| 2026-10-08 | HUD, minimap, joystick and sound button moved off the level into framed top and bottom bars (V16; R11, R12 updated) | Designer |
| 2026-10-08 | Prey hunters shown in cyan instead of gold (H1, H2); level title card after the well intro (R21, R15); sewers start at Level 3 instead of 6 (R16, §3d); the HUD tip line replaced by the card (V15). Designer approved the R16–R20 obstacle rules, minimap key marker and hazard tuning. | Designer |
| 2026-10-08 | Ten levels (R14, §3d). New levels 6–10, each with its own look (V15) and a new movement obstacle: street fires (R17), floodwater (R18), portcullis gates (R19), carts (R20). Sewer grates and the sewer key from Level 6 on (R16). Minimap shows the key and open grates (R12). | Designer |
| 2026-10-08 | Balance for levels 6–10: 14 start rats, hunter numbers, townsfolk, flood coverage and `floodSlow`, `hazardBite` (see §4) | Designer |
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
