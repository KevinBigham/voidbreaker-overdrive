import {
  CathodeWorkbenchState,
  ContrabandToolId,
  CoreType,
  DESK_HEIGHT,
  DESK_WIDTH,
  DeskContrabandTool,
  MAGNETIC_SNAP_RADIUS,
  SOCKETS,
} from './simulation';

export interface WorkbenchTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  muteBtnRect: { x: number; y: number; w: number; h: number };
  resetBtnRect: { x: number; y: number; w: number; h: number };
}

export function computeWorkbenchTransform(
  viewportW: number,
  viewportH: number
): WorkbenchTransform {
  const scale = Math.min(viewportW / DESK_WIDTH, viewportH / DESK_HEIGHT);
  const offsetX = (viewportW - DESK_WIDTH * scale) * 0.5;
  const offsetY = (viewportH - DESK_HEIGHT * scale) * 0.5;
  return {
    offsetX,
    offsetY,
    scale,
    // Diegetic brass faceplate toggle screws in top-right corner of the chassis
    muteBtnRect: { x: 1125, y: 42, w: 58, h: 32 },
    resetBtnRect: { x: 1192, y: 42, w: 58, h: 32 },
  };
}

function drawRivet(ctx: CanvasRenderingContext2D, x: number, y: number, r = 5): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#78552b';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#291d0e';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y - r * 0.2);
  ctx.lineTo(x + r * 0.55, y + r * 0.2);
  ctx.strokeStyle = '#1c1309';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function drawBrassPlaque(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  subtitle?: string,
  accentColor = '#d97706'
): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#362712');
  grad.addColorStop(0.5, '#241a0c');
  grad.addColorStop(1, '#181107');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = accentColor;
  ctx.stroke();

  drawRivet(ctx, x + 7, y + 7, 2.5);
  drawRivet(ctx, x + w - 7, y + 7, 2.5);
  drawRivet(ctx, x + 7, y + h - 7, 2.5);
  drawRivet(ctx, x + w - 7, y + h - 7, 2.5);

  ctx.fillStyle = '#fde68a';
  ctx.font = '800 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, x + w * 0.5, y + (subtitle ? h * 0.44 : h * 0.62));

  if (subtitle) {
    ctx.fillStyle = '#d6d3d1';
    ctx.font = '700 9.5px "Courier New", monospace';
    ctx.fillText(subtitle, x + w * 0.5, y + h * 0.78);
  }
  ctx.restore();
}

