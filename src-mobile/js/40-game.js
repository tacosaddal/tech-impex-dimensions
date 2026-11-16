/* ============================================================
   3D: a small arcade run over the particle terrain
   ============================================================ */
const G = {
  mode: 'idle', score: 0, best: store.get('ti_best', 0), lives: 3, time: 30, speed: 6.5, x: 0, tx: 0,
  travel: 0, spawn: 6, inv: 0, shake: 0, combo: 1, keys: 0, lane: 2, cd: 0, idleT: 0, shown: -1, sy: 1,
  pyl: [], orb: [], ship: null, pm: null, om: null, glow: null, dummy: null, el: {}
};
const LANES = [-2.4, -1.2, 0, 1.2, 2.4];

function initGame() {
  ['gplay', 'ghud', 'gscore', 'gtime', 'glives', 'gmsg', 'gover', 'gwhy', 'gfinal', 'gbest', 'gagain', 'gexit', 'gquit'].forEach(id => { G.el[id] = $('#' + id); });
  if (TOUCH) { const kh = $('.ch--d3 .keys'); if (kh) kh.textContent = 'Drag to steer'; }
  if (S.gl) $('#pcount').textContent = (GRID.x * GRID.y).toLocaleString('en-GB'); else $('#pstat').hidden = true;
  if (!S.gl) { G.el.gplay.disabled = true; G.el.gplay.textContent = 'Demo needs WebGL'; return; }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.66, -0.48, 0, 0.36, 0, 0, 0.14, 0.48, 0, 0.36, 0, 0.16, 0.1], 3));
  g.setIndex([0, 2, 1, 0, 3, 2, 0, 1, 4, 0, 4, 3, 1, 2, 4, 2, 3, 4]); g.computeVertexNormals();
  const ship = new THREE.Group();
  ship.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x020406, side: THREE.DoubleSide })));
  ship.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 1), new THREE.LineBasicMaterial({ color: new THREE.Color(1.2, 3.4, 4.0) })));
  G.glow = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(0.25, 1.5, 2.2) }, uA: { value: 1 } }, vertexShader: GL_DISC_V, fragmentShader: GL_GLOW_F, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.9), G.glow);
  glow.rotation.x = Math.PI / 2; glow.position.set(0, 0.03, 1.2); ship.add(glow);
  ship.visible = false; world.add(ship); G.ship = ship;

  const pm = new THREE.ShaderMaterial({ uniforms: { uCol: { value: new THREE.Color(3.0, 0.3, 0.95) } }, vertexShader: GL_PYLON_V, fragmentShader: GL_PYLON_F });
  G.pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), pm, 26); G.pm.frustumCulled = false; G.pm.visible = false; world.add(G.pm);
  G.om = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.14, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 1.6, 0.4) }), 24);
  G.om.frustumCulled = false; G.om.visible = false; world.add(G.om);
  for (let i = 0; i < 26; i++) G.pyl.push({ on: false, x: 0, z: 0, w: 0.76, h: 2.2 });
  for (let i = 0; i < 24; i++) G.orb.push({ on: false, x: 0, z: 0, ph: Math.random() * 6 });
  G.dummy = new THREE.Object3D();

  G.el.gplay.addEventListener('click', gameStart);
  G.el.gagain.addEventListener('click', gameStart);
  G.el.gexit.addEventListener('click', gameExit);
  G.el.gquit.addEventListener('click', gameExit);
  window.addEventListener('keydown', e => {
    if (G.mode === 'idle') return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') G.keys = -1;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') G.keys = 1;
    else if (e.key === 'Escape') gameExit();
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key) && !e.target.closest('button')) e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && G.keys < 0) G.keys = 0;
    if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && G.keys > 0) G.keys = 0;
  });
  window.addEventListener('pointermove', e => { if (G.mode === 'play' || G.mode === 'count') G.tx = clamp(((e.clientX - DR.left) / S.w - 0.5) * 2 * 3.0, -2.7, 2.7); });
}

