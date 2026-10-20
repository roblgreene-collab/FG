// Plague Rat: sound effects, music and end-of-level jingles.
'use strict';

// ---------------------------------------------------------------------------
// Sound: tiny synth blips, started only after the player presses Begin.
// ---------------------------------------------------------------------------
let actx = null, muted = false;
function tone(freq, freq2, start, dur, type, vol) {
  if (!actx || muted) return;
  const t = actx.currentTime + start;
  const o = actx.createOscillator(), gn = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq2, t + dur);
  gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
// A12: with `realisticSounds` on, sounds that stand for something real use the sound bank (js/soundbank.js);
// the earlier synth versions (OLD_SFX) stay for anything else, and for everything if it is switched off.
const REAL = () => CONFIG.realisticSounds;
const OLD_SFX = {
  bonus() { tone(650 + Math.random() * 250, 1500, 0, 0.07, 'square', 0.04); }, // H7: the feast's bonus rats appear
  die() { tone(240, 80, 0, 0.18, 'triangle', 0.09); },
  squeak() { tone(1400 + Math.random() * 300, 2100, 0, 0.05, 'square', 0.025); },
  alert() { tone(900, 1300, 0, 0.08, 'square', 0.05); tone(1300, 900, 0.09, 0.1, 'square', 0.05); },
  kill() { tone(180, 60, 0, 0.25, 'sawtooth', 0.08); tone(500, 200, 0.05, 0.12, 'square', 0.05); },
  win() { [392, 494, 587, 784].forEach((f, i) => tone(f, f, i * 0.11, 0.16, 'square', 0.05)); },
  lose() { [330, 262, 196, 131].forEach((f, i) => tone(f, f * 0.97, i * 0.16, 0.22, 'triangle', 0.08)); },
  clank() { tone(140, 90, 0, 0.12, 'square', 0.06); tone(620, 560, 0, 0.05, 'triangle', 0.04); tone(300, 280, 0.06, 0.08, 'square', 0.03); }, // R19 portcullis drops
  key() { [988, 1319, 1976].forEach((f, i) => tone(f, f, i * 0.07, 0.12, 'square', 0.04)); },                                        // R16 key found
  buy() { [660, 880, 1320].forEach((f, i) => tone(f, f, i * 0.05, 0.08, 'square', 0.04)); },                                        // P2
  arm() { tone(300, 900, 0, 0.18, 'sawtooth', 0.05); tone(905, 905, 0.18, 0.1, 'square', 0.04); },                                   // P3
  blast() { tone(160, 40, 0, 0.45, 'sawtooth', 0.1); tone(900, 200, 0, 0.25, 'square', 0.05); },                                      // P3
  boost() { tone(400, 1600, 0, 0.2, 'square', 0.04); },
  heart() { tone(90, 50, 0, 0.12, 'sine', 0.35); tone(80, 45, 0.16, 0.14, 'sine', 0.28); },                                         // V22 low-swarm warning                                                                               // P4
  sewer() { tone(500, 120, 0, 0.22, 'sawtooth', 0.05); tone(160, 700, 0.2, 0.2, 'triangle', 0.06); },                               // R16 down one grate, up another
};
const sfx = {
  ...OLD_SFX,
  infect(step = 0) { infectSfx(step); }, // A10
  die() { if (REAL()) playBank('dying', { vol: 0.15 }); else OLD_SFX.die(); },
  squeak() { if (REAL()) playBank('squeak', { vol: 0.12 }); else OLD_SFX.squeak(); },
  alert() { if (REAL()) playBank('shout', { vol: 0.35 }); else OLD_SFX.alert(); },          // H4: a hunter spots the swarm
  devour() { if (REAL()) playBank('screamM', { vol: 0.35, rate: 0.9 }); else OLD_SFX.alert(); }, // H7: the hunter screams as the rats pile on
  kill() { if (REAL()) { playBank('chew', { vol: 0.3 }); if (Math.random() < 0.4) playBank('squeak', { vol: 0.12, at: 0.05 }); } else OLD_SFX.kill(); },
  clank() { if (REAL()) playBank('clank', { vol: 0.3 }); else OLD_SFX.clank(); },
  key() { if (REAL()) playBank('keys', { vol: 0.35 }); else OLD_SFX.key(); },
  sewer() { if (REAL()) playBank('splash', { vol: 0.4 }); else OLD_SFX.sewer(); },
  blast() { if (REAL()) { playBank('splatter', { vol: 0.45 }); playBank('cry', { vol: 0.28, at: 0.35 }); playBank('cry', { vol: 0.24, at: 0.6 }); playBank('cry', { vol: 0.2, at: 0.9 }); } else OLD_SFX.blast(); },
};

