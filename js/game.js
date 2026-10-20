// Plague Rat: game state, update and render.
'use strict';

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let view = { w: 320, h: 180, scale: 3 }, vignette = null;
let mapCanvas, state = 'title', game = null;
const keys = new Set();
const stick = { id: null, x: 0, y: 0 }; // R11: joystick deflection, -1..1 on each axis
const dbg = { timeScale: 1, input: null };
window.__plague = dbg;
dbg.solid = (x, y) => solidAt(x, y);
dbg.CONFIG = CONFIG;
dbg.override = null; // test hook: CONFIG values to apply on top of a level's own

function newGame() {
  const rng = mulberry32(4242 + levelIndex * 101);
  const citizens = [];
  while (citizens.length < CONFIG.population) {
    const tx = 1 + Math.floor(rng() * (MAP_W - 2)), ty = 1 + Math.floor(rng() * (MAP_H - 2));
    if (SOLID.has(at(tx, ty)) || HAZ.gateAt.has(ty * MAP_W + tx) || HAZ.fires.some(f => f.tx === tx && f.ty === ty)) continue;
    const x = tx * TILE + 8 + Math.floor(rng() * 7) - 3, y = ty * TILE + 8 + Math.floor(rng() * 7) - 3;
    if (Math.hypot(x - START.x, y - START.y) < TILE * 5) continue;
    if (blocked(x, y, 3, 3)) continue;
    citizens.push({ x, y, dx: 0, dy: 0, t: rng() * 2, infected: false, anim: rng(), flip: rng() < 0.5, sprites: makePersonSprites(rng) });
  }
  const rats = [];
  for (let i = 0; i < CONFIG.startRats; i++) rats.push(newRat(START.x, START.y + i * 4));
  dbg.game = game = {
    citizens, rats, trail: [{ x: START.x, y: START.y }],
    infected: 0, time: 0, decayTimer: 0, peak: rats.length,
    particles: [], texts: [], cam: { x: 0, y: 0 },
    hunters: spawnHunters(), huntersKilled: 0, powers: newPowers(), spreader: null, blasts: [], pointsEarned: 0, caughtBy: null, flowT: 0, flow: null, feast: null, intro: null,
  };
  setupHazards(game, rng);
  setupIntro(game);
}
function newRat(x, y) { return { x, y, face: 'u', frame: 0, anim: Math.random(), moving: false }; }

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function moveWithSlide(e, dx, dy, hw, hh, assist) {
  if (dx) {
    if (!blocked(e.x + dx, e.y, hw, hh)) e.x += dx;
    else if (assist) nudge(e, 'y', dx, hw, hh);
  }
  if (dy) {
    if (!blocked(e.x, e.y + dy, hw, hh)) e.y += dy;
    else if (assist) nudge(e, 'x', dy, hw, hh);
  }
}
// Corner assist: if a turn is blocked by a few pixels, slide toward the opening.
function nudge(e, axis, step, hw, hh) {
  for (let k = 1; k <= 7; k++) for (const s of [k, -k]) {
    const tx = axis === 'x' ? e.x + s : e.x + step, ty = axis === 'y' ? e.y + s : e.y + step;
    if (!blocked(tx, ty, hw, hh)) {
      const amt = Math.sign(s) * Math.min(Math.abs(step), Math.abs(s));
      if (axis === 'x' && !blocked(e.x + amt, e.y, hw, hh)) e.x += amt;
      if (axis === 'y' && !blocked(e.x, e.y + amt, hw, hh)) e.y += amt;
      return;
    }
  }
}

function inputDir() {
  if (dbg.input) return dbg.input;
  if (stick.id !== null) {
    const n = Math.hypot(stick.x, stick.y);
    if (n < CONFIG.stickDeadZone) return { x: 0, y: 0 };
    const mag = Math.min(1, (n - CONFIG.stickDeadZone) / (CONFIG.stickFullAt - CONFIG.stickDeadZone));
    return { x: stick.x / n * mag, y: stick.y / n * mag };
  }
  let x = 0, y = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
  const d = Math.hypot(x, y) || 1;
  return { x: x / d, y: y / d };
}

