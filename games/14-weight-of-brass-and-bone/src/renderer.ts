// 100% Diegetic 60fps Canvas Renderer for THE WEIGHT OF BRASS & BONE
// Zero HTML HUD: Every scale, counterweight, loupe, UV lens, tuning fork, ledger & stamp
// is rendered directly on the candlelit mahogany workbench.

import {
  DraggableObject,
  INK_PAD_X,
  INK_PAD_Y,
  LEDGER_CENTER_X,
  LEDGER_CENTER_Y,
  OSCILLOGRAPH_X,
  OSCILLOGRAPH_Y,
  SCALE_BEAM_HALF,
  SCALE_PIVOT_X,
  SCALE_PIVOT_Y,
  SMUGGLER_DRAWER_X,
  SMUGGLER_DRAWER_Y,
  WORKBENCH_HEIGHT,
  WORKBENCH_WIDTH,
  WorkbenchState,
  getScalePanPositions,
} from './simulation';
import { ENDINGS, HallmarkStyle } from './story';

export interface WorkbenchTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export function computeWorkbenchTransform(
  viewportWidth: number,
  viewportHeight: number
): WorkbenchTransform {
  const scale = Math.min(
    viewportWidth / WORKBENCH_WIDTH,
    viewportHeight / WORKBENCH_HEIGHT
  );
  return {
    offsetX: (viewportWidth - WORKBENCH_WIDTH * scale) * 0.5,
    offsetY: (viewportHeight - WORKBENCH_HEIGHT * scale) * 0.5,
    scale,
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawHallmarkSymbol(
  ctx: CanvasRenderingContext2D,
  style: HallmarkStyle,
  cx: number,
  cy: number,
  size: number,
  color: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.4, size * 0.11);

  if (style === 'crown_upright' || style === 'crown_inverted') {
    if (style === 'crown_inverted') {
      ctx.scale(1, -1);
    }
    ctx.beginPath();
    ctx.moveTo(-size * 0.75, size * 0.45);
    ctx.lineTo(-size * 0.85, -size * 0.35);
    ctx.lineTo(-size * 0.35, size * 0.05);
    ctx.lineTo(0, -size * 0.65);
    ctx.lineTo(size * 0.35, size * 0.05);
    ctx.lineTo(size * 0.85, -size * 0.35);
    ctx.lineTo(size * 0.75, size * 0.45);
    ctx.closePath();
    ctx.stroke();
    // Jewels on crown peaks
    ctx.beginPath();
    ctx.arc(-size * 0.85, -size * 0.45, size * 0.1, 0, Math.PI * 2);
    ctx.arc(0, -size * 0.75, size * 0.12, 0, Math.PI * 2);
    ctx.arc(size * 0.85, -size * 0.45, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'sunburst_8' || style === 'sunburst_6_cracked') {
    const rays = style === 'sunburst_8' ? 8 : 6;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * size * 0.25, Math.sin(a) * size * 0.25);
      ctx.lineTo(Math.cos(a) * size * 0.85, Math.sin(a) * size * 0.85);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    if (style === 'sunburst_6_cracked') {
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.5);
      ctx.lineTo(0, 0.1 * size);
      ctx.lineTo(size * 0.65, size * 0.55);
      ctx.stroke();
    }
  } else if (style === 'anchor_keys' || style === 'auditor_sting') {
    // Anchor stem & crossbar
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.65);
    ctx.lineTo(0, size * 0.65);
    ctx.moveTo(-size * 0.45, -size * 0.25);
    ctx.lineTo(size * 0.45, -size * 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, size * 0.1, size * 0.58, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    if (style === 'auditor_sting') {
      // Eye of the Inquisition over anchor
      ctx.beginPath();
      ctx.arc(0, -size * 0.25, size * 0.25, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function renderWorkbench(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState,
  viewportWidth: number,
  viewportHeight: number,
  audioMuted = false,
  reducedMotion = false
): WorkbenchTransform {
  const transform = computeWorkbenchTransform(viewportWidth, viewportHeight);
  const t = state.elapsedTimeSec;

  // Fill outer letterbox with deep nocturnal mahogany shadow
  ctx.save();
  ctx.fillStyle = '#0f0804';
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);

  const joltX = reducedMotion ? 0 : state.cameraJoltX;
  const joltY = reducedMotion ? 0 : state.cameraJoltY;

  ctx.translate(transform.offsetX + joltX, transform.offsetY + joltY);
  ctx.scale(transform.scale, transform.scale);

  // 1. UPPER COUNTER WINDOW & RAINY 1890s PORT BACKDROP (y: 0..205)
  drawCounterWindow(ctx, state, t, audioMuted);

  // 2. MAHOGANY WORKBENCH DESK & BAIZE GREEN VELVET MAT (y: 205..800)
  drawMahoganyDeskAndVelvetMat(ctx, state);

  // 3. BRASS BALANCE SCALE (Left of Desk)
  drawBrassBalanceScale(ctx, state);

  // 4. ACOUSTIC OSCILLOGRAPH & TUNING FORK CRADLE (Top Right)
  drawBrassOscillograph(ctx, state, t);

  // 5. FLIP-PAGE REFERENCE LEDGER (Bottom Left)
  drawReferenceLedger(ctx, state);

  // 6. TWIN INK PAD, STAMP RACK & SMUGGLER'S DRAWER
  drawInkPadAndDrawer(ctx, state);

  // 7. DRAGGABLE OBJECTS (Sorted by zIndex; Loupe & UV Lens rendered last with 2.5x clip)
  const sortedObjects = Object.values(state.objects).sort((a, b) => a.zIndex - b.zIndex);
  for (const obj of sortedObjects) {
    if (obj.id === 'loupe' || obj.id === 'uv_lens') continue;
    drawDeskObject(ctx, state, obj, false, false);
  }

  // Render Loupe & UV Lens on top with circular 2.5x zoomed internal clipping layer!
  drawMagnifyingLensObject(ctx, state, state.objects.loupe, 'optical', t);
  drawMagnifyingLensObject(ctx, state, state.objects.uv_lens, 'uv', t);

  // 8. WARM CANDLELIGHT OIL-LAMP RADIAL VIGNETTE
  drawCandlelightVignette(ctx, state, t, reducedMotion);

  // 9. POST-NIGHT BALANCE SHEET OR 4-ENDING FINAL DOSSIER (Diegetic Parchment on Desk)
  if (state.phase === 'night_summary') {
    drawPostNightBalanceSheet(ctx, state);
  } else if (state.phase === 'ending_dossier') {
    drawFinalEndingDossier(ctx, state);
  }

  ctx.restore();
  return transform;
}

function drawCounterWindow(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState,
  t: number,
  audioMuted: boolean
): void {
  // Night harbor sky behind glass
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 205);
  skyGrad.addColorStop(0, '#060c14');
  skyGrad.addColorStop(1, '#11222e');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, WORKBENCH_WIDTH, 205);

  // Distant harbor gas-lamp glow through fog
  const gasGlow = ctx.createRadialGradient(340, 88, 4, 340, 88, 120);
  gasGlow.addColorStop(0, 'rgba(245, 158, 11, 0.32)');
  gasGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = gasGlow;
  ctx.fillRect(210, 0, 260, 205);

  // Rain streaks on window glass
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.24)';
  ctx.lineWidth = 1.3;
  for (const drop of state.raindrops) {
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - drop.length * 0.18, drop.y + drop.length);
    ctx.stroke();
  }

  // Claimant Silhouette behind the counter glass (x: 455, y: 112)
  drawClaimantSilhouette(ctx, state, 455, 118, t);

  // Brass Counter Window Bars & Mahogany Pillars
  ctx.fillStyle = '#1c1008';
  ctx.fillRect(0, 0, 75, 208);
  ctx.fillRect(1015, 0, 265, 208);
  ctx.fillRect(0, 190, WORKBENCH_WIDTH, 22);

  // Brass security bars across window
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 3;
  for (let bx = 260; bx <= 960; bx += 175) {
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx, 190);
    ctx.stroke();
  }

  // Pass-through brass slot in center of counter sill
  drawRoundedRect(ctx, 450, 188, 390, 18, 5);
  ctx.fillStyle = '#090503';
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Typewriter Speech Bubble in Upper Window (x: 520..995, y: 18..140)
  drawRoundedRect(ctx, 520, 16, 478, 118, 8);
  ctx.fillStyle = '#fef3c7';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Claimant Nameplate & Title
  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(
    `${state.currentCase.claimantName.toUpperCase()} — ${state.currentCase.claimantTitle}`,
    536,
    38
  );
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText(
    `NIGHT ${state.night}/5 · VISITOR ${state.caseIndexInNight + 1}/${state.nightCases.length}`,
    845,
    38
  );

  ctx.strokeStyle = 'rgba(146, 64, 14, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(536, 45);
  ctx.lineTo(982, 45);
  ctx.stroke();

  // Typewriter Dialogue Text (Wrapped cleanly in 2–3 lines)
  const visibleText = state.activeDialogue.slice(0, Math.floor(state.typewriterChars));
  ctx.fillStyle = '#1c1917';
  ctx.font = 'italic 14px Georgia, serif';
  wrapText(ctx, `“${visibleText}”`, 536, 68, 442, 20);

  // Night 1 Pinned 6-Word Sticky Note on Left Mahogany Pillar (or Shift Reminder)
  ctx.save();
  ctx.translate(158, 92);
  ctx.rotate(-0.045);
  drawRoundedRect(ctx, -78, -56, 156, 108, 4);
  ctx.fillStyle = '#fde68a';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Brass Tack
  ctx.beginPath();
  ctx.arc(0, -44, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#d97706';
  ctx.fill();

  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Weigh it.', 0, -16);
  ctx.fillText('Loupe the seal.', 0, 6);
  ctx.fillText('Stamp.', 0, 28);
  ctx.font = '10px Georgia, serif';
  ctx.fillStyle = '#78350f';
  ctx.fillText('(Or slip in bottom drawer)', 0, 44);
  ctx.restore();

  // Physical Brass Coin Tray & Inquisition Suspicion Pins on Counter Sill (x: 690..990, y: 146..184)
  drawRoundedRect(ctx, 520, 142, 478, 40, 6);
  ctx.fillStyle = '#271509';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Gold Sovereign Stack Icon + Count
  const coinCount = Math.max(0, Math.min(8, Math.floor(state.sovereigns / 8)));
  for (let i = 0; i < coinCount; i++) {
    ctx.beginPath();
    ctx.ellipse(546, 170 - i * 3, 11, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(
    `PURSE: ${state.sovereigns}g SOVEREIGNS (RENT: ${state.nightBriefing.rentAndOilCost}g)`,
    568,
    166
  );

  // Inquisition Suspicion Wax Seals (0..4)
  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText('INQUISITION SUSPICION:', 818, 158);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(845 + i * 26, 171, 7, 0, Math.PI * 2);
    ctx.fillStyle = i < state.suspicion ? '#ef4444' : '#3f2314';
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Brass Escapement Patience Clock & Mute Bell Pull (x: 1095, y: 92)
  drawEscapementClockAndBell(ctx, state, 1095, 92, audioMuted);
}

function drawClaimantSilhouette(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState,
  cx: number,
  cy: number,
  t: number
): void {
  const breathe = Math.sin(t * 2.4) * 2.5;
  ctx.save();
  ctx.translate(cx, cy + breathe);

  // Warm backlight halo behind visitor
  const halo = ctx.createRadialGradient(0, -10, 8, 0, -10, 78);
  halo.addColorStop(0, 'rgba(217, 119, 6, 0.25)');
  halo.addColorStop(1, 'rgba(217, 119, 6, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, -10, 78, 0, Math.PI * 2);
  ctx.fill();

  // Cloak / Shoulders silhouette
  ctx.fillStyle = '#090d14';
  ctx.beginPath();
  ctx.moveTo(-62, 75);
  ctx.quadraticCurveTo(-54, 8, -22, -4);
  ctx.lineTo(22, -4);
  ctx.quadraticCurveTo(54, 8, 62, 75);
  ctx.closePath();
  ctx.fill();

  // Head silhouette
  ctx.beginPath();
  ctx.arc(0, -28, 22, 0, Math.PI * 2);
  ctx.fill();

  // Archetype headwear
  const arch = state.currentCase.archetype;
  if (arch === 'merchant' || arch === 'factor' || arch === 'auditor') {
    // Victorian Top Hat / Bowler
    ctx.fillRect(-26, -46, 52, 6);
    ctx.fillRect(-18, -72, 36, 26);
  } else if (arch === 'aristocrat' || arch === 'mother' || arch === 'nun') {
    // Hooded Veil / Shawl
    ctx.beginPath();
    ctx.arc(0, -28, 27, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
  } else if (arch === 'inquisitor') {
    // High Inquisitor Iron Mitre
    ctx.beginPath();
    ctx.moveTo(-22, -42);
    ctx.lineTo(0, -82);
    ctx.lineTo(22, -42);
    ctx.closePath();
    ctx.fill();
  } else if (arch === 'clockmaker' || arch === 'apothecary') {
    // Brass Goggles glowing lenses
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(-8, -28, 5, 0, Math.PI * 2);
    ctx.arc(8, -28, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEscapementClockAndBell(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState,
  cx: number,
  cy: number,
  audioMuted: boolean
): void {
  const ratio = state.claimantPatienceSec / state.claimantMaxPatienceSec;

  // Brass Clock Casing
  ctx.beginPath();
  ctx.arc(cx, cy, 48, 0, Math.PI * 2);
  ctx.fillStyle = '#78350f';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#d97706';
  ctx.stroke();

  // Ivory Clock Face
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#fef3c7';
  ctx.fill();

  // Tick Marks
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 32, cy + Math.sin(a) * 32);
    ctx.lineTo(cx + Math.cos(a) * 38, cy + Math.sin(a) * 38);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Patience Sweep Hand
  const handAngle = -Math.PI * 0.5 + (1 - ratio) * Math.PI * 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(handAngle) * 31, cy + Math.sin(handAngle) * 31);
  ctx.strokeStyle = ratio < 0.35 ? '#dc2626' : '#1c1917';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 9px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('PATIENCE', cx, cy + 22);
  ctx.fillText(`${Math.ceil(state.claimantPatienceSec)}s`, cx, cy - 14);

  // Diegetic Brass Mute Bell Pull next to Clock (x: 1210, y: 40..130)
  const bellX = 1212;
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bellX, 24);
  ctx.lineTo(bellX, 96);
  ctx.stroke();

  drawRoundedRect(ctx, bellX - 34, 96, 68, 36, 6);
  ctx.fillStyle = audioMuted ? '#451a03' : '#92400e';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.fillText(audioMuted ? 'BELL: OFF' : 'BELL: ON', bellX, 113);
  ctx.font = '9px Georgia, serif';
  ctx.fillText('[CLICK / M]', bellX, 125);
  ctx.textAlign = 'left';
}

function drawMahoganyDeskAndVelvetMat(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState
): void {
  // Deep Mahogany Surface (#1c1008)
  const woodGrad = ctx.createLinearGradient(0, 205, 0, WORKBENCH_HEIGHT);
  woodGrad.addColorStop(0, '#29160a');
  woodGrad.addColorStop(0.5, '#1c1008');
  woodGrad.addColorStop(1, '#120904');
  ctx.fillStyle = woodGrad;
  ctx.fillRect(0, 205, WORKBENCH_WIDTH, WORKBENCH_HEIGHT - 205);

  // Subtle horizontal mahogany plank grain lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 1.5;
  for (let py = 260; py < WORKBENCH_HEIGHT; py += 95) {
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(WORKBENCH_WIDTH, py);
    ctx.stroke();
  }

  // Left Brass Oil Lamp Base (x: 48, y: 245) casting warm candlelight
  ctx.beginPath();
  ctx.arc(48, 250, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#b45309';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(48, 250, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#fef08a';
  ctx.fill();

  // Center Baize Green Velvet Appraisal Mat (#064e3b)
  const matX = 395;
  const matY = 232;
  const matW = 500;
  const matH = 425;

  // Recessed shadow frame
  drawRoundedRect(ctx, matX - 6, matY - 6, matW + 12, matH + 12, 14);
  ctx.fillStyle = '#0f0703';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Deep Baize Green Velvet (#064e3b)
  drawRoundedRect(ctx, matX, matY, matW, matH, 10);
  const velvetGrad = ctx.createRadialGradient(
    matX + matW * 0.5,
    matY + matH * 0.5,
    30,
    matX + matW * 0.5,
    matY + matH * 0.5,
    310
  );
  velvetGrad.addColorStop(0, '#065f46');
  velvetGrad.addColorStop(1, '#064e3b');
  ctx.fillStyle = velvetGrad;
  ctx.fill();

  // Gold filigree inner border on the velvet mat
  drawRoundedRect(ctx, matX + 12, matY + 12, matW - 24, matH - 24, 6);
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(254, 243, 199, 0.26)';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('ROYAL & OCCULT APPRAISAL MAT — BLACKWATER PORT', matX + matW * 0.5, matY + 30);

  // Inspection checklist watermark at bottom of velvet mat
  const wCheck = state.inspectedWeight ? '✓ WEIGHT' : '○ WEIGHT';
  const lCheck = state.inspectedLoupe ? '✓ LOUPE' : '○ LOUPE';
  const aCheck = state.inspectedAcoustic ? '✓ FORK' : '○ FORK';
  const uCheck = state.inspectedUV ? '✓ UV LENS' : '○ UV LENS';
  ctx.fillStyle = 'rgba(253, 230, 138, 0.45)';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText(
    `${wCheck}    ${lCheck}    ${aCheck}    ${uCheck}`,
    matX + matW * 0.5,
    matY + matH - 18
  );
  ctx.textAlign = 'left';
}

function drawBrassBalanceScale(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState
): void {
  const px = SCALE_PIVOT_X;
  const py = SCALE_PIVOT_Y;
  const pans = getScalePanPositions(state.scaleAngle);

  // Mahogany & Brass Scale Pedestal Base
  drawRoundedRect(ctx, px - 135, 442, 270, 82, 8);
  ctx.fillStyle = '#271307';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('BRASS COUNTERWEIGHT RACK (DRAG TO LEFT PAN)', px, 458);

  // Central Ornate Brass Pillar
  ctx.fillStyle = '#b45309';
  ctx.fillRect(px - 8, py, 16, 162);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px - 8, py, 16, 162);

  // Engraved Ivory Equilibrium Dial at top of pillar
  ctx.beginPath();
  ctx.arc(px, py, 28, Math.PI, Math.PI * 2);
  ctx.fillStyle = '#fef3c7';
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Equilibrium pointer needle
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.scaleAngle * 1.4);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -24);
  ctx.strokeStyle =
    Math.abs(state.scaleAngle) < 0.03 && state.rightPanMassGrams > 0
      ? '#10b981'
      : '#dc2626';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Tilting Balance Beam
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.scaleAngle);
  drawRoundedRect(ctx, -SCALE_BEAM_HALF - 8, -6, (SCALE_BEAM_HALF + 8) * 2, 12, 5);
  ctx.fillStyle = '#d97706';
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Left Pan & Suspension Chains (Counterweights)
  const leftAnchorX = px - Math.cos(state.scaleAngle) * SCALE_BEAM_HALF;
  const leftAnchorY = py - Math.sin(state.scaleAngle) * SCALE_BEAM_HALF;
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftAnchorX, leftAnchorY);
  ctx.lineTo(pans.leftX - 38, pans.leftY);
  ctx.moveTo(leftAnchorX, leftAnchorY);
  ctx.lineTo(pans.leftX + 38, pans.leftY);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(pans.leftX, pans.leftY, 44, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#b45309';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.fillText(`WEIGHTS: ${state.leftPanMassGrams}g`, pans.leftX, pans.leftY + 24);

  // Right Pan & Suspension Chains (Artifact Pan)
  const rightAnchorX = px + Math.cos(state.scaleAngle) * SCALE_BEAM_HALF;
  const rightAnchorY = py + Math.sin(state.scaleAngle) * SCALE_BEAM_HALF;
  ctx.beginPath();
  ctx.moveTo(rightAnchorX, rightAnchorY);
  ctx.lineTo(pans.rightX - 42, pans.rightY);
  ctx.moveTo(rightAnchorX, rightAnchorY);
  ctx.lineTo(pans.rightX + 42, pans.rightY);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(pans.rightX, pans.rightY, 46, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#92400e';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();

  let statusLabel = 'DROP RELIC HERE';
  if (state.rightPanMassGrams > 0) {
    if (state.leftPanMassGrams === 0) {
      statusLabel = 'ADD LEFT WEIGHTS';
    } else if (state.rightPanMassGrams === state.leftPanMassGrams) {
      statusLabel = `BALANCED (${state.leftPanMassGrams}g!)`;
    } else if (state.rightPanMassGrams > state.leftPanMassGrams) {
      statusLabel = 'RELIC IS HEAVIER';
    } else {
      statusLabel = 'RELIC IS LIGHTER';
    }
  }
  ctx.fillStyle =
    state.rightPanMassGrams > 0 && state.rightPanMassGrams === state.leftPanMassGrams
      ? '#34d399'
      : '#fde68a';
  ctx.fillText(statusLabel, pans.rightX, pans.rightY + 24);
  ctx.textAlign = 'left';
}

function drawBrassOscillograph(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState,
  t: number
): void {
  const ox = OSCILLOGRAPH_X;
  const oy = OSCILLOGRAPH_Y;

  // Mahogany & Brass Instrument Housing
  drawRoundedRect(ctx, ox - 92, oy - 62, 184, 132, 8);
  ctx.fillStyle = '#261408';
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Parchment Graph Window
  drawRoundedRect(ctx, ox - 80, oy - 48, 160, 74, 4);
  ctx.fillStyle = '#18120b';
  ctx.fill();
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Oscillograph Waveform Trace
  ctx.beginPath();
  const amp = state.oscillographAmplitude;
  const sig = state.currentCase.acousticSignature;
  for (let i = 0; i <= 60; i++) {
    const px = ox - 74 + (i / 60) * 148;
    const norm = i / 60;
    let wy = oy - 11;
    if (amp > 0.02) {
      if (sig === 'gold_sine') {
        wy += Math.sin(norm * Math.PI * 6 - t * 18) * 22 * amp;
      } else if (sig === 'silver_ring') {
        wy +=
          (Math.sin(norm * Math.PI * 10 - t * 24) * 0.7 +
            Math.sin(norm * Math.PI * 20 + t * 15) * 0.3) *
          24 *
          amp;
      } else if (sig === 'lead_thud') {
        wy += Math.exp(-norm * 6) * Math.sin(norm * 12) * 14 * amp;
      } else if (sig === 'clockwork_steady') {
        const spike = i % 15 === 0 ? -18 : 0;
        wy += spike * amp;
      } else if (sig === 'clockwork_bomb') {
        const spike = i % 4 === 0 ? (i % 8 === 0 ? -26 : 24) : 0;
        wy += spike * amp;
      } else if (sig === 'cursed_whisper') {
        wy +=
          Math.sin(norm * 18 - t * 9) *
          Math.cos(norm * 7 + t * 13) *
          25 *
          amp;
      }
    }
    if (i === 0) ctx.moveTo(px, wy);
    else ctx.lineTo(px, wy);
  }
  ctx.strokeStyle =
    amp > 0.02
      ? sig === 'lead_thud' || sig === 'clockwork_bomb' || sig === 'cursed_whisper'
        ? '#f87171'
        : '#34d399'
      : '#78350f';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Readout Plate
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('ACOUSTIC OSCILLOGRAPH', ox, oy + 42);
  ctx.fillStyle = amp > 0.02 ? '#fef08a' : '#d6d3d1';
  ctx.font = 'bold 9.5px Georgia, serif';
  ctx.fillText(state.lastAcousticLabel, ox, oy + 58);

  // Cradle label for Tuning Fork
  ctx.fillStyle = 'rgba(253, 230, 138, 0.55)';
  ctx.font = 'bold 9px Georgia, serif';
  ctx.fillText('TUNING FORK', 950, 382);
  ctx.textAlign = 'left';
}

function drawReferenceLedger(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState
): void {
  const lx = 48;
  const ly = 548;
  const lw = 324;
  const lh = 212;

  // Leather Book Binding
  drawRoundedRect(ctx, lx - 6, ly - 6, lw + 12, lh + 12, 8);
  ctx.fillStyle = '#3b1708';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Open Parchment Pages
  drawRoundedRect(ctx, lx, ly, lw, lh - 26, 5);
  ctx.fillStyle = '#fef3c7';
  ctx.fill();

  // Center Spine crease
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LEDGER_CENTER_X, ly + 4);
  ctx.lineTo(LEDGER_CENTER_X, ly + lh - 30);
  ctx.stroke();

  // Dog-eared corners (visual page-flip affordance)
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.moveTo(lx + lw - 22, ly);
  ctx.lineTo(lx + lw, ly + 22);
  ctx.lineTo(lx + lw - 22, ly + 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 11px Georgia, serif';

  if (state.ledgerPage === 0) {
    // PAGE 1: VALID ROYAL HALLMARKS
    ctx.fillText('I. VALID HALLMARKS', lx + 12, ly + 20);
    ctx.fillText('FORGED MARKS (SEIZE!)', lx + 172, ly + 20);

    drawHallmarkSymbol(ctx, 'crown_upright', lx + 30, ly + 52, 14, '#15803d');
    ctx.font = '10px Georgia, serif';
    ctx.fillText('Upright 3-Peak', lx + 52, ly + 49);
    ctx.fillText('Royal Crown', lx + 52, ly + 61);

    drawHallmarkSymbol(ctx, 'sunburst_8', lx + 30, ly + 95, 14, '#15803d');
    ctx.fillText('8-Pt Admiralty', lx + 52, ly + 92);
    ctx.fillText('Sunburst Seal', lx + 52, ly + 104);

    drawHallmarkSymbol(ctx, 'anchor_keys', lx + 30, ly + 138, 14, '#15803d');
    ctx.fillText('Guild Silver', lx + 52, ly + 135);
    ctx.fillText('Anchor & Keys', lx + 52, ly + 147);

    // Right Page: Forgeries
    drawHallmarkSymbol(ctx, 'crown_inverted', lx + 190, ly + 55, 14, '#b91c1c');
    ctx.fillText('Inverted Crown', lx + 212, ly + 52);
    ctx.fillText('(Forged Die!)', lx + 212, ly + 64);

    drawHallmarkSymbol(ctx, 'sunburst_6_cracked', lx + 190, ly + 102, 14, '#b91c1c');
    ctx.fillText('6-Pt Cracked Star', lx + 212, ly + 99);
    ctx.fillText('(Shadow Mint!)', lx + 212, ly + 111);

    drawHallmarkSymbol(ctx, 'auditor_sting', lx + 190, ly + 144, 14, '#b91c1c');
    ctx.fillText('Auditor Eye Mark', lx + 212, ly + 141);
    ctx.fillText('(Sting Test!)', lx + 212, ly + 153);
  } else if (state.ledgerPage === 1) {
    // PAGE 2: TRUE MATERIAL WEIGHTS & ACOUSTICS
    ctx.fillText('II. TRUE WEIGHTS', lx + 12, ly + 20);
    ctx.fillText('FORK RESONANCE', lx + 172, ly + 20);
    ctx.font = '10px Georgia, serif';
    const rows = [
      ['Gold Sovereign: 30g', 'Gold: 528Hz Pure Sine'],
      ['Bullion Ingot: 100g', 'Silver: 880Hz High Ring'],
      ['Silver Chalice: 80g', 'Lead Core: 118Hz Thud!'],
      ['Chronometer: 60g', 'Naval Watch: 1Hz Tick'],
      ['Reliquary Bone: 50g', 'Bomb: 6Hz Fast Tick!'],
      ['Harbor Pass: 10g', 'Hex Bone: 311Hz Hum!'],
      ['Crown Matrix: 150g', 'UV Veins = Seize!'],
    ];
    rows.forEach(([left, right], idx) => {
      const ry = ly + 42 + idx * 20;
      ctx.fillStyle = '#1c1917';
      ctx.fillText(left, lx + 12, ry);
      ctx.fillStyle = right.includes('!') ? '#b91c1c' : '#15803d';
      ctx.fillText(right, lx + 172, ry);
    });
  } else {
    // PAGE 3: TONIGHT'S CONTRABAND & WANTED NOTICE
    ctx.fillText('III. NIGHTLY DECREE', lx + 12, ly + 20);
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.fillText(state.nightBriefing.contrabandHeadline, lx + 170, ly + 20);

    ctx.fillStyle = '#1c1917';
    ctx.font = '10.5px Georgia, serif';
    let curY = ly + 44;
    for (const rule of state.nightBriefing.contrabandRules) {
      curY = wrapText(ctx, rule, lx + 14, curY, lw - 28, 15) + 6;
    }
  }

  // 3 Clickable Brass Index Tabs at bottom of Ledger
  const tabs = ['[1] HALLMARKS', '[2] WEIGHTS', '[3] DECREE'];
  tabs.forEach((label, idx) => {
    const tx = lx + idx * 108;
    const ty = ly + lh - 24;
    drawRoundedRect(ctx, tx + 2, ty, 104, 24, 4);
    ctx.fillStyle = state.ledgerPage === idx ? '#d97706' : '#57240c';
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 9.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, tx + 54, ty + 16);
  });
  ctx.textAlign = 'left';
}

function drawInkPadAndDrawer(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState
): void {
  // Twin Ink Pad (Emerald & Crimson Felt Wells) at (955, 485)
  drawRoundedRect(ctx, INK_PAD_X - 50, INK_PAD_Y - 36, 100, 72, 8);
  ctx.fillStyle = '#291509';
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Emerald Certify Ink Well
  drawRoundedRect(ctx, INK_PAD_X - 42, INK_PAD_Y - 24, 38, 42, 4);
  ctx.fillStyle = '#065f46';
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.stroke();

  // Crimson Seize Ink Well
  drawRoundedRect(ctx, INK_PAD_X + 4, INK_PAD_Y - 24, 38, 42, 4);
  ctx.fillStyle = '#7f1d1d';
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.stroke();

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 9px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('INK PAD (DIP)', INK_PAD_X, INK_PAD_Y + 30);

  // Stamp Rack Base (x: 1035..1235, y: 445..525)
  drawRoundedRect(ctx, 1035, 448, 198, 76, 8);
  ctx.fillStyle = '#241207';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('CERTIFY', 1085, 538);
  ctx.fillStyle = '#fecaca';
  ctx.fillText('CONFISCATE', 1185, 538);

  // Optical & UV Lens Velvet Tray (Bottom Right: x: 990..1250, y: 585..735)
  drawRoundedRect(ctx, 988, 582, 262, 146, 10);
  ctx.fillStyle = '#1e1008';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fde68a';
  ctx.fillText('2.5x LOUPE', 1055, 720);
  ctx.fillStyle = '#d8b4fe';
  ctx.fillText('UV AETHER LENS', 1185, 720);

  // Hidden Smuggler's Fence Drawer at Bottom Edge of Desk (x: 635, y: 762)
  const slideY = SMUGGLER_DRAWER_Y - state.drawerOpenRatio * 48;
  drawRoundedRect(ctx, SMUGGLER_DRAWER_X - 185, slideY - 24, 370, 68, 8);
  ctx.fillStyle = '#170b04';
  ctx.fill();
  ctx.strokeStyle = state.drawerOpenRatio > 0.1 ? '#f59e0b' : '#92400e';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Brass Drawer Pull Handle
  drawRoundedRect(ctx, SMUGGLER_DRAWER_X - 48, slideY - 14, 96, 14, 4);
  ctx.fillStyle = '#d97706';
  ctx.fill();

  ctx.fillStyle = state.drawerOpenRatio > 0.1 ? '#fbbf24' : 'rgba(253, 230, 138, 0.72)';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.fillText(
    `SMUGGLER’S DRAWER — SLIP RELIC HERE FOR +${state.currentCase.fenceValueSovereigns}g (+SUSPICION)`,
    SMUGGLER_DRAWER_X,
    slideY + 20
  );
  ctx.textAlign = 'left';
}

function drawDeskObject(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState,
  obj: DraggableObject,
  isMagnified: boolean,
  isUV: boolean
): void {
  ctx.save();
  const liftOffset = obj.lift * 12 - obj.bounceY;
  const shadowDrop = 5 + obj.lift * 14;

  ctx.translate(obj.x, obj.y - liftOffset);
  ctx.rotate(obj.rotation);

  // Soft offset drop shadow that grows when lifted off the desk
  if (!isMagnified) {
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${0.38 - obj.lift * 0.1})`;
    ctx.beginPath();
    if (obj.id === 'claimant_slip') {
      drawRoundedRect(ctx, -84 + shadowDrop, -104 + shadowDrop, 168, 208, 6);
    } else {
      ctx.arc(shadowDrop * 0.7, shadowDrop, obj.radius * (1 + obj.lift * 0.06), 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }

  if (obj.id === 'claimant_slip') {
    drawClaimantSlipContent(ctx, state, isMagnified, isUV);
  } else if (obj.id === 'artifact') {
    drawArtifactContent(ctx, state, isMagnified, isUV);
  } else if (obj.grams) {
    // Brass Counterweight (10g, 20g, 50g, 100g)
    const r = obj.radius;
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.55, '#d97706');
    grad.addColorStop(1, '#78350f');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#271206';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${obj.grams}g`, 0, 4);
  } else if (obj.id === 'tuning_fork') {
    // Brass Acoustic Tuning Fork
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 32);
    ctx.lineTo(0, 4);
    ctx.moveTo(-11, 4);
    ctx.lineTo(11, 4);
    ctx.moveTo(-11, 4);
    ctx.lineTo(-11, -32);
    ctx.moveTo(11, 4);
    ctx.lineTo(11, -32);
    ctx.stroke();

    if (state.oscillographTimer > 2.2) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -18, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (obj.id === 'stamp_green' || obj.id === 'stamp_red') {
    const isGreen = obj.id === 'stamp_green';
    const inked = isGreen ? state.greenStampInked : state.redStampInked;
    // Heavy Iron & Brass Stamp Base
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fillStyle = isGreen ? '#064e3b' : '#7f1d1d';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = inked ? (isGreen ? '#34d399' : '#f87171') : '#d97706';
    ctx.stroke();

    // Turned Mahogany Handle Knob
    ctx.beginPath();
    ctx.arc(0, -6, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#451a03';
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 9.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(isGreen ? 'CERTIFY' : 'SEIZE', 0, 22);
  }

  ctx.restore();
}

function drawClaimantSlipContent(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState,
  isMagnified: boolean,
  isUV: boolean
): void {
  const c = state.currentCase;

  // Aged Parchment Voucher (#fef3c7)
  drawRoundedRect(ctx, -84, -104, 168, 208, 5);
  ctx.fillStyle = isUV ? '#1e1b4b' : '#fef3c7';
  ctx.fill();
  ctx.strokeStyle = isUV ? '#818cf8' : '#b45309';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = isUV ? '#e0e7ff' : '#451a03';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('ROYAL APPRAISAL SLIP', 0, -82);

  ctx.strokeStyle = isUV ? 'rgba(129, 140, 248, 0.4)' : 'rgba(146, 64, 14, 0.35)';
  ctx.beginPath();
  ctx.moveTo(-70, -72);
  ctx.lineTo(70, -72);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 10px Georgia, serif';
  ctx.fillText(`ITEM: ${c.artifactName}`, -72, -52);
  ctx.font = '10px Georgia, serif';
  ctx.fillText(`MATERIAL: ${c.declaredMaterial}`, -72, -34);
  ctx.fillText(`DECLARED WT: ${c.declaredWeightGrams}g`, -72, -16);
  ctx.fillText(`SEAL: ${c.declaredHallmark}`, -72, 2);
  ctx.fillText(`STIPEND FEE: +${c.baseFeeSovereigns}g`, -72, 20);

  // Official Stamp Target Box at bottom of slip
  drawRoundedRect(ctx, -68, 34, 136, 56, 4);
  ctx.strokeStyle = isUV ? '#a855f7' : '#92400e';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = isUV ? 'rgba(192, 132, 252, 0.6)' : 'rgba(120, 53, 15, 0.48)';
  ctx.font = 'bold 9.5px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('SLAM IRON STAMP HERE', 0, 64);

  if (isMagnified && !isUV) {
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 8px Georgia, serif';
    ctx.fillText(`REGISTRY #${c.id.toUpperCase()}`, 0, 82);
  }

  if (isUV) {
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 9.5px Georgia, serif';
    ctx.fillText(c.uvInscription, 0, 48);
  }

  // Render any stamped wet ink imprints on the slip
  for (const imp of state.slipImprints) {
    ctx.save();
    ctx.translate(imp.relX, imp.relY);
    ctx.rotate(imp.angle);
    drawRoundedRect(ctx, -52, -18, 104, 36, 4);
    ctx.strokeStyle = imp.choice === 'certify' ? '#059669' : '#dc2626';
    ctx.fillStyle =
      imp.choice === 'certify'
        ? 'rgba(16, 185, 129, 0.22)'
        : 'rgba(239, 68, 68, 0.24)';
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = imp.choice === 'certify' ? '#065f46' : '#991b1b';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(imp.choice === 'certify' ? 'CERTIFIED' : 'CONFISCATED', 0, 5);
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

function drawArtifactContent(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState,
  isMagnified: boolean,
  isUV: boolean
): void {
  const c = state.currentCase;
  const v = c.visualType;

  // Base geometry per artifact type
  if (v === 'sovereign_coin') {
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fillStyle = isUV ? '#312e81' : '#f59e0b';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isUV ? '#a855f7' : '#fef08a';
    ctx.stroke();
  } else if (v === 'bullion_ingot') {
    drawRoundedRect(ctx, -48, -30, 96, 60, 8);
    ctx.fillStyle = isUV ? '#2e1065' : '#d97706';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isUV ? '#c084fc' : '#fef08a';
    ctx.stroke();
    drawRoundedRect(ctx, -36, -18, 72, 36, 4);
    ctx.stroke();
  } else if (v === 'silver_chalice') {
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fillStyle = isUV ? '#1e293b' : '#94a3b8';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isUV ? '#38bdf8' : '#f8fafc';
    ctx.stroke();
  } else if (v === 'pocket_chronometer') {
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fillStyle = isUV ? '#1e1b4b' : '#b45309';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fde68a';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fillStyle = isUV ? '#0f172a' : '#fef3c7';
    ctx.fill();
  } else if (v === 'harbor_passport') {
    drawRoundedRect(ctx, -44, -54, 88, 108, 5);
    ctx.fillStyle = isUV ? '#1e1b4b' : '#fde68a';
    ctx.fill();
    ctx.strokeStyle = isUV ? '#a855f7' : '#92400e';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Red Wax Seal in center
    ctx.beginPath();
    ctx.arc(0, 8, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#991b1b';
    ctx.fill();
  } else if (v === 'reliquary_bone') {
    drawRoundedRect(ctx, -46, -24, 92, 48, 18);
    ctx.fillStyle = isUV ? '#3b0764' : '#e7e5e4';
    ctx.fill();
    ctx.strokeStyle = isUV ? '#f43f5e' : '#b45309';
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    // Imperial Crown Matrix
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 46;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = isUV ? '#4c1d95' : '#b45309';
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Naked-eye view shows only a tiny indistinct speck in the center;
  // 2.5x Loupe reveals the crisp Hallmark & micro-scratches/fuse wire!
  if (!isMagnified && !isUV) {
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#451a03';
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.artifactName.split(' ').slice(-1)[0].toUpperCase(), 0, 32);
    ctx.textAlign = 'left';
    return;
  }

  // MAGNIFIED 2.5x LOUPE INTERNAL LAYER:
  if (isMagnified && !isUV) {
    drawHallmarkSymbol(
      ctx,
      c.hallmarkStyle,
      0,
      -4,
      16,
      c.hallmarkStyle === 'crown_inverted' ||
        c.hallmarkStyle === 'sunburst_6_cracked' ||
        c.hallmarkStyle === 'auditor_sting'
        ? '#dc2626'
        : '#451a03'
    );

    // Micro-scratches, fuse wires, or inscriptions visible only under the Loupe
    if (c.loupeDetail === 'shaved_rim_scratches') {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
        ctx.lineTo(Math.cos(a + 0.15) * 37, Math.sin(a + 0.15) * 37);
        ctx.stroke();
      }
    } else if (c.loupeDetail === 'detonator_fuse_wire') {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-24, -18);
      ctx.bezierCurveTo(-10, 22, 12, -22, 25, 16);
      ctx.stroke();
    }

    ctx.fillStyle = '#fef3c7';
    drawRoundedRect(ctx, -46, 15, 92, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 6.2px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.loupeInscription, 0, 24);
    ctx.textAlign = 'left';
  }

  // UV AETHER LENS INTERNAL LAYER:
  if (isUV) {
    if (c.uvReveal === 'blood_hex_veins') {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-32, -18);
      ctx.lineTo(-8, 4);
      ctx.lineTo(14, -12);
      ctx.lineTo(30, 16);
      ctx.moveTo(-18, 20);
      ctx.lineTo(8, -4);
      ctx.stroke();
    } else if (c.uvReveal === 'syndicate_cipher' || c.uvReveal === 'ancient_aether_matrix') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -4, 18, 0, Math.PI * 2);
      ctx.moveTo(-18, -4);
      ctx.lineTo(18, -4);
      ctx.moveTo(0, -22);
      ctx.lineTo(0, 14);
      ctx.stroke();
    } else if (c.uvReveal === 'genuine_watermark') {
      drawHallmarkSymbol(ctx, 'crown_upright', 0, -4, 16, '#34d399');
    } else if (c.uvReveal === 'false_crown_die') {
      drawHallmarkSymbol(ctx, 'crown_inverted', 0, -4, 16, '#f43f5e');
    }

    ctx.fillStyle = '#0f172a';
    drawRoundedRect(ctx, -46, 15, 92, 14, 3);
    ctx.fill();
    ctx.fillStyle =
      c.uvReveal === 'blood_hex_veins' || c.uvReveal === 'false_crown_die'
        ? '#fb7185'
        : '#38bdf8';
    ctx.font = 'bold 6.2px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.uvInscription, 0, 24);
    ctx.textAlign = 'left';
  }
}

