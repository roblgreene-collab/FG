// Plague Rat: pixel art: tiles, buildings, sprites.
'use strict';

// ---------------------------------------------------------------------------
// Art: everything is drawn as pixels into small canvases.
// ---------------------------------------------------------------------------
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function disc(ctx, cx, cy, r, col) {
  ctx.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

const tileAt = (px, py) => {
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  return tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H ? T.WALL : at(tx, ty);
};
const isGround = (px, py) => { const v = tileAt(px, py); return v === T.STREET || v === T.PLAZA; };

function valueNoise(seed, scale) {
  const rng = mulberry32(seed), W = Math.ceil(MAP_W * TILE / scale) + 2, H = Math.ceil(MAP_H * TILE / scale) + 2;
  const grid = Float32Array.from({ length: W * H }, () => rng());
  return (x, y) => {
    const gx = x / scale, gy = y / scale, ix = Math.floor(gx), iy = Math.floor(gy);
    let fx = gx - ix, fy = gy - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = grid[iy * W + ix], b = grid[iy * W + ix + 1], c = grid[(iy + 1) * W + ix], d = grid[(iy + 1) * W + ix + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}
// Irregular blob made of a few overlapping discs; calls fn(x, y, isEdge) for each pixel.
function blob(rng, cx, cy, size, fn) {
  const parts = Array.from({ length: 2 + Math.floor(rng() * 2) }, () => ({
    x: cx + (rng() - .5) * size, y: cy + (rng() - .5) * size * .6, r: size * (.4 + rng() * .4),
  }));
  const inside = (x, y) => parts.some(p => (x - p.x) ** 2 + ((y - p.y) * 1.3) ** 2 <= p.r * p.r);
  const R = Math.ceil(size * 1.4);
  for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
    if (!inside(x, y)) continue;
    fn(x, y, !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1));
  }
}
const px1 = (g, x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };

function drawCobbleTile(g, px, py, rng) {
  const pal = THEME.cobble;
  g.fillStyle = pal.mortar; g.fillRect(px, py, TILE, TILE); // muddy joints
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    const x = px + cx * 4 + (cy % 2), y = py + cy * 4;
    if (rng() < 0.05) { px1(g, x + 1, y + 1, shade(pal.mortar, 0.7)); continue; } // missing stone
    const base = pick(rng, pal.stones);
    const w = rng() < 0.15 ? 2 : 3;
    g.fillStyle = base; g.fillRect(x, y, w, 3);
    px1(g, x, y, shade(base, 1.2));
    g.fillStyle = shade(base, 0.78); g.fillRect(x, y + 2, w, 1);
  }
}
const PLAZA_FLAGS = { joint: '#463f35', stones: ['#7a6f5e', '#837765', '#72685a', '#6c6253', '#7e715c'] };
function drawFlagTile(g, px, py, rng, pal = PLAZA_FLAGS) {
  g.fillStyle = pal.joint; g.fillRect(px, py, TILE, TILE);
  for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
    const base = pick(rng, pal.stones);
    const x = px + cx * 8, y = py + cy * 8;
    g.fillStyle = base; g.fillRect(x, y, 7, 7);
    g.fillStyle = shade(base, 1.12); g.fillRect(x, y, 7, 1);
    g.fillStyle = shade(base, 0.82); g.fillRect(x, y + 6, 7, 1);
    if (rng() < 0.25) { // crack
      let cx2 = x + 1 + Math.floor(rng() * 5), cy2 = y;
      g.fillStyle = shade(base, 0.6);
      for (let k = 0; k < 6; k++) { g.fillRect(cx2, cy2, 1, 1); cy2++; cx2 += Math.floor(rng() * 3) - 1; cx2 = Math.max(x, Math.min(x + 6, cx2)); }
    }
  }
}
function drawMudTile(g, px, py, rng) {
  g.fillStyle = '#4a3a28'; g.fillRect(px, py, TILE, TILE);
  for (let i = 0; i < 10; i++) px1(g, px + (rng() * 16 | 0), py + (rng() * 16 | 0), pick(rng, ['#3e3022', '#56442f', '#5e4a33']));
  if (rng() < 0.25) { // half-sunk stone
    const x = px + 2 + (rng() * 11 | 0), y = py + 2 + (rng() * 11 | 0);
    g.fillStyle = '#5f574b'; g.fillRect(x, y, 3, 2); px1(g, x, y, '#7a7262'); g.fillStyle = '#3a2e20'; g.fillRect(x, y + 2, 3, 1);
  }
}
function drawSnowTile(g, px, py, rng) {
  g.fillStyle = '#d6dee6'; g.fillRect(px, py, TILE, TILE);
  for (let i = 0; i < 6; i++) px1(g, px + (rng() * 16 | 0), py + (rng() * 16 | 0), pick(rng, ['#c6d0da', '#e8eef4', '#cfd8e1']));
}
function drawGroundTile(g, px, py, rng) {
  if (THEME.ground === 'mud') drawMudTile(g, px, py, rng);
  else if (THEME.ground === 'snow') drawSnowTile(g, px, py, rng);
  else if (THEME.ground === 'flag') drawFlagTile(g, px, py, rng, THEME.flag);
  else if (THEME.ground === 'dirt') drawDirtTile(g, px, py, rng);
  else drawCobbleTile(g, px, py, rng);
}

// The Docks: canal water with stone embankments, plank bridges and moored boats.
function drawCanal(g, rng) {
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const px = tx * TILE, py = ty * TILE, i = ty * MAP_W + tx;
    if (at(tx, ty) === T.WATER) {
      g.fillStyle = '#1e3443'; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = '#284657';
      for (let r = 0; r < 4; r++) { const ox = (r * 5 + tx * 3) % 12; g.fillRect(px + ox, py + r * 4 + 1, 4, 1); }
      if (rng() < 0.3) px1(g, px + (rng() * 14 | 0), py + (rng() * 14 | 0), '#5d8496');
      const wet = (dx, dy) => at(tx + dx, ty + dy) !== T.WATER && !bridges.has((ty + dy) * MAP_W + tx + dx);
      g.fillStyle = '#5a5650';
      if (wet(0, -1)) { g.fillRect(px, py, TILE, 3); g.fillStyle = '#7a756c'; g.fillRect(px, py, TILE, 1); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px, py + 3, TILE, 2); }
      g.fillStyle = '#5a5650';
      if (wet(0, 1)) { g.fillRect(px, py + TILE - 2, TILE, 2); }
    } else if (bridges.has(i)) {
      g.fillStyle = '#6b4f33'; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = '#4a3424'; for (let r = 2; r < TILE; r += 3) g.fillRect(px, py + r, TILE, 1);
      g.fillStyle = '#7d5e3e'; for (let r = 0; r < TILE; r += 3) g.fillRect(px, py + r, TILE, 1);
      const edgeL = !bridges.has(i - 1), edgeR = !bridges.has(i + 1);
      g.fillStyle = '#2e2016';
      if (edgeL) { g.fillRect(px, py, 2, TILE); px1(g, px, py + 7, '#5a4028'); }
      if (edgeR) { g.fillRect(px + TILE - 2, py, 2, TILE); px1(g, px + TILE - 1, py + 7, '#5a4028'); }
    }
  }
  // moored rowboats
  for (let i = 0; i < 14; i++) {
    const tx = 1 + (rng() * (MAP_W - 3) | 0), ty = 1 + LEVEL.canalBand * PERIOD + (rng() * 2 | 0);
    if (at(tx, ty) !== T.WATER || at(tx + 1, ty) !== T.WATER) continue;
    const x = tx * TILE + 2, y = ty * TILE + 4;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 2, y + 2, 22, 7);
    g.fillStyle = '#2e2016'; g.fillRect(x, y + 1, 22, 6); g.fillRect(x + 2, y, 18, 8);
    g.fillStyle = '#7a5b3b'; g.fillRect(x + 2, y + 1, 18, 6);
    g.fillStyle = '#5a3d26'; g.fillRect(x + 3, y + 2, 16, 4);
    g.fillStyle = '#7a5b3b'; g.fillRect(x + 8, y + 1, 2, 6); g.fillRect(x + 14, y + 1, 2, 6);
    g.fillStyle = '#c9b48a'; g.fillRect(x + 20, y + 3, 6, 1); // mooring rope
  }
}

// The Shambles: laundry strung across the streets between houses.
function drawLaundry(g, rng) {
  const CLOTH = ['#d8cdb0', '#a8322c', '#3d5677', '#b08a2e', '#e8e0cc', '#6b7a5a'];
  for (let i = 0; i < 26; i++) {
    const bx = rng() * (BLOCKS_X - 1) | 0, by = rng() * BLOCKS_Y | 0;
    const x0 = (blockX0(bx) + BLOCK) * TILE, x1 = blockX0(bx + 1) * TILE, y = (blockX0(by) + 1) * TILE + (rng() * 48 | 0);
    if (at(blockX0(bx) + BLOCK - 1, (y / TILE) | 0) !== T.BUILDING || at(blockX0(bx + 1), (y / TILE) | 0) !== T.BUILDING) continue;
    for (let x = x0; x < x1; x++) { const sag = Math.round(Math.sin((x - x0) / (x1 - x0) * Math.PI) * 3); px1(g, x, y + sag, '#2a221c'); }
    for (let x = x0 + 4; x < x1 - 6; x += 6 + (rng() * 3 | 0)) {
      const sag = Math.round(Math.sin((x - x0) / (x1 - x0) * Math.PI) * 3), c = pick(rng, CLOTH), w = 3 + (rng() * 2 | 0), h = 4 + (rng() * 3 | 0);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 2, y + sag + 3, w, h);
      g.fillStyle = c; g.fillRect(x, y + sag + 1, w, h);
      g.fillStyle = shade(c, 0.8); g.fillRect(x, y + sag + h, w, 1);
    }
  }
}

// The Midsummer Fair: packed earth trodden with straw.
function drawDirtTile(g, px, py, rng) {
  g.fillStyle = '#8a6e48'; g.fillRect(px, py, TILE, TILE);
  for (let i = 0; i < 9; i++) px1(g, px + (rng() * 16 | 0), py + (rng() * 16 | 0), pick(rng, ['#7c6240', '#967a52', '#80663f', '#9c8258']));
  if (rng() < 0.5) { g.fillStyle = pick(rng, ['#c8a85a', '#b89848']); const x = px + (rng() * 13 | 0), y = py + (rng() * 15 | 0); rng() < .5 ? g.fillRect(x, y, 3, 1) : g.fillRect(x, y, 1, 3); }
  if (rng() < 0.15) { const x = px + 2 + (rng() * 11 | 0), y = py + 2 + (rng() * 11 | 0); g.fillStyle = '#6e5636'; g.fillRect(x, y, 2, 2); px1(g, x, y, '#a88c60'); }
}

