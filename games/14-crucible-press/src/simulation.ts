import type {
  AttachmentId,
  BeadLocation,
  ConductiveArc,
  CruciblePressState,
  PatronCommission,
  ReagentBead,
  ReagentKind,
  SpringDamper1D,
  WorkbenchAttachment,
} from './types';

export const WORKBENCH_WIDTH = 1280;
export const WORKBENCH_HEIGHT = 720;

export const CRUCIBLE_CENTER_X = 625;
export const CRUCIBLE_CENTER_Y = 365;
export const CRUCIBLE_RADIUS_X = 188;
export const CRUCIBLE_RADIUS_Y = 198;
export const DIVIDER_Y = 368;

export const ANVIL_PLATE_X1 = 58;
export const ANVIL_PLATE_X2 = 302;
export const ANVIL_PLATE_Y = 636;

export const SCALE_PIVOT_X = 1125;
export const SCALE_PIVOT_Y = 292;
export const SCALE_LEFT_PAN_X = 1055;
export const SCALE_RIGHT_PAN_X = 1195;
export const SCALE_PAN_BASE_Y = 398;

export const COMMISSIONS: PatronCommission[] = [
  {
    index: 0,
    slipTitle: 'Crack & Distill.',
    patronName: 'Guild Assay Master',
    subNote: 'Shear, drop-crush, or heat the Lead Geode with Cinnabar, then pull Discharge.',
    targetQuotaCoins: 3,
    requiredTrait: 'any_distill',
    chuteLoadout: ['cinnabar', 'lead_geode'],
  },
  {
    index: 1,
    slipTitle: 'Heavy Lead Impact.',
    patronName: 'Foundry Warden',
    subNote: 'Drop heavy Lead from the upper funnel to crush brittle Geode shells on impact.',
    targetQuotaCoins: 7,
    requiredTrait: 'gold_core',
    chuteLoadout: ['lead', 'lead_geode', 'cinnabar', 'lead_geode'],
  },
  {
    index: 2,
    slipTitle: 'Vitriol Bath & Vent.',
    patronName: 'Apothecary Vane',
    subNote: 'Vitriol dissolves Geode shells cleanly—but eats the brass grate if left unvented.',
    targetQuotaCoins: 13,
    requiredTrait: 'vitriol_dissolve',
    chuteLoadout: ['vitriol', 'lead_geode', 'vitriol', 'cinnabar', 'lead_geode'],
  },
  {
    index: 3,
    slipTitle: 'Quicksilver Triangle.',
    patronName: 'Royal Horologist',
    subNote: 'Link 3+ Quicksilver or Gold nodes into a closed geometric loop (△ ×3, ◇ ×5).',
    targetQuotaCoins: 22,
    requiredTrait: 'quicksilver_loop',
    chuteLoadout: ['quicksilver', 'quicksilver', 'quicksilver', 'cinnabar', 'lead_geode'],
  },
  {
    index: 4,
    slipTitle: "Philosopher's Salt.",
    patronName: 'Arch-Alchemist Aurelia',
    subNote: 'Melt the Wax barrier with Cinnabar, then drop Salt to crystallize a Philosopher Gem.',
    targetQuotaCoins: 35,
    requiredTrait: 'philosopher_gem',
    chuteLoadout: ['cinnabar', 'salt', 'quicksilver', 'vitriol', 'lead_geode'],
    spawnWaxBarrier: true,
  },
];

export function createSpring(
  initial = 0,
  stiffness = 140,
  damping = 14,
  min = -1,
  max = 1.5
): SpringDamper1D {
  return {
    position: initial,
    velocity: 0,
    target: initial,
    stiffness,
    damping,
    min,
    max,
  };
}

export function stepSpring(s: SpringDamper1D, dt: number): void {
  const force = -s.stiffness * (s.position - s.target) - s.damping * s.velocity;
  s.velocity += force * dt;
  s.position += s.velocity * dt;
  if (s.position < s.min) {
    s.position = s.min;
    if (s.velocity < 0) s.velocity *= -0.35;
  } else if (s.position > s.max) {
    s.position = s.max;
    if (s.velocity > 0) s.velocity *= -0.35;
  }
}

