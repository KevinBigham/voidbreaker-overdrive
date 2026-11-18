import {
  ANVIL_PLATE_X1,
  ANVIL_PLATE_X2,
  ANVIL_PLATE_Y,
  CRUCIBLE_CENTER_X,
  CRUCIBLE_CENTER_Y,
  CRUCIBLE_RADIUS_X,
  CRUCIBLE_RADIUS_Y,
  DIVIDER_Y,
  SCALE_LEFT_PAN_X,
  SCALE_PAN_BASE_Y,
  SCALE_PIVOT_X,
  SCALE_PIVOT_Y,
  SCALE_RIGHT_PAN_X,
  WORKBENCH_HEIGHT,
  WORKBENCH_WIDTH,
} from './simulation';
import type { CruciblePressState, ReagentBead } from './types';

export interface RenderTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

const PALETTE = {
  walnutDark: '#1c1613',
  walnutMid: '#2a201b',
  walnutGrain: '#362922',
  parchment: '#f4ece1',
  parchmentAged: '#e3d5c1',
  parchmentInk: '#2b211c',
  brassDark: '#7c5416',
  brassMid: '#b58025',
  brassBurnished: '#d49b35',
  brassHighlight: '#f2ca6b',
  copperWarm: '#c86432',
  copperGlow: '#ea7b3c',
  verdigris: '#2a9d8f',
  verdigrisBright: '#52ccb8',
  cinnabar: '#e63946',
  amberGlass: '#ffb703',
  smokedGlass: 'rgba(34, 28, 24, 0.72)',
  leadSlag: '#5c6168',
  quicksilver: '#dce3ea',
  saltCrystal: '#fbf6ef',
};

export function computeWorkbenchTransform(
  canvasWidth: number,
  canvasHeight: number
): RenderTransform {
  const scale = Math.min(
    canvasWidth / WORKBENCH_WIDTH,
    canvasHeight / WORKBENCH_HEIGHT
  );
  const offsetX = (canvasWidth - WORKBENCH_WIDTH * scale) * 0.5;
  const offsetY = (canvasHeight - WORKBENCH_HEIGHT * scale) * 0.5;
  return { scale, offsetX, offsetY, width: canvasWidth, height: canvasHeight };
}

export function screenToWorkbench(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  transform: RenderTransform
): { x: number; y: number } {
  const canvasX = clientX - rect.left;
  const canvasY = clientY - rect.top;
  return {
    x: (canvasX - transform.offsetX) / transform.scale,
    y: (canvasY - transform.offsetY) / transform.scale,
  };
}

export function renderCrucibleWorkbench(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState,
  transform: RenderTransform
): void {
  ctx.save();
  ctx.fillStyle = PALETTE.walnutDark;
  ctx.fillRect(0, 0, transform.width, transform.height);

  ctx.translate(transform.offsetX, transform.offsetY);
  ctx.scale(transform.scale, transform.scale);

  // 1. Aged Inked Walnut Workbench Surface & Brass Frame Border
  drawWalnutWorkbenchSurface(ctx, state);

  // 2. Upper-Left: Parchment Commission Slip pinned with a Brass Tack
  drawParchmentCommissionSlip(ctx, state);

  // 3. Left-Middle: Brass Reagent Chute & Feed Pull-Ring
  drawBrassReagentChute(ctx, state);

  // 4. Left-Bottom: Heated Copper Anvil & Spring Drop-Hammer ("The Physical Artifact Test")
  drawHeatedCopperAnvil(ctx, state);

  // 5. Center: The Smoked-Glass & Burnished-Brass Crucible Press
  drawCruciblePressVessel(ctx, state);

  // 6. All Physical Reagent Beads & Vapor Clouds
  drawVapors(ctx, state);
  drawConductiveArcs(ctx, state);
  for (const bead of state.beads) {
    drawReagentBead(ctx, state, bead);
  }

  // 7. Foreground Crucible Mechanisms (Shear Blade, Glass Reflections, Hairline Cracks, Pressure Gate)
  drawCrucibleForegroundOverlays(ctx, state);

  // 8. Weighted Brass Bellows Lever (Bottom-Left of Crucible)
  drawBrassBellowsMechanism(ctx, state);

  // 9. Right Column: Bourdon Pressure Gauge, Purity Drum, Discharge Handle & Cascade Assay Scales
  drawBourdonGaugeAndPurityDrum(ctx, state);
  drawDischargeAndAssayScales(ctx, state);

  // 10. Lower-Right: Physical Workbench Attachment Sockets & Bolted Mechanisms
  drawWorkbenchAttachmentSockets(ctx, state);

  // 11. Cursor-as-Hand Damped Spring Caliper Tether
  drawCursorHandTether(ctx, state);

  ctx.restore();
}