// A10: infection sounds. Each infection is a rat squeak plus a short sick groan from the victim.
// Quick infections (within `streakWindow`) climb a scale (A-minor pentatonic, the music's key); a gap resets it.
const STREAK_NOTES = [880, 1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637]; // A5 C6 D6 E6 G6 A6 C7 D7 E7
let sfxNoiseBuf = null, sfxLastInfect = -1;
function sfxNoise() {
  if (!sfxNoiseBuf || sfxNoiseBuf.sampleRate !== actx.sampleRate) {
    const n = actx.sampleRate * 0.5; sfxNoiseBuf = actx.createBuffer(1, n, actx.sampleRate);
    const d = sfxNoiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  return sfxNoiseBuf;
}
function sfxEnv(t, a, d, vol) { const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); g.connect(actx.destination); return g; }
function ratSqueak(f, t, vol) { // a quick bent chirp with a little octave sparkle
  const o = actx.createOscillator(), g = sfxEnv(t, 0.006, 0.11, vol);
  o.type = 'square'; o.frequency.setValueAtTime(f * 0.8, t); o.frequency.exponentialRampToValueAtTime(f * 1.22, t + 0.035); o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
  o.connect(g); o.start(t); o.stop(t + 0.14);
  const o2 = actx.createOscillator(), g2 = sfxEnv(t + 0.02, 0.004, 0.06, vol * 0.35);
  o2.type = 'triangle'; o2.frequency.setValueAtTime(f * 2, t + 0.02); o2.connect(g2); o2.start(t + 0.02); o2.stop(t + 0.1);
}
function sickGroan(t, vol, p) { // a short voiced "ugh" through a vowel-ish filter, with a breathy start
  const o = actx.createOscillator(), lp = actx.createBiquadFilter(), bp = actx.createBiquadFilter(), g = sfxEnv(t, 0.02, 0.2, vol);
  o.type = 'sawtooth'; o.frequency.setValueAtTime(p, t); o.frequency.linearRampToValueAtTime(p * 1.08, t + 0.04); o.frequency.exponentialRampToValueAtTime(p * 0.68, t + 0.22);
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(1300, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.22);
  bp.type = 'peaking'; bp.frequency.value = 650; bp.Q.value = 3; bp.gain.value = 9;
  o.connect(lp); lp.connect(bp); bp.connect(g); o.start(t); o.stop(t + 0.25);
  const n = actx.createBufferSource(), nf = actx.createBiquadFilter(), ng = sfxEnv(t, 0.005, 0.07, vol * 0.6);
  n.buffer = sfxNoise(); nf.type = 'bandpass'; nf.frequency.value = 1600; nf.Q.value = 1.2;
  n.connect(nf); nf.connect(ng); n.start(t, Math.random() * 0.3); n.stop(t + 0.09);
}
function infectSfx(step) { // step = how many infections in a row came quickly (0 = the first)
  if (!actx || muted) return;
  const t = actx.currentTime + 0.005;
  if (t - sfxLastInfect < 0.045) return; // a burst infecting many at once sounds once, not as a wall of noise
  sfxLastInfect = t;
  const k = Math.min(step, STREAK_NOTES.length - 1);
  if (REAL()) { // A12 + A13: a real squeak, raised by the same scale steps, and the person's cry
    playBank('squeak', { vol: 0.22, rate: STREAK_NOTES[k] / STREAK_NOTES[0] });
    playBank('cry', { vol: 0.3, at: 0.04 });
    return;
  }
  const f = STREAK_NOTES[k] * (1 + (Math.random() - 0.5) * 0.02);
  ratSqueak(f, t, 0.16);
  sickGroan(t + 0.025, 0.22, 120 + Math.random() * 110);
}
let sfxLastScream = -1;
function screamSfx() { // A11 + R9: a short panicked "eek!" when townsfolk scatter (at most one every 0.35 s)
  if (!actx || muted) return;
  const t = actx.currentTime + 0.01;
  if (t - sfxLastScream < 0.35) return; sfxLastScream = t;
  if (REAL()) { playBank(Math.random() < 0.5 ? 'screamF' : 'screamM', { vol: 0.16 }); return; } // A12
  const p = 900 + Math.random() * 350, o = actx.createOscillator(), lfo = actx.createOscillator(), lg = actx.createGain(), bp = actx.createBiquadFilter(), g = sfxEnv(t, 0.015, 0.26, 0.2);
  o.type = 'sawtooth'; o.frequency.setValueAtTime(p, t); o.frequency.exponentialRampToValueAtTime(p * 1.45, t + 0.07); o.frequency.exponentialRampToValueAtTime(p * 1.1, t + 0.28);
  lfo.frequency.value = 26; lg.gain.value = p * 0.05; lfo.connect(lg); lg.connect(o.frequency);
  bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 1.6;
  o.connect(bp); bp.connect(g); o.start(t); lfo.start(t); o.stop(t + 0.3); lfo.stop(t + 0.3);
}