export function nextRandom(state: CruciblePressState): number {
  let t = (state.rngState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function getReagentPhysicalSpec(kind: ReagentKind): {
  radius: number;
  mass: number;
  restitution: number;
  friction: number;
  basePurity: number;
  initialTemp: number;
} {
  switch (kind) {
    case 'lead':
      // 1. Slag / Lead (Heavy, Inert): High mass, lags behind cursor, crushes brittle targets on impact
      return { radius: 22, mass: 3.4, restitution: 0.22, friction: 0.92, basePurity: 1, initialTemp: 24 };
    case 'lead_geode':
      // Uncracked Geode with outer slag crust around a pure gold core
      return { radius: 24, mass: 2.8, restitution: 0.3, friction: 0.9, basePurity: 1, initialTemp: 24 };
    case 'gold_core':
      // Exposed Pure Gold Core: High base purity and conductive
      return { radius: 16, mass: 2.1, restitution: 0.48, friction: 0.96, basePurity: 4, initialTemp: 65 };
    case 'cinnabar':
      // 2. Cinnabar / Ember (Exothermic): Radiates heat to neighbors, ignites volatile gases, melts wax
      return { radius: 17, mass: 1.15, restitution: 0.55, friction: 0.95, basePurity: 2, initialTemp: 135 };
    case 'vitriol':
      // 3. Vitriol / Acid (Corrosive Fluid): Dissolves geode shells, corrodes brass divider if unvented
      return { radius: 17, mass: 1.0, restitution: 0.35, friction: 0.98, basePurity: 2, initialTemp: 32 };
    case 'quicksilver':
      // 4. Aether / Quicksilver (Conductive & Magnetic): Arcs energy, closed Triangle x3 / Quad x5
      return { radius: 18, mass: 2.2, restitution: 0.68, friction: 0.99, basePurity: 3, initialTemp: 28 };
    case 'salt':
      // 5. Philosopher's Salt (Catalyst): Light, snaps tautly to cursor, freezes & crystallizes adjacent reagents
      return { radius: 15, mass: 0.68, restitution: 0.62, friction: 0.96, basePurity: 3, initialTemp: 18 };
    case 'philosopher_gem':
      // Crystallized high-tier gem formed by Philosopher's Salt
      return { radius: 23, mass: 2.0, restitution: 0.58, friction: 0.97, basePurity: 10, initialTemp: 40 };
    case 'wax_seal':
      // Brittle Wax/Ice chamber plug that Cinnabar melts or heavy Lead crushes
      return { radius: 25, mass: 1.6, restitution: 0.15, friction: 0.88, basePurity: 1, initialTemp: 10 };
  }
}

export function spawnBead(
  state: CruciblePressState,
  kind: ReagentKind,
  x: number,
  y: number,
  location: BeadLocation = 'chute',
  vx = 0,
  vy = 0
): ReagentBead {
  const spec = getReagentPhysicalSpec(kind);
  const bead: ReagentBead = {
    id: state.nextBeadId++,
    kind,
    x,
    y,
    vx,
    vy,
    radius: spec.radius,
    mass: spec.mass,
    restitution: spec.restitution,
    friction: spec.friction,
    temperature: spec.initialTemp,
    shellIntegrity: 1.0,
    purityRank: spec.basePurity,
    location,
    frozenTimer: 0,
    chargeGlow: kind === 'quicksilver' || kind === 'gold_core' ? 0.5 : 0,
    vaporizing: 0,
    rotation: nextRandom(state) * Math.PI * 2,
    angularVelocity: 0,
  };
  state.beads.push(bead);
  return bead;
}

export function createInitialAttachments(): WorkbenchAttachment[] {
  return [
    {
      id: 'centrifuge_spinner',
      name: 'Centrifuge Spinner',
      shortLabel: 'CENTRIFUGE',
      cost: 4,
      unlocked: false,
      socketX: 990,
      socketY: 552,
      spring: createSpring(0, 160, 14, -1, 1.5),
      angle: 0,
      angularVelocity: 0,
      activeCooldown: 0,
      description: 'Bolts a high-speed flywheel crank onto the Alembic Drum.',
    },
    {
      id: 'cryo_condenser',
      name: 'Cryo-Condenser Coil',
      shortLabel: 'CRYO COIL',
      cost: 6,
      unlocked: false,
      socketX: 1165,
      socketY: 552,
      spring: createSpring(0, 180, 15, 0, 1.3),
      angle: 0,
      angularVelocity: 0,
      activeCooldown: 0,
      description: 'Flash-cools Bar pressure into frost without losing Purity.',
    },
    {
      id: 'twin_jaw_crusher',
      name: 'Twin-Jaw Crusher',
      shortLabel: 'JAW CRUSHER',
      cost: 8,
      unlocked: false,
      socketX: 990,
      socketY: 642,
      spring: createSpring(0, 210, 16, 0, 1.3),
      angle: 0,
      angularVelocity: 0,
      activeCooldown: 0,
      description: 'Automatically cracks Geode shells entering the upper throat.',
    },
    {
      id: 'lodestone_ring',
      name: 'Magnetic Lodestone Ring',
      shortLabel: 'LODESTONE',
      cost: 11,
      unlocked: false,
      socketX: 1165,
      socketY: 642,
      spring: createSpring(0, 150, 14, -2, 2),
      angle: 0,
      angularVelocity: 0,
      activeCooldown: 0,
      description: 'Aligns Quicksilver & Gold Cores into Triangle (×3) & Quad (×5) loops.',
    },
  ];
}

export function createInitialState(seed = 20261108): CruciblePressState {
  const firstCommission = COMMISSIONS[0];
  const state: CruciblePressState = {
    seed,
    rngState: seed >>> 0,
    elapsedSec: 0,

    beads: [],
    nextBeadId: 1,
    vapors: [],
    nextVaporId: 1,
    cracks: [],

    vesselTempC: 36,
    vesselPressureBar: 0.4,
    ventClosed: false,
    rawPotValue: 0,
    purityMultiplier: 1.0,
    activeLoopOrder: 0,
    activeArcs: [],
    dividerIntegrity: 1.0,
    dividerOpen: false,
    ruptureFlash: 0,

    bellowsSpring: createSpring(0, 145, 11, -0.2, 1.35),
    dischargeSpring: createSpring(0, 155, 12, -0.2, 1.35),
    pressureGateSpring: createSpring(0, 175, 16, -0.1, 1.25),
    shearBladeSpring: createSpring(0, 240, 12, -0.45, 1.35),
    shearArmed: false,
    chutePullSpring: createSpring(0, 165, 13, -0.2, 1.3),
    anvilHammerSpring: createSpring(0, 210, 11, -0.35, 1.35),
    anvilTempC: 195,

    alembicAngle: 0,
    alembicAngularVel: 0.18,
    prismAngle: 0.25,
    prismAngularVel: 0,
    prismTargetAngle: 0.25,

    gaugeNeedleSpring: createSpring(0.04, 190, 9.5, -0.05, 1.25),
    gaugeTickAccumulator: 0,

    scalePanSpring: createSpring(0, 125, 7.2, -35, 65),
    scaleBeamSpring: createSpring(0, 110, 6.8, -0.45, 0.45),
    pendingAssayCoins: 0,
    assayDropTimer: 0,
    scaleCoins: [],
    nextCoinId: 1,

    mintedCoins: 0,
    lifetimeCoins: 0,
    bestPurityBatch: 0,
    commissionIndex: 0,
    currentCommission: firstCommission,
    commissionTraitMet: false,
    commissionStampAnim: 0,

    attachments: createInitialAttachments(),

    hand: {
      x: WORKBENCH_WIDTH * 0.5,
      y: WORKBENCH_HEIGHT * 0.5,
      vx: 0,
      vy: 0,
      isDown: false,
      dragKind: 'none',
      draggedBeadId: null,
      draggedAttachmentId: null,
      tetherStretchX: 0,
      tetherStretchY: 0,
      lastRatchetTooth: 0,
    },

    soundQueue: [],
    muted: false,
    debug: false,
  };

  // Requirement 6: Boot directly into the live workbench in < 1 second with a single
  // Cinnabar bead and a Lead geode already waiting in the brass chute, and a 3-word
  // parchment slip: "Crack & Distill."
  spawnBead(state, 'cinnabar', 142, 368, 'chute', 18, 0);
  spawnBead(state, 'lead_geode', 228, 384, 'chute', 8, 0);

  // Also place one small Quicksilver droplet resting by the Copper Anvil tray so the
  // "Physical Artifact Test" (dropping a mercury droplet onto the heated copper anvil)
  // is immediately tangible right on the bench!
  spawnBead(state, 'quicksilver', 95, 588, 'anvil', 0, 0);

  return state;
}

export function dispenseChuteLoadout(state: CruciblePressState): void {
  const chuteBeads = state.beads.filter((b) => b.location === 'chute');
  if (chuteBeads.length >= 7) return;

  const comm = state.currentCommission;
  const list = comm.chuteLoadout;
  for (let i = 0; i < list.length; i++) {
    if (chuteBeads.length + i >= 7) break;
    const kind = list[i];
    const spawnX = 76 + i * 38 + (nextRandom(state) - 0.5) * 8;
    const spawnY = 325 + (i % 2) * 24;
    spawnBead(state, kind, spawnX, spawnY, 'chute', 35 + i * 10, 12);
  }
  state.chutePullSpring.velocity += 5.5;
  state.soundQueue.push({ type: 'clink_brass', pitch: 0.95, intensity: 0.9 });
}

export function pumpBellows(state: CruciblePressState, impulse = 1.0): void {
  state.bellowsSpring.velocity += 7.5 * impulse;
  state.bellowsSpring.position = Math.min(1.0, state.bellowsSpring.position + 0.38 * impulse);
  state.vesselTempC = Math.min(340, state.vesselTempC + 28 * impulse);
  const pressureGain = state.ventClosed ? 0.95 * impulse : 0.42 * impulse;
  state.vesselPressureBar = Math.min(10.2, state.vesselPressureBar + pressureGain);

  // Emit hot embers/steam into the crucible bottom
  for (let i = 0; i < 4; i++) {
    state.vapors.push({
      id: state.nextVaporId++,
      x: CRUCIBLE_CENTER_X + (nextRandom(state) - 0.5) * 140,
      y: CRUCIBLE_CENTER_Y + CRUCIBLE_RADIUS_Y - 24,
      vx: (nextRandom(state) - 0.5) * 45,
      vy: -85 - nextRandom(state) * 65,
      radius: 10 + nextRandom(state) * 8,
      kind: 'steam',
      life: 0,
      maxLife: 0.8 + nextRandom(state) * 0.5,
      temperature: state.vesselTempC,
    });
  }

  // Agitate beads in the lower crucible chamber
  for (const bead of state.beads) {
    if (bead.location === 'crucible') {
      bead.vy -= (95 * impulse) / Math.sqrt(bead.mass);
      bead.vx += ((nextRandom(state) - 0.5) * 70 * impulse) / bead.mass;
      bead.temperature = Math.min(320, bead.temperature + 18 * impulse);
    }
  }

  state.soundQueue.push({ type: 'bellows_whoosh', pitch: 0.9 + impulse * 0.2, intensity: 1.0 });
  state.soundQueue.push({ type: 'ratchet_click', pitch: 0.85, intensity: 0.9 });
}

export function togglePressureLockGate(state: CruciblePressState, forceClosed?: boolean): void {
  state.ventClosed = forceClosed !== undefined ? forceClosed : !state.ventClosed;
  state.pressureGateSpring.target = state.ventClosed ? 1 : 0;
  state.pressureGateSpring.velocity += state.ventClosed ? 4.5 : -4.5;
  state.soundQueue.push({
    type: 'clink_brass',
    pitch: state.ventClosed ? 0.82 : 1.18,
    intensity: 1.0,
  });

  if (!state.ventClosed && state.vesselPressureBar > 1.2) {
    // Immediate relief puff of steam from the top neck
    state.vesselPressureBar = Math.max(0.8, state.vesselPressureBar * 0.72);
    for (let i = 0; i < 6; i++) {
      state.vapors.push({
        id: state.nextVaporId++,
        x: CRUCIBLE_CENTER_X + (nextRandom(state) - 0.5) * 40,
        y: CRUCIBLE_CENTER_Y - CRUCIBLE_RADIUS_Y - 12,
        vx: (nextRandom(state) - 0.5) * 80,
        vy: -120 - nextRandom(state) * 70,
        radius: 14 + nextRandom(state) * 10,
        kind: 'steam',
        life: 0,
        maxLife: 0.9,
        temperature: state.vesselTempC,
      });
    }
  }
}

export function triggerShearBlade(state: CruciblePressState): number {
  state.shearBladeSpring.position = -0.38;
  state.shearBladeSpring.velocity = -14;
  state.shearBladeSpring.target = 0;
  state.shearArmed = false;
  state.soundQueue.push({ type: 'shear_snap', pitch: 1.0, intensity: 1.1 });

  let cleavedCount = 0;
  const toSpawn: Array<{ kind: ReagentKind; x: number; y: number; vx: number; vy: number }> = [];

  for (let i = state.beads.length - 1; i >= 0; i--) {
    const b = state.beads[i];
    if (b.location !== 'crucible') continue;
    // Shear zone covers upper and middle crucible (y: 180..410)
    if (b.y >= 175 && b.y <= 430) {
      if (b.kind === 'lead_geode') {
        crackGeodeBead(state, b, 'shear');
        cleavedCount++;
      } else if (b.kind === 'wax_seal') {
        state.beads.splice(i, 1);
        cleavedCount++;
        state.soundQueue.push({ type: 'geode_crack', pitch: 1.25, intensity: 1.0 });
      } else if (b.kind === 'cinnabar' && b.radius >= 15) {
        // Cleaving an unstable Cinnabar crystal splits it into 2 reactive embers and boosts yield!
        b.radius = 13;
        b.vx = -75;
        b.vy = -40;
        b.purityRank += 1;
        toSpawn.push({
          kind: 'cinnabar',
          x: b.x + 16,
          y: b.y,
          vx: 75,
          vy: -40,
        });
        state.rawPotValue += 2.0;
        cleavedCount++;
      } else {
        // Kinetic impulse from the shear blade
        b.vx -= 95;
        b.vy -= 35;
      }
    }
  }

  for (const item of toSpawn) {
    const child = spawnBead(state, item.kind, item.x, item.y, 'crucible', item.vx, item.vy);
    child.radius = 13;
  }

  return cleavedCount;
}

export function crackGeodeBead(
  state: CruciblePressState,
  bead: ReagentBead,
  cause: 'impact' | 'shear' | 'acid' | 'thermal' | 'crusher'
): void {
  if (bead.kind !== 'lead_geode') return;
  const spec = getReagentPhysicalSpec('gold_core');
  bead.kind = 'gold_core';
  bead.radius = spec.radius;
  bead.mass = spec.mass;
  bead.restitution = spec.restitution;
  bead.purityRank = spec.basePurity;
  bead.shellIntegrity = 1.0;
  bead.chargeGlow = 0.85;
  bead.vy -= 45;

  state.rawPotValue += cause === 'acid' ? 3.2 : 2.5;
  state.purityMultiplier = Math.min(25, +(state.purityMultiplier + 0.35).toFixed(2));

  if (
    state.currentCommission.requiredTrait === 'any_distill' ||
    state.currentCommission.requiredTrait === 'gold_core' ||
    (state.currentCommission.requiredTrait === 'vitriol_dissolve' && cause === 'acid')
  ) {
    state.commissionTraitMet = true;
  }

  // Spawn a small inert slag shard when cracked mechanically so Lead mass conservation feels physical
  if (cause === 'impact' || cause === 'shear' || cause === 'crusher') {
    const shard = spawnBead(
      state,
      'lead',
      bead.x + (nextRandom(state) - 0.5) * 18,
      bead.y + 10,
      bead.location,
      (nextRandom(state) - 0.5) * 65,
      25
    );
    shard.radius = 14;
    shard.mass = 2.0;
  }

  state.soundQueue.push({
    type: cause === 'acid' ? 'acid_sizzle' : 'geode_crack',
    pitch: cause === 'acid' ? 1.15 : 1.05,
    intensity: 1.1,
  });
}

export function strikeCopperAnvilHammer(state: CruciblePressState): void {
  state.anvilHammerSpring.position = -0.32;
  state.anvilHammerSpring.velocity = -12;
  state.anvilHammerSpring.target = 0;
  state.soundQueue.push({ type: 'clink_brass', pitch: 0.78, intensity: 1.15 });

  for (const bead of state.beads) {
    if (bead.location === 'anvil') {
      if (bead.kind === 'lead_geode') {
        crackGeodeBead(state, bead, 'impact');
      } else {
        bead.vy = -80;
        bead.vx += (nextRandom(state) - 0.5) * 90;
        bead.temperature = Math.min(280, bead.temperature + 45);
      }
    }
  }
}

export function activateAttachmentVerb(state: CruciblePressState, id: AttachmentId): boolean {
  const att = state.attachments.find((a) => a.id === id);
  if (!att || !att.unlocked) return false;

  switch (id) {
    case 'centrifuge_spinner': {
      att.angularVelocity += 18;
      state.alembicAngularVel += 7.5;
      for (const b of state.beads) {
        if (b.location !== 'crucible') continue;
        const dx = b.x - CRUCIBLE_CENTER_X;
        const dy = b.y - CRUCIBLE_CENTER_Y;
        const dist = Math.hypot(dx, dy) || 1;
        if (b.kind === 'lead') {
          // Heavy slag pushed outward
          b.vx += (dx / dist) * 120;
          b.vy += (dy / dist) * 120;
        } else {
          // Pure cores concentrated inward and energized
          b.vx -= (dx / dist) * 85;
          b.vy -= (dy / dist) * 85;
          b.chargeGlow = Math.min(1, b.chargeGlow + 0.35);
        }
      }
      state.purityMultiplier = Math.min(25, +(state.purityMultiplier + 0.25).toFixed(2));
      state.soundQueue.push({ type: 'ratchet_click', pitch: 1.35, intensity: 1.0 });
      return true;
    }

    case 'cryo_condenser': {
      att.spring.position = 1.0;
      att.spring.velocity = 8.0;
      // Flash-cool excess Bar pressure without losing Purity multiplier!
      const cooledBar = Math.max(0.6, state.vesselPressureBar - 2.8);
      state.vesselPressureBar = cooledBar;
      state.vesselTempC = Math.max(55, state.vesselTempC - 45);
      for (let i = 0; i < 6; i++) {
        state.vapors.push({
          id: state.nextVaporId++,
          x: CRUCIBLE_CENTER_X + (nextRandom(state) - 0.5) * 120,
          y: CRUCIBLE_CENTER_Y - 60 + (nextRandom(state) - 0.5) * 60,
          vx: (nextRandom(state) - 0.5) * 40,
          vy: 35 + nextRandom(state) * 25,
          radius: 12,
          kind: 'salt_frost',
          life: 0,
          maxLife: 1.0,
          temperature: 10,
        });
      }
      state.soundQueue.push({ type: 'anvil_hiss', pitch: 1.4, intensity: 1.0 });
      return true;
    }

    case 'twin_jaw_crusher': {
      att.spring.position = 1.0;
      att.spring.velocity = 10.0;
      for (const b of state.beads) {
        if (b.location === 'crucible' && b.kind === 'lead_geode') {
          crackGeodeBead(state, b, 'crusher');
        }
      }
      state.soundQueue.push({ type: 'shear_snap', pitch: 0.85, intensity: 1.1 });
      return true;
    }

    case 'lodestone_ring': {
      att.angle += Math.PI / 3;
      att.angularVelocity += 9;
      // Pulls conductive Quicksilver and Gold Cores into a tight equilateral triangle or quad around the center
      const conductive = state.beads.filter(
        (b) => b.location === 'crucible' && (b.kind === 'quicksilver' || b.kind === 'gold_core')
      );
      const count = conductive.length;
      const ringRadius = 68;
      conductive.forEach((b, idx) => {
        const targetAngle = att.angle + (idx * Math.PI * 2) / Math.max(3, count);
        const tx = CRUCIBLE_CENTER_X + Math.cos(targetAngle) * ringRadius;
        const ty = CRUCIBLE_CENTER_Y + 35 + Math.sin(targetAngle) * ringRadius;
        b.vx += (tx - b.x) * 4.2;
        b.vy += (ty - b.y) * 4.2;
        b.chargeGlow = 1.0;
      });
      state.soundQueue.push({ type: 'aether_chord', pitch: 1.15, intensity: 0.9 });
      return true;
    }
  }
}

export function purchaseAttachment(state: CruciblePressState, id: AttachmentId): boolean {
  const att = state.attachments.find((a) => a.id === id);
  if (!att || att.unlocked || state.mintedCoins < att.cost) return false;

  state.mintedCoins -= att.cost;
  // Remove spent coin weights from the scale pan visually
  let toRemove = att.cost;
  while (toRemove > 0 && state.scaleCoins.length > 0) {
    state.scaleCoins.pop();
    toRemove--;
  }
  state.scalePanSpring.velocity -= 18;
  att.unlocked = true;
  att.spring.position = 1.1;
  att.spring.velocity = 9.0;
  state.soundQueue.push({ type: 'bolt_attachment', pitch: 1.0, intensity: 1.2 });
  return true;
}

/**
 * Pull the heavy Brass Discharge Lever: flushes the Crucible's distilled yield
 * through the condenser into a cascade of physical Assay Scale coin-weights.
 */
export function pullDischargeLever(state: CruciblePressState): number {
  state.dischargeSpring.position = 1.0;
  state.dischargeSpring.velocity = 8.5;

  const crucibleBeads = state.beads.filter((b) => b.location === 'crucible');
  if (crucibleBeads.length === 0 && state.rawPotValue <= 0.1) {
    state.soundQueue.push({ type: 'clink_brass', pitch: 0.75, intensity: 0.7 });
    return 0;
  }

  // Compute total distilled yield from beads in the chamber + accumulated pot + loop multiplier
  let beadPuritySum = 0;
  let hasReactedBead = state.rawPotValue > 0.5 || state.vesselTempC > 65;

  for (const b of crucibleBeads) {
    let rank = b.purityRank;
    if (b.kind === 'gold_core') {
      rank += 3;
      hasReactedBead = true;
    } else if (b.kind === 'philosopher_gem') {
      rank += 8;
      hasReactedBead = true;
    } else if (b.temperature > 85) {
      rank += 1.5;
      hasReactedBead = true;
    }
    beadPuritySum += rank;
  }

  // Push-Your-Luck pressure bonus (up to +2.5x when dangerously pressurized)
  const pressureBonus =
    state.vesselPressureBar > 4.0 ? 1 + (state.vesselPressureBar - 4.0) * 0.35 : 1.0;
  const loopMult = state.activeLoopOrder >= 4 ? 5 : state.activeLoopOrder === 3 ? 3 : 1;
  const effectiveMultiplier = +(state.purityMultiplier * pressureBonus * loopMult).toFixed(2);

  const rawTotal = (state.rawPotValue + beadPuritySum * 0.65) * effectiveMultiplier;
  const mintedBatch = hasReactedBead
    ? Math.max(2, Math.min(28, Math.round(rawTotal / 2.2)))
    : Math.max(1, Math.round(beadPuritySum * 0.35));

  state.bestPurityBatch = Math.max(state.bestPurityBatch, mintedBatch);

  // Consume reacted crucible beads into the condenser flush
  state.beads = state.beads.filter((b) => b.location !== 'crucible');
  state.activeArcs = [];
  state.activeLoopOrder = 0;
  state.rawPotValue = 0;
  state.purityMultiplier = 1.0;
  state.vesselPressureBar = Math.max(0.35, state.vesselPressureBar * 0.25);
  state.vesselTempC = Math.max(38, state.vesselTempC * 0.55);
  state.cracks = [];
  state.dividerIntegrity = 1.0;
  state.dividerOpen = false;

  // Queue physical brass coin-weights to drop onto the Assay Scale pan one by one
  state.pendingAssayCoins += mintedBatch;
  state.assayDropTimer = 0.02;

  state.soundQueue.push({ type: 'discharge_flush', pitch: 1.0, intensity: 1.15 });

  // Automatically replenish the brass reagent chute for the next cycle
  dispenseChuteLoadout(state);

  return mintedBatch;
}

/**
 * Evaluates conductive Aether / Quicksilver & Gold Core arcs inside the Crucible
 * and detects closed geometric loops (Triangle = x3, Quad = x5).
 */
export function updateConductiveNetwork(state: CruciblePressState): void {
  const nodes = state.beads.filter(
    (b) =>
      b.location === 'crucible' &&
      (b.kind === 'quicksilver' || b.kind === 'gold_core' || b.kind === 'philosopher_gem')
  );

  const arcs: ConductiveArc[] = [];
  const adj = new Map<number, number[]>();
  for (const n of nodes) {
    adj.set(n.id, []);
  }

  const maxArcDist = 165;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d <= maxArcDist) {
        adj.get(a.id)!.push(b.id);
        adj.get(b.id)!.push(a.id);
        arcs.push({
          fromBeadId: a.id,
          toBeadId: b.id,
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          inClosedLoop: false,
          loopOrder: 0,
        });
      }
    }
  }

  // Check for closed Quad (4-cycle) or Triangle (3-cycle)
  let detectedOrder = 0;
  const loopNodeIds = new Set<number>();

  // Check 4-cycle first (Quad = x5)
  if (nodes.length >= 4) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          for (let m = k + 1; m < nodes.length; m++) {
            const group = [nodes[i].id, nodes[j].id, nodes[k].id, nodes[m].id];
            // A closed 4-loop exists if every node in the 4-group has degree >= 2 within the group
            const allConnected = group.every((id) => {
              const neighborsInGroup = (adj.get(id) ?? []).filter((nid) => group.includes(nid));
              return neighborsInGroup.length >= 2;
            });
            if (allConnected) {
              detectedOrder = 4;
              group.forEach((id) => loopNodeIds.add(id));
            }
          }
        }
      }
    }
  }

  // Otherwise check 3-cycle (Triangle = x3)
  if (detectedOrder === 0 && nodes.length >= 3) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          const u = nodes[i].id;
          const v = nodes[j].id;
          const w = nodes[k].id;
          if (adj.get(u)?.includes(v) && adj.get(v)?.includes(w) && adj.get(w)?.includes(u)) {
            detectedOrder = 3;
            loopNodeIds.add(u);
            loopNodeIds.add(v);
            loopNodeIds.add(w);
          }
        }
      }
    }
  }

  for (const arc of arcs) {
    if (loopNodeIds.has(arc.fromBeadId) && loopNodeIds.has(arc.toBeadId)) {
      arc.inClosedLoop = true;
      arc.loopOrder = detectedOrder;
    }
  }

  if (detectedOrder >= 3 && state.activeLoopOrder !== detectedOrder) {
    state.soundQueue.push({
      type: 'aether_chord',
      pitch: detectedOrder >= 4 ? 1.35 : 1.0,
      intensity: 1.1,
    });
    if (state.currentCommission.requiredTrait === 'quicksilver_loop') {
      state.commissionTraitMet = true;
    }
  }

  state.activeLoopOrder = detectedOrder;
  state.activeArcs = arcs;
}