function drawWalnutWorkbenchSurface(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  const grad = ctx.createRadialGradient(
    CRUCIBLE_CENTER_X,
    CRUCIBLE_CENTER_Y,
    80,
    CRUCIBLE_CENTER_X,
    CRUCIBLE_CENTER_Y,
    780
  );
  grad.addColorStop(0, '#2e221c');
  grad.addColorStop(0.65, '#211915');
  grad.addColorStop(1, PALETTE.walnutDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORKBENCH_WIDTH, WORKBENCH_HEIGHT);

  // Subtle horizontal wood-plank joints & drafted brass inlay lines
  ctx.strokeStyle = 'rgba(212, 155, 53, 0.11)';
  ctx.lineWidth = 1;
  for (let y = 120; y < WORKBENCH_HEIGHT; y += 140) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(WORKBENCH_WIDTH - 14, y);
    ctx.stroke();
  }

  // Outer riveted brass workbench bezel
  ctx.strokeStyle = PALETTE.brassMid;
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, WORKBENCH_WIDTH - 20, WORKBENCH_HEIGHT - 20);

  // Diegetic Brass Utility Pins on top bezel (Mute Bell & Bench Reset Key — zero DOM buttons)
  drawBrassBezelPin(
    ctx,
    790,
    26,
    state.muted ? 'BELL: MUTED' : 'BELL: LIVE',
    state.muted ? PALETTE.cinnabar : PALETTE.brassBurnished
  );
  drawBrassBezelPin(ctx, 868, 26, 'RESET BENCH', PALETTE.brassMid);
}

function drawBrassBezelPin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string
): void {
  ctx.save();
  ctx.fillStyle = '#261d18';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - 36, y - 11, 72, 22, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '700 9px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 0.5);
  ctx.restore();
}

function drawParchmentCommissionSlip(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  const x = 26;
  const y = 22;
  const w = 308;
  const h = 204;

  ctx.save();
  // Drop shadow on walnut board
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;

  // Warm drafted parchment sheet
  const pGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  pGrad.addColorStop(0, PALETTE.parchment);
  pGrad.addColorStop(1, PALETTE.parchmentAged);
  ctx.fillStyle = pGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Drafted double ink border
  ctx.strokeStyle = 'rgba(43, 33, 28, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);

  // Brass Tack pinning the top center of the parchment
  const tackX = x + w * 0.5;
  const tackY = y + 12;
  ctx.fillStyle = PALETTE.brassBurnished;
  ctx.beginPath();
  ctx.arc(tackX, tackY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brassDark;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PALETTE.brassHighlight;
  ctx.beginPath();
  ctx.arc(tackX - 2.5, tackY - 2.5, 2.5, 0, Math.PI * 2);
  ctx.fill();

  const comm = state.currentCommission;

  // Patron Header
  ctx.fillStyle = '#6b4e35';
  ctx.font = '700 10px "Georgia", serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `COMMISSION NO. ${comm.index + 1} // ${comm.patronName.toUpperCase()}`,
    x + 18,
    y + 34
  );

  // Large Hand-Inked Commission Title ("Crack & Distill." on boot)
  ctx.fillStyle = PALETTE.parchmentInk;
  ctx.font = '700 22px "Georgia", serif';
  ctx.fillText(comm.slipTitle, x + 18, y + 62);

  // Inked sub-note
  ctx.fillStyle = '#3d2f28';
  ctx.font = 'italic 11.5px "Georgia", serif';
  wrapParchmentText(ctx, comm.subNote, x + 18, y + 84, w - 36, 15);

  // Alchemical Formula Diagram & Quota Bar at bottom of slip
  const barX = x + 18;
  const barY = y + 148;
  const barW = w - 36;
  const quota = comm.targetQuotaCoins;
  const current = state.mintedCoins;
  const ratio = Math.min(1, current / Math.max(1, quota));

  ctx.fillStyle = PALETTE.parchmentInk;
  ctx.font = '700 11px "Georgia", serif';
  ctx.fillText(
    `ASSAY RENT QUOTA: ${current} / ${quota} BRASS COINS`,
    barX,
    barY - 7
  );

  ctx.fillStyle = 'rgba(28, 22, 19, 0.16)';
  ctx.fillRect(barX, barY, barW, 12);
  ctx.fillStyle = ratio >= 1 ? PALETTE.verdigris : PALETTE.brassBurnished;
  ctx.fillRect(barX, barY, barW * ratio, 12);
  ctx.strokeStyle = PALETTE.parchmentInk;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, 12);

  // Quick-reference physical rule footer
  ctx.fillStyle = '#5c4638';
  ctx.font = '600 10px "Georgia", serif';
  ctx.fillText(
    'Drag beads to Funnel • Pump Bellows • Pull Discharge',
    barX,
    y + 184
  );

  // Wax seal stamp animation when commission completes
  if (state.commissionStampAnim > 0) {
    ctx.save();
    ctx.translate(x + w - 48, y + 54);
    ctx.fillStyle = PALETTE.cinnabar;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.amberGlass;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.parchment;
    ctx.font = '700 9px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAID', 0, 3);
    ctx.restore();
  }

  ctx.restore();
}

function wrapParchmentText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(' ');
  let line = '';
  let currY = y;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currY);
      line = words[i];
      currY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, currY);
  }
}