function faceOf(dx, dy, prev) {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return prev;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
}

function trailPoint(dist) {
  const tr = game.trail, i = Math.min(tr.length - 1, Math.floor(dist / 2));
  const a = tr[Math.max(0, i - 1)], b = tr[Math.min(tr.length - 1, i + 1)];
  const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1;
  return { x: tr[i].x, y: tr[i].y, nx: -dy / d, ny: dx / d };
}

const LANES = [0, -1, 1];
function update(dt) {
  const G = game;
  if (G.intro) { updateIntro(dt); return; } // V9: the swarm climbs out of the well first
  if (G.feast) { updateFeast(dt); return; } // H7: the world waits while the swarm eats
  if (G.card) { stepFx(dt); return; }       // R21: nothing moves until the title card is dismissed
  G.time += dt;

  // R1: lead rat follows the player's input
  const L = G.rats[0], dir = inputDir();
  const ox = L.x, oy = L.y;
  const P = G.powers; if (P.boostT > 0) { P.boostT = Math.max(0, P.boostT - dt); if (!P.boostT) hudCache.pw = null; }
  const lsp = CONFIG.ratSpeed * slowAt(L.x, L.y) * (P.boostT > 0 ? CONFIG.boostMult : 1) * dt; // R18 floodwater, P4 boost
  if (P.boostT > 0 && Math.random() < dt * 30) G.particles.push({ x: L.x + Math.random() * 6 - 3, y: L.y + Math.random() * 4, vx: 0, vy: -4, life: 0.35, max: 0.35, col: '#e9dcbc', size: 1 });
  moveWithSlide(L, dir.x * lsp, dir.y * lsp, 3, 3, true);
  L.moving = Math.hypot(L.x - ox, L.y - oy) > 0.01;
  L.face = faceOf(L.x - ox, L.y - oy, L.face);
  const head = G.trail[0];
  if (Math.hypot(L.x - head.x, L.y - head.y) >= 2) {
    G.trail.unshift({ x: L.x, y: L.y });
    const maxLen = Math.ceil(G.rats.length / 3) * 3 + 20;
    if (G.trail.length > maxLen) G.trail.length = maxLen;
  }

  // R1: the rest of the swarm runs along the leader's path, three abreast
  for (let i = 1; i < G.rats.length; i++) {
    const r = G.rats[i], k = i - 1;
    const p = trailPoint((Math.floor(k / 3) + 1) * 6);
    const off = LANES[k % 3] * 4 + Math.sin(G.time * 4 + i * 1.7) * 1.2;
    let tx = p.x + p.nx * off, ty = p.y + p.ny * off;
    if (solidAt(tx, ty)) { tx = p.x; ty = p.y; }
    const a = Math.min(1, dt * 12), mx = (tx - r.x) * a, my = (ty - r.y) * a;
    r.x += mx; r.y += my;
    r.moving = Math.hypot(mx, my) > 0.15;
    if (Math.hypot(mx, my) > 0.05) r.face = faceOf(mx, my, r.face);
  }
  for (const r of G.rats) {
    r.anim += dt;
    if (r.moving && r.anim > 0.08) { r.anim = 0; r.frame ^= 1; }
  }

  // R9: townsfolk wander, ignoring the rats, but scatter for a moment when someone near them falls sick
  for (const c of G.citizens) {
    if (c.super) { if (!c.gone) updateSpreader(c, dt); continue; } // P3
    c.t -= dt; if (c.scare > 0) c.scare -= dt;
    const sp = CONFIG.citizenSpeed * (c.infected ? CONFIG.infectedSpeedMult : c.scare > 0 ? CONFIG.scatterSpeedMult : 1) * slowAt(c.x, c.y) * dt;
    let stuck = false;
    if (c.dx || c.dy) {
      const bx = c.x, by = c.y;
      moveWithSlide(c, c.dx * sp, c.dy * sp, 3, 3, false);
      stuck = bx === c.x && by === c.y;
      c.anim += dt;
      if (c.anim > (c.scare > 0 ? 0.09 : 0.22)) { c.anim = 0; c.frame = c.frame ? 0 : 1; }
      if (c.dx) c.flip = c.dx < 0;
    }
    if (c.t <= 0 || stuck) {
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([x, y]) => !blocked(c.x + x * 6, c.y + y * 6, 3, 3));
      if (Math.random() < 0.15 || !opts.length) { c.dx = c.dy = 0; c.t = 0.6 + Math.random(); }
      else { [c.dx, c.dy] = opts[Math.floor(Math.random() * opts.length)]; c.t = 1.5 + Math.random() * 3; }
    }
    if (c.infected && Math.random() < dt * 1.6) {
      G.particles.push({ x: c.x + (Math.random() * 6 - 3), y: c.y - 14, vx: 0, vy: -8, life: 0.9, max: 0.9, col: PLAGUE, size: 1 });
    }
  }

  if (G.citizens.some(c => c.gone)) G.citizens = G.citizens.filter(c => !c.gone);

  // R3 + R4: a rat touching a healthy townsperson infects them and breeds rats
  const r2 = CONFIG.infectRadius * CONFIG.infectRadius;
  for (const c of G.citizens) {
    if (c.infected) continue;
    for (const r of G.rats) {
      const dx = r.x - c.x, dy = r.y - (c.y - 2);
      if (dx * dx + dy * dy <= r2) { infect(c); break; }
    }
  }

  // R5: a rat dies from the tail each time the countdown runs out (infect() restarts it)
  G.decayTimer += dt;
  while (G.rats.length && G.decayTimer >= decayIntervalFor(G.rats.length)) {
    G.decayTimer -= decayIntervalFor(G.rats.length);
    const dead = G.rats.pop();
    for (let i = 0; i < 6; i++) G.particles.push({ x: dead.x, y: dead.y, vx: (Math.random() - .5) * 20, vy: -10 - Math.random() * 14, life: 0.7, max: 0.7, col: '#8b8173', size: 1 });
    G.texts.push({ x: dead.x, y: dead.y - 6, text: '-1', col: '#d04a32', life: 0.8 });
    sfx.die();
  }

  const wk = warningLevel(G); // V22: a heartbeat as the countdown passes halfway with few rats left
  if (wk >= 0.5 && !G.beat) { G.beat = true; sfx.heart(); } else if (wk < 0.5) G.beat = false;

  updateHazards(dt);
  updateHunters(dt);
  if (state !== 'playing') return;

  for (const a of ambient) { // chimney smoke from bakeries and smithies
    if (a.type === 'smoke' && Math.random() < dt * 2.5) {
      G.particles.push({ x: a.x + Math.random() * 2 - 1, y: a.y, vx: 3 + Math.random() * 3, vy: -7 - Math.random() * 3, life: 2.4, max: 2.4, col: pick(Math.random, ['#8a8478', '#6e6a62', '#a19b90']), size: 2 });
    }
  }
  stepFx(dt);

  // R6 / R7: win needs the infection target AND every hunter eaten
  if (targetMet(G) && huntersLeft(G) === 0) endGame(true);
  else if (G.rats.length === 0) endGame(false);
}
const targetMet = G => G.infected * 100 >= CONFIG.targetPercent * CONFIG.population;
const huntersLeft = G => G.hunters.filter(h => h.alive).length;
function stepFx(dt) {
  const G = game;
  for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  G.particles = G.particles.filter(p => p.life > 0);
  for (const t of G.texts) { t.y -= 14 * dt; t.life -= dt; }
  G.texts = G.texts.filter(t => t.life > 0);
}