/**
 * Triggers Philosopher's Salt crystallization: freezes all active reactions in place
 * and fuses adjacent reagents in the Crucible into a single high-tier Philosopher's Gem.
 */
export function triggerSaltCrystallization(
  state: CruciblePressState,
  saltBead: ReagentBead
): ReagentBead | null {
  const neighbors = state.beads.filter(
    (b) =>
      b.id !== saltBead.id &&
      b.location === 'crucible' &&
      b.kind !== 'wax_seal' &&
      Math.hypot(b.x - saltBead.x, b.y - saltBead.y) <= 135
  );

  if (neighbors.length === 0) return null;

  // Freeze all crucible beads & arrest pressure build
  for (const b of state.beads) {
    if (b.location === 'crucible') {
      b.frozenTimer = 4.5;
      b.vx *= 0.1;
      b.vy *= 0.1;
    }
  }

  // Fuse up to 3 closest neighbors + the Salt crystal into a single high-tier Philosopher's Gem
  neighbors.sort(
    (a, b) =>
      Math.hypot(a.x - saltBead.x, a.y - saltBead.y) -
      Math.hypot(b.x - saltBead.x, b.y - saltBead.y)
  );
  const consumedIds = new Set<number>([saltBead.id]);
  let combinedPurity = saltBead.purityRank + 6;
  for (let i = 0; i < Math.min(2, neighbors.length); i++) {
    consumedIds.add(neighbors[i].id);
    combinedPurity += neighbors[i].purityRank * 2;
  }

  const gemX = saltBead.x;
  const gemY = saltBead.y;
  state.beads = state.beads.filter((b) => !consumedIds.has(b.id));

  const gem = spawnBead(state, 'philosopher_gem', gemX, gemY, 'crucible', 0, -25);
  gem.purityRank = combinedPurity;
  gem.frozenTimer = 4.5;
  gem.chargeGlow = 1.0;

  state.rawPotValue += combinedPurity * 1.4;
  state.purityMultiplier = Math.min(25, +(state.purityMultiplier + 1.25).toFixed(2));
  state.vesselPressureBar = Math.max(0.8, state.vesselPressureBar - 1.2);

  if (state.currentCommission.requiredTrait === 'philosopher_gem') {
    state.commissionTraitMet = true;
  }

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    state.vapors.push({
      id: state.nextVaporId++,
      x: gemX,
      y: gemY,
      vx: Math.cos(angle) * 65,
      vy: Math.sin(angle) * 65,
      radius: 11,
      kind: 'salt_frost',
      life: 0,
      maxLife: 0.85,
      temperature: 15,
    });
  }

  state.soundQueue.push({ type: 'salt_crystallize', pitch: 1.05, intensity: 1.2 });
  return gem;
}

