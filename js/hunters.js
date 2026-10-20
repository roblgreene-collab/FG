// Plague Rat: Bill of Mortality, rat hunters and the feast.
'use strict';

// ---------------------------------------------------------------------------
// V3: Bill of Mortality, the comic death report at the end of a level.
// ---------------------------------------------------------------------------
const MORTALITY = [
  'Coughed up a lung, then went back for the other',
  'Boils burst at the dinner table',
  'Sneezed so hard their eyes left town',
  'Turned purple and stayed that way',
  'Leaked from places best not mentioned',
  'Melted into a puddle by the fish market',
  'Grew a boil the size of a cabbage',
  'Was sick in the well (sorry, everyone)',
  'Fell to pieces while dancing',
  'Sweated themselves into soup',
  'Kissed a rat. Regrets.',
  'Treated with leeches. The leeches died too',
  'Scratched until there was nothing left',
  'Popped like an overripe plum',
  'Nose fell off into the stew',
  'Rotted standing up, out of politeness',
  'Tried to cure it with onions',
  'Hiccuped themselves inside out',
  'Gave the plague to the doctor, then the priest',
  'Wheezed a sea shanty, then never again',
];
function billOfMortality(n) {
  const rows = Math.min(5, n);
  if (!rows) return [];
  const causes = [...MORTALITY].sort(() => Math.random() - 0.5).slice(0, rows);
  const counts = Array(rows).fill(1);
  for (let k = rows; k < n; k++) counts[Math.floor(Math.random() ** 1.6 * rows)]++; // uneven split, sums to n
  return causes.map((c, i) => [c, counts[i]]).sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------------------
// H1-H6: rat hunters. Each carries a number. While the swarm is smaller than
// it, he chases the swarm whenever he is on screen and catches it by touching
// the lead rat. Once the swarm matches or beats his number he flees, and any
// rat that touches him kills him.
// ---------------------------------------------------------------------------
// V8: wide-brimmed hat, dark cloak, red sash, belt with a buckle and a dead rat hanging from it.
const HUNTER_FRAMES = [
  ['...aaaa...', '.aaaaaaaa.', '..hssssh..', '..sesseS..', '...sSSS...', '.kcccccCk.', 'kccrrrrCCk', 'kcccccCCCk', 'ksdddDddSk', 'kccccCCCCk', '.kgccCCCk.', '..bb..BB..', '..bb..BB..', '..ff..ff..'],
  ['...aaaa...', '.aaaaaaaa.', '..hssssh..', '..sesseS..', '...sSSS...', '.kcccccCk.', 'kccrrrrCCk', 'kcccccCCCk', 'ksdddDddSk', 'kccccCCCCk', '.kgccCCCk.', '..bb..BB..', '.bb....BB.', '.ff....ff.'],
];
const HUNTER_PAL = { a: '#2e2620', h: '#3a2a1e', s: '#c99470', S: '#a87a5a', e: '#1d1712', k: '#3a3026', c: '#5a4a32', C: '#463a28', r: '#a8322c', d: '#2a2018', D: '#b89a50', g: '#6e5b4c', b: '#2c2620', B: '#221d18', f: '#1d1712' };
const HUNTER_DANGER = '#e0482c', HUNTER_PREY = '#3fd8f0'; // H1, H2: red = dangerous, cyan = prey
const hunterSprites = {
  danger: HUNTER_FRAMES.map(f => spriteFrom(f, HUNTER_PAL, HUNTER_DANGER)),
  prey: HUNTER_FRAMES.map(f => spriteFrom(f, HUNTER_PAL, HUNTER_PREY)),
};
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function spawnHunters() {
  const rng = mulberry32(LEVEL.seed + 99), out = [];
  for (const number of LEVEL.hunters) {
    for (let tries = 0; tries < 2000; tries++) {
      const tx = 1 + (rng() * (MAP_W - 2) | 0), ty = 1 + (rng() * (MAP_H - 2) | 0);
      if (at(tx, ty) !== T.STREET || bridges.has(ty * MAP_W + tx)) continue;
      const x = tx * TILE + 8, y = ty * TILE + 8;
      if (Math.hypot(x - START.x, y - START.y) < TILE * 16) continue;
      if (out.some(h => Math.hypot(h.x - x, h.y - y) < TILE * 10)) continue;
      out.push({ x, y, number, alive: true, mode: 'wander', danger: true, dx: 0, dy: 0, t: 0, frame: 0, anim: 0, flip: false });
      break;
    }
  }
  return out;
}

// Distance (in tiles, along the streets) from every tile to the lead rat.
function buildFlow(G) {
  const L = G.rats[0], n = MAP_W * MAP_H;
  if (!G.flow || G.flow.length !== n) { G.flow = new Int16Array(n); G.flowQ = new Int32Array(n); }
  const d = G.flow, q = G.flowQ; d.fill(-1);
  const s = ((L.y / TILE) | 0) * MAP_W + ((L.x / TILE) | 0);
  let qh = 0, qt = 0; q[qt++] = s; d[s] = 0;
  while (qh < qt) {
    const i = q[qh++], x = i % MAP_W, y = (i / MAP_W) | 0;
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const j = ny * MAP_W + nx;
      if (d[j] !== -1 || tileSolidIdx(j)) continue;
      d[j] = d[i] + 1; q[qt++] = j;
    }
  }
}

