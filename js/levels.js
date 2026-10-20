// Plague Rat: levels, district maps, obstacles and sewers.
'use strict';

// ---------------------------------------------------------------------------
// Levels (L1-L10). Each level is a district with its own look and difficulty.
// `features` switches on the movement obstacles (R16-R20) for the later districts.
// `tune` overrides CONFIG for that level; `hunters` lists each rat hunter's number (H1).
// `stars` are the time goals in seconds for 2 and 3 stars (R23).
// ---------------------------------------------------------------------------
const LEVELS = [
  { name: 'The Market District', theme: 'market', seed: 1347, blocksX: 7, blocksY: 5, parkChance: 0.12, alleyChance: 0.35,
    tune: { population: 90, targetPercent: 60, startRats: 8 }, stars: [75, 55], hunters: [] },
  { name: 'The Docks', theme: 'docks', seed: 2203, blocksX: 7, blocksY: 5, parkChance: 0.06, alleyChance: 0.3, canalBand: 3,
    tune: { population: 95, targetPercent: 60, startRats: 8 }, stars: [120, 90], hunters: [12, 16] },
  { name: 'The Shambles', theme: 'slums', seed: 3517, blocksX: 7, blocksY: 5, parkChance: 0.08, alleyChance: 0.8,
    tune: { population: 100, targetPercent: 65, startRats: 8 }, stars: [150, 110], hunters: [14, 18, 22],
    features: { sewers: true } },
  { name: 'Frostgate', theme: 'winter', seed: 4441, blocksX: 7, blocksY: 5, parkChance: 0.12, alleyChance: 0.4,
    tune: { population: 100, targetPercent: 65, startRats: 12, decayInterval: 1.4 }, stars: [160, 120], hunters: [14, 18, 22, 26],
    features: { sewers: true } },
  { name: 'The Palace Ward', theme: 'night', seed: 5903, blocksX: 7, blocksY: 5, parkChance: 0.1, alleyChance: 0.3,
    tune: { population: 120, targetPercent: 70, startRats: 12, decayInterval: 1.3 }, stars: [180, 135], hunters: [16, 20, 24, 28, 32],
    features: { sewers: true } },
  { name: 'The Burning Quarter', theme: 'ash', seed: 6131, blocksX: 7, blocksY: 5, parkChance: 0.06, alleyChance: 0.35,
    tune: { population: 125, targetPercent: 70, startRats: 14, decayInterval: 1.3 }, stars: [180, 135], hunters: [16, 20, 24, 28, 32],
    features: { sewers: true, fires: 26 } },
  { name: 'The Drowned Ward', theme: 'flood', seed: 7177, blocksX: 7, blocksY: 5, parkChance: 0.08, alleyChance: 0.35,
    tune: { population: 130, targetPercent: 70, startRats: 14, decayInterval: 1.35 }, stars: [210, 160], hunters: [14, 18, 22, 26, 28],
    features: { sewers: true, flood: 0.4 } },
  { name: 'The Walled Quarter', theme: 'fort', seed: 8209, blocksX: 7, blocksY: 5, parkChance: 0.06, alleyChance: 0.2,
    tune: { population: 140, targetPercent: 72, startRats: 14, decayInterval: 1.25 }, stars: [210, 160], hunters: [14, 18, 22, 26, 30, 34],
    features: { sewers: true, gates: 0.5 } },
  { name: 'The Midsummer Fair', theme: 'fair', seed: 9293, blocksX: 7, blocksY: 5, parkChance: 0.14, alleyChance: 0.25,
    tune: { population: 140, targetPercent: 72, startRats: 14, decayInterval: 1.25 }, stars: [210, 160], hunters: [14, 18, 22, 26, 30, 34],
    features: { sewers: true, carts: 4 } },
  { name: 'The Cathedral Close', theme: 'cathedral', seed: 10331, blocksX: 7, blocksY: 5, parkChance: 0.14, alleyChance: 0.3,
    tune: { population: 160, targetPercent: 75, startRats: 14, decayInterval: 1.25 }, stars: [220, 170], hunters: [14, 18, 22, 26, 28, 32],
    features: { sewers: true, gates: 0.3, fires: 14, carts: 2 } },
];