export function advanceCommissionIfComplete(state: CruciblePressState): void {
  if (state.mintedCoins + state.pendingAssayCoins < state.currentCommission.targetQuotaCoins) {
    return;
  }
  if (state.pendingAssayCoins > 0) {
    // Wait until the last coin-weight lands on the Assay Scale pan for full tactile payoff
    return;
  }

  state.commissionStampAnim = 1.0;
  state.soundQueue.push({ type: 'commission_seal', pitch: 1.0, intensity: 1.2 });

  const nextIdx = state.commissionIndex + 1;
  state.commissionIndex = nextIdx;

  if (nextIdx < COMMISSIONS.length) {
    state.currentCommission = {
      ...COMMISSIONS[nextIdx],
      // Ensure target quota is always above current minted coins
      targetQuotaCoins: Math.max(
        COMMISSIONS[nextIdx].targetQuotaCoins,
        state.mintedCoins + 4 + nextIdx * 2
      ),
    };
  } else {
    // Endless Master Alchemist commissions
    const extraQuota = state.mintedCoins + 8 + (nextIdx - COMMISSIONS.length) * 3;
    state.currentCommission = {
      index: nextIdx,
      slipTitle: `Grand Assay #${nextIdx + 1}.`,
      patronName: 'High Alchemical Synod',
      subNote: 'Combine Quicksilver loops, Vitriol, and Philosopher Salt for maximum yield.',
      targetQuotaCoins: extraQuota,
      requiredTrait: 'any_distill',
      chuteLoadout: ['cinnabar', 'lead_geode', 'vitriol', 'quicksilver', 'salt'],
      spawnWaxBarrier: nextIdx % 2 === 0,
    };
  }

  state.commissionTraitMet = false;

  if (state.currentCommission.spawnWaxBarrier) {
    spawnBead(
      state,
      'wax_seal',
      CRUCIBLE_CENTER_X,
      DIVIDER_Y - 18,
      'crucible',
      0,
      0
    );
  }

  dispenseChuteLoadout(state);
}

