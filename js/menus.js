// Plague Rat: HUD, menus, level list, powerups and the level card.
'use strict';

// ---------------------------------------------------------------------------
// HUD + screens
// ---------------------------------------------------------------------------
const $ = id => document.getElementById(id);
let hudCache = {};
function updateHud() {
  const G = game;
  const pct = Math.floor(G.infected * 100 / CONFIG.population);
  if (hudCache.pct !== pct) { $('pct').textContent = pct + '%'; $('pctFill').style.width = pct + '%'; hudCache.pct = pct; }
  if (hudCache.rats !== G.rats.length) {
    $('rats').textContent = G.rats.length; hudCache.rats = G.rats.length;
    $('swarmBox').classList.toggle('low', G.rats.length <= 3);
  }
  const left = huntersLeft(G), met = targetMet(G), hk = left + '/' + met;
  if (hudCache.hk !== hk) {
    hudCache.hk = hk;
    const el = $('huntersLeft');
    el.hidden = !G.hunters.length;
    el.innerHTML = pxIcon('skull', !left ? '#9cff3a' : met ? '#ffd75a' : '#e0482c', 2) + (!left ? 'All eaten' : met ? `Eat ${left} more!` : `${left} left`);
    el.classList.toggle('urgent', met && left > 0); el.classList.toggle('done', !left);
  }
  // R16-R20: the district's obstacle tip for the first seconds, then the sewer key status
  const F = LEVEL.features || {}, hz = !F.sewers ? '' : G.hasKey ? 'Sewers open' : 'Find the key';
  if (hudCache.hz !== hz) { hudCache.hz = hz; const el = $('hazLine'); el.hidden = !hz; el.innerHTML = pxIcon('grate', G.hasKey ? '#c05cff' : '#e8c860', 2) + hz; el.classList.toggle('open', !!G.hasKey); }
  const clk = fmtTime(G.time) + '|' + starsFor(levelIndex, G.time); // R23: the clock and the stars still in reach
  if (hudCache.clk !== clk) { hudCache.clk = clk; const n = starsFor(levelIndex, G.time); $('clock').innerHTML = [0, 1, 2].map(i => `<span class="${i < n ? '' : 'lost'}">${pxIcon('star', '#ffd75a', 1)}</span>`).join('') + '&nbsp;' + fmtTime(G.time); }
  updateTips(G);
  const P = G.powers, pw = [P.bite, P.biteArmed, P.boost, P.boostT > 0, P.biteBought, P.boostBought, !!G.spreader].join();
  if (hudCache.pw !== pw) { // P3, P4: powerup buttons in the bottom bar
    hudCache.pw = pw;
    const b = $('pwBite'), o = $('pwBoost');
    b.dataset.state = !P.biteBought ? 'none' : P.biteArmed ? 'armed' : P.bite ? 'ready' : 'used';
    b.querySelector('.st').textContent = { none: 'none', armed: 'armed!', ready: `${P.bite} left`, used: 'used' }[b.dataset.state];
    o.dataset.state = !P.boostBought ? 'none' : P.boostT > 0 ? 'active' : P.boost ? 'ready' : 'used';
    o.querySelector('.st').textContent = o.dataset.state === 'none' ? 'none' : o.dataset.state === 'active' ? 'go!' : P.boost ? `${P.boost} left` : 'used';
  }
  if (P.boostT > 0) $('boostLeft').style.width = (P.boostT / CONFIG.boostTime * 100) + '%';
  if (hudCache.pp !== plaguePoints) { // P1: plague points, with a little flash when they go up
    const el = $('ppHud').parentNode;
    if (hudCache.pp !== undefined && plaguePoints > hudCache.pp) { el.classList.add('bump'); clearTimeout(hudCache.ppT); hudCache.ppT = setTimeout(() => el.classList.remove('bump'), 160); }
    $('ppHud').textContent = plaguePoints; hudCache.pp = plaguePoints;
  }
  const di = decayIntervalFor(G.rats.length);
  $('decayFill').style.width = Math.max(0, 100 - G.decayTimer / di * 100) + '%';
  if (hudCache.di !== di) { $('decaySecs').textContent = di.toFixed(1) + 's'; hudCache.di = di; }
}
const fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

// R24: District 1 teaches as you play: one short tip at a time at the top of the play area,
// until District 1 has been won once.
const TIPS = [
  { text: () => isTouch() ? 'Push the <b>joystick</b> to run' : '<b>WASD</b> or <b>arrows</b> to run', done: (G, T) => Math.hypot(G.rats[0].x - START.x, G.rats[0].y - START.y) > 40 },
  { text: () => 'Run into <b>townsfolk</b> to infect them', done: G => G.infected > 0 },
  { text: () => 'Each one adds a <b>rat</b> to your swarm', done: (G, T) => T > 3.5 },
  { text: () => 'Keep biting! When the <b>timer</b> runs out a rat dies', done: (G, T) => T > 4.5 },
  { text: () => `Infect <b>${Math.ceil(CONFIG.targetPercent * CONFIG.population / 100)}</b> people to take the district`, done: (G, T) => T > 4.5 },
];
function updateTips(G) {
  const el = $('tip');
  const on = levelIndex === 0 && unlocked <= 1 && state === 'playing' && !paused && !G.card && !G.intro && !G.feast && G.rats[0];
  if (on && G.tip === undefined) { G.tip = 0; G.tipT = 0; }
  const tip = on ? TIPS[G.tip] : null;
  if (tip) {
    G.tipT += 1 / 60; // updateHud runs once a frame
    if (tip.done(G, G.tipT)) { G.tip++; G.tipT = 0; hudCache.tip = null; return; }
    if (hudCache.tip !== G.tip) { hudCache.tip = G.tip; el.innerHTML = tip.text(); el.style.top = (parseFloat(canvas.style.top) || 0) + 8 + 'px'; el.hidden = false; }
  } else if (!el.hidden) { el.hidden = true; hudCache.tip = null; }
}

