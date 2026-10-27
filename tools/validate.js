// Reachability validator: BFS over the real player physics (macro-steps of 3 frames).
// Usage: node tools/validate.js [levelIndex]
const path = require('path');
global.window = undefined;
const Core = require('../src/core.js');
require('../src/levels.js');
const LEVELS = globalThis.LEVELS;
const { TS } = Core;
Core.pad.v = +(process.env.PAD || 0);

function key(P) {
  const ix = Math.floor(P.x / 2), iy = Math.floor((P.y + 40) / 2);
  const ivx = Math.round(P.vx / 0.8) + 3, ivy = Math.round(P.vy) + 6;
  return ((((((ix * 400 + iy) * 8 + ivx) * 14 + ivy) * 2 + (P.g > 0 ? 1 : 0)) * 2 + (P.ground ? 1 : 0)) * 2 + (P.orbId >= 0 ? 1 : 0)) * 2 + (P.flipCd > 0 ? 1 : 0);
}
const clone = P => Object.assign({}, P);

function run(idx) {
  const L = Core.loadLevel(LEVELS[idx]);
  const goalX = L.arena ? (L.arena.x0 + 1) * TS : null;
  const start = Core.newPlayer(L.spawn.x, L.spawn.y, 1);
  const seen = new Set([key(start)]);
  start.par = null; let frontier = [start]; let far = start;
  let maxX = 0, steps = 0, solved = false;
  const reach = new Set(); // tiles whose center the player visited close to
  const visitTile = P => {
    const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
    for (let ty = Math.floor((cy - 12) / TS); ty <= Math.floor((cy + 12) / TS); ty++)
      for (let tx = Math.floor((cx - 12) / TS); tx <= Math.floor((cx + 12) / TS); tx++) reach.add(tx + ',' + ty);
  };
  visitTile(start);
  while (frontier.length) {
    const next = [];
    for (const P0 of frontier) {
      for (let dir = -1; dir <= 1; dir++) for (let flip = 0; flip <= 1; flip++) {
        if (flip && !(P0.ground || P0.coyote > 0)) continue;
        const P = clone(P0);
        let dead = false;
        for (let f = 0; f < 3; f++) {
          Core.stepPlayer(P, L, { dir, flip: f === 0 && flip === 1 }, null);
          if (Core.hazardHit(P, L)) { dead = true; break; }
          if (Core.touchExit(P, L) || (goalX && P.x > goalX)) { solved = true; }
        }
        if (dead) continue;
        P.par = P0; P.act = (dir) + (flip ? 'F' : ''); if (P.x > maxX) { maxX = P.x; far = P; }
        const k = key(P);
        if (seen.has(k)) continue;
        seen.add(k); next.push(P); visitTile(P);
      }
    }
    frontier = next; steps++;
    if (seen.size > 6e6) { console.log('state cap'); break; }
  }
  if (!solved && process.argv[3] === 'trace') {
    const path = []; for (let q = far; q; q = q.par) path.push(q); path.reverse();
    path.forEach((q, i) => { if (i % 2 === 0 || i > path.length - 40) console.log(i * 3, 'x', (q.x / 16).toFixed(2), 'y', (q.y / 16).toFixed(2), 'vy', q.vy.toFixed(1), 'g', q.g, q.act || ''); });
  }
  // report pickups
  const miss = [];
  for (const s of L.specs) {
    if ('o*h'.includes(s.ch) && !reach.has(s.tx + ',' + s.ty)) miss.push(s.ch + '@' + s.tx + ',' + s.ty);
  }
  console.log(`L${idx + 1} ${LEVELS[idx].name}: ${solved ? 'SOLVED' : 'FAILED'} states=${seen.size} steps=${steps} maxX=${(maxX / TS).toFixed(1)}/${L.w}`);
  if (miss.length) console.log('  unreachable pickups:', miss.join(' '));
  return solved;
}
const only = process.argv[2];
let ok = true;
for (let i = 0; i < LEVELS.length; i++) if (only === undefined || +only === i + 1) ok = run(i) && ok;
process.exit(ok ? 0 : 1);
