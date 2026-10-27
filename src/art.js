// art.js — all pixel art is generated here: sprites from string grids, tiles, parallax backgrounds, fonts.
(function (root) {
  const W = 320, H = 180;

  // ---------- helpers ----------
  function canvas(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c;
  }
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  const BASE = {
    k: '#2a1838', K: '#4a3a62', w: '#ffffff', W: '#f6eef6',
    p: '#ff8cc3', P: '#d8559c', q: '#ffc4e2', Q: '#a83a7c',
    s: '#ffe0cc', S: '#f0b49c', b: '#ff9db4',
    e: '#3b2a90', E: '#74deff',
    i: '#4a54cc', I: '#2e3590', r: '#ec3a56', R: '#a31f40',
    y: '#ffd23f', Y: '#d99a1a', o: '#ff8c3a', O: '#c85a1c',
    n: '#9aa0b8', N: '#6a708c',
  };
  function sprite(rows, pal) {
    const p = Object.assign({}, BASE, pal || {});
    const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
    const c = canvas(w, h), x = c.getContext('2d');
    rows.forEach((r, j) => {
      if (r.length !== w) console.warn('sprite row width', r.length, 'vs', w, 'row', j, r);
      for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch !== '.' && ch !== ' ' && p[ch]) { x.fillStyle = p[ch]; x.fillRect(i, j, 1, 1); } }
    });
    return c;
  }
  function mirrorRows(half) { return half.map(r => r + r.split('').reverse().join('')); }
  function flip(c, hz, vt) {
    const o = canvas(c.width, c.height), x = o.getContext('2d');
    x.translate(hz ? c.width : 0, vt ? c.height : 0); x.scale(hz ? -1 : 1, vt ? -1 : 1);
    x.drawImage(c, 0, 0); return o;
  }
  // white silhouette (hit flash)
  function tint(c, color) {
    const o = canvas(c.width, c.height), x = o.getContext('2d');
    x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return o;
  }

  // ---------- Hana (heroine) ----------
  const F = s => '.k' + s + 'k.';
  const HEAD_OPEN = [
    '....kkkkkkkk....',
    '..kkppppppppkk..',
    F('ppqqpppppppp'),
    F('pqqpppppppPp'),
    F('ppppPpppPppP'),
    F('pPpsPpsPpsPp'),
    F('pskkksskkksp'),
    F('psweessweesp'),
    F('pbeEesseEebp'),
    F('pssssRRssssp'),
    '...kpSssssSpk...',
  ];
  const HEAD_BLINK = HEAD_OPEN.slice();
  HEAD_BLINK[6] = F('psssssssssssp'.slice(0, 12));
  HEAD_BLINK[7] = F('pskkksskkksp');
  HEAD_BLINK[8] = F('pbsssssssssbp'.slice(0, 12));
  const HEAD_HURT = HEAD_OPEN.slice();
  HEAD_HURT[6] = F('psksksskskssp'.slice(0, 12));
  HEAD_HURT[7] = F('pssksssskssp');
  HEAD_HURT[8] = F('psksksskskssp'.slice(0, 12));
  HEAD_HURT[9] = F('pssssRRssssp');
  const BODY = {
    idle: ['...kWiiiiiiWk...', '.kkiqiiiiqiikk.', '.kIIrrrrrrrrIIk.'.slice(0, 16), '...kiiqiiiiik...', '...kWWk..kWWk...'],
    a: ['...kWiiiiiiWk...', '.kkiqiiiiqiikk.', '.kIIrrrrrrrrIIk.'.slice(0, 16), '...kiiqiiiiik...', '..kWWk....kWWk..'],
    b: ['...kWiiiiiiWk...', '.kkiqiiiiqiikk.', '.kIIrrrrrrrrIIk.'.slice(0, 16), '...kiiqiiiiik...', '....kWWkkWWk....'],
    air: ['.kkkWiiiiiiWkkk.', '..kiqiiiiiqiik..', '..kIIrrrrrrIIk..', '...kiiiqiiiik...', '....kWWkkWWk....'],
  };
  // fix widths (some rows above were hand-typed); pad/trim to 16
  Object.keys(BODY).forEach(k => { BODY[k] = BODY[k].map(r => (r + '................').slice(0, 16)); });
  function hanaFrame(head, body) { return sprite(head.concat(body)); }
  const hana = {
    idle: hanaFrame(HEAD_OPEN, BODY.idle),
    blink: hanaFrame(HEAD_BLINK, BODY.idle),
    walk: [hanaFrame(HEAD_OPEN, BODY.a), hanaFrame(HEAD_OPEN, BODY.idle), hanaFrame(HEAD_OPEN, BODY.b), hanaFrame(HEAD_OPEN, BODY.idle)],
    air: hanaFrame(HEAD_OPEN, BODY.air),
    hurt: hanaFrame(HEAD_HURT, BODY.air),
  };

  // ---------- enemies ----------
  const ONI_PAL = { R: '#ee4a52', D: '#b02a3c', y: '#ffd23f', O: '#ff9a2e', w: '#ffffff' };
  const oniA = [
    '...yy......yy...',
    '...yyk....kyy...',
    '....kkkkkkkk....',
    '...kRRRRRRRRk...',
    '..kRkkRRRRkkRk..',
    '..kRwkRRRRkwRk..',
    '..kRRRRDDRRRRk..',
    '..kRRwRRRRwRRk..',
    '...kRRkwwkRRk...',
    '...kkRRRRRRkk...',
    '..kRRkOkOkOkRRk.'.slice(0, 16),
    '.kRRkOkOkOkkRRk.',
    '..kk.kOOOOk.kk..',
    '....kOkOOkOk....',
    '...kRRk..kRRk...',
    '..kkkkk..kkkkk..',
  ];
  const oniB = oniA.slice(); oniB[14] = '....kRRkkRRk....'; oniB[15] = '....kkkkkkkk....';
  const oni = [sprite(oniA, ONI_PAL), sprite(oniB, ONI_PAL)];

  const GH = { w: '#eaf6ff', b: '#a8c8ec', B: '#6fa0d8', a: '#7fe0ff' };
  const ghostA = [
    '.....kkkkkk.....',
    '...kkwwwwwwkk...',
    '..kwwwwwwwwwwk..',
    '..kwwwwwwwwwwk..',
    '.kwwkkwwwwkkwwk.',
    '.kwwkBwwwwkBwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwkkwwwwwk.',
    '.kwwwwkwwkwwwwk.',
    '.kwwwwwkkwwwwwk.',
    '..kwwwwwwwwwwk..',
    '..kbwwbwwwwbwk..',
    '...kwwkwwkwwk...',
    '...kwk.kwk.kwk..',
    '....k...k...k...',
    '................',
  ];
  const ghostB = ghostA.slice();
  ghostB[11] = '..kbwwwwbwwwbk..'.slice(0, 16); ghostB[12] = '...kwkwwkwkwk...'; ghostB[13] = '...k.kwk.kwk.k..'; ghostB[14] = '.....k...k......';
  const ghost = [sprite(ghostA, GH), sprite(ghostB, GH)];

  const foxA = [
    '..k.........k...',
    '.knk.......knk..',
    '.knnk.....knnk..',
    '.knnnk...knnnk..',
    '.knnnnkkknnnnk..',
    '..knnnnnnnnnk...',
    '..kn.knnnk.nk...',   // eyes
    '..knnnnkknnnk...',
    '...knnnnnnnk....',
    '...kknrrrrkk....',   // scarf
    '..kNnnrrrrnnNk..',
    '..kNnnnrrnnnNk..',
    '.kNNnnnnnnnnNNk.',
    '.kNNNNNNNNNNNNk.',
    '.kkkkkkkkkkkkkk.',
    '................',
  ].map(r => (r + '................').slice(0, 16));
  const fox = sprite(foxA, { r: '#ec3a56', n: '#b8bcd0', N: '#7a80a0' });

  // boss: oni mask, half mirrored (12 -> 24 wide), drawn at 2x
  const bossHalf = [
    '...yy...kkkk',
    '..yyyk.kkkkk',
    '..yykkkkkkkk',
    '..kkRRRRRRkk',
    '.kRRRRRRRRRR',
    '.kRDDRRRRRRR',
    '.kRRDDkkRRRR',
    '.kRRwwkYkRRR',
    '.kRRwkkkkRRR',
    '.kRRRRDDRRRR',
    '.kRDRRRDDRRR',
    '.kRDRRRRDDRR',
    '..kRRRRRRRDD',
    '..kRRkwwwwwk',
    '..kkRkwkkkkk',
    '...kRkwkwwww',
    '...kRkwwwkwk',
    '....kkkwwkkk',
    '.....kRRkkkR',
    '......kkRRRR',
    '.......kkkkk',
  ].map(r => (r + '............').slice(0, 12));
  const bossRows = mirrorRows(bossHalf);
  const boss = sprite(bossRows, { R: '#e8404e', D: '#a82040', Y: '#ffe050', y: '#ffd23f', w: '#fff4e0' });

  // ---------- props ----------
  const heart = sprite([
    '..kkk.kkk..', '.krrrkrrrk.', 'krrwrrrrrrk', 'krrrrrrrrrk', 'krrrrrrrrrk',
    '.krrrrrrrk.', '..krrrrrk..', '...krrrk...', '....krk....', '.....k.....',
  ]);
  const heartEmpty = sprite([
    '..kkk.kkk..', '.kKKKkKKKk.', 'kKKKKKKKKKk', 'kKKKKKKKKKk', 'kKKKKKKKKKk',
    '.kKKKKKKKk.', '..kKKKKKk..', '...kKKKk...', '....kKk....', '.....k.....',
  ]);
  const LANT = [
    '....kkkk....', '...kYYYYk...', '..kppppppk..', '.kppppppppk.', '.kPPPPPPPPk.', '.kppppppppk.',
    '.kPPPPPPPPk.', '.kppppppppk.', '.kPPPPPPPPk.', '..kppppppk..', '...kYYYYk...', '....kkkk....',
    '.....kk.....', '.....rr.....', '.....rr.....', '.....rr.....',
  ];
  const lantOff = sprite(LANT, { p: '#c0304a', P: '#7c1e38' });
  const lantOn = sprite(LANT, { p: '#ffe27a', P: '#ffb030' });
  const signImg = sprite([
    '.kkkkkkkkkkkkk..', 'kYYYYYYYYYYYYYk.', 'kYkkkYkkYkkkYYk.', 'kYYYYkYYYYkYYYk.'.slice(0, 16), 'kYYYkYYkYYYYYYk.',
    'kYYYYYYYYYYYYYk.', '.kkkkkkkkkkkkk..', '......kOk.......', '......kOk.......', '......kOk.......',
  ].map(r => (r + '................').slice(0, 16)), { Y: '#ffe8a0', O: '#a05a2c' });

  // ---------- font (5x7) ----------
  const FONT_SRC = {
    A: '01110,10001,10001,11111,10001,10001,10001', B: '11110,10001,10001,11110,10001,10001,11110',
    C: '01110,10001,10000,10000,10000,10001,01110', D: '11110,10001,10001,10001,10001,10001,11110',
    E: '11111,10000,10000,11110,10000,10000,11111', F: '11111,10000,10000,11110,10000,10000,10000',
    G: '01110,10001,10000,10111,10001,10001,01111', H: '10001,10001,10001,11111,10001,10001,10001',
    I: '01110,00100,00100,00100,00100,00100,01110', J: '00111,00010,00010,00010,00010,10010,01100',
    K: '10001,10010,10100,11000,10100,10010,10001', L: '10000,10000,10000,10000,10000,10000,11111',
    M: '10001,11011,10101,10101,10001,10001,10001', N: '10001,11001,10101,10011,10001,10001,10001',
    O: '01110,10001,10001,10001,10001,10001,01110', P: '11110,10001,10001,11110,10000,10000,10000',
    Q: '01110,10001,10001,10001,10101,10010,01101', R: '11110,10001,10001,11110,10100,10010,10001',
    S: '01111,10000,10000,01110,00001,00001,11110', T: '11111,00100,00100,00100,00100,00100,00100',
    U: '10001,10001,10001,10001,10001,10001,01110', V: '10001,10001,10001,10001,10001,01010,00100',
    W: '10001,10001,10001,10101,10101,10101,01010', X: '10001,10001,01010,00100,01010,10001,10001',
    Y: '10001,10001,01010,00100,00100,00100,00100', Z: '11111,00001,00010,00100,01000,10000,11111',
    0: '01110,10001,10011,10101,11001,10001,01110', 1: '00100,01100,00100,00100,00100,00100,01110',
    2: '01110,10001,00001,00010,00100,01000,11111', 3: '11110,00001,00001,01110,00001,00001,11110',
    4: '00010,00110,01010,10010,11111,00010,00010', 5: '11111,10000,11110,00001,00001,10001,01110',
    6: '00110,01000,10000,11110,10001,10001,01110', 7: '11111,00001,00010,00100,01000,01000,01000',
    8: '01110,10001,10001,01110,10001,10001,01110', 9: '01110,10001,10001,01111,00001,00010,01100',
    '.': '00000,00000,00000,00000,00000,01100,01100', ',': '00000,00000,00000,00000,01100,00100,01000',
    ':': '00000,01100,01100,00000,01100,01100,00000', '!': '00100,00100,00100,00100,00100,00000,00100',
    '?': '01110,10001,00001,00010,00100,00000,00100', '-': '00000,00000,00000,11111,00000,00000,00000',
    '+': '00000,00100,00100,11111,00100,00100,00000', '/': '00001,00001,00010,00100,01000,10000,10000',
    "'": '00100,00100,01000,00000,00000,00000,00000', '(': '00010,00100,01000,01000,01000,00100,00010',
    ')': '01000,00100,00010,00010,00010,00100,01000', '>': '10000,01000,00100,00010,00100,01000,10000',
    '<': '00001,00010,00100,01000,00100,00010,00001', '=': '00000,00000,11111,00000,11111,00000,00000',
    '*': '00000,10101,01110,11111,01110,10101,00000', '%': '11001,11010,00010,00100,01000,01011,10011',
    '_': '00000,00000,00000,00000,00000,00000,11111', ' ': '00000,00000,00000,00000,00000,00000,00000',
  };
  const FONT = {};
  Object.keys(FONT_SRC).forEach(ch => { FONT[ch] = FONT_SRC[ch].split(',').map(r => parseInt(r, 2)); });
  const glyphCache = {};
  function glyph(ch, color) {
    const k = ch + color;
    if (glyphCache[k]) return glyphCache[k];
    const rows = FONT[ch] || FONT['?'];
    const c = canvas(5, 7), x = c.getContext('2d'); x.fillStyle = color;
    for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (rows[j] & (16 >> i)) x.fillRect(i, j, 1, 1);
    return (glyphCache[k] = c);
  }
  function textWidth(str, scale) { return str.length * 6 * (scale || 1) - (scale || 1); }
  // text(ctx, str, x, y, color, scale, shadowColor, align)
  function text(ctx, str, x, y, color, scale, shadow, align) {
    scale = scale || 1; str = String(str).toUpperCase();
    const w = textWidth(str, scale);
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = Math.round(x - w);
    for (let pass = shadow ? 0 : 1; pass < 2; pass++) {
      const col = pass === 0 ? shadow : color, ox = pass === 0 ? scale : 0;
      for (let i = 0; i < str.length; i++) ctx.drawImage(glyph(str[i], col), 0, 0, 5, 7, x + i * 6 * scale + ox, y + ox, 5 * scale, 7 * scale);
    }
    return w;
  }
  // Japanese text: render system CJK font and threshold to 1-bit so it matches the pixel look
  const jpCache = {};
  const JP_FONT = '"Noto Sans CJK JP","Noto Sans JP","Hiragino Sans","Yu Gothic","Meiryo","Droid Sans Fallback","IPAGothic","TakaoGothic",sans-serif';
  function jpBitmap(str, px, color) {
    const k = str + '|' + px + '|' + color;
    if (jpCache[k]) return jpCache[k];
    const m = canvas(px * str.length + 8, px + 8), mx = m.getContext('2d');
    mx.font = 'bold ' + px + 'px ' + JP_FONT; mx.textBaseline = 'top'; mx.fillStyle = '#fff';
    const w = Math.ceil(mx.measureText(str).width) + 2;
    mx.fillText(str, 1, 1);
    const id = mx.getImageData(0, 0, m.width, m.height), d = id.data;
    const out = canvas(w, px + 4), ox = out.getContext('2d');
    const col = parseColor(color);
    const oid = ox.createImageData(out.width, out.height);
    for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
      if (x < m.width && y < m.height && d[(y * m.width + x) * 4 + 3] > 110) {
        const o = (y * out.width + x) * 4; oid.data[o] = col[0]; oid.data[o + 1] = col[1]; oid.data[o + 2] = col[2]; oid.data[o + 3] = 255;
      }
    }
    ox.putImageData(oid, 0, 0);
    return (jpCache[k] = out);
  }
  function parseColor(c) {
    const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function jp(ctx, str, x, y, color, px, shadow, align) {
    const b = jpBitmap(str, px, color);
    if (align === 'center') x = Math.round(x - b.width / 2);
    if (shadow) { const s = jpBitmap(str, px, shadow); ctx.drawImage(s, x + 1, y + 1); }
    ctx.drawImage(b, x, y);
    return b.width;
  }

  // ---------- dynamic prop drawers ----------
  function pixelCircle(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]].forEach(p => ctx.fillRect(Math.round(cx + p[0]), Math.round(cy + p[1]), 1, 1));
      y++; if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x + 1); }
    }
  }
  function fillCircle(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + 0.5)); ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
  }
  function spikes(up) {
    const c = canvas(16, 16), x = c.getContext('2d');
    for (let t = 0; t < 3; t++) {
      const bx = 1 + t * 5;
      for (let r = 0; r < 9; r++) {
        const y = up ? 15 - r : r, hw = Math.max(0, Math.floor((9 - r) * 2.5 / 4.5));
        x.fillStyle = '#2a1838'; x.fillRect(bx + 2 - hw - 1, y, hw * 2 + 3, 1);
        x.fillStyle = '#e8eef8'; x.fillRect(bx + 2 - hw, y, hw + 1, 1);
        x.fillStyle = '#9aa6c4'; x.fillRect(bx + 2 + 1, y, hw, 1);
      }
      x.fillStyle = '#2a1838'; x.fillRect(bx + 2, up ? 6 : 9, 1, 1);
      x.fillStyle = '#e8344e'; x.fillRect(bx + 2, up ? 9 : 6, 1, 2);
    }
    x.fillStyle = '#4a3a62'; x.fillRect(0, up ? 15 : 0, 16, 1);
    return c;
  }
  const spikeUp = spikes(true), spikeDown = spikes(false);

  function drawCoin(ctx, x, y, t) {
    const f = Math.floor(t / 6) % 4, ws = [8, 6, 2, 6][f], hx = x + 4 + (8 - ws) / 2;
    ctx.fillStyle = '#2a1838'; ctx.fillRect(hx - 1, y + 2, ws + 2, 12); ctx.fillRect(hx, y + 1, ws, 14);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(hx, y + 2, ws, 12);
    if (ws > 3) { ctx.fillStyle = '#fff6b0'; ctx.fillRect(hx + 1, y + 3, 2, 4); ctx.fillStyle = '#d99a1a'; ctx.fillRect(hx + ws - 2, y + 7, 2, 6); }
    if (ws >= 6) { ctx.fillStyle = '#d99a1a'; ctx.fillRect(hx + ws / 2 - 1, y + 6, 2, 1); ctx.fillRect(hx + ws / 2 - 1, y + 9, 2, 1); }
  }
  function drawPetal(ctx, x, y, t) {
    const cx = x + 8, cy = y + 8 + Math.round(Math.sin(t / 14) * 1.5);
    for (let a = 0; a < 5; a++) {
      const ang = a * Math.PI * 2 / 5 - Math.PI / 2 + t / 90;
      const px = Math.round(cx + Math.cos(ang) * 3.6), py = Math.round(cy + Math.sin(ang) * 3.6);
      ctx.fillStyle = '#7a2a5c'; ctx.fillRect(px - 3, py - 3, 6, 6);
    }
    for (let a = 0; a < 5; a++) {
      const ang = a * Math.PI * 2 / 5 - Math.PI / 2 + t / 90;
      const px = Math.round(cx + Math.cos(ang) * 3.6), py = Math.round(cy + Math.sin(ang) * 3.6);
      ctx.fillStyle = '#ff8cc3'; ctx.fillRect(px - 2, py - 2, 4, 4);
      ctx.fillStyle = '#ffd0e8'; ctx.fillRect(px - 2, py - 2, 2, 2);
    }
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(cx - 1, cy - 1, 3, 3);
    if (Math.floor(t / 8) % 4 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 1, y + 2, 1, 1); ctx.fillRect(x + 14, y + 12, 1, 1); }
  }
  function drawOrb(ctx, x, y, t, g) {
    const cx = x + 8, cy = y + 8, pulse = Math.sin(t / 8) * 1;
    fillCircle(ctx, cx, cy, 9 + Math.round(pulse), 'rgba(120,230,255,0.25)');
    fillCircle(ctx, cx, cy, 7, '#2a1838');
    fillCircle(ctx, cx, cy, 6, '#5a6cff');
    fillCircle(ctx, cx, cy, 4, '#8ec8ff');
    fillCircle(ctx, cx, cy, 2, '#ffffff');
    ctx.fillStyle = '#ff8cc3';
    // up/down arrows
    const o = Math.floor(t / 10) % 2 ? 1 : 0;
    ctx.fillRect(cx - 1, cy - 11 - o, 3, 1); ctx.fillRect(cx, cy - 12 - o, 1, 1);
    ctx.fillRect(cx - 1, cy + 11 + o, 3, 1); ctx.fillRect(cx, cy + 12 + o, 1, 1);
    pixelCircle(ctx, cx, cy, 8 + Math.floor((t / 6) % 3), 'rgba(255,255,255,0.5)');
  }
  function drawTorii(ctx, x, y, t, flipV) {
    // gate occupies the tile; extends 8px beyond toward the open side
    ctx.save();
    if (flipV) { ctx.translate(0, y * 2 + 16); ctx.scale(1, -1); }
    const gy = y - 8;
    // portal
    const glow = 0.5 + 0.3 * Math.sin(t / 10);
    ctx.fillStyle = 'rgba(190,240,255,' + glow + ')'; ctx.fillRect(x + 3, gy + 6, 10, 18);
    ctx.fillStyle = 'rgba(255,255,255,' + glow + ')'; ctx.fillRect(x + 5, gy + 8 + Math.floor((t / 4) % 8), 6, 2);
    // pillars
    ctx.fillStyle = '#2a1838'; ctx.fillRect(x + 1, gy + 4, 4, 20); ctx.fillRect(x + 11, gy + 4, 4, 20);
    ctx.fillStyle = '#ec3a56'; ctx.fillRect(x + 2, gy + 5, 2, 19); ctx.fillRect(x + 12, gy + 5, 2, 19);
    // beams
    ctx.fillStyle = '#2a1838'; ctx.fillRect(x - 3, gy, 22, 5); ctx.fillRect(x, gy + 7, 16, 3);
    ctx.fillStyle = '#ec3a56'; ctx.fillRect(x - 2, gy + 1, 20, 2); ctx.fillRect(x + 1, gy + 8, 14, 1);
    ctx.fillStyle = '#a31f40'; ctx.fillRect(x - 2, gy + 3, 20, 1);
    ctx.restore();
  }
  function drawFireball(ctx, x, y, t, dir) {
    const f = Math.floor(t / 3) % 2;
    ctx.fillStyle = '#2a1838'; ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = '#ff5a2a'; ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = '#ffa030'; ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillStyle = '#fff2a0'; ctx.fillRect(x - 1, y - 1, 2, 2);
    ctx.fillStyle = '#ff7a30'; ctx.fillRect(x - dir * (6 + f), y - 1 + f, 3, 2); ctx.fillRect(x - dir * (9 + f), y, 2, 1);
  }
  function drawShot(ctx, x, y, t) {
    const f = Math.floor(t / 2) % 4;
    ctx.fillStyle = '#7a2a5c'; ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = '#ff8cc3'; ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 2 + (f & 1), y - 2 + (f >> 1), 2, 1);
    ctx.fillStyle = 'rgba(255,200,230,0.6)'; ctx.fillRect(x - 8, y - 1, 5, 2); ctx.fillRect(x - 12, y, 3, 1);
  }

  // ---------- tiles ----------
  const THEMES = [
    // 0 village (earth + sakura moss)
    { base: '#7a5a52', dark: '#5a3e3c', light: '#9a7a70', cap: '#f08fb8', capL: '#ffc4dc', capD: '#c0608c', pat: 'brick' },
    // 1 bamboo
    { base: '#3f9450', dark: '#2a6a3c', light: '#6cc868', cap: '#b6ee72', capL: '#e0ff9a', capD: '#78b84a', pat: 'bamboo' },
    // 2 festival
    { base: '#6a3048', dark: '#44202e', light: '#92486a', cap: '#ff5a6e', capL: '#ffb0a0', capD: '#c02848', pat: 'plank' },
    // 3 snow
    { base: '#5a7ab0', dark: '#3c5a90', light: '#90b4e0', cap: '#f4faff', capL: '#ffffff', capD: '#b8d0ec', pat: 'ice' },
    // 4 sky castle
    { base: '#8a7cc8', dark: '#5e54a4', light: '#b8aaf0', cap: '#ffd870', capL: '#fff0b0', capD: '#d09a30', pat: 'roof' },
  ];
  const tileCache = {};
  const OUT = '#1d1228';
  function hash(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  // mask bits: 1 open-up, 2 open-down, 4 open-left, 8 open-right
  function tileImg(theme, kind, mask, v) {
    const key = theme + kind + mask + v;
    if (tileCache[key]) return tileCache[key];
    const T = THEMES[theme], c = canvas(16, 16), x = c.getContext('2d');
    let base = T.base, dark = T.dark, light = T.light;
    if (kind === 'i') { base = '#8cc8f0'; dark = '#5aa0d8'; light = '#d8f4ff'; }
    if (kind === 'b') { base = '#b08850'; dark = '#7c5a30'; light = '#d8b878'; }
    x.fillStyle = base; x.fillRect(0, 0, 16, 16);
    // pattern
    x.fillStyle = dark;
    const pat = kind === 'b' ? 'crumble' : kind === 'i' ? 'ice' : T.pat;
    if (pat === 'brick') {
      x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(v ? 4 : 10, 0, 1, 7); x.fillRect(v ? 11 : 5, 8, 1, 7);
    } else if (pat === 'bamboo') {
      x.fillRect(5, 0, 1, 16); x.fillRect(10, 0, 1, 16);
      x.fillStyle = light; x.fillRect(2, 0, 1, 16); x.fillRect(7, 0, 1, 16); x.fillRect(13, 0, 1, 16);
      x.fillStyle = dark; x.fillRect(0, v ? 5 : 9, 16, 1);
    } else if (pat === 'plank') {
      x.fillRect(0, 5, 16, 1); x.fillRect(0, 11, 16, 1);
      x.fillStyle = light; x.fillRect(2, 2, 1, 1); x.fillRect(13, 8, 1, 1); x.fillRect(5, 13, 1, 1);
      x.fillStyle = '#ffd23f'; x.fillRect(1, 1, 1, 1); x.fillRect(14, 14, 1, 1);
    } else if (pat === 'ice') {
      x.fillStyle = light; x.fillRect(3, 3, 1, 4); x.fillRect(2, 4, 3, 1); x.fillRect(11, 9, 1, 4); x.fillRect(10, 10, 3, 1);
      x.fillStyle = dark; x.fillRect(0, 7, 16, 1);
    } else if (pat === 'roof') {
      for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) {
        const ox = (r % 2) * 4 + i * 8 - 4;
        x.fillStyle = dark; x.fillRect(ox + 1, r * 4 + 3, 6, 1); x.fillRect(ox, r * 4 + 2, 1, 1); x.fillRect(ox + 7, r * 4 + 2, 1, 1);
        x.fillStyle = light; x.fillRect(ox + 2, r * 4 + 1, 4, 1);
      }
    } else if (pat === 'crumble') {
      x.fillRect(0, 7, 16, 1); x.fillRect(5, 0, 1, 7); x.fillRect(11, 8, 1, 8);
      x.fillStyle = light; x.fillRect(2, 2, 2, 1); x.fillRect(12, 11, 2, 1);
    }
    // speckles
    for (let i = 0; i < 10; i++) {
      const sx = Math.floor(hash(i, v, theme + 1) * 16), sy = Math.floor(hash(i, theme, v + 5) * 16);
      x.fillStyle = hash(i, 9, v) > 0.5 ? dark : light; x.fillRect(sx, sy, 1, 1);
    }
    // caps (exposed top/bottom) with irregular fringe
    const capSide = (flipV) => {
      const yy = j => flipV ? 15 - j : j;
      for (let i = 0; i < 16; i++) {
        const d = 3 + Math.floor(hash(i, v + (flipV ? 7 : 0), theme) * 2.9) - (i % 5 === 0 ? 1 : 0);
        x.fillStyle = T.cap; for (let j = 0; j < d; j++) x.fillRect(i, yy(j), 1, 1);
        x.fillStyle = T.capD; x.fillRect(i, yy(d - 1), 1, 1);
        x.fillStyle = T.capL; x.fillRect(i, yy(0), 1, 1);
      }
      if (theme === 0) { x.fillStyle = '#fff'; x.fillRect(3 + v * 5, yy(1), 1, 1); x.fillRect(12 - v * 4, yy(2), 1, 1); }
      if (theme === 3) { x.fillStyle = T.cap; x.fillRect(2 + v * 6, yy(4), 2, 1); x.fillRect(11 - v * 5, yy(5), 1, 1); }
      if (theme === 1) { x.fillStyle = T.capD; x.fillRect(4 + v * 5, yy(4), 1, 2); }
    };
    if (kind !== 'b') { if (mask & 1) capSide(false); if (mask & 2) capSide(true); }
    else { if (mask & 1) { x.fillStyle = light; x.fillRect(0, 0, 16, 1); } if (mask & 2) { x.fillStyle = light; x.fillRect(0, 15, 16, 1); } }
    // outlines on exposed sides
    x.fillStyle = OUT;
    if (mask & 1) x.fillRect(0, 0, 16, 1);
    if (mask & 2) x.fillRect(0, 15, 16, 1);
    if (mask & 4) x.fillRect(0, 0, 1, 16);
    if (mask & 8) x.fillRect(15, 0, 1, 16);
    if (mask & 1 && mask & 4) { x.fillStyle = 'rgba(0,0,0,0)'; }
    return (tileCache[key] = c);
  }

  // ---------- backgrounds ----------
  function dither(x, w, h, colors, y0) {
    const n = colors.length, bh = h / n;
    for (let i = 0; i < n; i++) { x.fillStyle = colors[i]; x.fillRect(0, y0 + Math.floor(i * bh), w, Math.ceil(bh) + 1); }
    for (let i = 1; i < n; i++) {
      const by = y0 + Math.floor(i * bh);
      x.fillStyle = colors[i];
      for (let k = 0; k < 4; k++) for (let px = (k & 1); px < w; px += 2) x.fillRect(px, by - 4 + k * 1 - (k < 2 ? 0 : 0), 1, 1);
      x.fillStyle = colors[i - 1];
      for (let px = 0; px < w; px += 2) x.fillRect(px, by + 1, 1, 1);
    }
  }
  function wrapped(x, W, drawFn, ex) {
    drawFn(0); drawFn(-W); drawFn(W);
  }
  function makeBG(theme) {
    const r = rng(theme * 7919 + 13);
    const layers = []; // {img, f(parallax), y}
    const sky = canvas(W, H), sx = sky.getContext('2d');
    const WW = 640;
    function layer(f, y, drawFn) {
      const c = canvas(WW, H), x = c.getContext('2d');
      drawFn(x); layers.push({ img: c, f, y: y || 0 });
    }
    if (theme === 0) {
      dither(sx, W, 150, ['#8fd0ff', '#a6dcff', '#c0e6ff', '#dcecff', '#f8e4f4', '#ffd8ec', '#ffd0e0'], 0);
      sx.fillStyle = '#ffd0e0'; sx.fillRect(0, 150, W, 30);
      // sun
      fillCircle(sx, 250, 52, 22, '#fff4cc'); fillCircle(sx, 250, 52, 17, '#fffbe0');
      layer(0.04, 0, x => { // clouds
        for (let i = 0; i < 6; i++) { const cx = i * 110 + r() * 40, cy = 24 + r() * 50; for (let k = 0; k < 4; k++) fillCircle(x, cx + k * 9, cy + (k % 2) * 3, 8 + (k % 3) * 2, 'rgba(255,255,255,0.8)'); x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(cx - 6, cy + 3, 46, 8); }
      });
      layer(0.07, 0, x => { // Mt Fuji
        const fx = 330;
        for (let yy = 0; yy < 90; yy++) { const hw = 20 + yy * 1.45; x.fillStyle = yy < 20 ? '#f4f8ff' : '#7c8cc8'; x.fillRect(Math.round(fx - hw), 70 + yy, Math.round(hw * 2), 1); }
        for (let yy = 0; yy < 24; yy++) { const hw = 20 + yy * 1.45; for (let k = 0; k < hw * 2; k += 2) { x.fillStyle = (Math.floor(k / 3 + yy) % 5 < 2) ? '#7c8cc8' : '#f4f8ff'; if (yy > 14) x.fillRect(Math.round(fx - hw + k), 70 + yy, 2, 1); } }
        x.fillStyle = '#6a78b8'; for (let yy = 0; yy < 90; yy += 1) { const hw = 20 + yy * 1.45; x.fillRect(Math.round(fx + hw * 0.3), 70 + yy, Math.round(hw * 0.7), 1); }
        for (let yy = 0; yy < 20; yy++) { const hw = 20 + yy * 1.45; x.fillStyle = '#e4ecff'; x.fillRect(Math.round(fx + hw * 0.3), 70 + yy, Math.round(hw * 0.7), 1); }
      });
      layer(0.15, 20, x => { // hills + pagoda
        for (let i = 0; i < WW; i++) { const hgt = 105 + Math.sin(i / 38) * 9 + Math.sin(i / 17) * 3; x.fillStyle = '#b8a8e0'; x.fillRect(i, Math.round(hgt), 1, H); }
        // pagoda
        const px = 120;
        for (let t = 0; t < 4; t++) { const w = 30 - t * 5, y = 70 + t * 11; x.fillStyle = '#5a3a6a'; x.fillRect(px - w / 2, y, w, 3); x.fillRect(px - w / 2 - 3, y + 3, w + 6, 2); x.fillStyle = '#8a60a0'; x.fillRect(px - w / 2 + 2, y + 5, w - 4, 7); x.fillStyle = '#ffd8a0'; x.fillRect(px - 2, y + 7, 4, 4); }
        x.fillStyle = '#5a3a6a'; x.fillRect(px - 1, 58, 2, 12);
        // torii far
        const tx = 430; x.fillStyle = '#c0405a'; x.fillRect(tx, 86, 3, 28); x.fillRect(tx + 18, 86, 3, 28); x.fillRect(tx - 4, 82, 29, 4); x.fillRect(tx, 92, 21, 2);
      });
      layer(0.3, 18, x => { // sakura trees
        for (let i = 0; i < 7; i++) {
          const tx = i * 95 + r() * 30 + 10, ty = 112 + r() * 6;
          x.fillStyle = '#5a3a4a'; x.fillRect(tx - 2, ty, 5, 70);
          for (let k = 0; k < 12; k++) { const a = r() * 6.28, d = r() * 22; fillCircle(x, tx + Math.cos(a) * d, ty - 8 + Math.sin(a) * d * 0.6, 9 + r() * 6, k % 3 ? '#ffa8cc' : '#ffc4dc'); }
          for (let k = 0; k < 14; k++) { x.fillStyle = '#fff0f6'; x.fillRect(tx + (r() - 0.5) * 50, ty - 22 + r() * 30, 2, 1); }
        }
      });
    } else if (theme === 1) {
      dither(sx, W, 160, ['#2f6e5e', '#3a8468', '#4a9c74', '#62b484', '#86cc94', '#b0e0a8', '#d8f0b8'], 0);
      fillCircle(sx, 230, 46, 20, '#f4ffd0'); fillCircle(sx, 230, 46, 15, '#ffffe8');
      sx.fillStyle = '#d8f0b8'; sx.fillRect(0, 160, W, 20);
      const stalks = (f, n, wid, col, col2, hiY) => layer(f, 0, x => {
        for (let i = 0; i < n; i++) {
          const sxp = Math.floor(i * (WW / n) + r() * 14), w = wid + Math.floor(r() * 2);
          x.fillStyle = col; x.fillRect(sxp, hiY, w, H); x.fillStyle = col2; x.fillRect(sxp + w - 1, hiY, 1, H);
          for (let y = hiY + 10 + r() * 12; y < H; y += 22 + r() * 8) { x.fillStyle = col2; x.fillRect(sxp - 1, Math.round(y), w + 2, 2); }
          for (let k = 0; k < 3; k++) { const ly = 20 + r() * 100, dir = r() > 0.5 ? 1 : -1; x.fillStyle = col2; for (let q = 0; q < 8; q++) x.fillRect(sxp + (dir > 0 ? w : -1) + dir * q, Math.round(ly + q * 0.5), 1, 2); }
        }
      });
      stalks(0.1, 14, 3, '#74b88a', '#5a9c74', 0);
      stalks(0.22, 10, 4, '#4a9a68', '#367c52', 0);
      stalks(0.45, 7, 6, '#2a7a4c', '#1e5a3a', 0);
    } else if (theme === 2) {
      dither(sx, W, 150, ['#0e0a2a', '#161038', '#1e1448', '#2c1a58', '#3e2268', '#58307a', '#7a4088'], 0);
      sx.fillStyle = '#7a4088'; sx.fillRect(0, 150, W, 30);
      for (let i = 0; i < 70; i++) { sx.fillStyle = r() > 0.8 ? '#fff0b0' : '#c8c0ff'; sx.fillRect(Math.floor(r() * W), Math.floor(r() * 110), 1, 1); }
      fillCircle(sx, 80, 50, 26, '#fff0c0'); fillCircle(sx, 80, 24 + 1, '#ffe8a0'.length ? 0 : 0, '#000');
      fillCircle(sx, 80, 50, 24, '#ffe8a0'); fillCircle(sx, 72, 44, 5, '#f0d088'); fillCircle(sx, 90, 58, 4, '#f0d088'); fillCircle(sx, 86, 40, 3, '#f0d088');
      layer(0.1, 0, x => { // roofs far
        for (let i = 0; i < 12; i++) { const bx = i * 56 + r() * 10, bh = 20 + r() * 30; x.fillStyle = '#34205a'; x.fillRect(bx, 130 - bh, 36, bh + 60); x.fillRect(bx - 4, 130 - bh, 44, 3); for (let w = 0; w < 4; w++) { x.fillStyle = r() > 0.4 ? '#ffd870' : '#34205a'; x.fillRect(bx + 4 + (w % 2) * 14, 136 - bh + Math.floor(w / 2) * 10, 5, 5); } }
      });
      layer(0.25, 0, x => { // lantern strings
        for (let s = 0; s < 3; s++) {
          const y0 = 30 + s * 22, x0 = s * 200 - 20;
          for (let i = 0; i <= 200; i += 1) { const yy = y0 + Math.sin(i / 200 * Math.PI) * 14; x.fillStyle = '#1a1030'; x.fillRect(x0 + i, Math.round(yy), 1, 1); }
          for (let i = 14; i < 200; i += 22) { const yy = y0 + Math.sin(i / 200 * Math.PI) * 14; x.fillStyle = '#ff6a50'; x.fillRect(x0 + i - 3, Math.round(yy) + 1, 7, 8); x.fillStyle = '#ffb060'; x.fillRect(x0 + i - 1, Math.round(yy) + 3, 3, 4); x.fillStyle = '#2a1838'; x.fillRect(x0 + i - 3, Math.round(yy) + 1, 7, 1); x.fillRect(x0 + i - 3, Math.round(yy) + 8, 7, 1); }
        }
      });
      layer(0.4, 0, x => { // torii silhouettes + trees
        for (let i = 0; i < 4; i++) { const tx = i * 170 + 40; x.fillStyle = '#240e3c'; x.fillRect(tx, 80, 4, 100); x.fillRect(tx + 30, 80, 4, 100); x.fillRect(tx - 6, 74, 46, 5); x.fillRect(tx, 88, 34, 3); }
      });
    } else if (theme === 3) {
      dither(sx, W, 150, ['#2a2a68', '#3c3a84', '#5a4c9c', '#7a62ac', '#a888c0', '#d0a8c8', '#f0c8d0'], 0);
      sx.fillStyle = '#f0c8d0'; sx.fillRect(0, 150, W, 30);
      for (let i = 0; i < 40; i++) { sx.fillStyle = '#fff'; sx.fillRect(Math.floor(r() * W), Math.floor(r() * 70), 1, 1); }
      // aurora
      for (let i = 0; i < W; i++) { const a = 24 + Math.sin(i / 30) * 8 + Math.sin(i / 11) * 2; sx.fillStyle = 'rgba(110,255,190,0.35)'; sx.fillRect(i, Math.round(a), 1, 20); sx.fillStyle = 'rgba(180,140,255,0.3)'; sx.fillRect(i, Math.round(a) + 20, 1, 10); sx.fillStyle = 'rgba(200,255,230,0.4)'; sx.fillRect(i, Math.round(a), 1, 3); }
      layer(0.06, 0, x => { for (let i = 0; i < WW; i++) { const hh = 80 + Math.abs(Math.sin(i / 53)) * 40 + Math.sin(i / 13) * 3; x.fillStyle = '#8a78c0'; x.fillRect(i, Math.round(hh), 1, H); if (hh < 100) { x.fillStyle = '#f4f0ff'; x.fillRect(i, Math.round(hh), 1, Math.round((100 - hh) * 0.6)); } } });
      layer(0.15, 0, x => { for (let i = 0; i < WW; i++) { const hh = 110 + Math.abs(Math.sin(i / 37 + 1)) * 24; x.fillStyle = '#6a5aa8'; x.fillRect(i, Math.round(hh), 1, H); if (hh < 124) { x.fillStyle = '#e8e4ff'; x.fillRect(i, Math.round(hh), 1, Math.round((124 - hh) * 0.5) + 1); } } });
      layer(0.32, 0, x => { // pines + shrine
        for (let i = 0; i < 14; i++) { const tx = i * 46 + r() * 14, ty = 120 + r() * 10; for (let k = 0; k < 4; k++) { const w = 18 - k * 4; x.fillStyle = '#2e4a6a'; x.fillRect(tx - w / 2, ty - k * 9, w, 9); x.fillStyle = '#f4faff'; x.fillRect(tx - w / 2, ty - k * 9, w, 2); } x.fillStyle = '#3a2a3a'; x.fillRect(tx - 1, ty + 9, 3, 30); }
        const sx2 = 300; x.fillStyle = '#c0405a'; x.fillRect(sx2, 90, 3, 40); x.fillRect(sx2 + 24, 90, 3, 40); x.fillRect(sx2 - 4, 86, 35, 4); x.fillRect(sx2, 96, 27, 2); x.fillStyle = '#f4faff'; x.fillRect(sx2 - 4, 84, 35, 2);
      });
    } else {
      dither(sx, W, 150, ['#3a2a78', '#5a3a8c', '#8a4a98', '#c0609c', '#f08098', '#ffa888', '#ffd090'], 0);
      sx.fillStyle = '#ffd090'; sx.fillRect(0, 150, W, 30);
      fillCircle(sx, 220, 130, 34, '#fff0b0'); fillCircle(sx, 220, 130, 27, '#fffbe0');
      const cloud = (f, ys, a, col) => layer(f, 0, x => {
        for (let i = 0; i < 8; i++) { const cx = i * 85 + r() * 30, cy = ys + r() * 30; for (let k = 0; k < 5; k++) fillCircle(x, cx + k * 8, cy + (k % 2) * 2, 7 + (k % 3) * 3, col); x.fillStyle = col; x.fillRect(cx - 6, cy + 2, 48, 10); }
      });
      cloud(0.05, 30, 1, 'rgba(255,200,220,0.7)');
      layer(0.1, 0, x => { // distant islands + castle
        for (let i = 0; i < 4; i++) { const ix = i * 170 + 20, iy = 90 + (i % 2) * 20; x.fillStyle = '#7a4a98'; x.fillRect(ix, iy, 60, 6); for (let k = 0; k < 14; k++) x.fillRect(ix + k * 2 + 4, iy + 6 + k / 2, Math.max(1, 52 - k * 4), 1); x.fillStyle = '#6a3a88'; x.fillRect(ix + 20, iy - 24, 20, 24); x.fillRect(ix + 24, iy - 36, 12, 12); x.fillRect(ix + 28, iy - 44, 4, 8); x.fillStyle = '#ffd890'; x.fillRect(ix + 26, iy - 16, 3, 4); x.fillRect(ix + 32, iy - 16, 3, 4); }
      });
      cloud(0.22, 110, 1, 'rgba(255,220,230,0.85)');
      cloud(0.4, 150, 1, 'rgba(255,240,244,0.95)');
    }
    return { sky, layers };
  }
  const bgCache = {};
  function drawBG(ctx, theme, camX, camY, t) {
    const bg = bgCache[theme] || (bgCache[theme] = makeBG(theme));
    ctx.drawImage(bg.sky, 0, 0);
    const WW = 640;
    bg.layers.forEach(l => {
      let ox = -Math.floor(camX * l.f) % WW; if (ox > 0) ox -= WW;
      const oy = Math.round(-camY * l.f * 0.3);
      for (let x = ox; x < W; x += WW) ctx.drawImage(l.img, x, oy + l.y * 0);
    });
  }

  root.Art = { W, H, canvas, rng, sprite, flip, tint, hana, oni, ghost, fox, boss, heart, heartEmpty, lantOff, lantOn, signImg,
    spikeUp, spikeDown, text, textWidth, jp, drawCoin, drawPetal, drawOrb, drawTorii, drawFireball, drawShot,
    pixelCircle, fillCircle, tileImg, THEMES, drawBG, dither };
})(window);
