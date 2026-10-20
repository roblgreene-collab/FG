// Plague Rat: CONFIG and per-level tuning.
'use strict';

// ---------------------------------------------------------------------------
// CONFIG: every tunable number lives here. Mirrored in DESIGN.md §4.
// ---------------------------------------------------------------------------
const CONFIG = {
  population: 140,         // townsfolk in the level
  targetPercent: 60,       // R7: win when this % are infected
  startRats: 8,            // R2: swarm size at level start
  ratsPerInfection: 1,     // R4: rats gained per infection
  decayInterval: 1.5,      // R5: seconds without an infection before a rat dies (swarm of 1-10 rats)
  decayStepEvery: 10,      // R13: every 10 rats above 10...
  decayStep: 0.1,          // R13: ...the countdown gets this many seconds shorter
  decayMin: 0.5,           // R13: the countdown never drops below this
  decayResetOnInfect: true,// R5: true = an infection restarts the countdown; false = old steady die-off (R5a)
  ratSpeed: 80,            // px/s, lead rat
  citizenSpeed: 16,        // px/s, healthy townsfolk
  infectedSpeedMult: 0.6,  // R8: infected townsfolk move slower
  musicEighth: 0.17,       // A3: seconds per eighth note at the calmest tier (lower = faster tune)
  musicVolume: 0.03,       // A3: overall music level (each part is scaled from this)
  infectRadius: 7,         // R3: px distance that counts as touching
  stickDeadZone: 0.15,     // R11: joystick deflection ignored near the centre (0-1)
  stickFullAt: 0.6,        // R11: deflection that gives full speed (0-1)
  businessShare: 0.3,      // V6: share of street-facing houses that are taverns, shops, etc.
  minimapCell: 2,          // R12: map tiles per minimap pixel
  hunterSpeed: 68,         // H4: px/s while chasing or fleeing (rats run at 80)
  hunterFleeSpeed: 56,     // H6: px/s while fleeing, so a big enough swarm can run him down
  hunterWanderSpeed: 22,   // px/s while off screen
  hunterCatchRadius: 6,    // H5: px from the lead rat that counts as caught
  hunterBounty: 5,         // H3: rats gained for eating a hunter
  feastTime: 2.6,          // H7: seconds the devouring animation lasts (everything else is paused)
  floodSlow: 0.65,         // R18: speed multiplier while wading through floodwater
  cartSpeed: 40,           // R20: px/s, horse-drawn carts
  hazardBite: 0.35,        // R17, R20: seconds between rats a single fire or cart can kill
  fireCycle: 5,            // R17: seconds per fire cycle: smoulder, then burn, then out
  fireLit: 1.2,            // R17: ...smoulders (safe) until this point in the cycle
  fireOut: 3.0,            // R17: ...burns (deadly) until this point, then is out
  gateCycle: 7,            // R19: seconds per gate cycle: open, lowering, shut
  gateWarn: 3.6,           // R19: ...open until this point, then the bars start to drop
  gateShut: 4.2,           // R19: ...shut from this point to the end of the cycle
  pointsPerInfection: 1,   // P1: plague points for each person infected
  pointsPerHunter: 3,      // P1: plague points for each hunter eaten
  pointsBaseMult: 0.6,     // P1: District 1 pays this share of the points above...
  pointsPerDistrict: 0.15, // P1: ...and each later district pays this much more (District 10: x1.95)
  streakWindow: 0.9,       // A10: infections this close together climb the scale
  warnRats: 3,             // V22: the low-swarm warning shows at this many rats or fewer
  scatterRadius: 32,       // R9: px, healthy townsfolk this close to a new infection run off
  scatterTime: 1.0,        // R9: seconds they run for
  scatterSpeedMult: 2.5,   // R9: their speed while running, x citizenSpeed
  biteCost: 60,            // P3: price of the super spreader bite
  boostCost: 40,           // P4: price of the speed boost
  biteCharges: 3,          // P3: super spreaders per purchase
  spreaderSpeed: 30,       // P3: px/s, the super spreader staggering to a crowd
  spreaderFuse: 8,         // P3: seconds before the super spreader bursts wherever they are
  blastRadius: 30,         // P3: px, reach of the burst
  spreaderAvoid: 64,       // P3: px, hunters back away from a super spreader this close
  boostCharges: 3,         // P4: dashes per purchase
  boostTime: 3,            // P4: seconds per dash
  boostMult: 1.6,          // P4: speed multiplier during a dash
};

const BASE_CONFIG = { ...CONFIG };
