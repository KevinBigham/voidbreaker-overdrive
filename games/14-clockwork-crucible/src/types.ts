export type ReagentElement = 'lead' | 'cinnabar' | 'vitriol' | 'aether' | 'salt';

export type AttachmentId = 'crusher' | 'centrifuge' | 'condenser' | 'lodestone';

export interface Spring1D {
  position: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;
}

export interface Spring2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  stiffness: number;
  damping: number;
}

export interface ReagentBead {
  id: number;
  element: ReagentElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Physical mass: heavy lead = 3.2, medium salt/vitriol = 1.4, light cinnabar/aether = 0.85 */
  mass: number;
  /** Temperature from 0 (room) to 100+ (incandescent) */
  temperature: number;
  /** Base coin value when distilled */
  baseCoins: number;
  /** Current purity rank multiplier (1, 2, 3, 5, etc.) */
  purityRank: number;
  /** For Lead Geodes: 1.0 = intact outer lead shell, 0.0 = cracked/dissolved exposing pure Gold Core */
  shellIntegrity: number;
  /** True once a Lead Geode has been cracked by kinetic impact, shear-blade, crusher, or vitriol acid */
  isGoldCore: boolean;
  /** True when crystallized by Philosopher's Salt into a stable Sovereign Gem */
  isPhilosopherGem: boolean;
  /** Optional wax/frost barrier on advanced geodes that Cinnabar heat melts */
  waxBarrier: number;
  /** Location zone for physics routing */
  zone: 'chute' | 'crucible' | 'anvil' | 'pan' | 'discharging';
  /** Visual rotation angle in radians */
  angle: number;
  angularVelocity: number;
  /** Flash timer on reaction or impact */
  flashTimer: number;
  /** Connected geometric loop multiplier from Aether arcs (1, 3 for triangle, 5 for quad+) */
  loopBonus: number;
}

export interface GalvanicArc {
  fromId: number;
  toId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  loopMultiplier: number; // 1 = simple pair, 3 = closed triangle, 5 = closed quad+
}

export interface HairlineCrack {
  id: number;
  x: number;
  y: number;
  points: Array<{ dx: number; dy: number }>;
  severity: number; // 0..1
}

export interface WorkbenchParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  kind: 'spark' | 'steam' | 'ember' | 'acid' | 'gold' | 'crystallize';
}

export interface PendingAssayCoin {
  value: number;
  delay: number;
  label: string;
}

export interface MintedCoinVisual {
  id: number;
  x: number;
  y: number;
  vy: number;
  settled: boolean;
  value: number;
}

export interface CommissionOrder {
  level: number;
  /** Short evocative title pinned to the parchment slip (Commission 1 is strictly "Crack & Distill.") */
  title: string;
  patronName: string;
  note: string;
  quotaCoins: number;
  /** Elements unlocked and dispensed in the chute at this commission level */
  availableElements: ReagentElement[];
  /** Initial beads pre-loaded when this commission begins */
  starterBeads: Array<{ element: ReagentElement; hasWax?: boolean }>;
  /** Requirement hint shown on parchment diagram */
  diagramHint: string;
}

export interface WorkbenchAttachmentSpec {
  id: AttachmentId;
  name: string;
  shortTag: string;
  costCoins: number;
  verbLabel: string;
  description: string;
}

export const PALETTE = {
  parchment: '#f4ece1',
  parchmentDark: '#dfd1be',
  parchmentInk: '#2c221c',
  walnutDeep: '#1c1613',
  walnutMid: '#2a201b',
  walnutWarm: '#3b2c24',
  brassBurnished: '#d49b35',
  brassHighlight: '#f3c969',
  brassShadow: '#7c5316',
  brassDark: '#4a320d',
  copperWarm: '#c86d3b',
  copperHot: '#ef8345',
  verdigris: '#2a9d8f',
  verdigrisDeep: '#1b6960',
  cinnabar: '#e63946',
  cinnabarGlow: '#ff6b4a',
  amberGlass: '#ffb703',
  smokedGlassFill: 'rgba(42, 33, 26, 0.62)',
  smokedGlassStroke: 'rgba(212, 155, 53, 0.55)',
  leadSlate: '#6c6a66',
  leadDark: '#3f3d3a',
  saltIvory: '#f9f5eb',
  aetherSilver: '#dcd6c8',
} as const;

export const REAGENT_SPECS: Record<
  ReagentElement,
  {
    name: string;
    alchemicalSymbol: string;
    mass: number;
    radius: number;
    baseCoins: number;
    primaryColor: string;
    secondaryColor: string;
  }
