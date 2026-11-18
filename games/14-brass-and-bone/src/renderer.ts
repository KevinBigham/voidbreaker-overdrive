import {
  DRAWER_RECT,
  INK_PAD_RECT,
  LEDGER_RECT,
  OSCILLOGRAPH_RECT,
  SCALE_BEAM_HALF_LEN,
  SCALE_PIVOT_X,
  SCALE_PIVOT_Y,
  STICKY_NOTE_RECT,
  WORKBENCH_HEIGHT,
  WORKBENCH_WIDTH,
  type BrassBoneSimulation,
} from './simulation';
import type {
  ArtifactSpec,
  DeskPhysicalObject,
  EndingId,
  HallmarkStyle,
  ResonanceSignature,
} from './types';

const ENDING_TITLES: Record<EndingId, { title: string; subtitle: string; desc: string }> = {
  crown_assessor: {
    title: 'LORD HIGH ASSESSOR OF THE CROWN',
    subtitle: 'Order, Precision, and Unwavering Royal Fealty',
    desc: 'Your incorruptible eye purged counterfeit bullion, infernal bombs, and occult contagions from the Royal Port. The Exchequer names you Grand Master of the Mint.',
  },
  syndicate_kingpin: {
    title: 'ARCHITECT OF THE SHADOW SYNDICATE',
    subtitle: 'The Smuggler’s Drawer Funded the Midnight Uprising',
    desc: 'By slipping ciphered compasses and the Treasury Master-Ingot beneath your counter, you bankrolled the dockworkers’ rebellion and bought passage to the Free Isles.',
  },
  guardian_of_exiles: {
    title: 'SECRET GUARDIAN OF THE EXILES',
    subtitle: 'Mercy Weighed Heavier Than Brass or Crown Law',
    desc: 'You risked the Inquisitor’s wrath to stamp Marta and Little Clara’s passage while shielding the port from genuine threats. A quiet letter from Lisbon thanks you for their lives.',
  },
  newgate_prison: {
    title: 'CHAINS OF NEWGATE DEBTOR’S PRISON',
    subtitle: 'Crushed Between the Inquisition and Unpaid Rent',
    desc: 'Too many missed forgeries or Auditor citations brought the Iron Watch through your counter door at dawn. Your brass scale now belongs to the Crown.',
  },
};

export class BrassBoneRenderer {
  private raindrops: Array<{ x: number; y: number; len: number; speed: number }> = [];

  constructor() {
    for (let i = 0; i < 68; i++) {
      this.raindrops.push({
        x: ((i * 97) % WORKBENCH_WIDTH),
        y: ((i * 53) % 180),
        len: 12 + (i % 14),
        speed: 220 + (i % 5) * 45,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D, sim: BrassBoneSimulation): void {
    const { state } = sim;
    const t = state.timeElapsed;

    ctx.save();
    // Apply directional camera jolt from heavy stamp slam
    ctx.translate(state.cameraShakeX, state.cameraShakeY);

    // 1. Draw Upper Rain-Streaked Counter Window & Claimant
    this.drawCounterWindow(ctx, sim, t);

    // 2. Draw Dark Mahogany Workbench & Baize Green Velvet Mat
    this.drawMahoganyWorkbench(ctx, sim, t);

    // 3. Draw Left Brass Balance Scale & Counterweight Tray
    this.drawBrassScale(ctx, sim);

    // 4. Draw Bottom-Left Flip-Page Reference Ledger
    this.drawReferenceLedger(ctx, sim);

    // 5. Draw Top-Right Brass Oscillograph & Tuning Fork Dock
    this.drawOscillograph(ctx, sim, t);

    // 6. Draw Middle-Right Dual Ink Pad & Tool Cradles
    this.drawInkPadAndCradles(ctx, sim);

    // 7. Draw Bottom Hidden Smuggler's Drawer (slides out when dragging artifact down)
    this.drawSmugglersDrawer(ctx, sim);

    // 8. Draw Night 1 Pinned 6-Word Sticky Note ("Weigh it. Loupe the seal. Stamp.")
    if (state.night === 1 && !state.stickyNoteDismissed && state.phase === 'inspecting') {
      this.drawStickyNote(ctx);
    }

    // 9. Draw All Physical Draggable Objects on Desk (except Loupe/UV which render on top with zoom clip)
    this.drawPhysicalDeskObjects(ctx, sim, t);

    // 10. Draw Jeweler's Magnifying Loupe & UV Aether Lens with 2.5x Clipped Internal Layer!
    this.drawMagnifyingLenses(ctx, sim, t);

    // 11. Draw Post-Night Honest Balance Sheet Ledger (if at end of night or campaign ending)
    if (state.phase === 'night_summary' || state.phase === 'campaign_ending') {
      this.drawPostNightLedger(ctx, sim);
    }

    // 12. Warm Flickering Oil Lamp & Candlelight Vignette
    this.drawCandlelightVignette(ctx, sim, t);

    ctx.restore();
  }

  private drawCounterWindow(ctx: CanvasRenderingContext2D, sim: BrassBoneSimulation, t: number): void {
    const { state } = sim;

    // Night sky backdrop outside window
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 180);
    skyGrad.addColorStop(0, '#090d16');
    skyGrad.addColorStop(1, '#162032');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, WORKBENCH_WIDTH, 180);

    // Distant 1890s port city gaslamps & silhouettes
    ctx.fillStyle = '#0c1320';
    ctx.fillRect(320, 68, 70, 112);
    ctx.fillRect(395, 45, 55, 135);
    ctx.fillRect(880, 52, 85, 128);
    ctx.fillRect(975, 78, 65, 102);

    // Warm distant harbor lantern glows
    for (const lx of [350, 430, 910, 1015]) {
      const glow = ctx.createRadialGradient(lx, 105, 2, lx, 105, 26);
      glow.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, 105, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated rain streaks on the glass
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.24)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const drop of this.raindrops) {
      const dy = (drop.y + t * drop.speed) % 178;
      const dx = (drop.x - (dy * 0.18) + WORKBENCH_WIDTH) % WORKBENCH_WIDTH;
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx - 3, dy + drop.len);
    }
    ctx.stroke();

    // Claimant Silhouette behind the counter glass
    this.drawClaimantSilhouette(ctx, state.activeCase.silhouetteType, 415, 175, t);