function drawAnalogGauge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  needleNorm: number,
  title: string,
  unitLabel: string,
  warmup: number
): void {
  ctx.save();

  // Outer brass bezel
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 7, 0, Math.PI * 2);
  const bezelGrad = ctx.createRadialGradient(cx - 10, cy - 10, 4, cx, cy, radius + 7);
  bezelGrad.addColorStop(0, '#eab308');
  bezelGrad.addColorStop(0.65, '#854d0e');
  bezelGrad.addColorStop(1, '#3f2708');
  ctx.fillStyle = bezelGrad;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#1c1206';
  ctx.stroke();

  // Warm backlit parchment face
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  const faceGrad = ctx.createRadialGradient(cx, cy + 8, 4, cx, cy, radius);
  faceGrad.addColorStop(0, `rgba(254, 240, 138, ${0.22 + warmup * 0.68})`);
  faceGrad.addColorStop(0.7, `rgba(180, 115, 38, ${0.28 + warmup * 0.52})`);
  faceGrad.addColorStop(1, '#1c1309');
  ctx.fillStyle = faceGrad;
  ctx.fill();

  // Scale arc & ticks (-135 deg to -45 deg, centered upward)
  const startAngle = -Math.PI * 0.82;
  const endAngle = -Math.PI * 0.18;
  const redZoneStart = startAngle + (endAngle - startAngle) * 0.68;

  ctx.beginPath();
  ctx.arc(cx, cy + 12, radius * 0.76, redZoneStart, endAngle);
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
  ctx.lineWidth = 6;
  ctx.stroke();

  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const ang = startAngle + (endAngle - startAngle) * t;
    const rInner = radius * (i % 2 === 0 ? 0.64 : 0.7);
    const rOuter = radius * 0.82;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * rInner, cy + 12 + Math.sin(ang) * rInner);
    ctx.lineTo(cx + Math.cos(ang) * rOuter, cy + 12 + Math.sin(ang) * rOuter);
    ctx.strokeStyle = t >= 0.7 ? '#ef4444' : '#291d0e';
    ctx.lineWidth = i % 2 === 0 ? 2 : 1.2;
    ctx.stroke();
  }

  // Labels
  ctx.fillStyle = '#1c1309';
  ctx.font = '900 10px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, cx, cy - radius * 0.16);
  ctx.font = '800 9px "Courier New", monospace';
  ctx.fillText(unitLabel, cx, cy + 5);

  // Damped spring needle
  const clamped = Math.max(-0.08, Math.min(1.12, needleNorm));
  const needleAngle = startAngle + (endAngle - startAngle) * clamped;
  const pivotY = cy + 16;

  ctx.save();
  ctx.translate(cx, pivotY);
  ctx.rotate(needleAngle);
  ctx.beginPath();
  ctx.moveTo(-6, -2.2);
  ctx.lineTo(radius * 0.82, 0);
  ctx.lineTo(-6, 2.2);
  ctx.closePath();
  ctx.fillStyle = '#b91c1c';
  ctx.fill();
  ctx.restore();

  // Pivot cap
  ctx.beginPath();
  ctx.arc(cx, pivotY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#451a03';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawGlassVacuumFusesAndShield(
  ctx: CanvasRenderingContext2D,
  state: CathodeWorkbenchState,
  nowSec: number
): void {
  ctx.save();

  // Fuse Bank Housing Panel (Top-Left)
  ctx.beginPath();
  ctx.roundRect(62, 68, 308, 162, 10);
  ctx.fillStyle = '#17120c';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#78552b';
  ctx.stroke();

  drawBrassPlaque(
    ctx,
    82,
    76,
    268,
    26,
    `CHASSIS VACUUM FUSES [${state.fusesRemaining}/4 INTACT]`,
    undefined,
    state.fusesRemaining <= 1 ? '#ef4444' : '#b45309'
  );

  // Draw the 4 Physical Glass Vacuum Fuses
  for (const fuse of state.fuses) {
    const fx = fuse.x;
    const fy = fuse.y;

    // Top & bottom brass screw sockets
    ctx.fillStyle = '#92400e';
    ctx.fillRect(fx - 17, fy - 38, 34, 12);
    ctx.fillRect(fx - 17, fy + 26, 34, 12);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(fx - 17, fy - 38, 34, 12);
    ctx.strokeRect(fx - 17, fy + 26, 34, 12);

    // Glass cylinder envelope
    ctx.beginPath();
    ctx.roundRect(fx - 14, fy - 26, 28, 52, 6);
    if (fuse.intact) {
      const flicker = 0.88 + 0.12 * Math.sin(nowSec * 19 + fuse.index * 2.1);
      const glowAlpha = fuse.filamentGlow * state.cathodeWarmup * flicker;
      const glassGrad = ctx.createRadialGradient(fx, fy, 2, fx, fy, 26);
      glassGrad.addColorStop(0, `rgba(251, 191, 36, ${0.42 * glowAlpha})`);
      glassGrad.addColorStop(0.6, `rgba(217, 119, 6, ${0.22 * glowAlpha})`);
      glassGrad.addColorStop(1, 'rgba(30, 41, 59, 0.55)');
      ctx.fillStyle = glassGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Glowing tungsten filament inside intact glass fuse
      ctx.beginPath();
      ctx.moveTo(fx, fy - 25);
      ctx.lineTo(fx - 4, fy - 10);
      ctx.lineTo(fx + 4, fy);
      ctx.lineTo(fx - 4, fy + 10);
      ctx.lineTo(fx, fy + 25);
      ctx.strokeStyle = state.machineAwake ? '#fef08a' : '#78350f';
      ctx.lineWidth = state.machineAwake ? 2.4 : 1.5;
      if (state.machineAwake) {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      // Shattered / charred glass fuse!
      ctx.fillStyle = 'rgba(24, 24, 27, 0.86)';
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Jagged glass crack lines
      ctx.beginPath();
      ctx.moveTo(fx - 12, fy - 14);
      ctx.lineTo(fx + 3, fy - 2);
      ctx.lineTo(fx - 8, fy + 9);
      ctx.lineTo(fx + 11, fy + 18);
      ctx.moveTo(fx + 3, fy - 2);
      ctx.lineTo(fx + 12, fy - 9);
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.78)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // White-hot shatter flash if just blown
      if (fuse.shatterFlash > 0) {
        ctx.beginPath();
        ctx.arc(fx, fy, 26 * fuse.shatterFlash, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(254, 242, 242, ${fuse.shatterFlash})`;
        ctx.fill();
      }
    }

    // Specular glass highlight
    ctx.beginPath();
    ctx.moveTo(fx - 9, fy - 20);
    ctx.lineTo(fx - 9, fy + 18);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Smoke wisps rising from blown fuse sockets
    for (const sm of fuse.smokeParticles) {
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(148, 163, 184, ${Math.max(0, sm.alpha)})`;
      ctx.fill();
    }
  }

  // Fuse Armor Rail Socket Indicator (when dragging Lead Blast Shield or when armed)
  const draggingShield = state.deskTools.some(
    (t) => t.kind === 'blast_shield' && t.isDragging
  );
  if (draggingShield && !state.leadShieldArmed) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(80, 108, 272, 88, 8);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '800 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DROP LEAD BLAST SHIELD HERE (<28px SNAP)', SOCKETS.fuseShieldRail.x, 214);
    ctx.restore();
  }

  // If Lead Blast Shield is slotted in front of the fuses (or cracked after saving you)
  if (state.leadShieldArmed || state.leadShieldCracked) {
    ctx.save();
    const sx = SOCKETS.fuseShieldRail.x - 132;
    const sy = SOCKETS.fuseShieldRail.y - 40;
    ctx.beginPath();
    ctx.roundRect(sx, sy, 264, 80, 8);
    ctx.fillStyle = state.leadShieldArmed ? 'rgba(51, 65, 85, 0.92)' : 'rgba(30, 41, 59, 0.55)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = state.leadShieldArmed ? '#38bdf8' : '#ef4444';
    ctx.stroke();

    ctx.fillStyle = state.leadShieldArmed ? '#e2e8f0' : '#fca5a5';
    ctx.font = '900 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      state.leadShieldArmed
        ? '🛡️ LEAD BLAST SHIELD ARMED (1 MISFIRE ABSORPTION)'
        : '💥 LEAD SHIELD CRACKED (ABSORBED ARC-FLASH)',
      SOCKETS.fuseShieldRail.x,
      SOCKETS.fuseShieldRail.y + 4
    );

    if (state.leadShieldCracked) {
      ctx.beginPath();
      ctx.moveTo(sx + 40, sy + 6);
      ctx.lineTo(sx + 125, sy + 42);
      ctx.lineTo(sx + 95, sy + 75);
      ctx.moveTo(sx + 125, sy + 42);
      ctx.lineTo(sx + 210, sy + 18);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawTippingBrassBalanceScale(
  ctx: CanvasRenderingContext2D,
  state: CathodeWorkbenchState
): void {
  ctx.save();

  // Housing Frame (Top-Center)
  ctx.beginPath();
  ctx.roundRect(390, 52, 500, 178, 10);
  ctx.fillStyle = '#17120c';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#92400e';
  ctx.stroke();

  // Mechanical Rolling-Drum Odometer & Nixie Quota Readout at Top of Scale
  drawBrassPlaque(
    ctx,
    408,
    60,
    245,
    36,
    `CHAMBER 0${state.chamberNumber} BALANCE QUOTA`,
    `TARGET: ${state.scaleQuotaGrams}g BRASS`,
    '#d97706'
  );

  // Mechanical Odometer Window (4 rolling brass digit drums)
  const odoVal = Math.max(0, Math.round(state.odometerDisplayGrams));
  const digits = String(odoVal).padStart(4, '0').split('');
  const odoX = 668;
  const odoY = 60;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(odoX, odoY, 128, 36);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(odoX, odoY, 128, 36);

  digits.forEach((d, idx) => {
    const dx = odoX + 6 + idx * 28;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(dx, odoY + 4, 24, 28);
    ctx.fillStyle = odoVal >= state.scaleQuotaGrams ? '#4ade80' : '#fbbf24';
    ctx.font = '900 19px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(d, dx + 12, odoY + 25);
  });
  ctx.fillStyle = '#fde68a';
  ctx.font = '800 11px "Courier New", monospace';
  ctx.fillText('g', odoX + 120, odoY + 24);

  // Threshold Bell Indicator on Right
  const quotaTipped = state.scaleAccumulatedGrams >= state.scaleQuotaGrams;
  ctx.beginPath();
  ctx.arc(845, 78, 16, 0, Math.PI * 2);
  ctx.fillStyle = quotaTipped ? '#22c55e' : '#451a03';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();
  ctx.fillStyle = quotaTipped ? '#052e16' : '#fde68a';
  ctx.font = '900 9px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(quotaTipped ? 'TIPPED!' : 'BELL', 845, 81);

  // Central Fulcrum Pillar
  const fulcrumX = 640;
  const fulcrumY = 138;

  ctx.beginPath();
  ctx.moveTo(fulcrumX - 18, 222);
  ctx.lineTo(fulcrumX + 18, 222);
  ctx.lineTo(fulcrumX + 6, fulcrumY);
  ctx.lineTo(fulcrumX - 6, fulcrumY);
  ctx.closePath();
  ctx.fillStyle = '#b45309';
  ctx.fill();
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Oscillating Balance Beam
  const beamAngle = Math.max(-0.34, Math.min(0.36, state.scaleBeamNeedle.value));
  const beamHalfSpan = 165;

  const leftAnchorX = fulcrumX - Math.cos(beamAngle) * beamHalfSpan;
  const leftAnchorY = fulcrumY - Math.sin(beamAngle) * beamHalfSpan;
  const rightAnchorX = fulcrumX + Math.cos(beamAngle) * beamHalfSpan;
  const rightAnchorY = fulcrumY + Math.sin(beamAngle) * beamHalfSpan;

  ctx.save();
  ctx.translate(fulcrumX, fulcrumY);
  ctx.rotate(beamAngle);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(-beamHalfSpan, -4, beamHalfSpan * 2, 8);
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-beamHalfSpan, -4, beamHalfSpan * 2, 8);
  ctx.restore();

  // Left Pan: Quota Reference Iron Block
  const leftPanY = leftAnchorY + 42;
  ctx.beginPath();
  ctx.moveTo(leftAnchorX, leftAnchorY);
  ctx.lineTo(leftAnchorX - 38, leftPanY);
  ctx.moveTo(leftAnchorX, leftAnchorY);
  ctx.lineTo(leftAnchorX + 38, leftPanY);
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(leftAnchorX, leftPanY, 44, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#92400e';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  // Stamped Iron Quota Block sitting on Left Pan
  ctx.fillStyle = '#334155';
  ctx.fillRect(leftAnchorX - 30, leftPanY - 28, 60, 26);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(leftAnchorX - 30, leftPanY - 28, 60, 26);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${state.scaleQuotaGrams}g`, leftAnchorX, leftPanY - 11);

  // Right Pan: Vault Payout Brass Pan
  const rightPanY = rightAnchorY + 42;
  ctx.beginPath();
  ctx.moveTo(rightAnchorX, rightAnchorY);
  ctx.lineTo(rightAnchorX - 44, rightPanY);
  ctx.moveTo(rightAnchorX, rightAnchorY);
  ctx.lineTo(rightAnchorX + 44, rightPanY);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(rightAnchorX, rightPanY, 50, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#b45309';
  ctx.fill();
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Threshold Pin on the right wall
  ctx.beginPath();
  ctx.moveTo(868, 198);
  ctx.lineTo(885, 198);
  ctx.strokeStyle = quotaTipped ? '#4ade80' : '#ef4444';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Physical Brass Weights stacked on the Right Pan
  state.scalePanWeights.slice(-5).forEach((w, idx) => {
    const wx = rightAnchorX - 26 + (idx % 3) * 24;
    const wy = w.landed ? rightPanY - 18 - Math.floor(idx / 3) * 14 : w.y;
    ctx.fillStyle = w.color;
    ctx.fillRect(wx - 11, wy, 22, 15);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(wx - 11, wy, 22, 15);
    ctx.fillStyle = '#1c1309';
    ctx.font = '900 8.5px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(w.label, wx, wy + 11);
  });

  // If 3X Overclock Iron Weight is active on the Right Pan
  if (state.overclockTurnsRemaining > 0) {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(rightAnchorX - 24, rightPanY - 38, 48, 18);
    ctx.strokeStyle = '#fef08a';
    ctx.strokeRect(rightAnchorX - 24, rightPanY - 38, 48, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10px "Courier New", monospace';
    ctx.fillText(`3X (${state.overclockTurnsRemaining}T)`, rightAnchorX, rightPanY - 25);
  }

  // Highlight Right Pan if player is dragging Overclock Weight
  const draggingOverclock = state.deskTools.some(
    (t) => t.kind === 'overclock_weight' && t.isDragging
  );
  if (draggingOverclock) {
    ctx.beginPath();
    ctx.arc(SOCKETS.scaleRightPan.x, SOCKETS.scaleRightPan.y, MAGNETIC_SNAP_RADIUS + 6, 0, Math.PI * 2);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawBatchManifestAndSpentTray(
  ctx: CanvasRenderingContext2D,
  state: CathodeWorkbenchState
): void {
  ctx.save();

  // Left Desk Deduction Panel
  ctx.beginPath();
  ctx.roundRect(48, 250, 212, 336, 10);
  ctx.fillStyle = '#16110b';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#78552b';
  ctx.stroke();

  drawBrassPlaque(
    ctx,
    60,
    260,
    188,
    34,
    `BATCH #${state.batchNumberInChamber} MANIFEST`,
    'CARD-COUNTING DEDUCTION',
    '#d97706'
  );

  // Live deduction count of remaining shells in the drum
  const remLive = state.drumQueue.filter((c) => c === 'live').length;
  const remBlank = state.drumQueue.filter((c) => c === 'blank').length;
  const remVol = state.drumQueue.filter((c) => c === 'volatile').length;

  const rows: Array<{ label: string; count: number; init: number; color: string }> = [
    {
      label: 'LIVE HV CORES',
      count: remLive,
      init: state.drumBatchInitialCounts.live,
      color: '#ef4444',
    },
    {
      label: 'INERT BLANKS',
      count: remBlank,
      init: state.drumBatchInitialCounts.blank,
      color: '#38bdf8',
    },
    {
      label: 'VOLATILE (2X)',
      count: remVol,
      init: state.drumBatchInitialCounts.volatile,
      color: '#f59e0b',
    },
  ];

  rows.forEach((r, idx) => {
    const ry = 308 + idx * 44;
    ctx.fillStyle = '#23190f';
    ctx.fillRect(62, ry, 184, 36);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(62, ry, 184, 36);

    ctx.fillStyle = r.color;
    ctx.font = '900 10.5px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(r.label, 70, ry + 15);

    ctx.fillStyle = '#fde68a';
    ctx.font = '800 10px "Courier New", monospace';
    ctx.fillText(`IN DRUM: ${r.count} / ${r.init}`, 70, ry + 29);

    // Physical tally pins on the right of each row
    for (let p = 0; p < r.init; p++) {
      ctx.beginPath();
      ctx.arc(195 + p * 11, ry + 18, 4, 0, Math.PI * 2);
      ctx.fillStyle = p < r.count ? r.color : '#334155';
      ctx.fill();
    }
  });

  // Spent Shell Velvet Tray (Bottom of Left Panel)
  drawBrassPlaque(ctx, 60, 446, 188, 24, 'SPENT / EJECTED SHELLS', undefined, '#78552b');
  ctx.fillStyle = '#0c1912';
  ctx.fillRect(62, 476, 184, 98);
  ctx.strokeStyle = '#3f2e18';
  ctx.strokeRect(62, 476, 184, 98);

  state.spentShells.slice(-8).forEach((s, idx) => {
    const sx = 82 + (idx % 4) * 44;
    const sy = 502 + Math.floor(idx / 4) * 42;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(s.rotation);
    const col =
      s.type === 'volatile' ? '#f59e0b' : s.type === 'live' ? '#ef4444' : '#38bdf8';
    ctx.fillStyle = col;
    ctx.fillRect(-9, -14, 18, 28);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-9, -14, 18, 28);
    ctx.fillStyle = '#090d16';
    ctx.font = '900 8px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(s.type === 'volatile' ? '2X' : s.type === 'live' ? 'LV' : 'BL', 0, 3);
    ctx.restore();
  });

  ctx.restore();
}

