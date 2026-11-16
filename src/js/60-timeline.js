/* ============================================================
   TIMELINE: scroll position -> shape, camera, colour, chapter
   ============================================================ */
const LAY = { top: 0, U: 600, vh: 800, contact: 1e9, index: 1e9, work: 1e9, doc: 1 };
const CHS = {};
const DIMS = [['0D', 'The point'], ['1D', 'The line'], ['2D', 'The surface'], ['3D', 'The world'], ['XR', 'Beyond the screen']];
const ACC = [[243, 239, 230], [255, 106, 61], [255, 200, 61], [53, 224, 255], [169, 139, 255], [243, 239, 230], [243, 239, 230]];
const TINT = [[1.0, 0.8, 0.58], [1.0, 0.33, 0.14], [1.0, 0.7, 0.2], [0.08, 0.7, 1.0], [0.5, 0.32, 1.0], [0.22, 0.23, 0.36], [1.0, 0.8, 0.58]];
const TINT2 = [[0.25, 0.3, 1.0], [1.0, 0.6, 0.2], [0.2, 0.5, 1.0], [1.0, 0.2, 0.6], [0.1, 0.9, 0.8], [0.3, 0.3, 0.6], [0.25, 0.3, 1.0]];
const SVC_D = [
  'Fast, secure platforms that scale from ten users to ten thousand.',
  'iOS and Android from one codebase, with offline built in.',
  'One system for the whole operation. The spreadsheets can retire.',
  'Every lead, call and deal in a pipeline your team will actually use.',
  'Targets, quotes, commissions and forecasts, updated live.',
  'Your numbers in real time, on one screen, from every source.'
];
const POSE = [
  { p: [0, 0, 7.2], t: [0, 0, 0], fov: 35, fo: 6.25, ap: 0.20, sx: 0.2, sy: 0, hw: 2.4, nsy: 0.15 },
  { p: [0, 0, 7.8], t: [0, 0, 0], fov: 35, fo: 7.6, ap: 0.30, sx: 0, sy: 0.1, hw: 0, nsy: 0.12 },
  { p: [0, 0, 10.2], t: [0, 0, 0], fov: 35, fo: 9.9, ap: 0.2, sx: 0.2, sy: 0, hw: 3.5, nsy: 0.2 },
  null, null,
  { p: [0, 0, 7.5], t: [0, 0, -2], fov: 35, fo: 9, ap: 0.14, sx: 0, sy: 0, hw: 0, nsy: 0 },
  { p: [0, 0, 8.6], t: [0, 0, 0], fov: 35, fo: 7.65, ap: 0.22, sx: 0.16, sy: 0.2, hw: 2.4, nsy: 0.27 }
];
let PA, PB, _m4, _up, _tq, _v3, raycaster, _ndc, svcIdx = -1, accStr = '';

function initTimeline() {
  $$('.ch').forEach(el => { CHS[el.dataset.ch] = el; });
  if (S.gl) {
    const mk = () => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), fov: 35, fo: 7, ap: 0.2, sx: 0, sy: 0 });
    PA = mk(); PB = mk(); _m4 = new THREE.Matrix4(); _up = new THREE.Vector3(0, 1, 0); _tq = new THREE.Quaternion(); _v3 = new THREE.Vector3();
    raycaster = new THREE.Raycaster(); _ndc = new THREE.Vector2();
  }
  $$('[data-jump]').forEach(b => b.addEventListener('click', () => jumpTo(+b.dataset.jump)));
  $$('#svc button').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.svc, span = (KF.scr[1] - KF.scr[0]) / 6;
    jumpTo(KF.scr[0] + span * (i + 0.35));
  }));
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1), el = document.getElementById(id);
    if (!el) return; e.preventDefault();
    const top = id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY + (id === 'work' ? 2 : 0);
    window.scrollTo({ top, behavior: RM ? 'auto' : 'smooth' });
  }));
}
function jumpTo(units) { window.scrollTo({ top: LAY.top + units * LAY.U, behavior: RM ? 'auto' : 'smooth' }); }

function measure() {
  const j = $('#journey');
  LAY.vh = $('#stage').offsetHeight || S.h;
  LAY.U = LAY.vh * UNIT;
  j.style.height = Math.round(KF.end * LAY.U + LAY.vh) + 'px';
  LAY.top = j.offsetTop;
  LAY.index = $('#index').offsetTop; LAY.work = $('#work').offsetTop; LAY.contact = $('#contact').offsetTop;
  LAY.doc = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
}