// R13: the bigger the swarm, the shorter the die-off countdown
function decayIntervalFor(n) {
  const tier = Math.max(0, Math.floor((n - 1) / CONFIG.decayStepEvery));
  return Math.max(CONFIG.decayMin, +(CONFIG.decayInterval - tier * CONFIG.decayStep).toFixed(2));
}

function infect(c) {
  const G = game;
  c.infected = true; G.infected++; c.phase = Math.random() * 6;
  if (CONFIG.decayResetOnInfect) G.decayTimer = 0;
  for (let i = 0; i < CONFIG.ratsPerInfection; i++) G.rats.push(newRat(c.x, c.y));
  G.peak = Math.max(G.peak, G.rats.length);
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2, s = 10 + Math.random() * 25;
    G.particles.push({ x: c.x, y: c.y - 5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, max: 0.5, col: Math.random() < .5 ? PLAGUE : PLAGUE_DARK, size: 1 + (Math.random() < .3) });
  }
  G.texts.push({ x: c.x - 3, y: c.y - 16, text: '+' + CONFIG.ratsPerInfection, col: PLAGUE, life: 0.8 });
  G.streak = G.time - (G.lastInfect ?? -9) < CONFIG.streakWindow ? (G.streak || 0) + 1 : 0; G.lastInfect = G.time; // A10
  sfx.infect(G.streak);
  awardPoints(CONFIG.pointsPerInfection); // P1
  if (G.powers.biteArmed) makeSpreader(c); // P3
  scatterFrom(c); // R9
}
// R9: healthy townsfolk near a new infection run away from it for a moment.
function scatterFrom(src) {
  const R = CONFIG.scatterRadius;
  for (const c of game.citizens) {
    if (c.infected || c.super || c.gone) continue;
    const ax = c.x - src.x, ay = c.y - src.y, d = Math.hypot(ax, ay);
    if (d > R) continue;
    let best = null, bestDot = -2;
    for (const [x, y] of DIRS4) {
      if (blocked(c.x + x * 6, c.y + y * 6, 3, 3)) continue;
      const dot = (x * ax + y * ay) / (d || 1);
      if (dot > bestDot) { bestDot = dot; best = [x, y]; }
    }
    if (!best) continue;
    if (!(c.scare > 0)) { game.texts.push({ x: c.x - 1, y: c.y - 22, text: '!', col: '#e9dcbc', life: 0.5 }); screamSfx(); } // A11
    [c.dx, c.dy] = best; c.t = c.scare = CONFIG.scatterTime;
    if (c.dx) c.flip = c.dx < 0;
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function updateCam(G) { // the camera keeps the Rat King centred (hunters use it to tell what's on screen, H4)
  const L = G.rats[0] || G.trail[0], mw = MAP_W * TILE, mh = MAP_H * TILE;
  const cx = mw <= view.w ? (mw - view.w) / 2 : Math.max(0, Math.min(mw - view.w, L.x - view.w / 2));
  const cy = mh <= view.h ? (mh - view.h) / 2 : Math.max(0, Math.min(mh - view.h, L.y - view.h / 2));
  G.cam.x = Math.round(cx); G.cam.y = Math.round(cy);
}
function render() {
  const G = game;
  updateCam(G);
  const sh = shakeOffset(), ox = -G.cam.x + sh.x, oy = -G.cam.y + sh.y; // V22: screen shake moves the picture, not the camera

  ctx.fillStyle = '#120f0c'; ctx.fillRect(0, 0, view.w, view.h);
  ctx.drawImage(mapCanvas, ox, oy);

  for (const a of ambient) { // flickering lanterns, forges and street lamps
    if (a.type === 'smoke') continue;
    const sx = a.x + ox, sy = a.y + oy;
    if (sx < -20 || sy < -20 || sx > view.w + 20 || sy > view.h + 20) continue;
    ctx.globalAlpha = 0.14 + 0.05 * Math.sin(G.time * 9 + a.x) + Math.random() * 0.03;
    disc(ctx, sx, sy, a.r, a.col);
    if (a.type === 'brazier') { ctx.globalAlpha = 1; drawFlame(sx, sy + 2, G.time + a.x, 6); }
    else if (a.type === 'ember' && Math.random() < 0.04) G.particles.push({ x: a.x + Math.random() * 6 - 3, y: a.y, vx: Math.random() * 8 - 4, vy: -14, life: 0.9, max: 0.9, col: pick(Math.random, ['#ff9a30', '#ffcf60']), size: 1 });
  }
  ctx.globalAlpha = 1;
  drawHazards(G, ox, oy);

  if (G.rats[0]) { // miasma under the lead rat
    const pulse = 9 + Math.round(Math.sin(G.time * 5));
    ctx.globalAlpha = 0.22; disc(ctx, G.rats[0].x + ox, G.rats[0].y + oy, pulse, PLAGUE); ctx.globalAlpha = 1;
    const K = G.rats[0], kx = Math.round(K.x + ox), ky = Math.round(K.y + oy);
    if (G.powers.biteArmed) { // P3: a dripping green ring round the King while the bite is ready
      const r = 11 + Math.round(Math.sin(G.time * 12)); ctx.fillStyle = SPREADER_COL;
      for (let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2 + G.time * 2; ctx.fillRect(Math.round(kx + Math.cos(t) * r), Math.round(ky + Math.sin(t) * r * 0.7), 1, 1 + (a % 5 === 0)); }
    }
    if (G.powers.boostT > 0) { // P4: speed lines streaming off the King while dashing
      ctx.fillStyle = 'rgba(255,215,90,.7)';
      const dx = K.x - G.trail[Math.min(G.trail.length - 1, 4)].x, dy = K.y - G.trail[Math.min(G.trail.length - 1, 4)].y, d = Math.hypot(dx, dy) || 1;
      for (let k = -1; k <= 1; k++) { const px = kx - dx / d * 7 + (-dy / d) * k * 3, py = ky - dy / d * 7 + (dx / d) * k * 3; for (let j = 0; j < 4 + (k === 0) * 3; j++) ctx.fillRect(Math.round(px - dx / d * j), Math.round(py - dy / d * j), 1, 1); }
    }
  }

  const ents = [];
  for (const r of G.rats) ents.push({ y: r.y, r });
  for (const c of G.citizens) ents.push({ y: c.y, c });
  for (const h of G.hunters) if (h.alive) ents.push({ y: h.y, h });
  for (const c of G.carts || []) ents.push({ y: cartPos(c)[1] + 6, cart: c });
  drawSpreaderFx(G, ox, oy);
  if (G.feast) drawFeast(ox, oy);
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) {
    if (e.cart) drawCart(e.cart, ox, oy);
    else if (e.h) drawHunter(e.h, ox, oy);
    else if (e.r) {
      const r = e.r, s = (r === G.rats[0] ? kingSprites : ratSprites)[r.face][r.frame];
      if (r.hidden) continue;
      if (r.z > 0.5) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(r.x - 3 + ox), Math.round(r.y + 2 + oy), 6, 2); }
      ctx.drawImage(s, Math.round(r.x - s.width / 2 + ox), Math.round(r.y - s.height / 2 - (r.z || 0) + oy));
    } else {
      const c = e.c, s = (c.infected ? c.sprites.infected : c.sprites.healthy)[c.frame || 0];
      const W = s.width, H = s.height, x = Math.round(c.x - W / 2 + ox), y = Math.round(c.y - H + 2 + oy);
      if (c.infected) { // sickly glow on the ground
        ctx.globalAlpha = 0.18 + 0.08 * Math.sin(G.time * 4 + c.phase);
        disc(ctx, Math.round(c.x + ox), Math.round(c.y + oy), 6, PLAGUE); ctx.globalAlpha = 1;
      }
      drawFootShadow(x, y + H - 2, W);
      if (c.flip) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(s, -x - W, y); ctx.restore(); }
      else ctx.drawImage(s, x, y);
    }
  }
  for (const p of G.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x + ox), Math.round(p.y + oy), p.size, p.size);
  }
  ctx.globalAlpha = 1;
  if (THEME.night) drawNight(G, ox, oy);
  if (THEME.snow) drawSnowfall();
  if (THEME.rain) drawRain();
  for (const h of G.hunters) if (h.alive && !h.dying) drawHunterNumber(h, ox, oy);
  for (const t of G.texts) pixText(ctx, t.text, Math.round(t.x + ox), Math.round(t.y + oy), t.col);
  if (vignette) ctx.drawImage(vignette, 0, 0);
  drawWarning(G);
  drawHunterArrows(G, -G.cam.x, -G.cam.y);
}