export function stepSimulation(state: CruciblePressState, dtInput: number): void {
  const dt = Math.min(0.033, Math.max(0.001, dtInput));
  state.elapsedSec += dt;

  if (state.ruptureFlash > 0) {
    state.ruptureFlash = Math.max(0, state.ruptureFlash - dt * 1.8);
  }
  if (state.commissionStampAnim > 0) {
    state.commissionStampAnim = Math.max(0, state.commissionStampAnim - dt * 1.2);
  }

  // 1. Step all Hooke's-law spring-damper mechanisms
  stepSpring(state.bellowsSpring, dt);
  stepSpring(state.dischargeSpring, dt);
  stepSpring(state.pressureGateSpring, dt);
  stepSpring(state.shearBladeSpring, dt);
  stepSpring(state.chutePullSpring, dt);
  stepSpring(state.anvilHammerSpring, dt);
  stepSpring(state.scalePanSpring, dt);
  stepSpring(state.scaleBeamSpring, dt);

  for (const att of state.attachments) {
    stepSpring(att.spring, dt);
    att.angle += att.angularVelocity * dt;
    att.angularVelocity *= Math.pow(0.25, dt);
  }

  // Rotate Alembic Drum with angular damping
  state.alembicAngle += state.alembicAngularVel * dt;
  if (state.hand.dragKind !== 'alembic_drum') {
    // Gentle baseline rotation or damping back to slow idle turn
    state.alembicAngularVel += (0.15 - state.alembicAngularVel) * Math.min(1, dt * 2.5);
  }

  // Prism Lens spring alignment toward target angle
  const prismDiff = state.prismTargetAngle - state.prismAngle;
  state.prismAngularVel += (prismDiff * 120 - state.prismAngularVel * 14) * dt;
  state.prismAngle += state.prismAngularVel * dt;

  // 2. Focused Thermal Beam from the Prism Lens
  const lensOriginX = 392;
  const lensOriginY = 265;
  const beamDirX = Math.cos(state.prismAngle);
  const beamDirY = Math.sin(state.prismAngle);

  // 3. Vessel ambient cooling & venting vs clamping
  const ambientTemp = 32;
  const coolingRate = state.ventClosed ? 2.2 : 9.5;
  state.vesselTempC = Math.max(ambientTemp, state.vesselTempC - coolingRate * dt);

  if (state.ventClosed) {
    // Clamped vent builds pressure from thermal heat & active beads
    const heatFactor = Math.max(0, (state.vesselTempC - 55) / 140);
    const crucibleCount = state.beads.filter((b) => b.location === 'crucible').length;
    const buildRate = heatFactor * 0.55 + (crucibleCount > 0 ? 0.12 * heatFactor : 0);
    state.vesselPressureBar = Math.min(10.5, state.vesselPressureBar + buildRate * dt);
    if (crucibleCount > 0 && state.vesselPressureBar > 2.2) {
      state.purityMultiplier = Math.min(
        25,
        +(state.purityMultiplier + state.vesselPressureBar * 0.035 * dt).toFixed(3)
      );
    }
  } else {
    // Open vent bleeds pressure safely toward 0.4 Bar
    state.vesselPressureBar += (0.4 - state.vesselPressureBar) * Math.min(1, dt * 1.9);
  }

  // Twin-Jaw Crusher attachment passive check for geodes in upper throat
  const crusherUnlocked = state.attachments.some(
    (a) => a.id === 'twin_jaw_crusher' && a.unlocked
  );
  const lodestoneUnlocked = state.attachments.some(
    (a) => a.id === 'lodestone_ring' && a.unlocked
  );

  // 4. Step each Reagent Bead (Cursor-as-Hand spring tether + gravity + thermal & chemical rules)
  const gravity = 460;

  for (let i = state.beads.length - 1; i >= 0; i--) {
    const b = state.beads[i];
    if (!b) continue;
    if (b.frozenTimer > 0) {
      b.frozenTimer = Math.max(0, b.frozenTimer - dt);
    }

    const isDragged = state.hand.isDown && state.hand.dragKind === 'bead' && state.hand.draggedBeadId === b.id;

    if (isDragged) {
      // Requirement 2: Cursor-as-Hand damped physical spring so heavy Lead ingots lag behind
      // your hand with real inertia while light Sulfur/Salt sparks snap tautly.
      const stiffness = 260 / Math.pow(b.mass, 0.85);
      const damping = 22 / Math.pow(b.mass, 0.45);
      const dx = state.hand.x - b.x;
      const dy = state.hand.y - b.y;
      state.hand.tetherStretchX = dx;
      state.hand.tetherStretchY = dy;

      const ax = dx * stiffness - b.vx * damping;
      const ay = dy * stiffness - b.vy * damping + gravity * 0.28;
      b.vx += ax * dt;
      b.vy += ay * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Update location zone based on where the player moves the bead
      updateBeadZoneFromCoordinates(state, b);
      continue;
    }

    // Apply gravity (scaled slightly so heavy Lead sinks faster through fluid/vapor)
    const gravScale = b.frozenTimer > 0 ? 0.08 : b.kind === 'lead' ? 1.32 : 1.0;
    b.vy += gravity * gravScale * dt;

    // Air/fluid drag
    const drag = b.location === 'crucible' ? 0.992 : 0.988;
    b.vx *= Math.pow(drag, dt * 60);
    b.vy *= Math.pow(drag, dt * 60);
    b.rotation += b.angularVelocity * dt;
    b.angularVelocity *= Math.pow(0.95, dt * 60);

    // Prism Lens focused thermal beam heating
    if (b.location === 'crucible') {
      const relX = b.x - lensOriginX;
      const relY = b.y - lensOriginY;
      const proj = relX * beamDirX + relY * beamDirY;
      if (proj > 40 && proj < 440) {
        const perpDist = Math.abs(relX * beamDirY - relY * beamDirX);
        if (perpDist < 38 + b.radius) {
          b.temperature = Math.min(320, b.temperature + 68 * dt);
          b.chargeGlow = Math.min(1, b.chargeGlow + 0.5 * dt);
          if (b.kind === 'lead_geode' && b.temperature > 175) {
            b.shellIntegrity -= 0.48 * dt;
            if (b.shellIntegrity <= 0) {
              crackGeodeBead(state, b, 'thermal');
            }
          }
        }
      }

      // Twin-Jaw Crusher auto-cracks geodes in the upper chamber throat
      if (crusherUnlocked && b.kind === 'lead_geode' && b.y < 250) {
        crackGeodeBead(state, b, 'crusher');
      }

      // Magnetic Lodestone Ring gently pulls conductive beads into orbital alignment
      if (lodestoneUnlocked && (b.kind === 'quicksilver' || b.kind === 'gold_core')) {
        const dx = CRUCIBLE_CENTER_X - b.x;
        const dy = CRUCIBLE_CENTER_Y + 42 - b.y;
        const dist = Math.hypot(dx, dy) || 1;
        const targetR = 64;
        const radialForce = (dist - targetR) * 3.2;
        b.vx += ((dx / dist) * radialForce - (dy / dist) * 18) * dt;
        b.vy += ((dy / dist) * radialForce + (dx / dist) * 18) * dt;
      }
    }

    // Chemistry Rule 2: Cinnabar / Ember (Exothermic) radiates heat to vessel & neighbors
    if (b.kind === 'cinnabar' && b.frozenTimer <= 0) {
      b.temperature = Math.max(125, b.temperature);
      if (b.location === 'crucible') {
        state.vesselTempC = Math.min(320, state.vesselTempC + 14 * dt);
        state.rawPotValue += 0.45 * dt;
        if (state.ventClosed) {
          state.vesselPressureBar = Math.min(10.5, state.vesselPressureBar + 0.24 * dt);
        }
      }
      // Radiate heat to nearby beads within 95px
      for (const other of state.beads) {
        if (other.id === b.id || other.location !== b.location) continue;
        const d = Math.hypot(other.x - b.x, other.y - b.y);
        if (d < 95) {
          other.temperature = Math.min(310, other.temperature + 48 * dt);
          if (other.kind === 'wax_seal') {
            other.shellIntegrity -= 0.85 * dt;
          } else if (other.kind === 'lead_geode' && other.temperature > 155) {
            other.shellIntegrity -= 0.42 * dt;
            if (other.shellIntegrity <= 0) {
              crackGeodeBead(state, other, 'thermal');
            }
          }
        }
      }

      // Ignite nearby volatile gas clouds!
      for (const vap of state.vapors) {
        if (
          (vap.kind === 'volatile_gas' || vap.kind === 'acid_fume' || vap.kind === 'mercury_vapor') &&
          Math.hypot(vap.x - b.x, vap.y - b.y) < 85
        ) {
          vap.kind = 'ignition_flare';
          vap.life = 0;
          vap.maxLife = 0.55;
          vap.radius = 28;
          state.rawPotValue += 2.2;
          state.purityMultiplier = Math.min(25, +(state.purityMultiplier + 0.3).toFixed(2));
          state.vesselPressureBar = Math.min(10.5, state.vesselPressureBar + 0.65);
          state.soundQueue.push({ type: 'vapor_ignite', pitch: 1.0, intensity: 1.0 });
        }
      }
    }

    // Melt wax barrier when heated
    if (b.kind === 'wax_seal' && (b.temperature > 95 || b.shellIntegrity <= 0)) {
      b.shellIntegrity -= 0.7 * dt;
      if (b.shellIntegrity <= 0) {
        state.beads.splice(i, 1);
        state.rawPotValue += 1.5;
        state.soundQueue.push({ type: 'anvil_hiss', pitch: 0.9, intensity: 0.9 });
        continue;
      }
    }

    // Chemistry Rule 5: Philosopher's Salt inside Crucible freezes reactions & crystallizes neighbors
    if (b.kind === 'salt' && b.location === 'crucible') {
      const gem = triggerSaltCrystallization(state, b);
      if (gem) {
        continue;
      }
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Constrain bead to its current physical tray/vessel
    constrainBeadToEnvironment(state, b, dt);
  }

  // 5. Pairwise Bead-to-Bead Collisions & Contact Chemistry
  resolveBeadCollisionsAndChemistry(state, dt);

  // 6. Update Quicksilver / Gold Core Conductive Network (Triangle x3, Quad x5)
  updateConductiveNetwork(state);
  if (state.activeLoopOrder >= 3) {
    const loopRate = state.activeLoopOrder >= 4 ? 1.8 : 0.95;
    state.rawPotValue += loopRate * dt;
  }

  // 7. Update Bourdon Pressure Gauge Needle & Hairline Glass Cracks
  const normPressure = Math.min(1.05, Math.max(0, state.vesselPressureBar / 10));
  const jitter =
    state.vesselPressureBar > 6.0
      ? Math.sin(state.elapsedSec * 52) * ((state.vesselPressureBar - 6.0) * 0.015)
      : 0;
  state.gaugeNeedleSpring.target = normPressure + jitter;
  stepSpring(state.gaugeNeedleSpring, dt);

  if (state.vesselPressureBar > 6.2) {
    state.gaugeTickAccumulator += dt * (2.5 + (state.vesselPressureBar - 6.0) * 3.2);
    if (state.gaugeTickAccumulator >= 1) {
      state.gaugeTickAccumulator = 0;
      state.soundQueue.push({
        type: 'gauge_tick',
        pitch: 0.9 + normPressure * 0.5,
        intensity: 0.6 + normPressure * 0.4,
      });
    }

    // Spawn spiderwebbing hairline glass cracks as pressure climbs toward 10 Bar
    const desiredCracks = Math.floor((state.vesselPressureBar - 5.8) * 2.2);
    while (state.cracks.length < desiredCracks && state.cracks.length < 9) {
      const angle = nextRandom(state) * Math.PI * 2;
      const dist = 60 + nextRandom(state) * 95;
      state.cracks.push({
        x: CRUCIBLE_CENTER_X + Math.cos(angle) * dist,
        y: CRUCIBLE_CENTER_Y + Math.sin(angle) * dist,
        angle: angle + (nextRandom(state) - 0.5) * 1.2,
        length: 28 + nextRandom(state) * 42,
        branches: [
          { angleOffset: 0.55, length: 16 + nextRandom(state) * 18, t: 0.45 },
          { angleOffset: -0.62, length: 14 + nextRandom(state) * 16, t: 0.72 },
        ],
        severity: Math.min(1, (state.vesselPressureBar - 5.8) / 4.2),
      });
      state.soundQueue.push({ type: 'glass_crack', pitch: 0.95 + state.cracks.length * 0.06, intensity: 0.9 });
    }
  }

  // Vessel overpressure blowout at 10.0 Bar
  if (state.vesselPressureBar >= 10.0) {
    state.ruptureFlash = 1.0;
    state.ventClosed = false;
    state.pressureGateSpring.target = 0;
    state.pressureGateSpring.velocity = -12;
    state.vesselPressureBar = 1.1;
    state.purityMultiplier = Math.max(1.0, +(state.purityMultiplier * 0.5).toFixed(2));
    state.rawPotValue *= 0.5;
    state.soundQueue.push({ type: 'vessel_blowout', pitch: 1.0, intensity: 1.3 });

    for (const b of state.beads) {
      if (b.location === 'crucible') {
        b.vy = -220 - nextRandom(state) * 120;
        b.vx = (nextRandom(state) - 0.5) * 240;
      }
    }
  }

  // 8. Step Vapor Clouds
  for (let i = state.vapors.length - 1; i >= 0; i--) {
    const v = state.vapors[i];
    v.life += dt;
    if (v.life >= v.maxLife) {
      state.vapors.splice(i, 1);
      continue;
    }
    v.x += v.vx * dt;
    v.y += v.vy * dt;
    v.radius += 12 * dt;
  }

  // 9. Step Assay Scale Coin-Weight Cascade
  if (state.pendingAssayCoins > 0) {
    state.assayDropTimer -= dt;
    if (state.assayDropTimer <= 0) {
      state.pendingAssayCoins--;
      state.assayDropTimer = 0.11;
      const coinIndex = state.scaleCoins.length;
      state.scaleCoins.push({
        id: state.nextCoinId++,
        x: SCALE_LEFT_PAN_X + (nextRandom(state) - 0.5) * 26,
        y: SCALE_PIVOT_Y + 18,
        vx: (nextRandom(state) - 0.5) * 14,
        vy: 165,
        radius: 10,
        value: 1,
        settledOnPan: false,
        toneIndex: coinIndex,
      });
    }
  }

  const panY = SCALE_PAN_BASE_Y + state.scalePanSpring.position;
  for (const coin of state.scaleCoins) {
    if (!coin.settledOnPan) {
      coin.vy += 520 * dt;
      coin.x += coin.vx * dt;
      coin.y += coin.vy * dt;
      if (coin.y >= panY - 6) {
        coin.y = panY - 6;
        coin.vy = 0;
        coin.settledOnPan = true;
        state.mintedCoins += coin.value;
        state.lifetimeCoins += coin.value;

        // Requirement 2: When an ingot/coin lands on a brass pan, the pan dips, clanks,
        // and oscillates before settling via Hooke's-law spring-damper physics.
        state.scalePanSpring.velocity += 95;
        state.scalePanSpring.target = Math.min(28, state.scaleCoins.length * 1.4);
        state.scaleBeamSpring.velocity -= 2.4;
        state.scaleBeamSpring.target = Math.max(-0.26, -state.scaleCoins.length * 0.015);

        state.soundQueue.push({
          type: 'coin_chime',
          pitch: 1.0 + coin.toneIndex * 0.09,
          intensity: 1.0,
        });
      }
    } else {
      coin.y = panY - 6 - Math.min(24, (coin.id % 7) * 3.2);
    }
  }

  // Check if current Patron Commission quota is fulfilled
  advanceCommissionIfComplete(state);
}

function updateBeadZoneFromCoordinates(state: CruciblePressState, b: ReagentBead): void {
  // Check if positioned over the Crucible funnel or chamber
  const inFunnel =
    b.x >= CRUCIBLE_CENTER_X - 88 &&
    b.x <= CRUCIBLE_CENTER_X + 88 &&
    b.y >= 40 &&
    b.y <= 185;
  const inCrucibleBody =
    Math.hypot((b.x - CRUCIBLE_CENTER_X) / CRUCIBLE_RADIUS_X, (b.y - CRUCIBLE_CENTER_Y) / CRUCIBLE_RADIUS_Y) <= 1.02;

  if (inFunnel || inCrucibleBody) {
    b.location = 'crucible';
  } else if (b.x <= 345 && b.y >= 490) {
    b.location = 'anvil';
  } else if (b.x <= 345 && b.y < 490) {
    b.location = 'chute';
  }
}

function constrainBeadToEnvironment(
  state: CruciblePressState,
  b: ReagentBead,
  dt: number
): void {
  if (b.location === 'chute') {
    // Sloped brass reagent tray (left to right gentle incline toward lip at x = 308)
    const floorY = 392 + (b.x - 60) * 0.14;
    if (b.x < 56 + b.radius) {
      b.x = 56 + b.radius;
      b.vx = Math.abs(b.vx) * b.restitution;
    }
    if (b.x > 306 - b.radius) {
      b.x = 306 - b.radius;
      if (Math.abs(b.vx) > 28) {
        state.soundQueue.push({
          type: b.kind === 'lead' ? 'thud_lead' : 'clink_brass',
          pitch: 20 / b.radius,
          intensity: Math.min(1, Math.abs(b.vx) / 140),
        });
      }
      b.vx = -Math.abs(b.vx) * b.restitution;
    }
    if (b.y > floorY - b.radius) {
      if (b.vy > 55) {
        state.soundQueue.push({
          type: b.kind === 'lead' ? 'thud_lead' : 'clink_brass',
          pitch: 20 / b.radius,
          intensity: Math.min(1, b.vy / 180),
        });
      }
      b.y = floorY - b.radius;
      b.vy = -b.vy * b.restitution;
      b.vx += 24 * dt; // Gentle roll down the brass chute slope
      b.angularVelocity = b.vx / b.radius;
    }
    return;
  }

  if (b.location === 'anvil') {
    // Heated Copper Anvil Tray ("The Physical Artifact Test")
    if (b.x < ANVIL_PLATE_X1 + b.radius) {
      b.x = ANVIL_PLATE_X1 + b.radius;
      b.vx = Math.abs(b.vx) * b.restitution;
    }
    if (b.x > ANVIL_PLATE_X2 - b.radius) {
      b.x = ANVIL_PLATE_X2 - b.radius;
      b.vx = -Math.abs(b.vx) * b.restitution;
    }
    if (b.y > ANVIL_PLATE_Y - b.radius) {
      const impactSpeed = b.vy;
      b.y = ANVIL_PLATE_Y - b.radius;
      b.vy = -b.vy * b.restitution;

      if (impactSpeed > 45) {
        // Heavy Pan/Anvil dip & clank
        state.soundQueue.push({
          type: b.kind === 'lead' ? 'thud_lead' : 'clink_brass',
          pitch: 18 / b.radius,
          intensity: Math.min(1.2, impactSpeed / 160),
        });
      }

      // Heated copper anvil (~195°C) heats anything resting on it!
      b.temperature = Math.min(240, b.temperature + 75 * dt);

      // Mercury / Quicksilver or Vitriol dropped onto the heated copper anvil beads, dances, and hisses into vapor!
      if (b.kind === 'quicksilver' || b.kind === 'vitriol' || b.kind === 'cinnabar') {
        b.vaporizing += 0.35 * dt;
        // Leidenfrost skitter on hot copper
        if (Math.abs(b.vy) < 18) {
          b.vy = -35 - nextRandom(state) * 28;
          b.vx += (nextRandom(state) - 0.5) * 55;
        }
        if (nextRandom(state) < 0.35) {
          state.vapors.push({
            id: state.nextVaporId++,
            x: b.x + (nextRandom(state) - 0.5) * 14,
            y: b.y - b.radius,
            vx: (nextRandom(state) - 0.5) * 35,
            vy: -55 - nextRandom(state) * 35,
            radius: 8 + nextRandom(state) * 6,
            kind: b.kind === 'quicksilver' ? 'mercury_vapor' : 'acid_fume',
            life: 0,
            maxLife: 0.75,
            temperature: 195,
          });
          state.soundQueue.push({ type: 'anvil_hiss', pitch: 1.0 + nextRandom(state) * 0.3, intensity: 0.65 });
        }
      } else if (b.kind === 'lead_geode' && b.temperature > 170) {
        b.shellIntegrity -= 0.45 * dt;
        if (b.shellIntegrity <= 0) {
          crackGeodeBead(state, b, 'thermal');
        }
      }
    }
    return;
  }

  if (b.location === 'crucible') {
    // Allow beads in the top funnel neck (y < 185) to drop smoothly into the main vessel
    if (b.y < 195 && Math.abs(b.x - CRUCIBLE_CENTER_X) < 62) {
      if (b.x < CRUCIBLE_CENTER_X - 52 + b.radius) {
        b.x = CRUCIBLE_CENTER_X - 52 + b.radius;
        b.vx = Math.abs(b.vx) * 0.5;
      } else if (b.x > CRUCIBLE_CENTER_X + 52 - b.radius) {
        b.x = CRUCIBLE_CENTER_X + 52 - b.radius;
        b.vx = -Math.abs(b.vx) * 0.5;
      }
      return;
    }

    // Internal Semi-Permeable Brass Divider Grate at y = DIVIDER_Y
    // Has a central aperture (x: 594..656) unless blocked by a wax_seal
    const inCentralAperture = Math.abs(b.x - CRUCIBLE_CENTER_X) < 28;
    if (!state.dividerOpen && !inCentralAperture) {
      if (b.vy > 0 && b.y + b.radius >= DIVIDER_Y - 5 && b.y - b.radius < DIVIDER_Y + 8) {
        if (b.vy > 60) {
          state.soundQueue.push({
            type: b.kind === 'lead' ? 'thud_lead' : 'clink_brass',
            pitch: 19 / b.radius,
            intensity: Math.min(1, b.vy / 200),
          });
        }
        b.y = DIVIDER_Y - 5 - b.radius;
        b.vy = -b.vy * b.restitution;

        // Chemistry Rule 3: Vitriol / Acid eats through brass dividers if left unvented!
        if (b.kind === 'vitriol') {
          const corrosionRate = state.ventClosed ? 0.55 : 0.14;
          state.dividerIntegrity = Math.max(0, state.dividerIntegrity - corrosionRate * dt);
          if (nextRandom(state) < 0.3) {
            state.vapors.push({
              id: state.nextVaporId++,
              x: b.x,
              y: DIVIDER_Y,
              vx: (nextRandom(state) - 0.5) * 35,
              vy: -45,
              radius: 9,
              kind: 'acid_fume',
              life: 0,
              maxLife: 0.65,
              temperature: state.vesselTempC,
            });
            state.soundQueue.push({ type: 'acid_sizzle', pitch: 0.95, intensity: 0.6 });
          }
          if (state.dividerIntegrity <= 0) {
            state.dividerOpen = true;
            state.soundQueue.push({ type: 'shear_snap', pitch: 0.72, intensity: 1.1 });
          }
        }
      }
    }

    // Elliptical Smoked-Glass Crucible Wall + Rotating Alembic Drum Paddles
    const rx = CRUCIBLE_RADIUS_X - b.radius - 6;
    const ry = CRUCIBLE_RADIUS_Y - b.radius - 6;
    const dx = b.x - CRUCIBLE_CENTER_X;
    const dy = b.y - CRUCIBLE_CENTER_Y;
    const normDist = Math.hypot(dx / rx, dy / ry);

    if (normDist > 1.0) {
      const nx = dx / (rx * rx);
      const ny = dy / (ry * ry);
      const nLen = Math.hypot(nx, ny) || 1;
      const unitNx = nx / nLen;
      const unitNy = ny / nLen;

      b.x = CRUCIBLE_CENTER_X + (dx / normDist);
      b.y = CRUCIBLE_CENTER_Y + (dy / normDist);

      const vn = b.vx * unitNx + b.vy * unitNy;
      if (vn > 0) {
        if (vn > 55) {
          // Glass-on-glass clink pitched inversely by bead radius/mass!
          state.soundQueue.push({
            type: b.kind === 'lead' ? 'thud_lead' : 'clink_glass',
            pitch: 18 / b.radius,
            intensity: Math.min(1.1, vn / 210),
          });
        }
        b.vx -= (1 + b.restitution) * vn * unitNx;
        b.vy -= (1 + b.restitution) * vn * unitNy;
      }

      // Tangential impulse from the Rotating Alembic Drum paddles!
      const tangentX = -unitNy;
      const tangentY = unitNx;
      const drumRimSpeed = state.alembicAngularVel * 145;
      b.vx += tangentX * drumRimSpeed * 0.35;
      b.vy += tangentY * drumRimSpeed * 0.35;
      b.angularVelocity = drumRimSpeed / b.radius;
    }

    // High-heat volatile gas generation inside the crucible
    if (
      (b.kind === 'vitriol' || b.kind === 'quicksilver') &&
      (b.temperature > 115 || state.vesselTempC > 130) &&
      nextRandom(state) < 0.08
    ) {
      state.vapors.push({
        id: state.nextVaporId++,
        x: b.x,
        y: b.y - b.radius,
        vx: (nextRandom(state) - 0.5) * 40,
        vy: -50 - nextRandom(state) * 30,
        radius: 12,
        kind: 'volatile_gas',
        life: 0,
        maxLife: 1.25,
        temperature: b.temperature,
      });
    }
  }
}

function resolveBeadCollisionsAndChemistry(state: CruciblePressState, dt: number): void {
  const n = state.beads.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = state.beads[i];
      const b = state.beads[j];
      if (!a || !b || a.location !== b.location) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = a.radius + b.radius;

      // Fluid wetting halo for Vitriol / Acid and Cinnabar radiant contact
      if (dist > 0 && dist < minDist + 16) {
        if (
          (a.kind === 'vitriol' && b.kind === 'lead_geode') ||
          (b.kind === 'vitriol' && a.kind === 'lead_geode')
        ) {
          const geode = a.kind === 'lead_geode' ? a : b;
          const acid = a.kind === 'vitriol' ? a : b;
          geode.shellIntegrity -= 1.45 * dt;
          // Capillary attraction pulls fluid Vitriol gently against the geode shell
          const pullX = ((geode.x - acid.x) / dist) * 28 * dt;
          const pullY = ((geode.y - acid.y) / dist) * 28 * dt;
          acid.vx += pullX;
          acid.vy += pullY;
          acid.radius = Math.max(12, acid.radius - 1.8 * dt);
          if (nextRandom(state) < 0.35) {
            state.vapors.push({
              id: state.nextVaporId++,
              x: geode.x,
              y: geode.y - 10,
              vx: (nextRandom(state) - 0.5) * 35,
              vy: -55,
              radius: 9,
              kind: 'acid_fume',
              life: 0,
              maxLife: 0.6,
              temperature: geode.temperature,
            });
          }
          if (geode.shellIntegrity <= 0) {
            crackGeodeBead(state, geode, 'acid');
          }
        }
      }

      if (dist > 0 && dist < minDist) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        const invMassA = 1 / a.mass;
        const invMassB = 1 / b.mass;
        const invMassSum = invMassA + invMassB;

        a.x -= nx * overlap * (invMassA / invMassSum);
        a.y -= ny * overlap * (invMassA / invMassSum);
        b.x += nx * overlap * (invMassB / invMassSum);
        b.y += ny * overlap * (invMassB / invMassSum);

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const relNormalVel = rvx * nx + rvy * ny;
        const impactSpeed = Math.abs(relNormalVel);

        if (relNormalVel < 0) {
          const e = Math.min(a.restitution, b.restitution);
          const jImpulse = (-(1 + e) * relNormalVel) / invMassSum;
          a.vx -= jImpulse * invMassA * nx;
          a.vy -= jImpulse * invMassA * ny;
          b.vx += jImpulse * invMassB * nx;
          b.vy += jImpulse * invMassB * ny;

          if (impactSpeed > 42) {
            const avgRadius = (a.radius + b.radius) * 0.5;
            const hasLead = a.kind === 'lead' || b.kind === 'lead';
            state.soundQueue.push({
              type: hasLead ? 'thud_lead' : 'clink_glass',
              pitch: 18 / avgRadius,
              intensity: Math.min(1.15, impactSpeed / 190),
            });
          }
        }

        // --- EMERGENT 5-REAGENT CONTACT CHEMISTRY ---

        // 1. Slag / Lead (Heavy, Inert): Crushes brittle crystals/geodes/wax on impact when dropped from height!
        if (impactSpeed > 95) {
          if (a.kind === 'lead' && (b.kind === 'lead_geode' || b.kind === 'wax_seal')) {
            if (b.kind === 'lead_geode') {
              crackGeodeBead(state, b, 'impact');
            } else {
              b.shellIntegrity = 0;
            }
          } else if (b.kind === 'lead' && (a.kind === 'lead_geode' || a.kind === 'wax_seal')) {
            if (a.kind === 'lead_geode') {
              crackGeodeBead(state, a, 'impact');
            } else {
              a.shellIntegrity = 0;
            }
          }
        }

        // 2. Cinnabar / Ember + Lead Geode: Direct contact heat transfer cracks the shell
        if (
          (a.kind === 'cinnabar' && b.kind === 'lead_geode') ||
          (b.kind === 'cinnabar' && a.kind === 'lead_geode')
        ) {
          const geode = a.kind === 'lead_geode' ? a : b;
          geode.temperature += 95 * dt;
          geode.shellIntegrity -= 0.75 * dt;
          if (geode.shellIntegrity <= 0) {
            crackGeodeBead(state, geode, 'thermal');
          }
        }

        // 3. Vitriol / Acid (Corrosive Fluid): Dissolves outer shells off geode beads to expose pure Gold Cores!
        if (
          (a.kind === 'vitriol' && b.kind === 'lead_geode') ||
          (b.kind === 'vitriol' && a.kind === 'lead_geode')
        ) {
          const geode = a.kind === 'lead_geode' ? a : b;
          const acid = a.kind === 'vitriol' ? a : b;
          geode.shellIntegrity -= 1.35 * dt;
          acid.radius = Math.max(12, acid.radius - 2.2 * dt);
          if (nextRandom(state) < 0.35) {
            state.vapors.push({
              id: state.nextVaporId++,
              x: geode.x,
              y: geode.y - 10,
              vx: (nextRandom(state) - 0.5) * 35,
              vy: -55,
              radius: 9,
              kind: 'acid_fume',
              life: 0,
              maxLife: 0.6,
              temperature: geode.temperature,
            });
          }
          if (geode.shellIntegrity <= 0) {
            crackGeodeBead(state, geode, 'acid');
          }
        }
      }
    }
  }
}
