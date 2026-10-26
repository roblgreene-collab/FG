// Plague Rat: the realistic sound bank (A12). Switched on by CONFIG.realisticSounds.
// Sounds that stand for something real (voices, rats, eating, water, metal) are synthesised sample by
// sample into short buffers when sound starts: voices from a buzzing vocal-cord pulse with natural
// wobble and breath, shaped into vowels by formant filters (the resonances of the throat and mouth);
// eating from layers of filtered noise, clicks and bubbles. Several variants of each are made, and each
// play picks one at random with a slight speed change, so nothing repeats exactly.
'use strict';

const BANK = { sr: 0, ctx: null, sets: {}, rnd: {}, last: {} };

// ---- small DSP kit (works on plain Float32Arrays) -------------------------------------------
function bqCoefs(type, f, q, sr, gainDb = 0) { // RBJ cookbook biquads
  const w = 2 * Math.PI * Math.min(f, sr * 0.45) / sr, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q), A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
  else if (type === 'bp') { b0 = a; b1 = 0; b2 = -a; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
  else { b0 = 1 + a * A; b1 = -2 * c; b2 = 1 - a * A; a0 = 1 + a / A; a1 = -2 * c; a2 = 1 - a / A; } // peak
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
// Filter x in place; f and q may be numbers or functions of time (seconds), updated every 32 samples.
function dspFilt(x, type, f, q, sr, gainDb) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, k = null;
  for (let i = 0; i < x.length; i++) {
    if (i % 32 === 0) k = bqCoefs(type, typeof f === 'function' ? f(i / sr) : f, typeof q === 'function' ? q(i / sr) : q, sr, gainDb);
    const y = k[0] * x[i] + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}
const dspLerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
function curve(points) { // piecewise-linear [[t, v], ...]
  return t => { for (let i = 1; i < points.length; i++) if (t <= points[i][0]) return dspLerp(points[i - 1][1], points[i][1], (t - points[i - 1][0]) / (points[i][0] - points[i - 1][0])); return points[points.length - 1][1]; };
}
function smoothNoise(n, rate, sr, rnd) { // slow random wobble, -1..1
  const out = new Float32Array(n), step = Math.max(1, Math.floor(sr / rate)); let a = rnd() * 2 - 1, b = rnd() * 2 - 1;
  for (let i = 0; i < n; i++) { if (i % step === 0) { a = b; b = rnd() * 2 - 1; } const t = (i % step) / step; out[i] = a + (b - a) * (3 * t * t - 2 * t * t * t); }
  return out;
}
function mixInto(dst, src, at, gain = 1) { for (let i = 0; i < src.length && at + i < dst.length; i++) if (at + i >= 0) dst[at + i] += src[i] * gain; }
function normalise(x, peak = 0.9) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; }
function dspFade(x, sr, inS = 0.004, outS = 0.03) { const a = inS * sr, b = outS * sr; for (let i = 0; i < x.length; i++) { if (i < a) x[i] *= i / a; const r = x.length - i; if (r < b) x[i] *= r / b; } return x; }