// V22: screen shake and phone vibration for big moments (catches, feasts, bursts, deaths), if switched on.
const shake = { t: 0, dur: 1, amp: 0 };
function jolt(amp, dur, buzz) {
  if (!shakeOn) return;
  if (amp >= shake.amp * (shake.t / shake.dur)) { shake.amp = amp; shake.t = shake.dur = dur; }
  if (buzz) buzzPhone(buzz);
}
function shakeOffset() { // a fast wobble that dies away, in game pixels
  if (shake.t <= 0) return { x: 0, y: 0 };
  const a = shake.amp * (shake.t / shake.dur) ** 1.5, t = shake.t * 60;
  return { x: Math.round(Math.sin(t * 0.9) * a), y: Math.round(Math.cos(t * 1.13) * a * 0.8) };
}
// Vibration where the browser allows it (Android). iPhones have no vibration for web pages; on iOS 18+
// tapping a hidden switch control gives a small haptic tick, so that is used instead (best effort).
let hapticLabel = null;
function buzzPhone(pattern) {
  try {
    if (navigator.vibrate && navigator.vibrate(pattern)) return;
    if (!hapticLabel) {
      hapticLabel = document.createElement('label'); hapticLabel.setAttribute('aria-hidden', 'true');
      hapticLabel.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      const sw = document.createElement('input'); sw.type = 'checkbox'; sw.setAttribute('switch', ''); sw.tabIndex = -1;
      hapticLabel.appendChild(sw); document.body.appendChild(hapticLabel);
    }
    const n = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1; // one tick per pulse
    for (let i = 0; i < n; i++) setTimeout(() => hapticLabel.click(), i * 120);
  } catch (e) { /* no haptics here */ }
}

