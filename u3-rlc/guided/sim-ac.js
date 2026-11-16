/**
 * guided/sim-ac.js - the simulator panel of the guided AC activity (window.GuidedSim).
 *
 * Two modes, chosen by each step:
 *   open     the lab's own drawings (circuit with meters, phasors or the frequency chart) with a
 *            frequency slider and live read-outs. A step can ask for something to be done here
 *            ("move the frequency", "find the resonance"); the panel reports when it happened.
 *   compute  no meters and no numbers to read off: the circuit with the given data, and an impedance
 *            triangle drawn to scale. Every value the student has found is written onto the drawing
 *            and collected as a chip, so the panel fills in like a solution on paper.
 *
 * The runner (core.js) knows nothing about circuits; it calls init / load / stepDone / validate.
 */
(function () {
  'use strict';

  const E = window.ACEngine;
  const V = window.ACVisuals;
  const $ = (id) => document.getElementById(id);
  const INK = '#1b2a4e', SOFT = '#46557a', TEAL = '#0f766e', AMBER = '#b45309', CORAL = '#c8452f', PURPLE = '#6d28d9', GRID = '#d9d0ba';
  const MONO = '"JetBrains Mono", Consolas, monospace';
  const HEB = '"Heebo", "Segoe UI", Arial, sans-serif';

  let ctx = null;
  const st = { station: null, step: null, spec: null, done: {}, key: '', f: 0, base: null, sol: null, hit: false };

  const cfgKey = (c) => JSON.stringify([c.topology, c.R_ohm, c.L_H, c.C_F, c.XL_ohm, c.XC_ohm, c.omega, c.f_Hz, c.Ueff]);
  const solveAt = (cfg, f) => E.solveACCircuit(Object.assign({}, cfg, cfg.inputMode === 'reactances' ? {} : { freqMode: 'f', f_Hz: f }));

  // ------------------------------------------------------------------ panel
  function init(context) {
    ctx = context;
    ctx.panel.innerHTML =
      '<div class="sim-head"><span class="sim-title">הסימולטור</span><span class="sim-mode" id="sim-mode"></span></div>'
      + '<div id="ac-open">'
      + '<div class="canvas-wrap"><canvas id="ac-schem" data-height="250" style="width:100%"></canvas></div>'
      + '<div class="ac-freq"><label for="ac-f">תדר</label><input id="ac-slider" class="sim-slider" type="range" min="0" max="1000" dir="ltr" aria-label="תדר המקור">'
      + '<span class="t-box" dir="ltr"><input id="ac-f" type="number" inputmode="decimal"> Hz</span><button class="btn ghost" id="ac-reset" type="button">איפוס</button></div>'
      + '<div class="ac-badge" id="ac-badge"></div>'
      + '<div class="canvas-wrap"><canvas id="ac-second" data-height="250" style="width:100%"></canvas></div>'
      + '<div class="sim-readouts" id="ac-readouts" dir="ltr"></div>'
      + '</div>'
      + '<div id="ac-compute">'
      + '<div class="canvas-wrap"><canvas id="ac-sketch"></canvas></div>'
      + '<div class="canvas-wrap"><canvas id="ac-tri"></canvas></div>'
      + '<div class="canvas-wrap" id="ac-sweep-wrap"><canvas id="ac-sweep"></canvas></div>'
      + '<div class="chips" id="ac-chips" dir="ltr"></div>'
      + '</div>'
      + '<p class="sim-note" id="sim-note"></p>';

    $('ac-slider').addEventListener('input', (e) => setFreq(fromSlider(Number(e.target.value)), true));
    $('ac-f').addEventListener('change', (e) => { const v = Number(String(e.target.value).replace(',', '.')); if (Number.isFinite(v) && v > 0) setFreq(v, true); e.target.blur(); });
    $('ac-f').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.dispatchEvent(new Event('change')); });
    $('ac-reset').addEventListener('click', () => { if (st.spec && st.spec.free) setFreq(st.base.f_Hz, false); });
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(draw, 120); });
  }

  // log slider between the step's fRange
  const range = () => (st.spec && st.spec.fRange) || [st.base.f_Hz / 5, st.base.f_Hz * 5];
  const toSlider = (f) => { const r = range(); return Math.round(1000 * Math.log(f / r[0]) / Math.log(r[1] / r[0])); };
  const fromSlider = (v) => { const r = range(); return r[0] * Math.pow(r[1] / r[0], v / 1000); };
  const nice = (f) => (f >= 1000 ? Math.round(f) : f >= 100 ? Math.round(f * 10) / 10 : Math.round(f * 100) / 100);

  function setFreq(f, fromUser) {
    if (!st.spec || st.spec.mode !== 'open') return;
    if (fromUser && !st.spec.free) { ctx.flash($('ac-reset')); draw(); return; }
    const r = range();
    st.f = Math.max(r[0], Math.min(r[1], f));
    // close enough to the resonance: land exactly on it, so the meters show the clean values
    const chk = st.spec.check;
    const f0 = st.base.hasResonance ? st.base.f0_Hz : 0;
    if (fromUser && f0 && chk && chk.kind === 'resonance' && Math.abs(st.f - f0) / f0 <= chk.tol) { st.f = f0; st.hit = true; }
    draw();
    if (fromUser && chk && st.step && st.step.task) {
      const ok = chk.kind === 'changed' ? Math.abs(st.f / st.base.f_Hz - 1) >= chk.by
        : chk.kind === 'below' ? st.f <= chk.f
        : chk.kind === 'resonance' ? st.hit : false;
      if (ok) ctx.taskDone(st.step.task);
    }
  }

  function load(station, step, done) {
    const spec = step.sim;
    if (!spec) return;
    const key = cfgKey(spec.cfg);
    const sameCircuit = key === st.key;
    st.station = station; st.step = step; st.spec = spec; st.done = done || {}; st.key = key;
    st.base = E.solveACCircuit(spec.cfg);
    st.hit = false;
    if (spec.mode === 'open') {
      if (Number.isFinite(spec.setFreq)) st.f = spec.setFreq;
      else if (!(sameCircuit && spec.keepFreq) || !st.f) st.f = st.base.f_Hz;
    }
    $('ac-open').style.display = spec.mode === 'open' ? '' : 'none';
    $('ac-compute').style.display = spec.mode === 'compute' ? '' : 'none';
    $('sim-mode').textContent = spec.mode === 'open' ? 'מדידה חופשית' : 'מצב חישוב';
    $('sim-mode').className = 'sim-mode ' + (spec.mode === 'open' ? 'full' : 'graph');
    draw();
  }

  function stepDone(station, step, done) {
    st.done = done || {};
    draw();
    return Boolean(step.found);
  }

  function draw() {
    if (!st.spec) return;
    if (st.spec.mode === 'open') drawOpen(); else drawCompute();
  }

  // ------------------------------------------------------------------ open mode
  function drawOpen() {
    const spec = st.spec;
    const sol = solveAt(spec.cfg, st.f);
    st.sol = sol;
    V.drawACSchematic($('ac-schem'), sol, { voltmeterTarget: 'ALL', noHeader: true });
    const second = $('ac-second');
    if (spec.second === 'sweep') {
      // our own chart: the lab's frequency chart prints f0 on the graph, and here f0 is what the student looks for
      second.style.width = '';
      sweepOn(second, sol, [[st.f, 'f']], range()[0], range()[1], 'הזרם כפונקציה של התדר: הנקודה זזה עם המחוון', 210);
    } else {
      second.style.width = '100%';
      if (spec.second === 'freq') V.drawFrequencyResponse(second, sol, E.sampleFrequencySweep(sol, 160), { chartMode: 'current_z' });
      else V.drawPhasorAndTriangle(second, sol, spec.second === 'triangle' ? 'triangle' : 'phasors');
    }

    $('ac-slider').value = String(toSlider(st.f));
    $('ac-slider').disabled = !spec.free;
    $('ac-f').disabled = !spec.free;
    $('ac-reset').style.visibility = spec.free ? 'visible' : 'hidden';
    if (document.activeElement !== $('ac-f')) $('ac-f').value = String(nice(st.f));

    const hasL = sol.topology !== 'RC', hasC = sol.topology !== 'RL';
    const row = (name, val, cls) => '<div class="ro ' + (cls || '') + '"><span class="ro-n">' + name + '</span><span class="ro-v" dir="ltr">' + val + '</span></div>';
    let html = row('f', E.fmtFreq(sol.f_Hz)) + row('ω', E.fmtNum(sol.omega, 1) + ' rad/s');
    if (hasL) html += row('XL', E.fmtImpedance(sol.XL_ohm), 'xl');
    if (hasC) html += row('XC', E.fmtImpedance(sol.XC_ohm), 'xc');
    html += row('Z', E.fmtImpedance(sol.Z_ohm)) + row('I', E.fmtCurrent(sol.Ieff), 'vi') + row('φ', E.fmtDeg(sol.phi_deg));
    $('ac-readouts').innerHTML = html;

    const atRes = sol.hasResonance && Math.abs(sol.f_Hz - sol.f0_Hz) / sol.f0_Hz < 1e-6;
    const badge = $('ac-badge');
    badge.textContent = atRes ? 'תהודה: XL = XC, הזרם מרבי' : '';
    badge.className = 'ac-badge' + (atRes ? ' on' : '');
    $('sim-note').innerHTML = spec.free ? 'גררו את מחוון התדר, או הקלידו תדר בתיבה.' : 'המדים מראים ערכים יעילים. התדר נעול על ערך השאלה.';
  }

  // ------------------------------------------------------------------ compute mode
  function setup(canvas, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.max(280, canvas.parentElement.clientWidth);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#fffdf8';
    c.fillRect(0, 0, w, h);
    return { c, w, h };
  }
  /** A label is ['given text'], or ['symbol', stepId, 'text once that step is done'], or ['symbol'] (never filled). */
  function label(arr) {
    if (!arr) return null;
    if (arr.length === 1) return { t: arr[0], state: /=/.test(arr[0]) ? 'given' : 'plain' };
    return st.done[arr[1]] ? { t: arr[2], state: 'found' } : { t: arr[0] + ' = ?', state: 'open' };
  }
  const colourOf = (lb) => (lb.state === 'found' ? TEAL : lb.state === 'open' ? AMBER : INK);
  function ltr(c, text, x, y, colour, align, size, bold) {
    c.save();
    c.direction = 'ltr';
    c.font = (bold ? '700 ' : '600 ') + (size || 12.5) + 'px ' + MONO;
    c.fillStyle = colour || INK;
    c.textAlign = align || 'center';
    c.textBaseline = 'middle';
    c.fillText(text, x, y);
    c.restore();
  }
  function heb(c, text, x, y, colour, size) {
    c.save();
    c.direction = 'rtl';
    c.font = '700 ' + (size || 12.5) + 'px ' + HEB;
    c.fillStyle = colour || SOFT;
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    c.fillText(text, x, y);
    c.restore();
  }
  function tag(c, lb, x, y, align) {
    if (!lb) return;
    c.save();
    c.font = '700 12.5px ' + MONO;
    const tw = c.measureText(lb.t).width + 12;
    const x0 = align === 'left' ? x - 6 : align === 'right' ? x - tw + 6 : x - tw / 2;
    c.fillStyle = lb.state === 'found' ? '#d9efeb' : lb.state === 'open' ? '#fbecc8' : '#ffffff';
    c.strokeStyle = colourOf(lb);
    c.lineWidth = 1.2;
    c.beginPath();
    if (c.roundRect) c.roundRect(x0, y - 11, tw, 22, 6); else c.rect(x0, y - 11, tw, 22);
    c.fill();
    c.stroke();
    c.restore();
    ltr(c, lb.t, x0 + tw / 2, y + 0.5, colourOf(lb), 'center', 12.5, true);
  }

  function drawSketch() {
    const spec = st.spec, sk = spec.sketch || {};
    const { c, w, h } = setup($('ac-sketch'), 158);
    const x0 = 64, x1 = w - 44, yT = 62, yB = 122;
    c.strokeStyle = INK; c.lineWidth = 2.2; c.lineJoin = 'round';
    const parts = ['R', 'L', 'C'].filter((k) => sk[k]);
    const xs = parts.map((_, i) => x0 + (x1 - x0) * (i + 1) / (parts.length + 1));
    const half = 26;
    // wires: top (with gaps for the components), right, bottom, left (with a gap for the source)
    c.beginPath();
    let x = x0;
    xs.forEach((cx) => { c.moveTo(x, yT); c.lineTo(cx - half, yT); x = cx + half; });
    c.moveTo(x, yT); c.lineTo(x1, yT); c.lineTo(x1, yB); c.lineTo(x0, yB);
    c.moveTo(x0, yT); c.lineTo(x0, (yT + yB) / 2 - 15);
    c.moveTo(x0, (yT + yB) / 2 + 15); c.lineTo(x0, yB);
    c.stroke();
    // source
    const ys = (yT + yB) / 2;
    c.beginPath(); c.arc(x0, ys, 15, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.stroke();
    c.beginPath(); c.lineWidth = 1.8;
    for (let i = 0; i <= 20; i++) { const px = x0 - 9 + (18 * i) / 20; const py = ys - 5 * Math.sin((i / 20) * Math.PI * 2); if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.stroke();
    // components
    parts.forEach((k, i) => {
      const cx = xs[i];
      c.lineWidth = 2.2;
      if (k === 'R') {
        c.strokeStyle = TEAL; c.beginPath(); c.moveTo(cx - half, yT);
        for (let j = 0; j < 6; j++) c.lineTo(cx - half + (2 * half) * (j + 0.5) / 6, yT + (j % 2 ? 8 : -8));
        c.lineTo(cx + half, yT); c.stroke();
      } else if (k === 'L') {
        c.strokeStyle = PURPLE; c.beginPath();
        for (let j = 0; j < 4; j++) c.arc(cx - half + (2 * half) * (j + 0.5) / 4, yT, half / 4, Math.PI, 0);
        c.stroke();
      } else {
        c.strokeStyle = CORAL; c.beginPath();
        c.moveTo(cx - half, yT); c.lineTo(cx - 5, yT); c.moveTo(cx + 5, yT); c.lineTo(cx + half, yT);
        c.moveTo(cx - 5, yT - 13); c.lineTo(cx - 5, yT + 13); c.moveTo(cx + 5, yT - 13); c.lineTo(cx + 5, yT + 13);
        c.stroke();
      }
      tag(c, label(sk[k]), cx, yT - 30, 'center');
    });
    const src = label(sk.src);
    if (src) ltr(c, src.t, (x0 + x1) / 2, yB + 21, INK, 'center', 12.5, true);
    heb(c, 'המעגל והנתונים', w - 10, 14, SOFT, 12);
  }

  function drawTriangle() {
    const sol = E.solveACCircuit(st.spec.cfg), tri = st.spec.tri || {};
    const { c, w, h } = setup($('ac-tri'), 236);
    heb(c, 'משולש העכבות, בקנה מידה', w - 10, 14, SOFT, 12);
    const R = sol.R_ohm, X = sol.X_ohm, up = X >= 0;
    const mL = 54, mR = 132, mT = 44, mB = 40;
    const s = Math.min((w - mL - mR) / R, (h - mT - mB) / Math.max(Math.abs(X), R * 0.12));
    const ox = mL + ((w - mL - mR) - R * s) / 2;
    const oy = up ? h - mB - ((h - mT - mB) - Math.abs(X) * s) / 2 : mT + ((h - mT - mB) - Math.abs(X) * s) / 2;
    const ax = ox + R * s, ay = oy, bx = ax, by = oy - X * s;
    // light fill
    c.beginPath(); c.moveTo(ox, oy); c.lineTo(ax, ay); c.lineTo(bx, by); c.closePath(); c.fillStyle = 'rgba(15,118,110,0.06)'; c.fill();
    const line = (x1, y1, x2, y2, col, lw) => { c.beginPath(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    line(ox, oy, ax, ay, TEAL, 3);
    line(ax, ay, bx, by, up ? PURPLE : CORAL, 3);
    line(ox, oy, bx, by, INK, 3);
    // right angle
    const q = 9 * (up ? -1 : 1);
    c.beginPath(); c.strokeStyle = SOFT; c.lineWidth = 1.2; c.moveTo(ax - 9, ay); c.lineTo(ax - 9, ay + q); c.lineTo(ax, ay + q); c.stroke();
    // angle arc
    const ang = Math.atan2(Math.abs(X), R), rad = Math.min(46, R * s * 0.3);
    c.beginPath(); c.strokeStyle = AMBER; c.lineWidth = 1.8;
    if (up) c.arc(ox, oy, rad, -ang, 0); else c.arc(ox, oy, rad, 0, ang);
    c.stroke();
    const mid = ang / 2 * (up ? -1 : 1);
    tag(c, label(tri.phi), ox + (rad + 12) * Math.cos(mid), oy + (rad + 12) * Math.sin(mid) + (up ? -2 : 2), 'left');
    tag(c, label(tri.R), (ox + ax) / 2, oy + (up ? 20 : -20), 'center');
    tag(c, label(tri.X), ax + 12, (ay + by) / 2, 'left');
    // hypotenuse label: pushed away from the triangle, on the outer side
    const hx = (ox + bx) / 2, hy = (oy + by) / 2, len = Math.hypot(bx - ox, by - oy) || 1;
    const nx = -(by - oy) / len * (up ? 1 : -1), ny = (bx - ox) / len * (up ? -1 : 1);
    tag(c, label(tri.Z), hx + nx * 16 - 6, hy + ny * 18, 'right');
  }

  /** I(f) with markers and no numbers: the shape is the point (where the peak is, which way the current goes). */
  function sweepOn(canvas, sol, marks, fMin, fMax, title, height) {
    const { c, w, h } = setup(canvas, height || 172);
    heb(c, title, w - 10, 14, SOFT, 12);
    const pL = 40, pR = 18, pT = 34, pB = 30, pw = w - pL - pR, ph = h - pT - pB;
    const iAt = (f) => { const om = 2 * Math.PI * f; const x = (sol.L_H ? om * sol.L_H : 0) - (sol.C_F ? 1 / (om * sol.C_F) : 0); return sol.Ueff / Math.hypot(sol.R_ohm, x); };
    let iMax = 0; const pts = [];
    for (let k = 0; k <= 200; k++) { const f = fMin + (fMax - fMin) * k / 200; const i = iAt(f); iMax = Math.max(iMax, i); pts.push([f, i]); }
    iMax *= 1.12;
    const xOf = (f) => pL + pw * (f - fMin) / (fMax - fMin), yOf = (i) => pT + ph * (1 - i / iMax);
    c.strokeStyle = GRID; c.lineWidth = 1; c.strokeRect(pL, pT, pw, ph);
    c.beginPath(); c.strokeStyle = '#0284c7'; c.lineWidth = 2.6; c.lineJoin = 'round';
    pts.forEach((p, k) => { if (k) c.lineTo(xOf(p[0]), yOf(p[1])); else c.moveTo(xOf(p[0]), yOf(p[1])); });
    c.stroke();
    marks.forEach((m) => {
      if (m[0] < fMin || m[0] > fMax) return;
      const x = xOf(m[0]), y = yOf(iAt(m[0]));
      c.save(); c.setLineDash([4, 4]); c.strokeStyle = AMBER; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, pT); c.lineTo(x, pT + ph); c.stroke(); c.restore();
      c.beginPath(); c.fillStyle = AMBER; c.arc(x, y, 5.5, 0, Math.PI * 2); c.fill();
      ltr(c, m[1], x, pT + ph + 14, AMBER, 'center', 12.5, true);
    });
    ltr(c, 'I', pL - 14, pT + 8, '#0284c7', 'center', 13, true);
    ltr(c, 'f', pL + pw + 2, pT + ph + 14, SOFT, 'right', 12.5, true);
  }

  function drawSweep() {
    const sw = st.spec.sweep;
    $('ac-sweep-wrap').style.display = sw ? '' : 'none';
    if (!sw) return;
    const fs = sw.marks.map((m) => m[0]);
    sweepOn($('ac-sweep'), E.solveACCircuit(st.spec.cfg), sw.marks, Math.min.apply(null, fs) * 0.25, Math.max.apply(null, fs) * 1.55, 'הזרם כפונקציה של התדר (בלי מספרים)');
  }

  function drawCompute() {
    drawSketch();
    drawTriangle();
    drawSweep();
    const spec = st.spec, esc = E.escapeHtml;
    let html = (spec.given || []).map((t) => '<span class="chip given">' + esc(t) + '</span>').join('');
    st.station.steps.forEach((sp) => { if (sp.found && st.done[sp.id]) html += '<span class="chip found">' + esc(sp.found) + '</span>'; });
    $('ac-chips').innerHTML = html;
    $('sim-note').innerHTML = 'אפור: נתונים. ירוק: מה שכבר מצאתם. כל תשובה נכונה נרשמת כאן ועל המשולש.';
  }

  // ------------------------------------------------------------------ answers
  function validate(sp, val) {
    const r = E.validateStudentAnswer(String(val), sp.expected, sp.unit, sp.traps || []);
    return { status: r.status === 'correct' ? 'correct' : 'wrong', feedbackHe: r.msgHtml };
  }

  window.GuidedSim = { L: E.L, escapeHtml: E.escapeHtml, init, load, stepDone, validate };
})();
