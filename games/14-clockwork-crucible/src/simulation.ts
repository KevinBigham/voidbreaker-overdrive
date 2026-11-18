import { CrucibleFoleyEngine } from './audio';
import {
  type AttachmentId,
  COMMISSIONS,
  type CommissionOrder,
  type GalvanicArc,
  type HairlineCrack,
  type MintedCoinVisual,
  type PendingAssayCoin,
  REAGENT_SPECS,
  type ReagentBead,
  type ReagentElement,
  type Spring1D,
  type Spring2D,
  WORKBENCH_ATTACHMENTS,
  type WorkbenchParticle,
} from './types';

export const WORKBENCH_WIDTH = 1280;
export const WORKBENCH_HEIGHT = 760;

export const ZONES = {
  parchment: { x: 34, y: 24, w: 336, h: 218 },
  chute: { x: 38, y: 262, w: 330, h: 196 },
  dispenserLever: { x: 76, y: 304, r: 24 },
  weighingPan: { x: 58, y: 548, w: 120, h: 24, centerX: 118, baseY: 558 },
  copperAnvil: { x: 214, y: 545, w: 124, h: 52, centerX: 276, topY: 545 },
  bellowsHandle: { x: 382, y: 560, w: 54, h: 120, restY: 565, maxPullY: 660 },
  crucible: {
    left: 468,
    right: 812,
    top: 152,
    bottom: 604,
    centerX: 640,
    centerY: 385,
    throatLeft: 535,
    throatRight: 745,
    baffleY: 392,
  },
  ventStopper: { x: 640, y: 112, r: 28 },
  shearHandle: { x: 450, y: 265, r: 26 },
  prismRing: { centerX: 640, centerY: 385, radius: 186 },
  bourdonGauge: { centerX: 958, centerY: 142, radius: 74 },
  dischargeLever: { x: 1148, topY: 78, bottomY: 206, restY: 92 },
  attachmentsArea: { x: 874, y: 246, w: 368, h: 228 },
  assayScale: { centerX: 1058, centerY: 598, beamHalfWidth: 112 },
} as const;

export function stepSpring1D(spring: Spring1D, dt: number): void {
  const safeDt = Math.min(dt, 0.033);
  const force = -spring.stiffness * (spring.position - spring.target) - spring.damping * spring.velocity;
  spring.velocity += force * safeDt;
  spring.position += spring.velocity * safeDt;
}

export function stepSpring2D(spring: Spring2D, dt: number): void {
  const safeDt = Math.min(dt, 0.033);
  const fx = -spring.stiffness * (spring.x - spring.targetX) - spring.damping * spring.vx;
  const fy = -spring.stiffness * (spring.y - spring.targetY) - spring.damping * spring.vy;
  spring.vx += fx * safeDt;
  spring.vy += fy * safeDt;
  spring.x += spring.vx * safeDt;
  spring.y += spring.vy * safeDt;
}

export class CrucibleWorkbenchSim {
  public seed: number;
  private rngState: number;
  public foley: CrucibleFoleyEngine;

  // Progression & Economy
  public commissionIndex = 0;
  public currentCommission: CommissionOrder = COMMISSIONS[0];
  public commissionCoinsEarned = 0;
  public walletCoins = 0;
  public totalCoinsMinted = 0;
  public completedCommissions = 0;
  public statusBannerText = 'Grab the Lead Geode & Cinnabar from the chute and drop them into the Crucible.';
  public statusBannerTimer = 0;

  // Reagents, Arcs, Cracks, Particles
  public beads: ReagentBead[] = [];
  private nextBeadId = 1;
  public galvanicArcs: GalvanicArc[] = [];
  public hairlineCracks: HairlineCrack[] = [];
  public particles: WorkbenchParticle[] = [];
  public pendingAssayCoins: PendingAssayCoin[] = [];
  public mintedCoinsVisual: MintedCoinVisual[] = [];

  // Crucible Physical State
  public pressureBar = 0.4; // 0.0 to 10.0 Bar
  public maxPressureBar = 10.0;
  public pressureFrozenTimer = 0;
  public vesselHeat = 22; // Ambient 22°C up to 120°C
  public ventClamped = false; // False = safely vented, True = clamped for Push-Your-Luck Bar multiplier
  public baffleIntegrity = 1.0; // Corroded by hot unvented Vitriol
  public activeLoopMultiplier = 1; // 1, 3 (Triangle), or 5 (Quad+)
  public lastAssayYield = 0;
  public stampAnimation = 0;

  // Physical Mechanisms & Spring-Dampers
  public cursorSpring: Spring2D = {
    x: 640,
    y: 380,
    vx: 0,
    vy: 0,
    targetX: 640,
    targetY: 380,
    stiffness: 240,
    damping: 18,
  };
  public draggedBeadId: number | null = null;
  public activeControlDrag:
    | null
    | 'bellows'
    | 'discharge'
    | 'shear'
    | 'prism'
    | 'chute_lever' = null;

  public weighingPanSpring: Spring1D = {
    position: 0,
    velocity: 0,
    target: 0,
    stiffness: 175,
    damping: 9.5,
  };
  public lastWeighedMass = 0;
  public lastWeighedName = 'Empty Pan';

  public bellowsSpring: Spring1D = {
    position: 0, // 0 = up, 1 = fully depressed
    velocity: 0,
    target: 0,
    stiffness: 140,
    damping: 12,
  };

  public dischargeLeverSpring: Spring1D = {
    position: 0, // 0 = top rest, 1 = pulled down
    velocity: 0,
    target: 0,
    stiffness: 160,
    damping: 13,
  };

  public shearBladeSpring: Spring1D = {
    position: 0, // 0 = retracted, 1 = extended across chamber
    velocity: 0,
    target: 0,
    stiffness: 220,
    damping: 14,
  };

  public chuteLeverSpring: Spring1D = {
    position: 0,
    velocity: 0,
    target: 0,
    stiffness: 190,
    damping: 13,
  };

  public ventStopperSpring: Spring1D = {
    position: 0, // 0 = open, 1 = clamped down
    velocity: 0,
    target: 0,
    stiffness: 210,
    damping: 15,
  };

  public bourdonNeedleSpring: Spring1D = {
    position: 0.04, // Normalized 0..1 of dial
    velocity: 0,
    target: 0.04,
    stiffness: 190,
    damping: 8.5,
  };

  public assayBeamSpring: Spring1D = {
    position: 0, // Tilt angle in radians (-0.28 to +0.28)
    velocity: 0,
    target: -0.12,
    stiffness: 130,
    damping: 7.5,
  };

  // Prism Lens angle in radians around the crucible perimeter
  public prismAngle = -Math.PI * 0.25;
  public prismTargetAngle = -Math.PI * 0.25;
  private lastPrismDetentIndex = 0;

  // Bolted Workbench Attachments
  public boltedAttachments: Set<AttachmentId> = new Set();
  public centrifugeSpinTimer = 0;
  public centrifugeAngle = 0;
  public crusherSnapTimer = 0;
  public condenserPulseTimer = 0;
  public lodestonePulseTimer = 0;

  private gaugeTickAccumulator = 0;
  private assayCoinStepCounter = 0;

  constructor(seed = 20261108, foley = new CrucibleFoleyEngine()) {
    this.seed = seed;
    this.rngState = seed >>> 0 || 1;
    this.foley = foley;
    this.bootWorkbench();
  }