// Visual themes (V7). Material indexes refer to MATERIALS below.
const THEMES = {
  market: { ground: 'cobble', cobble: { mortar: '#2b231b', stones: ['#4b453d', '#464038', '#514a41', '#413b34', '#48413a', '#3d3730', '#4f463b'] },
    grime: [42, 30, 16, 1], filth: 'rgba(22,16,10,', sewer: true, stains: 300, puddles: 70, litter: 300,
    materials: [0, 1, 2, 3, 4, 5], facades: ['timber', 'timber', 'stone', 'brick', 'shop'], holes: 0.22, boarded: 0.16, units: [24, 32, 40, 48] },
  docks: { ground: 'cobble', cobble: { mortar: '#1f2428', stones: ['#4a5058', '#454b52', '#50565e', '#3f454c', '#4c535a'] },
    grime: [24, 34, 38, 0.9], filth: 'rgba(14,20,22,', sewer: true, stains: 220, puddles: 120, litter: 160, fog: 'rgba(70,95,120,.10)',
    materials: [1, 5, 4, 3], facades: ['brick', 'brick', 'stone', 'timber'], holes: 0.25, boarded: 0.25, units: [48, 96, 48] },
  slums: { ground: 'mud', grime: [30, 22, 12, 1.2], filth: 'rgba(20,14,8,', sewer: false, stains: 380, puddles: 140, litter: 420, laundry: true,
    materials: [2, 2, 4, 3], facades: ['timber'], holes: 0.5, boarded: 0.4, units: [24, 24, 32] },
  winter: { ground: 'snow', grime: null, filth: 'rgba(245,248,252,', sewer: false, stains: 0, puddles: 60, litter: 60, snow: true,
    materials: [0, 1, 2, 3, 4, 5], facades: ['timber', 'stone', 'brick', 'shop'], holes: 0.12, boarded: 0.16, units: [24, 32, 40, 48], tint: 'rgba(150,180,220,.08)' },
  night: { ground: 'flag', flag: { joint: '#3e3a36', stones: ['#6e6a62', '#77726a', '#666259', '#716c63'] }, grime: [20, 18, 16, 0.5], filth: 'rgba(12,10,8,',
    sewer: false, stains: 90, puddles: 40, litter: 60, night: true, lamps: true,
    materials: [1, 5, 0, 3], facades: ['stone', 'stone', 'brick', 'shop'], holes: 0.08, boarded: 0.08, units: [32, 48] },
  ash: { ground: 'cobble', cobble: { mortar: '#1c1816', stones: ['#3e3a37', '#3a3633', '#45403c', '#34302d', '#413c38'] },
    grime: [12, 10, 9, 1.3], filth: 'rgba(10,8,7,', sewer: false, stains: 260, puddles: 30, litter: 120, embers: true, smokeRoofs: 10,
    tint: 'rgba(255,110,40,.07)', materials: [6, 6, 3, 1, 5], facades: ['timber', 'brick', 'stone'], holes: 0.55, boarded: 0.3, units: [24, 32, 40] },
  flood: { ground: 'cobble', cobble: { mortar: '#1d2224', stones: ['#3f474b', '#3a4246', '#454d51', '#373f43'] },
    grime: [20, 30, 32, 0.8], filth: 'rgba(14,20,22,', sewer: false, stains: 120, puddles: 0, litter: 60, rain: true,
    tint: 'rgba(60,90,120,.12)', materials: [1, 5, 2, 4], facades: ['timber', 'brick', 'stone'], holes: 0.2, boarded: 0.25, units: [24, 32, 48] },
  fort: { ground: 'flag', flag: { joint: '#7d776b', stones: ['#b1ab9c', '#a8a293', '#b8b2a3', '#a29c8d'] }, grime: [60, 52, 40, 0.5], filth: 'rgba(40,34,26,',
    sewer: false, stains: 80, puddles: 30, litter: 50, banners: true,
    materials: [1, 5, 0, 1], facades: ['stone', 'stone', 'brick'], holes: 0.05, boarded: 0.05, units: [32, 48] },
  fair: { ground: 'dirt', grime: null, filth: 'rgba(40,30,16,', sewer: false, stains: 60, puddles: 20, litter: 200, bunting: true,
    materials: [8, 9, 10, 2, 0], facades: ['timber', 'shop', 'shop'], holes: 0.05, boarded: 0.05, units: [24, 32], tint: 'rgba(255,220,140,.05)' },
  cathedral: { ground: 'flag', flag: { joint: '#2a2626', stones: ['#4e4a48', '#555150', '#484443', '#5a5654'] }, grime: [16, 12, 12, 0.6], filth: 'rgba(10,8,8,',
    sewer: false, stains: 100, puddles: 40, litter: 40, lamps: true, braziers: true,
    tint: 'rgba(170,40,40,.10)', materials: [7, 7, 1, 5], facades: ['stone', 'stone', 'brick'], holes: 0.1, boarded: 0.1, units: [32, 48] },
};

let LEVEL = LEVELS[0], THEME = THEMES.market, levelIndex = 0;

const TILE = 16, BLOCK = 6, STREET_W = 3, PERIOD = BLOCK + STREET_W;
const T = { STREET: 0, BUILDING: 1, PLAZA: 2, GRASS: 3, TREE: 4, WELL: 5, WALL: 6, WATER: 7 };
const SOLID = new Set([T.BUILDING, T.TREE, T.WELL, T.WALL, T.WATER]);
const blockX0 = b => 1 + STREET_W + b * PERIOD;              // first tile of block b
const inStreetBand = v => (v - 1) % PERIOD < STREET_W;     // tile index lies in a 3-wide street
let BLOCKS_X = 7, BLOCKS_Y = 5, MAP_W = 0, MAP_H = 0, PLAZA_BLOCK, WELL, START;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---------------------------------------------------------------------------
// Map: a fixed district per level (same layout every play). Blocks of 6x6
// tiles separated by 3-wide streets; some blocks are split by alleys or are
// churchyards. The Docks has a canal crossed by bridges.
// ---------------------------------------------------------------------------
let map = new Uint8Array(0);
const roofs = [];
const trees = [];
const bridges = new Set();
const at = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) ? T.WALL : map[y * MAP_W + x];
const set = (x, y, v) => { map[y * MAP_W + x] = v; };

