// Plague Rat: logo, opening story and intro jingle.
'use strict';

// ---------------------------------------------------------------------------
// V10 + A6: the opening story, shown once per launch before the title screen.
// Side-on vignettes on a 240x135 stage, scaled to fit. Any key or tap skips.
// ---------------------------------------------------------------------------
const STAGE_W = 480, STAGE_H = 270, CUT_END = 23;
const CUT_CAPTIONS = [
  [0.3, 5.6, 'The people of the city kicked us and chased us away.'],
  [6.3, 11.6, 'So we hid below, in the dark and the filth.'],
  [12.3, 17.6, 'Then the sickness came down the drains. We drank it gladly.'],
  [18.9, 22.6, 'Now the city will catch what we carry.'],
];
const DRIPS = [[6.8, 60], [7.9, 150], [8.6, 95], [9.7, 200], [10.4, 40], [11.1, 130]];
const stage = makeCanvas(STAGE_W, STAGE_H), sc = stage.getContext('2d');
sc.imageSmoothingEnabled = false;
const cut = { t: 0, parts: [], bus: null, bg: {} };

const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
const span = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
function linePx(g, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy; g.fillStyle = col;
  for (;;) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}

// ---- V10/V13 hi-res cutscene art: shared shape helpers ---------------------
function ell(g, cx, cy, rx, ry, col) { // pixel-quantised filled ellipse
  g.fillStyle = col;
  const R = Math.ceil(ry);
  for (let y = -R; y <= R; y++) {
    const k = 1 - (y * y) / (ry * ry); if (k < 0) continue;
    const w = Math.round(rx * Math.sqrt(k));
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function thick(g, x0, y0, x1, y1, w, col) { // a limb: a line of squares
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  g.fillStyle = col;
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w); }
}
function poly(g, pts, col) { // crisp scanline polygon fill (no anti-aliasing)
  g.fillStyle = col;
  const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) { const a = Math.round(xs[i]), b = Math.round(xs[i + 1]); if (b > a) g.fillRect(a, y, b - a, 1); }
  }
}
function edge(g, pts, col, closed = true) { for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; linePx(g, a[0], a[1], b[0], b[1], col); } }

// V18: the opening story is drawn like a bright storybook pixel painting: flat colour with one
// shadow and one light tone per material, and a soft dark-brown outline traced round each figure.
const INK = '#2b1d17';
const figPool = {};
function figCanvas(w, h) { const k = w + 'x' + h; if (!figPool[k]) { const c = makeCanvas(w, h); figPool[k] = [c, c.getContext('2d')]; } const [c, g] = figPool[k]; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); return [c, g]; }
function inkOutline(c, g, col = INK) { // trace a 1px outline round everything drawn on c
  const w = c.width, h = c.height, img = g.getImageData(0, 0, w, h), d = img.data, edge = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] > 0) { d[i + 3] = 255; continue; }
    if ((x > 0 && d[i - 1] > 0) || (x < w - 1 && d[i + 7] > 0) || (y > 0 && d[i - w * 4 + 3] > 0) || (y < h - 1 && d[i + w * 4 + 3] > 0)) edge.push(i);
  }
  const r = parseInt(col.slice(1, 3), 16), gg = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
  for (const i of edge) { d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
}
function blit(g, c, x, y, ox, oy, dir, k = 1) { // draw a figure canvas with its origin at (x, y), mirrored for dir -1
  g.save(); g.imageSmoothingEnabled = false; g.translate(Math.round(x), Math.round(y)); g.scale(dir, 1);
  g.drawImage(c, -Math.round(ox * k), -Math.round(oy * k), Math.round(c.width * k), Math.round(c.height * k)); g.restore();
}
const tone3 = col => [shade(col, 0.74), col, shade(col, 1.16)]; // shadow, base, light

// A brown street rat, side on (~44x20). Origin at its feet; dir 1 faces right.
// o.run animates legs, o.hop lifts it, o.plague turns it, o.crown marks the Rat King.
function ratHR(g, x, y, dir, t, o = {}) {
  const run = o.run || 0, plague = !!o.plague, king = !!o.crown, ph = t * 22 + x * 0.3;
  const [c, f] = figCanvas(64, 40), OX = 30, OY = 34;
  f.translate(OX, OY);
  const [fD, fur, fL] = king ? ['#1e1820', '#342a38', '#5a4a62'] : plague ? ['#4e2470', '#7a3eac', '#a670d8'] : ['#5a3a26', '#7e5436', '#a2744c'];
  const pink = plague ? '#e0a0e8' : '#e0a090', pinkD = plague ? '#b070c0' : '#b87868';
  // tail: a long pink S
  for (let i = 0; i < 24; i++) { const tx = -12 - i, ty = -5 - Math.sin(i / 24 * Math.PI) * 5 + Math.sin(t * 4 + i * 0.4) * (i / 24) * 2; f.fillStyle = i < 6 ? pinkD : pink; f.fillRect(Math.round(tx), Math.round(ty), 1, i < 9 ? 2 : 1); }
  const s = Math.sin(ph) * 3 * run, cc = Math.cos(ph) * 2 * run;
  thick(f, -7, -5, -8 - s, -1, 2, fD); thick(f, 7, -5, 9 + s, -1, 2, fD);                         // far legs
  ell(f, -1, -8, 13, 6.5, fur); ell(f, 9, -9, 7, 5, fur); poly(f, [[12, -13], [21, -7], [19, -5], [11, -4]], fur); // body, shoulders, snout
  ell(f, -2, -10, 10, 3.5, fL); ell(f, 9, -11, 5, 2.5, fL);                                       // light along the back
  ell(f, 0, -5, 10, 2, fD);                                                                          // shadowed belly line
  thick(f, -5, -4, -5 + s, Math.min(0, -1 - cc), 2, pinkD); thick(f, 10, -4, 11 - s, Math.min(0, -1 + cc), 2, pinkD); // near legs
  ell(f, 9, -15, 3, 3, fD); ell(f, 9, -15, 2, 2, pink);                                             // ear
  f.fillStyle = plague ? '#f6c8ff' : INK; f.fillRect(15, -10, 2, 2); f.fillStyle = '#fff'; f.fillRect(15, -10, 1, 1); // eye
  f.fillStyle = pink; f.fillRect(20, -7, 2, 2);                                                       // nose
  if (plague) { f.fillStyle = '#e8b8ff'; for (const [px, py] of [[-6, -9], [2, -11], [-1, -6]]) f.fillRect(px, py, 2, 2); }
  if (king) {
    poly(f, [[6, -16], [6, -21], [8, -19], [10, -23], [12, -19], [14, -21], [14, -16]], '#e0b040');
    f.fillStyle = '#fff2b0'; f.fillRect(10, -22, 1, 2); f.fillStyle = '#9a6a1a'; f.fillRect(6, -17, 9, 1); f.fillStyle = '#c05cff'; f.fillRect(9, -19, 2, 2);
  }
  inkOutline(c, f, king ? '#120a14' : plague ? '#2a1430' : INK);
  if (plague) { g.globalAlpha = 0.25; ell(g, x, y - 9, 18, 10, '#c05cff'); g.globalAlpha = 1; }
  g.fillStyle = 'rgba(40,30,20,.28)'; g.fillRect(Math.round(x - 12), Math.round(y), 24, 2);
  const k = king ? 1.25 : 1;
  blit(g, c, x + (o.tremble ? Math.round(Math.sin(t * 50 + x)) : 0), y - (o.hop || 0), OX, OY, dir, k);
}

