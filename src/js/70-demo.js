/* ============================================================
   2D LIVE DEMO: a working slice of a sales / operations system.
   Everything here is real DOM state: drag deals, change job
   status, filter, hover the chart. The phone mirrors it live.
   ============================================================ */
const DM = {
  deals: [], jobs: [], tab: 0, filter: -1, q: '', range: 1, series: [], cur: null, tgt: null, hover: -1,
  drag: null, simT: 3, leadT: 9, toastT: 0, nextId: 20, cv: null, ctx: null, ok: false, target: 240
};
const STG = ['Lead', 'Qualified', 'Proposal', 'Won'];
const STN = ['Open', 'In progress', 'Done'];
const LEADS = [['Kestrel Bank', 'Onboarding portal', 55], ['Juniper Health', 'Clinic app', 31], ['Ridgeway Motors', 'Stock system', 44], ['Ostrava Studios', 'Port to console', 80], ['Fenwick Estates', 'Lettings CRM', 26]];
const gbp = v => '£' + Math.round(v) + 'k';

function initDemo() {
  DM.deals = [
    { id: 1, co: 'Halden Foods', nm: 'Warehouse system', v: 48, s: 0, o: 'AM' }, { id: 2, co: 'Brightwell Care', nm: 'Rota mobile app', v: 22, s: 0, o: 'JK' },
    { id: 3, co: 'Corvus Energy', nm: 'Trading dashboards', v: 64, s: 0, o: 'PR' }, { id: 4, co: 'Maple & Stone', nm: 'AR showroom', v: 36, s: 1, o: 'LW' },
    { id: 5, co: 'Tidewater Logistics', nm: 'Fleet CRM', v: 58, s: 1, o: 'AM' }, { id: 6, co: 'Northgate Homes', nm: 'Tenant portal', v: 41, s: 2, o: 'PR' },
    { id: 7, co: 'Sable Games', nm: 'Co-development', v: 90, s: 2, o: 'JK' }, { id: 8, co: 'Orchard Dental', nm: 'Booking platform', v: 27, s: 3, o: 'LW' },
    { id: 9, co: 'Vantage Rail', nm: 'VR safety training', v: 72, s: 3, o: 'AM' }
  ];
  DM.jobs = [
    { id: 'J-2041', site: 'Dock Road depot', task: 'Boiler service', who: 'R. Khan', pri: 'High', st: 0 },
    { id: 'J-2042', site: '14 Alder Court', task: 'Fire door inspection', who: 'S. Obi', pri: 'High', st: 1 },
    { id: 'J-2043', site: 'Unit 7, Canal Works', task: 'Racking audit', who: 'M. Lowe', pri: 'Med', st: 0 },
    { id: 'J-2044', site: 'Head office', task: 'Access control upgrade', who: 'T. Reyes', pri: 'Med', st: 1 },
    { id: 'J-2045', site: '22 Linden Row', task: 'Damp survey', who: 'R. Khan', pri: 'Low', st: 2 },
    { id: 'J-2046', site: 'North yard', task: 'Forklift LOLER check', who: 'S. Obi', pri: 'High', st: 0 },
    { id: 'J-2047', site: '9 Marsh Lane', task: 'Gas safety certificate', who: 'M. Lowe', pri: 'Med', st: 2 }
  ];
  const mk = (n, seed) => { const a = []; for (let i = 0; i < n; i++) { const x = i / (n - 1); a.push(8 + x * 6 + Math.sin(i * 0.55 + seed) * 2.2 + Math.sin(i * 0.17 + seed * 2) * 2.6 + Math.sin(i * 1.9 + seed) * 0.9); } return a; };
  DM.series = [mk(7, 1.3), mk(30, 2.1), mk(90, 0.4)];

  $('#demo').innerHTML = `
  <div class="win" id="win">
    <div class="win__bar">
      <span class="win__dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="win__name">Orbit <span>/ Sales OS</span></span>
      <div class="tabs" role="tablist" aria-label="Demo views">
        <button type="button" role="tab" aria-selected="true" data-tab="0">Pipeline</button>
        <button type="button" role="tab" aria-selected="false" data-tab="1">Operations</button>
        <button type="button" role="tab" aria-selected="false" data-tab="2">Analytics</button>
      </div>
      <span class="live mono">Live</span>
    </div>
    <div class="kpis">
      <div class="kpi"><small class="mono">Open pipeline</small><b id="k0"></b></div>
      <div class="kpi"><small class="mono">Won this month</small><b id="k1"></b></div>
      <div class="kpi"><small class="mono">Win rate</small><b id="k2"></b></div>
      <div class="kpi"><small class="mono">Open jobs</small><b id="k3"></b></div>
    </div>
    <div class="pane is-on" id="p0" role="tabpanel"></div>
    <div class="pane pane--ops" id="p1" role="tabpanel">
      <div class="ops__f" id="opsf"></div>
      <div class="tblw"><table class="tbl"><thead><tr><th>Job</th><th>Site</th><th>Task</th><th>Owner</th><th>Priority</th><th>Status</th></tr></thead><tbody id="opsb"></tbody></table></div>
    </div>
    <div class="pane pane--ana" id="p2" role="tabpanel">
      <div class="ana__main">
        <div class="ana__h"><div><b>Revenue</b> <small class="mono" id="anav"></small></div>
          <div class="seg" id="anar" role="group" aria-label="Range"><button type="button" data-r="0">7D</button><button type="button" data-r="1" class="is-on">30D</button><button type="button" data-r="2">90D</button></div></div>
        <div class="ana__c"><canvas id="anac" aria-label="Revenue chart"></canvas></div>
      </div>
      <div class="ana__side">
        <div class="box"><small class="mono">Deals by stage</small><div class="donut"><svg viewBox="0 0 36 36" aria-hidden="true" id="anad"></svg><ul class="lg" id="anal"></ul></div></div>
        <div class="box"><small class="mono">Won by owner</small><ul class="bars" id="anab"></ul></div>
      </div>
    </div>
  </div>
  <div class="phone" id="phone" aria-label="Phone app mirroring the same data">
    <div class="toast" id="toast"></div>
    <div class="ph__h"><b>Orbit</b><small class="mono">now</small></div>
    <div class="ph__card"><small class="mono">Won this month</small><b id="phv"></b><i id="phbar"></i></div>
    <ul class="feed" id="feed"></ul>
  </div>`;

  $$('.tabs button').forEach(b => b.addEventListener('click', () => demoTab(+b.dataset.tab)));
  $('#opsf').addEventListener('click', e => { const b = e.target.closest('.chipb'); if (!b) return; DM.filter = +b.dataset.f; renderOps(); snd('tick'); });
  $('#opsf').addEventListener('input', e => { if (e.target.id === 'opsq') { DM.q = e.target.value.toLowerCase(); renderRows(); } });
  $('#opsb').addEventListener('click', e => {
    const b = e.target.closest('.st'); if (!b) return;
    const j = DM.jobs.find(x => x.id === b.dataset.id); j.st = (j.st + 1) % 3; renderOps(j.id); demoKpis(true);
    pushFeed(j.id + ' ' + STN[j.st].toLowerCase(), j.task, j.st === 2); snd(j.st === 2 ? 'place' : 'tick');
  });
  $$('#anar button').forEach(b => b.addEventListener('click', () => { DM.range = +b.dataset.r; $$('#anar button').forEach(o => o.classList.toggle('is-on', o === b)); demoSeries(); snd('tick'); }));
  DM.cv = $('#anac'); DM.ctx = DM.cv.getContext('2d');
  DM.cv.addEventListener('pointermove', e => { const r = DM.cv.getBoundingClientRect(); DM.hover = clamp((e.clientX - r.left) / r.width); });
  DM.cv.addEventListener('pointerleave', () => { DM.hover = -1; });
  bindDrag();
  renderPipe(); renderOps(); demoKpis(false); demoSeries(true); renderSide();
  [['Vantage Rail won', 'VR safety training · £72k', true], ['J-2045 done', 'Damp survey', false], ['New lead', 'Corvus Energy · £64k', false]].reverse().forEach(f => pushFeed(f[0], f[1], f[2], true));
  DM.ok = true;
}

