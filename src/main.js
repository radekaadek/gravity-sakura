// main.js — game states, entities, rendering, input. Gravity Sakura (ぐらびてぃ さくら)
(function () {
  const { W, H } = Art, TS = Core.TS, LEVELS = window.LEVELS;
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const INK = '#2a1838', PINK = '#ff8cc3', WHITE = '#ffffff', GOLD = '#ffd23f', CYAN = '#74deff';

  // ---------- save ----------
  const SAVE_KEY = 'gravity-sakura-v1';
  let save = { unlocked: 1, best: {} };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.unlocked) save = s; } catch (e) { }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }

  // ---------- input ----------
  const keys = {}, touch = {}, pad = {};
  let held = {}, prev = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true; Sound.init(); if (G.state === 'title') Sound.play(6);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G.state === 'play') pause(); });
  function pollGamepad() {
    pad.left = pad.right = pad.flip = pad.shoot = pad.start = pad.up = pad.down = false;
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gps) {
      if (!gp) continue;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, b = i => gp.buttons[i] && gp.buttons[i].pressed;
      pad.left = pad.left || ax < -0.4 || b(14); pad.right = pad.right || ax > 0.4 || b(15);
      pad.up = pad.up || ay < -0.5 || b(12); pad.down = pad.down || ay > 0.5 || b(13);
      pad.flip = pad.flip || b(0) || b(3); pad.shoot = pad.shoot || b(2) || b(1) || b(5); pad.start = pad.start || b(9);
    }
  }
  function poll() {
    pollGamepad(); prev = held; held = {};
    const k = keys;
    held.left = k.ArrowLeft || k.KeyA || pad.left || touch.left;
    held.right = k.ArrowRight || k.KeyD || pad.right || touch.right;
    held.up = k.ArrowUp || k.KeyW || pad.up; held.down = k.ArrowDown || k.KeyS || pad.down;
    held.flip = k.Space || k.KeyZ || k.ArrowUp || k.ArrowDown || k.KeyW || k.KeyS || k.KeyK || pad.flip || touch.flip;
    held.shoot = k.KeyX || k.KeyJ || k.KeyL || k.ShiftLeft || pad.shoot || touch.shoot;
    held.ok = k.Enter || k.Space || k.KeyZ || pad.start || pad.flip || touch.flip || touch.ok;
    held.back = k.Escape || k.Backspace;
    held.pause = k.KeyP || k.Escape || pad.start;
    held.mute = k.KeyM; held.restart = k.KeyR; held.scan = k.KeyV; held.quit = k.KeyQ;
  }
  const hit = n => held[n] && !prev[n];

  // touch controls
  document.querySelectorAll('[data-btn]').forEach(el => {
    const n = el.dataset.btn;
    const on = e => { e.preventDefault(); touch[n] = true; Sound.init(); el.classList.add('on'); };
    const off = e => { e.preventDefault(); touch[n] = false; el.classList.remove('on'); };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off);
    el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
  });

  // ---------- state ----------
  const G = {
    state: 'title', t: 0, level: 0, L: null, P: null, cam: { x: 0, y: 0 }, shake: 0, hitstop: 0,
    hearts: 3, maxHearts: 5, coins: 0, petals: 0, score: 0, deaths: 0, time: 0, respawn: null,
    items: [], signs: [], oni: [], ghosts: [], shooters: [], cps: [], shots: [], balls: [], parts: [], rings: [],
    crumble: {}, boss: null, hint: null, introT: 0, deadT: 0, sel: 0, storyPage: 0, storyT: 0, flash: 0,
    amb: [], fw: [], warn: 0, result: null, tails: [], totalCoins: 0, menuIdx: 0, bossWon: 0,
  };
  const MAXH = () => G.maxHearts;
  function setState(s) { G.state = s; G.t = 0; }

  // ---------- particles ----------
  function part(x, y, vx, vy, life, color, size, grav) { G.parts.push({ x, y, vx, vy, life, max: life, color, size: size || 1, grav: grav == null ? 0.08 : grav }); }
  function burst(x, y, n, colors, spd, life, grav) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = Math.random() * spd + 0.3; part(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), colors[i % colors.length], Math.random() < 0.3 ? 2 : 1, grav); }
  }
  function ring(x, y, color, max) { G.rings.push({ x, y, r: 2, max: max || 26, color }); }
  function shake(n) { G.shake = Math.max(G.shake, n); }

  // ---------- level setup ----------
  function setupLevel(i) {
    const L = Core.loadLevel(LEVELS[i]); G.level = i; G.L = L;
    G.items = []; G.signs = []; G.oni = []; G.ghosts = []; G.shooters = []; G.cps = []; G.shots = []; G.balls = [];
    G.parts = []; G.rings = []; G.crumble = {}; G.boss = null; G.hint = null; G.fw = [];
    G.coins = 0; G.petals = 0; G.score = 0; G.deaths = 0; G.time = 0; G.hearts = 3; G.totalCoins = 0; G.warn = 0;
    const specs = L.specs.slice().sort((a, b) => a.tx - b.tx || a.ty - b.ty);
    let hint = 0;
    specs.forEach(s => {
      const x = s.tx * TS, y = s.ty * TS, up = L.solid(s.tx, s.ty - 1) && !L.solid(s.tx, s.ty + 1);
      switch (s.ch) {
        case 'o': G.items.push({ k: 'coin', x, y, got: false }); G.totalCoins++; break;
        case '*': G.items.push({ k: 'petal', x, y, got: false }); break;
        case 'h': G.items.push({ k: 'heart', x, y, got: false }); break;
        case '?': G.signs.push({ x, y, up, text: L.hints[hint++] || 'GOOD LUCK!' }); break;
        case 'e': {
          const g = L.solid(s.tx, s.ty + 1) ? 1 : L.solid(s.tx, s.ty - 1) ? -1 : 1;
          G.oni.push({ x: x + 2, y: g > 0 ? y + 4 : y, w: 12, h: 12, g, dir: -1, vx: 0.5, anim: 0, hp: 1 }); break;
        }
        case 'g': G.ghosts.push({ bx: x + 8, by: y + 8, x: x + 8, y: y + 8, ph: Math.random() * 6, hp: 1 }); break;
        case 's': case 'z': G.shooters.push({ x, y, up, dir: s.ch === 'z' ? 1 : -1, cd: 60 + (s.tx * 7) % 60 }); break;
        case 'B': G.boss = { x: x + 8, y: y + 8, cx: x + 8, cy: 88, hp: 16, max: 16, t: 0, inv: 0, active: false, dying: 0, fire: 90, warp: 300, flash: 0 }; break;
      }
    });
    L.checkpoints.forEach(c => G.cps.push({ tx: c.tx, ty: c.ty, x: c.tx * TS, y: c.ty * TS, up: L.solid(c.tx, c.ty - 1) && !L.solid(c.tx, c.ty + 1), on: false }));
    G.respawn = { x: L.spawn.x, y: L.spawn.y, g: 1 };
    G.P = Core.newPlayer(L.spawn.x, L.spawn.y, 1); G.P.inv = 0; G.P.shotCd = 0; G.P.hurt = 0; G.P.anim = 0; G.P.blink = 120;
    resetTails(); snapCam();
    // ambience
    const r = Art.rng(i * 31 + 5); G.amb = [];
    for (let k = 0; k < 46; k++) G.amb.push({ x: r() * W * 2, y: r() * H, z: 0.3 + r() * 0.9, ph: r() * 6.28, vx: 0, vy: 0, s: r() });
    Sound.play(i); setState('intro'); G.introT = 0;
  }
  function snapCam() {
    const P = G.P, L = G.L;
    G.cam.x = clamp(P.x + 5 - W / 2, 0, L.w * TS - W); G.cam.y = clamp(P.y + 7 - H / 2, 0, L.h * TS - H);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- hair tails ----------
  function resetTails() {
    const P = G.P; G.tails = [];
    for (let t = 0; t < 2; t++) { const pts = []; for (let i = 0; i < 5; i++) pts.push({ x: P.x + 5, y: P.y + 7 }); G.tails.push(pts); }
  }
  function updateTails() {
    const P = G.P, fy = P.g > 0 ? P.y + P.h : P.y;
    const headY = P.g > 0 ? fy - 16 + 5 : fy + 16 - 5, cx = P.x + P.w / 2;
    G.tails.forEach((pts, ti) => {
      pts[0].x = cx - P.face * (5.5 - ti * 1.2); pts[0].y = headY + ti * 2.5 * P.g;
      for (let i = 1; i < pts.length; i++) {
        const tx = pts[i - 1].x - P.face * (1.3 + ti * 0.4) - P.vx * 0.9;
        const ty = pts[i - 1].y + P.g * 2.3 - P.vy * 0.55 + Math.sin(G.t * 0.12 + i + ti) * 0.25;
        pts[i].x += (tx - pts[i].x) * 0.45; pts[i].y += (ty - pts[i].y) * 0.45;
      }
    });
  }

  // ---------- damage / death ----------
  function hurt(fromX) {
    const P = G.P;
    if (P.inv > 0 || G.state !== 'play') return;
    G.hearts--; G.hitstop = 5; shake(5); Sound.hurt(); P.hurt = 20;
    burst(P.x + 5, P.y + 7, 14, ['#ff8cc3', '#ffffff', '#ffd23f'], 2.2, 30, 0.05);
    if (G.hearts <= 0) { loseLife(); return; }
    P.inv = 100; P.vx = (P.x + 5 < fromX ? -1 : 1) * 2.2; P.vy = -P.g * 2.4; P.ground = false;
  }
  function loseLife() {
    const P = G.P; if (G.state !== 'play') return;
    G.deaths++; G.hitstop = 6; shake(7); Sound.hurt();
    burst(P.x + 5, P.y + 7, 26, ['#ff8cc3', '#ffc4e2', '#ffffff'], 3, 50, 0.06);
    ring(P.x + 5, P.y + 7, '#ff8cc3', 40);
    setState('dead'); G.deadT = 0;
  }
  function hazardDeath() {
    const P = G.P; if (G.state !== 'play') return;
    G.hearts = Math.max(0, G.hearts - 1);
    loseLife();
  }
  function respawn() {
    const P = G.P, r = G.respawn;
    G.P = Object.assign(Core.newPlayer(r.x, r.y, r.g), { inv: 110, shotCd: 0, hurt: 0, anim: 0, blink: 120 });
    G.shots = []; G.balls = []; resetTails(); snapCam(); G.warn = 0;
    setState('play');
  }

  // ---------- update: play ----------
  function updatePlay() {
    const P = G.P, L = G.L;
    G.time++;
    if (hit('pause')) { pause(); return; }
    if (hit('restart')) { setupLevel(G.level); return; }
    const inp = { dir: (held.right ? 1 : 0) - (held.left ? 1 : 0), flip: hit('flip') };
    const ev = [];
    Core.stepPlayer(P, L, inp, ev);
    ev.forEach(e => {
      if (e === 'flip') {
        Sound.flip(P.g); P.sq = 9; P.sqKind = 'stretch';
        ring(P.x + 5, P.y + 7, '#ffffff', 30); ring(P.x + 5, P.y + 7, '#ff8cc3', 18);
        for (let i = 0; i < 8; i++) part(P.x + 5 + (Math.random() - 0.5) * 8, P.y + 7, (Math.random() - 0.5) * 1.2, -P.g * (1 + Math.random() * 2) * -1, 22, i % 2 ? '#ffc4e2' : '#ffffff', 1, 0);
        shake(1);
      } else if (e === 'land') { Sound.land(); P.sq = 6; P.sqKind = 'squash'; for (let i = 0; i < 4; i++) part(P.x + 5, P.g > 0 ? P.y + 14 : P.y, (Math.random() - 0.5) * 1.4, -P.g * 0.3 * Math.random(), 14, '#e8dcf0', 1, 0); }
      else if (e === 'hardland') shake(2);
      else if (e.indexOf('orb:') === 0) {
        Sound.orb(); const o = e.slice(4).split(','); ring(+o[0] * TS + 8, +o[1] * TS + 8, '#74deff', 28); ring(P.x + 5, P.y + 7, '#ffffff', 22); shake(2);
        P.sq = 8; P.sqKind = 'stretch';
        burst(+o[0] * TS + 8, +o[1] * TS + 8, 12, ['#74deff', '#ffffff', '#ff8cc3'], 1.8, 24, 0);
      }
    });
    if (P.inv > 0) P.inv--; if (P.hurt > 0) P.hurt--; if (P.sq > 0) P.sq--; if (P.shotCd > 0) P.shotCd--;
    if (Math.abs(P.vx) > 0.3 && P.ground) P.anim++; else P.anim = 0;
    if (--P.blink < -6) P.blink = 100 + Math.random() * 120;
    updateTails();

    // shooting
    if (held.shoot && P.shotCd === 0 && G.shots.length < 3) {
      P.shotCd = 14; Sound.shoot();
      G.shots.push({ x: P.x + 5 + P.face * 8, y: P.y + 7 + (P.g > 0 ? 1 : -1), vx: P.face * 3.8, life: 46 });
      for (let i = 0; i < 3; i++) part(P.x + 5 + P.face * 9, P.y + 7, P.face * (1 + Math.random()), (Math.random() - 0.5), 10, '#ffc4e2', 1, 0);
    }
    updateShots(); updateItems(); updateOni(); updateGhosts(); updateShooters(); updateBalls(); updateCrumble(); updateBoss();

    // checkpoints
    G.cps.forEach(c => {
      if (!c.on && P.x + 10 > c.x - 6 && P.x < c.x + 22 && P.y + 14 > c.y - 6 && P.y < c.y + 22) {
        c.on = true; Sound.checkpoint();
        const g = L.solid(c.tx, c.ty + 1) ? 1 : L.solid(c.tx, c.ty - 1) ? -1 : P.g;
        G.respawn = { x: c.x + 3, y: g > 0 ? c.y + 16 - 14 : c.y, g };
        if (G.hearts < 3) G.hearts++;
        burst(c.x + 8, c.y + 8, 16, ['#ffe27a', '#ffb030', '#ffffff'], 2, 36, -0.02); ring(c.x + 8, c.y + 8, '#ffe27a', 30);
      }
    });
    // hint signs
    G.hint = null;
    G.signs.forEach(s => { if (Math.abs(P.x + 5 - (s.x + 8)) < 30 && Math.abs(P.y - s.y) < 170) G.hint = s.text; });

    // hazards / exit
    if (Core.hazardHit(P, L)) { hazardDeath(); return; }
    if (Core.touchExit(P, L)) { levelClear(); return; }
    // camera
    const tx = clamp(P.x + 5 - W / 2 + P.face * 22, 0, L.w * TS - W), ty = clamp(P.y + 7 - H / 2, 0, L.h * TS - H);
    G.cam.x += (tx - G.cam.x) * 0.13; G.cam.y += (ty - G.cam.y) * 0.1;
  }
  function overlap(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
  function playerHit(x, y, w, h) { const P = G.P; return overlap(P.x + 1, P.y + 1, P.w - 2, P.h - 2, x, y, w, h); }

  function updateItems() {
    const P = G.P;
    G.items.forEach(it => {
      if (it.got) return;
      if (overlap(P.x, P.y, P.w, P.h, it.x + 2, it.y + 2, 12, 12)) {
        it.got = true;
        if (it.k === 'coin') { G.coins++; G.score += 10; Sound.coin(); burst(it.x + 8, it.y + 8, 5, ['#ffd23f', '#fff6b0'], 1.2, 16, 0); }
        else if (it.k === 'petal') { G.petals++; G.score += 100; Sound.petal(); burst(it.x + 8, it.y + 8, 22, ['#ff8cc3', '#ffc4e2', '#ffffff', '#ffd23f'], 2.4, 40, 0.02); ring(it.x + 8, it.y + 8, '#ff8cc3', 34); }
        else if (it.k === 'heart') { if (G.hearts < MAXH()) G.hearts++; Sound.heart(); burst(it.x + 8, it.y + 8, 10, ['#ec3a56', '#ffffff'], 1.6, 24, 0); }
      }
    });
  }
  function solidAtPx(x, y) { return G.L.solid(Math.floor(x / TS), Math.floor(y / TS)); }

  function updateShots() {
    G.shots = G.shots.filter(s => {
      s.x += s.vx; s.life--;
      if (s.life <= 0 || solidAtPx(s.x + Math.sign(s.vx) * 3, s.y)) { for (let i = 0; i < 4; i++) part(s.x, s.y, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, 12, '#ffc4e2', 1, 0); return false; }
      let alive = true;
      G.oni.forEach(o => { if (alive && o.hp > 0 && overlap(s.x - 3, s.y - 3, 6, 6, o.x - 1, o.y - 1, o.w + 2, o.h + 2)) { killEnemy(o, o.x + 6, o.y + 6); alive = false; } });
      G.ghosts.forEach(o => { if (alive && o.hp > 0 && overlap(s.x - 3, s.y - 3, 6, 6, o.x - 7, o.y - 7, 14, 14)) { killEnemy(o, o.x, o.y); alive = false; } });
      G.balls.forEach(b => { if (alive && b.life > 0 && Math.abs(b.x - s.x) < 6 && Math.abs(b.y - s.y) < 6) { b.life = 0; burst(b.x, b.y, 8, ['#ffa030', '#fff2a0'], 1.4, 16, 0); alive = false; } });
      const B = G.boss;
      if (alive && B && B.active && B.dying === 0 && Math.abs(B.x - s.x) < 22 && Math.abs(B.y - s.y) < 22) {
        alive = false;
        if (B.inv === 0) { B.hp--; B.inv = 18; B.flash = 10; Sound.bossHit(); shake(4); G.hitstop = 3; burst(s.x, s.y, 10, ['#ffd23f', '#ffffff', '#ff8cc3'], 2.2, 24, 0.03); if (B.hp <= 0) { B.dying = 150; Sound.bossDie(); G.balls = []; } }
        else for (let i = 0; i < 3; i++) part(s.x, s.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 10, '#ffffff', 1, 0);
      }
      return alive;
    });
  }
  function killEnemy(o, x, y) {
    o.hp = 0; G.score += 50; Sound.kill(); shake(2);
    burst(x, y, 16, ['#ffffff', '#ff8cc3', '#ffd23f'], 2.4, 30, 0.04); ring(x, y, '#ffffff', 20);
  }
  function updateOni() {
    const L = G.L;
    G.oni = G.oni.filter(o => o.hp > 0);
    G.oni.forEach(o => {
      o.anim++;
      const nx = o.x + o.dir * o.vx, front = o.dir > 0 ? nx + o.w + 1 : nx - 1;
      const midY = o.y + o.h / 2, footY = o.g > 0 ? o.y + o.h + 2 : o.y - 2;
      if (solidAtPx(front, midY) || !solidAtPx(front, footY)) o.dir = -o.dir; else o.x = nx;
      if (playerHit(o.x + 1, o.y + 1, o.w - 2, o.h - 2)) hurt(o.x + 6);
    });
  }
  function updateGhosts() {
    G.ghosts = G.ghosts.filter(o => o.hp > 0);
    G.ghosts.forEach(o => {
      const t = G.time;
      o.x = o.bx + Math.sin(t / 46 + o.ph) * 34; o.y = o.by + Math.sin(t / 30 + o.ph * 2) * 14;
      if (playerHit(o.x - 5, o.y - 5, 10, 10)) hurt(o.x);
    });
  }
  function updateShooters() {
    const P = G.P;
    G.shooters.forEach(s => {
      if (--s.cd <= 0) {
        s.cd = 190;
        if (Math.abs(P.x - s.x) < 250 && Math.abs(P.x - s.x) > 20) {
          const ox = s.x + 8 + s.dir * 9, oy = s.y + 8;
          if (!solidAtPx(ox, oy)) { G.balls.push({ x: ox, y: oy, vx: s.dir * 1.1, vy: 0, life: 260 }); s.flash = 8; Sound.shoot(); }
        }
      }
      if (s.flash > 0) s.flash--;
    });
  }
  function updateBalls() {
    const P = G.P;
    G.balls = G.balls.filter(b => {
      if (b.life <= 0) return false;
      b.x += b.vx; b.y += b.vy; b.life--;
      if (solidAtPx(b.x, b.y)) { burst(b.x, b.y, 6, ['#ffa030', '#fff2a0'], 1.2, 14, 0); return false; }
      if (playerHit(b.x - 3, b.y - 3, 6, 6)) { hurt(b.x); return false; }
      if (b.x < -20 || b.x > G.L.w * TS + 20 || b.y < -20 || b.y > G.L.h * TS + 20) return false;
      if (Math.random() < 0.3) part(b.x - Math.sign(b.vx || 1) * 5, b.y, 0, -0.2, 10, '#ffa030', 1, 0);
      return true;
    });
  }
  function updateCrumble() {
    const P = G.P, L = G.L;
    if (P.ground && L.t[P.groundTile] === 'b' && !G.crumble[P.groundTile] && !(L.gone[P.groundTile] > 0)) G.crumble[P.groundTile] = 45;
    for (const k in G.crumble) {
      if (--G.crumble[k] <= 0) {
        delete G.crumble[k]; L.gone[k] = 150;
        const tx = k % L.w, ty = Math.floor(k / L.w);
        burst(tx * TS + 8, ty * TS + 8, 10, ['#b08850', '#d8b878', '#7c5a30'], 1.8, 28, 0.12);
      }
    }
    for (const k in L.gone) {
      if (L.gone[k] > 0) {
        L.gone[k]--;
        if (L.gone[k] === 0) { // don't regrow inside the player
          const tx = k % L.w, ty = Math.floor(k / L.w);
          if (overlap(P.x, P.y, P.w, P.h, tx * TS, ty * TS, TS, TS)) L.gone[k] = 1;
        }
      }
    }
  }

  // ---------- boss ----------
  function updateBoss() {
    const B = G.boss, P = G.P, L = G.L; if (!B) return;
    if (!B.active) {
      if (P.x > (L.arena.x0 + 2) * TS) { B.active = true; Sound.play(5); shake(6); G.flash = 8; }
      B.y = B.cy + Math.sin(G.time / 25) * 6; return;
    }
    if (B.inv > 0) B.inv--; if (B.flash > 0) B.flash--;
    if (B.dying > 0) {
      B.dying--;
      if (B.dying % 6 === 0) { burst(B.x + (Math.random() - 0.5) * 40, B.y + (Math.random() - 0.5) * 40, 14, ['#ffd23f', '#ff5a2a', '#ffffff', '#ff8cc3'], 3, 34, 0.02); shake(4); }
      B.y += 0.3;
      if (B.dying === 0) { B.gone = true; levelClear(); }
      return;
    }
    B.t++;
    const rage = B.hp <= 8, sp = rage ? 1.35 : 1;
    const a0 = L.arena.x0 * TS, a1 = (L.arena.x1 + 1) * TS, midX = (a0 + a1) / 2;
    B.x = midX + Math.sin(B.t / (80 / sp)) * ((a1 - a0) / 2 - 44);
    B.y = 88 + Math.sin(B.t / (52 / sp) + 1) * 56;
    if (--B.fire <= 0) {
      B.fire = rage ? 70 : 105;
      const dx = P.x + 5 - B.x, dy = P.y + 7 - B.y, d = Math.hypot(dx, dy) || 1, n = rage ? 3 : 1;
      for (let i = -(n >> 1) - (n === 3 ? 0 : 0); i <= (n >> 1); i++) {
        const a = Math.atan2(dy, dx) + i * 0.32;
        G.balls.push({ x: B.x, y: B.y + 6, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, life: 220 });
      }
      Sound.shoot();
    }
    if (--B.warp <= 0) {
      if (B.warp === 0) { G.warn = 50; Sound.warn(); }
    }
    if (B.warp <= 0 && G.warn > 0) {
      G.warn--;
      if (G.warn === 25) Sound.warn();
      if (G.warn === 0) {
        B.warp = rage ? 260 : 340;
        P.g = -P.g; P.vy = P.g * 1.6; P.ground = false; P.coyote = 0; P.sq = 9; P.sqKind = 'stretch'; Sound.flip(P.g); shake(5); G.flash = 6;
        ring(P.x + 5, P.y + 7, '#ffffff', 40);
      }
    }
    if (overlap(P.x + 1, P.y + 1, P.w - 2, P.h - 2, B.x - 13, B.y - 13, 26, 26)) hurt(B.x);
  }

  // ---------- level flow ----------
  function levelClear() {
    if (G.state !== 'play') return;
    const L = G.L, got = G.coins + G.petals * 5, tot = G.totalCoins + 15, pct = got / tot;
    const rank = pct >= 0.95 ? 'S' : pct >= 0.8 ? 'A' : pct >= 0.55 ? 'B' : 'C';
    const prevB = save.best[G.level];
    const rv = { S: 4, A: 3, B: 2, C: 1 };
    if (!prevB || rv[rank] > rv[prevB.rank] || (rv[rank] === rv[prevB.rank] && G.score > prevB.score)) save.best[G.level] = { rank, score: G.score, coins: G.coins, petals: G.petals, time: G.time };
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, G.level + 2)); persist();
    G.result = { rank, coins: G.coins, totalCoins: G.totalCoins, petals: G.petals, time: G.time, deaths: G.deaths, score: G.score };
    Sound.stop(); Sound.clear(); burst(G.P.x + 5, G.P.y + 7, 30, ['#ff8cc3', '#ffffff', '#ffd23f', '#74deff'], 3, 60, 0.02);
    setState('clear');
  }
  function pause() { setState('pause'); Sound.duck(true); }

  // ---------- menus ----------
  function startGame() { Sound.confirm(); if (!save.best[0] && save.unlocked === 1) { G.storyPage = 0; G.storyT = 0; setState('story'); } else { G.sel = Math.min(save.unlocked - 1, LEVELS.length - 1); setState('select'); } }
  const STORY = [
    'LONG AGO THE HEAVENLY SHRINE KEPT THE SKY AND THE EARTH IN BALANCE.',
    'BUT NOW GRAVITY HAS GONE WILD! SAKURA PETALS FALL UPWARD AND OGRES ROAM THE LAND.',
    'HANA, A SHRINE MAIDEN, CAN FLIP THE WORLD UPSIDE DOWN WITH A SINGLE PRAYER.',
    'COLLECT THE SAKURA PETALS, REACH THE GATES, AND FIX THE SKY!',
  ];

  function update() {
    G.t++;
    if (hit('mute')) Sound.toggleMute();
    if (hit('scan')) document.body.classList.toggle('scan');
    switch (G.state) {
      case 'title': updateTitle(); break;
      case 'story': {
        G.storyT++;
        if (hit('ok') || hit('flip')) { const full = STORY[G.storyPage].length; if (G.storyT < full * 2) G.storyT = full * 2 + 1; else { G.storyPage++; G.storyT = 0; Sound.select(); if (G.storyPage >= STORY.length) { G.sel = 0; setState('select'); } } }
        if (hit('back')) { G.sel = 0; setState('select'); }
        break;
      }
      case 'select': {
        if (hit('left') || (held.left && !prev.left)) { if (G.sel > 0) { G.sel--; Sound.select(); } }
        if (held.right && !prev.right) { if (G.sel < save.unlocked - 1) { G.sel++; Sound.select(); } }
        if (hit('ok')) { Sound.confirm(); setupLevel(G.sel); }
        if (hit('back')) { Sound.select(); setState('title'); }
        break;
      }
      case 'intro': G.introT++; if (G.introT > 2) G.state = 'play'; break;
      case 'play': if (G.hitstop > 0) G.hitstop--; else updatePlay(); updateFx(); break;
      case 'pause':
        if (hit('pause') || hit('ok')) { setState('play'); Sound.duck(false); }
        if (hit('restart')) { Sound.duck(false); setupLevel(G.level); }
        if (hit('quit')) { Sound.duck(false); Sound.play(6); G.sel = G.level; setState('select'); }
        break;
      case 'dead':
        G.deadT++; updateFx();
        if (G.deadT > 60) { if (G.hearts <= 0) { Sound.gameover(); setState('gameover'); } else respawn(); }
        break;
      case 'gameover':
        updateFx();
        if (hit('ok') && G.t > 30) { G.hearts = 3; Sound.confirm(); respawn(); }
        if (hit('back') || hit('quit')) { Sound.play(6); G.sel = G.level; setState('select'); }
        break;
      case 'clear':
        updateFx();
        if (hit('ok') && G.t > 50) {
          Sound.confirm();
          if (G.level >= LEVELS.length - 1) { Sound.play(6); setState('ending'); } else { G.sel = G.level + 1; Sound.play(6); setState('select'); }
        }
        break;
      case 'ending':
        if (hit('ok') && G.t > 120) { Sound.play(6); setState('title'); }
        if (G.t % 12 === 0) fireworkAt(40 + Math.random() * 240, 20 + Math.random() * 70);
        updateFx(); break;
    }
  }
  function updateFx() {
    G.parts = G.parts.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= 0.99; return --p.life > 0; });
    G.rings = G.rings.filter(r => { r.r += 1.6; return r.r < r.max; });
    if (G.shake > 0) G.shake -= 0.5;
    if (G.flash > 0) G.flash--;
  }
  function fireworkAt(x, y) {
    const cols = [['#ff8cc3', '#ffffff'], ['#ffd23f', '#ff8a3c'], ['#74deff', '#ffffff'], ['#b0ff90', '#ffffff']][Math.floor(Math.random() * 4)];
    for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283, s = 1.1 + Math.random() * 0.8; G.fw.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 46 + Math.random() * 16, c: cols[i % 2] }); }
  }

  // title demo hero
  let titleL = null, titleP = null;
  function updateTitle() {
    if (!titleL) {
      const g = new Core.Grid(60); titleL = Core.loadLevel({ rows: g.rows(), name: '', kana: '', sub: '', theme: 0 });
      titleP = Core.newPlayer(10, 150, 1);
    }
    const P = titleP, ev = [];
    if (G.t % 90 === 40) { Core.stepPlayer(P, titleL, { dir: 1, flip: true }, ev); } else Core.stepPlayer(P, titleL, { dir: 1, flip: false }, ev);
    if (P.x > 60 * TS - 20) { P.x = 8; }
    if (hit('ok')) startGame();
    if (G.t % 200 === 60) fireworkAt(50 + Math.random() * 220, 20 + Math.random() * 40);
    updateFx();
    if (G.t === 1) Sound.play(6);
  }

  // ---------- render ----------
  function tileMask(L, x, y) {
    const o = (a, b) => (b < 0 || b >= L.h || a < 0 || a >= L.w) ? false : !isSolidChar(L.t[b * L.w + a]);
    return (o(x, y - 1) ? 1 : 0) | (o(x, y + 1) ? 2 : 0) | (o(x - 1, y) ? 4 : 0) | (o(x + 1, y) ? 8 : 0);
  }
  const isSolidChar = c => c === '#' || c === 'i' || c === 'b';

  function drawTiles(L, cx, cy, theme, t) {
    const x0 = Math.floor(cx / TS), x1 = Math.floor((cx + W) / TS), y0 = Math.floor(cy / TS), y1 = Math.floor((cy + H) / TS);
    for (let y = Math.max(0, y0); y <= Math.min(L.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(L.w - 1, x1); x++) {
      const c = L.t[y * L.w + x]; if (c === '.') continue;
      const px = x * TS - cx, py = y * TS - cy;
      if (c === '#' || c === 'i' || c === 'b') {
        const idx = y * L.w + x;
        if (c === 'b' && L.gone[idx] > 0) continue;
        let ox = 0; if (c === 'b' && G.crumble[idx]) ox = (Math.floor(t / 2) % 2) ? 1 : -1;
        ctx.drawImage(Art.tileImg(theme, c, tileMask(L, x, y), (x * 7 + y * 13) % 2), px + ox, py);
      } else if (c === '^') ctx.drawImage(Art.spikeUp, px, py);
      else if (c === 'v') ctx.drawImage(Art.spikeDown, px, py);
      else if (c === 'O') Art.drawOrb(ctx, px, py, t, 1);
    }
  }
  function drawFlipped(img, x, y, up) {
    if (!up) { ctx.drawImage(img, x, y); return; }
    ctx.save(); ctx.translate(0, y * 2 + img.height); ctx.scale(1, -1); ctx.drawImage(img, x, y); ctx.restore();
  }

  function drawEntities(cx, cy, t) {
    const L = G.L;
    // checkpoints
    G.cps.forEach(c => {
      const x = c.x - cx, y = c.y - cy; if (x < -20 || x > W + 20) return;
      const img = c.on ? Art.lantOn : Art.lantOff, sway = c.on ? Math.round(Math.sin(t / 14)) : 0;
      if (c.on) { Art.fillCircle(ctx, x + 8, y + 8, 12, 'rgba(255,226,122,0.22)'); }
      ctx.drawImage(img, x + 2 + sway, y);
    });
    // exit
    if (L.exit) { Art.drawTorii(ctx, L.exit.x - cx, L.exit.y - cy, t, L.solid(L.exit.tx, L.exit.ty - 1) && !L.solid(L.exit.tx, L.exit.ty + 1)); }
    // signs
    G.signs.forEach(s => { const x = s.x - cx, y = s.y - cy; if (x > -20 && x < W + 20) drawFlipped(Art.signImg, x, s.up ? y : y + 6, s.up); });
    // items
    G.items.forEach(it => {
      if (it.got) return; const x = it.x - cx, y = it.y - cy; if (x < -20 || x > W + 20) return;
      if (it.k === 'coin') Art.drawCoin(ctx, x, y, t + it.x);
      else if (it.k === 'petal') Art.drawPetal(ctx, x, y, t);
      else { const b = Math.round(Math.sin(t / 10 + it.x) * 1.5); ctx.drawImage(Art.heart, x + 2, y + 3 + b); }
    });
    // statues
    G.shooters.forEach(s => {
      const x = s.x - cx, y = s.y - cy; if (x < -20 || x > W + 20) return;
      const img = s.dir > 0 ? Art.fox : foxL;
      drawFlipped(img, x, y, s.up);
      if (s.flash > 0) { ctx.fillStyle = '#ffa030'; ctx.fillRect(x + 8 + s.dir * 7, y + (s.up ? 8 : 7), 2, 2); }
    });
    // oni
    G.oni.forEach(o => {
      const x = Math.round(o.x - cx) - 2, y = Math.round(o.y - cy) - (o.g > 0 ? 4 : 0);
      if (x < -20 || x > W + 20) return;
      let img = Art.oni[Math.floor(o.anim / 10) % 2]; if (o.dir > 0) img = oniFlip(img, Math.floor(o.anim / 10) % 2);
      drawFlipped(img, x, y, o.g < 0);
    });
    // ghosts
    G.ghosts.forEach(o => {
      const x = Math.round(o.x - cx) - 8, y = Math.round(o.y - cy) - 8; if (x < -20 || x > W + 20) return;
      ctx.globalAlpha = 0.88; let img = Art.ghost[Math.floor(t / 14) % 2];
      if (G.P.x > o.x) img = ghostFlip(img, Math.floor(t / 14) % 2);
      ctx.drawImage(img, x, y); ctx.globalAlpha = 1;
      Art.fillCircle(ctx, x + 8, y + 8, 11, 'rgba(120,224,255,0.12)');
    });
    // boss
    const B = G.boss; if (B && !B.gone) drawBoss(B, cx, cy, t);
    // fireballs
    G.balls.forEach(b => Art.drawFireball(ctx, Math.round(b.x - cx), Math.round(b.y - cy), t, Math.sign(b.vx) || 1));
    G.shots.forEach(s => Art.drawShot(ctx, Math.round(s.x - cx) + 0, Math.round(s.y - cy), t));
  }
  const foxL = Art.flip(Art.fox, true, false);
  const flipCache = new Map();
  function oniFlip(img, i) { const k = 'o' + i; if (!flipCache.has(k)) flipCache.set(k, Art.flip(img, true, false)); return flipCache.get(k); }
  function ghostFlip(img, i) { const k = 'g' + i; if (!flipCache.has(k)) flipCache.set(k, Art.flip(img, true, false)); return flipCache.get(k); }
  let bossFlash = null;
  function drawBoss(B, cx, cy, t) {
    const x = Math.round(B.x - cx), y = Math.round(B.y - cy);
    let img = Art.boss;
    if (B.flash > 0 && B.flash % 4 < 2) { bossFlash = bossFlash || Art.tint(Art.boss, '#ffffff'); img = bossFlash; }
    ctx.save();
    if (B.dying > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4), 0);
    Art.fillCircle(ctx, x, y, 30 + Math.round(Math.sin(t / 8) * 2), 'rgba(255,120,120,0.16)');
    ctx.drawImage(img, 0, 0, img.width, img.height, x - img.width, y - img.height, img.width * 2, img.height * 2);
    ctx.restore();
    if (!B.active) { Art.text(ctx, 'ZZZ', x + 22, y - 36 + Math.round(Math.sin(t / 10) * 2), '#ffffff', 1, INK); }
  }

  function drawPlayer(cx, cy) {
    const P = G.P; if (G.state === 'dead') return;
    if (P.inv > 0 && Math.floor(P.inv / 3) % 2 === 0 && G.state === 'play' && P.hurt === 0) { /* blink: skip every other */ if (P.inv > 6) return; }
    const fy = P.g > 0 ? P.y + P.h : P.y, ccx = P.x + P.w / 2;
    // tails behind
    const tailCols = [['#ff8cc3', '#d8559c'], ['#ffa6d2', '#d8559c']];
    G.tails.forEach((pts, ti) => {
      for (let pass = 0; pass < 2; pass++) for (let i = pts.length - 1; i >= 0; i--) {
        const sz = [3, 3, 3, 2, 2][i], px = Math.round(pts[i].x - cx), py = Math.round(pts[i].y - cy);
        if (pass === 0) { ctx.fillStyle = INK; ctx.fillRect(px - 2 + (sz < 3 ? 1 : 0), py - 2 + (sz < 3 ? 1 : 0), sz + 2, sz + 2); }
        else { ctx.fillStyle = tailCols[ti][i % 2]; ctx.fillRect(px - 1 + (sz < 3 ? 1 : 0), py - 1 + (sz < 3 ? 1 : 0), sz, sz); }
      }
    });
    // body sprite
    let img;
    if (P.hurt > 0) img = Art.hana.hurt;
    else if (!P.ground) img = Art.hana.air;
    else if (Math.abs(P.vx) > 0.3) img = Art.hana.walk[Math.floor(P.anim / 6) % 4];
    else img = P.blink < 0 ? Art.hana.blink : Art.hana.idle;
    let dw = 16, dh = 16;
    if (P.sq > 0) { const k = P.sq / 9; if (P.sqKind === 'stretch') { dw = Math.round(16 - 3 * k); dh = Math.round(16 + 4 * k); } else { dw = Math.round(16 + 3 * k); dh = Math.round(16 - 3 * k); } }
    const bob = (P.ground && Math.abs(P.vx) > 0.3 && Math.floor(P.anim / 6) % 2 === 1) ? 1 : 0;
    ctx.save();
    ctx.translate(Math.round(ccx - cx), Math.round(fy - cy) - P.g * bob);
    ctx.scale(P.face, P.g > 0 ? 1 : -1);
    ctx.drawImage(img, -Math.round(dw / 2), -dh, dw, dh);
    ctx.restore();
    // ribbons (bows) on tails anchor
    G.tails.forEach((pts, ti) => { const px = Math.round(pts[0].x - cx), py = Math.round(pts[0].y - cy); ctx.fillStyle = INK; ctx.fillRect(px - 2, py - 2, 5, 4); ctx.fillStyle = '#ec3a56'; ctx.fillRect(px - 1, py - 1, 3, 2); ctx.fillStyle = '#ffd23f'; ctx.fillRect(px, py - 1, 1, 1); });
  }

  function drawFxWorld(cx, cy) {
    G.rings.forEach(r => { ctx.globalAlpha = 1 - r.r / r.max; Art.pixelCircle(ctx, Math.round(r.x - cx), Math.round(r.y - cy), Math.round(r.r), r.color); ctx.globalAlpha = 1; });
    G.parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.life / (p.max * 0.5)); ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.size, p.size); });
    ctx.globalAlpha = 1;
  }

  function drawAmbient(theme, camX, t) {
    G.amb.forEach(p => {
      let x, y;
      switch (theme) {
        case 0: p.x -= 0.45 * p.z; p.y += 0.3 * p.z + Math.sin(t / 30 + p.ph) * 0.1; x = p.x - camX * p.z * 0.5; y = p.y;
          ctx.fillStyle = p.s > 0.5 ? '#ffb0d0' : '#ffe0ee'; break;
        case 1: p.x += Math.sin(t / 60 + p.ph) * 0.2; p.y += Math.cos(t / 50 + p.ph) * 0.15; x = p.x - camX * p.z * 0.4; y = p.y;
          ctx.fillStyle = Math.sin(t / 20 + p.ph * 3) > 0 ? '#fff6a0' : 'rgba(255,246,160,0.2)'; break;
        case 2: p.y -= 0.25 * p.z; p.x += Math.sin(t / 25 + p.ph) * 0.2; x = p.x - camX * p.z * 0.4; y = p.y;
          ctx.fillStyle = p.s > 0.5 ? '#ffb060' : '#ff6a50'; break;
        case 3: p.x -= 0.35 * p.z; p.y += 0.6 * p.z; x = p.x - camX * p.z * 0.5; y = p.y; ctx.fillStyle = '#ffffff'; break;
        default: p.y -= 0.1 * p.z; p.x -= 0.25 * p.z; x = p.x - camX * p.z * 0.5; y = p.y;
          ctx.fillStyle = Math.sin(t / 14 + p.ph * 3) > 0.2 ? '#fff0b0' : '#ffb0d0';
      }
      x = ((x % W) + W) % W; y = ((y % H) + H) % H; if (p.y > H * 4 || p.y < -H * 4) p.y = ((p.y % H) + H) % H;
      ctx.fillRect(Math.floor(x), Math.floor(y), theme === 3 && p.z < 0.7 ? 1 : 2, theme === 0 ? 1 : (theme === 3 ? 2 : 1));
    });
  }

  function drawWorld() {
    const L = G.L, theme = L.theme, t = G.t;
    let sx = 0, sy = 0; if (G.shake > 0) { sx = Math.round((Math.random() - 0.5) * G.shake * 1.5); sy = Math.round((Math.random() - 0.5) * G.shake * 1.5); }
    const cx = Math.round(G.cam.x) + sx, cy = Math.round(G.cam.y) + sy;
    Art.drawBG(ctx, theme, cx, cy, t);
    // fireworks in the sky (night level)
    if (theme === 2 && G.state === 'play' && Math.random() < 0.008) fireworkAt(30 + Math.random() * 260, 15 + Math.random() * 60);
    G.fw = G.fw.filter(f => { f.x += f.vx; f.y += f.vy; f.vy += 0.025; f.vx *= 0.985; ctx.fillStyle = f.c; ctx.globalAlpha = Math.min(1, f.life / 20); ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); ctx.globalAlpha = 1; return --f.life > 0; });
    drawTiles(L, cx, cy, theme, t);
    drawEntities(cx, cy, t);
    drawPlayer(cx, cy);
    drawFxWorld(cx, cy);
    drawAmbient(theme, cx, t);
    if (G.warn > 0 && Math.floor(G.warn / 4) % 2 === 0) { ctx.fillStyle = 'rgba(255,60,120,0.18)'; ctx.fillRect(0, 0, W, H); Art.text(ctx, 'GRAVITY WARP!', W / 2, 56, '#ffffff', 2, '#a31f40', 'center'); }
    if (G.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (G.flash / 10) + ')'; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- HUD ----------
  function box(x, y, w, h, fill, border) {
    ctx.fillStyle = border || '#ffffff'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = fill || 'rgba(42,24,56,0.92)'; ctx.fillRect(x, y, w, h);
  }
  function drawHUD() {
    for (let i = 0; i < MAXH(); i++) { if (i < Math.max(G.hearts, 3) || i < G.hearts) ctx.drawImage(i < G.hearts ? Art.heart : Art.heartEmpty, 5 + i * 12, 5); }
    Art.drawCoin(ctx, 1, 14, 0); Art.text(ctx, 'X' + G.coins, 14, 20, '#ffffff', 1, INK);
    // petals
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = i < G.petals ? 1 : 0.35; Art.drawPetal(ctx, W - 54 + i * 17 - 1, 0, 0); } ctx.globalAlpha = 1;
    const secs = Math.floor(G.time / 60);
    Art.text(ctx, String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0'), W - 6, 20, '#ffffff', 1, INK, 'right');
    // gravity indicator
    const P = G.P, up = P.g < 0;
    ctx.fillStyle = INK; ctx.fillRect(W / 2 - 9, 3, 18, 9); ctx.fillStyle = up ? '#ff8cc3' : '#74deff';
    if (up) { ctx.fillRect(W / 2 - 1, 4, 3, 1); ctx.fillRect(W / 2 - 3, 5, 7, 1); ctx.fillRect(W / 2 - 5, 6, 11, 1); ctx.fillRect(W / 2 - 1, 7, 3, 4); }
    else { ctx.fillRect(W / 2 - 1, 4, 3, 4); ctx.fillRect(W / 2 - 5, 8, 11, 1); ctx.fillRect(W / 2 - 3, 9, 7, 1); ctx.fillRect(W / 2 - 1, 10, 3, 1); }
    // boss bar
    const B = G.boss;
    if (B && B.active && !B.gone) {
      const bw = 120, bx = (W - bw) / 2, by = 24;
      box(bx, by, bw, 6, INK, '#ffffff'); ctx.fillStyle = '#ec3a56'; ctx.fillRect(bx, by, Math.round(bw * Math.max(0, B.hp) / B.max), 6);
      ctx.fillStyle = '#ff8c8c'; ctx.fillRect(bx, by, Math.round(bw * Math.max(0, B.hp) / B.max), 1);
      Art.text(ctx, 'ONI KING', W / 2, by + 9, '#ffffff', 1, INK, 'center');
    }
    // hint bubble
    if (G.hint) { const w = G.hint.length * 6 + 10; box(Math.round((W - w) / 2), 30, w, 13, 'rgba(42,24,56,0.9)', '#ff8cc3'); Art.text(ctx, G.hint, W / 2, 33, '#ffffff', 1, null, 'center'); }
  }
  function drawIntroCard() {
    const t = G.introT, L = G.L;
    if (G.state !== 'play' && G.state !== 'intro') return;
    const age = G.time; if (age > 150) return;
    const a = age < 20 ? age / 20 : age > 110 ? 1 - (age - 110) / 40 : 1;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(42,24,56,0.7)'; ctx.fillRect(0, 62, W, 56);
    ctx.fillStyle = '#ff8cc3'; ctx.fillRect(0, 62, W, 1); ctx.fillRect(0, 117, W, 1);
    Art.text(ctx, L.sub, W / 2, 68, '#ffd23f', 1, INK, 'center');
    Art.jp(ctx, L.kana, W / 2, 80, '#ffffff', 16, INK, 'center');
    Art.text(ctx, L.name, W / 2, 104, '#ff8cc3', 1, INK, 'center');
    ctx.globalAlpha = 1;
  }

  // ---------- screens ----------
  function screenTitle() {
    Art.drawBG(ctx, 0, G.t * 0.6, 0, G.t);
    G.fw = G.fw.filter(f => { f.x += f.vx; f.y += f.vy; f.vy += 0.02; f.vx *= 0.985; ctx.fillStyle = f.c; ctx.globalAlpha = Math.min(1, f.life / 20); ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); ctx.globalAlpha = 1; return --f.life > 0; });
    // floor + ceiling strips
    for (let x = 0; x < W; x += 16) { ctx.drawImage(Art.tileImg(0, '#', 1, (x / 16) % 2), x, 170); ctx.drawImage(Art.tileImg(0, '#', 2, (x / 16) % 2), x, -6); }
    // demo hero
    const P = titleP; if (P) {
      const fy = P.g > 0 ? P.y + P.h : P.y, px = Math.round(P.x - G.t * 0.0) % W;
      const camx = P.x - 80;
      ctx.save(); ctx.translate(Math.round(P.x - camx), Math.round(fy) - 6); ctx.scale(P.face, P.g > 0 ? 1 : -1);
      const img = P.ground ? Art.hana.walk[Math.floor(G.t / 6) % 4] : Art.hana.air; ctx.drawImage(img, -8, -16); ctx.restore();
    }
    // title
    const bob = Math.round(Math.sin(G.t / 30) * 2);
    Art.jp(ctx, 'ぐらびてぃ さくら', W / 2, 30 + bob, '#ffffff', 22, '#a83a7c', 'center');
    Art.text(ctx, 'GRAVITY SAKURA', W / 2, 62 + bob, '#ff8cc3', 2, INK, 'center');
    Art.text(ctx, 'A GRAVITY-FLIPPING ADVENTURE', W / 2, 82, '#ffd23f', 1, INK, 'center');
    if (Math.floor(G.t / 30) % 2 === 0) Art.text(ctx, 'PRESS ENTER', W / 2, 98, '#ffffff', 2, INK, 'center');
    box(24, 122, W - 48, 26, 'rgba(42,24,56,0.8)', '#ff8cc3');
    Art.text(ctx, 'ARROWS/AD: MOVE   SPACE/Z/W: FLIP GRAVITY', W / 2, 128, '#ffffff', 1, null, 'center');
    Art.text(ctx, 'X: SAKURA SHOT   P: PAUSE   M: MUTE   V: CRT', W / 2, 138, '#ffc4e2', 1, null, 'center');
    drawFxWorld(0, 0); drawAmbientTitle();
  }
  function drawAmbientTitle() { if (!G.amb.length) { const r = Art.rng(3); for (let k = 0; k < 46; k++) G.amb.push({ x: r() * W * 2, y: r() * H, z: 0.3 + r() * 0.9, ph: r() * 6.28, s: r() }); } drawAmbient(0, G.t, G.t); }

  function screenStory() {
    ctx.fillStyle = '#160e2a'; ctx.fillRect(0, 0, W, H);
    Art.drawBG(ctx, 2, G.t * 0.2, 0, G.t); ctx.fillStyle = 'rgba(22,14,42,0.72)'; ctx.fillRect(0, 0, W, H);
    const s = STORY[G.storyPage] || '', n = Math.min(s.length, Math.floor(G.storyT / 2));
    const words = s.slice(0, n).split(' '), lines = []; let cur = '';
    // wrap using the full text so lines do not jump while typing
    const fullWords = s.split(' '), fullLines = []; cur = '';
    fullWords.forEach(w => { if ((cur + ' ' + w).trim().length > 40) { fullLines.push(cur.trim()); cur = w; } else cur += ' ' + w; }); fullLines.push(cur.trim());
    let left = n, y = 62;
    fullLines.forEach(l => { const show = l.slice(0, Math.max(0, left)); left -= l.length + 1; Art.text(ctx, show, W / 2 - 120, y, '#ffffff', 1, INK); y += 14; });
    // Hana portrait
    ctx.save(); ctx.translate(W / 2, 40); ctx.scale(2, 2); ctx.drawImage(Art.hana.idle, -8, -16); ctx.restore();
    Art.text(ctx, (G.storyPage + 1) + '/' + STORY.length, W - 10, H - 12, '#9a8ab8', 1, null, 'right');
    if (Math.floor(G.t / 25) % 2 === 0) Art.text(ctx, 'ENTER: NEXT   ESC: SKIP', W / 2, H - 14, '#ffd23f', 1, INK, 'center');
  }

  const RANKCOL = { S: '#ffd23f', A: '#ff8cc3', B: '#74deff', C: '#b8b0d0' };
  function screenSelect() {
    Art.drawBG(ctx, G.sel, G.t * 0.8, 0, G.t);
    ctx.fillStyle = 'rgba(42,24,56,0.55)'; ctx.fillRect(0, 0, W, H);
    Art.text(ctx, 'SELECT STAGE', W / 2, 10, '#ffffff', 2, INK, 'center');
    const cw = 54, gap = 6, x0 = Math.round((W - (cw * 5 + gap * 4)) / 2);
    for (let i = 0; i < LEVELS.length; i++) {
      const x = x0 + i * (cw + gap), y = 36, sel = i === G.sel, lock = i >= save.unlocked, lv = LEVELS[i];
      const yy = y - (sel ? 3 : 0);
      box(x, yy, cw, 62, lock ? '#3a3050' : 'rgba(42,24,56,0.95)', sel ? '#ffd23f' : '#9a8ab8');
      if (!lock) {
        // mini preview: theme tiles + sky
        ctx.save(); ctx.beginPath(); ctx.rect(x + 3, yy + 3, cw - 6, 30); ctx.clip();
        Art.drawBG(ctx.canvas === cv ? ctx : ctx, lv.theme, 0, 0, 0);
        ctx.restore();
        ctx.fillStyle = INK; ctx.fillRect(x + 3, yy + 33, cw - 6, 1);
      }
      // we drew the full background; repaint card chrome over to keep it tidy
      box(x, yy + 36, cw, 26, lock ? '#3a3050' : 'rgba(42,24,56,0.97)', sel ? '#ffd23f' : '#9a8ab8');
      Art.text(ctx, String(i + 1), x + cw / 2, yy + 40, lock ? '#6a5a88' : '#ffffff', 2, null, 'center');
      if (lock) Art.text(ctx, 'LOCKED', x + cw / 2, yy + 54, '#6a5a88', 1, null, 'center');
      else { const b = save.best[i]; if (b) Art.text(ctx, 'RANK ' + b.rank, x + cw / 2, yy + 54, RANKCOL[b.rank], 1, null, 'center'); else Art.text(ctx, 'NEW', x + cw / 2, yy + 54, '#ff8cc3', 1, null, 'center'); }
    }
    const lv = LEVELS[G.sel];
    box(30, 108, W - 60, 46, 'rgba(42,24,56,0.92)', '#ff8cc3');
    Art.jp(ctx, lv.kana, W / 2, 112, '#ffffff', 16, INK, 'center');
    Art.text(ctx, lv.name, W / 2, 134, '#ff8cc3', 1, null, 'center');
    const b = save.best[G.sel];
    Art.text(ctx, b ? 'BEST: ' + b.rank + '  COINS ' + b.coins + '  PETALS ' + b.petals + '/3' : 'NOT CLEARED YET', W / 2, 144, '#ffd23f', 1, null, 'center');
    Art.text(ctx, '< > CHOOSE   ENTER: PLAY   ESC: BACK', W / 2, H - 14, '#ffffff', 1, INK, 'center');
    drawAmbient(G.sel, G.t, G.t);
  }

  function screenClear() {
    drawWorld();
    ctx.fillStyle = 'rgba(42,24,56,0.78)'; ctx.fillRect(0, 0, W, H);
    const r = G.result, t = G.t;
    Art.jp(ctx, 'クリア！', W / 2, 12, '#ffd23f', 22, INK, 'center');
    Art.text(ctx, 'STAGE CLEAR', W / 2, 42, '#ffffff', 2, INK, 'center');
    box(70, 62, W - 140, 66, 'rgba(22,14,42,0.9)', '#ff8cc3');
    const rows = [['COINS', r.coins + '/' + r.totalCoins], ['PETALS', r.petals + '/3'], ['TIME', fmtTime(r.time)], ['DEATHS', String(r.deaths)], ['SCORE', String(r.score)]];
    rows.forEach((row, i) => { if (t > 12 + i * 10) { Art.text(ctx, row[0], 82, 68 + i * 11, '#ffc4e2', 1, null); Art.text(ctx, row[1], W - 82, 68 + i * 11, '#ffffff', 1, null, 'right'); } });
    if (t > 70) { const sc = t < 80 ? 4 : 3; Art.text(ctx, r.rank, W / 2, 134, RANKCOL[r.rank], sc, INK, 'center'); }
    if (t > 80 && Math.floor(t / 25) % 2 === 0) Art.text(ctx, 'PRESS ENTER', W / 2, H - 12, '#ffffff', 1, INK, 'center');
  }
  const fmtTime = f => { const s = Math.floor(f / 60); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  function screenEnding() {
    Art.drawBG(ctx, 4, G.t * 0.7, 0, G.t);
    G.fw = G.fw.filter(f => { f.x += f.vx; f.y += f.vy; f.vy += 0.02; f.vx *= 0.985; ctx.fillStyle = f.c; ctx.globalAlpha = Math.min(1, f.life / 20); ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); ctx.globalAlpha = 1; return --f.life > 0; });
    ctx.fillStyle = 'rgba(42,24,56,0.4)'; ctx.fillRect(0, 0, W, H);
    Art.jp(ctx, 'ありがとう', W / 2, 20, '#ffffff', 26, '#a83a7c', 'center');
    Art.text(ctx, 'THE SKY IS BALANCED AGAIN!', W / 2, 62, '#ffd23f', 1, INK, 'center');
    Art.text(ctx, 'THANK YOU FOR PLAYING, HANA!', W / 2, 74, '#ffffff', 1, INK, 'center');
    let petals = 0, coins = 0; Object.keys(save.best).forEach(k => { petals += save.best[k].petals; coins += save.best[k].coins; });
    Art.text(ctx, 'TOTAL PETALS ' + petals + '/15   COINS ' + coins, W / 2, 90, '#ff8cc3', 1, INK, 'center');
    ctx.save(); ctx.translate(W / 2, 140 + Math.round(Math.sin(G.t / 20) * 3)); ctx.scale(3, 3); ctx.drawImage(Art.hana.idle, -8, -16); ctx.restore();
    for (let x = 0; x < W; x += 16) ctx.drawImage(Art.tileImg(4, '#', 1, (x / 16) % 2), x, H - 16);
    drawFxWorld(0, 0); drawAmbient(4, G.t, G.t);
    if (G.t > 120 && Math.floor(G.t / 25) % 2 === 0) Art.text(ctx, 'PRESS ENTER', W / 2, 160, '#ffffff', 1, INK, 'center');
  }

  function render() {
    ctx.imageSmoothingEnabled = false;
    switch (G.state) {
      case 'title': screenTitle(); break;
      case 'story': screenStory(); break;
      case 'select': screenSelect(); break;
      case 'intro': case 'play': drawWorld(); drawHUD(); drawIntroCard(); break;
      case 'pause': drawWorld(); drawHUD(); ctx.fillStyle = 'rgba(42,24,56,0.7)'; ctx.fillRect(0, 0, W, H);
        Art.text(ctx, 'PAUSED', W / 2, 56, '#ffffff', 3, INK, 'center');
        Art.text(ctx, 'ENTER: RESUME', W / 2, 92, '#ffd23f', 1, INK, 'center'); Art.text(ctx, 'R: RESTART STAGE', W / 2, 104, '#ffffff', 1, INK, 'center'); Art.text(ctx, 'Q: STAGE SELECT', W / 2, 116, '#ffffff', 1, INK, 'center'); break;
      case 'dead': drawWorld(); drawHUD(); break;
      case 'gameover': drawWorld(); ctx.fillStyle = 'rgba(42,24,56,0.8)'; ctx.fillRect(0, 0, W, H);
        Art.text(ctx, 'GAME OVER', W / 2, 56, '#ec3a56', 3, INK, 'center');
        Art.jp(ctx, 'もういちど？', W / 2, 88, '#ffffff', 14, INK, 'center');
        if (Math.floor(G.t / 25) % 2 === 0) Art.text(ctx, 'ENTER: TRY AGAIN', W / 2, 114, '#ffd23f', 1, INK, 'center');
        Art.text(ctx, 'ESC: STAGE SELECT', W / 2, 126, '#ffffff', 1, INK, 'center'); break;
      case 'clear': screenClear(); break;
      case 'ending': screenEnding(); break;
    }
  }

  // ---------- main loop & scaling ----------
  function resize() {
    const sw = window.innerWidth, sh = window.innerHeight;
    let s = Math.min(sw / W, sh / H); if (s >= 2) s = Math.floor(s);
    cv.style.width = Math.floor(W * s) + 'px'; cv.style.height = Math.floor(H * s) + 'px';
    document.documentElement.style.setProperty('--px', s + 'px');
  }
  window.addEventListener('resize', resize); resize();
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(100, now - last); last = now;
    while (acc >= 1000 / 60) { poll(); update(); acc -= 1000 / 60; }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // debug jumps: index.html#L3 (stage 3), #select, #story, #clear, #end, #pause
  (function () {
    const h = location.hash.slice(1); if (!h) return;
    const m = /^L(\d)$/.exec(h);
    if (m) { save.unlocked = 5; setupLevel(+m[1] - 1); G.state = 'play'; }
    else if (h === 'select') { save.unlocked = 5; G.sel = 2; setState('select'); }
    else if (h === 'story') setState('story');
    else if (h === 'end') setState('ending');
    else if (h === 'clear') { setupLevel(0); G.state = 'play'; G.coins = 12; G.petals = 2; G.time = 2400; levelClear(); }
  })();
  window.__G = G; window.__held = held; // debugging hooks
  window.__game = { G, setupLevel, keys, save };
})();