function buildMap(lv) {
  BLOCKS_X = lv.blocksX; BLOCKS_Y = lv.blocksY;
  MAP_W = BLOCKS_X * PERIOD + STREET_W + 2; MAP_H = BLOCKS_Y * PERIOD + STREET_W + 2;
  map = new Uint8Array(MAP_W * MAP_H);
  roofs.length = 0; trees.length = 0; bridges.clear(); ambient.length = 0;
  PLAZA_BLOCK = { bx: Math.floor(BLOCKS_X / 2), by: Math.floor(BLOCKS_Y / 2) };
  WELL = { x: (blockX0(PLAZA_BLOCK.bx) + 2) * TILE + 16, y: (blockX0(PLAZA_BLOCK.by) + 2) * TILE + 16 };
  START = { x: WELL.x, y: WELL.y + 40 };
  const rng = mulberry32(lv.seed);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    let v;
    if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) v = T.WALL;
    else if (inStreetBand(x) || inStreetBand(y)) v = T.STREET;
    else v = T.BUILDING;
    set(x, y, v);
  }
  const fill = (x0, y0, v) => { for (let y = y0; y < y0 + BLOCK; y++) for (let x = x0; x < x0 + BLOCK; x++) set(x, y, v); };
  for (let by = 0; by < BLOCKS_Y; by++) for (let bx = 0; bx < BLOCKS_X; bx++) {
    const x0 = blockX0(bx), y0 = blockX0(by), roll = rng();
    if (bx === PLAZA_BLOCK.bx && by === PLAZA_BLOCK.by) { // market plaza with a well
      fill(x0, y0, T.PLAZA);
      for (const [dx, dy] of [[2, 2], [3, 2], [2, 3], [3, 3]]) set(x0 + dx, y0 + dy, T.WELL);
    } else if (roll < lv.parkChance) { // churchyard
      fill(x0, y0, T.GRASS);
      for (let i = 0; i < 4; i++) {
        const tx = x0 + 1 + Math.floor(rng() * 4), ty = y0 + 1 + Math.floor(rng() * 4);
        if (at(tx, ty) === T.GRASS) { set(tx, ty, T.TREE); trees.push([tx, ty]); }
      }
    } else if (roll < lv.parkChance + lv.alleyChance / 2) { // vertical alley
      const ax = x0 + 2 + Math.floor(rng() * 2);
      for (let y = y0; y < y0 + BLOCK; y++) set(ax, y, T.STREET);
      roofs.push({ x: x0, y: y0, w: ax - x0, h: BLOCK }, { x: ax + 1, y: y0, w: x0 + BLOCK - 1 - ax, h: BLOCK });
    } else if (roll < lv.parkChance + lv.alleyChance) { // horizontal alley
      const ay = y0 + 2 + Math.floor(rng() * 2);
      for (let x = x0; x < x0 + BLOCK; x++) set(x, ay, T.STREET);
      roofs.push({ x: x0, y: y0, w: BLOCK, h: ay - y0 }, { x: x0, y: ay + 1, w: BLOCK, h: y0 + BLOCK - 1 - ay });
    } else {
      roofs.push({ x: x0, y: y0, w: BLOCK, h: BLOCK });
    }
  }
  if (lv.canalBand !== undefined) { // canal along one street band; every other crossing street gets a bridge
    const y0 = 1 + lv.canalBand * PERIOD;
    for (let y = y0; y < y0 + STREET_W; y++) for (let x = 1; x < MAP_W - 1; x++) {
      const band = Math.floor((x - 1) / PERIOD);
      if (inStreetBand(x) && band % 2 === 0) bridges.add(y * MAP_W + x);
      else set(x, y, T.WATER);
    }
  }
  buildHazards(lv);
}

function solidAt(px, py) {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  return tileSolidIdx(ty * MAP_W + tx);
}
function blocked(x, y, hw, hh) {
  return solidAt(x - hw, y - hh) || solidAt(x + hw, y - hh) || solidAt(x - hw, y + hh) || solidAt(x + hw, y + hh);
}

// ---------------------------------------------------------------------------
// R16-R20: movement obstacles for the later districts, and the sewers.
//   R16 sewers: four corner grates, opened by finding the sewer key
//   R17 fires: street fires that smoulder, burn (deadly to rats) and die down
//   R18 flood: flooded streets that halve walking speed
//   R19 gates: portcullises across streets that open and shut on a timer
//   R20 carts: horse-drawn carts running up and down the main streets
// ---------------------------------------------------------------------------
let HAZ = { fires: [], flood: null, gates: [], gateAt: new Map(), lanes: [], grates: [], F: {} };