  public nextRandom(): number {
    let t = (this.rngState += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public resetWithSeed(seed: number): void {
    this.seed = seed;
    this.rngState = seed >>> 0 || 1;
    this.commissionIndex = 0;
    this.walletCoins = 0;
    this.totalCoinsMinted = 0;
    this.completedCommissions = 0;
    this.boltedAttachments.clear();
    this.bootWorkbench();
  }

  /**
   * Boots directly into the live workbench in < 1 second with Commission 1 ("Crack & Distill.")
   * and starter Cinnabar + Lead Geode waiting in the brass chute.
   */
  public bootWorkbench(): void {
    this.beads = [];
    this.galvanicArcs = [];
    this.hairlineCracks = [];
    this.particles = [];
    this.pendingAssayCoins = [];
    this.mintedCoinsVisual = [];
    this.pressureBar = 0.5;
    this.vesselHeat = 24;
    this.ventClamped = false;
    this.ventStopperSpring.target = 0;
    this.ventStopperSpring.position = 0;
    this.baffleIntegrity = 1.0;
    this.loadCommission(0);
  }

  public loadCommission(index: number): void {
    const safeIdx = Math.max(0, Math.min(COMMISSIONS.length - 1, index));
    this.commissionIndex = index;
    const template = COMMISSIONS[safeIdx];
    const extraScale = index >= COMMISSIONS.length ? Math.pow(1.45, index - COMMISSIONS.length + 1) : 1;
    this.currentCommission = {
      ...template,
      level: index + 1,
      quotaCoins: Math.round(template.quotaCoins * extraScale),
    };
    this.commissionCoinsEarned = 0;
    this.stampAnimation = 1.0;

    // Ensure starter beads are waiting in the brass chute
    const chuteBeads = this.beads.filter((b) => b.zone === 'chute');
    if (chuteBeads.length < 2) {
      this.currentCommission.starterBeads.forEach((spec, idx) => {
        this.spawnBeadInChute(spec.element, idx, Boolean(spec.hasWax));
      });
    }

    this.statusBannerText = `Commission #${this.currentCommission.level}: "${this.currentCommission.title}" — ${this.currentCommission.note}`;
    this.statusBannerTimer = 6.0;
  }

  public spawnBeadInChute(
    element: ReagentElement,
    slotOffset = 0,
    hasWax = false,
    zone: ReagentBead['zone'] = 'chute',
    customPos?: { x: number; y: number }
  ): ReagentBead {
    const spec = REAGENT_SPECS[element];
    const chuteCount = this.beads.filter((b) => b.zone === 'chute').length;
    const idx = slotOffset || chuteCount;
    const x = customPos ? customPos.x : ZONES.chute.x + 115 + (idx % 4) * 52;
    const y = customPos ? customPos.y : ZONES.chute.y + 88 + (idx % 4) * 14;

    const bead: ReagentBead = {
      id: this.nextBeadId++,
      element,
      x,
      y,
      vx: (this.nextRandom() - 0.5) * 18,
      vy: 0,
      radius: spec.radius,
      mass: spec.mass,
      temperature: element === 'cinnabar' ? 68 : 22,
      baseCoins: spec.baseCoins,
      purityRank: 1,
      shellIntegrity: element === 'lead' ? 1.0 : 0,
      isGoldCore: false,
      isPhilosopherGem: false,
      waxBarrier: hasWax ? 1.0 : 0,
      zone,
      angle: this.nextRandom() * Math.PI * 2,
      angularVelocity: 0,
      flashTimer: 0.35,
      loopBonus: 1,
    };
    this.beads.push(bead);
    return bead;
  }

  /**
   * Dispenses a fresh set of reagents into the brass chute when the player pulls the Chute Dispenser Lever
   * or clicks an elemental hopper button.
   */
  public dispenseChuteSupply(preferredElement?: ReagentElement): void {
    this.chuteLeverSpring.velocity = 14;
    this.foley.playRatchetClick(0.95, 1.1);

    const activeBeads = this.beads.filter((b) => b.zone !== 'discharging');
    if (activeBeads.length >= 12) {
      // Remove oldest slag/chute bead if crowded
      const chuteBead = this.beads.find((b) => b.zone === 'chute');
      if (chuteBead) {
        this.beads = this.beads.filter((b) => b.id !== chuteBead.id);
      }
    }

    if (preferredElement) {
      const bead = this.spawnBeadInChute(preferredElement, 0, false);
      this.foley.playBeadClink(bead.radius, bead.mass, 150);
      return;
    }

    const pool = this.currentCommission.availableElements;
    // Always ensure at least one lead geode and one reactive element
    const el1 = pool[Math.floor(this.nextRandom() * pool.length)];
    const el2 = pool.includes('lead') && el1 !== 'lead' ? 'lead' : pool[(pool.indexOf(el1) + 1) % pool.length];
    const b1 = this.spawnBeadInChute(el1, 0, this.currentCommission.level >= 4 && el1 === 'lead');
    const b2 = this.spawnBeadInChute(el2, 1, false);
    this.foley.playBeadClink(b1.radius, b1.mass, 160);
    this.foley.playBeadClink(b2.radius, b2.mass, 140);
  }

  /**
   * Physical Verb 1: Pump the weighted Brass Bellows Lever.
   * Injects thermal air and embers into the Crucible, raising reagent temperature and internal Bar pressure.
   */
  public pumpBellows(intensity = 1.0): void {
    this.bellowsSpring.position = Math.min(1.0, this.bellowsSpring.position + 0.65 * intensity);
    this.bellowsSpring.velocity = 4.5 * intensity;
    this.foley.playBellowsPump(intensity);
    this.foley.playRatchetClick(0.82, 1.2);

    this.vesselHeat = Math.min(135, this.vesselHeat + 18 * intensity);
    const pressureAdd = this.ventClamped ? 1.15 * intensity : 0.45 * intensity;
    this.pressureBar = Math.min(this.maxPressureBar, this.pressureBar + pressureAdd);

    // Heat all beads inside the crucible and give them an updraft kick
    for (const bead of this.beads) {
      if (bead.zone === 'crucible') {
        bead.temperature = Math.min(130, bead.temperature + 24 * intensity);
        bead.vy -= (140 / bead.mass) * intensity;
        bead.vx += (this.nextRandom() - 0.5) * 90;

        if (bead.waxBarrier > 0 && bead.temperature >= 55) {
          bead.waxBarrier = Math.max(0, bead.waxBarrier - 0.65);
        }
        // High heat cracks brittle Lead Geodes if wax is melted!
        if (bead.element === 'lead' && !bead.isGoldCore && bead.waxBarrier <= 0 && bead.temperature >= 76) {
          this.crackLeadGeode(bead, 'thermal');
        }
      }
    }

    // Spawn rising ember particles from the bottom firebox
    for (let i = 0; i < 12; i++) {
      this.spawnParticle(
        ZONES.crucible.centerX + (this.nextRandom() - 0.5) * 220,
        ZONES.crucible.bottom - 12,
        (this.nextRandom() - 0.5) * 60,
        -110 - this.nextRandom() * 120,
        4 + this.nextRandom() * 3,
        0.75,
        '#ffb703',
        'ember'
      );
    }
  }

  /**
   * Physical Verb 2: Pull the spring-loaded Shear-Blade Guillotine Handle.
   * Cleaves any Lead Geode or large crystal inside the crucible, exposing Gold Cores or splitting crystals.
   */
  public pullShearBlade(): void {
    this.shearBladeSpring.position = 1.0;
    this.shearBladeSpring.velocity = 12;
    this.foley.playCrystalCleave();

    let cleavedAny = false;
    const newlySplit: ReagentBead[] = [];

    for (const bead of this.beads) {
      if (bead.zone !== 'crucible') continue;
      // Check if in crucible upper/mid zone or general chamber
      if (bead.element === 'lead' && !bead.isGoldCore) {
        bead.waxBarrier = 0;
        this.crackLeadGeode(bead, 'shear');
        cleavedAny = true;
      } else if (bead.radius >= 15 && this.beads.length + newlySplit.length < 14) {
        // Cleave an unstable crystal/bead in two energized halves with higher purity!
        bead.purityRank = Math.min(6, bead.purityRank + 1);
        bead.flashTimer = 0.5;
        bead.vx -= 85;
        bead.vy -= 60;
        cleavedAny = true;

        if (bead.element === 'cinnabar' || bead.element === 'aether' || bead.element === 'salt') {
          const twin = this.spawnBeadInChute(bead.element, 0, false, 'crucible', {
            x: Math.min(ZONES.crucible.right - 30, bead.x + 24),
            y: bead.y,
          });
          twin.vx = 85;
          twin.vy = -60;
          twin.radius = Math.max(12, Math.round(bead.radius * 0.86));
          twin.purityRank = bead.purityRank;
          twin.temperature = bead.temperature;
          newlySplit.push(twin);
        }
      }
    }

    if (cleavedAny) {
      this.pressureBar = Math.min(this.maxPressureBar, this.pressureBar + 0.55);
      this.statusBannerText = 'Shear-Blade cleaved reagent core! Purity yield stepped up.';
      this.statusBannerTimer = 3.0;
    }
  }

  /**
   * Physical Verb 3: Toggle the Crown Vent Clamp Stopper.
   * Clamping traps internal pressure to multiply yield; opening vents excess Bar steam safely.
   */
  public toggleVentClamp(forceState?: boolean): void {
    this.ventClamped = forceState !== undefined ? forceState : !this.ventClamped;
    this.ventStopperSpring.target = this.ventClamped ? 1 : 0;
    this.ventStopperSpring.velocity = this.ventClamped ? 8 : -8;
    this.foley.playRatchetClick(this.ventClamped ? 0.75 : 1.15, 1.3);

    if (!this.ventClamped && this.pressureBar > 1.0) {
      this.foley.playSteamHiss(this.pressureBar, 0.38, 0.16);
      this.pressureBar = Math.max(0.6, this.pressureBar - 2.2);
      this.baffleIntegrity = Math.min(1.0, this.baffleIntegrity + 0.35);
      for (let i = 0; i < 14; i++) {
        this.spawnParticle(
          ZONES.ventStopper.x + (this.nextRandom() - 0.5) * 32,
          ZONES.ventStopper.y - 10,
          (this.nextRandom() - 0.5) * 90,
          -95 - this.nextRandom() * 90,
          6 + this.nextRandom() * 5,
          0.8,
          '#f4ece1',
          'steam'
        );
      }
    }
  }

  /**
   * Physical Verb 4: Rotate the Alembic Prism Lens around the Crucible perimeter.
   */
  public rotatePrismToAngle(angleRad: number): void {
    this.prismTargetAngle = angleRad;
    this.prismAngle = angleRad;
    const detentIndex = Math.round((angleRad / (Math.PI * 2)) * 24);
    if (detentIndex !== this.lastPrismDetentIndex) {
      this.lastPrismDetentIndex = detentIndex;
      this.foley.playRatchetClick(1.18, 0.65);
    }
  }

  /**
   * Physical Verb 5: Pull the Heavy Brass Discharge Release Lever.
   * Flushes all reagents in the Crucible through the Assay Scales, minting brass coins one-by-one.
   */
  public pullDischargeLever(): number {
    this.dischargeLeverSpring.position = 1.0;
    this.dischargeLeverSpring.velocity = 10;
    this.foley.playRatchetClick(0.7, 1.5);
    this.foley.playSteamHiss(this.pressureBar, 0.35, 0.15);

    const crucibleBeads = this.beads.filter((b) => b.zone === 'crucible');
    if (crucibleBeads.length === 0) {
      this.statusBannerText = 'Crucible chamber is empty — drop reagents inside before discharging!';
      this.statusBannerTimer = 3.0;
      return 0;
    }

    // Calculate pressure multiplier: 1.0x at 0 Bar up to 3.5x at 9+ Bar when clamped
    const pressureMult = this.getPressureYieldMultiplier();
    let totalMinted = 0;

    for (const bead of crucibleBeads) {
      // Base value + Gold Core bonus + Philosopher Gem bonus
      let base = bead.baseCoins;
      if (bead.isGoldCore) base += 3;
      if (bead.isPhilosopherGem) base += 5;

      const rawCoinVal = base * bead.purityRank * bead.loopBonus * pressureMult;
      const coinsForBead = Math.max(1, Math.round(rawCoinVal));
      totalMinted += coinsForBead;

      // Burst of golden assay particles
      for (let i = 0; i < 8; i++) {
        this.spawnParticle(
          bead.x,
          bead.y,
          (this.nextRandom() - 0.5) * 120,
          40 + this.nextRandom() * 90,
          4,
          0.65,
          '#ffb703',
          'gold'
        );
      }
    }

    // Remove discharged beads from the crucible
    this.beads = this.beads.filter((b) => b.zone !== 'crucible');
    this.galvanicArcs = [];
    this.activeLoopMultiplier = 1;
    this.lastAssayYield = totalMinted;

    // Queue individual coin-weights to clink onto the Assay Balance Scale
    const visualCoinDrops = Math.min(18, totalMinted);
    const valuePerDrop = Math.max(1, Math.floor(totalMinted / visualCoinDrops));
    let remainder = totalMinted - valuePerDrop * visualCoinDrops;

    for (let i = 0; i < visualCoinDrops; i++) {
      const coinVal = valuePerDrop + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      this.pendingAssayCoins.push({
        value: coinVal,
        delay: i * 0.085,
        label: `+${coinVal}`,
      });
    }

    // Reset pressure & heal hairline cracks slightly after safe discharge
    this.pressureBar = 0.5;
    this.vesselHeat = 28;
    if (this.hairlineCracks.length > 0) {
      this.hairlineCracks.pop();
    }

    // Replenish the supply chute for the next cycle
    this.dispenseChuteSupply();

    this.statusBannerText = `Assaying Concoction: +${totalMinted} Brass Coins (${pressureMult.toFixed(1)}× Pressure Yield)!`;
    this.statusBannerTimer = 4.0;
    return totalMinted;
  }

  /**
   * Bolts a permanent physical mechanism onto the workbench using minted coins,
   * or triggers it if already bolted!
   */
  public interactAttachment(id: AttachmentId): boolean {
    const spec = WORKBENCH_ATTACHMENTS.find((a) => a.id === id);
    if (!spec) return false;

    if (!this.boltedAttachments.has(id)) {
      if (this.walletCoins < spec.costCoins) {
        this.foley.playRatchetClick(0.6, 0.5);
        this.statusBannerText = `Need ${spec.costCoins} Minted Coins to bolt the ${spec.name} (Have ${this.walletCoins}).`;
        this.statusBannerTimer = 3.0;
        return false;
      }
      this.walletCoins -= spec.costCoins;
      this.boltedAttachments.add(id);
      this.foley.playRatchetClick(0.85, 1.5);
      this.foley.playAssayChime(4);
      this.statusBannerText = `Bolted ${spec.name} onto the Workbench! Click it anytime to ${spec.verbLabel}.`;
      this.statusBannerTimer = 4.0;
      this.activateAttachmentMechanism(id);
      return true;
    }

    this.activateAttachmentMechanism(id);
    return true;
  }

  public activateAttachmentMechanism(id: AttachmentId): void {
    if (!this.boltedAttachments.has(id)) return;

    if (id === 'crusher') {
      this.crusherSnapTimer = 0.55;
      this.foley.playCrystalCleave();
      for (const bead of this.beads) {
        if (bead.zone === 'crucible' || bead.zone === 'chute') {
          if (bead.element === 'lead' && !bead.isGoldCore) {
            bead.zone = 'crucible';
            bead.x = ZONES.crucible.centerX + (this.nextRandom() - 0.5) * 80;
            bead.y = ZONES.crucible.top + 60;
            bead.waxBarrier = 0;
            this.crackLeadGeode(bead, 'crusher');
          }
        }
      }
    } else if (id === 'centrifuge') {
      this.centrifugeSpinTimer = 3.5;
      this.foley.playRatchetClick(1.25, 1.2);
      for (const bead of this.beads) {
        if (bead.zone === 'crucible') {
          const dx = bead.x - ZONES.crucible.centerX;
          const dy = bead.y - ZONES.crucible.centerY;
          bead.vx += -dy * 1.8 + (this.nextRandom() - 0.5) * 140;
          bead.vy += dx * 1.8 - 110;
          bead.purityRank = Math.min(6, bead.purityRank + 1);
        }
      }
    } else if (id === 'condenser') {
      this.condenserPulseTimer = 0.8;
      this.pressureBar = Math.max(0.4, this.pressureBar - 2.8);
      this.baffleIntegrity = 1.0;
      this.foley.playSteamHiss(2.0, 0.35, 0.14);
      // Condenses excess steam directly into a conductive Aether droplet inside the crucible!
      if (this.beads.filter((b) => b.zone === 'crucible').length < 10) {
        const drop = this.spawnBeadInChute('aether', 0, false, 'crucible', {
          x: ZONES.crucible.centerX + (this.nextRandom() - 0.5) * 70,
          y: ZONES.crucible.top + 55,
        });
        drop.purityRank = 2;
      }
    } else if (id === 'lodestone') {
      this.lodestonePulseTimer = 2.5;
      this.foley.playGalvanicResonance(5);
      // Pulls all crucible beads into a tight geometric ring at the center and boosts their purity
      const crucibleBeads = this.beads.filter((b) => b.zone === 'crucible');
      crucibleBeads.forEach((b, idx) => {
        const theta = (idx / Math.max(1, crucibleBeads.length)) * Math.PI * 2;
        const targetX = ZONES.crucible.centerX + Math.cos(theta) * 62;
        const targetY = ZONES.crucible.centerY + Math.sin(theta) * 62;
        b.vx = (targetX - b.x) * 5;
        b.vy = (targetY - b.y) * 5;
        b.purityRank = Math.min(6, b.purityRank + 1);
      });
    }
  }

  public getPressureYieldMultiplier(): number {
    const baseMult = 1 + (this.pressureBar / this.maxPressureBar) * 2.0;
    const clampBonus = this.ventClamped && this.pressureBar >= 3.0 ? 0.5 : 0;
    return Number((baseMult + clampBonus).toFixed(2));
  }

  public crackLeadGeode(bead: ReagentBead, cause: 'impact' | 'shear' | 'acid' | 'thermal' | 'crusher'): void {
    if (bead.isGoldCore) return;
    bead.shellIntegrity = 0;
    bead.isGoldCore = true;
    bead.baseCoins = Math.max(bead.baseCoins, 5);
    bead.purityRank = Math.max(2, bead.purityRank + 1);
    bead.flashTimer = 0.65;
    this.foley.playCrystalCleave();

    const color = cause === 'acid' ? '#2a9d8f' : '#ffb703';
    for (let i = 0; i < 12; i++) {
      this.spawnParticle(
        bead.x,
        bead.y,
        (this.nextRandom() - 0.5) * 160,
        (this.nextRandom() - 0.5) * 160,
        4 + this.nextRandom() * 3,
        0.6,
        color,
        cause === 'acid' ? 'acid' : 'gold'
      );
    }

    this.pressureBar = Math.min(this.maxPressureBar, this.pressureBar + 0.45);
  }

  public crystallizeWithSalt(saltBead: ReagentBead, partner: ReagentBead): void {
    if (partner.isPhilosopherGem && saltBead.isPhilosopherGem) return;
    partner.isPhilosopherGem = true;
    partner.isGoldCore = true;
    partner.purityRank = Math.min(8, Math.max(partner.purityRank + 2, 4));
    partner.baseCoins += 4;
    partner.flashTimer = 0.85;

    // Philosopher's Salt freezes current reactions/pressure spikes safely
    this.pressureFrozenTimer = 4.0;
    this.pressureBar = Math.max(0.8, this.pressureBar - 1.4);
    this.baffleIntegrity = 1.0;

    // Consume the salt crystal into the new Philosopher's Gem
    this.beads = this.beads.filter((b) => b.id !== saltBead.id);
    this.foley.playGalvanicResonance(5);

    for (let i = 0; i < 16; i++) {
      this.spawnParticle(
        partner.x,
        partner.y,
        (this.nextRandom() - 0.5) * 150,
        (this.nextRandom() - 0.5) * 150,
        5,
        0.75,
        '#f4ece1',
        'crystallize'
      );
    }

    this.statusBannerText = "Philosopher's Salt crystallized a Sovereign Gem & stabilized vessel pressure!";
    this.statusBannerTimer = 3.5;
  }

  public spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number,
    maxLife: number,
    color: string,
    kind: WorkbenchParticle['kind']
  ): void {
    if (this.particles.length > 140) {
      this.particles.shift();
    }
    this.particles.push({
      x,
      y,
      vx,
      vy,
      radius,
      life: maxLife,
      maxLife,
      color,
      kind,
    });
  }

  /**
   * Main 60fps simulation tick.
   */
  public step(dt: number): void {
    const safeDt = Math.min(0.033, Math.max(0.001, dt));

    if (this.statusBannerTimer > 0) {
      this.statusBannerTimer = Math.max(0, this.statusBannerTimer - safeDt);
    }
    if (this.stampAnimation > 0) {
      this.stampAnimation = Math.max(0, this.stampAnimation - safeDt * 1.8);
    }
    if (this.pressureFrozenTimer > 0) {
      this.pressureFrozenTimer = Math.max(0, this.pressureFrozenTimer - safeDt);
    }
    if (this.centrifugeSpinTimer > 0) {
      this.centrifugeSpinTimer = Math.max(0, this.centrifugeSpinTimer - safeDt);
      this.centrifugeAngle += safeDt * 9.5;
    }
    if (this.crusherSnapTimer > 0) {
      this.crusherSnapTimer = Math.max(0, this.crusherSnapTimer - safeDt);
    }
    if (this.condenserPulseTimer > 0) {
      this.condenserPulseTimer = Math.max(0, this.condenserPulseTimer - safeDt);
    }
    if (this.lodestonePulseTimer > 0) {
      this.lodestonePulseTimer = Math.max(0, this.lodestonePulseTimer - safeDt);
    }

    // 1. Step all Hooke's-law spring mechanisms
    if (this.activeControlDrag !== 'bellows') {
      this.bellowsSpring.target = 0;
    }
    if (this.activeControlDrag !== 'discharge') {
      this.dischargeLeverSpring.target = 0;
    }
    this.shearBladeSpring.target = 0;
    this.chuteLeverSpring.target = 0;

    stepSpring2D(this.cursorSpring, safeDt);
    stepSpring1D(this.weighingPanSpring, safeDt);
    stepSpring1D(this.bellowsSpring, safeDt);
    stepSpring1D(this.dischargeLeverSpring, safeDt);
    stepSpring1D(this.shearBladeSpring, safeDt);
    stepSpring1D(this.chuteLeverSpring, safeDt);
    stepSpring1D(this.ventStopperSpring, safeDt);

    // 2. Step Pending Assay Scale Coin Drops (Balatro-style physical coin cascade)
    this.stepAssayScaleQueue(safeDt);
    stepSpring1D(this.assayBeamSpring, safeDt);

    // 3. Step Reagent Bead Physics & Cursor-as-Hand Spring Inertia
    this.stepBeadsPhysics(safeDt);

    // 4. Step 5-State Emergent Chemistry & Galvanic Geometric Loops
    this.stepEmergentChemistry(safeDt);

    // 5. Step Vessel Internal Pressure, Bourdon Needle Jitter, & Hairline Cracks
    this.stepPressureAndBourdonGauge(safeDt);

    // 6. Step Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= safeDt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * safeDt;
      p.y += p.vy * safeDt;
      if (p.kind === 'steam' || p.kind === 'ember') {
        p.vy -= 28 * safeDt;
      } else {
        p.vy += 180 * safeDt;
      }
    }
  }

