/**
 * visuals.js — High-DPI Canvas renderers for RC Circuits & Dual-Channel Synchronized Oscilloscopes
 * Strict BiDi canvas text helpers: drawLtrText for math/units/signed numbers, drawRtlText for pure Hebrew.
 */
(function (global) {
  'use strict';

  const E = global.RCEngine;

  function getPalette() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      return {
        bg: '#f8fafc',
        panelBg: '#ffffff',
        grid: '#e2e8f0',
        gridZero: '#94a3b8',
        axisText: '#334155',
        wire: '#334155',
        component: '#0f172a',
        vi: '#0284c7',
        lp: '#059669',
        hp: '#e11d48',
        gold: '#d97706',
        muted: '#64748b',
        particle: '#0284c7',
        posCharge: '#e11d48',
        negCharge: '#0284c7',
        switchOpen: '#d97706'
      };
    }
    return {
      bg: '#09101f',
      panelBg: '#0f182d',
      grid: '#1d2d4a',
      gridZero: '#4a628d',
      axisText: '#a8bddf',
      wire: '#9bb3d8',
      component: '#eef4ff',
      vi: '#38bdf8',
      lp: '#34d399',
      hp: '#fb7185',
      gold: '#fbbf24',
      muted: '#7f96bd',
      particle: '#38bdf8',
      posCharge: '#fb7185',
      negCharge: '#38bdf8',
      switchOpen: '#fbbf24'
    };
  }

  function setupHiDPI(canvas, targetHeight) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssWidth = Math.max(260, canvas.parentElement ? canvas.parentElement.clientWidth : 640);
    const cssHeight = targetHeight || Number(canvas.getAttribute('data-height')) || 280;
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: cssWidth, h: cssHeight };
  }

  /** Always render numbers, negative signs, units, and math symbols strictly LTR */
  function drawLtrText(ctx, text, x, y, align = 'center', color = null, font = '600 12px "JetBrains Mono", Consolas, monospace') {
    ctx.save();
    ctx.direction = 'ltr';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (font) ctx.font = font;
    if (color) ctx.fillStyle = color;
    ctx.fillText(String(text), x, y);
    ctx.restore();
  }

  /** Render pure Hebrew labels strictly RTL */
  function drawRtlText(ctx, text, x, y, align = 'right', color = null, font = '600 13px "Heebo", "Segoe UI", Arial, sans-serif') {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (font) ctx.font = font;
    if (color) ctx.fillStyle = color;
    ctx.fillText(String(text), x, y);
    ctx.restore();
  }

  function drawResistorH(ctx, cx, cy, len, amp, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const zig = 6;
    const step = len / zig;
    const startX = cx - len / 2;
    ctx.moveTo(startX, cy);
    for (let i = 0; i < zig; i++) {
      const x1 = startX + step * (i + 0.25);
      const x2 = startX + step * (i + 0.75);
      const y1 = cy + (i % 2 === 0 ? -amp : amp);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y1 * -1 + 2 * cy);
    }
    ctx.lineTo(startX + len, cy);
    ctx.stroke();
    ctx.restore();
  }

  function drawResistorV(ctx, cx, cy, len, amp, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const zig = 6;
    const step = len / zig;
    const startY = cy - len / 2;
    ctx.moveTo(cx, startY);
    for (let i = 0; i < zig; i++) {
      const y1 = startY + step * (i + 0.25);
      const y2 = startY + step * (i + 0.75);
      const x1 = cx + (i % 2 === 0 ? -amp : amp);
      ctx.lineTo(x1, y1);
      ctx.lineTo(2 * cx - x1, y2);
    }
    ctx.lineTo(cx, startY + len);
    ctx.stroke();
    ctx.restore();
  }

  function drawCapacitorH(ctx, cx, cy, gap, plateH, color, vcNorm, pal) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - gap / 2, cy - plateH / 2);
    ctx.lineTo(cx - gap / 2, cy + plateH / 2);
    ctx.moveTo(cx + gap / 2, cy - plateH / 2);
    ctx.lineTo(cx + gap / 2, cy + plateH / 2);
    ctx.stroke();

    // Charge indicators on plates
    const absN = Math.min(1, Math.abs(vcNorm || 0));
    const count = Math.round(absN * 3);
    if (count > 0) {
      const leftSign = vcNorm >= 0 ? '+' : '−';
      const rightSign = vcNorm >= 0 ? '−' : '+';
      const leftCol = vcNorm >= 0 ? pal.posCharge : pal.negCharge;
      const rightCol = vcNorm >= 0 ? pal.negCharge : pal.posCharge;
      for (let i = 0; i < count; i++) {
        const py = cy - 10 + i * 10;
        drawLtrText(ctx, leftSign, cx - gap / 2 - 9, py, 'center', leftCol, '700 12px monospace');
        drawLtrText(ctx, rightSign, cx + gap / 2 + 9, py, 'center', rightCol, '700 12px monospace');
      }
    }
    ctx.restore();
  }

  function drawCapacitorV(ctx, cx, cy, gap, plateW, color, vcNorm, pal) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - plateW / 2, cy - gap / 2);
    ctx.lineTo(cx + plateW / 2, cy - gap / 2);
    ctx.moveTo(cx - plateW / 2, cy + gap / 2);
    ctx.lineTo(cx + plateW / 2, cy + gap / 2);
    ctx.stroke();

    // Charge indicators on top/bottom plates
    const absN = Math.min(1, Math.abs(vcNorm || 0));
    const count = Math.round(absN * 4);
    if (count > 0) {
      const topSign = vcNorm >= 0 ? '+' : '−';
      const botSign = vcNorm >= 0 ? '−' : '+';
      const topCol = vcNorm >= 0 ? pal.posCharge : pal.negCharge;
      const botCol = vcNorm >= 0 ? pal.negCharge : pal.posCharge;
      for (let i = 0; i < count; i++) {
        const px = cx - (count - 1) * 6 + i * 12;
        drawLtrText(ctx, topSign, px, cy - gap / 2 - 9, 'center', topCol, '700 12px monospace');
        drawLtrText(ctx, botSign, px, cy + gap / 2 + 9, 'center', botCol, '700 12px monospace');
      }
    }
    ctx.restore();
  }

  function drawTerminalCircle(ctx, x, y, fill, stroke) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
  }

  function drawArrowUp(ctx, x, yBottom, yTop, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, yBottom);
    ctx.lineTo(x, yTop);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, yTop - 4);
    ctx.lineTo(x - 4.5, yTop + 5);
    ctx.lineTo(x + 4.5, yTop + 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw live RC circuit schematic (LP, HP, BOTH, or Switch R1||R2)
   * state = { network, R1_ohm, R2_ohm, C_F, hasSwitch, switchClosed, Vi, Vc, Vr, I_A, vMax, animPhase, compact }
   */
  function drawCircuit(canvas, state, heightOverride) {
    const compact = Boolean(state && state.compact);
    const hTarget = heightOverride || (compact ? 155 : 225);
    const { ctx, w, h } = setupHiDPI(canvas, hTarget);
    const pal = getPalette();

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);

    if (state.network === 'BOTH' && !compact && w >= 540) {
      drawSingleSchematic(ctx, 0, 0, w / 2 - 4, h, { ...state, network: 'LP' }, pal, false);
      ctx.strokeStyle = pal.grid;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2, 12);
      ctx.lineTo(w / 2, h - 12);
      ctx.stroke();
      drawSingleSchematic(ctx, w / 2 + 4, 0, w / 2 - 4, h, { ...state, network: 'HP' }, pal, false);
      return;
    }

    const net = state.network === 'BOTH' ? 'LP' : state.network;
    drawSingleSchematic(ctx, 0, 0, w, h, { ...state, network: net }, pal, compact);
  }

  function drawSingleSchematic(ctx, ox, oy, w, h, st, pal, compact) {
    const isLP = st.network === 'LP';
    const xLeft = ox + (compact ? 42 : 70);
    const xRight = ox + w - (compact ? 42 : 70);
    const yTop = oy + (compact ? 38 : 54);
    const yBot = oy + h - (compact ? 26 : 38);
    const xSeries = xLeft + (xRight - xLeft) * 0.44;
    const xShunt = xLeft + (xRight - xLeft) * 0.76;
    const yMid = (yTop + yBot) / 2;

    // Header badge inside schematic
    if (!compact) {
      const title = isLP ? 'רשת LP — המוצא על הקבל' : 'רשת HP — המוצא על הנגד';
      const titleCol = isLP ? pal.lp : pal.hp;
      drawRtlText(ctx, title, ox + w - 16, oy + 18, 'right', titleCol, '700 13px "Heebo", sans-serif');
    }

    // Wires
    ctx.strokeStyle = pal.wire;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    // Top wire left -> series element
    ctx.moveTo(xLeft, yTop);
    ctx.lineTo(xSeries - 26, yTop);
    // Series element -> right terminal
    ctx.moveTo(xSeries + 26, yTop);
    ctx.lineTo(xRight, yTop);
    // Shunt top -> shunt component
    ctx.moveTo(xShunt, yTop);
    ctx.lineTo(xShunt, yMid - 24);
    // Shunt component -> bottom wire
    ctx.moveTo(xShunt, yMid + 24);
    ctx.lineTo(xShunt, yBot);
    // Bottom wire
    ctx.moveTo(xLeft, yBot);
    ctx.lineTo(xRight, yBot);
    ctx.stroke();

    // Animated current particles if live data available
    const iMag = Math.abs(st.I_A || 0);
    if (iMag > 1e-7 && st.animPhase !== undefined) {
      const dir = st.I_A >= 0 ? 1 : -1;
      const speedFactor = Math.min(1, Math.log10(1 + iMag * 1e4) / 2.5 + 0.35);
      const pts = [
        [xLeft + 10, yTop], [xSeries - 28, yTop],
        [xSeries + 28, yTop], [xShunt, yTop],
        [xShunt, yMid - 26], [xShunt, yMid + 26],
        [xShunt, yBot], [xLeft + 10, yBot]
      ];
      // Draw 5 dots flowing along the loop
      const pathPts = [
        { x: xLeft + 12, y: yTop },
        { x: xShunt, y: yTop },
        { x: xShunt, y: yBot },
        { x: xLeft + 12, y: yBot }
      ];
      const totalL = (xShunt - (xLeft + 12)) * 2 + (yBot - yTop);
      const phase = ((st.animPhase * speedFactor * dir) % 1 + 1) % 1;
      ctx.fillStyle = pal.particle;
      for (let k = 0; k < 6; k++) {
        const d = ((phase + k / 6) % 1) * totalL;
        const seg1 = xShunt - (xLeft + 12);
        const seg2 = seg1 + (yBot - yTop);
        let px, py;
        if (d < seg1) {
          px = xLeft + 12 + d;
          py = yTop;
        } else if (d < seg2) {
          px = xShunt;
          py = yTop + (d - seg1);
        } else {
          px = xShunt - (d - seg2);
          py = yBot;
        }
        // Skip inside components
        const onSeries = Math.abs(py - yTop) < 3 && Math.abs(px - xSeries) < 26;
        const onShunt = Math.abs(px - xShunt) < 3 && Math.abs(py - yMid) < 24;
        if (!onSeries && !onShunt) {
          ctx.beginPath();
          ctx.arc(px, py, 3.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Current direction arrow on top wire (label placed cleanly on bottom wire to never collide with R/C)
      if (!compact) {
        const ax = xLeft + 34;
        const ay = yTop;
        ctx.strokeStyle = pal.vi;
        ctx.fillStyle = pal.vi;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ax - 10 * dir, ay);
        ctx.lineTo(ax + 10 * dir, ay);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax + 12 * dir, ay);
        ctx.lineTo(ax + 5 * dir, ay - 4);
        ctx.lineTo(ax + 5 * dir, ay + 4);
        ctx.closePath();
        ctx.fill();
        drawLtrText(ctx, 'I = ' + E.fmtCurrent(st.I_A), (xLeft + xShunt) / 2, yBot + 16, 'center', pal.vi, '600 11px monospace');
      }
    }

    // Series and Shunt Components
    const vcNorm = st.vMax > 0 ? (st.Vc || 0) / st.vMax : 0;
    const rText = 'R = ' + E.fmtResistance(st.R1_ohm);
    const cText = 'C = ' + E.fmtCapacitance(st.C_F);

    if (isLP) {
      drawResistorH(ctx, xSeries, yTop, 52, 8, pal.component);
      drawCapacitorV(ctx, xShunt, yMid, 10, 32, pal.lp, vcNorm, pal);
      drawLtrText(ctx, rText, xSeries, yTop - 20, 'center', pal.component, '700 12px monospace');
      drawLtrText(ctx, cText, xShunt - 24, yMid, 'right', pal.lp, '700 12px monospace');
    } else {
      drawCapacitorH(ctx, xSeries, yTop, 10, 30, pal.component, vcNorm, pal);
      // Connect capacitor leads
      ctx.strokeStyle = pal.wire;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(xSeries - 26, yTop);
      ctx.lineTo(xSeries - 5, yTop);
      ctx.moveTo(xSeries + 5, yTop);
      ctx.lineTo(xSeries + 26, yTop);
      ctx.stroke();
      drawResistorV(ctx, xShunt, yMid, 48, 8, pal.hp);
      drawLtrText(ctx, cText, xSeries, yTop - 24, 'center', pal.component, '700 12px monospace');
      drawLtrText(ctx, rText, xShunt - 18, yMid, 'right', pal.hp, '700 12px monospace');
    }

    // Optional Parallel Switch R2 (Bagrut 2025 Q5 style)
    if (st.hasSwitch && st.hasSwitch.enabled) {
      const xSw = xSeries;
      const ySw = yTop + 34;
      ctx.strokeStyle = pal.switchOpen;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(xSeries - 34, yTop);
      ctx.lineTo(xSeries - 34, ySw);
      ctx.lineTo(xSeries - 18, ySw);
      ctx.moveTo(xSeries + 18, ySw);
      ctx.lineTo(xSeries + 34, ySw);
      ctx.lineTo(xSeries + 34, yTop);
      ctx.stroke();
      // R2 small resistor + switch blade
      drawResistorH(ctx, xSw - 4, ySw, 28, 5, pal.switchOpen);
      const swX = xSw + 14;
      ctx.strokeStyle = pal.switchOpen;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(swX - 6, ySw);
      if (st.switchClosed) {
        ctx.lineTo(swX + 10, ySw);
      } else {
        ctx.lineTo(swX + 8, ySw - 11);
      }
      ctx.stroke();
      drawLtrText(ctx, 'S (' + (st.switchClosed ? 'ON' : 'OFF') + ')  R2=' + E.fmtResistance(st.R2_ohm), xSw, ySw + 16, 'center', pal.switchOpen, '600 11px monospace');
    }

    // Nodes & Terminals
    ctx.fillStyle = pal.component;
    ctx.beginPath();
    ctx.arc(xShunt, yTop, 3.5, 0, Math.PI * 2);
    ctx.arc(xShunt, yBot, 3.5, 0, Math.PI * 2);
    ctx.fill();

    drawTerminalCircle(ctx, xLeft, yTop, pal.bg, pal.vi);
    drawTerminalCircle(ctx, xLeft, yBot, pal.bg, pal.vi);
    const outCol = isLP ? pal.lp : pal.hp;
    drawTerminalCircle(ctx, xRight, yTop, pal.bg, outCol);
    drawTerminalCircle(ctx, xRight, yBot, pal.bg, outCol);

    // Input & Output voltage arrows + live readouts
    drawArrowUp(ctx, xLeft, yBot - 10, yTop + 12, pal.vi);
    drawArrowUp(ctx, xRight, yBot - 10, yTop + 12, outCol);

    const viLbl = st.Vi !== undefined ? `Vi = ${E.fmtFixed(st.Vi, 2)}V` : 'Vi';
    const voVal = isLP ? st.Vc : st.Vr;
    const voLbl = voVal !== undefined ? `Vo = ${E.fmtFixed(voVal, 2)}V` : 'Vo';
    drawLtrText(ctx, viLbl, xLeft - 8, yMid, 'right', pal.vi, '700 12px monospace');
    drawLtrText(ctx, voLbl, xRight + 8, yMid, 'left', outCol, '700 12px monospace');

    if (!compact && st.Vc !== undefined && st.Vr !== undefined) {
      const seriesV = isLP ? `VR = ${E.fmtFixed(st.Vr, 2)}V` : `VC = ${E.fmtFixed(st.Vc, 2)}V`;
      drawLtrText(ctx, seriesV, xSeries, yTop + (st.hasSwitch && st.hasSwitch.enabled ? 62 : 20), 'center', pal.muted, '600 11px monospace');
    }
  }

  /**
   * Draw synchronized Dual-Channel Oscilloscope (Vi on top, Vo directly below on same time axis)
   */
  function drawOscilloscope(canvas, timeline, options = {}) {
    const height = options.height || 390;
    const { ctx, w, h } = setupHiDPI(canvas, height);
    const pal = getPalette();

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);

    if (!timeline || !timeline.segments.length) return null;

    const u = timeline.timeUnit;
    const tMin = timeline.tViewStart_s;
    const tMax = timeline.tViewEnd_s;
    const tSpan = Math.max(1e-12, tMax - tMin);

    const padL = 56;
    const padR = 24;
    const padTop = 26;
    const padBot = 34;
    const gap = 30;
    const plotW = Math.max(120, w - padL - padR);
    const totalPlotH = h - padTop - padBot - gap;
    const hTop = Math.round(totalPlotH * 0.43);
    const hBot = totalPlotH - hTop;
    const yTop0 = padTop;
    const yBot0 = padTop + hTop + gap;

    const xOfT = (t) => padL + ((t - tMin) / tSpan) * plotW;

    // Sample bounds for Vi and Vo (sweep + exact segment-boundary extrema)
    const samples = 420;
    let viMin = 0, viMax = 0, voMin = 0, voMax = 0;
    let sigViMin = Infinity, sigViMax = -Infinity;
    let sigVoMin = Infinity, sigVoMax = -Infinity;
    const net = options.network || 'LP';
    for (let i = 0; i <= samples; i++) {
      const t = tMin + (i / samples) * tSpan;
      const ev = E.evaluateAt(timeline, t, 'after');
      viMin = Math.min(viMin, ev.Vi);
      viMax = Math.max(viMax, ev.Vi);
      sigViMin = Math.min(sigViMin, ev.Vi);
      sigViMax = Math.max(sigViMax, ev.Vi);
      if (net === 'LP' || net === 'BOTH' || options.showComparison) {
        voMin = Math.min(voMin, ev.VoLP);
        voMax = Math.max(voMax, ev.VoLP);
        sigVoMin = Math.min(sigVoMin, ev.VoLP);
        sigVoMax = Math.max(sigVoMax, ev.VoLP);
      }
      if (net === 'HP' || net === 'BOTH' || options.showComparison) {
        voMin = Math.min(voMin, ev.VoHP);
        voMax = Math.max(voMax, ev.VoHP);
        sigVoMin = Math.min(sigVoMin, ev.VoHP);
        sigVoMax = Math.max(sigVoMax, ev.VoHP);
      }
    }

    const pushSegBoundVo = (v) => {
      if (!Number.isFinite(v)) return;
      voMin = Math.min(voMin, v);
      voMax = Math.max(voMax, v);
      sigVoMin = Math.min(sigVoMin, v);
      sigVoMax = Math.max(sigVoMax, v);
    };

    const distinctVi = [];
    timeline.segments.forEach((seg) => {
      if (seg.tEnd < tMin - 1e-12 || seg.tStart > tMax + 1e-12) return;
      viMin = Math.min(viMin, seg.Vi);
      viMax = Math.max(viMax, seg.Vi);
      sigViMin = Math.min(sigViMin, seg.Vi);
      sigViMax = Math.max(sigViMax, seg.Vi);
      if (!distinctVi.some((v) => Math.abs(v - seg.Vi) < 1e-4)) distinctVi.push(seg.Vi);

      const inStart = seg.tStart >= tMin - 1e-12 && seg.tStart <= tMax + 1e-12;
      const inEnd = seg.tEnd >= tMin - 1e-12 && seg.tEnd <= tMax + 1e-12;
      if (net === 'LP' || net === 'BOTH' || options.showComparison) {
        if (inStart) pushSegBoundVo(seg.VcStart);
        if (inEnd) pushSegBoundVo(seg.VcEnd);
      }
      if (net === 'HP' || net === 'BOTH' || options.showComparison) {
        if (inStart) pushSegBoundVo(seg.VrStartPlus);
        if (inEnd) pushSegBoundVo(seg.VrEndMinus);
      }
    });

    const pinTargets = [];
    if (Array.isArray(options.pins)) {
      options.pins.forEach(p => {
        if (Number.isFinite(p.v)) {
          voMin = Math.min(voMin, p.v);
          voMax = Math.max(voMax, p.v);
        }
        if (Number.isFinite(p.targetLineV)) {
          voMin = Math.min(voMin, p.targetLineV);
          voMax = Math.max(voMax, p.targetLineV);
          pinTargets.push(p.targetLineV);
        }
      });
    }

    const viKeyLevels = [];
    if (Number.isFinite(sigViMax)) viKeyLevels.push(sigViMax);
    if (Number.isFinite(sigViMin)) viKeyLevels.push(sigViMin);
    if (viMin <= 0 && viMax >= 0) viKeyLevels.push(0);
    distinctVi.forEach((v) => viKeyLevels.push(v));

    const voKeyLevels = [];
    if (Number.isFinite(sigVoMax) && Math.abs(sigVoMax) >= 1e-3) voKeyLevels.push(sigVoMax);
    if (Number.isFinite(sigVoMin) && Math.abs(sigVoMin) >= 1e-3) voKeyLevels.push(sigVoMin);
    if (voMin <= 0 && voMax >= 0) voKeyLevels.push(0);
    pinTargets.forEach((v) => voKeyLevels.push(v));

    const padRange = (mn, mx) => {
      let span = mx - mn;
      if (span < 1) span = 2;
      return [mn - span * 0.14, mx + span * 0.16];
    };
    const [viLo, viHi] = padRange(viMin, viMax);
    const [voLo, voHi] = padRange(voMin, voMax);

    const yOfVi = (v) => yTop0 + hTop - ((v - viLo) / (viHi - viLo)) * hTop;
    const yOfVo = (v) => yBot0 + hBot - ((v - voLo) / (voHi - voLo)) * hBot;

    // Panel backgrounds
    const isLight = document.documentElement.dataset.theme === 'light';
    ctx.fillStyle = pal.panelBg;
    ctx.fillRect(padL, yTop0, plotW, hTop);
    ctx.fillRect(padL, yBot0, plotW, hBot);

    // Subtle DSO graticule sub-ticks on left axis & center horizontal reticle
    ctx.strokeStyle = pal.gridZero;
    ctx.lineWidth = 1;
    [yTop0, yBot0].forEach((py0, idx) => {
      const ph = idx === 0 ? hTop : hBot;
      for (let k = 1; k < 10; k++) {
        const ty = py0 + (k / 10) * ph;
        ctx.beginPath();
        ctx.moveTo(padL, ty);
        ctx.lineTo(padL + 4, ty);
        ctx.moveTo(padL + plotW - 4, ty);
        ctx.lineTo(padL + plotW, ty);
        ctx.stroke();
      }
    });

    // Nice time ticks
    const tMinU = E.fromSeconds(tMin, u);
    const tMaxU = E.fromSeconds(tMax, u);
    const tSpanU = tMaxU - tMinU;
    const rawStep = tSpanU / 7;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const norm = rawStep / mag;
    const niceMult = norm <= 1.2 ? 1 : norm <= 2.2 ? 2 : norm <= 5.5 ? 5 : 10;
    const stepU = niceMult * mag;
    const firstTickU = Math.ceil(tMinU / stepU - 1e-9) * stepU;

    // Draw vertical grid & time labels
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    for (let tu = firstTickU; tu <= tMaxU + stepU * 0.001; tu += stepU) {
      const ts = E.toSeconds(tu, u);
      const x = xOfT(ts);
      if (x < padL - 1 || x > padL + plotW + 1) continue;
      ctx.beginPath();
      ctx.moveTo(x, yTop0);
      ctx.lineTo(x, yTop0 + hTop);
      ctx.moveTo(x, yBot0);
      ctx.lineTo(x, yBot0 + hBot);
      ctx.stroke();
      drawLtrText(ctx, E.fmtNum(tu, 2), x, yBot0 + hBot + 16, 'center', pal.axisText, '600 11px monospace');
    }

    drawLtrText(ctx, `t [${u}]`, padL + plotW, yBot0 + hBot + 16, 'right', pal.axisText, '700 11px monospace');

    const voTitle = net === 'BOTH' ? 'Vo [V] (LP + HP)' : `Vo [V] (${net})`;
    const voTitleCol = net === 'HP' ? pal.hp : net === 'LP' ? pal.lp : pal.component;

    // Draw horizontal grid + zero lines + collision-free key peak & level Y ticks
    const drawYGrid = (y0, hh, vLo, vHi, yFn, keyLevels, accentColor) => {
      const vSpan = vHi - vLo;
      const vStepRaw = vSpan / 4;
      const vMag = Math.pow(10, Math.floor(Math.log10(vStepRaw || 1)));
      const vNorm = vStepRaw / vMag;
      const vStep = (vNorm <= 1.5 ? 1 : vNorm <= 3 ? 2 : vNorm <= 7 ? 5 : 10) * vMag;
      const vFirst = Math.ceil(vLo / vStep) * vStep;

      // Pass 1: Regular grid lines
      const regTicks = [];
      for (let v = vFirst; v <= vHi + 1e-9; v += vStep) {
        const y = yFn(v);
        if (y < y0 + 2 || y > y0 + hh - 2) continue;
        const isZero = Math.abs(v) < 1e-6;
        ctx.strokeStyle = isZero ? pal.gridZero : pal.grid;
        ctx.lineWidth = isZero ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        regTicks.push(v);
      }
      // Ensure 0V line is always drawn if inside range
      if (vLo < 0 && vHi > 0) {
        const yz = yFn(0);
        ctx.strokeStyle = pal.gridZero;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padL, yz);
        ctx.lineTo(padL + plotW, yz);
        ctx.stroke();
      }

      // Deduplicate key signal levels while preserving priority order (vMax, vMin, 0, others)
      const uniqKeys = [];
      (keyLevels || []).forEach((kv) => {
        if (!Number.isFinite(kv)) return;
        const rounded = Math.abs(kv) < 1e-6 ? 0 : kv;
        if (!uniqKeys.some((uVal) => Math.abs(uVal - rounded) < 1e-4)) {
          uniqKeys.push(rounded);
        }
      });

      // Pass 2: Key signal levels (highest priority so upper/lower bounds are always shown)
      const MIN_GAP_PX = 13;
      const placedYs = [];
      uniqKeys.forEach((kv) => {
        const y = yFn(kv);
        if (y < y0 + 4 || y > y0 + hh - 4) return;
        if (placedYs.some((py) => Math.abs(py - y) < MIN_GAP_PX)) return;
        placedYs.push(y);

        if (Math.abs(kv) >= 1e-6) {
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = accentColor;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padL, y);
          ctx.lineTo(padL + plotW, y);
          ctx.stroke();
          ctx.restore();

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(padL - 4, y);
          ctx.lineTo(padL, y);
          ctx.stroke();

          drawLtrText(ctx, E.fmtNum(kv, 2), padL - 7, y, 'right', accentColor, '700 11px monospace');
        } else {
          drawLtrText(ctx, '0', padL - 7, y, 'right', pal.axisText, '600 11px monospace');
        }
      });

      // Pass 3: Non-colliding regular grid labels
      regTicks.forEach((rv) => {
        const y = yFn(rv);
        if (placedYs.some((py) => Math.abs(py - y) < MIN_GAP_PX)) return;
        placedYs.push(y);
        drawLtrText(ctx, E.fmtNum(rv, 2), padL - 7, y, 'right', pal.axisText, '600 11px monospace');
      });
    };
    drawYGrid(yTop0, hTop, viLo, viHi, yOfVi, viKeyLevels, pal.vi);
    drawYGrid(yBot0, hBot, voLo, voHi, yOfVo, voKeyLevels, voTitleCol);

    // Borders & Channel Titles
    ctx.strokeStyle = pal.gridZero;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padL, yTop0, plotW, hTop);
    ctx.strokeRect(padL, yBot0, plotW, hBot);
    drawLtrText(ctx, 'Vi [V]', padL + 8, yTop0 - 12, 'left', pal.vi, '700 12px monospace');
    drawLtrText(ctx, voTitle, padL + 8, yBot0 - 12, 'left', voTitleCol, '700 12px monospace');

    // Optional tau / 5tau markers from first non-pre transition
    if (options.showTauMarkers) {
      const firstSeg = timeline.segments.find(s => !s.isPre);
      if (firstSeg) {
        [1, 5].forEach(mult => {
          const tm = firstSeg.tStart + mult * firstSeg.tau_s;
          if (tm > tMin && tm < tMax) {
            const xm = xOfT(tm);
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = pal.gold;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(xm, yBot0);
            ctx.lineTo(xm, yBot0 + hBot);
            ctx.stroke();
            ctx.restore();
            drawLtrText(ctx, mult === 1 ? 'τ' : '5τ', xm, yBot0 + 12, 'center', pal.gold, '700 11px monospace');
          }
        });
      }
    }

    // Switch event marker if present
    if (timeline.switchEventTime_s !== null && timeline.switchEventTime_s >= tMin && timeline.switchEventTime_s <= tMax) {
      const xs = xOfT(timeline.switchEventTime_s);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = pal.switchOpen;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xs, yTop0);
      ctx.lineTo(xs, yBot0 + hBot);
      ctx.stroke();
      ctx.restore();
      drawLtrText(ctx, 'S closes', xs + 4, yBot0 + 12, 'left', pal.switchOpen, '700 11px monospace');
    }

    // Transition vertical dotted guides connecting top and bottom plots
    timeline.segments.forEach((seg, idx) => {
      if (idx > 0 && Math.abs(seg.deltaVi) > 1e-9 && seg.tStart > tMin && seg.tStart < tMax) {
        const x = xOfT(seg.tStart);
        ctx.save();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = pal.muted;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yTop0);
        ctx.lineTo(x, yBot0 + hBot);
        ctx.stroke();
        ctx.restore();
      }
    });

    // Helper to draw a piecewise trace up to maxT
    const maxDrawT = options.cursorT_s !== undefined && options.revealUpToCursor ? options.cursorT_s : tMax;

    // Draw Vi trace (always complete or up to maxDrawT)
    ctx.save();
    ctx.strokeStyle = pal.vi;
    ctx.lineWidth = 2.6;
    if (!isLight) {
      ctx.shadowColor = pal.vi;
      ctx.shadowBlur = 5;
    }
    ctx.beginPath();
    let startedVi = false;
    timeline.segments.forEach((seg, idx) => {
      if (seg.tStart > maxDrawT + 1e-12) return;
      const endT = Math.min(seg.tEnd, maxDrawT);
      const x0 = xOfT(seg.tStart);
      const x1 = xOfT(endT);
      const y = yOfVi(seg.Vi);
      if (!startedVi) {
        ctx.moveTo(x0, y);
        startedVi = true;
      } else {
        ctx.lineTo(x0, y);
      }
      ctx.lineTo(x1, y);
    });
    ctx.stroke();
    ctx.restore();

    // Interactive Vi segment drag handles (for pulse & complex multi-stage builder)
    const levelHandles = [];
    if (options.editableVi) {
      timeline.segments.forEach((seg, segIndex) => {
        const x0 = Math.max(padL, xOfT(seg.tStart));
        const x1 = Math.min(padL + plotW, xOfT(seg.tEnd));
        if (x1 - x0 < 12) return;
        const y = yOfVi(seg.Vi);
        const xMid = (x0 + x1) / 2;
        const active = options.hoverHandleIndex === segIndex || options.dragHandleIndex === segIndex;
        levelHandles.push({ segIndex, x0, x1, xMid, y, Vi: seg.Vi });

        ctx.save();
        ctx.fillStyle = active ? pal.gold : pal.bg;
        ctx.strokeStyle = active ? pal.gold : pal.vi;
        ctx.lineWidth = active ? 2 : 1.5;
        ctx.beginPath();
        ctx.roundRect(xMid - 11, y - 5, 22, 10, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = active ? pal.bg : pal.vi;
        ctx.beginPath();
        ctx.arc(xMid - 4, y, 1.3, 0, Math.PI * 2);
        ctx.arc(xMid, y, 1.3, 0, Math.PI * 2);
        ctx.arc(xMid + 4, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
        if (active) {
          const lblY = y < yTop0 + 18 ? y + 15 : y - 13;
          drawLtrText(ctx, `${E.fmtNum(seg.Vi, 1)}V`, xMid, lblY, 'center', pal.gold, '700 11px monospace');
        }
        ctx.restore();
      });
    }

    // Draw Vo trace(s)
    const drawCurve = (mode, color, dashed, alpha) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.8 : 2.8;
      if (dashed) ctx.setLineDash([6, 4]);
      if (alpha !== undefined) ctx.globalAlpha = alpha;
      if (!dashed && !isLight) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 7;
      }
      ctx.beginPath();
      let started = false;
      timeline.segments.forEach((seg) => {
        if (seg.tStart > maxDrawT + 1e-12) return;
        const endT = Math.min(seg.tEnd, maxDrawT);
        const steps = Math.max(24, Math.ceil(((endT - seg.tStart) / tSpan) * 260));
        for (let i = 0; i <= steps; i++) {
          const t = seg.tStart + (i / steps) * (endT - seg.tStart);
          const dt = t - seg.tStart;
          const vc = seg.VcTarget + (seg.VcStart - seg.VcTarget) * Math.exp(-dt / seg.tau_s);
          const v = mode === 'LP' ? vc : (seg.Vi - vc);
          const x = xOfT(t);
          const y = yOfVo(v);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
      ctx.restore();
    };

    // Ghost full future trace when animating reveal
    if (options.revealUpToCursor && maxDrawT < tMax - 1e-12) {
      const savedMax = maxDrawT;
      // Draw faint ghost by temporarily drawing full
      const drawGhost = (mode, color) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.16;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        timeline.segments.forEach((seg) => {
          const steps = 40;
          for (let i = 0; i <= steps; i++) {
            const t = seg.tStart + (i / steps) * (seg.tEnd - seg.tStart);
            const vc = seg.VcTarget + (seg.VcStart - seg.VcTarget) * Math.exp(-(t - seg.tStart) / seg.tau_s);
            const v = mode === 'LP' ? vc : (seg.Vi - vc);
            const x = xOfT(t), y = yOfVo(v);
            if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
          }
        });
        ctx.stroke();
        ctx.restore();
      };
      if (net === 'LP' || net === 'BOTH') drawGhost('LP', pal.lp);
      if (net === 'HP' || net === 'BOTH') drawGhost('HP', pal.hp);
    }

    if (net === 'LP') {
      if (options.showComparison) drawCurve('HP', pal.hp, true, 0.7);
      drawCurve('LP', pal.lp, false, 1);
    } else if (net === 'HP') {
      if (options.showComparison) drawCurve('LP', pal.lp, true, 0.7);
      drawCurve('HP', pal.hp, false, 1);
    } else {
      drawCurve('LP', pal.lp, false, 1);
      drawCurve('HP', pal.hp, false, 1);
    }

    // Optional segment endpoint callouts
    if (options.showEndpoints) {
      timeline.segments.forEach((seg, idx) => {
        if (seg.isPre) return;
        const tEnd = seg.tEnd;
        if (tEnd > maxDrawT + 1e-12) return;
        const x = xOfT(tEnd);
        if (x < padL + 8 || x > padL + plotW - 8) return;
        const vEnd = net === 'HP' ? seg.VrEndMinus : seg.VcEnd;
        if (net !== 'BOTH') {
          const y = yOfVo(vEnd);
          ctx.fillStyle = net === 'HP' ? pal.hp : pal.lp;
          ctx.beginPath();
          ctx.arc(x, y, 3.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Verification pins & target voltage lines
    if (Array.isArray(options.pins)) {
      options.pins.forEach((pin) => {
        if (Number.isFinite(pin.targetLineV)) {
          const yT = yOfVo(pin.targetLineV);
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = pin.color || pal.gold;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(padL, yT);
          ctx.lineTo(padL + plotW, yT);
          ctx.stroke();
          ctx.restore();
          drawLtrText(ctx, E.fmtFixed(pin.targetLineV, 2) + 'V', padL + plotW - 6, yT - 9, 'right', pin.color || pal.gold, '700 11px monospace');
        }
        if (Number.isFinite(pin.t_s) && Number.isFinite(pin.v)) {
          const px = xOfT(pin.t_s);
          const py = yOfVo(pin.v);
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = pin.color || pal.gold;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, yBot0 + hBot);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = pin.color || pal.gold;
          ctx.beginPath();
          ctx.arc(px, py, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = pal.bg;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          if (pin.label) {
            const align = px > padL + plotW * 0.75 ? 'right' : 'left';
            const lx = align === 'right' ? px - 8 : px + 8;
            const ly = py < yBot0 + 22 ? py + 14 : py - 12;
            drawLtrText(ctx, pin.label, lx, ly, align, pin.color || pal.gold, '700 11px monospace');
          }
        }
      });
    }

    // Active Time Cursor
    if (options.cursorT_s !== undefined) {
      const xc = xOfT(options.cursorT_s);
      if (xc >= padL && xc <= padL + plotW) {
        ctx.save();
        ctx.strokeStyle = pal.gold;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(xc, yTop0);
        ctx.lineTo(xc, yBot0 + hBot);
        ctx.stroke();
        ctx.restore();

        const ev = E.evaluateAt(timeline, options.cursorT_s, options.cursorSide || 'after');
        if (ev) {
          // Dot on Vi
          ctx.fillStyle = pal.vi;
          ctx.beginPath();
          ctx.arc(xc, yOfVi(ev.Vi), 4.5, 0, Math.PI * 2);
          ctx.fill();

          // Dot on Vo
          if (net === 'LP' || net === 'BOTH') {
            ctx.fillStyle = pal.lp;
            ctx.beginPath();
            ctx.arc(xc, yOfVo(ev.VoLP), 5, 0, Math.PI * 2);
            ctx.fill();
          }
          if (net === 'HP' || net === 'BOTH') {
            ctx.fillStyle = pal.hp;
            ctx.beginPath();
            ctx.arc(xc, yOfVo(ev.VoHP), 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    return { padL, plotW, tMin, tMax, yTop0, hTop, yBot0, hBot, viLo, viHi, voLo, voHi, levelHandles };
  }

  /**
   * Compact Input Waveform Preview for Exercise Cards (Vi(t) only)
   */
  function drawMiniInputWave(canvas, timeline) {
    const { ctx, w, h } = setupHiDPI(canvas, 130);
    const pal = getPalette();
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);

    const u = timeline.timeUnit;
    const tMin = timeline.tViewStart_s;
    const tMax = timeline.tViewEnd_s;
    const tSpan = Math.max(1e-12, tMax - tMin);
    const padL = 44, padR = 18, padTop = 20, padBot = 26;
    const pw = w - padL - padR;
    const ph = h - padTop - padBot;

    let vMin = 0, vMax = 0;
    timeline.segments.forEach(s => {
      vMin = Math.min(vMin, s.Vi);
      vMax = Math.max(vMax, s.Vi);
    });
    const span = Math.max(2, vMax - vMin);
    const lo = vMin - span * 0.15;
    const hi = vMax + span * 0.2;

    const xOf = (t) => padL + ((t - tMin) / tSpan) * pw;
    const yOf = (v) => padTop + ph - ((v - lo) / (hi - lo)) * ph;

    ctx.fillStyle = pal.panelBg;
    ctx.fillRect(padL, padTop, pw, ph);

    // Zero line
    const miniPlacedYs = [];
    if (lo <= 0 && hi >= 0) {
      const yz = yOf(0);
      ctx.strokeStyle = pal.gridZero;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(padL, yz);
      ctx.lineTo(padL + pw, yz);
      ctx.stroke();
    }

    // Distinct Vi levels & transition times (prioritize upper vMax and lower vMin)
    const levels = [];
    const times = new Set();
    timeline.segments.forEach((s, idx) => {
      if (!levels.some((lv) => Math.abs(lv - s.Vi) < 1e-4)) levels.push(s.Vi);
      if (idx > 0 && Math.abs(s.deltaVi) > 1e-9) times.add(s.tStart);
    });
    const orderedLevels = [vMax, vMin, ...levels];
    if (lo <= 0 && hi >= 0) orderedLevels.push(0);

    const uniqMiniLevels = [];
    orderedLevels.forEach((v) => {
      const r = Math.abs(v) < 1e-6 ? 0 : v;
      if (!uniqMiniLevels.some((uVal) => Math.abs(uVal - r) < 1e-4)) uniqMiniLevels.push(r);
    });

    uniqMiniLevels.forEach((v) => {
      const y = yOf(v);
      if (y < padTop + 4 || y > padTop + ph - 4) return;
      if (Math.abs(v) >= 1e-6) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = pal.grid;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + pw, y);
        ctx.stroke();
        ctx.restore();
      }
      if (!miniPlacedYs.some((py) => Math.abs(py - y) < 11)) {
        miniPlacedYs.push(y);
        if (Math.abs(v) < 1e-6) {
          drawLtrText(ctx, '0', padL - 6, y, 'right', pal.axisText, '600 11px monospace');
        } else {
          drawLtrText(ctx, E.fmtNum(v, 2), padL - 6, y, 'right', pal.vi, '700 11px monospace');
        }
      }
    });

    times.forEach(ts => {
      const x = xOf(ts);
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = pal.grid;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + ph);
      ctx.stroke();
      ctx.restore();
      drawLtrText(ctx, E.fmtNum(E.fromSeconds(ts, u), 1), x, padTop + ph + 13, 'center', pal.axisText, '600 11px monospace');
    });

    // Trace
    ctx.strokeStyle = pal.vi;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    timeline.segments.forEach((s, idx) => {
      const x0 = xOf(s.tStart), x1 = xOf(s.tEnd), y = yOf(s.Vi);
      if (idx === 0) ctx.moveTo(x0, y); else ctx.lineTo(x0, y);
      ctx.lineTo(x1, y);
    });
    ctx.stroke();

    ctx.strokeStyle = pal.gridZero;
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padTop, pw, ph);
    drawLtrText(ctx, 'Vi [V]', padL + 4, padTop - 9, 'left', pal.vi, '700 11px monospace');
    drawLtrText(ctx, `t [${u}]`, padL + pw, padTop + ph + 13, 'right', pal.axisText, '700 11px monospace');
  }

  /**
   * Intro Chapter 3 Widget: Pulse & Square wave shapes for T >> tau, T ~ tau, T << tau
   */
  function drawTauComparison(canvas, regime) {
    const { ctx, w, h } = setupHiDPI(canvas, 250);
    const pal = getPalette();
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);

    // Ratio T_half / tau
    const ratio = regime === 'long' ? 8 : regime === 'med' ? 1.1 : 0.15;
    const tau = 1e-3;
    const halfT = ratio * tau;
    const transitions = [];
    for (let k = 0; k < 6; k++) {
      transitions.push({ t_s: k * halfT, Vi: k % 2 === 0 ? 10 : 0 });
    }
    const tl = E.compileTimeline({
      network: 'BOTH',
      R1_ohm: 1e3,
      C_F: 1e-6,
      timeUnit: 'ms',
      tViewStart_s: -0.4 * halfT,
      tViewEnd_s: 6 * halfT,
      preVi: 0,
      steadyState: true,
      transitions
    });

    // Draw Vi (top), LP (mid), HP (bot)
    const padL = 50, padR = 16, padT = 18, padB = 18;
    const pw = w - padL - padR;
    const bandH = (h - padT - padB - 24) / 3;
    const xOf = (t) => padL + ((t - tl.tViewStart_s) / (tl.tViewEnd_s - tl.tViewStart_s)) * pw;

    const drawBand = (topY, label, color, evalFn, lo, hi, yTicks) => {
      ctx.fillStyle = pal.panelBg;
      ctx.fillRect(padL, topY, pw, bandH);
      const yOf = (v) => topY + bandH - ((v - lo) / (hi - lo)) * bandH;
      ctx.strokeStyle = pal.gridZero;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, yOf(0));
      ctx.lineTo(padL + pw, yOf(0));
      ctx.stroke();

      (yTicks || []).forEach((tv) => {
        const ty = yOf(tv);
        if (Math.abs(tv) >= 1e-6) {
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = pal.grid;
          ctx.beginPath();
          ctx.moveTo(padL, ty);
          ctx.lineTo(padL + pw, ty);
          ctx.stroke();
          ctx.restore();
        }
        drawLtrText(ctx, E.fmtNum(tv, 0), padL - 6, ty, 'right', Math.abs(tv) < 1e-6 ? pal.axisText : color, '700 10px monospace');
      });

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      let started = false;
      tl.segments.forEach(seg => {
        const steps = 40;
        for (let i = 0; i <= steps; i++) {
          const t = seg.tStart + (i / steps) * (seg.tEnd - seg.tStart);
          const vc = seg.VcTarget + (seg.VcStart - seg.VcTarget) * Math.exp(-(t - seg.tStart) / seg.tau_s);
          const v = evalFn(seg.Vi, vc);
          const x = xOf(t), y = yOf(v);
          if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
        }
      });
      ctx.stroke();
      ctx.strokeStyle = pal.grid;
      ctx.strokeRect(padL, topY, pw, bandH);
      drawLtrText(ctx, label, padL + 6, topY + 11, 'left', color, '700 11px monospace');
    };

    drawBand(padT, 'Vi [V]', pal.vi, (vi) => vi, -2, 12, [10, 0]);
    drawBand(padT + bandH + 12, 'LP [V]', pal.lp, (_, vc) => vc, -2, 12, [10, 0]);
    drawBand(padT + (bandH + 12) * 2, 'HP [V]', pal.hp, (vi, vc) => vi - vc, -11, 11, [10, 0, -10]);
  }

  global.RCVisuals = {
    getPalette,
    drawLtrText,
    drawRtlText,
    drawCircuit,
    drawOscilloscope,
    drawMiniInputWave,
    drawTauComparison
  };
})(window);