function cutBurst(x, y, n, cols, sp = 20, life = 0.6, up = 10) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random()); cut.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, life, max: life, col: pick(Math.random, cols) }); }
}
// ---- V18 backdrops ------------------------------------------------------------
function bandSky(g, w, top, bottom, cols) { // stepped gradient with a dithered seam between bands
  const bh = (bottom - top) / cols.length;
  cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, Math.round(top + i * bh), w, Math.ceil(bh) + 1); });
  cols.forEach((c, i) => { if (!i) return; g.fillStyle = c; const y = Math.round(top + i * bh) - 1; for (let x = (i % 2); x < w; x += 2) g.fillRect(x, y, 1, 1); });
}
function cutAssets() { if (!cut.bg.sewerP) cut.bg.sewerP = paintSewer(); } // painted once, on first use
function drawSmoke(t, x, y) { // chimney smoke drifting off to the right
  for (let i = 0; i < 6; i++) {
    const k = ((t * 0.35 + i / 6) % 1), r = 3 + k * 7;
    sc.globalAlpha = 0.45 * (1 - k); ell(sc, x + k * 26 + Math.sin(t + i) * 2, y - k * 40, r, r * 0.8, '#e8e4de');
  }
  sc.globalAlpha = 1;
}
// V19: the first scene is the designer's painted street (assets/intro-street.jpg), shown as it is.
// The townsfolk stay put; only the rat moves, scurrying between them, shooed and kicked away.
const STREET_IMG = { img: new Image(), bg: null, rat: null, k: STAGE_W / 1408, y0: (STAGE_H - 768 * STAGE_W / 1408) / 2 };
STREET_IMG.img.src = 'assets/intro-street.jpg';
Promise.all([STREET_IMG.img.decode?.(), document.fonts?.load('600 12px "Pixelify Sans"')]).then(prepStreetImage).catch(() => {});
function prepStreetImage() {
  const im = STREET_IMG.img;
  if (!im.naturalWidth) return;
  // the backdrop, with the painted rat covered by a patch of flagstones from further along the street
  const bg = makeCanvas(1408, 768), g = bg.getContext('2d');
  g.drawImage(im, 0, 0); g.drawImage(im, 300, 683, 120, 62, 870, 683, 120, 62);
  paintTavernSign(g);
  STREET_IMG.bg = bg;
  // the painted rat itself, cut out from the pavement, becomes the rat we animate
  try {
    const r = makeCanvas(116, 62), rg = r.getContext('2d');
    rg.drawImage(im, 872, 684, 116, 62, 0, 0, 116, 62);
    const d = rg.getImageData(0, 0, 116, 62), p = d.data;
    for (let i = 0; i < p.length; i += 4) { // keep the brown fur and dark outline; drop pale or grey-blue pavement
      const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2];
      if (l > 125 || (p[i + 2] >= p[i] - 4 && l > 66)) p[i + 3] = 0;
    }
    rg.putImageData(d, 0, 0);
    STREET_IMG.rat = r;
  } catch (e) { STREET_IMG.rat = null; } // pixels unreadable (e.g. opened from a file): the drawn rat stands in
}
// The painting's tavern sign is repainted to read THE RAT & CROWN: the old lettering is covered with
// the board's green, then chunky cream capitals are drawn on, sheared to follow the sign's slant.
function paintTavernSign(g) {
  const SLOPE = 0.2;
  g.fillStyle = '#45603b';
  g.beginPath(); g.moveTo(199, 126); g.lineTo(534, 193); g.lineTo(536, 229); g.lineTo(199, 181); g.closePath(); g.fill();
  const t = makeCanvas(140, 20), tg = t.getContext('2d');
  tg.font = '600 11px "Pixelify Sans", ui-monospace, monospace'; tg.textBaseline = 'top'; tg.fillStyle = '#dccb92';
  const text = 'THE RAT & CROWN', w = Math.ceil(tg.measureText(text).width); tg.fillText(text, 1, 2);
  const d = tg.getImageData(0, 0, 140, 20); for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 100 ? 255 : 0; tg.putImageData(d, 0, 0); // hard pixel edges
  const f = w * 3 <= 322 ? 3 : 2, cx = 369, x0 = Math.round(cx - (w * f) / 2);
  g.save(); g.imageSmoothingEnabled = false; g.setTransform(1, SLOPE, 0, 1, 0, 0);
  g.drawImage(t, 0, 0, w + 2, 20, x0, Math.round(183 - SLOPE * cx - 7 * f), (w + 2) * f, 20 * f); // centred on the board
  g.restore();
}
const DRAIN = { x: 62, y: 252 };
function bang(x, y) { // a red "!" over someone's head
  x = Math.round(x); y = Math.round(y);
  sc.fillStyle = INK; sc.fillRect(x - 2, y - 1, 6, 14); sc.fillRect(x - 2, y + 14, 6, 6);
  sc.fillStyle = '#e0402c'; sc.fillRect(x - 1, y, 4, 12); sc.fillRect(x - 1, y + 15, 4, 4);
  sc.fillStyle = '#ff8a6a'; sc.fillRect(x - 1, y, 1, 8);
}
function swoosh(cx, cy, r, a0, a1, alpha) { // motion lines: a short white arc
  sc.globalAlpha = alpha;
  for (let i = 0; i < 3; i++) for (let k = 0; k <= 10; k++) { const a = a0 + (a1 - a0) * k / 10, rr = r - i * 4; sc.fillStyle = i ? '#f4f0e6' : '#ffffff'; sc.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.7), 2, 2); }
  sc.globalAlpha = 1;
}
function sceneStreet(t) {
  // the lantern by the door glows a little
  sc.globalAlpha = 0.1 + Math.random() * 0.05; ell(sc, 392, 58, 10, 10, '#ffd890'); sc.globalAlpha = 1;
  // the drain the rat escapes down
  sc.fillStyle = '#4a4440'; sc.fillRect(DRAIN.x - 13, DRAIN.y - 3, 26, 7); sc.fillStyle = '#1a1614'; sc.fillRect(DRAIN.x - 12, DRAIN.y - 2, 24, 5);
  sc.fillStyle = '#7a746c'; for (let gx = DRAIN.x - 11; gx < DRAIN.x + 12; gx += 4) sc.fillRect(gx, DRAIN.y - 2, 2, 5); sc.fillStyle = '#a49c90'; sc.fillRect(DRAIN.x - 13, DRAIN.y - 3, 26, 1);
  const G = 250;
  if (t < 3.6) { sc.fillStyle = '#c8904a'; for (const [cx, cy] of [[146, 0], [151, 1], [156, 0], [149, -1], [160, 1]]) sc.fillRect(cx, G + cy, 2, 2); sc.fillStyle = '#e8b870'; sc.fillRect(151, G, 1, 1); } // crumbs from her basket
  let x = 154, hop = 0, rot = 0, run = 0, show = true;
  if (t < 1.2) { x = lerp(510, 374, span(t, 0, 1.2)); run = 1; }
  else if (t < 1.9) { x = 374 + Math.sin(t * 14) * 1.5; }                                          // sniffing at her feet
  else if (t < 2.15) { const k = span(t, 1.9, 2.15); x = lerp(374, 342, k); hop = Math.sin(k * Math.PI) * 16; run = 1; }
  else if (t < 2.9) { x = lerp(342, 154, span(t, 2.15, 2.9)); run = 1.3; }
  else if (t < 3.6) { x = 154 + (Math.sin(t * 18) > 0 ? 1 : 0); }                                  // at the crumbs
  else if (t < 4.25) { const k = span(t, 3.6, 4.25); x = lerp(154, 96, k); hop = Math.sin(k * Math.PI) * 44; rot = -k * Math.PI * 2; } // kicked!
  else if (t < 4.45) { x = 96 + Math.round(Math.sin(t * 60)); }                                    // dazed
  else if (t < 4.95) { x = lerp(96, DRAIN.x, span(t, 4.45, 4.95)); run = 1.4; }
  else show = false;
  if (show) ratSprite(x, G + 2, -1, t, { run, hop, rot });
  // the townsfolk react
  if (t > 1.85 && t < 2.6) { bang(345, 100); swoosh(368, 236, 16, -0.4, 1.2, 1 - span(t, 2.1, 2.6)); }
  if (t > 3.5 && t < 4.4) { bang(180, 92); swoosh(162, 240, 18, 2.6, 1.0, 1 - span(t, 3.8, 4.3)); }
  if (t > 4.6 && t < 5.4) bang(180, 92);
  if (t > 1.9 && !cut.s1a) { cut.s1a = 1; cutBurst(372, G, 10, ['#b8b0a0', '#d8d0b8'], 30, 0.5, 10); }
  if (t > 3.62 && !cut.s1b) { cut.s1b = 1; cutBurst(156, G - 6, 14, ['#ffffff', '#f2c14a', '#c8904a'], 44, 0.5, 16); }
  if (t > 4.25 && !cut.s1c) { cut.s1c = 1; cutBurst(96, G, 10, ['#b8b0a0', '#d8d0b8'], 30, 0.5, 8); }
  if (t > 4.95 && !cut.s1d) { cut.s1d = 1; cutBurst(DRAIN.x, G, 10, ['#4a5a60', '#8aa0a8'], 22, 0.4, 14); }
}
// V20: the sewer is painted to match the street painting: drawn on a coarse 352x192 grid (one cell =
// four of the painting's pixels), lit by the street grate with stepped light bands, then scaled up.
function paintSewer() {
  const W = 352, H = 192, c = makeCanvas(W, H), g = c.getContext('2d'), rng = mulberry32(4207);
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  r(0, 0, W, H, '#1c1418');
  // brick wall, each brick bevelled
  const BR = ['#7a5446', '#70503f', '#83594a', '#6a4a3e', '#7d5a48', '#74523f'];
  for (let y = 0; y < 138; y += 6) for (let x = ((y / 6) % 2) * 6 - 6; x < W; x += 12) {
    const col = rng() < 0.08 ? '#5e5a44' : pick(rng, BR);
    r(x, y, 12, 6, '#3a2a28'); r(x + 1, y + 1, 10, 4, col); r(x + 1, y + 1, 10, 1, shade(col, 1.15)); r(x + 1, y + 4, 10, 1, shade(col, 0.85));
    if (rng() < 0.15) r(x + 2 + (rng() * 7 | 0), y + 2, 2, 1, shade(col, 0.7)); // chips
  }
  g.fillStyle = 'rgba(40,60,30,.28)'; g.fillRect(0, 112, W, 26);                       // damp near the water
  for (let i = 0; i < 16; i++) { const x = rng() * W | 0, y = 40 + (rng() * 60 | 0), l = 12 + (rng() * 30 | 0); g.fillStyle = 'rgba(30,44,24,.4)'; g.fillRect(x, y, 2, l); g.fillRect(x, y + l, 1, 3); }
  // the tunnel mouth: rings stepping back into the dark, a faint glow at the far end
  const TX = 144, TY = 141;
  ell(g, TX, TY, 58, 74, '#2a2024');
  for (let i = 0; i < 6; i++) {
    const rx = 52 - i * 8, ry = 68 - i * 10, cy = TY - i * 1.5, d = 0.55 - i * 0.07;
    ell(g, TX, cy, rx, ry, shade('#5a4a46', d + 0.25)); ell(g, TX, cy + 1, rx - 2, ry - 2, shade('#3a2e30', d + 0.3));
  }
  ell(g, TX, TY - 9, 10, 14, '#3a4a40'); ell(g, TX, TY - 8, 6, 9, '#4e6252');            // distant light
  ell(g, TX, TY + 2, 40, 6, '#14201e');                                                     // water going in
  for (let a = 0; a < 22; a++) { const t = Math.PI + a / 21 * Math.PI, x = TX + Math.cos(t) * 60, y = TY + Math.sin(t) * 76; r(Math.round(x) - 4, Math.round(y) - 3, 8, 6, '#2a2024'); r(Math.round(x) - 3, Math.round(y) - 2, 6, 4, a % 2 ? '#94806e' : '#8a7462'); r(Math.round(x) - 3, Math.round(y) - 2, 6, 1, '#a8927e'); }
  // the great vault over everything
  for (let y = 0; y < 138; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 176) / 202, (y - 146) / 150);
    if (d > 1.04) r(x, y, 1, 1, '#120c10');
    else if (d > 0.985) { const a = Math.atan2(y - 146, x - 176), seam = (a * 18) % 1; r(x, y, 1, 1, seam > 0.9 || d > 1.03 || d < 0.99 ? '#2a2024' : Math.floor(a * 18) % 2 ? '#8c7666' : '#7e6a5c'); }
  }
  // a long copper pipe on iron brackets, green streaks running from its joints
  r(87, 46, W - 87, 12, '#1a1416'); r(87, 47, W - 87, 10, '#5a7a6a'); r(87, 48, W - 87, 2, '#86a894'); r(87, 54, W - 87, 3, '#3e5a4c');
  for (let x = 100; x < W; x += 44) { r(x - 1, 43, 6, 17, '#1a1416'); r(x, 44, 4, 15, '#3a3a40'); r(x + 1, 46, 1, 1, '#9a9aa0'); r(x + 1, 55, 1, 1, '#9a9aa0'); for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(70,110,80,.35)'; g.fillRect(x + 6 + k * 3, 58, 1, 8 + k * 6); } }
  // the broken iron pipe the plague will come from, rust bleeding down the wall
  r(0, 69, 47, 15, '#1a1416'); r(0, 70, 46, 13, '#7a5a44'); r(0, 71, 46, 3, '#9a7656'); r(0, 79, 46, 3, '#5a4030');
  r(40, 65, 13, 23, '#1a1416'); r(41, 66, 11, 21, '#6a4a38'); r(41, 66, 11, 2, '#8a6a4e');
  ell(g, 52, 76, 2.5, 6, '#0c080a');
  for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(120,60,30,.3)'; g.fillRect(42 + k * 2, 88, 1, 20 + k * 6); }
  // ladder up to the grate
  for (const lx of [268, 288]) { r(lx - 1, 0, 5, 138, '#1a1416'); r(lx, 0, 3, 138, '#7a5434'); r(lx, 0, 1, 138, '#9a6e44'); }
  for (let y = 8; y < 134; y += 11) { r(268, y - 1, 23, 4, '#1a1416'); r(269, y, 21, 2, '#8a6040'); r(269, y, 21, 1, '#a87a50'); }
  // ledge: a lit top edge, stone blocks, moss and slime
  r(0, 137, W, 15, '#1a1416'); r(0, 138, W, 3, '#9a8a7c'); r(0, 138, W, 1, '#b4a494');
  for (let x = 0; x < W; x += 24) { r(x, 141, 23, 10, (x / 24) % 2 ? '#7a6c62' : '#84766a'); r(x, 141, 23, 1, '#94867a'); r(x, 149, 23, 2, '#5a4e46'); }
  for (let i = 0; i < 22; i++) { const x = rng() * W | 0; ell(g, x, 137, 4 + rng() * 4, 1.6, '#3e5a2e'); ell(g, x - 1, 136, 2.5, 1, '#6a8a42'); if (rng() < 0.5) r(x, 141, 1, 3 + (rng() * 6 | 0), '#4a6a34'); }
  r(214, 134, 7, 2, '#e8e0cc'); r(213, 133, 2, 4, '#e8e0cc'); r(220, 133, 2, 4, '#e8e0cc');                        // an old bone
  ell(g, 230, 134, 3.5, 3, '#ddd4c0'); r(229, 133, 1, 1, '#2a2020'); r(231, 133, 1, 1, '#2a2020');                 // a little skull
  r(318, 124, 18, 14, '#1a1416'); r(319, 125, 16, 12, '#7a5a3a'); r(319, 125, 16, 1, '#9a7650'); thick(g, 320, 126, 333, 135, 1, '#5a3e26'); // broken crate
  // water: dark teal bands with a reflection of the ledge and ripples
  const bands = ['#24423f', '#203c39', '#1c3634', '#18302e', '#152a28'];
  bands.forEach((col, i) => r(0, 151 + i * 8, W, 9, col));
  r(0, 151, W, 3, '#14201e');
  for (let i = 0; i < 40; i++) r(rng() * W | 0, 156 + (rng() * 34 | 0), 4 + (rng() * 10 | 0), 1, 'rgba(120,180,170,.25)');
  // light: brightest under the grate, a shaft falling to the water, stepped into bands like the street painting
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const sy = Math.min(1, y / 151), cxs = 281 - 48 * sy, wd = 14 + 18 * sy, shaft = Math.max(0, 1 - Math.abs(x - cxs) / wd) * (y < 151 ? 1 : 0.5);
    const diff = 0.32 + 0.95 * Math.exp(-Math.hypot((x - 280) * 0.9, y - 26) / 120);
    let f = Math.min(1.35, diff + shaft * 0.35); f = Math.round(f / 0.09) * 0.09;
    d[i] = Math.min(255, d[i] * f + (f > 0.8 ? 10 : 0)); d[i + 1] = Math.min(255, d[i + 1] * f + (f > 0.8 ? 4 : 0)); d[i + 2] = Math.min(255, d[i + 2] * f * (f < 0.6 ? 1.12 : 1));
  }
  g.putImageData(img, 0, 0);
  // daylight through the grate bars
  r(262, 0, 34, 7, '#1a1416'); r(264, 0, 30, 5, '#fff4d8'); for (let x = 264; x < 294; x += 5) r(x, 0, 2, 6, '#3a3a40');
  // scale up so each cell is four of the painting's pixels
  const out = makeCanvas(1408, 768), og = out.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(c, 0, 0, 1408, 768);
  return out;
}
// The street at night for the title, its windows about to glow plague-purple.
function paintNightStreet(bg) {
  const c = makeCanvas(1408, 768), g = c.getContext('2d');
  g.drawImage(bg, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = '#3c3266'; g.fillRect(0, 0, 1408, 768);
  const sky = g.createLinearGradient(0, 0, 0, 768); sky.addColorStop(0, '#7a6aa0'); sky.addColorStop(1, '#c8c0e0');
  g.fillStyle = sky; g.fillRect(0, 0, 1408, 768);
  g.globalCompositeOperation = 'source-over';
  return c;
}
const NIGHT_GLOWS = [ // windows, the tavern door and the lantern, in the painting's pixels
  [40, 300, 60], [290, 60, 50], [520, 60, 50], [245, 380, 70], [480, 340, 70], [700, 230, 40], [785, 215, 40], [870, 200, 40],
  [1020, 280, 35], [1075, 260, 30], [1160, 160, 45], [1300, 120, 50], [1290, 330, 50],
];

// Rats in every scene use the rat from the painting: brown, plague-purple, or the near-black Rat King.
function recolourRat(src, fn) {
  const c = makeCanvas(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const l = (0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) / 140; const [r, gg, b] = fn(Math.min(1.2, l)); p[i] = r; p[i + 1] = gg; p[i + 2] = b; }
  g.putImageData(d, 0, 0); return c;
}
// The Rat King's picture: the near-black rat with a gold crown on his head, in the painting's chunky pixels.
const RAT_FOOT = 57, KING_TOP = 26; // rows in the rat picture: where its feet are, and the headroom added for the crown
function crownedKing(rat) {
  const c = makeCanvas(rat.width, rat.height + KING_TOP), g = c.getContext('2d');
  g.drawImage(rat, 0, KING_TOP);
  const rows = ['g..g..g', 'gg.g.gg', 'ggggggg', 'gpgggpg', 'ddddddd'], col = { g: '#e0b040', p: '#c05cff', d: '#9a6a1a' }, U = 4, X0 = 16, Y0 = KING_TOP + 12 - rows.length * U;
  for (const [ox, oy, ink] of [[-2, 0, 1], [2, 0, 1], [0, -2, 1], [0, 2, 1], [0, 0, 0]]) rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return; g.fillStyle = ink ? '#2a1a08' : col[ch]; g.fillRect(X0 + rx * U + ox, Y0 + ry * U + oy, U, U);
  }));
  g.fillStyle = '#fff2b0'; g.fillRect(X0, Y0, U, U); g.fillRect(X0 + 12, Y0, U, U); g.fillRect(X0 + 4, Y0 + 8, U, 2); // glints
  return c;
}
function ratSprite(x, y, dir, t, o = {}) { // queue a painted rat (the drawn rat stands in if the painting can't be read)
  const S = STREET_IMG, kind = o.crown ? 'king' : o.plague ? 'plague' : 'rat';
  if (!S.rat) { ratHR(sc, x, y, dir, t, o); return; }
  cut.sprites.push({ x: x + (o.tremble ? Math.round(Math.sin(t * 50 + x)) : 0), y, dir, t, hop: o.hop || 0, rot: o.rot || 0, run: o.run || 0, kind, k: o.crown ? 1.2 : 1 });

}
const HUDDLE = [[256, 0], [272, 2], [286, 0], [300, 2], [314, 0], [266, 6], [294, 6], [280, 10], [308, 8], [324, 4]];
function sewerBase(t) {
  // light shaft from the grate, with dust drifting in it
  sc.fillStyle = 'rgba(255,236,190,.06)'; sc.beginPath(); sc.moveTo(372, 0); sc.lineTo(404, 0); sc.lineTo(352, 210); sc.lineTo(292, 210); sc.fill();
  for (let i = 0; i < 14; i++) { const k = (t * 0.06 + i / 14) % 1; sc.fillStyle = 'rgba(255,240,210,.55)'; sc.fillRect(Math.round(390 - k * 70 + Math.sin(t + i) * 6), Math.round(k * 200), 1, 1); }
  // the shaft's broken reflection and drifting ripples
  for (let r = 0; r < 28; r += 2) { sc.fillStyle = `rgba(255,236,190,${(0.08 * (1 - r / 28)).toFixed(3)})`; sc.fillRect(296 + Math.round(Math.sin(t * 2 + r) * 3) - r, 214 + r * 2, 60 + r, 1); }
  for (let r = 0; r < 8; r++) { const x = ((r * 61 + t * (10 + r)) % 540) - 30; sc.fillStyle = 'rgba(140,190,180,.25)'; sc.fillRect(Math.round(x), 218 + r * 6, 18 + r * 2, 1); }
}
function sceneSewer(t) {
  sewerBase(t + 6);
  for (const [dt, x0] of DRIPS) {
    const x = x0 * 2, k = (t + 6 - dt) / 0.5;
    if (k > 0 && k < 1) { sc.fillStyle = '#9abcc0'; sc.fillRect(x, Math.round(lerp(10, 212, k * k)), 1, 3); }
    else if (k >= 1 && k < 2.4) { const r = Math.round((k - 1) * 9); sc.fillStyle = 'rgba(160,190,190,.5)'; sc.fillRect(x - r, 214, r * 2 + 1, 1); sc.fillRect(x - (r >> 1), 216, r + 1, 1); }
  }
  for (const [x, row] of HUDDLE) ratSprite(x, 192 - row, x % 4 ? -1 : 1, t, { tremble: true });
  if (t > 0.4) {
    if (t < 0.9) { const k = span(t, 0.4, 0.9); ratSprite(lerp(390, 372, k), lerp(16, 216, k * k), -1, t, { rot: k * 1.2 }); }
    else if (t < 2.2) { if (!cut.s2a) { cut.s2a = 1; cutBurst(372, 212, 16, ['#9abcc0', '#c0dce0'], 40, 0.5, 26); } ratSprite(lerp(372, 344, span(t, 0.9, 2.2)), 220 + Math.sin(t * 8), -1, t, { run: 0.6 }); }
    else { const k = span(t, 2.2, 2.6); ratSprite(lerp(344, 336, k), lerp(220, 192, k), -1, t, { hop: Math.sin(k * Math.PI) * 6 }); }
  }
}
function sceneDrink(t) {
  sewerBase(t + 12);
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  const glow = sc.createRadialGradient(110, 190, 4, 110, 190, 80);
  glow.addColorStop(0, `rgba(192,92,255,${(0.5 + pulse * 0.2).toFixed(2)})`); glow.addColorStop(1, 'rgba(192,92,255,0)');
  sc.fillStyle = glow; sc.fillRect(20, 100, 180, 120);
  // the ooze pours from the broken pipe into a pool on the ledge
  const flow = Math.floor(t * 40) % 8;
  sc.fillStyle = INK; sc.fillRect(67, 108, 7, 84); sc.fillStyle = PLAGUE_DARK; sc.fillRect(68, 108, 5, 84); sc.fillStyle = PLAGUE; sc.fillRect(69, 108, 2, 84);
  sc.fillStyle = '#e8b0ff'; for (let y = 108 + flow; y < 190; y += 8) sc.fillRect(69, y, 1, 3);
  ell(sc, 110, 194, 54, 6, INK); ell(sc, 110, 194, 52, 5, PLAGUE_DARK); ell(sc, 110, 193, 48, 3.5, PLAGUE); ell(sc, 96, 192, 18, 1.5, '#e8b0ff');
  if (Math.random() < 0.4) cut.parts.push({ x: 66 + Math.random() * 90, y: 190, vx: 0, vy: -16 - Math.random() * 14, life: 0.9, max: 0.9, col: Math.random() < .5 ? PLAGUE : '#e8b0ff' });
  HUDDLE.forEach(([hx, row], i) => {
    const lead = i === 0, startMove = lead ? 0.5 : 2.6 + i * 0.12, arrive = lead ? 1.5 : startMove + 0.7;
    const tx = 96 + (i % 5) * 18, ty = 192 - (i > 4 ? 6 : lead ? 3 : 0);
    let x = hx, y = 192 - row, dir = -1, run = 0, hop = 0;
    if (t > startMove) { const k = span(t, startMove, arrive); x = lerp(hx, tx, k); y = lerp(192 - row, ty, k); run = k < 1 ? 1.2 : 0; }
    const turned = lead ? 2.3 : arrive + 0.25, plague = t > turned;
    if (plague && !cut['p' + i]) { cut['p' + i] = 1; cutBurst(x, y - 8, lead ? 26 : 14, [PLAGUE, PLAGUE_DARK, '#e8b0ff'], 36, 0.6, 14); sfxCut('turn'); }
    if (t > arrive && t < turned) hop = Math.abs(Math.sin(t * 12)) * 2; // lapping at the pool
    if (t > 4.6) { dir = 1; hop = Math.max(0, Math.sin((t - 4.6 - i * 0.05) * 7)) * 10; run = 1; }
    if (lead && plague && !cut.crown) { cut.crown = 1; cutBurst(x - 12, y - 22, 12, ['#ffd75a', '#e0b040', '#fff2b0'], 24, 0.7, 10); }
    ratSprite(x, y, dir, t, { plague, hop, run, tremble: !plague && t < startMove && !lead, crown: lead && plague });
  });
  if (t > 4.6) { sc.globalAlpha = 0.2 * span(t, 4.6, 5.0) * (1 - span(t, 5.4, 6)); sc.fillStyle = PLAGUE; sc.fillRect(0, 0, STAGE_W, STAGE_H); sc.globalAlpha = 1; }
}
function sceneTitle(t) {
  // the same street by night; the plague swarm floods through it, the Rat King in front
  for (let i = 0; i < 5; i++) { sc.globalAlpha = 0.14; ell(sc, ((t * (14 + i * 5) + i * 120) % 640) - 80, 230 + i * 8, 90, 4, PLAGUE_DARK); } // purple mist
  sc.globalAlpha = 1;
  for (let i = 0; i < 18; i++) {
    const x = lerp(520 + i * 24, -60 + i * 24, span(t, 0.8, 4.2)), y = 238 + (i % 3) * 8;
    ratSprite(x, y, -1, t + i * 0.3, { plague: true, run: 1.4, hop: Math.abs(Math.sin(t * 12 + i)) * 3, crown: i === 0 });
  }
}
function drawPaintedLayer(cx, toScreen, t) { // V19/V20: the painted backdrop and its rats, at full screen resolution under the stage
  const S = STREET_IMG;
  if (!S.bg && S.img.complete && S.img.naturalWidth) prepStreetImage();
  if (!cut.bg.sewerP) cut.bg.sewerP = paintSewer();
  if (S.bg && !S.night) S.night = paintNightStreet(S.bg);
  const bg = t < 6 ? (S.bg || (S.img.naturalWidth ? S.img : null)) : t < 18 ? cut.bg.sewerP : S.night;
  if (!bg) return;
  const [x0, y0, sc0] = toScreen(0, S.y0), W = 1408 * S.k * sc0, H = 768 * S.k * sc0;
  cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
  cx.drawImage(bg, x0, y0, W, H);
  if (t >= 18) { // windows, door and lantern catching the plague one by one
    cx.globalCompositeOperation = 'lighter';
    NIGHT_GLOWS.forEach(([gx, gy, gr], i) => {
      const a = span(t - 18, 0.4 + i * 0.22, 1.0 + i * 0.22) * (0.75 + 0.25 * Math.sin(t * 3 + i));
      if (a <= 0) return;
      const [px, py] = toScreen(gx * S.k, S.y0 + gy * S.k), rr = gr * S.k * sc0 * 1.6;
      const gg = cx.createRadialGradient(px, py, 0, px, py, rr); gg.addColorStop(0, `rgba(200,110,255,${(0.75 * a).toFixed(2)})`); gg.addColorStop(1, 'rgba(120,40,200,0)');
      cx.fillStyle = gg; cx.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    });
    cx.globalCompositeOperation = 'source-over';
  }
  if (S.rat) {
    if (!S.ratPlague) S.ratPlague = recolourRat(S.rat, l => [Math.round(60 + 150 * l), Math.round(24 + 70 * l), Math.round(96 + 150 * l)]);
    if (!S.ratKing) S.ratKing = crownedKing(recolourRat(S.rat, l => [Math.round(14 + 44 * l), Math.round(10 + 32 * l), Math.round(20 + 56 * l)]));
    for (const R of cut.sprites) if (R.kind !== 'rat') { // plague glow under the infected
      const [gx, gy] = toScreen(R.x, R.y - R.hop - 6), rr = 18 * sc0;
      const gg = cx.createRadialGradient(gx, gy, 0, gx, gy, rr); gg.addColorStop(0, 'rgba(192,92,255,.35)'); gg.addColorStop(1, 'rgba(192,92,255,0)');
      cx.fillStyle = gg; cx.fillRect(gx - rr, gy - rr, rr * 2, rr * 2);
    }
    // back to front, so nearer rats cover farther ones (the King's crown is part of his own picture)
    const order = cut.sprites.slice().sort((a, b) => a.y - b.y || (a.kind === 'king') - (b.kind === 'king'));
    for (const R of order) {
      const img = R.kind === 'king' ? S.ratKing : R.kind === 'plague' ? S.ratPlague : S.rat, foot = R.kind === 'king' ? KING_TOP + RAT_FOOT : RAT_FOOT;
      const u = S.k * sc0 * R.k, w = img.width * u, h = img.height * u, [rx, ry] = toScreen(R.x, R.y - R.hop);
      const bobY = R.run ? Math.abs(Math.sin(R.t * 26)) * 1.2 * sc0 : 0, tilt = R.rot || (R.run ? Math.sin(R.t * 26) * 0.05 : 0);
      cx.save(); cx.translate(rx, ry - bobY - (foot - img.height / 2) * u); cx.scale(R.dir > 0 ? -1 : 1, 1); cx.rotate(tilt);
      if (!R.hop) { cx.fillStyle = 'rgba(20,14,10,.25)'; cx.fillRect(-w * 0.4, (foot - img.height / 2) * u - sc0, w * 0.8, 2 * sc0); }
      cx.drawImage(img, -w / 2, -h / 2, w, h); cx.restore();
    }
  }
  cx.imageSmoothingEnabled = false;
}