// ---- voices -------------------------------------------------------------------------------
// Vowel formants (Hz) for an adult; children and women scale up a little.
const VOWELS = { a: [800, 1200, 2600, 3500], e: [500, 1800, 2600, 3500], i: [320, 2300, 3000, 3700], o: [500, 900, 2500, 3500], u: [380, 950, 2400, 3400], uh: [600, 1100, 2500, 3400], ae: [700, 1700, 2600, 3500] };
// opts: dur, pitch (fn of t), vowel (fn of t → [F1..F4]) or name, breath 0..1, rough 0..1, amp (fn), scale (formant scale), rnd
function synthVoice(sr, o) {
  const n = Math.floor(o.dur * sr), rnd = o.rnd, src = new Float32Array(n), noise = new Float32Array(n);
  const jit = smoothNoise(n, 18, sr, rnd), shim = smoothNoise(n, 25, sr, rnd);
  let ph = 0, prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = o.pitch(t) * (1 + (o.jitter ?? 0.018) * jit[i] + (o.rough || 0) * 0.04 * (rnd() - 0.5));
    ph += f / sr; if (ph >= 1) ph -= 1;
    // Rosenberg glottal pulse, then differentiated (lip radiation)
    const g = ph < 0.4 ? 0.5 * (1 - Math.cos(Math.PI * ph / 0.4)) : ph < 0.6 ? Math.cos(Math.PI * (ph - 0.4) / 0.4) : 0;
    let v = (g - prev) * sr / Math.max(80, f) * 0.25; prev = g;
    if (o.rough) v *= 1 - o.rough * 0.6 * (0.5 + 0.5 * Math.sin(2 * Math.PI * f * 0.5 * t + jit[i] * 3)); // vocal fry / harshness
    const amp = (o.amp ? o.amp(t) : 1) * (1 + 0.12 * shim[i]);
    src[i] = v * amp;
    noise[i] = (rnd() * 2 - 1) * amp * (o.breath || 0.1) * (0.6 + 0.4 * (ph < 0.5 ? 1 : 0.3)); // breath, pulsed with the glottis
  }
  const out = new Float32Array(n), sc = o.scale || 1;
  const vowelAt = typeof o.vowel === 'function' ? o.vowel : () => VOWELS[o.vowel || 'a'];
  const gains = [1, 0.7, 0.35, 0.18], bws = [80, 100, 140, 180];
  for (let k = 0; k < 4; k++) { // parallel formant resonators on voice + breath
    const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = src[i] + noise[i];
    dspFilt(x, 'bp', t => vowelAt(t)[k] * sc, t => vowelAt(t)[k] * sc / (bws[k] * (1 + (o.rough || 0))), sr);
    dspFilt(x, 'bp', t => vowelAt(t)[k] * sc, t => vowelAt(t)[k] * sc / (bws[k] * 1.6), sr);
    mixInto(out, x, 0, gains[k]);
  }
  if (o.drive) for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * o.drive); // a strained, shouted edge
  dspFilt(dspFilt(out, 'hp', (o.pitch(0) || 120) * 0.7, 0.7, sr), 'hp', (o.pitch(0) || 120) * 0.7, 0.7, sr); // no rumble below the voice
  return dspFade(normalise(out), sr, 0.006, 0.05);
}
const blendV = (a, b) => t => VOWELS[a].map((v, i) => dspLerp(v, VOWELS[b][i], t));

