/**
 * guided/guided.js - the guided activity runner.
 *
 * One page, three views: welcome (name), station (steps on one side, the simulator on the other), final.
 * A step is done once: its record (answers, wrong attempts, hints opened, seconds, points) is kept in
 * localStorage and put in a send queue. The queue is posted to the Google Sheet in small batches and an
 * event leaves the queue only after the sheet confirmed it, so nothing is lost offline or before the
 * sheet is connected.
 *
 * Preview for the teacher: add ?preview=1 to the address. All stations are open, every step can be
 * skipped, the expected answers are shown, and nothing is sent.
 */
(function () {
  'use strict';

  const E = window.RCEngine;
  const V = window.RCVisuals;
  const C = window.GuidedContent;
  const CFG = Object.assign({ endpoint: '', wrongCost: 1, minSolved: 1, revealAfterWrong: 3 }, window.GUIDED_CONFIG || {});
  const L = E.L;
  const esc = E.escapeHtml;
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const PREVIEW = QS.has('preview');
  const KEY = { state: 'u4guided.state.v1', queue: 'u4guided.queue.v1', device: 'u4guided.device' };
  const IMG = 'guided/img/';

  // ------------------------------------------------------------------ storage
  const mem = {};
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(k); return v === null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; }
    },
    set(k, v) {
      mem[k] = v;
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: kept in memory for this visit */ }
    }
  };
  const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const deviceId = () => { let d = store.get(KEY.device, ''); if (!d) { d = uid(); store.set(KEY.device, d); } return d; };

  let S = null;        // the student's saved state
  let A = null;        // the built activity: { stations }
  let flat = [];       // every step, in order
  let view = 'welcome';
  let viewStation = 0; // station on screen (index)

  const save = () => store.set(KEY.state, S);
  const rec = (id) => S.steps[id] || (S.steps[id] = { done: false, earned: 0, wrong: 0, attempts: [], hints: [], revealed: false, startedAt: 0, sec: 0 });
  const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };

  // ------------------------------------------------------------------ scoring
  function worth(sp, r) {
    if (!sp.pts) return 0;
    if (r.revealed) return 0;
    const hintCost = r.hints.reduce((a, i) => a + (sp.hints[i] ? sp.hints[i].cost : 0), 0);
    return Math.max(CFG.minSolved, sp.pts - hintCost - r.wrong * CFG.wrongCost);
  }

  function summarize() {
    const out = { score: 0, max: 0, done: 0, total: flat.length, hints: 0, wrong: 0, revealed: 0, stations: {}, skills: {}, weak: [] };
    A.stations.forEach((st) => { out.stations[st.id] = { earned: 0, max: 0, done: 0, total: st.steps.length }; });
    flat.forEach((sp) => {
      const r = S.steps[sp.id];
      const stn = out.stations[sp.station];
      out.max += sp.pts;
      stn.max += sp.pts;
      if (!r) return;
      out.hints += r.hints.length;
      out.wrong += r.wrong;
      if (r.revealed) out.revealed++;
      if (!r.done) return;
      out.done++;
      stn.done++;
      out.score += r.earned;
      stn.earned += r.earned;
      if (sp.skill && sp.pts) {
        const k = out.skills[sp.skill] || (out.skills[sp.skill] = { earned: 0, max: 0 });
        k.earned += r.earned;
        k.max += sp.pts;
      }
    });
    out.pct = out.max ? Math.round(100 * out.score / out.max) : 0;
    out.weak = Object.keys(out.skills).filter((k) => out.skills[k].earned / out.skills[k].max < 0.6).map((k) => C.SKILLS[k] || k);
    out.durationSec = Math.round(((S.finishedAt || Date.now()) - S.startedAt) / 1000);
    out.finished = Boolean(S.finishedAt);
    return out;
  }

  // ------------------------------------------------------------------ send queue
  // queue = { [attemptId]: { head, summary, events: [ {key, ...step} ] } }
  let sending = false;
  let flushTimer = 0;
  const queue = () => store.get(KEY.queue, {});
  const pending = () => Object.values(queue()).reduce((a, q) => a + q.events.length + (q.dirty ? 1 : 0), 0);

  function head() {
    const p = S.personal;
    return {
      attemptId: S.attemptId, attemptNo: S.attemptNo, student: S.name, phone: S.phone || '', startedAt: S.startedAt, device: deviceId(),
      params: 'R=' + p.R + 'kΩ, C=' + p.C + 'µF, E=' + p.E + 'V, Tp=' + p.Tp + 'ms, t2=' + p.t2 + 'ms, Vt=' + p.Vt + 'V',
      stationTitles: A.stations.map((st) => [st.id, plain(st.short)])
    };
  }

  function enqueue(event) {
    if (PREVIEW) return;
    const q = queue();
    const mine = q[S.attemptId] || (q[S.attemptId] = { head: head(), summary: null, events: [] });
    if (event) mine.events.push(event);
    mine.dirty = true;                  // the submission row must be refreshed even when no step is waiting
    mine.summary = summarize();
    store.set(KEY.queue, q);
    renderSync();
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, event && !S.finishedAt ? 4000 : 50);
  }

  async function post(payload, keepalive) {
    // text/plain keeps this a "simple" request: no CORS preflight, which Apps Script cannot answer.
    const res = await fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), keepalive: Boolean(keepalive) });
    if (!res.ok) throw new Error('http ' + res.status);
    return res.json();
  }

  async function flush(keepalive) {
    if (PREVIEW || sending || !CFG.endpoint) { renderSync(); return; }
    sending = true;
    try {
      const ids = Object.keys(queue());
      for (const id of ids) {
        const item = queue()[id];
        if (!item || (!item.events.length && !item.dirty)) continue;
        const sentKeys = item.events.map((e) => e.key);
        const sentAt = item.summary ? JSON.stringify(item.summary) : '';
        const ans = await post({ type: 'batch', app: C.ACTIVITY_ID, v: C.VERSION, head: item.head, summary: item.summary, events: item.events }, keepalive);
        if (!ans || !ans.ok) throw new Error((ans && ans.error) || 'not ok');
        const q = queue();                      // steps may have been added while the request was in the air
        const now = q[id];
        if (now) {
          now.events = now.events.filter((e) => sentKeys.indexOf(e.key) < 0);
          if ((now.summary ? JSON.stringify(now.summary) : '') === sentAt) now.dirty = false;
          if (!now.events.length && !now.dirty && id !== (S && S.attemptId)) delete q[id];
          store.set(KEY.queue, q);
        }
      }
    } catch (e) {
      /* offline or the sheet is not reachable: everything stays queued and is retried */
    } finally {
      sending = false;
      renderSync();
    }
    if (pending() && CFG.endpoint) { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 20000); }
  }

  function renderSync() {
    const el = $('sync');
    if (!el) return;
    const n = pending();
    if (PREVIEW) { el.className = 'sync off'; el.textContent = 'תצוגה למורה: לא נשלח'; return; }
    if (!S) { el.textContent = ''; return; }
    if (!CFG.endpoint) { el.className = 'sync wait'; el.textContent = 'נשמר במכשיר'; el.title = 'הגיליון עדיין לא חובר. העבודה שמורה במכשיר ותישלח כשיחובר.'; return; }
    if (n) { el.className = 'sync wait'; el.textContent = sending ? 'שולח...' : 'ממתין לשליחה'; el.title = ''; return; }
    el.className = 'sync ok'; el.textContent = 'נשמר ונשלח ✓'; el.title = '';
  }

  // ------------------------------------------------------------------ the simulator panel
  const sim = { spec: null, tl: null, network: 'LP', mode: 'full', key: '', cursor: null, playing: false, pins: [], geom: null, raf: 0, phase: 0, onPlayed: null };
  const simKey = (spec) => JSON.stringify([spec.cfg.R1_ohm, spec.cfg.C_F, spec.cfg.transitions, spec.network]);
  const tU = () => sim.tl.timeUnit;
  const toU = (t_s) => E.fromSeconds(t_s, tU());
  const snapStep = () => { const span = toU(sim.tl.tViewEnd_s) - toU(sim.tl.tViewStart_s); return Math.pow(10, Math.floor(Math.log10(span / 400))); };
  const played = () => PREVIEW || Boolean(S.played[sim.key]);

  function pinsFor(station, spec, current) {
    const key = simKey(spec);
    const pins = [];
    station.steps.forEach((sp) => {
      if (!sp.pin || !sp.sim || simKey(sp.sim) !== key) return;
      const r = S.steps[sp.id];
      if (!r || !r.done) return;
      pins.push({ t_s: sp.pin.t * 1e-3, v: sp.pin.v, label: sp.pin.label, targetLineV: sp.pin.line });
    });
    if (current && current.sim && Number.isFinite(current.sim.line) && !pins.some((p) => p.targetLineV === current.sim.line)) pins.push({ targetLineV: current.sim.line });
    return pins;
  }

  function simLoad(station, sp) {
    const spec = sp.sim;
    if (!spec) return;
    const key = simKey(spec);
    cancelAnimationFrame(sim.raf);
    sim.playing = false;
    if (key !== sim.key) sim.cursor = null;
    sim.spec = spec;
    sim.key = key;
    sim.tl = E.compileTimeline(spec.cfg);
    sim.network = spec.network;
    sim.mode = spec.mode;
    sim.pins = pinsFor(station, spec, sp);
    if (Number.isFinite(spec.cursor)) sim.cursor = spec.cursor * 1e-3;
    if (sim.cursor === null) sim.cursor = played() ? sim.tl.tViewEnd_s : sim.tl.tViewStart_s;
    $('sim-tunit').textContent = tU();
    $('sim-mode').textContent = sim.mode === 'full' ? 'מדידה חופשית' : 'מצב חישוב';
    $('sim-mode').className = 'sim-mode ' + sim.mode;
    $('sim-t').step = String(snapStep());
    simDraw();
  }

  function simDraw() {
    if (!sim.tl) return;
    const tl = sim.tl;
    const shown = played() || sim.playing;
    const t = sim.cursor;
    const ev = E.evaluateAt(tl, t, 'after');
    const live = sim.mode === 'full' && shown;
    let vMax = 1;
    tl.segments.forEach((sg) => { vMax = Math.max(vMax, Math.abs(sg.Vi)); });
    // Two outputs: both schematics side by side (visuals.js does that from 540 px up). Each half is too
    // narrow for value labels, so there the values stay in the read-out row below the graph.
    const both = sim.network === 'BOTH';
    V.drawCircuit($('sim-circuit'), {
      network: sim.network,
      R1_ohm: ev.segment.R_ohm, R2_ohm: 0, C_F: tl.C_F, hasSwitch: null, switchClosed: false,
      Vi: shown && !both ? ev.Vi : undefined,
      Vc: live && !both ? ev.Vc : undefined,
      Vr: live && !both ? ev.Vr : undefined,
      I_A: sim.playing ? ev.I_A : 0,
      vMax, animPhase: sim.phase, sidePad: both ? undefined : 100
    }, 196);
    sim.geom = V.drawOscilloscope($('sim-scope'), tl, {
      network: sim.network,
      cursorT_s: t,
      cursorSide: 'after',
      revealUpToCursor: !played() || sim.playing,
      showTauMarkers: Boolean(sim.spec.showTau) && shown,
      showEndpoints: false,
      pins: shown ? sim.pins : [],
      hideKeyLevels: sim.mode === 'graph',
      height: 340
    });
    // read-outs
    const tl0 = tl.tViewStart_s, tl1 = tl.tViewEnd_s;
    $('sim-slider').value = String(Math.round(1000 * (t - tl0) / (tl1 - tl0)));
    if (document.activeElement !== $('sim-t')) $('sim-t').value = E.fmtNum(toU(t), 2);
    const row = (name, val, cls) => '<div class="ro ' + (cls || '') + '"><span class="ro-n">' + name + '</span><span class="ro-v" dir="ltr">' + val + '</span></div>';
    let html = row('t', E.fmtFixed(toU(t), 2) + ' ' + tU()) + row('Vi', shown ? E.fmtFixed(ev.Vi, 2) + ' V' : '-', 'vi');
    if (sim.mode === 'full') {
      html += row('VC', shown ? E.fmtFixed(ev.Vc, 2) + ' V' : '-', 'lp') + row('VR', shown ? E.fmtFixed(ev.Vr, 2) + ' V' : '-', 'hp') + row('I', shown ? E.fmtCurrent(ev.I_A) : '-');
      $('sim-note').innerHTML = shown ? 'ירוק: המתח על הקבל ' + L('VC') + '. אדום: המתח על הנגד ' + L('VR') + '.' : 'לחצו על ▶ הפעל כדי להתחיל.';
    } else {
      html += row('Vo', '🔒', 'lock');
      $('sim-note').innerHTML = shown ? 'כאן מחשבים: כל תשובה נכונה תסומן על הגרף.' : 'לחצו על ▶ הפעל כדי לראות את צורת המוצא.';
    }
    $('sim-readouts').innerHTML = html;
    $('sim-play').textContent = sim.playing ? '⏸ עצור' : '▶ הפעל';
  }

  function simSetCursor(t_s) {
    if (!sim.tl || sim.playing) return;
    const tl = sim.tl;
    if (!played()) { flash($('sim-play')); return; }
    const step = E.toSeconds(snapStep(), tU());
    const snapped = Math.round(t_s / step) * step;
    sim.cursor = Math.max(tl.tViewStart_s, Math.min(tl.tViewEnd_s, snapped));
    simDraw();
  }

  function simPlay() {
    if (!sim.tl) return;
    if (sim.playing) { cancelAnimationFrame(sim.raf); sim.playing = false; simDraw(); return; }
    const tl = sim.tl;
    const t0 = tl.tViewStart_s, t1 = tl.tViewEnd_s;
    const dur = 3400;
    const start = performance.now();
    sim.playing = true;
    const frame = (now) => {
      const p = Math.min(1, (now - start) / dur);
      sim.cursor = t0 + p * (t1 - t0);
      sim.phase += 0.02;
      if (p >= 1) {
        sim.playing = false;
        if (!PREVIEW) { S.played[sim.key] = true; save(); }
        simDraw();
        if (typeof sim.onPlayed === 'function') sim.onPlayed();
        return;
      }
      simDraw();
      sim.raf = requestAnimationFrame(frame);
    };
    sim.raf = requestAnimationFrame(frame);
  }

  function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

  function initSim() {
    $('sim-play').addEventListener('click', simPlay);
    $('sim-slider').addEventListener('input', (e) => {
      const tl = sim.tl; if (!tl) return;
      simSetCursor(tl.tViewStart_s + (Number(e.target.value) / 1000) * (tl.tViewEnd_s - tl.tViewStart_s));
    });
    $('sim-t').addEventListener('change', (e) => {
      const v = Number(String(e.target.value).replace(',', '.'));
      if (Number.isFinite(v)) simSetCursor(E.toSeconds(v, tU()));
      e.target.blur();
    });
    $('sim-t').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.dispatchEvent(new Event('change')); });
    const scope = $('sim-scope');
    let dragging = false;
    const at = (e) => {
      const g = sim.geom; if (!g) return;
      const r = scope.getBoundingClientRect();
      const x = e.clientX - r.left;
      simSetCursor(g.tMin + ((x - g.padL) / g.plotW) * (g.tMax - g.tMin));
    };
    scope.addEventListener('pointerdown', (e) => { dragging = true; scope.setPointerCapture(e.pointerId); at(e); });
    scope.addEventListener('pointermove', (e) => { if (dragging) at(e); });
    scope.addEventListener('pointerup', () => { dragging = false; });
    scope.addEventListener('pointercancel', () => { dragging = false; });
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(simDraw, 120); });
  }

  // ------------------------------------------------------------------ rendering helpers
  const img = (name, cls) => '<img class="' + (cls || 'vignette') + '" src="' + IMG + name + '.webp" alt="" onerror="this.remove()">';
  const mathBlock = (lines) => '<div class="math" dir="ltr">' + lines.map((l) => '<div>' + esc(l) + '</div>').join('') + '</div>';
  const solutionHtml = (sp) => (sp.solution || []).map((s) => mathBlock([s.f, s.s, s.r])).join('');
  const expectedText = (sp) => (sp.type === 'num' ? E.fmtFixed(sp.expected, 2) + ' ' + sp.unit : sp.type === 'mc' ? plain(sp.options.find((o) => o.correct).html) : '');

  function stationState(i) {
    const st = A.stations[i];
    const done = st.steps.every((sp) => S.steps[sp.id] && S.steps[sp.id].done);
    const open = PREVIEW || i === 0 || A.stations.slice(0, i).every((p) => p.steps.every((sp) => S.steps[sp.id] && S.steps[sp.id].done));
    return { done, open };
  }
  const currentStep = (st) => st.steps.find((sp) => !(S.steps[sp.id] && S.steps[sp.id].done)) || null;

  function renderHeader() {
    const sm = summarize();
    $('hdr-score').innerHTML = '<b dir="ltr">' + sm.score + '</b> מתוך <span dir="ltr">' + sm.max + '</span> נק\'';
    $('hdr-name').textContent = S.name;
    $('route').innerHTML = A.stations.map((st, i) => {
      const s = stationState(i);
      const cls = (i === viewStation && view === 'station' ? ' here' : '') + (s.done ? ' done' : '') + (s.open ? '' : ' locked');
      return '<button class="stop' + cls + '" data-station="' + i + '"' + (s.open ? '' : ' disabled') + '><span class="stop-n" dir="ltr">' + (s.done ? '✓' : i + 1) + '</span><span class="stop-t">' + st.short + '</span></button>';
    }).join('<span class="leg"></span>');
    $('progress-bar').style.width = Math.round(100 * sm.done / sm.total) + '%';
    renderSync();
  }

  // ------------------------------------------------------------------ station view
  function showStation(i, scroll) {
    view = 'station';
    viewStation = i;
    if (!PREVIEW) { S.cur = i; save(); }
    document.body.dataset.view = 'station';
    const st = A.stations[i];
    const cur = currentStep(st);
    let html = '<header class="st-head">' + img(st.img, 'st-img') + '<div><div class="st-kicker">תחנה <span dir="ltr">' + (i + 1) + '</span> מתוך <span dir="ltr">' + A.stations.length + '</span></div><h2>' + st.title + '</h2><p>' + st.introHe + '</p></div></header>';
    if (st.question) {
      const q = st.question;
      html += '<section class="qcard' + (q.personal ? ' personal' : '') + '"><div class="q-src">' + esc(q.sourceHe) + (q.personal ? ' · ' + esc(S.name) : '') + '</div>' + q.textHe;
      if (q.figs) html += '<div class="q-figs">' + q.figs.map((f) => '<figure><img src="' + IMG + f.src + '" alt="' + esc(f.cap) + '"><figcaption>' + esc(f.cap) + '</figcaption></figure>').join('') + '</div>';
      html += '</section>';
    }
    html += '<ol class="steps">';
    let lockedCount = 0;
    st.steps.forEach((sp, k) => {
      const r = S.steps[sp.id];
      if (r && r.done) html += doneStepHtml(sp, r, k);
      else if (sp === cur) html += '<li class="step current" id="step-current" data-step="' + sp.id + '"></li>';
      else lockedCount++;
    });
    html += '</ol>';
    if (lockedCount) html += '<p class="locked-note">עוד <span dir="ltr">' + lockedCount + '</span> שלבים בתחנה הזאת.</p>';
    if (!cur) html += stationEndHtml(i);
    $('steps-col').innerHTML = html;
    renderHeader();
    if (cur) {
      const r = rec(cur.id);
      if (!r.startedAt) { r.startedAt = Date.now(); if (!PREVIEW) save(); }
      renderCurrent(st, cur, k_of(st, cur));
      simLoad(st, cur);
    } else {
      simLoad(st, st.steps[st.steps.length - 1]);
    }
    if (scroll) {
      const target = $('step-current') || $('station-end');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' }); else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  const k_of = (st, sp) => st.steps.indexOf(sp);

  function badge(sp, k, st) {
    return '<div class="step-top"><span class="step-n">שלב <span dir="ltr">' + (k + 1) + '</span> מתוך <span dir="ltr">' + st.steps.length + '</span></span>'
      + (sp.tagHe ? '<span class="tag">' + esc(sp.tagHe) + '</span>' : '')
      + (sp.pts ? '<span class="pts" dir="rtl"><span dir="ltr">' + sp.pts + '</span> נק\'</span>' : '') + '</div>';
  }

  function doneStepHtml(sp, r, k) {
    const st = A.stations.find((s) => s.id === sp.station);
    let body = sp.bodyHe;
    if (sp.type === 'num') body += '<p class="given">התשובה: ' + L(E.fmtFixed(sp.expected, 2) + ' ' + sp.unit) + '</p>' + solutionHtml(sp);
    if (sp.type === 'mc') { const o = sp.options.find((x) => x.correct); body += '<p class="given">' + o.html + '</p><p class="fb good">' + o.fb + '</p>'; }
    if (sp.afterHe) body += '<p class="after">' + sp.afterHe + '</p>';
    const score = sp.pts ? '<span class="got' + (r.earned === sp.pts ? ' full' : r.earned === 0 ? ' zero' : '') + '" dir="ltr">' + r.earned + ' / ' + sp.pts + '</span>' : '<span class="got none">✓</span>';
    return '<li class="step done"><details><summary><span class="tick">✓</span><span class="d-title">' + sp.titleHe + '</span>' + score + '</summary><div class="d-body">' + badge(sp, k, st) + body + '</div></details></li>';
  }

  function stationEndHtml(i) {
    const st = A.stations[i];
    const sm = summarize().stations[st.id];
    const last = i === A.stations.length - 1;
    const allDone = A.stations.every((_, j) => stationState(j).done);
    return '<section class="st-end" id="station-end"><h3>התחנה הושלמה</h3>'
      + (sm.max ? '<p>צברת כאן <b dir="ltr">' + sm.earned + '</b> מתוך <span dir="ltr">' + sm.max + '</span> נקודות.</p>' : '')
      + (last || allDone ? '<button class="btn primary big" data-act="finish">לסיכום ולהגשה</button>' : '<button class="btn primary big" data-act="next-station">לתחנה הבאה ◀</button>')
      + '</section>';
  }

  function renderCurrent(st, sp, k) {
    const el = $('step-current');
    const r = rec(sp.id);
    let html = badge(sp, k, st) + '<h3>' + sp.titleHe + '</h3>' + (sp.img && sp.type === 'info' ? img(sp.img, 'step-img') : '') + '<div class="body">' + sp.bodyHe + '</div>';
    if (sp.type === 'info') {
      html += '<div class="actions"><button class="btn primary" data-act="info-ok">הבנתי, ממשיכים</button></div>';
    } else if (sp.type === 'sim') {
      html += '<div class="task" id="task-state">ממתין להפעלת הסימולטור...</div>';
    } else if (sp.type === 'num') {
      html += '<div class="answer"><label for="ans">התשובה שלך:</label><span class="num" dir="ltr"><input id="ans" type="text" inputmode="decimal" autocomplete="off" spellcheck="false"><span class="unit">' + esc(sp.unit) + '</span></span><button class="btn primary" data-act="check">בדיקה</button></div>';
    } else if (sp.type === 'mc') {
      html += '<div class="options">' + sp.options.map((o, j) => '<button class="opt" data-opt="' + j + '"><span class="opt-l">' + 'אבגד'[j] + '</span><span class="opt-t">' + o.html + '</span></button>').join('') + '</div>';
    }
    if (sp.pts) html += '<div class="worth" id="worth"></div>';
    if (sp.hints && sp.hints.length) html += '<div class="hints" id="hints"></div>';
    html += '<div class="feedback" id="feedback"></div>';
    if (PREVIEW) html += '<div class="preview-bar"><span>' + (expectedText(sp) ? 'תשובה: ' + esc(expectedText(sp)) : 'שלב בלי תשובה') + '</span><button class="btn ghost" data-act="skip">דלג</button></div>';
    el.innerHTML = html;
    renderWorth(sp, r);
    renderHints(sp, r);
    if (sp.type === 'mc') (r.wrongOpts || []).forEach((j) => markWrongOpt(sp, j));
    if (sp.type === 'sim') {
      sim.onPlayed = () => { if (!rec(sp.id).done) complete(st, sp, 'sim'); };
      if (S.played[simKey(sp.sim)] && !PREVIEW) setTimeout(() => { if (!rec(sp.id).done) complete(st, sp, 'sim'); }, 0);
    } else {
      sim.onPlayed = null;
    }
    const inp = $('ans');
    if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(st, sp); } });
  }

  function renderWorth(sp, r) {
    const el = $('worth');
    if (!el) return;
    const w = worth(sp, r);
    el.innerHTML = 'השלב שווה כרגע <b dir="ltr">' + w + '</b> מתוך <span dir="ltr">' + sp.pts + '</span> נקודות';
    el.classList.toggle('dropped', w < sp.pts);
  }

  function renderHints(sp, r) {
    const el = $('hints');
    if (!el) return;
    let html = '';
    r.hints.forEach((i) => { html += '<div class="hint-open">' + img('hint', 'hint-img') + '<div><b>רמז <span dir="ltr">' + (i + 1) + '</span></b><p>' + sp.hints[i].html + '</p></div></div>'; });
    const next = r.hints.length;
    if (next < sp.hints.length) {
      html += '<button class="btn hint" data-act="hint">💡 רמז <span dir="ltr">' + (next + 1) + '</span> מתוך <span dir="ltr">' + sp.hints.length + '</span> <span class="cost" dir="rtl">(מוריד <span dir="ltr">' + sp.hints[next].cost + '</span> נק\')</span></button>';
    }
    const canReveal = sp.type === 'num' && (r.wrong >= CFG.revealAfterWrong || (next >= sp.hints.length && r.wrong >= 1));
    if (canReveal) html += '<button class="btn reveal" data-act="reveal">הצג פתרון (השלב יהיה שווה 0 נקודות)</button>';
    el.innerHTML = html;
  }

  function feedback(cls, html) { const f = $('feedback'); if (f) { f.className = 'feedback ' + cls; f.innerHTML = html; } }
  function markWrongOpt(sp, j) {
    const b = document.querySelector('.opt[data-opt="' + j + '"]');
    if (!b) return;
    b.classList.add('wrong');
    b.disabled = true;
    if (!b.querySelector('.opt-fb')) b.insertAdjacentHTML('beforeend', '<span class="opt-fb">' + sp.options[j].fb + '</span>');
  }

  // ------------------------------------------------------------------ answering
  function parseNum(raw) {
    const cleaned = String(raw || '').trim().replace(/,/g, '.').replace(/[−–]/g, '-').replace(/[^\d.\-+eE]/g, '');
    if (!cleaned || isNaN(Number(cleaned))) return null;
    return Number(cleaned);
  }

  function check(st, sp) {
    const r = rec(sp.id);
    if (r.done) return;
    const raw = $('ans').value;
    const val = parseNum(raw);
    if (val === null) { feedback('warn', 'הקלידו מספר, למשל ' + L('3.57') + ' או ' + L('-4.66') + '.'); return; }
    if (r.attempts.length < 20) r.attempts.push(String(raw).trim().slice(0, 20));
    let res;
    if (Number.isFinite(sp.tolAbs) && Math.abs(val - sp.expected) <= sp.tolAbs) {
      res = { status: 'correct', feedbackHe: 'נכון. קריאה מדויקת.' };
    } else {
      res = E.validateStudentAnswer(String(val), { expected: sp.expected, unit: sp.unit, traps: sp.traps, isTimeQuestion: Boolean(sp.isTime), dtDisplay: sp.dt });
    }
    if (res.status === 'correct') { complete(st, sp, 'answer', res.feedbackHe); return; }
    r.wrong++;
    if (!PREVIEW) save();
    feedback('bad', res.feedbackHe || 'לא מדויק. בדקו את החישוב ונסו שוב.');
    renderWorth(sp, r);
    renderHints(sp, r);
    flash($('ans'));
  }

  function choose(st, sp, j) {
    const r = rec(sp.id);
    if (r.done) return;
    const o = sp.options[j];
    if (r.attempts.length < 20) r.attempts.push('אבגד'[j]);
    if (o.correct) { complete(st, sp, 'answer', o.fb); return; }
    r.wrong++;
    (r.wrongOpts || (r.wrongOpts = [])).push(j);
    if (!PREVIEW) save();
    markWrongOpt(sp, j);
    renderWorth(sp, r);
  }

  function openHint(st, sp) {
    const r = rec(sp.id);
    if (r.done || r.hints.length >= sp.hints.length) return;
    r.hints.push(r.hints.length);
    if (!PREVIEW) save();
    renderWorth(sp, r);
    renderHints(sp, r);
  }

  let revealArmed = '';
  function reveal(st, sp, btn) {
    if (revealArmed !== sp.id) { revealArmed = sp.id; btn.textContent = 'בטוח? לחיצה נוספת תציג את הפתרון, והשלב יהיה שווה 0 נקודות'; btn.classList.add('armed'); return; }
    revealArmed = '';
    rec(sp.id).revealed = true;
    complete(st, sp, 'reveal');
  }

  function complete(st, sp, how, fbHtml) {
    const r = rec(sp.id);
    if (r.done) return;
    r.earned = how === 'skip' ? 0 : worth(sp, r);
    r.done = true;
    r.doneAt = Date.now();
    r.sec = Math.max(0, Math.round((r.doneAt - (r.startedAt || r.doneAt)) / 1000));
    if (!PREVIEW) save();
    if (sp.pts || sp.type !== 'info') {
      enqueue({
        key: S.attemptId + '|' + sp.id, stepId: sp.id, station: sp.station, title: plain(sp.titleHe), skill: sp.skill ? (C.SKILLS[sp.skill] || sp.skill) : '',
        kind: sp.type, attempts: r.attempts.join(' ; '), expected: expectedText(sp), unit: sp.unit || '', wrong: r.wrong, hints: r.hints.length,
        revealed: r.revealed ? 1 : 0, earned: r.earned, pts: sp.pts, sec: r.sec, at: r.doneAt
      });
    }
    if (how === 'skip' || sp.type === 'info') { showStation(viewStation, true); return; }

    // stay on the card: show the result, the worked solution and a "continue" button
    const el = $('step-current');
    el.classList.add('solved');
    el.querySelectorAll('.answer input, .answer button, .opt, .btn.hint, .btn.reveal').forEach((b) => { b.disabled = true; });
    if (sp.type === 'mc') { const j = sp.options.findIndex((o) => o.correct); const b = el.querySelector('.opt[data-opt="' + j + '"]'); if (b) b.classList.add('right'); }
    if (sp.type === 'sim') { const t = $('task-state'); if (t) { t.className = 'task ok'; t.textContent = 'הסימולציה הופעלה ✓'; } }
    let html = '';
    if (how === 'reveal') html += '<p class="fb-line">הפתרון המלא לפניך. עברו עליו שורה אחרי שורה לפני שממשיכים.</p>';
    else if (fbHtml) html += '<p class="fb-line">' + fbHtml + '</p>';
    if (sp.pts) html += '<p class="fb-pts">קיבלת <b dir="ltr">' + r.earned + '</b> מתוך <span dir="ltr">' + sp.pts + '</span> נקודות.</p>';
    if (sp.type === 'num') html += '<div class="sol-title">דרך הפתרון</div>' + solutionHtml(sp);
    if (sp.afterHe) html += '<p class="after">' + sp.afterHe + '</p>';
    html += '<div class="actions"><button class="btn primary" data-act="continue">המשך ◀</button></div>';
    feedback(how === 'reveal' ? 'shown' : 'good', html);
    const w = $('worth'); if (w) w.remove();
    el.querySelectorAll('.btn.hint, .btn.reveal').forEach((b) => b.remove());
    // the simulator confirms: the answer appears on the graph
    sim.pins = pinsFor(st, sp.sim, null);
    if (sp.pin && !played()) { S.played[sim.key] = true; if (!PREVIEW) save(); }   // the answer is known now: show the whole curve with it
    if (sp.pin) sim.cursor = sp.pin.t * 1e-3;
    simDraw();
    if (sp.pin) flash($('sim-panel'));
    renderHeader();
    const fbEl = $('feedback');
    if (fbEl && fbEl.getBoundingClientRect().bottom > window.innerHeight - 10) fbEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // focus "continue" only after the key that submitted the answer was released: otherwise the same
    // Enter press also activates the button and the feedback is skipped before it can be read
    const btn = el.querySelector('[data-act="continue"]');
    if (btn) setTimeout(() => { if (document.body.contains(btn)) btn.focus({ preventScroll: true }); }, 450);
  }

  // ------------------------------------------------------------------ welcome and final
  function showWelcome() {
    view = 'welcome';
    document.body.dataset.view = 'welcome';
    const pre = (QS.get('n') || '').trim();
    const has = S && S.name;
    $('welcome').innerHTML = '<div class="hero">' + img('hero', 'hero-img') + '<div class="hero-text"><div class="kicker">יחידה <span dir="ltr">U4</span> · אלקטרוניקה תקבילית י"א · שאלון <span dir="ltr">815381</span></div><h1>' + C.ACTIVITY_TITLE_HTML + '</h1><p>חמש תחנות: תזכורת קצרה, שתי שאלות בגרות מודרכות, ומשימה אישית להגשה. בכל שלב מפעילים את הסימולטור, מחשבים ומקלידים תשובה.</p></div></div>'
      + '<div class="welcome-grid"><section class="card rules"><h2>איך זה עובד</h2><ul>'
      + '<li>לכל שלב יש ניקוד. תשובה נכונה בניסיון ראשון ובלי רמזים נותנת את מלוא הנקודות.</li>'
      + '<li><b>רמז עולה נקודות</b>: המחיר כתוב על הכפתור. תשובה שגויה מורידה נקודה.</li>'
      + '<li><b>דף הנוסחאות חינם</b> וזמין תמיד בכפתור שלמעלה.</li>'
      + '<li>העבודה נשמרת כל הזמן. אפשר לסגור את הדף ולהמשיך אחר כך מאותו מקום.</li>'
      + '<li>בתחנה האחרונה לכל אחד רכיבים משלו. התוצאות נשלחות למורה.</li></ul></section>'
      + '<section class="card signin"><h2>' + (has ? 'ממשיכים?' : 'מתחילים') + '</h2>'
      + (has ? '<p>שלום ' + esc(S.name) + '. העבודה שלך שמורה במכשיר הזה.</p><button class="btn primary big" data-act="resume">להמשיך מאיפה שעצרתי</button><button class="btn ghost" data-act="other">זה לא אני / התחלה מחדש</button>'
        : '<label>שם פרטי<input id="first" type="text" autocomplete="given-name" value="' + esc(pre.split(' ')[0] || '') + '"></label><label>שם משפחה<input id="last" type="text" autocomplete="family-name" value="' + esc(pre.split(' ').slice(1).join(' ')) + '"></label><label>טלפון נייד<input id="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" placeholder="050-0000000"></label><p class="err" id="name-err"></p><button class="btn primary big" data-act="start">יוצאים לדרך</button><p class="small">כתבו את השם המלא שלכם: לפיו נקבעים הנתונים האישיים ולפיו המורה מזהה את ההגשה. הטלפון נשלח למורה בלבד.</p>')
      + (PREVIEW ? '<p class="small">מצב תצוגה למורה: כל התחנות פתוחות ושום דבר לא נשלח.</p>' : '')
      + '</section></div><div id="test-box"></div>';
    if (QS.has('test')) runTest();
  }

  async function runTest() {
    const box = $('test-box');
    if (!CFG.endpoint) { box.innerHTML = '<p class="card">בדיקת חיבור: עדיין לא הוגדרה כתובת בקובץ <span dir="ltr">guided/config.js</span>.</p>'; return; }
    box.innerHTML = '<p class="card">בודק חיבור לגיליון...</p>';
    try { const a = await post({ type: 'ping' }); box.innerHTML = '<p class="card">' + (a && a.ok ? 'החיבור לגיליון תקין ✓' : 'הגיליון ענה, אבל לא כמצופה.') + '</p>'; }
    catch (e) { box.innerHTML = '<p class="card">אין חיבור לגיליון. בדקו את הכתובת ואת הגדרות הפריסה (Anyone).</p>'; }
  }

  /** Israeli mobile number -> ten digits (05XXXXXXXX), or '' when it is not one. Accepts spaces, hyphens and +972. */
  function normPhone(raw) {
    let d = String(raw || '').replace(/[^\d+]/g, '');
    if (d.indexOf('+972') === 0) d = '0' + d.slice(4);
    else if (d.indexOf('972') === 0 && d.length >= 12) d = '0' + d.slice(3);
    d = d.replace(/\D/g, '');
    return /^05\d{8}$/.test(d) ? d : '';
  }

  function begin(name, phone) {
    const old = store.get(KEY.state, null);
    const sameName = old && old.name === name;
    S = { v: 1, name, phone: phone || '', attemptId: uid(), attemptNo: sameName ? (old.attemptNo || 1) + 1 : 1, startedAt: Date.now(), personal: C.makePersonal(name), steps: {}, played: {}, cur: 0, finishedAt: 0 };
    if (!PREVIEW) save();
    load();
    showStation(0, false);
    window.scrollTo(0, 0);
  }

  function load() {
    A = C.build(S.personal);
    flat = [];
    A.stations.forEach((st) => st.steps.forEach((sp) => flat.push(sp)));
  }

  function showFinal() {
    if (!S.finishedAt) { S.finishedAt = Date.now(); if (!PREVIEW) save(); enqueue(null); }
    view = 'final';
    document.body.dataset.view = 'final';
    const sm = summarize();
    const great = sm.pct >= 75;
    const rows = A.stations.map((st) => { const x = sm.stations[st.id]; return x.max ? '<tr><td>' + st.title + '</td><td dir="ltr">' + x.earned + ' / ' + x.max + '</td></tr>' : ''; }).join('');
    const skills = Object.keys(sm.skills).map((k) => { const x = sm.skills[k]; const p = Math.round(100 * x.earned / x.max); return '<tr class="' + (p < 60 ? 'weak' : p >= 85 ? 'strong' : '') + '"><td>' + esc(C.SKILLS[k] || k) + '</td><td dir="ltr">' + p + '%</td></tr>'; }).join('');
    $('final').innerHTML = '<section class="card final-top">' + img(great ? 'res-great' : 'res-keep', 'final-img') + '<div><h1>' + (great ? 'עבודה יפה, ' : 'סיימת, ') + esc(S.name) + '</h1><div class="final-score"><b dir="ltr">' + sm.score + '</b> מתוך <span dir="ltr">' + sm.max + '</span> נקודות <span class="pct" dir="ltr">' + sm.pct + '%</span></div>'
      + '<p>' + (sm.weak.length ? 'כדאי לחזק: ' + sm.weak.map(esc).join(', ') + '.' : 'אין נושא שנפלת בו מתחת ל-60 אחוז.') + '</p>'
      + '<p class="small">רמזים שנפתחו: <span dir="ltr">' + sm.hints + '</span> · תשובות שגויות: <span dir="ltr">' + sm.wrong + '</span> · זמן: <span dir="ltr">' + Math.round(sm.durationSec / 60) + '</span> דקות</p></div></section>'
      + '<div class="final-grid"><section class="card"><h2>לפי תחנה</h2><table class="tbl">' + rows + '</table></section><section class="card"><h2>לפי מיומנות</h2><table class="tbl">' + skills + '</table></section></div>'
      + '<section class="card submit"><h2>ההגשה</h2><p id="submit-state"></p><p class="small">קוד הגשה: <b dir="ltr">' + esc(S.attemptId.slice(-6).toUpperCase()) + '</b> · ניסיון מספר <span dir="ltr">' + S.attemptNo + '</span></p>'
      + '<div class="actions"><button class="btn primary" data-act="resend">שליחה חוזרת</button><button class="btn ghost" data-act="review">חזרה לתחנות</button></div></section>';
    renderHeader();
    renderSubmitState();
    window.scrollTo(0, 0);
    if (!PREVIEW) flush();
  }

  function renderSubmitState() {
    const el = $('submit-state');
    if (!el) return;
    if (PREVIEW) el.textContent = 'מצב תצוגה למורה: לא נשלחה הגשה.';
    else if (!CFG.endpoint) el.textContent = 'העבודה שמורה במכשיר הזה. היא תישלח למורה אוטומטית כשהגיליון יחובר: אל תמחקו את נתוני הדפדפן.';
    else if (pending()) el.textContent = 'ההגשה ממתינה לשליחה. בדקו את החיבור לרשת ולחצו על "שליחה חוזרת".';
    else el.textContent = 'ההגשה התקבלה אצל המורה ✓';
  }

  // ------------------------------------------------------------------ formula sheet
  function formulaHtml() {
    const F = C.FORMULAS;
    return '<table class="ftable"><thead><tr><th>נוסחה</th><th>מה היא אומרת</th><th>מתי משתמשים</th></tr></thead><tbody>'
      + F.rows.map((r) => '<tr><td class="f" dir="ltr">' + esc(r.f) + '</td><td>' + r.what + '</td><td>' + r.when + '</td></tr>').join('') + '</tbody></table>'
      + '<h3>שתי הרשתות זו מול זו</h3><table class="ftable cmp"><tbody>' + F.compare.map((row, i) => '<tr>' + row.map((c) => (i === 0 ? '<th>' + c + '</th>' : '<td>' + c + '</td>')).join('') + '</tr>').join('') + '</tbody></table>'
      + '<h3>ערכים שימושיים</h3><table class="ftable etab" dir="ltr"><tbody>' + F.table.map((row) => '<tr>' + row.map((c, j) => (j === 0 ? '<th>' + esc(c) + '</th>' : '<td>' + esc(c) + '</td>')).join('') + '</tr>').join('') + '</tbody></table>'
      + '<p class="small">אחרי קבוע זמן אחד עוברים 63 אחוז מהדרך; אחרי חמישה קבועי זמן הקטע נחשב גמור.</p>';
  }

  // ------------------------------------------------------------------ events
  function onClick(e) {
    const stop = e.target.closest('[data-station]');
    if (stop && S) { showStation(Number(stop.dataset.station), false); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const optBtn = e.target.closest('.opt');
    const actEl = e.target.closest('[data-act]');
    const st = A && A.stations[viewStation];
    const cur = st && view === 'station' ? currentStep(st) : null;
    if (optBtn && cur && cur.type === 'mc') { choose(st, cur, Number(optBtn.dataset.opt)); return; }
    if (!actEl) return;
    const act = actEl.dataset.act;
    if (act === 'start') {
      const first = $('first').value.trim().replace(/\s+/g, ' '), last = $('last').value.trim().replace(/\s+/g, ' ');
      if (first.length < 2 || last.length < 2) { $('name-err').textContent = 'צריך שם פרטי ושם משפחה.'; return; }
      const phone = normPhone($('phone').value);
      if (!phone) { $('name-err').textContent = 'צריך מספר טלפון נייד תקין, למשל 050-1234567.'; return; }
      begin((first + ' ' + last).slice(0, 60), phone);
    } else if (act === 'resume') { if (S.finishedAt) showFinal(); else showStation(Math.min(S.cur || 0, A.stations.length - 1), false); }
    else if (act === 'other') { if (S && !PREVIEW) { enqueue(null); flush(); } S = null; store.set(KEY.state, null); showWelcome(); }
    else if (act === 'formulas') { $('sheet-body').innerHTML = formulaHtml(); $('sheet').classList.add('open'); }
    else if (act === 'close-sheet') $('sheet').classList.remove('open');
    else if (act === 'home') { if (S) showWelcome(); }
    else if (act === 'info-ok' && cur) complete(st, cur, 'info');
    else if (act === 'check' && cur) check(st, cur);
    else if (act === 'hint' && cur) openHint(st, cur);
    else if (act === 'reveal' && cur) reveal(st, cur, actEl);
    else if (act === 'skip' && cur && PREVIEW) complete(st, cur, 'skip');
    else if (act === 'continue') showStation(viewStation, true);
    else if (act === 'next-station') { showStation(Math.min(viewStation + 1, A.stations.length - 1), false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (act === 'finish') showFinal();
    else if (act === 'review') showStation(A.stations.length - 1, false);
    else if (act === 'resend') { flush().then(renderSubmitState); }
  }

  function init() {
    document.documentElement.setAttribute('data-theme', 'light');
    initSim();
    document.addEventListener('click', onClick);
    $('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) $('sheet').classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('sheet').classList.remove('open'); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && pending()) flush(true); });
    window.addEventListener('online', () => flush());
    if (PREVIEW) document.body.classList.add('preview');
    S = PREVIEW ? null : store.get(KEY.state, null);
    if (S && S.v === 1 && S.name) { load(); showWelcome(); flush(); }
    else { S = null; showWelcome(); }
    if (PREVIEW) { S = { v: 1, name: (QS.get('n') || 'תצוגת מורה').trim(), attemptId: 'preview', attemptNo: 1, startedAt: Date.now(), steps: {}, played: {}, cur: 0, finishedAt: 0 }; S.personal = C.makePersonal(S.name); load(); showStation(Number(QS.get('s') || 1) - 1 || 0, false); }
    // let the sync badge follow the queue while a final submission is on screen
    setInterval(() => { if (view === 'final') renderSubmitState(); }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