// A3: "Ring a Ring o' Roses" as a driving chase theme that builds with the
// plague. The tune is the nursery rhyme over a darker A-minor progression. The
// arrangement has five intensity tiers (A5), chosen at the start of each bar
// from how close the spread is to the level's target.
const NOTE_NUM = name => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  return { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
};
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
// 6/8 time: each bar is 6 eighths. 9 bars per verse (8 sung + 1 instrumental fill).
const VERSE_A = [
  ['G4', 2], ['G4', 1], ['E4', 2], ['A4', 1], ['G4', 3], ['E4', 3],              // Ring-a-ring o' ro-ses
  ['G4', 2], ['G4', 1], ['E4', 2], ['A4', 1], ['G4', 3], ['E4', 3],              // a pock-et full of po-sies
  ['A4', 2], ['A4', 1], ['G4', 3], ['A4', 2], ['A4', 1], ['G4', 3],              // a-tish-oo! a-tish-oo!
  ['G4', 2], ['G4', 1], ['G4', 3], ['C4', 6],                                    // we all fall down
  ['E5', 1], ['D5', 1], ['B4', 1], ['G#4', 1], ['E4', 1], ['B3', 1],             // fill over E
];
const VERSE_B = [
  ['G4', 2], ['G4', 1], ['E4', 1], ['F4', 1], ['A4', 1], ['G4', 2], ['F4', 1], ['E4', 3],
  ['G4', 2], ['G4', 1], ['E4', 1], ['F4', 1], ['A4', 1], ['G4', 2], ['A4', 1], ['G4', 1], ['F4', 1], ['E4', 1],
  ['A4', 2], ['A4', 1], ['C5', 3], ['A4', 2], ['A4', 1], ['G4', 3],
  ['G4', 2], ['A4', 1], ['G4', 1], ['F4', 1], ['D4', 1], ['C4', 6],
  ['A4', 1], ['C5', 1], ['E5', 1], ['D5', 1], ['B4', 1], ['G#4', 1],            // a-tish-oo fill
];
const MELODY_STEPS = [VERSE_A, VERSE_B].map(v => { // step -> [midi, length]
  const map = {}; let t = 0;
  for (const [n, len] of v) { map[t] = [NOTE_NUM(n), len]; t += len; }
  return map;
});
const ACT_CHORDS = ['Am', 'Am', 'Am', 'Em', 'F', 'F', 'G', 'Am', 'E'];
const ACT_TONES = { Am: [57, 60, 64], Em: [52, 55, 59], F: [53, 57, 60], G: [55, 59, 62], E: [52, 56, 59] };
const ACT_ROOT = { Am: 33, Em: 40, F: 41, G: 43, E: 40 };
const SCALE = [0, 2, 4, 5, 7, 9, 11];
function thirdBelow(n) {
  const pc = n % 12, oct = Math.floor(n / 12), i = SCALE.indexOf(pc);
  if (i < 0) return n - 3;
  const j = i - 2;
  return j >= 0 ? oct * 12 + SCALE[j] : (oct - 1) * 12 + SCALE[j + 7];
}
const TIER_SPEED = [1, 0.96, 0.92, 0.88, 0.84]; // each tier tightens the tempo a little
const music = { gain: null, dry: null, wet: null, noise: null, timer: null, next: 0, step: 0, verse: 0, tier: 0 };

// A5: intensity tier from the spread so far. 0: under 25% of the target,
// 1: 25%+, 2: 50%+, 3: 75%+, 4: target reached but hunters still alive.
function musicTier() {
  if (state !== 'playing' || !game) return 0;
  const p = game.infected * 100 / (CONFIG.targetPercent * CONFIG.population);
  return p >= 1 ? 4 : p >= 0.75 ? 3 : p >= 0.5 ? 2 : p >= 0.25 ? 1 : 0;
}

