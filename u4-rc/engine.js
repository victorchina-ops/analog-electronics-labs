/**
 * engine.js — Exact analytical RC time-domain physics, algebra, BiDi helpers,
 * step-by-step Bagrut derivation generator, and mistake-diagnosing validator.
 * Works completely offline (no ES modules, attaches window.RCEngine).
 */
(function (global) {
  'use strict';

  // --- BiDi Isolation Helpers (Mandatory for Hebrew + Math/English) ---
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Wrap inline math, signed numbers, variables, and units in isolated LTR <bdi> */
  function L(text) {
    return '<bdi dir="ltr" class="ltr-inline">' + escapeHtml(text) + '</bdi>';
  }

  /** Wrap English technical terms (LP, HP, RC, DC) in isolated LTR <bdi> */
  function T(text) {
    return '<bdi dir="ltr" class="ltr-term">' + escapeHtml(text) + '</bdi>';
  }

  // --- Unit Multipliers & Formatting ---
  const R_UNITS = { 'Ω': 1, 'kΩ': 1e3, 'MΩ': 1e6 };
  const C_UNITS = { 'pF': 1e-12, 'nF': 1e-9, 'µF': 1e-6, 'mF': 1e-3 };
  const T_UNITS = { 'µs': 1e-6, 'ms': 1e-3, 's': 1 };

  function toOhms(val, unit) {
    return Number(val) * (R_UNITS[unit] || 1);
  }

  function toFarads(val, unit) {
    return Number(val) * (C_UNITS[unit] || 1e-6);
  }

  function toSeconds(val, unit) {
    return Number(val) * (T_UNITS[unit] || 1e-3);
  }

  function pickBestTimeUnit(seconds) {
    const abs = Math.abs(seconds);
    if (abs >= 0.5) return 's';
    if (abs >= 5e-4) return 'ms';
    return 'µs';
  }

  function fromSeconds(seconds, unit) {
    return seconds / (T_UNITS[unit] || 1e-3);
  }

  function fmtNum(val, decimals) {
    if (!Number.isFinite(val)) return '—';
    const d = decimals !== undefined ? decimals : 2;
    let rounded = Number(val.toFixed(d));
    if (Object.is(rounded, -0) || Math.abs(rounded) < 1e-9) rounded = 0;
    // Strip trailing zeros only if integer or clean decimal? Keep consistent 2 decimals for voltages/times, or smart:
    const s = rounded.toFixed(d);
    return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  function fmtFixed(val, decimals = 2) {
    if (!Number.isFinite(val)) return '—';
    let rounded = Number(val.toFixed(decimals));
    if (Object.is(rounded, -0) || Math.abs(rounded) < 1e-9) rounded = 0;
    return rounded.toFixed(decimals);
  }

  function fmtResistance(ohms) {
    if (ohms >= 1e6) return fmtNum(ohms / 1e6, 2) + ' MΩ';
    if (ohms >= 1e3) return fmtNum(ohms / 1e3, 2) + ' kΩ';
    return fmtNum(ohms, 1) + ' Ω';
  }

  function fmtCapacitance(farads) {
    if (farads >= 1e-3) return fmtNum(farads * 1e3, 2) + ' mF';
    if (farads >= 1e-6) return fmtNum(farads * 1e6, 2) + ' µF';
    if (farads >= 1e-9) return fmtNum(farads * 1e9, 2) + ' nF';
    return fmtNum(farads * 1e12, 1) + ' pF';
  }

  function fmtTime(seconds, preferredUnit) {
    const unit = preferredUnit || pickBestTimeUnit(seconds);
    return fmtNum(fromSeconds(seconds, unit), 2) + ' ' + unit;
  }

  function fmtCurrent(amps) {
    const abs = Math.abs(amps);
    if (abs >= 1) return fmtNum(amps, 2) + ' A';
    if (abs >= 1e-3) return fmtNum(amps * 1e3, 2) + ' mA';
    return fmtNum(amps * 1e6, 1) + ' µA';
  }

  /**
   * Solve time for V(t) = targetV inside a single segment.
   * Returns { valid, dt_s, t_s, ratio, reasonHe }
   */
  function solveSegmentForVoltage(seg, network, targetV) {
    const eps = 1e-9;
    const isLP = network === 'LP';
    const vStart = isLP ? seg.VcStart : seg.VrStartPlus;
    const vEnd = isLP ? seg.VcEnd : seg.VrEndMinus;
    const vf = isLP ? seg.VcTarget : 0;

    // Check exact start
    if (Math.abs(vStart - targetV) < 1e-6) {
      return { valid: true, dt_s: 0, t_s: seg.tStart, ratio: 1, reasonHe: '' };
    }

    const denom = targetV - vf;
    const numer = vStart - vf;

    if (Math.abs(numer) < eps) {
      return {
        valid: false,
        ratio: NaN,
        reasonHe: isLP
          ? 'בגלל שהמתח ההתחלתי והסופי שווים, המתח אינו משתנה בקטע זה.'
          : 'בגלל שאין קפיצה במבוא או שהקבל כבר טעון, המוצא נשאר על 0V.'
      };
    }

    if (Math.abs(denom) < eps) {
      return {
        valid: false,
        ratio: Infinity,
        reasonHe: `המתח שואף אסימפטוטית אל ${L(fmtNum(vf, 2) + ' V')} ולכן תיאורטית מגיע אליו רק באינסוף (מעשית אחרי ${L('5τ')}).`
      };
    }

    const ratio = numer / denom;
    if (ratio <= 1) {
      let reasonHe = '';
      if (ratio <= 0) {
        reasonHe = isLP
          ? `המתח בקטע נע בין ${L(fmtNum(vStart, 2) + ' V')} ל-${L(fmtNum(vEnd, 2) + ' V')} ואינו עובר דרך ${L(fmtNum(targetV, 2) + ' V')} (המנה בתוך ה-${T('ln')} יוצאת שלילית).`
          : `בקטע זה המוצא דועך מ-${L(fmtNum(vStart, 2) + ' V')} אל ${L('0 V')} ואינו חוצה לצד הנגדי (המנה בתוך ה-${T('ln')} שלילית).`;
      } else {
        reasonHe = isLP
          ? `המוצא מתחיל מ-${L(fmtNum(vStart, 2) + ' V')} ונע אל ${L(fmtNum(vf, 2) + ' V')}, ולכן אינו יכול להגיע אל ${L(fmtNum(targetV, 2) + ' V')} שנמצא מחוץ לטווח (המנה בתוך ה-${T('ln')} קטנה מ-${L('1')}).`
          : `בקטע זה המוצא דועך מ-${L(fmtNum(vStart, 2) + ' V')} לכיוון ${L('0 V')}, ולכן אינו מגיע אל ${L(fmtNum(targetV, 2) + ' V')} שרחוק יותר מ-${L('0 V')} (המנה בתוך ה-${T('ln')} קטנה מ-${L('1')}).`;
      }
      return { valid: false, ratio, reasonHe };
    }

    const dt_s = seg.tau_s * Math.log(ratio);
    const t_s = seg.tStart + dt_s;
    if (t_s > seg.tEnd + 1e-12) {
      return {
        valid: false,
        ratio,
        dt_s,
        t_s,
        reasonHe: `הקטע מסתיים בזמן ${L(fmtNum(fromSeconds(seg.tEnd, seg.timeUnit), 2) + ' ' + seg.timeUnit)} כשהמתח מגיע רק ל-${L(fmtNum(vEnd, 2) + ' V')} — לפני שהספיק להגיע ל-${L(fmtNum(targetV, 2) + ' V')}.`
      };
    }

    return { valid: true, dt_s, t_s, ratio, reasonHe: '' };
  }

  /**
   * Compile piecewise analytical RC timeline from circuit & input config.
   * config = {
   *   network: 'LP' | 'HP' | 'BOTH',
   *   R1_ohm: number,
   *   C_F: number,
   *   timeUnit: 'µs' | 'ms' | 's',
   *   tViewStart_s: number,
   *   tViewEnd_s: number,
   *   preVi: number,
   *   steadyState: boolean,
   *   VcInit: number (used if !steadyState),
   *   transitions: [{ t_s: number, Vi: number, labelHe?: string }],
   *   hasSwitch?: { enabled: boolean, mode: 'parallel'|'series', R2_ohm: number, triggerType: 'time'|'voltage', triggerValue: number }
   * }
   */
  function compileTimeline(config) {
    const R1 = Math.max(1e-3, Number(config.R1_ohm));
    const C = Math.max(1e-15, Number(config.C_F));
    const tau1 = R1 * C;
    const timeUnit = config.timeUnit || pickBestTimeUnit(tau1);
    const tViewStart = Number(config.tViewStart_s !== undefined ? config.tViewStart_s : 0);
    const tViewEnd = Number(config.tViewEnd_s !== undefined ? config.tViewEnd_s : 5 * tau1);
    const preVi = Number(config.preVi !== undefined ? config.preVi : 0);
    const steadyState = config.steadyState !== false;
    let currentVc = steadyState ? preVi : Number(config.VcInit || 0);

    const transitions = (config.transitions || [])
      .slice()
      .sort((a, b) => a.t_s - b.t_s);

    const hasSwitch = config.hasSwitch && config.hasSwitch.enabled ? config.hasSwitch : null;
    let R_afterSwitch = R1;
    if (hasSwitch) {
      const R2 = Math.max(1e-3, Number(hasSwitch.R2_ohm));
      R_afterSwitch = hasSwitch.mode === 'series' ? R1 + R2 : (R1 * R2) / (R1 + R2);
    }

    const segments = [];
    let switchClosed = false;
    let switchEventTime_s = null;

    // Pre-transition segment (if tViewStart < first transition or no transitions)
    const firstT = transitions.length > 0 ? transitions[0].t_s : tViewEnd;
    if (tViewStart < firstT - 1e-12) {
      const vr = preVi - currentVc;
      const preEndVc = steadyState
        ? preVi
        : preVi + (currentVc - preVi) * Math.exp(-(firstT - tViewStart) / tau1);
      segments.push({
        index: segments.length,
        isPre: true,
        tStart: tViewStart,
        tEnd: firstT,
        Vi: preVi,
        prevVi: preVi,
        deltaVi: 0,
        R_ohm: R1,
        tau_s: tau1,
        timeUnit,
        VcStart: currentVc,
        VcTarget: preVi,
        VcEnd: preEndVc,
        VrStartPlus: vr,
        VrEndMinus: preVi - preEndVc,
        switchClosed: false,
        labelHe: 'לפני השינוי במבוא'
      });
      currentVc = preEndVc;
    }

    let prevVi = preVi;

    for (let i = 0; i < transitions.length; i++) {
      const tr = transitions[i];
      const segStart = tr.t_s;
      const segEnd = i + 1 < transitions.length ? transitions[i + 1].t_s : tViewEnd;
      if (segEnd <= segStart + 1e-12) {
        prevVi = tr.Vi;
        continue;
      }

      const Vi = Number(tr.Vi);
      const dVi = Vi - prevVi;

      // Helper to push a concrete sub-segment with constant R
      const pushSubSeg = (sT, eT, vc0, activeR, isSwClosed, firstSubOfTransition, label) => {
        const tau = activeR * C;
        const dt = eT - sT;
        const vcEnd = Vi + (vc0 - Vi) * Math.exp(-dt / tau);
        const vrStart = Vi - vc0;
        const vrEnd = Vi - vcEnd;
        segments.push({
          index: segments.length,
          isPre: false,
          tStart: sT,
          tEnd: eT,
          Vi,
          prevVi: firstSubOfTransition ? prevVi : Vi,
          deltaVi: firstSubOfTransition ? dVi : 0,
          R_ohm: activeR,
          tau_s: tau,
          timeUnit,
          VcStart: vc0,
          VcTarget: Vi,
          VcEnd: vcEnd,
          VrStartPlus: vrStart,
          VrEndMinus: vrEnd,
          switchClosed: isSwClosed,
          labelHe: label
        });
        return vcEnd;
      };

      // Check whether switch triggers inside [segStart, segEnd]
      if (hasSwitch && !switchClosed) {
        let splitTime = null;
        if (hasSwitch.triggerType === 'time') {
          const trigT = Number(hasSwitch.triggerValue_s !== undefined ? hasSwitch.triggerValue_s : hasSwitch.triggerValue);
          if (trigT <= segStart + 1e-12) {
            switchClosed = true;
            switchEventTime_s = trigT;
          } else if (trigT > segStart && trigT < segEnd - 1e-12) {
            splitTime = trigT;
          }
        } else if (hasSwitch.triggerType === 'voltage') {
          const vTrig = Number(hasSwitch.triggerValue);
          const denom = vTrig - Vi;
          const numer = currentVc - Vi;
          if (Math.abs(denom) > 1e-9 && numer / denom > 1) {
            const dtTrig = tau1 * Math.log(numer / denom);
            if (segStart + dtTrig < segEnd - 1e-12) {
              splitTime = segStart + dtTrig;
            }
          }
        }

        if (splitTime !== null) {
          switchEventTime_s = splitTime;
          currentVc = pushSubSeg(segStart, splitTime, currentVc, R1, false, true, tr.labelHe || `קטע ${i + 1} (לפני סגירת המפסק)`);
          switchClosed = true;
          currentVc = pushSubSeg(splitTime, segEnd, currentVc, R_afterSwitch, true, false, `אחרי סגירת המפסק (${hasSwitch.mode === 'series' ? 'טור' : 'מקביל'})`);
          prevVi = Vi;
          continue;
        }
      }

      const activeR = switchClosed ? R_afterSwitch : R1;
      currentVc = pushSubSeg(segStart, segEnd, currentVc, activeR, switchClosed, true, tr.labelHe || `קטע ${segments.length}`);
      prevVi = Vi;
    }

    return {
      config,
      R1_ohm: R1,
      R_afterSwitch_ohm: R_afterSwitch,
      C_F: C,
      tau1_s: tau1,
      tau2_s: R_afterSwitch * C,
      timeUnit,
      tViewStart_s: tViewStart,
      tViewEnd_s: tViewEnd,
      switchEventTime_s,
      segments
    };
  }

  /**
   * Evaluate exact circuit quantities at time t_s.
   * side = 'before' (t-) or 'after' (t+) matters at transition boundaries.
   */
  function evaluateAt(timeline, t_s, side = 'after') {
    const segs = timeline.segments;
    if (!segs.length) return null;

    const eps = 1e-11;
    let chosen = segs[segs.length - 1];
    let atJump = false;

    // 1. Check transition boundaries first so side ('before' vs 'after') is unambiguous
    for (let i = 1; i < segs.length; i++) {
      const s = segs[i];
      if (Math.abs(t_s - s.tStart) <= eps) {
        atJump = Math.abs(s.deltaVi) > 1e-9;
        if (side === 'before') {
          const prev = segs[i - 1];
          const dtPrev = prev.tEnd - prev.tStart;
          const vc = prev.VcEnd;
          const vr = prev.VrEndMinus;
          return {
            t_s,
            side: 'before',
            atJump,
            segment: prev,
            Vi: prev.Vi,
            Vc: vc,
            Vr: vr,
            VoLP: vc,
            VoHP: vr,
            I_A: vr / prev.R_ohm,
            dt_s: dtPrev,
            tau_s: prev.tau_s
          };
        }
        chosen = s;
        const vc = chosen.VcStart;
        const vr = chosen.VrStartPlus;
        return {
          t_s,
          side: 'after',
          atJump,
          segment: chosen,
          Vi: chosen.Vi,
          Vc: vc,
          Vr: vr,
          VoLP: vc,
          VoHP: vr,
          I_A: vr / chosen.R_ohm,
          dt_s: 0,
          tau_s: chosen.tau_s
        };
      }
    }

    // 2. Otherwise find strictly interior segment (or clamp to ends)
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (t_s >= s.tStart - eps && t_s <= s.tEnd + eps) {
        chosen = s;
        break;
      }
    }

    const dt = Math.max(0, Math.min(chosen.tEnd - chosen.tStart, t_s - chosen.tStart));
    const factor = Math.exp(-dt / chosen.tau_s);
    const vc = chosen.VcTarget + (chosen.VcStart - chosen.VcTarget) * factor;
    const vr = chosen.Vi - vc;

    return {
      t_s,
      side,
      atJump,
      segment: chosen,
      Vi: chosen.Vi,
      Vc: vc,
      Vr: vr,
      VoLP: vc,
      VoHP: vr,
      I_A: vr / chosen.R_ohm,
      dt_s: dt,
      tau_s: chosen.tau_s
    };
  }

  /**
   * Generate step-by-step Bagrut-style derivation for Vo(t) at t_s.
   */
  function buildVoltageDerivation(timeline, network, t_s, side = 'after') {
    const ev = evaluateAt(timeline, t_s, side);
    if (!ev) return [];
    const u = timeline.timeUnit;
    const steps = [];

    // Step 1: Identify network & tau
    const seg = ev.segment;
    steps.push({
      titleHe: `1. זיהוי הרשת וקבוע הזמן (${T('τ = R · C')})`,
      formulaLtr: `τ = R · C`,
      substitutionLtr: `τ = ${fmtResistance(seg.R_ohm)} · ${fmtCapacitance(timeline.C_F)}`,
      resultLtr: `τ = ${fmtTime(seg.tau_s, u)}`,
      noteHe: network === 'LP'
        ? `המוצא על הקבל (${T('LP')}) — המתח אינו קופץ.`
        : `המוצא על הנגד (${T('HP')}) — ברגע קפיצה המוצא קופץ בדיוק כמו המבוא.`
    });

    // Step 2: Walk through preceding segments if needed
    const nonPre = timeline.segments.filter(s => !s.isPre && s.index <= seg.index);
    for (let k = 0; k < nonPre.length; k++) {
      const s = nonPre[k];
      const isTargetSeg = s.index === seg.index;
      const t0Str = fmtNum(fromSeconds(s.tStart, u), 2) + ' ' + u;

      if (network === 'HP' && Math.abs(s.deltaVi) > 1e-9) {
        const prevSeg = timeline.segments[s.index - 1];
        const voBefore = prevSeg ? prevSeg.VrEndMinus : 0;
        const dViStr = (s.deltaVi >= 0 ? '' : '') + fmtFixed(s.deltaVi, 2) + ' V';
        steps.push({
          titleHe: `קפיצת המוצא ברשת ${T('HP')} בזמן ${L('t₀ = ' + t0Str)}`,
          formulaLtr: `Vo(t₀⁺) = Vo(t₀⁻) + ΔVi`,
          substitutionLtr: `Vo(${t0Str}⁺) = ${fmtFixed(voBefore, 2)} V + (${dViStr})`,
          resultLtr: `Vo(${t0Str}⁺) = ${fmtFixed(s.VrStartPlus, 2)} V`,
          noteHe: `מתח הקבל אינו קופץ (${L('Vc = ' + fmtFixed(s.VcStart, 2) + ' V')}), ולכן כל שינוי המבוא עובר לנגד.`
        });
      }

      if (!isTargetSeg) {
        // Need value at end of this intermediate segment!
        const dtSeg = s.tEnd - s.tStart;
        const tEndStr = fmtNum(fromSeconds(s.tEnd, u), 2) + ' ' + u;
        if (network === 'LP') {
          steps.push({
            titleHe: `מעקב עד סוף הקטע הקודם (${L('t = ' + tEndStr)})`,
            formulaLtr: `Vo = Vf + (V₀ - Vf) · e^(-Δt / τ)`,
            substitutionLtr: `Vo(${tEndStr}) = ${fmtFixed(s.VcTarget, 2)} + (${fmtFixed(s.VcStart, 2)} - ${fmtFixed(s.VcTarget, 2)}) · e^(-${fmtNum(fromSeconds(dtSeg, u), 2)} / ${fmtNum(fromSeconds(s.tau_s, u), 2)})`,
            resultLtr: `Vo(${tEndStr}) = ${fmtFixed(s.VcEnd, 2)} V`,
            noteHe: `ערך זה משמש כמתח ההתחלתי ${L('V₀')} של הקטע הבא.`
          });
        } else {
          steps.push({
            titleHe: `דעיכה עד סוף הקטע הקודם (${L('t = ' + tEndStr)}⁻)`,
            formulaLtr: `Vo(t⁻) = Vo(t₀⁺) · e^(-Δt / τ)`,
            substitutionLtr: `Vo(${tEndStr}⁻) = ${fmtFixed(s.VrStartPlus, 2)} · e^(-${fmtNum(fromSeconds(dtSeg, u), 2)} / ${fmtNum(fromSeconds(s.tau_s, u), 2)})`,
            resultLtr: `Vo(${tEndStr}⁻) = ${fmtFixed(s.VrEndMinus, 2)} V`,
            noteHe: `חובה למצוא ערך זה לפני שמחסרים את הירידה של סוף הדופק!`
          });
        }
      }
    }

    // Step 3: Target instant evaluation
    if (!(network === 'HP' && ev.atJump && ev.dt_s < 1e-9 && side === 'after')) {
      const dtVal = fromSeconds(ev.dt_s, u);
      const tauVal = fromSeconds(seg.tau_s, u);
      const tStr = fmtNum(fromSeconds(t_s, u), 2) + ' ' + u;
      const t0Str = fmtNum(fromSeconds(seg.tStart, u), 2) + ' ' + u;
      if (network === 'LP') {
        steps.push({
          titleHe: `חישוב מתח המוצא בזמן ${L('t = ' + tStr)}`,
          formulaLtr: `Δt = t - t₀  ;  Vo = Vf + (V₀ - Vf) · e^(-Δt / τ)`,
          substitutionLtr: `Δt = ${tStr} - ${t0Str} = ${fmtNum(dtVal, 2)} ${u}\nVo(${tStr}) = ${fmtFixed(seg.VcTarget, 2)} + (${fmtFixed(seg.VcStart, 2)} - ${fmtFixed(seg.VcTarget, 2)}) · e^(-${fmtNum(dtVal, 2)} / ${fmtNum(tauVal, 2)})`,
          resultLtr: `Vo(${tStr}) = ${fmtFixed(ev.VoLP, 2)} V`,
          noteHe: `בדיקת קירכהוף: ${L('Vc + VR = ' + fmtFixed(ev.Vc, 2) + ' + ' + fmtFixed(ev.Vr, 2) + ' = ' + fmtFixed(ev.Vi, 2) + ' V')}.`
        });
      } else {
        steps.push({
          titleHe: `חישוב מתח המוצא בזמן ${L('t = ' + tStr)}${side === 'before' ? ' (לפני קפיצה)' : ''}`,
          formulaLtr: `Δt = t - t₀  ;  Vo = Vo(t₀⁺) · e^(-Δt / τ)`,
          substitutionLtr: `Δt = ${tStr} - ${t0Str} = ${fmtNum(dtVal, 2)} ${u}\nVo(${tStr}) = ${fmtFixed(seg.VrStartPlus, 2)} · e^(-${fmtNum(dtVal, 2)} / ${fmtNum(tauVal, 2)})`,
          resultLtr: `Vo(${tStr}) = ${fmtFixed(ev.VoHP, 2)} V`,
          noteHe: `בדיקת קירכהוף: ${L('Vo(LP) + Vo(HP) = ' + fmtFixed(ev.VoLP, 2) + ' + ' + fmtFixed(ev.VoHP, 2) + ' = ' + fmtFixed(ev.Vi, 2) + ' V')}.`
        });
      }
    }

    return steps;
  }

  /**
   * Solve for all times (or in a specific segment) when Vo equals targetV.
   */
  function solveTimeForVoltage(timeline, network, targetV, segmentIndex = null) {
    const u = timeline.timeUnit;
    const candidates = segmentIndex !== null
      ? timeline.segments.filter(s => s.index === segmentIndex)
      : timeline.segments.filter(s => !s.isPre);

    const hits = [];
    const reasons = [];

    for (const seg of candidates) {
      const res = solveSegmentForVoltage(seg, network, targetV);
      if (res.valid) {
        const t0U = fmtNum(fromSeconds(seg.tStart, u), 2);
        const dtU = fmtNum(fromSeconds(res.dt_s, u), 2);
        const tU = fmtNum(fromSeconds(res.t_s, u), 2);
        const tauU = fmtNum(fromSeconds(seg.tau_s, u), 2);

        const formulaLtr = network === 'LP'
          ? `Δt = τ · ln((V₀ - Vf) / (V - Vf))  ;  t = t₀ + Δt`
          : `Δt = τ · ln(Vo(t₀⁺) / V)  ;  t = t₀ + Δt`;

        const substitutionLtr = network === 'LP'
          ? `Δt = ${tauU} ${u} · ln((${fmtFixed(seg.VcStart, 2)} - ${fmtFixed(seg.VcTarget, 2)}) / (${fmtFixed(targetV, 2)} - ${fmtFixed(seg.VcTarget, 2)})) = ${dtU} ${u}\nt = ${t0U} ${u} + ${dtU} ${u}`
          : `Δt = ${tauU} ${u} · ln(${fmtFixed(seg.VrStartPlus, 2)} / ${fmtFixed(targetV, 2)}) = ${dtU} ${u}\nt = ${t0U} ${u} + ${dtU} ${u}`;

        hits.push({
          segment: seg,
          dt_s: res.dt_s,
          t_s: res.t_s,
          t_display: fromSeconds(res.t_s, u),
          dt_display: fromSeconds(res.dt_s, u),
          unit: u,
          steps: [
            {
              titleHe: `חישוב זמן ההגעה למתח ${L(fmtFixed(targetV, 2) + ' V')} (${seg.labelHe})`,
              formulaLtr,
              substitutionLtr,
              resultLtr: `t = ${tU} ${u}`,
              noteHe: seg.tStart > 0 ? `לא לשכוח להוסיף את זמן תחילת הקטע ${L('t₀ = ' + t0U + ' ' + u)}!` : `בגלל שהקטע מתחיל ב-${L('t₀ = 0')}, מתקבל ${L('t = Δt')}.`
            }
          ]
        });
      } else if (res.reasonHe) {
        reasons.push({ segment: seg, reasonHe: res.reasonHe });
      }
    }

    return { hits, reasons };
  }

  /**
   * Smart Mistake-Diagnosing Answer Validator
   * context = { expected, unit, traps: [{ value, messageHe }], isTimeQuestion, t0Display, dtDisplay }
   */
  function validateStudentAnswer(rawInput, context) {
    const cleaned = String(rawInput || '')
      .trim()
      .replace(/,/g, '.')
      .replace(/−/g, '-') // unicode minus
      .replace(/[^\d.\-+eE]/g, '');

    if (!cleaned || isNaN(Number(cleaned))) {
      return {
        status: 'invalid',
        feedbackHe: 'נא להזין מספר תקין (לדוגמה: ' + L('-4.66') + ' או ' + L('6.52') + ').'
      };
    }

    const val = Number(cleaned);
    const exp = Number(context.expected);
    const absErr = Math.abs(val - exp);
    const relErr = Math.abs(exp) > 1e-6 ? absErr / Math.abs(exp) : absErr;

    // Tolerance: ±2.5% or ±0.05 (allows rounded e^-t/tau table usage!)
    if (absErr <= 0.05 || relErr <= 0.025) {
      const exactStr = fmtFixed(exp, 2) + (context.unit ? ' ' + context.unit : '');
      const note = absErr > 0.009
        ? ` (הערך המדויק הוא ${L(exactStr)} — התשובה התקבלה בטווח העיגול המקובל בבגרות).`
        : '';
      return {
        status: 'correct',
        studentValue: val,
        feedbackHe: `מצוין! תשובה נכונה.${note}`
      };
    }

    // Check explicit question-specific traps
    if (Array.isArray(context.traps)) {
      for (const trap of context.traps) {
        const tErr = Math.abs(val - trap.value);
        const tRel = Math.abs(trap.value) > 1e-6 ? tErr / Math.abs(trap.value) : tErr;
        if (tErr <= 0.08 || tRel <= 0.03) {
          return {
            status: 'wrong',
            studentValue: val,
            feedbackHe: trap.messageHe
          };
        }
      }
    }

    // Generic trap 1: Forgot t0 on time question
    if (context.isTimeQuestion && context.dtDisplay !== undefined && Math.abs(val - context.dtDisplay) <= 0.08) {
      return {
        status: 'wrong',
        studentValue: val,
        feedbackHe: `כמעט! חישבת נכון את ${L('Δt = ' + fmtFixed(context.dtDisplay, 2) + ' ' + (context.unit || ''))} מתחילת הקטע, אבל שכחת להוסיף את זמן תחילת הקטע ${L('t₀')}! הזכור: ${L('t = t₀ + Δt')}.`
      };
    }

    // Generic trap 2: Sign flip
    if (Math.abs(exp) > 0.1 && Math.abs(val + exp) <= Math.max(0.08, Math.abs(exp) * 0.03)) {
      return {
        status: 'wrong',
        studentValue: val,
        feedbackHe: `הגודל המספרי מדויק, אבל הסימן הפוך! בדוק האם המתח חיובי או שלילי (${L('+/-')}).`
      };
    }

    // Generic trap 3: 1000x unit mismatch
    if (Math.abs(exp) > 1e-4 && (Math.abs(val / 1000 - exp) <= Math.abs(exp) * 0.03 || Math.abs(val * 1000 - exp) <= Math.abs(exp) * 0.03)) {
      return {
        status: 'wrong',
        studentValue: val,
        feedbackHe: `טעות בסדר גודל של ${L('×1000')} (יחידות)! בדוק המרה בין ${L('s / ms / µs')} וזכור: ${L('kΩ · µF = ms')}, ו-${L('kΩ · nF = µs')}.`
      };
    }

    return {
      status: 'wrong',
      studentValue: val,
      feedbackHe: `התשובה עדיין אינה תואמת. בדוק את ה-${L('τ')}, את קביעת ${L('V₀')} ו-${L('Vf')} (או את הקפיצה ב-${T('HP')}), ואת הזמן ${L('Δt')} מתחילת הקטע.`
    };
  }

  global.RCEngine = {
    L,
    T,
    escapeHtml,
    toOhms,
    toFarads,
    toSeconds,
    fromSeconds,
    pickBestTimeUnit,
    fmtNum,
    fmtFixed,
    fmtResistance,
    fmtCapacitance,
    fmtTime,
    fmtCurrent,
    compileTimeline,
    evaluateAt,
    buildVoltageDerivation,
    solveTimeForVoltage,
    validateStudentAnswer
  };
})(window);