> = {
  lead: {
    name: 'Lead Geode',
    alchemicalSymbol: '♄',
    mass: 3.2,
    radius: 21,
    baseCoins: 2,
    primaryColor: '#6c6a66',
    secondaryColor: '#ffb703',
  },
  cinnabar: {
    name: 'Cinnabar Ember',
    alchemicalSymbol: '🜂',
    mass: 0.9,
    radius: 15,
    baseCoins: 2,
    primaryColor: '#e63946',
    secondaryColor: '#ffb703',
  },
  vitriol: {
    name: 'Vitriol Acid',
    alchemicalSymbol: '🜖',
    mass: 1.35,
    radius: 16,
    baseCoins: 3,
    primaryColor: '#2a9d8f',
    secondaryColor: '#8ee3d8',
  },
  aether: {
    name: 'Aether Quicksilver',
    alchemicalSymbol: '☿',
    mass: 1.1,
    radius: 15,
    baseCoins: 3,
    primaryColor: '#e5dfd3',
    secondaryColor: '#ffb703',
  },
  salt: {
    name: "Philosopher's Salt",
    alchemicalSymbol: '🜔',
    mass: 1.6,
    radius: 17,
    baseCoins: 4,
    primaryColor: '#f4ece1',
    secondaryColor: '#d49b35',
  },
};

export const WORKBENCH_ATTACHMENTS: WorkbenchAttachmentSpec[] = [
  {
    id: 'crusher',
    name: 'Twin-Jaw Crusher',
    shortTag: 'CRUSH JAWS',
    costCoins: 3,
    verbLabel: 'PULL JAWS',
    description: 'Mechanical brass jaws at the vessel throat that crack Lead Geodes into Gold Cores.',
  },
  {
    id: 'centrifuge',
    name: 'Centrifuge Spinner',
    shortTag: 'CENTRIFUGE',
    costCoins: 5,
    verbLabel: 'SPIN ROTOR',
    description: 'Whirls reagents in the chamber, slamming heavy Lead into geodes and aligning Aether arcs.',
  },
  {
    id: 'condenser',
    name: 'Cryo-Condenser Coil',
    shortTag: 'CRYO COIL',
    costCoins: 7,
    verbLabel: 'VENT CRYO',
    description: 'Oxidized verdigris coil that cools vessel pressure by -2.8 Bar and condenses a pure Aether bead.',
  },
  {
    id: 'lodestone',
    name: 'Magnetic Lodestone Ring',
    shortTag: 'LODESTONE',
    costCoins: 10,
    verbLabel: 'PULSE RING',
    description: 'Gimballed magnetic ring that pulls reagents into tight Triangle (×3) and Quad (×5) Aether loops.',
  },
];

export const COMMISSIONS: CommissionOrder[] = [
  {
    level: 1,
    title: 'Crack & Distill.',
    patronName: 'Guild Assay Master',
    note: 'Drop the Lead Geode & Cinnabar into the Crucible. Crack the shell via impact, Shear-Blade, or heat, then pull Discharge.',
    quotaCoins: 4,
    availableElements: ['lead', 'cinnabar'],
    starterBeads: [{ element: 'cinnabar' }, { element: 'lead' }],
    diagramHint: '♄ Lead Geode + 🜂 Heat / Impact ➔ Gold Core',
  },
  {
    level: 2,
    title: 'Dissolve the Dross.',
    patronName: 'Apothecary Verdigris',
    note: 'Vitriol Acid dissolves Lead Geode shells on contact into Gold Cores, but eats brass dividers if unvented.',
    quotaCoins: 10,
    availableElements: ['lead', 'cinnabar', 'vitriol'],
    starterBeads: [{ element: 'lead' }, { element: 'vitriol' }, { element: 'cinnabar' }],
    diagramHint: '♄ Geode + 🜖 Vitriol Acid ➔ Pure Gold (Watch Vent!)',
  },
  {
    level: 3,
    title: 'The Galvanic Triad.',
    patronName: 'Royal Horologist',
    note: 'Aether Quicksilver arcs between matching or transmuted beads. Close a 3-bead Triangle (×3) or 4-bead Quad (×5).',
    quotaCoins: 22,
    availableElements: ['lead', 'cinnabar', 'vitriol', 'aether'],
    starterBeads: [{ element: 'aether' }, { element: 'aether' }, { element: 'lead' }, { element: 'cinnabar' }],
    diagramHint: '☿ Aether Loop: △ Triangle = ×3 Yield | ◇ Quad = ×5 Yield',
  },
  {
    level: 4,
    title: 'Fix the Volatile.',
    patronName: 'Arch-Alchemist Paracelsus',
    note: "Clamp the Vent to build Bar multiplier, then drop Philosopher's Salt to freeze pressure and crystallize a Gem.",
    quotaCoins: 40,
    availableElements: ['lead', 'cinnabar', 'vitriol', 'aether', 'salt'],
    starterBeads: [
      { element: 'lead', hasWax: true },
      { element: 'cinnabar' },
      { element: 'aether' },
      { element: 'salt' },
    ],
    diagramHint: '🜔 Salt Catalyst + Heated Gold/Aether ➔ Sovereign Gem',
  },
  {
    level: 5,
    title: 'The Magnum Opus.',
    patronName: 'Sovereign Mint & Foundry',
    note: 'Combine all 5 alchemical states and bolted brass mechanisms to forge the Sovereign Stone.',
    quotaCoins: 75,
    availableElements: ['lead', 'cinnabar', 'vitriol', 'aether', 'salt'],
    starterBeads: [
      { element: 'lead', hasWax: true },
      { element: 'vitriol' },
      { element: 'aether' },
      { element: 'cinnabar' },
      { element: 'salt' },
    ],
    diagramHint: 'Full Chain: Dissolve ➔ Galvanic Quad (×5) ➔ Salt Crystallize',
  },
];