function envGain(t, attack, peak, hold, release) {
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  return g;
}
function voice(type, freq, t, dur, out, detune = 0) {
  const o = actx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  o.connect(out); o.start(t); o.stop(t + dur + 0.05); return o;
}
function filt(type, f, q = 0.7) { const b = actx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function noiseHit(t, type, f, peak, decay, wet = false) {
  const s = actx.createBufferSource(); s.buffer = music.noise;
  const g = envGain(t, 0.002, peak, 0.004, decay), b = filt(type, f);
  s.connect(b); b.connect(g); g.connect(music.dry); if (wet) g.connect(music.wet);
  s.start(t); s.stop(t + decay + 0.05);
}
const INST = {
  lead(t, m, dur, vol) { // punchy saw + square through a resonant filter
    const g = envGain(t, 0.01, vol, Math.max(0.02, dur * 0.8), 0.09), f = filt('lowpass', 2800, 2);
    g.connect(f); f.connect(music.dry); f.connect(music.wet);
    voice('sawtooth', hz(m), t, dur + 0.15, g, -5); voice('square', hz(m), t, dur + 0.15, g, 5);
  },
  harm(t, m, dur, vol) {
    const g = envGain(t, 0.02, vol, Math.max(0.02, dur * 0.8), 0.1), f = filt('lowpass', 1800);
    g.connect(f); f.connect(music.dry); f.connect(music.wet);
    voice('triangle', hz(m), t, dur + 0.15, g);
  },
  bass(t, m, dur, vol) { // tight, growling bass
    const g = envGain(t, 0.004, vol, dur * 0.45, dur * 0.4), f = filt('lowpass', 650, 3);
    g.connect(f); f.connect(music.dry);
    voice('sawtooth', hz(m), t, dur + 0.05, g); voice('sine', hz(m) / 2, t, dur + 0.05, g);
  },
  arp(t, m, vol) {
    const g = envGain(t, 0.004, vol, 0.01, 0.12), f = filt('lowpass', 2000);
    g.connect(f); f.connect(music.dry); f.connect(music.wet);
    voice('square', hz(m), t, 0.16, g);
  },
  pad(t, notes, dur, vol) {
    const g = envGain(t, 0.15, vol, Math.max(0.05, dur - 0.3), 0.35), f = filt('lowpass', 1300);
    g.connect(f); f.connect(music.dry); f.connect(music.wet);
    for (const n of notes) { voice('sawtooth', hz(n), t, dur + 0.4, g, -8); voice('sawtooth', hz(n), t, dur + 0.4, g, 8); }
  },
  kick(t, vol) {
    const g = envGain(t, 0.003, vol, 0.01, 0.2); g.connect(music.dry);
    const o = voice('sine', 140, t, 0.25, g); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  },
  snare(t, vol) {
    noiseHit(t, 'bandpass', 1900, vol, 0.13, true);
    const g = envGain(t, 0.002, vol * 0.6, 0.005, 0.07); g.connect(music.dry); voice('triangle', 190, t, 0.1, g);
  },
  hat(t, vol) { noiseHit(t, 'highpass', 7500, vol, 0.035); },
  crash(t, vol) { noiseHit(t, 'highpass', 4200, vol, 1.3, true); },
};

// Schedules one eighth-note step of the arrangement at time t.
function scheduleStep(t, E) {
  const V = CONFIG.musicVolume, s = music.step, bar = Math.floor(s / 6), pos = s % 6, tier = music.tier;
  const chord = ACT_CHORDS[bar], root = ACT_ROOT[chord], tones = ACT_TONES[chord];
  const mel = MELODY_STEPS[music.verse][s];
  if (mel) {
    const [m, len] = mel, dur = len * E;
    INST.lead(t, m, dur, V * (tier >= 2 ? 1.05 : 0.95));
    if (tier >= 2) INST.harm(t, thirdBelow(m), dur, V * 0.55);
    if (tier >= 3) INST.lead(t, m + 12, dur, V * 0.4);                       // octave doubling
  }
  // bass: dotted-quarter pulse, then running eighths, then octave pumping
  const bassPat = tier === 0 ? [1, 0, 0, 1, 0, 1] : [1, 1, 1, 1, 1, 1];
  if (bassPat[pos]) INST.bass(t, root + (tier >= 2 && pos % 2 ? 12 : 0), E * (tier === 0 && pos === 0 ? 2.5 : 0.9), V * 2.1);
  // drums
  if (pos === 0 || pos === 3) INST.kick(t, V * (pos === 0 ? 4.5 : 3.6));
  if (tier >= 3 && pos === 5) INST.kick(t, V * 2.4);
  if (tier >= 1 && pos === 3) INST.snare(t, V * 2.3);
  if (tier >= 3 && bar === 8 && pos >= 4) { INST.snare(t, V * 1.6); INST.snare(t + E / 2, V * 1.9); } // fill roll
  if (tier >= 2) { INST.hat(t, V * (pos % 3 === 0 ? 1.4 : 0.8)); if (tier >= 3) INST.hat(t + E / 2, V * 0.5); }
  // accompaniment
  if (tier >= 1) INST.arp(t, tones[[0, 1, 2, 1, 2, 1][pos]] + 12, V * (tier >= 3 ? 0.55 : 0.4));
  if (tier >= 2 && pos === 0) INST.pad(t, tones, E * 6, V * 0.28);
  if (tier === 4 && pos === 0) INST.pad(t, tones.map(n => n + 12), E * 6, V * 0.18);  // shrill top line for the final hunt
}
function setupMusicGraph() {
  music.gain = actx.createGain(); music.gain.connect(actx.destination);
  music.dry = actx.createGain(); music.dry.connect(music.gain);
  const rev = actx.createConvolver(), len = actx.sampleRate * 1.6, ir = actx.createBuffer(2, len, actx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5); }
  rev.buffer = ir; music.rev = rev;
  music.wet = actx.createGain(); music.wet.gain.value = 0.22; music.wet.connect(rev); rev.connect(music.gain);
  music.noise = actx.createBuffer(1, actx.sampleRate * 1.5, actx.sampleRate);
  const nd = music.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
}
function stepMusic(horizon) {
  for (;;) {
    if (music.step % 6 === 0) { // the tier only changes on a bar line, with a crash when it rises
      const nt = musicTier();
      if (nt > music.tier) INST.crash(music.next, CONFIG.musicVolume * 1.6);
      music.tier = nt;
    }
    const E = CONFIG.musicEighth * TIER_SPEED[music.tier];
    if (music.next > horizon) return;
    scheduleStep(music.next, E);
    music.next += E;
    if (++music.step >= 54) { music.step = 0; music.verse ^= 1; }
  }
}
function startMusic() {
  if (!actx || music.timer) return;
  if (!music.gain) setupMusicGraph();
  music.gain.gain.cancelScheduledValues(actx.currentTime);
  music.gain.gain.setValueAtTime(muted ? 0 : 1, actx.currentTime);
  music.next = actx.currentTime + 0.08; music.step = 0; music.verse = 0; music.tier = 0;
  music.timer = setInterval(() => stepMusic(actx.currentTime + 0.18), 40);
}
function stopMusic() {
  clearInterval(music.timer); music.timer = null;
  if (music.gain) { // let the reverb tail die rather than cutting off, then restore the level
    const t = actx.currentTime; music.gain.gain.cancelScheduledValues(t); music.gain.gain.setValueAtTime(muted ? 0 : 1, t); music.gain.gain.linearRampToValueAtTime(0, t + 0.4);
    setTimeout(() => { if (!music.timer && music.gain) { music.gain.gain.cancelScheduledValues(actx.currentTime); music.gain.gain.setValueAtTime(muted ? 0 : 1, actx.currentTime); } }, 1800);
  }
}