function drawRouteSelectorKnifeSwitch(
  ctx: CanvasRenderingContext2D,
  state: CathodeWorkbenchState
): void {
  const cx = SOCKETS.knifeSwitchCenter.x;
  const cy = SOCKETS.knifeSwitchCenter.y;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - 72, cy - 115, 144, 230, 10);
  ctx.fillStyle = '#1b140c';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#b45309';
  ctx.stroke();

  drawBrassPlaque(ctx, cx - 64, cy - 106, 128, 30, '1. ROUTE SWITCH', 'DRAG / FLIP BLADE');

  // Top Contact Jaws: TARGET VAULT
  const isVault = state.routeTarget === 'vault';
  ctx.fillStyle = isVault ? 'rgba(245, 158, 11, 0.25)' : '#120e09';
  ctx.fillRect(cx - 56, cy - 66, 112, 46);
  ctx.strokeStyle = isVault ? '#fbbf24' : '#574124';
  ctx.lineWidth = isVault ? 2.2 : 1.2;
  ctx.strokeRect(cx - 56, cy - 66, 112, 46);

  ctx.fillStyle = isVault ? '#fde68a' : '#a8a29e';
  ctx.font = '900 10.5px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('▲ TARGET VAULT', cx, cy - 46);
  ctx.font = '700 8.5px "Courier New", monospace';
  ctx.fillText('LIVE: SCORE WEIGHT', cx, cy - 33);
  ctx.fillText('BLANK: -75g BACKFIRE', cx, cy - 23);

  // Bottom Contact Jaws: CHASSIS GROUND
  const isChassis = state.routeTarget === 'chassis';
  ctx.fillStyle = isChassis ? 'rgba(56, 189, 248, 0.24)' : '#120e09';
  ctx.fillRect(cx - 56, cy + 24, 112, 52);
  ctx.strokeStyle = isChassis ? '#38bdf8' : '#574124';
  ctx.lineWidth = isChassis ? 2.2 : 1.2;
  ctx.strokeRect(cx - 56, cy + 24, 112, 52);

  ctx.fillStyle = isChassis ? '#e0f2fe' : '#a8a29e';
  ctx.font = '900 10.5px "Courier New", monospace';
  ctx.fillText('▼ CHASSIS GROUND', cx, cy + 42);
  ctx.font = '700 8.5px "Courier New", monospace';
  ctx.fillText('BLANK: +75g & SURGE', cx, cy + 55);
  ctx.fillText('LIVE: BLOWS 1 FUSE!', cx, cy + 66);

  // Physical Copper Knife Blade & Bakelite Handle
  const handleY = cy - 42 + state.knifeSwitchLeverAnim * 88;
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy);
  ctx.lineTo(cx - 8, handleY);
  ctx.moveTo(cx + 12, cy);
  ctx.lineTo(cx + 8, handleY);
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Bakelite insulated cross-bar handle
  ctx.beginPath();
  ctx.roundRect(cx - 34, handleY - 10, 68, 20, 6);
  ctx.fillStyle = isVault ? '#b91c1c' : '#0284c7';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fde68a';
  ctx.stroke();

  if (state.overclockTurnsRemaining > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 9px "Courier New", monospace';
    ctx.fillText(`🔒 LOCKED (${state.overclockTurnsRemaining}T)`, cx, cy + 96);
  } else if (state.groundSurgeBonusActive) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 9px "Courier New", monospace';
    ctx.fillText('⚡ +50% SURGE READY!', cx, cy + 96);
  } else {
    ctx.fillStyle = '#a8a29e';
    ctx.font = '700 8.5px "Courier New", monospace';
    ctx.fillText('[CLICK OR DRAG HANDLE]', cx, cy + 96);
  }

  ctx.restore();
}

