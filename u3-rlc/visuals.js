/* ==========================================================================
   visuals.js — HiDPI Canvas Rendering Engine for AC RL, RC & RLC Circuits
   - AC Series Schematic + Bypass Switch S + Oscillating Charge Flow
   - Impedance Triangle (R, X, Z) & Voltage/Current Phasor Diagram
   - Dual-Channel Sine Oscilloscope with Collision-Free Y-Axis Peak Labels
   - Frequency Sweep & Resonance Curve I(f), Z(f)
   Strict LTR math rendering inside RTL Hebrew layout
   ========================================================================== */
(function (root) {
  'use strict';

  const E = root.ACEngine;

  function isLight() {
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  function palette() {
    if (isLight()) {
      return {
        bg: '#f8fafc',
        bgSub: '#ffffff',
        grid: 'rgba(15, 23, 42, 0.08)',
        gridStrong: 'rgba(15, 23, 42, 0.22)',
        text: '#0f172a',
        muted: '#475569',
        u: '#0284c7',
        ur: '#059669',
        ul: '#7c3aed',
        uc: '#e11d48',
        z: '#d97706',
        wire: '#334155',
        badgeBg: 'rgba(255, 255, 255, 0.94)',
        capFill: 'rgba(5, 150, 105, 0.14)',
        indFill: 'rgba(124, 58, 237, 0.08)'
      };
    }
    return {
      bg: '#080e1c',
      bgSub: '#0e172a',
      grid: 'rgba(148, 163, 184, 0.11)',
      gridStrong: 'rgba(148, 163, 184, 0.30)',
      text: '#eef4ff',
      muted: '#94a3b8',
      u: '#38bdf8',
      ur: '#34d399',
      ul: '#a78bfa',
      uc: '#fb7185',
      z: '#fbbf24',
      wire: '#cbd5e1',
      badgeBg: 'rgba(11, 17, 32, 0.92)',
      capFill: 'rgba(251, 113, 133, 0.08)',
      indFill: 'rgba(167, 139, 250, 0.08)'
    };
  }

  function setupCanvas(canvas, cssHeight) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
    const w = Math.max(300, canvas.clientWidth || parentW || 620);
    const h = cssHeight || Number(canvas.dataset.height) || 260;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h, p: palette() };
  }

  function drawLtrText(ctx, text, x, y, opts = {}) {
    ctx.save();
    ctx.direction = 'ltr';
    ctx.font = opts.font || '700 12px "JetBrains Mono", Consolas, monospace';
    ctx.fillStyle = opts.color || '#eef4ff';
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'alphabetic';
    ctx.fillText(String(text), x, y);
    ctx.restore();
  }

  function drawRtlText(ctx, text, x, y, opts = {}) {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.font = opts.font || '600 12px "Heebo", Arial, sans-serif';
    ctx.fillStyle = opts.color || '#eef4ff';
    ctx.textAlign = opts.align || 'right';
    ctx.textBaseline = opts.baseline || 'alphabetic';
    ctx.fillText(String(text), x, y);
    ctx.restore();
  }

  function drawBadge(ctx, text, cx, cy, borderColor, p, textColor) {
    ctx.save();
    const hasHeb = /[\u0590-\u05FF]/.test(text);
    ctx.direction = hasHeb ? 'rtl' : 'ltr';
    ctx.font = hasHeb
      ? '700 11.5px "Heebo", "Segoe UI", sans-serif'
      : '700 11px "JetBrains Mono", Consolas, monospace';
    const tw = ctx.measureText(text).width;
    const bw = tw + 14;
    const bh = 20;
    const rx = cx - bw / 2;
    const ry = cy - bh / 2;
    ctx.fillStyle = p.badgeBg;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(rx, ry, bw, bh, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = textColor || borderColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 0.5);
    ctx.restore();
  }

  function drawArrowHead(ctx, x, y, angle, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.45);
    ctx.lineTo(-size * 0.78, 0);
    ctx.lineTo(-size, size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawVectorArrow(ctx, x1, y1, x2, y2, color, width = 2.6, dashed = false) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;
    const ang = Math.atan2(dy, dx);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dashed) ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(ang) * Math.min(8, len * 0.25), y2 - Math.sin(ang) * Math.min(8, len * 0.25));
    ctx.stroke();
    ctx.setLineDash([]);
    drawArrowHead(ctx, x2, y2, ang, Math.min(11, Math.max(7, len * 0.16)), color);
    ctx.restore();
  }

  function drawAngleArc(ctx, cx, cy, r, angleRad, color, label) {
    if (Math.abs(angleRad) < 0.02) return;
    // Note: canvas Y goes down, math angle +phi goes UP (-y in canvas)
    const endCanvas = -angleRad;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, endCanvas, angleRad > 0);
    ctx.stroke();
    const mid = endCanvas / 2;
    const lx = cx + Math.cos(mid) * (r + 14);
    const ly = cy + Math.sin(mid) * (r + 14);
    drawLtrText(ctx, label, lx, ly, {
      color,
      align: 'center',
      baseline: 'middle',
      font: '700 11px "JetBrains Mono", monospace'
    });
    ctx.restore();
  }

  /* --------------------------------------------------------------------------
     1. AC Series Circuit Schematic with Series Ammeter (A) & Parallel Voltmeter (V)
     -------------------------------------------------------------------------- */
  function drawACSchematic(canvas, sol, opts = {}) {
    const h = Number(canvas.dataset.height) || 260;
    const { ctx, w, p } = setupCanvas(canvas, h);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle schematic grid
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (let x = 24; x < w; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 24; y < h; y += 28) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const leftX = Math.max(66, w * 0.14);
    const rightX = Math.min(w - 58, w * 0.86);
    const topY = 82;
    const botY = h - 46;
    const midY = (topY + botY) / 2;

    const hasL = sol.topology === 'RL' || sol.topology === 'RLC';
    const hasC = sol.topology === 'RC' || sol.topology === 'RLC' || sol.topology === 'RC_SWITCH';
    const hasSw = sol.topology === 'RC_SWITCH';

    let vTarget = opts.voltmeterTarget || 'ALL';
    if (vTarget === 'UL' && !hasL) vTarget = 'U';
    if (vTarget === 'UC' && !hasC) vTarget = 'U';

    function drawWire(x1, y1, x2, y2, color = p.wire, lw = 2.4) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Left vertical leg & AC Source circle
    drawWire(leftX, topY, leftX, midY - 21);
    drawWire(leftX, midY + 21, leftX, botY);
    drawWire(leftX, topY, leftX + 22, topY);
    if (!hasC) {
      drawWire(rightX, topY, rightX, botY);
    }

    // Bottom wire with Series Ammeter (A) inserted in-line
    const ammX = (leftX + rightX) * 0.52;
    const ammR = 15;
    drawWire(leftX, botY, ammX - ammR, botY);
    drawWire(ammX + ammR, botY, rightX, botY);

    // Current arrow next to Ammeter
    const arrowStart = Math.max(leftX + 26, ammX - 66);
    if (ammX - arrowStart > 22) {
      drawVectorArrow(ctx, arrowStart, botY - 12, ammX - 24, botY - 12, p.ur, 2.2);
      drawLtrText(ctx, 'I', arrowStart + 10, botY - 18, {
        color: p.ur, align: 'center', font: '800 11px "JetBrains Mono", monospace'
      });
    }

    // Ammeter circle (A)
    ctx.fillStyle = p.bgSub;
    ctx.strokeStyle = p.z;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(ammX, botY, ammR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawLtrText(ctx, 'A', ammX, botY + 0.5, {
      color: p.z, align: 'center', baseline: 'middle', font: '800 13px "JetBrains Mono", monospace'
    });
    drawBadge(ctx, `I = ${E.fmtCurrent(sol.Ieff)}`, ammX, botY + 25, p.z, p, p.z);

    // AC Source circle on left
    ctx.fillStyle = p.bgSub;
    ctx.strokeStyle = p.u;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(leftX, midY, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = p.u;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let dx = -11; dx <= 11; dx++) {
      const sy = midY - Math.sin((dx / 11) * Math.PI) * 6.5;
      if (dx === -11) ctx.moveTo(leftX + dx, sy);
      else ctx.lineTo(leftX + dx, sy);
    }
    ctx.stroke();
    drawLtrText(ctx, 'u(t)', leftX - 26, midY - 24, {
      color: p.u, align: 'center', font: '700 11px "JetBrains Mono", monospace'
    });
    drawBadge(ctx, `U = ${E.fmtNum(sol.Ueff, 2)} V`, leftX + 2, botY + 25, p.u, p, p.u);

    const topStart = leftX + 22;
    const topEnd = rightX;
    const topSpan = topEnd - topStart;

    let rCenter = (topStart + topEnd) / 2;
    let lCenter = null;

    function drawResistorH(cx, cy) {
      const len = 54;
      const sx = cx - len / 2;
      drawWire(sx - 10, cy, sx, cy);
      ctx.strokeStyle = p.ur;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(sx, cy);
      const zig = [
        [6, -8], [14, 8], [22, -8], [30, 8], [38, -8], [46, 8], [50, -3], [len, 0]
      ];
      for (const [dx, dy] of zig) ctx.lineTo(sx + dx, cy + dy);
      ctx.stroke();
      drawWire(sx + len, cy, sx + len + 10, cy);
      drawLtrText(ctx, `R = ${E.fmtImpedance(sol.R_ohm)}`, cx, cy + 23, {
        color: p.ur, align: 'center', font: '700 11px "JetBrains Mono", monospace'
      });
      if (vTarget === 'ALL') {
        drawBadge(ctx, `UR = ${E.fmtNum(sol.UR, 2)} V`, cx, cy - 26, p.ur, p, p.ur);
      }
    }

    function drawInductorH(cx, cy) {
      const loops = 4;
      const r = 7.5;
      const len = loops * 2 * r;
      const sx = cx - len / 2;
      drawWire(sx - 10, cy, sx, cy);
      ctx.strokeStyle = p.ul;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let i = 0; i < loops; i++) {
        ctx.arc(sx + r + i * 2 * r, cy, r, Math.PI, 0, false);
      }
      ctx.stroke();
      drawWire(sx + len, cy, sx + len + 10, cy);
      drawLtrText(ctx, `XL = ${E.fmtImpedance(sol.XL_ohm)}`, cx, cy + 23, {
        color: p.ul, align: 'center', font: '700 11px "JetBrains Mono", monospace'
      });
      if (vTarget === 'ALL') {
        drawBadge(ctx, `UL = ${E.fmtNum(sol.UL, 2)} V`, cx, cy - 26, p.ul, p, p.ul);
      }
    }

    if (hasL) {
      rCenter = topStart + topSpan * 0.28;
      lCenter = topStart + topSpan * 0.72;
      drawWire(topStart, topY, rCenter - 37, topY);
      drawResistorH(rCenter, topY);
      drawWire(rCenter + 37, topY, lCenter - 40, topY);
      drawInductorH(lCenter, topY);
      drawWire(lCenter + 40, topY, topEnd, topY);
    } else {
      drawWire(topStart, topY, rCenter - 37, topY);
      drawResistorH(rCenter, topY);
      drawWire(rCenter + 37, topY, topEnd, topY);
    }

    if (hasC) {
      const capX = rightX;
      ctx.fillStyle = p.bg;
      ctx.fillRect(capX - 24, midY - 11, 48, 22);
      ctx.strokeStyle = (hasSw && sol.switchClosed) ? p.muted : p.uc;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(capX - 19, midY - 7);
      ctx.lineTo(capX + 19, midY - 7);
      ctx.moveTo(capX - 19, midY + 7);
      ctx.lineTo(capX + 19, midY + 7);
      ctx.stroke();
      drawWire(capX, topY, capX, midY - 7);
      drawWire(capX, midY + 7, capX, botY);

      const xcLbl = (hasSw && sol.switchClosed) ? 'C (קוצר)' : `XC = ${E.fmtImpedance(sol.XC_ohm)}`;
      if (hasSw && sol.switchClosed) {
        drawRtlText(ctx, xcLbl, capX - 26, midY - 18, { color: p.muted, align: 'right' });
      } else {
        drawLtrText(ctx, xcLbl, capX - 26, midY - 18, {
          color: p.uc, align: 'right', font: '700 11px "JetBrains Mono", monospace'
        });
      }
      if (vTarget === 'ALL') {
        drawBadge(ctx, `UC = ${E.fmtNum(sol.UC, 2)} V`, capX - 72, midY + 8, (hasSw && sol.switchClosed) ? p.muted : p.uc, p);
      }

      if (hasSw) {
        const swX = Math.min(w - 16, capX + 32);
        const sTop = midY - 32;
        const sBot = midY + 32;
        drawWire(capX, sTop, swX, sTop);
        drawWire(capX, sBot, swX, sBot);
        ctx.strokeStyle = sol.switchClosed ? p.ur : p.z;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        if (sol.switchClosed) {
          ctx.moveTo(swX, sTop);
          ctx.lineTo(swX, sBot);
        } else {
          ctx.moveTo(swX, sTop);
          ctx.lineTo(swX, sTop + 13);
          ctx.moveTo(swX, sBot);
          ctx.lineTo(swX, sBot - 13);
          ctx.moveTo(swX, sBot - 13);
          ctx.lineTo(swX + 14, sTop + 17);
        }
        ctx.stroke();
        ctx.fillStyle = sol.switchClosed ? p.ur : p.z;
        ctx.beginPath(); ctx.arc(swX, sTop + (sol.switchClosed ? 0 : 13), 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(swX, sBot - (sol.switchClosed ? 0 : 13), 3, 0, Math.PI * 2); ctx.fill();
        drawLtrText(ctx, 'S', swX + 8, midY - 3, {
          color: sol.switchClosed ? p.ur : p.z, font: '800 11.5px "JetBrains Mono", monospace'
        });
      }
    }

    // Draw Highlighted Parallel Voltmeter (V) across selected target
    function drawParallelVoltmeterH(cx, cy, valV, color, badgeText) {
      const span = 38;
      const vmY = cy - 35;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cx - span, cy);
      ctx.lineTo(cx - span, vmY);
      ctx.lineTo(cx - 13, vmY);
      ctx.moveTo(cx + span, cy);
      ctx.lineTo(cx + span, vmY);
      ctx.lineTo(cx + 13, vmY);
      ctx.stroke();
      ctx.setLineDash([]);
      // Terminal dots on main wire
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx - span, cy, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + span, cy, 3.6, 0, Math.PI * 2); ctx.fill();
      // Voltmeter circle
      ctx.fillStyle = p.bgSub;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, vmY, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawLtrText(ctx, 'V', cx, vmY + 0.5, {
        color, align: 'center', baseline: 'middle', font: '800 12px "JetBrains Mono", monospace'
      });
      const pillX = cx + (cx < w * 0.5 ? 58 : -58);
      drawBadge(ctx, badgeText, Math.min(w - 58, Math.max(58, pillX)), vmY, color, p, color);
      ctx.restore();
    }

    function drawParallelVoltmeterV(cx, cy, inwardSign, color, badgeText) {
      const span = 32;
      const vmX = cx + inwardSign * 44;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy - span);
      ctx.lineTo(vmX, cy - span);
      ctx.lineTo(vmX, cy - 13);
      ctx.moveTo(cx, cy + span);
      ctx.lineTo(vmX, cy + span);
      ctx.lineTo(vmX, cy + 13);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy - span, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy + span, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.bgSub;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(vmX, cy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawLtrText(ctx, 'V', vmX, cy + 0.5, {
        color, align: 'center', baseline: 'middle', font: '800 12px "JetBrains Mono", monospace'
      });
      drawBadge(ctx, badgeText, vmX + inwardSign * 56, cy + 20, color, p, color);
      ctx.restore();
    }

    if (vTarget === 'UR') {
      drawParallelVoltmeterH(rCenter, topY, sol.UR, p.ur, `V = ${E.fmtNum(sol.UR, 2)} V`);
    } else if (vTarget === 'UL' && hasL && lCenter !== null) {
      drawParallelVoltmeterH(lCenter, topY, sol.UL, p.ul, `V = ${E.fmtNum(sol.UL, 2)} V`);
    } else if (vTarget === 'UC' && hasC) {
      drawParallelVoltmeterV(rightX, midY, -1, (hasSw && sol.switchClosed) ? p.muted : p.uc, `UC = ${E.fmtNum(sol.UC, 2)} V`);
    } else if (vTarget === 'U') {
      drawParallelVoltmeterV(leftX, midY, +1, p.u, `U = ${E.fmtNum(sol.Ueff, 2)} V`);
    }

    // Top Header Bar
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, 28);
    drawRtlText(ctx, `סכימת מדים: A בטור · V במקביל (${sol.characterShort})`, w - 12, 19, {
      color: p.text, align: 'right', font: '700 12.5px "Heebo", sans-serif'
    });
    drawLtrText(ctx, `f = ${E.fmtFreq(sol.f_Hz)} | φ = ${E.fmtDeg(sol.phi_deg)}`, 12, 19, {
      color: p.u, align: 'left', font: '700 11px "JetBrains Mono", monospace'
    });
  }

  /* --------------------------------------------------------------------------
     2. Phasor Diagram (I, UR, UL, UC, UL-UC, U) + Impedance Triangle (R, X, Z)
     -------------------------------------------------------------------------- */
  function drawPhasorAndTriangle(canvas, sol, mode = 'both') {
    const h = Number(canvas.dataset.height) || 280;
    const { ctx, w, p } = setupCanvas(canvas, h);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, h);

    const drawImp = mode === 'both' || mode === 'triangle';
    const drawPhas = mode === 'both' || mode === 'phasors';

    const panels = (drawImp && drawPhas) ? 2 : 1;
    const gap = 12;
    const pw = panels === 2 ? (w - gap) / 2 : w;

    // Panel 1 (Right side in RTL visual order, or full width): Impedance Triangle
    if (drawImp) {
      const px0 = panels === 2 ? pw + gap : 0;
      const boxW = pw;
      const boxH = h;

      ctx.fillStyle = p.bgSub;
      ctx.strokeStyle = p.gridStrong;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px0 + 4, 4, boxW - 8, boxH - 8, 10);
      ctx.fill();
      ctx.stroke();

      drawRtlText(ctx, 'משולש עכבות (R, X = XL−XC, Z)', px0 + boxW - 14, 24, {
        color: p.text, align: 'right', font: '700 13px "Heebo", sans-serif'
      });
      drawLtrText(ctx, `Z = ${E.fmtImpedance(sol.Z_ohm)}`, px0 + 14, 24, {
        color: p.z, align: 'left', font: '700 11.5px "JetBrains Mono", monospace'
      });

      const pad = 42;
      const availW = Math.max(80, boxW - pad * 2 - 20);
      const availH = Math.max(80, boxH - 78);
      const maxX = Math.max(sol.absX_ohm, sol.R_ohm * 0.25);
      const scale = Math.min(availW / Math.max(sol.R_ohm, 1e-3), (availH * 0.70) / Math.max(maxX, 1e-3));

      const rx = Math.max(26, sol.R_ohm * scale);
      const xy = sol.X_ohm * scale;
      const ox = px0 + Math.max(28, (boxW - rx) / 2 - 12);
      const oy = sol.X_ohm >= 0 ? (boxH - 44) : 68;

      const xEnd = ox + rx;
      const yEnd = oy - xy;

      // R horizontal leg
      drawVectorArrow(ctx, ox, oy, xEnd, oy, p.ur, 3);
      drawLtrText(ctx, `R=${E.fmtNum(sol.R_ohm, 1)}Ω`, (ox + xEnd) / 2, oy + (sol.X_ohm >= 0 ? 18 : -11), {
        color: p.ur, align: 'center', font: '700 11.5px "JetBrains Mono", monospace'
      });

      const isRes = Math.abs(sol.X_ohm) <= Math.max(0.5, 0.015 * sol.R_ohm) && sol.XL_ohm > 0 && sol.XC_ohm > 0;
      if (Math.abs(xy) >= 2 && !isRes) {
        const xColor = sol.X_ohm >= 0 ? p.ul : p.uc;
        drawVectorArrow(ctx, xEnd, oy, xEnd, yEnd, xColor, 3);
        const xTxt = `X=${E.fmtNum(sol.X_ohm, 1)}Ω`;
        drawLtrText(ctx, xTxt, xEnd + 8, (oy + yEnd) / 2, {
          color: xColor,
          align: xEnd + 74 < px0 + boxW ? 'left' : 'right',
          baseline: 'middle',
          font: '700 11px "JetBrains Mono", monospace'
        });

        // Hypotenuse Z
        drawVectorArrow(ctx, ox, oy, xEnd, yEnd, p.z, 3);
        const mx = (ox + xEnd) / 2 - 12;
        const my = (oy + yEnd) / 2 + (sol.X_ohm >= 0 ? -12 : 14);
        drawLtrText(ctx, `Z=${E.fmtNum(sol.Z_ohm, 1)}Ω`, mx, my, {
          color: p.z, align: 'center', font: '700 11.5px "JetBrains Mono", monospace'
        });
        drawAngleArc(ctx, ox, oy, Math.min(34, rx * 0.42), sol.phi_rad, p.z, `${E.fmtNum(sol.phi_deg, 1)}°`);
      } else {
        drawBadge(ctx, `XL = XC ⇒ X = 0 Ω ⇒ Zmin = R = ${E.fmtNum(sol.R_ohm, 1)} Ω`, px0 + boxW / 2, oy - 30, p.ur, p, p.ur);
      }
    }

    // Panel 2 (Left side in RTL layout): Phasor Diagram (I, UR, UL, UC, UL-UC, U)
    if (drawPhas) {
      const px0 = 0;
      const boxW = pw;
      const boxH = h;

      ctx.fillStyle = p.bgSub;
      ctx.strokeStyle = p.gridStrong;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px0 + 4, 4, boxW - 8, boxH - 8, 10);
      ctx.fill();
      ctx.stroke();

      drawRtlText(ctx, 'דיאגרמת מחוגים (פאזורים)', px0 + boxW - 14, 24, {
        color: p.text, align: 'right', font: '700 13px "Heebo", sans-serif'
      });
      const charBadge = sol.character === 'inductive' ? 'ELI (U מקדים)' : (sol.character === 'capacitive' ? 'ICE (I מקדים)' : 'תהודה φ=0°');
      drawRtlText(ctx, charBadge, px0 + 14, 24, {
        color: sol.character === 'inductive' ? p.ul : (sol.character === 'capacitive' ? p.uc : p.ur),
        align: 'left',
        font: '700 11.5px "Heebo", sans-serif'
      });

      const cx = px0 + Math.max(54, boxW * 0.25);
      const cy = boxH * 0.54;
      const maxUp = Math.max(sol.UL, 1e-6);
      const maxDown = Math.max(sol.UC, 1e-6);
      const maxVert = Math.max(maxUp, maxDown, sol.UR * 0.35);
      const availRight = Math.max(60, boxW - (cx - px0) - 56);
      const availHalfY = Math.max(48, (boxH - 86) * 0.48);

      const scaleV = Math.min(availRight / Math.max(sol.UR, sol.Ueff, 1e-3), availHalfY / maxVert);

      // Axes crosshairs + degree axis labels
      ctx.strokeStyle = p.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px0 + 18, cy); ctx.lineTo(px0 + boxW - 18, cy);
      ctx.moveTo(cx, 44); ctx.lineTo(cx, boxH - 22);
      ctx.stroke();

      drawLtrText(ctx, '+90°', cx - 6, 48, { color: p.muted, align: 'right', font: '600 10px "JetBrains Mono", monospace' });
      drawLtrText(ctx, '-90°', cx - 6, boxH - 16, { color: p.muted, align: 'right', font: '600 10px "JetBrains Mono", monospace' });

      // Reference current arrow along +x
      const iLen = Math.min(availRight * 0.85, Math.max(64, sol.UR * scaleV * 0.65));
      drawVectorArrow(ctx, cx, cy, cx + iLen, cy, p.muted, 2, true);
      drawLtrText(ctx, 'I (0°)', cx + iLen + 4, cy + 14, {
        color: p.muted, align: 'left', font: '700 10.5px "JetBrains Mono", monospace'
      });

      // UR along +x
      const urPx = sol.UR * scaleV;
      if (urPx >= 3) {
        drawVectorArrow(ctx, cx, cy, cx + urPx, cy, p.ur, 3);
        drawLtrText(ctx, `UR=${E.fmtNum(sol.UR, 1)}V`, cx + urPx * 0.55, cy + 16, {
          color: p.ur, align: 'center', font: '700 11px "JetBrains Mono", monospace'
        });
      }

      // UL +90° (up)
      const ulPx = sol.UL * scaleV;
      if (ulPx >= 3) {
        drawVectorArrow(ctx, cx, cy, cx, cy - ulPx, p.ul, 3);
        drawLtrText(ctx, `UL=${E.fmtNum(sol.UL, 1)}V`, cx + 8, Math.max(48, cy - ulPx + 8), {
          color: p.ul, align: 'left', font: '700 11px "JetBrains Mono", monospace'
        });
      }

      // UC -90° (down)
      const ucPx = sol.UC * scaleV;
      if (ucPx >= 3) {
        drawVectorArrow(ctx, cx, cy, cx, cy + ucPx, p.uc, 3);
        drawLtrText(ctx, `UC=${E.fmtNum(sol.UC, 1)}V`, cx + 8, Math.min(boxH - 16, cy + ucPx - 4), {
          color: p.uc, align: 'left', font: '700 11px "JetBrains Mono", monospace'
        });
      }

      // Net UX vector & Resultant U
      const uxPx = sol.UX * scaleV;
      const uEndX = cx + urPx;
      const uEndY = cy - uxPx;

      if (sol.topology === 'RLC' && Math.abs(uxPx) >= 6 && sol.UL > 0 && sol.UC > 0) {
        drawVectorArrow(ctx, cx - 7, cy, cx - 7, cy - uxPx, p.z, 2.4);
        drawLtrText(ctx, `UX=${E.fmtNum(sol.UX, 1)}V`, cx - 12, cy - uxPx * 0.5, {
          color: p.z, align: 'right', baseline: 'middle', font: '700 10px "JetBrains Mono", monospace'
        });
      }

      if (Math.abs(uxPx) >= 3) {
        ctx.save();
        ctx.strokeStyle = p.z;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx + urPx, cy);
        ctx.lineTo(uEndX, uEndY);
        ctx.moveTo(cx, uEndY);
        ctx.lineTo(uEndX, uEndY);
        ctx.stroke();
        ctx.restore();
      }

      drawVectorArrow(ctx, cx, cy, uEndX, uEndY, p.u, 3.2);
      drawLtrText(ctx, `U=${E.fmtNum(sol.Ueff, 1)}V`, uEndX + 8, uEndY + (uxPx >= 0 ? -8 : 14), {
        color: p.u,
        align: uEndX + 68 < px0 + boxW ? 'left' : 'right',
        font: '700 11.5px "JetBrains Mono", monospace'
      });

      if (Math.abs(sol.phi_deg) > 0.5) {
        drawAngleArc(ctx, cx, cy, Math.min(30, Math.max(16, urPx * 0.45)), sol.phi_rad, p.u, `${E.fmtDeg(sol.phi_deg)}`);
      } else if (sol.UL > 0 && sol.UC > 0) {
        drawBadge(ctx, 'UL = UC ⇒ UX = 0 V , U = UR (φ = 0°)', px0 + boxW / 2 + 16, cy - 26, p.ur, p, p.ur);
      }
    }
  }

  /* --------------------------------------------------------------------------
     3. Dual-Channel Sine Oscilloscope (u, uR, uL, uC + i) with Peak Y-Axis Labels
     -------------------------------------------------------------------------- */
  function drawSineScope(canvas, sol, opts = {}) {
    const h = Number(canvas.dataset.height) || 300;
    const { ctx, w, p } = setupCanvas(canvas, h);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, h);

    const showUR = opts.showUR !== undefined ? opts.showUR : true;
    const showUL = opts.showUL !== undefined ? opts.showUL : true;
    const showUC = opts.showUC !== undefined ? opts.showUC : true;
    const cursorT = Number.isFinite(opts.cursorT) ? opts.cursorT : sol.T_s * 0.25;

    const padL = 72;
    const padR = 18;
    const padT = 32;
    const gapMid = 26;
    const padB = 34;

    const plotW = Math.max(160, w - padL - padR);
    const totalPlotH = h - padT - padB - gapMid;
    const topH = Math.round(totalPlotH * 0.60);
    const botH = totalPlotH - topH;
    const topY0 = padT;
    const botY0 = padT + topH + gapMid;

    const tMax = 2 * sol.T_s;

    // Header legend
    drawRtlText(ctx, 'משקף תנודות דו-ערוצי: מתחים וזרם בזמן', w - 14, 19, {
      color: p.text, align: 'right', font: '700 12.5px "Heebo", sans-serif'
    });
    drawLtrText(ctx, `T = ${E.fmtTimeSec(sol.T_s)}  |  Um = ${E.fmtNum(sol.Umax, 2)} V  |  Im = ${E.fmtCurrent(sol.Imax)}`, padL, 19, {
      color: p.u, align: 'left', font: '700 11px "JetBrains Mono", monospace'
    });

    // Helper for scope grid & Y-axis zero/peak pills
    function drawPlotFrame(y0, ph, yMaxAbs, unitLabel, titleLtr) {
      ctx.fillStyle = p.bgSub;
      ctx.strokeStyle = p.gridStrong;
      ctx.lineWidth = 1;
      ctx.fillRect(padL, y0, plotW, ph);
      ctx.strokeRect(padL, y0, plotW, ph);

      // Vertical time grid (8 divisions = T/4 per division across 2T)
      ctx.strokeStyle = p.grid;
      ctx.lineWidth = 1;
      for (let d = 1; d < 8; d++) {
        const gx = padL + (plotW * d) / 8;
        ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 + ph); ctx.stroke();
      }

      // Horizontal zero + +/- half
      const cy = y0 + ph / 2;
      ctx.strokeStyle = p.gridStrong;
      ctx.beginPath(); ctx.moveTo(padL, cy); ctx.lineTo(padL + plotW, cy); ctx.stroke();

      const yTop = y0 + 10;
      const yBot = y0 + ph - 10;
      ctx.strokeStyle = p.grid;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, yTop); ctx.lineTo(padL + plotW, yTop);
      ctx.moveTo(padL, yBot); ctx.lineTo(padL + plotW, yBot);
      ctx.stroke();
      ctx.setLineDash([]);

      drawLtrText(ctx, `0 ${unitLabel}`, padL - 6, cy, {
        color: p.muted, align: 'right', baseline: 'middle', font: '600 10.5px "JetBrains Mono", monospace'
      });
      drawLtrText(ctx, titleLtr, padL + 8, y0 + 13, {
        color: p.muted, align: 'left', font: '700 10.5px "JetBrains Mono", monospace'
      });

      return { cy, scaleY: (ph / 2 - 10) / Math.max(yMaxAbs, 1e-6) };
    }

    // Determine voltage vertical scale (account for high-Q resonance where UL/UC > Umax!)
    let vPeakAll = sol.Umax;
    if (showUR) vPeakAll = Math.max(vPeakAll, sol.URmax);
    if (showUL && (sol.topology === 'RL' || sol.topology === 'RLC')) vPeakAll = Math.max(vPeakAll, sol.ULmax);
    if (showUC && (sol.topology === 'RC' || sol.topology === 'RLC' || (sol.topology === 'RC_SWITCH' && !sol.switchClosed))) vPeakAll = Math.max(vPeakAll, sol.UCmax);
    vPeakAll = Math.max(vPeakAll, 1e-3);

    const topFrame = drawPlotFrame(topY0, topH, vPeakAll, 'V', 'CH1: u(t), uR(t), uL(t), uC(t) [V]');
    const iUseMA = sol.Imax < 1;
    const iPeakUnit = iUseMA ? sol.Imax_mA : sol.Imax;
    const iUnitStr = iUseMA ? 'mA' : 'A';
    const botFrame = drawPlotFrame(botY0, botH, Math.max(iPeakUnit, 1e-4), iUnitStr, `CH2: i(t) [${iUnitStr}]`);

    const nSamples = 240;
    function plotTrace(yFn, frame, color, width, dashed = false) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dashed) ctx.setLineDash([5, 4]);
      ctx.beginPath();
      for (let s = 0; s <= nSamples; s++) {
        const t = (tMax * s) / nSamples;
        const wv = E.evalWaveformsAt(sol, t);
        const y = frame.cy - yFn(wv) * frame.scaleY;
        const x = padL + (plotW * s) / nSamples;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (showUL && sol.ULmax > 1e-4) plotTrace(w => w.uL, topFrame, p.ul, 1.8, true);
    if (showUC && sol.UCmax > 1e-4) plotTrace(w => w.uC, topFrame, p.uc, 1.8, true);
    if (showUR) plotTrace(w => w.uR, topFrame, p.ur, 2.0, false);
    plotTrace(w => w.u, topFrame, p.u, 2.5, false);

    // Bottom channel: current i(t)
    plotTrace(w => (iUseMA ? w.i_mA : w.i), botFrame, p.ur, 2.5, false);

    // Explicit collision-free Y-axis peak badges on Top Plot (+Umax, -Umax, and +UL/UC peak if higher)
    function drawYAxisPeakPill(y, text, color) {
      ctx.save();
      ctx.direction = 'ltr';
      ctx.font = '700 10.5px "JetBrains Mono", monospace';
      const tw = ctx.measureText(text).width;
      const bw = tw + 8;
      const bh = 16;
      const rx = Math.max(2, padL - bw - 4);
      const ry = Math.max(2, Math.min(h - bh - 2, y - bh / 2));
      ctx.fillStyle = p.badgeBg;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(rx, ry, bw, bh, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, rx + bw / 2, ry + bh / 2 + 0.5);
      ctx.restore();
    }

    const yUmaxPos = topFrame.cy - sol.Umax * topFrame.scaleY;
    const yUmaxNeg = topFrame.cy + sol.Umax * topFrame.scaleY;
    drawYAxisPeakPill(yUmaxPos, `+${E.fmtNum(sol.Umax, 1)}V`, p.u);
    drawYAxisPeakPill(yUmaxNeg, `-${E.fmtNum(sol.Umax, 1)}V`, p.u);

    if (vPeakAll > sol.Umax * 1.15) {
      const yPeakHigh = topFrame.cy - vPeakAll * topFrame.scaleY;
      if (Math.abs(yPeakHigh - yUmaxPos) > 18) {
        const hiColor = (sol.ULmax >= sol.UCmax) ? p.ul : p.uc;
        drawYAxisPeakPill(yPeakHigh, `+${E.fmtNum(vPeakAll, 1)}V`, hiColor);
      }
    }

    // Bottom plot peak labels (+Imax / -Imax)
    const yIpos = botFrame.cy - iPeakUnit * botFrame.scaleY;
    const yIneg = botFrame.cy + iPeakUnit * botFrame.scaleY;
    drawYAxisPeakPill(yIpos, `+${E.fmtNum(iPeakUnit, 1)}${iUnitStr}`, p.ur);
    drawYAxisPeakPill(yIneg, `-${E.fmtNum(iPeakUnit, 1)}${iUnitStr}`, p.ur);

    // X-axis time ticks (0, T/2, T, 3T/2, 2T)
    for (let k = 0; k <= 4; k++) {
      const tk = (tMax * k) / 4;
      const gx = padL + (plotW * k) / 4;
      drawLtrText(ctx, k === 0 ? '0' : E.fmtTimeSec(tk), gx, botY0 + botH + 16, {
        color: p.muted, align: k === 4 ? 'right' : (k === 0 ? 'left' : 'center'),
        font: '600 10.5px "JetBrains Mono", monospace'
      });
    }

    // Interactive Cursor Line & Instantaneous Values
    const clampedT = Math.max(0, Math.min(tMax, cursorT));
    const cxCursor = padL + (plotW * (clampedT / tMax));
    const inst = E.evalWaveformsAt(sol, clampedT);

    ctx.save();
    ctx.strokeStyle = p.z;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cxCursor, topY0);
    ctx.lineTo(cxCursor, botY0 + botH);
    ctx.stroke();
    ctx.restore();

    // Cursor dots
    ctx.fillStyle = p.u;
    ctx.beginPath(); ctx.arc(cxCursor, topFrame.cy - inst.u * topFrame.scaleY, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.ur;
    ctx.beginPath(); ctx.arc(cxCursor, botFrame.cy - (iUseMA ? inst.i_mA : inst.i) * botFrame.scaleY, 4.5, 0, Math.PI * 2); ctx.fill();

    // Instantaneous cursor summary chip inside top-right of top plot
    const cursorSummary = `t=${E.fmtTimeSec(clampedT)} | u=${E.fmtNum(inst.u, 2)}V | i=${E.fmtCurrent(inst.i)}`;
    drawLtrText(ctx, cursorSummary, padL + plotW - 8, topY0 + 13, {
      color: p.z, align: 'right', font: '700 10.5px "JetBrains Mono", monospace'
    });

    canvas._scopeGeom = { padL, plotW, tMax };
  }

  /* --------------------------------------------------------------------------
     4. Frequency Sweep: Reactance Equality (XL = XC) OR Current/Impedance I(f), Z(f)
     -------------------------------------------------------------------------- */
  function drawFrequencyResponse(canvas, sol, sweep, opts = {}) {
    const h = Number(canvas.dataset.height) || 245;
    const { ctx, w, p } = setupCanvas(canvas, h);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, h);

    const chartMode = opts.chartMode || (sol.hasResonance ? 'reactance_cross' : 'current_z');
    const padL = 78;
    const padR = 64;
    const padT = 34;
    const padB = 34;
    const plotW = Math.max(160, w - padL - padR);
    const plotH = Math.max(110, h - padT - padB);

    const headerTitle = chartMode === 'reactance_cross'
      ? 'חישוב תהודה משוויון ההיגבים: חיתוך XL(f) עם XC(f)'
      : 'תגובת תדר: עכבה Z(f) וזרם I(f) (לחצו או גררו לשינוי תדר)';
    drawRtlText(ctx, headerTitle, w - 14, 20, {
      color: p.text, align: 'right', font: '700 12.5px "Heebo", sans-serif'
    });

    ctx.fillStyle = p.bgSub;
    ctx.fillRect(padL, padT, plotW, plotH);

    // Capacitive vs Inductive shaded regions for RLC
    if (sol.hasResonance && sol.f0_Hz >= sweep.fMin && sol.f0_Hz <= sweep.fMax) {
      const fx0 = padL + ((sol.f0_Hz - sweep.fMin) / (sweep.fMax - sweep.fMin)) * plotW;
      ctx.fillStyle = p.capFill;
      ctx.fillRect(padL, padT, fx0 - padL, plotH);
      ctx.fillStyle = p.indFill;
      ctx.fillRect(fx0, padT, padL + plotW - fx0, plotH);

      drawRtlText(ctx, 'קיבולי (XC > XL)', Math.max(padL + 88, (padL + fx0) / 2), padT + 17, {
        color: p.uc, align: 'center', font: '700 11px "Heebo", sans-serif'
      });
      drawRtlText(ctx, 'השראי (XL > XC)', Math.min(padL + plotW - 88, (fx0 + padL + plotW) / 2), padT + 17, {
        color: p.ul, align: 'center', font: '700 11px "Heebo", sans-serif'
      });
    }

    ctx.strokeStyle = p.gridStrong;
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);

    // Grid lines
    ctx.strokeStyle = p.grid;
    for (let i = 1; i < 5; i++) {
      const gy = padT + (plotH * i) / 5;
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(padL + plotW, gy); ctx.stroke();
    }
    for (let j = 1; j < 6; j++) {
      const gx = padL + (plotW * j) / 6;
      ctx.beginPath(); ctx.moveTo(gx, padT); ctx.lineTo(gx, padT + plotH); ctx.stroke();
    }

    const curF = Math.max(sweep.fMin, Math.min(sweep.fMax, sol.f_Hz));
    const curX = padL + ((curF - sweep.fMin) / (sweep.fMax - sweep.fMin)) * plotW;

    if (chartMode === 'reactance_cross') {
      const reactMaxPlot = sol.hasResonance
        ? Math.max(sol.XL0_ohm * 2.35, sol.R_ohm * 1.4, Math.min(Math.max(sol.XL_ohm, sol.XC_ohm) * 1.15, sol.XL0_ohm * 3.6), 10)
        : Math.max(sol.XL_ohm * 1.6, sol.XC_ohm * 1.6, sol.R_ohm * 1.5, 20);

      const yOfOhm = (ohm) => padT + plotH - (ohm / reactMaxPlot) * (plotH - 12);

      // Clipped curve region so 1/f asymptote never overflows plot box
      ctx.save();
      ctx.beginPath();
      ctx.rect(padL, padT, plotW, plotH);
      ctx.clip();

      // Horizontal dashed reference for R
      const ry = yOfOhm(sol.R_ohm);
      ctx.strokeStyle = p.ur;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(padL, ry); ctx.lineTo(padL + plotW, ry); ctx.stroke();
      ctx.setLineDash([]);

      // XL(f) rising straight line (violet)
      if (sol.topology === 'RL' || sol.topology === 'RLC') {
        ctx.strokeStyle = p.ul;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        sweep.points.forEach((pt, idx) => {
          const x = padL + ((pt.f - sweep.fMin) / (sweep.fMax - sweep.fMin)) * plotW;
          const y = yOfOhm(pt.XL);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // XC(f) falling hyperbola (coral)
      if (sol.topology === 'RC' || sol.topology === 'RLC' || (sol.topology === 'RC_SWITCH' && !sol.switchClosed)) {
        ctx.strokeStyle = p.uc;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        sweep.points.forEach((pt, idx) => {
          const x = padL + ((pt.f - sweep.fMin) / (sweep.fMax - sweep.fMin)) * plotW;
          const y = yOfOhm(pt.XC);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      ctx.restore();

      // Axis labels
      drawLtrText(ctx, '0 Ω', padL - 6, padT + plotH, {
        color: p.muted, align: 'right', baseline: 'middle', font: '600 10.5px "JetBrains Mono", monospace'
      });
      drawLtrText(ctx, `R=${E.fmtNum(sol.R_ohm, 0)}Ω`, padL + plotW + 6, Math.max(padT + 12, Math.min(padT + plotH - 8, ry)), {
        color: p.ur, align: 'left', baseline: 'middle', font: '700 10.5px "JetBrains Mono", monospace'
      });

      // Resonance crossing marker (XL = XC at f0)
      if (sol.hasResonance && sol.f0_Hz >= sweep.fMin && sol.f0_Hz <= sweep.fMax) {
        const fx0 = padL + ((sol.f0_Hz - sweep.fMin) / (sweep.fMax - sweep.fMin)) * plotW;
        const fyCross = yOfOhm(sol.XL0_ohm);

        ctx.save();
        ctx.strokeStyle = p.ur;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(fx0, padT); ctx.lineTo(fx0, padT + plotH); ctx.stroke();
        ctx.restore();

        // Intersection bullseye
        ctx.fillStyle = p.bgSub;
        ctx.strokeStyle = p.ur;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(fx0, fyCross, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = p.ur;
        ctx.beginPath(); ctx.arc(fx0, fyCross, 3, 0, Math.PI * 2); ctx.fill();

        drawLtrText(ctx, `XL=XC=${E.fmtNum(sol.XL0_ohm, 1)}Ω`, padL - 6, fyCross, {
          color: p.ur, align: 'right', baseline: 'middle', font: '700 10.5px "JetBrains Mono", monospace'
        });
        drawBadge(ctx, `f₀=${E.fmtFreq(sol.f0_Hz)} (XL=XC)`, Math.min(padL + plotW - 70, Math.max(padL + 70, fx0)), padT + plotH - 16, p.ur, p, p.ur);
      } else {
        drawLtrText(ctx, E.fmtImpedance(reactMaxPlot), padL - 6, padT + 12, {
          color: p.muted, align: 'right', baseline: 'middle', font: '700 10.5px "JetBrains Mono", monospace'
        });
      }

      // Current frequency cursor & live XL/XC dots
      ctx.strokeStyle = p.u;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(curX, padT); ctx.lineTo(curX, padT + plotH); ctx.stroke();

      if (sol.XL_ohm > 0 && sol.XL_ohm <= reactMaxPlot) {
        const cyXL = yOfOhm(sol.XL_ohm);
        ctx.fillStyle = p.ul;
        ctx.beginPath(); ctx.arc(curX, cyXL, 5, 0, Math.PI * 2); ctx.fill();
        drawLtrText(ctx, `XL=${E.fmtNum(sol.XL_ohm, 0)}Ω`, Math.min(padL + plotW - 44, curX + 8), Math.max(padT + 14, cyXL - 6), {
          color: p.ul, align: 'left', font: '700 10.5px "JetBrains Mono", monospace'
        });
      }
      if (sol.XC_ohm > 0 && sol.XC_ohm <= reactMaxPlot) {
        const cyXC = yOfOhm(sol.XC_ohm);
        ctx.fillStyle = p.uc;
        ctx.beginPath(); ctx.arc(curX, cyXC, 5, 0, Math.PI * 2); ctx.fill();
        drawLtrText(ctx, `XC=${E.fmtNum(sol.XC_ohm, 0)}Ω`, Math.max(padL + 52, curX - 8), Math.min(padT + plotH - 22, cyXC + 12), {
          color: p.uc, align: 'right', font: '700 10.5px "JetBrains Mono", monospace'
        });
      }
    } else {
      const iMaxPlot = sweep.iMaxPlot_mA;
      const zMaxPlot = sweep.zMaxPlot;

      // Plot Z(f) dashed (Amber, right axis)
      ctx.save();
      ctx.strokeStyle = p.z;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      sweep.points.forEach((pt, idx) => {
        const x = padL + ((pt.f - sweep.fMin) / (sweep.fMax - sweep.fMin)) * plotW;
        const y = padT + plotH - (pt.Z / zMaxPlot) * (plotH - 12);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();

      // Plot I(f) solid (Cyan/Emerald, left axis)
      ctx.save();
      ctx.strokeStyle = p.u;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      sweep.points.forEach((pt, idx) => {
        const x = padL + ((pt.f - sweep.fMin) / (sweep.fMax - sweep.fMin)) * plotW;
        const y = padT + plotH - (pt.I_mA / iMaxPlot) * (plotH - 12);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();

      // Left Y-axis zero + peak labels
      const iUseA = iMaxPlot >= 1000;
      const fmtIaxis = (mA) => iUseA ? `${E.fmtNum(mA / 1000, 2)}A` : `${E.fmtNum(mA, 1)}mA`;
      drawLtrText(ctx, '0', padL - 6, padT + plotH, {
        color: p.muted, align: 'right', baseline: 'middle', font: '600 10.5px "JetBrains Mono", monospace'
      });
      drawLtrText(ctx, `Z: ${E.fmtImpedance(zMaxPlot)}`, padL + plotW + 6, padT + 14, {
        color: p.z, align: 'left', baseline: 'middle', font: '700 10.5px "JetBrains Mono", monospace'
      });

      // Resonance marker f0
      if (sol.hasResonance && sol.f0_Hz >= sweep.fMin && sol.f0_Hz <= sweep.fMax) {
        const fx0 = padL + ((sol.f0_Hz - sweep.fMin) / (sweep.fMax - sweep.fMin)) * plotW;
        const fy0 = padT + plotH - (sol.Ieff_res_mA / iMaxPlot) * (plotH - 12);
        ctx.save();
        ctx.strokeStyle = p.ur;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(fx0, padT); ctx.lineTo(fx0, padT + plotH); ctx.stroke();
        ctx.restore();

        ctx.fillStyle = p.ur;
        ctx.beginPath(); ctx.arc(fx0, fy0, 4.5, 0, Math.PI * 2); ctx.fill();
        drawBadge(ctx, `f₀=${E.fmtFreq(sol.f0_Hz)}`, Math.min(padL + plotW - 55, Math.max(padL + 55, fx0)), padT + plotH - 16, p.ur, p, p.ur);

        drawLtrText(ctx, `Imax=${fmtIaxis(sol.Ieff_res_mA)}`, padL - 6, fy0, {
          color: p.ur, align: 'right', baseline: 'middle', font: '700 10.5px "JetBrains Mono", monospace'
        });
      } else {
        const maxPtY = padT + 12;
        drawLtrText(ctx, fmtIaxis(iMaxPlot), padL - 6, maxPtY, {
          color: p.u, align: 'right', baseline: 'middle', font: '700 10.5px "JetBrains Mono", monospace'
        });
      }

      // Current operating frequency marker
      const curY = padT + plotH - (sol.Ieff_mA / iMaxPlot) * (plotH - 12);
      const curZy = padT + plotH - (sol.Z_ohm / zMaxPlot) * (plotH - 12);

      ctx.strokeStyle = p.u;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(curX, padT); ctx.lineTo(curX, padT + plotH); ctx.stroke();

      ctx.fillStyle = p.u;
      ctx.beginPath(); ctx.arc(curX, curY, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.z;
      ctx.beginPath(); ctx.arc(curX, curZy, 4.5, 0, Math.PI * 2); ctx.fill();

      if (!sol.hasResonance || Math.abs(sol.Ieff_mA - sol.Ieff_res_mA) > iMaxPlot * 0.08) {
        drawLtrText(ctx, fmtIaxis(sol.Ieff_mA), padL - 6, Math.min(padT + plotH - 12, Math.max(padT + 12, curY)), {
          color: p.u, align: 'right', baseline: 'middle', font: '700 10.5px "JetBrains Mono", monospace'
        });
      }
      drawLtrText(ctx, `Z=${E.fmtImpedance(sol.Z_ohm)}`, padL + plotW + 6, Math.min(padT + plotH - 10, Math.max(padT + 26, curZy)), {
        color: p.z, align: 'left', baseline: 'middle', font: '700 10.5px "JetBrains Mono", monospace'
      });
    }

    // Bottom X-axis labels
    drawLtrText(ctx, E.fmtFreq(sweep.fMin), padL, padT + plotH + 17, {
      color: p.muted, align: 'left', font: '600 10.5px "JetBrains Mono", monospace'
    });
    drawLtrText(ctx, `f = ${E.fmtFreq(sol.f_Hz)}`, curX, padT + plotH + 17, {
      color: p.u, align: 'center', font: '700 11px "JetBrains Mono", monospace'
    });
    drawLtrText(ctx, E.fmtFreq(sweep.fMax), padL + plotW, padT + plotH + 17, {
      color: p.muted, align: 'right', font: '600 10.5px "JetBrains Mono", monospace'
    });

    canvas._freqPlotGeom = { padL, plotW, fMin: sweep.fMin, fMax: sweep.fMax };
  }

  root.ACVisuals = {
    drawACSchematic,
    drawPhasorAndTriangle,
    drawSineScope,
    drawFrequencyResponse
  };
})(window);
