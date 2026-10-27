// core.js — grid builder, level loader and player physics.
// Pure logic (no DOM) so the node validator can run the exact same simulation as the game.
(function (root) {
  const TS = 16, GRAV = 0.33, MAXF = 4.6, SPD = 1.55, PW = 10, PH = 14;

  // ---------- level grid builder ----------
  function Grid(w) {
    this.w = w; this.h = 12; this.c = [];
    for (let y = 0; y < 12; y++) {
      const row = new Array(w).fill(y === 0 || y === 11 ? '#' : '.');
      this.c.push(row);
    }
  }
  Grid.prototype.put = function (x, y, ch) {
    if (x >= 0 && x < this.w && y >= 0 && y < 12) this.c[y][x] = ch; return this;
  };
  Grid.prototype.rect = function (x, y, w, h, ch) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(x + i, y + j, ch); return this;
  };
  Grid.prototype.str = function (x, y, s) {
    for (let i = 0; i < s.length; i++) if (s[i] !== ' ') this.put(x + i, y, s[i]); return this;
  };
  // floor-standing / ceiling-hanging helpers
  Grid.prototype.pillarF = function (x, h, w) { return this.rect(x, 11 - h, w || 2, h, '#'); };
  Grid.prototype.pillarC = function (x, h, w) { return this.rect(x, 1, w || 2, h, '#'); };
  Grid.prototype.spikesF = function (x, n) { return this.rect(x, 10, n, 1, '^'); };
  Grid.prototype.spikesC = function (x, n) { return this.rect(x, 1, n, 1, 'v'); };
  Grid.prototype.block = function (x, y, w, ch) { return this.rect(x, y, w, 1, ch || '#'); };
  Grid.prototype.coins = function (x, y, n) { return this.rect(x, y, n, 1, 'o'); };
  Grid.prototype.holeF = function (x, n) { return this.rect(x, 11, n, 1, '.'); };
  Grid.prototype.holeC = function (x, n) { return this.rect(x, 0, n, 1, '.'); };
  Grid.prototype.rows = function () { return this.c.map(r => r.join('')); };

  // ---------- level loader ----------
  // Static tile chars kept in the grid: . # b(crumble) i(ice) ^ v O(orb)
  // Everything else becomes an entity spec and is blanked out of the grid.
  const STATIC = '.#biv^O';
  function loadLevel(def) {
    const rows = def.rows;
    const h = rows.length, w = rows[0].length;
    const t = new Array(w * h).fill('.');
    const L = { name: def.name, kana: def.kana, sub: def.sub, theme: def.theme, hints: def.hints || [],
      w, h, t, specs: [], spawn: { x: 40, y: 150 }, exit: null, checkpoints: [], arena: def.arena || null };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (STATIC.indexOf(ch) >= 0) { t[y * w + x] = ch; continue; }
      if (ch === 'S') { L.spawn = { x: x * TS + 3, y: y * TS + 2 }; continue; }
      if (ch === 'E') { L.exit = { x: x * TS, y: y * TS, tx: x, ty: y }; continue; }
      if (ch === 'C') { L.checkpoints.push({ tx: x, ty: y }); continue; }
      L.specs.push({ ch, tx: x, ty: y });
    }
    L.cp = null; // runtime respawn
    L.gone = {};  // broken crumble blocks: idx -> frames until regrow
    L.tile = function (x, y) {
      if (x < 0 || x >= w) return '#';
      if (y < 0 || y >= h) return '.';
      return t[y * w + x];
    };
    L.solid = function (x, y) {
      if (x < 0 || x >= w) return true;
      if (y < 0 || y >= h) return false;
      const c = t[y * w + x];
      if (c === '#' || c === 'i') return true;
      if (c === 'b') return !(L.gone[y * w + x] > 0);
      return false;
    };
    return L;
  }

  // ---------- player physics ----------
  function newPlayer(x, y, g) {
    return { x, y, w: PW, h: PH, vx: 0, vy: 0, g: g || 1, ground: false, coyote: 0, flipCd: 0, flipBuf: 0,
      orbId: -1, face: 1, ice: false, dead: false, sq: 0, groundTile: -1, flips: 0 };
  }
  function approach(v, t, a) { return v < t ? Math.min(v + a, t) : Math.max(v - a, t); }

  function stepPlayer(P, L, inp, ev) {
    if (P.flipCd > 0) P.flipCd--;
    if (inp.flip) P.flipBuf = 7; else if (P.flipBuf > 0) P.flipBuf--;

    // horizontal control (ice = slippery)
    const dir = inp.dir | 0;
    const ice = P.ground && P.ice;
    if (dir !== 0) {
      P.face = dir;
      P.vx = approach(P.vx, dir * SPD, ice ? 0.07 : P.ground ? 0.55 : 0.34);
    } else {
      P.vx = approach(P.vx, 0, ice ? 0.025 : P.ground ? 0.65 : 0.16);
    }

    // gravity flip (only from the ground, with coyote time + input buffer)
    if (P.ground) P.coyote = 6; else if (P.coyote > 0) P.coyote--;
    if (P.flipBuf > 0 && P.coyote > 0 && P.flipCd === 0) {
      P.g = -P.g; P.vy = P.g * 1.3; P.ground = false; P.coyote = 0; P.flipBuf = 0; P.flipCd = 8;
      P.flips++; ev && ev.push('flip');
    }

    // move X
    P.x += P.vx;
    {
      const y0 = Math.floor(P.y / TS), y1 = Math.floor((P.y + P.h - 0.01) / TS);
      if (P.vx > 0) {
        const tx = Math.floor((P.x + P.w - 0.01) / TS);
        for (let ty = y0; ty <= y1; ty++) if (L.solid(tx, ty)) { P.x = tx * TS - P.w; P.vx = 0; break; }
      } else if (P.vx < 0) {
        const tx = Math.floor(P.x / TS);
        for (let ty = y0; ty <= y1; ty++) if (L.solid(tx, ty)) { P.x = (tx + 1) * TS; P.vx = 0; break; }
      }
    }
    // move Y
    const wasGround = P.ground;
    P.ground = false; P.ice = false;
    P.vy += P.g * GRAV;
    if (P.vy > MAXF) P.vy = MAXF; else if (P.vy < -MAXF) P.vy = -MAXF;
    const preVy = P.vy;
    P.y += P.vy;
    {
      const x0 = Math.floor(P.x / TS), x1 = Math.floor((P.x + P.w - 0.01) / TS);
      if (P.vy > 0) {
        const ty = Math.floor((P.y + P.h - 0.01) / TS);
        for (let tx = x0; tx <= x1; tx++) if (L.solid(tx, ty)) {
          P.y = ty * TS - P.h; P.vy = 0;
          if (P.g > 0) { P.ground = true; P.groundTile = ty * L.w + tx; if (L.tile(tx, ty) === 'i') P.ice = true; }
        }
      } else if (P.vy < 0) {
        const ty = Math.floor(P.y / TS);
        for (let tx = x0; tx <= x1; tx++) if (L.solid(tx, ty)) {
          P.y = (ty + 1) * TS; P.vy = 0;
          if (P.g < 0) { P.ground = true; P.groundTile = ty * L.w + tx; if (L.tile(tx, ty) === 'i') P.ice = true; }
        }
      }
    }
    if (P.ground && !wasGround) { ev && ev.push('land'); if (Math.abs(preVy) > 2.5) ev && ev.push('hardland'); }

    // gravity orbs: each orb fires once per contact (re-arms once the player has left it)
    {
      const cx = P.x + P.w / 2, cy = P.y + P.h / 2;
      const x0 = Math.floor((cx - 14) / TS), x1 = Math.floor((cx + 14) / TS);
      const y0 = Math.floor((cy - 14) / TS), y1 = Math.floor((cy + 14) / TS);
      let inside = -1, hit = -1;
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (L.tile(tx, ty) !== 'O') continue;
        const dx = tx * TS + 8 - cx, dy = ty * TS + 8 - cy;
        if (dx * dx + dy * dy < 13 * 13) {
          const id = ty * L.w + tx;
          if (id === P.orbId) inside = id; else if (hit < 0) hit = id;
        }
      }
      if (inside < 0) P.orbId = -1;
      if (hit >= 0) {
        P.orbId = hit; P.g = -P.g; P.vy = P.g * 1.6; P.ground = false; P.coyote = 0;
        ev && ev.push('orb:' + (hit % L.w) + ',' + Math.floor(hit / L.w));
      }
    }
  }

  const Core_pad = { v: 0 };  // validator-only: fattens hazard hitboxes to prove stages aren't frame-perfect
  // spikes + out of world
  function hazardHit(P, L) {
    const pad = Core_pad.v;
    if (P.y > L.h * TS + 6 || P.y + P.h < -6) return true;
    const px0 = P.x + 1 - pad, px1 = P.x + P.w - 1 + pad, py0 = P.y + 1 - pad, py1 = P.y + P.h - 1 + pad;
    const x0 = Math.floor(px0 / TS), x1 = Math.floor(px1 / TS);
    const y0 = Math.floor(py0 / TS), y1 = Math.floor(py1 / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = L.tile(tx, ty);
      if (c === '^') {
        if (px1 > tx * TS + 2 && px0 < tx * TS + 14 && py1 > ty * TS + 8) return true;
      } else if (c === 'v') {
        if (px1 > tx * TS + 2 && px0 < tx * TS + 14 && py0 < ty * TS + 8) return true;
      }
    }
    return false;
  }
  function touchExit(P, L) {
    if (!L.exit) return false;
    const e = L.exit;
    return P.x + P.w > e.x + 3 && P.x < e.x + 13 && P.y + P.h > e.y && P.y < e.y + TS;
  }

  root.Core = { pad: Core_pad, TS, GRAV, MAXF, SPD, PW, PH, Grid, loadLevel, newPlayer, stepPlayer, hazardHit, touchExit };
  if (typeof module !== 'undefined') module.exports = root.Core;
})(typeof window !== 'undefined' ? window : globalThis);