// V12: where the portrait camera looks (stage x) through the story, eased between keys.
const CUT_CAM = [
  [0, 340], [1.9, 340], [2.9, 210], [3.6, 200], [4.4, 150], [6, 150],      // street: drift after the rat between the townsfolk to the drain
  [6.01, 318], [12, 318],                                                     // sewer: the huddle and the grate
  [12.01, 290], [12.5, 290], [13.5, 145], [14.6, 145], [15.6, 165], [16.6, 150], [18, 150], // drinking
  [18.01, 240], [23, 240],                                                    // title
];
function cutCamX(t) {
  for (let i = 1; i < CUT_CAM.length; i++) {
    const [t0, x0] = CUT_CAM[i - 1], [t1, x1] = CUT_CAM[i];
    if (t <= t1) { const k = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))); return x0 + (x1 - x0) * k * k * (3 - 2 * k); }
  }
  return CUT_CAM[CUT_CAM.length - 1][1];
}

function drawCutscene(dt) {
  cutAssets();
  cut.t += dt;
  const t = cut.t;
  sc.clearRect(0, 0, STAGE_W, STAGE_H); cut.sprites = [];
  if (t < 6) sceneStreet(t); else if (t < 12) sceneSewer(t - 6); else if (t < 18) sceneDrink(t - 12); else sceneTitle(t - 18);
  for (const p of cut.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; }
  cut.parts = cut.parts.filter(p => p.life > 0);
  for (const p of cut.parts) { sc.globalAlpha = Math.max(0, p.life / p.max); sc.fillStyle = p.col; sc.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
  sc.globalAlpha = 1;
  // fades between scenes
  const fade = [[5.4, 6, 6.5], [11.4, 12, 12.5], [17.6, 18, 18.4], [22.4, 23, 23]];
  let a = t < 0.5 ? 1 - t / 0.5 : 0;
  for (const [o, m, i] of fade) { if (t > o && t < m) a = (t - o) / (m - o); else if (t >= m && t < i) a = 1 - (t - m) / (i - m); }
  if (a > 0) { sc.fillStyle = `rgba(0,0,0,${Math.min(1, a).toFixed(3)})`; sc.fillRect(0, 0, STAGE_W, STAGE_H); }
  // vignette edges
  const v = sc.createRadialGradient(STAGE_W / 2, STAGE_H / 2, STAGE_W * 0.22, STAGE_W / 2, STAGE_H / 2, STAGE_W * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, t < 6 ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.5)');
  sc.fillStyle = v; sc.fillRect(0, 0, STAGE_W, STAGE_H);
  // stage onto the screen, letterboxed
  // the cutscene gets its own full-resolution canvas so the hi-res art survives
  const cc = $('cutCanvas'), CW = window.innerWidth, CH = window.innerHeight;
  if (cc.width !== CW || cc.height !== CH) { cc.width = CW; cc.height = CH; }
  const cx = cc.getContext('2d'); cx.imageSmoothingEnabled = false;
  cx.fillStyle = '#000'; cx.fillRect(0, 0, CW, CH);
  let s, left, ox, oy;
  if (CW / CH < 1.2) { // V12: portrait phones zoom in and pan to follow the action
    s = Math.min(CH * 0.68 / STAGE_H, CW / (STAGE_W * 0.55)); const vw = CW / s; // shows over half the stage, so the camera pans less
    left = Math.max(0, Math.min(STAGE_W - vw, cutCamX(t) - vw / 2)); ox = -left * s; oy = Math.round(Math.max(CH * 0.2, (CH - STAGE_H * s) / 2));
  } else {
    const fit = Math.min(CW / STAGE_W, CH / STAGE_H); s = fit >= 1 ? Math.floor(fit * 2) / 2 : fit;
    left = 0; ox = Math.round((CW - STAGE_W * s) / 2); oy = Math.round((CH - STAGE_H * s) / 2);
  }
  drawPaintedLayer(cx, (x, y) => [ox + x * s, oy + y * s, s], t); // V19, V20: the painted scenes sit under the stage
  cx.drawImage(stage, ox, oy, STAGE_W * s, STAGE_H * s);
  // captions and the title card
  const cap = CUT_CAPTIONS.find(([a0, b0]) => t >= a0 && t <= b0);
  const capEl = $('cutCaption');
  if ((cap ? cap[2] : '') !== capEl.dataset.text) { capEl.dataset.text = cap ? cap[2] : ''; capEl.textContent = cap ? cap[2] : ''; capEl.classList.remove('show'); if (cap) requestAnimationFrame(() => capEl.classList.add('show')); }
  $('cutTitle').classList.toggle('show', t > 18.3 && t < 22.6);
  if (t >= CUT_END) endCutscene();
}

function sfxCut(kind) { if (kind === 'turn') tone(500 + Math.random() * 200, 1200, 0, 0.12, 'square', 0.03); }

// A7: an original 90s-console-style startup sound for the Pixel Mullet logo, timed
// to the video: an airy swell under the typing, a deep boom and crystal shimmer as
// the mullet appears, a rising chime per letter of the wordmark, then a warm chord bloom.
let logoBus = null;
function playLogoSting(videoTime) {
  if (!actx) return;
  if (!music.gain) setupMusicGraph();
  music.gain.gain.cancelScheduledValues(actx.currentTime);
  music.gain.gain.setValueAtTime(musicOff ? 0 : 1, actx.currentTime);
  const bus = actx.createGain(); bus.connect(music.gain); logoBus = bus;
  const dry = actx.createGain(), wet = actx.createGain(), rev = actx.createConvolver();
  rev.buffer = music.rev.buffer; dry.connect(bus); wet.gain.value = 0.6; wet.connect(rev); rev.connect(bus);
  const V = CONFIG.musicVolume, T0 = actx.currentTime - videoTime, at = s => Math.max(actx.currentTime, T0 + s);
  const osc = (type, f, t, dur, peak, attack, out, detune = 0) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05); return o;
  };
  const both = actx.createGain(); both.connect(dry); both.connect(wet);
  const bell = (f, t, vol, dur = 1.6) => { osc('sine', f, t, dur, vol, 0.004, both); osc('sine', f * 3.5, t, dur * 0.4, vol * 0.35, 0.002, both); osc('sine', f * 2.01, t, dur * 0.7, vol * 0.25, 0.003, both); };
  // 1. the swell: a dark synth chord opening up through a slowly rising filter
  const sw = actx.createBiquadFilter(); sw.type = 'lowpass'; sw.Q.value = 6;
  sw.frequency.setValueAtTime(160, at(0)); sw.frequency.exponentialRampToValueAtTime(2400, at(3.2)); sw.frequency.exponentialRampToValueAtTime(300, at(3.6));
  const swg = actx.createGain(); swg.gain.setValueAtTime(0.0001, at(0)); swg.gain.linearRampToValueAtTime(V * 1.2, at(2.8)); swg.gain.exponentialRampToValueAtTime(0.0001, at(3.7));
  sw.connect(swg); swg.connect(dry); swg.connect(wet);
  for (const [n, d] of [[36, -7], [43, 6], [48, -4], [55, 8]]) { const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = d; o.connect(sw); o.start(at(0)); o.stop(at(3.8)); }
  // typing ticks under the text (about 0.5 s to 3.0 s)
  for (let t = 0.55, i = 0; t < 3.0; t += 0.08, i++) if (i % 5 !== 4) osc('square', 1800 + (i * 97) % 400, at(t), 0.03, V * 0.35, 0.002, dry);
  // 2. the mullet appears: a deep boom, a falling whoosh and a crystal shimmer
  const B = 3.3;
  osc('sine', 70, at(B), 1.8, V * 6, 0.005, dry).frequency.exponentialRampToValueAtTime(38, at(B) + 1.2);
  const nz = actx.createBufferSource(); nz.buffer = music.noise; nz.loop = true;
  const nf = actx.createBiquadFilter(); nf.type = 'bandpass'; nf.Q.value = 0.8; nf.frequency.setValueAtTime(5000, at(B)); nf.frequency.exponentialRampToValueAtTime(300, at(B) + 1.4);
  const ng = actx.createGain(); ng.gain.setValueAtTime(V * 2, at(B)); ng.gain.exponentialRampToValueAtTime(0.0001, at(B) + 1.5);
  nz.connect(nf); nf.connect(ng); ng.connect(dry); ng.connect(wet); nz.start(at(B)); nz.stop(at(B) + 1.6);
  [84, 88, 91, 96, 100].forEach((n, i) => bell(hz(n), at(B + 0.05 + i * 0.045), V * 0.9, 2.2));
  // 3. a rising chime for each letter of PIXEL MULLET (about 3.9 s to 6.0 s)
  [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96].forEach((n, i) => bell(hz(n), at(3.9 + i * 0.19), V * 1.7, 1.2));
  // 4. the bloom: a lush, wide chord with a shimmering top, fading out with the video
  const C = 6.2, chord = [48, 55, 60, 64, 67, 71, 74];
  const pf = actx.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.setValueAtTime(600, at(C)); pf.frequency.exponentialRampToValueAtTime(3200, at(C + 1.2));
  const pg = actx.createGain(); pg.gain.setValueAtTime(0.0001, at(C)); pg.gain.linearRampToValueAtTime(V * 0.9, at(C + 0.6)); pg.gain.setValueAtTime(V * 0.9, at(C + 1.8)); pg.gain.exponentialRampToValueAtTime(0.0001, at(10.2));
  pf.connect(pg); pg.connect(dry); pg.connect(wet);
  for (const n of chord) for (const d of [-9, 9]) { const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = d; o.connect(pf); o.start(at(C)); o.stop(at(10.3)); }
  osc('sine', hz(36), at(C), 4, V * 3, 0.05, dry);
  [96, 100, 103, 107, 108].forEach((n, i) => bell(hz(n), at(C + 0.15 + i * 0.12), V * 0.5, 2.5));
}
function stopLogoSting() {
  if (!logoBus) return;
  const b = logoBus, t = actx.currentTime; logoBus = null;
  b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0, t + 0.25);
  setTimeout(() => b.disconnect(), 400);
}