function makeScream(sr, rnd, female) { // a short "aah!" of panic
  const p0 = female ? 620 + rnd() * 260 : 300 + rnd() * 160, dur = 0.45 + rnd() * 0.3;
  const vow = rnd() < 0.5 ? 'a' : 'ae', end = rnd() < 0.5 ? 'a' : 'uh';
  return synthVoice(sr, {
    rnd, dur, scale: female ? 1.18 : 1, breath: 0.7, rough: 0.6 + rnd() * 0.3, drive: 3, jitter: 0.07,
    pitch: (c => t => c(t) * (1 + 0.05 * Math.sin(t * 37) * Math.sin(t * 11)))(curve([[0, p0 * 0.75], [0.05, p0 * 1.2], [dur * 0.3, p0 * (1.0 + rnd() * 0.2)], [dur * 0.65, p0 * (1.1 + rnd() * 0.15)], [dur, p0 * 0.7]])),
    amp: curve([[0, 0], [0.03, 1], [dur * 0.6, 0.9], [dur, 0]]),
    vowel: t => blendV(vow, end)(t / dur),
  });
}
function makeShout(sr, rnd) { // the hunter: "Oi!" or "Hey!"
  const hey = rnd() < 0.5, p0 = 150 + rnd() * 50, dur = 0.38 + rnd() * 0.1;
  const v = synthVoice(sr, {
    rnd, dur, breath: hey ? 0.5 : 0.25, rough: 0.25, drive: 2.5,
    pitch: curve([[0, p0], [0.08, p0 * 1.35], [dur, p0 * 1.05]]),
    amp: curve([[0, 0], [hey ? 0.05 : 0.02, 1], [dur * 0.7, 0.8], [dur, 0]]),
    vowel: hey ? t => blendV('e', 'i')(Math.max(0, t / dur - 0.4) / 0.6) : t => blendV('o', 'i')(Math.max(0, t / dur - 0.3) / 0.7),
  });
  if (hey) { const h = Math.floor(0.05 * sr); for (let i = 0; i < h; i++) v[i] += (rnd() * 2 - 1) * 0.25 * (i / h); } // the breathy "h"
  return normalise(v);
}
// A13: the cry a person gives when the plague gets them. Seven kinds, each in several voices.
const CRY_VOICES = { // pitch range (Hz), formant scale, tremble (old voices shake)
  man: [105, 150, 1, 0], woman: [195, 265, 1.17, 0], child: [280, 360, 1.3, 0], oldMan: [95, 135, 0.97, 1], oldWoman: [180, 235, 1.12, 1],
};
const CRY_KINDS = ['ow', 'aah', 'ugh', 'ohno', 'whimper', 'gasp', 'sob'];
function makeCry(sr, rnd, kind, who) {
  const [lo, hi, scale, old] = CRY_VOICES[who], p0 = lo + rnd() * (hi - lo);
  const shake = f => old ? t => f(t) * (1 + 0.05 * Math.sin(2 * Math.PI * (5 + rnd() * 2) * t)) : f; // an old, quavering voice
  const base = { rnd, scale, breath: 0.35 + old * 0.2, rough: 0.3 + old * 0.2, jitter: 0.03 + old * 0.02 };
  if (kind === 'ow') { // a sharp, pained "Ow!"
    const dur = 0.24 + rnd() * 0.1;
    return synthVoice(sr, { ...base, dur, drive: 1.8, pitch: shake(curve([[0, p0 * 1.1], [0.05, p0 * 1.45], [dur, p0 * 0.8]])), amp: curve([[0, 0], [0.015, 1], [dur * 0.5, 0.8], [dur, 0]]), vowel: t => blendV('a', 'u')(t / dur) });
  }
  if (kind === 'aah') { // a short, startled cry
    const dur = 0.32 + rnd() * 0.15;
    return synthVoice(sr, { ...base, dur, drive: 2, breath: base.breath + 0.15, pitch: shake(curve([[0, p0 * 1.3], [0.04, p0 * 1.6], [dur, p0 * 1.05]])), amp: curve([[0, 0], [0.02, 1], [dur * 0.6, 0.7], [dur, 0]]), vowel: 'a' });
  }
  if (kind === 'ugh') { // a sick, falling groan
    const dur = 0.35 + rnd() * 0.25;
    return synthVoice(sr, { ...base, dur, breath: 0.45, rough: 0.5, pitch: shake(curve([[0, p0 * 0.95], [0.05, p0], [dur, p0 * 0.68]])), amp: curve([[0, 0], [0.04, 1], [dur * 0.5, 0.8], [dur, 0]]), vowel: t => blendV('uh', 'o')(t / dur) });
  }
  if (kind === 'ohno') { // "Oh no!": two syllables, the second higher, with a hummed n between
    const dur = 0.55 + rnd() * 0.1, m = dur * 0.42;
    return synthVoice(sr, { ...base, dur, drive: 1.4, pitch: shake(curve([[0, p0], [m, p0 * 0.95], [m + 0.05, p0 * 1.35], [dur, p0 * 0.9]])),
      amp: curve([[0, 0], [0.03, 1], [m - 0.04, 0.8], [m, 0.25], [m + 0.05, 0.3], [m + 0.09, 1], [dur * 0.85, 0.7], [dur, 0]]),
      vowel: t => t < m - 0.03 ? VOWELS.o : t < m + 0.06 ? VOWELS.u : blendV('o', 'u')((t - m) / (dur - m)) });
  }
  if (kind === 'whimper') { // a thin, trembling whine
    const dur = 0.45 + rnd() * 0.2, rate = 7 + rnd() * 4;
    return synthVoice(sr, { ...base, dur, breath: 0.6, rough: 0.15, pitch: t => p0 * 1.45 * (1 - 0.25 * t / dur) * (1 + 0.06 * Math.sin(2 * Math.PI * rate * t)), amp: t => Math.min(1, t / 0.05) * Math.min(1, (dur - t) / 0.12) * (0.75 + 0.25 * Math.sin(2 * Math.PI * rate * t)), vowel: t => blendV('i', 'u')(t / dur) });
  }
  if (kind === 'gasp') { // a sharp, breathy intake: mostly air
    const dur = 0.2 + rnd() * 0.08;
    return synthVoice(sr, { ...base, dur, breath: 2.2, rough: 0.1, pitch: curve([[0, p0 * 1.2], [dur, p0 * 1.5]]), amp: curve([[0, 0], [0.04, 1], [dur * 0.7, 0.9], [dur, 0]]), vowel: t => blendV('ae', 'a')(t / dur) });
  }
  // 'sob': two or three catching "uh-huh"s, falling
  const parts = 2 + Math.floor(rnd() * 2), gap = 0.17, out = new Float32Array(Math.floor((parts * gap + 0.25) * sr));
  for (let k = 0; k < parts; k++) {
    const d = 0.13 + rnd() * 0.06, p = p0 * (1.25 - k * 0.12);
    const v = synthVoice(sr, { ...base, dur: d, breath: 0.7, pitch: shake(curve([[0, p * 1.1], [d, p * 0.85]])), amp: curve([[0, 0], [0.02, 1], [d, 0]]), vowel: k ? 'uh' : 'u' });
    mixInto(out, v, Math.floor(k * gap * sr), 1 - k * 0.15);
  }
  return dspFade(normalise(out), sr);
}

