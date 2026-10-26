// Plague Rat: menu and HUD icons (V25). Each icon is drawn as vector shapes on a 24×24 grid, then
// turned into detailed pixel art: rasterised onto an odd-sized pixel grid centred on a pixel (so
// symmetrical icons come out exactly symmetrical), given a dark ink outline, a lit top-left edge and a
// shaded bottom-right edge. The star is the bevelled game star: each point has a lit and a shaded half.
'use strict';

const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const starPath = (cx, cy, R, r, n = 5) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * q).toFixed(2) + ' ' + (cy + Math.sin(a) * q).toFixed(2); } return d + 'Z'; };
// A settings cog: eight evenly spaced, square-topped teeth (one centred at the top), joined by arcs round the body.
const cogPath = (cx, cy, R, r, teeth, baseHalf, topHalf) => {
  const P = (a, q) => (cx + Math.cos(a) * q).toFixed(3) + ' ' + (cy + Math.sin(a) * q).toFixed(3);
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / teeth, b0 = a - baseHalf, b1 = a + baseHalf;
    d += (i ? `A${r} ${r} 0 0 1 ` : 'M') + P(b0, r) + 'L' + P(a - topHalf, R) + 'L' + P(a + topHalf, R) + 'L' + P(b1, r);
  }
  return d + `A${r} ${r} 0 0 1 ` + P(-Math.PI / 2 - baseHalf, r) + 'Z';
};
const gearPath = (cx, cy, R, r, teeth) => { let d = ''; for (let i = 0; i < teeth * 4; i++) { const a = i * Math.PI * 2 / (teeth * 4) - Math.PI / (teeth * 4) * 1.5, q = (i % 4 < 2) ? R : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * q).toFixed(2) + ' ' + (cy + Math.sin(a) * q).toFixed(2); } return d + 'Z'; };
// Each icon: a list of parts. A part is { d } (filled, even-odd so holes cut out) or { d, w } (stroked, w wide).
const ICON_SHAPES = {
  star: [{ d: starPath(12, 13.2, 12, 5.6) }],
  restart: [{ d: 'M16.63 7.68A7.2 7.2 0 1 1 7.37 7.68', w: 3.6 }, { d: 'M12.27 3.57L4.11 4.42L10.02 11.47Z' }],
  home: [{ d: 'M12 2.5L1.5 11.5h3V21.5h5.5v-6h4v6h5.5V11.5h3Z' }],
  play: [{ d: 'M6 3.5Q6 2 7.4 2.8L20.6 10.7Q22 11.6 20.6 12.6L7.4 20.6Q6 21.4 6 19.9Z' }],
  check: [{ d: 'M2.5 12.5L6 9.2L9.6 12.8L18.2 3.8L21.6 7.2L9.6 19.6Z' }],
  close: [{ d: 'M4.5 2.5L12 10L19.5 2.5L21.5 4.5L14 12L21.5 19.5L19.5 21.5L12 14L4.5 21.5L2.5 19.5L10 12L2.5 4.5Z' }],
  lock: [{ d: 'M6.5 11V8a5.5 5.5 0 0 1 11 0V11H14.5V8a2.5 2.5 0 0 0-5 0V11Z' }, { d: 'M3.5 10.5h17v11.5h-17Z' + circ(12, 15, 1.8) + rect(11.2, 15, 1.6, 4) }],
  skull: [{ d: 'M12 1.8C6.3 1.8 2.8 5.6 2.8 10.4c0 3 1.4 5.2 3.6 6.3V20.5h2.6v1.8h2V20.5h2v1.8h2V20.5h2.6v-3.8c2.2-1.1 3.6-3.3 3.6-6.3C21.2 5.6 17.7 1.8 12 1.8Z'
    + 'M6.2 9.4c0-1 .8-1.8 1.8-1.8h1.6c1 0 1.8.8 1.8 1.8v1.6c0 1-.8 2-1.8 2H8c-1 0-1.8-1-1.8-2Z M12.6 9.4c0-1 .8-1.8 1.8-1.8H16c1 0 1.8.8 1.8 1.8v1.6c0 1-.8 2-1.8 2h-1.6c-1 0-1.8-1-1.8-2Z M12 13.6l1.4 2.4h-2.8Z' }],
  target: [{ d: circ(12, 12, 10.5) + circ(12, 12, 7.5) + circ(12, 12, 4.8) + circ(12, 12, 2) }],
  grate: [{ d: circ(12, 12, 10.5) + rect(6, 6.5, 2.2, 11) + rect(10.9, 4.5, 2.2, 15) + rect(15.8, 6.5, 2.2, 11) }],
  crown: [{ d: 'M2.5 17.5L1.5 6.5L7 10.5L12 3L17 10.5L22.5 6.5L21.5 17.5Z' + circ(12, 12.5, 1.6) + circ(6.5, 14, 1.2) + circ(17.5, 14, 1.2) }, { d: rect(2.5, 18.8, 19, 3.2) }],
  timer: [{ d: circ(12, 13.5, 9) + circ(12, 13.5, 6.8) }, { d: rect(9.5, 1.5, 5, 2.5) + rect(11, 3.5, 2, 2) }, { d: 'M11 8.5h2v5.5l3.2 2.4-1.2 1.6L11 15Z' }],
  back: [{ d: 'M10.5 3L1.5 12L10.5 21V15.5H22.5V8.5H10.5Z' }],
  gear: [{ d: cogPath(12, 12, 11.8, 7.9, 8, 0.3, 0.23) + circ(12, 12, 3.9) }],
  q: [{ d: 'M5.5 8.6C5.5 4.8 8.3 2.2 12.1 2.2c3.8 0 6.4 2.4 6.4 5.6 0 2.6-1.5 3.9-3.2 5-1.3.8-1.8 1.5-1.8 2.8v.8H9.7v-1.1c0-2.4 1-3.6 2.7-4.7 1.3-.8 2.1-1.5 2.1-2.7 0-1.3-1-2.2-2.4-2.2-1.5 0-2.6 1-2.7 2.9Z' }, { d: rect(9.7, 18.3, 3.9, 3.7) }],
  film: [{ d: 'M2 4h20v16H2Z' + rect(3.5, 5.5, 2, 2) + rect(7.5, 5.5, 2, 2) + rect(11.5, 5.5, 2, 2) + rect(15.5, 5.5, 2, 2) + rect(19, 5.5, 1.5, 2) + rect(3.5, 16.5, 2, 2) + rect(7.5, 16.5, 2, 2) + rect(11.5, 16.5, 2, 2) + rect(15.5, 16.5, 2, 2) + rect(19, 16.5, 1.5, 2) + rect(4, 9, 16, 6) }],
  sound: [{ d: 'M2 8.5h4.5L12.5 3.5v17L6.5 15.5H2Z' }, { d: 'M15.5 8.5a5 5 0 0 1 0 7', w: 2.2 }, { d: 'M18.3 5.5a9 9 0 0 1 0 13', w: 2.2 }],
  pause: [{ d: rect(4.5, 3, 5.5, 18) + rect(14, 3, 5.5, 18) }],
  controls: [{ d: circ(15.6, 12.5, 7.8) + circ(15.6, 12.5, 5.4) }, { d: circ(15.6, 12.5, 3.3) }, { d: rect(0.6, 3.6, 6.4, 6.4) + rect(0.6, 14.4, 6.4, 6.4) }],
  shake: [{ d: 'M8 2h8a1.5 1.5 0 0 1 1.5 1.5v17A1.5 1.5 0 0 1 16 22H8a1.5 1.5 0 0 1-1.5-1.5v-17A1.5 1.5 0 0 1 8 2Z' + rect(8.2, 4.5, 7.6, 12.5) + circ(12, 19.3, 1) }, { d: 'M3.5 8l-1.6 2 1.6 2-1.6 2', w: 1.6 }, { d: 'M20.5 8l1.6 2-1.6 2 1.6 2', w: 1.6 }],
  scroll: [{ d: 'M6 4h12v16H6Z' + rect(8.2, 8, 7.6, 1.4) + rect(8.2, 11, 7.6, 1.4) + rect(8.2, 14, 5.5, 1.4) }, { d: 'M4 2.2h16a2 2 0 0 1 0 4H4a2 2 0 0 1 0-4Z' }, { d: 'M4 17.8h16a2 2 0 0 1 0 4H4a2 2 0 0 1 0-4Z' }],
  rat: [{ d: 'M2.5 15.6C2.5 12.2 5.6 10.4 9.6 10.4C13 10.4 15.6 11 17.6 12.2L22.9 14.6C23.5 14.9 23.3 15.8 22.6 15.9L17.6 16.9C15.9 18.3 13.3 18.9 10 18.9H5.6C3.8 18.9 2.5 17.7 2.5 15.6Z' + circ(19.4, 14.3, 0.85) }, { d: circ(15.6, 10.9, 2.3) }, { d: rect(6.2, 18.2, 2, 2.6) + rect(12.8, 18.2, 2, 2.6) }, { d: 'M3.2 16.6C0.4 17 0.6 21.4 3.8 21.4H9.6', w: 1.7 }],
  rats: [{ d: 'M2.5 15.6C2.5 12.2 5.6 10.4 9.6 10.4C13 10.4 15.6 11 17.6 12.2L22.9 14.6C23.5 14.9 23.3 15.8 22.6 15.9L17.6 16.9C15.9 18.3 13.3 18.9 10 18.9H5.6C3.8 18.9 2.5 17.7 2.5 15.6Z', t: [0.58, -0.6, -1.4] }, { d: circ(15.6, 10.9, 2.3), t: [0.58, -0.6, -1.4] }, { d: 'M3.2 16.6C0.4 17 0.6 21.4 3.8 21.4H9.6', w: 2.4, t: [0.58, -0.6, -1.4] },
    { d: 'M2.5 15.6C2.5 12.2 5.6 10.4 9.6 10.4C13 10.4 15.6 11 17.6 12.2L22.9 14.6C23.5 14.9 23.3 15.8 22.6 15.9L17.6 16.9C15.9 18.3 13.3 18.9 10 18.9H5.6C3.8 18.9 2.5 17.7 2.5 15.6Z' + circ(19.4, 14.3, 0.85), t: [0.7, 6.4, 8.6] }, { d: circ(15.6, 10.9, 2.3), t: [0.7, 6.4, 8.6] }, { d: 'M3.2 16.6C0.4 17 0.6 21.4 3.8 21.4H9.6', w: 2.3, t: [0.7, 6.4, 8.6] }],
  maze: [{ d: 'M3 3h18v18H3Z M5 5v14h14V5Z' }, { d: 'M8 5v8h3 M14 19v-8h-3 M14 8h3v8', w: 2 }],
  wave: [{ d: 'M2 8c2.5-2.5 4.5-2.5 6.7 0s4.2 2.5 6.6 0 4.2-2.5 6.7 0', w: 2.4 }, { d: 'M2 14c2.5-2.5 4.5-2.5 6.7 0s4.2 2.5 6.6 0 4.2-2.5 6.7 0', w: 2.4 }, { d: 'M2 20c2.5-2.5 4.5-2.5 6.7 0s4.2 2.5 6.6 0 4.2-2.5 6.7 0', w: 2.4 }],
  moon: [{ d: 'M14.5 2.5A9.8 9.8 0 1 0 21.5 17.2 8 8 0 0 1 14.5 2.5Z' }],
  fire: [{ d: 'M12 1.5c.6 3.6 3.4 5.1 4.9 7.6 1.6 2.6 2.3 4.6 1.7 7.2C17.8 19.6 15.2 22 12 22s-6.2-2.3-6.7-5.6C4.8 13.3 6.4 11 8 9.5c.3 1.6 1 2.6 2 3.2C9.4 8.6 10.6 4.6 12 1.5Z M12 12.5c-1.2 1.6-2.6 2.8-2.6 4.8 0 1.6 1.2 2.7 2.6 2.7s2.6-1.1 2.6-2.7c0-2-1.4-3.2-2.6-4.8Z' }],
  gate: [{ d: 'M2 2h20v3H2Z' }, { d: 'M4.5 5v13.5l-1 2.5M9.5 5v13.5l-1 2.5M14.5 5v13.5l1 2.5M19.5 5v13.5l1 2.5', w: 2 }, { d: 'M3 10h18M3 15h18', w: 1.6 }],
  cart: [{ d: 'M2.5 5.5h15l3 3.5v6.5h-18Z' + rect(5, 8, 3, 3) + rect(10, 8, 3, 3) }, { d: circ(6.5, 18, 3) + circ(6.5, 18, 1) }, { d: circ(16.5, 18, 3) + circ(16.5, 18, 1) }],
};