const stepT = (a, s) => eio(inv(a[0], a[1], s));
function chapterAt(s) {
  const k = KF;
  if (s < k.hero[1]) return 'hero';
  for (const n of ['d1', 'd2', 'demo', 'd3', 'ar', 'vr', 'mr']) if (s >= k[n][0] && s < k[n][1]) return n;
  return '';
}
function setChapter(ch) {
  const prev = S.ch; S.ch = ch;
  for (const n in CHS) CHS[n].classList.toggle('is-on', n === ch);
  $('#stage').classList.toggle('is-clear', ch === 'vr' || ch === 'mr' || ch === 'demo' || G.mode !== 'idle');
  if (prev !== '' && ch !== '' && S.ready) { S.pulse = Math.max(S.pulse, 0.7); snd('whoosh'); }
  if (ch === 'demo') demoShow();
}

function lookQ(eye, t, q) { _v3.set(t[0], t[1], t[2]); _m4.lookAt(eye, _v3, _up); q.setFromRotationMatrix(_m4); }
function getPose(i, o) {
  const asp = S.w / S.h, narrow = asp < 0.9;
  if (i === 3) {
    const sh = G.shake;
    o.p.set(G.x * 0.3 + (Math.random() - 0.5) * sh * 0.3, 0.5 + (Math.random() - 0.5) * sh * 0.3, 5.7);
    lookQ(o.p, [G.x * 0.45, -0.75, -6], o.q);
    o.fov = (narrow ? 66 : 50) + (G.speed - 6.5) * 0.45; o.fo = 8; o.ap = 0.03; o.sx = 0; o.sy = narrow ? 0.17 * G.sy : 0;
    return;
  }
  if (i === 4) { xrPose(o, _tq, lookQ); return; }
  const d = POSE[i];
  o.p.set(d.p[0], d.p[1], d.p[2]);
  if (d.hw) o.p.z = Math.max(o.p.z, d.hw / (Math.tan(d.fov * Math.PI / 360) * asp) * (narrow ? 0.82 : 1));
  const zk = o.p.z / d.p[2];
  o.p.x += (S.spx - 0.5) * 0.7; o.p.y -= (S.spy - 0.5) * 0.45;
  lookQ(o.p, d.t, o.q);
  o.fov = d.fov; o.fo = d.fo * zk; o.ap = d.ap * zk; o.sx = narrow ? 0 : d.sx; o.sy = narrow ? d.nsy : d.sy;
}

function updateRay() {
  if (!S.gl) return;
  applyCam(0, S.w / S.h, rtScene.height);
  _ndc.set(S.px * 2 - 1, -(S.py * 2 - 1));
  raycaster.setFromCamera(_ndc, camera);
  PU.uRayO.value.copy(raycaster.ray.origin); PU.uRayD.value.copy(raycaster.ray.direction);
}

