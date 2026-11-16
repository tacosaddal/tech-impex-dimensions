/* ============================================================
   UI: sound, cursor, loader, small details
   ============================================================ */
const AU = { ctx: null, on: false, master: null, filt: null, osc: [] };
const CHORDS = [[55, 82.41, 110, 164.81], [43.65, 65.41, 87.31, 130.81], [49, 73.42, 98, 146.83], [58.27, 87.31, 116.54, 174.61], [51.91, 77.78, 103.83, 155.56]];
const CUTS = [520, 420, 640, 900, 1150];
function sndInit() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  try {
    const c = new AC(); AU.ctx = c;
    AU.master = c.createGain(); AU.master.gain.value = 0; AU.master.connect(c.destination);
    AU.filt = c.createBiquadFilter(); AU.filt.type = 'lowpass'; AU.filt.frequency.value = CUTS[S.dimIdx]; AU.filt.Q.value = 0.7;
    const pg = c.createGain(); pg.gain.value = 0.13; AU.filt.connect(pg); pg.connect(AU.master);
    const dl = c.createDelay(1); dl.delayTime.value = 0.37; const fb = c.createGain(); fb.gain.value = 0.35; pg.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(AU.master);
    CHORDS[S.dimIdx].forEach((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 1.5) * 8; const g = c.createGain(); g.gain.value = i < 2 ? 0.5 : 0.2; o.connect(g); g.connect(AU.filt); o.start(); AU.osc.push(o); });
    const l = c.createOscillator(); l.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 160; l.connect(lg); lg.connect(AU.filt.frequency); l.start();
    return true;
  } catch (e) { return false; }
}
function sndToggle() {
  if (!AU.ctx && !sndInit()) return;
  AU.on = !AU.on;
  if (AU.ctx.state === 'suspended') AU.ctx.resume();
  AU.master.gain.setTargetAtTime(AU.on ? 0.9 : 0, AU.ctx.currentTime, 0.25);
  $('#snd').setAttribute('aria-pressed', AU.on); $('#sndt').textContent = AU.on ? 'Sound on' : 'Sound off';
}
function blip(f, dur, vol, type = 'sine', delay = 0) {
  const c = AU.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, freq, sweep) {
  const c = AU.ctx, t = c.currentTime, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * 3.2, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t);
}
function snd(name) {
  if (!AU.on) return;
  try {
    if (name === 'tick') blip(1500, 0.04, 0.05);
    else if (name === 'drop') blip(380, 0.1, 0.1, 'triangle');
    else if (name === 'win') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, 0.22, 0.1, 'triangle', i * 0.07));
    else if (name === 'orb') blip(700 + G.combo * 120, 0.12, 0.09);
    else if (name === 'hit') noise(0.3, 0.3, 240, false);
    else if (name === 'whoosh') noise(0.7, 0.07, 500, true);
    else if (name === 'place') { blip(660, 0.14, 0.09); blip(990, 0.22, 0.07, 'sine', 0.06); }
  } catch (e) {}
}
function sndDim(i) {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime;
  AU.osc.forEach((o, k) => o.frequency.setTargetAtTime(CHORDS[i][k], t, 0.7));
  AU.filt.frequency.setTargetAtTime(CUTS[i], t, 0.9);
}

/* ---------- pointer (no custom cursor on phones) ---------- */
function initCursor() {
  window.addEventListener('pointermove', e => {
    const nx = clamp((e.clientX - DR.left) / S.w), ny = clamp((e.clientY - DR.top) / S.h);
    S.pv += Math.hypot(nx - S.px, ny - S.py) * 6; S.px = nx; S.py = ny; S.pin = true;
  }, { passive: true });
}
function updateCursor(dt) { S.spx = damp(S.spx, S.px, 5, dt); S.spy = damp(S.spy, S.py, 5, dt); }

/* ---------- loader ---------- *//* ---------- loader ---------- */
const LD = { p: 0, shown: 0, done: false, msgs: ['Finding the point', 'Drawing the line', 'Lighting the surface', 'Raising the world', 'Opening the room'] };
function loadStep(p) { LD.p = Math.max(LD.p, p); }
function updateLoader(dt) {
  if (LD.done) return;
  LD.shown = Math.min(LD.p, LD.shown + dt * 140);
  const n = Math.floor(LD.shown);
  $('#ldn').textContent = pad(n, 3); $('#ldb').style.setProperty('--p', (n / 100).toFixed(2));
  $('#ldm').textContent = LD.msgs[Math.min(4, Math.floor(n / 20.01))];
  if (n >= 100) {
    LD.done = true; $('#loader').classList.add('is-done');
    S.ready = true;
    if (RM) S.intro = 1; else tween(2.6, k => { S.intro = k; }, null, t => t);
    S.pulse = 0.5;
  }
}

function initUI() {
  $$('[data-studio]').forEach(el => { el.textContent = STUDIO; });
  $('#yr').textContent = new Date().getFullYear();
  $('#snd').addEventListener('click', sndToggle);
  const mb = $('#menub'), menu = $('#menu'), setMenu = o => { menu.hidden = !o; mb.setAttribute('aria-expanded', o); mb.textContent = o ? 'Close' : 'Menu'; };
  mb.addEventListener('click', () => { setMenu(menu.hidden); snd('tick'); });
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  initCursor();
  /* copy the email */
  const mail = $('#mail'), small = $('#mails');
  mail.addEventListener('click', () => {
    const txt = $('#mailt').textContent, ok = () => { small.textContent = 'Copied'; setTimeout(() => { small.textContent = 'Click to copy'; }, 1800); };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents($('#mailt')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); small.textContent = 'Selected. Press Ctrl or Cmd + C'; };
    try { navigator.clipboard.writeText(txt).then(ok, fallback); } catch (e) { fallback(); }
    snd('place');
  });
  /* local time */
  const clock = () => { try { $('#clock').textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date()) + ' UK'; } catch (e) {} };
  clock(); setInterval(clock, 20000);
  /* magnetic buttons */
  if (!TOUCH && !RM) $$('.btn').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px)'; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
  /* hover ticks */
  document.addEventListener('pointerover', e => { if (AU.on && e.target.closest && e.target.matches('a,button') && e.pointerType === 'mouse') snd('tick'); });
}