// A8: end-of-level jingles, played with the music instruments on their own bus.
function jingleBus() {
  if (!music.gain) setupMusicGraph();
  stopJingle();
  const bus = actx.createGain(); bus.gain.value = muted ? 0 : 1; bus.connect(actx.destination); music.jingle = bus;
  const dry = actx.createGain(), wet = actx.createGain(), rev = actx.createConvolver();
  rev.buffer = music.rev.buffer; dry.connect(bus); wet.gain.value = 0.32; wet.connect(rev); rev.connect(bus);
  return { dry, wet };
}
function stopJingle() { // fade out a jingle that's still ringing (e.g. the player tapped Try again)
  if (!music.jingle || !actx) return;
  music.jingle.gain.setTargetAtTime(0, actx.currentTime, 0.06); music.jingle = null;
}
function withBus(fn) { const b = jingleBus(), saved = [music.dry, music.wet]; music.dry = b.dry; music.wet = b.wet; try { fn(); } finally { [music.dry, music.wet] = saved; } }
function playWinJingle(t0 = actx.currentTime + 0.05) { // a bright fanfare on the rhyme's opening, landing on a big major chord
  withBus(() => {
    const V = CONFIG.musicVolume, N = NOTE_NUM, at = s => t0 + s, E = 0.11;
    const tune = (start, notes, vol, inst = 'lead') => { let t = start; for (const [n, len] of notes) { if (n) INST[inst](at(t), N(n), len * E, vol); t += len * E; } };
    INST.snare(at(0), V * 1.2); INST.snare(at(0.05), V * 1.6);                                          // flam pickup
    tune(0.11, [['E5', 2], ['E5', 1], ['C#5', 2], ['F#5', 1], ['E5', 3], ['C#5', 3]], V * 1.1);         // "ring a ring o' roses", in A major
    tune(0.11, [['C#5', 2], ['C#5', 1], ['A4', 2], ['D5', 1], ['C#5', 3], ['A4', 3]], V * 0.5, 'harm');
    const chords = [[0.11, 45, [57, 61, 64]], [0.77, 50, [50, 54, 57]], [1.1, 52, [52, 56, 59]]];
    chords.forEach(([s, root, tones], i) => {
      const end = i < 2 ? chords[i + 1][0] : 1.43;
      INST.pad(at(s), tones, end - s, V * 0.3);
      for (let b = s; b < end - 0.01; b += E) INST.bass(at(b), root - 12, E * 0.9, V * 2);
    });
    for (let k = 0; k < 12; k++) { const t = 0.11 + k * E; if (k % 3 === 0) INST.kick(at(t), V * 4); INST.hat(at(t), V * (k % 3 ? 0.7 : 1.3)); }
    for (let k = 0; k < 8; k++) INST.snare(at(1.1 + k * 0.04), V * (0.8 + k * 0.25));                   // drum roll into the chord
    const F = 1.43;                                                                                       // the big finish: A major
    INST.kick(at(F), V * 5.5); INST.crash(at(F), V * 2.2); INST.snare(at(F), V * 2);
    INST.lead(at(F), N('A5'), 1.7, V * 1.15); INST.lead(at(F), N('E5'), 1.7, V * 0.5); INST.lead(at(F), N('C#6'), 1.7, V * 0.35);
    INST.pad(at(F), [45, 57, 61, 64, 69], 2.0, V * 0.5); INST.bass(at(F), 33, 1.9, V * 2.4);
    ['A5', 'C#6', 'E6', 'A6', 'C#7'].forEach((n, i) => INST.arp(at(F + 0.12 + i * 0.07), N(n), V * 0.6)); // sparkle
    INST.kick(at(F + 0.33), V * 3); INST.kick(at(F + 0.44), V * 3.5);
  });
}
function playLoseJingle(t0 = actx.currentTime + 0.05) { // "we all fall down", slow and sinking, in A minor
  withBus(() => {
    // softer instruments, so lifted to sit level with the win jingle
    const V = CONFIG.musicVolume * 1.4, N = NOTE_NUM, at = s => t0 + s, E = 0.24;
    let t = 0;
    for (const [n, len] of [['E4', 2], ['E4', 1], ['D4', 3], ['C4', 2], ['B3', 1], ['A3', 7]]) { INST.lead(at(t), N(n), len * E * 0.95, V * 0.85); t += len * E; }
    for (const [n, s, len] of [['C4', 0, 3], ['B3', 3, 3], ['A3', 6, 3], ['E3', 9, 7]]) INST.harm(at(s * E), N(n), len * E, V * 0.45);
    const chords = [[0, 45, [57, 60, 64]], [3, 38, [50, 53, 57]], [6, 40, [52, 56, 59]], [9, 33, [45, 48, 52]]];
    chords.forEach(([s, root, tones], i) => {
      const len = (i < 3 ? 3 : 7) * E;
      INST.pad(at(s * E), tones, len, V * (i < 3 ? 0.28 : 0.34)); INST.bass(at(s * E), root, len * 0.95, V * 1.7);
      INST.kick(at(s * E), V * (i < 3 ? 2.2 : 3.6)); if (i < 3) INST.kick(at(s * E + 0.2), V * 1.4);   // a slow, fading heartbeat
    });
    INST.crash(at(9 * E), V * 0.6);
    // a last little squeak, falling away
    const g = envGain(at(3.15), 0.005, V * 0.5, 0.05, 0.35), f = filt('lowpass', 2500); g.connect(f); f.connect(music.dry); f.connect(music.wet);
    const o = voice('square', 1500, at(3.15), 0.45, g); o.frequency.exponentialRampToValueAtTime(260, at(3.55));
  });
}
