/**
 * app.js — Interactive controller for U4 RC / LP / HP Simulation & Exercise Workshop
 */
(function (global) {
  'use strict';

  const E = global.RCEngine;
  const V = global.RCVisuals;
  const C = global.RCContent;
  const L = E.L;
  const T = E.T;

  const STORAGE_KEY = 'u4_rc_sim_solved_v1';

  // --- Shared App State ---
  const state = {
    activeTab: 'home',
    introChapter: 'ch1',
    introVisited: new Set(),
    kvlStage: 'before',
    tauRegime: 'long',
    workshopSub: 'curated',
    exFilter: 'all',
    solvedIds: loadSolvedSet(),

    // Lab state
    lab: {
      network: 'LP',
      r1Val: 10,
      r1Unit: 'kΩ',
      cVal: 0.1,
      cUnit: 'µF',
      preset: 'pulse',
      // Dynamic signal params (stored in current timeline time unit or base ms/s)
      sig: {
        vBase: 0,
        vPulse: 10,
        vAfter: 0,
        vStep2: -4,
        t1: 1,
        t2: 3,
        halfPeriod: 2,
        r2Val: 15,
        r2Unit: 'kΩ',
        trigType: 'voltage',
        trigVal: 5,
        vcMode: 'steady',
        vcInit: 0,
        complexStages: [
          { v: 10, duration: 2 },
          { v: -5, duration: 2 }
        ],
        complexAfterDur: 4
      },
      timeUnit: 'ms',
      timeline: null,
      cursorT_s: 3e-3,
      cursorSide: 'after',
      playing: false,
      animPhase: 0,
      speed: 1,
      showComparison: false,
      showTau: true,
      showEndpoints: true,
      pins: [],
      lastScopeGeom: null,
      hoverHandleIndex: null,
      dragHandleIndex: null
    },

    currentRandomEx: null,
    mcDrill: {
      mode: 'tau',
      net: 'MIXED',
      score: 0,
      attempts: 0,
      streak: 0,
      currentTauQ: null,
      currentStageEx: null
    }
  };

  function loadSolvedSet() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (_) {
      return new Set();
    }
  }

  function saveSolvedSet() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.solvedIds)));
    } catch (_) { /* ignore storage restrictions */ }
  }

  function $(id) {
    return document.getElementById(id);
  }

  // --- Helper: Render Step Cards (strict RTL Hebrew + LTR Math) ---
  function renderStepCardsHtml(steps) {
    if (!steps || !steps.length) return '';
    return steps.map((st) => `
      <div class="step-card">
        <div class="step-card-head">
          <span>${st.titleHe}</span>
          <span class="badge badge-accent" dir="ltr">${E.escapeHtml(st.resultLtr)}</span>
        </div>
        <div class="math-block" dir="ltr">${E.escapeHtml(st.formulaLtr)}\n${E.escapeHtml(st.substitutionLtr)}\n⇒ ${E.escapeHtml(st.resultLtr)}</div>
        ${st.noteHe ? `<p style="margin:0.45rem 0 0 0; font-size:0.86rem; color:var(--muted);">${st.noteHe}</p>` : ''}
      </div>
    `).join('');
  }

  // =========================================================================
  // 1. HEADER, NAVIGATION, THEME & FORMULA DRAWER
  // =========================================================================
  function initHeaderAndDrawer() {
    document.querySelectorAll('.nav-btn[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchMainTab(btn.dataset.tab));
    });

    const brandHome = $('brand-home-trigger');
    if (brandHome) {
      brandHome.addEventListener('click', () => switchMainTab('home'));
      brandHome.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchMainTab('home');
        }
      });
    }

    $('btn-toggle-theme').addEventListener('click', () => {
      const root = document.documentElement;
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      $('btn-toggle-theme').textContent = next === 'light' ? '🌙 מצב כהה' : '☀️ מצב כיתה';
      redrawVisibleCanvases();
    });

    if (window.location.pathname.includes('/u4-rc')) {
      const hubLink = document.createElement('a');
      hubLink.href = '../';
      hubLink.className = 'btn';
      hubLink.style.textDecoration = 'none';
      hubLink.textContent = '📚 כל היחידות';
      const actions = document.querySelector('.header-actions');
      if (actions) actions.insertBefore(hubLink, actions.firstChild);
    }

    const openDrawer = () => {
      $('formula-drawer').classList.add('open');
      $('drawer-backdrop').classList.add('open');
    };
    const closeDrawer = () => {
      $('formula-drawer').classList.remove('open');
      $('drawer-backdrop').classList.remove('open');
    };
    $('btn-open-formulas').addEventListener('click', openDrawer);
    $('btn-close-formulas').addEventListener('click', closeDrawer);
    $('drawer-backdrop').addEventListener('click', closeDrawer);

    renderFormulaTables();
    initAuxCalculators();
  }

  function switchMainTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.nav-btn[data-tab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('active', p.id === 'tab-' + tabId);
    });
    if (tabId === 'intro') {
      switchIntroChapter(state.introChapter, true);
    }
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) {
      window.scrollTo(0, 0);
    }
    requestAnimationFrame(redrawVisibleCanvases);
    setTimeout(redrawVisibleCanvases, 30);
  }

  function renderFormulaTables() {
    const host = $('formula-tables-host');
    let html = C.FORMULA_ROWS.map((sec) => `
      <div class="card" style="margin-bottom:0.85rem;">
        <h3 style="margin-top:0; font-size:0.98rem; color:var(--accent);">${sec.section}</h3>
        <table class="formula-table">
          <thead><tr><th>מה היא אומרת</th><th>הנוסחה</th></tr></thead>
          <tbody>
            ${sec.items.map((it) => `<tr><td>${it.desc}</td><td class="math-cell" dir="ltr">${E.escapeHtml(it.formula)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `).join('');

    html += `
      <div class="card">
        <h3 style="margin-top:0; font-size:0.98rem; color:var(--accent);">ערכי ${T('e')} לחישוב מהיר ולבדיקה</h3>
        <table class="formula-table">
          <thead><tr><th dir="ltr">t / τ</th><th dir="ltr">e^(-t/τ)</th><th dir="ltr">1 - e^(-t/τ)</th><th>משמעות</th></tr></thead>
          <tbody>
            ${C.E_TABLE.map((r) => `<tr><td class="math-cell" dir="ltr">${r.ratio}</td><td class="math-cell" dir="ltr">${r.exp}</td><td class="math-cell" dir="ltr">${r.oneMinus}</td><td>${r.note}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
    host.innerHTML = html;
  }

  function initAuxCalculators() {
    const updateTau = () => {
      const r = E.toOhms($('aux-r').value || 0, $('aux-ru').value);
      const c = E.toFarads($('aux-c').value || 0, $('aux-cu').value);
      const tau = r * c;
      $('aux-tau-res').textContent = `τ = ${E.fmtTime(tau)}  |  5τ = ${E.fmtTime(5 * tau)}`;
    };
    ['aux-r', 'aux-ru', 'aux-c', 'aux-cu'].forEach((id) => $(id).addEventListener('input', updateTau));

    const updatePar = () => {
      const r1 = Number($('aux-r1p').value) || 0;
      const r2 = Number($('aux-r2p').value) || 0;
      const req = (r1 + r2) > 0 ? (r1 * r2) / (r1 + r2) : 0;
      $('aux-par-res').textContent = `R_eq = ${E.fmtFixed(req, 2)} kΩ`;
    };
    ['aux-r1p', 'aux-r2p'].forEach((id) => $(id).addEventListener('input', updatePar));

    const updateCap = () => {
      const c1 = Number($('aux-c1').value) || 0;
      const c2 = Number($('aux-c2').value) || 0;
      const ser = (c1 + c2) > 0 ? (c1 * c2) / (c1 + c2) : 0;
      const par = c1 + c2;
      $('aux-cap-res').textContent = `Series: ${E.fmtFixed(ser, 2)} µF  |  Parallel: ${E.fmtFixed(par, 2)} µF`;
    };
    ['aux-c1', 'aux-c2'].forEach((id) => $(id).addEventListener('input', updateCap));

    updateTau();
    updatePar();
    updateCap();
  }

  // =========================================================================
  // 2. TAB 1: INTRODUCTION & INTUITION
  // =========================================================================
  const KVL_STAGES = {
    before: {
      title: 'לפני סגירת המפסק: המעגל מנותק',
      body: `הקבל ריק (${L('VC = 0 V')}) והמפסק פתוח. עדיין לא זורם זרם בחוג, ולכן אין מפל מתח על הנגד.`,
      math: `E = 12 V\nVC = 0.00 V  |  VR = 0.00 V  |  I = 0.00 mA`,
      Vi: 0, Vc: 0, Vr: 0, I_A: 0
    },
    t0: {
      title: `ברגע הסגירה (${L('t = 0⁺')}): הקבל מתנהג כקצר רגעי!`,
      body: `הקבל עדיין ריק (${L('VC = 0 V')}) כי מטען לא יכול להיבנות בבת אחת. לפי חוק קירכהוף כל ${L('12 V')} של המקור נופלים על הנגד, והזרם מרבי!`,
      math: `E = VR + VC  ⇒  12 V = VR + 0 V  ⇒  VR = 12.00 V\nI₀ = VR / R = 12 V / 10 kΩ = 1.20 mA`,
      Vi: 12, Vc: 0, Vr: 12, I_A: 1.2e-3
    },
    tau1: {
      title: `אחרי ${L('τ')} אחד: ${L('63.2%')} מהדרך (${L('t = 10 ms')})`,
      body: `הקבל צבר כבר ${L('7.59 V')}. על הנגד נשארו רק ${L('4.41 V')}, ולכן הזרם נחלש וקצב הטעינה מאט.`,
      math: `VC(τ) = 12·(1 - e⁻¹) = 7.59 V  (63.2%)\nVR(τ) = 12 - 7.59 = 4.41 V  (36.8%)\nI(τ) = 4.41 V / 10 kΩ = 0.44 mA`,
      Vi: 12, Vc: 7.59, Vr: 4.41, I_A: 0.441e-3
    },
    tau2: {
      title: `אחרי ${L('2τ')}: ${L('86.5%')} מהדרך (${L('t = 20 ms')})`,
      body: `הקבל כבר קרוב למקור (${L('10.38 V')}). על הנגד נותר מתח קטן בלבד, והעקומה משתטחת עוד יותר.`,
      math: `VC(2τ) = 12·(1 - e⁻²) = 10.38 V  (86.5%)\nVR(2τ) = 12 - 10.38 = 1.62 V\nI(2τ) = 1.62 V / 10 kΩ = 0.16 mA`,
      Vi: 12, Vc: 10.38, Vr: 1.62, I_A: 0.162e-3
    },
    tau5: {
      title: `אחרי ${L('5τ')}: הקבל טעון ומתנהג כנתק (${L('t = 50 ms')})`,
      body: `הקבל הגיע ל-${L('99.3%')} ממתח המקור (${L('VC ≈ 12 V')}). המתח על הנגד התאפס ואין יותר זרם בחוג!`,
      math: `VC(5τ) ≈ 12.00 V  |  VR(5τ) ≈ 0.00 V\nI(5τ) = 0.00 mA  (הקבל הוא נתק בזרם ישר)`,
      Vi: 12, Vc: 11.92, Vr: 0.08, I_A: 0.008e-3
    },
    discharge: {
      title: `פריקה דרך הנגד: ${L('0 = VR + VC')}`,
      body: `מחליפים את המקור בקצר (${L('E = 0 V')}). הקבל הופך למקור האנרגיה ודוחף זרם בכיוון ההפוך עד שיתרוקן!`,
      math: `0 = VR + VC  ⇒  VR = -VC\nI(t) = -VC / R  (זרם בכיוון הפוך לטעינה)`,
      Vi: 0, Vc: 7.59, Vr: -7.59, I_A: -0.759e-3
    }
  };

  const TAU_REGIMES = {
    long: {
      title: `דופק / מחזור ארוך (${L('T ≫ τ')})`,
      lp: `<strong>ברשת ${T('LP')}:</strong> הקבל מספיק להיטען כמעט עד הסוף בכל חצי מחזור, ולכן המוצא דומה לגל ריבועי עם <strong>פינות מעוגלות</strong>.`,
      hp: `<strong>ברשת ${T('HP')}:</strong> המוצא קופץ ודועך מהר מאוד לאפס לפני סוף הדופק — ולכן מתקבלים <strong>קוצים (Spikes)</strong> חיוביים ושליליים בכל קפיצה!`
    },
    med: {
      title: `זמן בינוני (${L('T ≈ τ')})`,
      lp: `<strong>ברשת ${T('LP')}:</strong> הקבל מספיק להיטען ולהיפרק רק חלקית, ומתקבל אות משולשי-מעוגל סביב המתח הממוצע.`,
      hp: `<strong>ברשת ${T('HP')}:</strong> בכל קפיצה המוצא קופץ בגובה מלא ודועך חלקית עד הקפיצה הבאה — צורה של 'שיני מסור' מעוגלות.`
    },
    short: {
      title: `גל מהיר מאוד (${L('T ≪ τ')})`,
      lp: `<strong>ברשת ${T('LP')}:</strong> המבוא משתנה מהר מדי בשביל שהקבל יספיק לעקוב — המוצא כמעט קבוע (מתייצב סביב <strong>הערך הממוצע</strong> של המבוא, כאן ${L('5 V')})!`,
      hp: `<strong>ברשת ${T('HP')}:</strong> הקבל כמעט לא מספיק להיטען בין קפיצות, ולכן המוצא עוקב אחרי הקפיצות ונראה <strong>כמעט ריבועי סביב ${L('0 V')}</strong>!`
    }
  };

  const INTRO_ORDER = ['ch1', 'ch2', 'ch3', 'ch4'];

  const INTRO_BRIDGE_META = {
    ch1: {
      nextBtn: 'המשך לתחנה 2: שתי רשתות (LP מול HP) ←',
      reason: `אחרי שהבנו ש-${L('E = VR + VC')}, נראה בתחנה 2 איך בחירת הרכיב במוצא יוצרת שתי רשתות הפוכות.`
    },
    ch2: {
      nextBtn: 'המשך לתחנה 3: קבוע הזמן τ ורוחב הדופק ←',
      reason: `אחרי שהכרנו את ${T('LP')} ו-${T('HP')}, נבדוק בתחנה 3 מה קובע כמה מהר הקבל מגיב לדופק.`
    },
    ch3: {
      nextBtn: 'המשך לתחנה 4: סדר הפתרון ו-5 מלכודות ←',
      reason: `אחרי שהבנו את ${L('τ = R·C')} ו-${L('5τ')}, נסכם בתחנה 4 את 6 שלבי הפתרון לבגרות ואת הטעויות הנפוצות.`
    },
    ch4: {
      nextBtn: 'סיימת את כל המבוא! המשך למעבדת החקר 🔬 ←',
      reason: 'עברת על נושאי היסוד — עכשיו אפשר לחקור פולסים חיים במעבדה או לתרגל שאלות בסדנה!'
    }
  };

  function switchIntroChapter(chId, markVisited = true) {
    if (!INTRO_ORDER.includes(chId)) return;
    state.introChapter = chId;
    if (markVisited) state.introVisited.add(chId);

    document.querySelectorAll('#intro-chapter-nav [data-chapter]').forEach((b) => {
      const ch = b.dataset.chapter;
      const isCur = ch === chId;
      const isVis = state.introVisited.has(ch);
      b.classList.toggle('active', isCur);
      b.classList.toggle('visited', isVis);
      const statusEl = b.querySelector(`[data-status-for="${ch}"]`);
      if (statusEl) {
        statusEl.textContent = isCur ? '● בצפייה כעת' : (isVis ? '✓ עברת על נושא זה' : '○ ממתין למעבר');
      }
    });

    document.querySelectorAll('.journey-arrow[data-arrow-after]').forEach((arr) => {
      arr.classList.toggle('done', state.introVisited.has(arr.dataset.arrowAfter));
    });

    const visCount = state.introVisited.size;
    const countBadge = $('intro-journey-count');
    if (countBadge) {
      if (visCount >= INTRO_ORDER.length) {
        countBadge.className = 'badge badge-done';
        countBadge.textContent = `✓ עברת על כל ${INTRO_ORDER.length} נושאי המבוא! (${visCount}/${INTRO_ORDER.length})`;
      } else {
        countBadge.className = 'badge badge-accent';
        countBadge.textContent = `עברת על ${visCount} מתוך ${INTRO_ORDER.length} נושאים`;
      }
    }

    const segs = $('intro-journey-segs');
    if (segs) {
      Array.from(segs.children).forEach((segEl, sIdx) => {
        const segCh = INTRO_ORDER[sIdx];
        segEl.classList.toggle('active', segCh === chId);
        segEl.classList.toggle('done', state.introVisited.has(segCh) && segCh !== chId);
      });
    }

    const homeIntroBadge = $('home-intro-badge');
    if (homeIntroBadge && visCount > 0) {
      homeIntroBadge.textContent = `הושלמו ${visCount}/${INTRO_ORDER.length} תחנות`;
    }

    document.querySelectorAll('.intro-chapter').forEach((ch) => {
      ch.style.display = ch.id === 'intro-' + chId ? 'block' : 'none';
    });
    const idx = INTRO_ORDER.indexOf(chId);
    const meta = INTRO_BRIDGE_META[chId];
    if ($('intro-step-indicator')) {
      $('intro-step-indicator').textContent = `תחנה ${idx + 1} מתוך ${INTRO_ORDER.length}`;
    }
    if ($('intro-next-reason') && meta) {
      $('intro-next-reason').innerHTML = meta.reason;
    }
    if ($('btn-intro-prev')) {
      $('btn-intro-prev').disabled = idx === 0;
    }
    if ($('btn-intro-next') && meta) {
      $('btn-intro-next').textContent = meta.nextBtn;
    }
    redrawIntroCanvases();
  }

  function initIntro() {
    document.querySelectorAll('#intro-chapter-nav [data-chapter]').forEach((btn) => {
      btn.addEventListener('click', () => switchIntroChapter(btn.dataset.chapter, true));
    });

    if ($('btn-intro-prev')) {
      $('btn-intro-prev').addEventListener('click', () => {
        const idx = INTRO_ORDER.indexOf(state.introChapter);
        if (idx > 0) switchIntroChapter(INTRO_ORDER[idx - 1], true);
      });
    }
    if ($('btn-intro-next')) {
      $('btn-intro-next').addEventListener('click', () => {
        const idx = INTRO_ORDER.indexOf(state.introChapter);
        if (idx < INTRO_ORDER.length - 1) {
          switchIntroChapter(INTRO_ORDER[idx + 1], true);
        } else {
          switchMainTab('lab');
        }
      });
    }
    document.querySelectorAll('#intro-next-bar [data-goto-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchMainTab(btn.dataset.gotoTab));
    });
    switchIntroChapter(state.introChapter, false);

    document.querySelectorAll('#kvl-stage-btns .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.kvlStage = btn.dataset.stage;
        document.querySelectorAll('#kvl-stage-btns .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderKvlStage();
      });
    });

    $('btn-demo-kvl-lab').addEventListener('click', () => {
      loadConfigIntoLab({
        network: 'LP',
        r1Val: 10, r1Unit: 'kΩ',
        cVal: 1, cUnit: 'µF',
        preset: 'step-up',
        sig: { vBase: 0, vPulse: 12, vAfter: 0, t1: 0, t2: 20 }
      });
      switchMainTab('lab');
    });

    document.querySelectorAll('[data-launch-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.launchPreset;
        const net = p === 'pulse-lp' ? 'LP' : p === 'pulse-hp' ? 'HP' : 'BOTH';
        loadConfigIntoLab({
          network: net,
          r1Val: 10, r1Unit: 'kΩ',
          cVal: 0.1, cUnit: 'µF',
          preset: 'pulse',
          sig: { vBase: 0, vPulse: 10, vAfter: 0, t1: 1, t2: 3 }
        });
        switchMainTab('lab');
      });
    });

    document.querySelectorAll('#tau-regime-btns .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.tauRegime = btn.dataset.regime;
        document.querySelectorAll('#tau-regime-btns .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderTauRegime();
      });
    });

    $('btn-launch-square-regime').addEventListener('click', () => {
      const hpMap = { long: 8, med: 1.2, short: 0.2 };
      loadConfigIntoLab({
        network: 'BOTH',
        r1Val: 1, r1Unit: 'kΩ',
        cVal: 1, cUnit: 'µF',
        preset: 'square',
        sig: { vBase: 0, vPulse: 10, halfPeriod: hpMap[state.tauRegime] || 2 }
      });
      switchMainTab('lab');
    });

    // Render Pitfalls in Chapter 4
    $('pitfalls-container').innerHTML = C.PITFALLS.map((p) => `
      <div class="pitfall-card">
        <h4>${p.title}</h4>
        <p style="margin:0 0 0.45rem 0; font-size:0.9rem;"><strong>הטעות:</strong> ${p.wrong}</p>
        <p style="margin:0; font-size:0.9rem; color:var(--lp-color);"><strong>איך נכון:</strong> ${p.fix}</p>
      </div>
    `).join('');

    renderKvlStage();
    renderTauRegime();
  }

  function renderKvlStage() {
    const d = KVL_STAGES[state.kvlStage];
    $('kvl-stage-title').innerHTML = d.title;
    $('kvl-stage-body').innerHTML = d.body;
    $('kvl-stage-math').textContent = d.math;

    const kvlStatusMap = {
      before: 'ממתין',
      t0: 'קצר רגעי',
      tau1: 'בטעינה',
      tau2: 'בטעינה',
      tau5: 'נתק (טעון)',
      discharge: 'בפריקה'
    };
    const pctCharge = state.kvlStage === 'before' ? 0 : Math.min(100, Math.round((Math.abs(d.Vc) / 12) * 100));
    const qm = $('kvl-quick-metrics');
    if (qm) {
      qm.innerHTML = `
        <div class="metric-tile">
          <span class="m-lbl">מצב הקבל בחוג</span>
          <span class="m-val">${kvlStatusMap[state.kvlStage] || 'פעיל'}</span>
        </div>
        <div class="metric-tile">
          <span class="m-lbl">אחוז טעינת קבל</span>
          <span class="m-val">${L(pctCharge + '%')}</span>
        </div>
        <div class="metric-tile">
          <span class="m-lbl">זרם בחוג</span>
          <span class="m-val">${L(E.fmtCurrent(d.I_A))}</span>
        </div>`;
    }

    const eTotal = d.Vi === 0 && state.kvlStage === 'discharge' ? 0 : d.Vi;
    $('kvl-eq-text').textContent = `${E.fmtFixed(eTotal, 0)}V = ${E.fmtFixed(d.Vr, 2)}V + ${E.fmtFixed(d.Vc, 2)}V`;
    $('kvl-vc-lbl').textContent = `VC = ${E.fmtFixed(d.Vc, 2)} V`;
    $('kvl-vr-lbl').textContent = `VR = ${E.fmtFixed(d.Vr, 2)} V`;
    $('kvl-current-badge').textContent = `I = ${E.fmtCurrent(d.I_A)}`;

    const vcDisp = Math.abs(Number(d.Vc.toFixed(2)));
    const vrDisp = Math.abs(Number(d.Vr.toFixed(2)));
    const totalMag = vcDisp + vrDisp;
    const pctVc = (state.kvlStage === 'before' || totalMag < 1e-6) ? 0 : (vcDisp / totalMag) * 100;
    const pctVr = (state.kvlStage === 'before' || totalMag < 1e-6) ? 0 : 100 - pctVc;
    $('kvl-bar-vc').style.width = pctVc + '%';
    $('kvl-bar-vr').style.width = pctVr + '%';
    $('kvl-bar-vc').textContent = pctVc >= 20 ? `|VC| ${Math.round(pctVc)}%` : '';
    $('kvl-bar-vr').textContent = pctVr >= 20 ? `|VR| ${Math.round(pctVr)}%` : '';

    V.drawCircuit($('intro-kvl-canvas'), {
      network: 'LP',
      R1_ohm: 10e3,
      C_F: 1e-6,
      Vi: d.Vi,
      Vc: d.Vc,
      Vr: d.Vr,
      I_A: d.I_A,
      vMax: 12,
      animPhase: state.lab.animPhase
    }, 230);
  }

  function renderTauRegime() {
    const info = TAU_REGIMES[state.tauRegime];
    $('tau-regime-title').innerHTML = info.title;
    $('tau-regime-lp').innerHTML = info.lp;
    $('tau-regime-hp').innerHTML = info.hp;
    V.drawTauComparison($('intro-tau-canvas'), state.tauRegime);
  }

  function redrawIntroCanvases() {
    if (state.activeTab !== 'intro') return;
    if (state.introChapter === 'ch1') renderKvlStage();
    if (state.introChapter === 'ch2') {
      V.drawCircuit($('intro-lp-schematic'), { network: 'LP', R1_ohm: 10e3, C_F: 1e-6, vMax: 10, Vc: 6, compact: true }, 155);
      V.drawCircuit($('intro-hp-schematic'), { network: 'HP', R1_ohm: 10e3, C_F: 1e-6, vMax: 10, Vc: 4, compact: true }, 155);
    }
    if (state.introChapter === 'ch3') renderTauRegime();
  }

  // =========================================================================
  // 3. TAB 2: INTERACTIVE LAB & OSCILLOSCOPE
  // =========================================================================
  const COMPLEX_TEMPLATES = {
    bipolar: {
      vBase: 0, t1: 1,
      complexStages: [{ v: 10, duration: 2 }, { v: -10, duration: 2 }],
      vAfter: 0, complexAfterDur: 4, vcMode: 'steady'
    },
    staircase: {
      vBase: 0, t1: 1,
      complexStages: [{ v: 4, duration: 1.5 }, { v: 10, duration: 1.5 }, { v: 16, duration: 1.5 }],
      vAfter: 0, complexAfterDur: 4, vcMode: 'steady'
    },
    double: {
      vBase: 0, t1: 1,
      complexStages: [{ v: 10, duration: 1.5 }, { v: 0, duration: 1.5 }, { v: 10, duration: 1.5 }],
      vAfter: 0, complexAfterDur: 4, vcMode: 'steady'
    },
    offset: {
      vBase: -5, t1: 1,
      complexStages: [{ v: 12, duration: 2.5 }],
      vAfter: 3, complexAfterDur: 4, vcMode: 'steady'
    }
  };

  function buildLabSignalFields() {
    const p = state.lab.preset;
    const s = state.lab.sig;
    const u = state.lab.timeUnit;
    const host = $('lab-signal-fields');

    const numField = (id, label, val, step = '0.5') => `
      <div class="field-row">
        <label class="field-label" for="${id}"><span>${label}</span></label>
        <input id="${id}" class="input-box ltr-input" type="number" step="${step}" value="${val}" dir="ltr">
      </div>`;

    const vcInitControlHtml = () => `
      <div class="vc-init-box">
        <label class="field-label" for="sig-vcmode">
          <span>מצב התחלתי של הקבל לפני ${L('t₁')}</span>
        </label>
        <select id="sig-vcmode" class="select-box" style="font-size:0.84rem; padding:0.35rem 0.55rem;">
          <option value="steady" ${s.vcMode !== 'manual' ? 'selected' : ''}>מצב מתמיד (VC(t₁⁻) = מתח לפני)</option>
          <option value="manual" ${s.vcMode === 'manual' ? 'selected' : ''}>בחירת מתח התחלתי ידני VC(t₁⁻)</option>
        </select>
        ${s.vcMode === 'manual' ? `
          <div style="margin-top:0.45rem;">
            ${numField('sig-vcinit', `מתח קבל התחלתי (${T('V')})`, s.vcInit)}
          </div>` : ''}
      </div>`;

    let html = '';
    if (p === 'step-up') {
      html = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.55rem;">
          ${numField('sig-vpulse', `גובה המדרגה (${T('V')})`, s.vPulse)}
          ${numField('sig-t1', `זמן המדרגה (${T(u)})`, s.t1)}
        </div>`;
    } else if (p === 'discharge') {
      html = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.55rem;">
          ${numField('sig-vbase', `מתח התחלתי (${T('V')})`, s.vBase || 10)}
          ${numField('sig-t1', `זמן הפריקה (${T(u)})`, s.t1)}
        </div>`;
    } else if (p === 'step-offset') {
      html = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.55rem;">
          ${numField('sig-vbase', `רמה לפני (${T('V')})`, s.vBase)}
          ${numField('sig-vpulse', `רמה אחרי (${T('V')})`, s.vPulse)}
          ${numField('sig-t1', `זמן המעבר (${T(u)})`, s.t1)}
        </div>`;
    } else if (p === 'pulse') {
      html = `
        <div class="pulse-tri-grid">
          <div class="pulse-mini-card">
            <label class="mini-lbl" for="sig-vbase">לפני (${T('V')})</label>
            <input id="sig-vbase" class="input-box ltr-input" type="number" step="0.5" value="${s.vBase}" dir="ltr">
          </div>
          <div class="pulse-mini-card">
            <label class="mini-lbl" for="sig-vpulse">במהלך (${T('V')})</label>
            <input id="sig-vpulse" class="input-box ltr-input" type="number" step="0.5" value="${s.vPulse}" dir="ltr">
          </div>
          <div class="pulse-mini-card">
            <label class="mini-lbl" for="sig-vafter">אחרי (${T('V')})</label>
            <input id="sig-vafter" class="input-box ltr-input" type="number" step="0.5" value="${s.vAfter}" dir="ltr">
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.55rem;">
          ${numField('sig-t1', `תחילת דופק (${T(u)})`, s.t1)}
          ${numField('sig-t2', `סוף דופק (${T(u)})`, s.t2)}
        </div>
        ${vcInitControlHtml()}
        <div class="scope-edit-hint">💡 טיפ: ניתן לגרור את ידיות המתח הכחולות ישירות על גרף ${T('Vi')} למעלה!</div>`;
    } else if (p === 'complex') {
      if (!Array.isArray(s.complexStages) || !s.complexStages.length) {
        s.complexStages = [{ v: 10, duration: 2 }];
      }
      let tCursor = Math.max(0, Number(s.t1) || 0);
      const stagesHtml = s.complexStages.map((st, idx) => {
        const tA = tCursor;
        const dur = Math.max(0.1, Number(st.duration) || 0.5);
        const tB = tA + dur;
        tCursor = tB;
        const clampedV = Math.max(-20, Math.min(20, Number(st.v) || 0));
        return `
          <div class="stage-row" data-stage-idx="${idx}">
            <div class="stage-row-head">
              <span class="stage-title">שלב ${idx + 1} בפולס</span>
              <div style="display:flex; align-items:center; gap:0.35rem;">
                <span class="stage-time-pill" id="cx-pill-${idx}" dir="ltr">[${E.fmtNum(tA, 2)} → ${E.fmtNum(tB, 2)} ${u}]</span>
                ${s.complexStages.length > 1 ? `<button type="button" class="btn-icon-del cx-del-btn" data-idx="${idx}" title="מחק שלב">✕</button>` : ''}
              </div>
            </div>
            <div class="stage-inputs-grid">
              <label>
                <span>מתח (${T('V')})</span>
                <input class="input-box ltr-input cx-stage-v" data-idx="${idx}" type="number" step="0.5" value="${st.v}" dir="ltr">
              </label>
              <label>
                <span>משך (${T(u)})</span>
                <input class="input-box ltr-input cx-stage-dur" data-idx="${idx}" type="number" min="0.1" step="0.2" value="${st.duration}" dir="ltr">
              </label>
            </div>
            <div class="stage-slider-row">
              <input class="range-slider cx-stage-slider" data-idx="${idx}" type="range" min="-20" max="20" step="0.5" value="${clampedV}" dir="ltr">
            </div>
          </div>`;
      }).join('');

      const tEndTotal = tCursor;
      const afterDur = Math.max(0.5, Number(s.complexAfterDur) || 4);
      const clampedPre = Math.max(-20, Math.min(20, Number(s.vBase) || 0));
      const clampedPost = Math.max(-20, Math.min(20, Number(s.vAfter) || 0));

      html = `
        <div class="template-chips">
          <button type="button" class="chip-btn" data-tpl="bipolar">⚡ דו-קוטבי (+/−)</button>
          <button type="button" class="chip-btn" data-tpl="staircase">📶 מדרגות עולות</button>
          <button type="button" class="chip-btn" data-tpl="double">⊓⊔ דופק כפול</button>
          <button type="button" class="chip-btn" data-tpl="offset">↕️ בסיס שונה מסיום</button>
        </div>
        <div class="stage-builder">
          <div class="stage-row boundary-before">
            <div class="stage-row-head">
              <span class="stage-title">לפני הפולס</span>
              <span class="stage-time-pill" id="cx-pill-before" dir="ltr">[0 → ${E.fmtNum(Math.max(0, s.t1), 2)} ${u}]</span>
            </div>
            <div class="stage-inputs-grid">
              <label>
                <span>מתח לפני (${T('V')})</span>
                <input id="sig-vbase" class="input-box ltr-input" type="number" step="0.5" value="${s.vBase}" dir="ltr">
              </label>
              <label>
                <span>תחילת שלב 1 (${T(u)})</span>
                <input id="sig-t1" class="input-box ltr-input" type="number" min="0" step="0.2" value="${s.t1}" dir="ltr">
              </label>
            </div>
            <div class="stage-slider-row">
              <input id="sig-vbase-slider" class="range-slider" type="range" min="-20" max="20" step="0.5" value="${clampedPre}" dir="ltr">
            </div>
          </div>

          ${stagesHtml}

          <button id="btn-add-stage" type="button" class="btn btn-sm" style="width:100%;" ${s.complexStages.length >= 6 ? 'disabled' : ''}>
            ➕ הוסף שלב לפולס (${L(s.complexStages.length + '/6')})
          </button>

          <div class="stage-row boundary-after">
            <div class="stage-row-head">
              <span class="stage-title">אחרי הפולס</span>
              <span class="stage-time-pill" id="cx-pill-after" dir="ltr">[${E.fmtNum(tEndTotal, 2)} → ${E.fmtNum(tEndTotal + afterDur, 2)} ${u}]</span>
            </div>
            <div class="stage-inputs-grid">
              <label>
                <span>מתח אחרי (${T('V')})</span>
                <input id="sig-vafter" class="input-box ltr-input" type="number" step="0.5" value="${s.vAfter}" dir="ltr">
              </label>
              <label>
                <span>משך תצוגה אחרי (${T(u)})</span>
                <input id="sig-after-dur" class="input-box ltr-input" type="number" min="0.5" step="0.5" value="${afterDur}" dir="ltr">
              </label>
            </div>
            <div class="stage-slider-row">
              <input id="sig-vafter-slider" class="range-slider" type="range" min="-20" max="20" step="0.5" value="${clampedPost}" dir="ltr">
            </div>
          </div>
        </div>
        ${vcInitControlHtml()}
        <div class="scope-edit-hint">💡 ניתן לגרור גם את הידיות על גרף ${T('Vi')} למעלה או להחליף תבנית מוכנה!</div>`;
    } else if (p === 'two-step') {
      html = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.55rem;">
          ${numField('sig-vbase', `רמה 1 (${T('V')})`, s.vBase)}
          ${numField('sig-vpulse', `רמה 2 (${T('V')})`, s.vPulse)}
          ${numField('sig-vstep2', `רמה 3 (${T('V')})`, s.vStep2)}
          ${numField('sig-t1', `מעבר ראשון (${T(u)})`, s.t1)}
          ${numField('sig-t2', `מעבר שני (${T(u)})`, s.t2)}
        </div>`;
    } else if (p === 'square') {
      html = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.55rem;">
          ${numField('sig-vbase', `רמה נמוכה (${T('V')})`, s.vBase)}
          ${numField('sig-vpulse', `רמה גבוהה (${T('V')})`, s.vPulse)}
          ${numField('sig-hp', `רוחב חצי מחזור (${T(u)})`, s.halfPeriod, '0.2')}
        </div>`;
    } else if (p === 'switch-2025') {
      html = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.55rem;">
          ${numField('sig-vpulse', `מדרגת כניסה (${T('V')})`, s.vPulse)}
          ${numField('sig-r2val', `נגד מקבילי R₂ (${T(s.r2Unit)})`, s.r2Val)}
          ${numField('sig-trigv', `מתח סגירת המפסק (${T('V')})`, s.trigVal)}
        </div>`;
    }

    host.innerHTML = html;

    const refreshComplexPills = () => {
      let tc = Math.max(0, Number(s.t1) || 0);
      const pb = $('cx-pill-before');
      if (pb) pb.textContent = `[0 → ${E.fmtNum(tc, 2)} ${u}]`;
      (s.complexStages || []).forEach((st, i) => {
        const dur = Math.max(0.1, Number(st.duration) || 0.5);
        const pill = $('cx-pill-' + i);
        if (pill) pill.textContent = `[${E.fmtNum(tc, 2)} → ${E.fmtNum(tc + dur, 2)} ${u}]`;
        tc += dur;
      });
      const pa = $('cx-pill-after');
      if (pa) pa.textContent = `[${E.fmtNum(tc, 2)} → ${E.fmtNum(tc + Math.max(0.5, Number(s.complexAfterDur) || 4), 2)} ${u}]`;
    };

    const bind = (id, key, onChangeExtra) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => {
        s[key] = Number(el.value);
        if (onChangeExtra) onChangeExtra(s[key]);
        if (p === 'complex') refreshComplexPills();
        rebuildLabTimeline(true);
      });
    };
    bind('sig-vbase', 'vBase', (val) => {
      const sl = $('sig-vbase-slider');
      if (sl) sl.value = Math.max(-20, Math.min(20, val));
    });
    bind('sig-vpulse', 'vPulse');
    bind('sig-vafter', 'vAfter', (val) => {
      const sl = $('sig-vafter-slider');
      if (sl) sl.value = Math.max(-20, Math.min(20, val));
    });
    bind('sig-vstep2', 'vStep2');
    bind('sig-t1', 't1');
    bind('sig-t2', 't2');
    bind('sig-hp', 'halfPeriod');
    bind('sig-r2val', 'r2Val');
    bind('sig-trigv', 'trigVal');
    bind('sig-vcinit', 'vcInit');
    bind('sig-after-dur', 'complexAfterDur');

    const baseSl = $('sig-vbase-slider');
    if (baseSl) {
      baseSl.addEventListener('input', () => {
        s.vBase = Number(baseSl.value);
        if ($('sig-vbase')) $('sig-vbase').value = s.vBase;
        rebuildLabTimeline(true);
      });
    }
    const afterSl = $('sig-vafter-slider');
    if (afterSl) {
      afterSl.addEventListener('input', () => {
        s.vAfter = Number(afterSl.value);
        if ($('sig-vafter')) $('sig-vafter').value = s.vAfter;
        rebuildLabTimeline(true);
      });
    }

    const vcModeEl = $('sig-vcmode');
    if (vcModeEl) {
      vcModeEl.addEventListener('change', () => {
        s.vcMode = vcModeEl.value;
        buildLabSignalFields();
        rebuildLabTimeline(true);
      });
    }

    // Complex pulse stage bindings
    host.querySelectorAll('.chip-btn[data-tpl]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tpl = COMPLEX_TEMPLATES[btn.dataset.tpl];
        if (!tpl) return;
        s.vBase = tpl.vBase;
        s.t1 = tpl.t1;
        s.complexStages = tpl.complexStages.map((x) => ({ v: x.v, duration: x.duration }));
        s.vAfter = tpl.vAfter;
        s.complexAfterDur = tpl.complexAfterDur;
        s.vcMode = tpl.vcMode;
        buildLabSignalFields();
        rebuildLabTimeline(true);
      });
    });

    host.querySelectorAll('.cx-stage-v').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.idx);
        const val = Number(inp.value) || 0;
        s.complexStages[idx].v = val;
        const sl = host.querySelector(`.cx-stage-slider[data-idx="${idx}"]`);
        if (sl) sl.value = Math.max(-20, Math.min(20, val));
        rebuildLabTimeline(true);
      });
    });

    host.querySelectorAll('.cx-stage-slider').forEach((sl) => {
      sl.addEventListener('input', () => {
        const idx = Number(sl.dataset.idx);
        const val = Number(sl.value);
        s.complexStages[idx].v = val;
        const inp = host.querySelector(`.cx-stage-v[data-idx="${idx}"]`);
        if (inp) inp.value = val;
        rebuildLabTimeline(true);
      });
    });

    host.querySelectorAll('.cx-stage-dur').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.idx);
        s.complexStages[idx].duration = Math.max(0.1, Number(inp.value) || 0.5);
        refreshComplexPills();
        rebuildLabTimeline(true);
      });
    });

    host.querySelectorAll('.cx-del-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (s.complexStages.length > 1) {
          s.complexStages.splice(idx, 1);
          buildLabSignalFields();
          rebuildLabTimeline(true);
        }
      });
    });

    const addStageBtn = $('btn-add-stage');
    if (addStageBtn) {
      addStageBtn.addEventListener('click', () => {
        if (s.complexStages.length < 6) {
          const prev = s.complexStages[s.complexStages.length - 1];
          s.complexStages.push({ v: prev ? (prev.v >= 0 ? -5 : 8) : 5, duration: 2 });
          buildLabSignalFields();
          rebuildLabTimeline(true);
        }
      });
    }
  }

  function rebuildLabTimeline(resetPins = false) {
    const lab = state.lab;
    const R1 = E.toOhms(lab.r1Val || 1, lab.r1Unit);
    const C_F = E.toFarads(lab.cVal || 0.1, lab.cUnit);
    const tau = R1 * C_F;
    const prevUnit = lab.timeUnit;
    lab.timeUnit = E.pickBestTimeUnit(tau);

    $('lab-r1-readout').textContent = E.fmtResistance(R1);
    $('lab-c-readout').textContent = E.fmtCapacitance(C_F);
    $('lab-tau-val').textContent = E.fmtTime(tau, lab.timeUnit);
    $('lab-5tau-val').textContent = E.fmtTime(5 * tau, lab.timeUnit);
    $('insp-t-unit').textContent = lab.timeUnit;

    if (prevUnit !== lab.timeUnit) {
      buildLabSignalFields();
    }

    const u = lab.timeUnit;
    const s = lab.sig;
    const tauU = E.fromSeconds(tau, u);
    const toS = (valU) => E.toSeconds(valU, u);

    let preVi = 0;
    let transitions = [];
    let tViewStart = 0;
    let tViewEnd = 6 * tau;
    let hasSwitch = null;

    if (lab.preset === 'step-up') {
      preVi = 0;
      transitions = [{ t_s: toS(s.t1), Vi: s.vPulse, labelHe: `מדרגה אל ${s.vPulse}V` }];
      tViewStart = Math.min(0, toS(s.t1) - tau);
      if (s.t1 === 0) tViewStart = -0.5 * tau;
      tViewEnd = toS(s.t1) + 5.5 * tau;
    } else if (lab.preset === 'discharge') {
      const v0 = s.vBase || 10;
      preVi = v0;
      transitions = [{ t_s: toS(s.t1), Vi: 0, labelHe: `פריקה אל 0V` }];
      tViewStart = toS(s.t1) - tau;
      tViewEnd = toS(s.t1) + 5.5 * tau;
    } else if (lab.preset === 'step-offset') {
      preVi = s.vBase;
      transitions = [{ t_s: toS(s.t1), Vi: s.vPulse, labelHe: `מעבר אל ${s.vPulse}V` }];
      tViewStart = Math.min(0, toS(s.t1) - tau);
      if (s.t1 === 0) tViewStart = -0.5 * tau;
      tViewEnd = toS(s.t1) + 5.5 * tau;
    } else if (lab.preset === 'pulse') {
      const tEnd = Math.max(s.t1 + 0.1, s.t2);
      preVi = s.vBase;
      transitions = [
        { t_s: toS(s.t1), Vi: s.vPulse, labelHe: 'במהלך הדופק' },
        { t_s: toS(tEnd), Vi: s.vAfter, labelHe: 'אחרי הדופק' }
      ];
      tViewStart = s.t1 <= 0 ? -0.6 * tau : 0;
      tViewEnd = toS(tEnd) + Math.max(4.5 * tau, (toS(tEnd) - toS(s.t1)) * 0.8);
    } else if (lab.preset === 'complex') {
      let tCursor = Math.max(0, Number(s.t1) || 0);
      preVi = s.vBase;
      const stages = Array.isArray(s.complexStages) && s.complexStages.length ? s.complexStages : [{ v: 10, duration: 2 }];
      stages.forEach((st, idx) => {
        transitions.push({ t_s: toS(tCursor), Vi: Number(st.v) || 0, labelHe: `שלב ${idx + 1}` });
        tCursor += Math.max(0.1, Number(st.duration) || 0.5);
      });
      transitions.push({ t_s: toS(tCursor), Vi: Number(s.vAfter) || 0, labelHe: 'אחרי הפולס' });
      tViewStart = s.t1 <= 0 ? -0.5 * tau : 0;
      const afterDur = Math.max(0.5, Number(s.complexAfterDur) || 4 * tauU);
      tViewEnd = toS(tCursor + afterDur);
    } else if (lab.preset === 'two-step') {
      const t2 = Math.max(s.t1 + 0.1, s.t2);
      preVi = s.vBase;
      transitions = [
        { t_s: toS(s.t1), Vi: s.vPulse, labelHe: 'רמה אמצעית' },
        { t_s: toS(t2), Vi: s.vStep2, labelHe: 'רמה סופית' }
      ];
      tViewStart = s.t1 <= 0 ? -0.5 * tau : 0;
      tViewEnd = toS(t2) + 4.5 * tau;
    } else if (lab.preset === 'square') {
      const hp = Math.max(0.05, s.halfPeriod);
      preVi = s.vBase;
      for (let k = 0; k < 6; k++) {
        transitions.push({ t_s: toS(k * hp), Vi: k % 2 === 0 ? s.vPulse : s.vBase, labelHe: `מחזור ${Math.floor(k / 2) + 1}` });
      }
      tViewStart = -0.4 * toS(hp);
      tViewEnd = toS(6 * hp);
    } else if (lab.preset === 'switch-2025') {
      preVi = 0;
      transitions = [{ t_s: 0, Vi: s.vPulse, labelHe: `טעינה אל ${s.vPulse}V` }];
      hasSwitch = {
        enabled: true,
        mode: 'parallel',
        R2_ohm: E.toOhms(s.r2Val || 15, s.r2Unit || 'kΩ'),
        triggerType: 'voltage',
        triggerValue: s.trigVal
      };
      tViewStart = -0.3 * tau;
      tViewEnd = 2.5 * tau;
    }

    const useManualVc = (lab.preset === 'pulse' || lab.preset === 'complex') && s.vcMode === 'manual';

    lab.timeline = E.compileTimeline({
      network: lab.network,
      R1_ohm: R1,
      C_F,
      timeUnit: u,
      tViewStart_s: tViewStart,
      tViewEnd_s: tViewEnd,
      preVi,
      steadyState: !useManualVc,
      VcInit: Number(s.vcInit) || 0,
      transitions,
      hasSwitch
    });

    if (resetPins) lab.pins = [];
    lab.cursorT_s = Math.max(tViewStart, Math.min(tViewEnd, lab.cursorT_s));

    // Populate segment selector in Inspector
    const segSel = $('insp-seg-select');
    if (segSel) {
      segSel.innerHTML = '<option value="all">כל הקטעים בגרף</option>' +
        lab.timeline.segments.filter((sg) => !sg.isPre).map((sg) =>
          `<option value="${sg.index}">${sg.labelHe} (מ-${E.fmtNum(E.fromSeconds(sg.tStart, u), 2)} ${u})</option>`
        ).join('');
    }

    syncScrubberFromCursor();
    renderLabFrame();
  }

  function syncScrubberFromCursor() {
    const tl = state.lab.timeline;
    if (!tl) return;
    const frac = (state.lab.cursorT_s - tl.tViewStart_s) / Math.max(1e-12, tl.tViewEnd_s - tl.tViewStart_s);
    $('lab-time-scrubber').value = Math.round(Math.max(0, Math.min(1, frac)) * 1000);
  }

  function loadConfigIntoLab(cfg) {
    const lab = state.lab;
    if (cfg.network) lab.network = cfg.network;
    if (cfg.r1Val !== undefined) { lab.r1Val = cfg.r1Val; $('lab-r1-val').value = cfg.r1Val; }
    if (cfg.r1Unit) { lab.r1Unit = cfg.r1Unit; $('lab-r1-unit').value = cfg.r1Unit; }
    if (cfg.cVal !== undefined) { lab.cVal = cfg.cVal; $('lab-c-val').value = cfg.cVal; }
    if (cfg.cUnit) { lab.cUnit = cfg.cUnit; $('lab-c-unit').value = cfg.cUnit; }
    if (cfg.preset) { lab.preset = cfg.preset; $('lab-preset').value = cfg.preset; }
    if (cfg.sig) Object.assign(lab.sig, cfg.sig);

    document.querySelectorAll('#lab-network-seg .topo-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.net === lab.network);
    });

    buildLabSignalFields();
    rebuildLabTimeline(true);
    state.lab.cursorT_s = state.lab.timeline.tViewEnd_s;
    syncScrubberFromCursor();
    renderLabFrame();
  }

  function renderLabFrame() {
    if (state.activeTab !== 'lab' || !state.lab.timeline) return;
    const lab = state.lab;
    const tl = lab.timeline;
    const ev = E.evaluateAt(tl, lab.cursorT_s, lab.cursorSide);
    if (!ev) return;

    const u = tl.timeUnit;
    $('lab-cursor-t-badge').textContent = `t = ${E.fmtFixed(E.fromSeconds(lab.cursorT_s, u), 2)} ${u}${ev.atJump ? (lab.cursorSide === 'before' ? '⁻' : '⁺') : ''}`;

    // Toggle jump side button when near a transition
    const nearJump = tl.segments.some((sg, idx) => idx > 0 && Math.abs(sg.deltaVi) > 1e-9 && Math.abs(sg.tStart - lab.cursorT_s) < (tl.tViewEnd_s - tl.tViewStart_s) * 0.015);
    const jumpBtn = $('btn-jump-side');
    if (nearJump) {
      jumpBtn.style.display = 'inline-flex';
      jumpBtn.textContent = lab.cursorSide === 'before' ? 'מציג: לפני הקפיצה (t⁻) · החלף' : 'מציג: אחרי הקפיצה (t⁺) · החלף';
    } else {
      jumpBtn.style.display = 'none';
    }

    // Live Readout Strip
    $('read-vi').textContent = `${E.fmtFixed(ev.Vi, 2)} V`;
    $('read-vc').textContent = `${E.fmtFixed(ev.Vc, 2)} V`;
    $('read-vr').textContent = `${E.fmtFixed(ev.Vr, 2)} V`;
    $('read-i').textContent = E.fmtCurrent(ev.I_A);
    $('read-dt').textContent = `${E.fmtFixed(E.fromSeconds(ev.dt_s, u), 2)} ${u}`;

    // State pill & KVL bar
    const isSteady = ev.dt_s >= 5 * ev.tau_s || ev.segment.isPre;
    $('lab-state-pill').textContent = isSteady
      ? 'מצב מתמיד (I ≈ 0, הקבל כנתק)'
      : ev.segment.labelHe;

    $('lab-kvl-eq').textContent = `${E.fmtFixed(ev.Vi, 2)}V = ${E.fmtFixed(ev.Vr, 2)}V + ${E.fmtFixed(ev.Vc, 2)}V`;
    const vcDisp = Math.abs(Number(ev.Vc.toFixed(2)));
    const vrDisp = Math.abs(Number(ev.Vr.toFixed(2)));
    const totalMag = vcDisp + vrDisp;
    const vcPct = totalMag > 1e-6 ? (vcDisp / totalMag) * 100 : 0;
    const vrPct = totalMag > 1e-6 ? 100 - vcPct : 0;
    $('lab-bar-vc').style.width = vcPct + '%';
    $('lab-bar-vr').style.width = vrPct + '%';
    $('lab-bar-vc').textContent = vcPct >= 20 ? `|VC| ${Math.round(vcPct)}%` : '';
    $('lab-bar-vr').textContent = vrPct >= 20 ? `|VR| ${Math.round(vrPct)}%` : '';
    if ($('lab-kvl-vc-lbl')) $('lab-kvl-vc-lbl').textContent = `VC = ${E.fmtFixed(ev.Vc, 2)} V`;
    if ($('lab-kvl-vr-lbl')) $('lab-kvl-vr-lbl').textContent = `VR = ${E.fmtFixed(ev.Vr, 2)} V`;

    // Max amplitude for capacitor plate charge normalization
    let vMax = 1;
    tl.segments.forEach((sg) => { vMax = Math.max(vMax, Math.abs(sg.Vi)); });

    V.drawCircuit($('lab-circuit-canvas'), {
      network: lab.network,
      R1_ohm: ev.segment.R_ohm,
      R2_ohm: tl.config.hasSwitch ? tl.config.hasSwitch.R2_ohm : 0,
      hasSwitch: tl.config.hasSwitch,
      switchClosed: ev.segment.switchClosed,
      C_F: tl.C_F,
      Vi: ev.Vi,
      Vc: ev.Vc,
      Vr: ev.Vr,
      I_A: ev.I_A,
      vMax,
      animPhase: lab.animPhase
    }, 220);

    lab.lastScopeGeom = V.drawOscilloscope($('lab-scope-canvas'), tl, {
      network: lab.network,
      cursorT_s: lab.cursorT_s,
      cursorSide: lab.cursorSide,
      revealUpToCursor: lab.playing,
      showComparison: lab.showComparison,
      showTauMarkers: lab.showTau,
      showEndpoints: lab.showEndpoints,
      pins: lab.pins,
      editableVi: lab.preset === 'pulse' || lab.preset === 'complex',
      hoverHandleIndex: lab.hoverHandleIndex,
      dragHandleIndex: lab.dragHandleIndex,
      height: 390
    });
  }

  function initLab() {
    document.querySelectorAll('#lab-network-seg .topo-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.lab.network = btn.dataset.net;
        document.querySelectorAll('#lab-network-seg .topo-btn').forEach((b) => b.classList.toggle('active', b === btn));
        rebuildLabTimeline(false);
      });
    });

    const syncR1 = (fromSlider) => {
      if (fromSlider) $('lab-r1-val').value = $('lab-r1-slider').value;
      else $('lab-r1-slider').value = Math.min(100, Math.max(1, Number($('lab-r1-val').value) || 1));
      state.lab.r1Val = Number($('lab-r1-val').value) || 1;
      state.lab.r1Unit = $('lab-r1-unit').value;
      rebuildLabTimeline(true);
    };
    $('lab-r1-val').addEventListener('input', () => syncR1(false));
    $('lab-r1-slider').addEventListener('input', () => syncR1(true));
    $('lab-r1-unit').addEventListener('change', () => syncR1(false));

    const syncC = (fromSlider) => {
      if (fromSlider) $('lab-c-val').value = $('lab-c-slider').value;
      else $('lab-c-slider').value = Math.min(20, Math.max(0.05, Number($('lab-c-val').value) || 0.1));
      state.lab.cVal = Number($('lab-c-val').value) || 0.1;
      state.lab.cUnit = $('lab-c-unit').value;
      rebuildLabTimeline(true);
    };
    $('lab-c-val').addEventListener('input', () => syncC(false));
    $('lab-c-slider').addEventListener('input', () => syncC(true));
    $('lab-c-unit').addEventListener('change', () => syncC(false));

    $('lab-preset').addEventListener('change', () => {
      state.lab.preset = $('lab-preset').value;
      // Pick intuitive defaults per preset
      const u = state.lab.timeUnit;
      const tauU = E.fromSeconds(E.toOhms(state.lab.r1Val, state.lab.r1Unit) * E.toFarads(state.lab.cVal, state.lab.cUnit), u);
      if (state.lab.preset === 'step-offset') {
        state.lab.sig.vBase = -4; state.lab.sig.vPulse = 8; state.lab.sig.t1 = 0;
      } else if (state.lab.preset === 'pulse') {
        state.lab.sig.vBase = 0; state.lab.sig.vPulse = 10; state.lab.sig.vAfter = 0;
        state.lab.sig.t1 = Number(tauU.toFixed(1)); state.lab.sig.t2 = Number((3 * tauU).toFixed(1));
      } else if (state.lab.preset === 'complex') {
        if (!Array.isArray(state.lab.sig.complexStages) || !state.lab.sig.complexStages.length) {
          state.lab.sig.complexStages = [{ v: 10, duration: Number((2 * tauU).toFixed(1)) }, { v: -5, duration: Number((2 * tauU).toFixed(1)) }];
        }
      } else if (state.lab.preset === 'switch-2025') {
        state.lab.sig.vPulse = 20; state.lab.sig.trigVal = 5;
      }
      buildLabSignalFields();
      rebuildLabTimeline(true);
      state.lab.cursorT_s = state.lab.timeline.tViewEnd_s;
      syncScrubberFromCursor();
      renderLabFrame();
    });

    const quickComplexBtn = $('btn-quick-complex');
    if (quickComplexBtn) {
      quickComplexBtn.addEventListener('click', () => {
        $('lab-preset').value = state.lab.preset === 'complex' ? 'pulse' : 'complex';
        $('lab-preset').dispatchEvent(new Event('change'));
      });
    }

    // Scrubber & Interactive click/drag on oscilloscope (Vi handles + time cursor)
    $('lab-time-scrubber').addEventListener('input', () => {
      state.lab.playing = false;
      $('btn-lab-play').textContent = '▶ הפעל אנימציה';
      const tl = state.lab.timeline;
      const frac = Number($('lab-time-scrubber').value) / 1000;
      state.lab.cursorT_s = tl.tViewStart_s + frac * (tl.tViewEnd_s - tl.tViewStart_s);
      renderLabFrame();
    });

    const scopeCanvas = $('lab-scope-canvas');
    let dragMode = null; // 'time' | 'vi'
    let dragSegIdx = null;

    const findHitHandle = (x, y, g) => {
      if (!g || !Array.isArray(g.levelHandles) || !g.levelHandles.length) return null;
      if (y < g.yTop0 - 8 || y > g.yTop0 + g.hTop + 8) return null;
      let best = null;
      let bestDist = 16;
      g.levelHandles.forEach((h) => {
        if (x >= h.x0 - 4 && x <= h.x1 + 4) {
          const d = Math.abs(y - h.y);
          if (d <= bestDist) {
            bestDist = d;
            best = h;
          }
        }
      });
      return best;
    };

    const applyDraggedVi = (segIdx, y, g) => {
      const clampedY = Math.max(g.yTop0, Math.min(g.yTop0 + g.hTop, y));
      const fracY = (g.yTop0 + g.hTop - clampedY) / Math.max(1, g.hTop);
      const rawV = g.viLo + fracY * (g.viHi - g.viLo);
      const snappedV = Math.round(Math.max(-25, Math.min(25, rawV)) * 2) / 2;
      const s = state.lab.sig;

      if (segIdx === 0) {
        s.vBase = snappedV;
        if ($('sig-vbase')) $('sig-vbase').value = snappedV;
        if ($('sig-vbase-slider')) $('sig-vbase-slider').value = Math.max(-20, Math.min(20, snappedV));
      } else if (state.lab.preset === 'pulse') {
        if (segIdx === 1) {
          s.vPulse = snappedV;
          if ($('sig-vpulse')) $('sig-vpulse').value = snappedV;
        } else {
          s.vAfter = snappedV;
          if ($('sig-vafter')) $('sig-vafter').value = snappedV;
        }
      } else if (state.lab.preset === 'complex') {
        const stages = s.complexStages || [];
        if (segIdx <= stages.length) {
          stages[segIdx - 1].v = snappedV;
          const inp = document.querySelector(`.cx-stage-v[data-idx="${segIdx - 1}"]`);
          const sl = document.querySelector(`.cx-stage-slider[data-idx="${segIdx - 1}"]`);
          if (inp) inp.value = snappedV;
          if (sl) sl.value = Math.max(-20, Math.min(20, snappedV));
        } else {
          s.vAfter = snappedV;
          if ($('sig-vafter')) $('sig-vafter').value = snappedV;
          if ($('sig-vafter-slider')) $('sig-vafter-slider').value = Math.max(-20, Math.min(20, snappedV));
        }
      }
      rebuildLabTimeline(true);
    };

    const scrubPointer = (evt) => {
      const g = state.lab.lastScopeGeom;
      if (!g) return;
      const rect = scopeCanvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const frac = Math.max(0, Math.min(1, (x - g.padL) / g.plotW));
      state.lab.playing = false;
      $('btn-lab-play').textContent = '▶ הפעל אנימציה';
      state.lab.cursorT_s = g.tMin + frac * (g.tMax - g.tMin);
      syncScrubberFromCursor();
      renderLabFrame();
    };

    scopeCanvas.addEventListener('pointerdown', (e) => {
      const g = state.lab.lastScopeGeom;
      const rect = scopeCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hit = findHitHandle(x, y, g);
      if (hit) {
        dragMode = 'vi';
        dragSegIdx = hit.segIndex;
        state.lab.dragHandleIndex = hit.segIndex;
        state.lab.playing = false;
        $('btn-lab-play').textContent = '▶ הפעל אנימציה';
        scopeCanvas.style.cursor = 'ns-resize';
        applyDraggedVi(dragSegIdx, y, g);
      } else {
        dragMode = 'time';
        scrubPointer(e);
      }
    });

    window.addEventListener('pointermove', (e) => {
      const g = state.lab.lastScopeGeom;
      const rect = scopeCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (dragMode === 'vi' && g) {
        applyDraggedVi(dragSegIdx, y, g);
      } else if (dragMode === 'time') {
        scrubPointer(e);
      } else if (e.target === scopeCanvas && g) {
        const hit = findHitHandle(x, y, g);
        const nextHover = hit ? hit.segIndex : null;
        scopeCanvas.style.cursor = hit ? 'ns-resize' : 'ew-resize';
        if (nextHover !== state.lab.hoverHandleIndex) {
          state.lab.hoverHandleIndex = nextHover;
          renderLabFrame();
        }
      }
    });

    window.addEventListener('pointerup', () => {
      if (dragMode) {
        dragMode = null;
        dragSegIdx = null;
        if (state.lab.dragHandleIndex !== null) {
          state.lab.dragHandleIndex = null;
          renderLabFrame();
        }
      }
    });

    $('btn-lab-play').addEventListener('click', () => {
      const lab = state.lab;
      if (!lab.playing) {
        if (lab.cursorT_s >= lab.timeline.tViewEnd_s - 1e-9) {
          lab.cursorT_s = lab.timeline.tViewStart_s;
        }
        lab.playing = true;
        $('btn-lab-play').textContent = '⏸ השהה';
      } else {
        lab.playing = false;
        $('btn-lab-play').textContent = '▶ המשך אנימציה';
        renderLabFrame();
      }
    });

    $('btn-lab-reset').addEventListener('click', () => {
      state.lab.playing = false;
      $('btn-lab-play').textContent = '▶ הפעל אנימציה';
      state.lab.cursorT_s = state.lab.timeline.tViewStart_s;
      state.lab.pins = [];
      syncScrubberFromCursor();
      renderLabFrame();
    });

    $('lab-speed').addEventListener('change', () => {
      state.lab.speed = Number($('lab-speed').value) || 1;
    });

    $('btn-jump-side').addEventListener('click', () => {
      state.lab.cursorSide = state.lab.cursorSide === 'after' ? 'before' : 'after';
      // Snap cursor directly onto closest jump boundary
      const tl = state.lab.timeline;
      let best = state.lab.cursorT_s, minD = Infinity;
      tl.segments.forEach((sg, idx) => {
        if (idx > 0 && Math.abs(sg.deltaVi) > 1e-9) {
          const d = Math.abs(sg.tStart - state.lab.cursorT_s);
          if (d < minD) { minD = d; best = sg.tStart; }
        }
      });
      state.lab.cursorT_s = best;
      syncScrubberFromCursor();
      renderLabFrame();
    });

    $('chk-compare').addEventListener('change', () => { state.lab.showComparison = $('chk-compare').checked; renderLabFrame(); });
    $('chk-tau').addEventListener('change', () => { state.lab.showTau = $('chk-tau').checked; renderLabFrame(); });
    $('chk-endpoints').addEventListener('change', () => { state.lab.showEndpoints = $('chk-endpoints').checked; renderLabFrame(); });

    // Point & Time Inspector
    document.querySelectorAll('#insp-mode-seg .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#insp-mode-seg .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
        const isV = btn.dataset.mode === 'voltage';
        $('insp-voltage-box').style.display = isV ? 'block' : 'none';
        $('insp-time-box').style.display = isV ? 'none' : 'block';
      });
    });

    $('btn-insp-calc-v').addEventListener('click', () => {
      const lab = state.lab;
      const tl = lab.timeline;
      const tVal = Number(String($('insp-t-input').value).replace(/,/g, '.'));
      if (!Number.isFinite(tVal)) return;
      const ts = E.toSeconds(tVal, tl.timeUnit);
      const side = $('insp-side-select').value;
      const activeNet = lab.network === 'BOTH' ? 'LP' : lab.network;
      const ev = E.evaluateAt(tl, ts, side);
      const vRes = activeNet === 'HP' ? ev.VoHP : ev.VoLP;

      lab.playing = false;
      $('btn-lab-play').textContent = '▶ הפעל אנימציה';
      lab.cursorT_s = Math.max(tl.tViewStart_s, Math.min(tl.tViewEnd_s, ts));
      lab.cursorSide = side;
      lab.pins = [{ t_s: ts, v: vRes, label: `Vo=${E.fmtFixed(vRes, 2)}V` }];
      syncScrubberFromCursor();
      renderLabFrame();

      const steps = E.buildVoltageDerivation(tl, activeNet, ts, side);
      $('insp-output').innerHTML = renderStepCardsHtml(steps);
    });

    $('btn-insp-calc-t').addEventListener('click', () => {
      const lab = state.lab;
      const tl = lab.timeline;
      const vVal = Number(String($('insp-v-input').value).replace(/,/g, '.'));
      if (!Number.isFinite(vVal)) return;
      const segChoice = $('insp-seg-select').value;
      const segIdx = segChoice === 'all' ? null : Number(segChoice);
      const activeNet = lab.network === 'BOTH' ? 'LP' : lab.network;

      const res = E.solveTimeForVoltage(tl, activeNet, vVal, segIdx);
      if (res.hits.length > 0) {
        const firstHit = res.hits[0];
        lab.playing = false;
        $('btn-lab-play').textContent = '▶ הפעל אנימציה';
        lab.cursorT_s = firstHit.t_s;
        lab.pins = res.hits.map((h) => ({
          t_s: h.t_s,
          v: vVal,
          label: `t=${E.fmtFixed(h.t_display, 2)}${h.unit}`,
          targetLineV: vVal
        }));
        syncScrubberFromCursor();
        renderLabFrame();
        const allSteps = res.hits.flatMap((h) => h.steps);
        $('insp-output').innerHTML = renderStepCardsHtml(allSteps);
      } else {
        lab.pins = [{ targetLineV: vVal }];
        renderLabFrame();
        const reasonsHtml = res.reasons.map((r) => `<div class="step-card"><strong>${r.segment.labelHe}:</strong> ${r.reasonHe}</div>`).join('');
        $('insp-output').innerHTML = `
          <div class="feedback-msg wrong show"><strong>המתח ${L(E.fmtFixed(vVal, 2) + ' V')} אינו מתקבל בגבולות הקטעים שנבחרו:</strong></div>
          ${reasonsHtml}
        `;
      }
    });

    buildLabSignalFields();
    rebuildLabTimeline(true);
    state.lab.cursorT_s = state.lab.timeline.tViewEnd_s;
    syncScrubberFromCursor();
  }

  // Animation loop for live current particles & oscilloscope sweep
  let lastTs = 0;
  function tickAnimation(ts) {
    const dtSec = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;

    state.lab.animPhase += dtSec * 1.4;

    if (state.activeTab === 'lab') {
      if (state.lab.playing && state.lab.timeline) {
        const tl = state.lab.timeline;
        const span = tl.tViewEnd_s - tl.tViewStart_s;
        state.lab.cursorT_s += (dtSec / 5.5) * state.lab.speed * span;
        if (state.lab.cursorT_s >= tl.tViewEnd_s) {
          state.lab.cursorT_s = tl.tViewEnd_s;
          state.lab.playing = false;
          $('btn-lab-play').textContent = '▶ הפעל אנימציה';
        }
        syncScrubberFromCursor();
        renderLabFrame();
      } else if (state.lab.timeline) {
        // Keep current dots smoothly flowing on the circuit canvas when current != 0
        const ev = E.evaluateAt(state.lab.timeline, state.lab.cursorT_s, state.lab.cursorSide);
        if (ev && Math.abs(ev.I_A) > 1e-6) {
          let vMax = 1;
          state.lab.timeline.segments.forEach((sg) => { vMax = Math.max(vMax, Math.abs(sg.Vi)); });
          V.drawCircuit($('lab-circuit-canvas'), {
            network: state.lab.network,
            R1_ohm: ev.segment.R_ohm,
            R2_ohm: state.lab.timeline.config.hasSwitch ? state.lab.timeline.config.hasSwitch.R2_ohm : 0,
            hasSwitch: state.lab.timeline.config.hasSwitch,
            switchClosed: ev.segment.switchClosed,
            C_F: state.lab.timeline.C_F,
            Vi: ev.Vi, Vc: ev.Vc, Vr: ev.Vr, I_A: ev.I_A, vMax,
            animPhase: state.lab.animPhase
          }, 220);
        }
      }
    } else if (state.activeTab === 'intro' && state.introChapter === 'ch1') {
      const d = KVL_STAGES[state.kvlStage];
      if (Math.abs(d.I_A) > 1e-6) {
        V.drawCircuit($('intro-kvl-canvas'), {
          network: 'LP', R1_ohm: 10e3, C_F: 1e-6,
          Vi: d.Vi, Vc: d.Vc, Vr: d.Vr, I_A: d.I_A, vMax: 12,
          animPhase: state.lab.animPhase
        }, 230);
      }
    }

    requestAnimationFrame(tickAnimation);
  }

  // =========================================================================
  // 4. TAB 3: EXERCISE WORKSHOP, RANDOM TRAINER & CUSTOM HOMEWORK VALIDATOR
  // =========================================================================
  function buildExerciseCardElement(ex, isCurated) {
    const tl = E.compileTimeline(ex.circuitConfig);
    const card = document.createElement('article');
    card.className = 'exercise-card' + (isCurated && state.solvedIds.has(ex.id) ? ' solved' : '');
    card.id = 'card-' + ex.id;

    const netBadgeClass = ex.circuitConfig.network === 'HP' ? 'badge-hp' : 'badge-lp';
    const solvedBadge = isCurated && state.solvedIds.has(ex.id) ? '<span class="badge badge-done">✓ הושלם</span>' : '';

    card.innerHTML = `
      <div class="ex-top">
        <div>
          <div style="display:flex; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.35rem;">
            <span class="badge ${netBadgeClass}" dir="ltr">${ex.circuitConfig.network}</span>
            <span class="badge badge-accent">${ex.lessonTag}</span>
            <span class="badge">${ex.sourceHe}</span>
            ${solvedBadge}
          </div>
          <h3 class="ex-title">${ex.titleHe}</h3>
        </div>
      </div>

      <div class="ex-body-grid">
        <div>
          <p style="margin-top:0;">${ex.promptHe}</p>
          <div class="guided-steps-panel">
            <button type="button" class="guided-toggle-btn">
              <span>🧭 פירוק מודרך לשלבים (שאלות אמריקאיות כולל חישוב <bdi dir="ltr" class="ltr-term">τ</bdi>)</span>
              <span style="display:inline-flex; align-items:center; gap:0.45rem;">
                <span class="badge badge-accent guided-count-badge" dir="ltr">0/4</span>
                <span class="guided-arrow">${(ex.id === 'ex-16-kvl' || !isCurated) ? '▲' : '▼'}</span>
              </span>
            </button>
            <div class="guided-steps-body${(ex.id === 'ex-16-kvl' || !isCurated) ? ' open' : ''}"></div>
          </div>
          <div class="subq-list">
            ${ex.subQuestions.map((sq) => `
              <div class="subq-row" id="${ex.id}-${sq.id}-row">
                <div class="subq-prompt">${sq.promptHe}</div>
                <div class="subq-controls">
                  <div class="subq-input-wrap">
                    <input type="text" inputmode="decimal" class="subq-input" id="${ex.id}-${sq.id}-in" placeholder="ערך">
                    <span class="ltr-inline" dir="ltr">${sq.unit}</span>
                  </div>
                  <button class="btn btn-primary btn-sm" data-action="check" data-sq="${sq.id}">בדוק תשובה</button>
                  <button class="btn btn-sm" data-action="hint" data-sq="${sq.id}">💡 רמז</button>
                </div>
                <div class="feedback-msg" id="${ex.id}-${sq.id}-fb"></div>
              </div>
            `).join('')}
          </div>

          <div class="ex-actions">
            <button class="btn btn-sm" data-action="toggle-sol">📘 הצג פתרון מלא שלב-אחר-שלב</button>
            <button class="btn btn-lp btn-sm" data-action="verify-sim">🎬 אמת והרץ בסימולציה</button>
            <button class="btn btn-sm" data-action="open-lab">🔬 פתח במעבדה המלאה</button>
          </div>
        </div>

        <div class="ex-mini-diagrams">
          <div class="canvas-wrap"><canvas class="mini-circ" data-height="150"></canvas></div>
          <div class="canvas-wrap"><canvas class="mini-wave" data-height="130"></canvas></div>
        </div>
      </div>

      <div class="ex-sim-box" id="${ex.id}-simbox">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <strong>אימות גרפי בסימולציה (הנקודות המחושבות מסומנות בסיכות זהב)</strong>
          <button class="btn btn-sm" data-action="replay-sim">↺ הרץ שוב</button>
        </div>
        <div class="canvas-wrap"><canvas class="ex-verify-scope" data-height="310"></canvas></div>
      </div>

      <div class="ex-solution-box" id="${ex.id}-solbox">
        <h4 style="margin:0 0 0.6rem 0;">פתרון מלא בסגנון בגרות:</h4>
        <div class="step-list">${renderStepCardsHtml(ex.solutionSteps)}</div>
      </div>
    `;

    // Bind mini diagrams render
    const drawMinis = () => {
      const cCirc = card.querySelector('.mini-circ');
      const cWave = card.querySelector('.mini-wave');
      if (cCirc && cCirc.offsetParent !== null) {
        V.drawCircuit(cCirc, {
          network: ex.circuitConfig.network,
          R1_ohm: ex.circuitConfig.R1_ohm,
          C_F: ex.circuitConfig.C_F,
          hasSwitch: ex.circuitConfig.hasSwitch,
          R2_ohm: ex.circuitConfig.hasSwitch ? ex.circuitConfig.hasSwitch.R2_ohm : 0,
          switchClosed: false,
          compact: true
        }, 150);
      }
      if (cWave && cWave.offsetParent !== null) {
        V.drawMiniInputWave(cWave, tl);
      }
    };
    card._drawMinis = drawMinis;

    // Mount 4-step Guided Multiple-Choice Stepper inside exercise card
    const guidedSteps = C.buildGuidedStepsForExercise(ex);
    const guidedToggle = card.querySelector('.guided-toggle-btn');
    const guidedBody = card.querySelector('.guided-steps-body');
    const guidedBadge = card.querySelector('.guided-count-badge');
    const guidedArrow = card.querySelector('.guided-arrow');
    if (guidedToggle && guidedBody) {
      guidedToggle.addEventListener('click', () => {
        const isOpen = guidedBody.classList.toggle('open');
        if (guidedArrow) guidedArrow.textContent = isOpen ? '▲' : '▼';
      });
      mountGuidedStepper(guidedBody, guidedSteps, { countBadgeEl: guidedBadge });
    }

    // Bind Check & Hint buttons
    const sqPassed = new Set();
    card.querySelectorAll('[data-action="check"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sqId = btn.dataset.sq;
        const sq = ex.subQuestions.find((q) => q.id === sqId);
        const inp = $(`${ex.id}-${sqId}-in`);
        const fb = $(`${ex.id}-${sqId}-fb`);
        const res = E.validateStudentAnswer(inp.value, sq);

        inp.classList.remove('correct', 'wrong');
        fb.classList.remove('correct', 'wrong', 'hint');
        fb.classList.add('show');

        if (res.status === 'correct') {
          inp.classList.add('correct');
          fb.classList.add('correct');
          fb.innerHTML = res.feedbackHe;
          sqPassed.add(sqId);
          if (isCurated && sqPassed.size === ex.subQuestions.length) {
            state.solvedIds.add(ex.id);
            saveSolvedSet();
            card.classList.add('solved');
            updateWorkshopProgress();
          }
        } else {
          inp.classList.add('wrong');
          fb.classList.add('wrong');
          fb.innerHTML = res.feedbackHe;
        }
      });
    });

    card.querySelectorAll('[data-action="hint"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sqId = btn.dataset.sq;
        const sq = ex.subQuestions.find((q) => q.id === sqId);
        const fb = $(`${ex.id}-${sqId}-fb`);
        fb.className = 'feedback-msg show hint';
        fb.innerHTML = `<strong>רמז:</strong> ${sq.hintHe}`;
      });
    });

    card.querySelector('[data-action="toggle-sol"]').addEventListener('click', (e) => {
      const box = $(`${ex.id}-solbox`);
      const isOpen = box.classList.toggle('open');
      e.target.textContent = isOpen ? '📘 הסתר פתרון מלא' : '📘 הצג פתרון מלא שלב-אחר-שלב';
    });

    const pins = ex.subQuestions.filter((q) => q.pin).map((q) => q.pin);
    const runVerifyScope = () => {
      const box = $(`${ex.id}-simbox`);
      box.classList.add('open');
      const sc = box.querySelector('.ex-verify-scope');
      const tStart = tl.tViewStart_s;
      const tEnd = tl.tViewEnd_s;
      const startTime = performance.now();
      const dur = 1200;
      const step = (now) => {
        const p = Math.min(1, (now - startTime) / dur);
        const curT = tStart + p * (tEnd - tStart);
        V.drawOscilloscope(sc, tl, {
          network: ex.circuitConfig.network,
          cursorT_s: curT,
          revealUpToCursor: p < 1,
          showTauMarkers: true,
          showEndpoints: true,
          pins: p >= 0.98 ? pins : [],
          height: 310
        });
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    card.querySelector('[data-action="verify-sim"]').addEventListener('click', runVerifyScope);
    card.querySelector('[data-action="replay-sim"]').addEventListener('click', runVerifyScope);

    card.querySelector('[data-action="open-lab"]').addEventListener('click', () => {
      openTimelineInLab(ex.circuitConfig, pins);
    });

    return card;
  }

  function openTimelineInLab(cfg, pins = []) {
    const lab = state.lab;
    lab.network = cfg.network;
    // Extract display R & C
    const rBest = cfg.R1_ohm >= 1e6 ? [cfg.R1_ohm / 1e6, 'MΩ'] : cfg.R1_ohm >= 1e3 ? [cfg.R1_ohm / 1e3, 'kΩ'] : [cfg.R1_ohm, 'Ω'];
    const cBest = cfg.C_F >= 1e-3 ? [cfg.C_F * 1e3, 'mF'] : cfg.C_F >= 1e-6 ? [cfg.C_F * 1e6, 'µF'] : [cfg.C_F * 1e9, 'nF'];
    lab.r1Val = Number(rBest[0].toFixed(2));
    lab.r1Unit = rBest[1];
    lab.cVal = Number(cBest[0].toFixed(3));
    lab.cUnit = cBest[1];
    $('lab-r1-val').value = lab.r1Val;
    $('lab-r1-unit').value = lab.r1Unit;
    $('lab-c-val').value = lab.cVal;
    $('lab-c-unit').value = lab.cUnit;

    const u = cfg.timeUnit || E.pickBestTimeUnit(cfg.R1_ohm * cfg.C_F);
    const trs = cfg.transitions || [];
    if (cfg.hasSwitch && cfg.hasSwitch.enabled) {
      lab.preset = 'switch-2025';
      lab.sig.vPulse = trs[0] ? trs[0].Vi : 20;
      lab.sig.r2Val = Number((cfg.hasSwitch.R2_ohm / 1e3).toFixed(2));
      lab.sig.r2Unit = 'kΩ';
      lab.sig.trigVal = cfg.hasSwitch.triggerValue;
    } else if (trs.length === 1) {
      if (cfg.preVi !== 0 && trs[0].Vi === 0) {
        lab.preset = 'discharge';
        lab.sig.vBase = cfg.preVi;
      } else if (cfg.preVi !== 0) {
        lab.preset = 'step-offset';
        lab.sig.vBase = cfg.preVi;
        lab.sig.vPulse = trs[0].Vi;
      } else {
        lab.preset = 'step-up';
        lab.sig.vPulse = trs[0].Vi;
      }
      lab.sig.t1 = Number(E.fromSeconds(trs[0].t_s, u).toFixed(2));
    } else if (trs.length === 2) {
      lab.preset = 'pulse';
      lab.sig.vBase = cfg.preVi;
      lab.sig.vPulse = trs[0].Vi;
      lab.sig.vAfter = trs[1].Vi;
      lab.sig.vcMode = cfg.steadyState === false ? 'manual' : 'steady';
      lab.sig.vcInit = Number(cfg.VcInit) || 0;
      lab.sig.t1 = Number(E.fromSeconds(trs[0].t_s, u).toFixed(2));
      lab.sig.t2 = Number(E.fromSeconds(trs[1].t_s, u).toFixed(2));
    } else if (trs.length >= 3) {
      lab.preset = 'complex';
      lab.sig.vBase = cfg.preVi;
      lab.sig.vcMode = cfg.steadyState === false ? 'manual' : 'steady';
      lab.sig.vcInit = Number(cfg.VcInit) || 0;
      lab.sig.t1 = Number(E.fromSeconds(trs[0].t_s, u).toFixed(2));
      const stages = [];
      for (let i = 0; i < trs.length - 1; i++) {
        const dur = Math.max(0.1, E.fromSeconds(trs[i + 1].t_s - trs[i].t_s, u));
        stages.push({ v: trs[i].Vi, duration: Number(dur.toFixed(2)) });
      }
      lab.sig.complexStages = stages.slice(0, 6);
      const lastTr = trs[trs.length - 1];
      lab.sig.vAfter = lastTr.Vi;
      const viewEnd = cfg.tViewEnd_s ? E.fromSeconds(cfg.tViewEnd_s - lastTr.t_s, u) : 4;
      lab.sig.complexAfterDur = Math.max(0.5, Number(viewEnd.toFixed(2)));
    }

    $('lab-preset').value = lab.preset;
    document.querySelectorAll('#lab-network-seg .topo-btn').forEach((b) => b.classList.toggle('active', b.dataset.net === lab.network));
    buildLabSignalFields();
    rebuildLabTimeline(true);
    lab.pins = pins.slice();
    lab.cursorT_s = lab.timeline.tViewEnd_s;
    syncScrubberFromCursor();
    switchMainTab('lab');
  }

  function renderCuratedExercises() {
    const list = $('curated-ex-list');
    list.innerHTML = '';
    const filtered = C.EXERCISES.filter((ex) => state.exFilter === 'all' || ex.category === state.exFilter);
    filtered.forEach((ex) => {
      const card = buildExerciseCardElement(ex, true);
      list.appendChild(card);
    });
    updateWorkshopProgress();
    setTimeout(() => {
      list.querySelectorAll('.exercise-card').forEach((card) => card._drawMinis && card._drawMinis());
    }, 15);
  }

  function updateWorkshopProgress() {
    $('workshop-progress-badge').textContent = `פתרת ${state.solvedIds.size} מתוך ${C.EXERCISES.length} תרגילים`;
    if ($('home-solved-badge')) {
      $('home-solved-badge').textContent = `פתרת ${state.solvedIds.size}/${C.EXERCISES.length}`;
    }
  }

  function renderRandomExercise() {
    const net = $('rand-net').value;
    const diff = $('rand-diff').value;
    state.currentRandomEx = C.generateRandomExercise(net, diff);
    const host = $('random-ex-container');
    host.innerHTML = '';
    const card = buildExerciseCardElement(state.currentRandomEx, false);
    host.appendChild(card);
    setTimeout(() => card._drawMinis && card._drawMinis(), 15);
  }

  function runCustomValidator() {
    const net = $('cust-net').value;
    const wave = $('cust-wave').value;
    const R_ohm = E.toOhms($('cust-r').value || 1, $('cust-r-u').value);
    const C_F = E.toFarads($('cust-c').value || 0.1, $('cust-c-u').value);
    const tau = R_ohm * C_F;
    const u = 'ms';

    const vBase = Number($('cust-vbase').value) || 0;
    const vPulse = Number($('cust-vpulse').value) || 0;
    const vAfter = Number($('cust-vafter').value) || 0;
    const t1 = Number($('cust-t1').value) || 0;
    const t2 = Math.max(t1 + 0.1, Number($('cust-t2').value) || (t1 + 2));

    const transitions = wave === 'step'
      ? [{ t_s: E.toSeconds(t1, u), Vi: vPulse, labelHe: 'מדרגה במבוא' }]
      : [
          { t_s: E.toSeconds(t1, u), Vi: vPulse, labelHe: 'בזמן הדופק' },
          { t_s: E.toSeconds(t2, u), Vi: vAfter, labelHe: 'אחרי סוף הדופק' }
        ];

    const tEndView = wave === 'step'
      ? E.toSeconds(t1, u) + 5.5 * tau
      : E.toSeconds(t2, u) + 5 * tau;

    const cfg = {
      network: net,
      R1_ohm: R_ohm,
      C_F,
      timeUnit: u,
      tViewStart_s: t1 <= 0 ? -0.5 * tau : 0,
      tViewEnd_s: Math.max(tEndView, E.toSeconds(Number($('cust-qparam').value) || 0, u) + tau),
      preVi: vBase,
      steadyState: true,
      transitions
    };

    const tl = E.compileTimeline(cfg);
    const qType = $('cust-qtype').value;
    const qParam = Number(String($('cust-qparam').value).replace(/,/g, '.'));
    const studentRaw = $('cust-student-ans').value.trim();
    const fb = $('cust-feedback');

    let pins = [];
    let steps = [];
    let expectedVal = null;
    let answerContext = null;

    if (qType === 'v_at_t' && Number.isFinite(qParam)) {
      const ts = E.toSeconds(qParam, u);
      const ev = E.evaluateAt(tl, ts, 'after');
      expectedVal = net === 'HP' ? ev.VoHP : ev.VoLP;
      pins = [{ t_s: ts, v: expectedVal, label: `Vo(${qParam}ms)=${E.fmtFixed(expectedVal, 2)}V` }];
      steps = E.buildVoltageDerivation(tl, net, ts, 'after');
      answerContext = { expected: expectedVal, unit: 'V', isTimeQuestion: false };
    } else if (qType === 't_at_v' && Number.isFinite(qParam)) {
      const solve = E.solveTimeForVoltage(tl, net, qParam, null);
      if (solve.hits.length > 0) {
        const hit = solve.hits[0];
        expectedVal = hit.t_display;
        pins = solve.hits.map((h) => ({ t_s: h.t_s, v: qParam, label: `t=${E.fmtFixed(h.t_display, 2)}ms`, targetLineV: qParam }));
        steps = solve.hits.flatMap((h) => h.steps);
        answerContext = { expected: hit.t_display, unit: u, isTimeQuestion: true, dtDisplay: hit.dt_display };
      } else {
        pins = [{ targetLineV: qParam }];
        fb.className = 'feedback-msg show wrong';
        fb.innerHTML = `המוצא אינו מגיע למתח ${L(E.fmtFixed(qParam, 2) + ' V')}: ` + (solve.reasons[0] ? solve.reasons[0].reasonHe : '');
      }
    }

    if (studentRaw && answerContext) {
      const chk = E.validateStudentAnswer(studentRaw, answerContext);
      fb.className = 'feedback-msg show ' + (chk.status === 'correct' ? 'correct' : 'wrong');
      fb.innerHTML = chk.feedbackHe + ` (תשובת הסימולציה המדויקת: ${L(E.fmtFixed(answerContext.expected, 2) + ' ' + answerContext.unit)})`;
    } else if (!studentRaw && answerContext) {
      fb.className = 'feedback-msg show correct';
      fb.innerHTML = `תוצאת הסימולציה: ${L(E.fmtFixed(answerContext.expected, 2) + ' ' + answerContext.unit)}. הזינו תשובה משלכם למעלה אם תרצו לבדוק אותה!`;
    }

    $('cust-steps').innerHTML = renderStepCardsHtml(steps);
    V.drawOscilloscope($('cust-scope-canvas'), tl, {
      network: net,
      showTauMarkers: true,
      showEndpoints: true,
      pins,
      height: 310
    });

    $('btn-cust-to-lab').onclick = () => openTimelineInLab(cfg, pins);
  }

  // --- Reusable Guided Multiple-Choice Stepper ---
  function mountGuidedStepper(hostEl, steps, options = {}) {
    if (!hostEl || !steps || !steps.length) return;
    const perStep = steps.map(() => ({
      selectedKey: null,
      status: 'idle',
      feedbackHtml: '',
      counted: false
    }));
    let activeIdx = 0;

    const render = () => {
      const doneCount = perStep.filter((st) => st.status === 'correct').length;
      if (options.countBadgeEl) {
        options.countBadgeEl.textContent = `${doneCount}/${steps.length}`;
      }
      const step = steps[activeIdx];
      const st = perStep[activeIdx];

      hostEl.innerHTML = `
        <div class="stepper-tabs">
          ${steps.map((sp, i) => `
            <button type="button" class="stepper-tab ${i === activeIdx ? 'active' : ''} ${perStep[i].status === 'correct' ? 'done' : ''}" data-step-idx="${i}">
              ${perStep[i].status === 'correct' ? '✓ ' : ''}${sp.tabHe}
            </button>
          `).join('')}
        </div>
        <div style="font-weight:800; font-size:0.93rem; color:var(--accent); margin-bottom:0.25rem;">${step.titleHe}</div>
        <div style="font-size:0.9rem; margin-bottom:0.55rem;">${step.promptHe}</div>
        <div class="mc-options-grid">
          ${step.options.map((opt) => {
            let cls = 'mc-option';
            if (st.status === 'idle' && st.selectedKey === opt.key) cls += ' selected';
            if (st.status === 'correct') {
              if (opt.isCorrect) cls += ' correct';
              else if (st.selectedKey === opt.key) cls += ' wrong';
            } else if (st.status === 'wrong' && st.selectedKey === opt.key) {
              cls += ' wrong';
            }
            return `
              <button type="button" class="${cls}" data-opt-key="${E.escapeHtml(opt.key)}">
                <span class="mc-letter">${opt.letter}</span>
                <span>${opt.textHtml}</span>
              </button>`;
          }).join('')}
        </div>
        <div class="mc-actions-row">
          <button type="button" class="btn btn-primary btn-sm mc-check-btn">✅ בדוק שלב</button>
          ${activeIdx < steps.length - 1 ? `<button type="button" class="btn btn-sm mc-next-btn">לשלב הבא ←</button>` : ''}
        </div>
        <div class="feedback-msg ${st.status !== 'idle' ? 'show ' + st.status : ''}">${st.feedbackHtml}</div>
        ${st.status === 'correct' && step.mathHintLtr ? `<div class="math-block" dir="ltr" style="margin-top:0.5rem;">${E.escapeHtml(step.mathHintLtr)}</div>` : ''}
      `;

      hostEl.querySelectorAll('.stepper-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeIdx = Number(btn.dataset.stepIdx);
          render();
        });
      });

      hostEl.querySelectorAll('.mc-option').forEach((btn) => {
        btn.addEventListener('click', () => {
          st.selectedKey = btn.dataset.optKey;
          if (st.status === 'wrong') {
            st.status = 'idle';
            st.feedbackHtml = '';
          }
          render();
        });
      });

      const chkBtn = hostEl.querySelector('.mc-check-btn');
      if (chkBtn) {
        chkBtn.addEventListener('click', () => {
          if (!st.selectedKey) {
            st.status = 'wrong';
            st.feedbackHtml = 'בחרו תחילה אחת מהאפשרויות כדי לבדוק את השלב.';
            render();
            return;
          }
          const chosen = step.options.find((o) => o.key === st.selectedKey);
          if (!chosen) return;
          const firstAttempt = !st.counted;
          st.counted = true;
          st.status = chosen.isCorrect ? 'correct' : 'wrong';
          st.feedbackHtml = chosen.feedbackHe;
          if (options.onAnyCheck) options.onAnyCheck(chosen.isCorrect, firstAttempt);
          render();
        });
      }

      const nextBtn = hostEl.querySelector('.mc-next-btn');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          activeIdx = Math.min(steps.length - 1, activeIdx + 1);
          render();
        });
      }
    };

    render();
  }

  // --- Sticky Unit Prefix Table & Quick Converter Sidebar ---
  function renderUnitSidebar() {
    const aside = $('workshop-unit-sidebar');
    if (!aside) return;

    aside.innerHTML = `
      <div class="unit-ref-card">
        <div class="module-head">
          <h4>טבלת קידומות והמרת יחידות</h4>
          <span class="mod-badge"><span class="led-dot"></span>SI · UNITS</span>
        </div>
        <table class="unit-ref-table">
          <thead>
            <tr>
              <th>סמל</th>
              <th>קידומת</th>
              <th>חזקה</th>
              <th>דוגמה</th>
            </tr>
          </thead>
          <tbody>
            ${C.UNIT_PREFIXES.map((p) => `
              <tr>
                <td class="sym-cell" dir="ltr">${E.escapeHtml(p.sym)}</td>
                <td>${E.escapeHtml(p.nameHe)}</td>
                <td class="pow-cell" dir="ltr">${E.escapeHtml(p.pow)}</td>
                <td class="ex-cell" dir="ltr">${E.escapeHtml(p.ex)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="unit-warn-box">
          <strong>שימו לב להבדל הקריטי:</strong><br>
          • ${L('k / K')} = קילו (${L('× 1,000')})<br>
          • ${L('m')} (קטנה) = מילי (${L('÷ 1,000')})<br>
          • ${L('M')} (גדולה) = מגה (${L('× 1,000,000')})
        </div>
        <div class="uconv-box">
          <div class="field-label" style="margin-bottom:0.35rem;">
            <span>ממיר מהיר ליחידות תקניות</span>
          </div>
          <div class="input-combo">
            <input id="uconv-val" class="input-box ltr-input" type="number" step="0.1" value="4.7" dir="ltr">
            <select id="uconv-unit" class="select-box" dir="ltr">
              <option value="MΩ">MΩ (×10⁶)</option>
              <option value="kΩ" selected>kΩ (×10³)</option>
              <option value="Ω">Ω (×1)</option>
              <option value="mF">mF (×10⁻³)</option>
              <option value="µF">µF (×10⁻⁶)</option>
              <option value="nF">nF (×10⁻⁹)</option>
              <option value="pF">pF (×10⁻¹²)</option>
              <option value="s">s (×1)</option>
              <option value="ms">ms (×10⁻³)</option>
              <option value="µs">µs (×10⁻⁶)</option>
              <option value="mA">mA (×10⁻³)</option>
              <option value="µA">µA (×10⁻⁶)</option>
            </select>
          </div>
          <div id="uconv-result" class="uconv-result" dir="ltr"></div>
        </div>
      </div>

      <div class="unit-ref-card">
        <div class="module-head">
          <h4>קיצורי דרך לחישוב ${L('τ = R · C')}</h4>
          <span class="mod-badge"><span class="led-dot lp"></span>FAST τ</span>
        </div>
        <div class="tau-shortcut-list">
          ${C.TAU_SHORTCUTS.map((sc) => `
            <div class="tau-shortcut-row" dir="ltr">
              <strong>${E.escapeHtml(sc.ruleLtr)}</strong>
              <span>${E.escapeHtml(sc.powLtr)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const UNIT_META = {
      'MΩ': { base: 'Ω', factor: 1e6, pow: '10⁶' },
      'kΩ': { base: 'Ω', factor: 1e3, pow: '10³' },
      'Ω': { base: 'Ω', factor: 1, pow: '10⁰' },
      'mF': { base: 'F', factor: 1e-3, pow: '10⁻³' },
      'µF': { base: 'F', factor: 1e-6, pow: '10⁻⁶' },
      'nF': { base: 'F', factor: 1e-9, pow: '10⁻⁹' },
      'pF': { base: 'F', factor: 1e-12, pow: '10⁻¹²' },
      's': { base: 's', factor: 1, pow: '10⁰' },
      'ms': { base: 's', factor: 1e-3, pow: '10⁻³' },
      'µs': { base: 's', factor: 1e-6, pow: '10⁻⁶' },
      'mA': { base: 'A', factor: 1e-3, pow: '10⁻³' },
      'µA': { base: 'A', factor: 1e-6, pow: '10⁻⁶' }
    };

    const updateConv = () => {
      const val = Number($('uconv-val').value);
      const u = $('uconv-unit').value;
      const info = UNIT_META[u];
      const out = $('uconv-result');
      if (!Number.isFinite(val) || !info) {
        out.textContent = '—';
        return;
      }
      const baseVal = val * info.factor;
      const baseStr = Math.abs(baseVal) >= 1e-4 && Math.abs(baseVal) < 1e7
        ? Number(baseVal.toPrecision(5)).toLocaleString('en-US', { maximumFractionDigits: 6 })
        : baseVal.toExponential(2);
      out.textContent = `${val} ${u} = ${baseStr} ${info.base} (${val}×${info.pow})`;
    };

    $('uconv-val').addEventListener('input', updateConv);
    $('uconv-unit').addEventListener('change', updateConv);
    updateConv();
  }

  // --- Multiple-Choice Steps & τ / Unit Conversion Drill Sub-tab ---
  function updateMcScoreBadge() {
    const m = state.mcDrill;
    const badge = $('mc-score-badge');
    if (badge) {
      badge.textContent = `נכונות: ${m.score} / ${m.attempts} · רצף: ${m.streak}`;
    }
  }

  function buildStage5McStep(ex) {
    const sq = ex.subQuestions.find((q) => q.id === 'rq2') || ex.subQuestions[0];
    if (!sq) return null;
    const exp = sq.expected;
    const unit = sq.unit || 'V';
    const mag = Math.max(0.5, Math.abs(exp));
    const fmt = (v) => `${E.fmtNum(v, 2)} ${unit}`;

    const correctOpt = {
      key: fmt(exp),
      textHtml: L(fmt(exp)),
      feedbackHe: `כל הכבוד! השלמתם את כל 5 השלבים והגעתם לתשובה המדויקת: ${L(fmt(exp))}.`,
      isCorrect: true
    };
    const distractors = [
      {
        key: fmt(-exp),
        textHtml: L(fmt(-exp)),
        feedbackHe: `בדקו את הסימן של המתח/השינוי בקטע האחרון.`
      },
      {
        key: fmt(exp + mag * 0.45),
        textHtml: L(fmt(exp + mag * 0.45)),
        feedbackHe: `לא מדויק — ודאו שהצבתם ${L('Δt = t - t₀')} מתחילת הקטע ולא ${L('t')} מוחלט.`
      },
      {
        key: fmt(exp * 0.55),
        textHtml: L(fmt(exp * 0.55)),
        feedbackHe: `קרוב, אך בדקו שוב את ההצבה במעריך ${L('e^(-Δt/τ)')}.`
      }
    ];
    return {
      stepNum: 5,
      tabHe: '5. חישוב סופי',
      titleHe: 'שלב 5 מתוך 5: מציאת הערך המספרי הסופי',
      promptHe: sq.promptHe,
      options: distractors.length ? [
        ...(function () {
          // Reuse simple uniqueness + shuffle inline
          const list = [correctOpt];
          const seen = new Set([correctOpt.key]);
          distractors.forEach((d) => {
            if (!seen.has(d.key)) { seen.add(d.key); list.push({ ...d, isCorrect: false }); }
          });
          let extra = 1;
          while (list.length < 4) {
            const k = fmt(exp + extra * 1.7);
            extra++;
            if (!seen.has(k)) {
              seen.add(k);
              list.push({ key: k, textHtml: L(k), feedbackHe: 'בדקו שוב את החישוב המספרי.', isCorrect: false });
            }
          }
          for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
          }
          const letters = ['א', 'ב', 'ג', 'ד'];
          return list.map((o, idx) => ({ ...o, letter: letters[idx] }));
        })()
      ] : [],
      mathHintLtr: `${sq.hintHe ? '' : ''}${ex.solutionSteps[0] ? ex.solutionSteps[0].resultLtr : ''}`
    };
  }

  function renderMcDrill(generateFresh = true) {
    const host = $('mc-drill-host');
    if (!host) return;
    const m = state.mcDrill;
    updateMcScoreBadge();

    if (m.mode === 'tau') {
      if (generateFresh || !m.currentTauQ) {
        m.currentTauQ = C.generateTauMcQuestion();
        m.tauSelectedKey = null;
        m.tauStatus = 'idle';
        m.tauFeedback = '';
        m.tauCounted = false;
      }
      const q = m.currentTauQ;
      host.innerHTML = `
        <article class="exercise-card">
          <div class="ex-top">
            <div>
              <div style="display:flex; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.35rem;">
                <span class="badge badge-accent">${q.badgeHe}</span>
                <span class="badge badge-lp">תרגול יחידות ו-<bdi dir="ltr" class="ltr-term">τ</bdi></span>
              </div>
              <h3 class="ex-title">חישוב קבוע הזמן והמרת קידומות</h3>
            </div>
          </div>
          <div class="ex-body-grid">
            <div>
              <p style="font-size:1.02rem; margin-top:0;">${q.promptHe}</p>
              <div class="mc-options-grid">
                ${q.options.map((opt) => {
                  let cls = 'mc-option';
                  if (m.tauStatus === 'idle' && m.tauSelectedKey === opt.key) cls += ' selected';
                  if (m.tauStatus === 'correct') {
                    if (opt.isCorrect) cls += ' correct';
                    else if (m.tauSelectedKey === opt.key) cls += ' wrong';
                  } else if (m.tauStatus === 'wrong' && m.tauSelectedKey === opt.key) {
                    cls += ' wrong';
                  }
                  return `
                    <button type="button" class="${cls}" data-opt-key="${E.escapeHtml(opt.key)}">
                      <span class="mc-letter">${opt.letter}</span>
                      <span>${opt.textHtml}</span>
                    </button>`;
                }).join('')}
              </div>
              <div class="mc-actions-row">
                <button type="button" id="btn-tau-check" class="btn btn-primary btn-sm">✅ בדוק תשובה</button>
                <button type="button" id="btn-tau-next" class="btn btn-sm">🎲 שאלה הבאה</button>
              </div>
              <div id="tau-mc-fb" class="feedback-msg ${m.tauStatus !== 'idle' ? 'show ' + m.tauStatus : ''}">${m.tauFeedback}</div>
              ${m.tauStatus === 'correct' ? `<div class="math-block" dir="ltr" style="margin-top:0.65rem;">${E.escapeHtml(q.derivationLtr)}</div>` : ''}
            </div>
            <div class="ex-mini-diagrams">
              <div class="canvas-wrap"><canvas id="tau-mc-circ" data-height="170"></canvas></div>
            </div>
          </div>
        </article>
      `;

      const drawTauCirc = () => {
        const cv = $('tau-mc-circ');
        if (cv && cv.offsetParent !== null) {
          V.drawCircuit(cv, {
            network: 'LP',
            R1_ohm: q.circuitConfig.R1_ohm,
            C_F: q.circuitConfig.C_F,
            compact: true
          }, 170);
        }
      };
      host._drawDrillCanvases = drawTauCirc;
      setTimeout(drawTauCirc, 15);

      host.querySelectorAll('.mc-option').forEach((btn) => {
        btn.addEventListener('click', () => {
          m.tauSelectedKey = btn.dataset.optKey;
          if (m.tauStatus === 'wrong') {
            m.tauStatus = 'idle';
            m.tauFeedback = '';
          }
          renderMcDrill(false);
        });
      });

      $('btn-tau-check').addEventListener('click', () => {
        if (!m.tauSelectedKey) {
          m.tauStatus = 'wrong';
          m.tauFeedback = 'בחרו תחילה אחת מ-4 האפשרויות.';
          renderMcDrill(false);
          return;
        }
        const chosen = q.options.find((o) => o.key === m.tauSelectedKey);
        if (!chosen) return;
        if (!m.tauCounted) {
          m.attempts++;
          if (chosen.isCorrect) { m.score++; m.streak++; }
          else { m.streak = 0; }
          m.tauCounted = true;
          updateMcScoreBadge();
        }
        m.tauStatus = chosen.isCorrect ? 'correct' : 'wrong';
        m.tauFeedback = chosen.feedbackHe;
        renderMcDrill(false);
      });

      $('btn-tau-next').addEventListener('click', () => renderMcDrill(true));
      return;
    }

    // Mode 2: Full 5-stage multiple-choice breakdown on randomized LP/HP exercise
    if (generateFresh || !m.currentStageEx) {
      m.currentStageEx = C.generateRandomExercise(m.net, 'medium');
    }
    const ex = m.currentStageEx;
    const tl = E.compileTimeline(ex.circuitConfig);
    const steps = C.buildGuidedStepsForExercise(ex);
    const s5 = buildStage5McStep(ex);
    if (s5) steps.push(s5);
    const netBadgeClass = ex.circuitConfig.network === 'HP' ? 'badge-hp' : 'badge-lp';

    host.innerHTML = `
      <article class="exercise-card">
        <div class="ex-top">
          <div>
            <div style="display:flex; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.35rem;">
              <span class="badge ${netBadgeClass}" dir="ltr">${ex.circuitConfig.network}</span>
              <span class="badge badge-accent">פירוק ל-${steps.length} שלבים</span>
            </div>
            <h3 class="ex-title">${ex.titleHe}</h3>
          </div>
          <span class="badge" id="mc-stage-progress-pill" dir="ltr">0/${steps.length}</span>
        </div>
        <div class="ex-body-grid">
          <div>
            <p style="margin-top:0;">${ex.promptHe}</p>
            <div id="mc-stages-stepper" class="card" style="background:var(--card-soft); padding:0.85rem;"></div>
            <div class="ex-actions">
              <button type="button" class="btn btn-lp btn-sm" id="btn-mc-verify-sim">🎬 אמת והרץ בסימולציה</button>
              <button type="button" class="btn btn-sm" id="btn-mc-toggle-sol">📘 הצג פתרון מלא שלב-אחר-שלב</button>
              <button type="button" class="btn btn-sm" id="btn-mc-open-lab">🔬 פתח במעבדה המלאה</button>
            </div>
          </div>
          <div class="ex-mini-diagrams">
            <div class="canvas-wrap"><canvas id="mc-st-circ" data-height="150"></canvas></div>
            <div class="canvas-wrap"><canvas id="mc-st-wave" data-height="130"></canvas></div>
          </div>
        </div>
        <div class="ex-sim-box" id="mc-st-simbox">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <strong>אימות גרפי בסימולציה (הנקודות המחושבות מסומנות בסיכות זהב)</strong>
          </div>
          <div class="canvas-wrap"><canvas id="mc-st-scope" data-height="310"></canvas></div>
        </div>
        <div class="ex-solution-box" id="mc-st-solbox">
          <h4 style="margin:0 0 0.6rem 0;">פתרון מלא בסגנון בגרות:</h4>
          <div class="step-list">${renderStepCardsHtml(ex.solutionSteps)}</div>
        </div>
      </article>
    `;

    mountGuidedStepper($('mc-stages-stepper'), steps, {
      countBadgeEl: $('mc-stage-progress-pill'),
      onAnyCheck: (isOk, firstAttempt) => {
        if (firstAttempt) {
          m.attempts++;
          if (isOk) { m.score++; m.streak++; }
          else { m.streak = 0; }
          updateMcScoreBadge();
        }
      }
    });

    const drawStageCanvases = () => {
      const c1 = $('mc-st-circ');
      const c2 = $('mc-st-wave');
      if (c1 && c1.offsetParent !== null) {
        V.drawCircuit(c1, {
          network: ex.circuitConfig.network,
          R1_ohm: ex.circuitConfig.R1_ohm,
          C_F: ex.circuitConfig.C_F,
          compact: true
        }, 150);
      }
      if (c2 && c2.offsetParent !== null) {
        V.drawMiniInputWave(c2, tl);
      }
    };
    host._drawDrillCanvases = drawStageCanvases;
    setTimeout(drawStageCanvases, 15);

    const pins = ex.subQuestions.filter((q) => q.pin).map((q) => q.pin);
    $('btn-mc-verify-sim').addEventListener('click', () => {
      const box = $('mc-st-simbox');
      box.classList.add('open');
      const sc = $('mc-st-scope');
      const tStart = tl.tViewStart_s;
      const tEnd = tl.tViewEnd_s;
      const startTime = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - startTime) / 1100);
        V.drawOscilloscope(sc, tl, {
          network: ex.circuitConfig.network,
          cursorT_s: tStart + p * (tEnd - tStart),
          revealUpToCursor: p < 1,
          showTauMarkers: true,
          showEndpoints: true,
          pins: p >= 0.98 ? pins : [],
          height: 310
        });
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    $('btn-mc-toggle-sol').addEventListener('click', (e) => {
      const isOpen = $('mc-st-solbox').classList.toggle('open');
      e.target.textContent = isOpen ? '📘 הסתר פתרון מלא' : '📘 הצג פתרון מלא שלב-אחר-שלב';
    });

    $('btn-mc-open-lab').addEventListener('click', () => openTimelineInLab(ex.circuitConfig, pins));
  }

  function switchWorkshopSub(subId) {
    if (!['curated', 'mcdril', 'random', 'custom'].includes(subId)) return;
    state.workshopSub = subId;
    document.querySelectorAll('#workshop-subtabs .seg-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.sub === subId);
    });
    ['curated', 'mcdril', 'random', 'custom'].forEach((s) => {
      $('sub-' + s).style.display = s === subId ? 'block' : 'none';
    });
    redrawWorkshopCanvases();
  }

  function initWorkshop() {
    document.querySelectorAll('#workshop-subtabs .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchWorkshopSub(btn.dataset.sub));
    });

    document.querySelectorAll('#mc-drill-mode .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.mcDrill.mode = btn.dataset.mcmode;
        document.querySelectorAll('#mc-drill-mode .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
        $('mc-stages-net-wrap').style.display = state.mcDrill.mode === 'stages' ? 'flex' : 'none';
        renderMcDrill(true);
      });
    });

    $('mc-stages-net').addEventListener('change', () => {
      state.mcDrill.net = $('mc-stages-net').value;
      renderMcDrill(true);
    });

    $('btn-next-mc').addEventListener('click', () => renderMcDrill(true));

    document.querySelectorAll('#ex-filter-pills .chapter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.exFilter = btn.dataset.filter;
        document.querySelectorAll('#ex-filter-pills .chapter-pill').forEach((b) => b.classList.toggle('active', b === btn));
        renderCuratedExercises();
      });
    });

    $('btn-gen-random').addEventListener('click', renderRandomExercise);

    $('cust-wave').addEventListener('change', () => {
      const isPulse = $('cust-wave').value === 'pulse';
      $('cust-vafter-wrap').style.display = isPulse ? 'flex' : 'none';
      $('cust-t2-wrap').style.display = isPulse ? 'flex' : 'none';
    });

    $('cust-qtype').addEventListener('change', () => {
      const isV = $('cust-qtype').value === 'v_at_t';
      $('cust-qparam-lbl').innerHTML = isV
        ? `<span>הזמן המבוקש (${T('ms')})</span>`
        : `<span>מתח המטרה המבוקש (${T('V')})</span>`;
      $('cust-qparam').value = isV ? '4' : '2';
    });

    $('btn-cust-verify').addEventListener('click', runCustomValidator);

    renderUnitSidebar();
    renderCuratedExercises();
    renderMcDrill(true);
    renderRandomExercise();
    runCustomValidator();
  }

  function redrawWorkshopCanvases() {
    if (state.activeTab !== 'workshop') return;
    if (state.workshopSub === 'curated') {
      document.querySelectorAll('#curated-ex-list .exercise-card').forEach((c) => c._drawMinis && c._drawMinis());
    } else if (state.workshopSub === 'mcdril') {
      const host = $('mc-drill-host');
      if (host && host._drawDrillCanvases) host._drawDrillCanvases();
    } else if (state.workshopSub === 'random') {
      document.querySelectorAll('#random-ex-container .exercise-card').forEach((c) => c._drawMinis && c._drawMinis());
    } else if (state.workshopSub === 'custom') {
      runCustomValidator();
    }
  }

  function redrawVisibleCanvases() {
    redrawIntroCanvases();
    renderLabFrame();
    redrawWorkshopCanvases();
  }

  function initHome() {
    document.querySelectorAll('.home-card[data-launch-tab]').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.home-chip')) return;
        switchMainTab(card.dataset.launchTab);
      });
      card.addEventListener('keydown', (e) => {
        if (e.target.closest('.home-chip')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchMainTab(card.dataset.launchTab);
        }
      });
    });

    document.querySelectorAll('[data-home-intro]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchIntroChapter(btn.dataset.homeIntro);
        switchMainTab('intro');
      });
    });

    document.querySelectorAll('[data-home-lab]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.dataset.homeLab;
        if (mode === 'lp-pulse') {
          loadConfigIntoLab({
            network: 'LP', r1Val: 10, r1Unit: 'kΩ', cVal: 0.1, cUnit: 'µF',
            preset: 'pulse', sig: { vBase: 0, vPulse: 10, vAfter: 0, t1: 1, t2: 3 }
          });
        } else if (mode === 'hp-pulse') {
          loadConfigIntoLab({
            network: 'HP', r1Val: 10, r1Unit: 'kΩ', cVal: 0.1, cUnit: 'µF',
            preset: 'pulse', sig: { vBase: 0, vPulse: 10, vAfter: 0, t1: 1, t2: 3 }
          });
        } else {
          loadConfigIntoLab({ network: 'LP', preset: 'complex' });
        }
        switchMainTab('lab');
      });
    });

    document.querySelectorAll('[data-home-workshop]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchWorkshopSub(btn.dataset.homeWorkshop);
        switchMainTab('workshop');
      });
    });
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', () => {
    initHeaderAndDrawer();
    initIntro();
    initLab();
    initWorkshop();
    initHome();
    window.addEventListener('resize', () => redrawVisibleCanvases());
    requestAnimationFrame(tickAnimation);
  });
})(window);