function drawBrassReagentChute(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  ctx.save();
  // Chute housing frame
  ctx.fillStyle = '#241b16';
  ctx.strokeStyle = PALETTE.brassMid;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(26, 242, 308, 238, 8);
  ctx.fill();
  ctx.stroke();

  // Header & Chute Feed Pull-Handle (Spring-loaded)
  ctx.fillStyle = PALETTE.brassHighlight;
  ctx.font = '700 11px "Georgia", serif';
  ctx.textAlign = 'left';
  ctx.fillText('BRASS REAGENT CHUTE', 42, 266);

  const pullOffset = state.chutePullSpring.position * 18;
  const pullX = 258;
  const pullY = 264 + pullOffset;
  ctx.strokeStyle = PALETTE.brassBurnished;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pullX, 244);
  ctx.lineTo(pullX, pullY);
  ctx.stroke();

  ctx.fillStyle = PALETTE.brassBurnished;
  ctx.beginPath();
  ctx.roundRect(pullX - 54, pullY - 10, 96, 22, 6);
  ctx.fill();
  ctx.strokeStyle = PALETTE.walnutDark;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = PALETTE.walnutDark;
  ctx.font = '700 9.5px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('PULL REFILL', pullX - 6, pullY + 4);

  // Sloped Brass Chute Rail & Stop Lip
  ctx.strokeStyle = PALETTE.brassBurnished;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(46, 392);
  ctx.lineTo(308, 427);
  ctx.lineTo(312, 386);
  ctx.stroke();

  // Engraved Reagent Key along bottom of chute box
  const keyItems: Array<{ label: string; color: string }> = [
    { label: 'LEAD: Heavy Crush', color: PALETTE.leadSlag },
    { label: 'CINNABAR: Heat', color: PALETTE.cinnabar },
    { label: 'VITRIOL: Acid', color: PALETTE.verdigris },
    { label: 'AETHER: Loop ×3/×5', color: PALETTE.quicksilver },
    { label: 'SALT: Freeze Gem', color: PALETTE.amberGlass },
  ];
  ctx.font = '600 9.5px "Georgia", serif';
  ctx.textAlign = 'left';
  keyItems.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const kx = 42 + col * 146;
    const ky = 432 + row * 16;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(kx, ky - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.parchmentAged;
    ctx.fillText(item.label, kx + 8, ky);
  });

  ctx.restore();
}

function drawHeatedCopperAnvil(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  ctx.save();
  ctx.fillStyle = '#231a15';
  ctx.strokeStyle = PALETTE.copperWarm;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(26, 496, 308, 198, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.copperGlow;
  ctx.font = '700 11px "Georgia", serif';
  ctx.textAlign = 'left';
  ctx.fillText('HEATED COPPER ANVIL (195°C)', 42, 520);
  ctx.fillStyle = PALETTE.parchmentAged;
  ctx.font = 'italic 10px "Georgia", serif';
  ctx.fillText('Drop Mercury or Geodes • Pull Hammer to Strike', 42, 536);

  // Spring-loaded Anvil Drop-Hammer
  const hammerLift = state.anvilHammerSpring.position * 34;
  const hammerX = 248;
  const hammerY = 588 - hammerLift;
  ctx.strokeStyle = PALETTE.brassMid;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hammerX, 530);
  ctx.lineTo(hammerX, hammerY);
  ctx.stroke();

  ctx.fillStyle = PALETTE.brassBurnished;
  ctx.beginPath();
  ctx.roundRect(hammerX - 32, hammerY - 14, 64, 26, 5);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brassHighlight;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PALETTE.walnutDark;
  ctx.font = '700 9px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('STRIKE', hammerX, hammerY + 3);

  // Heated Copper Anvil Plate & Glowing Ember Coils
  const anvilGrad = ctx.createLinearGradient(
    ANVIL_PLATE_X1,
    ANVIL_PLATE_Y,
    ANVIL_PLATE_X2,
    ANVIL_PLATE_Y + 26
  );
  anvilGrad.addColorStop(0, PALETTE.copperGlow);
  anvilGrad.addColorStop(0.5, PALETTE.copperWarm);
  anvilGrad.addColorStop(1, '#6e3219');
  ctx.fillStyle = anvilGrad;
  ctx.beginPath();
  ctx.roundRect(
    ANVIL_PLATE_X1,
    ANVIL_PLATE_Y,
    ANVIL_PLATE_X2 - ANVIL_PLATE_X1,
    22,
    5
  );
  ctx.fill();

  // Brazier heat glow beneath copper plate
  ctx.fillStyle = 'rgba(230, 57, 70, 0.32)';
  ctx.fillRect(ANVIL_PLATE_X1 + 16, ANVIL_PLATE_Y + 22, ANVIL_PLATE_X2 - ANVIL_PLATE_X1 - 32, 12);

  ctx.restore();
}

