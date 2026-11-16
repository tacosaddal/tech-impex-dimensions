/* ============================================================
   ENGINE: renderer, HDR pipeline (bloom, lens, grain), particles
   ============================================================ */
let renderer, HDR = false, rtScene, bloom = [], fsScene, fsCam, fsMesh, world, camera, pts, PU, uiScene, uiCam;
const MAT = {};
let GRID = { x: 360, y: 240 };
const CAMB = { pos: null, quat: null, fov: 35, sx: 0, sy: 0, ipd: 0.34 };   // camera state computed by the timeline
let _right;

function makeRT(w, h, depth) {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type: HDR ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth, stencilBuffer: false
  });
  rt.texture.generateMipmaps = false;
  return rt;
}

function initGL() {
  if (!window.THREE) return false;
  const canvas = $('#gl');
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
  } catch (e) { return false; }
  const cap = renderer.capabilities, ext = renderer.extensions;
  HDR = cap.isWebGL2 ? !!(ext.get('EXT_color_buffer_float') || ext.get('EXT_color_buffer_half_float'))
    : !!(ext.get('OES_texture_half_float') && ext.get('OES_texture_half_float_linear') && ext.get('EXT_color_buffer_half_float'));
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 1);

  S.tier = (window.__Q !== undefined) ? window.__Q : ((TOUCH || Math.min(S.w, S.h) < 620) ? 0 : 1);
  GRID = S.tier ? { x: 360, y: 240 } : { x: 216, y: 144 };
  S.dpr = Math.min(window.devicePixelRatio || 1, S.tier ? 1.75 : 1.5);
  if (DBG && DBG.dpr) S.dpr = DBG.dpr;

  CAMB.pos = new THREE.Vector3(0, 0, 7.2); CAMB.quat = new THREE.Quaternion(); _right = new THREE.Vector3();
  world = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, S.w / S.h, 0.1, 140);
  fsScene = new THREE.Scene();
  fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  fsMesh = new THREE.Mesh(tri, null); fsMesh.frustumCulled = false; fsScene.add(fsMesh);
  uiScene = new THREE.Scene();
  uiCam = new THREE.OrthographicCamera(0, S.w, 0, -S.h, -10, 10);

  const fsm = (frag, uniforms, add) => new THREE.ShaderMaterial({
    uniforms, vertexShader: GL_FS_V, fragmentShader: frag, depthTest: false, depthWrite: false,
    blending: add ? THREE.AdditiveBlending : THREE.NoBlending
  });
  const V2 = () => new THREE.Vector2(), V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  MAT.bg = fsm(GL_BG_F, { uTime: { value: 0 }, uHorizon: { value: 0 }, uAspect: { value: 1 }, uTint: { value: V3(1, 1, 1) }, uTint2: { value: V3(.3, .3, 1) }, uGlow: { value: V2() } });
  MAT.pre = fsm(GL_PRE_F, { tMap: { value: null }, uTexel: { value: V2() }, uThr: { value: HDR ? 0.8 : 0.5 }, uKnee: { value: 0.5 } });
  MAT.down = fsm(GL_DOWN_F, { tMap: { value: null }, uTexel: { value: V2() } });
  MAT.up = fsm(GL_UP_F, { tMap: { value: null }, uTexel: { value: V2() }, uW: { value: 1 } }, true);
  MAT.comp = fsm(GL_COMP_F, {
    tScene: { value: null }, tBloom: { value: null }, uRes: { value: V2() }, uTime: { value: 0 },
    uBloom: { value: 0.42 }, uCA: { value: 0.004 }, uVig: { value: 0.6 }, uGrain: { value: 0.04 },
    uPulse: { value: 0 }, uLens: { value: 0 }, uFade: { value: 1 }, uExp: { value: 1.05 }, uFlash: { value: 0 }, uSV: { value: 0 }, uFlashCol: { value: V3(1, .18, .3) }
  });

  /* particles */
  const N = GRID.x * GRID.y;
  const uv = new Float32Array(N * 2), rn = new Float32Array(N * 4), ps = new Float32Array(N * 3);
  let k = 0;
  for (let y = 0; y < GRID.y; y++) for (let x = 0; x < GRID.x; x++) {
    uv[k * 2] = (x + .5) / GRID.x; uv[k * 2 + 1] = (y + .5) / GRID.y;
    rn[k * 4] = Math.random(); rn[k * 4 + 1] = Math.random(); rn[k * 4 + 2] = Math.random(); rn[k * 4 + 3] = Math.random();
    k++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(ps, 3));
  g.setAttribute('aUV', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aRnd', new THREE.BufferAttribute(rn, 4));
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat); blank.needsUpdate = true;
  PU = {
    uTime: { value: 0 }, uT: { value: 0 }, uIntro: { value: 0 }, uProj: { value: 1000 }, uTravel: { value: 0 },
    uFocus: { value: 7 }, uAperture: { value: 0.2 }, uSize: { value: 0.02 }, uMaxPx: { value: 56 }, uTurb: { value: 1.5 },
    uScan: { value: 0 }, uRayR: { value: 0.7 }, uRayF: { value: 0 }, uGain: { value: 1 }, uDens: { value: S.tier ? 0.5 : 1 },
    uSub: { value: new THREE.Vector4(0, 0, 0, 0) }, uWall: { value: V3(-0.5, 0.05, 0) },
    uRayO: { value: V3(0, 0, 10) }, uRayD: { value: V3(0, 0, -1) }, uXRC: { value: V3() },
    uGrid: { value: new THREE.Vector2(GRID.x, GRID.y) }, uScreen: { value: blank }
  };
  pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: PU, vertexShader: GL_PART_V, fragmentShader: GL_PART_F,
    blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false, transparent: true
  }));
  pts.frustumCulled = false; pts.renderOrder = 10; world.add(pts);

  resizeGL();
  return true;
}

