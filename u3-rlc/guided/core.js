/**
 * guided/core.js - the guided activity runner, shared by every guided activity (the simulator panel is
 * in a separate adapter file, window.GuidedSim; the content in window.GuidedContent).
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

  const Sim = window.GuidedSim;
  const C = window.GuidedContent;
  const CFG = Object.assign({ endpoint: '', wrongCost: 1, minSolved: 1, revealAfterWrong: 3 }, window.GUIDED_CONFIG || {});
  const L = Sim.L;
  const esc = Sim.escapeHtml;
  const fmt2 = (x) => { const v = Number(Number(x).toFixed(2)); return (Object.is(v, -0) ? 0 : v).toFixed(2); };
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const PREVIEW = QS.has('preview');
  const KEY = { state: C.ACTIVITY_ID + '.state.v1', queue: C.ACTIVITY_ID + '.queue.v1', device: 'u4guided.device' };   // one device id for all activities
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
      // the content file knows what the personal values are and how to print them
      params: C.paramsText ? C.paramsText(p) : Object.keys(p).filter((k) => k !== 'seed').map((k) => k + '=' + p[k]).join(', '),
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

  // ------------------------------------------------------------------ the simulator adapter
  // The simulator panel is a separate file (window.GuidedSim) so the same runner serves every activity.
  // The adapter draws the panel, checks numeric answers with its engine, and reports when a "do this in
  // the simulator" task is done.
  let onTask = null;                         // set while a 'sim' step is current
  function flash(el) { if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  const doneIds = () => { const o = {}; Object.keys(S.steps).forEach((id) => { if (S.steps[id].done) o[id] = true; }); return o; };
  function initSim() {
    Sim.init({
      panel: $('sim-panel'), preview: PREVIEW, flash,
      memo: () => S.played,                                   // small per-student notes the panel keeps (saved with the state)
      save: () => { if (!PREVIEW) save(); },
      taskDone: (name) => { if (typeof onTask === 'function') onTask(name); }
    });
  }
  const simLoad = (st, sp) => Sim.load(st, sp, doneIds());

  // ------------------------------------------------------------------ rendering helpers
  const img = (name, cls) => '<img class="' + (cls || 'vignette') + '" src="' + IMG + name + '.webp" alt="" onerror="this.remove()">';
  const mathBlock = (lines) => '<div class="math" dir="ltr">' + lines.map((l) => '<div>' + esc(l) + '</div>').join('') + '</div>';
  const solutionHtml = (sp) => (sp.solution || []).map((s) => mathBlock([s.f, s.s, s.r])).join('');
  const expectedText = (sp) => (sp.type === 'num' ? fmt2(sp.expected) + ' ' + sp.unit : sp.type === 'mc' ? plain(sp.options.find((o) => o.correct).html) : '');

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
      if (q.figs) html += '<div class="q-figs">' + q.figs.map((f) => '<figure' + (f.wide ? ' class="wide"' : '') + '><img src="' + IMG + f.src + '" alt="' + esc(f.cap) + '"><figcaption>' + esc(f.cap) + '</figcaption></figure>').join('') + '</div>';
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
    if (sp.type === 'num') body += '<p class="given">התשובה: ' + L(fmt2(sp.expected) + ' ' + sp.unit) + '</p>' + solutionHtml(sp);
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
      html += '<div class="task" id="task-state">' + (sp.taskWaitHe || 'ממתין לביצוע בסימולטור...') + '</div>';
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
      onTask = (name) => { if ((!sp.task || name === sp.task) && !rec(sp.id).done) complete(st, sp, 'sim'); };
    } else {
      onTask = null;
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
      res = Sim.validate(sp, val);
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
    if (sp.type === 'sim') { const t = $('task-state'); if (t) { t.className = 'task ok'; t.textContent = sp.taskDoneHe || 'בוצע ✓'; } }
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
    if (Sim.stepDone(st, sp, doneIds())) flash($('sim-panel'));
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
    const has = S && S.name;
    let pre = (QS.get('n') || '').trim();
    let prePhone = '';
    if (!has) {
      // the student already signed in to another guided activity on this site: offer the same details
      ['u4guided.state.v1', 'u4-lp-hp-guided.state.v1', 'u3-ac-guided.state.v1'].forEach((k) => {
        const o = store.get(k, null);
        if (o && o.name) { if (!pre) pre = o.name; if (!prePhone && o.phone) prePhone = o.phone; }
      });
    }
    $('welcome').innerHTML = '<div class="hero">' + img(C.HERO_IMG || 'hero', 'hero-img') + '<div class="hero-text"><div class="kicker">' + C.KICKER_HTML + '</div><h1>' + C.ACTIVITY_TITLE_HTML + '</h1><p>' + C.INTRO_HTML + '</p></div></div>'
      + '<div class="welcome-grid"><section class="card rules"><h2>איך זה עובד</h2><ul>'
      + '<li>לכל שלב יש ניקוד. תשובה נכונה בניסיון ראשון ובלי רמזים נותנת את מלוא הנקודות.</li>'
      + '<li><b>רמז עולה נקודות</b>: המחיר כתוב על הכפתור. תשובה שגויה מורידה נקודה.</li>'
      + '<li><b>דף הנוסחאות חינם</b> וזמין תמיד בכפתור שלמעלה.</li>'
      + '<li>העבודה נשמרת כל הזמן. אפשר לסגור את הדף ולהמשיך אחר כך מאותו מקום.</li>'
      + '<li>בתחנה האחרונה לכל אחד רכיבים משלו. התוצאות נשלחות למורה.</li></ul></section>'
      + '<section class="card signin"><h2>' + (has ? 'ממשיכים?' : 'מתחילים') + '</h2>'
      + (has ? '<p>שלום ' + esc(S.name) + '. העבודה שלך שמורה במכשיר הזה.</p><button class="btn primary big" data-act="resume">להמשיך מאיפה שעצרתי</button><button class="btn ghost" data-act="other">זה לא אני / התחלה מחדש</button>'
        : '<label>שם פרטי<input id="first" type="text" autocomplete="given-name" value="' + esc(pre.split(' ')[0] || '') + '"></label><label>שם משפחה<input id="last" type="text" autocomplete="family-name" value="' + esc(pre.split(' ').slice(1).join(' ')) + '"></label><label>טלפון נייד<input id="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" placeholder="050-0000000" value="' + esc(prePhone) + '"></label><p class="err" id="name-err"></p><button class="btn primary big" data-act="start">יוצאים לדרך</button><p class="small">כתבו את השם המלא שלכם: לפיו נקבעים הנתונים האישיים ולפיו המורה מזהה את ההגשה. הטלפון נשלח למורה בלבד.</p>')
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
      + '<h3>' + (F.compareTitle || 'השוואה') + '</h3><table class="ftable cmp"><tbody>' + F.compare.map((row, i) => '<tr>' + row.map((c) => (i === 0 ? '<th>' + c + '</th>' : '<td>' + c + '</td>')).join('') + '</tr>').join('') + '</tbody></table>'
      + '<h3>' + (F.tableTitle || 'ערכים שימושיים') + '</h3><table class="ftable etab" dir="ltr"><tbody>' + F.table.map((row) => '<tr>' + row.map((c, j) => (j === 0 ? '<th>' + esc(c) + '</th>' : '<td>' + esc(c) + '</td>')).join('') + '</tr>').join('') + '</tbody></table>'
      + (F.noteHe ? '<p class="small">' + F.noteHe + '</p>' : '');
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
