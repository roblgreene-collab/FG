// Plague Rat: input and the main loop.
'use strict';

// ---------------------------------------------------------------------------
// Input + main loop
// ---------------------------------------------------------------------------
window.addEventListener('keydown', e => {
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (state === 'splash' && !e.repeat) { e.preventDefault(); beginLogo(); return; }
  if (state === 'logo' && !e.repeat) { e.preventDefault(); finishLogo(); return; }
  if (state === 'cutscene' && !e.repeat) { e.preventDefault(); endCutscene(true); return; }
  if (state === 'playing' && game.card && !e.repeat) { // R21 + P2: 1 / 2 buy, Enter or Space starts
    e.preventDefault();
    if (e.code === 'Digit1') buyPower('bite'); else if (e.code === 'Digit2') buyPower('boost'); else if (e.code === 'Enter' || e.code === 'Space') dismissLevelCard();
    return;
  }
  keys.add(e.code);
  if (state !== 'playing' && e.code === 'Escape' && !e.repeat) {
    if (!$('howScreen').hidden || !$('settingsScreen').hidden) closePanels(); else if (!$('levelScreen').hidden) showTitle();
    return;
  }
  if (state !== 'playing' && (e.code === 'Enter' || e.code === 'Space') && !e.repeat && $('howScreen').hidden && $('settingsScreen').hidden) {
    if (!$('endScreen').hidden && endAction) { e.preventDefault(); endAction(); }
    else if (!$('titleScreen').hidden) { e.preventDefault(); startGame(); }
    else if (!$('levelScreen').hidden) { e.preventDefault(); startLevel(selected); }
  }
  if (e.code === 'KeyM') toggleMute();
  if (state === 'playing' && !e.repeat && (e.code === 'Digit1' || e.code === 'KeyQ')) usePower('bite');   // P3
  if (state === 'playing' && !e.repeat && (e.code === 'Digit2' || e.code === 'KeyE')) usePower('boost');  // P4
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
// R11: virtual joystick, bottom middle. Shown on touch screens.
const stickEl = $('stick'), knobEl = $('knob');
const isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
function moveStick(e) {
  const r = stickEl.getBoundingClientRect(), rad = r.width / 2;
  let dx = (e.clientX - (r.left + rad)) / rad, dy = (e.clientY - (r.top + rad)) / rad;
  const n = Math.hypot(dx, dy);
  if (n > 1) { dx /= n; dy /= n; }
  stick.x = dx; stick.y = dy;
  knobEl.style.transform = `translate(${dx * rad * 0.62}px, ${dy * rad * 0.62}px)`;
}
function releaseStick(e) {
  if (e.pointerId !== stick.id) return;
  stick.id = null; stick.x = stick.y = 0;
  knobEl.style.transform = ''; stickEl.classList.remove('active');
}
stickEl.addEventListener('pointerdown', e => {
  e.preventDefault(); stick.id = e.pointerId; stickEl.setPointerCapture?.(e.pointerId);
  stickEl.classList.add('active'); moveStick(e);
});
stickEl.addEventListener('pointermove', e => { if (e.pointerId === stick.id) moveStick(e); });
stickEl.addEventListener('pointerup', releaseStick);
stickEl.addEventListener('pointercancel', releaseStick);
window.addEventListener('touchstart', () => { if (state === 'playing' && !game.card) stickEl.hidden = false; }, { passive: true });
$('startBtn').addEventListener('click', startGame);
$('retryBtn').addEventListener('click', () => endAction && endAction());
$('menuBtn').addEventListener('click', () => { selected = levelIndex; showLevels(); });
$('homeBtn').addEventListener('click', () => { selected = Math.min(unlocked - 1, levelIndex + (state === 'won' ? 1 : 0)); showTitle(); });
function toggleMute() {
  muted = !muted; $('mute').textContent = 'Sound: ' + (muted ? 'off' : 'on');
  $('sndOn').setAttribute('aria-pressed', String(!muted)); $('sndOff').setAttribute('aria-pressed', String(muted));
  if (music.gain) music.gain.gain.setValueAtTime(muted ? 0 : 1, actx.currentTime);
}
$('mute').addEventListener('click', e => { toggleMute(); e.currentTarget.blur(); });

loadLevel(selected);
newGame();
renderLevelList();
state = 'splash'; // V10: the story plays first, once the player taps (browsers only allow sound after a tap)
$('splash').addEventListener('click', beginLogo);
$('logoLayer').addEventListener('click', finishLogo);
$('cutLayer').addEventListener('click', () => endCutscene(true));
$('introBtn').addEventListener('click', beginCutscene);
document.body.classList.toggle('touch', isTouch());
resize();
window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'playing') {
    const steps = Math.max(1, Math.round(dbg.timeScale));
    for (let i = 0; i < steps && state === 'playing'; i++) update(dt);
    updateHud();
    renderMinimap();
  }
  if (state === 'cutscene') drawCutscene(dt);
  else if (state === 'splash' || state === 'logo') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, view.w, view.h); }
  else render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
