// Plague Rat: menu and HUD icons (V25). Each icon is drawn as vector shapes on a 24×24 grid and
// finished as a crisp vector with a top-to-bottom gradient, a dark outline and a soft drop shadow.
// The star is the classic bevelled game star; the cog has eight even, flat-topped teeth.
'use strict';

const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const starPath = (cx, cy, R, r, n = 5) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * q).toFixed(2) + ' ' + (cy + Math.sin(a) * q).toFixed(2); } return d + 'Z'; };
// A settings cog: evenly spaced flat-topped teeth (one centred at the top), joined by arcs round the body.
const cogPath = (cx, cy, R, r, teeth, baseHalf, topHalf) => {
  const P = (a, q) => (cx + Math.cos(a) * q).toFixed(3) + ' ' + (cy + Math.sin(a) * q).toFixed(3);
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / teeth, b0 = a - baseHalf, b1 = a + baseHalf;
    d += (i ? `A${r} ${r} 0 0 1 ` : 'M') + P(b0, r) + 'L' + P(a - topHalf, R) + `A${R} ${R} 0 0 1 ` + P(a + topHalf, R) + 'L' + P(b1, r);
  }
  return d + `A${r} ${r} 0 0 1 ` + P(-Math.PI / 2 - baseHalf, r) + 'Z';
};
const gearPath = (cx, cy, R, r, teeth) => { let d = ''; for (let i = 0; i < teeth * 4; i++) { const a = i * Math.PI * 2 / (teeth * 4) - Math.PI / (teeth * 4) * 1.5, q = (i % 4 < 2) ? R : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * q).toFixed(2) + ' ' + (cy + Math.sin(a) * q).toFixed(2); } return d + 'Z'; };
// Each icon: a list of parts. A part is { d } (filled, even-odd so holes cut out) or { d, w } (stroked, w wide).
const ICON_SHAPES = {
  star: [{ d: starPath(12, 13.2, 12, 5.6), star: true }],
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
  gear: [{ d: cogPath(12, 12, 11.3, 8.4, 8, 0.26, 0.17) + circ(12, 12, 3.6) }],
  q: [{ d: 'M5.5 8.6C5.5 4.8 8.3 2.2 12.1 2.2c3.8 0 6.4 2.4 6.4 5.6 0 2.6-1.5 3.9-3.2 5-1.3.8-1.8 1.5-1.8 2.8v.8H9.7v-1.1c0-2.4 1-3.6 2.7-4.7 1.3-.8 2.1-1.5 2.1-2.7 0-1.3-1-2.2-2.4-2.2-1.5 0-2.6 1-2.7 2.9Z' }, { d: rect(9.7, 18.3, 3.9, 3.7) }],
  film: [{ d: 'M2 4h20v16H2Z' + rect(3.5, 5.5, 2, 2) + rect(7.5, 5.5, 2, 2) + rect(11.5, 5.5, 2, 2) + rect(15.5, 5.5, 2, 2) + rect(19, 5.5, 1.5, 2) + rect(3.5, 16.5, 2, 2) + rect(7.5, 16.5, 2, 2) + rect(11.5, 16.5, 2, 2) + rect(15.5, 16.5, 2, 2) + rect(19, 16.5, 1.5, 2) + rect(4, 9, 16, 6) }],
  sound: [{ d: 'M2 8.5h4.5L12.5 3.5v17L6.5 15.5H2Z' }, { d: 'M15.5 8.5a5 5 0 0 1 0 7', w: 2.2 }, { d: 'M18.3 5.5a9 9 0 0 1 0 13', w: 2.2 }],
  pause: [{ d: rect(4.5, 3, 5.5, 18) + rect(14, 3, 5.5, 18) }],
  hand: [{ d: 'M7 12V5a1.6 1.6 0 0 1 3.2 0V11h.4V3.2a1.6 1.6 0 0 1 3.2 0V11h.4V4.2a1.6 1.6 0 0 1 3.2 0V12h.2V7.6a1.5 1.5 0 0 1 3 0V15c0 4-2.8 7-6.8 7h-1.2c-2.4 0-4-1-5.3-2.8L3.4 14.6a1.7 1.7 0 0 1 2.6-2.2Z' }],
  shake: [{ d: 'M8 2h8a1.5 1.5 0 0 1 1.5 1.5v17A1.5 1.5 0 0 1 16 22H8a1.5 1.5 0 0 1-1.5-1.5v-17A1.5 1.5 0 0 1 8 2Z' + rect(8.2, 4.5, 7.6, 12.5) + circ(12, 19.3, 1) }, { d: 'M3.5 8l-1.6 2 1.6 2-1.6 2', w: 1.6 }, { d: 'M20.5 8l1.6 2-1.6 2 1.6 2', w: 1.6 }],
  scroll: [{ d: 'M6 4h12v16H6Z' + rect(8.2, 8, 7.6, 1.4) + rect(8.2, 11, 7.6, 1.4) + rect(8.2, 14, 5.5, 1.4) }, { d: 'M4 2.2h16a2 2 0 0 1 0 4H4a2 2 0 0 1 0-4Z' }, { d: 'M4 17.8h16a2 2 0 0 1 0 4H4a2 2 0 0 1 0-4Z' }],
  rat: [{ d: 'M3 15c0-3.6 3.2-6.5 7.5-6.5 2.2 0 3.8.6 5 1.4L19.8 9c1.4-.3 2.6.6 2.7 1.8L20 13.6c.2.5.3 1 .3 1.4 0 1.2-1 1.9-2.2 1.9H5c-1.2 0-2-.8-2-1.9Z' + circ(18.4, 11.3, 0.8) }, { d: circ(15.8, 8.6, 1.9) }, { d: 'M3.5 15.5C1 15.5 1 19.5 4 19.5h4', w: 1.3 }],
  rats: [{ d: 'M1.5 11c0-2.6 2.3-4.6 5.4-4.6 1.6 0 2.7.4 3.6 1l3-.6c1-.2 1.9.4 2 1.3l-1.8 2c.1.3.2.7.2 1 0 .9-.7 1.4-1.6 1.4H3c-.9 0-1.5-.6-1.5-1.5Z' + 'M7.5 18.5c0-2.6 2.3-4.6 5.4-4.6 1.6 0 2.7.4 3.6 1l3-.6c1-.2 1.9.4 2 1.3l-1.8 2c.1.3.2.7.2 1 0 .9-.7 1.4-1.6 1.4H9c-.9 0-1.5-.6-1.5-1.5Z' }],
  maze: [{ d: 'M3 3h18v18H3Z M5 5v14h14V5Z' }, { d: 'M8 5v8h3 M14 19v-8h-3 M14 8h3v8', w: 2 }],
  wave: [{ d: 'M2 8c2.5-2.5 4.5-2.5 6.7 0s4.2 2.5 6.6 0 4.2-2.5 6.7 0', w: 2.4 }, { d: 'M2 14c2.5-2.5 4.5-2.5 6.7 0s4.2 2.5 6.6 0 4.2-2.5 6.7 0', w: 2.4 }, { d: 'M2 20c2.5-2.5 4.5-2.5 6.7 0s4.2 2.5 6.6 0 4.2-2.5 6.7 0', w: 2.4 }],
  moon: [{ d: 'M14.5 2.5A9.8 9.8 0 1 0 21.5 17.2 8 8 0 0 1 14.5 2.5Z' }],
  fire: [{ d: 'M12 1.5c.6 3.6 3.4 5.1 4.9 7.6 1.6 2.6 2.3 4.6 1.7 7.2C17.8 19.6 15.2 22 12 22s-6.2-2.3-6.7-5.6C4.8 13.3 6.4 11 8 9.5c.3 1.6 1 2.6 2 3.2C9.4 8.6 10.6 4.6 12 1.5Z M12 12.5c-1.2 1.6-2.6 2.8-2.6 4.8 0 1.6 1.2 2.7 2.6 2.7s2.6-1.1 2.6-2.7c0-2-1.4-3.2-2.6-4.8Z' }],
  gate: [{ d: 'M2 2h20v3H2Z' }, { d: 'M4.5 5v13.5l-1 2.5M9.5 5v13.5l-1 2.5M14.5 5v13.5l1 2.5M19.5 5v13.5l1 2.5', w: 2 }, { d: 'M3 10h18M3 15h18', w: 1.6 }],
  cart: [{ d: 'M2.5 5.5h15l3 3.5v6.5h-18Z' + rect(5, 8, 3, 3) + rect(10, 8, 3, 3) }, { d: circ(6.5, 18, 3) + circ(6.5, 18, 1) }, { d: circ(16.5, 18, 3) + circ(16.5, 18, 1) }],
};