// R18: the floodwater itself, so the wet streets read at a glance.
function drawFloodWater(g, rng) {
  const wet = (tx, ty) => HAZ.flood[ty * MAP_W + tx] === 1;
  for (let ty = 1; ty < MAP_H - 1; ty++) for (let tx = 1; tx < MAP_W - 1; tx++) {
    if (!wet(tx, ty)) continue;
    const px = tx * TILE, py = ty * TILE;
    g.fillStyle = 'rgba(30,58,72,.78)'; g.fillRect(px, py, TILE, TILE);
    g.fillStyle = 'rgba(70,110,128,.5)';
    for (let r = 0; r < 4; r++) { const ox = (r * 7 + tx * 5 + ty * 3) % 12; g.fillRect(px + ox, py + r * 4 + 1, 3, 1); }
    if (rng() < 0.2) px1(g, px + (rng() * 14 | 0), py + (rng() * 14 | 0), '#8fb4c4');
    g.fillStyle = 'rgba(160,190,200,.55)'; // a pale tide line where the water meets dry stone
    if (!wet(tx, ty - 1)) g.fillRect(px, py, TILE, 1);
    if (!wet(tx, ty + 1)) g.fillRect(px, py + TILE - 1, TILE, 1);
    if (!wet(tx - 1, ty)) g.fillRect(px, py, 1, TILE);
    if (!wet(tx + 1, ty)) g.fillRect(px + TILE - 1, py, 1, TILE);
  }
}

// R17: soot scorched into the street around every fire pit, and a ring of loose stones.
function drawScorch(g, rng) {
  for (const f of HAZ.fires) {
    const cx = f.tx * TILE + 8, cy = f.ty * TILE + 9;
    blob(rng, cx, cy, 9, (bx, by) => { g.globalAlpha = 0.45; px1(g, bx, by, '#141010'); g.globalAlpha = 1; });
    disc(g, cx, cy, 5, '#1c1612'); disc(g, cx, cy, 3, '#2a1a12');
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.fillStyle = '#5a524a'; g.fillRect(Math.round(cx + Math.cos(a) * 6) - 1, Math.round(cy + Math.sin(a) * 4), 2, 2); px1(g, Math.round(cx + Math.cos(a) * 6) - 1, Math.round(cy + Math.sin(a) * 4), '#7a7068'); }
  }
}

// The Midsummer Fair: strings of pennants across the streets.
function drawBunting(g, rng) {
  const FLAGS = ['#c0443a', '#e8d070', '#3a6aa8', '#ece4cf', '#3f8a4a'];
  const string = (x0, y0, x1, y1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) { const t = k / n, sag = Math.sin(t * Math.PI) * 4; px1(g, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t + sag), '#3a2a1c'); }
    for (let k = 4, j = 0; k < n - 3; k += 5, j++) {
      const t = k / n, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 4), c = FLAGS[j % FLAGS.length];
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + 1, y + 5, 3, 2);
      g.fillStyle = c; g.fillRect(x - 1, y + 1, 4, 1); g.fillRect(x - 1, y + 2, 3, 1); g.fillRect(x, y + 3, 2, 1); px1(g, x, y + 4, c);
      px1(g, x - 1, y + 1, shade(c, 1.15));
    }
  };
  for (let i = 0; i < 40; i++) { // across a vertical street, from block to block
    const bx = rng() * (BLOCKS_X - 1) | 0, by = rng() * BLOCKS_Y | 0, y = (blockX0(by) + 1) * TILE + (rng() * 64 | 0);
    if (at(blockX0(bx) + BLOCK - 1, (y / TILE) | 0) !== T.BUILDING || at(blockX0(bx + 1), (y / TILE) | 0) !== T.BUILDING) continue;
    string((blockX0(bx) + BLOCK) * TILE, y, blockX0(bx + 1) * TILE, y + (rng() * 6 | 0) - 3);
  }
}

// The Walled Quarter: heraldic banners hung from the garrison's walls.
function drawBanners(g, rng) {
  const ARMS = [['#a8322c', '#e8c860'], ['#2f4f8a', '#e8e0cc'], ['#1e1e22', '#c8a040']];
  for (let by = 0; by < BLOCKS_Y; by++) for (let bx = 0; bx < BLOCKS_X; bx++) {
    const ty = blockX0(by) + BLOCK; // the street row below the block
    for (let k = 0; k < 2; k++) {
      if (rng() < 0.45) continue;
      const tx = blockX0(bx) + 1 + (rng() * 4 | 0);
      if (at(tx, ty - 1) !== T.BUILDING || at(tx, ty) !== T.STREET) continue;
      const x = tx * TILE + 5, y = ty * TILE - 13, [c, d] = pick(rng, ARMS);
      g.fillStyle = '#2a2a2e'; g.fillRect(x - 1, y - 1, 9, 1);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 1, y + 1, 7, 12);
      g.fillStyle = c; g.fillRect(x, y, 7, 10); g.fillRect(x, y + 10, 3, 2); g.fillRect(x + 4, y + 10, 3, 2);
      g.fillStyle = shade(c, 0.75); g.fillRect(x + 6, y, 1, 10);
      g.fillStyle = d; g.fillRect(x + 3, y + 2, 1, 6); g.fillRect(x + 1, y + 4, 5, 1); // a cross
    }
  }
}

// The Burning Quarter: smoke rising from smouldering roofs, and glowing embers.
function addEmbers(rng) {
  for (let i = 0; i < (THEME.smokeRoofs || 0) && roofs.length; i++) {
    const r = pick(rng, roofs), x = (r.x + r.w / 2) * TILE + (rng() * 16 - 8), y = (r.y + 1) * TILE + rng() * r.h * 8;
    ambient.push({ type: 'smoke', x, y });
    ambient.push({ type: 'ember', x, y: y + 4, r: 6, col: '#ff6a20' });
  }
}

// The Cathedral Close: iron fire baskets along the streets.
function drawBraziers(g, rng) {
  for (let by = 0; by <= BLOCKS_Y; by++) for (let bx = 0; bx < BLOCKS_X; bx++) {
    if (rng() < 0.5) continue;
    const x = blockX0(bx) * TILE + 24 + (rng() * 48 | 0), y = (1 + by * PERIOD) * TILE + 41;
    if (at((x / TILE) | 0, (y / TILE) | 0) !== T.STREET || at((x / TILE) | 0, ((y + 6) / TILE) | 0) !== T.BUILDING) continue;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 3, y + 3, 8, 2);
    g.fillStyle = '#1e1e22'; g.fillRect(x - 2, y, 1, 4); g.fillRect(x + 2, y, 1, 4); g.fillRect(x - 3, y - 4, 7, 4);
    g.fillStyle = '#3a3a40'; g.fillRect(x - 3, y - 4, 7, 1);
    g.fillStyle = '#ff8a30'; g.fillRect(x - 2, y - 5, 5, 1);
    ambient.push({ type: 'brazier', x, y: y - 6, r: 10, col: '#ff9a40' });
  }
}

// The Palace Ward: iron lamp posts along the streets (their light is drawn at night).
function drawLamps(g, rng) {
  for (let by = 0; by <= BLOCKS_Y; by++) for (let bx = 0; bx < BLOCKS_X; bx++) {
    if (rng() < 0.35) continue;
    const x = blockX0(bx) * TILE + 20 + (rng() * 56 | 0), y = (1 + by * PERIOD) * TILE + 6;
    if (at((x / TILE) | 0, (y / TILE) | 0) !== T.STREET) continue;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1, y + 2, 4, 2);
    g.fillStyle = '#1e1e22'; g.fillRect(x + 1, y - 8, 1, 10);
    g.fillStyle = '#2a2a2e'; g.fillRect(x - 1, y - 11, 5, 4);
    g.fillStyle = '#f4cc6a'; g.fillRect(x, y - 10, 3, 2);
    ambient.push({ type: 'lamp', x: x + 1, y: y - 9, r: 8, col: '#f4b84a' });
  }
}

// Roof materials. faces = [north (lit), west, east, south (shade)]; light comes from the top-left.
const MATERIALS = [
  { name: 'terracotta', kind: 'tile', faces: ['#b8683f', '#a35a37', '#8c4a2e', '#733b25'], line: '#4f2618', ridge: '#d08a5c' },
  { name: 'slate', kind: 'slate', faces: ['#727d8f', '#646e80', '#555e6d', '#464d5a'], line: '#2c313b', ridge: '#8d98aa' },
  { name: 'thatch', kind: 'thatch', faces: ['#a88d55', '#977e4b', '#836c40', '#6d5935'], line: '#4a3d24', ridge: '#5e4c2c' },
  { name: 'old tile', kind: 'tile', faces: ['#93554a', '#814a41', '#6e3f37', '#5a332d'], line: '#3a1f1b', ridge: '#ab6b5f' },
  { name: 'shingle', kind: 'shingle', faces: ['#857160', '#766453', '#665647', '#55473b'], line: '#362c24', ridge: '#9c8676' },
  { name: 'lead', kind: 'slate', faces: ['#626a6e', '#575e62', '#4b5155', '#3f4447'], line: '#25292b', ridge: '#7c8589' },
  { name: 'burnt', kind: 'shingle', faces: ['#3a3230', '#322a28', '#2a2321', '#221c1a'], line: '#100c0b', ridge: '#5a3424' },
  { name: 'verdigris', kind: 'slate', faces: ['#5e9a86', '#548c79', '#477a69', '#3b6758'], line: '#1f3a32', ridge: '#86c2ac' },
  { name: 'red tent', kind: 'tent', faces: ['#c0443a', '#ac3a32', '#962f29', '#7c2722'], line: '#4a1612', ridge: '#e8d070' },
  { name: 'blue tent', kind: 'tent', faces: ['#3a6aa8', '#335e96', '#2b5182', '#24446c'], line: '#13243a', ridge: '#e8d070' },
  { name: 'gold tent', kind: 'tent', faces: ['#d0a040', '#bc8f36', '#a67d2e', '#8c6a26'], line: '#4a3810', ridge: '#c0443a' },
];
const TENT_STRIPE = ['#ece4cf', '#dcd3bd', '#c8bfa9', '#b2aa95'];
const PLASTER = ['#b2a283', '#a79878', '#9d9070', '#b4a27c', '#a09a88'];
const SHUTTERS = ['#4a5e3a', '#5a3a2a', '#3a4a5e', '#6b5233', null];
const AWNINGS = [['#a8322c', '#dccba4'], ['#2f5a8a', '#dccba4'], ['#b08a2e', '#5a3a1c'], ['#3f6b3a', '#dccba4']];
const FACADE_H = 12;
const SNOW_COVER = [0.85, 0.75, 0.55, 0.4];