function resizeGL() {
  if (!renderer) return;
  const w = S.w, h = S.h;
  renderer.setPixelRatio(S.dpr); renderer.setSize(w, h, false);
  const W = Math.max(2, Math.floor(w * S.dpr)), H = Math.max(2, Math.floor(h * S.dpr));
  if (rtScene) rtScene.dispose();
  rtScene = makeRT(W, H, true);
  bloom.forEach(b => b.dispose()); bloom = [];
  let bw = W, bh = H; const L = S.tier ? 5 : 4;
  for (let i = 0; i < L; i++) { bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1); bloom.push(makeRT(bw, bh, false)); }
  MAT.comp.uniforms.uRes.value.set(W, H);
  PU.uMaxPx.value = 34 * S.dpr;
  uiCam.right = w; uiCam.bottom = -h; uiCam.updateProjectionMatrix();
}

function setVP(rt, x, y, w, h, sc) { rt.viewport.set(x, y, w, h); rt.scissor.set(x, y, w, h); rt.scissorTest = sc; }
function applyCam(eye, aspect, vh) {
  camera.fov = CAMB.fov; camera.aspect = aspect;
  camera.quaternion.copy(CAMB.quat); camera.position.copy(CAMB.pos);
  if (eye) {
    _right.set(1, 0, 0).applyQuaternion(CAMB.quat);
    camera.position.addScaledVector(_right, eye * CAMB.ipd * 0.5);
    camera.clearViewOffset();
  } else if (Math.abs(CAMB.sx) > 1e-4 || Math.abs(CAMB.sy) > 1e-4) {
    camera.setViewOffset(S.w, S.h, -CAMB.sx * S.w, CAMB.sy * S.h, S.w, S.h);
  } else camera.clearViewOffset();
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  PU.uProj.value = vh / (2 * Math.tan(camera.fov * Math.PI / 360));
}
function pass(m, target) { fsMesh.material = m; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }
function eyePass() {
  renderer.setRenderTarget(rtScene); renderer.clear(true, true, false);
  fsMesh.material = MAT.bg; renderer.render(fsScene, fsCam);
  renderer.render(world, camera);
}

function renderGL(uiOn) {
  const W = rtScene.width, H = rtScene.height, stereo = S.lens > 0.02;
  MAT.bg.uniforms.uTime.value = S.time;
  if (!stereo) {
    setVP(rtScene, 0, 0, W, H, false); MAT.bg.uniforms.uAspect.value = W / H;
    applyCam(0, W / H, H); eyePass();
  } else {
    const vert = S.w / S.h < 0.9, hw = Math.floor(W / 2), hh = Math.floor(H / 2);
    MAT.comp.uniforms.uSV.value = vert ? 1 : 0;
    for (let e = 0; e < 2; e++) {
      if (vert) { setVP(rtScene, 0, (1 - e) * hh, W, hh, true); MAT.bg.uniforms.uAspect.value = W / hh; applyCam(e ? 1 : -1, W / hh, hh); }
      else { setVP(rtScene, e * hw, 0, hw, H, true); MAT.bg.uniforms.uAspect.value = hw / H; applyCam(e ? 1 : -1, hw / H, H); }
      eyePass();
    }
  }
  setVP(rtScene, 0, 0, W, H, false);
  if (uiOn) { renderer.setRenderTarget(rtScene); renderer.render(uiScene, uiCam); }

  let src = rtScene;
  for (let i = 0; i < bloom.length; i++) {
    const m = i ? MAT.down : MAT.pre;
    m.uniforms.tMap.value = src.texture; m.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
    pass(m, bloom[i]); src = bloom[i];
  }
  for (let i = bloom.length - 2; i >= 0; i--) {
    const s2 = bloom[i + 1];
    MAT.up.uniforms.tMap.value = s2.texture; MAT.up.uniforms.uTexel.value.set(0.6 / s2.width, 0.6 / s2.height);
    pass(MAT.up, bloom[i]);
  }
  const c = MAT.comp.uniforms;
  c.tScene.value = rtScene.texture; c.tBloom.value = bloom[0].texture;
  c.uTime.value = S.time; c.uPulse.value = S.pulse; c.uLens.value = S.lens; c.uFlash.value = S.flash;
  pass(MAT.comp, null);
}

/* drop resolution if the machine is struggling */
let _fa = 0, _fn = 0, _low = 0, _warm = 0;
function adaptQuality(rawDt) {
  if (DBG || !S.ready) return;
  _warm += rawDt; if (_warm < 4) return;
  _fa += rawDt; _fn++;
  if (_fn < 40) return;
  const avg = _fa / _fn; _fa = 0; _fn = 0;
  if (avg > 1 / 36 && S.dpr > 0.75) { if (++_low >= 2) { S.dpr = Math.max(0.75, S.dpr - 0.25); resizeGL(); _low = 0; } }
  else _low = 0;
}

/* small helper: merge transformed geometries into one */
function mergeGeos(list) {
  const pos = [], nor = [];
  list.forEach(([geo, m]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
const hdr = (hex, k = 1) => { const n = parseInt(hex.slice(1), 16); return new THREE.Color(Math.pow((n >> 16 & 255) / 255, 2.2) * k, Math.pow((n >> 8 & 255) / 255, 2.2) * k, Math.pow((n & 255) / 255, 2.2) * k); };