function wonTotal() { return DM.deals.filter(d => d.s === 3).reduce((a, d) => a + d.v, 0) + 61; }
function demoKpis(anim) {
  const open = DM.deals.filter(d => d.s < 3).reduce((a, d) => a + d.v, 0), won = wonTotal();
  const rate = DM.deals.filter(d => d.s === 3).length / DM.deals.length * 100, jobs = DM.jobs.filter(j => j.st < 2).length;
  const set = (id, v, fmt) => { const el = $('#' + id), ch = el._v !== undefined && el._v !== v; countTo(el, v, fmt, anim ? 0.7 : 0.01); if (ch && anim) { el.classList.remove('is-up'); void el.offsetWidth; el.classList.add('is-up'); } };
  set('k0', open, gbp); set('k1', won, gbp); set('k2', rate, v => Math.round(v) + '%'); set('k3', jobs, v => String(Math.round(v)));
  countTo($('#phv'), won, gbp, anim ? 0.9 : 0.01);
  $('#phbar').style.setProperty('--v', clamp(won / DM.target).toFixed(3));
}

function renderPipe(newId) {
  $('#p0').innerHTML = STG.map((n, s) => {
    const ds = DM.deals.filter(d => d.s === s);
    return `<div class="col${s === 3 ? ' col--won' : ''}" data-s="${s}"><div class="col__h"><b>${n}</b><span>${gbp(ds.reduce((a, d) => a + d.v, 0))}</span></div><div class="col__l">` +
      ds.map(d => `<div class="deal${d.id === newId ? ' is-new' : ''}" data-id="${d.id}" data-cursor="Drag" tabindex="0" role="button" aria-label="${d.co}, ${gbp(d.v)}, ${n}. Press right arrow to advance."><b>${d.co}</b><span>${d.nm}</span><em>${gbp(d.v)}<i>${d.o}</i></em></div>`).join('') + `</div></div>`;
  }).join('');
}
function bindDrag() {
  const pane = $('#p0');
  const place = e => {
    const d = DM.drag; d.g.style.left = (e.clientX - d.ox) + 'px'; d.g.style.top = (e.clientY - d.oy) + 'px';
    let col = null;
    $$('.col', pane).forEach(c => { const r = c.getBoundingClientRect(), over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 60 && e.clientY <= r.bottom + 60; c.classList.toggle('is-over', over); if (over) col = +c.dataset.s; });
    d.col = col;
  };
  pane.addEventListener('pointerdown', e => {
    const el = e.target.closest('.deal'); if (!el || DM.drag) return; e.preventDefault();
    const r = el.getBoundingClientRect(), g = el.cloneNode(true);
    g.classList.add('deal--ghost'); g.classList.remove('is-new'); g.style.width = r.width + 'px'; g.removeAttribute('tabindex');
    document.body.appendChild(g); el.classList.add('is-src');
    DM.drag = { id: +el.dataset.id, el, g, ox: e.clientX - r.left, oy: e.clientY - r.top, col: null };
    place(e); try { pane.setPointerCapture(e.pointerId); } catch (err) {} snd('tick');
  });
  pane.addEventListener('pointermove', e => { if (DM.drag) place(e); });
  const end = e => {
    const d = DM.drag; if (!d) return; DM.drag = null; d.g.remove(); d.el.classList.remove('is-src');
    $$('.col', pane).forEach(c => c.classList.remove('is-over'));
    const deal = DM.deals.find(x => x.id === d.id);
    if (e.type === 'pointerup' && d.col !== null && deal && deal.s !== d.col) moveDeal(deal, d.col, e.clientX, e.clientY);
  };
  pane.addEventListener('pointerup', end); pane.addEventListener('pointercancel', end);
  pane.addEventListener('keydown', e => {
    const el = e.target.closest('.deal'); if (!el) return;
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!dir) return; e.preventDefault();
    const deal = DM.deals.find(x => x.id === +el.dataset.id), to = clamp(deal.s + dir, 0, 3);
    if (to !== deal.s) { const r = el.getBoundingClientRect(); moveDeal(deal, to, r.left + r.width / 2, r.top); const n = $('.deal[data-id="' + deal.id + '"]'); if (n) n.focus({ preventScroll: true }); }
  });
}
function moveDeal(deal, to, x, y) {
  deal.s = to; renderPipe(deal.id); demoKpis(true); renderSide(); demoSeries();
  if (to === 3) { burst(x, y); toast('Deal won · ' + gbp(deal.v), deal.co); pushFeed(deal.co + ' won', deal.nm + ' · ' + gbp(deal.v), true); snd('win'); }
  else { pushFeed(deal.co, 'Moved to ' + STG[to], false); snd('drop'); }
}
function burst(x, y) {
  if (RM) return;
  const b = document.createElement('div'); b.className = 'burst'; b.style.left = x + 'px'; b.style.top = y + 'px';
  const cols = ['#59e39b', '#ffc83d', '#35e0ff', '#a98bff', '#f3efe6'];
  for (let i = 0; i < 18; i++) { const p = document.createElement('i'), a = Math.random() * 6.28, r = 40 + Math.random() * 90; p.style.setProperty('--dx', Math.cos(a) * r + 'px'); p.style.setProperty('--dy', (Math.sin(a) * r - 30) + 'px'); p.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg'); p.style.setProperty('--c', pick(cols)); b.appendChild(p); }
  document.body.appendChild(b); setTimeout(() => b.remove(), 900);
}
function toast(t, sub) { const el = $('#toast'); el.innerHTML = t + '<small>' + sub + '</small>'; el.classList.add('is-on'); DM.toastT = 2.8; }
function pushFeed(t, sub, win, quiet) {
  const ul = $('#feed'), li = document.createElement('li'); if (win) li.className = 'is-win';
  li.innerHTML = '<i></i><b></b><span></span>'; li.children[1].textContent = t; li.children[2].textContent = sub;
  if (quiet) li.style.animation = 'none';
  ul.prepend(li); while (ul.children.length > 5) ul.lastChild.remove();
}

function renderOps(flashId) {
  const cnt = s => DM.jobs.filter(j => s < 0 || j.st === s).length;
  const q = $('#opsq'), had = q && document.activeElement === q, val = q ? q.value : '';
  $('#opsf').innerHTML = [[-1, 'All'], [0, 'Open'], [1, 'In progress'], [2, 'Done']].map(f => `<button type="button" class="chipb" aria-pressed="${DM.filter === f[0]}" data-f="${f[0]}">${f[1]} ${cnt(f[0])}</button>`).join('') +
    `<input class="ops__s" id="opsq" type="search" placeholder="Search jobs" aria-label="Search jobs" autocomplete="off">`;
  $('#opsq').value = val; if (had) $('#opsq').focus({ preventScroll: true });
  renderRows(flashId);
}
function renderRows(flashId) {
  const rows = DM.jobs.filter(j => (DM.filter < 0 || j.st === DM.filter) && (!DM.q || (j.id + j.site + j.task + j.who).toLowerCase().includes(DM.q)));
  $('#opsb').innerHTML = rows.length ? rows.map(j => `<tr class="${j.id === flashId ? 'is-flash' : ''}"><td>${j.id}</td><td>${j.site}</td><td>${j.task}</td><td>${j.who}</td><td><span class="pri" data-p="${j.pri}">${j.pri}</span></td><td><button type="button" class="st" data-s="${j.st}" data-id="${j.id}" aria-label="${j.id} status ${STN[j.st]}. Click to advance.">${STN[j.st]}</button></td></tr>`).join('')
    : '<tr><td colspan="6" style="color:var(--ink-3);padding:18px 10px">No jobs match. Clear the search or pick another filter.</td></tr>';
}

function demoTab(i) {
  DM.tab = i;
  $$('.tabs button').forEach((b, k) => b.setAttribute('aria-selected', k === i));
  $$('.pane').forEach((p, k) => p.classList.toggle('is-on', k === i));
  if (i === 0) renderPipe(); else if (i === 1) renderOps(); else { sizeChart(); renderSide(); }
  snd('tick');
}
function demoShow() { if (DM.ok && DM.tab === 2) sizeChart(); }
function demoSeries(instant) {
  const src = DM.series[DM.range].slice(); src[src.length - 1] += (wonTotal() - 160) * 0.07;
  const M = 64, out = new Float32Array(M);
  for (let i = 0; i < M; i++) { const x = i / (M - 1) * (src.length - 1), a = Math.floor(x), b = Math.min(src.length - 1, a + 1); out[i] = lerp(src[a], src[b], x - a); }
  DM.tgt = out; if (instant || !DM.cur) DM.cur = Float32Array.from(out);
  const tot = src.reduce((a, v) => a + v, 0) * (DM.range === 2 ? 1 : 1);
  $('#anav').textContent = gbp(tot) + ' · last ' + [7, 30, 90][DM.range] + ' days';
}
function renderSide() {
  const cols = ['#6f6c66', '#35e0ff', '#ffc83d', '#59e39b'], n = DM.deals.length;
  let off = 0;
  $('#anad').innerHTML = STG.map((s, i) => { const c = DM.deals.filter(d => d.s === i).length / n * 100, o = off; off += c; return `<circle cx="18" cy="18" r="15.915" stroke="${cols[i]}" stroke-dasharray="${Math.max(0, c - 1.2).toFixed(2)} ${(100 - Math.max(0, c - 1.2)).toFixed(2)}" stroke-dashoffset="${(-o).toFixed(2)}"/>`; }).join('');
  $('#anal').innerHTML = STG.map((s, i) => `<li><i style="background:${cols[i]}"></i>${s}<b>${DM.deals.filter(d => d.s === i).length}</b></li>`).join('');
  const own = { AM: 0, JK: 0, PR: 0, LW: 0 }; DM.deals.filter(d => d.s === 3).forEach(d => { own[d.o] += d.v; });
  const mx = Math.max(60, ...Object.values(own));
  $('#anab').innerHTML = Object.keys(own).map(k => `<li><span>${k}</span><i style="--v:${(own[k] / mx).toFixed(3)}"></i><b>${gbp(own[k])}</b></li>`).join('');
}
function sizeChart() {
  const r = DM.cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
  if (r.width < 2) return;
  DM.cv.width = Math.round(r.width * d); DM.cv.height = Math.round(r.height * d); DM.cw = r.width; DM.chh = r.height; DM.cd = d;
}
function drawChart() {
  const ctx = DM.ctx, w = DM.cw, h = DM.chh; if (!w) { sizeChart(); if (!DM.cw) return; }
  ctx.setTransform(DM.cd, 0, 0, DM.cd, 0, 0); ctx.clearRect(0, 0, w, h);
  const a = DM.cur, M = a.length, pl = 30, pb = 16, pt = 8, pw = w - pl - 6, phh = h - pb - pt;
  let mx = 0; for (let i = 0; i < M; i++) mx = Math.max(mx, a[i]); mx = Math.ceil(mx / 5) * 5 + 2;
  const X = i => pl + i / (M - 1) * pw, Y = v => pt + phh - v / mx * phh;
  ctx.font = '10px "Geist Mono", ui-monospace, monospace'; ctx.textBaseline = 'middle';
  for (let g = 0; g <= 3; g++) { const v = mx * g / 3, y = Y(v); ctx.fillStyle = 'rgba(243,239,230,.09)'; ctx.fillRect(pl, Math.round(y), pw, 1); ctx.fillStyle = '#6f6c66'; ctx.textAlign = 'right'; ctx.fillText(Math.round(v) + 'k', pl - 6, y); }
  const grad = ctx.createLinearGradient(0, pt, 0, pt + phh); grad.addColorStop(0, 'rgba(53,224,255,.34)'); grad.addColorStop(1, 'rgba(53,224,255,0)');
  ctx.beginPath(); ctx.moveTo(X(0), Y(0)); for (let i = 0; i < M; i++) ctx.lineTo(X(i), Y(a[i])); ctx.lineTo(X(M - 1), Y(0)); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); for (let i = 0; i < M; i++) i ? ctx.lineTo(X(i), Y(a[i])) : ctx.moveTo(X(i), Y(a[i])); ctx.strokeStyle = '#35e0ff'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  const ex = X(M - 1), ey = Y(a[M - 1]), pu = (Math.sin(S.time * 3) + 1) / 2;
  ctx.beginPath(); ctx.arc(ex, ey, 4 + pu * 5, 0, 6.2832); ctx.fillStyle = 'rgba(53,224,255,' + (0.25 - pu * 0.2) + ')'; ctx.fill();
  ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, 6.2832); ctx.fillStyle = '#f3efe6'; ctx.fill();
  if (DM.hover >= 0) {
    const fx = clamp((DM.hover * w - pl) / pw), i = Math.round(fx * (M - 1)), x = X(i), y = Y(a[i]);
    ctx.fillStyle = 'rgba(243,239,230,.35)'; ctx.fillRect(Math.round(x), pt, 1, phh);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.2832); ctx.fillStyle = '#f3efe6'; ctx.fill();
    const label = '£' + a[i].toFixed(1) + 'k', tw = ctx.measureText(label).width + 14, tx = clamp(x - tw / 2, pl, w - tw - 2), ty = Math.max(pt, y - 30);
    ctx.fillStyle = '#f3efe6'; ctx.beginPath(); ctx.rect(tx, ty, tw, 20); ctx.fill();
    ctx.fillStyle = '#050506'; ctx.textAlign = 'center'; ctx.fillText(label, tx + tw / 2, ty + 10.5);
  }
}