function drawCentralFeederDrumAndBootSocket(
  ctx: CanvasRenderingContext2D,
  state: CathodeWorkbenchState,
  nowSec: number
): void {
  const dcx = SOCKETS.drumCenter.x;
  const dcy = SOCKETS.drumCenter.y;

  ctx.save();

  // Outer Drum Console Frame
  ctx.beginPath();
  ctx.roundRect(dcx - 165, dcy - 122, 330, 260, 14);
  ctx.fillStyle = '#18120b';
  ctx.fill();
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = '#92400e';
  ctx.stroke();

  // Revolving Brass Feeder Drum (Gear teeth + 6 cylinder chambers)
  ctx.save();
  ctx.translate(dcx, dcy - 18);
  ctx.rotate(state.drumAngleRad);

  const drumR = 76;
  for (let t = 0; t < 18; t++) {
    const a = (t / 18) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = '#78552b';
    ctx.fillRect(drumR - 3, -4, 9, 8);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, drumR, 0, Math.PI * 2);
  const drumGrad = ctx.createRadialGradient(-16, -16, 8, 0, 0, drumR);
  drumGrad.addColorStop(0, '#ca8a04');
  drumGrad.addColorStop(0.68, '#713f12');
  drumGrad.addColorStop(1, '#291d0e');
  ctx.fillStyle = drumGrad;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fde68a';
  ctx.stroke();

  // 6 Chamber recessions around the brass cylinder
  for (let c = 0; c < 6; c++) {
    const ca = (c / 6) * Math.PI * 2;
    const chX = Math.cos(ca) * 44;
    const chY = Math.sin(ca) * 44;
    ctx.beginPath();
    ctx.arc(chX, chY, 15, 0, Math.PI * 2);
    ctx.fillStyle = c < state.drumQueue.length ? '#3b240b' : '#090d16';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = c < state.drumQueue.length ? '#fbbf24' : '#334155';
    ctx.stroke();

    if (c < state.drumQueue.length) {
      // Unidentified brass shell base inside the drum
      ctx.beginPath();
      ctx.arc(chX, chY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#d97706';
      ctx.fill();
    }
  }
  ctx.restore();

  // X-Ray Loupe Inspection Overlay (if X-Ray Loupe is dragged near drum OR currentCoreRevealed is true)
  const loupeTool = state.deskTools.find((t) => t.kind === 'xray_loupe');
  const loupeHovering =
    loupeTool &&
    loupeTool.isDragging &&
    Math.hypot(loupeTool.x - dcx, loupeTool.y - dcy) < 95;

  if (state.currentCoreRevealed || loupeHovering) {
    const currentCore: CoreType = state.drumQueue[0] ?? 'blank';
    ctx.save();
    ctx.beginPath();
    ctx.arc(dcx, dcy - 18, 56, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4ade80';
    ctx.stroke();

    const coreColor =
      currentCore === 'volatile'
        ? '#f59e0b'
        : currentCore === 'live'
          ? '#ef4444'
          : '#38bdf8';
    ctx.fillStyle = coreColor;
    ctx.font = '900 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('X-RAY SILHOUETTE:', dcx, dcy - 32);
    ctx.font = '900 13px "Courier New", monospace';
    ctx.fillText(
      currentCore === 'volatile'
        ? '⚡ VOLATILE 2X'
        : currentCore === 'live'
          ? '🔥 LIVE HV CORE'
          : '🛡️ INERT BLANK',
      dcx,
      dcy - 12
    );
    ctx.restore();
  } else {
    // Center Drum Hub Label
    ctx.beginPath();
    ctx.arc(dcx, dcy - 18, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1309';
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = '900 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.drumQueue.length} LEFT`, dcx, dcy - 14);
  }

  // Left Drum Field Coil Socket (for Polarity Inverter Magnet)
  const mcx = SOCKETS.drumMagnetCoil.x;
  const mcy = SOCKETS.drumMagnetCoil.y;
  ctx.beginPath();
  ctx.arc(mcx, mcy, 22, 0, Math.PI * 2);
  ctx.fillStyle = state.currentCoreInverted ? 'rgba(192, 132, 252, 0.3)' : '#23180c';
  ctx.fill();
  ctx.strokeStyle = state.currentCoreInverted ? '#c084fc' : '#92400e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e9d5ff';
  ctx.font = '800 8.5px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('COIL', mcx, mcy - 2);
  ctx.fillText(state.currentCoreInverted ? 'FLIPPED' : 'SOCKET', mcx, mcy + 9);

  // Bottom Drum Shunt Terminals (for Copper Jumper Clamp)
  const scx = SOCKETS.drumShuntTerminals.x;
  const scy = SOCKETS.drumShuntTerminals.y;
  ctx.fillStyle = '#271c10';
  ctx.fillRect(scx - 52, scy - 16, 104, 32);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(scx - 52, scy - 16, 104, 32);
  drawRivet(ctx, scx - 36, scy, 6);
  drawRivet(ctx, scx + 36, scy, 6);
  ctx.fillStyle = '#bae6fd';
  ctx.font = '800 9px "Courier New", monospace';
  ctx.fillText('SHUNT EJECT POSTS', scx, scy + 3);

  // 3-SECOND VISUAL COMPREHENSION: Boot / Re-Fuse Ignition Socket & Machined Groove
  if (!state.starterCartridge.slotted) {
    const sockX = state.starterCartridge.socketX;
    const sockY = state.starterCartridge.socketY;
    const cartX = state.starterCartridge.x;
    const cartY = state.starterCartridge.y;
    const pulse = 0.55 + 0.45 * Math.sin(nowSec * 6.5);

    // Subtle physical machined groove connecting the starter cartridge to the open socket
    ctx.beginPath();
    ctx.roundRect(
      Math.min(cartX, sockX) - 34,
      sockY - 26,
      Math.abs(sockX - cartX) + 68,
      52,
      24
    );
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.45 + pulse * 0.45})`;
    ctx.stroke();

    // Animated guide chevrons along the groove
    ctx.fillStyle = `rgba(253, 224, 71, ${0.55 + pulse * 0.45})`;
    ctx.font = '900 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('>>> SLOT CORE >>>', (cartX + sockX) * 0.5, sockY + 5);

    // Pulsing Open Brass Socket
    ctx.beginPath();
    ctx.arc(sockX, sockY, 27, 0, Math.PI * 2);
    ctx.fillStyle = '#090d16';
    ctx.fill();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.6 + pulse * 0.4})`;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 9px "Courier New", monospace';
    ctx.fillText('IGNITION', sockX, sockY - 3);
    ctx.fillText('SOCKET', sockX, sockY + 9);

    // Unslotted Glowing Brass Ignition Cartridge (with Dynamic Lift Drop Shadow)
    const lift = state.starterCartridge.liftProgress;
    ctx.save();
    ctx.translate(cartX, cartY - lift * 10);
    ctx.scale(1 + lift * 0.08, 1 + lift * 0.08);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
    ctx.shadowBlur = 10 + lift * 22;
    ctx.shadowOffsetX = 3 + lift * 8;
    ctx.shadowOffsetY = 5 + lift * 16;

    ctx.beginPath();
    ctx.roundRect(-24, -20, 48, 40, 8);
    const cGrad = ctx.createLinearGradient(-24, -20, 24, 20);
    cGrad.addColorStop(0, '#fde047');
    cGrad.addColorStop(0.5, '#f59e0b');
    cGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = cGrad;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#1c1309';
    ctx.font = '900 9.5px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WAKE UP', 0, -2);
    ctx.fillText('CORE', 0, 10);
    ctx.restore();
  }

  ctx.restore();
}