function updateHunters(dt) {
  const G = game, L = G.rats[0];
  if (!L || !G.hunters.length) return;
  G.flowT -= dt;
  if (G.flowT <= 0) { buildFlow(G); G.flowT = 0.15; }
  const n = G.rats.length;
  for (const h of G.hunters) {
    if (!h.alive || h.dying) continue;
    const danger = n < h.number; // H3 + H6: equal or more rats makes him prey
    const onScreen = h.x > G.cam.x - 4 && h.x < G.cam.x + view.w + 4 && h.y > G.cam.y - 4 && h.y < G.cam.y + view.h + 4;
    const mode = !onScreen ? 'wander' : danger ? 'chase' : 'flee'; // H4: he hunts whatever he can see
    if (mode === 'chase' && h.mode !== 'chase') { sfx.alert(); G.texts.push({ x: h.x - 1, y: h.y - 26, text: '!', col: HUNTER_DANGER, life: 0.9 }); }
    h.mode = mode; h.danger = danger;
    const ox = h.x, oy = h.y;
    const SP = G.spreader; // P3: hunters keep clear of a super spreader
    if (SP && Math.hypot(SP.x - h.x, SP.y - h.y) < CONFIG.spreaderAvoid) {
      const ax = h.x - SP.x, ay = h.y - SP.y, ad = Math.hypot(ax, ay) || 1, sp = CONFIG.hunterSpeed * slowAt(h.x, h.y) * dt;
      moveWithSlide(h, ax / ad * sp, ay / ad * sp, 3, 3, true);
    } else if (mode === 'wander') {
      h.t -= dt;
      const sp = CONFIG.hunterWanderSpeed * slowAt(h.x, h.y) * dt;
      if (h.dx || h.dy) moveWithSlide(h, h.dx * sp, h.dy * sp, 3, 3, false);
      if (h.t <= 0 || (ox === h.x && oy === h.y)) {
        const opts = DIRS4.filter(([x, y]) => !blocked(h.x + x * 6, h.y + y * 6, 3, 3));
        if (opts.length) [h.dx, h.dy] = opts[Math.floor(Math.random() * opts.length)];
        h.t = 1.5 + Math.random() * 2.5;
      }
    } else {
      const sp = (mode === 'flee' ? CONFIG.hunterFleeSpeed : CONFIG.hunterSpeed) * slowAt(h.x, h.y) * dt;
      let tx = h.x, ty = h.y;
      if (mode === 'chase' && Math.hypot(L.x - h.x, L.y - h.y) < 24) { tx = L.x; ty = L.y; }
      else {
        const cx = (h.x / TILE) | 0, cy = (h.y / TILE) | 0, here = G.flow[cy * MAP_W + cx];
        let best = null, bestD = here;
        for (const [dx, dy] of DIRS4) {
          const v = G.flow[(cy + dy) * MAP_W + cx + dx];
          if (v < 0) continue;
          if (mode === 'chase' ? (v < bestD || bestD < 0) : v > bestD) { bestD = v; best = [cx + dx, cy + dy]; }
        }
        if (best) { tx = best[0] * TILE + 8; ty = best[1] * TILE + 8; }
      }
      const ddx = tx - h.x, ddy = ty - h.y, dd = Math.hypot(ddx, ddy);
      if (dd > 0.5) moveWithSlide(h, ddx / dd * Math.min(sp, dd), ddy / dd * Math.min(sp, dd), 3, 3, true);
    }
    const mvx = h.x - ox, mvy = h.y - oy;
    if (Math.abs(mvx) > 0.01) h.flip = mvx < 0;
    if (Math.hypot(mvx, mvy) > 0.01) { h.anim += dt; if (h.anim > 0.16) { h.anim = 0; h.frame ^= 1; } }
    // H5: caught when he touches the lead rat while the swarm is smaller than his number
    if (danger && Math.hypot(L.x - h.x, L.y - (h.y - 3)) < CONFIG.hunterCatchRadius) { G.caughtBy = h; endGame(false, 'caught'); return; }
    // H3: when the swarm is big enough, any rat that touches him kills him
    if (!danger && G.rats.some(r => Math.hypot(r.x - h.x, r.y - (h.y - 3)) < CONFIG.infectRadius + 1)) { killHunter(h); return; }
  }
}