  private stepAssayScaleQueue(dt: number): void {
    for (let i = this.pendingAssayCoins.length - 1; i >= 0; i--) {
      const item = this.pendingAssayCoins[i];
      item.delay -= dt;
      if (item.delay <= 0) {
        this.pendingAssayCoins.splice(i, 1);
        this.commissionCoinsEarned += item.value;
        this.walletCoins += item.value;
        this.totalCoinsMinted += item.value;

        // Dip the Assay Balance Scale beam with Hooke's law impulse
        this.assayBeamSpring.velocity += 2.2;
        const progressRatio = Math.min(
          1.2,
          this.commissionCoinsEarned / Math.max(1, this.currentCommission.quotaCoins)
        );
        this.assayBeamSpring.target = -0.16 + progressRatio * 0.32;

        // Play escalating brass-bell harmonic chime
        this.foley.playAssayChime(this.assayCoinStepCounter++);

        this.mintedCoinsVisual.push({
          id: this.nextBeadId++,
          x: ZONES.assayScale.centerX - 72 + (this.mintedCoinsVisual.length % 5) * 14,
          y: ZONES.assayScale.centerY - 25 - Math.floor(this.mintedCoinsVisual.length / 5) * 7,
          vy: 60,
          settled: true,
          value: item.value,
        });
        if (this.mintedCoinsVisual.length > 25) {
          this.mintedCoinsVisual.shift();
        }

        // Check if current Patron Commission Quota is fulfilled!
        if (this.commissionCoinsEarned >= this.currentCommission.quotaCoins && this.pendingAssayCoins.length === 0) {
          this.completedCommissions++;
          this.loadCommission(this.commissionIndex + 1);
        }
      }
    }
  }