function drawStepUpTransformerWheel(
  ctx: CanvasRenderingContext2D,
  state: CathodeWorkbenchState
): void {
  const cx = SOCKETS.transformerCrankCenter.x;
  const cy = SOCKETS.transformerCrankCenter.y;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - 88, cy - 115, 176, 230, 10);
  ctx.fillStyle = '#1b140c';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#b45309';
  ctx.stroke();

  drawBrassPlaque(
    ctx,
    cx - 78,
    cy - 106,
    156,
    30,
    '2. STEP-UP COIL',
    'CRANK TO DOUBLE STAKES'
  );

  // 4 Nixie Multiplier Indicator Tubes (1X, 2X, 4X, 8X)
  const tiers: Array<1 | 2 | 4 | 8> = [1, 2, 4, 8];
  tiers.forEach((mult, idx) => {
    const tx = cx - 57 + idx * 38;
    const ty = cy - 56;
    const active = state.stepUpMultiplier === mult;
    ctx.beginPath();
    ctx.roundRect(tx - 16, ty - 14, 32, 26, 5);
    ctx.fillStyle = active ? (mult >= 4 ? '#991b1b' : '#92400e') : '#0f172a';
    ctx.fill();
    ctx.strokeStyle = active ? '#fde047' : '#475569';
    ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = active ? '#fef08a' : '#64748b';
    ctx.font = '900 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${mult}X`, tx, ty + 3);
  });

  // Rotary Brass Handwheel
  const wheelY = cy + 22;
  const wheelR = 54;

  ctx.save();
  ctx.translate(cx, wheelY);
  ctx.rotate(state.crankWheelAngleRad);

  // Outer brass wheel rim
  ctx.beginPath();
  ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ca8a04';
  ctx.stroke();

  // 4 Spokes
  for (let s = 0; s < 4; s++) {
    ctx.save();
    ctx.rotate((s * Math.PI) / 2);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(-wheelR, -4, wheelR * 2, 8);
    ctx.restore();
  }

  // Bakelite Crank Knob on Rim
  ctx.beginPath();
  ctx.arc(wheelR - 6, 0, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#dc2626';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fef08a';
  ctx.stroke();

  ctx.restore();

  // Center Hub
  ctx.beginPath();
  ctx.arc(cx, wheelY, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#451a03';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fde68a';
  ctx.font = '900 10px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${state.stepUpMultiplier}X`, cx, wheelY + 4);

  ctx.fillStyle = '#d6d3d1';
  ctx.font = '700 8.5px "Courier New", monospace';
  ctx.fillText('[DRAG / CLICK TO CRANK]', cx, cy + 98);

  ctx.restore();
}

function drawCommitLeverPlunger(
  ctx: CanvasRenderingContext2D,
  state: CathodeWorkbenchState
): void {
  const px = state.plunger.x;
  const topY = state.plunger.topY;
  const bottomY = state.plunger.bottomY;
  const currentY = topY + state.plunger.travel * (bottomY - topY);
  const searY = topY + 0.76 * (bottomY - topY);

  ctx.save();

  // Outer Detonator Housing Box (Far Right)
  ctx.beginPath();
  ctx.roundRect(px - 88, 228, 176, 355, 12);
  ctx.fillStyle = '#18110a';
  ctx.fill();
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = state.plunger.travel >= 0.76 ? '#ef4444' : '#b45309';
  ctx.stroke();

  drawBrassPlaque(
    ctx,
    px - 78,
    238,
    156,
    32,
    '3. COMMIT PLUNGER',
    'PULL DOWN & LET GO TO FIRE',
    state.plunger.travel >= 0.76 ? '#ef4444' : '#d97706'
  );

  // Machined Steel Track Slot
  ctx.fillStyle = '#090d16';
  ctx.fillRect(px - 14, topY, 28, bottomY - topY + 18);
  ctx.strokeStyle = '#78552b';
  ctx.lineWidth = 2;
  ctx.strokeRect(px - 14, topY, 28, bottomY - topY + 18);

  // Compressed Steel Spring Coils below handle
  const coilCount = 9;
  for (let i = 0; i < coilCount; i++) {
    const t0 = i / coilCount;
    const t1 = (i + 0.5) / coilCount;
    const y0 = currentY + 16 + t0 * (bottomY - currentY);
    const y1 = currentY + 16 + t1 * (bottomY - currentY);
    ctx.beginPath();
    ctx.moveTo(px - 10, y0);
    ctx.lineTo(px + 10, y1);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  // Firing Sear Threshold Line (76%)
  ctx.beginPath();
  ctx.moveTo(px - 68, searY);
  ctx.lineTo(px + 68, searY);
  ctx.setLineDash([5, 3]);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#fca5a5';
  ctx.font = '900 9px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('▼ FIRING SEAR (RELEASE TO FIRE) ▼', px, searY - 6);

  // Heavy T-Bar Detonator Handle
  const lift = state.plunger.isDragging ? 1 : 0;
  ctx.save();
  ctx.translate(px, currentY);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12 + lift * 14;
  ctx.shadowOffsetY = 6 + lift * 10;

  ctx.beginPath();
  ctx.roundRect(-58, -18, 116, 36, 8);
  const hGrad = ctx.createLinearGradient(-58, -18, 58, 18);
  if (state.plunger.travel >= 0.76) {
    hGrad.addColorStop(0, '#ef4444');
    hGrad.addColorStop(1, '#7f1d1d');
  } else {
    hGrad.addColorStop(0, '#f59e0b');
    hGrad.addColorStop(1, '#78350f');
  }
  ctx.fillStyle = hGrad;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#fef08a';
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    state.plunger.travel >= 0.76 ? '⚡ ARMED — RELEASE! ⚡' : '⬇ PULL DOWN TO COMMIT ⬇',
    0,
    4
  );
  ctx.restore();

  ctx.fillStyle = '#fde68a';
  ctx.font = '800 9.5px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `PULL: ${Math.round(state.plunger.travel * 100)}% [OR HOLD SPACE]`,
    px,
    bottomY + 46
  );

  ctx.restore();
}