// ---- rats -----------------------------------------------------------------------------------
function makeSqueak(sr, rnd, dying) { // a real rat squeak: a fast, warbling chirp around 3-5 kHz
  const dur = dying ? 0.16 + rnd() * 0.08 : 0.05 + rnd() * 0.06, n = Math.floor(dur * sr), x = new Float32Array(n);
  const f0 = 3000 + rnd() * 1600, vib = 45 + rnd() * 40, wob = smoothNoise(n, 60, sr, rnd);
  const fc = dying ? curve([[0, f0 * 1.1], [dur * 0.3, f0 * 1.2], [dur, f0 * 0.55]]) : curve([[0, f0 * 0.85], [dur * 0.35, f0 * 1.12], [dur, f0 * 0.95]]);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = fc(t) * (1 + 0.04 * Math.sin(2 * Math.PI * vib * t) + 0.02 * wob[i]); ph += f / sr;
    const env = Math.min(1, t / 0.006) * Math.min(1, (dur - t) / (dying ? 0.06 : 0.02));
    x[i] = env * (Math.sin(2 * Math.PI * ph) + 0.35 * Math.sin(4 * Math.PI * ph) + 0.12 * Math.sin(6 * Math.PI * ph) + 0.08 * (rnd() * 2 - 1));
  }
  return normalise(dspFilt(x, 'hp', 1500, 0.7, sr));
}