const rgbCache = new Map();
function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) { const n = parseInt(hex.slice(1), 16); v = [n >> 16, n >> 8 & 255, n & 255]; rgbCache.set(hex, v); }
  return v;
}
function roofTexel(m, f, d, along) {
  const base = m.faces[f], hi = m.hi[f], dk = m.dk[f];
  if (m.kind === 'tile') { const r = d % 4, row = (d / 4) | 0; return r === 3 ? dk : r === 0 ? hi : (along + row * 3) % 6 === 0 ? dk : base; }
  if (m.kind === 'slate') { const r = d % 3, row = (d / 3) | 0; return r === 2 ? dk : (along + (row % 2) * 4) % 8 === 0 ? dk : base; }
  if (m.kind === 'shingle') { const r = d % 3, row = (d / 3) | 0; return r === 2 ? dk : (along * 7 + row * 5) % 9 === 0 ? dk : base; }
  if (m.kind === 'tent') return ((along >> 2) & 1) ? base : TENT_STRIPE[f]; // striped canvas
  const r = d % 6; // thatch: soft bands with a ragged eave
  return d < 2 && along % 3 === 0 ? m.line : r === 5 ? dk : r === 0 ? hi : base;
}

// Draws one roof as clean shaded planes: hip roofs have four faces, gables two.
function drawRoofUnit(g, x, y, w, h, m0, form, k) {
  const m = { ...m0, faces: m0.faces.map(c => shade(c, k)) };
  m.hi = m.faces.map(c => shade(c, 1.12)); m.dk = m.faces.map(c => shade(c, 0.8));
  const img = g.createImageData(w, h), data = img.data, faces = new Int8Array(w * h);
  const put = (i, hex, k = 1) => { const c = rgb(hex), o = i * 4; data[o] = Math.min(255, c[0] * k); data[o + 1] = Math.min(255, c[1] * k); data[o + 2] = Math.min(255, c[2] * k); data[o + 3] = 255; };
  const depth = form === 'gable-h' ? h >> 1 : form === 'gable-v' ? w >> 1 : Math.min(w, h) >> 1;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const dT = py, dB = h - 1 - py, dL = px, dR = w - 1 - px;
    let f;
    if (form === 'gable-h') f = dT <= dB ? 0 : 3;
    else if (form === 'gable-v') f = dL <= dR ? 1 : 2;
    else { const mn = Math.min(dT, dB, dL, dR); f = mn === dT ? 0 : mn === dL ? 1 : mn === dR ? 2 : 3; }
    const d = [dT, dL, dR, dB][f], along = f === 0 || f === 3 ? px : py;
    faces[py * w + px] = f;
    const tex = roofTexel(m, f, d, along);
    const ramp = d <= 1 ? 0.86 : depth - d <= 2 ? 1.07 : 1; // V8: darker at the eaves, catching light near the ridge
    put(py * w + px, THEME.snow ? mix(tex, '#e9eef3', SNOW_COVER[f]) : tex, ramp); // V7: snow lies thickest on the lit slopes
  }
  // ridges and hips where two faces meet, then the eave outline
  const ridgeW = m.kind === 'thatch' ? 2 : 1;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const i = py * w + px, f = faces[i];
    if ((px + 1 < w && faces[i + 1] !== f) || (py + 1 < h && faces[i + w] !== f)) {
      put(i, THEME.snow ? '#f4f7fa' : m.ridge);
      if (ridgeW > 1 && py + 1 < h) put(i + w, THEME.snow ? '#f4f7fa' : m.ridge);
    }
    if (px === 0 || py === 0 || px === w - 1 || py === h - 1) put(i, m.line);
  }
  g.putImageData(img, x, y);
  return m;
}

function drawChimney(g, cx, cy) {
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(cx + 2, cy + 3, 7, 8);
  g.fillStyle = '#7a4a3a'; g.fillRect(cx, cy + 2, 6, 7);
  g.fillStyle = '#5a3428'; g.fillRect(cx, cy + 4, 6, 1); g.fillRect(cx, cy + 7, 6, 1); px1(g, cx + 3, cy + 5, '#5a3428'); px1(g, cx + 1, cy + 8, '#5a3428');
  g.fillStyle = '#94604c'; g.fillRect(cx, cy + 2, 1, 7);
  g.fillStyle = THEME.snow ? '#eef3f7' : '#5c4d44'; g.fillRect(cx - 1, cy, 8, 3);
  g.fillStyle = '#120d0a'; g.fillRect(cx + 1, cy + 1, 4, 1);
}
function drawDormer(g, x, y, m, rng) { // a little gabled window on the street-facing slope, 9x9
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 1, y + 2, 9, 8);
  for (let i = 0; i < 5; i++) { g.fillStyle = m.faces[1]; g.fillRect(x + 4 - i, y + i, i + 1, 1); g.fillStyle = m.faces[2]; g.fillRect(x + 5, y + i, i, 1); }
  g.fillStyle = m.line; g.fillRect(x, y + 4, 9, 1);
  g.fillStyle = pick(rng, PLASTER); g.fillRect(x + 1, y + 5, 7, 4);
  g.fillStyle = '#2e2016'; g.fillRect(x + 2, y + 5, 5, 4);
  g.fillStyle = '#1b242a'; g.fillRect(x + 3, y + 6, 3, 2); px1(g, x + 3, y + 6, '#4b6270');
}
function drawRoofHole(g, x, y, m, rng) {
  const w = 6 + Math.floor(rng() * 3), h = 4;
  g.fillStyle = m.line; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#140e0a'; g.fillRect(x, y, w, h);
  g.fillStyle = '#5a4028'; g.fillRect(x, y + 1, w, 1); g.fillRect(x + 2, y, 1, h);
  if (rng() < 0.5) { // boarded over
    g.fillStyle = '#7a5b3b'; g.fillRect(x - 2, y, w + 4, 2);
    g.fillStyle = '#634a30'; g.fillRect(x - 2, y + 2, w + 4, 1);
    px1(g, x - 1, y, '#2a2a2a'); px1(g, x + w, y, '#2a2a2a');
  }
}
const MOSS = ['.mm..', 'mMMm.', '.mMmm'];
function drawMoss(g, x, y) {
  MOSS.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch !== '.') px1(g, x + xx, y + yy, ch === 'M' ? '#5f7f3a' : '#3f5a2a'); }));
}

function drawWindow(g, x, y, kind, shutter) { // 4x4, with a stone sill below and a timber lintel above
  g.fillStyle = '#3a2a1c'; g.fillRect(x, y - 1, 4, 1);
  g.fillStyle = '#9a927f'; g.fillRect(x - 1, y + 4, 6, 1);
  g.fillStyle = '#2e2016'; g.fillRect(x, y, 4, 4);
  if (kind === 'boarded') {
    g.fillStyle = '#7a5b3b'; g.fillRect(x - 1, y, 6, 1); g.fillRect(x - 1, y + 2, 6, 1);
    g.fillStyle = '#5a4028'; g.fillRect(x - 1, y + 1, 6, 1); g.fillRect(x - 1, y + 3, 6, 1);
    return;
  }
  const glass = kind === 'lit' ? ['#d99a36', '#f4cc6a'] : ['#1b242a', '#4b6270'];
  g.fillStyle = glass[0]; g.fillRect(x + 1, y + 1, 2, 2); px1(g, x + 1, y + 1, glass[1]);
  if (shutter) { g.fillStyle = shutter; g.fillRect(x - 1, y, 1, 4); g.fillRect(x + 4, y, 1, 4); }
}
function drawDoor(g, x, y, cross) { // 5x8, arched, with a worn stone step
  g.fillStyle = '#7d776b'; g.fillRect(x - 1, y + 8, 7, 2); g.fillStyle = '#958e7f'; g.fillRect(x - 1, y + 8, 7, 1);
  g.fillStyle = '#2e2016'; g.fillRect(x, y + 1, 5, 7); g.fillRect(x + 1, y, 3, 1);
  g.fillStyle = '#5a3d26'; g.fillRect(x + 1, y + 1, 3, 7);
  g.fillStyle = '#6e4c30'; g.fillRect(x + 1, y + 1, 1, 7);
  px1(g, x + 3, y + 4, '#c9a560');
  if (cross) { g.fillStyle = '#c0281f'; g.fillRect(x + 2, y + 1, 1, 6); g.fillRect(x + 1, y + 3, 3, 1); }
}
function drawStainedGlass(g, x, y) { // 4x7 arched
  g.fillStyle = '#2b2620'; g.fillRect(x, y + 1, 4, 6); g.fillRect(x + 1, y, 2, 1);
  const cols = ['#b3332b', '#2f5a9a', '#d4a03a', '#3f7a3a'];
  for (let yy = 1; yy < 6; yy++) for (let xx = 1; xx < 3; xx++) px1(g, x + xx, y + yy, cols[(xx + yy) % 4]);
}

