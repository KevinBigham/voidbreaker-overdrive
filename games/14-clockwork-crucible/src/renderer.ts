import { CrucibleWorkbenchSim, WORKBENCH_HEIGHT, WORKBENCH_WIDTH, ZONES } from './simulation';
import {
  PALETTE,
  REAGENT_SPECS,
  type ReagentBead,
  WORKBENCH_ATTACHMENTS,
} from './types';

export class CrucibleWorkbenchRenderer {
  public render(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim, debug = false): void {
    ctx.save();

    // 1. Aged Inked Walnut Workbench Surface & Drafted Geometry Lines
    this.drawWalnutWorkbench(ctx);

    // 2. Upper-Left: Pinned Parchment Commission Slip
    this.drawParchmentCommissionSlip(ctx, sim);

    // 3. Middle-Left: Brass Supply Chute & Hopper Dispenser
    this.drawBrassSupplyChute(ctx, sim);

    // 4. Lower-Left: Tactile Artifact Station (Spring Weighing Pan, Heated Copper Anvil, Bellows Lever)
    this.drawArtifactStationAndBellows(ctx, sim);

    // 5. Center: Smoked-Glass & Burnished-Brass Crucible Press (Back Layer, Prism Beam, Baffles, Attachments)
    this.drawCruciblePressBack(ctx, sim);

    // 6. Galvanic Arcs & Reagent Beads (across Chute, Pan, Anvil, and Crucible)
    this.drawGalvanicArcs(ctx, sim);
    for (const bead of sim.beads) {
      this.drawReagentBead(ctx, bead, sim.draggedBeadId === bead.id);
    }

    // 7. Particles (Embers, Steam, Acid Bubbles, Gold Sparks, Salt Crystals)
    this.drawParticles(ctx, sim);

    // 8. Center: Crucible Smoked-Glass Front Reflection, Hairline Cracks, Shear-Blade, Vent Stopper & Prism Bezel
    this.drawCruciblePressFront(ctx, sim);

    // 9. Right Column: Bourdon Pressure Gauge, Heavy Discharge Lever, Attachment Bolt Sockets, & Assay Balance Scale
    this.drawBourdonGauge(ctx, sim);
    this.drawDischargeLever(ctx, sim);
    this.drawAttachmentMounts(ctx, sim);
    this.drawAssayBalanceScale(ctx, sim);

    // 10. Cursor-as-Hand Damped Spring Caliper Tether (when dragging a bead)
    this.drawCursorSpringTether(ctx, sim);

    // 11. Subtle Engraved Brass Footer Plate (Diegetic Status & Tactile Guidance)
    this.drawEngravedBrassFooter(ctx, sim, debug);

    ctx.restore();
  }

  private drawWalnutWorkbench(ctx: CanvasRenderingContext2D): void {
    // Warm radial lamp-lit walnut background
    const bgGrad = ctx.createRadialGradient(
      WORKBENCH_WIDTH * 0.5,
      WORKBENCH_HEIGHT * 0.45,
      90,
      WORKBENCH_WIDTH * 0.5,
      WORKBENCH_HEIGHT * 0.5,
      820
    );
    bgGrad.addColorStop(0, PALETTE.walnutWarm);
    bgGrad.addColorStop(0.55, PALETTE.walnutMid);
    bgGrad.addColorStop(1, PALETTE.walnutDeep);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, WORKBENCH_WIDTH, WORKBENCH_HEIGHT);

