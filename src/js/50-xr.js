/* ============================================================
   XR: AR placement, VR look-around (stereo), mixed-reality room
   ============================================================ */
const XR = {
  objs: [], kind: 0, count: 0, ret: null, retOn: 0, retOk: false, last: null, seeded: false, seedT: [],
  look: { yaw: 0, pitch: 0, ty: 0, tp: 0, drag: false, lx: 0, ly: 0, moved: 0 }, orbit: 0, torbit: 0,
  panels: [], props: [], geos: [], edges: [], discGeo: null, tag: null, hit: null
};
const HOLO = [
  { n: 'Chair', dim: '0.5 × 0.9 m', c: '#a98bff', top: 1.25 },
  { n: 'Table', dim: 'Ø 1.2 m', c: '#35e0ff', top: 0.95 },
  { n: 'Lamp', dim: '1.7 m tall', c: '#ffc83d', top: 1.9 },
  { n: 'Plant', dim: '1.0 m tall', c: '#59e39b', top: 1.2 }
];
const SLOTS = [[1.3, -4.3], [2.7, -3.7], [3.7, -4.9], [0.0, -5.0], [-1.7, -4.7], [2.3, -2.7], [-3.3, -4.5], [3.9, -3.0], [-2.7, -3.1], [0.9, -3.1]];