  private stepBeadsPhysics(dt: number): void {
    let panMassSum = 0;

    // Prism focal beam vector inside the crucible
    const prismAimX = ZONES.crucible.centerX - Math.cos(this.prismAngle) * 75;
    const prismAimY = ZONES.crucible.centerY - Math.sin(this.prismAngle) * 75;

    for (const bead of this.beads) {
      if (bead.flashTimer > 0) {
        bead.flashTimer = Math.max(0, bead.flashTimer - dt);
      }

      // If currently dragged by the player's hand, tether via mass-damped Hooke's spring!
      if (this.draggedBeadId === bead.id) {
        const k = 280 / Math.pow(bead.mass, 0.75); // Heavy lead lags behind cursor; light cinnabar snaps tautly
        const damping = 18 / Math.sqrt(bead.mass);
        const ax = k * (this.cursorSpring.targetX - bead.x) - damping * bead.vx;
        const ay = k * (this.cursorSpring.targetY - bead.y) - damping * bead.vy;
        bead.vx += ax * dt;
        bead.vy += ay * dt;
        bead.x += bead.vx * dt;
        bead.y += bead.vy * dt;
        this.assignBeadZoneFromCoords(bead);
        continue;
      }

      // Gravity scaled subtly by mass and buoyancy
      const gravity = bead.element === 'lead' ? 540 : bead.element === 'cinnabar' ? 360 : 430;
      bead.vy += gravity * dt;

      // Air / fluid drag
      bead.vx *= Math.pow(0.985, dt * 60);
      bead.vy *= Math.pow(0.988, dt * 60);

      // Centrifuge vortex force if spinning
      if (bead.zone === 'crucible' && this.centrifugeSpinTimer > 0) {
        const dx = bead.x - ZONES.crucible.centerX;
        const dy = bead.y - ZONES.crucible.centerY;
        bead.vx += (-dy * 2.4 - dx * 0.8) * dt;
        bead.vy += (dx * 2.4 - dy * 0.8) * dt;
      }

      // Lodestone magnetic ring attraction if active
      if (bead.zone === 'crucible' && (this.lodestonePulseTimer > 0 || this.boltedAttachments.has('lodestone'))) {
        const pullStrength = this.lodestonePulseTimer > 0 ? 3.2 : 0.75;
        const dx = ZONES.crucible.centerX - bead.x;
        const dy = ZONES.crucible.centerY - bead.y;
        bead.vx += dx * pullStrength * dt;
        bead.vy += dy * pullStrength * dt;
      }

      // Prism Lens thermal beam heating
      if (bead.zone === 'crucible') {
        const distToBeam = Math.hypot(bead.x - prismAimX, bead.y - prismAimY);
        if (distToBeam < 78) {
          bead.temperature = Math.min(130, bead.temperature + 22 * dt);
          if (bead.waxBarrier > 0 && bead.temperature >= 50) {
            bead.waxBarrier = Math.max(0, bead.waxBarrier - 0.55 * dt);
          }
          if (bead.element === 'lead' && !bead.isGoldCore && bead.waxBarrier <= 0 && bead.temperature >= 76) {
            this.crackLeadGeode(bead, 'thermal');
          }
        }
      }

      bead.x += bead.vx * dt;
      bead.y += bead.vy * dt;
      bead.angle += (bead.vx * 0.012) * dt;

      // Zone boundary constraints
      if (bead.zone === 'chute') {
        const floorY = ZONES.chute.y + 115 + (bead.x - ZONES.chute.x) * 0.16;
        if (bead.y + bead.radius > floorY) {
          bead.y = floorY - bead.radius;
          bead.vy *= -0.25;
          bead.vx += 24 * dt; // Gentle roll down the brass chute toward the gate stop
        }
        const rightStop = ZONES.chute.x + ZONES.chute.w - 28;
        if (bead.x + bead.radius > rightStop) {
          bead.x = rightStop - bead.radius;
          bead.vx *= -0.3;
        }
        if (bead.x - bead.radius < ZONES.chute.x + 24) {
          bead.x = ZONES.chute.x + 24 + bead.radius;
          bead.vx *= -0.3;
        }
      } else if (bead.zone === 'pan') {
        const panSurfaceY = ZONES.weighingPan.baseY + this.weighingPanSpring.position - 4;
        if (bead.y + bead.radius >= panSurfaceY) {
          const impactSpeed = Math.abs(bead.vy);
          if (impactSpeed > 70) {
            // Transfer momentum to the Hooke's-law brass scale pan!
            this.weighingPanSpring.velocity += (impactSpeed * bead.mass) * 0.18;
            this.foley.playBeadClink(bead.radius, bead.mass, impactSpeed);
          }
          bead.y = panSurfaceY - bead.radius;
          bead.vy = 0;
          bead.vx *= 0.82;
          panMassSum += bead.mass;
          this.lastWeighedMass = bead.mass;
          this.lastWeighedName = `${REAGENT_SPECS[bead.element].name} (${bead.mass.toFixed(1)} oz)`;
        }
        const minX = ZONES.weighingPan.x + 14;
        const maxX = ZONES.weighingPan.x + ZONES.weighingPan.w - 14;
        if (bead.x < minX) {
          bead.x = minX;
          bead.vx *= -0.4;
        } else if (bead.x > maxX) {
          bead.x = maxX;
          bead.vx *= -0.4;
        }
      } else if (bead.zone === 'anvil') {
        const anvilTop = ZONES.copperAnvil.topY;
        if (bead.y + bead.radius >= anvilTop) {
          const impactSpeed = Math.abs(bead.vy);
          bead.y = anvilTop - bead.radius;
          bead.vy = -impactSpeed * 0.28;
          bead.vx *= 0.8;

          if (impactSpeed > 65) {
            this.foley.playBeadClink(bead.radius, bead.mass, impactSpeed);
            // Heated Copper Anvil physical artifact behavior:
            // Dropping a heavy Lead Geode from height cracks it; dropping Aether/Vitriol/Cinnabar hisses into vapor & tempers it!
            if (bead.element === 'lead' && impactSpeed > 155 && !bead.isGoldCore) {
              this.crackLeadGeode(bead, 'impact');
            } else {
              this.foley.playSteamHiss(4.5, 0.22, 0.12);
              bead.temperature = Math.min(125, bead.temperature + 38);
              bead.purityRank = Math.min(5, Math.max(bead.purityRank, 2));
              for (let s = 0; s < 6; s++) {
                this.spawnParticle(
                  bead.x + (this.nextRandom() - 0.5) * 18,
                  anvilTop - 4,
                  (this.nextRandom() - 0.5) * 70,
                  -75 - this.nextRandom() * 60,
                  5,
                  0.55,
                  '#f4ece1',
                  'steam'
                );
              }
            }
          }
          // Continuous conductive heating while resting on the Heated Copper Anvil
          bead.temperature = Math.min(120, bead.temperature + 18 * dt);
        }
        const minX = ZONES.copperAnvil.x + 14;
        const maxX = ZONES.copperAnvil.x + ZONES.copperAnvil.w - 14;
        if (bead.x < minX) {
          bead.x = minX;
          bead.vx *= -0.4;
        } else if (bead.x > maxX) {
          bead.x = maxX;
          bead.vx *= -0.4;
        }
      } else {
        // Inside the Smoked-Glass Crucible Chamber
        bead.zone = 'crucible';
        const { left, right, top, bottom, baffleY } = ZONES.crucible;

        if (bead.x - bead.radius < left + 16) {
          bead.x = left + 16 + bead.radius;
          bead.vx = Math.abs(bead.vx) * 0.65;
          if (Math.abs(bead.vx) > 60) this.foley.playBeadClink(bead.radius, bead.mass, Math.abs(bead.vx));
        } else if (bead.x + bead.radius > right - 16) {
          bead.x = right - 16 - bead.radius;
          bead.vx = -Math.abs(bead.vx) * 0.65;
          if (Math.abs(bead.vx) > 60) this.foley.playBeadClink(bead.radius, bead.mass, Math.abs(bead.vx));
        }

        if (bead.y - bead.radius < top + 12) {
          bead.y = top + 12 + bead.radius;
          bead.vy = Math.abs(bead.vy) * 0.5;
        }

        // Internal brass baffle shelf (unless corroded away by unvented Vitriol)
        if (this.baffleIntegrity > 0.2) {
          const onLeftShelf = bead.x > left + 18 && bead.x < left + 108;
          const onRightShelf = bead.x < right - 18 && bead.x > right - 108;
          if ((onLeftShelf || onRightShelf) && Math.abs(bead.y + bead.radius - baffleY) < 12 && bead.vy > 0) {
            bead.y = baffleY - bead.radius;
            bead.vy *= -0.45;
            bead.vx += onLeftShelf ? 55 * dt : -55 * dt;

            // Unvented hot Vitriol eats through brass dividers!
            if (bead.element === 'vitriol' && this.ventClamped && bead.temperature > 45) {
              this.baffleIntegrity = Math.max(0, this.baffleIntegrity - 0.15 * dt);
              this.pressureBar = Math.min(this.maxPressureBar, this.pressureBar + 0.45 * dt);
            }
          }
        }

        if (bead.y + bead.radius > bottom - 14) {
          const impactVy = Math.abs(bead.vy);
          bead.y = bottom - 14 - bead.radius;
          bead.vy = -impactVy * (bead.element === 'lead' ? 0.25 : 0.52);

          if (impactVy > 75) {
            this.foley.playBeadClink(bead.radius, bead.mass, impactVy);
          }
          // Rule 3.1: Heavy Lead Geode dropped from height crushes/cracks on high-velocity impact!
          if (bead.element === 'lead' && !bead.isGoldCore && bead.waxBarrier <= 0 && impactVy > 185) {
            this.crackLeadGeode(bead, 'impact');
          }
        }
      }
    }

    // Update Weighing Pan spring target from total mass resting on it
    this.weighingPanSpring.target = Math.min(28, panMassSum * 6.5);
  }