// ---- eating, water, metal -------------------------------------------------------------------
function clicks(sr, n, count, f, rnd, spread) { // a burst of short cracks (bones, gristle)
  const x = new Float32Array(n);
  for (let c = 0; c < count; c++) {
    const at = Math.floor(rnd() * spread * sr), len = Math.floor((0.002 + rnd() * 0.006) * sr), g = 0.4 + rnd() * 0.6;
    for (let i = 0; i < len && at + i < n; i++) x[at + i] += (rnd() * 2 - 1) * g * Math.exp(-i / (len * 0.3));
  }
  return dspFilt(x, 'bp', f, 1.2, sr);
}
function makeChew(sr, rnd) { // one bite of the feast: crunch, tear or squelch (or a mix)
  const dur = 0.18 + rnd() * 0.14, n = Math.floor(dur * sr), out = new Float32Array(n), kind = rnd();
  if (kind < 0.45) { // bone crunch: a cluster of cracks over a dull thud
    mixInto(out, clicks(sr, n, 10 + Math.floor(rnd() * 14), 1800 + rnd() * 1800, rnd, 0.08), 0, 1.4);
    const th = new Float32Array(Math.floor(0.08 * sr)); for (let i = 0; i < th.length; i++) th[i] = (rnd() * 2 - 1) * Math.exp(-i / (0.015 * sr));
    mixInto(out, dspFilt(th, 'lp', 220, 1, sr), 0, 1.5);
  }
  if (kind > 0.3) { // wet tearing: hissing noise sweeping down, crackling
    const tear = new Float32Array(n), crk = smoothNoise(n, 90, sr, rnd), env = curve([[0, 0], [0.02, 1], [dur * 0.7, 0.6], [dur, 0]]);
    for (let i = 0; i < n; i++) tear[i] = (rnd() * 2 - 1) * env(i / sr) * Math.max(0, crk[i] + 0.3);
    mixInto(out, dspFilt(tear, 'bp', curve([[0, 2600], [dur, 900]]), 1.4, sr), 0, 0.9);
  }
  if (kind > 0.6) { // squelch: a resonant gurgle and a couple of bubbles
    const sq = new Float32Array(n), env = curve([[0, 0], [0.03, 1], [dur, 0]]);
    for (let i = 0; i < n; i++) sq[i] = (rnd() * 2 - 1) * env(i / sr);
    mixInto(out, dspFilt(dspFilt(sq, 'lp', 1200, 0.7, sr), 'peak', curve([[0, 320], [dur, 900]]), 8, sr, 18), 0, 0.7);
    for (let b = 0; b < 2; b++) {
      const at = Math.floor(rnd() * dur * 0.7 * sr), len = Math.floor(0.025 * sr), f0 = 350 + rnd() * 400;
      let ph = 0; for (let i = 0; i < len && at + i < n; i++) { ph += f0 * (1 + 1.5 * i / len) / sr; out[at + i] += Math.sin(2 * Math.PI * ph) * 0.5 * Math.sin(Math.PI * i / len); }
    }
  }
  return dspFade(normalise(out), sr, 0.002, 0.03);
}
function makeSplatter(sr, rnd) { // the super spreader bursting: a wet pop, spray and dripping
  const dur = 0.7, n = Math.floor(dur * sr), out = new Float32Array(n);
  const pop = new Float32Array(Math.floor(0.12 * sr)); for (let i = 0; i < pop.length; i++) pop[i] = (rnd() * 2 - 1) * Math.exp(-i / (0.03 * sr));
  mixInto(out, dspFilt(pop, 'lp', 500, 1.5, sr), 0, 2);
  const spray = new Float32Array(n), env = curve([[0, 1], [0.25, 0.3], [dur, 0]]); for (let i = 0; i < n; i++) spray[i] = (rnd() * 2 - 1) * env(i / sr);
  mixInto(out, dspFilt(spray, 'bp', curve([[0, 1800], [dur, 700]]), 0.8, sr), 0, 0.6);
  mixInto(out, clicks(sr, n, 40, 2400, rnd, 0.5), Math.floor(0.03 * sr), 0.5); // droplets landing
  return dspFade(normalise(out), sr, 0.001, 0.1);
}
function makeSplash(sr, rnd) { // the swarm dropping into the sewer: a splash, bubbles, a drip
  const dur = 0.8, n = Math.floor(dur * sr), out = new Float32Array(n);
  const s = new Float32Array(n), env = curve([[0, 0], [0.01, 1], [0.15, 0.4], [0.5, 0]]); for (let i = 0; i < n; i++) s[i] = (rnd() * 2 - 1) * env(i / sr);
  mixInto(out, dspFilt(dspFilt(s, 'lp', 2500, 0.7, sr), 'hp', 150, 0.7, sr), 0, 1);
  for (let b = 0; b < 9; b++) { // bubbles: rising little sine blips
    const at = Math.floor((0.05 + rnd() * 0.5) * sr), len = Math.floor((0.02 + rnd() * 0.03) * sr), f0 = 400 + rnd() * 700; let ph = 0;
    for (let i = 0; i < len && at + i < n; i++) { ph += f0 * (1 + 0.8 * i / len) / sr; out[at + i] += Math.sin(2 * Math.PI * ph) * 0.35 * Math.sin(Math.PI * i / len); }
  }
  return dspFade(normalise(out), sr, 0.002, 0.1);
}
function metal(sr, rnd, dur, partials, decay, hit) { // struck iron: inharmonic ringing partials over a short hit
  const n = Math.floor(dur * sr), out = new Float32Array(n);
  for (const [f, g, d] of partials) { const ff = f * (0.97 + rnd() * 0.06); for (let i = 0; i < n; i++) out[i] += Math.sin(2 * Math.PI * ff * i / sr) * g * Math.exp(-i / (d * decay * sr)); }
  const h = new Float32Array(Math.floor(0.03 * sr)); for (let i = 0; i < h.length; i++) h[i] = (rnd() * 2 - 1) * Math.exp(-i / (0.006 * sr));
  mixInto(out, dspFilt(h, 'hp', 800, 0.7, sr), 0, hit);
  return dspFade(normalise(out), sr, 0.001, 0.05);
}
function makeClank(sr, rnd) { // a portcullis slamming down: heavy iron, then a rattle of bars
  const out = metal(sr, rnd, 0.7, [[180, 1, 0.5], [437, 0.7, 0.35], [1013, 0.5, 0.25], [1720, 0.35, 0.15], [2650, 0.2, 0.1]], 0.4, 2);
  const th = new Float32Array(Math.floor(0.15 * sr)); for (let i = 0; i < th.length; i++) th[i] = (rnd() * 2 - 1) * Math.exp(-i / (0.03 * sr));
  mixInto(out, dspFilt(th, 'lp', 160, 1, sr), 0, 1.8);
  mixInto(out, metal(sr, rnd, 0.2, [[2200, 1, 0.3], [3300, 0.6, 0.2]], 0.3, 1), Math.floor(0.09 * sr), 0.25);
  return normalise(out);
}
function makeKeys(sr, rnd) { // a ring of keys picked up: several bright metallic tings
  const out = new Float32Array(Math.floor(0.55 * sr));
  for (let k = 0; k < 6; k++) mixInto(out, metal(sr, rnd, 0.25, [[3000 + rnd() * 2500, 1, 0.5], [5200 + rnd() * 2500, 0.6, 0.3], [8000, 0.2, 0.2]], 0.25, 0.6), Math.floor((rnd() * 0.25 + k * 0.03) * sr), 0.5 + rnd() * 0.5);
  return dspFade(normalise(out), sr);
}

