// audio.js — tiny WebAudio chiptune engine: generated Japanese-scale BGM + SFX. No audio files.
(function (root) {
  let ac = null, master = null, musicBus = null, sfxBus = null, muted = false, timer = null;
  let track = null, trackIdx = -1, step = 0, nextT = 0;

  const SCALES = {
    yo: [0, 2, 5, 7, 9],
    insen: [0, 1, 5, 7, 10],
    miyako: [0, 1, 5, 7, 8],
    ryukyu: [0, 4, 5, 7, 11],
  };
  const TRACKS = [
    { bpm: 104, root: 62, scale: 'yo', seed: 11 },      // village
    { bpm: 96, root: 60, scale: 'ryukyu', seed: 29 },   // bamboo
    { bpm: 118, root: 57, scale: 'insen', seed: 47 },   // festival
    { bpm: 88, root: 59, scale: 'miyako', seed: 63 },   // snow
    { bpm: 132, root: 55, scale: 'insen', seed: 81 },   // sky castle
    { bpm: 140, root: 52, scale: 'miyako', seed: 97 },  // boss
    { bpm: 76, root: 62, scale: 'yo', seed: 5 },        // title
  ];

  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
  }

  function tone(f, t, dur, type, vol, bus, slideTo, attack) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  let noiseBuf = null;
  function noise(t, dur, vol, bus, lp) {
    if (!ac) return;
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = lp || 4000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus); s.start(t); s.stop(t + dur + 0.02);
  }

  // ---- music ----
  function build(cfg) {
    const r = rng(cfg.seed), sc = SCALES[cfg.scale];
    const deg = d => { const o = Math.floor(d / 5), i = ((d % 5) + 5) % 5; return cfg.root + 12 + o * 12 + sc[i]; };
    const phrase = (len, start) => {
      const out = []; let d = start;
      for (let i = 0; i < len; i++) {
        if (i % 4 === 3 && r() < 0.45) { out.push(-99); continue; }
        d += Math.floor(r() * 5) - 2; d = Math.max(-2, Math.min(9, d));
        out.push(d);
      }
      out[0] = start; return out;
    };
    const A = phrase(16, 4), B = phrase(16, 2), C = phrase(16, 6);
    const order = [A, A, B, A, C, B, A, C];
    const mel = []; order.forEach(p => p.forEach(d => mel.push(d === -99 ? null : deg(d))));
    const bass = []; for (let bar = 0; bar < 16; bar++) { const rd = [0, 0, 3, 2][Math.floor(bar / 2) % 4]; for (let i = 0; i < 8; i++) bass.push(deg(rd - 5)); }
    return { mel, bass, len: mel.length, stepDur: 60 / cfg.bpm / 2 };
  }
  function playStep(tr, s, t) {
    const i = s % tr.len, m = tr.mel[i];
    if (m != null) {
      tone(mtof(m), t, tr.stepDur * 1.7, 'triangle', 0.22, musicBus, null, 0.004);   // koto-ish pluck
      tone(mtof(m + 12), t, tr.stepDur * 0.7, 'sine', 0.07, musicBus, null, 0.002);
    }
    if (i % 2 === 0) tone(mtof(tr.bass[i] - 12), t, tr.stepDur * 1.8, 'square', 0.035, musicBus);
    if (i % 8 === 0) { tone(120, t, 0.18, 'sine', 0.55, musicBus, 38); noise(t, 0.05, 0.12, musicBus, 600); }   // taiko
    if (i % 8 === 4) tone(90, t, 0.12, 'sine', 0.3, musicBus, 40);
    if (i % 4 === 2) noise(t, 0.03, 0.05, musicBus, 7000);
  }
  function tick() {
    if (!ac || !track) return;
    while (nextT < ac.currentTime + 0.18) { playStep(track, step, nextT); nextT += track.stepDur; step++; }
  }
  function play(idx) {
    init(); if (!ac) return;
    if (trackIdx === idx && timer) return;
    trackIdx = idx; track = build(TRACKS[idx % TRACKS.length]); step = 0; nextT = ac.currentTime + 0.08;
    if (!timer) timer = setInterval(tick, 40);
  }
  function stop() { track = null; trackIdx = -1; }
  function duck(on) { if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.12 : 0.5, ac.currentTime, 0.05); }
  function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.55; return muted; }

  // ---- sfx ----
  const S = {
    flip(g) { const t = ac.currentTime; tone(g > 0 ? 700 : 300, t, 0.22, 'square', 0.12, sfxBus, g > 0 ? 220 : 800); noise(t, 0.12, 0.08, sfxBus, 3000); },
    orb() { const t = ac.currentTime; tone(500, t, 0.18, 'sine', 0.25, sfxBus, 1500); tone(1000, t + 0.04, 0.2, 'triangle', 0.15, sfxBus, 2000); },
    coin() { const t = ac.currentTime; tone(988, t, 0.07, 'square', 0.1); tone(1319, t + 0.06, 0.18, 'square', 0.1); },
    petal() { const t = ac.currentTime; [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.25, 'triangle', 0.2)); },
    heart() { const t = ac.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.06, 0.2, 'square', 0.1)); },
    hurt() { const t = ac.currentTime; tone(330, t, 0.35, 'sawtooth', 0.18, sfxBus, 70); noise(t, 0.25, 0.2, sfxBus, 2500); },
    shoot() { const t = ac.currentTime; tone(1300, t, 0.09, 'square', 0.07, sfxBus, 500); },
    kill() { const t = ac.currentTime; noise(t, 0.2, 0.22, sfxBus, 3500); tone(400, t, 0.18, 'square', 0.1, sfxBus, 80); },
    checkpoint() { const t = ac.currentTime; [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.08, 0.3, 'triangle', 0.22)); },
    land() { const t = ac.currentTime; noise(t, 0.05, 0.07, sfxBus, 1200); },
    select() { const t = ac.currentTime; tone(880, t, 0.06, 'square', 0.08); },
    confirm() { const t = ac.currentTime; tone(660, t, 0.07, 'square', 0.1); tone(990, t + 0.07, 0.15, 'square', 0.1); },
    bossHit() { const t = ac.currentTime; tone(160, t, 0.25, 'sawtooth', 0.2, sfxBus, 60); noise(t, 0.12, 0.2, sfxBus, 1500); },
    bossDie() { const t = ac.currentTime; for (let i = 0; i < 8; i++) { noise(t + i * 0.12, 0.2, 0.25, sfxBus, 2000 - i * 150); tone(300 - i * 25, t + i * 0.12, 0.2, 'sawtooth', 0.12, sfxBus, 60); } },
    warn() { const t = ac.currentTime; tone(880, t, 0.1, 'square', 0.1); tone(880, t + 0.16, 0.1, 'square', 0.1); },
    clear() { const t = ac.currentTime; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.12, 0.3, 'square', 0.12)); [262, 330, 392].forEach((f, i) => tone(f, t + i * 0.12, 0.6, 'triangle', 0.2)); },
    gameover() { const t = ac.currentTime; [392, 349, 311, 262].forEach((f, i) => tone(f, t + i * 0.22, 0.4, 'triangle', 0.25)); },
    sign() { const t = ac.currentTime; tone(1200, t, 0.04, 'square', 0.05); },
  };
  const sfx = name => function () { if (!ac || muted) return; try { S[name].apply(null, arguments); } catch (e) { } };
  const sfxApi = {}; Object.keys(S).forEach(k => sfxApi[k] = sfx(k));

  root.Sound = Object.assign({ init, play, stop, duck, toggleMute, isMuted: () => muted }, sfxApi);
})(window);