function updateTimeline(dt) {
  const s = (S.sm - LAY.top) / LAY.U; S.s = s;
  const sj = clamp(s, 0, KF.end), k = KF;
  let T = stepT(k.m01, sj) + stepT(k.m12, sj) + stepT(k.m23, sj) + stepT(k.m34, sj) + stepT(k.m45, sj);
  T += ss(LAY.contact - LAY.vh * 1.15, LAY.contact - LAY.vh * 0.2, S.sm);
  S.T = T;

  const ch = !S.ready ? '' : (s > k.end + 0.15 ? '' : chapterAt(sj));
  if (ch !== S.ch) setChapter(ch);

  /* dimension gauge + labels */
  const inJ = s <= k.end + 0.4;
  const di = s < 1.3 ? 0 : s < 3.6 ? 1 : s < 8.5 ? 2 : s < 11.4 ? 3 : 4;
  let key, name;
  if (inJ) { key = DIMS[di][0]; name = DIMS[di][1]; }
  else if (S.sm < LAY.work - LAY.vh * 0.5) { key = '10'; name = 'Capabilities'; }
  else if (S.sm < LAY.contact - LAY.vh * 0.5) { key = '∞'; name = 'Selected work'; }
  else { key = '0D'; name = 'Back to the point'; }
  if (key + name !== S.hudKey) {
    S.hudKey = key + name; $('#hudk').textContent = key; $('#hudn').textContent = name;
    $$('#gauge button').forEach((b, i) => b.classList.toggle('is-on', inJ && i === di));
    if (inJ && S.dimIdx !== di) { S.dimIdx = di; sndDim(di); }
  }
  $('#gauge').classList.toggle('is-off', !inJ || S.ch === 'demo' || S.lens > 0.3);
  $('#hudbot').classList.toggle('is-off', !inJ);
  const pct = clamp(S.sm / LAY.doc);
  if (S.pctN !== Math.round(pct * 100)) { S.pctN = Math.round(pct * 100); $('#hudp').textContent = pad(S.pctN, 3); }
  $('#spec').style.setProperty('--p', pct.toFixed(4));

  /* accent colour follows the dimension */
  const i0 = Math.min(5, Math.floor(T)), f = T - i0, A = ACC[i0], B = ACC[i0 + 1];
  const acc = 'rgb(' + Math.round(lerp(A[0], B[0], f)) + ',' + Math.round(lerp(A[1], B[1], f)) + ',' + Math.round(lerp(A[2], B[2], f)) + ')';
  if (acc !== accStr) { accStr = acc; document.documentElement.style.setProperty('--accent', acc); }

  /* services list follows the wall */
  const sc = inv(k.scr[0], k.scr[1], s) * 6, si = Math.min(5, Math.floor(sc)), sf = si < 5 ? ss(0.8, 1.0, sc - si) : 0;
  WALL.idx = si; WALL.f = sf;
  const act = Math.min(5, sf > 0.5 ? si + 1 : si);
  if (act !== svcIdx) { svcIdx = act; $$('#svc button').forEach((b, i) => b.classList.toggle('is-on', i === act)); $('#svcd').textContent = SVC_D[act]; }

  /* stereo */
  const st = s > k.stereo[0] && s < k.stereo[1];
  S.lens = damp(S.lens, st ? 1 : 0, 4.5, dt); if (S.lens < 0.002) S.lens = 0;
  CHS.vr.classList.toggle('is-stereo', st);
  S.pulse = damp(S.pulse, 0, 4.2, dt); S.flash = damp(S.flash, 0, 5, dt);
  S.pv = damp(S.pv, 0, 3.5, dt);

  if (!S.gl) return;
  const demoK = ss(k.demo[0] - 0.12, k.demo[0] + 0.35, s) * (1 - ss(k.m23[0], k.m23[0] + 0.3, s));
  PU.uTime.value = S.time; PU.uT.value = T; PU.uIntro.value = S.intro;
  PU.uSub.value.set(ss(k.spread[0], k.spread[1], s), demoK * 0.4, ss(k.wrap[0], k.wrap[1], s), ss(k.room[0], k.room[1], s));
  PU.uWall.value.set(lerp(-0.5, -0.16, ss(3.3, 5.4, s)) - demoK * 0.16 + (S.spx - 0.5) * 0.1, 0.06 + (S.spy - 0.5) * 0.07, demoK * 5);
  PU.uScan.value = (S.time * 0.22) % 1.4;

  getPose(i0, PA);
  if (f > 0.001) {
    getPose(i0 + 1, PB);
    PA.p.lerp(PB.p, f); PA.q.slerp(PB.q, f);
    PA.fov = lerp(PA.fov, PB.fov, f); PA.fo = lerp(PA.fo, PB.fo, f); PA.ap = lerp(PA.ap, PB.ap, f); PA.sx = lerp(PA.sx, PB.sx, f); PA.sy = lerp(PA.sy, PB.sy, f);
  }
  CAMB.pos.copy(PA.p); CAMB.quat.copy(PA.q); CAMB.fov = PA.fov; CAMB.sx = PA.sx; CAMB.sy = PA.sy;
  PU.uFocus.value = lerp(PA.fo, PA.fo * 0.55, demoK); PU.uAperture.value = PA.ap + demoK * 0.5;

  /* pointer force field */
  updateRay();
  const base = T < 0.6 ? 0.5 : T < 1.6 ? 0.36 : T < 2.5 ? 0.14 * (1 - demoK) : T < 4.6 ? 0 : 0.45;
  PU.uRayF.value = damp(PU.uRayF.value, S.pin && !TOUCH ? base * (0.3 + Math.min(1, S.pv * 2.2)) : 0, 6, dt);

  /* background */
  const bg = MAT.bg.uniforms, ta = TINT[i0], tb = TINT[i0 + 1], ua = TINT2[i0], ub = TINT2[i0 + 1];
  bg.uTint.value.set(lerp(ta[0], tb[0], f), lerp(ta[1], tb[1], f), lerp(ta[2], tb[2], f));
  bg.uTint2.value.set(lerp(ua[0], ub[0], f), lerp(ua[1], ub[1], f), lerp(ua[2], ub[2], f));
  bg.uHorizon.value = clamp(1 - Math.abs(T - 3) * 1.7);
  bg.uGlow.value.set(CAMB.sx * (S.w / S.h), CAMB.sy);
  MAT.comp.uniforms.uBloom.value = 0.42 + S.pulse * 0.25;
  MAT.comp.uniforms.uCA.value = 0.004 + (RM ? 0 : Math.min(0.011, Math.abs(S.vy) * 0.0000035));
  MAT.comp.uniforms.uVig.value = lerp(0.6, 0.25, S.lens);
}
