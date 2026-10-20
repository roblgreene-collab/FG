// Balance test bot for Plague Rat (DESIGN.md §3d balance notes, R23 star times).
//
// Plays districts in a headless browser and prints one line per run.
// It knows where everyone is (like a player watching the minimap), paths along the streets
// to the nearest healthy townsperson or killable hunter, keeps clear of dangerous hunters,
// burning fires, carts and closing gates, and never uses the sewers or powerups.
// So it is a cautious baseline: a good player should beat its times.
//
// Usage: node tools/bot.js [districts] [runs]      e.g. node tools/bot.js 1,2,3 4
//   CFG='{"decayInterval":1.2}' node tools/bot.js 5 3   tries tunables on top of the level's own
// Needs Playwright (npm i -g playwright, or set PLAYWRIGHT to its path).
'use strict';
const path = require('path');
let pw; try { pw = require(process.env.PLAYWRIGHT || 'playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const levels = (process.argv[2] || '1,2,3,4,5,6,7,8,9,10').split(',').map(n => +n - 1), runs = +process.argv[3] || 3;
const page = 'file://' + (process.env.PAGE || path.resolve(__dirname, '..', 'index.html'));

(async () => {
  const b = await pw.chromium.launch(); const pg = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await pg.goto(page); await pg.waitForTimeout(500);
  await pg.evaluate(() => { // install the bot: it steers before every game step
    const TILE = 16, D = window.__plague, step = window.update;
    window.update = dt => { if (window.__bot && game && !game.intro) botSteer(); step(dt); };
    function botSteer() {
      const G = game; if (G.card) { dismissLevelCard(); return; }
      const L = G.rats[0]; if (!L) return;
      const n = G.rats.length, sx = L.x / TILE | 0, sy = L.y / TILE | 0, avoid = new Set();
      const add = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r) avoid.add((x + dx) + ',' + (y + dy)); };
      for (const h of G.hunters) if (h.alive && n < h.number) add(h.x / TILE | 0, h.y / TILE | 0, 3);
      for (const f of HAZ.fires) { const p = firePhase(f); if (p >= CONFIG.fireLit - 0.6 && p < CONFIG.fireOut + 0.1) avoid.add(f.tx + ',' + f.ty); }
      for (const c of G.carts || []) { const [cx, cy] = cartPos(c); for (let k = -1; k <= 3; k++) { const ax = c.axis === 'h' ? cx + c.dir * k * TILE : cx, ay = c.axis === 'h' ? cy : cy + c.dir * k * TILE; add(ax / TILE | 0, ay / TILE | 0, 1); } }
      for (const g of HAZ.gates) if (g.warn || g.closed) for (const [tx, ty] of g.tiles) avoid.add(tx + ',' + ty);
      avoid.delete(sx + ',' + sy);
      const goal = new Map();
      for (const c of G.citizens) if (!c.infected && !c.gone) goal.set((c.x / TILE | 0) + ',' + ((c.y - 2) / TILE | 0), c);
      for (const h of G.hunters) if (h.alive && !h.dying && n >= h.number) goal.set((h.x / TILE | 0) + ',' + ((h.y - 3) / TILE | 0), h);
      const prev = new Map([[sx + ',' + sy, null]]), q = [[sx, sy]]; let found = null;
      for (let qi = 0; qi < q.length; qi++) {
        const [x, y] = q[qi], k = x + ',' + y; if (goal.has(k)) { found = k; break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, nk = nx + ',' + ny;
          if (prev.has(nk) || D.solid(nx * TILE + 8, ny * TILE + 8) || avoid.has(nk)) continue;
          prev.set(nk, k); q.push([nx, ny]);
        }
      }
      if (!found) { // nothing reachable safely: back away from the nearest dangerous hunter
        const h = G.hunters.filter(h => h.alive && n < h.number).sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))[0];
        if (h) { const dx = L.x - h.x, dy = L.y - h.y, d = Math.hypot(dx, dy) || 1; D.input = { x: dx / d, y: dy / d }; } else D.input = { x: 0, y: 0 };
        return;
      }
      let k = found; const pathK = [k]; while (prev.get(k)) { k = prev.get(k); pathK.unshift(k); }
      let tx, ty;
      if (pathK.length <= 2) { const c = goal.get(found); tx = c.x; ty = c.y - 2; }
      else { const [nx, ny] = pathK[1].split(',').map(Number); tx = nx * TILE + 8; ty = ny * TILE + 8; }
      const dx = tx - L.x, dy = ty - L.y, d = Math.hypot(dx, dy) || 1; D.input = { x: dx / d, y: dy / d };
    }
  });
  const all = {};
  for (const li of levels) for (let run = 0; run < runs; run++) {
    await pg.evaluate(([li, ov]) => {
      unlocked = LEVELS.length; state = 'title'; window.__plague.override = ov; window.__plague.timeScale = 6;
      shakeOn = false; inventory = { bite: 0, boost: 0 }; window.__bot = true; startLevel(li);
    }, [li, JSON.parse(process.env.CFG || 'null')]);
    let res;
    for (let i = 0; i < 2400; i++) {
      await pg.waitForTimeout(250);
      res = await pg.evaluate(() => ({ state, inf: game.infected, need: Math.ceil(CONFIG.targetPercent * CONFIG.population / 100), left: game.hunters.filter(h => h.alive).length, rats: game.rats.length, t: Math.round(game.time), peak: game.peak, caught: !!game.caughtBy }));
      if (res.state !== 'playing') break;
    }
    (all[li + 1] = all[li + 1] || []).push(res);
    console.log(`District ${li + 1} run ${run + 1}: ${res.state === 'won' ? 'WON ' : 'lost'} ${Math.floor(res.t / 60)}:${String(res.t % 60).padStart(2, '0')}  infected ${res.inf}/${res.need}  hunters left ${res.left}  rats ${res.rats} (peak ${res.peak})${res.caught ? '  caught' : ''}`);
  }
  console.log('\nSummary');
  for (const [lv, rs] of Object.entries(all)) {
    const wins = rs.filter(r => r.state === 'won'), ts = wins.map(r => r.t).sort((a, b) => a - b);
    console.log(`District ${lv}: won ${wins.length}/${rs.length}` + (ts.length ? `, times ${ts.map(t => Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0')).join(', ')}` : ''));
  }
  if (errs.length) console.log('Page errors:', errs);
  await b.close();
})();