// Mandatory 2.5x Zoomed Circular Lens Clipping for Jeweler's Loupe & UV Aether Lens
function drawMagnifyingLensObject(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState,
  lensObj: DraggableObject,
  mode: 'optical' | 'uv',
  t: number
): void {
  const liftOffset = lensObj.lift * 12 - lensObj.bounceY;
  const loupeX = lensObj.x;
  const loupeY = lensObj.y - liftOffset;
  const R = 56;

  // 1. Clipped 2.5x Zoomed Internal Layer
  ctx.save();
  ctx.beginPath();
  ctx.arc(loupeX, loupeY, R, 0, Math.PI * 2);
  ctx.clip();

  // Lens background tint
  ctx.fillStyle = mode === 'uv' ? '#170d2e' : '#083b2c';
  ctx.fillRect(loupeX - R, loupeY - R, R * 2, R * 2);

  // Apply 2.5x Zoom centered at (loupeX, loupeY)
  ctx.translate(loupeX, loupeY);
  ctx.scale(2.5, 2.5);
  ctx.translate(-loupeX, -loupeY);

  // Render zoomed Claimant Slip & Artifact inside the clipped lens!
  drawDeskObject(
    ctx,
    state,
    state.objects.claimant_slip,
    mode === 'optical',
    mode === 'uv'
  );
  drawDeskObject(
    ctx,
    state,
    state.objects.artifact,
    mode === 'optical',
    mode === 'uv'
  );

  // Subtle Aether pulse rings if UV mode
  if (mode === 'uv') {
    const pulse = 0.2 + Math.sin(t * 6) * 0.08;
    ctx.fillStyle = `rgba(139, 92, 246, ${pulse})`;
    ctx.fillRect(loupeX - R, loupeY - R, R * 2, R * 2);
  }
  ctx.restore();

  // 2. Brass Monocle / Loupe Rim & Mahogany Handle
  ctx.save();
  ctx.translate(loupeX, loupeY);
  ctx.rotate(lensObj.rotation);

  // Handle extending down-right
  ctx.strokeStyle = mode === 'uv' ? '#7c3aed' : '#b45309';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(R * 0.68, R * 0.68);
  ctx.lineTo(R * 1.18, R * 1.18);
  ctx.stroke();

  // Brass Outer Bezel Ring
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.strokeStyle = mode === 'uv' ? '#c084fc' : '#fbbf24';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Glass specular highlight arc
  ctx.beginPath();
  ctx.arc(0, 0, R - 6, -Math.PI * 0.78, -Math.PI * 0.35);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

function drawCandlelightVignette(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState,
  t: number,
  reducedMotion: boolean
): void {
  // Mandatory flicker equation: Math.sin(t * 7) * 0.02 + Math.cos(t * 13) * 0.01
  const flicker = reducedMotion
    ? 0
    : Math.sin(t * 7) * 0.02 + Math.cos(t * 13) * 0.01;

  const lampX = (48 + state.pointerX * 2) / 3;
  const lampY = (250 + state.pointerY * 2) / 3;

  const rad = ctx.createRadialGradient(
    lampX,
    lampY,
    140,
    WORKBENCH_WIDTH * 0.5,
    WORKBENCH_HEIGHT * 0.5,
    820
  );
  rad.addColorStop(0, `rgba(251, 191, 36, ${0.06 + flicker})`);
  rad.addColorStop(0.55, 'rgba(28, 16, 8, 0.08)');
  rad.addColorStop(1, `rgba(8, 4, 2, ${0.46 - flicker})`);

  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, WORKBENCH_WIDTH, WORKBENCH_HEIGHT);
}