  private stepEmergentChemistry(dt: number): void {
    const crucibleBeads = this.beads.filter((b) => b.zone === 'crucible' && b.id !== this.draggedBeadId);

    // Pairwise collisions & chemical reactions inside the Crucible
    for (let i = 0; i < crucibleBeads.length; i++) {
      const a = crucibleBeads[i];

      // Ambient Cinnabar exothermic aura
      if (a.element === 'cinnabar') {
        a.temperature = Math.max(68, a.temperature);
        if (this.pressureFrozenTimer <= 0) {
          this.pressureBar = Math.min(this.maxPressureBar, this.pressureBar + 0.16 * dt);
        }
      }

      for (let j = i + 1; j < crucibleBeads.length; j++) {
        const b = crucibleBeads[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const minDist = a.radius + b.radius;

        // 1. Cinnabar Exothermic Heat Radiation within 115px
        if (dist < 115 && (a.element === 'cinnabar' || b.element === 'cinnabar')) {
          const target = a.element === 'cinnabar' ? b : a;
          target.temperature = Math.min(130, target.temperature + 28 * dt);
          if (target.waxBarrier > 0 && target.temperature >= 48) {
            target.waxBarrier = Math.max(0, target.waxBarrier - 0.8 * dt);
          }
          if (target.element === 'lead' && !target.isGoldCore && target.waxBarrier <= 0 && target.temperature >= 76) {
            this.crackLeadGeode(target, 'thermal');
          }
        }

        // 2. Aether Magnetic Attraction within 150px
        if (dist < 150 && dist > minDist * 1.15 && (a.element === 'aether' || b.element === 'aether')) {
          const pull = 55 * dt;
          const nx = dx / dist;
          const ny = dy / dist;
          a.vx += nx * pull;
          a.vy += ny * pull;
          b.vx -= nx * pull;
          b.vy -= ny * pull;
        }

        // 3. Direct Contact Collisions & Chemical Reactions
        if (dist < minDist) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const totalMass = a.mass + b.mass;

          a.x -= nx * overlap * (b.mass / totalMass);
          a.y -= ny * overlap * (b.mass / totalMass);
          b.x += nx * overlap * (a.mass / totalMass);
          b.y += ny * overlap * (a.mass / totalMass);

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const normalVel = rvx * nx + rvy * ny;

          if (normalVel < 0) {
            const restitution = 0.58;
            const impulse = (-(1 + restitution) * normalVel) / (1 / a.mass + 1 / b.mass);
            a.vx -= (impulse / a.mass) * nx;
            a.vy -= (impulse / a.mass) * ny;
            b.vx += (impulse / b.mass) * nx;
            b.vy += (impulse / b.mass) * ny;

            const impactSpeed = Math.abs(normalVel);
            if (impactSpeed > 45) {
              this.foley.playBeadClink(Math.min(a.radius, b.radius), (a.mass + b.mass) * 0.5, impactSpeed);
            }

            // Reaction A: Heavy Lead crushes brittle crystals / cracks Geodes on high-speed collision
            if (impactSpeed > 135) {
              if (a.element === 'lead' && !a.isGoldCore && a.waxBarrier <= 0) {
                this.crackLeadGeode(a, 'impact');
              }
              if (b.element === 'lead' && !b.isGoldCore && b.waxBarrier <= 0) {
                this.crackLeadGeode(b, 'impact');
              }
            }
          }

          // Reaction B: Vitriol Acid dissolves Lead Geode outer shells into Gold Cores!
          if (
            (a.element === 'vitriol' && b.element === 'lead' && !b.isGoldCore) ||
            (b.element === 'vitriol' && a.element === 'lead' && !a.isGoldCore)
          ) {
            const geode = a.element === 'lead' ? a : b;
            const acid = a.element === 'vitriol' ? a : b;
            geode.waxBarrier = Math.max(0, geode.waxBarrier - 1.8 * dt);
            if (geode.waxBarrier <= 0) {
              geode.shellIntegrity = Math.max(0, geode.shellIntegrity - 2.4 * dt);
              if (geode.shellIntegrity <= 0.1) {
                this.crackLeadGeode(geode, 'acid');
                acid.purityRank = Math.min(6, acid.purityRank + 1);
              }
            }
          }

          // Reaction C: Philosopher's Salt freezes pressure & crystallizes adjacent reactive beads into a Gem!
          if (a.element === 'salt' && b.element !== 'salt') {
            if (b.isGoldCore || b.temperature >= 45 || b.element === 'aether' || b.element === 'vitriol') {
              this.crystallizeWithSalt(a, b);
              return;
            }
          } else if (b.element === 'salt' && a.element !== 'salt') {
            if (a.isGoldCore || a.temperature >= 45 || a.element === 'aether' || a.element === 'vitriol') {
              this.crystallizeWithSalt(b, a);
              return;
            }
          }
        }
      }
    }

    // 4. Compute Aether / Quicksilver Galvanic Geometric Loops (Triangle = x3, Quad+ = x5)
    this.updateGalvanicLoops(crucibleBeads);
  }