const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const ICON_INK = '#120f0c';

const iconCache = new Map();
const ICON_SYM = { star: 'x', gear: 'xy', skull: 'x', target: 'xy', grate: 'xy', crown: 'x', pause: 'xy', close: 'xy', lock: 'x', film: 'xy', scroll: 'x', play: 'y', fire: 'x', cart: '', moon: '' };
// A pixel-art settings cog, drawn the way pixel artists draw one: a ring-shaped body with a wide hole
// and a small diamond hub in the middle, square teeth straight up, down, left and right, and diagonal
// teeth that step out at 45° like staircases. Symmetrical both ways.
function gearPixels(M, S, grid) {
  M.fill(0);
  const c = (S - 1) / 2, R = grid / 2;
  const ringOut = R * 0.62, ringIn = R * 0.36, hub = Math.max(1, Math.round(R * 0.14));
  const tw = Math.max(1, Math.round(R * 0.2)), dw = R * 0.24, dReach = R * 0.98;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const X = x - c, Y = y - c, r = Math.hypot(X, Y), u = Math.abs(X - Y) / Math.SQRT2, v = Math.abs(X + Y) / Math.SQRT2;
    const ring = r <= ringOut + 0.35 && r > ringIn;
    const ortho = (Math.abs(X) <= tw && Math.abs(Y) <= R - 0.5 && Math.abs(Y) >= ringIn) || (Math.abs(Y) <= tw && Math.abs(X) <= R - 0.5 && Math.abs(X) >= ringIn);
    const diag = (u <= dw && v <= dReach && v >= ringIn) || (v <= dw && u <= dReach && u >= ringIn); // rotated 45°: stair-stepped
    const centre = Math.abs(X) + Math.abs(Y) <= hub;
    if (ring || ortho || diag || centre) M[y * S + x] = 1;
  }
}
// The same outline-and-shading finish for any mask, painting pixel by pixel with put(x, y, colour).
function shadePixels(M, S, col, put, flat) {
  const on = (x, y) => x >= 0 && y >= 0 && x < S && y < S && M[y * S + x] === 1;
  const hi = mixHex(col, '#ffffff', 0.45), lo = mixHex(col, '#000000', 0.35);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (on(x, y)) put(x, y, flat ? (!on(x, y - 1) ? hi : col) : !on(x, y - 1) || !on(x - 1, y) ? hi : !on(x, y + 1) || !on(x + 1, y) || !on(x + 1, y + 1) ? lo : col);
    else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) put(x, y, ICON_INK);
  }
}
// H8: the in-game hunter arrows, in the icon style: a notched arrowhead pointing at the hunter, rasterised
// for 32 directions so each one stays crisp pixel art, with an ink outline, a lit edge and a shaded edge.
const arrowCache = new Map();
function arrowSprite(angle, col) {
  const dir = ((Math.round(angle / (Math.PI * 2) * 32) % 32) + 32) % 32, key = dir + col;
  if (arrowCache.has(key)) return arrowCache.get(key);
  const grid = 13, S = grid + 2, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.translate(S / 2, S / 2); g.rotate(dir / 32 * Math.PI * 2); g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(6.4, 0); g.lineTo(-4.6, -5.8); g.lineTo(-3.2, 0); g.lineTo(-4.6, 5.8); g.closePath(); g.fill();
  const a = g.getImageData(0, 0, S, S).data, M = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) M[i] = a[i * 4 + 3] > 115 ? 1 : 0;
  for (let pass = 0; pass < 2; pass++) for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) { // trim one-pixel spikes
    const i = y * S + x; if (M[i] && M[i - 1] + M[i + 1] + M[i - S] + M[i + S] <= 1) M[i] = 0;
  }
  const out = document.createElement('canvas'); out.width = out.height = S;
  const o = out.getContext('2d');
  shadePixels(M, S, col, (x, y, c) => { o.fillStyle = c; o.fillRect(x, y, 1, 1); }, false);
  arrowCache.set(key, out);
  return out;
}
function iconPixel(name, col, size) {
  let grid = Math.max(11, Math.min(19, Math.round(size / 1.6))); if (grid % 2 === 0) grid--; // odd, so the middle is a pixel
  if (name === 'gear') grid = size >= 20 ? 19 : 15; // the cog needs enough pixels for its teeth
  const S = grid + 2, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.translate(1, 1); g.scale(grid / 24, grid / 24); g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = g.lineJoin = 'round';
  for (const p of ICON_SHAPES[name]) { // a part may carry t: [scale, dx, dy] to place a smaller copy of a shape
    const P = new Path2D(p.d); g.save(); if (p.t) { g.translate(p.t[1], p.t[2]); g.scale(p.t[0], p.t[0]); }
    if (p.w) { g.lineWidth = p.w; g.stroke(P); } else g.fill(P, 'evenodd');
    g.restore();
  }
  const a = g.getImageData(0, 0, S, S).data, M = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) M[i] = a[i * 4 + 3] > 115 ? 1 : 0;
  if (name === 'gear') gearPixels(M, S, grid); // the cog is built from blocks straight on the pixel grid
  const sym = ICON_SYM[name] || '';
  if (sym.includes('x')) for (let y = 0; y < S; y++) for (let x = 0; x < S / 2; x++) { const v = M[y * S + x] | M[y * S + S - 1 - x]; M[y * S + x] = M[y * S + S - 1 - x] = v; }
  if (sym.includes('y')) for (let y = 0; y < S / 2; y++) for (let x = 0; x < S; x++) { const v = M[y * S + x] | M[(S - 1 - y) * S + x]; M[y * S + x] = M[(S - 1 - y) * S + x] = v; }
  const on = (x, y) => x >= 0 && y >= 0 && x < S && y < S && M[y * S + x] === 1;
  const hi = mixHex(col, '#ffffff', 0.45), lo = mixHex(col, '#000000', 0.35), flat = grid < 13;
  const isStar = name === 'star', k = 24 / grid;
  let svg = '';
  const px = (x, y, c) => { svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; };
  if (isStar) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (on(x, y)) { // bevel: the left half of each point is lit, the right half shaded, a bright rim on top
      const X = (x + 0.5 - 1) * k - 12, Y = (y + 0.5 - 1) * k - 13.2;
      let ang = Math.atan2(Y, X) * 180 / Math.PI + 90; ang = ((ang % 72) + 72 + 36) % 72 - 36; // -36..36 around the nearest point
      let c = Math.hypot(X, Y) < 1.2 ? col : ang < -1 ? hi : ang > 1 ? lo : col;
      if (!on(x, y - 1)) c = mixHex(col, '#ffffff', 0.7);
      px(x, y, c);
    } else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) px(x, y, ICON_INK);
  }
  if (!isStar) shadePixels(M, S, col, px, flat);
  return `<svg class="px" width="${size}" height="${size}" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges" aria-hidden="true">${svg}</svg>`;
}
function drawIcon(name, col, s = 3) { // s is the size step the menus use (about 10.5 px each)
  if (!ICON_SHAPES[name]) return '';
  const size = Math.round(s * 10.5), key = name + col + size;
  if (!iconCache.has(key)) iconCache.set(key, iconPixel(name, col, size));
  return iconCache.get(key);
}