// R23: stars. Winning a district earns 1 star, 2 within its first time goal, 3 within the second.
// The best result for each district is kept on this device.
const BEST_KEY = 'plague-rat-best';
let best = {};
try { best = JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}; } catch (e) { best = {}; }
const saveBest = () => { try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch (e) { /* storage blocked */ } };
const starsFor = (i, t) => 1 + (t < LEVELS[i].stars[0]) + (t < LEVELS[i].stars[1]);
const totalStars = () => Object.values(best).reduce((n, b) => n + (b.stars || 0), 0);
const starRow = (n, size, dim = '#4a3e30') => [0, 1, 2].map(i => `<i>${pxIcon('star', i < n ? '#ffd75a' : dim, size)}</i>`).join('');
function recordWin(i, t) { // returns { stars, newBest }
  const stars = starsFor(i, t), b = best[i], newBest = !b || t < b.time;
  if (newBest) best[i] = { stars: Math.max(stars, b ? b.stars : 0), time: Math.round(t * 10) / 10 };
  else if (stars > b.stars) best[i].stars = stars;
  saveBest();
  return { stars, newBest: newBest && !!b };
}

// ---------------------------------------------------------------------------
// Levels: progress, loading and the level list (L-rules)
// ---------------------------------------------------------------------------
const SAVE_KEY = 'plague-rat-unlocked';
let unlocked = 1;
try { unlocked = Math.max(1, Math.min(LEVELS.length, parseInt(localStorage.getItem(SAVE_KEY), 10) || 1)); } catch (e) { /* storage blocked */ }
let selected = unlocked - 1, loadedLevel = -1;
function unlock(n) {
  unlocked = Math.max(unlocked, Math.min(LEVELS.length, n));
  try { localStorage.setItem(SAVE_KEY, String(unlocked)); } catch (e) { /* storage blocked */ }
}
function loadLevel(i) {
  levelIndex = i; LEVEL = LEVELS[i]; THEME = THEMES[LEVEL.theme];
  Object.assign(CONFIG, BASE_CONFIG, LEVEL.tune, dbg.override || {});
  if (loadedLevel !== i) { buildMap(LEVEL); mapCanvas = renderMap(); loadedLevel = i; }
  $('target').style.left = CONFIG.targetPercent + '%';
}
// V21: small pixel icons for the menus, drawn as crisp SVG squares.
const PX_ICONS = {
  skull: ['..#####..', '.#######.', '##..#..##', '##..#..##', '.#######.', '..##.##..', '..#.#.#..'],
  target: ['..#####..', '.#.....#.', '#..###..#', '#..#.#..#', '#..###..#', '.#.....#.', '..#####..'],
  grate: ['..#####..', '.#.#.#.#.', '#.#.#.#.#', '#.#.#.#.#', '#.#.#.#.#', '.#.#.#.#.', '..#####..'],
  q: ['..####..', '.##..##.', '.....##.', '....##..', '...##...', '........', '...##...'],
  gear: ['...##...', '.######.', '.##..##.', '##....##', '##....##', '.##..##.', '.######.', '...##...'],
  film: ['########', '#.#..#.#', '########', '#......#', '#......#', '########', '#.#..#.#', '########'],
  back: ['...#....', '..##....', '.#######', '########', '.#######', '..##....', '...#....'],
  lock: ['..####..', '.#....#.', '.#....#.', '########', '###..###', '###..###', '########'],
  check: ['.......#', '......##', '#....##.', '##..##..', '.####...', '..##....'],
  close: ['##....##', '.##..##.', '..####..', '...##...', '..####..', '.##..##.', '##....##'],
  sound: ['....#...', '...##.#.', '####.#.#', '####.#.#', '####.#.#', '...##.#.', '....#...'],
  scroll: ['.######.', '#......#', '.#.##.#.', '.#....#.', '.#.##.#.', '.#....#.', '#......#', '.######.'],
  pause: ['##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '##..##'],
  shake: ['#.####.#', '#.#..#.#', '..#..#..', '#.#..#.#', '#.####.#'],
  star: ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '##...##'],
  maze: ['########', '#.....##', '#.###..#', '#.#.#.##', '#.#...##', '#.#####.', '#.......', '########'],
  timer: ['..####..', '.#..#.#.', '#...#..#', '#...##.#', '#......#', '.#....#.', '..####..'],
  hand: ['...#.#..', '..#.#.#.', '..#####.', '.######.', '.######.', '..####..', '..####..'],
  rat: ['.....##.', '.######.', '########', '#######.', '.#..#...'],
  crown: ['#..#..#', '##.#.##', '#######', '#.###.#', '#######'],
  play: ['#....', '###..', '#####', '###..', '#....'],
  wave: ['........', '.##..##.', '#..##..#', '........', '.##..##.', '#..##..#', '........'],
  moon: ['..###...', '.##.....', '##......', '##......', '##......', '.##.....', '..###...'],
  fire: ['...#....', '..##..#.', '..###.#.', '.#####..', '.######.', '########', '.######.'],
  gate: ['########', '#.#.#.#.', '#.#.#.#.', '########', '#.#.#.#.', '#.#.#.#.', '#.#.#.#.'],
  cart: ['..#####.', '.#######', '########', '.#....#.', '###..###', '.#....#.'],
  rats: ['......##', '.#######', '########', '........', '.....##.', '.######.', '#######.'],
};
function pxIcon(name, col, s = 3) {
  const r = PX_ICONS[name]; if (!r) return '';
  const w = r[0].length, h = r.length;
  let out = `<svg class="px" width="${w * s}" height="${h * s}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">`;
  r.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`; }));
  return out + '</svg>';
}
function fillPxIcons(root = document) { root.querySelectorAll('i[data-px]').forEach(el => { el.outerHTML = pxIcon(el.dataset.px, el.dataset.c || '#efe2c0', +el.dataset.s || 3); }); }
fillPxIcons();
const coinImg = sz => `<img src="${UI_ICON_URL.pp}" alt="" style="width:${sz}px;height:${sz}px;image-rendering:pixelated">`;

// The menus sit over the painted street at night (the same art as the end of the opening story).
const menuBg = $('menuBg');
function drawMenuBg() {
  const S = STREET_IMG;
  if (!S.bg && S.img.complete && S.img.naturalWidth) prepStreetImage();
  if (S.bg && !S.night) S.night = paintNightStreet(S.bg);
  const src = S.night || (S.img.naturalWidth ? S.img : null);
  const W = window.innerWidth, H = window.innerHeight;
  if (menuBg.width !== W || menuBg.height !== H) { menuBg.width = W; menuBg.height = H; }
  const g = menuBg.getContext('2d'); g.fillStyle = '#0b0710'; g.fillRect(0, 0, W, H);
  if (!src) return;
  const k = Math.max(W / 1408, H / 768), w = 1408 * k, h = 768 * k;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, Math.round((W - w) * 0.42), Math.round((H - h) / 2), w, h);
}
STREET_IMG.img.addEventListener('load', () => { if (!menuBg.hidden) setTimeout(drawMenuBg, 50); });
function showMenuBg(on) { menuBg.hidden = !on; $('menuBgShade').hidden = !on; if (on) drawMenuBg(); }

// District thumbnails: a crop of each district's map around the well, made a few at a time and kept on this device.
const THUMB_KEY = 'plague-rat-thumbs-v1';
let thumbs = {}, thumbBusy = false;
try { thumbs = JSON.parse(localStorage.getItem(THUMB_KEY) || '{}'); } catch (e) { thumbs = {}; }
function makeThumbs() {
  if (thumbBusy) return;
  const next = LEVELS.findIndex((lv, i) => !thumbs[i]);
  if (next < 0) return;
  thumbBusy = true;
  setTimeout(() => {
    thumbBusy = false;
    if (state !== 'title') return; // only while the menus are up
    loadLevel(next);
    const c = makeCanvas(140, 104), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(mapCanvas, WELL.x - 140, WELL.y - 104, 280, 208, 0, 0, 140, 104);
    thumbs[next] = c.toDataURL();
    try { localStorage.setItem(THUMB_KEY, JSON.stringify(thumbs)); } catch (e) { /* storage full or blocked */ }
    const el = document.querySelector(`.m-card[data-i="${next}"] .m-thumb`); if (el) el.style.backgroundImage = `url(${thumbs[next]})`;
    makeThumbs();
  }, 60);
}
// Obstacles in a district, as short tags (the long text shows when a tag is tapped on the level card).
function levelObstacles(lv) {
  const F = lv.features || {}, out = [];
  if (lv.canalBand !== undefined) out.push(['wave', 'Canal', 'A canal cuts the district in two. Only the bridges cross it.']);
  if (lv.alleyChance >= 0.7) out.push(['maze', 'Maze', 'Narrow alleys split almost every block.']);
  if (THEMES[lv.theme].night) out.push(['moon', 'Dark', 'Night has fallen. You only see what the lamps light.']);
  if (F.fires) out.push(['fire', 'Fires', 'Fire pits smoulder, then flare up and burn any rat in them. Cross while they smoulder or once they die down.']);
  if (F.flood) out.push(['wave', 'Flood', 'Flooded streets slow everyone down. Keep to the dry causeways.']);
  if (F.gates) out.push(['gate', 'Gates', 'Iron gates across the streets drop on a timer and block the way. Slip under while they are up.']);
  if (F.carts) out.push(['cart', 'Carts', 'Horse-drawn carts roll up and down the streets and crush rats. Cross behind them.']);
  if (F.sewers) out.push(['grate', 'Sewers', 'Find the <span class="key">gold sewer key</span> to open the four grates in the corners. Step on an open grate and the swarm pops out of another one, picked at random.']);
  return out;
}
function renderLevelList() {
  $('levelList').innerHTML = LEVELS.map((lv, i) => {
    const t = lv.tune, locked = i >= unlocked, done = i < unlocked - 1, nh = lv.hunters.length;
    const meta = locked
      ? `<span>${pxIcon('lock', '#a8987a', 2)}Take ${LEVELS[i - 1].name.replace(/^The /, '')}</span>`
      : `<span>${pxIcon('target', '#c05cff', 2)}${t.targetPercent}%</span><span>${nh ? pxIcon('skull', '#e0482c', 2) + nh : 'No hunters'}</span>` + levelObstacles(lv).map(([ic, nm]) => `<span>${pxIcon(ic, '#a8987a', 2)}${nm}</span>`).join('');
    const end = best[i] ? `<span class="stars">${starRow(best[i].stars, 2)}</span>` : done ? pxIcon('check', '#9cff3a', 3) : i === selected && !locked ? pxIcon('play', '#c05cff', 4) : locked ? pxIcon('lock', '#6a5a4a', 3) : '';
    return `<button class="m-card m-panel${i === selected ? ' on' : ''}" type="button" data-i="${i}" ${locked ? 'disabled' : ''}>
      <span class="m-thumb" style="${thumbs[i] ? `background-image:url(${thumbs[i]})` : ''}"><span class="num">${i + 1}</span></span>
      <span><span class="nm">${lv.name}</span><span class="meta">${meta}</span></span><span>${end}</span></button>`;
  }).join('');
  $('playSub').textContent = LEVELS[selected].name;
  $('startSub').textContent = `District ${selected + 1} · ${LEVELS[selected].name}`;
  $('levelsCount').textContent = `${unlocked} / ${LEVELS.length}`;
  $('ppTitle').textContent = $('ppLevels').textContent = plaguePoints;
  $('starsLevels').textContent = `${totalStars()}/${LEVELS.length * 3}`;
}
$('levelList').addEventListener('click', e => {
  const b = e.target.closest('.m-card'); if (!b || b.disabled) return;
  const top = $('levelList').scrollTop;
  selected = +b.dataset.i; renderLevelList(); $('levelList').scrollTop = top;
});

const SCREENS = ['titleScreen', 'levelScreen', 'endScreen', 'splash', 'levelCard', 'howScreen', 'settingsScreen', 'pauseScreen'];
function hideScreens() { for (const id of SCREENS) $(id).hidden = true; showMenuBg(false); }
function enterMenu() { state = 'title'; stopMusic(); hideScreens(); setFramed(false); mini.hidden = true; stickEl.hidden = true; }
const focusKb = el => { if (!isTouch()) el.focus(); };
function showTitle() { enterMenu(); renderLevelList(); showMenuBg(true); $('titleScreen').hidden = false; focusKb($('startBtn')); makeThumbs(); }
function showLevels() {
  enterMenu(); renderLevelList(); showMenuBg(true); $('levelScreen').hidden = false; focusKb($('playBtn')); makeThumbs();
  const on = document.querySelector('.m-card.on'); if (on) on.scrollIntoView({ block: 'center' });
}
function openPanel(id) { $(id).hidden = false; focusKb($(id).querySelector('[data-close]')); }
function closePanels() { $('howScreen').hidden = true; $('settingsScreen').hidden = true; $('resetConfirm').hidden = true; $('resetNote').hidden = true; if (!$('titleScreen').hidden) focusKb($('startBtn')); }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closePanels));
for (const id of ['howScreen', 'settingsScreen']) $(id).addEventListener('click', e => { if (e.target === $(id)) closePanels(); }); // tap outside the panel
$('howBtn').addEventListener('click', () => openPanel('howScreen'));
$('settingsBtn').addEventListener('click', () => openPanel('settingsScreen'));
$('levelsBtn').addEventListener('click', showLevels);
$('backBtn').addEventListener('click', showTitle);
$('playBtn').addEventListener('click', () => startLevel(selected));
$('introBtn2').addEventListener('click', () => { closePanels(); beginCutscene(); });
// Reset progress: asks for confirmation on the page (browser confirm dialogs aren't available here).
$('resetBtn').addEventListener('click', () => { $('resetNote').hidden = true; $('resetConfirm').hidden = false; $('resetYes').focus(); });
$('resetNo').addEventListener('click', () => { $('resetConfirm').hidden = true; $('resetBtn').focus(); });
// V17: which side of the joystick the powerup buttons sit on, remembered on this device
const HAND_KEY = 'plague-rat-hand';
let leftHanded = false;
try { leftHanded = localStorage.getItem(HAND_KEY) === 'left'; } catch (e) { /* storage blocked */ }
function applyHand() {
  document.body.classList.toggle('lefty', leftHanded);
  $('handR').setAttribute('aria-pressed', String(!leftHanded)); $('handL').setAttribute('aria-pressed', String(leftHanded));
}
function setHand(left) { leftHanded = left; try { localStorage.setItem(HAND_KEY, left ? 'left' : 'right'); } catch (e) { /* storage blocked */ } applyHand(); resize(); }
$('handR').addEventListener('click', () => setHand(false));
$('handL').addEventListener('click', () => setHand(true));
applyHand();
// V22: screen shake and vibration, on unless the device asks for reduced motion; remembered on this device
const FX_KEY = 'plague-rat-shake';
let shakeOn = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
try { const v = localStorage.getItem(FX_KEY); if (v) shakeOn = v === 'on'; } catch (e) { /* storage blocked */ }
function applyFx() { $('fxOn').setAttribute('aria-pressed', String(shakeOn)); $('fxOff').setAttribute('aria-pressed', String(!shakeOn)); }
function setFx(on) { shakeOn = on; try { localStorage.setItem(FX_KEY, on ? 'on' : 'off'); } catch (e) { /* storage blocked */ } applyFx(); if (on) jolt(3, 0.3, 40); }
$('fxOn').addEventListener('click', () => setFx(true));
$('fxOff').addEventListener('click', () => setFx(false));
applyFx();
$('sndOn').addEventListener('click', () => { if (muted) toggleMute(); });
$('sndOff').addEventListener('click', () => { if (!muted) toggleMute(); });
$('resetYes').addEventListener('click', () => {
  unlocked = 1; selected = 0; // the next game starts from the first district
  plaguePoints = 0; savePoints(); // P1: a reset also empties the plague points
  inventory = { bite: 0, boost: 0 }; saveInventory(); // ...and the owned powerups
  best = {}; saveBest(); // R23: ...and the stars
  try { localStorage.setItem(SAVE_KEY, '1'); } catch (e) { /* storage blocked: progress was only in memory anyway */ }
  $('resetConfirm').hidden = true;
  $('resetNote').textContent = 'Progress reset. Only The Market District is open now.'; $('resetNote').hidden = false;
  renderLevelList(); $('resetBtn').focus();
});

function startLevel(i) {
  if (state === 'playing') return;
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  const go = () => {
    stopJingle(); loadLevel(i); newGame(); hudCache = {};
    state = 'playing';
    startMusic();
    hideScreens(); mini.hidden = false; setFramed(true);
    stickEl.hidden = !isTouch();
    canvas.focus?.();
  };
  if (loadedLevel === i) go();
  else { for (const id of ['startSub', 'playSub']) $(id).textContent = 'Preparing the district…'; setTimeout(go, 30); }
}
// ---------------------------------------------------------------------------
// P1-P4: plague points and powerups.
//   P1 plague points: 1 per infection, 3 per hunter eaten, kept between levels and after a loss
//   P2 the shop on the level title card: each powerup can be bought once per attempt
//   P3 super spreader bite: three bites; the next person bitten walks to the nearest crowd and bursts
//   P4 speed boost: three short dashes per attempt
// ---------------------------------------------------------------------------
const PP_KEY = 'plague-rat-points';
let plaguePoints = 0;
try { plaguePoints = Math.max(0, parseInt(localStorage.getItem(PP_KEY), 10) || 0); } catch (e) { /* storage blocked */ }
function savePoints() { try { localStorage.setItem(PP_KEY, String(plaguePoints)); } catch (e) { /* storage blocked */ } }
// P2: powerups bought but not used are kept on this device for later attempts.
const INV_KEY = 'plague-rat-powerups';
let inventory = { bite: 0, boost: 0 };
try { inventory = { ...inventory, ...JSON.parse(localStorage.getItem(INV_KEY) || '{}') }; } catch (e) { /* storage blocked or bad data */ }
function saveInventory() { try { localStorage.setItem(INV_KEY, JSON.stringify(inventory)); } catch (e) { /* storage blocked */ } }
// P1: later districts pay more; fractions carry over so nothing is lost to rounding.
const pointsMult = () => CONFIG.pointsBaseMult + CONFIG.pointsPerDistrict * levelIndex;
function awardPoints(base) {
  game.ppFrac = (game.ppFrac || 0) + base * pointsMult();
  const whole = Math.floor(game.ppFrac + 1e-9); game.ppFrac -= whole;
  if (whole) addPoints(whole);
}
function addPoints(n) { plaguePoints += n; if (game) game.pointsEarned = (game.pointsEarned || 0) + n; savePoints(); }

const POWERS = {
  bite: { name: 'Super spreader bite', key: '1', cost: () => CONFIG.biteCost,
    desc: () => `${CONFIG.biteCharges} bites this level. Each one makes the next person you infect a super spreader. They stagger to the nearest crowd and burst, infecting everyone close by. Hunters keep clear of them.` },
  boost: { name: 'Speed boost', key: '2', cost: () => CONFIG.boostCost,
    desc: () => `${CONFIG.boostCharges} short dashes this level: ${CONFIG.boostTime} s at ${Math.round(CONFIG.boostMult * 100)}% speed.` },
};
const newPowers = () => ({ // an attempt starts with whatever powerups are owned (P2)
  biteBought: !!inventory.bite, bite: inventory.bite ? CONFIG.biteCharges : 0, biteArmed: false,
  boostBought: !!inventory.boost, boost: inventory.boost ? CONFIG.boostCharges : 0, boostT: 0,
});

function buyPower(id) {
  const P = game.powers, cost = POWERS[id].cost();
  if (!game.card || P[id + 'Bought'] || plaguePoints < cost) return;
  plaguePoints -= cost; savePoints();
  inventory[id] = 1; saveInventory();
  P[id + 'Bought'] = true;
  if (id === 'bite') P.bite = CONFIG.biteCharges; else P.boost = CONFIG.boostCharges;
  sfx.buy(); renderShop();
}
function renderShop() {
  const P = game.powers;
  $('ppHave').textContent = plaguePoints;
  const names = { bite: `Super bite ×${CONFIG.biteCharges}`, boost: `Speed boost ×${CONFIG.boostCharges}` };
  $('shopList').innerHTML = Object.entries(POWERS).map(([id, pw]) => {
    const cost = pw.cost(), bought = P[id + 'Bought'], can = !bought && plaguePoints >= cost;
    return `<div class="m-pwt${bought ? ' owned' : ''}" title="${pw.desc().replace(/"/g, '&quot;')}"><img src="${UI_ICON_URL[id]}" alt=""><div class="nm">${names[id]}</div>
      <button type="button" data-buy="${id}" ${can ? '' : 'disabled'}>${bought ? 'Owned' : `${coinImg(14)}${cost}`}</button></div>`;
  }).join('');
  const none = plaguePoints === 0 && !P.biteBought && !P.boostBought;
  $('shopNote').hidden = !none; $('shopNote').textContent = 'Infect townsfolk and eat hunters to earn plague points.';
}
$('shopList').addEventListener('click', e => { const b = e.target.closest('[data-buy]'); if (b && !b.disabled) buyPower(b.dataset.buy); });

function usePower(id) {
  const G = game, P = G.powers;
  if (state !== 'playing' || paused || G.card || G.intro || G.feast || !G.rats[0]) return;
  if (id === 'bite') {
    if (!P.bite || P.biteArmed || G.spreader) return;
    P.biteArmed = true; sfx.arm();
    G.texts.push({ x: G.rats[0].x - 14, y: G.rats[0].y - 14, text: 'BITE READY', col: SPREADER_COL, life: 1.2 });
  } else {
    if (!P.boost || P.boostT > 0) return;
    P.boost--; P.boostT = CONFIG.boostTime; sfx.boost();
    if (inventory.boost) { inventory.boost = 0; saveInventory(); } // P4: a started boost is spent at the end of this level
  }
  hudCache.pw = null;
}
// Pixel icons for the powerups and plague points, drawn once and used as images in the HUD and shop.
const UI_ICONS = {
  bite: [['................', '...gggggggggg...', '..gGGGGGGGGGGg..', '..WWgWgWWgWgWW..', '..WW.w....w.WW..', '..WW........WW..', '...W........W...', '...v........v...', '...V........V...', '................', '...w.w....w.w...', '..gGGGGGGGGGGg..', '...gggggggggg...'],
    { g: '#4a1222', G: '#8a2a40', W: '#f2ead2', w: '#d8cdb0', v: '#9cff3a', V: '#5ac81a' }],
  boost: [['.........YYYY...', '........YYYy....', '.......YYYy.....', 'ss....YYYy......', '.....YYYYYYYy...', 'sss.....YYYy....', '.......YYYy.....', 'ss....YYYy......', '.....YYy........', '....YYy.........', '...Yy...........'],
    { Y: '#ffd75a', y: '#c08a20', s: '#e9dcbc' }],
  pp: [['...pppp...', '.ppPPPPpp.', '.pPsPPPPp.', 'pPskPPkPPp', 'pPPkPPkPPp', 'pPPPPPPPPp', 'pPPkPkPkPp', '.pPPPPPPp.', '.ppPPPPpp.', '...pppp...'],
    { p: '#7d34c4', P: '#c05cff', s: '#f0dcff', k: '#2a0f3a' }],
};
const UI_ICON_URL = {};
for (const [k, [rows, pal]] of Object.entries(UI_ICONS)) UI_ICON_URL[k] = spriteFrom(rows, pal, '#120f0c').toDataURL();
document.querySelectorAll('img[data-ico]').forEach(img => { img.src = UI_ICON_URL[img.dataset.ico]; });

// Pointer-down (not click) so a second finger can fire a powerup while the first keeps steering.
for (const [id, el] of [['bite', $('pwBite')], ['boost', $('pwBoost')]]) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); usePower(id); });
  el.addEventListener('click', e => e.preventDefault());
}

// P3: the super spreader
const SPREADER_COL = '#9cff3a';
function makeSpreader(c) {
  const G = game;
  G.powers.biteArmed = false; G.powers.bite--; hudCache.pw = null;
  if (inventory.bite) { inventory.bite = 0; saveInventory(); } // P3: a started bite is spent at the end of this level
  c.super = { t: 0, repath: 0, target: null };
  G.spreader = c;
  G.texts.push({ x: c.x - 22, y: c.y - 24, text: 'SUPER SPREADER', col: SPREADER_COL, life: 1.4 });
  sfx.arm();
}
let spreadDist = null;
function pickCrowd(c) { // the healthy person with the most healthy neighbours, favouring nearby crowds
  const healthy = game.citizens.filter(p => !p.infected), R = CONFIG.blastRadius;
  let best = null, bestScore = 0;
  for (const p of healthy) {
    let n = 0; for (const q of healthy) if (Math.abs(q.x - p.x) < R && Math.abs(q.y - p.y) < R && Math.hypot(q.x - p.x, q.y - p.y) < R) n++;
    const score = n / (1 + Math.hypot(p.x - c.x, p.y - c.y) / 160);
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best;
}
function distFrom(tx, ty) { // tile distances along the streets from one tile
  const n = MAP_W * MAP_H;
  if (!spreadDist || spreadDist.length !== n) spreadDist = new Int16Array(n);
  const d = spreadDist, q = new Int32Array(n); d.fill(-1);
  const s = ty * MAP_W + tx; let qh = 0, qt = 0; q[qt++] = s; d[s] = 0;
  while (qh < qt) {
    const i = q[qh++], x = i % MAP_W, y = (i / MAP_W) | 0;
    for (const [dx, dy] of DIRS4) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const j = ny * MAP_W + nx; if (d[j] !== -1 || tileSolidIdx(j)) continue;
      d[j] = d[i] + 1; q[qt++] = j;
    }
  }
}
function updateSpreader(c, dt) {
  const S = c.super;
  S.t += dt; S.repath -= dt;
  if (S.repath <= 0) {
    S.repath = 0.5; S.target = pickCrowd(c);
    if (S.target) distFrom((S.target.x / TILE) | 0, (S.target.y / TILE) | 0);
  }
  const T = S.target;
  if (!T || S.t >= CONFIG.spreaderFuse || Math.hypot(T.x - c.x, T.y - c.y) < 9) { explodeSpreader(c); return; }
  let tx = T.x, ty = T.y;
  if (Math.hypot(T.x - c.x, T.y - c.y) > 20) {
    const cx = (c.x / TILE) | 0, cy = (c.y / TILE) | 0;
    let bestD = spreadDist[cy * MAP_W + cx];
    for (const [dx, dy] of DIRS4) { const v = spreadDist[(cy + dy) * MAP_W + cx + dx]; if (v >= 0 && (v < bestD || bestD < 0)) { bestD = v; tx = (cx + dx) * TILE + 8; ty = (cy + dy) * TILE + 8; } }
  }
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(d, CONFIG.spreaderSpeed * slowAt(c.x, c.y) * dt);
  moveWithSlide(c, dx / d * sp, dy / d * sp, 3, 3, true);
  if (Math.abs(dx) > 0.5) c.flip = dx < 0;
  c.anim += dt; if (c.anim > 0.12) { c.anim = 0; c.frame = c.frame ? 0 : 1; }
  if (Math.random() < dt * 14) game.particles.push({ x: c.x + Math.random() * 8 - 4, y: c.y - 10, vx: Math.random() * 6 - 3, vy: -10, life: 0.7, max: 0.7, col: Math.random() < .5 ? SPREADER_COL : PLAGUE, size: 1 });
}
function explodeSpreader(c) {
  const G = game, R = CONFIG.blastRadius;
  c.gone = true; G.spreader = null;
  const hit = G.citizens.filter(p => !p.infected && !p.gone && Math.hypot(p.x - c.x, p.y - (c.y)) < R);
  for (const p of hit) infect(p);
  for (let k = 0; k < 60; k++) {
    const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 70;
    G.particles.push({ x: c.x, y: c.y - 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7, max: 0.7, col: pick(Math.random, [SPREADER_COL, PLAGUE, PLAGUE_DARK, '#e9dcbc']), size: 1 + (Math.random() < .4) });
  }
  G.blasts = (G.blasts || []).concat({ x: c.x, y: c.y, t: 0 });
  G.texts.push({ x: c.x - 10, y: c.y - 26, text: hit.length ? `+${hit.length} BURST` : 'FIZZLE', col: SPREADER_COL, life: 1.3 });
  sfx.blast(); jolt(3, 0.35, 60); // V22
}
function drawSpreaderFx(G, ox, oy) {
  const c = G.spreader;
  if (c) { // pulsing aura and the reach of the coming burst
    const sx = Math.round(c.x + ox), sy = Math.round(c.y + oy), pulse = Math.sin(G.time * 10);
    ctx.globalAlpha = 0.18 + 0.1 * pulse; disc(ctx, sx, sy, CONFIG.blastRadius, SPREADER_COL);
    ctx.globalAlpha = 0.35 + 0.15 * pulse; disc(ctx, sx, sy, 9, PLAGUE); ctx.globalAlpha = 1;
  }
  G.blasts = (G.blasts || []).filter(b => (b.t += 1 / 60) < 0.45);
  for (const b of G.blasts) { // expanding shock ring
    const r = Math.round(CONFIG.blastRadius * (0.3 + b.t / 0.45)), sx = Math.round(b.x + ox), sy = Math.round(b.y + oy);
    ctx.globalAlpha = 1 - b.t / 0.45; ctx.fillStyle = SPREADER_COL;
    for (let a = 0; a < 48; a++) { const t = a / 48 * Math.PI * 2; ctx.fillRect(Math.round(sx + Math.cos(t) * r), Math.round(sy + Math.sin(t) * r * 0.75), 2, 2); }
    ctx.globalAlpha = 1;
  }
}

const startGame = () => startLevel(selected);

// R21: after the swarm climbs out of the well, a title card sums up the district.
// Everything stays paused until the player dismisses it.
// R21 + V21: the level card. Three stat tiles, short obstacle tags (tap one for the details), the powerup shop.
function showLevelCard() {
  const G = game, lv = LEVEL, F = lv.features || {}, nh = lv.hunters.length;
  G.card = true;
  $('lcEyebrow').textContent = `District ${levelIndex + 1} of ${LEVELS.length}`;
  $('lcName').textContent = lv.name;
  const tile = (v, k) => `<div class="m-stat"><div class="v">${v}</div><div class="k">${k}</div></div>`;
  $('lcStats').innerHTML = tile(`${pxIcon('target', '#c05cff', 3)}${CONFIG.targetPercent}%`, `Infect ${Math.ceil(CONFIG.targetPercent * CONFIG.population / 100)}`)
    + tile(`${pxIcon('skull', nh ? '#e0482c' : '#6a5a4a', 3)}${nh}`, nh ? lv.hunters.join(' · ') : 'No hunters')
    + (F.sewers ? tile(pxIcon('grate', '#c05cff', 3), 'Sewers') : tile(`${pxIcon('rats', '#a8987a', 3)}${CONFIG.startRats}`, 'Rats'));
  const [g2, g3] = lv.stars, B = best[levelIndex]; // R23: the time goals for the stars, and the best so far
  $('lcGoals').innerHTML = `<span>${starRow(2, 2)} under <b>${fmtTime(g2)}</b></span><span>${starRow(3, 2)} under <b>${fmtTime(g3)}</b></span>`
    + (B ? `<span>Best <b>${fmtTime(B.time)}</b></span>` : '');
  const obs = levelObstacles(lv);
  $('lcList').innerHTML = obs.length
    ? obs.map(([ic, nm], i) => `<button class="m-tag2" type="button" data-ob="${i}" aria-expanded="false">${pxIcon(ic, ic === 'grate' ? '#c05cff' : '#f0884a', 2)}${nm === 'Sewers' ? 'Find the key' : nm === 'Maze' ? 'Maze of alleys' : nm}<span class="i">i</span></button>`).join('')
    : `<span class="m-tag2" style="cursor:default">Open streets: learn the ropes</span>`;
  $('lcList').dataset.lv = levelIndex;
  $('lcInfo').hidden = true;
  renderShop();
  stickEl.hidden = true;
  $('levelCard').hidden = false; focusKb($('lcGo'));
}
$('lcList').addEventListener('click', e => {
  const b = e.target.closest('[data-ob]'); if (!b) return;
  const open = b.getAttribute('aria-expanded') === 'true';
  $('lcList').querySelectorAll('[data-ob]').forEach(x => x.setAttribute('aria-expanded', 'false'));
  if (open) { $('lcInfo').hidden = true; return; }
  b.setAttribute('aria-expanded', 'true');
  $('lcInfo').innerHTML = levelObstacles(LEVELS[+$('lcList').dataset.lv])[+b.dataset.ob][2]; $('lcInfo').hidden = false;
});
function dismissLevelCard() {
  if (!game || !game.card) return;
  game.card = false; $('levelCard').hidden = true;
  stickEl.hidden = !isTouch(); canvas.focus?.();
}
$('lcGo').addEventListener('click', dismissLevelCard);
let endAction = null;
function endGame(won, reason) {
  if (state !== 'playing') return;
  const G = game;
  state = won ? 'won' : 'lost';
  mini.hidden = true;
  stickEl.hidden = true; stick.id = null; stick.x = stick.y = 0; knobEl.style.transform = '';
  updateHud(); setWarn(false);
  jolt(won ? 2 : 4, won ? 0.25 : 0.45, won ? 0 : reason === 'caught' ? [90, 50, 140] : [60, 40, 60]); // V22
  const pct = Math.floor(G.infected * 100 / CONFIG.population), last = levelIndex === LEVELS.length - 1, left = huntersLeft(G);
  if (won) unlock(levelIndex + 2);
  const W = won ? recordWin(levelIndex, G.time) : null; // R23
  $('endStars').hidden = !won; $('endGoal').hidden = !won;
  if (won) {
    $('endStars').innerHTML = starRow(W.stars, 6);
    const [g2, g3] = LEVEL.stars;
    $('endGoal').innerHTML = W.newBest ? '<b>New best time!</b>' : W.stars === 3 ? 'All three stars' : `${W.stars + 1} stars: under <b>${fmtTime(W.stars === 1 ? g2 : g3)}</b>`;
  }
  // V3 + V21: headline, a progress bar against the target, three tiles, the Bill of Mortality folded away
  $('endCrown').hidden = !won;
  $('endEyebrow').textContent = `District ${levelIndex + 1} · ${LEVEL.name}`;
  $('endTitle').textContent = won ? (last ? 'The city has fallen' : 'District taken') : reason === 'caught' ? 'Caught!' : left && targetMet(G) ? 'Hunters escaped' : 'Swarm died out';
  $('endTitle').style.color = won ? 'var(--plague)' : 'var(--blood)';
  $('endFill').style.width = Math.min(100, pct) + '%'; $('endMark').style.left = CONFIG.targetPercent + '%';
  $('endCapL').innerHTML = `<b>${pct}%</b> infected`;
  $('endCapR').textContent = won ? `in ${fmtTime(G.time)}` : reason === 'caught' ? `caught by hunter ${G.caughtBy.number}` : targetMet(G) ? `${left} hunter${left > 1 ? 's' : ''} left` : `needed ${CONFIG.targetPercent}%`;
  const all = G.huntersKilled === G.hunters.length;
  const tile = (v, k) => `<div class="m-stat"><div class="v">${v}</div><div class="k">${k}</div></div>`;
  $('endFacts').innerHTML = tile(G.peak, 'Top swarm')
    + tile(G.hunters.length ? `${pxIcon('skull', all ? '#9cff3a' : '#e0482c', 3)}${G.huntersKilled}/${G.hunters.length}` : '—', 'Hunters')
    + tile(`${coinImg(16)}+${G.pointsEarned}`, 'Points');
  const bill = billOfMortality(G.infected);
  $('billBtn').hidden = !bill.length; $('bill').hidden = true; $('billBtn').setAttribute('aria-expanded', 'false'); $('billArrow').textContent = '▸';
  $('bill').innerHTML = `<div class="m-eyebrow" style="color:var(--dim)">${LEVEL.name}, this week</div><ol>` +
    bill.map(([c, n]) => `<li><span>${c}</span><span class="lead"></span><b>${n}</b></li>`).join('') + '</ol>';
  const sub = $('retrySub');
  if (won && !last) { $('retryLabel').textContent = 'Next district'; sub.textContent = LEVELS[levelIndex + 1].name; sub.hidden = false; endAction = () => { selected = levelIndex + 1; startLevel(selected); }; }
  else if (won) { $('retryLabel').textContent = 'Districts'; sub.hidden = true; endAction = () => { selected = levelIndex; showLevels(); }; }
  else { $('retryLabel').textContent = 'Try again'; sub.hidden = true; endAction = () => startLevel(levelIndex); }
  stopMusic();
  if (actx) (won ? playWinJingle : playLoseJingle)(actx.currentTime + 0.7); // A8: lands as the panel appears
  setTimeout(() => { $('endScreen').hidden = false; focusKb($('retryBtn')); }, 700);
}
$('billBtn').addEventListener('click', () => {
  const open = $('bill').hidden; $('bill').hidden = !open;
  $('billBtn').setAttribute('aria-expanded', String(open)); $('billArrow').textContent = open ? '▾' : '▸';
});