// The street-facing wall of a building: timber frame, stone, brick or shopfront.
function drawFacade(g, x, y, w, rng, opts = {}) {
  const H = FACADE_H, type = opts.type || pick(rng, THEME.facades);
  const plaster = pick(rng, PLASTER), beam = '#3a2a1c';
  if (type === 'stone') {
    g.fillStyle = '#837c6e'; g.fillRect(x, y, w, H);
    for (let r = 0; r * 3 < H; r++) {
      g.fillStyle = '#958e7f'; g.fillRect(x, y + r * 3, w, 1);
      g.fillStyle = '#5f594e'; g.fillRect(x, y + r * 3 + 2, w, 1);
      for (let jx = x + (r % 2) * 3; jx < x + w; jx += 6) px1(g, jx, y + r * 3 + 1, '#5f594e');
    }
  } else if (type === 'brick') {
    g.fillStyle = '#8a4c3a'; g.fillRect(x, y, w, H);
    for (let r = 0; r * 3 < H; r++) {
      g.fillStyle = '#5a3226'; g.fillRect(x, y + r * 3 + 2, w, 1);
      for (let jx = x + (r % 2) * 2; jx < x + w; jx += 5) { g.fillRect(jx, y + r * 3, 1, 2); }
      g.fillStyle = '#9c5a45'; for (let jx = x + 1 + (r % 2) * 2; jx < x + w; jx += 5) px1(g, jx, y + r * 3, '#9c5a45');
    }
  } else {
    g.fillStyle = plaster; g.fillRect(x, y, w, H);
    if (rng() < 0.45) { // fallen plaster showing brick
      const bx = x + 3 + Math.floor(rng() * Math.max(1, w - 10)), by = y + 7;
      g.fillStyle = '#7a4a36'; g.fillRect(bx, by, 5, 3);
      g.fillStyle = '#4a2e22'; g.fillRect(bx, by + 1, 5, 1); px1(g, bx + 2, by, '#4a2e22'); px1(g, bx + 4, by + 2, '#4a2e22');
      g.fillStyle = shade(plaster, 0.8); g.fillRect(bx - 1, by - 1, 7, 1);
    }
  }
  // bays: timber posts or implied piers
  const posts = [x];
  for (let p = x + 9 + Math.floor(rng() * 3); p < x + w - 7; p += 9 + Math.floor(rng() * 3)) posts.push(p);
  posts.push(x + w - 1);
  if (type === 'timber' || type === 'shop') {
    g.fillStyle = beam; g.fillRect(x, y + 2, w, 1); g.fillRect(x, y + 9, w, 1);
    for (const p of posts) g.fillRect(p, y, 1, H);
    for (let i = 0; i < posts.length - 1; i++) if (rng() < 0.25) { // X brace in a bay
      const a = posts[i] + 1, b = posts[i + 1] - 1, span = b - a;
      for (let k = 0; k <= span; k++) { const t = Math.round(k / span * 5); px1(g, a + k, y + 3 + t, beam); px1(g, b - k, y + 3 + t, beam); }
      posts[i] = -1; // braced bays get no window
    }
  }
  // eaves shadow
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y, w, 2);
  if (THEME.snow) for (let xx = x + 1; xx < x + w - 1; xx += 2 + (rng() * 3 | 0)) { g.fillStyle = '#cfe3f0'; g.fillRect(xx, y, 1, 2 + (rng() * 3 | 0)); } // icicles
  const bays = [];
  for (let i = 0; i < posts.length - 1; i++) {
    const a = (posts[i] < 0 ? null : posts[i] + 1), b = posts[i + 1];
    if (a !== null && b - a >= 6) bays.push([a, b]);
  }
  const doorBay = opts.door === false ? -1 : Math.floor(rng() * bays.length);
  let doorX = x + Math.floor(w / 2);
  bays.forEach(([a, b], i) => {
    const mid = Math.floor((a + b) / 2);
    if (opts.stained) { drawStainedGlass(g, mid - 2, y + 3); return; }
    if (i === doorBay) { drawDoor(g, mid - 2, y + H - 8, !opts.noCross && rng() < 0.15); doorX = mid; return; }
    const r = rng();
    const kind = opts.lit ? 'lit' : r < 0.2 ? 'lit' : r < 0.2 + THEME.boarded ? 'boarded' : r < 0.9 ? 'dark' : null;
    if (kind) drawWindow(g, mid - 2, y + 4, kind, kind === 'dark' ? pick(rng, SHUTTERS) : null);
    if (kind && rng() < 0.3) { g.globalAlpha = .25; g.fillStyle = '#2a2018'; g.fillRect(mid - 1, y + 8, 2, 3); g.globalAlpha = 1; } // damp streak
  });
  if (type === 'shop' && bays.length) { // striped awning over a bay
    const [a, b] = bays[(doorBay + 1) % bays.length], cols = pick(rng, AWNINGS);
    for (let xx = a - 1; xx <= b; xx++) {
      const c = cols[Math.floor((xx - a + 1) / 2) % 2];
      g.fillStyle = c; g.fillRect(xx, y + 2, 1, 3);
      if ((xx - a) % 2 === 0) px1(g, xx, y + 5, c);
    }
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(a - 1, y + 6, b - a + 2, 1);
  }
  g.fillStyle = '#1a140f'; g.fillRect(x, y + H - 1, w, 1);
  return doorX;
}

function splitWidth(W, rng) {
  const out = [];
  let rem = W;
  while (rem > 0) {
    const ok = THEME.units.filter(c => c <= rem && (rem - c === 0 || rem - c >= 24));
    const c = ok.length ? pick(rng, ok) : rem;
    out.push(c); rem -= c;
  }
  return out;
}
function roofForm(w, h, rng) {
  if (w >= h * 1.3) return pick(rng, ['gable-h', 'hip', 'hip']);
  if (h >= w * 1.3) return pick(rng, ['gable-v', 'hip']);
  return 'hip';
}

// One house: roof (with features) and, if it faces the street, a facade.
function drawHouse(g, x, y, w, h, withFacade, rng, prevMat, biz) {
  const list = THEME.materials;
  let k = Math.floor(rng() * list.length), mat = MATERIALS[list[k]];
  for (let tries = 0; mat === prevMat && tries < list.length; tries++) { k = (k + 1) % list.length; mat = MATERIALS[list[k]]; }
  const roofH = h - (withFacade ? FACADE_H : 0);
  const form = roofForm(w, roofH, rng);
  const m = drawRoofUnit(g, x, y, w, roofH, mat, form, 0.92 + rng() * 0.14);
  const r = rng();
  if (r < 0.25) drawMoss(g, x + 3 + Math.floor(rng() * (w - 10)), y + roofH - 6);
  if (rng() < THEME.holes) drawRoofHole(g, x + 4 + Math.floor(rng() * (w - 14)), y + 4 + Math.floor(rng() * Math.max(1, roofH / 2 - 8)), m, rng);
  if (withFacade && roofH >= 22 && w >= 24 && rng() < 0.4) drawDormer(g, x + Math.floor((w - 9) / 2), y + roofH - 11, m, rng);
  if (rng() < 0.7 || (biz && biz.smoke)) {
    const cx = x + 4 + Math.floor(rng() * (w - 14)), cy = y + 3 + Math.floor(rng() * Math.max(1, roofH / 3));
    drawChimney(g, cx, cy);
    if (biz && biz.smoke) ambient.push({ type: 'smoke', x: cx + 3, y: cy + 1 });
  }
  if (withFacade) {
    const doorX = drawFacade(g, x, y + roofH, w, rng, biz ? { type: biz.facade, lit: biz.lit, noCross: true } : {});
    if (biz) drawBusiness(g, biz, x, w, y + h - 1, doorX, rng);
  }
  return mat;
}

// ---------------------------------------------------------------------------
// V6: businesses. Some street-facing houses are trades, each with a hanging
// sign, its own wall and goods out front. Purely visual: no effect on play.
// ---------------------------------------------------------------------------
const ICONS = {
  tankard: [['.www..', '.aaaa.', '.aaaah', '.aaaah', '.aaaa.', '.dddd.'], { w: '#f0ead6', a: '#c9922e', d: '#7a5418', h: '#7a5418' }],
  loaf: [['.bbbb.', 'bBbBbb', 'bbbbbb', '.dddd.'], { b: '#c99050', B: '#e6b878', d: '#8a5a2a' }],
  ham: [['..ww..', '.rrrr.', 'rRrrrr', 'rrrrr.', '.rrr..'], { w: '#eee4cc', r: '#b84a4a', R: '#e07a7a' }],
  anvil: [['gggggg', '.gGgg.', '..gg..', '.gggg.'], { g: '#4a4a50', G: '#8a8a92' }],
  bottle: [['.cc.', '.bb.', 'bbbb', 'bBbb', 'bbbb', '.bb.'], { c: '#8a5a2a', b: '#3f8a7a', B: '#9fe0d0' }],
  boot: [['.bB..', '.bb..', '.bb..', '.bbbb', 'bbbbb'], { b: '#5a3a22', B: '#8a6040' }],
  candle: [['.f.', '.F.', '.w.', '.w.', '.w.', 'www'], { f: '#f0a030', F: '#ffe08a', w: '#e8dfc8' }],
};
const iconSprites = {};
for (const [k, [rows, pal]] of Object.entries(ICONS)) iconSprites[k] = spriteFrom(rows, pal);

// Animated light and smoke sources found on the map (filled while it is drawn).
const ambient = [];

function drawSign(g, x, y, icon) { // iron bracket off the wall and a hanging board
  g.fillStyle = '#2a2a2e'; g.fillRect(x, y, 10, 1); px1(g, x + 2, y + 1, '#2a2a2e'); px1(g, x + 8, y + 1, '#2a2a2e');
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 2, y + 4, 9, 8);
  g.fillStyle = '#3a2a1c'; g.fillRect(x + 1, y + 2, 9, 8);
  g.fillStyle = '#7a5b3b'; g.fillRect(x + 2, y + 3, 7, 6);
  const s = iconSprites[icon];
  g.drawImage(s, x + 2 + Math.floor((7 - s.width) / 2), y + 3 + Math.floor((6 - s.height) / 2));
}
function drawBarrel(g, x, y) {
  disc(g, x + 1, y + 2, 3, 'rgba(0,0,0,.35)');
  disc(g, x, y, 3, '#3a2a1c'); disc(g, x, y, 2, '#8a6238'); px1(g, x, y, '#5a4028'); px1(g, x - 1, y - 1, '#a87a48');
}
function drawCrate(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1, y + 1, 6, 5);
  g.fillStyle = '#8a6a42'; g.fillRect(x, y, 6, 5);
  g.fillStyle = '#5a4028'; g.fillRect(x, y + 2, 6, 1); g.fillRect(x, y, 1, 5); g.fillRect(x + 5, y, 1, 5);
  g.fillStyle = '#a8845a'; g.fillRect(x + 1, y, 4, 1);
}
function drawSack(g, x, y, col) {
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 1, y + 2, 5, 4);
  g.fillStyle = col; g.fillRect(x, y + 1, 5, 4); g.fillRect(x + 1, y, 3, 1);
  g.fillStyle = shade(col, 0.75); g.fillRect(x, y + 4, 5, 1); px1(g, x + 2, y, shade(col, 0.6));
}
function drawBench(g, x, y, w) {
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 1, y + 2, w, 2);
  g.fillStyle = '#6b4f33'; g.fillRect(x, y, w, 2); g.fillStyle = '#8a6a44'; g.fillRect(x, y, w, 1);
}
function drawLantern(g, x, y) { g.fillStyle = '#2a2a2e'; g.fillRect(x, y - 1, 3, 1); g.fillStyle = '#f4cc6a'; g.fillRect(x, y, 3, 3); px1(g, x + 1, y + 1, '#fff2c0'); }

