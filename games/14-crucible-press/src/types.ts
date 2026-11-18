export type ReagentKind =
  | 'lead'             // 1. Slag / Lead (Heavy, Inert): Sinks, crushes brittle crystals/geodes on drop impact
  | 'lead_geode'       // Uncracked Lead Geode: Outer slag shell protecting a pure Gold Core
  | 'gold_core'        // Exposed Pure Gold Core released from a cracked/dissolved Geode
  | 'cinnabar'         // 2. Cinnabar / Ember (Exothermic): Radiates heat, ignites volatile gases, melts wax/ice
  | 'vitriol'          // 3. Vitriol / Acid (Corrosive Fluid): Dissolves geode shells, corrodes brass divider if unvented
  | 'quicksilver'      // 4. Aether / Quicksilver (Conductive & Magnetic): Arcs kinetic energy, Triangle x3, Quad x5
  | 'salt'             // 5. Philosopher's Salt (Catalyst): Freezes reactions & crystallizes adjacent reagents into a Gem
  | 'philosopher_gem'  // High-tier crystallized Alchemical Gem formed by Philosopher's Salt
  | 'wax_seal';        // Brittle Ice/Wax barrier plug inside the chamber that Cinnabar melts or Lead crushes

export type BeadLocation =
  | 'chute'
  | 'anvil'
  | 'crucible'
  | 'scale';

export interface SpringDamper1D {
  position: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;
  min: number;
  max: number;
}

export interface ReagentBead {
  id: number;
  kind: ReagentKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  restitution: number;
  friction: number;
  temperature: number;       // Ambient ~22°C, reaction threshold ~85°C, vaporization ~180°C
  shellIntegrity: number;    // 1.0 -> 0.0 for lead_geode or wax_seal before cracking/melting
  purityRank: number;        // Base purity value (1..12), multiplied by reactions & loops
  location: BeadLocation;
  frozenTimer: number;       // > 0 when arrested by Philosopher's Salt
  chargeGlow: number;        // 0..1 visual/conductive excitation
  vaporizing: number;        // 0..1 progress on the heated copper anvil or extreme crucible heat
  rotation: number;
  angularVelocity: number;
}

export interface VaporCloud {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  kind: 'steam' | 'mercury_vapor' | 'volatile_gas' | 'acid_fume' | 'ignition_flare' | 'salt_frost';
  life: number;
  maxLife: number;
  temperature: number;
}

export interface AssayCoinWeight {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  value: number;
  settledOnPan: boolean;
  toneIndex: number;
}

export interface ConductiveArc {
  fromBeadId: number;
  toBeadId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  inClosedLoop: boolean;
  loopOrder: number; // 0 = simple arc, 3 = Triangle (x3), 4+ = Quad (x5)
}

export interface GlassCrack {
  x: number;
  y: number;
  angle: number;
  length: number;
  branches: Array<{ angleOffset: number; length: number; t: number }>;
  severity: number; // 0..1
}

export type AttachmentId =
  | 'centrifuge_spinner'
  | 'cryo_condenser'
  | 'twin_jaw_crusher'
  | 'lodestone_ring';

export interface WorkbenchAttachment {
  id: AttachmentId;
  name: string;
  shortLabel: string;
  cost: number;
  unlocked: boolean;
  socketX: number;
  socketY: number;
  spring: SpringDamper1D;
  angle: number;
  angularVelocity: number;
  activeCooldown: number;
  description: string;
}

export interface PatronCommission {
  index: number;
  slipTitle: string;         // Commission 1 MUST be "Crack & Distill."
  patronName: string;
  subNote: string;
  targetQuotaCoins: number;  // Total cumulative coins required to clear this commission
  requiredTrait: 'any_distill' | 'gold_core' | 'vitriol_dissolve' | 'quicksilver_loop' | 'philosopher_gem';
  chuteLoadout: ReagentKind[];
  spawnWaxBarrier?: boolean;
}

export type DragTargetKind =
  | 'none'
  | 'bead'
  | 'bellows_lever'
  | 'alembic_drum'
  | 'pressure_gate'
  | 'shear_blade'
  | 'prism_lens'
  | 'discharge_lever'
  | 'chute_pull'
  | 'anvil_hammer'
  | 'divider_latch'
  | 'attachment_control';

export interface CursorHandState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDown: boolean;
  dragKind: DragTargetKind;
  draggedBeadId: number | null;
  draggedAttachmentId: AttachmentId | null;
  // Spring-damper tether anchor for Cursor-as-Hand
  tetherStretchX: number;
  tetherStretchY: number;
  lastRatchetTooth: number;
}

