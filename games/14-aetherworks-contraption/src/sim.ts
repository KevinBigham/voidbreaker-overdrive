import {
  BlueprintCard,
  BossModifierId,
  DRAFT_BLUEPRINT_POOL,
  getQuotaStageConfig,
  MODULE_CATALOG,
  ModuleKind,
  RelicId,
} from './blueprints';
import { computeHarmonicFrequency } from './synth';

export type OrbTier = 'raw' | 'heated' | 'supercritical';

export interface ContraptionModule {
  id: string;
  kind: ModuleKind;
  /** Grid coordinates when seated on the workbench; null when in the parts tray */
  col: number | null;
  row: number | null;
  trayIndex: number;
  /** Target magnetic detent angle in degrees (multiples of 60 or 90) */
  targetAngleDeg: number;
  /** Actual rendered angle in degrees (driven by spring stiffness: 420, damping: 22) */
  currentAngleDeg: number;
  /** Angular velocity in deg/sec for spring overshoot */
  angleVelDeg: number;
  /** Detent step size (60 or 90) */
  detentStepDeg: 60 | 90;
  /** Squash-and-stretch seat scale on socket drop */
  seatScaleX: number;
  seatScaleY: number;
  seatScaleVelX: number;
  seatScaleVelY: number;
  /** Micro hit-stop timer (seconds) when slammed by an orb */
  hitStopTimer: number;
  /** Spring mount recoil offset & velocity in pixels */
  recoilX: number;
  recoilY: number;
  recoilVelX: number;
  recoilVelY: number;
  /** Live connection preview pulse timer (seconds) on drop */
  connectionPulseTimer: number;
  /** Cracked state if damaged by over-pressurized boiler collision */
  cracked: boolean;
  /** Activation glow pulse (0..1) */
  activationGlow: number;
  /** Pendulum phase angle (radians) for pendulum modules */
  pendulumPhase: number;
}

export interface Orb {
  id: string;
  /** Normalized grid space coordinates where (col + 0.5, row + 0.5) is socket center */
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  value: number;
  tier: OrbTier;
  /** Time spent in the current cascade pass (seconds) for anti-stuck guarantee */
  loopTimer: number;
  /** Total module bounces in this pass */
  bounceCount: number;
  /** Last two module IDs hit to detect rapid infinite two-part ping-pong */
  lastModuleId: string | null;
  prevModuleId: string | null;
  pingPongCount: number;
  /** Cooldown map per module ID so an orb doesn't collide twice in the same millisecond */
  hitCooldowns: Record<string, number>;
  /** Whether this orb is currently in an Overload Surge direct ejection to the chute */
  isSurging: boolean;
  trail: Array<{ x: number; y: number; tier: OrbTier }>;
}

export interface FloatingBadge {
  id: string;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  kind: 'spark' | 'steam' | 'coin' | 'dust';
}

export interface LightningArc {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface FrostNode {
  col: number;
  row: number;
  thawed: boolean;
  bonusMultiplier: number;
}

export type AudioEvent =
  | { type: 'pickup_clack' }
  | { type: 'ratchet_click'; angleDeg: number }
  | { type: 'socket_seat'; neighborCount: number }
  | { type: 'lever_thunk' }
  | { type: 'cascade_note'; activationIndex: number; tier: OrbTier; frequencyHz: number }
  | { type: 'overclock_recycle'; multiplier: number }
  | { type: 'pneumatic_cashout'; multiplier: number }
  | { type: 'gasket_blowout' };

export type GamePhase = 'wiring' | 'cascade' | 'draft' | 'gameover' | 'victory';

export interface ContraptionState {
  seed: number;
  rngState: number;
  phase: GamePhase;

  // Strictly 3 HUD numbers per Rule 2: QUOTA, BANKED, CYCLES LEFT
  quotaLevel: number;
  quotaTarget: number;
  bankedScore: number;
  cyclesLeft: number;

  // Grid & Spout/Chute geometry
  gridCols: number;
  gridRows: number;
  spoutCol: number;
  chuteCol: number;
  unlockedConceptTag: string;
  bossModifier: BossModifierId;
  bossAnnouncement?: string;

  // Modules & Relics
  modules: ContraptionModule[];
  activeRelics: RelicId[];
  frostNodes: FrostNode[];

  // Tactile Drag & Spring Cursor State
  draggedModuleId: string | null;
  selectedModuleId: string | null;
  cursorGridX: number;
  cursorGridY: number;
  dragVisualX: number;
  dragVisualY: number;
  dragVelX: number;
  dragVelY: number;
  hoveredSocket: { col: number; row: number } | null;

  // Launch Lever state (0 = resting top, 1 = pulled bottom)
  leverPull: number;
  leverVel: number;
  isDraggingLever: boolean;

  // Cascade & Crucible Overclock state
  orbs: Orb[];
  collectedOrbsCount: number;
  cruciblePot: number;
  overclockMultiplier: number;
  overclockPassCount: number;
  overclockValveHeld: boolean;
  overclockValveAngle: number;
  /** Time waiting at end of pass before automatic safe cash-out if valve not held */
  collectSettleTimer: number;
  boilerPressure: number; // 0..100+
  gasketBlown: boolean;
  ouroborosUsedThisCycle: boolean;
  cascadeActivationCount: number;
  lastHarmonicFreqHz: number;

  // Between-quota Blueprint Draft
  draftChoices: BlueprintCard[];
  hoveredDraftIndex: number;

