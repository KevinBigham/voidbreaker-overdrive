import { MODULE_CATALOG } from './blueprints';
import {
  ContraptionModule,
  ContraptionState,
  getConnectedNeighbors,
  OrbTier,
} from './sim';

export interface WorkbenchLayout {
  width: number;
  height: number;
  gridLeft: number;
  gridTop: number;
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
  trayLeft: number;
  trayTop: number;
  trayWidth: number;
  trayHeight: number;
  traySlotSize: number;
  leverBox: { x: number; y: number; w: number; h: number; knobX: number; knobY: number };
  valveBox: { x: number; y: number; r: number };
  cashOutBox: { x: number; y: number; w: number; h: number };
  draftCardBoxes: Array<{ x: number; y: number; w: number; h: number }>;
}

export function computeLayout(
  width: number,
  height: number,
  state: ContraptionState
): WorkbenchLayout {
  const hudHeight = 76;
  const trayHeight = 96;
  const rightPanelWidth = Math.min(220, Math.max(168, width * 0.2));

  const availW = Math.max(260, width - rightPanelWidth - 56);
  const availH = Math.max(240, height - hudHeight - trayHeight - 92);

  const cellSize = Math.floor(
    Math.min(availW / state.gridCols, availH / state.gridRows, 108)
  );
  const gridWidth = cellSize * state.gridCols;
  const gridHeight = cellSize * state.gridRows;

  const gridLeft = Math.floor((width - rightPanelWidth - gridWidth) * 0.5);
  const gridTop = Math.floor(hudHeight + 36 + (availH - gridHeight) * 0.42);

  const traySlotSize = Math.min(74, Math.max(56, cellSize * 0.76));
  const traySlotsCount = Math.max(4, state.modules.length + 1);
  const trayWidth = Math.min(width - rightPanelWidth - 40, traySlotsCount * (traySlotSize + 12) + 20);
  const trayLeft = Math.floor(gridLeft + (gridWidth - trayWidth) * 0.5);
  const trayTop = height - trayHeight - 12;

  const rightCenterX = width - rightPanelWidth * 0.5 - 12;
  const leverW = 68;
  const leverH = Math.min(185, Math.max(135, gridHeight * 0.52));
  const leverX = rightCenterX - leverW * 0.5;
  const leverY = gridTop + 8;
  const knobY = leverY + 24 + state.leverPull * (leverH - 48);

  const valveR = 46;
  const valveX = rightCenterX;
  const valveY = Math.min(height - 95, leverY + leverH + 86);

  const cashOutBox = {
    x: rightCenterX - 66,
    y: valveY + valveR + 16,
    w: 132,
    h: 34,
  };

  const cardW = Math.min(256, Math.floor((width - 96) / 3));
  const cardH = Math.min(310, Math.floor(height * 0.54));
  const totalCardsW = cardW * 3 + 36;
  const startCardX = Math.floor((width - totalCardsW) * 0.5);
  const cardY = Math.floor((height - cardH) * 0.52);

  const draftCardBoxes = [0, 1, 2].map((i) => ({
    x: startCardX + i * (cardW + 18),
    y: cardY,
    w: cardW,
    h: cardH,
  }));

  return {
    width,
    height,
    gridLeft,
    gridTop,
    cellSize,
    gridWidth,
    gridHeight,
    trayLeft,
    trayTop,
    trayWidth,
    trayHeight,
    traySlotSize,
    leverBox: {
      x: leverX,
      y: leverY,
      w: leverW,
      h: leverH,
      knobX: rightCenterX,
      knobY,
    },
    valveBox: { x: valveX, y: valveY, r: valveR },
    cashOutBox,
    draftCardBoxes,
  };
}

export function getTrayModulePosition(
  layout: WorkbenchLayout,
  trayOrderIndex: number
): { x: number; y: number } {
  const spacing = layout.traySlotSize + 12;
  const x = layout.trayLeft + 16 + trayOrderIndex * spacing + layout.traySlotSize * 0.5;
  const y = layout.trayTop + layout.trayHeight * 0.5 + 4;
  return { x, y };
}