// V22: low-swarm warning. With only a few rats left, a red glow pulses in from the edges,
// faster as the die-off countdown runs down, with a heartbeat each time it passes halfway.
let warnCanvas = null, warnOn = false;
function setWarn(on) { if (warnOn !== on) { warnOn = on; $('swarmBox').classList.toggle('warn', on); } }
function warningLevel(G) {
  if (G.intro || G.card || G.feast || !G.rats.length || G.rats.length > CONFIG.warnRats) return 0;
  return G.decayTimer / decayIntervalFor(G.rats.length);
}
function drawWarning(G) {
  const on = state === 'playing' && G.rats.length > 0 && G.rats.length <= CONFIG.warnRats && !G.intro && !G.card && !G.feast;
  setWarn(on); if (!on) return;
  const k = warningLevel(G);
  if (!warnCanvas || warnCanvas.width !== view.w || warnCanvas.height !== view.h) {
    warnCanvas = makeCanvas(view.w, view.h); const g = warnCanvas.getContext('2d');
    const gr = g.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.3, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.7);
    gr.addColorStop(0, 'rgba(208,40,30,0)'); gr.addColorStop(1, 'rgba(220,30,20,.9)'); g.fillStyle = gr; g.fillRect(0, 0, view.w, view.h);
  }
  const rate = 3 + k * 9;
  ctx.globalAlpha = (0.4 + 0.5 * k) * (0.6 + 0.4 * Math.sin(G.time * rate)); ctx.drawImage(warnCanvas, 0, 0); ctx.globalAlpha = 1;
}

