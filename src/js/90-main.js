/* ============================================================
   MAIN
   ============================================================ */
let _rz = 0, _last = 0;
function layout() {
  const cv = $('#gl');
  S.w = (S.gl && cv.clientWidth) || document.documentElement.clientWidth || innerWidth;
  S.h = (S.gl && cv.clientHeight) || innerHeight;
  if (S.gl) resizeGL();
  sizeWork(); measure();
  if (DM.ok && DM.tab === 2) sizeChart();
}
function frame(ms) {
  requestAnimationFrame(frame);
  const now = ms / 1000, raw = _last ? now - _last : 0.016; _last = now;
  const dt = Math.min(raw, DBG && DBG.fast ? 0.6 : 0.05); S.dt = dt; S.time += dt * (RM ? 0.35 : 1);
  S.y = window.scrollY;
  const _ps = S.sm;
  S.sm = (Math.abs(S.y - S.sm) < 0.05 || (DBG && DBG.snap)) ? S.y : damp(S.sm, S.y, RM ? 60 : 8.5, dt);
  S.vy = damp(S.vy, (S.sm - _ps) / Math.max(dt, 0.001), 6, dt);
  runTweens(dt); updateLoader(dt); updateCursor(dt);
  updateTimeline(dt);
  updateWall(dt, S.T > 1.02 && S.T < 2.98);
  updateGame(dt); updateXR(dt); updateDemo(dt); updateWork(dt);
  if (S.gl) { renderGL(WORK.vis > 0); adaptQuality(raw); }
}
function boot() {
  S.gl = initGL();
  document.documentElement.classList.toggle('no-gl', !S.gl);
  document.documentElement.classList.toggle('gl-on', S.gl);
  loadStep(20);
  initWall(); drawWall(); initTimeline(); initGame(); initXR(); loadStep(45);
  initDemo(); initWork(); initUI(); loadStep(70);
  layout();
  window.addEventListener('resize', () => { clearTimeout(_rz); _rz = setTimeout(layout, 120); });
  if (S.gl) { try { renderer.compile(world, camera); } catch (e) {} }
  loadStep(85);
  const go = () => { layout(); drawWall(); loadStep(100); };
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1800))]).then(go, go); else go();
  if (DBG) { window.__S = S; window.__G = G; window.__X = XR; window.__L = LAY; }
  requestAnimationFrame(frame);
}
boot();