function drawContrabandToolObject(
  ctx: CanvasRenderingContext2D,
  tool: DeskContrabandTool,
  isHighlightedSocket: boolean
): void {
  if (tool.consumed && !tool.slottedActive) return;
  if (tool.slottedActive) return; // Rendered directly on its target socket

  const lift = tool.liftProgress;
  ctx.save();
  ctx.translate(tool.x, tool.y - lift * 12);
  ctx.scale(1 + lift * 0.09, 1 + lift * 0.09);

  // Dynamic Drop Shadow that grows when lifted
  ctx.shadowColor = 'rgba(0, 0, 0, 0.82)';
  ctx.shadowBlur = 8 + lift * 24;
  ctx.shadowOffsetX = 2 + lift * 8;
  ctx.shadowOffsetY = 5 + lift * 18;

  // Tactile Brass & Bakelite Tool Base Tray
  ctx.beginPath();
  ctx.roundRect(-86, -46, 172, 92, 10);
  const bg = ctx.createLinearGradient(-86, -46, 86, 46);
  bg.addColorStop(0, '#292014');
  bg.addColorStop(1, '#17110a');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = isHighlightedSocket ? 3 : 2;
  ctx.strokeStyle = isHighlightedSocket ? '#4ade80' : '#b45309';
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Bespoke Physical Icon Illustration per Contraband Tool
  drawToolBespokeIllustration(ctx, tool.kind);

  // Engraved Brass Label
  ctx.fillStyle = '#fde68a';
  ctx.font = '900 10px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(tool.title, 0, 22);

  ctx.fillStyle = '#a8a29e';
  ctx.font = '700 8px "Courier New", monospace';
  ctx.fillText(`→ SLOT: ${tool.socketLabel}`, 0, 36);

  ctx.restore();
}