function drawPostNightBalanceSheet(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState
): void {
  ctx.fillStyle = 'rgba(10, 5, 2, 0.68)';
  ctx.fillRect(0, 0, WORKBENCH_WIDTH, WORKBENCH_HEIGHT);

  const sx = 300;
  const sy = 105;
  const sw = 680;
  const sh = 590;

  drawRoundedRect(ctx, sx, sy, sw, sh, 10);
  ctx.fillStyle = '#fef3c7';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `END OF NIGHT ${state.night} — ROYAL AUDIT BALANCE SHEET`,
    sx + sw * 0.5,
    sy + 40
  );

  ctx.font = 'italic 13px Georgia, serif';
  ctx.fillStyle = '#78350f';
  ctx.fillText(state.nightBriefing.title, sx + sw * 0.5, sy + 62);

  ctx.textAlign = 'left';
  let rowY = sy + 96;
  for (const rec of state.tonightRecords) {
    drawRoundedRect(ctx, sx + 28, rowY - 18, sw - 56, 78, 6);
    ctx.fillStyle = rec.correctAppraisal
      ? 'rgba(16, 185, 129, 0.12)'
      : 'rgba(239, 68, 68, 0.14)';
    ctx.fill();
    ctx.strokeStyle = rec.correctAppraisal ? '#059669' : '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText(
      `${rec.claimantName} — ${rec.artifactName} [${rec.choice.toUpperCase()}]`,
      sx + 42,
      rowY + 4
    );

    ctx.font = '12px Georgia, serif';
    ctx.fillStyle = rec.correctAppraisal ? '#065f46' : '#991b1b';
    ctx.fillText(rec.outcomeNote, sx + 42, rowY + 24);

    ctx.fillStyle = '#57534e';
    ctx.font = 'italic 11.5px Georgia, serif';
    ctx.fillText(`Truth: ${rec.discrepancySummary}`, sx + 42, rowY + 44);

    rowY += 90;
  }

  // Rent & Lamp Oil Deduction + Trending Ending
  const summaryY = sy + sh - 135;
  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText(
    `Nightly Booth Rent & Lamp Oil Deduction: -${state.nightBriefing.rentAndOilCost}g Sovereigns`,
    sx + 40,
    summaryY
  );
  ctx.fillText(
    `Remaining Treasury Purse: ${state.sovereigns}g Sovereigns   |   Inquisition Suspicion: ${state.suspicion}/4`,
    sx + 40,
    summaryY + 24
  );

  const trend = ENDINGS[state.trendingEnding];
  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(`TRENDING FATE: ${trend.title}`, sx + 40, summaryY + 50);

  // Wax Seal Advance Button
  drawRoundedRect(ctx, sx + 190, sy + sh - 64, 300, 44, 8);
  ctx.fillStyle = '#065f46';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    state.night < 5
      ? `STAMP TO OPEN NIGHT ${state.night + 1} [CLICK / SPACE]`
      : 'STAMP FOR FINAL RECKONING [CLICK / SPACE]',
    sx + sw * 0.5,
    sy + sh - 37
  );
  ctx.textAlign = 'left';
}