const BUSINESSES = [
  { name: 'tavern', icon: 'tankard', facade: 'timber', minW: 32, lit: true },
  { name: 'bakery', icon: 'loaf', facade: 'brick', smoke: true },
  { name: 'butcher', icon: 'ham', facade: 'timber' },
  { name: 'smithy', icon: 'anvil', facade: 'stone', smoke: true, forge: true },
  { name: 'apothecary', icon: 'bottle', facade: 'stone' },
  { name: 'tavern', icon: 'tankard', facade: 'brick', minW: 32, lit: true },
  { name: 'cobbler', icon: 'boot', facade: 'shop' },
  { name: 'chandler', icon: 'candle', facade: 'shop' },
];

// Wares and fittings out front; sx..sx+w is the house, fy is the bottom of its wall.
function drawBusiness(g, b, x, w, fy, doorX, rng) {
  const street = fy + 1; // first street row below the wall
  const left = x + 2, right = x + w - 8;
  if (b.name === 'tavern') {
    drawBarrel(g, left + 3, street + 4); drawBarrel(g, left + 9, street + 3);
    drawBench(g, right - 6, street + 3, 12);
    drawLantern(g, doorX - 4, fy - 9);
    ambient.push({ type: 'glow', x: doorX - 3, y: fy - 4, r: 10, col: '#f4b84a' });
  } else if (b.name === 'bakery') {
    drawSack(g, left, street + 2, '#d8cdb0'); drawSack(g, left + 6, street + 3, '#cbbf9e');
    drawCrate(g, right, street + 2); g.drawImage(iconSprites.loaf, right, street + 1);
  } else if (b.name === 'butcher') {
    disc(g, left + 4, street + 5, 3, '#5a4028'); disc(g, left + 4, street + 4, 3, '#8a6a42'); disc(g, left + 4, street + 4, 1, '#a8845a');
    g.globalAlpha = .5; disc(g, left + 9, street + 5, 2, '#7a1e1a'); g.globalAlpha = 1; // blood
    for (let i = 0; i < 2; i++) { g.drawImage(iconSprites.ham, right - 4 + i * 7, fy - 9); } // hams hanging on the wall
  } else if (b.name === 'smithy') {
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(left + 1, street + 5, 7, 2);
    g.drawImage(iconSprites.anvil, left, street + 2);
    for (let i = 0; i < 3; i++) { g.fillStyle = '#5a5a60'; g.fillRect(right + i * 2, street + 3 + (i % 2), 2, 1); }
    g.fillStyle = '#1a120c'; g.fillRect(right - 1, fy - 8, 7, 7); // open forge
    g.fillStyle = '#e0602a'; g.fillRect(right, fy - 5, 5, 3); g.fillStyle = '#ffb040'; g.fillRect(right + 1, fy - 4, 3, 1);
    ambient.push({ type: 'glow', x: right + 2, y: fy - 2, r: 9, col: '#ff7a30' });
  } else if (b.name === 'apothecary') {
    g.fillStyle = '#2e2016'; g.fillRect(right - 2, fy - 8, 8, 4); // shelf window of bottles
    ['#3f8a7a', '#c9922e', '#4a7ab0', '#b84a4a'].forEach((c, i) => { px1(g, right - 1 + i * 2, fy - 7, c); px1(g, right - 1 + i * 2, fy - 6, c); });
    for (let i = 0; i < 3; i++) { g.fillStyle = pick(rng, ['#5f7f3a', '#7a8a3a', '#4f6a30']); g.fillRect(left + 1 + i * 3, fy - 10, 2, 3); } // drying herbs
    drawCrate(g, left, street + 2);
  } else if (b.name === 'cobbler') {
    drawBench(g, left, street + 3, 10);
    g.drawImage(iconSprites.boot, left + 1, street - 1); g.drawImage(iconSprites.boot, left + 5, street);
  } else if (b.name === 'chandler') {
    drawCrate(g, right, street + 2);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#e8dfc8'; g.fillRect(left + i * 2, street + 2, 1, 4); px1(g, left + i * 2, street + 1, '#f0a030'); }
  }
  drawSign(g, x + (doorX - x > w / 2 ? 1 : w - 12), fy - 11, b.icon);
}

function drawChurch(g, x, y, rng) {
  const slate = MATERIALS[1], lead = MATERIALS[5];
  drawRoofUnit(g, x, y, 96, 56, slate, 'gable-h', 0.95);                 // nave
  const m = drawRoofUnit(g, x + 32, y + 56, 64, 28, slate, 'gable-h', 1.02); // porch aisle
  drawFacade(g, x + 32, y + 84, 64, rng, { type: 'stone', stained: true, door: false });
  drawDoor(g, x + 61, y + 88, false); drawDoor(g, x + 66, y + 88, false);  // double door
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 32, y + 40, 4, 44);
  drawRoofUnit(g, x, y + 40, 32, 44, lead, 'hip', 0.9);                   // bell tower
  drawFacade(g, x, y + 84, 32, rng, { type: 'stone', stained: true, door: false });
  // gilded cross on the tower's peak
  const cx = x + 15, cy = y + 56;
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(cx + 2, cy + 2, 2, 8); g.fillRect(cx, cy + 4, 6, 2);
  g.fillStyle = '#d8b04a'; g.fillRect(cx + 1, cy, 2, 8); g.fillRect(cx - 1, cy + 2, 6, 2);
  px1(g, cx + 1, cy, '#f2d47a');
  void m;
}

let bizTurn = 0;
function drawBuildings(g, rng) {
  const W = (r) => r.w * TILE, H = (r) => r.h * TILE;
  const parkAt = (tx, ty) => tx > 0 && ty > 0 && tx < MAP_W && ty < MAP_H && (at(tx, ty) === T.GRASS || at(tx, ty) === T.TREE);
  const P = PERIOD, church = roofs.find(r => r.w === BLOCK && r.h === BLOCK && (parkAt(r.x + P, r.y) || parkAt(r.x - P, r.y) || parkAt(r.x, r.y + P) || parkAt(r.x, r.y - P)));
  // shadows first: east side and a sliver to the south
  for (const r of roofs) {
    g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(r.x * TILE + W(r), r.y * TILE + 4, 4, H(r) - 2);
    // V8: a kerb of dressed stones along each street front
    const ky = r.y * TILE + H(r), kerb = THEME.snow ? ['#c9d2db', '#bfc8d2'] : THEME.ground === 'mud' ? ['#5a4a36', '#524433'] : ['#6f685c', '#655e53'];
    if (at(r.x, r.y + r.h) === T.STREET) for (let kx = r.x * TILE; kx < r.x * TILE + W(r); kx += 7) {
      g.fillStyle = kerb[(kx / 7 | 0) % 2]; g.fillRect(kx, ky, 6, 3);
      g.fillStyle = shade(kerb[0], 1.15); g.fillRect(kx, ky, 6, 1);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(kx, ky + 3, 7, 1);
    }
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(r.x * TILE + 2, r.y * TILE + H(r), W(r), 2);
  }
  for (const r of roofs) {
    const x = r.x * TILE, y = r.y * TILE;
    if (r === church) { drawChurch(g, x, y, rng); continue; }
    const rows = H(r) >= 80 ? [[0, 40 + Math.floor(rng() * 2) * 8, false]] : [];
    const backH = rows.length ? rows[0][1] : 0;
    rows.push([backH, H(r) - backH, true]);
    for (const [oy, h, facade] of rows) {
      let cx = x, prev = null;
      for (const w of splitWidth(W(r), rng)) {
        let biz = null;
        if (facade && rng() < CONFIG.businessShare) { // pick the next trade that fits this width
          for (let k = 0; k < BUSINESSES.length && !biz; k++) {
            const b = BUSINESSES[(bizTurn + k) % BUSINESSES.length];
            if (w >= (b.minW || 24)) { biz = b; bizTurn += k + 1; }
          }
        }
        prev = drawHouse(g, cx, y + oy, w, h, facade, rng, prev, biz); cx += w;
      }
    }
  }
}

const TUFT = ['.g.', 'gGg'];
function drawChurchyard(g, x0, y0, rng) {
  const x = x0 * TILE, y = y0 * TILE, S = 6 * TILE, snow = THEME.snow;
  const C = snow ? { base: '#dfe6ed', light: '#eef3f7', dark: '#cbd5de', tuft: ['#b8c4cf', '#f4f7fa'], path: ['#a9b3bc', '#98a2ac', '#bcc5ce'] }
    : { base: '#4a6a32', light: '#557a3a', dark: '#3f5c2b', tuft: ['#365226', '#6a9046'], path: ['#6a5438', '#5a4630', '#7a6444'] };
  g.fillStyle = C.base; g.fillRect(x, y, S, S);
  const n = valueNoise(4040 + x0 * 7 + y0, 18);
  for (let yy = 0; yy < S; yy += 2) for (let xx = 0; xx < S; xx += 2) { // soft light and dark patches
    const v = n(x + xx, y + yy);
    if (v > 0.62) { g.fillStyle = C.light; g.fillRect(x + xx, y + yy, 2, 2); }
    else if (v < 0.3) { g.fillStyle = C.dark; g.fillRect(x + xx, y + yy, 2, 2); }
  }
  for (let i = 0; i < 40; i++) { // grass tufts
    const tx = x + 2 + Math.floor(rng() * (S - 5)), ty = y + 2 + Math.floor(rng() * (S - 4));
    TUFT.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch !== '.') px1(g, tx + xx, ty + yy, ch === 'G' ? C.tuft[1] : C.tuft[0]); }));
  }
  for (let i = 0; i < 6; i++) { px1(g, x + 3 + Math.floor(rng() * (S - 6)), y + 3 + Math.floor(rng() * (S - 6)), pick(rng, ['#d8c46a', '#d9d2c0', '#b84a3a'])); } // flowers
  // trodden dirt path cross with clean edges
  g.fillStyle = C.path[0]; g.fillRect(x + S / 2 - 3, y, 6, S); g.fillRect(x, y + S / 2 - 3, S, 6);
  g.fillStyle = C.path[1]; g.fillRect(x + S / 2 - 3, y, 1, S); g.fillRect(x, y + S / 2 - 3, S, 1);
  g.fillStyle = C.path[2]; g.fillRect(x + S / 2 + 2, y, 1, S); g.fillRect(x, y + S / 2 + 2, S, 1);
  // graves in neat rows: headstones and fresh mounds
  for (const qx of [0, 1]) for (const qy of [0, 1]) for (let i = 0; i < 3; i++) {
    const gx = x + 8 + qx * 50 + i * 12, gy = y + 10 + qy * 50;
    if (rng() < 0.2) continue;
    if (rng() < 0.35) { // fresh grave
      g.fillStyle = '#4e3a24'; g.fillRect(gx - 1, gy + 3, 7, 10);
      g.fillStyle = '#6a5034'; g.fillRect(gx, gy + 3, 5, 2);
      g.fillStyle = '#3a2a1a'; g.fillRect(gx - 1, gy + 12, 7, 1);
      continue;
    }
    const stone = pick(rng, ['#8d8778', '#7b7668', '#999383']), tilt = rng() < 0.3;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(gx + 2, gy + 7, 5, 2);
    g.fillStyle = shade(stone, 0.75); g.fillRect(gx, gy + 2, 5, 6);
    g.fillStyle = stone; g.fillRect(gx + (tilt ? 1 : 0), gy, 4, 1); g.fillRect(gx, gy + 1, 5, 5);
    g.fillStyle = shade(stone, 1.15); g.fillRect(gx, gy + 1, 1, 5);
    g.fillStyle = shade(stone, 0.6); g.fillRect(gx + 2, gy + 2, 1, 3); g.fillRect(gx + 1, gy + 3, 3, 1);
    if (snow) { g.fillStyle = '#f4f7fa'; g.fillRect(gx, gy, 5, 1); }
  }
}