function buildHazards(lv) {
  const F = lv.features || {}, rng = mulberry32(lv.seed + 4242);
  HAZ = { fires: [], flood: null, gates: [], gateAt: new Map(), lanes: [], grates: [], F };
  const nearStart = (tx, ty, r) => Math.hypot(tx * TILE + 8 - START.x, ty * TILE + 8 - START.y) < r * TILE;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // R20 cart lanes run down the middle row of a street band, avoiding the bands around the start plaza
  if (F.carts) {
    const hb = shuffle([...Array(BLOCKS_Y + 1).keys()].filter(b => b !== PLAZA_BLOCK.by && b !== PLAZA_BLOCK.by + 1));
    const vb = shuffle([...Array(BLOCKS_X + 1).keys()].filter(b => b !== PLAZA_BLOCK.bx && b !== PLAZA_BLOCK.bx + 1));
    for (let i = 0; i < F.carts; i++) {
      const axis = i % 2 ? 'v' : 'h', band = (axis === 'h' ? hb : vb)[i >> 1];
      if (band === undefined) continue;
      const c = (1 + band * PERIOD + 1) * TILE + 8, len = (axis === 'h' ? MAP_W : MAP_H);
      HAZ.lanes.push({ axis, band, c, min: 2 * TILE + 8, max: (len - 3) * TILE + 8 });
    }
  }
  const onLane = (axis, band) => HAZ.lanes.some(l => l.axis === axis && l.band === band);
  // R19 gates: a portcullis across the middle of a street segment
  if (F.gates) {
    const addGate = (tiles, orient) => {
      if (tiles.some(([x, y]) => at(x, y) !== T.STREET || nearStart(x, y, 7) || HAZ.gateAt.has(y * MAP_W + x))) return;
      const g = { tiles, orient, phase: rng() * CONFIG.gateCycle, closed: false, warn: false, x0: tiles[0][0], y0: tiles[0][1] };
      for (const [x, y] of tiles) HAZ.gateAt.set(y * MAP_W + x, g);
      HAZ.gates.push(g);
    };
    for (let bx = 0; bx <= BLOCKS_X; bx++) for (let by = 0; by < BLOCKS_Y; by++) {
      if (rng() >= F.gates || onLane('v', bx)) continue;
      const x0 = 1 + bx * PERIOD, y = blockX0(by) + 3;
      addGate([0, 1, 2].map(k => [x0 + k, y]), 'h');
    }
    for (let by = 0; by <= BLOCKS_Y; by++) for (let bx = 0; bx < BLOCKS_X; bx++) {
      if (rng() >= F.gates || onLane('h', by)) continue;
      const y0 = 1 + by * PERIOD, x = blockX0(bx) + 3;
      addGate([0, 1, 2].map(k => [x, y0 + k]), 'v');
    }
  }
  // R16 sewer grates sit at the four corner crossroads
  if (F.sewers) HAZ.grates = [[2, 2], [MAP_W - 3, 2], [2, MAP_H - 3], [MAP_W - 3, MAP_H - 3]].map(([tx, ty]) => ({ tx, ty, x: tx * TILE + 8, y: ty * TILE + 8 }));
  const nearGrate = (tx, ty) => HAZ.grates.some(g => Math.abs(g.tx - tx) + Math.abs(g.ty - ty) < 4);
  // R17 fires on single street tiles, spaced apart
  for (let n = 0, tries = 0; n < (F.fires || 0) && tries < 6000; tries++) {
    const tx = 1 + Math.floor(rng() * (MAP_W - 2)), ty = 1 + Math.floor(rng() * (MAP_H - 2));
    if (at(tx, ty) !== T.STREET || nearStart(tx, ty, 8) || nearGrate(tx, ty) || bridges.has(ty * MAP_W + tx) || HAZ.gateAt.has(ty * MAP_W + tx)) continue;
    if (HAZ.lanes.some(l => (l.axis === 'h' ? Math.floor(l.c / TILE) === ty : Math.floor(l.c / TILE) === tx))) continue;
    if (HAZ.fires.some(f => Math.abs(f.tx - tx) + Math.abs(f.ty - ty) < 5)) continue;
    HAZ.fires.push({ tx, ty, phase: rng() * CONFIG.fireCycle }); n++;
  }
  // R18 flood: patchy floodwater, with two dry causeways each way (one past the start)
  if (F.flood) {
    const noise = valueNoise(lv.seed + 99, 56), dryH = [PLAZA_BLOCK.by + 1, rng() < 0.5 ? 0 : BLOCKS_Y], dryV = [PLAZA_BLOCK.bx, rng() < 0.5 ? 0 : BLOCKS_X];
    HAZ.flood = new Uint8Array(MAP_W * MAP_H);
    for (let ty = 1; ty < MAP_H - 1; ty++) for (let tx = 1; tx < MAP_W - 1; tx++) {
      if (at(tx, ty) !== T.STREET) continue;
      const bandH = inStreetBand(ty) ? Math.floor((ty - 1) / PERIOD) : -1, bandV = inStreetBand(tx) ? Math.floor((tx - 1) / PERIOD) : -1;
      if (dryH.includes(bandH) || dryV.includes(bandV) || nearGrate(tx, ty)) continue;
      if (noise(tx * TILE, ty * TILE) < F.flood + 0.1) HAZ.flood[ty * MAP_W + tx] = 1;
    }
  }
}
const gateClosedIdx = i => { const g = HAZ.gateAt.get(i); return !!(g && g.closed); };
const tileSolidIdx = i => SOLID.has(map[i]) || gateClosedIdx(i);
const floodAt = (x, y) => !!(HAZ.flood && HAZ.flood[Math.floor(y / TILE) * MAP_W + Math.floor(x / TILE)]);
const slowAt = (x, y) => floodAt(x, y) ? CONFIG.floodSlow : 1;
const firePhase = f => (game.time + f.phase) % CONFIG.fireCycle;
const fireBurning = f => { const p = firePhase(f); return p >= CONFIG.fireLit && p < CONFIG.fireOut; };