// V14: the Pixel Mullet studio logo plays first (silent video), then the story.
let logoTimer = null;
function beginLogo() {
  if (state !== 'splash') return;
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } } // unlock sound inside the tap
  actx?.resume?.();
  $('splash').hidden = true; $('logoLayer').hidden = false;
  state = 'logo';
  const v = $('logoVideo');
  v.onended = finishLogo; v.onerror = finishLogo;
  v.onplaying = () => { if (state === 'logo' && !logoBus) playLogoSting(v.currentTime); }; // A7: sound locked to the picture
  const srcs = v.querySelectorAll('source'); srcs[srcs.length - 1].onerror = finishLogo; // every source failed
  try { v.currentTime = 0; } catch (e) { /* not loaded yet */ }
  const p = v.play(); if (p && p.catch) p.catch(finishLogo);
  logoTimer = setTimeout(finishLogo, 12000); // never get stuck if the video stalls
}
function finishLogo() {
  if (state !== 'logo') return;
  clearTimeout(logoTimer);
  const v = $('logoVideo'); v.pause();
  if (!v.ended) stopLogoSting(); else logoBus = null; // a skip cuts the sting short
  $('logoLayer').hidden = true;
  beginCutscene();
}

function beginCutscene() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  actx?.resume?.();
  hideScreens(); $('splash').hidden = true; setFramed(false); mini.hidden = true; stickEl.hidden = true;
  Object.keys(cut).forEach(k => { if (/^(s\d[a-c]|p\d+|crown)$/.test(k)) delete cut[k]; });
  cut.t = 0; cut.parts = [];
  $('cutLayer').hidden = false;
  state = 'cutscene';
  playIntroJingle();
}
function endCutscene(skipped) {
  if (state !== 'cutscene') return;
  if (skipped && cut.bus) { const t = actx.currentTime; cut.bus.gain.cancelScheduledValues(t); cut.bus.gain.setValueAtTime(cut.bus.gain.value, t); cut.bus.gain.linearRampToValueAtTime(0, t + 0.3); }
  const bus = cut.bus; cut.bus = null; setTimeout(() => bus && bus.disconnect(), 400);
  $('cutLayer').hidden = true; $('cutCaption').textContent = ''; $('cutCaption').dataset.text = ''; $('cutTitle').classList.remove('show');
  showTitle();
}