function drawCruciblePressVessel(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  ctx.save();

  // 1. Top Brass Feed Funnel
  ctx.fillStyle = '#332519';
  ctx.strokeStyle = PALETTE.brassBurnished;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(CRUCIBLE_CENTER_X - 78, 56);
  ctx.lineTo(CRUCIBLE_CENTER_X - 48, 168);
  ctx.lineTo(CRUCIBLE_CENTER_X + 48, 168);
  ctx.lineTo(CRUCIBLE_CENTER_X + 78, 56);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.parchmentAged;
  ctx.font = '700 10px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('DROP REAGENTS HERE', CRUCIBLE_CENTER_X, 46);

  // 2. Outer Burnished Brass Crucible Ring & Rivets
  ctx.fillStyle = PALETTE.brassDark;
  ctx.beginPath();
  ctx.ellipse(
    CRUCIBLE_CENTER_X,
    CRUCIBLE_CENTER_Y,
    CRUCIBLE_RADIUS_X + 18,
    CRUCIBLE_RADIUS_Y + 18,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.strokeStyle = PALETTE.brassBurnished;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Smoked-Glass Chamber Interior
  const heatNorm = Math.min(1, Math.max(0, (state.vesselTempC - 36) / 240));
  const glassGrad = ctx.createRadialGradient(
    CRUCIBLE_CENTER_X,
    CRUCIBLE_CENTER_Y + 40,
    20,
    CRUCIBLE_CENTER_X,
    CRUCIBLE_CENTER_Y,
    CRUCIBLE_RADIUS_Y
  );
  glassGrad.addColorStop(
    0,
    `rgba(${48 + Math.round(heatNorm * 140)}, ${34 + Math.round(heatNorm * 55)}, 24, 0.88)`
  );
  glassGrad.addColorStop(1, 'rgba(22, 17, 14, 0.94)');
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.ellipse(
    CRUCIBLE_CENTER_X,
    CRUCIBLE_CENTER_Y,
    CRUCIBLE_RADIUS_X,
    CRUCIBLE_RADIUS_Y,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 3. Rotating Alembic Drum & 6 Brass Lifter Paddles inside the chamber
  ctx.save();
  ctx.translate(CRUCIBLE_CENTER_X, CRUCIBLE_CENTER_Y);
  ctx.rotate(state.alembicAngle);

  ctx.strokeStyle = 'rgba(212, 155, 53, 0.42)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 162, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.save();
    ctx.rotate(a);
    ctx.strokeStyle = PALETTE.brassBurnished;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(136, 0);
    ctx.lineTo(164, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Alembic Drum Manual Crank Knob at upper-left of vessel rim (475, 210)
  const crankX = CRUCIBLE_CENTER_X + Math.cos(state.alembicAngle - 2.3) * (CRUCIBLE_RADIUS_X + 8);
  const crankY = CRUCIBLE_CENTER_Y + Math.sin(state.alembicAngle - 2.3) * (CRUCIBLE_RADIUS_Y + 8);
  ctx.fillStyle = PALETTE.brassHighlight;
  ctx.beginPath();
  ctx.arc(crankX, crankY, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.walnutDark;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. Focused Thermal Beam from the Rotatable Prism Lens (Left Upright at 392, 265)
  drawPrismLensAndThermalBeam(ctx, state);

  // 5. Internal Semi-Permeable Brass Divider Grate at y = DIVIDER_Y
  drawBrassDividerGrate(ctx, state);

  // 6. Bolted Attachments that appear directly on the Crucible when unlocked
  drawUnlockedCrucibleAttachments(ctx, state);

  ctx.restore();
}

function drawPrismLensAndThermalBeam(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  const lx = 392;
  const ly = 265;

  ctx.save();
  ctx.translate(lx, ly);
  ctx.rotate(state.prismAngle);

  // Warm amber thermal cone inside the crucible
  const beamGrad = ctx.createLinearGradient(18, 0, 410, 0);
  beamGrad.addColorStop(0, 'rgba(255, 183, 3, 0.34)');
  beamGrad.addColorStop(0.6, 'rgba(230, 57, 70, 0.14)');
  beamGrad.addColorStop(1, 'rgba(255, 183, 3, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(16, -8);
  ctx.lineTo(410, -48);
  ctx.lineTo(410, 48);
  ctx.lineTo(16, 8);
  ctx.closePath();
  ctx.fill();

  // Brass & Amber Glass Prism Housing
  ctx.fillStyle = PALETTE.brassBurnished;
  ctx.strokeStyle = PALETTE.walnutDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-18, -22, 34, 44, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.amberGlass;
  ctx.beginPath();
  ctx.ellipse(14, 0, 7, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = PALETTE.amberGlass;
  ctx.font = '700 9.5px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('PRISM LENS', lx, ly - 30);
}

function drawBrassDividerGrate(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  ctx.save();
  // Left Latch Pin (clickable to toggle or repair grate)
  const latchX = 424;
  const latchY = DIVIDER_Y;
  ctx.fillStyle = state.dividerOpen ? PALETTE.verdigris : PALETTE.brassBurnished;
  ctx.beginPath();
  ctx.arc(latchX, latchY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.walnutDark;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (!state.dividerOpen) {
    // Mix brass and verdigris green as Vitriol corrodes the divider
    const corr = 1 - state.dividerIntegrity;
    ctx.strokeStyle = corr > 0.35 ? PALETTE.verdigris : PALETTE.brassBurnished;
    ctx.lineWidth = 5 * Math.max(0.35, state.dividerIntegrity);

    // Left grate segment
    ctx.beginPath();
    ctx.moveTo(CRUCIBLE_CENTER_X - CRUCIBLE_RADIUS_X + 12, DIVIDER_Y);
    ctx.lineTo(CRUCIBLE_CENTER_X - 30, DIVIDER_Y);
    ctx.stroke();

    // Right grate segment
    ctx.beginPath();
    ctx.moveTo(CRUCIBLE_CENTER_X + 30, DIVIDER_Y);
    ctx.lineTo(CRUCIBLE_CENTER_X + CRUCIBLE_RADIUS_X - 12, DIVIDER_Y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawUnlockedCrucibleAttachments(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  for (const att of state.attachments) {
    if (!att.unlocked) continue;

    if (att.id === 'lodestone_ring') {
      ctx.save();
      ctx.translate(CRUCIBLE_CENTER_X, CRUCIBLE_CENTER_Y + 38);
      ctx.rotate(att.angle);
      ctx.strokeStyle = 'rgba(42, 157, 143, 0.55)';
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (att.id === 'twin_jaw_crusher') {
      const jawSqueeze = Math.sin(state.elapsedSec * 8) * 6;
      ctx.fillStyle = PALETTE.brassBurnished;
      ctx.fillRect(CRUCIBLE_CENTER_X - 42 + jawSqueeze, 172, 18, 24);
      ctx.fillRect(CRUCIBLE_CENTER_X + 24 - jawSqueeze, 172, 18, 24);
    } else if (att.id === 'cryo_condenser') {
      ctx.fillStyle = PALETTE.verdigrisBright;
      ctx.beginPath();
      ctx.arc(822, 182, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.walnutDark;
      ctx.font = '700 8px "Georgia", serif';
      ctx.textAlign = 'center';
      ctx.fillText('CRYO', 822, 185);
    } else if (att.id === 'centrifuge_spinner') {
      ctx.save();
      ctx.translate(828, 468);
      ctx.rotate(att.angle);
      ctx.strokeStyle = PALETTE.brassHighlight;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.moveTo(0, -18);
      ctx.lineTo(0, 18);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawVapors(ctx: CanvasRenderingContext2D, state: CruciblePressState): void {
  ctx.save();
  for (const v of state.vapors) {
    const alpha = Math.max(0, 1 - v.life / v.maxLife) * 0.55;
    if (v.kind === 'ignition_flare') {
      ctx.fillStyle = `rgba(255, 183, 3, ${alpha * 1.4})`;
    } else if (v.kind === 'acid_fume') {
      ctx.fillStyle = `rgba(42, 157, 143, ${alpha})`;
    } else if (v.kind === 'mercury_vapor') {
      ctx.fillStyle = `rgba(220, 227, 234, ${alpha})`;
    } else if (v.kind === 'salt_frost') {
      ctx.fillStyle = `rgba(244, 236, 225, ${alpha * 1.2})`;
    } else {
      ctx.fillStyle = `rgba(244, 236, 225, ${alpha * 0.75})`;
    }
    ctx.beginPath();
    ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawConductiveArcs(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  if (state.activeArcs.length === 0) return;
  ctx.save();
  for (const arc of state.activeArcs) {
    ctx.strokeStyle = arc.inClosedLoop
      ? arc.loopOrder >= 4
        ? PALETTE.amberGlass
        : PALETTE.verdigrisBright
      : 'rgba(220, 227, 234, 0.55)';
    ctx.lineWidth = arc.inClosedLoop ? 3.5 : 1.8;

    const midX = (arc.x1 + arc.x2) * 0.5 + Math.sin(state.elapsedSec * 28 + arc.fromBeadId) * 6;
    const midY = (arc.y1 + arc.y2) * 0.5 + Math.cos(state.elapsedSec * 28 + arc.toBeadId) * 6;

    ctx.beginPath();
    ctx.moveTo(arc.x1, arc.y1);
    ctx.quadraticCurveTo(midX, midY, arc.x2, arc.y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawReagentBead(
  ctx: CanvasRenderingContext2D,
  _state: CruciblePressState,
  b: ReagentBead
): void {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rotation);

  // Thermal aura for hot beads
  if (b.temperature > 85) {
    const heatAlpha = Math.min(0.45, (b.temperature - 85) / 300);
    ctx.fillStyle = `rgba(255, 183, 3, ${heatAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 6, 0, Math.PI * 2);
    ctx.fill();
  }

  switch (b.kind) {
    case 'lead': {
      // Heavy dark-gray hammered lead ingot sphere
      ctx.fillStyle = PALETTE.leadSlag;
      ctx.strokeStyle = '#2b2d30';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(-b.radius * 0.3, -b.radius * 0.3, b.radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'lead_geode': {
      // Cracked slag shell with golden core glimmering through seams
      ctx.fillStyle = '#4e4842';
      ctx.strokeStyle = PALETTE.brassBurnished;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Golden core seam lines
      ctx.strokeStyle = PALETTE.amberGlass;
      ctx.lineWidth = 2 + (1 - b.shellIntegrity) * 2.5;
      ctx.beginPath();
      ctx.moveTo(-b.radius * 0.55, -4);
      ctx.lineTo(0, 3);
      ctx.lineTo(b.radius * 0.55, -5);
      ctx.moveTo(0, 3);
      ctx.lineTo(2, b.radius * 0.6);
      ctx.stroke();
      break;
    }

    case 'gold_core': {
      // Gleaming pure alchemical gold core
      ctx.fillStyle = PALETTE.amberGlass;
      ctx.strokeStyle = PALETTE.brassHighlight;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'cinnabar': {
      // Faceted exothermic vermilion crystal
      ctx.fillStyle = PALETTE.cinnabar;
      ctx.strokeStyle = PALETTE.amberGlass;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = Math.cos(a) * b.radius;
        const py = Math.sin(a) * b.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'vitriol': {
      // Oxidized verdigris corrosive fluid globule
      ctx.fillStyle = PALETTE.verdigris;
      ctx.strokeStyle = PALETTE.verdigrisBright;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'quicksilver': {
      // Mirror-like liquid mercury/aether sphere
      const qGrad = ctx.createRadialGradient(
        -b.radius * 0.3,
        -b.radius * 0.3,
        2,
        0,
        0,
        b.radius
      );
      qGrad.addColorStop(0, '#ffffff');
      qGrad.addColorStop(0.55, PALETTE.quicksilver);
      qGrad.addColorStop(1, '#6c7a89');
      ctx.fillStyle = qGrad;
      ctx.strokeStyle = PALETTE.amberGlass;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'salt': {
      // Crisp white-and-gold octahedron Philosopher's Salt crystal
      ctx.fillStyle = PALETTE.saltCrystal;
      ctx.strokeStyle = PALETTE.brassBurnished;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -b.radius);
      ctx.lineTo(b.radius, 0);
      ctx.lineTo(0, b.radius);
      ctx.lineTo(-b.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'philosopher_gem': {
      // High-tier radiant octagonal Philosopher's Gem
      ctx.fillStyle = PALETTE.cinnabar;
      ctx.strokeStyle = PALETTE.amberGlass;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const px = Math.cos(a) * b.radius;
        const py = Math.sin(a) * b.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'wax_seal': {
      ctx.fillStyle = '#d8c39e';
      ctx.strokeStyle = PALETTE.brassDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function drawCrucibleForegroundOverlays(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  ctx.save();

  // 1. Hairline Glass Cracks spiderwebbing across the vessel under high Bar pressure
  if (state.cracks.length > 0) {
    ctx.strokeStyle = 'rgba(244, 236, 225, 0.78)';
    ctx.lineWidth = 1.6;
    for (const c of state.cracks) {
      const endX = c.x + Math.cos(c.angle) * c.length;
      const endY = c.y + Math.sin(c.angle) * c.length;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(endX, endY);
      for (const br of c.branches) {
        const bx = c.x + Math.cos(c.angle) * (c.length * br.t);
        const by = c.y + Math.sin(c.angle) * (c.length * br.t);
        ctx.moveTo(bx, by);
        ctx.lineTo(
          bx + Math.cos(c.angle + br.angleOffset) * br.length,
          by + Math.sin(c.angle + br.angleOffset) * br.length
        );
      }
      ctx.stroke();
    }
  }

  // 2. Pressure-Lock Gate Handle across Top Neck (y = 104)
  const gateSlide = state.pressureGateSpring.position;
  const gatePlateX = CRUCIBLE_CENTER_X + 60 - gateSlide * 60;
  ctx.fillStyle = state.ventClosed ? PALETTE.cinnabar : PALETTE.brassBurnished;
  ctx.strokeStyle = PALETTE.walnutDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(gatePlateX - 56, 92, 118, 24, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '700 9.5px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    state.ventClosed ? 'VENT CLAMPED (GREED)' : 'VENT OPEN (CLICK TO CLAMP)',
    gatePlateX + 3,
    107
  );

  // 3. Spring-Loaded Shear-Blade on Right Wall (842, 285)
  const shearPull = state.shearBladeSpring.position * 48;
  const bladeTipX = 768 + shearPull;
  const bladeY = 285;

  // Blade steel triangle
  ctx.fillStyle = '#cfd6dc';
  ctx.strokeStyle = PALETTE.brassBurnished;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bladeTipX - 58, bladeY);
  ctx.lineTo(bladeTipX + 26, bladeY - 16);
  ctx.lineTo(bladeTipX + 26, bladeY + 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Brass Shear Handle
  const handleX = bladeTipX + 64;
  ctx.fillStyle = PALETTE.brassBurnished;
  ctx.beginPath();
  ctx.roundRect(handleX - 28, bladeY - 18, 66, 36, 7);
  ctx.fill();
  ctx.strokeStyle = PALETTE.walnutDark;
  ctx.stroke();

  ctx.fillStyle = PALETTE.walnutDark;
  ctx.font = '700 9.5px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('PULL SHEAR', handleX + 5, bladeY + 3);

  ctx.restore();
}

function drawBrassBellowsMechanism(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  ctx.save();
  const baseX = 405;
  const baseY = 605;
  const pressY = state.bellowsSpring.position * 42;

  // Pleated leather accordion body
  ctx.fillStyle = '#472d22';
  ctx.strokeStyle = PALETTE.brassMid;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(baseX - 42, baseY - 22 + pressY * 0.6);
  ctx.lineTo(baseX + 55, baseY - 34);
  ctx.lineTo(baseX + 55, baseY + 34);
  ctx.lineTo(baseX - 42, baseY + 42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Weighted Brass Bellows Handle
  const handleY = baseY - 26 + pressY;
  ctx.fillStyle = PALETTE.brassBurnished;
  ctx.strokeStyle = PALETTE.brassHighlight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(baseX - 55, handleY - 16, 114, 32, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.walnutDark;
  ctx.font = '700 10.5px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('PUMP BELLOWS', baseX + 2, handleY + 4);

  // Vessel Firebox Temperature Readout on base of press
  ctx.fillStyle = PALETTE.amberGlass;
  ctx.font = '700 12px "Georgia", serif';
  ctx.fillText(
    `FIREBOX: ${Math.round(state.vesselTempC)}°C`,
    CRUCIBLE_CENTER_X,
    598
  );

  ctx.restore();
}

function drawBourdonGaugeAndPurityDrum(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  ctx.save();

  // Housing panel
  ctx.fillStyle = '#241b16';
  ctx.strokeStyle = PALETTE.brassBurnished;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(910, 22, 344, 206, 8);
  ctx.fill();
  ctx.stroke();

  // 1. Round Glass-Faced Brass Bourdon Pressure Gauge (center: 1002, 122)
  const gx = 1002;
  const gy = 122;
  const gr = 68;

  ctx.fillStyle = PALETTE.parchment;
  ctx.strokeStyle = PALETTE.brassBurnished;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(gx, gy, gr, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Crimson danger zone arc (7.0..10.0 Bar)
  const startAngle = Math.PI * 0.75;
  const sweepAngle = Math.PI * 1.5;
  ctx.strokeStyle = PALETTE.cinnabar;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(
    gx,
    gy,
    gr - 10,
    startAngle + sweepAngle * 0.7,
    startAngle + sweepAngle
  );
  ctx.stroke();

  // Gauge ticks
  ctx.strokeStyle = PALETTE.parchmentInk;
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 10; i++) {
    const a = startAngle + (i / 10) * sweepAngle;
    ctx.beginPath();
    ctx.moveTo(gx + Math.cos(a) * (gr - 16), gy + Math.sin(a) * (gr - 16));
    ctx.lineTo(gx + Math.cos(a) * (gr - 6), gy + Math.sin(a) * (gr - 6));
    ctx.stroke();
  }

  ctx.fillStyle = PALETTE.parchmentInk;
  ctx.font = '700 10px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOURDON BAR', gx, gy + 26);
  ctx.font = '700 13px "Georgia", serif';
  ctx.fillText(`${state.vesselPressureBar.toFixed(1)} BAR`, gx, gy + 44);

  // Spring-damper Brass Needle
  const needleAngle =
    startAngle + Math.min(1.08, Math.max(-0.04, state.gaugeNeedleSpring.position)) * sweepAngle;
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(needleAngle);
  ctx.strokeStyle = state.vesselPressureBar > 7.0 ? PALETTE.cinnabar : PALETTE.parchmentInk;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(gr - 14, 0);
  ctx.stroke();
  ctx.fillStyle = PALETTE.brassBurnished;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Mechanical Purity Yield Flip-Drum (Right side of gauge housing: 1164, 122)
  const dx = 1092;
  const dy = 44;
  const dw = 146;
  const dh = 160;
  ctx.fillStyle = '#1a1310';
  ctx.strokeStyle = PALETTE.brassMid;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(dx, dy, dw, dh, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.brassHighlight;
  ctx.font = '700 10px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('PURITY MULTIPLIER', dx + dw * 0.5, dy + 22);

  const loopMult = state.activeLoopOrder >= 4 ? 5 : state.activeLoopOrder === 3 ? 3 : 1;
  const totalMult = +(state.purityMultiplier * loopMult).toFixed(2);

  ctx.fillStyle = loopMult > 1 ? PALETTE.verdigrisBright : PALETTE.amberGlass;
  ctx.font = '700 26px "Georgia", serif';
  ctx.fillText(`×${totalMult}`, dx + dw * 0.5, dy + 58);

  // Geometric Aether Loop Indicator
  const loopLabel =
    state.activeLoopOrder >= 4
      ? '◇ QUAD LOOP ×5!'
      : state.activeLoopOrder === 3
        ? '△ TRIANGLE LOOP ×3!'
        : 'NO AETHER LOOP';
  ctx.fillStyle = state.activeLoopOrder >= 3 ? PALETTE.verdigrisBright : PALETTE.parchmentAged;
  ctx.font = '700 10px "Georgia", serif';
  ctx.fillText(loopLabel, dx + dw * 0.5, dy + 86);

  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '700 11px "Georgia", serif';
  ctx.fillText(
    `POT ESSENCE: ${state.rawPotValue.toFixed(1)}`,
    dx + dw * 0.5,
    dy + 116
  );
  ctx.fillStyle = PALETTE.brassBurnished;
  ctx.fillText(
    `MINTED COINS: ${state.mintedCoins}`,
    dx + dw * 0.5,
    dy + 140
  );

  ctx.restore();
}

function drawDischargeAndAssayScales(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  ctx.save();

  ctx.fillStyle = '#241b16';
  ctx.strokeStyle = PALETTE.brassMid;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(910, 242, 344, 232, 8);
  ctx.fill();
  ctx.stroke();

  // 1. Heavy Brass Discharge Lever on Left Side of Panel (x = 956, slot y = 278..418)
  const slotX = 958;
  ctx.strokeStyle = '#120d0a';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(slotX, 282);
  ctx.lineTo(slotX, 422);
  ctx.stroke();

  const handleY = 290 + state.dischargeSpring.position * 115;
  ctx.fillStyle = PALETTE.brassBurnished;
  ctx.strokeStyle = PALETTE.brassHighlight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(slotX - 36, handleY - 18, 72, 36, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.walnutDark;
  ctx.font = '700 9.5px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('DISCHARGE', slotX, handleY - 2);
  ctx.fillText('PULL DOWN', slotX, handleY + 10);

  // 2. Twin-Pan Assay Balance Scale (Pivot at 1125, 292)
  ctx.strokeStyle = PALETTE.brassBurnished;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(SCALE_PIVOT_X, 452);
  ctx.lineTo(SCALE_PIVOT_X, SCALE_PIVOT_Y);
  ctx.stroke();

  // Oscillating Balance Beam
  ctx.save();
  ctx.translate(SCALE_PIVOT_X, SCALE_PIVOT_Y);
  ctx.rotate(state.scaleBeamSpring.position);
  ctx.strokeStyle = PALETTE.brassHighlight;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-72, 0);
  ctx.lineTo(72, 0);
  ctx.stroke();
  ctx.restore();

  // Left Coin-Receiving Brass Pan (obeys scalePanSpring Hooke's law)
  const leftPanY = SCALE_PAN_BASE_Y + state.scalePanSpring.position;
  ctx.strokeStyle = 'rgba(212, 155, 53, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(SCALE_LEFT_PAN_X, SCALE_PIVOT_Y);
  ctx.lineTo(SCALE_LEFT_PAN_X - 28, leftPanY);
  ctx.moveTo(SCALE_LEFT_PAN_X, SCALE_PIVOT_Y);
  ctx.lineTo(SCALE_LEFT_PAN_X + 28, leftPanY);
  ctx.stroke();

  ctx.fillStyle = PALETTE.brassBurnished;
  ctx.beginPath();
  ctx.ellipse(SCALE_LEFT_PAN_X, leftPanY, 34, 8, 0, 0, Math.PI);
  ctx.fill();

  // Right Counterweight Brass Pan
  const rightPanY = SCALE_PAN_BASE_Y - state.scalePanSpring.position * 0.65;
  ctx.beginPath();
  ctx.moveTo(SCALE_RIGHT_PAN_X, SCALE_PIVOT_Y);
  ctx.lineTo(SCALE_RIGHT_PAN_X - 24, rightPanY);
  ctx.moveTo(SCALE_RIGHT_PAN_X, SCALE_PIVOT_Y);
  ctx.lineTo(SCALE_RIGHT_PAN_X + 24, rightPanY);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(SCALE_RIGHT_PAN_X, rightPanY, 28, 7, 0, 0, Math.PI);
  ctx.fill();

  // Minted Brass Coin-Weights stacked/falling onto Left Assay Pan
  for (const coin of state.scaleCoins) {
    ctx.fillStyle = PALETTE.amberGlass;
    ctx.strokeStyle = PALETTE.brassDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(coin.x, coin.y, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = PALETTE.parchmentAged;
  ctx.font = '700 10px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('ASSAY BALANCE SCALE', SCALE_PIVOT_X, 264);

  ctx.restore();
}

function drawWorkbenchAttachmentSockets(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  ctx.save();

  ctx.fillStyle = '#241b16';
  ctx.strokeStyle = PALETTE.brassMid;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(910, 488, 344, 206, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.brassHighlight;
  ctx.font = '700 11px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText('WORKBENCH ATTACHMENTS (CLICK TO BOLT / OPERATE)', 1082, 508);

  for (const att of state.attachments) {
    const sx = att.socketX;
    const sy = att.socketY;
    const canAfford = !att.unlocked && state.mintedCoins >= att.cost;

    ctx.fillStyle = att.unlocked
      ? '#2f3e39'
      : canAfford
        ? '#3b2c1a'
        : '#1b1411';
    ctx.strokeStyle = att.unlocked
      ? PALETTE.verdigrisBright
      : canAfford
        ? PALETTE.amberGlass
        : PALETTE.brassDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sx - 72, sy - 32, 144, 68, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = att.unlocked ? PALETTE.verdigrisBright : PALETTE.parchment;
    ctx.font = '700 10.5px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText(att.shortLabel, sx, sy - 12);

    ctx.fillStyle = att.unlocked ? PALETTE.parchment : PALETTE.amberGlass;
    ctx.font = '700 10px "Georgia", serif';
    ctx.fillText(
      att.unlocked ? 'BOLTED • CLICK TO WORK' : `BOLT FOR ${att.cost} COINS`,
      sx,
      sy + 6
    );

    ctx.fillStyle = PALETTE.parchmentAged;
    ctx.font = 'italic 8.5px "Georgia", serif';
    ctx.fillText(att.description.slice(0, 30), sx, sy + 23);
  }

  ctx.restore();
}

function drawCursorHandTether(
  ctx: CanvasRenderingContext2D,
  state: CruciblePressState
): void {
  if (!state.hand.isDown || state.hand.dragKind !== 'bead') return;
  const bead = state.beads.find((b) => b.id === state.hand.draggedBeadId);
  if (!bead) return;

  ctx.save();
  // Draw damped physical spring coils between cursor hand and dragged bead
  ctx.strokeStyle = PALETTE.brassHighlight;
  ctx.lineWidth = 2.2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(state.hand.x, state.hand.y);
  ctx.lineTo(bead.x, bead.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Brass caliper ring around cursor hand
  ctx.strokeStyle = PALETTE.amberGlass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(state.hand.x, state.hand.y, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