// H7: eating a hunter plays a short feast. Everything else (input, countdown,
// townsfolk, other hunters, the clock) is paused until it finishes.
function killHunter(h) {
  const G = game;
  h.dying = true;
  jolt(4, 0.4, 40); // V22
  G.feast = {
    h, t: 0, crunch: 0,
    from: G.rats.map(r => ({ x: r.x, y: r.y })),
    slot: G.rats.map((r, i) => ({ a: i * 2.39996, d: 6 + (i % 4) * 3 })), // golden-angle ring around him
  };
  sfx.alert();
}
const FEAST = { gather: 0.25, devour: 0.6, retreat: 0.78 }; // phase ends, as fractions of feastTime
function updateFeast(dt) {
  const G = game, F = G.feast, h = F.h, T = CONFIG.feastTime;
  F.t += dt;
  const k = F.t / T;
  G.rats.forEach((r, i) => {
    if (i === 0) return; // the lead rat holds its ground
    const s = F.slot[i] || { a: i, d: 8 };
    let d = s.d, a = s.a + F.t * 3;
    if (k > FEAST.gather && k < FEAST.devour) { d = 2 + Math.random() * 4; a += Math.random() * 6; }   // pile on
    else if (k >= FEAST.devour) d = s.d + 6;                                                            // pull back
    const tx = h.x + Math.cos(a) * d, ty = h.y - 3 + Math.sin(a) * d * 0.7;
    const m = Math.min(1, dt * (k < FEAST.gather ? 9 : 14));
    const mx = (tx - r.x) * m, my = (ty - r.y) * m;
    r.x += mx; r.y += my; r.moving = true; r.face = faceOf(mx, my, r.face);
    r.anim += dt; if (r.anim > 0.06) { r.anim = 0; r.frame ^= 1; }
  });
  if (k > FEAST.gather && k < FEAST.devour) { // gore and crunching while they eat
    F.crunch -= dt;
    if (F.crunch <= 0) { F.crunch = 0.18; sfx.kill(); }
    if (Math.random() < dt * 30) {
      const a = Math.random() * Math.PI * 2, sp = 10 + Math.random() * 25;
      G.particles.push({ x: h.x, y: h.y - 5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, life: 0.5, max: 0.5, col: pick(Math.random, ['#a8322c', '#7a1e1a', '#5a4a32', '#e9dcbc']), size: 1 + (Math.random() < .4) });
    }
  }
  stepFx(dt);
  if (F.t >= T) { // the skeleton is gone: back to the game, with the bounty
    h.alive = false; h.dying = false; G.huntersKilled++; awardPoints(CONFIG.pointsPerHunter); // P1
    G.decayTimer = 0; // R5: eating a hunter restarts the die-off countdown, like an infection
    for (let i = 0; i < CONFIG.hunterBounty; i++) G.rats.push(newRat(h.x + (Math.random() - .5) * 8, h.y + (Math.random() - .5) * 8));
    G.peak = Math.max(G.peak, G.rats.length);
    G.texts.push({ x: h.x - 3, y: h.y - 18, text: '+' + CONFIG.hunterBounty, col: PLAGUE, life: 1.1 });
    G.trail = [{ x: G.rats[0].x, y: G.rats[0].y }];
    G.feast = null;
    sfx.bonus();
  }
}
const SKELETON = [ // a picked-clean hunter lying in the street: skull, ribs, spine, legs
  '.ww..........',
  'wkkw.b.b.b...',
  'wwwwwbbbbbbww',
  '.ww..b.b.b...',
  '..........w.w',
];
const skeletonSprite = spriteFrom(SKELETON, { w: '#e8e0cc', k: '#2a2420', b: '#d6ccb4' }, 'rgba(20,14,10,.6)');
function drawFeast(ox, oy) {
  const F = game.feast, h = F.h, k = F.t / CONFIG.feastTime;
  if (k >= FEAST.gather * 0.6) { // skeleton revealed under the pile, then fading away
    ctx.globalAlpha = k < FEAST.retreat ? 1 : Math.max(0, 1 - (k - FEAST.retreat) / (1 - FEAST.retreat));
    ctx.fillStyle = 'rgba(122,30,26,.5)'; ctx.fillRect(Math.round(h.x - 7 + ox), Math.round(h.y - 2 + oy), 15, 4);
    ctx.drawImage(skeletonSprite, Math.round(h.x - 6 + ox), Math.round(h.y - 4 + oy));
    ctx.globalAlpha = 1;
  }
}