    // Subtle horizontal wood-plank grain lines
    ctx.strokeStyle = 'rgba(18, 12, 9, 0.38)';
    ctx.lineWidth = 1.5;
    for (let y = 95; y < WORKBENCH_HEIGHT; y += 110) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORKBENCH_WIDTH, y);
      ctx.stroke();
    }

    // Faint drafted alchemical construction circles on the workbench mat
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 155, 53, 0.09)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(ZONES.crucible.centerX, ZONES.crucible.centerY, 228, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ZONES.crucible.centerX, ZONES.crucible.centerY, 260, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Burnished brass outer workbench frame & corner rivets
    ctx.strokeStyle = PALETTE.brassShadow;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, WORKBENCH_WIDTH - 16, WORKBENCH_HEIGHT - 16);
    ctx.strokeStyle = PALETTE.brassBurnished;
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, WORKBENCH_WIDTH - 24, WORKBENCH_HEIGHT - 24);
  }

  private drawParchmentCommissionSlip(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    const { x, y, w, h } = ZONES.parchment;
    const comm = sim.currentCommission;

    ctx.save();
    // Drop shadow under parchment slip
    ctx.fillStyle = 'rgba(10, 7, 5, 0.55)';
    ctx.fillRect(x + 6, y + 8, w, h);

    // Warm drafted parchment sheet
    const pGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    pGrad.addColorStop(0, PALETTE.parchment);
    pGrad.addColorStop(1, PALETTE.parchmentDark);
    ctx.fillStyle = pGrad;
    ctx.fillRect(x, y, w, h);

    // Double inked border inside parchment
    ctx.strokeStyle = 'rgba(74, 50, 13, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);

    // Physical Brass Tack pinning the parchment at top-center
    const tackX = x + w * 0.5;
    const tackY = y + 14;
    this.drawBrassRivet(ctx, tackX, tackY, 9);

    // Patron Header & Commission Number
    ctx.fillStyle = '#5c4028';
    ctx.font = 'bold 11px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`COMMISSION NO. ${comm.level} · ${comm.patronName.toUpperCase()}`, x + 18, y + 36);

    // Large Evocative Title (e.g. "Crack & Distill.")
    ctx.fillStyle = PALETTE.parchmentInk;
    ctx.font = 'bold 22px Georgia, "Times New Roman", serif';
    ctx.fillText(comm.title, x + 18, y + 62);

    // Handwritten-style instruction note (wrapped cleanly)
    ctx.fillStyle = '#3d2e24';
    ctx.font = '12.5px Georgia, serif';
    this.wrapText(ctx, comm.note, x + 18, y + 84, w - 36, 16);

    // Alchemical Formula / Diagram Strip
    ctx.fillStyle = 'rgba(44, 34, 28, 0.08)';
    ctx.fillRect(x + 16, y + 122, w - 32, 28);
    ctx.strokeStyle = 'rgba(124, 83, 22, 0.35)';
    ctx.strokeRect(x + 16, y + 122, w - 32, 28);

    ctx.fillStyle = '#4a320d';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText(comm.diagramHint, x + 24, y + 140);

    // Quota Progress & Physical Coin Slots on the Parchment Footer
    const remaining = Math.max(0, comm.quotaCoins - sim.commissionCoinsEarned);
    ctx.fillStyle = PALETTE.parchmentInk;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText(
      `QUOTA: ${sim.commissionCoinsEarned} / ${comm.quotaCoins} COINS (${remaining} TO CLEAR)`,
      x + 18,
      y + 172
    );

    // Visual row of brass coin sockets
    const maxPipSlots = Math.min(10, comm.quotaCoins);
    const filledPips = Math.round((sim.commissionCoinsEarned / Math.max(1, comm.quotaCoins)) * maxPipSlots);
    for (let i = 0; i < maxPipSlots; i++) {
      const cx = x + 26 + i * 26;
      const cy = y + 194;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      if (i < filledPips) {
        ctx.fillStyle = PALETTE.brassBurnished;
        ctx.fill();
        ctx.strokeStyle = PALETTE.brassHighlight;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(44, 34, 28, 0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(74, 50, 13, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Cinnabar Wax Seal Stamp in lower-right corner of parchment
    const sealX = x + w - 36;
    const sealY = y + h - 32;
    ctx.beginPath();
    ctx.arc(sealX, sealY, 18, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.cinnabar;
    ctx.fill();
    ctx.strokeStyle = '#9e1f28';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${comm.level}`, sealX, sealY + 4);

    ctx.restore();
  }

  private drawBrassSupplyChute(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    const { x, y, w, h } = ZONES.chute;
    ctx.save();

    // Recessed walnut chute housing
    ctx.fillStyle = '#16110e';
    ctx.strokeStyle = PALETTE.brassBurnished;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // Header label
    ctx.fillStyle = PALETTE.brassHighlight;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('RAW REAGENT CHUTE (DRAG BEADS OR CLICK HOPPER)', x + 14, y + 18);

    // Spring-loaded Chute Dispenser Lever on left
    const dl = ZONES.dispenserLever;
    const pullOffset = sim.chuteLeverSpring.position * 14;
    ctx.strokeStyle = PALETTE.brassShadow;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(dl.x, dl.y);
    ctx.lineTo(dl.x, dl.y + 42);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(dl.x, dl.y + pullOffset, 16, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.copperWarm;
    ctx.fill();
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('DROP', dl.x, dl.y + pullOffset + 3);
    ctx.fillStyle = PALETTE.brassBurnished;
    ctx.fillText('SUPPLY', dl.x, dl.y + 56);

    // Elemental Hopper Buttons along top of Chute for unlocked elements
    const avail = sim.currentCommission.availableElements;
    for (let i = 0; i < avail.length; i++) {
      const el = avail[i];
      const spec = REAGENT_SPECS[el];
      const bx = x + 126 + i * 44;
      const by = y + 40;

      ctx.beginPath();
      ctx.arc(bx, by, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#2a201b';
      ctx.fill();
      ctx.strokeStyle = spec.primaryColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = PALETTE.parchment;
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(spec.alchemicalSymbol, bx, by + 5);
    }

    // Inclined burnished-brass chute ramp where beads rest
    ctx.strokeStyle = PALETTE.brassBurnished;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 118);
    ctx.lineTo(x + w - 22, y + 168);
    ctx.lineTo(x + w - 22, y + 142);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 115);
    ctx.lineTo(x + w - 22, y + 165);
    ctx.stroke();

    // Footer tip inside chute
    ctx.fillStyle = 'rgba(244, 236, 225, 0.65)';
    ctx.font = '11px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('Drag beads into the Crucible top throat or onto the Anvil below.', x + 14, y + h - 10);

    ctx.restore();
  }

  private drawArtifactStationAndBellows(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    ctx.save();

    // Panel framing lower-left Artifact Station
    ctx.fillStyle = '#17120f';
    ctx.strokeStyle = PALETTE.brassShadow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(38, 476, 330, 250, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.brassHighlight;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('WORKBENCH ARTIFACT TESTBED: SCALE PAN & HOT ANVIL', 52, 496);

    // 1. Hooke's-Law Spring Brass Weighing Pan (Left)
    const pan = ZONES.weighingPan;
    const dipY = pan.baseY + sim.weighingPanSpring.position;

    // Pedestal base & coiled spring
    ctx.fillStyle = PALETTE.brassShadow;
    ctx.fillRect(pan.centerX - 28, 646, 56, 14);
    ctx.strokeStyle = PALETTE.brassBurnished;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const coils = 6;
    for (let i = 0; i <= coils; i++) {
      const cy = dipY + 8 + ((646 - (dipY + 8)) * i) / coils;
      const cx = pan.centerX + (i % 2 === 0 ? -12 : 12);
      if (i === 0) ctx.moveTo(pan.centerX, dipY + 8);
      else ctx.lineTo(cx, cy);
    }
    ctx.lineTo(pan.centerX, 646);
    ctx.stroke();

    // Concave Brass Scale Pan dish
    ctx.fillStyle = PALETTE.brassBurnished;
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pan.x, dipY - 6);
    ctx.quadraticCurveTo(pan.centerX, dipY + 14, pan.x + pan.w, dipY - 6);
    ctx.lineTo(pan.x + pan.w - 8, dipY + 8);
    ctx.quadraticCurveTo(pan.centerX, dipY + 20, pan.x + 8, dipY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPRING SCALE PAN', pan.centerX, 676);
    ctx.fillStyle = PALETTE.amberGlass;
    ctx.font = '10px Georgia, serif';
    ctx.fillText(sim.lastWeighedName, pan.centerX, 692);

    // 2. Heated Hammered-Copper Anvil (Right of Scale Pan)
    const anvil = ZONES.copperAnvil;
    // Glowing coal bed underneath anvil
    const anvilGlow = ctx.createRadialGradient(
      anvil.centerX,
      anvil.topY + 36,
      6,
      anvil.centerX,
      anvil.topY + 36,
      64
    );
    anvilGlow.addColorStop(0, 'rgba(255, 183, 3, 0.55)');
    anvilGlow.addColorStop(0.5, 'rgba(230, 57, 70, 0.3)');
    anvilGlow.addColorStop(1, 'rgba(230, 57, 70, 0)');
    ctx.fillStyle = anvilGlow;
    ctx.fillRect(anvil.x - 16, anvil.topY - 12, anvil.w + 32, 110);

    // Copper Anvil horn & block
    const copGrad = ctx.createLinearGradient(anvil.x, anvil.topY, anvil.x, anvil.topY + anvil.h);
    copGrad.addColorStop(0, PALETTE.copperHot);
    copGrad.addColorStop(0.5, PALETTE.copperWarm);
    copGrad.addColorStop(1, '#5e2c14');
    ctx.fillStyle = copGrad;
    ctx.strokeStyle = PALETTE.amberGlass;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(anvil.x, anvil.topY);
    ctx.lineTo(anvil.x + anvil.w, anvil.topY);
    ctx.lineTo(anvil.x + anvil.w - 14, anvil.topY + 26);
    ctx.lineTo(anvil.x + anvil.w - 4, anvil.topY + anvil.h);
    ctx.lineTo(anvil.x + 4, anvil.topY + anvil.h);
    ctx.lineTo(anvil.x + 14, anvil.topY + 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOT COPPER ANVIL', anvil.centerX, 676);
    ctx.fillStyle = PALETTE.cinnabarGlow;
    ctx.font = '10px Georgia, serif';
    ctx.fillText('Drop to Temper / Crack', anvil.centerX, 692);

    // 3. Weighted Brass & Leather Bellows Lever (Between Artifact Station and Crucible)
    const bel = ZONES.bellowsHandle;
    const handleY = bel.restY + sim.bellowsSpring.position * (bel.maxPullY - bel.restY);

    // Leather bellows pleats compressing with handle
    ctx.fillStyle = '#3b2316';
    ctx.strokeStyle = PALETTE.brassBurnished;
    ctx.lineWidth = 2;
    const pleats = 4;
    for (let i = 0; i < pleats; i++) {
      const py = handleY + 18 + i * ((700 - handleY) / pleats);
      ctx.beginPath();
      ctx.roundRect(bel.x - 4, py, bel.w + 8, 12, 4);
      ctx.fill();
      ctx.stroke();
    }

    // Brass guide rod
    ctx.strokeStyle = PALETTE.brassShadow;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(bel.x + bel.w * 0.5, bel.restY - 12);
    ctx.lineTo(bel.x + bel.w * 0.5, bel.maxPullY + 24);
    ctx.stroke();

    // Turned walnut & brass Bellows Handle grip
    ctx.fillStyle = PALETTE.brassBurnished;
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bel.x - 8, handleY - 14, bel.w + 16, 28, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.walnutDeep;
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('BELLOWS', bel.x + bel.w * 0.5, handleY + 4);
    ctx.fillStyle = PALETTE.brassHighlight;
    ctx.fillText('PUMP HEAT', bel.x + bel.w * 0.5, bel.restY - 22);

    ctx.restore();
  }

  private drawCruciblePressBack(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    const c = ZONES.crucible;
    ctx.save();

    // Outer cast-brass support pillars
    ctx.fillStyle = PALETTE.brassShadow;
    ctx.fillRect(c.left - 18, c.top - 10, 16, c.bottom - c.top + 24);
    ctx.fillRect(c.right + 2, c.top - 10, 16, c.bottom - c.top + 24);

    // Smoked-Glass Vessel Interior Background
    const heatRatio = Math.min(1, Math.max(0, (sim.vesselHeat - 22) / 100));
    const chamberGrad = ctx.createRadialGradient(
      c.centerX,
      c.bottom - 50,
      20,
      c.centerX,
      c.centerY,
      280
    );
    chamberGrad.addColorStop(0, `rgba(255, 183, 3, ${0.18 + heatRatio * 0.28})`);
    chamberGrad.addColorStop(0.55, 'rgba(48, 36, 28, 0.86)');
    chamberGrad.addColorStop(1, 'rgba(24, 18, 14, 0.94)');

    ctx.fillStyle = chamberGrad;
    ctx.beginPath();
    ctx.roundRect(c.left, c.top, c.right - c.left, c.bottom - c.top, 22);
    ctx.fill();

    // Rotating Alembic Prism Lens Focal Heat Beam inside the Crucible
    const lensX = c.centerX + Math.cos(sim.prismAngle) * ZONES.prismRing.radius;
    const lensY = c.centerY + Math.sin(sim.prismAngle) * ZONES.prismRing.radius;
    const aimX = c.centerX - Math.cos(sim.prismAngle) * 85;
    const aimY = c.centerY - Math.sin(sim.prismAngle) * 85;

    const beamGrad = ctx.createLinearGradient(lensX, lensY, aimX, aimY);
    beamGrad.addColorStop(0, 'rgba(255, 183, 3, 0.34)');
    beamGrad.addColorStop(1, 'rgba(230, 57, 70, 0.04)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(lensX, lensY);
    ctx.lineTo(aimX - 38, aimY - 38);
    ctx.lineTo(aimX + 38, aimY + 38);
    ctx.closePath();
    ctx.fill();

    // Bolted Attachment 2: Centrifuge Rotor Blades at bottom of chamber
    if (sim.boltedAttachments.has('centrifuge')) {
      ctx.save();
      ctx.translate(c.centerX, c.bottom - 52);
      ctx.rotate(sim.centrifugeAngle);
      ctx.strokeStyle = PALETTE.brassBurnished;
      ctx.lineWidth = 4;
      for (let b = 0; b < 4; b++) {
        ctx.rotate(Math.PI * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(54, 12);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.brassHighlight;
      ctx.fill();
      ctx.restore();
    }

    // Bolted Attachment 4: Magnetic Lodestone Ring gimballed inside chamber
    if (sim.boltedAttachments.has('lodestone')) {
      ctx.save();
      ctx.strokeStyle = sim.lodestonePulseTimer > 0 ? PALETTE.amberGlass : PALETTE.verdigris;
      ctx.lineWidth = sim.lodestonePulseTimer > 0 ? 4 : 2.5;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(c.centerX, c.centerY, 68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Internal Brass Baffle Shelves (can be corroded by hot unvented Vitriol)
    if (sim.baffleIntegrity > 0.15) {
      ctx.save();
      ctx.globalAlpha = Math.max(0.25, sim.baffleIntegrity);
      ctx.strokeStyle = sim.baffleIntegrity < 0.7 ? PALETTE.verdigris : PALETTE.brassBurnished;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.left + 16, c.baffleY - 12);
      ctx.lineTo(c.left + 104, c.baffleY + 6);
      ctx.moveTo(c.right - 16, c.baffleY - 12);
      ctx.lineTo(c.right - 104, c.baffleY + 6);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawGalvanicArcs(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    if (sim.galvanicArcs.length === 0) return;
    ctx.save();

    for (const arc of sim.galvanicArcs) {
      const isQuad = arc.loopMultiplier >= 5;
      const isTri = arc.loopMultiplier >= 3;
      ctx.strokeStyle = isQuad ? PALETTE.amberGlass : isTri ? PALETTE.brassHighlight : PALETTE.verdigris;
      ctx.lineWidth = isQuad ? 3.5 : 2.2;

      const midX = (arc.x1 + arc.x2) * 0.5 + Math.sin(Date.now() * 0.02 + arc.fromId) * 9;
      const midY = (arc.y1 + arc.y2) * 0.5 + Math.cos(Date.now() * 0.02 + arc.toId) * 9;

      ctx.beginPath();
      ctx.moveTo(arc.x1, arc.y1);
      ctx.quadraticCurveTo(midX, midY, arc.x2, arc.y2);
      ctx.stroke();
    }

    // Display geometric loop resonance badge inside top of chamber
    if (sim.activeLoopMultiplier >= 3) {
      const label =
        sim.activeLoopMultiplier >= 5
          ? '◇ GALVANIC QUAD LOOP (×5 YIELD)'
          : '△ GALVANIC TRIANGLE LOOP (×3 YIELD)';
      ctx.fillStyle = PALETTE.amberGlass;
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, ZONES.crucible.centerX, ZONES.crucible.top + 28);
    }

    ctx.restore();
  }

  private drawReagentBead(ctx: CanvasRenderingContext2D, bead: ReagentBead, isDragged: boolean): void {
    const spec = REAGENT_SPECS[bead.element];
    ctx.save();
    ctx.translate(bead.x, bead.y);

    // Thermal aura if hot (> 50°C) or Cinnabar
    if (bead.temperature > 50 || bead.element === 'cinnabar') {
      const auraR = bead.radius + 8 + Math.min(12, (bead.temperature - 45) * 0.15);
      const aura = ctx.createRadialGradient(0, 0, bead.radius * 0.4, 0, 0, auraR);
      aura.addColorStop(0, 'rgba(255, 183, 3, 0.45)');
      aura.addColorStop(1, 'rgba(230, 57, 70, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, auraR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Main bead sphere / crystal body
    const grad = ctx.createRadialGradient(
      -bead.radius * 0.3,
      -bead.radius * 0.3,
      2,
      0,
      0,
      bead.radius
    );

    if (bead.isPhilosopherGem) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, PALETTE.amberGlass);
      grad.addColorStop(1, PALETTE.cinnabar);
    } else if (bead.isGoldCore) {
      grad.addColorStop(0, '#fff3b0');
      grad.addColorStop(0.5, PALETTE.amberGlass);
      grad.addColorStop(1, PALETTE.brassShadow);
    } else {
      grad.addColorStop(0, spec.secondaryColor);
      grad.addColorStop(0.65, spec.primaryColor);
      grad.addColorStop(1, '#1c1613');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    if (bead.isPhilosopherGem || bead.element === 'salt') {
      // Octagonal faceted crystal silhouette for Salt & Philosopher's Gems
      const sides = 8;
      for (let i = 0; i < sides; i++) {
        const a = bead.angle + (i * Math.PI * 2) / sides;
        const px = Math.cos(a) * bead.radius;
        const py = Math.sin(a) * bead.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.arc(0, 0, bead.radius, 0, Math.PI * 2);
    }
    ctx.fill();

    // Outer rim stroke (cracked lead geode vs wax barrier vs pure gold)
    if (bead.waxBarrier > 0) {
      ctx.strokeStyle = '#f4ece1';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = isDragged
        ? PALETTE.amberGlass
        : bead.isGoldCore
          ? '#fff3b0'
          : PALETTE.brassBurnished;
      ctx.lineWidth = isDragged ? 3 : 1.8;
      ctx.stroke();
    }

    // Alchemical symbol & Purity multiplier stamp on the bead
    ctx.fillStyle = bead.isGoldCore || bead.element === 'salt' || bead.element === 'aether' ? '#1c1613' : '#f4ece1';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(bead.isPhilosopherGem ? '◈' : bead.isGoldCore ? '☉' : spec.alchemicalSymbol, 0, 4);

    if (bead.purityRank > 1 || bead.loopBonus > 1) {
      const totalMult = bead.purityRank * bead.loopBonus;
      ctx.fillStyle = PALETTE.amberGlass;
      ctx.font = 'bold 10px Georgia, serif';
      ctx.fillText(`×${totalMult}`, 0, -bead.radius - 4);
    }

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    ctx.save();
    for (const p of sim.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawCruciblePressFront(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    const c = ZONES.crucible;
    ctx.save();

    // 1. Hairline Fractures Spiderwebbing on Smoked Glass when Pressure is high
    if (sim.hairlineCracks.length > 0) {
      ctx.strokeStyle = 'rgba(244, 236, 225, 0.78)';
      ctx.lineWidth = 1.6;
      for (const crack of sim.hairlineCracks) {
        ctx.beginPath();
        for (let i = 0; i < crack.points.length; i++) {
          const pt = crack.points[i];
          if (i === 0) ctx.moveTo(crack.x + pt.dx, crack.y + pt.dy);
          else ctx.lineTo(crack.x + pt.dx, crack.y + pt.dy);
        }
        ctx.stroke();
      }
    }

    // 2. Bolted Attachment 3: Cryo-Condenser Verdigris Copper Coils around vessel exterior
    if (sim.boltedAttachments.has('condenser')) {
      ctx.strokeStyle = sim.condenserPulseTimer > 0 ? '#8ee3d8' : PALETTE.verdigris;
      ctx.lineWidth = 5;
      for (let wy = c.top + 85; wy <= c.bottom - 75; wy += 65) {
        ctx.beginPath();
        ctx.moveTo(c.left - 6, wy);
        ctx.bezierCurveTo(c.left + 80, wy + 18, c.right - 80, wy - 18, c.right + 6, wy);
        ctx.stroke();
      }
    }

    // 3. Smoked-Glass Specular Highlight & Burnished Brass Vessel Frame
    ctx.strokeStyle = PALETTE.brassBurnished;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(c.left, c.top, c.right - c.left, c.bottom - c.top, 22);
    ctx.stroke();

    // Warm glass specular streak along left edge
    const glassStreak = ctx.createLinearGradient(c.left + 10, c.top, c.left + 38, c.top);
    glassStreak.addColorStop(0, 'rgba(244, 236, 225, 0.14)');
    glassStreak.addColorStop(1, 'rgba(244, 236, 225, 0)');
    ctx.fillStyle = glassStreak;
    ctx.fillRect(c.left + 10, c.top + 18, 28, c.bottom - c.top - 36);

    // 4. Bolted Attachment 1: Twin-Jaw Crusher at the Crucible Throat
    if (sim.boltedAttachments.has('crusher')) {
      const jawClosure = sim.crusherSnapTimer > 0 ? 26 : 0;
      ctx.fillStyle = PALETTE.brassBurnished;
      ctx.strokeStyle = PALETTE.brassHighlight;
      ctx.lineWidth = 2;
      ctx.fillRect(c.throatLeft + jawClosure, c.top + 10, 44, 22);
      ctx.fillRect(c.throatRight - 44 - jawClosure, c.top + 10, 44, 22);
      ctx.strokeRect(c.throatLeft + jawClosure, c.top + 10, 44, 22);
      ctx.strokeRect(c.throatRight - 44 - jawClosure, c.top + 10, 44, 22);
    }

    // 5. Rotating Alembic Prism Lens & Toothed Brass Ring
    const pr = ZONES.prismRing;
    ctx.strokeStyle = 'rgba(212, 155, 53, 0.45)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(pr.centerX, pr.centerY, pr.radius, 0, Math.PI * 2);
    ctx.stroke();

    const lensX = pr.centerX + Math.cos(sim.prismAngle) * pr.radius;
    const lensY = pr.centerY + Math.sin(sim.prismAngle) * pr.radius;
    ctx.beginPath();
    ctx.arc(lensX, lensY, 20, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.amberGlass;
    ctx.fill();
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = PALETTE.walnutDeep;
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('PRISM', lensX, lensY + 3);

    // 6. Spring-Loaded Shear-Blade Guillotine Handle (Upper-Left of Crucible)
    const sh = ZONES.shearHandle;
    const bladeExtend = sim.shearBladeSpring.position * 145;
    if (bladeExtend > 4) {
      ctx.fillStyle = '#dcd6c8';
      ctx.strokeStyle = PALETTE.brassBurnished;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.left, sh.y - 12);
      ctx.lineTo(c.left + bladeExtend, sh.y);
      ctx.lineTo(c.left, sh.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.copperWarm;
    ctx.fill();
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHEAR', sh.x, sh.y - 2);
    ctx.fillText('BLADE', sh.x, sh.y + 9);

    // 7. Crown Vent Clamp Stopper at Top of Crucible
    const vs = ZONES.ventStopper;
    const clampY = vs.y + sim.ventStopperSpring.position * 16;

    // Brass throat collar
    ctx.fillStyle = PALETTE.brassShadow;
    ctx.fillRect(c.throatLeft, c.top - 14, c.throatRight - c.throatLeft, 18);

    // Stopper cap
    ctx.beginPath();
    ctx.roundRect(vs.x - 42, clampY - 16, 84, 28, 8);
    ctx.fillStyle = sim.ventClamped ? PALETTE.cinnabar : PALETTE.verdigris;
    ctx.fill();
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(sim.ventClamped ? 'VENT CLAMPED' : 'VENT OPEN', vs.x, clampY + 2);

    ctx.restore();
  }

  private drawBourdonGauge(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    const g = ZONES.bourdonGauge;
    ctx.save();

    // Heavy cast-brass bezel
    ctx.beginPath();
    ctx.arc(g.centerX, g.centerY, g.radius + 9, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.brassBurnished;
    ctx.fill();
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Warm aged parchment dial face
    ctx.beginPath();
    ctx.arc(g.centerX, g.centerY, g.radius, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.parchment;
    ctx.fill();
    ctx.strokeStyle = PALETTE.brassShadow;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Colored pressure zones (Verdigris Safe -> Amber Yield Boost -> Cinnabar Rupture Redline)
    const startAngle = Math.PI * 0.75;
    const totalSweep = Math.PI * 1.5;

    ctx.lineWidth = 8;
    // Safe arc (0..5 Bar)
    ctx.strokeStyle = PALETTE.verdigris;
    ctx.beginPath();
    ctx.arc(g.centerX, g.centerY, g.radius - 12, startAngle, startAngle + totalSweep * 0.5);
    ctx.stroke();

    // Greed sweet spot (5..7.5 Bar)
    ctx.strokeStyle = PALETTE.amberGlass;
    ctx.beginPath();
    ctx.arc(
      g.centerX,
      g.centerY,
      g.radius - 12,
      startAngle + totalSweep * 0.5,
      startAngle + totalSweep * 0.75
    );
    ctx.stroke();

    // Redline danger zone (7.5..10 Bar)
    ctx.strokeStyle = PALETTE.cinnabar;
    ctx.beginPath();
    ctx.arc(g.centerX, g.centerY, g.radius - 12, startAngle + totalSweep * 0.75, startAngle + totalSweep);
    ctx.stroke();

    // Graduated tick marks
    ctx.strokeStyle = PALETTE.parchmentInk;
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 10; i++) {
      const a = startAngle + (i / 10) * totalSweep;
      const r1 = g.radius - 20;
      const r2 = g.radius - 6;
      ctx.beginPath();
      ctx.moveTo(g.centerX + Math.cos(a) * r1, g.centerY + Math.sin(a) * r1);
      ctx.lineTo(g.centerX + Math.cos(a) * r2, g.centerY + Math.sin(a) * r2);
      ctx.stroke();
    }

    // Dial typography & live Yield Multiplier
    ctx.fillStyle = PALETTE.parchmentInk;
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOURDON BAR', g.centerX, g.centerY - 20);

    const mult = sim.getPressureYieldMultiplier();
    ctx.fillStyle = sim.pressureBar >= 7.2 ? PALETTE.cinnabar : '#4a320d';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(`×${mult.toFixed(1)} YIELD`, g.centerX, g.centerY + 32);

    ctx.font = '10px Georgia, serif';
    ctx.fillText(`${sim.pressureBar.toFixed(1)} BAR`, g.centerX, g.centerY + 46);

    // Trembling Spring-Damper Brass Needle
    const needleAngle =
      startAngle + Math.max(0, Math.min(1.05, sim.bourdonNeedleSpring.position)) * totalSweep;
    ctx.save();
    ctx.translate(g.centerX, g.centerY);
    ctx.rotate(needleAngle);
    ctx.fillStyle = PALETTE.cinnabar;
    ctx.beginPath();
    ctx.moveTo(-12, -3);
    ctx.lineTo(g.radius - 14, 0);
    ctx.lineTo(-12, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    this.drawBrassRivet(ctx, g.centerX, g.centerY, 7);
    ctx.restore();
  }

  private drawDischargeLever(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    const dl = ZONES.dischargeLever;
    ctx.save();

    // Cast-brass housing plate
    ctx.fillStyle = '#18120e';
    ctx.strokeStyle = PALETTE.brassBurnished;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(dl.x - 74, dl.topY - 22, 148, dl.bottomY - dl.topY + 54, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.brassHighlight;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('DISCHARGE LEVER', dl.x, dl.topY - 6);

    // Slotted lever track
    ctx.fillStyle = '#0d0907';
    ctx.strokeStyle = PALETTE.brassShadow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(dl.x - 10, dl.topY + 8, 20, dl.bottomY - dl.topY - 8, 8);
    ctx.fill();
    ctx.stroke();

    // Spring-loaded Lever Handle position
    const knobY =
      dl.restY + sim.dischargeLeverSpring.position * (dl.bottomY - dl.restY);

    // Heavy grip bar
    ctx.fillStyle = PALETTE.cinnabar;
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(dl.x - 48, knobY - 16, 96, 32, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText('PULL TO BOTTLE', dl.x, knobY + 4);

    ctx.fillStyle = PALETTE.amberGlass;
    ctx.font = '10px Georgia, serif';
    ctx.fillText('Flushes to Assay Scale', dl.x, dl.bottomY + 22);

    ctx.restore();
  }

  private drawAttachmentMounts(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    const area = ZONES.attachmentsArea;
    ctx.save();

    ctx.fillStyle = PALETTE.brassHighlight;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `BOLT-ON WORKBENCH MECHANISMS (MINTED COINS: ${sim.walletCoins})`,
      area.x,
      area.y - 8
    );

    const slotH = 52;
    for (let i = 0; i < WORKBENCH_ATTACHMENTS.length; i++) {
      const spec = WORKBENCH_ATTACHMENTS[i];
      const isBolted = sim.boltedAttachments.has(spec.id);
      const canAfford = sim.walletCoins >= spec.costCoins;
      const sx = area.x;
      const sy = area.y + i * (slotH + 6);

      ctx.fillStyle = isBolted ? '#26332d' : '#1b1410';
      ctx.strokeStyle = isBolted
        ? PALETTE.verdigris
        : canAfford
          ? PALETTE.amberGlass
          : PALETTE.brassShadow;
      ctx.lineWidth = isBolted || canAfford ? 2.2 : 1.2;
      ctx.beginPath();
      ctx.roundRect(sx, sy, area.w, slotH, 7);
      ctx.fill();
      ctx.stroke();

      // Corner brass hex bolts
      this.drawBrassRivet(ctx, sx + 14, sy + 14, 4);
      this.drawBrassRivet(ctx, sx + 14, sy + slotH - 14, 4);

      ctx.fillStyle = isBolted ? '#8ee3d8' : PALETTE.parchment;
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText(spec.name, sx + 28, sy + 20);

      ctx.fillStyle = 'rgba(244, 236, 225, 0.78)';
      ctx.font = '10.5px Georgia, serif';
      ctx.fillText(spec.description, sx + 28, sy + 38, area.w - 118);

      // Action / Bolt Button on right of plate
      const btnX = sx + area.w - 84;
      const btnY = sy + 10;
      ctx.fillStyle = isBolted
        ? PALETTE.verdigris
        : canAfford
          ? PALETTE.brassBurnished
          : '#382b22';
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, 76, 32, 6);
      ctx.fill();

      ctx.fillStyle = isBolted || canAfford ? '#1c1613' : PALETTE.parchmentDark;
      ctx.font = 'bold 10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isBolted ? spec.verbLabel : `BOLT (${spec.costCoins}🪙)`,
        btnX + 38,
        btnY + 20
      );
    }

    ctx.restore();
  }

  private drawAssayBalanceScale(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    const sc = ZONES.assayScale;
    ctx.save();

    // Recessed framing panel
    ctx.fillStyle = '#16110d';
    ctx.strokeStyle = PALETTE.brassShadow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(874, 488, 368, 238, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.brassHighlight;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('PHYSICAL ASSAY BALANCE SCALE & MINTED COIN TRAY', 888, 508);

    // Ornate central brass pillar & base
    ctx.fillStyle = PALETTE.brassBurnished;
    ctx.fillRect(sc.centerX - 6, sc.centerY - 40, 12, 118);
    ctx.fillRect(sc.centerX - 48, sc.centerY + 74, 96, 14);

    // Oscillating Balance Beam (tilts via Hooke's-law assayBeamSpring)
    const tilt = sim.assayBeamSpring.position;
    const leftPanX = sc.centerX - Math.cos(tilt) * sc.beamHalfWidth;
    const leftPanY = sc.centerY - 36 - Math.sin(tilt) * sc.beamHalfWidth;
    const rightPanX = sc.centerX + Math.cos(tilt) * sc.beamHalfWidth;
    const rightPanY = sc.centerY - 36 + Math.sin(tilt) * sc.beamHalfWidth;

    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(leftPanX, leftPanY);
    ctx.lineTo(rightPanX, rightPanY);
    ctx.stroke();
    this.drawBrassRivet(ctx, sc.centerX, sc.centerY - 36, 7);

    // Left Pan: Minted Brass Coins Pan
    this.drawSuspendedScalePan(ctx, leftPanX, leftPanY, 'MINTED YIELD');

    // Stack of minted brass coins resting on the left pan
    const coinCount = Math.min(14, sim.commissionCoinsEarned);
    for (let i = 0; i < coinCount; i++) {
      const cx = leftPanX - 18 + (i % 3) * 18;
      const cy = leftPanY + 48 - Math.floor(i / 3) * 6;
      ctx.fillStyle = PALETTE.amberGlass;
      ctx.strokeStyle = PALETTE.brassShadow;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 9, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Right Pan: Patron's Quota Counterweight
    this.drawSuspendedScalePan(ctx, rightPanX, rightPanY, 'QUOTA WEIGHT');
    ctx.fillStyle = PALETTE.brassShadow;
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rightPanX - 18, rightPanY + 28, 36, 24, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${sim.currentCommission.quotaCoins}🪙`, rightPanX, rightPanY + 44);

    // Assay summary readout at bottom of scale box
    ctx.fillStyle = PALETTE.parchment;
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Minted Purse: ${sim.walletCoins} Coins  ·  Total Distilled: ${sim.totalCoinsMinted} Coins`,
      sc.centerX,
      712
    );

    ctx.restore();
  }

  private drawSuspendedScalePan(
    ctx: CanvasRenderingContext2D,
    anchorX: number,
    anchorY: number,
    label: string
  ): void {
    const panY = anchorY + 54;
    ctx.strokeStyle = 'rgba(243, 201, 105, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(anchorX - 34, panY);
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(anchorX + 34, panY);
    ctx.stroke();

    ctx.fillStyle = PALETTE.brassBurnished;
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(anchorX, panY, 36, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.parchmentDark;
    ctx.font = '9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, anchorX, panY + 24);
  }

  private drawCursorSpringTether(ctx: CanvasRenderingContext2D, sim: CrucibleWorkbenchSim): void {
    if (sim.draggedBeadId === null) return;
    const bead = sim.beads.find((b) => b.id === sim.draggedBeadId);
    if (!bead) return;

    ctx.save();
    // Draw damped brass spring tether connecting cursor hand to heavy lagging bead
    ctx.strokeStyle = PALETTE.amberGlass;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(sim.cursorSpring.targetX, sim.cursorSpring.targetY);
    ctx.lineTo(bead.x, bead.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Brass caliper ring around cursor target
    ctx.beginPath();
    ctx.arc(sim.cursorSpring.targetX, sim.cursorSpring.targetY, 10, 0, Math.PI * 2);
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  private drawEngravedBrassFooter(
    ctx: CanvasRenderingContext2D,
    sim: CrucibleWorkbenchSim,
    debug: boolean
  ): void {
    ctx.save();
    const plateW = 460;
    const plateX = ZONES.crucible.centerX - plateW * 0.5;
    const plateY = 696;

    ctx.fillStyle = '#241a14';
    ctx.strokeStyle = PALETTE.brassBurnished;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(plateX, plateY, plateW, 42, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.parchment;
    ctx.font = '11.5px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(sim.statusBannerText, ZONES.crucible.centerX, plateY + 18, plateW - 24);

    ctx.fillStyle = PALETTE.brassHighlight;
    ctx.font = '10px Georgia, serif';
    const subtext = debug
      ? `DEBUG · Seed: ${sim.seed} · Beads: ${sim.beads.length} · Temp: ${sim.vesselHeat.toFixed(0)}°C · Baffle: ${(sim.baffleIntegrity * 100).toFixed(0)}%`
      : 'Shortcuts: [Space] Bellows · [C] Shear-Blade · [V] Vent Clamp · [Enter] Discharge · [R] Chute Supply';
    ctx.fillText(subtext, ZONES.crucible.centerX, plateY + 34);

    ctx.restore();
  }

  private drawBrassRivet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.brassBurnished;
    ctx.fill();
    ctx.strokeStyle = PALETTE.brassHighlight;
    ctx.lineWidth = 1.5;
    ctx.stroke();
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
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line.trim()) {
      ctx.fillText(line.trim(), x, curY);
    }
  }
}