function setupHazards(G, rng) {
  G.carts = HAZ.lanes.map(l => ({ ...l, pos: l.min + rng() * (l.max - l.min), dir: rng() < 0.5 ? -1 : 1, anim: 0 }));
  G.hazardCD = 0; G.hasKey = false; G.sewerArmed = true; G.key = null;
  for (const g of HAZ.gates) { g.closed = false; g.warn = false; }
  if (HAZ.grates.length) { // the key sits somewhere well away from the start
    for (let tries = 0; tries < 4000; tries++) {
      const tx = 1 + Math.floor(rng() * (MAP_W - 2)), ty = 1 + Math.floor(rng() * (MAP_H - 2));
      if (at(tx, ty) !== T.STREET || HAZ.gateAt.has(ty * MAP_W + tx) || HAZ.fires.some(f => Math.abs(f.tx - tx) + Math.abs(f.ty - ty) < 2)) continue;
      const x = tx * TILE + 8, y = ty * TILE + 8;
      if (Math.hypot(x - START.x, y - START.y) < TILE * 18) continue;
      if (HAZ.lanes.some(l => Math.abs((l.axis === 'h' ? y : x) - l.c) < 12)) continue;
      G.key = { x, y }; break;
    }
  }
}
const cartPos = c => c.axis === 'h' ? [c.pos, c.c] : [c.c, c.pos];
function cartHits(c, x, y) { const [cx, cy] = cartPos(c); return c.axis === 'h' ? Math.abs(x - cx) < 17 && Math.abs(y - cy) < 8 : Math.abs(x - cx) < 8 && Math.abs(y - cy) < 17; }

// Kills one rat. Followers die where they stand; if the Rat King is hit, the tail rat dies instead.
function hurtRat(i, cols, cause) {
  const G = game, r = G.rats[i];
  if (i === 0) { if (G.hazardCD > 0) return; G.hazardCD = 0.6; i = G.rats.length - 1; }
  const dead = G.rats.splice(i, 1)[0] || r;
  G.hazardKills = (G.hazardKills || 0) + 1; G.lostTo = cause;
  for (let k = 0; k < 7; k++) G.particles.push({ x: dead.x, y: dead.y, vx: (Math.random() - .5) * 26, vy: -10 - Math.random() * 16, life: 0.6, max: 0.6, col: pick(Math.random, cols), size: 1 });
  sfx.die(); jolt(1, 0.15, 15); // V22
}