function drawHunter(h, ox, oy) {
  let shake = 0;
  if (h.dying) {
    const k = game.feast.t / CONFIG.feastTime;
    if (k >= FEAST.gather * 0.6) return; // devoured: only the skeleton remains
    shake = Math.round(Math.sin(game.feast.t * 60) * 1.5);
  }
  const s = (h.danger ? hunterSprites.danger : hunterSprites.prey)[h.frame];
  const W = s.width, H = s.height, x = Math.round(h.x - W / 2 + ox) + shake, y = Math.round(h.y - H + 2 + oy);
  drawFootShadow(x, y + H - 2, W);
  // catch-pole with a net over his shoulder
  const side = h.flip ? -1 : 1, px = x + (h.flip ? 1 : W - 2), py = y + 7;
  ctx.fillStyle = '#6b4f33';
  for (let k = 0; k < 7; k++) ctx.fillRect(px + side * k, py - k, 1, 1);
  ctx.fillStyle = '#c9b48a';
  const nx = px + side * 7, ny = py - 9;
  ctx.fillRect(nx - 1, ny, 3, 1); ctx.fillRect(nx - 2, ny + 1, 1, 2); ctx.fillRect(nx + 2, ny + 1, 1, 2); ctx.fillRect(nx - 1, ny + 3, 3, 1);
  if (h.flip) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(s, -x - W, y); ctx.restore(); }
  else ctx.drawImage(s, x, y);
}
function drawHunterNumber(h, ox, oy) { // H1: his number floats over his head
  const t = String(h.number), x = Math.round(h.x + ox - (t.length * 4 - 1) / 2), y = Math.round(h.y - 23 + oy);
  pixText(ctx, t, x, y, h.danger ? HUNTER_DANGER : HUNTER_PREY);
}