function gameClear() { G.pyl.forEach(p => { p.on = false; }); G.orb.forEach(o => { o.on = false; }); }
function gameMsg(t) { const m = G.el.gmsg; m.textContent = t; m.classList.remove('is-pop'); void m.offsetWidth; if (t) m.classList.add('is-pop'); }
function gameLives() { $$('i', G.el.glives).forEach((el, i) => el.classList.toggle('is-off', i >= G.lives)); }

function gameStart() {
  gameClear();
  if (G.mode === 'idle') lockScroll(true);
  G.mode = 'count'; G.cd = 2.4; G.shown = -1; G.score = 0; G.lives = 3; G.time = 30; G.combo = 1; G.inv = 0; G.spawn = 10; G.lane = 2; G.tx = 0;
  G.el.ghud.hidden = false; G.el.gover.hidden = true; G.el.gquit.hidden = false;
  G.el.gscore.textContent = '0'; G.el.gtime.textContent = '30.0'; gameLives();
  document.body.classList.add('is-game'); $('.ch--d3').classList.add('is-play'); $('#stage').classList.add('is-clear');
  snd('whoosh');
}
function gameOver(why) {
  G.mode = 'over';
  const sc = Math.round(G.score);
  if (sc > G.best) { G.best = sc; store.set('ti_best', sc); }
  G.el.gwhy.textContent = why; G.el.gfinal.textContent = sc.toLocaleString('en-GB'); G.el.gbest.textContent = 'Best ' + G.best.toLocaleString('en-GB');
  G.el.gover.hidden = false; G.el.gquit.hidden = true; gameMsg('');
  snd(why === 'Run complete' ? 'win' : 'hit');
  setTimeout(() => { if (G.mode === 'over') G.el.gagain.focus({ preventScroll: true }); }, 60);
}
function gameExit() {
  if (G.mode === 'idle') return;
  G.mode = 'idle'; G.keys = 0; gameClear(); gameMsg(''); lockScroll(false);
  G.el.ghud.hidden = true;
  document.body.classList.remove('is-game'); $('.ch--d3').classList.remove('is-play'); $('#stage').classList.remove('is-clear');
}
function gameHit() {
  G.lives--; G.inv = 1.1; G.combo = 1; G.shake = 0.55; S.flash = 0.55; S.pulse = 1; gameLives(); snd('hit');
  if (G.lives <= 0) gameOver('Shields down');
}
function gameRow() {
  const diff = clamp(1 - G.time / 30), prev = G.lane;
  G.lane = clamp(G.lane + pick(diff > 0.5 ? [-1, -1, 1, 1, 0] : [-2, -1, -1, 1, 1, 2]), 0, 4);
  const cand = [0, 1, 2, 3, 4].filter(i => i !== G.lane).sort(() => Math.random() - 0.5);
  const n = diff > 0.55 ? 3 : (Math.random() < 0.45 ? 3 : 2);
  for (let i = 0; i < n; i++) { const p = G.pyl.find(q => !q.on); if (p) { p.on = true; p.x = LANES[cand[i]]; p.z = -46; p.h = 1.5 + Math.random() * 1.7; } }
  for (let j = 0; j < 3; j++) { const o = G.orb.find(q => !q.on); if (o) { o.on = true; o.x = lerp(LANES[prev], LANES[G.lane], (j + 1) / 3); o.z = -46 + (2 - j) * 2.3; } }
}