// H8: arrows at the edge of the view point to every hunter off screen.
function drawHunterArrows(G, ox, oy) {
  if (!huntersLeft(G) || !G.rats[0]) return;
  const cx = view.w / 2, cy = view.h / 2, M = 8, bob = Math.round(Math.sin(G.time * 6));
  for (const h of G.hunters) {
    if (!h.alive || h.dying) continue;
    const hx = h.x + ox, hy = h.y - 8 + oy;
    if (hx > 0 && hx < view.w && hy > 0 && hy < view.h) continue; // on screen: no arrow needed
    const dx = hx - cx, dy = hy - cy, k = Math.min((cx - M) / Math.abs(dx || 1e-6), (cy - M) / Math.abs(dy || 1e-6));
    const d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const ax = Math.round(cx + dx * k + ux * bob), ay = Math.round(cy + dy * k + uy * bob), col = hunterCol(h);
    const spr = arrowSprite(Math.atan2(uy, ux), col); ctx.drawImage(spr, ax - (spr.width >> 1), ay - (spr.height >> 1)); // pixel-art arrowhead (js/icons.js)
    const t = String(h.number), tx = Math.round(ax - ux * 12 - (t.length * 4 - 1) / 2), ty = Math.round(ay - uy * 12 - 2);
    pixText(ctx, t, tx, ty, col);
  }
}