// ---- building and playing -------------------------------------------------------------------
const BANK_RECIPES = {
  squeak: [8, (sr, r) => makeSqueak(sr, r, false)],
  dying: [5, (sr, r) => makeSqueak(sr, r, true)],
  screamF: [4, (sr, r) => makeScream(sr, r, true)],
  screamM: [4, (sr, r) => makeScream(sr, r, false)],
  shout: [4, makeShout],
  cry: [21, (sr, r, v) => makeCry(sr, r, CRY_KINDS[v % 7], ['man', 'woman', 'child', 'oldMan', 'oldWoman', 'woman', 'man'][(v + Math.floor(v / 7) * 2) % 7])], // A13: every kind in three voices
  chew: [12, makeChew],
  splatter: [2, makeSplatter],
  splash: [3, makeSplash],
  clank: [3, makeClank],
  keys: [2, makeKeys],
};
function buildOne(name) { // adds the next variant of one sound
  const [count, make] = BANK_RECIPES[name], list = BANK.sets[name] || (BANK.sets[name] = []);
  if (list.length >= count) return;
  if (!BANK.rnd[name]) BANK.rnd[name] = mulberry32(7331 + name.length * 97 + name.charCodeAt(0));
  const data = make(BANK.sr, BANK.rnd[name], list.length), buf = actx.createBuffer(1, data.length, BANK.sr);
  buf.getChannelData(0).set(data); list.push(buf);
}
function bankReady() { // a new audio context (or rate) starts the bank afresh
  if (BANK.sr !== actx.sampleRate || BANK.ctx !== actx) { BANK.sr = actx.sampleRate; BANK.ctx = actx; BANK.sets = {}; BANK.rnd = {}; }
}
// Called every frame: builds one more variant until all are ready (well under a second in total),
// so starting sound never stalls the game.
function warmBank() {
  if (!actx || !CONFIG.realisticSounds) return;
  bankReady();
  const next = Object.keys(BANK_RECIPES).find(n => !BANK.sets[n] || BANK.sets[n].length < BANK_RECIPES[n][0]);
  if (next) buildOne(next);
}
// Play one variant of a sound. opts: vol, rate (speed and pitch), at (seconds from now), lp (a muffling filter in Hz)
function playBank(name, opts = {}) {
  if (!actx || sfxOff || !BANK_RECIPES[name]) return;
  bankReady(); if (!BANK.sets[name] || !BANK.sets[name].length) buildOne(name); // not warmed up yet: make one now
  const set = BANK.sets[name];
  const src = actx.createBufferSource(), g = actx.createGain(), t = actx.currentTime + (opts.at || 0) + 0.005;
  let pick = Math.floor(Math.random() * set.length);
  if (set.length > 1 && pick === BANK.last[name]) pick = (pick + 1 + Math.floor(Math.random() * (set.length - 1))) % set.length; // never the same one twice running
  BANK.last[name] = pick; src.buffer = set[pick];
  src.playbackRate.value = (opts.rate || 1) * (0.94 + Math.random() * 0.12);
  g.gain.value = opts.vol ?? 0.3;
  let node = src;
  if (opts.lp) { const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp; node.connect(f); node = f; }
  node.connect(g); g.connect(actx.destination); src.start(t);
}