function updateGame(dt) {
  if (!S.gl) return;
  const vis = S.T > 2.3 && S.T < 3.7, playing = G.mode === 'play';
  if (G.mode !== 'idle' && S.ch !== 'd3') gameExit();
  const target = playing ? lerp(14, 22, clamp(1 - G.time / 30)) : G.mode === 'count' ? 11 : G.mode === 'over' ? 3.5 : 6.5;
  G.speed = damp(G.speed, target, 2.2, dt);
  G.travel += G.speed * dt; PU.uTravel.value = G.travel;
  G.ship.visible = G.pm.visible = G.om.visible = vis;
  G.shake = damp(G.shake, 0, 6, dt); G.inv -= dt; G.sy = damp(G.sy, G.mode === 'idle' ? 1 : 0, 4, dt);
  if (!vis) return;

  if (G.mode === 'idle' || G.mode === 'over') G.tx = (S.spx - 0.5) * 2 * 2.3;
  else if (G.keys) G.tx = clamp(G.tx + G.keys * dt * 8, -2.7, 2.7);
  G.x = damp(G.x, G.tx, playing ? 12 : 4, dt);
  const lean = clamp((G.tx - G.x) * 0.9, -0.9, 0.9), arrive = ss(2.45, 2.95, S.T) * (1 - ss(3.15, 3.6, S.T));
  G.ship.position.set(G.x, -1.02 + Math.sin(S.time * 2.2) * 0.04, 0.2 + (1 - arrive) * 9);
  G.ship.rotation.set(0, -lean * 0.25, -lean * 0.75);
  G.ship.visible = arrive > 0.01 && !(G.inv > 0 && Math.floor(S.time * 14) % 2 === 0);
  G.glow.uniforms.uA.value = 0.3 + G.speed * 0.045 + Math.random() * 0.12;

  if (G.mode === 'count') {
    G.cd -= dt; const n = Math.ceil(G.cd / 0.8);
    if (n !== G.shown && n > 0) { G.shown = n; gameMsg(String(n)); snd('tick'); }
    if (G.cd <= 0) { G.mode = 'play'; gameMsg('Go'); snd('place'); setTimeout(() => { if (G.mode === 'play') gameMsg(''); }, 650); }
  } else if (playing) {
    G.time -= dt; G.score += G.speed * dt * 2.2;
    G.spawn -= G.speed * dt;
    if (G.spawn <= 0) { gameRow(); G.spawn = lerp(13, 10, clamp(1 - G.time / 30)); }
    G.el.gtime.textContent = Math.max(0, G.time).toFixed(1);
    G.el.gscore.textContent = Math.round(G.score).toLocaleString('en-GB');
    if (G.time <= 0) gameOver('Run complete');
  } else if (G.mode === 'idle') {
    G.idleT -= dt;
    if (G.idleT <= 0) { G.idleT = 1.6 + Math.random() * 1.4; const l = pick(LANES); for (let j = 0; j < 3; j++) { const o = G.orb.find(q => !q.on); if (o) { o.on = true; o.x = l; o.z = -46 - j * 2.2; } } }
  }

  const d = G.dummy; let pi = 0, oi = 0;
  for (const p of G.pyl) {
    if (!p.on) continue;
    p.z += G.speed * dt; if (p.z > 6) { p.on = false; continue; }
    if (playing && G.inv <= 0 && Math.abs(p.z - 0.2) < 0.62 && Math.abs(p.x - G.x) < 0.62) { p.on = false; gameHit(); continue; }
    d.position.set(p.x, -1.75 + p.h / 2, p.z); d.scale.set(p.w, p.h, p.w); d.rotation.set(0, 0, 0); d.updateMatrix(); G.pm.setMatrixAt(pi++, d.matrix);
  }
  G.pm.count = pi; G.pm.instanceMatrix.needsUpdate = true;
  for (const o of G.orb) {
    if (!o.on) continue;
    o.z += G.speed * dt; if (o.z > 6) { o.on = false; if (playing) G.combo = 1; continue; }
    if (Math.abs(o.z - 0.2) < 0.7 && Math.abs(o.x - G.x) < 0.62 && G.mode !== 'over') {
      o.on = false;
      if (playing) { G.score += 100 * G.combo; G.combo = Math.min(G.combo + 1, 6); snd('orb'); S.flash = Math.max(S.flash, 0.06); }
      continue;
    }
    const sc = 1 + Math.sin(S.time * 5 + o.ph) * 0.15;
    d.position.set(o.x, -0.98 + Math.sin(S.time * 3 + o.ph) * 0.08, o.z); d.scale.set(sc, sc, sc); d.rotation.set(S.time * 2, S.time * 1.4 + o.ph, 0); d.updateMatrix(); G.om.setMatrixAt(oi++, d.matrix);
  }
  G.om.count = oi; G.om.instanceMatrix.needsUpdate = true;
}