function initXR() {
  XR.tag = $('#artag');
  if (TOUCH) { const h = $('.ch--ar .hint'); if (h) h.textContent = 'Tap the floor to place'; }
  if (!S.gl) return;
  const M = (x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
  const B = () => new THREE.BoxGeometry(1, 1, 1), CY = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);
  XR.geos = [
    mergeGeos([[B(), M(0, 0.46, 0, 0.52, 0.06, 0.52)], [B(), M(0, 0.80, -0.23, 0.52, 0.62, 0.06)], [B(), M(-0.22, 0.215, -0.22, 0.06, 0.43, 0.06)], [B(), M(0.22, 0.215, -0.22, 0.06, 0.43, 0.06)], [B(), M(-0.22, 0.215, 0.22, 0.06, 0.43, 0.06)], [B(), M(0.22, 0.215, 0.22, 0.06, 0.43, 0.06)]]),
    mergeGeos([[CY(0.62, 0.62, 0.05, 32), M(0, 0.74, 0)], [CY(0.05, 0.05, 0.7, 12), M(0, 0.37, 0)], [CY(0.3, 0.34, 0.04, 24), M(0, 0.02, 0)]]),
    mergeGeos([[CY(0.2, 0.22, 0.03, 24), M(0, 0.015, 0)], [CY(0.018, 0.018, 1.45, 8), M(0, 0.75, 0)], [CY(0.13, 0.27, 0.32, 24), M(0, 1.55, 0)]]),
    mergeGeos([[CY(0.2, 0.14, 0.32, 20), M(0, 0.16, 0)]].concat([[0, 0.62, 0, 0.26], [0.16, 0.5, 0.08, 0.18], [-0.15, 0.52, -0.06, 0.19], [0.02, 0.86, 0.04, 0.17], [-0.08, 0.7, 0.14, 0.15]].map(s => [new THREE.IcosahedronGeometry(s[3], 0), M(s[0], s[1], s[2])])))
  ];
  XR.edges = XR.geos.map(g => new THREE.EdgesGeometry(g, 24));
  XR.discGeo = new THREE.PlaneGeometry(1, 1);

  /* reticle */
  const rm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 3.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide });
  const ret = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.37, 56), rm); ring.rotation.x = -Math.PI / 2; ret.add(ring);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), rm); dot.rotation.x = -Math.PI / 2; ret.add(dot);
  for (let i = 0; i < 4; i++) { const tk = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.025), rm); tk.rotation.x = -Math.PI / 2; tk.rotation.z = i * Math.PI / 2; tk.position.set(Math.cos(i * Math.PI / 2) * 0.5, 0, -Math.sin(i * Math.PI / 2) * 0.5); ret.add(tk); }
  ret.visible = false; ret.position.y = -1.49; world.add(ret); XR.ret = ret; XR.hit = new THREE.Vector3();

  /* VR: a ring of floating forms to stand among */
  const PG = [new THREE.IcosahedronGeometry(1, 0), new THREE.OctahedronGeometry(1, 0), new THREE.TorusKnotGeometry(0.72, 0.2, 72, 8), new THREE.DodecahedronGeometry(1, 0), new THREE.TorusGeometry(0.85, 0.3, 8, 22)];
  const PC = ['#a98bff', '#35e0ff', '#ff6a3d', '#ffc83d', '#59e39b', '#ff5da8'];
  for (let i = 0; i < 10; i++) {
    const geo = PG[i % 5], col = hdr(PC[i % 6]), grp = new THREE.Group();
    grp.add(new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(col.r * 1.3, col.g * 1.3, col.b * 1.3) }, uTime: PU.uTime }, vertexShader: GL_HOLO_V, fragmentShader: GL_HOLO_F })));
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: new THREE.Color(col.r * 2.6, col.g * 2.6, col.b * 2.6) })));
    const a = i / 10 * 6.2832 + 0.3, r = 4.6 + (i % 3) * 1.1;
    grp.position.set(Math.sin(a) * r, -0.9 + ((i * 37) % 5) * 0.55, -Math.cos(a) * r);
    grp.userData = { s: 0.62 + (i % 4) * 0.2, sp: 0.14 + (i % 3) * 0.09, y: grp.position.y, ph: i * 1.3 };
    grp.visible = false; world.add(grp); XR.props.push(grp);
  }

  /* mixed-reality wall panels */
  [{ s: 5, w: 4.3, h: 2.87, p: [0, 0.22, -5.52], ry: 0 }, { s: 3, w: 3.1, h: 2.07, p: [-4.52, 0.15, -1.5], ry: Math.PI / 2 }, { s: 2, w: 3.1, h: 2.07, p: [4.52, 0.15, -2.0], ry: -Math.PI / 2 }].forEach((d, i) => {
    const cv = document.createElement('canvas'); cv.width = 720; cv.height = 480;
    const ctx = cv.getContext('2d'); ctx.setTransform(2, 0, 0, 2, 0, 0); const k = kit(ctx); SCREENS[d.s](k, 3 + i);
    const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), new THREE.ShaderMaterial({ uniforms: { tMap: { value: tex }, uReveal: { value: 0 }, uTime: PU.uTime, uAsp: { value: d.w / d.h } }, vertexShader: GL_DISC_V, fragmentShader: GL_PANEL_F }));
    m.position.set(d.p[0], d.p[1], d.p[2]); m.rotation.y = d.ry; m.visible = false; world.add(m);
    XR.panels.push({ m, k, tex, s: d.s, acc: 0, rev: 0, delay: i * 0.18 });
  });

  /* input */
  const bind = (el, mode) => {
    el.style.touchAction = 'pan-y';
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('button,a,.seg')) return;
      const L = XR.look; L.drag = true; L.lx = e.clientX; L.ly = e.clientY; L.moved = 0;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });
    el.addEventListener('pointermove', e => {
      const L = XR.look; if (!L.drag) return;
      const dx = e.clientX - L.lx, dy = e.clientY - L.ly; L.lx = e.clientX; L.ly = e.clientY; L.moved += Math.abs(dx) + Math.abs(dy);
      if (mode === 'ar') XR.torbit -= dx * 0.005;
      else { L.ty += dx * 0.0042; L.tp = clamp(L.tp + dy * 0.003, -0.9, 0.9); }
    });
    const up = e => {
      const L = XR.look; if (!L.drag) return; L.drag = false;
      if (mode === 'ar' && L.moved < 7 && e.type === 'pointerup') { S.px = e.clientX / S.w; S.py = e.clientY / S.h; updateRay(); xrHitTest(); arPlaceAtReticle(); }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  bind($('.ch--ar'), 'ar'); bind($('.ch--vr'), 'vr'); bind($('.ch--mr'), 'mr');
  $$('#arobj button').forEach(b => b.addEventListener('click', () => { XR.kind = +b.dataset.obj; $$('#arobj button').forEach(o => o.classList.toggle('is-on', o === b)); snd('tick'); }));
  $('#arclear').addEventListener('click', () => { XR.objs.forEach(o => world.remove(o.g)); XR.objs = []; XR.last = null; snd('drop'); });
}

