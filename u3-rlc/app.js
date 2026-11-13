/* ==========================================================================
   app.js — Interactive UI Controller for Unit U3 AC RL, RC & RLC Simulation
   Connects Home Launchpad, 4-Station Intro Journey, Live Lab & Exercise Workshop
   ========================================================================== */
(function () {
  'use strict';

  const E = window.ACEngine;
  const V = window.ACVisuals;
  const C = window.ACContent;
  const L = E.L;
  const T = E.T;

  const STORAGE_KEY = 'u3_ac_solved_exercises_v1';

  const STATE = {
    activeTab: 'home',
    introChapter: 'ch1',
    visitedChapters: new Set(['ch1']),
    introSineCase: 'case_eq_sqrt2',
    introMeterTarget: 'UR',
    introRlcMode: 'inductive',
    introResFreq: 503,
    introResChartMode: 'reactance_cross',
    labCfg: {
      topology: 'RLC',
      switchClosed: false,
      inputMode: 'components',
      sourceMode: 'Ueff',
      sourceVal: 10,
      freqMode: 'f',
      f_Hz: 503.2921,
      omega: 2 * Math.PI * 503.2921,
      R_ohm: 50,
      L_H: 0.1,
      C_F: 1e-6,
      XL_ohm: 100,
      XC_ohm: 40
    },
    phasorMode: 'both',
    labVoltmeterTarget: 'ALL',
    labFreqChartMode: 'reactance_cross',
    workshopSub: 'curated',
    curatedFilter: 'all',
    solvedIds: loadSolvedSet(),
    activeMcDrill: null,
    mcScore: { right: 0, total: 0, streak: 0 },
    currentRandomEx: null
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...STATE.solvedIds]));
    } catch (_) {}
    const total = C.EXERCISES.length;
    const n = STATE.solvedIds.size;
    const badge1 = document.getElementById('workshop-progress-badge');
    const badge2 = document.getElementById('home-solved-badge');
    if (badge1) badge1.textContent = `פתרת ${n} מתוך ${total} תרגילים`;
    if (badge2) badge2.textContent = `פתרת ${n}/${total}`;
  }

  /* ========================================================================
     1. Navigation, Theme & Formula Drawer
     ======================================================================== */
  function switchMainTab(tabId) {
    STATE.activeTab = tabId;
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(sec => {
      sec.classList.toggle('active', sec.id === `tab-${tabId}`);
    });

    // Re-measure canvases once the panel becomes display: block
    requestAnimationFrame(redrawVisibleCanvases);
    setTimeout(redrawVisibleCanvases, 45);
  }

  function redrawVisibleCanvases() {
    if (STATE.activeTab === 'intro') {
      renderIntroChapterVisuals(STATE.introChapter);
    } else if (STATE.activeTab === 'lab') {
      renderLabVisuals();
    } else if (STATE.activeTab === 'workshop') {
      document.querySelectorAll('.ex-sim-box.open canvas').forEach(cv => {
        if (cv._drawFn) cv._drawFn();
      });
      if (STATE.workshopSub === 'custom') {
        renderCustomVerifier(false);
      }
    }
  }

  function initHeaderAndDrawer() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchMainTab(btn.dataset.tab));
    });
    const brand = document.getElementById('brand-home-trigger');
    if (brand) {
      brand.addEventListener('click', () => switchMainTab('home'));
      brand.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchMainTab('home');
        }
      });
    }

    // Theme toggle
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        themeBtn.textContent = next === 'dark' ? '☀️ מצב כיתה' : '🌙 מצב מעבדה כהה';
        redrawVisibleCanvases();
      });
    }

    if (window.location.pathname.includes('/u3-rlc')) {
      const hubLink = document.createElement('a');
      hubLink.href = '../';
      hubLink.className = 'btn';
      hubLink.style.textDecoration = 'none';
      hubLink.textContent = '📚 כל היחידות';
      const actions = document.querySelector('.header-actions');
      if (actions) actions.insertBefore(hubLink, actions.firstChild);
    }

    // Formula drawer
    const openBtn = document.getElementById('btn-open-formulas');
    const closeBtn = document.getElementById('btn-close-formulas');
    const backdrop = document.getElementById('drawer-backdrop');
    const drawer = document.getElementById('formula-drawer');
    const toggleDrawer = (open) => {
      drawer.classList.toggle('open', open);
      backdrop.classList.toggle('open', open);
    };
    if (openBtn) openBtn.addEventListener('click', () => toggleDrawer(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleDrawer(false));
    if (backdrop) backdrop.addEventListener('click', () => toggleDrawer(false));

    renderFormulaDrawerContent();
    initAuxCalculators();
  }

  function renderFormulaDrawerContent() {
    const host = document.getElementById('formula-tables-host');
    if (!host) return;
    host.innerHTML = C.FORMULA_SECTIONS.map(sec => `
      <div class="card" style="margin-bottom:0.85rem;">
        <h3 style="margin:0 0 0.55rem 0; font-size:0.96rem;">${sec.title}</h3>
        <table class="formula-table">
          <thead><tr><th>נושא</th><th>נוסחה</th><th>הערה לבגרות</th></tr></thead>
          <tbody>
            ${sec.rows.map(r => `
              <tr>
                <td>${r.desc}</td>
                <td class="math-cell">${E.escapeHtml(r.formula)}</td>
                <td style="font-size:0.84rem; color:var(--muted);">${r.note}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');
  }

  function initAuxCalculators() {
    const updateReactCalc = () => {
      const f = E.toHertz(document.getElementById('aux-f').value, document.getElementById('aux-fu').value);
      const l = E.toHenrys(document.getElementById('aux-l').value, document.getElementById('aux-lu').value);
      const c = E.toFarads(document.getElementById('aux-c').value, document.getElementById('aux-cu').value);
      const w = 2 * Math.PI * f;
      const xl = w * l;
      const xc = c > 0 && w > 0 ? 1 / (w * c) : 0;
      const f0 = l > 0 && c > 0 ? 1 / (2 * Math.PI * Math.sqrt(l * c)) : 0;
      document.getElementById('aux-react-res').textContent =
        `XL = ${E.fmtImpedance(xl)}  |  XC = ${E.fmtImpedance(xc)}\nf₀ = ${E.fmtFreq(f0)}`;
    };
    ['aux-f', 'aux-fu', 'aux-l', 'aux-lu', 'aux-c', 'aux-cu'].forEach(id => {
      document.getElementById(id).addEventListener('input', updateReactCalc);
    });
    updateReactCalc();

    const updateZCalc = () => {
      const r = E.toOhms(document.getElementById('aux-r').value, document.getElementById('aux-ru').value);
      const xl = Number(document.getElementById('aux-xl').value) || 0;
      const xc = Number(document.getElementById('aux-xc').value) || 0;
      const x = xl - xc;
      const z = Math.hypot(r, x);
      const phi = (Math.atan2(x, Math.max(r, 1e-6)) * 180) / Math.PI;
      document.getElementById('aux-z-res').textContent =
        `X = ${E.fmtNum(x, 2)} Ω  |  Z = ${E.fmtImpedance(z)}\nφ = ${E.fmtDeg(phi)}`;
    };
    ['aux-r', 'aux-ru', 'aux-xl', 'aux-xc'].forEach(id => {
      document.getElementById(id).addEventListener('input', updateZCalc);
    });
    updateZCalc();

    const updateSineCalc = () => {
      const val = Number(document.getElementById('aux-u').value) || 0;
      const mode = document.getElementById('aux-umode').value;
      const ueff = E.sourceToUeff(val, mode);
      const umax = ueff * Math.SQRT2;
      const upp = 2 * umax;
      document.getElementById('aux-sine-res').textContent =
        `Ueff = ${E.fmtNum(ueff, 2)} V  |  Um = ${E.fmtNum(umax, 2)} V\nUp-p = ${E.fmtNum(upp, 2)} V`;
    };
    ['aux-u', 'aux-umode'].forEach(id => {
      document.getElementById(id).addEventListener('input', updateSineCalc);
    });
    updateSineCalc();
  }

  /* ========================================================================
     2. Home Launchpad
     ======================================================================== */
  function initHomeTab() {
    document.querySelectorAll('.home-card[data-launch-tab]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.home-chip')) return;
        switchMainTab(card.dataset.launchTab);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchMainTab(card.dataset.launchTab);
        }
      });
    });

    document.querySelectorAll('[data-home-intro]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchMainTab('intro');
        selectIntroChapter(btn.dataset.homeIntro);
      });
    });

    document.querySelectorAll('[data-home-lab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadPresetIntoLab(btn.dataset.homeLab);
        switchMainTab('lab');
      });
    });

    document.querySelectorAll('[data-home-workshop]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchMainTab('workshop');
        switchWorkshopSub(btn.dataset.homeWorkshop);
      });
    });
  }

  /* ========================================================================
     3. Tab 1: 4-Station Sequential Intro Pipeline
     ======================================================================== */
  function selectIntroChapter(chId) {
    STATE.introChapter = chId;
    STATE.visitedChapters.add(chId);

    document.querySelectorAll('.intro-chapter').forEach(el => {
      el.style.display = el.id === `intro-${chId}` ? 'block' : 'none';
    });

    const order = ['ch1', 'ch2', 'ch3', 'ch4'];
    const curIdx = order.indexOf(chId);

    order.forEach((cid, idx) => {
      const card = document.querySelector(`.journey-step-card[data-chapter="${cid}"]`);
      const st = document.querySelector(`[data-status-for="${cid}"]`);
      const isCur = cid === chId;
      const isVis = STATE.visitedChapters.has(cid);
      if (card) {
        card.classList.toggle('active', isCur);
        card.classList.toggle('visited', isVis);
      }
      if (st) {
        st.textContent = isCur ? '● בצפייה כעת' : (isVis ? '✓ עברת על נושא זה' : '○ ממתין למעבר');
      }
      const arrow = document.querySelector(`[data-arrow-after="${cid}"]`);
      if (arrow) {
        arrow.classList.toggle('done', isVis && idx < curIdx);
      }
      const seg = document.querySelectorAll('#intro-journey-segs .j-seg')[idx];
      if (seg) {
        seg.classList.toggle('active', isCur);
        seg.classList.toggle('done', isVis && !isCur);
      }
    });

    const cnt = STATE.visitedChapters.size;
    const countBadge = document.getElementById('intro-journey-count');
    const homeIntroBadge = document.getElementById('home-intro-badge');
    if (countBadge) countBadge.textContent = `עברת על ${cnt} מתוך 4 נושאים`;
    if (homeIntroBadge) homeIntroBadge.textContent = cnt === 4 ? 'הושלם 4/4 ✓' : `התקדמות: ${cnt}/4 תחנות`;

    const reasonMap = {
      ch1: 'תחנה 1 מסבירה מופע של רכיב בודד. המשך לתחנה 2 כדי לראות איך משלבים R עם L או C בטור.',
      ch2: 'תחנה 2 מלמדת RL ו-RC בנפרד. המשך לתחנה 3 כדי לראות מה קורה כשמחברים גם L וגם C יחד.',
      ch3: 'תחנה 3 מציגה את הקיזוז בין UL ל-UC. המשך לתחנה 4 כדי לחקור את תדר התהודה f₀ ו-6 מלכודות הבגרות.',
      ch4: 'השלמת את כל 4 התחנות! עכשיו עברו למעבדת החקר או לסדנת התרגול כדי לבחון את הידע.'
    };
    document.getElementById('intro-flow-badge').textContent = `תחנה ${curIdx + 1} מתוך 4`;
    document.getElementById('intro-next-reason').textContent = reasonMap[chId] || '';
    document.getElementById('intro-prev-step').disabled = curIdx === 0;
    document.getElementById('intro-next-step').disabled = curIdx === 3;

    requestAnimationFrame(() => renderIntroChapterVisuals(chId));
    setTimeout(() => renderIntroChapterVisuals(chId), 40);
  }

  const INTRO_METER_CFG = {
    topology: 'RLC',
    inputMode: 'reactances',
    sourceMode: 'Ueff',
    sourceVal: 25,
    f_Hz: 1000,
    R_ohm: 150,
    XL_ohm: 240,
    XC_ohm: 40
  };

  function renderIntroChapterVisuals(chId) {
    if (chId === 'ch1') {
      const sc = C.SINE_DECODER_CASES[STATE.introSineCase] || C.SINE_DECODER_CASES.case_eq_sqrt2;
      document.getElementById('intro-sine-anatomy').innerHTML = `
        <div class="module-head" style="margin-bottom:0.45rem;">
          <h3 style="margin:0; font-size:0.98rem;">${sc.title}</h3>
          <span class="badge badge-accent">${sc.badge}</span>
        </div>
        <div class="eq-anatomy" dir="ltr">${sc.expressionHtml}</div>
        <p style="margin:0 0 0.6rem 0; font-size:0.9rem; line-height:1.58;">${sc.descHtml}</p>
        <div class="kvl-quick-metrics" style="margin-bottom:0.55rem;">
          <div class="metric-tile"><span class="m-lbl">מתח אפקטיבי לחישוב (Ueff)</span><span class="m-val" dir="ltr">${E.escapeHtml(sc.ueffResult)}</span></div>
          <div class="metric-tile"><span class="m-lbl">חילוץ תדר (f / ω)</span><span class="m-val" dir="ltr">${E.escapeHtml(sc.freqResult)}</span></div>
        </div>
        <div class="math-block" dir="ltr">${E.escapeHtml(sc.ruleLine)}</div>
      `;

      const meterSol = E.solveACCircuit(INTRO_METER_CFG);
      V.drawACSchematic(document.getElementById('intro-meter-canvas'), meterSol, {
        voltmeterTarget: STATE.introMeterTarget
      });
      const mr = E.getMeterReadout(meterSol, STATE.introMeterTarget);
      document.getElementById('intro-meter-metrics').innerHTML = `
        <div class="metric-tile"><span class="m-lbl">מד-זרם בטור (A)</span><span class="m-val" dir="ltr">${E.fmtCurrent(meterSol.Ieff)}</span></div>
        <div class="metric-tile"><span class="m-lbl">${E.escapeHtml(mr.voltmeterLabel)}</span><span class="m-val" dir="ltr">${E.escapeHtml(mr.voltmeterValStr)}</span></div>
      `;
      document.getElementById('intro-meter-explain').innerHTML = mr.explainHtml;
      document.getElementById('intro-meter-math').textContent = `${mr.ammeterStr}  |  ${mr.voltmeterValStr}  ⇒  ${mr.ratioFormulaStr}`;
    } else if (chId === 'ch2') {
      const rlSol = E.solveACCircuit({ topology: 'RL', inputMode: 'reactances', Ueff: 50, f_Hz: 500, R_ohm: 60, XL_ohm: 80, XC_ohm: 0 });
      const rcSol = E.solveACCircuit({ topology: 'RC', inputMode: 'reactances', Ueff: 17, f_Hz: 4000, R_ohm: 80, XL_ohm: 0, XC_ohm: 150 });
      V.drawPhasorAndTriangle(document.getElementById('intro-rl-canvas'), rlSol, 'both');
      V.drawPhasorAndTriangle(document.getElementById('intro-rc-canvas'), rcSol, 'both');
    } else if (chId === 'ch3') {
      const m = C.INTRO_RLC_MODES[STATE.introRlcMode];
      const sol = E.solveACCircuit(m.cfg);
      V.drawPhasorAndTriangle(document.getElementById('intro-rlc-phasor-canvas'), sol, 'both');
      document.getElementById('intro-rlc-title').innerHTML = m.title;
      document.getElementById('intro-rlc-desc').innerHTML = m.desc;
      document.getElementById('intro-rlc-bars').innerHTML = buildEqualScaleVectorBarsHtml(sol);
    } else if (chId === 'ch4') {
      const sol = E.solveACCircuit({
        topology: 'RLC',
        inputMode: 'components',
        Ueff: 10,
        f_Hz: STATE.introResFreq,
        R_ohm: 50,
        L_H: 0.1,
        C_F: 1e-6
      });
      const sweep = E.sampleFrequencySweep(sol, 160);
      V.drawPhasorAndTriangle(document.getElementById('intro-res-phasor-canvas'), sol, 'phasors');
      V.drawFrequencyResponse(document.getElementById('intro-res-canvas'), sol, sweep, {
        chartMode: STATE.introResChartMode
      });
      document.getElementById('intro-res-f-lbl').textContent = `f = ${E.fmtNum(STATE.introResFreq, 1)} Hz`;
      document.getElementById('intro-res-stats').innerHTML = `
        <div class="stat-chip"><div class="stat-lbl">תדר תהודה f₀</div><div class="stat-val">${E.fmtFreq(sol.f0_Hz)}</div></div>
        <div class="stat-chip"><div class="stat-lbl">היגב XL / XC</div><div class="stat-val">${E.fmtNum(sol.XL_ohm, 1)} / ${E.fmtNum(sol.XC_ohm, 1)} Ω</div></div>
        <div class="stat-chip"><div class="stat-lbl">עכבה Z</div><div class="stat-val">${E.fmtImpedance(sol.Z_ohm)}</div></div>
        <div class="stat-chip"><div class="stat-lbl">זרם המעגל I</div><div class="stat-val">${E.fmtCurrent(sol.Ieff)}</div></div>
        <div class="stat-chip"><div class="stat-lbl">מתח על הסליל UL</div><div class="stat-val" style="color:var(--ul-color);">${E.fmtVoltage(sol.UL)}</div></div>
        <div class="stat-chip"><div class="stat-lbl">מתח על הקבל UC</div><div class="stat-val" style="color:var(--uc-color);">${E.fmtVoltage(sol.UC)}</div></div>
      `;
      const resDer = E.buildResonanceEqualityDerivation(sol);
      if (resDer) {
        document.getElementById('intro-res-derivation-box').innerHTML = `
          <div class="module-head" style="margin-bottom:0.45rem;">
            <h3 style="margin:0; font-size:0.96rem;">📐 גזירת תדר התהודה ${L('f₀')} משוויון ההיגבים (${L('XL = XC')})</h3>
            <span class="badge ${resDer.isNearRes ? 'badge-resonant' : 'badge-accent'}">${resDer.isNearRes ? 'בתהודה כעת: XL = XC!' : `f₀ = ${resDer.f0Str}`}</span>
          </div>
          <p style="margin:0 0 0.45rem 0; font-size:0.85rem; color:var(--muted);">${resDer.leadExplainHtml}</p>
          <div class="math-block" dir="ltr">${E.escapeHtml(resDer.stepsLines)}</div>
          <p style="margin:0.55rem 0 0 0; font-size:0.86rem; line-height:1.55;">${resDer.reverseTipHtml}</p>
        `;
      }
    }
  }

  function buildEqualScaleVectorBarsHtml(sol) {
    const maxV = Math.max(sol.Ueff, sol.UR, sol.UL, sol.UC, sol.absUX, 1e-6);
    const pct = (v) => `${Math.max(0, Math.min(100, (v / maxV) * 100)).toFixed(2)}%`;
    const rows = [
      { lbl: 'U (מקור)', val: sol.Ueff, cls: 'fill-u' },
      { lbl: 'UR (נגד)', val: sol.UR, cls: 'fill-ur' }
    ];
    if (sol.topology === 'RL' || sol.topology === 'RLC') {
      rows.push({ lbl: 'UL (משרן)', val: sol.UL, cls: 'fill-ul' });
    }
    if (sol.topology === 'RC' || sol.topology === 'RLC' || sol.topology === 'RC_SWITCH') {
      rows.push({ lbl: 'UC (קבל)', val: sol.UC, cls: 'fill-uc' });
    }
    if (sol.topology === 'RLC') {
      rows.push({ lbl: '|UL−UC|', val: sol.absUX, cls: 'fill-ux' });
    }
    return rows.map(r => `
      <div class="vec-row">
        <span class="vec-lbl">${E.escapeHtml(r.lbl)}</span>
        <div class="vec-track"><div class="vec-fill ${r.cls}" style="width:${pct(r.val)};"></div></div>
        <span class="vec-val">${E.fmtNum(r.val, 2)} V</span>
      </div>
    `).join('');
  }

  function initIntroTab() {
    document.querySelectorAll('#intro-chapter-nav .journey-step-card').forEach(btn => {
      btn.addEventListener('click', () => selectIntroChapter(btn.dataset.chapter));
    });

    document.querySelectorAll('#intro-sine-case-btns .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#intro-sine-case-btns .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.introSineCase = btn.dataset.sinecase;
        renderIntroChapterVisuals('ch1');
      });
    });

    document.querySelectorAll('#intro-meter-target-btns .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#intro-meter-target-btns .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.introMeterTarget = btn.dataset.mtarget;
        renderIntroChapterVisuals('ch1');
      });
    });

    document.getElementById('btn-comp-to-lab').addEventListener('click', () => {
      loadCustomConfigIntoLab(INTRO_METER_CFG);
      switchMainTab('lab');
    });

    document.querySelectorAll('[data-launch-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        loadPresetIntoLab(btn.dataset.launchPreset);
        switchMainTab('lab');
      });
    });

    document.querySelectorAll('#intro-rlc-mode-btns .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#intro-rlc-mode-btns .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.introRlcMode = btn.dataset.rlcmode;
        renderIntroChapterVisuals('ch3');
      });
    });

    document.getElementById('btn-rlc-to-lab').addEventListener('click', () => {
      const cfg = C.INTRO_RLC_MODES[STATE.introRlcMode].cfg;
      loadCustomConfigIntoLab({ ...cfg, sourceMode: 'Ueff', sourceVal: cfg.Ueff });
      switchMainTab('lab');
    });

    const resSlider = document.getElementById('intro-res-slider');
    resSlider.addEventListener('input', () => {
      STATE.introResFreq = Number(resSlider.value);
      renderIntroChapterVisuals('ch4');
    });
    document.querySelectorAll('#intro-ch4 [data-intro-f]').forEach(btn => {
      btn.addEventListener('click', () => {
        STATE.introResFreq = Number(btn.dataset.introF);
        resSlider.value = STATE.introResFreq;
        renderIntroChapterVisuals('ch4');
      });
    });
    document.getElementById('btn-intro-snap-f0').addEventListener('click', () => {
      STATE.introResFreq = 503.29;
      resSlider.value = 503;
      renderIntroChapterVisuals('ch4');
    });
    document.querySelectorAll('#intro-res-chart-mode .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#intro-res-chart-mode .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.introResChartMode = btn.dataset.rcmode;
        renderIntroChapterVisuals('ch4');
      });
    });
    document.getElementById('btn-res-to-lab').addEventListener('click', () => {
      loadCustomConfigIntoLab({
        topology: 'RLC',
        inputMode: 'components',
        sourceMode: 'Ueff',
        sourceVal: 10,
        freqMode: 'f',
        f_Hz: STATE.introResFreq,
        R_ohm: 50,
        L_H: 0.1,
        C_F: 1e-6
      });
      switchMainTab('lab');
    });

    // Clickable frequency chart inside Station 4
    const introResCanvas = document.getElementById('intro-res-canvas');
    introResCanvas.addEventListener('click', (e) => {
      const g = introResCanvas._freqPlotGeom;
      if (!g) return;
      const rect = introResCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const frac = Math.max(0, Math.min(1, (x - g.padL) / g.plotW));
      const newF = g.fMin + frac * (g.fMax - g.fMin);
      STATE.introResFreq = Math.max(100, Math.min(1200, Math.round(newF)));
      resSlider.value = STATE.introResFreq;
      renderIntroChapterVisuals('ch4');
    });

    // Populate 6 steps & 6 pitfalls in Station 4
    const bagrutSteps = [
      { n: 1, title: 'קריאת מתח ותדר', desc: `אם ניתן ${L('u(t) = Um·sin(ω·t)')}, מחלקים ${L('Um / √2')} למציאת ${L('Ueff')} ומחלצים ${L('ω = 2πf')}.` },
      { n: 2, title: 'המרת יחידות ליסוד', desc: `ממירים תמיד ל-${L('Ω, Hz, H, F')}: ${L('mH → ×10⁻³')}, ${L('µF → ×10⁻⁶')}, ${L('kHz → ×10³')}.` },
      { n: 3, title: 'חישוב היגבים XL, XC', desc: `${L('XL = 2πfL = ωL')} (משרן) ו-${L('XC = 1/(2πfC)')} (קבל — לא לשכוח ${L('1')} במונה!).` },
      { n: 4, title: 'היגב שקול ועכבה Z', desc: `${L('X = XL − XC')} ולאחר מכן פיתגורס ${L('Z = √(R² + X²)')} (לעולם לא סכום פשוט!).` },
      { n: 5, title: 'זרם, מתחים ובדיקה', desc: `${L('I = U / Z')}, ${L('UR = I·R')}, ${L('UL = I·XL')}, ${L('UC = I·XC')}. ודאו: ${L('√(UR² + (UL−UC)²) = U')}.` },
      { n: 6, title: 'מופע φ ותהודה f₀', desc: `${L('φ = tan⁻¹(X/R)')} עם סימן (חיובי ב-RL, שלילי ב-RC). בתהודה: ${L('XL=XC')} ו-${L('Z=R')}.` }
    ];
    document.getElementById('intro-steps-host').innerHTML = bagrutSteps.map(s => `
      <div class="roadmap-step">
        <div style="font-weight:800; margin-bottom:0.3rem;"><span class="roadmap-num">${s.n}</span>${s.title}</div>
        <div style="font-size:0.86rem; color:var(--muted);">${s.desc}</div>
      </div>
    `).join('');

    document.getElementById('intro-pitfalls-host').innerHTML = C.PITFALLS.map(pf => `
      <div class="pitfall-card">
        <h4>⚠️ ${pf.title}</h4>
        <div class="math-block" dir="ltr" style="font-size:0.8rem; margin-bottom:0.45rem;">❌ ${E.escapeHtml(pf.bad)}\n✓  ${E.escapeHtml(pf.good)}</div>
        <div style="font-size:0.85rem; color:var(--muted);">${pf.why}</div>
      </div>
    `).join('');

    // Footer buttons
    document.getElementById('intro-prev-step').addEventListener('click', () => {
      const order = ['ch1', 'ch2', 'ch3', 'ch4'];
      const idx = order.indexOf(STATE.introChapter);
      if (idx > 0) selectIntroChapter(order[idx - 1]);
    });
    document.getElementById('intro-next-step').addEventListener('click', () => {
      const order = ['ch1', 'ch2', 'ch3', 'ch4'];
      const idx = order.indexOf(STATE.introChapter);
      if (idx < 3) selectIntroChapter(order[idx + 1]);
    });
    document.getElementById('intro-go-lab').addEventListener('click', () => switchMainTab('lab'));
    document.getElementById('intro-go-workshop').addEventListener('click', () => switchMainTab('workshop'));

    selectIntroChapter('ch1');
  }

  /* ========================================================================
     4. Tab 2: Live Interactive AC Lab
     ======================================================================== */
  function loadPresetIntoLab(presetId) {
    const p = C.LAB_PRESETS.find(x => x.id === presetId);
    if (p) loadCustomConfigIntoLab(p.cfg);
  }

  function loadCustomConfigIntoLab(cfg) {
    STATE.labCfg = {
      topology: cfg.topology || 'RLC',
      switchClosed: Boolean(cfg.switchClosed),
      inputMode: cfg.inputMode || 'components',
      sourceMode: cfg.sourceMode || 'Ueff',
      sourceVal: cfg.sourceVal !== undefined ? cfg.sourceVal : (cfg.Ueff || 10),
      freqMode: cfg.freqMode || 'f',
      f_Hz: cfg.f_Hz || (cfg.omega ? cfg.omega / (2 * Math.PI) : 1000),
      omega: cfg.omega || (2 * Math.PI * (cfg.f_Hz || 1000)),
      R_ohm: cfg.R_ohm || 50,
      L_H: cfg.L_H !== undefined ? cfg.L_H : 0.1,
      C_F: cfg.C_F !== undefined ? cfg.C_F : 1e-6,
      XL_ohm: cfg.XL_ohm !== undefined ? cfg.XL_ohm : 100,
      XC_ohm: cfg.XC_ohm !== undefined ? cfg.XC_ohm : 40
    };
    // Back-compute L/C if loaded from reactance-only config
    const sol = E.solveACCircuit(STATE.labCfg);
    if (STATE.labCfg.inputMode === 'reactances') {
      STATE.labCfg.L_H = sol.L_H > 0 ? sol.L_H : 0.02;
      STATE.labCfg.C_F = sol.C_F > 0 ? sol.C_F : 2e-6;
    }
    syncLabControlsFromState();
    renderLabVisuals();
  }

  function syncLabControlsFromState() {
    const c = STATE.labCfg;
    document.querySelectorAll('#lab-topo-btns .topo-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.topo === c.topology);
    });
    const swRow = document.getElementById('lab-switch-row');
    swRow.style.display = c.topology === 'RC_SWITCH' ? 'block' : 'none';
    const swCheck = document.getElementById('lab-switch-closed');
    swCheck.checked = Boolean(c.switchClosed);
    document.getElementById('lab-switch-state-lbl').textContent = c.switchClosed ? 'סגור (קבל מקוצר!)' : 'פתוח (קבל פעיל)';

    document.querySelectorAll('#lab-input-mode .seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.imode === c.inputMode);
    });
    const isComp = c.inputMode === 'components';
    document.getElementById('lab-comp-inputs').style.display = isComp ? 'block' : 'none';
    document.getElementById('lab-react-inputs').style.display = isComp ? 'none' : 'block';

    const showL = c.topology === 'RL' || c.topology === 'RLC';
    const showC = c.topology === 'RC' || c.topology === 'RLC' || c.topology === 'RC_SWITCH';
    document.getElementById('lab-l-row').style.display = showL ? 'flex' : 'none';
    document.getElementById('lab-xl-row').style.display = showL ? 'flex' : 'none';
    document.getElementById('lab-c-row').style.display = showC ? 'flex' : 'none';
    document.getElementById('lab-xc-row').style.display = showC ? 'flex' : 'none';

    document.getElementById('lab-src-val').value = E.fmtNum(c.sourceVal, 2);
    document.getElementById('lab-src-mode').value = c.sourceMode;

    document.querySelectorAll('#lab-freq-mode .seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.fmode === c.freqMode);
    });
    const fUnitSel = document.getElementById('lab-freq-unit');
    if (c.freqMode === 'omega') {
      fUnitSel.style.display = 'none';
      const wVal = Number(c.omega) || 2 * Math.PI * c.f_Hz;
      document.getElementById('lab-freq-val').value = E.fmtNum(wVal, 1);
      const sl = document.getElementById('lab-freq-slider');
      sl.min = Math.max(10, Math.round(wVal * 0.15));
      sl.max = Math.max(500, Math.round(wVal * 2.5));
      sl.value = Math.round(wVal);
    } else {
      fUnitSel.style.display = 'block';
      if (c.f_Hz >= 1000) {
        fUnitSel.value = 'kHz';
        document.getElementById('lab-freq-val').value = E.fmtNum(c.f_Hz / 1000, 3);
      } else {
        fUnitSel.value = 'Hz';
        document.getElementById('lab-freq-val').value = E.fmtNum(c.f_Hz, 2);
      }
      const sl = document.getElementById('lab-freq-slider');
      const fCenter = (c.topology === 'RLC' && c.L_H > 0 && c.C_F > 0)
        ? 1 / (2 * Math.PI * Math.sqrt(c.L_H * c.C_F))
        : c.f_Hz;
      sl.min = Math.max(1, Math.round(Math.min(fCenter, c.f_Hz) * 0.15));
      sl.max = Math.max(100, Math.round(Math.max(fCenter * 2.4, c.f_Hz * 1.6)));
      sl.value = Math.round(c.f_Hz);
    }

    document.getElementById('btn-tune-f0').style.display = (c.topology === 'RLC' && c.L_H > 0 && c.C_F > 0) ? 'inline-flex' : 'none';

    // R, L, C inputs
    if (c.R_ohm >= 1000) {
      document.getElementById('lab-r-unit').value = 'kΩ';
      document.getElementById('lab-r-val').value = E.fmtNum(c.R_ohm / 1000, 2);
    } else {
      document.getElementById('lab-r-unit').value = 'Ω';
      document.getElementById('lab-r-val').value = E.fmtNum(c.R_ohm, 2);
    }
    const rSl = document.getElementById('lab-r-slider');
    rSl.max = Math.max(500, Math.round(c.R_ohm * 2));
    rSl.value = Math.min(Number(rSl.max), Math.round(c.R_ohm));

    if (c.L_H < 1e-3 && c.L_H > 0) {
      document.getElementById('lab-l-unit').value = 'µH';
      document.getElementById('lab-l-val').value = E.fmtNum(c.L_H * 1e6, 2);
    } else if (c.L_H >= 1) {
      document.getElementById('lab-l-unit').value = 'H';
      document.getElementById('lab-l-val').value = E.fmtNum(c.L_H, 3);
    } else {
      document.getElementById('lab-l-unit').value = 'mH';
      document.getElementById('lab-l-val').value = E.fmtNum(c.L_H * 1e3, 2);
    }

    if (c.C_F < 1e-6 && c.C_F > 0) {
      document.getElementById('lab-c-unit').value = 'nF';
      document.getElementById('lab-c-val').value = E.fmtNum(c.C_F * 1e9, 2);
    } else if (c.C_F >= 1e-3) {
      document.getElementById('lab-c-unit').value = 'mF';
      document.getElementById('lab-c-val').value = E.fmtNum(c.C_F * 1e3, 2);
    } else {
      document.getElementById('lab-c-unit').value = 'µF';
      document.getElementById('lab-c-val').value = E.fmtNum(c.C_F * 1e6, 2);
    }

    document.getElementById('lab-xl-val').value = E.fmtNum(c.XL_ohm, 2);
    document.getElementById('lab-xc-val').value = E.fmtNum(c.XC_ohm, 2);
  }

  function renderLabVisuals() {
    const sol = E.solveACCircuit(STATE.labCfg);
    const sweep = E.sampleFrequencySweep(sol, 170);

    // Character badge
    const cb = document.getElementById('lab-char-badge');
    cb.textContent = sol.characterHe;
    cb.className = 'badge ' + (
      sol.character === 'inductive' ? 'badge-inductive' :
      sol.character === 'capacitive' ? 'badge-capacitive' : 'badge-resonant'
    );

    // Live Source u(t) <-> Ueff decoder box
    const sineInfo = E.formatSineEquation(sol, STATE.labCfg.sourceMode, STATE.labCfg.sourceVal);
    document.getElementById('lab-source-decoder').innerHTML = `
      <div class="eq-line" dir="ltr">${E.escapeHtml(sineInfo.eqDisplay)}</div>
      <div style="color:var(--fg); margin-top:0.25rem;">${sineInfo.modeRuleHtml}</div>
    `;

    // KPI strip
    const kpis = [
      { lbl: 'מתח אפקטיבי U', val: E.fmtVoltage(sol.Ueff), clr: 'var(--u-color)' },
      { lbl: 'עכבה כוללת Z', val: E.fmtImpedance(sol.Z_ohm), clr: 'var(--z-color)' },
      { lbl: 'זרם המעגל I', val: E.fmtCurrent(sol.Ieff), clr: 'var(--ur-color)' },
      { lbl: 'היגב שקול X', val: `${E.fmtNum(sol.X_ohm, 2)} Ω`, clr: 'var(--muted)' },
      { lbl: 'זווית מופע φ', val: E.fmtDeg(sol.phi_deg), clr: sol.character === 'inductive' ? 'var(--ul-color)' : (sol.character === 'capacitive' ? 'var(--uc-color)' : 'var(--ur-color)') },
      sol.hasResonance
        ? { lbl: 'תדר תהודה f₀', val: E.fmtFreq(sol.f0_Hz), clr: 'var(--ur-color)' }
        : { lbl: 'זמן מחזור T', val: E.fmtTimeSec(sol.T_s), clr: 'var(--muted)' }
    ];
    document.getElementById('lab-kpi-strip').innerHTML = kpis.map(k => `
      <div class="stat-chip" style="border-top-color:${k.clr};">
        <div class="stat-lbl">${k.lbl}</div>
        <div class="stat-val" style="color:${k.clr};">${k.val}</div>
      </div>
    `).join('');

    // Phasor & Triangle (Centerpiece 1)
    V.drawPhasorAndTriangle(document.getElementById('lab-phasor-canvas'), sol, STATE.phasorMode);

    // Meter-Equipped Schematic (Centerpiece 2) & Voltmeter explanation
    const hasL = sol.topology === 'RL' || sol.topology === 'RLC';
    const hasC = sol.topology === 'RC' || sol.topology === 'RLC' || sol.topology === 'RC_SWITCH';
    document.querySelectorAll('#lab-voltmeter-btns .seg-btn').forEach(btn => {
      const vt = btn.dataset.vtarget;
      const hidden = (vt === 'UL' && !hasL) || (vt === 'UC' && !hasC);
      btn.style.display = hidden ? 'none' : '';
    });
    if ((STATE.labVoltmeterTarget === 'UL' && !hasL) || (STATE.labVoltmeterTarget === 'UC' && !hasC)) {
      STATE.labVoltmeterTarget = 'ALL';
      document.querySelectorAll('#lab-voltmeter-btns .seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.vtarget === 'ALL');
      });
    }

    V.drawACSchematic(document.getElementById('lab-schematic-canvas'), sol, {
      voltmeterTarget: STATE.labVoltmeterTarget
    });
    const mr = E.getMeterReadout(sol, STATE.labVoltmeterTarget);
    document.getElementById('lab-meter-explain').innerHTML = `
      <div>
        <strong>מד-זרם בטור (${L('A')}): <bdi dir="ltr">${E.escapeHtml(mr.ammeterStr)}</bdi></strong> &nbsp;|&nbsp;
        <strong>${E.escapeHtml(mr.voltmeterLabel)}: <span dir="ltr">${E.escapeHtml(mr.voltmeterValStr)}</span></strong> &nbsp;|&nbsp;
        <span dir="ltr" style="color:var(--accent); font-weight:700;">${E.escapeHtml(mr.ratioFormulaStr)}</span>
      </div>
      <div style="margin-top:0.28rem; color:var(--muted);">${mr.explainHtml}</div>
    `;

    // Vector balance bars
    document.getElementById('lab-vec-balance-rows').innerHTML = buildEqualScaleVectorBarsHtml(sol);
    document.getElementById('lab-vec-summary').textContent =
      `Vector Sum: √(UR² + (UL−UC)²) = √(${E.fmtNum(sol.UR, 2)}² + (${E.fmtNum(sol.UX, 2)})²) = ${E.fmtNum(sol.Ucheck, 2)} V\n` +
      `Scalar Sum: UR + UL + UC = ${E.fmtNum(sol.UR + sol.UL + sol.UC, 2)} V  ${Math.abs(sol.UR + sol.UL + sol.UC - sol.Ueff) > 0.1 ? '(≠ U!)' : ''}`;

    // Resonance & Frequency Response (Centerpiece 3)
    V.drawFrequencyResponse(document.getElementById('lab-freq-canvas'), sol, sweep, {
      chartMode: STATE.labFreqChartMode
    });

    const resDer = E.buildResonanceEqualityDerivation(sol);
    const resBox = document.getElementById('lab-res-equality-box');
    if (resDer) {
      resBox.innerHTML = `
        <div class="module-head" style="margin-bottom:0.4rem;">
          <strong>🎯 חישוב תדר תהודה ${L('f₀')} משוויון ההיגבים (${L('XL = XC')})</strong>
          <span class="badge ${resDer.isNearRes ? 'badge-resonant' : 'badge-accent'}">${resDer.isNearRes ? 'בתהודה כעת!' : `f₀ = ${resDer.f0Str}`}</span>
        </div>
        <p style="margin:0 0 0.4rem 0; font-size:0.85rem; color:var(--muted);">${resDer.leadExplainHtml}</p>
        <div class="math-block" dir="ltr" style="font-size:0.83rem;">${E.escapeHtml(resDer.stepsLines)}</div>
        <div style="margin-top:0.42rem; font-size:0.84rem; line-height:1.5;">${resDer.reverseTipHtml}</div>
      `;
    } else {
      resBox.innerHTML = `
        <strong>תהודה קיימת רק במעגל ${L('RLC')} טורי:</strong> במעגל הנוכחי (${sol.topology}) אין גם משרן וגם קבל שיקזזו זה את זה (${L('XL = XC')}). עברו למעגל ${L('RLC')} טורי כדי לחקור את חיתוך ${L('XL = XC')} ותדר התהודה ${L('f₀')}.
      `;
    }

    // Step-by-step derivation
    const steps = E.buildFullDerivation(sol);
    document.getElementById('lab-derivation-steps').innerHTML = steps.map(st => `
      <div class="step-card">
        <div class="step-card-head">
          <span>${st.titleHtml}</span>
          <span class="badge badge-accent">${st.badge}</span>
        </div>
        <p style="margin:0 0 0.45rem 0; font-size:0.86rem; color:var(--muted);">${st.explanationHtml}</p>
        <div class="math-block" dir="ltr">${E.escapeHtml(st.mathLines)}</div>
      </div>
    `).join('');
  }

  function initLabTab() {
    // Preset buttons
    const pch = document.getElementById('lab-preset-chips');
    pch.innerHTML = C.LAB_PRESETS.map(p => `<button type="button" class="chip-btn" data-preset="${p.id}">${p.label}</button>`).join('');
    pch.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => loadPresetIntoLab(btn.dataset.preset));
    });

    // Topology
    document.querySelectorAll('#lab-topo-btns .topo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        STATE.labCfg.topology = btn.dataset.topo;
        if (STATE.labCfg.topology !== 'RC_SWITCH') STATE.labCfg.switchClosed = false;
        syncLabControlsFromState();
        renderLabVisuals();
      });
    });

    // Switch S toggle
    document.getElementById('lab-switch-closed').addEventListener('change', (e) => {
      STATE.labCfg.switchClosed = e.target.checked;
      document.getElementById('lab-switch-state-lbl').textContent = e.target.checked ? 'סגור (קבל מקוצר!)' : 'פתוח (קבל פעיל)';
      renderLabVisuals();
    });

    // Input mode (components vs reactances)
    document.querySelectorAll('#lab-input-mode .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sol = E.solveACCircuit(STATE.labCfg);
        if (btn.dataset.imode === 'reactances') {
          STATE.labCfg.XL_ohm = sol.XL_ohm > 0 ? sol.XL_ohm : 80;
          STATE.labCfg.XC_ohm = sol.XC_unshorted > 0 ? sol.XC_unshorted : 40;
        } else {
          STATE.labCfg.L_H = sol.L_H > 0 ? sol.L_H : 0.02;
          STATE.labCfg.C_F = sol.C_F > 0 ? sol.C_F : 2e-6;
        }
        STATE.labCfg.inputMode = btn.dataset.imode;
        syncLabControlsFromState();
        renderLabVisuals();
      });
    });

    // Source voltage & mode
    const onSrcChange = () => {
      STATE.labCfg.sourceVal = Math.max(0.1, Number(document.getElementById('lab-src-val').value) || 10);
      STATE.labCfg.sourceMode = document.getElementById('lab-src-mode').value;
      renderLabVisuals();
    };
    document.getElementById('lab-src-val').addEventListener('input', onSrcChange);
    document.getElementById('lab-src-mode').addEventListener('change', onSrcChange);

    // Frequency mode & inputs
    document.querySelectorAll('#lab-freq-mode .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        STATE.labCfg.freqMode = btn.dataset.fmode;
        STATE.labCfg.omega = 2 * Math.PI * STATE.labCfg.f_Hz;
        syncLabControlsFromState();
        renderLabVisuals();
      });
    });

    const onFreqNum = () => {
      const val = Math.max(0.1, Number(document.getElementById('lab-freq-val').value) || 100);
      if (STATE.labCfg.freqMode === 'omega') {
        STATE.labCfg.omega = val;
        STATE.labCfg.f_Hz = val / (2 * Math.PI);
      } else {
        STATE.labCfg.f_Hz = E.toHertz(val, document.getElementById('lab-freq-unit').value);
        STATE.labCfg.omega = 2 * Math.PI * STATE.labCfg.f_Hz;
      }
      document.getElementById('lab-freq-slider').value = STATE.labCfg.freqMode === 'omega' ? Math.round(STATE.labCfg.omega) : Math.round(STATE.labCfg.f_Hz);
      renderLabVisuals();
    };
    document.getElementById('lab-freq-val').addEventListener('input', onFreqNum);
    document.getElementById('lab-freq-unit').addEventListener('change', onFreqNum);

    document.getElementById('lab-freq-slider').addEventListener('input', (e) => {
      const sv = Math.max(1, Number(e.target.value));
      if (STATE.labCfg.freqMode === 'omega') {
        STATE.labCfg.omega = sv;
        STATE.labCfg.f_Hz = sv / (2 * Math.PI);
        document.getElementById('lab-freq-val').value = E.fmtNum(sv, 1);
      } else {
        STATE.labCfg.f_Hz = sv;
        STATE.labCfg.omega = 2 * Math.PI * sv;
        const unit = document.getElementById('lab-freq-unit').value;
        document.getElementById('lab-freq-val').value = unit === 'kHz' ? E.fmtNum(sv / 1000, 3) : E.fmtNum(sv, 1);
      }
      renderLabVisuals();
    });

    document.querySelectorAll('#lab-freq-mults [data-fmult]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = Number(btn.dataset.fmult);
        STATE.labCfg.f_Hz = Math.max(1, STATE.labCfg.f_Hz * m);
        STATE.labCfg.omega = 2 * Math.PI * STATE.labCfg.f_Hz;
        syncLabControlsFromState();
        renderLabVisuals();
      });
    });

    document.getElementById('btn-tune-f0').addEventListener('click', () => {
      const sol = E.solveACCircuit(STATE.labCfg);
      if (sol.hasResonance && sol.f0_Hz > 0) {
        STATE.labCfg.inputMode = 'components';
        STATE.labCfg.freqMode = 'f';
        STATE.labCfg.f_Hz = sol.f0_Hz;
        STATE.labCfg.omega = 2 * Math.PI * sol.f0_Hz;
        syncLabControlsFromState();
        renderLabVisuals();
      }
    });

    // R, L, C, XL, XC inputs
    const onRChange = () => {
      STATE.labCfg.R_ohm = Math.max(0.1, E.toOhms(document.getElementById('lab-r-val').value, document.getElementById('lab-r-unit').value));
      renderLabVisuals();
    };
    document.getElementById('lab-r-val').addEventListener('input', onRChange);
    document.getElementById('lab-r-unit').addEventListener('change', onRChange);
    document.getElementById('lab-r-slider').addEventListener('input', (e) => {
      STATE.labCfg.R_ohm = Number(e.target.value);
      document.getElementById('lab-r-unit').value = 'Ω';
      document.getElementById('lab-r-val').value = E.fmtNum(STATE.labCfg.R_ohm, 1);
      renderLabVisuals();
    });

    const onLChange = () => {
      STATE.labCfg.L_H = Math.max(1e-6, E.toHenrys(document.getElementById('lab-l-val').value, document.getElementById('lab-l-unit').value));
      renderLabVisuals();
    };
    document.getElementById('lab-l-val').addEventListener('input', onLChange);
    document.getElementById('lab-l-unit').addEventListener('change', onLChange);

    const onCChange = () => {
      STATE.labCfg.C_F = Math.max(1e-12, E.toFarads(document.getElementById('lab-c-val').value, document.getElementById('lab-c-unit').value));
      renderLabVisuals();
    };
    document.getElementById('lab-c-val').addEventListener('input', onCChange);
    document.getElementById('lab-c-unit').addEventListener('change', onCChange);

    document.getElementById('lab-xl-val').addEventListener('input', (e) => {
      STATE.labCfg.XL_ohm = Math.max(0, Number(e.target.value) || 0);
      renderLabVisuals();
    });
    document.getElementById('lab-xc-val').addEventListener('input', (e) => {
      STATE.labCfg.XC_ohm = Math.max(0, Number(e.target.value) || 0);
      renderLabVisuals();
    });

    // Phasor display mode, Voltmeter target & Frequency chart mode
    document.querySelectorAll('#lab-phasor-mode .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#lab-phasor-mode .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.phasorMode = btn.dataset.pmode;
        renderLabVisuals();
      });
    });

    document.querySelectorAll('#lab-voltmeter-btns .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#lab-voltmeter-btns .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.labVoltmeterTarget = btn.dataset.vtarget;
        renderLabVisuals();
      });
    });

    document.querySelectorAll('#lab-freq-chart-mode .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#lab-freq-chart-mode .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.labFreqChartMode = btn.dataset.fcmode;
        renderLabVisuals();
      });
    });

    // Clickable frequency sweep canvas in Lab
    const freqCanvas = document.getElementById('lab-freq-canvas');
    const tuneFromCanvas = (e) => {
      const g = freqCanvas._freqPlotGeom;
      if (!g) return;
      const rect = freqCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const frac = Math.max(0, Math.min(1, (x - g.padL) / g.plotW));
      const newF = Math.max(1, g.fMin + frac * (g.fMax - g.fMin));
      STATE.labCfg.inputMode = 'components';
      STATE.labCfg.f_Hz = newF;
      STATE.labCfg.omega = 2 * Math.PI * newF;
      syncLabControlsFromState();
      renderLabVisuals();
    };
    let draggingFreq = false;
    freqCanvas.addEventListener('pointerdown', (e) => { draggingFreq = true; tuneFromCanvas(e); });
    freqCanvas.addEventListener('pointermove', (e) => { if (draggingFreq) tuneFromCanvas(e); });
    window.addEventListener('pointerup', () => { draggingFreq = false; });

    syncLabControlsFromState();
  }

  /* ========================================================================
     5. Tab 3: Exercise Workshop, MC Stepper, MC Drill, Generator & Custom Verifier
     ======================================================================== */
  function switchWorkshopSub(subId) {
    STATE.workshopSub = subId;
    document.querySelectorAll('#workshop-subtabs .seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.sub === subId);
    });
    document.querySelectorAll('.workshop-subpanel').forEach(p => {
      p.style.display = p.id === `sub-${subId}` ? 'block' : 'none';
    });
    if (subId === 'mcdril' && !STATE.activeMcDrill) {
      loadNewMcDrill();
    } else if (subId === 'random' && !STATE.currentRandomEx) {
      loadNewRandomExercise();
    } else if (subId === 'custom') {
      requestAnimationFrame(() => renderCustomVerifier(false));
    }
  }

  function renderUnitSidebar() {
    const aside = document.getElementById('workshop-unit-sidebar');
    if (!aside) return;
    aside.innerHTML = `
      <div class="unit-ref-card" style="border-top: 3px solid var(--accent);">
        <div class="module-head" style="margin-bottom:0.45rem;">
          <h4>⚡ מתי מחלקים ב-<bdi dir="ltr" class="ltr-term">√2</bdi> ואיפה מחברים מד?</h4>
          <span class="mod-badge"><span class="led-dot ur"></span>AC</span>
        </div>
        <div style="font-size:0.81rem; line-height:1.5; color:var(--fg);">
          <div style="margin-bottom:0.35rem;">• נתון ${L('U = 20 V')} או קריאת מד-מתח ← <strong>כבר אפקטיבי</strong> (לא לחלק!).</div>
          <div style="margin-bottom:0.35rem;">• נתונה משוואה ${L('u(t) = Um·sin(ωt)')} ← המקדם הוא ${L('Um')} שיא! חובה לחלק ${L('U = Um / √2')}.</div>
          <div style="margin-bottom:0.35rem;">• נתון ${L('Up-p')} ← מחלקים ${L('U = Up-p / (2√2)')}.</div>
          <div>• מד-זרם ${L('(A)')} תמיד <strong>בטור</strong>; מד-מתח ${L('(V)')} תמיד <strong>במקביל</strong> לרכיב; שניהם מציגים ערך אפקטיבי.</div>
        </div>
      </div>

      <div class="unit-ref-card">
        <div class="module-head" style="margin-bottom:0.5rem;">
          <h4>📏 טבלת קידומות והמרה</h4>
          <span class="mod-badge"><span class="led-dot warn"></span>SI</span>
        </div>
        <table class="unit-ref-table">
          <thead><tr><th>קידומת</th><th>סמל</th><th>כפל</th><th>דוגמה</th></tr></thead>
          <tbody>
            ${C.UNIT_PREFIXES.map(u => `
              <tr>
                <td>${u.name}</td>
                <td class="sym-cell">${u.sym}</td>
                <td class="pow-cell">${u.power}</td>
                <td class="ex-cell">${u.ex}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="unit-warn-box">
          ⚠️ <strong>חוק ברזל:</strong> להצבה בנוסחאות ${L('XL, XC, f₀')} ממירים תמיד ליחידות בסיס (${L('Ω, Hz, H, F')}). לדוגמה: ${L('100 mH = 0.1 H')}, ${L('10 µF = 10⁻⁵ F')}.
        </div>
        <div class="uconv-box">
          <strong style="font-size:0.82rem; display:block; margin-bottom:0.35rem;">🔄 מחשבון המרה מהיר:</strong>
          <div class="input-combo">
            <input id="sb-conv-val" class="input-box ltr-input" type="number" step="0.1" value="100">
            <select id="sb-conv-unit" class="select-box" dir="ltr">
              <option value="1e3">k (×10³)</option>
              <option value="1e-3" selected>m (×10⁻³)</option>
              <option value="1e-6">µ (×10⁻⁶)</option>
              <option value="1e-9">n (×10⁻⁹)</option>
              <option value="1e-12">p (×10⁻¹²)</option>
            </select>
          </div>
          <div id="sb-conv-res" class="uconv-result">= 0.1  (1e-1)</div>
        </div>
      </div>

      <div class="unit-ref-card">
        <div class="module-head" style="margin-bottom:0.5rem;">
          <h4>📐 שלשות פיתגורס נפוצות בבגרות</h4>
          <span class="mod-badge"><span class="led-dot"></span>TRICKS</span>
        </div>
        <div class="tau-shortcut-list">
          ${C.PYTHAGOREAN_TRIPLES.map(tr => `
            <div class="tau-shortcut-row">
              <strong>${tr.ratio}</strong>
              <span>${tr.examples}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const updateSb = () => {
      const val = Number(document.getElementById('sb-conv-val').value) || 0;
      const mult = Number(document.getElementById('sb-conv-unit').value) || 1;
      const base = val * mult;
      document.getElementById('sb-conv-res').textContent = `= ${base.toPrecision(4).replace(/\.?0+$/, '')}  (${base.toExponential(2)})`;
    };
    document.getElementById('sb-conv-val').addEventListener('input', updateSb);
    document.getElementById('sb-conv-unit').addEventListener('change', updateSb);
  }

  function renderExerciseCard(ex, isRandom = false) {
    const card = document.createElement('div');
    const isSolved = !isRandom && STATE.solvedIds.has(ex.id);
    card.className = `exercise-card${isSolved ? ' solved' : ''}`;
    card.dataset.exid = ex.id;

    const guidedSteps = C.buildGuidedStepsForExercise(ex);
    const letters = ['א', 'ב', 'ג', 'ד'];

    card.innerHTML = `
      <div class="ex-top">
        <div>
          <h3 class="ex-title">${ex.title}</h3>
        </div>
        <div style="display:flex; gap:0.4rem; align-items:center;">
          <span class="badge badge-accent">${ex.badge}</span>
          ${isSolved ? '<span class="badge badge-done">פתור ✓</span>' : ''}
        </div>
      </div>
      <p style="margin:0 0 0.75rem 0; font-size:0.95rem;">${ex.givensHtml}</p>

      <div class="subq-list">
        ${ex.subQuestions.map(sq => `
          <div class="subq-row" data-sqid="${sq.id}">
            <div class="subq-prompt">${sq.promptHtml}</div>
            <div class="subq-controls">
              <div class="subq-input-wrap">
                <input type="text" inputmode="decimal" class="subq-input" placeholder="תשובה" aria-label="${sq.id}">
                <span class="ltr-inline" dir="ltr">${E.escapeHtml(sq.unit)}</span>
              </div>
              <button type="button" class="btn btn-sm btn-primary btn-check-sq">בדוק</button>
            </div>
            <div class="feedback-msg"></div>
          </div>
        `).join('')}
      </div>

      <div class="guided-steps-panel">
        <button type="button" class="guided-toggle-btn">
          <span>🧭 פירוק התרגיל ל-4 שלבים אמריקאיים (לחץ לפתיחה/סגירה)</span>
          <span>▼</span>
        </button>
        <div class="guided-steps-body">
          <div class="stepper-tabs">
            ${guidedSteps.map((st, idx) => `<button type="button" class="stepper-tab${idx === 0 ? ' active' : ''}" data-sidx="${idx}">${st.title}</button>`).join('')}
          </div>
          <div class="stepper-stage"></div>
        </div>
      </div>

      <div class="ex-actions">
        <button type="button" class="btn btn-sm btn-toggle-sim">📊 הצג סכימת מדים ודיאגרמת פאזורים כאן</button>
        <button type="button" class="btn btn-sm btn-open-lab">🔬 פתח מעגל זה במעבדה</button>
        <button type="button" class="btn btn-sm btn-toggle-sol">💡 הצג/הסתר פתרון מלא</button>
      </div>

      <div class="ex-sim-box">
        <div class="two-col-eq">
          <div class="canvas-wrap"><canvas class="ex-schem-cv" data-height="245"></canvas></div>
          <div class="canvas-wrap"><canvas class="ex-phasor-cv" data-height="245"></canvas></div>
        </div>
      </div>

      <div class="ex-solution-box">
        <div class="math-block" dir="ltr">${E.escapeHtml(ex.solutionLines)}</div>
      </div>
    `;

    // Wire sub-question numeric checks
    const solvedSq = new Set();
    card.querySelectorAll('.subq-row').forEach((row, idx) => {
      const sq = ex.subQuestions[idx];
      const inp = row.querySelector('.subq-input');
      const btn = row.querySelector('.btn-check-sq');
      const fb = row.querySelector('.feedback-msg');

      const check = () => {
        const res = E.validateStudentAnswer(inp.value, sq.expected, sq.unit, sq.traps || []);
        fb.className = `feedback-msg show ${res.status === 'correct' ? 'correct' : (res.status === 'empty' ? 'hint' : 'wrong')}`;
        fb.innerHTML = res.msgHtml;
        inp.classList.remove('correct', 'wrong');
        if (res.status === 'correct') {
          inp.classList.add('correct');
          solvedSq.add(sq.id);
          if (!isRandom && solvedSq.size === ex.subQuestions.length) {
            STATE.solvedIds.add(ex.id);
            card.classList.add('solved');
            saveSolvedSet();
          }
        } else if (res.status !== 'empty') {
          inp.classList.add('wrong');
        }
      };

      btn.addEventListener('click', check);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    });

    // Wire 4-step Guided MC Stepper
    const gToggle = card.querySelector('.guided-toggle-btn');
    const gBody = card.querySelector('.guided-steps-body');
    const gStage = card.querySelector('.stepper-stage');
    let curStepIdx = 0;

    function renderGuidedStep(idx) {
      curStepIdx = idx;
      card.querySelectorAll('.stepper-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
      const st = guidedSteps[idx];
      gStage.innerHTML = `
        <div style="font-weight:700; margin-bottom:0.45rem;">${st.questionHtml}</div>
        <div class="mc-options-grid">
          ${st.optionsHtml.map((opt, oi) => `
            <button type="button" class="mc-option" data-oi="${oi}">
              <span class="mc-letter">${letters[oi]}</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>
        <div class="feedback-msg"></div>
      `;
      const fb = gStage.querySelector('.feedback-msg');
      gStage.querySelectorAll('.mc-option').forEach(optBtn => {
        optBtn.addEventListener('click', () => {
          const picked = Number(optBtn.dataset.oi);
          gStage.querySelectorAll('.mc-option').forEach((ob, i) => {
            ob.classList.remove('selected', 'correct', 'wrong');
            if (i === st.correctIndex) ob.classList.add('correct');
            else if (i === picked) ob.classList.add('wrong');
          });
          const ok = picked === st.correctIndex;
          fb.className = `feedback-msg show ${ok ? 'correct' : 'wrong'}`;
          fb.innerHTML = (ok ? '✓ נכון מאוד! ' : '✗ לא מדויק. ') + st.explainHtml;
          if (ok) {
            card.querySelectorAll('.stepper-tab')[idx].classList.add('done');
          }
        });
      });
    }

    gToggle.addEventListener('click', () => {
      gBody.classList.toggle('open');
      if (gBody.classList.contains('open') && !gStage.innerHTML) {
        renderGuidedStep(0);
      }
    });
    card.querySelectorAll('.stepper-tab').forEach(t => {
      t.addEventListener('click', () => renderGuidedStep(Number(t.dataset.sidx)));
    });

    // Wire action buttons (Inline Sim, Open in Lab, Show Solution)
    const simBox = card.querySelector('.ex-sim-box');
    const schemCv = card.querySelector('.ex-schem-cv');
    const phasorCv = card.querySelector('.ex-phasor-cv');
    const drawInlineSim = () => {
      const sol = E.solveACCircuit(ex.labCfg);
      V.drawACSchematic(schemCv, sol, { voltmeterTarget: 'ALL' });
      V.drawPhasorAndTriangle(phasorCv, sol, 'both');
    };
    phasorCv._drawFn = drawInlineSim;

    card.querySelector('.btn-toggle-sim').addEventListener('click', () => {
      simBox.classList.toggle('open');
      if (simBox.classList.contains('open')) {
        requestAnimationFrame(drawInlineSim);
        setTimeout(drawInlineSim, 35);
      }
    });

    card.querySelector('.btn-open-lab').addEventListener('click', () => {
      loadCustomConfigIntoLab(ex.labCfg);
      switchMainTab('lab');
    });

    const solBox = card.querySelector('.ex-solution-box');
    card.querySelector('.btn-toggle-sol').addEventListener('click', () => {
      solBox.classList.toggle('open');
    });

    return card;
  }

  function renderCuratedList() {
    const host = document.getElementById('curated-ex-list');
    host.innerHTML = '';
    const filtered = STATE.curatedFilter === 'all'
      ? C.EXERCISES
      : C.EXERCISES.filter(e => e.category === STATE.curatedFilter);
    filtered.forEach(ex => host.appendChild(renderExerciseCard(ex, false)));
  }

  function loadNewMcDrill() {
    const activeModeBtn = document.querySelector('#mc-drill-mode .seg-btn.active');
    const mode = activeModeBtn ? activeModeBtn.dataset.mcmode : 'ueff_meters';
    const topo = document.getElementById('mc-stages-topo').value;
    const q = C.generateMcDrillQuestion(mode, topo);
    STATE.activeMcDrill = q;

    const host = document.getElementById('mc-drill-host');
    const letters = ['א', 'ב', 'ג', 'ד'];

    if (q.isMultiStep) {
      host.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'card';
      let curIdx = 0;
      const doneSteps = new Set();

      const drawStage = (idx) => {
        curIdx = idx;
        const st = q.steps[idx];
        card.innerHTML = `
          <div class="card-title"><span>${q.title}</span><span class="badge badge-accent">שלב ${idx + 1}/4</span></div>
          <p style="margin:0 0 0.7rem 0; font-size:0.96rem;">${q.promptHtml}</p>
          <div class="stepper-tabs">
            ${q.steps.map((s, i) => `<button type="button" class="stepper-tab${i === idx ? ' active' : ''}${doneSteps.has(i) ? ' done' : ''}" data-i="${i}">${s.title}</button>`).join('')}
          </div>
          <div style="font-weight:700; margin-bottom:0.5rem;">${st.questionHtml}</div>
          <div class="mc-options-grid">
            ${st.optionsHtml.map((o, oi) => `<button type="button" class="mc-option" data-oi="${oi}"><span class="mc-letter">${letters[oi]}</span><span>${o}</span></button>`).join('')}
          </div>
          <div class="feedback-msg"></div>
        `;
        card.querySelectorAll('.stepper-tab').forEach(tb => tb.addEventListener('click', () => drawStage(Number(tb.dataset.i))));
        const fb = card.querySelector('.feedback-msg');
        card.querySelectorAll('.mc-option').forEach(ob => {
          ob.addEventListener('click', () => {
            if (ob.dataset.answered) return;
            const picked = Number(ob.dataset.oi);
            const ok = picked === st.correctIndex;
            card.querySelectorAll('.mc-option').forEach((btn, i) => {
              btn.dataset.answered = '1';
              if (i === st.correctIndex) btn.classList.add('correct');
              else if (i === picked) btn.classList.add('wrong');
            });
            STATE.mcScore.total++;
            if (ok) { STATE.mcScore.right++; STATE.mcScore.streak++; doneSteps.add(curIdx); }
            else { STATE.mcScore.streak = 0; }
            document.getElementById('mc-score-badge').textContent = `נכונות: ${STATE.mcScore.right} / ${STATE.mcScore.total} · רצף: ${STATE.mcScore.streak}`;
            fb.className = `feedback-msg show ${ok ? 'correct' : 'wrong'}`;
            fb.innerHTML = (ok ? '✓ מדויק! ' : '✗ לא מדויק. ') + st.explainHtml;
          });
        });
      };
      drawStage(0);
      host.appendChild(card);
    } else {
      host.innerHTML = `
        <div class="card">
          <div class="card-title"><span>${q.title}</span><span class="badge badge-accent">בדיקה מיידית</span></div>
          <p style="font-size:1rem; font-weight:600; margin:0 0 0.75rem 0;">${q.promptHtml}</p>
          <div class="mc-options-grid">
            ${q.optionsHtml.map((o, oi) => `<button type="button" class="mc-option" data-oi="${oi}"><span class="mc-letter">${letters[oi]}</span><span>${o}</span></button>`).join('')}
          </div>
          <div class="feedback-msg" id="mc-single-fb"></div>
        </div>
      `;
      const fb = document.getElementById('mc-single-fb');
      host.querySelectorAll('.mc-option').forEach(ob => {
        ob.addEventListener('click', () => {
          if (ob.dataset.answered) return;
          const picked = Number(ob.dataset.oi);
          const ok = picked === q.correctIndex;
          host.querySelectorAll('.mc-option').forEach((btn, i) => {
            btn.dataset.answered = '1';
            if (i === q.correctIndex) btn.classList.add('correct');
            else if (i === picked) btn.classList.add('wrong');
          });
          STATE.mcScore.total++;
          if (ok) { STATE.mcScore.right++; STATE.mcScore.streak++; }
          else { STATE.mcScore.streak = 0; }
          document.getElementById('mc-score-badge').textContent = `נכונות: ${STATE.mcScore.right} / ${STATE.mcScore.total} · רצף: ${STATE.mcScore.streak}`;
          fb.className = `feedback-msg show ${ok ? 'correct' : 'wrong'}`;
          fb.innerHTML = (ok ? '✓ תשובה נכונה! ' : '✗ שים לב להסבר: ') + q.explainHtml;
        });
      });
    }
  }

  function loadNewRandomExercise() {
    const topo = document.getElementById('rand-topo').value;
    const diff = document.getElementById('rand-diff').value;
    const ex = C.generateRandomExercise(topo, diff);
    STATE.currentRandomEx = ex;
    const host = document.getElementById('random-ex-container');
    host.innerHTML = '';
    host.appendChild(renderExerciseCard(ex, true));
  }

  function readCustomConfig() {
    const topo = document.getElementById('cust-topo').value;
    const swClosed = topo === 'RC_SWITCH' && document.getElementById('cust-switch').value === 'closed';
    const Ueff = Math.max(0.1, Number(document.getElementById('cust-ueff').value) || 10);
    const f_Hz = Math.max(0.1, E.toHertz(document.getElementById('cust-freq').value, document.getElementById('cust-freq-unit').value));
    const R_ohm = Math.max(0.1, E.toOhms(document.getElementById('cust-r').value, document.getElementById('cust-r-unit').value));
    const L_H = Math.max(1e-6, E.toHenrys(document.getElementById('cust-l').value, document.getElementById('cust-l-unit').value));
    const C_F = Math.max(1e-12, E.toFarads(document.getElementById('cust-c').value, document.getElementById('cust-c-unit').value));
    return { topology: topo, switchClosed: swClosed, inputMode: 'components', sourceMode: 'Ueff', sourceVal: Ueff, Ueff, freqMode: 'f', f_Hz, R_ohm, L_H, C_F };
  }

  function renderCustomVerifier(checkAnswer = false) {
    const cfg = readCustomConfig();
    const showSw = cfg.topology === 'RC_SWITCH';
    const showL = cfg.topology === 'RL' || cfg.topology === 'RLC';
    const showC = cfg.topology === 'RC' || cfg.topology === 'RLC' || showSw;
    document.getElementById('cust-switch-wrap').style.display = showSw ? 'flex' : 'none';
    document.getElementById('cust-l-wrap').style.display = showL ? 'flex' : 'none';
    document.getElementById('cust-c-wrap').style.display = showC ? 'flex' : 'none';

    const sol = E.solveACCircuit(cfg);
    V.drawPhasorAndTriangle(document.getElementById('cust-phasor-canvas'), sol, 'both');

    const steps = E.buildFullDerivation(sol);
    document.getElementById('cust-steps').innerHTML = steps.map(st => `
      <div class="step-card">
        <div class="step-card-head"><span>${st.titleHtml}</span><span class="badge badge-accent">${st.badge}</span></div>
        <div class="math-block" dir="ltr">${E.escapeHtml(st.mathLines)}</div>
      </div>
    `).join('');

    if (checkAnswer) {
      const qtype = document.getElementById('cust-qtype').value;
      const rawAns = document.getElementById('cust-student-ans').value;
      const fb = document.getElementById('cust-feedback');

      let expected = sol.Z_ohm;
      let unit = 'Ω';
      if (qtype === 'I_mA') { expected = sol.Ieff_mA; unit = 'mA'; }
      else if (qtype === 'XL') { expected = sol.XL_ohm; unit = 'Ω'; }
      else if (qtype === 'XC') { expected = sol.XC_ohm; unit = 'Ω'; }
      else if (qtype === 'phi') { expected = sol.phi_deg; unit = '°'; }
      else if (qtype === 'f0') {
        if (!sol.hasResonance) {
          fb.className = 'feedback-msg show hint';
          fb.innerHTML = `תדר תהודה ${L('f₀')} מוגדר רק במעגל ${T('RLC')} המכיל גם סליל וגם קבל.`;
          return;
        }
        expected = sol.f0_Hz;
        unit = 'Hz';
      }

      if (!String(rawAns || '').trim()) {
        fb.className = 'feedback-msg show correct';
        fb.innerHTML = `התוצאה המחושבת עבור ${T(qtype)}: ${L(`${E.fmtNum(expected, 2)} ${unit}`)}.`;
      } else {
        const res = E.validateStudentAnswer(rawAns, expected, unit);
        fb.className = `feedback-msg show ${res.status === 'correct' ? 'correct' : 'wrong'}`;
        fb.innerHTML = res.msgHtml;
      }
    }
  }

  function initWorkshopTab() {
    renderUnitSidebar();
    saveSolvedSet();

    document.querySelectorAll('#workshop-subtabs .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => switchWorkshopSub(btn.dataset.sub));
    });

    document.querySelectorAll('#ex-filter-pills .chapter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ex-filter-pills .chapter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.curatedFilter = btn.dataset.filter;
        renderCuratedList();
      });
    });

    document.querySelectorAll('#mc-drill-mode .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#mc-drill-mode .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('mc-stages-topo-wrap').style.display = btn.dataset.mcmode === 'stages' ? 'flex' : 'none';
        loadNewMcDrill();
      });
    });
    document.getElementById('mc-stages-topo').addEventListener('change', loadNewMcDrill);
    document.getElementById('btn-next-mc').addEventListener('click', loadNewMcDrill);

    document.getElementById('btn-gen-random').addEventListener('click', loadNewRandomExercise);

    document.getElementById('cust-topo').addEventListener('change', () => renderCustomVerifier(false));
    document.getElementById('btn-cust-verify').addEventListener('click', () => renderCustomVerifier(true));
    document.getElementById('btn-cust-to-lab').addEventListener('click', () => {
      loadCustomConfigIntoLab(readCustomConfig());
      switchMainTab('lab');
    });

    renderCuratedList();
  }

  /* ========================================================================
     6. Boot Sequence
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initHeaderAndDrawer();
    initHomeTab();
    initIntroTab();
    initLabTab();
    initWorkshopTab();
    window.addEventListener('resize', redrawVisibleCanvases);
  });
})();