export interface SoundEvent {
  type:
    | 'clink_glass'
    | 'clink_brass'
    | 'thud_lead'
    | 'ratchet_click'
    | 'bellows_whoosh'
    | 'shear_snap'
    | 'geode_crack'
    | 'acid_sizzle'
    | 'anvil_hiss'
    | 'vapor_ignite'
    | 'aether_chord'
    | 'salt_crystallize'
    | 'discharge_flush'
    | 'coin_chime'
    | 'gauge_tick'
    | 'glass_crack'
    | 'vessel_blowout'
    | 'bolt_attachment'
    | 'commission_seal';
  pitch?: number;
  intensity?: number;
}

export interface CruciblePressState {
  seed: number;
  rngState: number;
  elapsedSec: number;

  // Physical beads & particles
  beads: ReagentBead[];
  nextBeadId: number;
  vapors: VaporCloud[];
  nextVaporId: number;
  cracks: GlassCrack[];

  // Crucible internal vessel telemetry
  vesselTempC: number;            // 22°C ambient up to 320°C
  vesselPressureBar: number;      // 0.0 to 10.0 Bar (rupture at 10.0)
  ventClosed: boolean;            // True = Pressure-Lock Gate clamped shut (Push-Your-Luck mode)
  rawPotValue: number;            // Base distilled essence accumulated inside the chamber
  purityMultiplier: number;       // Starts at 1.0x, scales with reactions, pressure greed, and geometric loops
  activeLoopOrder: number;        // 0, 3 (Triangle x3), or 4 (Quad x5)
  activeArcs: ConductiveArc[];
  dividerIntegrity: number;       // 1.0 = intact brass grate between upper & lower chamber; Vitriol corrodes it when unvented
  dividerOpen: boolean;           // True when corroded through or manually unlatched
  ruptureFlash: number;           // > 0 right after a 10 Bar vessel blowout

  // Spring-damper mechanisms (every lever, dial, pan, and stopper obeys Hooke's law)
  bellowsSpring: SpringDamper1D;      // 0 (rest) .. 1 (fully depressed)
  dischargeSpring: SpringDamper1D;    // 0 (rest) .. 1 (pulled down to flush)
  pressureGateSpring: SpringDamper1D; // 0 (open vent) .. 1 (clamped shut)
  shearBladeSpring: SpringDamper1D;   // 0 (retracted) .. 1 (cocked) -> snaps through -0.25 on release
  shearArmed: boolean;
  chutePullSpring: SpringDamper1D;    // 0 (rest) .. 1 (pulled to dispense reagents)
  anvilHammerSpring: SpringDamper1D;  // 0 (resting) .. 1 (lifted) -> drops onto copper anvil
  anvilTempC: number;                 // Heated copper anvil temperature (~195°C)

  // Rotatable mechanisms with rotational inertia & spring damping
  alembicAngle: number;
  alembicAngularVel: number;
  prismAngle: number;                 // Aim angle in radians for the focused thermal beam
  prismAngularVel: number;
  prismTargetAngle: number;

  // Bourdon Pressure Gauge needle with physical spring-damper + high-pressure jitter
  gaugeNeedleSpring: SpringDamper1D;
  gaugeTickAccumulator: number;

  // Twin-Pan Assay Balance Scale & Discharge Coin Cascade
  scalePanSpring: SpringDamper1D;     // Vertical displacement of the brass receiving pan
  scaleBeamSpring: SpringDamper1D;    // Tilt angle of the balance beam
  pendingAssayCoins: number;          // Coins queued to drop onto the pan one by one
  assayDropTimer: number;
  scaleCoins: AssayCoinWeight[];
  nextCoinId: number;

  // Economy & Progressive Commissions
  mintedCoins: number;                // Spendable brass coins on the scale/tray
  lifetimeCoins: number;              // Total coins minted across the session
  bestPurityBatch: number;
  commissionIndex: number;
  currentCommission: PatronCommission;
  commissionTraitMet: boolean;
  commissionStampAnim: number;        // 0..1 animation when stamping a completed parchment slip

  // Physical Workbench Attachments (bolted directly onto the board)
  attachments: WorkbenchAttachment[];

  // Cursor-as-Hand state
  hand: CursorHandState;

  // Audio queue & mute pin
  soundQueue: SoundEvent[];
  muted: boolean;
  debug: boolean;
}