function getOrbColors(tier: OrbTier): { core: string; glow: string; rim: string } {
  switch (tier) {
    case 'raw':
      return { core: '#38bdf8', glow: 'rgba(56, 189, 248, 0.45)', rim: '#bae6fd' };
    case 'heated':
      return { core: '#fbbf24', glow: 'rgba(251, 191, 36, 0.55)', rim: '#fef08a' };
    case 'supercritical':
      return { core: '#ffffff', glow: 'rgba(244, 63, 94, 0.78)', rim: '#f43f5e' };
  }
}

export function renderWorkbench(
  ctx: CanvasRenderingContext2D,
  state: ContraptionState,
  layout: WorkbenchLayout
): void {
  const { width, height, gridLeft, gridTop, cellSize, gridWidth, gridHeight } = layout;

  ctx.save();

  // Apply boiler pressure & impact camera vibration
  const pressureRattle =
    state.boilerPressure > 45 ? ((state.boilerPressure - 45) / 55) * 3.5 : 0;
  const totalShake = state.cameraShake * 7 + pressureRattle;
  if (totalShake > 0.1) {
    const sx = Math.sin(state.elapsedTime * 57) * totalShake;
    const sy = Math.cos(state.elapsedTime * 63) * totalShake;
    ctx.translate(sx, sy);
  }

  // 1. Deep matte blueprint-obsidian background (#090d16)
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  // Subtle watchmaker blueprint radial drafting lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.045)';
  ctx.lineWidth = 1;
  const step = 36;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 2. Boiler Return Pipes connecting Collector Chute -> Overclock Valve -> Top Spout
  drawBoilerPipes(ctx, state, layout);

  // 3. Workbench Outer Brass Frame & Socket Recesses (#162032)
  ctx.fillStyle = '#0d1524';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 3;
  roundRect(ctx, gridLeft - 12, gridTop - 12, gridWidth + 24, gridHeight + 24, 12);
  ctx.fill();
  ctx.stroke();

  // Corner brass rivets on frame
  drawBrassRivets(ctx, gridLeft - 6, gridTop - 6, gridWidth + 12, gridHeight + 12);

  // Draw Grid Sockets
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      const sx = gridLeft + c * cellSize + 5;
      const sy = gridTop + r * cellSize + 5;
      const sw = cellSize - 10;
      const sh = cellSize - 10;

      const isHovered =
        state.hoveredSocket &&
        state.hoveredSocket.col === c &&
        state.hoveredSocket.row === r;

      ctx.fillStyle = isHovered ? '#1e293b' : '#162032';
      ctx.strokeStyle = isHovered ? '#fbbf24' : '#334155';
      ctx.lineWidth = isHovered ? 2 : 1.5;
      roundRect(ctx, sx, sy, sw, sh, 8);
      ctx.fill();
      ctx.stroke();

      // Inner socket mechanical crosshair & detent ticks
      const cx = sx + sw * 0.5;
      const cy = sy + sh * 0.5;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, sw * 0.28, 0, Math.PI * 2);
      ctx.stroke();

      // Frost Node overlay (Quota 4+)
      const frost = state.frostNodes.find((f) => f.col === c && f.row === r);
      if (frost) {
        if (!frost.thawed) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          roundRect(ctx, sx + 3, sy + 3, sw - 6, sh - 6, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e0f2fe';
          ctx.font = 'bold 10px "Inter", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('FROST LOCKED', cx, cy - 3);
          ctx.fillStyle = '#38bdf8';
          ctx.font = '9px "Inter", system-ui, sans-serif';
          ctx.fillText('HEAT TO THAW ×2', cx, cy + 10);
        } else {
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
          ctx.lineWidth = 1.5;
          roundRect(ctx, sx + 4, sy + 4, sw - 8, sh - 8, 6);
          ctx.stroke();
        }
      }
    }
  }

  // 4. Predictive Routing Preview Line during Beat A (wiring)
  if (state.phase === 'wiring') {
    drawPredictiveRoutePreview(ctx, state, layout);
  }

  // 5. Top Drop Spout & Bottom Collector Chute / Crucible Pot
  drawSpoutAndCollector(ctx, state, layout);

  // 6. Live Connection Preview Pulses between neighboring seated modules
  for (const mod of state.modules) {
    if (mod.col !== null && mod.row !== null && (mod.connectionPulseTimer > 0 || mod.activationGlow > 0)) {
      const neighbors = getConnectedNeighbors(state, mod.col, mod.row, mod.id);
      const x1 = gridLeft + (mod.col + 0.5) * cellSize;
      const y1 = gridTop + (mod.row + 0.5) * cellSize;
      const alpha = Math.max(mod.connectionPulseTimer, mod.activationGlow) * 0.65;
      ctx.strokeStyle = `rgba(251, 191, 36, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      for (const nb of neighbors) {
        const x2 = gridLeft + ((nb.col ?? 0) + 0.5) * cellSize;
        const y2 = gridTop + ((nb.row ?? 0) + 0.5) * cellSize;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }

  // 7. Bottom Parts Tray
  drawPartsTray(ctx, state, layout);

  // 8. Seated & Tray Contraption Modules (excluding currently dragged module so it draws on top)
  const unplacedModules = state.modules.filter((m) => m.col === null || m.row === null);
  for (const mod of state.modules) {
    if (mod.id === state.draggedModuleId) continue;
    if (mod.col !== null && mod.row !== null) {
      const mx = gridLeft + (mod.col + 0.5) * cellSize + mod.recoilX;
      const my = gridTop + (mod.row + 0.5) * cellSize + mod.recoilY;
      drawModuleToken(
        ctx,
        mod,
        mx,
        my,
        cellSize * 0.78,
        false,
        mod.id === state.selectedModuleId
      );
    } else {
      const trayIdx = unplacedModules.indexOf(mod);
      const pos = getTrayModulePosition(layout, trayIdx);
      drawModuleToken(
        ctx,
        mod,
        pos.x,
        pos.y,
        layout.traySlotSize * 0.84,
        false,
        mod.id === state.selectedModuleId
      );
    }
  }

  // 9. Lightning Arcs (Tesla Relay)
  for (const arc of state.lightningArcs) {
    const x1 = gridLeft + arc.x1 * cellSize;
    const y1 = gridTop + arc.y1 * cellSize;
    const x2 = gridLeft + arc.x2 * cellSize;
    const y2 = gridTop + arc.y2 * cellSize;
    const mx = (x1 + x2) * 0.5 + Math.sin(state.elapsedTime * 90) * 10;
    const my = (y1 + y2) * 0.5 + Math.cos(state.elapsedTime * 90) * 10;

    ctx.strokeStyle = arc.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(mx, my);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // 10. Physical Orbs in Cascade
  for (const orb of state.orbs) {
    const ox = gridLeft + orb.x * cellSize;
    const oy = gridTop + orb.y * cellSize;
    const r = Math.max(8, orb.radius * cellSize);
    const palette = getOrbColors(orb.tier);

    // Orb motion trail
    for (let i = 0; i < orb.trail.length; i++) {
      const pt = orb.trail[i];
      const tx = gridLeft + pt.x * cellSize;
      const ty = gridTop + pt.y * cellSize;
      const frac = (i + 1) / orb.trail.length;
      ctx.fillStyle = palette.glow;
      ctx.beginPath();
      ctx.arc(tx, ty, r * frac * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer energy halo
    const grad = ctx.createRadialGradient(ox, oy, r * 0.2, ox, oy, r * 1.9);
    grad.addColorStop(0, palette.core);
    grad.addColorStop(0.55, palette.glow);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ox, oy, r * 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Solid sphere core
    ctx.fillStyle = palette.core;
    ctx.strokeStyle = palette.rim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Live value stamp on the orb
    ctx.fillStyle = orb.tier === 'raw' ? '#090d16' : '#090d16';
    ctx.font = 'bold 10px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${orb.value}`, ox, oy);
  }

  // 11. Spark, Dust, Coin & Steam Particles
  for (const p of state.particles) {
    const px = gridLeft + p.x * cellSize;
    const py = gridTop + p.y * cellSize;
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(px, py, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 12. Floating +Chips / ×Mult Badges
  for (const b of state.badges) {
    const bx = gridLeft + b.x * cellSize;
    const by = gridTop + b.y * cellSize;
    const alpha = Math.max(0, Math.min(1, b.life / b.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(bx, by);
    ctx.scale(b.scale, b.scale);

    ctx.font = '800 13px "Inter", system-ui, sans-serif';
    const textW = ctx.measureText(b.text).width + 14;
    ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1.5;
    roundRect(ctx, -textW * 0.5, -11, textW, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = b.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, 0, 0);
    ctx.restore();
  }

  // 13. Right-hand Mechanical Controls: Spring Launch Lever & Overclock Recycle Valve
  drawLaunchLever(ctx, state, layout);
  drawOverclockValve(ctx, state, layout);

  // 14. Top HUD (Strictly 3 Numbers: QUOTA, BANKED, CYCLES LEFT)
  drawTopHud(ctx, state, layout);

  // 15. Lifted / Dragged Module on top with drop shadow offset & spring cursor lag
  if (state.draggedModuleId) {
    const dragged = state.modules.find((m) => m.id === state.draggedModuleId);
    if (dragged) {
      const dx = gridLeft + state.dragVisualX * cellSize;
      const dy = gridTop + state.dragVisualY * cellSize;
      drawModuleToken(ctx, dragged, dx, dy, cellSize * 0.82, true, true);
    }
  }

  // 16. Between-Quota Blueprint Draft Cards or GameOver Overlay
  if (state.phase === 'draft') {
    drawBlueprintDraftOverlay(ctx, state, layout);
  } else if (state.phase === 'gameover') {
    drawGameOverOverlay(ctx, state, layout);
  }

  ctx.restore();
}

function drawTopHud(
  ctx: CanvasRenderingContext2D,
  state: ContraptionState,
  layout: WorkbenchLayout
): void {
  const { width } = layout;

  // Brass top bar plate
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  roundRect(ctx, 16, 10, width - 32, 58, 10);
  ctx.fill();
  ctx.stroke();

  // Strictly 3 HUD Numbers per Rule 2: QUOTA, BANKED, CYCLES LEFT
  const gauges = [
    {
      label: 'QUOTA',
      value: `${state.quotaTarget}`,
      color: '#38bdf8',
      x: width * 0.22,
    },
    {
      label: 'BANKED',
      value: `${state.bankedScore}`,
      color: '#fbbf24',
      x: width * 0.5,
    },
    {
      label: 'CYCLES LEFT',
      value: `${state.cyclesLeft}`,
      color: state.cyclesLeft <= 1 ? '#f43f5e' : '#34d399',
      x: width * 0.78,
    },
  ];

  for (const g of gauges) {
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    roundRect(ctx, g.x - 92, 16, 184, 46, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 10px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.label, g.x, 30);

    ctx.fillStyle = g.color;
    ctx.font = '800 22px "Inter", system-ui, sans-serif';
    ctx.fillText(g.value, g.x, 53);
  }

  // Subtle diegetic status ticker beneath HUD bar
  if (state.statusBannerTimer > 0 && state.statusBannerText) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 11px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.statusBannerText, layout.gridLeft + layout.gridWidth * 0.5, 84);
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `WORKBENCH: ${state.unlockedConceptTag} • DRAG PARTS • [R] / RIGHT-CLICK ROTATE • PULL LEVER`,
      layout.gridLeft + layout.gridWidth * 0.5,
      84
    );
  }
}