function drawToolBespokeIllustration(
  ctx: CanvasRenderingContext2D,
  kind: ContrabandToolId
): void {
  ctx.save();
  ctx.translate(0, -12);

  if (kind === 'xray_loupe') {
    // Phosphor Green X-Ray Monocle Lens + Brass Rim
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.38)';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#eab308';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(13, 13);
    ctx.lineTo(28, 22);
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 5;
    ctx.stroke();
  } else if (kind === 'jumper_clamp') {
    // Dual Copper Alligator Clamps + Braided Wire
    ctx.beginPath();
    ctx.moveTo(-26, 6);
    ctx.quadraticCurveTo(0, -18, 26, 6);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(-34, -4, 14, 16);
    ctx.fillRect(20, -4, 14, 16);
  } else if (kind === 'inverter_magnet') {
    // Crimson/Blue Horseshoe Alnico Magnet
    ctx.beginPath();
    ctx.arc(0, 0, 15, Math.PI, 0, false);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-18.5, 0, 7, 10);
    ctx.fillRect(11.5, 0, 7, 10);
  } else if (kind === 'blast_shield') {
    // Riveted Lead Armor Plate
    ctx.beginPath();
    ctx.roundRect(-28, -14, 56, 28, 4);
    ctx.fillStyle = '#475569';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();
    drawRivet(ctx, -20, -7, 2.2);
    drawRivet(ctx, 20, -7, 2.2);
    drawRivet(ctx, -20, 7, 2.2);
    drawRivet(ctx, 20, 7, 2.2);
  } else if (kind === 'overclock_weight') {
    // Heavy Hexagonal 3X Cast-Iron Weight
    ctx.beginPath();
    ctx.moveTo(-18, 12);
    ctx.lineTo(-12, -12);
    ctx.lineTo(12, -12);
    ctx.lineTo(18, 12);
    ctx.closePath();
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('3X', 0, 5);
  }

  ctx.restore();
}