function updateHazards(dt) {
  const G = game, L = G.rats[0];
  if (!L) return;
  G.hazardCD = Math.max(0, G.hazardCD - dt);
  // R19 gates: shut on their timer, but never on top of anyone
  for (const g of HAZ.gates) {
    const ph = (G.time + g.phase) % CONFIG.gateCycle, want = ph >= CONFIG.gateShut;
    g.warn = ph >= CONFIG.gateWarn && ph < CONFIG.gateShut;
    if (!want) { g.closed = false; continue; }
    if (g.closed) continue;
    const x0 = g.tiles[0][0] * TILE - 4, y0 = g.tiles[0][1] * TILE - 4, x1 = (g.tiles[2][0] + 1) * TILE + 4, y1 = (g.tiles[2][1] + 1) * TILE + 4;
    const inside = e => e.x > x0 && e.x < x1 && e.y > y0 && e.y < y1;
    if (inside(L) || G.citizens.some(inside) || G.hunters.some(h => h.alive && inside(h))) continue;
    g.closed = true;
    if (Math.abs(x0 - L.x) < view.w && Math.abs(y0 - L.y) < view.h) sfx.clank();
  }
  // R17 fires burn any rat standing in the flames
  for (const f of HAZ.fires) {
    f.cd = Math.max(0, (f.cd || 0) - dt);
    if (!fireBurning(f) || f.cd > 0) continue;
    const fx = f.tx * TILE, fy = f.ty * TILE;
    for (let i = G.rats.length - 1; i >= 0; i--) { const r = G.rats[i]; if (r.x > fx - 1 && r.x < fx + 17 && r.y > fy - 1 && r.y < fy + 17) { hurtRat(i, ['#ff9a30', '#f0d060', '#2a2420'], 'fire'); f.cd = CONFIG.hazardBite; break; } }
  }
  // R20 carts trundle back and forth and crush rats in their way
  for (const c of G.carts) {
    c.pos += c.dir * CONFIG.cartSpeed * dt; c.anim += dt;
    if (c.pos > c.max) { c.pos = c.max; c.dir = -1; } else if (c.pos < c.min) { c.pos = c.min; c.dir = 1; }
    c.cd = Math.max(0, (c.cd || 0) - dt);
    if (c.cd <= 0) for (let i = G.rats.length - 1; i >= 1; i--) if (cartHits(c, G.rats[i].x, G.rats[i].y)) { hurtRat(i, ['#a8322c', '#6e5b4c', '#3a2e26'], 'cart'); c.cd = CONFIG.hazardBite; break; }
    if (G.rats.length && cartHits(c, L.x, L.y)) { // the King is knocked to the side of the road
      hurtRat(0, ['#a8322c', '#6e5b4c'], 'cart');
      const side = (c.axis === 'h' ? L.y - c.c : L.x - c.c) >= 0 ? 1 : -1;
      for (const s of [side, -side]) {
        const nx = c.axis === 'h' ? L.x : c.c + s * 16, ny = c.axis === 'h' ? c.c + s * 16 : L.y;
        if (!blocked(nx, ny, 3, 3)) { L.x = nx; L.y = ny; G.trail.unshift({ x: L.x, y: L.y }); break; }
      }
    }
  }
  // R16 the key opens the sewers; an open grate takes the swarm to another at random
  if (G.key && !G.hasKey && Math.hypot(L.x - G.key.x, L.y - G.key.y) < 10) {
    G.hasKey = true;
    for (let k = 0; k < 16; k++) { const a = Math.random() * Math.PI * 2; G.particles.push({ x: G.key.x, y: G.key.y - 4, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30 - 10, life: 0.8, max: 0.8, col: pick(Math.random, ['#ffd75a', '#e0b040', '#fff2b0']), size: 1 }); }
    sfx.key();
  }
  if (G.hasKey) {
    const near = HAZ.grates.find(g => Math.hypot(L.x - g.x, L.y - g.y) < 7);
    if (!near) { if (HAZ.grates.every(g => Math.hypot(L.x - g.x, L.y - g.y) > 16)) G.sewerArmed = true; }
    else if (G.sewerArmed) {
      const others = HAZ.grates.filter(g => g !== near), dest = others[Math.floor(Math.random() * others.length)];
      const burst = (x, y) => { for (let k = 0; k < 14; k++) { const a = Math.random() * Math.PI * 2; G.particles.push({ x, y, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26 - 12, life: 0.6, max: 0.6, col: pick(Math.random, ['#7aa6c2', PLAGUE, '#3a4a40']), size: 1 }); } };
      burst(near.x, near.y);
      G.rats.forEach((r, i) => { r.x = dest.x + (i ? (Math.random() - .5) * 10 : 0); r.y = dest.y + (i ? (Math.random() - .5) * 10 : 0); });
      G.trail = [{ x: dest.x, y: dest.y }];
      G.sewerArmed = false; burst(dest.x, dest.y); sfx.sewer();
    }
  }
}