function drawSpoutAndCollector(
  ctx: CanvasRenderingContext2D,
  state: ContraptionState,
  layout: WorkbenchLayout
): void {
  const { gridLeft, gridTop, cellSize, gridWidth, gridHeight } = layout;

  // Top Brass Drop Spout
  const spoutCenterX = gridLeft + (state.spoutCol + 0.5) * cellSize;
  const spoutTopY = gridTop - 26;
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(spoutCenterX - 24, spoutTopY);
  ctx.lineTo(spoutCenterX + 24, spoutTopY);
  ctx.lineTo(spoutCenterX + 14, gridTop + 2);
  ctx.lineTo(spoutCenterX - 14, gridTop + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing Aether core inside spout
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(spoutCenterX, spoutTopY + 10, 6, 0, Math.PI * 2);
  ctx.fill();

  // Bottom Collector Chute & Unbanked Crucible Pot trough
  const chuteY = gridTop + gridHeight + 4;
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = state.cruciblePot > 0 ? '#fbbf24' : '#475569';
  ctx.lineWidth = 2.5;
  roundRect(ctx, gridLeft + 6, chuteY, gridWidth - 12, 34, 8);
  ctx.fill();
  ctx.stroke();

  // Highlight center bullseye collector funnel
  const chuteCenterX = gridLeft + (state.chuteCol + 0.5) * cellSize;
  ctx.fillStyle = state.cruciblePot > 0 ? 'rgba(251, 191, 36, 0.22)' : 'rgba(56, 189, 248, 0.12)';
  roundRect(ctx, chuteCenterX - cellSize * 0.55, chuteY + 3, cellSize * 1.1, 28, 6);
  ctx.fill();

  ctx.fillStyle = state.cruciblePot > 0 ? '#fbbf24' : '#94a3b8';
  ctx.font = '800 12px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (state.cruciblePot > 0) {
    ctx.fillText(
      `CRUCIBLE POT: +${state.cruciblePot} (×${state.overclockMultiplier}) — HOLD OVERCLOCK TO 2× RECYCLE!`,
      gridLeft + gridWidth * 0.5,
      chuteY + 17
    );
  } else {
    ctx.fillText(
      'COLLECTOR CHUTE (CENTER FUNNEL = 1.25× BONUS)',
      gridLeft + gridWidth * 0.5,
      chuteY + 17
    );
  }
}