// A soft two-row oval shadow under a standing figure.
function drawFootShadow(x, y, W) {
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(x + 3, y, W - 6, 2);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x + W - 3, y, 1, 1);
}

// V7: night in the Palace Ward. Darkness everywhere except around light sources.
let lightCanvas = null, lctx = null;
function drawNight(G, ox, oy) {
  if (!lightCanvas || lightCanvas.width !== view.w || lightCanvas.height !== view.h) { lightCanvas = makeCanvas(view.w, view.h); lctx = lightCanvas.getContext('2d'); }
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, view.w, view.h);
  lctx.fillStyle = 'rgba(6,8,26,.66)'; lctx.fillRect(0, 0, view.w, view.h);
  lctx.globalCompositeOperation = 'destination-out';
  const light = (x, y, r) => {
    if (x < -r || y < -r || x > view.w + r || y > view.h + r) return;
    const gr = lctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = gr; lctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  if (G.rats[0]) light(G.rats[0].x + ox, G.rats[0].y + oy, 70);
  for (const a of ambient) if (a.type !== 'smoke') light(a.x + ox, a.y + oy, a.type === 'lamp' ? 44 : 30);
  for (const h of G.hunters) if (h.alive) light(h.x + ox, h.y - 6 + oy, 34); // hunters carry lanterns
  for (const c of G.citizens) if (c.infected) light(c.x + ox, c.y - 4 + oy, 12); // the sick glow
  ctx.drawImage(lightCanvas, 0, 0);
}

// V7: snow falling over Frostgate (screen space, purely decorative).
const flakes = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 0.8 }));
function drawSnowfall() {
  ctx.fillStyle = '#f4f7fa';
  const t = performance.now() / 1000;
  for (const f of flakes) {
    const x = ((f.x * view.w + Math.sin(t * f.s * 2 + f.y * 9) * 6 + t * 8 * f.s) % view.w + view.w) % view.w;
    const y = ((f.y * view.h + t * 18 * f.s) % view.h + view.h) % view.h;
    ctx.globalAlpha = 0.5 + f.s * 0.4; ctx.fillRect(Math.round(x), Math.round(y), f.s > 0.9 ? 2 : 1, 1);
  }
  ctx.globalAlpha = 1;
}