export function renderCathodeWorkbench(
  ctx: CanvasRenderingContext2D,
  state: CathodeWorkbenchState,
  viewportW: number,
  viewportH: number,
  reducedMotion = false
): WorkbenchTransform {
  const transform = computeWorkbenchTransform(viewportW, viewportH);
  const nowSec = performance.now() / 1000;

  ctx.save();
  ctx.clearRect(0, 0, viewportW, viewportH);

  // Deep dark ambient studio room backdrop
  ctx.fillStyle = '#090705';
  ctx.fillRect(0, 0, viewportW, viewportH);

  // Transform into 1280x800 Virtual Brass Workbench with Camera Table-Thump
  ctx.translate(transform.offsetX, transform.offsetY);
  ctx.scale(transform.scale, transform.scale);

  if (!reducedMotion) {
    ctx.translate(DESK_WIDTH * 0.5, DESK_HEIGHT * 0.5 + state.cameraShakeY);
    ctx.rotate(state.cameraShakeRot);
    ctx.translate(-DESK_WIDTH * 0.5, -DESK_HEIGHT * 0.5);
  }

  // 1. Walnut Wood & Dark Green Baize Felt Tabletop Surface
  const deskGrad = ctx.createRadialGradient(640, 360, 80, 640, 400, 760);
  deskGrad.addColorStop(0, '#2a1c11');
  deskGrad.addColorStop(0.65, '#19110a');
  deskGrad.addColorStop(1, '#0c0805');
  ctx.fillStyle = deskGrad;
  ctx.fillRect(0, 0, DESK_WIDTH, DESK_HEIGHT);

  // Main Brass & Gunmetal Contraption Faceplate
  ctx.beginPath();
  ctx.roundRect(28, 24, DESK_WIDTH - 56, 578, 16);
  const chassisGrad = ctx.createLinearGradient(0, 24, 0, 602);
  chassisGrad.addColorStop(0, '#261c10');
  chassisGrad.addColorStop(0.5, '#1c140c');
  chassisGrad.addColorStop(1, '#120d08');
  ctx.fillStyle = chassisGrad;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#854d0e';
  ctx.stroke();

  // Corner Chassis Rivets
  drawRivet(ctx, 46, 42, 6);
  drawRivet(ctx, DESK_WIDTH - 46, 42, 6);
  drawRivet(ctx, 46, 584, 6);
  drawRivet(ctx, DESK_WIDTH - 46, 584, 6);

  // Bottom Dark-Green Baize Felt Contraband Tool Mat
  ctx.beginPath();
  ctx.roundRect(28, 612, DESK_WIDTH - 56, 168, 14);
  const feltGrad = ctx.createLinearGradient(0, 612, 0, 780);
  feltGrad.addColorStop(0, '#0f291e');
  feltGrad.addColorStop(1, '#071710');
  ctx.fillStyle = feltGrad;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#78552b';
  ctx.stroke();

  ctx.fillStyle = '#fde68a';
  ctx.font = '900 11px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(
    'CONTRABAND WORKBENCH MAT — GRAB & DRAG ANY PHYSICAL TOOL ONTO ITS MATCHING SOCKET (<28px MAGNETIC SNAP)',
    52,
    632
  );

  // 2. Top-Left: Physical Glass Vacuum Fuses & Lead Blast Shield Rail
  drawGlassVacuumFusesAndShield(ctx, state, nowSec);

  // 3. Top-Center: Tipping Brass Balance Scale & Rolling Odometers
  drawTippingBrassBalanceScale(ctx, state);

  // 4. Top-Right: Dual Analog Spring-Physics Gauges (Kilovolts & Threat Amperage) + Diegetic Brass Screws
  drawAnalogGauge(
    ctx,
    965,
    152,
    58,
    state.kilovoltNeedle.value,
    'KILOVOLTS',
    `${state.stepUpMultiplier}X STEP-UP`,
    state.cathodeWarmup
  );
  drawAnalogGauge(
    ctx,
    1105,
    152,
    58,
    state.amperageNeedle.value,
    'LIVE ODDS',
    'DRUM RISK',
    state.cathodeWarmup
  );

  // Diegetic Top-Right Brass Faceplate Switches for Mute [M] and Reset [R]
  drawBrassPlaque(
    ctx,
    transform.muteBtnRect.x,
    transform.muteBtnRect.y,
    transform.muteBtnRect.w,
    transform.muteBtnRect.h,
    'AUDIO [M]',
    undefined,
    '#78552b'
  );
  drawBrassPlaque(
    ctx,
    transform.resetBtnRect.x,
    transform.resetBtnRect.y,
    transform.resetBtnRect.w,
    transform.resetBtnRect.h,
    'RESET [R]',
    undefined,
    '#78552b'
  );

  // 5. Left Console: Batch Manifest Plate & Spent Shell Tray
  drawBatchManifestAndSpentTray(ctx, state);

  // 6. Center-Left: Route Selector Knife Switch ('vault' vs 'chassis')
  drawRouteSelectorKnifeSwitch(ctx, state);

  // 7. Center: Revolving Brass Feeder Drum & 3-Second Boot Ignition Socket
  drawCentralFeederDrumAndBootSocket(ctx, state, nowSec);

  // 8. Center-Right: Step-Up Transformer Rotary Crank Wheel
  drawStepUpTransformerWheel(ctx, state);

  // 9. Far-Right: Commit Lever / Detonator Plunger
  drawCommitLeverPlunger(ctx, state);

  // 10. Diegetic Stamped Ledger Banner (Above Drum)
  if (state.lastTurnStamp && state.lastTurnStamp.ageMs < state.lastTurnStamp.durationMs) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(435, 538, 350, 50, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = state.lastTurnStamp.color;
    ctx.stroke();

    ctx.fillStyle = state.lastTurnStamp.color;
    ctx.font = '900 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.lastTurnStamp.text, 610, 559);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 9.5px "Courier New", monospace';
    ctx.fillText(state.lastTurnStamp.subtext, 610, 577);
    ctx.restore();
  }

  // 11. Highlight matching target socket when any Contraband Tool is being dragged
  const draggedTool = state.deskTools.find((t) => t.isDragging);
  if (draggedTool) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      draggedTool.targetSocketX,
      draggedTool.targetSocketY,
      MAGNETIC_SNAP_RADIUS + 8,
      0,
      Math.PI * 2
    );
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 12. Render the 5 Physical Contraband Tools on the Felt Mat (non-dragged first, dragged on top)
  for (const tool of state.deskTools) {
    if (!tool.isDragging) {
      drawContrabandToolObject(ctx, tool, false);
    }
  }
  if (draggedTool) {
    drawContrabandToolObject(ctx, draggedTool, draggedTool.nearSnapSocket);
  }

  // 13. Contraband Supply Drawer (slides out physically when a Chamber Quota is tipped)
  if (state.phase === 'supply_drawer_pick') {
    const slideY = (1 - state.supplyDrawerOpenProgress) * 220;
    ctx.save();
    ctx.translate(0, slideY);

    ctx.beginPath();
    ctx.roundRect(250, 545, 780, 235, 14);
    ctx.fillStyle = '#1c1209';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    drawBrassPlaque(
      ctx,
      360,
      560,
      560,
      42,
      `CHAMBER 0${state.chamberNumber} CLEARED — CONTRABAND SUPPLY DRAWER`,
      'GRAB & DRAG 1 PHYSICAL TOOL UP ONTO THE WORKBENCH (OR CLICK IT) TO ADVANCE',
      '#4ade80'
    );

    for (const dTool of state.supplyDrawerTools) {
      drawContrabandToolObject(ctx, dTool, dTool.nearSnapSocket);
    }

    ctx.restore();
  }

  // 14. Sparks & High-Voltage Arc-Flash Overlay
  for (const sp of state.sparks) {
    const alpha = Math.max(0, 1 - sp.life / sp.maxLife);
    ctx.fillStyle = sp.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(sp.x - sp.size * 0.5, sp.y - sp.size * 0.5, sp.size, sp.size);
  }
  ctx.globalAlpha = 1;

  if (state.arcFlashAlpha > 0) {
    ctx.fillStyle = `rgba(254, 226, 226, ${state.arcFlashAlpha * 0.55})`;
    ctx.fillRect(0, 0, DESK_WIDTH, DESK_HEIGHT);
  }

  ctx.restore();
  return transform;
}