function arPlace(x, z, kind, rot) {
  if (XR.objs.length >= 10) { const old = XR.objs.shift(); world.remove(old.g); }
  const col = hdr(HOLO[kind].c);
  const body = new THREE.Mesh(XR.geos[kind], new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(col.r * 1.7, col.g * 1.7, col.b * 1.7) }, uTime: PU.uTime }, vertexShader: GL_HOLO_V, fragmentShader: GL_HOLO_F }));
  const edges = new THREE.LineSegments(XR.edges[kind], new THREE.LineBasicMaterial({ color: new THREE.Color(col.r * 3.2, col.g * 3.2, col.b * 3.2) }));
  const disc = new THREE.Mesh(XR.discGeo, new THREE.ShaderMaterial({ uniforms: { uCol: { value: col }, uA: { value: 1 }, uRing: { value: 0.1 } }, vertexShader: GL_DISC_V, fragmentShader: GL_DISC_F, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.012; disc.scale.setScalar(1.9);
  const g = new THREE.Group(), inner = new THREE.Group(); inner.add(body, edges); g.add(inner, disc); world.add(g);
  const o = { g, inner, disc, kind, born: S.time, ar: new THREE.Vector3(x, -1.5, z), rot: rot === undefined ? Math.random() * 6.28 : rot, i: XR.count++ };
  XR.objs.push(o); XR.last = o;
  return o;
}
function arPlaceAtReticle() {
  if (!XR.retOk) return;
  arPlace(XR.hit.x, XR.hit.z, XR.kind); snd('place'); S.pulse = Math.max(S.pulse, 0.25);
}
function xrHitTest() {
  const ro = PU.uRayO.value, rd = PU.uRayD.value;
  XR.retOk = false;
  if (rd.y < -0.02) {
    const t = (-1.5 - ro.y) / rd.y;
    XR.hit.set(ro.x + rd.x * t, -1.5, ro.z + rd.z * t);
    XR.retOk = Math.hypot(XR.hit.x, XR.hit.z) < 7.5;
  }
}
function xrPose(out, tmpQ, lookQ) {
  const w = PU.uSub.value.z, ww = w * w * (3 - 2 * w), rm = PU.uSub.value.w;
  const o = XR.orbit + Math.sin(S.time * 0.12) * 0.14, narrow = S.w / S.h < 0.9, dist = narrow ? 12 : 6.7;
  out.p.set(Math.sin(o) * dist, narrow ? 2.9 : 1.3, Math.cos(o) * dist);
  lookQ(out.p, [0, narrow ? -0.6 : -1.15, 0], out.q);
  const L = XR.look;
  tmpQ.setFromEuler(new THREE.Euler(L.pitch + (0.5 - S.spy) * 0.26, L.yaw + (0.5 - S.spx) * 0.42, 0, 'YXZ'));
  out.p.multiplyScalar(1 - ww); out.q.slerp(tmpQ, ww);
  out.fov = lerp(40, lerp(60, 56, rm), ww) + (narrow ? 14 * ww : 0);
  out.fo = lerp(narrow ? 12.2 : 6.9, 6, ww); out.ap = lerp(0.14, 0.05, ww);
  out.sx = narrow ? 0 : 0.1 * (1 - ww); out.sy = narrow ? 0.1 * (1 - ww) : 0;
}

const _pv = { v: null };
function updateXR(dt) {
  if (!S.gl) return;
  const on = S.T > 3.35 && S.T < 4.65, w = PU.uSub.value.z, ww = w * w * (3 - 2 * w), rm = PU.uSub.value.w, L = XR.look;
  L.yaw = damp(L.yaw, L.ty, 9, dt); L.pitch = damp(L.pitch, L.tp, 9, dt); XR.orbit = damp(XR.orbit, XR.torbit, 6, dt);
  if (!L.drag && (S.ch === 'vr' || S.ch === 'mr') && !RM) L.ty += dt * (S.ch === 'vr' ? 0.05 : 0.012);
  if (S.ch !== 'vr' && S.ch !== 'mr' && S.ch !== 'ar' && !on) { L.ty = L.tp = 0; }
  if (S.ch === 'mr' && !L.drag) {          // ease back towards the front wall
    const base = Math.round(L.ty / 6.2832) * 6.2832;
    L.ty = damp(L.ty, base + clamp(L.ty - base, -0.3, 0.3), 2.4, dt); L.tp = damp(L.tp, clamp(L.tp, -0.2, 0.2), 2.4, dt);
  }

  /* seed a few objects the first time AR opens */
  if (S.ch === 'ar' && !XR.seeded) { XR.seeded = true; XR.seedT = [[0.5, 0.15, -0.5, 1, 0], [1.0, -1.25, 0.35, 0, 1.2], [1.5, 1.75, -1.5, 2, 0], [2.0, -2.3, -1.6, 3, 0]]; }
  for (let i = XR.seedT.length - 1; i >= 0; i--) { const sd = XR.seedT[i]; sd[0] -= dt; if (sd[0] <= 0) { arPlace(sd[1], sd[2], sd[3], sd[4]); snd('place'); XR.seedT.splice(i, 1); } }

  XR.objs.forEach((o, idx) => {
    o.g.visible = on; if (!on) return;
    const age = S.time - o.born, sc = eob(clamp(age / 0.6)), fl = ww * (1 - rm);
    const a = o.i * 2.4 + S.time * 0.06, sl = SLOTS[idx % SLOTS.length];
    let x = lerp(o.ar.x, Math.cos(a) * 4.4, ww), y = lerp(o.ar.y, -0.7 + Math.sin(o.i * 1.7) * 0.9, ww), z = lerp(o.ar.z, Math.sin(a) * 4.4, ww);
    x = lerp(x, sl[0], rm); y = lerp(y, -1.55, rm); z = lerp(z, sl[1], rm);
    o.g.position.set(x, y, z);
    o.inner.scale.setScalar(Math.max(0.001, sc) * lerp(1, 0.8, fl));
    o.inner.rotation.set(fl * Math.sin(S.time * 0.4 + o.i) * 0.5, o.rot + fl * S.time * 0.3, 0);
    o.disc.material.uniforms.uA.value = clamp((1 - ww) + rm) * clamp(age * 3);
    o.disc.material.uniforms.uRing.value = 0.1 + 0.8 * (1 - Math.pow(1 - clamp(age / 0.9), 3));
  });

  const pk = on ? ww * (1 - rm) : 0;
  XR.props.forEach(g => {
    g.visible = pk > 0.01; if (!g.visible) return;
    const d = g.userData; g.scale.setScalar(d.s * pk * pk * (3 - 2 * pk));
    g.rotation.x += dt * d.sp * 0.7; g.rotation.y += dt * d.sp; g.position.y = d.y + Math.sin(S.time * 0.5 + d.ph) * 0.18;
  });

  /* reticle + tag */
  const arOn = S.ch === 'ar' && w < 0.05 && !TOUCH;
  if (arOn) xrHitTest();
  XR.retOn = damp(XR.retOn, arOn && XR.retOk && S.pin && !XR.look.drag ? 1 : 0, 12, dt);
  XR.ret.visible = XR.retOn > 0.02 && on;
  if (XR.ret.visible) {
    XR.ret.position.x = damp(XR.ret.position.x, XR.hit.x, 22, dt); XR.ret.position.z = damp(XR.ret.position.z, XR.hit.z, 22, dt);
    const s = XR.retOn * (1 + Math.sin(S.time * 4) * 0.05); XR.ret.scale.set(s, s, s); XR.ret.rotation.y = S.time * 0.6;
  }
  const o = XR.last;
  if (o && S.ch === 'ar' && w < 0.05 && S.time - o.born < 3.2) {
    if (!_pv.v) _pv.v = new THREE.Vector3();
    _pv.v.set(o.ar.x, -1.5 + HOLO[o.kind].top, o.ar.z).project(camera);
    XR.tag.textContent = HOLO[o.kind].n + ' · ' + HOLO[o.kind].dim;
    XR.tag.style.transform = 'translate(' + ((_pv.v.x * 0.5 + 0.5) * S.w).toFixed(1) + 'px,' + ((-_pv.v.y * 0.5 + 0.5) * S.h).toFixed(1) + 'px) translate(-50%,-140%)';
    XR.tag.classList.add('is-on');
  } else XR.tag.classList.remove('is-on');

  /* panels */
  XR.panels.forEach((p, i) => {
    const tgt = on && rm > 0.75 ? 1 : 0;
    p.rev = damp(p.rev, tgt, tgt ? 2.2 : 6, Math.max(0, dt - (tgt && p.rev < 0.01 ? 0 : 0)));
    const r = clamp(p.rev * 1.25 - p.delay);
    p.m.visible = r > 0.01; p.m.material.uniforms.uReveal.value = r;
    if (p.m.visible && i === 0) { p.acc += dt; if (p.acc > 0.1) { p.acc = 0; SCREENS[p.s](p.k, S.time); p.tex.needsUpdate = true; } }
  });
}