function updateDemo(dt) {
  if (!DM.ok) return;
  if (DM.toastT > 0) { DM.toastT -= dt; if (DM.toastT <= 0) $('#toast').classList.remove('is-on'); }
  if (S.ch !== 'demo') return;
  if (DM.tab === 2 && DM.cur) { for (let i = 0; i < DM.cur.length; i++) DM.cur[i] = damp(DM.cur[i], DM.tgt[i], 7, dt); drawChart(); }
  if (DM.drag) return;
  /* the system keeps moving on its own, like a real one */
  DM.simT -= dt;
  if (DM.simT <= 0) {
    DM.simT = 4.5 + Math.random() * 3;
    const c = DM.jobs.filter(j => j.st < 2);
    if (c.length) { const j = pick(c); j.st++; if (DM.tab === 1) renderOps(j.id); demoKpis(true); pushFeed(j.id + ' ' + STN[j.st].toLowerCase(), j.task, j.st === 2); }
    else DM.jobs.forEach(j => { j.st = Math.random() < 0.6 ? 0 : 1; });
  }
  DM.leadT -= dt;
  if (DM.leadT <= 0 && DM.deals.length < 13) {
    DM.leadT = 11 + Math.random() * 6;
    const l = LEADS[(DM.nextId - 20) % LEADS.length], d = { id: DM.nextId++, co: l[0], nm: l[1], v: l[2], s: 0, o: pick(['AM', 'JK', 'PR', 'LW']) };
    DM.deals.unshift(d); if (DM.tab === 0) renderPipe(d.id); demoKpis(true); renderSide(); pushFeed('New lead', d.co + ' · ' + gbp(d.v), false);
  }
}