function drawBoilerPipes(
  ctx: CanvasRenderingContext2D,
  state: ContraptionState,
  layout: WorkbenchLayout
): void {
  const { gridLeft, gridTop, gridWidth, gridHeight, valveBox, cellSize } = layout;
  const heatRatio = Math.min(1, state.boilerPressure / 95);

  const pipeColor =
    heatRatio > 0.5
      ? `rgb(${Math.round(180 + 75 * heatRatio)}, ${Math.round(83 * (1 - heatRatio))}, 45)`
      : '#78350f';

  ctx.save();
  ctx.strokeStyle = pipeColor;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Pipe from Collector right edge -> Overclock Valve -> Top Spout
  const chuteRightX = gridLeft + gridWidth;
  const chuteY = gridTop + gridHeight + 20;
  const spoutX = gridLeft + (state.spoutCol + 0.5) * cellSize;
  const spoutY = gridTop - 18;

  ctx.beginPath();
  ctx.moveTo(chuteRightX - 8, chuteY);
  ctx.lineTo(valveBox.x, chuteY);
  ctx.lineTo(valveBox.x, valveBox.y);
  ctx.stroke();

  // Upper return pipe from valve to top spout
  ctx.beginPath();
  ctx.moveTo(valveBox.x - valveBox.r * 0.7, valveBox.y);
  ctx.lineTo(gridLeft + gridWidth + 24, valveBox.y);
  ctx.lineTo(gridLeft + gridWidth + 24, spoutY);
  ctx.lineTo(spoutX + 18, spoutY);
  ctx.stroke();

  // Glowing inner pressure flow line when overclocking
  if (state.boilerPressure > 5 || state.overclockValveHeld) {
    ctx.strokeStyle = heatRatio > 0.6 ? '#f43f5e' : '#fbbf24';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -state.elapsedTime * 90;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawPredictiveRoutePreview(
  ctx: CanvasRenderingContext2D,
  state: ContraptionState,
  layout: WorkbenchLayout
): void {
  const { gridLeft, gridTop, cellSize } = layout;
  let simX = state.spoutCol + 0.5;
  let simY = 0;
  let vx = 0;
  let vy = 2.0;

  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(gridLeft + simX * cellSize, gridTop);

  const visited = new Set<string>();
  for (let step = 0; step < 45; step++) {
    simX += vx * 0.05;
    simY += vy * 0.05;
    vy += 3.1 * 0.05;

    if (simX < 0.15 || simX > state.gridCols - 0.15) {
      vx = -vx * 0.85;
      simX = Math.max(0.15, Math.min(state.gridCols - 0.15, simX));
    }

    for (const mod of state.modules) {
      if (mod.col === null || mod.row === null || visited.has(mod.id)) continue;
      const dist = Math.hypot(simX - (mod.col + 0.5), simY - (mod.row + 0.5));
      if (dist < 0.36) {
        visited.add(mod.id);
        const rad = ((mod.targetAngleDeg % 360) * Math.PI) / 180;
        if (mod.kind === 'deflector') {
          const sign = Math.abs(Math.cos(rad)) >= 0.35 ? Math.sign(Math.cos(rad)) : 1;
          vx = sign * 2.35;
          vy = 1.65;
        } else if (mod.kind === 'kicker') {
          vy = -2.2;
          vx = (Math.cos(rad) >= 0 ? 1 : -1) * 2.0;
        } else {
          vx += Math.cos(rad) * 0.65;
        }
        break;
      }
    }

    ctx.lineTo(gridLeft + simX * cellSize, gridTop + simY * cellSize);
    if (simY >= state.gridRows) break;
  }

  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPartsTray(
  ctx: CanvasRenderingContext2D,
  state: ContraptionState,
  layout: WorkbenchLayout
): void {
  const { trayLeft, trayTop, trayWidth, trayHeight } = layout;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  roundRect(ctx, trayLeft, trayTop, trayWidth, trayHeight, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 10px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('BRASS PARTS TRAY (DRAG TO WORKBENCH • RIGHT-CLICK OR [R] TO ROTATE)', trayLeft + 14, trayTop + 15);

  // Active Relics badges on right side of tray
  if (state.activeRelics.length > 0) {
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'right';
    ctx.fillText(
      `RELICS: ${state.activeRelics.map((r) => r.replace('_', ' ').toUpperCase()).join(' • ')}`,
      trayLeft + trayWidth - 14,
      trayTop + 15
    );
  }
}

function drawModuleToken(
  ctx: CanvasRenderingContext2D,
  mod: ContraptionModule,
  cx: number,
  cy: number,
  size: number,
  isLifted: boolean,
  isSelected: boolean
): void {
  const meta = MODULE_CATALOG[mod.kind];
  const half = size * 0.5;

  ctx.save();
  ctx.translate(cx, cy);

  // Drop shadow when lifted (Rule 1: subtle shadow offset)
  if (isLifted) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    roundRect(ctx, -half + 8, -half + 12, size, size, 12);
    ctx.fill();
    ctx.translate(0, -5);
  }

  // Apply squash-and-stretch seat scale & spring detent rotation
  ctx.scale(mod.seatScaleX, mod.seatScaleY);

  // Outer brass module casing
  ctx.fillStyle = mod.cracked ? '#3f1d28' : '#1e293b';
  ctx.strokeStyle = isSelected ? '#fbbf24' : meta.accentColor;
  ctx.lineWidth = isSelected || isLifted ? 3 : 2;
  roundRect(ctx, -half, -half, size, size, 11);
  ctx.fill();
  ctx.stroke();

  // Activation glow flash
  if (mod.activationGlow > 0) {
    ctx.fillStyle = `rgba(251, 191, 36, ${(mod.activationGlow * 0.35).toFixed(2)})`;
    roundRect(ctx, -half, -half, size, size, 11);
    ctx.fill();
  }

  // Rotate internal clockwork mechanism by spring-driven currentAngleDeg
  ctx.save();
  ctx.rotate((mod.currentAngleDeg * Math.PI) / 180);

  // Gear teeth ring
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, half * 0.68, 0, Math.PI * 2);
  ctx.stroke();

  // Directional brass arrow / symbol inside module
  ctx.strokeStyle = meta.accentColor;
  ctx.fillStyle = meta.accentColor;
  ctx.lineWidth = 3;

  if (mod.kind === 'deflector') {
    // Angled bounce plate + directional deflection arrow
    ctx.beginPath();
    ctx.moveTo(-half * 0.48, -half * 0.48);
    ctx.lineTo(half * 0.48, half * 0.48);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(half * 0.52, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(half * 0.58, 0);
    ctx.lineTo(half * 0.32, -6);
    ctx.lineTo(half * 0.32, 6);
    ctx.closePath();
    ctx.fill();
  } else if (mod.kind === 'furnace') {
    // Glowing molten furnace core
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#090d16';
    ctx.font = '800 11px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2×', 0, 0);
  } else if (mod.kind === 'prism') {
    // Bifrost triangle prism splitting rays
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.48);
    ctx.lineTo(half * 0.48, half * 0.38);
    ctx.lineTo(-half * 0.48, half * 0.38);
    ctx.closePath();
    ctx.stroke();
  } else if (mod.kind === 'tesla') {
    // Copper lightning coil concentric rings
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (mod.kind === 'pendulum') {
    const swing = Math.sin(mod.pendulumPhase) * 0.45;
    ctx.rotate(swing);
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.5);
    ctx.lineTo(0, half * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, half * 0.38, 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // Short label along bottom of module casing
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 9px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(meta.shortLabel, 0, half - 7);

  ctx.restore();
}

function drawLaunchLever(
  ctx: CanvasRenderingContext2D,
  state: ContraptionState,
  layout: WorkbenchLayout
): void {
  const { x, y, w, h, knobX, knobY } = layout.leverBox;

  // Brass housing slot
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2.5;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 10px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAUNCH', knobX, y - 6);

  // Vertical spring track
  ctx.fillStyle = '#090d16';
  roundRect(ctx, knobX - 8, y + 18, 16, h - 36, 8);
  ctx.fill();

  // Coiled spring lines below knob
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  const coils = 7;
  const bottomY = y + h - 20;
  for (let i = 0; i < coils; i++) {
    const cy = knobY + ((bottomY - knobY) * (i + 0.5)) / coils;
    ctx.beginPath();
    ctx.moveTo(knobX - 10, cy - 3);
    ctx.lineTo(knobX + 10, cy + 3);
    ctx.stroke();
  }

  // Heavy Brass & Crimson Lever Handle
  const canLaunch = state.phase === 'wiring' && state.cyclesLeft > 0;
  ctx.fillStyle = canLaunch ? '#f43f5e' : '#475569';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  roundRect(ctx, knobX - 26, knobY - 14, 52, 28, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 10px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(canLaunch ? 'PULL' : 'ACTIVE', knobX, knobY);
}

function drawOverclockValve(
  ctx: CanvasRenderingContext2D,
  state: ContraptionState,
  layout: WorkbenchLayout
): void {
  const { x, y, r } = layout.valveBox;
  const { cashOutBox } = layout;

  // Boiler Pressure Gauge Arc above valve
  const pressureFrac = Math.min(1, state.boilerPressure / 100);
  ctx.save();
  ctx.translate(x, y);

  // Outer gauge ring
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle =
    state.boilerPressure > 60
      ? '#f43f5e'
      : state.overclockValveHeld
      ? '#fbbf24'
      : '#475569';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pressure fill arc
  if (pressureFrac > 0) {
    ctx.strokeStyle = state.boilerPressure > 60 ? '#f43f5e' : '#fbbf24';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * pressureFrac);
    ctx.stroke();
  }

  // Rotating Brass Valve Wheel
  ctx.save();
  ctx.rotate((state.overclockValveAngle * Math.PI) / 180);
  ctx.strokeStyle = state.overclockValveHeld ? '#f43f5e' : '#d97706';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
    ctx.stroke();
  }
  ctx.restore();

  // Center valve cap
  ctx.fillStyle = state.overclockValveHeld ? '#f43f5e' : '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Valve Title & Pressure %
  ctx.fillStyle = state.boilerPressure > 60 ? '#f43f5e' : '#fbbf24';
  ctx.font = '800 10px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OVERCLOCK VALVE', x, y - r - 18);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 10px "Inter", system-ui, sans-serif';
  ctx.fillText(
    `HEAT: ${Math.round(state.boilerPressure)}% (×${state.overclockMultiplier})`,
    x,
    y - r - 6
  );

  // Pneumatic Cash-Out / Hold instruction button below valve
  const canCashOut = state.phase === 'cascade' && state.cruciblePot > 0;
  ctx.fillStyle = canCashOut ? '#10b981' : '#1e293b';
  ctx.strokeStyle = canCashOut ? '#34d399' : '#334155';
  ctx.lineWidth = 2;
  roundRect(ctx, cashOutBox.x, cashOutBox.y, cashOutBox.w, cashOutBox.h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = canCashOut ? '#090d16' : '#94a3b8';
  ctx.font = '800 10px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    canCashOut ? `BANK +${state.cruciblePot} NOW` : 'HOLD VALVE = 2× POT',
    cashOutBox.x + cashOutBox.w * 0.5,
    cashOutBox.y + cashOutBox.h * 0.5
  );
}

function drawBlueprintDraftOverlay(
  ctx: CanvasRenderingContext2D,
  state: ContraptionState,
  layout: WorkbenchLayout
): void {
  const { width, height, draftCardBoxes } = layout;

  ctx.fillStyle = 'rgba(9, 13, 22, 0.86)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 22px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `QUOTA ${state.quotaLevel} COMPLETE! DRAFT 1 BLUEPRINT`,
    width * 0.5,
    draftCardBoxes[0].y - 44
  );

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 13px "Inter", system-ui, sans-serif';
  ctx.fillText(
    'CLICK A BLUEPRINT CARD (OR PRESS 1 / 2 / 3) TO ADD TO YOUR WORKBENCH',
    width * 0.5,
    draftCardBoxes[0].y - 18
  );

  state.draftChoices.forEach((card, idx) => {
    const box = draftCardBoxes[idx];
    if (!box) return;
    const isHovered = state.hoveredDraftIndex === idx;

    ctx.fillStyle = isHovered ? '#1e293b' : '#0f172a';
    ctx.strokeStyle = isHovered ? '#fbbf24' : card.accentColor;
    ctx.lineWidth = isHovered ? 3.5 : 2;
    roundRect(ctx, box.x, box.y, box.w, box.h, 14);
    ctx.fill();
    ctx.stroke();

    // Card type tag
    ctx.fillStyle = card.accentColor;
    ctx.font = '800 10px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      card.kind === 'module' ? 'CONTRAPTION MODULE' : 'CLOCKWORK RELIC',
      box.x + box.w * 0.5,
      box.y + 28
    );

    // Card Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 17px "Inter", system-ui, sans-serif';
    ctx.fillText(card.title, box.x + box.w * 0.5, box.y + 56);

    // Emblem circle in center
    ctx.strokeStyle = card.accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(box.x + box.w * 0.5, box.y + 115, 34, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = card.accentColor;
    ctx.font = '800 13px "Inter", system-ui, sans-serif';
    ctx.fillText(
      card.kind === 'module' ? '+1 PART' : 'PASSIVE',
      box.x + box.w * 0.5,
      box.y + 119
    );

    // Strictly 1-sentence description wrapped cleanly
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 13px "Inter", system-ui, sans-serif';
    wrapText(
      ctx,
      card.description,
      box.x + box.w * 0.5,
      box.y + 178,
      box.w - 32,
      19
    );

    // Select footer badge
    ctx.fillStyle = card.accentColor;
    ctx.font = '800 12px "Inter", system-ui, sans-serif';
    ctx.fillText(`[${idx + 1}] INSTALL BLUEPRINT`, box.x + box.w * 0.5, box.y + box.h - 22);
  });
}