function drawTree(g, cx, cy, rng) {
  disc(g, cx + 3, cy + 4, 10, 'rgba(0,0,0,.35)');
  if (THEME.snow || rng() < (THEME.laundry ? 0.6 : 0.3)) { // dead or winter-bare tree
    g.fillStyle = '#3a2a1c';
    for (let b = 0; b < 6; b++) {
      let bx = cx, by = cy; const a = b / 6 * Math.PI * 2 + rng();
      for (let k = 0; k < 7 + rng() * 4; k++) { bx += Math.cos(a + (rng() - .5) * .6); by += Math.sin(a + (rng() - .5) * .6); g.fillRect(Math.round(bx), Math.round(by), 1, 1); }
    }
    disc(g, cx, cy, 2, '#4a3524');
    if (THEME.snow) for (let i = 0; i < 14; i++) px1(g, cx + (rng() * 16 | 0) - 8, cy + (rng() * 16 | 0) - 8, '#eef3f7');
    return;
  }
  // layered canopy: dark rim, mid body, lit clusters top-left
  disc(g, cx, cy, 10, '#24401f');
  disc(g, cx - 1, cy - 1, 8, '#32552a');
  disc(g, cx - 3, cy - 3, 5, '#41692f');
  disc(g, cx + 3, cy - 2, 3, '#3a5f2c');
  disc(g, cx - 4, cy - 4, 2, '#56813c');
  disc(g, cx + 2, cy + 3, 2, '#2a4823');
}

function renderMap() {
  const c = makeCanvas(MAP_W * TILE, MAP_H * TILE);
  const g = c.getContext('2d');
  const rng = mulberry32(LEVEL.seed * 7 + 1);
  const W = MAP_W * TILE, H = MAP_H * TILE;
  bizTurn = levelIndex * 3;

  // 1. ground tiles
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const px = tx * TILE, py = ty * TILE, v = at(tx, ty);
    if (v === T.STREET || v === T.BUILDING) drawGroundTile(g, px, py, rng);
    else if (v === T.PLAZA || v === T.WELL) THEME.snow ? drawSnowTile(g, px, py, rng) : drawFlagTile(g, px, py, rng);
    else if (v === T.WALL) {
      g.fillStyle = '#1b1814'; g.fillRect(px, py, TILE, TILE);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) {
        g.fillStyle = pick(rng, ['#2a241f', '#2f2822', '#26201b', '#332b24']);
        g.fillRect(px + k * 8 + (r % 2) * 4, py + r * 4, 7, 3);
      }
      if (THEME.snow) { g.fillStyle = '#e8eef4'; g.fillRect(px, py, TILE, 3); }
    }
  }
  if (bridges.size || LEVEL.canalBand !== undefined) drawCanal(g, rng);
  for (let by = 0; by < BLOCKS_Y; by++) for (let bx = 0; bx < BLOCKS_X; bx++) {
    const x0 = blockX0(bx), y0 = blockX0(by);
    if (at(x0, y0) === T.GRASS || at(x0, y0) === T.TREE) drawChurchyard(g, x0, y0, rng);
  }

  // 2. grime: patchy mud over the streets (trampled slush in the snow)
  const noise = valueNoise(LEVEL.seed + 777, 40), fine = valueNoise(LEVEL.seed + 778, 9);
  if (THEME.grime) {
    const [r, gg, b, k] = THEME.grime;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      if (!isGround(x, y)) continue;
      const n = noise(x, y) * 0.7 + fine(x, y) * 0.3;
      if (n > 0.5) { g.fillStyle = `rgba(${r},${gg},${b},${Math.min(0.55, (n - 0.5) * 1.6 * k).toFixed(2)})`; g.fillRect(x, y, 2, 2); }
    }
  }
  if (THEME.snow) { // grey trampled tracks down the middle of each street, with footprints
    for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
      if (at(tx, ty) !== T.STREET) continue;
      const midRow = (ty - 1) % PERIOD === 1, midCol = (tx - 1) % PERIOD === 1;
      if (!midRow && !midCol) continue;
      for (let y = 0; y < TILE; y += 2) for (let x = 0; x < TILE; x += 2) {
        const n = fine(tx * TILE + x, ty * TILE + y);
        if (n > 0.35) { g.fillStyle = `rgba(120,130,142,${(0.18 + (n - 0.35) * 0.5).toFixed(2)})`; g.fillRect(tx * TILE + x, ty * TILE + y, 2, 2); }
      }
      for (let k = 0; k < 3; k++) px1(g, tx * TILE + (rng() * 15 | 0), ty * TILE + (rng() * 15 | 0), '#8e98a3');
    }
  }
  // filth (or snowdrifts) banked against the walls
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < MAP_W; tx++) {
    const v = at(tx, ty); if (v !== T.STREET && v !== T.PLAZA) continue;
    if (bridges.has(ty * MAP_W + tx)) continue;
    const px = tx * TILE, py = ty * TILE;
    const solid = (dx, dy) => { const n = at(tx + dx, ty + dy); return n === T.BUILDING || n === T.WALL; };
    for (let k = 0; k < 4; k++) {
      g.fillStyle = THEME.filth + [.5, .35, .2, .1][k] + ')';
      if (solid(0, -1)) g.fillRect(px, py + k, TILE, 1);
      if (solid(0, 1)) g.fillRect(px, py + TILE - 1 - k, TILE, 1);
      if (solid(-1, 0)) g.fillRect(px + k, py, 1, TILE);
      if (solid(1, 0)) g.fillRect(px + TILE - 1 - k, py, 1, TILE);
    }
  }
  // 3. open sewer channel down the middle of each main street
  if (THEME.sewer) for (let ty = 1; ty < MAP_H - 1; ty++) for (let tx = 1; tx < MAP_W - 1; tx++) {
    if (at(tx, ty) !== T.STREET || bridges.has(ty * MAP_W + tx)) continue;
    if ((ty - 1) % PERIOD === 1 && !inStreetBand(tx)) {
      const yy = ty * TILE + 7;
      g.fillStyle = '#1a140f'; g.fillRect(tx * TILE, yy, TILE, 2);
      for (let k = 0; k < 4; k++) px1(g, tx * TILE + Math.floor(rng() * TILE), yy + Math.floor(rng() * 2), pick(rng, ['#3b2e18', '#4a3a1c', '#2c3438']));
    }
    if ((tx - 1) % PERIOD === 1 && !inStreetBand(ty)) {
      const xx = tx * TILE + 7;
      g.fillStyle = '#1a140f'; g.fillRect(xx, ty * TILE, 2, TILE);
      for (let k = 0; k < 4; k++) px1(g, xx + Math.floor(rng() * 2), ty * TILE + Math.floor(rng() * TILE), pick(rng, ['#3b2e18', '#4a3a1c', '#2c3438']));
    }
  }
  // 4. stains: dark muck, ochre slops, old blood
  for (let i = 0; i < THEME.stains; i++) {
    const sx = rng() * W, sy = rng() * H; if (!isGround(sx, sy)) continue;
    const col = pick(rng, ['#1a120a', '#2a1c10', '#5a4318', '#3b1a14', '#20180f']);
    g.globalAlpha = 0.18 + rng() * 0.22;
    blob(rng, sx, sy, 2 + rng() * 5, (bx, by) => { if (isGround(bx, by)) px1(g, bx, by, col); });
  }
  g.globalAlpha = 1;
  // 5. puddles of filthy water (frozen in the snow)
  for (let i = 0; i < THEME.puddles; i++) {
    const sx = rng() * W, sy = rng() * H; if (!isGround(sx, sy)) continue;
    const size = 4 + rng() * 6, murky = !THEME.snow && rng() < 0.4;
    const body = THEME.snow ? '#b8d0e0' : murky ? '#38372b' : '#27373f', rim = THEME.snow ? '#9fb8ca' : '#221b14';
    blob(rng, sx, sy, size, (bx, by, edge) => { if (isGround(bx, by) && !bridges.has(((by / TILE) | 0) * MAP_W + ((bx / TILE) | 0))) px1(g, bx, by, edge ? rim : body); });
    g.fillStyle = THEME.snow ? '#eef6fc' : murky ? '#55513e' : '#6a8592'; g.fillRect(Math.round(sx - size * .3), Math.round(sy - 1), 2, 1);
  }
  // 6. litter: straw, dung, bones, broken pots, rags
  for (let i = 0; i < THEME.litter; i++) {
    const lx = Math.floor(rng() * W), ly = Math.floor(rng() * H); if (!isGround(lx, ly)) continue;
    const r = rng();
    if (r < 0.4) { g.fillStyle = pick(rng, ['#8c7438', '#a08648', '#6e5a2c']); rng() < .5 ? g.fillRect(lx, ly, 3, 1) : g.fillRect(lx, ly, 1, 3); }
    else if (r < 0.6) { g.fillStyle = '#3b2a17'; g.fillRect(lx, ly, 2, 2); px1(g, lx + 1, ly, '#4e3820'); }
    else if (r < 0.72) { g.fillStyle = '#cfc6b0'; g.fillRect(lx, ly, 3, 1); px1(g, lx, ly - 1, '#cfc6b0'); px1(g, lx + 2, ly + 1, '#cfc6b0'); }
    else if (r < 0.86) { px1(g, lx, ly, '#8a4a32'); px1(g, lx + 1, ly, '#6e3a28'); px1(g, lx + 3, ly + 1, '#8a4a32'); }
    else { g.fillStyle = pick(rng, ['#3f5a4a', '#7d3a33', '#4a4038']); g.fillRect(lx, ly, 3, 2); px1(g, lx + 2, ly + 2, '#2a221c'); }
  }
  if (THEME.ground === 'mud') { // planks laid over the worst of the mud
    for (let i = 0; i < 40; i++) {
      const lx = Math.floor(rng() * W), ly = Math.floor(rng() * H); if (!isGround(lx, ly) || !isGround(lx + 14, ly + 6)) continue;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(lx + 1, ly + 1, 14, 6);
      g.fillStyle = '#6b4f33'; g.fillRect(lx, ly, 14, 2); g.fillRect(lx, ly + 3, 14, 2);
      g.fillStyle = '#86653f'; g.fillRect(lx, ly, 14, 1); g.fillRect(lx, ly + 3, 14, 1);
    }
  }

  if (HAZ.flood) drawFloodWater(g, rng);
  if (HAZ.fires.length) drawScorch(g, rng);

  // 7. buildings: rows of individual houses, plus the church
  drawBuildings(g, rng);
  if (THEME.laundry) drawLaundry(g, rng);
  if (THEME.bunting) drawBunting(g, rng);
  if (THEME.banners) drawBanners(g, rng);
  if (THEME.lamps) drawLamps(g, rng);
  if (THEME.braziers) drawBraziers(g, rng);
  if (THEME.embers) addEmbers(rng);

  // 8. the well at the centre of the district
  drawWell(g);
  // 9. trees
  for (const [tx, ty] of trees) drawTree(g, tx * TILE + 8, ty * TILE + 8, rng);
  // 10. whole-map colour grade for the theme (sea fog, winter chill)
  if (THEME.fog || THEME.tint) { g.fillStyle = THEME.fog || THEME.tint; g.fillRect(0, 0, W, H); }
  return c;
}