  private updateGalvanicLoops(crucibleBeads: ReagentBead[]): void {
    this.galvanicArcs = [];
    for (const b of this.beads) {
      b.loopBonus = 1;
    }

    const hasAether = crucibleBeads.some((b) => b.element === 'aether');
    if (!hasAether && !this.boltedAttachments.has('lodestone')) {
      this.activeLoopMultiplier = 1;
      return;
    }

    // Conductive nodes: Aether beads, Gold Cores, Philosopher Gems, or heated reagents near Aether
    const conductive = crucibleBeads.filter(
      (b) => b.element === 'aether' || b.isGoldCore || b.isPhilosopherGem || b.temperature >= 48 || b.purityRank >= 2
    );

    if (conductive.length < 2) {
      this.activeLoopMultiplier = 1;
      return;
    }

    const maxArcDist = 195;
    const edges: Array<[ReagentBead, ReagentBead]> = [];
    const adj = new Map<number, Set<number>>();

    for (const node of conductive) {
      adj.set(node.id, new Set());
    }

    for (let i = 0; i < conductive.length; i++) {
      for (let j = i + 1; j < conductive.length; j++) {
        const u = conductive[i];
        const v = conductive[j];
        if (Math.hypot(u.x - v.x, u.y - v.y) <= maxArcDist) {
          edges.push([u, v]);
          adj.get(u.id)!.add(v.id);
          adj.get(v.id)!.add(u.id);
        }
      }
    }

    // Determine closed geometric loop size:
    // 4+ connected nodes with cycle => Quad (x5); 3 connected nodes in triangle => Triangle (x3)
    let loopMult = 1;
    if (conductive.length >= 4 && edges.length >= 4) {
      loopMult = 5;
    } else if (conductive.length >= 3 && edges.length >= 3) {
      loopMult = 3;
    } else if (edges.length >= 1) {
      loopMult = 2;
    }

    if (loopMult > this.activeLoopMultiplier && loopMult >= 3) {
      this.foley.playGalvanicResonance(loopMult);
    }
    this.activeLoopMultiplier = loopMult;

    for (const [u, v] of edges) {
      u.loopBonus = Math.max(u.loopBonus, loopMult);
      v.loopBonus = Math.max(v.loopBonus, loopMult);
      this.galvanicArcs.push({
        fromId: u.id,
        toId: v.id,
        x1: u.x,
        y1: u.y,
        x2: v.x,
        y2: v.y,
        loopMultiplier: loopMult,
      });
    }
  }