const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const ICON_INK = '#120f0c';

let iconUid = 0;
function starFacets(cx, cy, R, r) { // the classic bevelled game star: each point has a lit left half and a shaded right half
  const pt = (i, q) => { const a = -Math.PI / 2 + i * Math.PI / 5; return (cx + Math.cos(a) * q).toFixed(2) + ' ' + (cy + Math.sin(a) * q).toFixed(2); };
  let out = '';
  for (let k = 0; k < 5; k++) {
    const o = k * 2;
    out += `<path d="M${cx} ${cy}L${pt(o - 1, r)}L${pt(o, R)}Z" fill="#fff" opacity=".28"/>`;
    out += `<path d="M${cx} ${cy}L${pt(o, R)}L${pt(o + 1, r)}Z" fill="#000" opacity=".16"/>`;
  }
  return out;
}
function iconSmooth(name, col, size) { // a gradient-filled vector with an ink outline and a soft drop shadow
  const id = 'ig' + (iconUid++), hi = mixHex(col, '#ffffff', 0.5), lo = mixHex(col, '#000000', 0.35);
  const parts = ICON_SHAPES[name], sw = 24 / size * 1.6; // outline about 1.6 screen px whatever the size
  const shape = (fill, stroke, extra = '') => parts.map(p => p.w
    ? `<path d="${p.d}" fill="none" stroke="${stroke || fill}" stroke-width="${p.w + (stroke ? sw * 2 : 0)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
    : `<path d="${p.d}" fill="${fill}" fill-rule="evenodd"${stroke ? ` stroke="${stroke}" stroke-width="${sw * 2}" stroke-linejoin="round"` : ''}${extra}/>`).join('');
  return `<svg class="px" width="${size}" height="${size}" viewBox="-1.2 -1.2 26.4 26.4" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${col}"/><stop offset="1" stop-color="${lo}"/></linearGradient></defs>`
    + `<g transform="translate(0.9 1.3)" opacity=".55">${shape(ICON_INK, ICON_INK)}</g>${shape(ICON_INK, ICON_INK)}${shape(`url(#${id})`)}${parts[0].star ? starFacets(12, 13.2, 12, 5.6) : ''}</svg>`;
}
function drawIcon(name, col, s = 3) { // s is the size step the menus use (about 10.5 px each)
  return ICON_SHAPES[name] ? iconSmooth(name, col, Math.round(s * 10.5)) : '';
}