  // Visual Juice & Audio Queue
  badges: FloatingBadge[];
  particles: SparkParticle[];
  lightningArcs: LightningArc[];
  cameraShake: number;
  statusBannerText: string;
  statusBannerTimer: number;
  audioQueue: AudioEvent[];
  elapsedTime: number;
}

export const ANGULAR_SPRING_STIFFNESS = 420;
export const ANGULAR_SPRING_DAMPING = 22;

export function nextRandom(state: ContraptionState): number {
  let t = (state.rngState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  state.rngState = t >>> 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createModule(
  id: string,
  kind: ModuleKind,
  trayIndex: number,
  col: number | null = null,
  row: number | null = null,
  angleDeg = 0
): ContraptionModule {
  const meta = MODULE_CATALOG[kind];
  return {
    id,
    kind,
    col,
    row,
    trayIndex,
    targetAngleDeg: angleDeg,
    currentAngleDeg: angleDeg,
    angleVelDeg: 0,
    detentStepDeg: meta.detentStepDeg,
    seatScaleX: 1,
    seatScaleY: 1,
    seatScaleVelX: 0,
    seatScaleVelY: 0,
    hitStopTimer: 0,
    recoilX: 0,
    recoilY: 0,
    recoilVelX: 0,
    recoilVelY: 0,
    connectionPulseTimer: 0,
    cracked: false,
    activationGlow: 0,
    pendulumPhase: 0,
  };
}

export function createInitialState(seed = 1337): ContraptionState {
  const stage1 = getQuotaStageConfig(1);
  // Quota 1 starts on a compact 3x3 workbench with 1 Drop Spout, 1 Collector Chute,
  // and 2 simple modules (Angled Deflector and 2x Alchemy Furnace) ready so routing & recycling are discovered in 5s.
  const starterFurnace = createModule('mod_starter_furnace', 'furnace', 0, 1, 0, 0);
  const starterDeflector = createModule('mod_starter_deflector', 'deflector', 1, null, null, 0);

  return {
    seed,
    rngState: seed >>> 0,
    phase: 'wiring',

    quotaLevel: 1,
    quotaTarget: stage1.quotaTarget,
    bankedScore: 0,
    cyclesLeft: stage1.cyclesAllowed,

    gridCols: stage1.gridCols,
    gridRows: stage1.gridRows,
    spoutCol: Math.floor(stage1.gridCols / 2),
    chuteCol: Math.floor(stage1.gridCols / 2),
    unlockedConceptTag: stage1.unlockedConceptTag,
    bossModifier: stage1.bossModifier,
    bossAnnouncement: stage1.bossAnnouncement,

    modules: [starterFurnace, starterDeflector],
    activeRelics: [],
    frostNodes: [],

    draggedModuleId: null,
    selectedModuleId: starterDeflector.id,
    cursorGridX: 1.5,
    cursorGridY: 1.5,
    dragVisualX: 1.5,
    dragVisualY: 1.5,
    dragVelX: 0,
    dragVelY: 0,
    hoveredSocket: { col: 1, row: 1 },

    leverPull: 0,
    leverVel: 0,
    isDraggingLever: false,

    orbs: [],
    collectedOrbsCount: 0,
    cruciblePot: 0,
    overclockMultiplier: 1,
    overclockPassCount: 0,
    overclockValveHeld: false,
    overclockValveAngle: 0,
    collectSettleTimer: 0,
    boilerPressure: 0,
    gasketBlown: false,
    ouroborosUsedThisCycle: false,
    cascadeActivationCount: 0,
    lastHarmonicFreqHz: 261.63,

    draftChoices: [],
    hoveredDraftIndex: 0,

    badges: [],
    particles: [],
    lightningArcs: [],
    cameraShake: 0,
    statusBannerText: 'SNAP PARTS TO SOCKETS • PULL LEVER TO CASCADE',
    statusBannerTimer: 3.5,
    audioQueue: [],
    elapsedTime: 0,
  };
}

export function getModuleAtSocket(
  state: ContraptionState,
  col: number,
  row: number,
  excludeId?: string | null
): ContraptionModule | undefined {
  return state.modules.find(
    (m) => m.id !== excludeId && m.col === col && m.row === row
  );
}

export function getConnectedNeighbors(
  state: ContraptionState,
  col: number,
  row: number,
  excludeId?: string | null
): ContraptionModule[] {
  return state.modules.filter((m) => {
    if (m.id === excludeId || m.col === null || m.row === null) return false;
    const dist = Math.abs(m.col - col) + Math.abs(m.row - row);
    return dist === 1 || (Math.abs(m.col - col) === 1 && Math.abs(m.row - row) === 1);
  });
}

/**
 * Picks up a module from the grid or tray with spring-damped cursor lag and low-frequency clack
 */
export function pickupModule(
  state: ContraptionState,
  moduleId: string,
  gridX: number,
  gridY: number
): boolean {
  if (state.phase !== 'wiring') return false;
  const mod = state.modules.find((m) => m.id === moduleId);
  if (!mod) return false;

  state.draggedModuleId = mod.id;
  state.selectedModuleId = mod.id;
  state.cursorGridX = gridX;
  state.cursorGridY = gridY;
  state.dragVisualX = mod.col !== null ? mod.col + 0.5 : gridX;
  state.dragVisualY = mod.row !== null ? mod.row + 0.5 : gridY;
  state.dragVelX = 0;
  state.dragVelY = 0;

  // Slight pickup stretch
  mod.seatScaleX = 1.12;
  mod.seatScaleY = 1.12;
  state.audioQueue.push({ type: 'pickup_clack' });
  return true;
}

/**
 * Rotates a module in 60° or 90° magnetic detents with angular spring overshoot
 * (stiffness: 420, damping: 22) and metallic ratchet click
 */
export function rotateModule(
  state: ContraptionState,
  moduleId?: string | null,
  direction: 1 | -1 = 1
): boolean {
  const targetId = moduleId ?? state.draggedModuleId ?? state.selectedModuleId;
  if (!targetId) return false;
  const mod = state.modules.find((m) => m.id === targetId);
  if (!mod) return false;

  const step = mod.detentStepDeg;
  mod.targetAngleDeg += direction * step;
  // Kick angular velocity in rotation direction to guarantee crisp tactile spring overshoot
  mod.angleVelDeg += direction * 460;
  state.audioQueue.push({
    type: 'ratchet_click',
    angleDeg: mod.targetAngleDeg,
  });
  return true;
}

/**
 * Drops a module onto a workbench socket (or back to tray if out of bounds)
 */
export function dropModuleOnSocket(
  state: ContraptionState,
  moduleId: string,
  col: number | null,
  row: number | null
): boolean {
  const mod = state.modules.find((m) => m.id === moduleId);
  if (!mod) return false;

  if (
    col !== null &&
    row !== null &&
    col >= 0 &&
    col < state.gridCols &&
    row >= 0 &&
    row < state.gridRows
  ) {
    // Check if locked by unthawed Frost Node
    const frost = state.frostNodes.find((f) => f.col === col && f.row === row && !f.thawed);
    if (frost) {
      state.statusBannerText = 'FROST SOCKET LOCKED! THAW WITH HEATED ORB FIRST';
      state.statusBannerTimer = 2.0;
      if (state.draggedModuleId === moduleId) {
        state.draggedModuleId = null;
      }
      return false;
    }

    const occupant = getModuleAtSocket(state, col, row, mod.id);
    if (occupant) {
      // Swap occupant to mod's old socket or tray
      occupant.col = mod.col;
      occupant.row = mod.row;
    }

    mod.col = col;
    mod.row = row;

    // Squash-and-stretch seat animation
    mod.seatScaleX = 1.28;
    mod.seatScaleY = 0.74;
    mod.seatScaleVelX = 0;
    mod.seatScaleVelY = 0;
    mod.connectionPulseTimer = 1.0;

    const neighbors = getConnectedNeighbors(state, col, row, mod.id);
    state.audioQueue.push({
      type: 'socket_seat',
      neighborCount: neighbors.length,
    });

    // Spawn radial dust/spark puff
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 1.4 + (i % 3) * 0.7;
      state.particles.push({
        x: col + 0.5,
        y: row + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: i % 2 === 0 ? 3.5 : 2.5,
        color: i % 2 === 0 ? '#fbbf24' : '#94a3b8',
        life: 0.45,
        maxLife: 0.45,
        kind: i % 2 === 0 ? 'spark' : 'dust',
      });
    }
  } else {
    // Return to tray
    mod.col = null;
    mod.row = null;
    mod.seatScaleX = 1.15;
    mod.seatScaleY = 0.88;
    state.audioQueue.push({ type: 'pickup_clack' });
  }

  if (state.draggedModuleId === moduleId) {
    state.draggedModuleId = null;
  }
  return true;
}

/**
 * Pulls and releases the heavy spring-loaded Launch Lever to begin Beat B (The Chain-Reaction Cascade)
 */
export function pullLaunchLever(state: ContraptionState): boolean {
  if (state.phase !== 'wiring' || state.cyclesLeft <= 0) return false;

  // If the player hasn't placed any modules on the grid yet, auto-snap tray modules so first pull is magical
  const placedCount = state.modules.filter((m) => m.col !== null && m.row !== null).length;
  if (placedCount === 0) {
    let targetRow = 0;
    for (const m of state.modules) {
      if (targetRow < state.gridRows) {
        m.col = state.spoutCol;
        m.row = targetRow;
        m.seatScaleX = 1.25;
        m.seatScaleY = 0.78;
        m.connectionPulseTimer = 1.0;
        targetRow++;
      }
    }
  } else if (
    state.quotaLevel === 1 &&
    state.modules.filter((m) => m.col !== null).length === 1
  ) {
    // If Quota 1 and starter deflector is still sitting untouched in tray, seat it below starter furnace
    const trayDefl = state.modules.find((m) => m.col === null && m.kind === 'deflector');
    if (trayDefl && !getModuleAtSocket(state, state.spoutCol, 1)) {
      trayDefl.col = state.spoutCol;
      trayDefl.row = 1;
      trayDefl.seatScaleX = 1.22;
      trayDefl.seatScaleY = 0.8;
      trayDefl.connectionPulseTimer = 1.0;
    }
  }

  state.phase = 'cascade';
  state.leverPull = 1.0;
  state.leverVel = -6.0;
  state.isDraggingLever = false;

  state.orbs = [];
  state.collectedOrbsCount = 0;
  state.cruciblePot = 0;
  state.overclockMultiplier = 1;
  state.overclockPassCount = 0;
  state.overclockValveHeld = false;
  state.collectSettleTimer = 0;
  state.boilerPressure = 0;
  state.gasketBlown = false;
  state.ouroborosUsedThisCycle = false;
  state.cascadeActivationCount = 0;

  // Repair any previously cracked modules at start of new cycle
  for (const mod of state.modules) {
    mod.cracked = false;
  }

  state.audioQueue.push({ type: 'lever_thunk' });

  const stage = getQuotaStageConfig(state.quotaLevel);
  const extraOrbs = state.activeRelics.includes('aether_condenser') ? 1 : 0;
  const totalOrbs = stage.baseOrbsPerLaunch + extraOrbs;
  const baseValue = state.bossModifier === 'heavy_ore' ? 30 : 20;

  for (let i = 0; i < totalOrbs; i++) {
    const jitterX = (i - (totalOrbs - 1) / 2) * 0.08;
    state.orbs.push({
      id: `orb_${state.quotaLevel}_${state.cyclesLeft}_${i}`,
      x: state.spoutCol + 0.5 + jitterX,
      y: -0.25 - i * 0.55,
      vx: jitterX * 0.4,
      vy: state.bossModifier === 'heavy_ore' ? 2.8 : 2.1,
      radius: 0.16,
      value: baseValue,
      tier: 'raw',
      loopTimer: 0,
      bounceCount: 0,
      lastModuleId: null,
      prevModuleId: null,
      pingPongCount: 0,
      hitCooldowns: {},
      isSurging: false,
      trail: [],
    });
  }

  state.statusBannerText = 'HOLD [SPACE] OR VALVE WHEEL TO OVERCLOCK & RECYCLE!';
  state.statusBannerTimer = 2.8;
  return true;
}

/**
 * Computes the blowout probability (0..1) for an over-pressurized collision or recycle pass
 */
export function computeBlowoutChance(boilerPressure: number): number {
  if (boilerPressure < 55) return 0;
  // Escalates steeply from 55% pressure up to 100% pressure
  const excess = (boilerPressure - 55) / 45;
  return Math.min(0.85, Math.max(0.05, excess * excess * 0.75));
}

/**
 * Triggers an Overclock Recycle pass: pumps collected orbs back to top spout and multiplies Crucible Pot (x2 -> x4 -> x8)
 */
export function triggerOverclockRecycle(state: ContraptionState): boolean {
  if (state.phase !== 'cascade' || state.gasketBlown) return false;
  if (state.cruciblePot <= 0 && state.collectedOrbsCount <= 0) return false;

  state.overclockPassCount += 1;
  const multGain = state.bossModifier === 'volatile_boiler' ? 3 : 2;
  state.overclockMultiplier *= multGain;
  state.cruciblePot = Math.round(state.cruciblePot * multGain);

  // Add Boiler Pressure per recycle pass
  const basePressureAdd = state.bossModifier === 'volatile_boiler' ? 44 : 32;
  const reliefFactor = state.activeRelics.includes('spark_governor') ? 0.65 : 1.0;
  state.boilerPressure += basePressureAdd * reliefFactor;

  // Check if Boiler Pressure blows the main gasket!
  const blowoutChance = computeBlowoutChance(state.boilerPressure);
  if (state.boilerPressure >= 100 || (blowoutChance > 0 && nextRandom(state) < blowoutChance)) {
    triggerGasketBlowout(state);
    return false;
  }

  // Pump orbs back to the top spout for another pass!
  const recycleCount = Math.max(2, Math.min(6, state.collectedOrbsCount || 2));
  state.collectedOrbsCount = 0;
  state.collectSettleTimer = 0;

  for (let i = 0; i < recycleCount; i++) {
    const spread = (i - (recycleCount - 1) / 2) * 0.14;
    const recycledTier: OrbTier =
      state.overclockPassCount >= 2 ? 'supercritical' : 'heated';
    state.orbs.push({
      id: `orb_recycle_${state.overclockPassCount}_${i}`,
      x: state.spoutCol + 0.5 + spread,
      y: -0.15 - i * 0.42,
      vx: spread * 0.8,
      vy: 2.5,
      radius: 0.16,
      value: Math.round(25 * state.overclockMultiplier),
      tier: recycledTier,
      loopTimer: 0,
      bounceCount: 0,
      lastModuleId: null,
      prevModuleId: null,
      pingPongCount: 0,
      hitCooldowns: {},
      isSurging: false,
      trail: [],
    });
  }

  state.cameraShake = Math.max(state.cameraShake, 0.35 + state.boilerPressure * 0.008);
  state.badges.push({
    id: `badge_overclock_${state.elapsedTime}_${state.overclockPassCount}`,
    x: state.spoutCol + 0.5,
    y: 0.35,
    vy: -0.8,
    text: `OVERCLOCK ×${state.overclockMultiplier}!`,
    color: '#f43f5e',
    life: 1.2,
    maxLife: 1.2,
    scale: 1.35,
  });

  state.audioQueue.push({
    type: 'overclock_recycle',
    multiplier: state.overclockMultiplier,
  });
  return true;
}

export function triggerGasketBlowout(state: ContraptionState): void {
  state.gasketBlown = true;
  state.cruciblePot = 0;
  state.orbs = [];
  state.overclockValveHeld = false;
  state.cameraShake = 1.2;

  // Crack a random placed module to show physical blowout damage
  const placed = state.modules.filter((m) => m.col !== null && m.row !== null);
  if (placed.length > 0) {
    const victim = placed[Math.floor(nextRandom(state) * placed.length)];
    victim.cracked = true;
    victim.recoilVelX = (nextRandom(state) - 0.5) * 35;
    victim.recoilVelY = -25;
  }

  for (let i = 0; i < 28; i++) {
    const angle = (Math.PI * 2 * i) / 28;
    const speed = 2.0 + (i % 4) * 1.1;
    state.particles.push({
      x: state.gridCols / 2,
      y: state.gridRows / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4.5,
      color: i % 2 === 0 ? '#f43f5e' : '#94a3b8',
      life: 0.85,
      maxLife: 0.85,
      kind: i % 2 === 0 ? 'spark' : 'steam',
    });
  }

  state.badges.push({
    id: `badge_blowout_${state.elapsedTime}`,
    x: state.gridCols / 2,
    y: state.gridRows / 2,
    vy: -0.6,
    text: 'GASKET BLOWN! POT SHATTERED!',
    color: '#f43f5e',
    life: 1.6,
    maxLife: 1.6,
    scale: 1.5,
  });

  state.statusBannerText = 'BOILER OVERPRESSURE! POT SHATTERED — GREED COST THE CYCLE!';
  state.statusBannerTimer = 3.0;
  state.audioQueue.push({ type: 'gasket_blowout' });

  finishCycleAfterSettle(state);
}

/**
 * Safely vents the boiler and banks the Crucible Pot into BANKED score
 */
export function cashOutCruciblePot(state: ContraptionState): boolean {
  if (state.phase !== 'cascade' || state.gasketBlown) return false;

  const bankedGain = Math.round(state.cruciblePot);
  state.bankedScore += bankedGain;
  state.cruciblePot = 0;
  state.orbs = [];
  state.overclockValveHeld = false;

  // Spawn golden coin/spark cascade + pneumatic steam vent
  for (let i = 0; i < 22; i++) {
    const angle = -Math.PI / 2 + ((i - 11) / 11) * 1.1;
    const speed = 2.2 + (i % 4) * 0.8;
    state.particles.push({
      x: state.chuteCol + 0.5,
      y: state.gridRows - 0.1,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: i % 3 === 0 ? 4.5 : 3.0,
      color: i % 3 === 0 ? '#94a3b8' : '#fbbf24',
      life: 0.75,
      maxLife: 0.75,
      kind: i % 3 === 0 ? 'steam' : 'coin',
    });
  }

  if (bankedGain > 0) {
    state.badges.push({
      id: `badge_bank_${state.elapsedTime}`,
      x: state.chuteCol + 0.5,
      y: state.gridRows - 0.35,
      vy: -0.9,
      text: `BANKED +${bankedGain}!`,
      color: '#fbbf24',
      life: 1.35,
      maxLife: 1.35,
      scale: 1.4,
    });
  }

  state.audioQueue.push({
    type: 'pneumatic_cashout',
    multiplier: state.overclockMultiplier,
  });

  finishCycleAfterSettle(state);
  return true;
}

function finishCycleAfterSettle(state: ContraptionState): void {
  state.cyclesLeft = Math.max(0, state.cyclesLeft - 1);
  state.boilerPressure = 0;

  if (state.bankedScore >= state.quotaTarget) {
    openBlueprintDraft(state);
  } else if (state.cyclesLeft <= 0) {
    state.phase = 'gameover';
    state.statusBannerText = 'QUOTA MISSED! CLICK OR PRESS [R] TO REBUILD WORKBENCH';
    state.statusBannerTimer = 10.0;
  } else {
    state.phase = 'wiring';
    state.statusBannerText = `CYCLE COMPLETE • ${state.cyclesLeft} CYCLES LEFT TO BEAT QUOTA`;
    state.statusBannerTimer = 2.5;
  }
}

export function openBlueprintDraft(state: ContraptionState): void {
  state.phase = 'draft';
  state.hoveredDraftIndex = 0;

  // Deterministic selection of 3 transformative cards, prioritizing progressive reveal concept first
  const pool = [...DRAFT_BLUEPRINT_POOL];
  const picks: BlueprintCard[] = [];

  // Quota 1 -> Quota 2 guarantees BIFROST PRISM as card 0
  if (state.quotaLevel === 1) {
    const prismCard = pool.find((c) => c.moduleKind === 'prism');
    if (prismCard) picks.push(prismCard);
  } else if (state.quotaLevel === 2) {
    const teslaCard = pool.find((c) => c.moduleKind === 'tesla');
    if (teslaCard) picks.push(teslaCard);
  } else if (state.quotaLevel === 3) {
    const pendCard = pool.find((c) => c.moduleKind === 'pendulum');
    if (pendCard) picks.push(pendCard);
  }

  while (picks.length < 3 && pool.length > 0) {
    const idx = Math.floor(nextRandom(state) * pool.length);
    const candidate = pool.splice(idx, 1)[0];
    if (picks.some((p) => p.id === candidate.id)) continue;
    if (
      candidate.kind === 'relic' &&
      candidate.relicId &&
      state.activeRelics.includes(candidate.relicId)
    ) {
      continue;
    }
    picks.push(candidate);
  }

  state.draftChoices = picks;
  state.statusBannerText = 'QUOTA BEATEN! SELECT 1 BLUEPRINT TO EXPAND WORKBENCH';
  state.statusBannerTimer = 5.0;
}

export function selectBlueprintCard(state: ContraptionState, cardIndex: number): boolean {
  if (state.phase !== 'draft') return false;
  const card = state.draftChoices[cardIndex];
  if (!card) return false;

  if (card.kind === 'module' && card.moduleKind) {
    const newId = `mod_q${state.quotaLevel + 1}_${state.modules.length}`;
    const newMod = createModule(newId, card.moduleKind, state.modules.length, null, null, 0);
    state.modules.push(newMod);
    state.selectedModuleId = newMod.id;
  } else if (card.kind === 'relic' && card.relicId) {
    if (!state.activeRelics.includes(card.relicId)) {
      state.activeRelics.push(card.relicId);
    }
  }

  // Advance to next Quota stage & progressively expand grid (3x3 -> 4x4 -> 5x4 -> 5x5 -> 6x5)
  const nextLevel = state.quotaLevel + 1;
  const nextStage = getQuotaStageConfig(nextLevel);
  state.quotaLevel = nextLevel;
  state.quotaTarget = nextStage.quotaTarget;
  state.cyclesLeft = nextStage.cyclesAllowed;
  state.gridCols = nextStage.gridCols;
  state.gridRows = nextStage.gridRows;
  state.spoutCol = Math.floor(nextStage.gridCols / 2);
  state.chuteCol = Math.floor(nextStage.gridCols / 2);
  state.unlockedConceptTag = nextStage.unlockedConceptTag;
  state.bossModifier = nextStage.bossModifier;
  state.bossAnnouncement = nextStage.bossAnnouncement;
  state.frostNodes = nextStage.frostNodeCoords.map((c) => ({
    col: c.col,
    row: c.row,
    thawed: false,
    bonusMultiplier: 2,
  }));

  // Ensure any module seated on a frost node coordinate moves safely to tray
  for (const fn of state.frostNodes) {
    const m = getModuleAtSocket(state, fn.col, fn.row);
    if (m) {
      m.col = null;
      m.row = null;
    }
  }

  state.draftChoices = [];
  state.phase = 'wiring';
  state.audioQueue.push({ type: 'socket_seat', neighborCount: 2 });
  state.statusBannerText =
    nextStage.bossAnnouncement ??
    `QUOTA ${nextLevel} UNLOCKED: ${nextStage.unlockedConceptTag}`;
  state.statusBannerTimer = 3.5;
  return true;
}

/**
 * Anti-Stuck Guarantee (Rule 6):
 * If an orb loops infinitely between parts for > 4 seconds (or >= 16 rapid ping-pong bounces),
 * supercharge it and eject it directly toward the Collector Chute as a bonus "OVERLOAD SURGE!"
 */
export function triggerOverloadSurge(state: ContraptionState, orb: Orb): void {
  if (orb.isSurging) return;
  orb.isSurging = true;
  orb.tier = 'supercritical';
  orb.value = Math.round(orb.value * 3);

  const targetX = state.chuteCol + 0.5;
  const targetY = state.gridRows + 0.25;
  const dx = targetX - orb.x;
  const dy = Math.max(0.5, targetY - orb.y);
  const len = Math.hypot(dx, dy) || 1;
  orb.vx = (dx / len) * 6.5;
  orb.vy = (dy / len) * 6.5;

  state.badges.push({
    id: `badge_surge_${state.elapsedTime}_${orb.id}`,
    x: orb.x,
    y: orb.y,
    vy: -1.1,
    text: 'OVERLOAD SURGE! ×3',
    color: '#ffffff',
    life: 1.3,
    maxLife: 1.3,
    scale: 1.45,
  });

  state.cascadeActivationCount += 1;
  const freq = computeHarmonicFrequency(state.cascadeActivationCount);
  state.lastHarmonicFreqHz = freq;
  state.audioQueue.push({
    type: 'cascade_note',
    activationIndex: state.cascadeActivationCount,
    tier: 'supercritical',
    frequencyHz: freq,
  });
}

function applyModuleEffectToOrb(
  state: ContraptionState,
  mod: ContraptionModule,
  orb: Orb
): void {
  // Micro Hit-Stop (38ms) & Module Spring Mount Recoil along impact normal
  mod.hitStopTimer = 0.038;
  mod.activationGlow = 1.0;

  const modCenterX = (mod.col ?? 0) + 0.5;
  const modCenterY = (mod.row ?? 0) + 0.5;
  const nx = modCenterX - orb.x;
  const ny = modCenterY - orb.y;
  const nLen = Math.hypot(nx, ny) || 1;
  const tierForce = orb.tier === 'supercritical' ? 1.5 : orb.tier === 'heated' ? 1.2 : 1.0;

  mod.recoilVelX += (nx / nLen) * 140 * tierForce;
  mod.recoilVelY += (ny / nLen) * 140 * tierForce;

  // Subtle ripple to connected neighboring modules
  if (mod.col !== null && mod.row !== null) {
    const neighbors = getConnectedNeighbors(state, mod.col, mod.row, mod.id);
    for (const nb of neighbors) {
      const rdx = (nb.col ?? 0) - mod.col;
      const rdy = (nb.row ?? 0) - mod.row;
      nb.recoilVelX += rdx * 55;
      nb.recoilVelY += rdy * 55;
      nb.activationGlow = Math.max(nb.activationGlow, 0.45);
    }
  }

  // Harmonic pitch ascending Lydian scale
  const activationIdx = state.cascadeActivationCount;
  state.cascadeActivationCount += 1;
  const freq = computeHarmonicFrequency(activationIdx);
  state.lastHarmonicFreqHz = freq;
  state.audioQueue.push({
    type: 'cascade_note',
    activationIndex: activationIdx,
    tier: orb.tier,
    frequencyHz: freq,
  });

  // Pressure Turbine relic bonus: +1x multiplier per 35 boiler pressure
  const turbineBonus = state.activeRelics.includes('pressure_turbine')
    ? Math.floor(state.boilerPressure / 35)
    : 0;

  // Gilded Flywheel relic bonus every 4th consecutive activation
  if (
    state.activeRelics.includes('gilded_flywheel') &&
    state.cascadeActivationCount % 4 === 0
  ) {
    orb.value += 50;
    state.badges.push({
      id: `badge_flywheel_${state.elapsedTime}_${state.cascadeActivationCount}`,
      x: modCenterX,
      y: modCenterY - 0.3,
      vy: -1.1,
      text: 'FLYWHEEL +50',
      color: '#fbbf24',
      life: 0.9,
      maxLife: 0.9,
      scale: 1.15,
    });
  }

  // Orientation vector from module's snapped target angle
  const angleRad = ((mod.targetAngleDeg % 360) * Math.PI) / 180;
  const dirX = Math.cos(angleRad);
  const dirY = Math.sin(angleRad);

  let badgeText = '';
  let badgeColor = '#38bdf8';

  switch (mod.kind) {
    case 'deflector': {
      orb.value += 15 * (1 + turbineBonus);
      // Deflect horizontally/diagonally based on angle detent so it routes across columns
      const horizSign = Math.abs(dirX) >= 0.35 ? Math.sign(dirX) : mod.targetAngleDeg % 180 === 0 ? 1 : -1;
      orb.vx = horizSign * 2.35;
      orb.vy = Math.sin(angleRad) < -0.5 ? -1.4 : 1.65;
      badgeText = `+${15 * (1 + turbineBonus)} CHIPS`;
      badgeColor = '#38bdf8';
      break;
    }

    case 'furnace': {
      const mult = 2 + turbineBonus;
      orb.value = Math.round(orb.value * mult);
      orb.tier = orb.tier === 'raw' ? 'heated' : 'supercritical';
      orb.vx += dirX * 0.65;
      orb.vy = Math.max(1.5, orb.vy * 0.95);
      badgeText = `×${mult} HEAT!`;
      badgeColor = orb.tier === 'supercritical' ? '#f43f5e' : '#fbbf24';

      // Thaw any adjacent or overlapping Frost Nodes!
      if (mod.col !== null && mod.row !== null) {
        for (const fn of state.frostNodes) {
          if (!fn.thawed && Math.abs(fn.col - mod.col) <= 1 && Math.abs(fn.row - mod.row) <= 1) {
            fn.thawed = true;
            state.badges.push({
              id: `badge_thaw_${state.elapsedTime}_${fn.col}_${fn.row}`,
              x: fn.col + 0.5,
              y: fn.row + 0.5,
              vy: -1.0,
              text: 'FROST THAWED! ×2',
              color: '#38bdf8',
              life: 1.2,
              maxLife: 1.2,
              scale: 1.25,
            });
          }
        }
      }
      break;
    }

    case 'prism': {
      // Splits incoming orb into two mini-orbs at 90° angles that each inherit 75% of parent's value
      const childValue = Math.max(10, Math.round(orb.value * 0.75 * (1 + turbineBonus * 0.5)));
      orb.value = childValue;
      orb.radius = Math.max(0.12, orb.radius * 0.88);
      orb.vx = -2.25;
      orb.vy = 1.65;

      if (state.orbs.length < 18) {
        const twin: Orb = {
          id: `${orb.id}_split_${state.cascadeActivationCount}`,
          x: modCenterX + 0.14,
          y: modCenterY,
          vx: 2.25,
          vy: 1.65,
          radius: orb.radius,
          value: childValue,
          tier: orb.tier,
          loopTimer: orb.loopTimer,
          bounceCount: orb.bounceCount,
          lastModuleId: mod.id,
          prevModuleId: orb.lastModuleId,
          pingPongCount: 0,
          hitCooldowns: { [mod.id]: 0.25 },
          isSurging: false,
          trail: [],
        };
        state.orbs.push(twin);
      }
      badgeText = 'SPLIT 2×75%';
      badgeColor = '#a855f7';
      break;
    }

    case 'tesla': {
      // Zaps up to two nearest modules with visible lightning arcs and triggers remote bonus
      const others = state.modules
        .filter((m) => m.id !== mod.id && m.col !== null && m.row !== null)
        .sort((a, b) => {
          const da = Math.hypot((a.col ?? 0) - (mod.col ?? 0), (a.row ?? 0) - (mod.row ?? 0));
          const db = Math.hypot((b.col ?? 0) - (mod.col ?? 0), (b.row ?? 0) - (mod.row ?? 0));
          return da - db;
        })
        .slice(0, 2);

      const zapBonus = (25 + others.length * 20) * (1 + turbineBonus);
      orb.value += zapBonus;
      if (orb.tier === 'heated') {
        orb.tier = 'supercritical';
      }

      for (const target of others) {
        target.activationGlow = 1.0;
        target.recoilVelY -= 60;
        state.lightningArcs.push({
          x1: modCenterX,
          y1: modCenterY,
          x2: (target.col ?? 0) + 0.5,
          y2: (target.row ?? 0) + 0.5,
          color: '#22d3ee',
          life: 0.35,
          maxLife: 0.35,
        });
        if (target.kind === 'furnace') {
          orb.value = Math.round(orb.value * 1.5);
          if (orb.tier === 'raw') orb.tier = 'heated';
        } else {
          orb.value += 20;
        }
      }

      orb.vx = (dirX || 0.7) * 1.9;
      orb.vy = 1.75;
      badgeText = `ZAP +${zapBonus}`;
      badgeColor = '#22d3ee';
      break;
    }

    case 'pendulum': {
      const mult = 2 + turbineBonus;
      orb.value = Math.round(orb.value * mult);
      orb.vy = Math.max(3.4, Math.abs(orb.vy) * 1.8);
      orb.vx = Math.sin(mod.pendulumPhase) * 2.1;
      badgeText = `SMASH ×${mult}!`;
      badgeColor = '#f97316';
      break;
    }

    case 'kicker': {
      const chips = 30 * (1 + turbineBonus);
      orb.value += chips;
      orb.vy = -2.4;
      orb.vx = (dirX >= 0 ? 1 : -1) * 2.1;
      badgeText = `KICK +${chips}`;
      badgeColor = '#f43f5e';
      break;
    }

    case 'teleporter': {
      const mult = 1.5 + turbineBonus * 0.5;
      orb.value = Math.round(orb.value * mult);
      orb.y = 0.15;
      orb.x = modCenterX;
      orb.vy = 2.0;
      badgeText = `WARP ×${mult}`;
      badgeColor = '#c084fc';
      break;
    }

    case 'cryo_lens': {
      const mult = orb.tier !== 'raw' ? 2.5 + turbineBonus : 1.5;
      orb.value = Math.round(orb.value * mult);
      orb.tier = 'supercritical';
      orb.vy = Math.max(2.2, orb.vy * 1.15);
      badgeText = `SUPERCRITICAL ×${mult}`;
      badgeColor = '#f43f5e';
      break;
    }
  }

  state.badges.push({
    id: `badge_hit_${state.elapsedTime}_${state.cascadeActivationCount}_${orb.id}`,
    x: modCenterX,
    y: modCenterY - 0.18,
    vy: -0.95,
    text: badgeText,
    color: badgeColor,
    life: 0.95,
    maxLife: 0.95,
    scale: 1.2,
  });

  // Spawn brass/neon collision sparks
  for (let i = 0; i < 7; i++) {
    const a = (Math.PI * 2 * i) / 7 + state.cascadeActivationCount * 0.3;
    state.particles.push({
      x: orb.x,
      y: orb.y,
      vx: Math.cos(a) * 2.1,
      vy: Math.sin(a) * 2.1,
      radius: 2.8,
      color: badgeColor,
      life: 0.36,
      maxLife: 0.36,
      kind: 'spark',
    });
  }

  // Over-pressurized collision hazard check when boiler is running hot!
  if (state.boilerPressure >= 65 && !state.gasketBlown) {
    const collisionRisk = computeBlowoutChance(state.boilerPressure) * 0.35;
    if (nextRandom(state) < collisionRisk) {
      triggerGasketBlowout(state);
    }
  }
}

/**
 * Advances the simulation by dt seconds (supports deterministic sub-stepping at 60fps)
 */
export function stepSimulation(state: ContraptionState, dt: number): void {
  const clampedDt = Math.min(0.05, Math.max(0.0001, dt));
  state.elapsedTime += clampedDt;

  // 1. Update spring-damped cursor lag for lifted module
  const cursorSpringK = 320;
  const cursorDamping = 24;
  const ax = (state.cursorGridX - state.dragVisualX) * cursorSpringK - state.dragVelX * cursorDamping;
  const ay = (state.cursorGridY - state.dragVisualY) * cursorSpringK - state.dragVelY * cursorDamping;
  state.dragVelX += ax * clampedDt;
  state.dragVelY += ay * clampedDt;
  state.dragVisualX += state.dragVelX * clampedDt;
  state.dragVisualY += state.dragVelY * clampedDt;

  // 2. Update Launch Lever spring return
  if (!state.isDraggingLever && state.leverPull > 0) {
    const leverAccel = -state.leverPull * 180 - state.leverVel * 16;
    state.leverVel += leverAccel * clampedDt;
    state.leverPull = Math.max(0, state.leverPull + state.leverVel * clampedDt);
  }

  // 3. Update Module Angular Detent Springs (stiffness: 420, damping: 22), Squash-Stretch & Recoil
  for (const mod of state.modules) {
    const angleDiff = mod.targetAngleDeg - mod.currentAngleDeg;
    const angleAccel =
      angleDiff * ANGULAR_SPRING_STIFFNESS - mod.angleVelDeg * ANGULAR_SPRING_DAMPING;
    mod.angleVelDeg += angleAccel * clampedDt;
    mod.currentAngleDeg += mod.angleVelDeg * clampedDt;

    // Squash & stretch seat spring
    const sxAccel = (1 - mod.seatScaleX) * 340 - mod.seatScaleVelX * 20;
    const syAccel = (1 - mod.seatScaleY) * 340 - mod.seatScaleVelY * 20;
    mod.seatScaleVelX += sxAccel * clampedDt;
    mod.seatScaleVelY += syAccel * clampedDt;
    mod.seatScaleX += mod.seatScaleVelX * clampedDt;
    mod.seatScaleY += mod.seatScaleVelY * clampedDt;

    // Hit-stop & Spring Mount Recoil
    if (mod.hitStopTimer > 0) {
      mod.hitStopTimer = Math.max(0, mod.hitStopTimer - clampedDt);
    } else {
      const rxAccel = -mod.recoilX * 380 - mod.recoilVelX * 22;
      const ryAccel = -mod.recoilY * 380 - mod.recoilVelY * 22;
      mod.recoilVelX += rxAccel * clampedDt;
      mod.recoilVelY += ryAccel * clampedDt;
      mod.recoilX += mod.recoilVelX * clampedDt;
      mod.recoilY += mod.recoilVelY * clampedDt;
    }

    if (mod.connectionPulseTimer > 0) {
      mod.connectionPulseTimer = Math.max(0, mod.connectionPulseTimer - clampedDt * 1.4);
    }
    if (mod.activationGlow > 0) {
      mod.activationGlow = Math.max(0, mod.activationGlow - clampedDt * 2.2);
    }
    if (mod.kind === 'pendulum') {
      mod.pendulumPhase += clampedDt * 5.2;
    }
  }

  // 4. Update Cascade Orbs & Overclock Valve
  if (state.phase === 'cascade' && !state.gasketBlown) {
    if (state.overclockValveHeld) {
      state.overclockValveAngle += clampedDt * 320;
      const heatRate = state.activeRelics.includes('spark_governor') ? 14 : 22;
      state.boilerPressure += clampedDt * heatRate;

      // Emit rising boiler steam particles while holding Overclock Valve
      if (Math.floor(state.elapsedTime * 25) !== Math.floor((state.elapsedTime - clampedDt) * 25)) {
        state.particles.push({
          x: state.gridCols - 0.25,
          y: state.gridRows - 0.3,
          vx: (nextRandom(state) - 0.5) * 0.9,
          vy: -1.8 - nextRandom(state) * 1.2,
          radius: 3.5 + (state.boilerPressure / 100) * 3,
          color: state.boilerPressure > 60 ? '#f43f5e' : '#94a3b8',
          life: 0.6,
          maxLife: 0.6,
          kind: 'steam',
        });
      }

      if (state.boilerPressure >= 100) {
        triggerGasketBlowout(state);
        return;
      }
    }

    const remainingOrbs: Orb[] = [];
    for (const orb of state.orbs) {
      orb.loopTimer += clampedDt;

      // Decrement per-module hit cooldowns
      for (const key of Object.keys(orb.hitCooldowns)) {
        orb.hitCooldowns[key] -= clampedDt;
        if (orb.hitCooldowns[key] <= 0) {
          delete orb.hitCooldowns[key];
        }
      }

      // Rule 6 Anti-Stuck Guarantee: > 4.0s loop or excessive ping-pong triggers OVERLOAD SURGE!
      if (!orb.isSurging && (orb.loopTimer >= 4.0 || orb.pingPongCount >= 10 || orb.bounceCount >= 18)) {
        triggerOverloadSurge(state, orb);
      }

      if (!orb.isSurging) {
        // Gravity pull downward
        const gravity = state.bossModifier === 'heavy_ore' ? 4.2 : 3.1;
        orb.vy = Math.min(5.5, orb.vy + gravity * clampedDt);
      }

      orb.x += orb.vx * clampedDt;
      orb.y += orb.vy * clampedDt;

      // Record trail
      orb.trail.push({ x: orb.x, y: orb.y, tier: orb.tier });
      if (orb.trail.length > 10) {
        orb.trail.shift();
      }

      // Wall bounce on left and right brass frame boundaries
      if (!orb.isSurging) {
        if (orb.x < orb.radius) {
          orb.x = orb.radius;
          orb.vx = Math.abs(orb.vx) * 0.85;
        } else if (orb.x > state.gridCols - orb.radius) {
          orb.x = state.gridCols - orb.radius;
          orb.vx = -Math.abs(orb.vx) * 0.85;
        }
        if (orb.y < -0.6 && orb.vy < 0) {
          orb.vy = Math.abs(orb.vy) * 0.8;
        }
      }

      // CheckFrost Node collision (heated or supercritical orbs thaw frost nodes on contact!)
      if (!orb.isSurging && orb.tier !== 'raw') {
        for (const fn of state.frostNodes) {
          if (!fn.thawed) {
            const dist = Math.hypot(orb.x - (fn.col + 0.5), orb.y - (fn.row + 0.5));
            if (dist < 0.42) {
              fn.thawed = true;
              orb.value = Math.round(orb.value * fn.bonusMultiplier);
              state.badges.push({
                id: `badge_thaw_orb_${state.elapsedTime}_${fn.col}`,
                x: fn.col + 0.5,
                y: fn.row + 0.5,
                vy: -1.0,
                text: `THAWED! ×${fn.bonusMultiplier}`,
                color: '#38bdf8',
                life: 1.1,
                maxLife: 1.1,
                scale: 1.25,
              });
            }
          }
        }
      }

      // Check Module collisions
      if (!orb.isSurging) {
        for (const mod of state.modules) {
          if (mod.col === null || mod.row === null || mod.cracked) continue;
          if (orb.hitCooldowns[mod.id] && orb.hitCooldowns[mod.id] > 0) continue;

          const cx = mod.col + 0.5;
          const cy = mod.row + 0.5;
          const dist = Math.hypot(orb.x - cx, orb.y - cy);
          const hitRadius = mod.kind === 'pendulum' ? 0.46 : 0.38;

          if (dist <= hitRadius) {
            orb.hitCooldowns[mod.id] = 0.18;
            orb.bounceCount += 1;

            if (orb.prevModuleId === mod.id && orb.lastModuleId !== mod.id) {
              orb.pingPongCount += 1;
            } else {
              orb.pingPongCount = Math.max(0, orb.pingPongCount - 1);
            }
            orb.prevModuleId = orb.lastModuleId;
            orb.lastModuleId = mod.id;

            applyModuleEffectToOrb(state, mod, orb);
            if (state.gasketBlown) return;
            break;
          }
        }
      }

      // Check Collector Chute entry at bottom of workbench
      if (orb.y >= state.gridRows + 0.05) {
        // Ouroboros Chute relic: first orb to enter Collector each cycle teleports back to top spout with +2x multiplier
        if (
          state.activeRelics.includes('ouroboros_chute') &&
          !state.ouroborosUsedThisCycle
        ) {
          state.ouroborosUsedThisCycle = true;
          orb.x = state.spoutCol + 0.5;
          orb.y = -0.15;
          orb.vx = 0;
          orb.vy = 2.2;
          orb.value = Math.round(orb.value * 2);
          orb.loopTimer = 0;
          orb.isSurging = false;
          state.badges.push({
            id: `badge_ouroboros_${state.elapsedTime}`,
            x: state.spoutCol + 0.5,
            y: 0.25,
            vy: -0.9,
            text: 'OUROBOROS ×2!',
            color: '#34d399',
            life: 1.2,
            maxLife: 1.2,
            scale: 1.3,
          });
          remainingOrbs.push(orb);
          continue;
        }

        // Direct center Collector Chute bullseye grants a 1.25x chute bonus
        const inCenterChute = Math.abs(orb.x - (state.chuteCol + 0.5)) <= 0.65;
        const finalOrbVal = inCenterChute ? Math.round(orb.value * 1.25) : Math.round(orb.value);
        state.cruciblePot += finalOrbVal;
        state.collectedOrbsCount += 1;

        state.badges.push({
          id: `badge_collect_${state.elapsedTime}_${orb.id}`,
          x: Math.max(0.5, Math.min(state.gridCols - 0.5, orb.x)),
          y: state.gridRows - 0.15,
          vy: -0.85,
          text: `+${finalOrbVal} POT`,
          color: orb.tier === 'supercritical' ? '#f43f5e' : '#fbbf24',
          life: 0.85,
          maxLife: 0.85,
          scale: 1.15,
        });
      } else {
        remainingOrbs.push(orb);
      }
    }

    state.orbs = remainingOrbs;

    // When all orbs have reached the Collector Chute:
    if (state.orbs.length === 0 && state.cruciblePot > 0 && !state.gasketBlown) {
      if (state.overclockValveHeld) {
        // Player is holding the Overclock Valve -> recycle batch immediately!
        triggerOverclockRecycle(state);
      } else {
        // Brief window (0.85s) where player can still grab the Overclock Valve before automatic safe cash-out
        state.collectSettleTimer += clampedDt;
        if (state.collectSettleTimer >= 0.85) {
          cashOutCruciblePot(state);
        }
      }
    } else if (state.orbs.length === 0 && state.cruciblePot === 0 && !state.gasketBlown) {
      finishCycleAfterSettle(state);
    }
  }

  // 5. Update Floating Badges, Particles, Lightning Arcs & Shake
  state.badges = state.badges.filter((b) => {
    b.y += b.vy * clampedDt;
    b.life -= clampedDt;
    return b.life > 0;
  });

  state.particles = state.particles.filter((p) => {
    p.x += p.vx * clampedDt;
    p.y += p.vy * clampedDt;
    if (p.kind === 'coin') {
      p.vy += 4.5 * clampedDt;
    }
    p.life -= clampedDt;
    return p.life > 0;
  });

  state.lightningArcs = state.lightningArcs.filter((arc) => {
    arc.life -= clampedDt;
    return arc.life > 0;
  });

  if (state.cameraShake > 0) {
    state.cameraShake = Math.max(0, state.cameraShake - clampedDt * 2.4);
  }
  if (state.statusBannerTimer > 0) {
    state.statusBannerTimer = Math.max(0, state.statusBannerTimer - clampedDt);
  }
}
