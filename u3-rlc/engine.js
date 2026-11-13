/* ==========================================================================
   engine.js — Core AC Steady-State Math Engine for RL, RC, RLC & Resonance
   Unit U3 (שאלון 815381) · Compatible with file:// globals and Node.js tests
   ========================================================================== */
(function (root) {
  'use strict';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function L(str) {
    return `<bdi dir="ltr" class="ltr-inline">${escapeHtml(str)}</bdi>`;
  }

  function T(str) {
    return `<bdi dir="ltr" class="ltr-term">${escapeHtml(str)}</bdi>`;
  }

  function cleanZero(n) {
    return Math.abs(n) < 1e-11 ? 0 : n;
  }

  function fmtNum(val, digits = 2) {
    if (!Number.isFinite(val)) return '—';
    const c = cleanZero(val);
    const fixed = c.toFixed(digits);
    return fixed.replace(/\.?0+$/, '');
  }

  function fmtFixed(val, digits = 2) {
    if (!Number.isFinite(val)) return '—';
    return cleanZero(val).toFixed(digits);
  }

  function toOhms(val, unit) {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    if (unit === 'kΩ' || unit === 'kohm') return n * 1e3;
    if (unit === 'MΩ' || unit === 'Mohm') return n * 1e6;
    return n;
  }

  function toHenrys(val, unit) {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    if (unit === 'µH' || unit === 'uH') return n * 1e-6;
    if (unit === 'mH') return n * 1e-3;
    return n;
  }

  function toFarads(val, unit) {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    if (unit === 'pF') return n * 1e-12;
    if (unit === 'nF') return n * 1e-9;
    if (unit === 'µF' || unit === 'uF') return n * 1e-6;
    if (unit === 'mF') return n * 1e-3;
    return n;
  }

  function toHertz(val, unit) {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    if (unit === 'kHz') return n * 1e3;
    if (unit === 'MHz') return n * 1e6;
    return n;
  }

  function sourceToUeff(val, sourceMode) {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    if (sourceMode === 'Umax' || sourceMode === 'Um') return n / Math.SQRT2;
    if (sourceMode === 'Upp' || sourceMode === 'Up-p') return n / (2 * Math.SQRT2);
    return n;
  }

  function ueffToSource(ueff, sourceMode) {
    if (!Number.isFinite(ueff)) return 0;
    if (sourceMode === 'Umax' || sourceMode === 'Um') return ueff * Math.SQRT2;
    if (sourceMode === 'Upp' || sourceMode === 'Up-p') return 2 * Math.SQRT2 * ueff;
    return ueff;
  }

  function fmtImpedance(ohm) {
    if (!Number.isFinite(ohm)) return '—';
    const a = Math.abs(ohm);
    if (a >= 1e6) return `${fmtNum(ohm / 1e6, 2)} MΩ`;
    if (a >= 1e3) return `${fmtNum(ohm / 1e3, 2)} kΩ`;
    return `${fmtNum(ohm, 2)} Ω`;
  }

  function fmtInductance(H) {
    if (!Number.isFinite(H) || H === 0) return '0 mH';
    const a = Math.abs(H);
    if (a < 1e-3) return `${fmtNum(H * 1e6, 2)} µH`;
    if (a < 1) return `${fmtNum(H * 1e3, 2)} mH`;
    return `${fmtNum(H, 3)} H`;
  }

  function fmtCapacitance(F) {
    if (!Number.isFinite(F) || F === 0) return '0 µF';
    const a = Math.abs(F);
    if (a < 1e-9) return `${fmtNum(F * 1e12, 2)} pF`;
    if (a < 1e-6) return `${fmtNum(F * 1e9, 2)} nF`;
    if (a < 1e-3) return `${fmtNum(F * 1e6, 2)} µF`;
    return `${fmtNum(F * 1e3, 2)} mF`;
  }

  function fmtFreq(Hz) {
    if (!Number.isFinite(Hz)) return '—';
    const a = Math.abs(Hz);
    if (a >= 1e6) return `${fmtNum(Hz / 1e6, 3)} MHz`;
    if (a >= 1e3) return `${fmtNum(Hz / 1e3, 2)} kHz`;
    return `${fmtNum(Hz, 2)} Hz`;
  }

  function fmtTimeSec(s) {
    if (!Number.isFinite(s)) return '—';
    const a = Math.abs(s);
    if (a < 1e-6) return `${fmtNum(s * 1e9, 2)} ns`;
    if (a < 1e-3) return `${fmtNum(s * 1e6, 2)} µs`;
    if (a < 1) return `${fmtNum(s * 1e3, 2)} ms`;
    return `${fmtNum(s, 3)} s`;
  }

  function fmtCurrent(A) {
    if (!Number.isFinite(A)) return '—';
    const a = Math.abs(A);
    if (a < 1) return `${fmtNum(A * 1000, 2)} mA`;
    return `${fmtNum(A, 3)} A`;
  }

  function fmtVoltage(V) {
    if (!Number.isFinite(V)) return '—';
    return `${fmtNum(V, 2)} V`;
  }

  function fmtDeg(deg) {
    if (!Number.isFinite(deg)) return '—';
    const c = cleanZero(deg);
    if (Math.abs(c) < 0.01) return '0°';
    const sign = c > 0 ? '+' : '';
    return `${sign}${fmtNum(c, 2)}°`;
  }

  /**
   * Core solver for series AC RL / RC / RLC / RC_SWITCH circuits.
   */
  function solveACCircuit(cfg) {
    const topology = cfg.topology || 'RLC';
    const switchClosed = Boolean(cfg.switchClosed);
    const inputMode = cfg.inputMode || 'components';
    const freqMode = cfg.freqMode || 'f';

    let f_Hz = Number(cfg.f_Hz);
    let omega = Number(cfg.omega);
    if (freqMode === 'omega' && Number.isFinite(omega) && omega > 0) {
      f_Hz = omega / (2 * Math.PI);
    } else {
      if (!Number.isFinite(f_Hz) || f_Hz <= 0) f_Hz = 1000;
      omega = 2 * Math.PI * f_Hz;
    }
    const T_s = 1 / f_Hz;

    const Ueff = Number.isFinite(Number(cfg.Ueff)) && cfg.sourceVal === undefined
      ? Math.max(0, Number(cfg.Ueff))
      : Math.max(0, sourceToUeff(cfg.sourceVal !== undefined ? cfg.sourceVal : 10, cfg.sourceMode || 'Ueff'));
    const Umax = Ueff * Math.SQRT2;
    const Upp = 2 * Umax;

    const R_ohm = Math.max(1e-6, Number(cfg.R_ohm) || 50);

    let L_H = 0;
    let C_F = 0;
    let XL_raw = 0;
    let XC_raw = 0;

    if (inputMode === 'reactances') {
      XL_raw = (topology === 'RL' || topology === 'RLC') ? Math.max(0, Number(cfg.XL_ohm) || 0) : 0;
      XC_raw = (topology === 'RC' || topology === 'RLC' || topology === 'RC_SWITCH') ? Math.max(0, Number(cfg.XC_ohm) || 0) : 0;
      L_H = XL_raw > 0 ? XL_raw / omega : 0;
      C_F = XC_raw > 0 ? 1 / (omega * XC_raw) : 0;
    } else {
      L_H = (topology === 'RL' || topology === 'RLC') ? Math.max(0, Number(cfg.L_H) || 0) : 0;
      C_F = (topology === 'RC' || topology === 'RLC' || topology === 'RC_SWITCH') ? Math.max(0, Number(cfg.C_F) || 0) : 0;
      XL_raw = L_H > 0 ? omega * L_H : 0;
      XC_raw = C_F > 0 ? 1 / (omega * C_F) : 0;
    }

    const XL_ohm = (topology === 'RL' || topology === 'RLC') ? XL_raw : 0;
    const XC_unshorted = (topology === 'RC' || topology === 'RLC' || topology === 'RC_SWITCH') ? XC_raw : 0;
    const XC_ohm = (topology === 'RC_SWITCH' && switchClosed) ? 0 : XC_unshorted;

    const X_ohm = XL_ohm - XC_ohm;
    const absX_ohm = Math.abs(X_ohm);
    const Z_ohm = Math.hypot(R_ohm, X_ohm);

    const Ieff = Z_ohm > 0 ? Ueff / Z_ohm : 0;
    const Ieff_mA = Ieff * 1000;
    const Imax = Ieff * Math.SQRT2;
    const Imax_mA = Imax * 1000;

    const UR = Ieff * R_ohm;
    const UL = Ieff * XL_ohm;
    const UC = Ieff * XC_ohm;
    const UX = UL - UC;
    const absUX = Math.abs(UX);

    const URmax = UR * Math.SQRT2;
    const ULmax = UL * Math.SQRT2;
    const UCmax = UC * Math.SQRT2;
    const Ucheck = Math.hypot(UR, UX);

    const phi_rad = Math.atan2(X_ohm, R_ohm);
    const phi_deg = (phi_rad * 180) / Math.PI;
    const deltaT_s = (phi_rad / (2 * Math.PI)) * T_s;

    let character = 'ohmic';
    let characterShort = 'אוהמי (תהודה)';
    let characterHe = 'אוהמי / תהודה (מופע אחד: U ו-I באותו פאזה)';
    if (phi_deg > 0.05) {
      character = 'inductive';
      characterShort = 'השראי (ELI)';
      characterHe = 'השראי — המתח מקדים את הזרם (ELI, φ > 0°)';
    } else if (phi_deg < -0.05) {
      character = 'capacitive';
      characterShort = 'קיבולי (ICE)';
      characterHe = 'קיבולי — הזרם מקדים את המתח (ICE, φ < 0°)';
    }

    const hasResonance = topology === 'RLC' && L_H > 0 && C_F > 0;
    let f0_Hz = null;
    let omega0 = null;
    let XL0_ohm = null;
    let Ieff_res = null;
    let Ieff_res_mA = null;
    let UL_res = null;
    let UC_res = null;
    let Q_factor = null;
    if (hasResonance) {
      omega0 = 1 / Math.sqrt(L_H * C_F);
      f0_Hz = omega0 / (2 * Math.PI);
      XL0_ohm = omega0 * L_H;
      Ieff_res = Ueff / R_ohm;
      Ieff_res_mA = Ieff_res * 1000;
      UL_res = Ieff_res * XL0_ohm;
      UC_res = UL_res;
      Q_factor = XL0_ohm / R_ohm;
    }

    const hasSwitch = topology === 'RC_SWITCH';
    let closedSummary = null;
    let openSummary = null;
    if (hasSwitch) {
      const zOpen = Math.hypot(R_ohm, XC_unshorted);
      const iOpen = Ueff / zOpen;
      const iClosed = Ueff / R_ohm;
      closedSummary = {
        Z_ohm: R_ohm,
        Ieff: iClosed,
        Ieff_mA: iClosed * 1000,
        UR: Ueff,
        UC: 0,
        phi_deg: 0
      };
      openSummary = {
        Z_ohm: zOpen,
        Ieff: iOpen,
        Ieff_mA: iOpen * 1000,
        UR: iOpen * R_ohm,
        UC: iOpen * XC_unshorted,
        phi_deg: (-Math.atan2(XC_unshorted, R_ohm) * 180) / Math.PI
      };
    }

    return {
      topology,
      switchClosed,
      inputMode,
      freqMode,
      f_Hz,
      T_s,
      omega,
      Ueff,
      Umax,
      Upp,
      R_ohm,
      L_H,
      C_F,
      XL_ohm,
      XC_unshorted,
      XC_ohm,
      X_ohm,
      absX_ohm,
      Z_ohm,
      Ieff,
      Ieff_mA,
      Imax,
      Imax_mA,
      UR,
      UL,
      UC,
      UX,
      absUX,
      URmax,
      ULmax,
      UCmax,
      Ucheck,
      phi_rad,
      phi_deg,
      deltaT_s,
      character,
      characterShort,
      characterHe,
      hasResonance,
      f0_Hz,
      omega0,
      XL0_ohm,
      Ieff_res,
      Ieff_res_mA,
      UL_res,
      UC_res,
      Q_factor,
      hasSwitch,
      closedSummary,
      openSummary
    };
  }

  /**
   * Evaluate instantaneous waveforms u(t), i(t), uR(t), uL(t), uC(t)
   * using u(t) = Umax * sin(omega * t) as phase zero reference.
   */
  function evalWaveformsAt(sol, t_s) {
    const wt = sol.omega * t_s;
    const u = sol.Umax * Math.sin(wt);
    const i = sol.Imax * Math.sin(wt - sol.phi_rad);
    const uR = sol.URmax * Math.sin(wt - sol.phi_rad);
    const uL = sol.ULmax * Math.sin(wt - sol.phi_rad + Math.PI / 2);
    const uC = sol.UCmax * Math.sin(wt - sol.phi_rad - Math.PI / 2);
    return {
      t_s,
      u,
      i,
      i_mA: i * 1000,
      uR,
      uL,
      uC
    };
  }

  /**
   * Sample I(f) and Z(f) curves around current f or resonance f0.
   */
  function sampleFrequencySweep(sol, numPoints = 180) {
    let fMin = sol.f_Hz * 0.15;
    let fMax = sol.f_Hz * 2.8;
    if (sol.hasResonance && sol.f0_Hz > 0) {
      fMin = Math.min(sol.f0_Hz * 0.18, sol.f_Hz * 0.45);
      fMax = Math.max(sol.f0_Hz * 2.35, sol.f_Hz * 1.35);
    }
    fMin = Math.max(1e-3, fMin);
    if (fMax <= fMin * 1.1) fMax = fMin * 3;

    const points = [];
    let iMaxPlot_mA = 0;
    let zMaxPlot = 0;
    for (let k = 0; k <= numPoints; k++) {
      const f = fMin + ((fMax - fMin) * k) / numPoints;
      const w = 2 * Math.PI * f;
      const XL = (sol.topology === 'RL' || sol.topology === 'RLC') ? w * sol.L_H : 0;
      let XC = 0;
      if ((sol.topology === 'RC' || sol.topology === 'RLC' || sol.topology === 'RC_SWITCH') && sol.C_F > 0) {
        if (!(sol.topology === 'RC_SWITCH' && sol.switchClosed)) {
          XC = 1 / (w * sol.C_F);
        }
      }
      const X = XL - XC;
      const Z = Math.hypot(sol.R_ohm, X);
      const I_mA = Z > 0 ? (sol.Ueff / Z) * 1000 : 0;
      const phi_deg = (Math.atan2(X, sol.R_ohm) * 180) / Math.PI;
      if (I_mA > iMaxPlot_mA) iMaxPlot_mA = I_mA;
      if (Z > zMaxPlot) zMaxPlot = Z;
      points.push({ f, XL, XC, X, Z, I_mA, phi_deg });
    }
    return {
      fMin,
      fMax,
      points,
      iMaxPlot_mA: Math.max(iMaxPlot_mA, sol.Ieff_mA * 1.1, 1e-3),
      zMaxPlot: Math.max(zMaxPlot, sol.Z_ohm * 1.1, 1)
    };
  }

  /**
   * Format u(t) = Um·sin(ω·t) and explain whether input is already Ueff (RMS) or needs √2 conversion.
   */
  function formatSineEquation(sol, sourceMode = 'Ueff', rawSourceVal = null) {
    const cleanUeff = Math.round(sol.Ueff);
    const isIntUeff = Math.abs(sol.Ueff - cleanUeff) < 1e-3 && cleanUeff > 0;
    const umSymbolic = isIntUeff ? `${cleanUeff}·√2` : fmtNum(sol.Umax, 2);
    const umNumeric = fmtNum(sol.Umax, 2);

    const piMultiple = sol.omega / Math.PI;
    const cleanPi = Math.round(piMultiple);
    const isCleanPi = Math.abs(piMultiple - cleanPi) < 1e-2 && cleanPi > 0;
    const omegaDisplay = isCleanPi ? `${cleanPi === 1 ? '' : cleanPi}π` : fmtNum(sol.omega, 1);

    const eqDisplay = `u(t) = ${umSymbolic} · sin(${omegaDisplay} · t)  [V]`;
    const ueffStr = `${fmtNum(sol.Ueff, 2)} V`;
    const fStr = fmtFreq(sol.f_Hz);
    const valShown = rawSourceVal !== null ? fmtNum(Number(rawSourceVal), 2) : fmtNum(ueffToSource(sol.Ueff, sourceMode), 2);

    let modeRuleHtml = '';
    if (sourceMode === 'Ueff') {
      modeRuleHtml = `מצב ${T('U (RMS)')}: הערך שהזנת (${L(`${valShown} V`)}) הוא <strong>כבר מתח אפקטיבי</strong> (כמו קריאת מד-מתח) — <strong>אין לחלק ב-${L('√2')}!</strong> במשוואת הזמן משרעת השיא היא ${L(`Um = U·√2 = ${umNumeric} V`)}.`;
    } else if (sourceMode === 'Umax') {
      modeRuleHtml = `מצב ${T('Um')}: הערך שהזנת (${L(`${valShown} V`)}) הוא <strong>משרעת השיא לפני ה-${T('sin')}</strong> במשוואת ${L('u(t)')}. לכן מחלקים ב-${L('√2')}: ${L(`Ueff = ${valShown} / √2 = ${ueffStr}`)}.`;
    } else {
      modeRuleHtml = `מצב ${T('Up-p')}: הערך שהזנת (${L(`${valShown} V`)}) הוא <strong>שיא-לשיא</strong>. לכן מחלקים ב-${L('2·√2')}: ${L(`Ueff = ${valShown} / (2√2) = ${ueffStr}`)}.`;
    }

    return {
      eqDisplay,
      umSymbolic,
      umNumeric,
      omegaDisplay,
      ueffStr,
      fStr,
      modeRuleHtml
    };
  }

  /**
   * Return Ammeter (series) & Voltmeter (parallel) readings and Ohm's law ratio for a target component.
   */
  function getMeterReadout(sol, voltmeterTarget = 'ALL') {
    const hasL = sol.topology === 'RL' || sol.topology === 'RLC';
    const hasC = sol.topology === 'RC' || sol.topology === 'RLC' || sol.topology === 'RC_SWITCH';
    let target = voltmeterTarget || 'ALL';
    if (target === 'UL' && !hasL) target = 'U';
    if (target === 'UC' && !hasC) target = 'U';

    const ammeterStr = `I = ${fmtCurrent(sol.Ieff)}`;
    let voltmeterLabel = 'כל מדי המתח';
    let voltmeterValStr = `U = ${fmtVoltage(sol.Ueff)}`;
    let ratioFormulaStr = `Z = U / I = ${fmtImpedance(sol.Z_ohm)}`;
    let explainHtml = '';

    if (target === 'U') {
      voltmeterLabel = 'מד-מתח על המקור (U)';
      voltmeterValStr = `${fmtVoltage(sol.Ueff)}`;
      ratioFormulaStr = `Z = U / I = ${fmtNum(sol.Ueff, 2)} / ${fmtNum(sol.Ieff, 4)} = ${fmtImpedance(sol.Z_ohm)}`;
      explainHtml = `מד-הזרם (${L('A')}) מחובר <strong>בטור</strong> ומודד ${L(fmtCurrent(sol.Ieff))}. מד-המתח (${L('V')}) מחובר <strong>במקביל למקור</strong> ומודד את המתח האפקטיבי הכולל ${L(voltmeterValStr)}, לכן היחס נותן את העכבה הכוללת ${L(`Z = U / I = ${fmtImpedance(sol.Z_ohm)}`)}.`;
    } else if (target === 'UR') {
      voltmeterLabel = 'מד-מתח על הנגד (UR)';
      voltmeterValStr = `${fmtVoltage(sol.UR)}`;
      ratioFormulaStr = `R = UR / I = ${fmtNum(sol.UR, 2)} / ${fmtNum(sol.Ieff, 4)} = ${fmtImpedance(sol.R_ohm)}`;
      explainHtml = `מד-המתח (${L('V')}) מחובר <strong>במקביל לנגד</strong> ומודד ${L(`UR = ${voltmeterValStr}`)} (ערך אפקטיבי!). מחלקים בקריאת מד-הזרם שבטור: ${L(`R = UR / I = ${fmtImpedance(sol.R_ohm)}`)}.`;
    } else if (target === 'UL') {
      voltmeterLabel = 'מד-מתח על הסליל (UL)';
      voltmeterValStr = `${fmtVoltage(sol.UL)}`;
      ratioFormulaStr = `XL = UL / I = ${fmtNum(sol.UL, 2)} / ${fmtNum(sol.Ieff, 4)} = ${fmtImpedance(sol.XL_ohm)}`;
      explainHtml = `מד-המתח (${L('V')}) מחובר <strong>במקביל למשרן</strong> ומודד ${L(`UL = ${voltmeterValStr}`)}. חילוק בקריאת מד-הזרם שבטור נותן את היגב הסליל: ${L(`XL = UL / I = ${fmtImpedance(sol.XL_ohm)}`)}.`;
    } else if (target === 'UC') {
      voltmeterLabel = 'מד-מתח על הקבל (UC)';
      voltmeterValStr = `${fmtVoltage(sol.UC)}`;
      ratioFormulaStr = `XC = UC / I = ${fmtNum(sol.UC, 2)} / ${fmtNum(sol.Ieff, 4)} = ${fmtImpedance(sol.XC_ohm)}`;
      explainHtml = sol.topology === 'RC_SWITCH' && sol.switchClosed
        ? `המפסק ${L('S')} סגור ומקצר את הקבל — לכן מד-המתח במקביל לקבל מורה ${L('UC = 0 V')}!`
        : `מד-המתח (${L('V')}) מחובר <strong>במקביל לקבל</strong> ומודד ${L(`UC = ${voltmeterValStr}`)}. חילוק בקריאת מד-הזרם שבטור נותן את היגב הקבל: ${L(`XC = UC / I = ${fmtImpedance(sol.XC_ohm)}`)}.`;
    } else {
      const scalarSum = sol.UR + sol.UL + sol.UC;
      explainHtml = `מד-הזרם (${L('A')}) תמיד <strong>בטור</strong>, ומד-המתח (${L('V')}) תמיד <strong>במקביל</strong> לרכיב הנמדד. כל המדים ב-${T('AC')} מורים <strong>ערכים אפקטיביים (${T('RMS')})</strong>. שימו לב: סכום קריאות המדים הוא ${L(`${fmtNum(scalarSum, 2)} V`)}, אך החיבור הפאזורי הוא ${L(`√(UR² + (UL−UC)²) = ${fmtVoltage(sol.Ueff)}`)}.`;
    }

    return {
      target,
      ammeterStr,
      voltmeterLabel,
      voltmeterValStr,
      ratioFormulaStr,
      explainHtml
    };
  }

  /**
   * Build explicit step-by-step Resonance derivation starting from Reactance Equality (XL = XC).
   */
  function buildResonanceEqualityDerivation(sol) {
    if (!sol.hasResonance) return null;
    const f0Str = fmtFreq(sol.f0_Hz);
    const omega0Str = `${fmtNum(sol.omega0, 2)} rad/s`;
    const xl0Str = fmtImpedance(sol.XL0_ohm);
    const imaxStr = fmtCurrent(sol.Ieff_res);
    const ulResStr = fmtVoltage(sol.UL_res);
    const isNearRes = Math.abs(sol.f_Hz - sol.f0_Hz) <= Math.max(0.5, sol.f0_Hz * 0.012);

    const leadExplainHtml = `בתהודה ההיגבים משתווים (${L('XL = XC')}), כופלים בהצלבה את משוואת השוויון ${L('2π·f₀·L = 1/(2π·f₀·C)')} ומבודדים את ${L('f₀')} ביחידות יסוד (${L('H, F')}):`;

    const stepsLines = [
      `1) Resonance condition:  XL = XC   ⇒   UL = UC  (180° opposite, UX = 0 V)`,
      `2) Reactance equality:   2π·f₀·L = 1 / (2π·f₀·C)`,
      `3) Isolate f₀:           (2π·f₀)² = 1 / (L·C)   ⇒   f₀ = 1 / (2π·√(L·C))`,
      `4) MKS (H, F):           f₀ = 1 / (2π·√(${fmtNum(sol.L_H, 5)} × ${sol.C_F.toExponential(3)})) = ${f0Str}   (ω₀ = ${omega0Str})`,
      `5) At f₀ (XL = XC):      XL(f₀) = ${xl0Str} , XC(f₀) = ${xl0Str}  ⇒  X = 0 Ω , Zmin = R = ${fmtImpedance(sol.R_ohm)} , Imax = ${imaxStr}`
    ].join('\n');

    const reverseTipHtml = `<strong>בידוד רכיב חסר מתוך ${L('XL = XC')}:</strong> אם נתון תדר התהודה ${L(`f₀ = ${f0Str}`)} וצריך למצוא את ${L('C')} (או ${L('L')}), מחשבים קודם ${L(`XL = 2π·f₀·L = ${xl0Str}`)}, קובעים ${L(`XC = XL = ${xl0Str}`)}, ומחלצים ${L(`C = 1 / (2π·f₀·XC) = ${fmtCapacitance(sol.C_F)}`)}.`;

    return {
      f0Str,
      omega0Str,
      xl0Str,
      imaxStr,
      ulResStr,
      isNearRes,
      leadExplainHtml,
      stepsLines,
      reverseTipHtml
    };
  }

  /**
   * Build step-by-step Bagrut derivation cards for the current lab circuit.
   */
  function buildFullDerivation(sol) {
    const steps = [];
    const sineInfo = formatSineEquation(sol, 'Ueff', sol.Ueff);

    // Step 1: Source & frequency
    steps.push({
      badge: 'שלב 1',
      titleHtml: `מתח אפקטיבי ${L('U')}, משוואת ${L('u(t)')} ותדירות ${L('f, ω')}`,
      explanationHtml: `אם נתון ${L('U')} או קריאת מד-מתח — הוא כבר אפקטיבי! רק אם נתונה משוואת הזמן ${L('u(t) = Um·sin(ω·t)')}, מחלקים ${L('Um / √2')} ומחלצים ${L('f = ω / (2π)')}.`,
      mathLines: [
        `${sineInfo.eqDisplay}   ⇒   Um = ${sineInfo.umNumeric} V`,
        `Ueff = Um / √2 = ${fmtNum(sol.Ueff, 2)} V   |   f = ${fmtFreq(sol.f_Hz)}   |   ω = 2πf = ${fmtNum(sol.omega, 2)} rad/s`
      ].join('\n')
    });

    // Step 2: Reactances
    const reactLines = [`R = ${fmtImpedance(sol.R_ohm)}`];
    if (sol.topology === 'RL' || sol.topology === 'RLC') {
      reactLines.push(`XL = 2π·f·L = ω·L = ${fmtNum(sol.omega, 1)} × ${fmtInductance(sol.L_H)} = ${fmtImpedance(sol.XL_ohm)}`);
    }
    if (sol.topology === 'RC' || sol.topology === 'RLC' || sol.topology === 'RC_SWITCH') {
      if (sol.topology === 'RC_SWITCH' && sol.switchClosed) {
        reactLines.push(`S closed (shorted C)  ⇒  XC(active) = 0 Ω  (C unshorted XC = ${fmtImpedance(sol.XC_unshorted)})`);
      } else {
        reactLines.push(`XC = 1 / (2π·f·C) = 1 / (${fmtNum(sol.omega, 1)} × ${fmtCapacitance(sol.C_F)}) = ${fmtImpedance(sol.XC_ohm)}`);
      }
    }
    if (sol.topology === 'RLC') {
      reactLines.push(`X = XL − XC = ${fmtNum(sol.XL_ohm, 2)} − ${fmtNum(sol.XC_ohm, 2)} = ${fmtNum(sol.X_ohm, 2)} Ω`);
    }
    steps.push({
      badge: 'שלב 2',
      titleHtml: `חישוב ההיגבים ${L('XL, XC')} וההיגב השקול ${L('X')}`,
      explanationHtml: `היגב המשרן ${L('XL')} עולה עם התדר והוא במופע ${L('+90°')}, ואילו היגב הקבל ${L('XC')} יורד עם התדר והוא במופע הפוך ${L('-90°')}.`,
      mathLines: reactLines.join('\n')
    });

    // Step 3: Impedance Z & phase φ
    steps.push({
      badge: 'שלב 3',
      titleHtml: `משולש עכבות (${L('Z')}) וזווית המופע (${L('φ')})`,
      explanationHtml: `בדיאגרמת המחוגים ובמשולש העכבות: ${L('R')} בציר האופקי ו-${L('X = XL - XC')} בציר האנכי. הזווית חיובית במעגל השראי ושלילית בקיבולי.`,
      mathLines: [
        `Z = √(R² + X²) = √(${fmtNum(sol.R_ohm, 2)}² + (${fmtNum(sol.X_ohm, 2)})²) = ${fmtImpedance(sol.Z_ohm)}`,
        `φ = tan⁻¹(X / R) = tan⁻¹(${fmtNum(sol.X_ohm, 2)} / ${fmtNum(sol.R_ohm, 2)}) = ${fmtDeg(sol.phi_deg)}`
      ].join('\n')
    });

    // Step 4: Current & meter readings + Pythagorean check
    const vLines = [
      `Ammeter (in series): I = U / Z = ${fmtNum(sol.Ueff, 2)} / ${fmtNum(sol.Z_ohm, 2)} = ${fmtCurrent(sol.Ieff)}`,
      `Voltmeter on R: UR = I·R = ${fmtVoltage(sol.UR)}`
    ];
    if (sol.topology === 'RL' || sol.topology === 'RLC') {
      vLines.push(`Voltmeter on L: UL = I·XL = ${fmtVoltage(sol.UL)}`);
    }
    if (sol.topology === 'RC' || sol.topology === 'RLC' || sol.topology === 'RC_SWITCH') {
      vLines.push(`Voltmeter on C: UC = I·XC = ${fmtVoltage(sol.UC)}`);
    }
    vLines.push(`Phasor check: √(UR² + (UL − UC)²) = √(${fmtNum(sol.UR, 2)}² + (${fmtNum(sol.UX, 2)})²) = ${fmtVoltage(sol.Ucheck)}`);
    steps.push({
      badge: 'שלב 4',
      titleHtml: `קריאות מד-זרם (${L('I')}) ומדי-מתח על הרכיבים ובדיקת פאזורים`,
      explanationHtml: `מד-הזרם בטור מודד את הזרם המשותף לכל הרכיבים, וכל מד-מתח במקביל מודד מתח אפקטיבי על רכיב בודד. חיבורם נעשה רק וקטורית!`,
      mathLines: vLines.join('\n')
    });

    // Step 5: Resonance or Switch comparison
    if (sol.hasResonance) {
      const resDeriv = buildResonanceEqualityDerivation(sol);
      steps.push({
        badge: 'תהודה XL=XC',
        titleHtml: `חישוב תדר תהודה ${L('f₀')} משוויון ההיגבים ${L('XL = XC')}`,
        explanationHtml: `בתהודה ההיגבים שווים (${L('XL = XC')}), ולכן בפאזורים ${L('UL')} ו-${L('UC')} שווים ומנוגדים ומבטלים זה את זה ← ${L('U = UR, φ = 0°, Zmin = R')}.`,
        mathLines: [
          resDeriv.stepsLines,
          `At f₀:  UL = UC = ${resDeriv.ulResStr}  (Q = XL0 / R = ${fmtNum(sol.Q_factor, 2)})`
        ].join('\n')
      });
    } else if (sol.hasSwitch && sol.closedSummary && sol.openSummary) {
      steps.push({
        badge: 'מפסק S',
        titleHtml: `השוואת מצבי המפסק ${L('S')} במקביל לקבל`,
        explanationHtml: `כשהמפסק סגור הקבל מקוצר (${L('UC = 0 V, Z = R')}), וכשהוא פתוח הקבל נכנס לטור עם הנגד והזרם קטן כי ${L('Z > R')}.`,
        mathLines: [
          `S CLOSED (shorted C):  Z = R = ${fmtImpedance(sol.closedSummary.Z_ohm)}   |   I = ${fmtCurrent(sol.closedSummary.Ieff)}`,
          `S OPEN   (RC series):  Z = ${fmtImpedance(sol.openSummary.Z_ohm)}   |   I = ${fmtCurrent(sol.openSummary.Ieff)}`
        ].join('\n')
      });
    }

    return steps;
  }

  /**
   * Smart student numerical validator with trap detection for U3 AC circuits.
   */
  function validateStudentAnswer(rawInput, expected, unit, trapChecks = []) {
    const cleaned = String(rawInput || '').trim().replace(/−/g, '-').replace(/,/g, '.');
    if (!cleaned) {
      return { status: 'empty', msgHtml: 'הזן ערך מספרי לבדיקה.' };
    }
    const val = Number(cleaned);
    if (!Number.isFinite(val)) {
      return { status: 'invalid', msgHtml: 'הערך שהוזן אינו מספר תקין.' };
    }

    const absTol = Math.max(0.05, Math.abs(expected) * 0.024);
    if (Math.abs(val - expected) <= absTol) {
      return {
        status: 'correct',
        val,
        msgHtml: `מצוין! התשובה נכונה (${L(`${fmtNum(expected, 2)} ${unit}`)}).`
      };
    }

    // Check opposite sign trap (e.g. +phi instead of -phi in RC / capacitive RLC)
    if (Math.abs(expected) > 0.5 && Math.abs(val + expected) <= absTol) {
      return {
        status: 'wrong',
        val,
        msgHtml: `שים לב לסימן! הגודל נכון, אך במעגל בעל אופי ${expected < 0 ? 'קיבולי (הזרם מקדים את המתח — ICE)' : 'השראי (המתח מקדים את הזרם — ELI)'} הזווית חייבת להיות ${expected < 0 ? 'שלילית' : 'חיובית'}: ${L(`${fmtNum(expected, 2)} ${unit}`)}.`
      };
    }

    // Custom pedagogical traps passed from the exercise
    for (let i = 0; i < trapChecks.length; i++) {
      const trap = trapChecks[i];
      if (!Number.isFinite(trap.val)) continue;
      const tTol = Math.max(0.06, Math.abs(trap.val) * 0.03);
      if (Math.abs(val - trap.val) <= tTol) {
        return {
          status: 'wrong',
          val,
          msgHtml: trap.msgHtml
        };
      }
    }

    // Check powers of 10 unit conversion mistake (x1000, /1000, x1e6)
    const factors = [
      { mult: 1000, hint: 'פי 1000 מהנדרש — בדוק המרת יחידות (למשל mA ↔ A, mH ↔ H, kΩ ↔ Ω, kHz ↔ Hz).' },
      { mult: 0.001, hint: 'קטן פי 1000 מהנדרש — בדוק המרת יחידות (למשל mA ↔ A, kHz ↔ Hz).' },
      { mult: 1e6, hint: 'גדול פי 10⁶ — בדוק המרת µF ↔ F או nF ↔ µF.' },
      { mult: 1e-6, hint: 'קטן פי 10⁻⁶ — בדוק המרת µF ↔ F.' }
    ];
    for (let i = 0; i < factors.length; i++) {
      const f = factors[i];
      if (Math.abs(expected) > 1e-9 && Math.abs(val - expected * f.mult) <= Math.max(0.05, Math.abs(expected * f.mult) * 0.03)) {
        return {
          status: 'wrong',
          val,
          msgHtml: `טעות בהמרת יחידות: ${f.hint}`
        };
      }
    }

    return {
      status: 'wrong',
      val,
      msgHtml: `לא מדויק עדיין. בדוק שוב את היחידות, את סימן ${L('X = XL - XC')} ואת חיבור פיתגורס ${L('√(R² + X²)')}.`
    };
  }

  const ACEngine = {
    escapeHtml,
    L,
    T,
    cleanZero,
    fmtNum,
    fmtFixed,
    toOhms,
    toHenrys,
    toFarads,
    toHertz,
    sourceToUeff,
    ueffToSource,
    fmtImpedance,
    fmtInductance,
    fmtCapacitance,
    fmtFreq,
    fmtTimeSec,
    fmtCurrent,
    fmtVoltage,
    fmtDeg,
    solveACCircuit,
    evalWaveformsAt,
    sampleFrequencySweep,
    formatSineEquation,
    getMeterReadout,
    buildResonanceEqualityDerivation,
    buildFullDerivation,
    validateStudentAnswer
  };

  root.ACEngine = ACEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ACEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