function drawGameOverOverlay(
  ctx: CanvasRenderingContext2D,
  state: ContraptionState,
  layout: WorkbenchLayout
): void {
  const { width, height } = layout;
  ctx.fillStyle = 'rgba(9, 13, 22, 0.84)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#f43f5e';
  ctx.font = '800 28px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WORKBENCH QUOTA UNMET', width * 0.5, height * 0.44);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 16px "Inter", system-ui, sans-serif';
  ctx.fillText(
    `REACHED QUOTA ${state.quotaLevel} • BANKED ${state.bankedScore} / ${state.quotaTarget}`,
    width * 0.5,
    height * 0.51
  );

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 14px "Inter", system-ui, sans-serif';
  ctx.fillText('CLICK ANYWHERE OR PRESS [SPACE] TO RESET WORKBENCH', width * 0.5, height * 0.58);
}

function drawBrassRivets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const pts = [
    [x + 6, y + 6],
    [x + w - 6, y + 6],
    [x + 6, y + h - 6],
    [x + w - 6, y + h - 6],
  ];
  ctx.fillStyle = '#fbbf24';
  for (const [rx, ry] of pts) {
    ctx.beginPath();
    ctx.arc(rx, ry, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(' ');
  let line = '';
  let y = startY;
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, cx, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, cx, y);
  }
}