    // Brass security teller bars across window
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4;
    for (let bx = 310; bx <= 1060; bx += 75) {
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx, 176);
      ctx.stroke();
    }

    // Left Mahogany Wall Plaque: Night, Sovereign Coins, and Suspicion Wax Seals
    ctx.fillStyle = '#1c1008';
    ctx.fillRect(0, 0, 305, 178);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 280, 154);

    // Brass Header Plate
    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 13px "Georgia", serif';
    ctx.fillText('THE WEIGHT OF BRASS & BONE', 24, 34);

    const romanNights = ['I', 'II', 'III', 'IV', 'V'];
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 16px "Georgia", serif';
    ctx.fillText(
      `NIGHT ${romanNights[state.night - 1] ?? state.night}  •  CLAIMANT ${state.caseIndexInNight + 1}/3`,
      24,
      58
    );

    // Physical Sovereign Purse Stack readout
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(38, 88, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#1c1008';
    ctx.font = 'bold 11px "Georgia", serif';
    ctx.fillText('£', 34, 92);

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 15px "Georgia", serif';
    ctx.fillText(`PURSE: ${state.sovereigns} SOVEREIGNS`, 58, 93);
    ctx.fillStyle = '#d6d3d1';
    ctx.font = '11px "Georgia", serif';
    ctx.fillText(`Nightly Rent & Oil: ~${14 + state.night * 2 + 5}g`, 58, 110);

    // Suspicion Wax Seals (0..5)
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 12px "Georgia", serif';
    ctx.fillText('CROWN SUSPICION:', 24, 136);
    for (let i = 0; i < 5; i++) {
      const sx = 165 + i * 24;
      const sy = 132;
      ctx.beginPath();
      ctx.arc(sx, sy, 8.5, 0, Math.PI * 2);
      if (i < state.suspicion) {
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.strokeStyle = '#fca5a5';
      } else {
        ctx.fillStyle = '#291811';
        ctx.fill();
        ctx.strokeStyle = '#78350f';
      }
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = '#a8a29e';
    ctx.font = '11px "Georgia", serif';
    ctx.fillText('Drag tools with mouse • Flip Ledger (Bottom-Left)', 24, 157);

    // Typewriter Speech Bubble in Upper Window Pane (x: 495..1045, y: 18..154)
    this.drawSpeechBubble(ctx, sim);

    // Right Mahogany Pillar with Brass Patience Escapement Watch
    ctx.fillStyle = '#1c1008';
    ctx.fillRect(1065, 0, 215, 178);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.strokeRect(1077, 12, 190, 154);

    this.drawPatienceClock(ctx, sim, 1172, 82);

    // Heavy Mahogany & Brass Window Sill Bar (`y: 172..186`)
    const sillGrad = ctx.createLinearGradient(0, 170, 0, 188);
    sillGrad.addColorStop(0, '#451a03');
    sillGrad.addColorStop(0.5, '#b45309');
    sillGrad.addColorStop(1, '#1c1008');
    ctx.fillStyle = sillGrad;
    ctx.fillRect(0, 172, WORKBENCH_WIDTH, 14);

    // Brass Pass-Through Slot in the center of the window sill
    ctx.fillStyle = '#090604';
    ctx.fillRect(480, 173, 360, 11);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(480, 173, 360, 11);
  }

  private drawClaimantSilhouette(
    ctx: CanvasRenderingContext2D,
    type: string,
    cx: number,
    bottomY: number,
    t: number
  ): void {
    const breathe = Math.sin(t * 2.2) * 2;
    ctx.save();
    ctx.translate(cx, bottomY);

    // Warm backlight halo behind silhouette
    const halo = ctx.createRadialGradient(0, -75, 10, 0, -75, 78);
    halo.addColorStop(0, 'rgba(217, 119, 6, 0.28)');
    halo.addColorStop(1, 'rgba(217, 119, 6, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, -75, 78, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#090c12';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1.5;

    // Shoulders / Coat
    ctx.beginPath();
    ctx.moveTo(-58, 0);
    ctx.quadraticCurveTo(-52, -62 + breathe, -22, -72 + breathe);
    ctx.lineTo(22, -72 + breathe);
    ctx.quadraticCurveTo(52, -62 + breathe, 58, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(0, -98 + breathe, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Silhouette headgear by archetype
    if (type === 'inquisitor') {
      // Tall Inquisitor Stove-Pipe Hat
      ctx.fillRect(-26, -116 + breathe, 52, 6);
      ctx.fillRect(-18, -152 + breathe, 36, 36);
      // Glowing monocle lens
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(8, -98 + breathe, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'aristocrat') {
      // Wide brimmed Victorian hat with plume
      ctx.beginPath();
      ctx.ellipse(0, -116 + breathe, 34, 7, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(16, -126 + breathe, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'mother') {
      // Hooded shawl + small child silhouette beside her
      ctx.beginPath();
      ctx.arc(0, -98 + breathe, 26, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(38, -64 + breathe, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'apothecary') {
      // Spectacles glowing faintly
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(-7, -98 + breathe, 4, 0, Math.PI * 2);
      ctx.arc(7, -98 + breathe, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'syndicate') {
      // Deep cowl hood
      ctx.beginPath();
      ctx.moveTo(-28, -85 + breathe);
      ctx.lineTo(0, -132 + breathe);
      ctx.lineTo(28, -85 + breathe);
      ctx.closePath();
      ctx.fill();
    } else {
      // Flat cap / bowler
      ctx.beginPath();
      ctx.ellipse(2, -114 + breathe, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawSpeechBubble(ctx: CanvasRenderingContext2D, sim: BrassBoneSimulation): void {
    const { state } = sim;
    const c = state.activeCase;
    const bx = 490;
    const by = 18;
    const bw = 555;
    const bh = 136;

    // Aged parchment speech card
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    // Inner decorative border
    ctx.strokeStyle = 'rgba(146, 64, 14, 0.35)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, bx + 5, by + 5, bw - 10, bh - 10, 5);
    ctx.stroke();

    // Claimant Name & Role Header
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 14px "Georgia", serif';
    ctx.fillText(`${c.claimantName.toUpperCase()}  —  ${c.claimantRole}`, bx + 16, by + 26);

    ctx.strokeStyle = 'rgba(146, 64, 14, 0.3)';
    ctx.beginPath();
    ctx.moveTo(bx + 16, by + 33);
    ctx.lineTo(bx + bw - 16, by + 33);
    ctx.stroke();

    // Typewriter Dialogue Text (1-2 atmospheric sentences)
    const visibleText = c.dialogue.slice(0, Math.floor(state.typewriterChars));
    ctx.fillStyle = '#1c1008';
    ctx.font = 'italic 15px "Georgia", serif';
    this.wrapText(ctx, visibleText, bx + 16, by + 58, bw - 32, 22);

    // Subtle action prompt along bottom of speech bubble
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(
      `CLAIMED: ${c.artifact.name.toUpperCase()} (${c.artifact.claimedWeightG}g)  •  PAYOUT: ${c.artifact.basePayout}g`,
      bx + 16,
      by + bh - 12
    );
  }

  private drawPatienceClock(
    ctx: CanvasRenderingContext2D,
    sim: BrassBoneSimulation,
    cx: number,
    cy: number
  ): void {
    const { state } = sim;
    const ratio = Math.max(0, state.claimantTimer / Math.max(1, state.activeCase.patienceSeconds));

    // Brass Pocket-Watch Bezel
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fillStyle = '#b45309';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fde68a';
    ctx.stroke();

    // Inner Watch Face
    ctx.beginPath();
    ctx.arc(cx, cy, 35, 0, Math.PI * 2);
    ctx.fillStyle = ratio < 0.28 ? '#450a0a' : '#fef3c7';
    ctx.fill();

    // Depleting sector
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 32, -Math.PI * 0.5, -Math.PI * 0.5 + ratio * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = ratio < 0.28 ? 'rgba(220, 38, 38, 0.45)' : 'rgba(217, 119, 6, 0.28)';
    ctx.fill();

    // Watch Tick Marks
    ctx.strokeStyle = ratio < 0.28 ? '#fca5a5' : '#451a03';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
      ctx.lineTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
      ctx.stroke();
    }

    // Escapement Hand
    const handAngle = -Math.PI * 0.5 + (1 - ratio) * Math.PI * 2;
    ctx.strokeStyle = ratio < 0.28 ? '#ef4444' : '#1c1008';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(handAngle) * 26, cy + Math.sin(handAngle) * 26);
    ctx.stroke();

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 11px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText(`PATIENCE: ${Math.ceil(state.claimantTimer)}s`, cx, cy + 62);
    ctx.textAlign = 'left';
  }

  private drawMahoganyWorkbench(
    ctx: CanvasRenderingContext2D,
    sim: BrassBoneSimulation,
    t: number
  ): void {
    void sim;
    void t;
    // Rich dark mahogany desk surface (#1c1008)
    const woodGrad = ctx.createLinearGradient(0, 186, 0, WORKBENCH_HEIGHT);
    woodGrad.addColorStop(0, '#27150a');
    woodGrad.addColorStop(0.5, '#1c1008');
    woodGrad.addColorStop(1, '#120904');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, 186, WORKBENCH_WIDTH, WORKBENCH_HEIGHT - 186);

    // Subtle mahogany wood grain planks
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.35)';
    ctx.lineWidth = 1;
    for (let y = 220; y < WORKBENCH_HEIGHT; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORKBENCH_WIDTH, y);
      ctx.stroke();
    }

    // Center Baize Green Velvet Appraisal Mat (#064e3b)
    const matX = 442;
    const matY = 202;
    const matW = 436;
    const matH = 456;

    // Mahogany recess border
    ctx.fillStyle = '#0f0703';
    this.roundRect(ctx, matX - 6, matY - 6, matW + 12, matH + 12, 10);
    ctx.fill();

    // Deep Baize Green Velvet (#064e3b)
    const baizeGrad = ctx.createRadialGradient(
      matX + matW * 0.5,
      matY + matH * 0.45,
      20,
      matX + matW * 0.5,
      matY + matH * 0.45,
      290
    );
    baizeGrad.addColorStop(0, '#065f46');
    baizeGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = baizeGrad;
    this.roundRect(ctx, matX, matY, matW, matH, 8);
    ctx.fill();

    // Gold-leaf inner border on the velvet mat
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    this.roundRect(ctx, matX + 10, matY + 10, matW - 20, matH - 20, 5);
    ctx.stroke();

    // Subtle watermark on the velvet mat
    ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
    ctx.font = 'bold 12px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROYAL & OCCULT ASSAY BENCH • EST. 1891', matX + matW * 0.5, matY + 30);
    ctx.textAlign = 'left';
  }

  private drawBrassScale(ctx: CanvasRenderingContext2D, sim: BrassBoneSimulation): void {
    const { state } = sim;
    const pans = sim.getScalePanPositions(state.scaleAngle);

    // Scale Base & Counterweight Tray (`x: 42..412, y: 432..498`)
    ctx.fillStyle = '#291509';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, 44, 434, 366, 64, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('BRASS COUNTERWEIGHT TRAY (DRAG TO LEFT PAN)', SCALE_PIVOT_X, 426);

    // Central Vertical Brass Pillar
    const pillarGrad = ctx.createLinearGradient(SCALE_PIVOT_X - 10, 0, SCALE_PIVOT_X + 10, 0);
    pillarGrad.addColorStop(0, '#78350f');
    pillarGrad.addColorStop(0.5, '#fbbf24');
    pillarGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = pillarGrad;
    ctx.fillRect(SCALE_PIVOT_X - 9, SCALE_PIVOT_Y, 18, 182);

    // Stepped Brass Pedestal Foot
    ctx.fillStyle = '#b45309';
    ctx.fillRect(SCALE_PIVOT_X - 36, 418, 72, 18);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(SCALE_PIVOT_X - 36, 418, 72, 18);

    // Equilibrium Dial at top of pillar
    ctx.beginPath();
    ctx.arc(SCALE_PIVOT_X, SCALE_PIVOT_Y, 26, Math.PI, 0);
    ctx.fillStyle = '#1c1008';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer Needle indicating balance tilt
    const needleAngle = -Math.PI * 0.5 + state.scaleAngle * 2.1;
    ctx.strokeStyle = Math.abs(state.scaleAngle) < 0.03 ? '#34d399' : '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(SCALE_PIVOT_X, SCALE_PIVOT_Y);
    ctx.lineTo(
      SCALE_PIVOT_X + Math.cos(needleAngle) * 23,
      SCALE_PIVOT_Y + Math.sin(needleAngle) * 23
    );
    ctx.stroke();

    // Articulated Balance Beam (Rotated by state.scaleAngle)
    ctx.save();
    ctx.translate(SCALE_PIVOT_X, SCALE_PIVOT_Y);
    ctx.rotate(state.scaleAngle);

    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    this.roundRect(ctx, -SCALE_BEAM_HALF_LEN - 8, -6, (SCALE_BEAM_HALF_LEN + 8) * 2, 12, 5);
    ctx.fill();
    ctx.stroke();

    // Center fulcrum boss
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#fef3c7';
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Left Pan & Right Pan Suspension Chains + Brass Dishes
    const drawPan = (
      beamX: number,
      beamY: number,
      panX: number,
      panY: number,
      label: string,
      grams: number,
      showGrams: boolean
    ) => {
      // Two brass chains from beam tip to pan rim
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(beamX, beamY);
      ctx.lineTo(panX - 44, panY);
      ctx.moveTo(beamX, beamY);
      ctx.lineTo(panX + 44, panY);
      ctx.stroke();

      // Brass Pan Dish
      ctx.beginPath();
      ctx.ellipse(panX, panY + 4, 52, 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#92400e';
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillText(label, panX, panY + 28);
      if (showGrams) {
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 12px "Georgia", serif';
        ctx.fillText(`${grams}g`, panX, panY + 10);
      }
    };

    const cosA = Math.cos(state.scaleAngle);
    const sinA = Math.sin(state.scaleAngle);
    drawPan(
      SCALE_PIVOT_X - cosA * SCALE_BEAM_HALF_LEN,
      SCALE_PIVOT_Y - sinA * SCALE_BEAM_HALF_LEN,
      pans.leftX,
      pans.leftY,
      'WEIGHTS PAN',
      state.leftPanGrams,
      true
    );
    drawPan(
      SCALE_PIVOT_X + cosA * SCALE_BEAM_HALF_LEN,
      SCALE_PIVOT_Y + sinA * SCALE_BEAM_HALF_LEN,
      pans.rightX,
      pans.rightY,
      'RELIC PAN',
      state.rightPanGrams,
      false
    );

    // Live Balance Status Plaque on the Pillar Base
    let statusText = 'DROP RELIC ON RIGHT PAN';
    let statusColor = '#fde68a';
    if (state.rightPanGrams > 0 || state.leftPanGrams > 0) {
      const diff = state.rightPanGrams - state.leftPanGrams;
      if (diff === 0 && state.rightPanGrams > 0) {
        statusText = `BALANCED AT ${state.leftPanGrams}g!`;
        statusColor = '#34d399';
      } else if (diff > 0) {
        statusText = `RELIC HEAVIER (WEIGHTS: ${state.leftPanGrams}g)`;
        statusColor = '#fbbf24';
      } else {
        statusText = `WEIGHTS HEAVIER (${state.leftPanGrams}g)`;
        statusColor = '#f87171';
      }
    }
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(statusText, SCALE_PIVOT_X, 212);
    ctx.textAlign = 'left';
  }

  private drawReferenceLedger(ctx: CanvasRenderingContext2D, sim: BrassBoneSimulation): void {
    const { state } = sim;
    const { x, y, w, h } = LEDGER_RECT;

    // Top 3 Brass Index Tabs
    const tabLabels = ['I. HALLMARKS', 'II. WEIGHT & TONE', 'III. CONTRABAND'];
    const tabW = w / 3;
    for (let i = 0; i < 3; i++) {
      const tx = x + i * tabW;
      const isSelected = state.ledgerPage === i;
      ctx.fillStyle = isSelected ? '#d97706' : '#451a03';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, tx + 2, y - 22, tabW - 4, 24, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#1c1008' : '#fde68a';
      ctx.font = 'bold 10px "Georgia", serif';
      ctx.textAlign = 'center';
      ctx.fillText(tabLabels[i], tx + tabW * 0.5, y - 7);
    }
    ctx.textAlign = 'left';

    // Leather Book Cover
    ctx.fillStyle = '#3b110b';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // Open Left & Right Parchment Pages
    const pageMargin = 8;
    ctx.fillStyle = '#fef3c7';
    this.roundRect(ctx, x + pageMargin, y + pageMargin, w - pageMargin * 2, h - pageMargin * 2, 5);
    ctx.fill();

    // Center Spine Crease
    const spineX = x + w * 0.5;
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(spineX, y + pageMargin);
    ctx.lineTo(spineX, y + h - pageMargin);
    ctx.stroke();

    // Render content based on active page (0, 1, or 2)
    ctx.fillStyle = '#451a03';
    if (state.ledgerPage === 0) {
      // PAGE 1: VALID ROYAL HALLMARKS (Under 2.5x Loupe)
      ctx.font = 'bold 12px "Georgia", serif';
      ctx.fillText('ROYAL HALLMARKS', x + 18, y + 28);
      ctx.fillText('FORGERY SIGNS', spineX + 12, y + 28);

      ctx.font = '11px "Georgia", serif';
      // Authentic 5-Spire Crown
      this.drawMiniCrownIcon(ctx, x + 36, y + 58, 5, false);
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 11px "Georgia", serif';
      ctx.fillText('5-Spire Crown (VALID)', x + 58, y + 54);
      ctx.fillStyle = '#451a03';
      ctx.font = '10px "Georgia", serif';
      ctx.fillText('Coins, Ingots, Lockets,', x + 58, y + 68);
      ctx.fillText('and Sanctified Reliquaries.', x + 58, y + 80);

      // Authentic Admiralty Anchor
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 11px "Georgia", serif';
      ctx.fillText('Admiralty Anchor (VALID)', x + 20, y + 108);
      ctx.fillStyle = '#451a03';
      ctx.font = '10px "Georgia", serif';
      ctx.fillText('Required on all Admiralty', x + 20, y + 122);
      ctx.fillText('Brass Compasses.', x + 20, y + 134);

      // Authentic High Crown Seal
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 11px "Georgia", serif';
      ctx.fillText('High Crown Seal (VALID)', x + 20, y + 160);
      ctx.fillStyle = '#451a03';
      ctx.font = '10px "Georgia", serif';
      ctx.fillText('Required on Sealed Charters.', x + 20, y + 174);

      // Right Page: Forgery Signs
      this.drawMiniCrownIcon(ctx, spineX + 28, y + 58, 5, true);
      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 11px "Georgia", serif';
      ctx.fillText('Inverted Crown (FAKE)', spineX + 48, y + 54);
      ctx.fillStyle = '#451a03';
      ctx.font = '10px "Georgia", serif';
      ctx.fillText('Upside-down crown or file', spineX + 48, y + 68);
      ctx.fillText('scratches under the Loupe.', spineX + 48, y + 80);

      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 11px "Georgia", serif';
      ctx.fillText('3-Spire / Hand-Inked', spineX + 14, y + 112);
      ctx.fillStyle = '#451a03';
      ctx.font = '10px "Georgia", serif';
      ctx.fillText('Crude 3-point crown or', spineX + 14, y + 126);
      ctx.fillText('hand-drawn ink charter seal', spineX + 14, y + 138);
      ctx.fillText('-> CONFISCATE (RED STAMP).', spineX + 14, y + 152);
    } else if (state.ledgerPage === 1) {
      // PAGE 2: TRUE MATERIAL WEIGHTS & ACOUSTIC RESONANCE
      ctx.font = 'bold 12px "Georgia", serif';
      ctx.fillText('TRUE WEIGHTS (SCALE)', x + 18, y + 28);
      ctx.fillText('TUNING FORK TONE', spineX + 12, y + 28);

      const rowsLeft = [
        ['Gold Sovereign:', '30g'],
        ['Bullion Ingot:', '150g'],
        ['Brass Compass:', '80g'],
        ['Reliquary Casket:', '120g'],
        ['Cameo Locket:', '60g'],
        ['Transit Charter:', '10g'],
      ];
      ctx.font = '11px "Courier New", monospace';
      rowsLeft.forEach(([name, wt], idx) => {
        const ry = y + 52 + idx * 24;
        ctx.fillStyle = '#451a03';
        ctx.fillText(name, x + 18, ry);
        ctx.fillStyle = '#065f46';
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillText(wt, x + 148, ry);
        ctx.font = '11px "Courier New", monospace';
      });

      const rowsRight = [
        ['Sovereign/Ingot:', 'PURE GOLD'],
        ['Brass Compass:', 'BRASS HUM'],
        ['Reliquary/Locket:', 'SILVER CHIME'],
        ['Charter Parchment:', 'CRISP PAPER'],
        ['Hollow Lead Fake:', '95Hz THUD!'],
        ['Hidden Bomb:', 'TICKING!'],
      ];
      rowsRight.forEach(([name, tone], idx) => {
        const ry = y + 52 + idx * 24;
        ctx.fillStyle = '#451a03';
        ctx.font = '10px "Georgia", serif';
        ctx.fillText(name, spineX + 10, ry);
        ctx.fillStyle = idx >= 4 ? '#991b1b' : '#065f46';
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.fillText(tone, spineX + 106, ry);
      });
    } else {
      // PAGE 3: TONIGHT'S CONTRABAND & WANTED NOTICE
      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 12px "Georgia", serif';
      ctx.fillText('CONTRABAND & CURSES', x + 18, y + 28);
      ctx.fillText('CROWN NOTICES', spineX + 12, y + 28);

      ctx.fillStyle = '#451a03';
      ctx.font = '10.5px "Georgia", serif';
      ctx.fillText('• HOLLOW LEAD & BOMBS:', x + 18, y + 50);
      ctx.fillText('  Tap relics with Tuning Fork.', x + 18, y + 64);
      ctx.fillText('  Seize 95Hz Lead or Ticking!', x + 18, y + 78);

      ctx.fillText('• UV AETHER LENS (NIGHT 4+):', x + 18, y + 102);
      ctx.fillText('  Seize Crimson Plague Veins.', x + 18, y + 116);
      ctx.fillText('  Syndicate Spider-Runes may', x + 18, y + 130);
      ctx.fillText('  be Seized OR Fenced below.', x + 18, y + 144);

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 10.5px "Georgia", serif';
      ctx.fillText('• AUDITOR TRAP WARNING:', spineX + 12, y + 50);
      ctx.fillStyle = '#451a03';
      ctx.font = '10px "Georgia", serif';
      ctx.fillText('  Crown Auditors offer bribes', spineX + 12, y + 64);
      ctx.fillText('  with underweight/3-spire', spineX + 12, y + 78);
      ctx.fillText('  ingots. SEIZE THEM!', spineX + 12, y + 92);

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 10.5px "Georgia", serif';
      ctx.fillText('• SMUGGLER’S DRAWER:', spineX + 12, y + 118);
      ctx.fillStyle = '#451a03';
      ctx.font = '10px "Georgia", serif';
      ctx.fillText('  Drag relic to bottom edge', spineX + 12, y + 132);
      ctx.fillText('  of desk for 2× Pay (+Susp).', spineX + 12, y + 146);
    }

    // Bottom corner page-turn prompts
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillText('◄ CLICK PAGE TO FLIP', x + 16, y + h - 14);
    ctx.textAlign = 'right';
    ctx.fillText(`PAGE ${state.ledgerPage + 1}/3 ►`, x + w - 16, y + h - 14);
    ctx.textAlign = 'left';
  }

  private drawOscillograph(ctx: CanvasRenderingContext2D, sim: BrassBoneSimulation, t: number): void {
    const { state } = sim;
    const { x, y, w, h } = OSCILLOGRAPH_RECT;

    // Brass & Bakelite Oscillograph Housing
    ctx.fillStyle = '#18100c';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    this.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();

    // Header Plaque
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('ACOUSTIC OSCILLOGRAPH', x + w * 0.5, y + 20);

    // Oscillograph Screen Window
    const sx = x + 14;
    const sy = y + 28;
    const sw = w - 28;
    const sh = 74;
    ctx.fillStyle = '#051e16';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    this.roundRect(ctx, sx, sy, sw, sh, 6);
    ctx.fill();
    ctx.stroke();

    // Grid lines
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy + sh * 0.5);
    ctx.lineTo(sx + sw, sy + sh * 0.5);
    ctx.stroke();

    // Waveform rendering based on state.lastTestedResonance
    const sig = state.lastTestedResonance;
    const amp = Math.max(0.12, state.oscillographActive);

    let waveColor = '#34d399';
    if (sig === 'hollow_lead' || sig === 'ticking_bomb' || sig === 'whisper_curse') {
      waveColor = '#f87171';
    }

    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let px = 0; px <= sw; px += 3) {
      const norm = px / sw;
      let wy = 0;
      if (!sig) {
        wy = Math.sin(norm * 8 + t * 2) * 2;
      } else if (sig === 'pure_gold') {
        wy = Math.sin(norm * 24 - t * 18) * 24 * amp + Math.sin(norm * 48 - t * 36) * 8 * amp;
      } else if (sig === 'brass_hum') {
        wy = Math.sin(norm * 14 - t * 12) * 22 * amp;
      } else if (sig === 'silver_chime') {
        wy = Math.sin(norm * 32 - t * 22) * 24 * amp;
      } else if (sig === 'hollow_lead') {
        // Rapidly dying low-frequency thud
        wy = Math.sin(norm * 6 - t * 5) * 18 * Math.exp(-norm * 3.5) * amp;
      } else if (sig === 'ticking_bomb') {
        // Sharp mechanical clockwork spikes!
        const pulse = Math.sin(norm * 38 - t * 30);
        wy = (pulse > 0.75 ? 28 : pulse < -0.75 ? -28 : (Math.random() - 0.5) * 8) * amp;
      } else if (sig === 'whisper_curse') {
        wy = (Math.sin(norm * 19 + t * 11) * Math.cos(norm * 31 - t * 17)) * 28 * amp;
      } else {
        wy = (Math.sin(norm * 45 + t * 14) * 6) * amp;
      }
      const plotY = sy + sh * 0.5 + wy;
      if (px === 0) ctx.moveTo(sx + px, plotY);
      else ctx.lineTo(sx + px, plotY);
    }
    ctx.stroke();

    // Vibrating Brass Needle on right edge of screen
    const needleY =
      sy +
      sh * 0.5 +
      (sig ? Math.sin(t * 34) * 18 * state.oscillographActive : 0);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + sw + 8, sy + sh * 0.5);
    ctx.lineTo(sx + sw - 12, needleY);
    ctx.stroke();

    // Resonance Readout Plate
    const labelMap: Record<ResonanceSignature, string> = {
      pure_gold: '880Hz PURE GOLD RING (CLEAN)',
      brass_hum: '440Hz BRASS HUM (CLEAN)',
      silver_chime: '1175Hz SILVER CHIME (CLEAN)',
      crisp_parchment: 'CRISP PARCHMENT (CLEAN)',
      hollow_lead: '95Hz DEAD LEAD CORE (FAKE!)',
      ticking_bomb: 'TICKING CLOCKWORK BOMB!',
      whisper_curse: 'DISSONANT CURSED SEAL!',
    };

    ctx.fillStyle = sig ? waveColor : '#a8a29e';
    ctx.font = 'bold 10.5px "Courier New", monospace';
    ctx.fillText(
      sig ? labelMap[sig] : 'TAP FORK ON RELIC TO TEST',
      x + w * 0.5,
      y + h - 18
    );
    ctx.textAlign = 'left';

    // Tuning Fork Velvet Cradle (`x: 905, y: 205..355`)
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.5)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 900, 205, 72, 150, 8);
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 9.5px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('TUNING', 936, 340);
    ctx.fillText('FORK', 936, 351);
    ctx.textAlign = 'left';
  }

  private drawInkPadAndCradles(ctx: CanvasRenderingContext2D, sim: BrassBoneSimulation): void {
    void sim;
    const { x, y, w, h } = INK_PAD_RECT;

    // Dual Brass Ink Pad Case
    ctx.fillStyle = '#27150a';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // Left Emerald Ink Well (Certify)
    ctx.fillStyle = '#065f46';
    this.roundRect(ctx, x + 10, y + 10, w * 0.5 - 14, h - 20, 5);
    ctx.fill();
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFY INK', x + w * 0.25, y + h * 0.5 + 4);

    // Right Crimson Ink Well (Seize)
    ctx.fillStyle = '#7f1d1d';
    this.roundRect(ctx, x + w * 0.5 + 4, y + 10, w * 0.5 - 14, h - 20, 5);
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('SEIZE INK', x + w * 0.75, y + h * 0.5 + 4);

    // Stamp & Lens Brass Resting Rings on the right side of the desk
    const drawCradle = (cx: number, cy: number, r: number, title: string, sub: string) => {
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(254, 243, 199, 0.65)';
      ctx.font = 'bold 10px "Georgia", serif';
      ctx.fillText(title, cx, cy + r + 14);
      ctx.font = '9px "Georgia", serif';
      ctx.fillText(sub, cx, cy + r + 25);
    };

    drawCradle(985, 515, 36, 'CERTIFY STAMP', '(Slam on Slip)');
    drawCradle(1155, 515, 36, 'SEIZE STAMP', '(Slam on Slip)');
    drawCradle(985, 652, 50, '2.5× LOUPE', '(Inspect Seal)');
    drawCradle(1155, 652, 50, 'UV AETHER LENS', '(Spot Curses)');
    ctx.textAlign = 'left';
  }

  private drawSmugglersDrawer(ctx: CanvasRenderingContext2D, sim: BrassBoneSimulation): void {
    const { state } = sim;
    const openPx = state.drawerOpenAmount * 62;
    const dx = DRAWER_RECT.x;
    const dy = DRAWER_RECT.y - openPx;
    const dw = DRAWER_RECT.w;
    const dh = DRAWER_RECT.h + openPx;

    // Hidden Under-Counter Smuggler's Drawer
    ctx.fillStyle = '#140a05';
    ctx.strokeStyle = state.drawerOpenAmount > 0.2 ? '#f59e0b' : '#78350f';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, dx, dy, dw, dh, 8);
    ctx.fill();
    ctx.stroke();

    // Velvet interior of the Smuggler's Drawer when pulled open
    if (state.drawerOpenAmount > 0.05) {
      ctx.fillStyle = '#31102f';
      this.roundRect(ctx, dx + 10, dy + 8, dw - 20, dh - 28, 5);
      ctx.fill();
    }

    // Brass Drawer Handle Pull
    ctx.fillStyle = '#d97706';
    this.roundRect(ctx, dx + dw * 0.5 - 48, dy + 12, 96, 12, 5);
    ctx.fill();

    ctx.fillStyle = state.drawerOpenAmount > 0.2 ? '#fde68a' : '#d97706';
    ctx.font = 'bold 11.5px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `SMUGGLER’S DRAWER — DROP RELIC TO FENCE (+${state.activeCase.artifact.fencePayout}g / +1 SUSP)`,
      dx + dw * 0.5,
      dy + 42
    );
    ctx.textAlign = 'left';
  }

  private drawStickyNote(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = STICKY_NOTE_RECT;
    ctx.save();
    ctx.translate(x + w * 0.5, y + h * 0.5);
    ctx.rotate(-0.04);

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(-w * 0.5 + 4, -h * 0.5 + 6, w, h);

    // Parchment note
    ctx.fillStyle = '#fde68a';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
    ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);

    // Brass Tack Pin at top center
    ctx.beginPath();
    ctx.arc(0, -h * 0.5 + 10, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.strokeStyle = '#fef3c7';
    ctx.stroke();

    // Mandatory 6-word Sticky Note text: "Weigh it. Loupe the seal. Stamp."
    ctx.fillStyle = '#1c1008';
    ctx.font = 'bold 13px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Weigh it. Loupe the seal.', 0, -2);
    ctx.fillText('Stamp.', 0, 18);
    ctx.font = '9.5px "Courier New", monospace';
    ctx.fillStyle = '#78350f';
    ctx.fillText('[Click pin to dismiss]', 0, 32);

    ctx.restore();
  }

  private drawPhysicalDeskObjects(
    ctx: CanvasRenderingContext2D,
    sim: BrassBoneSimulation,
    t: number
  ): void {
    // Draw in layered order: Assay Slip -> Artifact -> Weights -> Tuning Fork -> Iron Stamps
    const order: Array<DeskPhysicalObject['id']> = [
      'assay_slip',
      'artifact',
      'weight_10',
      'weight_20',
      'weight_50',
      'weight_100',
      'tuning_fork',
      'stamp_certify',
      'stamp_seize',
    ];

    for (const id of order) {
      const obj = sim.objects.get(id);
      if (!obj) continue;

      ctx.save();
      // Soft offset drop shadow that grows when lifted off the desk
      const shadowOffset = 5 + obj.lift * 14;
      ctx.translate(obj.x, obj.y - obj.lift * 10);
      ctx.rotate(obj.rotation);
      ctx.scale(obj.bounceScale, obj.bounceScale);

      if (id === 'assay_slip') {
        this.drawAssaySlipObject(ctx, sim, obj, shadowOffset);
      } else if (id === 'artifact') {
        this.drawArtifactNakedEye(ctx, sim.state.activeCase.artifact, shadowOffset, t);
      } else if (id.startsWith('weight_')) {
        this.drawBrassWeightObject(ctx, obj, shadowOffset);
      } else if (id === 'tuning_fork') {
        this.drawTuningForkObject(ctx, sim, shadowOffset, t);
      } else if (id === 'stamp_certify' || id === 'stamp_seize') {
        this.drawIronStampObject(ctx, obj, shadowOffset);
      }

      ctx.restore();
    }
  }

  private drawAssaySlipObject(
    ctx: CanvasRenderingContext2D,
    sim: BrassBoneSimulation,
    obj: DeskPhysicalObject,
    shadowOffset: number
  ): void {
    const w = obj.width;
    const h = obj.height;
    const c = sim.state.activeCase;
    const art = c.artifact;

    // Soft shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    this.roundRect(ctx, -w * 0.5 + shadowOffset, -h * 0.5 + shadowOffset, w, h, 4);
    ctx.fill();

    // Aged Parchment Slip (#fef3c7)
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    this.roundRect(ctx, -w * 0.5, -h * 0.5, w, h, 4);
    ctx.fill();
    ctx.stroke();

    // Slip Header
    ctx.fillStyle = '#1c1008';
    ctx.font = 'bold 12px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROYAL ASSAY SLIP', 0, -h * 0.5 + 22);

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5 + 12, -h * 0.5 + 29);
    ctx.lineTo(w * 0.5 - 12, -h * 0.5 + 29);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 10.5px "Courier New", monospace';
    ctx.fillStyle = '#451a03';
    ctx.fillText(`SERIAL: ${art.serialNumber}`, -w * 0.5 + 14, -h * 0.5 + 48);
    ctx.fillText(`ITEM: ${art.name.slice(0, 18)}`, -w * 0.5 + 14, -h * 0.5 + 66);
    ctx.fillText(`CLAIMED WT: ${art.claimedWeightG} GRAMS`, -w * 0.5 + 14, -h * 0.5 + 84);
    ctx.fillText(`FEE / PAY:  ${art.basePayout} SOV.`, -w * 0.5 + 14, -h * 0.5 + 102);

    // Stamp Target Box on the Assay Slip
    ctx.strokeStyle = 'rgba(146, 64, 14, 0.55)';
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-w * 0.5 + 14, -h * 0.5 + 118, w - 28, 98);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(120, 53, 15, 0.55)';
    ctx.font = 'bold 11px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText('SLAM IRON STAMP HERE', 0, -h * 0.5 + 162);
    ctx.font = '10px "Georgia", serif';
    ctx.fillText('GREEN = CERTIFY & PAY', 0, -h * 0.5 + 180);
    ctx.fillText('RED = CONFISCATE', 0, -h * 0.5 + 195);

    // Render any stamped ink marks on the slip
    for (const mark of sim.state.stampMarks) {
      ctx.save();
      ctx.translate(mark.offsetX, mark.offsetY);
      ctx.rotate(mark.rotation);
      ctx.strokeStyle = mark.type === 'certify' ? '#047857' : '#b91c1c';
      ctx.fillStyle =
        mark.type === 'certify' ? 'rgba(4, 120, 87, 0.18)' : 'rgba(185, 28, 28, 0.18)';
      ctx.lineWidth = 3;
      this.roundRect(ctx, -56, -24, 112, 48, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = mark.type === 'certify' ? '#065f46' : '#991b1b';
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillText(mark.type === 'certify' ? 'CERTIFIED' : 'CONFISCATED', 0, 5);
      ctx.restore();
    }

    ctx.textAlign = 'left';
  }

  /**
   * Draws the Artifact as seen by the naked eye on the desk
   */
  private drawArtifactNakedEye(
    ctx: CanvasRenderingContext2D,
    art: ArtifactSpec,
    shadowOffset: number,
    t: number
  ): void {
    void t;
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.arc(shadowOffset, shadowOffset, 48, 0, Math.PI * 2);
    ctx.fill();

    if (art.category === 'sovereign_coin') {
      // Gold Sovereign Coin
      const grad = ctx.createRadialGradient(-12, -12, 4, 0, 0, 46);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.55, '#f59e0b');
      grad.addColorStop(1, '#92400e');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Milled coin edge
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tiny naked-eye seal dot (requires Loupe to see if 5-spire or inverted!)
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 10px "Georgia", serif';
      ctx.textAlign = 'center';
      ctx.fillText('VICTORIA', 0, -14);
      ctx.fillText('SOVEREIGN', 0, 24);
      ctx.strokeRect(-10, -8, 20, 14);
    } else if (art.category === 'bullion_ingot') {
      // Heavy Gold Bullion Ingot Bar
      const grad = ctx.createLinearGradient(-52, -32, 52, 32);
      grad.addColorStop(0, '#fde047');
      grad.addColorStop(0.5, '#d97706');
      grad.addColorStop(1, '#78350f');
      ctx.fillStyle = grad;
      this.roundRect(ctx, -52, -34, 104, 68, 8);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#451a03';
      ctx.strokeRect(-38, -22, 76, 44);
      ctx.font = 'bold 11px "Georgia", serif';
      ctx.textAlign = 'center';
      ctx.fillText('IMPERIAL MINT', 0, -6);
      ctx.fillText('150g FINE GOLD', 0, 16);
    } else if (art.category === 'brass_compass') {
      // Admiralty Brass Compass
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();

      // Compass Rose & Needle
      ctx.strokeStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(0, 28);
      ctx.moveTo(-28, 0);
      ctx.lineTo(28, 0);
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(6, 0);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
    } else if (art.category === 'sanctified_reliquary') {
      // Sanctified Brass & Bone Reliquary Casket
      ctx.fillStyle = '#92400e';
      this.roundRect(ctx, -46, -46, 92, 92, 10);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Ivory Bone Center Inlay
      ctx.fillStyle = '#fef3c7';
      this.roundRect(ctx, -28, -28, 56, 56, 6);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cross / Reliquary Rosette
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-4, -20, 8, 40);
      ctx.fillRect(-20, -4, 40, 8);
    } else if (art.category === 'cameo_locket') {
      // Aristocrat Silver & Ivory Cameo Locket
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 34, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ivory profile cameo
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(0, -6, 11, 0, Math.PI * 2);
      ctx.arc(0, 14, 14, Math.PI, 0);
      ctx.fill();
    } else {
      // Sealed Transit Charter Document
      ctx.fillStyle = '#fde68a';
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      this.roundRect(ctx, -48, -54, 96, 108, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#451a03';
      ctx.font = 'bold 10px "Georgia", serif';
      ctx.textAlign = 'center';
      ctx.fillText('TRANSIT CHARTER', 0, -32);
      ctx.fillRect(-34, -18, 68, 2);
      ctx.fillRect(-34, -8, 54, 2);

      // Crimson Wax Seal on Charter
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(0, 22, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.stroke();
    }

    ctx.textAlign = 'left';
  }

  private drawBrassWeightObject(
    ctx: CanvasRenderingContext2D,
    obj: DeskPhysicalObject,
    shadowOffset: number
  ): void {
    const r = obj.radius;
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.arc(shadowOffset * 0.7, shadowOffset * 0.7, r, 0, Math.PI * 2);
    ctx.fill();

    // Cylindrical Brass Weight Body
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.6, '#d97706');
    grad.addColorStop(1, '#78350f');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top Knob Ring
    ctx.beginPath();
    ctx.arc(0, -4, r * 0.45, 0, Math.PI * 2);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Engraved Weight Label (10g, 20g, 50g, 100g)
    ctx.fillStyle = '#1c1008';
    ctx.font = 'bold 12px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText(obj.label, 0, 6);
    ctx.textAlign = 'left';
  }

  private drawTuningForkObject(
    ctx: CanvasRenderingContext2D,
    sim: BrassBoneSimulation,
    shadowOffset: number,
    t: number
  ): void {
    const vibrate =
      sim.state.oscillographActive > 0.2
        ? Math.sin(t * 95) * 2.5 * sim.state.oscillographActive
        : 0;

    // Shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(shadowOffset, -50 + shadowOffset);
    ctx.lineTo(shadowOffset, 50 + shadowOffset);
    ctx.stroke();

    // Acoustic Brass & Steel Tuning Fork
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    // Handle stem
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, 54);
    ctx.stroke();

    // Brass Resonator Base Bulb
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(0, 52, 9, 0, Math.PI * 2);
    ctx.fill();

    // Left & Right Prongs (vibrate when struck!)
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(-15, 8, -15 - vibrate, -48);
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(15, 8, 15 + vibrate, -48);
    ctx.stroke();
  }

  private drawIronStampObject(
    ctx: CanvasRenderingContext2D,
    obj: DeskPhysicalObject,
    shadowOffset: number
  ): void {
    const isCertify = obj.id === 'stamp_certify';
    const accent = isCertify ? '#10b981' : '#ef4444';
    const darkAccent = isCertify ? '#064e3b' : '#7f1d1d';

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.roundRect(ctx, -36 + shadowOffset, -28 + shadowOffset, 72, 56, 8);
    ctx.fill();

    // Heavy Cast-Iron Stamp Base Plate
    ctx.fillStyle = '#1f2937';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, -36, -26, 72, 52, 8);
    ctx.fill();
    ctx.stroke();

    // Turned Mahogany / Brass Handle Knob
    const knobGrad = ctx.createRadialGradient(-6, -12, 3, 0, -6, 22);
    knobGrad.addColorStop(0, accent);
    knobGrad.addColorStop(1, darkAccent);
    ctx.fillStyle = knobGrad;
    ctx.beginPath();
    ctx.arc(0, -6, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Stamp Label
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isCertify ? 'CERTIFY' : 'SEIZE', 0, 20);
    ctx.textAlign = 'left';
  }

  /**
   * MANDATORY FEATURE:
   * Jeweler's Magnifying Loupe & UV Aether Lens using:
   * ctx.save(); ctx.beginPath(); ctx.arc(loupeX, loupeY, R, 0, Math.PI * 2); ctx.clip();
   * to render a 2.5x zoomed internal layer inside the glass lens!
   */
  private drawMagnifyingLenses(
    ctx: CanvasRenderingContext2D,
    sim: BrassBoneSimulation,
    t: number
  ): void {
    const loupe = sim.objects.get('loupe');
    const uvLens = sim.objects.get('uv_lens');
    const artObj = sim.objects.get('artifact');
    const art = sim.state.activeCase.artifact;

    const renderLens = (lens: DeskPhysicalObject, isUvMode: boolean) => {
      const loupeX = lens.x;
      const loupeY = lens.y - lens.lift * 10;
      const R = 52;

      // 1. Clipped 2.5x Magnified Internal Layer inside the glass lens
      ctx.save();
      ctx.beginPath();
      ctx.arc(loupeX, loupeY, R, 0, Math.PI * 2);
      ctx.clip();

      // Background inside lens
      ctx.fillStyle = isUvMode ? '#130d2e' : '#09382a';
      ctx.fillRect(loupeX - R, loupeY - R, R * 2, R * 2);

      // Transform around artifact position at 2.5x magnification!
      if (artObj) {
        ctx.save();
        ctx.translate(loupeX, loupeY);
        ctx.scale(2.5, 2.5);
        ctx.translate(-(loupeX - artObj.x), -(loupeY - (artObj.y - artObj.lift * 10)));

        // Draw base artifact at 2.5x zoom
        this.drawArtifactNakedEye(ctx, art, 0, t);

        // Draw microscopic internal layer only visible inside the 2.5x lens!
        this.drawMicroscopicHallmarkAndUvLayer(ctx, art, isUvMode, t);

        ctx.restore();
      }

      // Subtle optical grid & readout banner inside top/bottom of the lens
      ctx.fillStyle = isUvMode ? 'rgba(88, 28, 135, 0.82)' : 'rgba(28, 16, 8, 0.82)';
      ctx.fillRect(loupeX - R, loupeY + R - 22, R * 2, 22);
      ctx.fillStyle = isUvMode ? '#e879f9' : '#fde68a';
      ctx.font = 'bold 8.5px "Courier New", monospace';
      ctx.textAlign = 'center';
      const distToArt = artObj ? Math.hypot(loupeX - artObj.x, loupeY - artObj.y) : 999;
      if (distToArt < 92) {
        ctx.fillText(
          isUvMode ? art.uvDetailText.slice(0, 26) : art.microDetailText.slice(0, 26),
          loupeX,
          loupeY + R - 8
        );
      } else {
        ctx.fillText(isUvMode ? 'UV AETHER 2.5×' : 'OPTICAL LOUPE 2.5×', loupeX, loupeY + R - 8);
      }

      ctx.restore();

      // 2. Ornate Brass Lens Frame & Handle outside the clip
      ctx.save();
      ctx.translate(loupeX, loupeY);
      ctx.rotate(lens.rotation);

      // Handle
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      this.roundRect(ctx, -8, R - 2, 16, 44, 5);
      ctx.fill();
      ctx.stroke();

      // Brass Bezel Ring
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.strokeStyle = isUvMode ? '#a855f7' : '#f59e0b';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, R + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Specular Glass Glint
      ctx.strokeStyle = isUvMode ? 'rgba(216, 180, 254, 0.45)' : 'rgba(254, 243, 199, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, R - 7, -Math.PI * 0.75, -Math.PI * 0.35);
      ctx.stroke();

      ctx.restore();
      ctx.textAlign = 'left';
    };

    if (loupe) renderLens(loupe, false);
    if (uvLens) renderLens(uvLens, true);
  }

  /**
   * Renders the 2.5x microscopic details (Hallmarks, File Scratches, UV Syndicate Runes, Plague Veins)
   * inside the clipped lens coordinate space.
   */
  private drawMicroscopicHallmarkAndUvLayer(
    ctx: CanvasRenderingContext2D,
    art: ArtifactSpec,
    isUvMode: boolean,
    t: number
  ): void {
    if (!isUvMode) {
      // OPTICAL 2.5x LOUPE: Render crisp Hallmark Stamp & Micro-scratches
      ctx.save();
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 0.8;
      this.roundRect(ctx, -16, -12, 32, 24, 3);
      ctx.fill();
      ctx.stroke();

      this.drawHallmarkGraphic(ctx, art.actualHallmark);

      // If forged hallmark, also draw micro-file scratches around the edge
      if (art.actualHallmark !== art.expectedHallmark) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-22, -16);
        ctx.lineTo(-14, -8);
        ctx.moveTo(15, 10);
        ctx.lineTo(24, 18);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // UV AETHER 2.5x LENS: Render glowing ultraviolet occult veins / Syndicate Spider-Runes
      const pulse = 0.65 + Math.sin(t * 6) * 0.35;
      ctx.save();

      if (art.uvSignature === 'syndicate_spider') {
        // Glowing Neon-Violet Syndicate Spider-Rune
        ctx.strokeStyle = `rgba(217, 70, 239, ${pulse})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f0abfc';
        ctx.font = 'bold 5px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SYNDICATE CIPHER', 0, 32);
      } else if (art.uvSignature === 'plague_veins') {
        // Pulsing Crimson-Violet Plague Blood-Veins
        ctx.strokeStyle = `rgba(244, 63, 94, ${pulse})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-24, -18);
        ctx.quadraticCurveTo(-6, -2, 0, 0);
        ctx.quadraticCurveTo(10, 8, 24, 20);
        ctx.moveTo(18, -22);
        ctx.quadraticCurveTo(4, -5, -18, 22);
        ctx.stroke();

        ctx.fillStyle = '#fda4af';
        ctx.font = 'bold 5px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PLAGUE BIO-CURSE!', 0, 32);
      } else if (art.uvSignature === 'auditor_watermark') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(-18, -18, 36, 36);
        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 5px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('INQUISITOR TRAP DIE', 0, 26);
      } else if (art.uvSignature === 'royal_aether_thread') {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-26, 0);
        ctx.lineTo(26, 0);
        ctx.stroke();
        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 5px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ROYAL UV THREAD OK', 0, 24);
      } else {
        ctx.fillStyle = '#a5b4fc';
        ctx.font = 'bold 5px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CLEAN UNDER UV', 0, 4);
      }

      ctx.restore();
    }
  }

  private drawHallmarkGraphic(ctx: CanvasRenderingContext2D, style: HallmarkStyle): void {
    ctx.save();
    if (style === 'crown_5_valid') {
      this.drawMiniCrownIcon(ctx, 0, 2, 5, false);
    } else if (style === 'crown_5_reversed') {
      this.drawMiniCrownIcon(ctx, 0, -2, 5, true);
    } else if (style === 'crown_3_crude') {
      this.drawMiniCrownIcon(ctx, 0, 2, 3, false);
    } else if (style === 'admiralty_anchor') {
      ctx.strokeStyle = '#065f46';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.moveTo(-5, -3);
      ctx.lineTo(5, -3);
      ctx.arc(0, 2, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (style === 'inquisitor_seal') {
      ctx.strokeStyle = '#065f46';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 5px "Georgia", serif';
      ctx.textAlign = 'center';
      ctx.fillText('REX', 0, 2);
    } else {
      // Hand-drawn crooked seal
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-6, 4);
      ctx.lineTo(-2, -6);
      ctx.lineTo(3, 2);
      ctx.lineTo(6, -4);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawMiniCrownIcon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spires: 3 | 5,
    inverted: boolean
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    if (inverted) ctx.scale(1, -1);

    ctx.fillStyle = inverted || spires === 3 ? '#b91c1c' : '#b45309';
    ctx.beginPath();
    ctx.moveTo(-8, 5);
    if (spires === 5) {
      ctx.lineTo(-9, -4);
      ctx.lineTo(-5, 1);
      ctx.lineTo(-3, -6);
      ctx.lineTo(0, 1);
      ctx.lineTo(0, -7);
      ctx.lineTo(3, 1);
      ctx.lineTo(5, -6);
      ctx.lineTo(7, 1);
      ctx.lineTo(9, -4);
    } else {
      ctx.lineTo(-8, -5);
      ctx.lineTo(-3, 2);
      ctx.lineTo(0, -6);
      ctx.lineTo(3, 2);
      ctx.lineTo(8, -5);
    }
    ctx.lineTo(8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Honest Post-Night Ledger:
   * Physical balance sheet slid onto the desk at the end of each night showing
   * every item certified/seized, exact discrepancy caught or missed, rent/oil deduction,
   * and which of the 4 endings you are trending toward.
   */
  private drawPostNightLedger(ctx: CanvasRenderingContext2D, sim: BrassBoneSimulation): void {
    const { state } = sim;
    const isFinal = state.phase === 'campaign_ending';

    // Dim desk backdrop
    ctx.fillStyle = 'rgba(12, 6, 3, 0.72)';
    ctx.fillRect(0, 0, WORKBENCH_WIDTH, WORKBENCH_HEIGHT);

    const lx = 230;
    const ly = 54;
    const lw = 820;
    const lh = 652;

    // Physical Parchment Balance Sheet
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 4;
    this.roundRect(ctx, lx, ly, lw, lh, 10);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(146, 64, 14, 0.35)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, lx + 10, ly + 10, lw - 20, lh - 20, 6);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#451a03';
    ctx.font = 'bold 22px "Georgia", serif';
    ctx.fillText(
      isFinal
        ? `FINAL ROYAL ASSAY LEDGER — NIGHT ${state.night} COMPLETE`
        : `POST-NIGHT ${state.night} HONEST BALANCE SHEET`,
      lx + lw * 0.5,
      ly + 42
    );

    ctx.font = 'italic 13px "Georgia", serif';
    ctx.fillStyle = '#78350f';
    ctx.fillText(
      'Every certified, confiscated, and fenced relic from tonight’s shift:',
      lx + lw * 0.5,
      ly + 64
    );

    // Case Records Table
    ctx.textAlign = 'left';
    let rowY = ly + 98;
    for (const rec of state.nightRecords) {
      ctx.fillStyle = rec.caughtDiscrepancy ? 'rgba(6, 95, 70, 0.1)' : 'rgba(185, 28, 28, 0.12)';
      this.roundRect(ctx, lx + 26, rowY - 18, lw - 52, 86, 6);
      ctx.fill();

      ctx.fillStyle = '#1c1008';
      ctx.font = 'bold 14px "Georgia", serif';
      ctx.fillText(
        `${rec.claimantName} — ${rec.artifactName} [${rec.decision.toUpperCase()}]`,
        lx + 38,
        rowY + 2
      );

      ctx.fillStyle = rec.caughtDiscrepancy ? '#065f46' : '#991b1b';
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'right';
      const sign = rec.coinsDelta >= 0 ? '+' : '';
      ctx.fillText(
        `${rec.caughtDiscrepancy ? 'ACCURATE' : 'DISCREPANCY MISSED'} (${sign}${rec.coinsDelta}g)`,
        lx + lw - 38,
        rowY + 2
      );
      ctx.textAlign = 'left';

      ctx.fillStyle = '#451a03';
      ctx.font = '12.5px "Georgia", serif';
      ctx.fillText(`Truth: ${rec.discrepancyText}`, lx + 38, rowY + 26);

      if (rec.moralNote) {
        ctx.fillStyle = '#78350f';
        ctx.font = 'italic 12px "Georgia", serif';
        ctx.fillText(`Outcome: ${rec.moralNote}`, lx + 38, rowY + 46);
      }

      rowY += 98;
    }

    // Rent & Lamp-Oil Deduction + Trending Ending
    const summaryY = ly + 402;
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx + 28, summaryY);
    ctx.lineTo(lx + lw - 28, summaryY);
    ctx.stroke();

    ctx.fillStyle = '#451a03';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText(
      `LODGING RENT DEDUCTION: -${state.lastNightRentCost}g   |   LAMP OIL & COAL: -${state.lastNightOilCost}g`,
      lx + 34,
      summaryY + 28
    );
    ctx.fillStyle = '#065f46';
    ctx.fillText(
      `NET TREASURY PURSE: ${state.sovereigns} SOVEREIGNS   |   CROWN SUSPICION: ${state.suspicion}/5`,
      lx + 34,
      summaryY + 52
    );

    // Trending / Final Ending Box
    const endingInfo = ENDING_TITLES[state.trendingEnding];
    ctx.fillStyle = '#27150a';
    this.roundRect(ctx, lx + 30, summaryY + 68, lw - 60, 96, 8);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px "Georgia", serif';
    ctx.fillText(
      `${isFinal ? 'FINAL VERDICT' : 'TRENDING ENDING'}: ${endingInfo.title}`,
      lx + 46,
      summaryY + 94
    );
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'italic 12.5px "Georgia", serif';
    this.wrapText(ctx, endingInfo.desc, lx + 46, summaryY + 116, lw - 92, 18);

    // Wax Seal Action Stamp at Bottom of Ledger
    const btnY = ly + lh - 64;
    ctx.fillStyle = '#991b1b';
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, lx + lw * 0.5 - 190, btnY - 22, 380, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 15px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      isFinal ? 'STAMP WAX SEAL TO BEGIN NEW SHIFT' : `STAMP WAX SEAL TO BEGIN NIGHT ${state.night + 1}`,
      lx + lw * 0.5,
      btnY + 7
    );
    ctx.textAlign = 'left';
  }

  /**
   * Warm Candlelight Atmosphere:
   * Radial vignette around the oil lamp and cursor that gently flickers:
   * Math.sin(t * 7) * 0.02 + Math.cos(t * 13) * 0.01
   */
  private drawCandlelightVignette(
    ctx: CanvasRenderingContext2D,
    sim: BrassBoneSimulation,
    t: number
  ): void {
    const flicker = Math.sin(t * 7) * 0.02 + Math.cos(t * 13) * 0.01;
    const lampX = sim.pointerX;
    const lampY = sim.pointerY;

    const radGrad = ctx.createRadialGradient(
      lampX,
      lampY,
      90,
      WORKBENCH_WIDTH * 0.5,
      WORKBENCH_HEIGHT * 0.5,
      860
    );
    radGrad.addColorStop(0, `rgba(245, 158, 11, ${0.06 + flicker})`);
    radGrad.addColorStop(0.55, 'rgba(28, 16, 8, 0.08)');
    radGrad.addColorStop(1, `rgba(8, 4, 2, ${0.46 + flicker * 2})`);

    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, WORKBENCH_WIDTH, WORKBENCH_HEIGHT);
  }

  private roundRect(
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

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let curY = y;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && i > 0) {
        ctx.fillText(line, x, curY);
        line = words[i] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
  }
}