// V9: the well at the heart of every district. A ring of paving, a stone curb
// built from shaded blocks, dark water, and an oak winch with a rope and bucket.
function drawWell(g) {
  const cx = WELL.x, cy = WELL.y, snow = THEME.snow;
  // radiating setts around the well
  for (let y = -26; y <= 26; y++) for (let x = -26; x <= 26; x++) {
    const d = Math.hypot(x, y);
    if (d < 15 || d > 25) continue;
    const ring = d < 20 ? 0 : 1, seg = Math.floor((Math.atan2(y, x) + Math.PI) / (Math.PI * 2) * (ring ? 28 : 20));
    const edge = Math.abs(d - 20) < 0.6 || d > 24.4 || (Math.atan2(y, x) + Math.PI) / (Math.PI * 2) * (ring ? 28 : 20) % 1 < 0.08;
    const base = snow ? ['#d0d8e0', '#c6ced8'][seg % 2] : ['#857965', '#7a6f5c', '#8d816b'][seg % 3];
    px1(g, cx + x, cy + y, edge ? (snow ? '#a9b3bc' : '#4e463b') : (y < -2 ? shade(base, 1.06) : base));
  }
  disc(g, cx + 2, cy + 3, 15, 'rgba(0,0,0,.35)');
  // curb of 16 dressed stones, lit from the top-left
  for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) {
    const d = Math.hypot(x, y);
    if (d > 14.2 || d < 10.4) continue;
    const a = (Math.atan2(y, x) + Math.PI) / (Math.PI * 2) * 16, seg = Math.floor(a);
    let col = ['#7d725f', '#73695a', '#867a65', '#6e6555'][seg % 4];
    if (a % 1 < 0.1) col = '#4a443b';                       // mortar joint
    else if (d > 13.4) col = shade(col, 0.78);               // outer lip in shade
    else if (d < 11.2) col = shade(col, 0.7);                // inner lip falls into the dark
    else if (x + y < -6) col = shade(col, 1.15);              // lit top-left
    if (snow && d > 11.2 && d < 13.4 && y < 4) col = '#eef3f7';
    px1(g, cx + x, cy + y, col);
  }
  // shaft and water
  disc(g, cx, cy, 10, '#1a1714');
  disc(g, cx, cy + 1, 8, snow ? '#7f99ab' : '#13202a');
  if (!snow) {
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; px1(g, Math.round(cx + Math.cos(a) * 5), Math.round(cy + 1 + Math.sin(a) * 4), '#22394a'); }
    g.fillStyle = '#4d7286'; g.fillRect(cx - 4, cy - 3, 3, 1); px1(g, cx - 5, cy - 2, '#3a5a6c'); px1(g, cx + 3, cy + 4, '#2d4a5a');
  }
  // oak posts, winch beam with rope drum, and a bucket on the curb
  for (const sx of [-17, 15]) {
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(cx + sx + 2, cy, 3, 5);
    g.fillStyle = '#3a2a1c'; g.fillRect(cx + sx, cy - 4, 3, 7);
    g.fillStyle = '#5a4028'; g.fillRect(cx + sx, cy - 4, 1, 7);
    if (snow) { g.fillStyle = '#eef3f7'; g.fillRect(cx + sx, cy - 5, 3, 1); }
  }
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(cx - 14, cy + 1, 30, 2);
  g.fillStyle = '#4a3424'; g.fillRect(cx - 15, cy - 2, 31, 3);
  g.fillStyle = snow ? '#eef3f7' : '#6b4f33'; g.fillRect(cx - 15, cy - 2, 31, 1);
  g.fillStyle = '#c9b48a'; g.fillRect(cx - 4, cy - 3, 8, 5);   // rope wound on the drum
  g.fillStyle = '#a8946a'; for (let k = 0; k < 4; k++) g.fillRect(cx - 4 + k * 2, cy - 3, 1, 5);
  g.fillStyle = '#2e2016'; g.fillRect(cx + 16, cy - 3, 2, 1); g.fillRect(cx + 17, cy - 3, 1, 3); // crank handle
  g.fillStyle = '#3a2a1c'; g.fillRect(cx + 7, cy + 8, 6, 5); g.fillStyle = '#6b4f33'; g.fillRect(cx + 8, cy + 9, 4, 3);
  g.fillStyle = '#5a5a60'; g.fillRect(cx + 7, cy + 9, 6, 1); g.fillRect(cx + 7, cy + 11, 6, 1);
  g.fillStyle = '#13202a'; g.fillRect(cx + 8, cy + 8, 4, 1);
}

// V9: the level opens with the swarm climbing out of the well, one rat at a
// time, hopping down to the plaza. Nothing else moves until they're all out.
function setupIntro(G) {
  const n = G.rats.length, gap = Math.min(0.12, 1.4 / n);
  G.trail = [];
  for (let d = 0; d <= 80; d += 2) G.trail.push({ x: START.x, y: START.y - d });
  G.rats.forEach((r, i) => {
    let tx = START.x, ty = START.y;
    if (i > 0) {
      const k = i - 1, p = trailPoint((Math.floor(k / 3) + 1) * 6);
      tx = p.x + p.nx * LANES[k % 3] * 4; ty = p.y + p.ny * LANES[k % 3] * 4;
    }
    Object.assign(r, { tx, ty, x: WELL.x, y: WELL.y, z: 0, hidden: true, emerge: 0.4 + i * gap, face: 'd' });
  });
  G.intro = { t: 0, end: 0.4 + (n - 1) * gap + 0.5 + 0.45 };
}
function updateIntro(dt) {
  const G = game, I = G.intro;
  I.t += dt;
  G.rats.forEach((r, i) => {
    const p = (I.t - r.emerge) / 0.5;
    if (p < 0) return;
    if (r.hidden) {
      r.hidden = false;
      for (let k = 0; k < 6; k++) { const a = Math.random() * Math.PI * 2, s = 8 + Math.random() * 14; G.particles.push({ x: WELL.x, y: WELL.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, life: 0.4, max: 0.4, col: k % 3 ? '#7aa6c2' : PLAGUE, size: 1 }); }
      if (i % 2 === 0) sfx.squeak();
    }
    const q = Math.min(1, p), e = q * (2 - q);
    r.x = WELL.x + (r.tx - WELL.x) * e; r.y = WELL.y + (r.ty - WELL.y) * e;
    r.z = q < 1 ? Math.sin(q * Math.PI) * 9 : 0;
    r.moving = q < 1;
    r.anim += dt; if (r.moving && r.anim > 0.07) { r.anim = 0; r.frame ^= 1; }
  });
  stepFx(dt);
  if (I.t >= I.end) { G.intro = null; G.rats.forEach(r => { r.z = 0; r.hidden = false; }); showLevelCard(); }
}

// Sprites are written as character grids and coloured with a palette.
// With an outline colour, the sprite gets a 1px border (canvas grows by 2px each way).
function spriteFrom(rows, pal, outline) {
  const o = outline ? 1 : 0, h = rows.length, w = rows[0].length;
  const c = makeCanvas(w + o * 2, h + o * 2), g = c.getContext('2d');
  const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.' && !!pal[rows[y][x]];
  if (outline) {
    g.fillStyle = outline;
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) g.fillRect(x + o, y + o, 1, 1);
    }
  }
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (filled(x, y)) { g.fillStyle = pal[ch]; g.fillRect(x + o, y + o, 1, 1); }
  }));
  return c;
}
const rotCW = rows => rows[0].split('').map((_, c) => rows.map(r => r[c]).reverse().join(''));
const flipH = rows => rows.map(r => [...r].reverse().join(''));
const flipV = rows => [...rows].reverse();