function drawFinalEndingDossier(
  ctx: CanvasRenderingContext2D,
  state: WorkbenchState
): void {
  ctx.fillStyle = 'rgba(8, 4, 2, 0.78)';
  ctx.fillRect(0, 0, WORKBENCH_WIDTH, WORKBENCH_HEIGHT);

  const ending = state.finalEnding ?? ENDINGS[state.trendingEnding];
  const sx = 280;
  const sy = 140;
  const sw = 720;
  const sh = 510;

  drawRoundedRect(ctx, sx, sy, sw, sh, 12);
  ctx.fillStyle = '#fef3c7';
  ctx.fill();
  ctx.strokeStyle = ending.sealColor;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(ending.title, sx + sw * 0.5, sy + 56);

  ctx.fillStyle = '#92400e';
  ctx.font = 'italic 15px Georgia, serif';
  ctx.fillText(ending.subtitle, sx + sw * 0.5, sy + 84);

  ctx.fillStyle = '#1c1917';
  ctx.font = '15px Georgia, serif';
  ctx.textAlign = 'left';
  wrapText(ctx, ending.epilogue, sx + 56, sy + 135, sw - 112, 24);

  // Final Tally Box
  drawRoundedRect(ctx, sx + 56, sy + 255, sw - 112, 130, 8);
  ctx.fillStyle = 'rgba(180, 83, 9, 0.1)';
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText(
    `FINAL PURSE: ${state.sovereigns}g Gold Sovereigns`,
    sx + 80,
    sy + 290
  );
  ctx.fillText(
    `APPRAISAL ACCURACY: ${state.totalCorrectAppraisals} / ${state.totalCompletedCases} Relics`,
    sx + 80,
    sy + 318
  );
  ctx.fillText(
    `CROWN COMMENDATIONS: ${state.crownCommendations}   |   SYNDICATE FAVOR: ${state.syndicateFavor}   |   HUMANITY: ${state.humanityScore}`,
    sx + 80,
    sy + 346
  );

  // Restart Shift Wax Seal
  drawRoundedRect(ctx, sx + 210, sy + sh - 78, 300, 48, 8);
  ctx.fillStyle = '#78350f';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('BEGIN NEW NIGHT SHIFT [CLICK / R]', sx + sw * 0.5, sy + sh - 49);
  ctx.textAlign = 'left';
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && i > 0) {
      ctx.fillText(line.trimEnd(), x, curY);
      line = words[i] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trimEnd(), x, curY);
  }
  return curY;
}