  private stepPressureAndBourdonGauge(dt: number): void {
    const crucibleBeads = this.beads.filter((b) => b.zone === 'crucible');

    if (this.pressureFrozenTimer <= 0) {
      if (this.ventClamped) {
        // Clamped vent builds pressure from active reagents and thermal energy
        const activeRate = crucibleBeads.length * 0.14 + (this.vesselHeat - 22) * 0.008;
        this.pressureBar = Math.min(this.maxPressureBar, this.pressureBar + activeRate * dt);
      } else {
        // Open vent gently bleeds pressure toward safe equilibrium
        const targetEquilibrium = Math.min(2.4, 0.4 + crucibleBeads.length * 0.25);
        this.pressureBar += (targetEquilibrium - this.pressureBar) * Math.min(1, dt * 1.4);
      }
    }

    // Bourdon gauge needle target + high-pressure mechanical tremor
    const normalizedBar = Math.max(0, Math.min(1, this.pressureBar / this.maxPressureBar));
    const jitter =
      this.pressureBar > 6.0
        ? Math.sin(Date.now() * 0.045) * ((this.pressureBar - 6.0) / 4.0) * 0.045
        : 0;
    this.bourdonNeedleSpring.target = normalizedBar + jitter;
    stepSpring1D(this.bourdonNeedleSpring, dt);

    // Audible gauge ticking & hairline glass cracks when pushing luck in the red zone (> 7.2 Bar)
    if (this.pressureBar > 7.0) {
      this.gaugeTickAccumulator += dt * (this.pressureBar - 5.5);
      if (this.gaugeTickAccumulator >= 0.45) {
        this.gaugeTickAccumulator = 0;
        this.foley.playRatchetClick(1.5 + normalizedBar * 0.4, 0.45);
      }

      const desiredCracks = Math.floor((this.pressureBar - 6.8) * 2.2);
      while (this.hairlineCracks.length < desiredCracks && this.hairlineCracks.length < 7) {
        this.spawnHairlineCrack();
      }
    }

    // Safety relief blowout if pressure hits 10.0 Bar while clamped
    if (this.pressureBar >= 9.95 && this.ventClamped) {
      this.triggerPressureReliefBlowout();
    }
  }

  private spawnHairlineCrack(): void {
    const cx =
      ZONES.crucible.left + 45 + this.nextRandom() * (ZONES.crucible.right - ZONES.crucible.left - 90);
    const cy =
      ZONES.crucible.top + 55 + this.nextRandom() * (ZONES.crucible.bottom - ZONES.crucible.top - 110);
    const points: Array<{ dx: number; dy: number }> = [{ dx: 0, dy: 0 }];
    let px = 0;
    let py = 0;
    for (let i = 0; i < 4; i++) {
      px += (this.nextRandom() - 0.5) * 42;
      py += (this.nextRandom() - 0.5) * 42;
      points.push({ dx: px, dy: py });
    }
    this.hairlineCracks.push({
      id: this.nextBeadId++,
      x: cx,
      y: cy,
      points,
      severity: Math.min(1, (this.pressureBar - 6.5) / 3.5),
    });
    this.foley.playCrystalCleave();
  }