// V13: top-down rats are generated from shapes so every size shares one look:
// a tapered body lit from the top-left with a dark spine, a pointed head with
// ears and eyes, a whip tail and paws that patter as it runs.
// Keys: d outline, D spine, h lit fur, g fur, s shaded flank, p pink skin, e eye, n nose, k/K crown.
function ratGrid(L, H, frame, king) {
  const g = Array.from({ length: H }, () => Array(L).fill('.'));
  const cy = (H - 1) / 2;
  const bx = L * 0.42, brx = L * 0.25, bry = H * 0.36;          // body
  const hx = L * 0.74, hrx = L * 0.15, hry = H * 0.27;          // head
  const inside = (x, y) => {
    const b = ((x - bx) / brx) ** 2 + ((y - cy) / bry) ** 2 <= 1;
    const hk = x <= hx ? ((x - hx) / hrx) ** 2 + ((y - cy) / hry) ** 2 <= 1
      : Math.abs(y - cy) <= hry * Math.max(0, 1 - (x - hx) / (hrx * 1.9)) + 0.15;   // snout tapers to a point
    return b || hk;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    let c = y < cy ? 'h' : 's';
    if (Math.abs(y - cy) < 0.6 && x < hx - 1) c = 'D';
    else if (y < cy && x > bx + brx * 0.4) c = 'g';
    g[y][x] = edge ? 'd' : c;
  }
  // tail: a thin S-curve trailing behind the rump
  for (let x = 0; x < bx - brx + 1; x++) { const y = Math.round(cy + Math.sin(x / L * 7 + frame * 1.6) * 0.9); if (g[y] && g[y][x] === '.') g[y][x] = 'p'; }
  // ears, eyes, nose
  const ex = Math.round(hx - hrx * 0.5), ey = Math.round(cy - hry - 0.6), ey2 = Math.round(cy + hry + 0.6);
  for (const yy of [ey, ey2]) if (g[yy]) { g[yy][ex] = 'p'; if (g[yy][ex + 1] === '.') g[yy][ex + 1] = 'd'; }
  const eyX = Math.round(hx + hrx * 0.25);
  g[Math.round(cy - hry * 0.55)][eyX] = 'e'; g[Math.round(cy + hry * 0.55)][eyX] = 'e';
  const tip = [...g[Math.round(cy)]].lastIndexOf('d'); if (tip > 0) g[Math.round(cy)][tip] = 'n';
  if (H % 2 === 0) { const t2 = [...g[Math.round(cy) - 1]].lastIndexOf('d'); if (t2 > 0) g[Math.round(cy) - 1][t2] = 'n'; }
  // paws pattering at the sides, alternating each frame
  const feet = frame ? [[bx - brx * 0.5, -1], [bx + brx * 0.6, 1]] : [[bx - brx * 0.5, 1], [bx + brx * 0.6, -1]];
  for (const [fx, side] of feet) { const yy = side < 0 ? Math.round(cy - bry - 0.5) : Math.round(cy + bry + 0.5), xx = Math.round(fx); if (g[yy] && g[yy][xx] === '.') g[yy][xx] = 'p'; }
  if (king) { // a little gold crown sitting on the back of the head
    const kx = Math.round(hx - hrx * 0.9), r = 1.6;
    for (let a = 0; a < 8; a++) {
      const xx = Math.round(kx + Math.cos(a / 8 * Math.PI * 2) * r), yy = Math.round(cy + Math.sin(a / 8 * Math.PI * 2) * r);
      if (g[yy] && g[yy][xx] !== undefined) g[yy][xx] = a % 2 ? 'k' : 'K';
    }
    g[Math.round(cy)][kx] = 'D';
  }
  return g.map(r => r.join(''));
}
const RAT_PAL = { d: '#3a2e26', D: '#4b3c31', h: '#86725f', g: '#6e5b4c', s: '#5c4b3f', p: '#c98d86', n: '#e3a69e', e: '#ff3b2f' };
const KING_PAL = { d: '#120d10', D: '#1e161b', h: '#4a3e46', g: '#382e35', s: '#2a2128', p: '#b07a8a', n: '#d89aa8', e: '#e8a0ff', k: '#b8862a', K: '#ffd75a' };
function makeRatSet(grids, pal, outline) {
  const set = { r: [], l: [], d: [], u: [] };
  for (const f of grids) {
    set.r.push(spriteFrom(f, pal, outline)); set.l.push(spriteFrom(flipH(f), pal, outline));
    set.d.push(spriteFrom(rotCW(f), pal, outline)); set.u.push(spriteFrom(flipV(rotCW(f)), pal, outline));
  }
  return set;
}
const RAT_FRAMES = [ratGrid(16, 8, 0), ratGrid(16, 8, 1)];
const ratSprites = makeRatSet(RAT_FRAMES, RAT_PAL, 'rgba(10,8,6,.45)');
// V13: the lead rat is the Rat King: bigger, black-furred, purple-eyed and crowned.
const kingSprites = makeRatSet([ratGrid(21, 11, 0, true), ratGrid(21, 11, 1, true)], KING_PAL, 'rgba(192,92,255,.55)');

// V8: townsfolk come in four outfits, each with two walking frames.
// Keys: a hat, h hair, s/S skin light/shade, e eyes, c/C clothes light/shade,
// d belt or apron, b/B legs light/shade, f shoes, w/W headscarf light/shade.
const OUTFITS = {
  cap: [
    ['...aaaa...', '..aaaaaa..', '..hssssh..', '..sesseS..', '...ssSS...', '..cccccC..', '.ccccccCC.', '.cccccCCC.', '.sddddddS.', '..ccccCC..', '..bb..BB..', '..bb..BB..', '..ff..ff..'],
    ['...aaaa...', '..aaaaaa..', '..hssssh..', '..sesseS..', '...ssSS...', '..cccccC..', '.ccccccCC.', '.cccccCCC.', '.sddddddS.', '..ccccCC..', '..bb..BB..', '.bb....BB.', '.ff....ff.'],
  ],
  bare: [
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sesseS..', '...ssSS...', '..cccccC..', '.ccccccCC.', '.cccccCCC.', '.sddddddS.', '..ccccCC..', '..bb..BB..', '..bb..BB..', '..ff..ff..'],
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sesseS..', '...ssSS...', '..cccccC..', '.ccccccCC.', '.cccccCCC.', '.sddddddS.', '..ccccCC..', '..bb..BB..', '.bb....BB.', '.ff....ff.'],
  ],
  dress: [
    ['...wwww...', '..wwwwwW..', '..wssssW..', '..wesseW..', '...ssSS...', '..cccccC..', '.ccccccCC.', '.scccccCS.', '..ddddddC.', '.cddddddC.', '.cddddddCC', '.cccccCCC.', '...f..f...'],
    ['...wwww...', '..wwwwwW..', '..wssssW..', '..wesseW..', '...ssSS...', '..cccccC..', '.ccccccCC.', '.scccccCS.', '..ddddddC.', '.cddddddC.', '.cddddddCC', '..ccccCCC.', '..f....f..'],
  ],
  hood: [
    ['...cccc...', '..ccccCC..', '..cssSSC..', '..ceseSC..', '..cCSSCC..', '.ccccccCC.', '.ccccccCC.', '.sccddcCS.', '..ccccCC..', '..ccccCC..', '..ccccCC..', '.cccccCCC.', '..f...f...'],
    ['...cccc...', '..ccccCC..', '..cssSSC..', '..ceseSC..', '..cCSSCC..', '.ccccccCC.', '.ccccccCC.', '.sccddcCS.', '..ccccCC..', '..ccccCC..', '..ccccCC..', '..ccccCCC.', '...f...f..'],
  ],
};
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + [f(n >> 16), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function mix(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = s => Math.round((A >> s & 255) * (1 - t) + (B >> s & 255) * t);
  return '#' + [ch(16), ch(8), ch(0)].map(v => v.toString(16).padStart(2, '0')).join('');
}
// Plague buboes: dark sores on the face and one hand of infected townsfolk.
const sores = f => f.map((row, y) => y === 3 ? row.replace(/s(?=s)/, 'x') : y === 7 || y === 8 ? row.replace('s', 'x') : row);
// Visual rule V1: purple belongs to the plague, so healthy palettes contain no purple.
const PLAGUE = '#c05cff', PLAGUE_DARK = '#7d34c4';
function makePersonSprites(rng) {
  const outfit = OUTFITS[pick(rng, ['cap', 'bare', 'bare', 'dress', 'dress', 'hood'])];
  const skin = pick(rng, ['#e2b48f', '#c99470', '#9a6a48', '#f0c9a8']);
  const cloth = pick(rng, ['#7d3a33', '#3d5677', '#a07c3c', '#3f6b4a', '#56603a', '#8a5a3a', '#6b6a62', '#8c4a2a']);
  const legs = pick(rng, ['#3a2f26', '#2c3340', '#4a3d2c']);
  const pal = {
    a: pick(rng, ['#4a3a28', '#3a3a3e', '#7a5a2a', '#5a2a24']),
    h: pick(rng, ['#2a1f18', '#5a3a22', '#b8934a', '#8a8a86', '#6b2f1c']),
    s: skin, S: shade(skin, 0.82), e: '#2a1f18',
    c: cloth, C: shade(cloth, 0.72),
    d: pick(rng, ['#3a2a1c', '#d8cdb0', '#5a4028', '#c9bfa6']),
    b: legs, B: shade(legs, 0.75), f: '#1d1712',
    w: '#e6dfcc', W: '#c4bca8',
  };
  const sick = {
    ...pal, s: '#b49ad6', S: '#8f76b0', x: '#2e0f3a',
    h: shade(pal.h, 0.7), a: shade(pal.a, 0.75),
    c: mix(pal.c, '#3a2350', 0.6), C: mix(pal.C, '#24182e', 0.6),
    d: mix(pal.d, '#3a2350', 0.5), b: mix(pal.b, '#24182e', 0.5), B: mix(pal.B, '#24182e', 0.5),
    w: mix(pal.w, '#9a86b4', 0.5), W: mix(pal.W, '#6e5a8a', 0.5),
  };
  return {
    healthy: outfit.map(f => spriteFrom(f, pal, 'rgba(10,8,6,.55)')),
    infected: outfit.map(f => spriteFrom(sores(f), sick, PLAGUE)),
  };
}

const GLYPHS = {
  '+': ['...', '.#.', '###', '.#.', '...'], '!': ['.#.', '.#.', '.#.', '...', '.#.'], '-': ['...', '...', '###', '...', '...'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '..#', '..#'],
  '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
};
function pixText(g, text, x, y, col) {
  const draw = (ox, oy, c) => {
    g.fillStyle = c;
    [...text].forEach((ch, i) => (GLYPHS[ch] || []).forEach((row, ry) => [...row].forEach((p, rx) => {
      if (p === '#') g.fillRect(x + ox + i * 4 + rx, y + oy + ry, 1, 1);
    })));
  };
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) draw(ox, oy, '#0c0a08');
  draw(0, 0, col);
}