// A6: the intro jingle, scored to the cutscene's timeline (seconds from its start).
function playIntroJingle() {
  if (!actx) return;
  if (!music.gain) setupMusicGraph();
  music.gain.gain.cancelScheduledValues(actx.currentTime);
  music.gain.gain.setValueAtTime(musicOff ? 0 : 1, actx.currentTime);
  const bus = actx.createGain(); bus.connect(music.gain); cut.bus = bus;
  const dry = actx.createGain(), wet = actx.createGain(), rev = actx.createConvolver();
  rev.buffer = music.rev.buffer; dry.connect(bus); wet.gain.value = 0.35; wet.connect(rev); rev.connect(bus);
  const saved = [music.dry, music.wet]; music.dry = dry; music.wet = wet;
  const T0 = actx.currentTime + 0.1, V = CONFIG.musicVolume, at = s => T0 + s, N = NOTE_NUM;
  const tune = (start, E, notes, octave = 0, vol = V) => { let t = start; for (const [n, len] of notes) { if (n) INST.lead(at(t), N(n) + octave, len * E, vol); t += len * E; } return t; };
  const sweep = (t, dur, f0, f1, vol) => { // filtered-noise whoosh or riser
    const s = actx.createBufferSource(); s.buffer = music.noise; s.loop = true;
    const f = filt('bandpass', f0, 1.2), g = actx.createGain();
    f.frequency.setValueAtTime(f0, at(t)); f.frequency.exponentialRampToValueAtTime(f1, at(t + dur));
    g.gain.setValueAtTime(0.0001, at(t)); g.gain.exponentialRampToValueAtTime(vol, at(t + dur * 0.85)); g.gain.exponentialRampToValueAtTime(0.0001, at(t + dur));
    s.connect(f); f.connect(g); g.connect(dry); g.connect(wet); s.start(at(t)); s.stop(at(t + dur + 0.05));
  };
  const A = ACT_TONES;
  // Scene 1, the street: a slow, low statement of the rhyme over a drone, punctuated by the stamping
  INST.pad(at(0.1), [45, 52], 3.0, V * 0.3); INST.pad(at(3.0), [50, 57], 2.8, V * 0.3);
  INST.bass(at(0.1), 33, 2.9, V * 1.6); INST.bass(at(3.0), 38, 2.6, V * 1.6);
  tune(0.4, 0.28, [['G3', 2], ['G3', 1], ['E3', 2], ['A3', 1], ['G3', 3], ['E3', 3]], 0, V * 0.8);
  INST.kick(at(2.0), V * 5); INST.snare(at(2.0), V * 2.5); INST.crash(at(2.0), V * 0.8);       // stamp
  sweep(2.95, 0.35, 600, 3000, V * 2.2); INST.snare(at(3.15), V * 2.2);                          // broom
  tune(3.6, 0.13, [['E4', 1], ['D4', 1], ['C4', 1], ['B3', 1], ['A3', 1], ['G#3', 1]], 0, V * 0.8); // scurrying away
  INST.kick(at(4.5), V * 3); sweep(4.45, 0.3, 2000, 400, V * 1.5);                                 // down the drain
  // Scene 2, the sewer: cold drone, a heartbeat, drips
  INST.pad(at(6.0), [45, 52, 57], 6.0, V * 0.32); INST.bass(at(6.0), 33, 5.8, V * 1.2);
  sweep(6.85, 0.4, 3000, 800, V * 1.6);                                                             // the splash
  for (let b = 6.5; b < 11.8; b += 1.2) { INST.kick(at(b), V * 2.6); INST.kick(at(b + 0.28), V * 1.8); }
  const plinks = ['A5', 'E6', 'C6', 'G5', 'D6', 'A5'];
  DRIPS.forEach(([d], i) => INST.arp(at(d + 0.5), N(plinks[i]), V * 0.7));
  // Scene 3, the drinking: the chords climb, the bass quickens, a riser into the transformation
  [[12.0, 'Am'], [13.5, 'F'], [15.0, 'Am'], [15.75, 'G'], [16.0, 'E']].forEach(([s, c], i, arr) => {
    const end = i + 1 < arr.length ? arr[i + 1][0] : 16.6;
    INST.pad(at(s), A[c], end - s, V * (0.25 + i * 0.05));
    const step = lerp(0.3, 0.13, (s - 12) / 4.6);
    for (let b = s; b < end - 0.01; b += step) INST.bass(at(b), ACT_ROOT[c], step * 0.9, V * (1.4 + i * 0.2));
  });
  tune(14.2, 0.2, [['G4', 2], ['G4', 1], ['E4', 2], ['A4', 1], ['G4', 3], ['E4', 3]], 0, V * 0.9);
  sweep(13.0, 3.6, 300, 6000, V * 1.8);
  INST.kick(at(16.6), V * 5); INST.crash(at(16.6), V * 1.8); INST.pad(at(16.6), [45, 57, 60, 64, 69], 1.3, V * 0.5); INST.bass(at(16.6), 33, 1.2, V * 2.4);
  // Scene 4, the title: the rhyme at full gallop with drums, ending on a big A-minor chord
  INST.crash(at(18.3), V * 1.8);
  const E = 0.15;
  const end = tune(18.3, E, [['G4', 2], ['G4', 1], ['E4', 2], ['A4', 1], ['G4', 3], ['E4', 3], ['A4', 2], ['A4', 1], ['G4', 3], ['A4', 2], ['A4', 1], ['G4', 3], ['G4', 2], ['G4', 1], ['G4', 3]], 0, V * 1.05);
  tune(18.3, E, [['E4', 2], ['E4', 1], ['C4', 2], ['F4', 1], ['E4', 3], ['C4', 3], ['F4', 2], ['F4', 1], ['E4', 3], ['F4', 2], ['F4', 1], ['E4', 3], ['D4', 2], ['D4', 1], ['B3', 3]], 0, V * 0.45);
  const chords = ['Am', 'Am', 'F', 'F', 'E'];
  for (let k = 0; k * E < end - 18.3; k++) {
    const t = 18.3 + k * E, pos = k % 6, c = chords[Math.min(chords.length - 1, Math.floor(k / 6))];
    if (pos === 0 || pos === 3) INST.kick(at(t), V * 4);
    if (pos === 3) INST.snare(at(t), V * 2.2);
    INST.hat(at(t), V * (pos % 3 === 0 ? 1.3 : 0.7));
    INST.bass(at(t), ACT_ROOT[c] + (pos % 2 ? 12 : 0), E * 0.9, V * 2);
  }
  INST.kick(at(end), V * 5); INST.crash(at(end), V * 2); INST.snare(at(end), V * 2);
  INST.lead(at(end), N('A4'), 1.6, V * 1.1); INST.lead(at(end), N('A5'), 1.6, V * 0.4);
  INST.pad(at(end), [45, 52, 57, 60, 64], 2.2, V * 0.45); INST.bass(at(end), 33, 2.0, V * 2.4);
  [music.dry, music.wet] = saved;
}