// R12: minimap shows only the player and the townsfolk who are still healthy.
const mini = document.getElementById('minimap'), mctx = mini.getContext('2d');
function renderMinimap() {
  const G = game, cell = CONFIG.minimapCell * TILE;
  const w = Math.ceil(MAP_W / CONFIG.minimapCell), h = Math.ceil(MAP_H / CONFIG.minimapCell);
  if (mini.width !== w * 2) { mini.width = w * 2; mini.height = h * 2; }
  mctx.fillStyle = 'rgba(18,15,12,.72)'; mctx.fillRect(0, 0, mini.width, mini.height);
  mctx.fillStyle = '#e9dcbc';
  for (const c of G.citizens) {
    if (!c.infected) mctx.fillRect(Math.floor(c.x / cell) * 2, Math.floor(c.y / cell) * 2, 2, 2);
  }
  for (const h of G.hunters) { // H2: hunters stand out on the minimap
    if (!h.alive || h.dying) continue;
    const px = Math.floor(h.x / cell) * 2, py = Math.floor(h.y / cell) * 2;
    mctx.fillStyle = '#120f0c'; mctx.fillRect(px - 3, py - 3, 8, 8);
    mctx.fillStyle = hunterCol(h); mctx.fillRect(px - 2, py - 2, 6, 6);
  }
  if (G.key && !G.hasKey && Math.floor(G.time * 2) % 2 === 0) { // R16: the key blinks gold until found
    const px = Math.floor(G.key.x / cell) * 2, py = Math.floor(G.key.y / cell) * 2;
    mctx.fillStyle = '#120f0c'; mctx.fillRect(px - 2, py - 2, 6, 6); mctx.fillStyle = '#ffd75a'; mctx.fillRect(px - 1, py - 1, 4, 4);
  }
  if (G.hasKey) for (const gr of HAZ.grates) { // open grates as purple rings
    const px = Math.floor(gr.x / cell) * 2, py = Math.floor(gr.y / cell) * 2;
    mctx.fillStyle = PLAGUE; mctx.fillRect(px - 2, py - 2, 6, 6); mctx.fillStyle = '#120f0c'; mctx.fillRect(px - 1, py - 1, 4, 4);
  }
  const L = G.rats[0];
  if (L && Math.floor(G.time * 3) % 3 !== 0) {
    const px = Math.floor(L.x / cell) * 2, py = Math.floor(L.y / cell) * 2;
    mctx.fillStyle = PLAGUE; mctx.fillRect(px - 2, py - 2, 6, 6);
    mctx.fillStyle = '#120f0c'; mctx.fillRect(px, py, 2, 2);
  }
}

function makeVignette() {
  const v = makeCanvas(view.w, view.h), g = v.getContext('2d');
  const grad = g.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.35, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75);
  grad.addColorStop(0, 'rgba(10,8,6,0)'); grad.addColorStop(1, 'rgba(10,8,6,.6)');
  g.fillStyle = grad; g.fillRect(0, 0, view.w, view.h);
  return v;
}

// V16: while playing, the level fills only the space between the top and bottom HUD bars.
function setFramed(on) {
  $('hud').hidden = !on; $('bottomBar').hidden = !on;
  (on ? $('muteSlot') : document.body).appendChild($('mute'));
  if (!on) { $('tip').hidden = true; clearBanners(); } // the sound button lives in the bar while playing
  document.body.classList.toggle('framed', on);
  resize();
}
function resize() {
  const W = window.innerWidth, H = window.innerHeight, framed = !$('bottomBar').hidden, land = framed && W > H * 1.2;
  document.body.classList.toggle('land', land); // landscape: the bars stand at the sides
  let top = 0, bottom = H, left = 0, right = W;
  if (land) { // whichever bar is on the left (V17 swaps them for left-handed players)
    const a = $('hud').getBoundingClientRect(), b = $('bottomBar').getBoundingClientRect(), [l, r] = a.left < b.left ? [a, b] : [b, a];
    left = Math.round(l.right) + 6; right = Math.round(r.left) - 6;
  }
  else if (framed) { top = Math.round($('hud').getBoundingClientRect().bottom) + 6; bottom = Math.round($('bottomBar').getBoundingClientRect().top) - 6; }
  const PW = Math.max(60, right - left), PH = Math.max(60, bottom - top);
  const scale = Math.max(1, Math.round(Math.min(PW, PH) / 190));
  view = { w: Math.ceil(PW / scale), h: Math.ceil(PH / scale), scale };
  canvas.width = view.w; canvas.height = view.h;
  canvas.style.top = top + 'px'; canvas.style.left = left + 'px';
  canvas.style.width = view.w * scale + 'px'; canvas.style.height = view.h * scale + 'px';
  ctx.imageSmoothingEnabled = false;
  vignette = makeVignette();
}