// ---- drawing -----------------------------------------------------------------
function drawFlame(x, y, t, size) { // a flickering tongue of fire, base at (x, y)
  for (let i = 0; i < 4; i++) {
    const h = size * (0.6 + 0.4 * Math.sin(t * 13 + i * 2.1)), dx = Math.sin(t * 9 + i * 1.7) * 2 + (i - 1.5) * 3;
    ell(ctx, x + dx, y - h * 0.5, 3 - i * 0.3, h * 0.5, '#e05a1c');
    ell(ctx, x + dx, y - h * 0.4, 2 - i * 0.3, h * 0.35, '#ffa030');
    ell(ctx, x + dx, y - h * 0.3, 1, h * 0.2, '#ffe080');
  }
}
function drawHazards(G, ox, oy) {
  const vis = (x, y, m = 24) => x + ox > -m && y + oy > -m && x + ox < view.w + m && y + oy < view.h + m;
  // floodwater shimmer
  if (HAZ.flood) {
    const tx0 = Math.max(0, Math.floor(-ox / TILE)), ty0 = Math.max(0, Math.floor(-oy / TILE));
    for (let ty = ty0; ty < Math.min(MAP_H, ty0 + view.h / TILE + 2); ty++) for (let tx = tx0; tx < Math.min(MAP_W, tx0 + view.w / TILE + 2); tx++) {
      if (!HAZ.flood[ty * MAP_W + tx]) continue;
      ctx.fillStyle = 'rgba(160,200,215,.35)';
      for (let k = 0; k < 2; k++) { const x = tx * TILE + ((G.time * 6 + k * 8 + tx * 5) % 14), y = ty * TILE + 4 + k * 7; ctx.fillRect(Math.round(x + ox), Math.round(y + oy), 3, 1); }
    }
  }
  // fires
  for (const f of HAZ.fires) {
    const x = f.tx * TILE + 8, y = f.ty * TILE + 12;
    if (!vis(x, y)) continue;
    const p = firePhase(f), sx = x + ox, sy = y + oy;
    if (p < CONFIG.fireLit) { // smouldering: a warning
      ctx.globalAlpha = 0.25 + 0.25 * (p / CONFIG.fireLit); disc(ctx, sx, sy - 3, 7, '#ff7a20'); ctx.globalAlpha = 1;
      for (let k = 0; k < 5; k++) { const a = k * 1.3 + G.time * 2; ctx.fillStyle = Math.sin(G.time * 10 + k) > 0 ? '#ff9a30' : '#a03a10'; ctx.fillRect(Math.round(sx + Math.cos(a) * 4), Math.round(sy - 2 + Math.sin(a) * 2), 1, 1); }
      if (Math.random() < 0.1) G.particles.push({ x, y: y - 6, vx: Math.random() * 4 - 2, vy: -12, life: 1, max: 1, col: '#6e6a72', size: 2 });
    } else if (p < CONFIG.fireOut) { // burning
      ctx.globalAlpha = 0.3; disc(ctx, sx, sy - 4, 12, '#ff8a30'); ctx.globalAlpha = 1;
      drawFlame(sx, sy, G.time + f.phase, 14 * Math.min(1, (p - CONFIG.fireLit) * 4, (CONFIG.fireOut - p) * 4));
      if (Math.random() < 0.3) G.particles.push({ x: x + Math.random() * 8 - 4, y: y - 10, vx: Math.random() * 6 - 3, vy: -22, life: 0.6, max: 0.6, col: pick(Math.random, ['#ffa030', '#ffe080']), size: 1 });
    }
  }
  // gates
  for (const g of HAZ.gates) {
    const x = g.tiles[0][0] * TILE + ox, y = g.tiles[0][1] * TILE + oy, w = g.orient === 'h' ? 48 : 16, h = g.orient === 'h' ? 16 : 48;
    if (x > view.w + 8 || y > view.h + 8 || x + w < -8 || y + h < -8) continue;
    const drop = g.closed ? 1 : g.warn ? Math.min(1, ((G.time + g.phase) % CONFIG.gateCycle - CONFIG.gateWarn) / (CONFIG.gateShut - CONFIG.gateWarn)) : 0;
    // stone gate towers either side of the street, and the iron groove the bars drop into
    ctx.fillStyle = '#2a2a2e'; g.orient === 'h' ? ctx.fillRect(x, y + 6, w, 4) : ctx.fillRect(x + 6, y, 4, h);
    ctx.fillStyle = '#55555c'; g.orient === 'h' ? ctx.fillRect(x, y + 7, w, 1) : ctx.fillRect(x + 7, y, 1, h);
    const posts = g.orient === 'h' ? [[x - 5, y + 2], [x + w - 1, y + 2]] : [[x + 2, y - 5], [x + 2, y + h - 1]];
    for (const [px, py] of posts) {
      const pw = g.orient === 'h' ? 6 : 12, ph = g.orient === 'h' ? 12 : 6;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(px + 2, py + 2, pw, ph);
      ctx.fillStyle = '#6e6a62'; ctx.fillRect(px, py, pw, ph); ctx.fillStyle = '#8e897e'; ctx.fillRect(px, py, pw, 2); ctx.fillStyle = '#4a4740'; ctx.fillRect(px, py + ph - 1, pw, 1);
    }
    if (drop <= 0) { // raised: the bottom spikes of the portcullis hang just in view
      ctx.fillStyle = '#7a7a84'; for (let k = 3; k < (g.orient === 'h' ? w : h); k += 5) g.orient === 'h' ? ctx.fillRect(x + k, y + 4, 1, 2) : ctx.fillRect(x + 4, y + k, 2, 1);
      continue;
    }
    ctx.globalAlpha = 0.35 + drop * 0.65;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x + 2, y + 3, w, h);
    ctx.fillStyle = '#2a2a2e';
    if (g.orient === 'h') { for (let k = 2; k < w; k += 5) ctx.fillRect(x + k, y + 2, 2, 12); ctx.fillRect(x, y + 4, w, 2); ctx.fillRect(x, y + 10, w, 2); ctx.fillStyle = '#7a7a84'; for (let k = 2; k < w; k += 5) ctx.fillRect(x + k, y + 2, 1, 12); }
    else { for (let k = 2; k < h; k += 5) ctx.fillRect(x + 2, y + k, 12, 2); ctx.fillRect(x + 4, y, 2, h); ctx.fillRect(x + 10, y, 2, h); ctx.fillStyle = '#7a7a84'; for (let k = 2; k < h; k += 5) ctx.fillRect(x + 2, y + k, 12, 1); }
    ctx.globalAlpha = 1;
  }
  // sewer grates: plain iron covers until the key is found, then open holes
  for (const gr of HAZ.grates) {
    if (!vis(gr.x, gr.y)) continue;
    const sx = gr.x + ox, sy = gr.y + oy;
    if (!G.hasKey) {
      disc(ctx, sx + 1, sy + 1, 8, 'rgba(0,0,0,.35)'); disc(ctx, sx, sy, 8, '#3a3a40'); disc(ctx, sx, sy, 6, '#2a2a2e');
      ctx.fillStyle = '#55555c'; for (let k = -4; k <= 4; k += 2) ctx.fillRect(sx + k, sy - 5, 1, 11);
      ctx.fillStyle = '#6a6a72'; ctx.fillRect(sx - 6, sy - 1, 1, 1); ctx.fillRect(sx + 5, sy, 1, 1);
    } else {
      ctx.globalAlpha = 0.25 + 0.12 * Math.sin(G.time * 4); disc(ctx, sx, sy, 12, PLAGUE); ctx.globalAlpha = 1;
      disc(ctx, sx, sy, 8, '#4a4a50'); disc(ctx, sx, sy, 6, '#050405');
      ctx.fillStyle = '#5a4434'; for (let k = -2; k <= 4; k += 3) ctx.fillRect(sx - 3, sy + k, 6, 1);   // ladder rungs going down
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(sx + 7, sy - 9, 8, 8); ctx.fillStyle = '#55555c'; ctx.fillRect(sx + 8, sy - 8, 6, 1); // the cover, slid aside
    }
  }
  // the sewer key
  if (G.key && !G.hasKey && vis(G.key.x, G.key.y)) {
    const sx = Math.round(G.key.x + ox), sy = Math.round(G.key.y + oy - 3 + Math.sin(G.time * 3) * 2);
    ctx.globalAlpha = 0.3 + 0.15 * Math.sin(G.time * 5); disc(ctx, sx, sy, 8, '#ffd75a'); ctx.globalAlpha = 1;
    ctx.fillStyle = '#5a3a10'; ctx.fillRect(sx - 6, sy - 3, 6, 6); ctx.fillRect(sx - 1, sy - 1, 9, 3); ctx.fillRect(sx + 4, sy + 1, 2, 3); ctx.fillRect(sx + 7, sy + 1, 1, 3);
    ctx.fillStyle = '#e0b040'; ctx.fillRect(sx - 5, sy - 2, 4, 4); ctx.fillRect(sx - 1, sy, 8, 1); ctx.fillRect(sx + 4, sy + 1, 1, 2); ctx.fillRect(sx + 6, sy + 1, 1, 2);
    ctx.fillStyle = '#050405'; ctx.fillRect(sx - 4, sy - 1, 2, 2); ctx.fillStyle = '#fff2b0'; ctx.fillRect(sx - 5, sy - 2, 1, 1);
  }
}
function drawCart(c, ox, oy) { // a covered wagon drawn by a horse, seen from above
  const [x, y] = cartPos(c);
  ctx.save(); ctx.translate(Math.round(x + ox), Math.round(y + oy));
  if (c.axis === 'v') ctx.rotate(Math.PI / 2);
  if (c.dir < 0) ctx.scale(-1, 1);
  const bob = Math.round(Math.sin(c.anim * 14));
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-14, -4, 34, 11);
  ctx.fillStyle = '#1d1712'; ctx.fillRect(-12, -8, 4, 2); ctx.fillRect(-12, 6, 4, 2); ctx.fillRect(2, -8, 4, 2); ctx.fillRect(2, 6, 4, 2); // wheels
  ctx.fillStyle = '#5a3d26'; ctx.fillRect(-14, -6, 22, 12); ctx.fillStyle = '#7a5b3b'; for (let k = -13; k < 8; k += 4) ctx.fillRect(k, -6, 2, 12);
  ctx.fillStyle = '#d8cdb0'; ctx.fillRect(-12, -5, 18, 10); ctx.fillStyle = '#b8ad90'; for (let k = -11; k < 6; k += 4) ctx.fillRect(k, -5, 1, 10); // canvas cover
  ctx.fillStyle = '#3a2a1c'; ctx.fillRect(8, -1, 6, 1); ctx.fillRect(8, 1, 6, 1);                                  // shafts
  ctx.fillStyle = '#5a3a22'; ell(ctx, 18, bob * 0.3, 5, 3, '#5a3a22'); ctx.fillStyle = '#4a2e1a'; ctx.fillRect(13, -1, 3, 2); // horse
  ell(ctx, 24, bob * 0.3, 2.5, 2, '#4a2e1a'); ctx.fillStyle = '#1d1712'; ctx.fillRect(15, -3, 6, 1);              // head, mane
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(15 + bob, -4, 2, 1); ctx.fillRect(19 - bob, 3, 2, 1);                   // hooves
  ctx.restore();
}
function drawRain() { // R18 levels: steady rain over the flooded ward
  ctx.fillStyle = 'rgba(180,205,225,.45)';
  const t = performance.now() / 1000;
  for (const f of flakes) {
    const x = ((f.x * view.w - t * 30 * f.s) % view.w + view.w) % view.w, y = ((f.y * view.h + t * 160 * f.s) % view.h + view.h) % view.h;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 3);
  }
}