  private triggerPressureReliefBlowout(): void {
    this.ventClamped = false;
    this.ventStopperSpring.target = 0;
    this.ventStopperSpring.velocity = -15;
    this.pressureBar = 2.2;
    this.foley.playSteamHiss(9.5, 0.65, 0.24);
    this.foley.playCrystalCleave();

    for (const bead of this.beads) {
      if (bead.zone === 'crucible') {
        bead.vy = -220 - this.nextRandom() * 120;
        bead.vx = (this.nextRandom() - 0.5) * 240;
        if (!bead.isPhilosopherGem) {
          bead.purityRank = Math.max(1, bead.purityRank - 1);
        }
      }
    }

    this.statusBannerText = 'Safety Relief Valve Popped! Excess Bar vented — use Salt or Vent Clamp to control pressure.';
    this.statusBannerTimer = 4.0;
  }

  public assignBeadZoneFromCoords(bead: ReagentBead): void {
    if (
      bead.x >= ZONES.crucible.left - 15 &&
      bead.x <= ZONES.crucible.right + 15 &&
      bead.y >= ZONES.crucible.top - 45 &&
      bead.y <= ZONES.crucible.bottom + 15
    ) {
      bead.zone = 'crucible';
    } else if (
      bead.x >= ZONES.weighingPan.x - 15 &&
      bead.x <= ZONES.weighingPan.x + ZONES.weighingPan.w + 15 &&
      bead.y >= ZONES.weighingPan.baseY - 90
    ) {
      bead.zone = 'pan';
    } else if (
      bead.x >= ZONES.copperAnvil.x - 15 &&
      bead.x <= ZONES.copperAnvil.x + ZONES.copperAnvil.w + 15 &&
      bead.y >= ZONES.copperAnvil.topY - 90
    ) {
      bead.zone = 'anvil';
    } else if (bead.x <= ZONES.chute.x + ZONES.chute.w + 30 && bead.y <= ZONES.chute.y + ZONES.chute.h + 30) {
      bead.zone = 'chute';
    } else {
      bead.zone = 'crucible';
    }
  }

  /**
   * Pointer Down handler in canonical 1280x760 workbench coordinates.
   */
  public handlePointerDown(x: number, y: number): void {
    this.foley.unlock();
    this.cursorSpring.targetX = x;
    this.cursorSpring.targetY = y;
    this.cursorSpring.x = x;
    this.cursorSpring.y = y;

    // 1. Check if grabbing any Reagent Bead (prioritize top-most bead within grab radius)
    for (let i = this.beads.length - 1; i >= 0; i--) {
      const bead = this.beads[i];
      if (Math.hypot(x - bead.x, y - bead.y) <= bead.radius + 12) {
        this.draggedBeadId = bead.id;
        this.foley.playBeadClink(bead.radius, bead.mass, 95);
        return;
      }
    }

    // 2. Check Vent Clamp Stopper at crown of Crucible
    if (Math.hypot(x - ZONES.ventStopper.x, y - ZONES.ventStopper.y) <= ZONES.ventStopper.r + 12) {
      this.toggleVentClamp();
      return;
    }

    // 3. Check Shear-Blade Guillotine Handle
    if (Math.hypot(x - ZONES.shearHandle.x, y - ZONES.shearHandle.y) <= ZONES.shearHandle.r + 14) {
      this.activeControlDrag = 'shear';
      this.pullShearBlade();
      return;
    }

    // 4. Check Bellows Lever Handle
    if (
      x >= ZONES.bellowsHandle.x - 16 &&
      x <= ZONES.bellowsHandle.x + ZONES.bellowsHandle.w + 16 &&
      y >= ZONES.bellowsHandle.y - 20 &&
      y <= ZONES.bellowsHandle.maxPullY + 30
    ) {
      this.activeControlDrag = 'bellows';
      this.pumpBellows(1.0);
      return;
    }

    // 5. Check Heavy Brass Discharge Release Lever
    if (
      x >= ZONES.dischargeLever.x - 45 &&
      x <= ZONES.dischargeLever.x + 45 &&
      y >= ZONES.dischargeLever.topY - 15 &&
      y <= ZONES.dischargeLever.bottomY + 25
    ) {
      this.activeControlDrag = 'discharge';
      this.pullDischargeLever();
      return;
    }

    // 6. Check Chute Dispenser Lever & Elemental Hopper Buttons
    if (Math.hypot(x - ZONES.dispenserLever.x, y - ZONES.dispenserLever.y) <= ZONES.dispenserLever.r + 12) {
      this.activeControlDrag = 'chute_lever';
      this.dispenseChuteSupply();
      return;
    }

    // Check Elemental Hopper Dispenser buttons along top of Brass Chute
    const avail = this.currentCommission.availableElements;
    for (let i = 0; i < avail.length; i++) {
      const bx = ZONES.chute.x + 126 + i * 44;
      const by = ZONES.chute.y + 34;
      if (Math.hypot(x - bx, y - by) <= 18) {
        this.dispenseChuteSupply(avail[i]);
        return;
      }
    }

    // 7. Check 4 Physical Workbench Attachment Mount Cards on Right Board
    const attachmentSlotHeight = 52;
    for (let i = 0; i < WORKBENCH_ATTACHMENTS.length; i++) {
      const slotX = ZONES.attachmentsArea.x;
      const slotY = ZONES.attachmentsArea.y + i * (attachmentSlotHeight + 6);
      if (
        x >= slotX &&
        x <= slotX + ZONES.attachmentsArea.w &&
        y >= slotY &&
        y <= slotY + attachmentSlotHeight
      ) {
        this.interactAttachment(WORKBENCH_ATTACHMENTS[i].id);
        return;
      }
    }

    // 8. Check Rotating Alembic Prism Lens Bezel Ring around the Crucible
    const distFromCrucibleCenter = Math.hypot(x - ZONES.prismRing.centerX, y - ZONES.prismRing.centerY);
    if (Math.abs(distFromCrucibleCenter - ZONES.prismRing.radius) <= 28) {
      this.activeControlDrag = 'prism';
      this.rotatePrismToAngle(Math.atan2(y - ZONES.prismRing.centerY, x - ZONES.prismRing.centerX));
      return;
    }
  }

  public handlePointerMove(x: number, y: number): void {
    this.cursorSpring.targetX = x;
    this.cursorSpring.targetY = y;

    if (this.activeControlDrag === 'prism') {
      this.rotatePrismToAngle(Math.atan2(y - ZONES.prismRing.centerY, x - ZONES.prismRing.centerX));
    } else if (this.activeControlDrag === 'bellows') {
      const pullRatio = Math.max(
        0,
        Math.min(1, (y - ZONES.bellowsHandle.restY) / (ZONES.bellowsHandle.maxPullY - ZONES.bellowsHandle.restY))
      );
      this.bellowsSpring.target = pullRatio;
    } else if (this.activeControlDrag === 'discharge') {
      const pullRatio = Math.max(
        0,
        Math.min(1, (y - ZONES.dischargeLever.topY) / (ZONES.dischargeLever.bottomY - ZONES.dischargeLever.topY))
      );
      this.dischargeLeverSpring.target = pullRatio;
    }
  }

  public handlePointerUp(): void {
    if (this.draggedBeadId !== null) {
      const bead = this.beads.find((b) => b.id === this.draggedBeadId);
      if (bead) {
        this.assignBeadZoneFromCoords(bead);
        this.foley.playBeadClink(bead.radius, bead.mass, Math.hypot(bead.vx, bead.vy));
      }
      this.draggedBeadId = null;
    }
    this.activeControlDrag = null;
  }
}
