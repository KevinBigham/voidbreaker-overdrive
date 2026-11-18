export type ModuleKind =
  | 'deflector'
  | 'furnace'
  | 'prism'
  | 'tesla'
  | 'pendulum'
  | 'kicker'
  | 'teleporter'
  | 'cryo_lens';

export type RelicId =
  | 'ouroboros_chute'
  | 'pressure_turbine'
  | 'aether_condenser'
  | 'spark_governor'
  | 'gilded_flywheel';

export type BossModifierId =
  | 'none'
  | 'heavy_ore'
  | 'volatile_boiler'
  | 'dampening_mist';

export interface BlueprintCard {
  id: string;
  title: string;
  kind: 'module' | 'relic';
  moduleKind?: ModuleKind;
  relicId?: RelicId;
  accentColor: string;
  /** Strictly 1 sentence max per Rule 8 */
  description: string;
}

export interface QuotaStageConfig {
  quotaLevel: number;
  quotaTarget: number;
  cyclesAllowed: number;
  gridCols: number;
  gridRows: number;
  baseOrbsPerLaunch: number;
  bossModifier: BossModifierId;
  bossAnnouncement?: string;
  /** Concept unlocked at this stage for progressive reveal */
  unlockedConceptTag: string;
  frostNodeCoords: Array<{ col: number; row: number }>;
}

export const MODULE_CATALOG: Record<
  ModuleKind,
  {
    kind: ModuleKind;
    name: string;
    shortLabel: string;
    accentColor: string;
    detentStepDeg: 60 | 90;
    description: string;
  }
> = {
  deflector: {
    kind: 'deflector',
    name: 'ANGLED DEFLECTOR',
    shortLabel: 'DEFL',
    accentColor: '#38bdf8',
    detentStepDeg: 90,
    description: 'Redirects incoming orbs at a crisp 90° angle while adding +15 Chips and kinetic speed.',
  },
  furnace: {
    kind: 'furnace',
    name: 'ALCHEMY FURNACE',
    shortLabel: '2× HEAT',
    accentColor: '#fbbf24',
    detentStepDeg: 90,
    description: 'Transmutes passing orbs into Molten Gold, doubling their value (×2) and thawing Frost Nodes.',
  },
  prism: {
    kind: 'prism',
    name: 'BIFROST PRISM',
    shortLabel: 'SPLIT',
    accentColor: '#a855f7',
    detentStepDeg: 90,
    description: 'Splits any incoming orb into two mini-orbs at 90° angles that each inherit 75% of the parent’s value.',
  },
  tesla: {
    kind: 'tesla',
    name: 'TESLA RELAY',
    shortLabel: 'ZAP',
    accentColor: '#22d3ee',
    detentStepDeg: 60,
    description: 'Whenever an orb strikes this coil, it zaps up to two adjacent modules to trigger their bonus remotely.',
  },
  pendulum: {
    kind: 'pendulum',
    name: 'GRAVITY PENDULUM',
    shortLabel: 'SWING',
    accentColor: '#f97316',
    detentStepDeg: 90,
    description: 'Swings back and forth across its lane, smashing passing orbs downward at 2× speed and value.',
  },
  kicker: {
    kind: 'kicker',
    name: 'BRASS KICKER',
    shortLabel: 'BUMP',
    accentColor: '#f43f5e',
    detentStepDeg: 60,
    description: 'Launches struck orbs upward and sideways with +30 Chips, extending cascade bounce chains.',
  },
  teleporter: {
    kind: 'teleporter',
    name: 'ECHO TELEPORTER',
    shortLabel: 'WARP',
    accentColor: '#c084fc',
    detentStepDeg: 90,
    description: 'Warps an entering orb back to the top row column with a ×1.5 resonance multiplier.',
  },
  cryo_lens: {
    kind: 'cryo_lens',
    name: 'SUPERCRITICAL LENS',
    shortLabel: '3× RAY',
    accentColor: '#f43f5e',
    detentStepDeg: 90,
    description: 'Elevates Already-Heated orbs directly into Supercritical Magenta state with a ×2.5 value surge.',
  },
};

export const DRAFT_BLUEPRINT_POOL: BlueprintCard[] = [
  {
    id: 'card_prism',
    title: 'BIFROST PRISM',
    kind: 'module',
    moduleKind: 'prism',
    accentColor: '#a855f7',
    description: 'Splits any incoming orb into two mini-orbs at 90° angles that each inherit 75% of the parent’s value.',
  },
  {
    id: 'card_tesla',
    title: 'TESLA RELAY',
    kind: 'module',
    moduleKind: 'tesla',
    accentColor: '#22d3ee',
    description: 'Whenever an orb strikes this coil, it zaps the two nearest modules to trigger their effects remotely.',
  },
  {
    id: 'card_pendulum',
    title: 'GRAVITY PENDULUM',
    kind: 'module',
    moduleKind: 'pendulum',
    accentColor: '#f97316',
    description: 'Swings back and forth across 3 tiles, smashing passing orbs downward at 2× speed and value.',
  },
  {
    id: 'card_furnace',
    title: 'ALCHEMY FURNACE',
    kind: 'module',
    moduleKind: 'furnace',
    accentColor: '#fbbf24',
    description: 'Heats raw orbs into Molten Amber-Gold, multiplying their current value by ×2 on exit.',
  },
  {
    id: 'card_kicker',
    title: 'BRASS KICKER',
    kind: 'module',
    moduleKind: 'kicker',
    accentColor: '#f43f5e',
    description: 'Rebounds striking orbs diagonally upward with +30 Chips to sustain multi-hit cascades.',
  },
  {
    id: 'card_teleporter',
    title: 'ECHO TELEPORTER',
    kind: 'module',
    moduleKind: 'teleporter',
    accentColor: '#c084fc',
    description: 'Warps any orb that enters its socket back to the top of the column with ×1.5 value.',
  },
  {
    id: 'card_cryo_lens',
    title: 'SUPERCRITICAL LENS',
    kind: 'module',
    moduleKind: 'cryo_lens',
    accentColor: '#f43f5e',
    description: 'Focuses Heated Gold orbs into Supercritical Magenta-White plasma for a ×2.5 multiplier.',
  },
  {
    id: 'relic_ouroboros',
    title: 'OUROBOROS CHUTE',
    kind: 'relic',
    relicId: 'ouroboros_chute',
    accentColor: '#34d399',
    description: 'The first orb to enter the Collector each cycle teleports back to the top spout with +2× multiplier.',
  },
  {
    id: 'relic_turbine',
    title: 'PRESSURE TURBINE',
    kind: 'relic',
    relicId: 'pressure_turbine',
    accentColor: '#fb7185',
    description: 'Each stack of Boiler Heat increases all module multipliers by +1× instead of slowing down orbs.',
  },
  {
    id: 'relic_condenser',
    title: 'AETHER CONDENSER',
    kind: 'relic',
    relicId: 'aether_condenser',
    accentColor: '#38bdf8',
    description: 'Pulling the Launch Lever drops 1 extra Raw Aether Orb at the start of every cycle.',
  },
  {
    id: 'relic_governor',
    title: 'COPPER RELIEF VALVE',
    kind: 'relic',
    relicId: 'spark_governor',
    accentColor: '#facc15',
    description: 'Reduces Boiler Pressure build-up by 35% when recycling orbs through the Overclock Valve.',
  },
  {
    id: 'relic_flywheel',
    title: 'GILDED FLYWHEEL',
    kind: 'relic',
    relicId: 'gilded_flywheel',
    accentColor: '#fbbf24',
    description: 'Every 4th consecutive module hit in a single cascade bursts for +50 bonus Chips.',
  },
];

export const QUOTA_STAGES: QuotaStageConfig[] = [
  {
    quotaLevel: 1,
    quotaTarget: 120,
    cyclesAllowed: 3,
    gridCols: 3,
    gridRows: 3,
    baseOrbsPerLaunch: 2,
    bossModifier: 'none',
    unlockedConceptTag: 'ROUTING & FURNACE',
    frostNodeCoords: [],
  },
  {
    quotaLevel: 2,
    quotaTarget: 360,
    cyclesAllowed: 3,
    gridCols: 4,
    gridRows: 4,
    baseOrbsPerLaunch: 2,
    bossModifier: 'none',
    unlockedConceptTag: 'PRISM SPLITTING (4×4)',
    frostNodeCoords: [],
  },
  {
    quotaLevel: 3,
    quotaTarget: 950,
    cyclesAllowed: 3,
    gridCols: 5,
    gridRows: 4,
    baseOrbsPerLaunch: 3,
    bossModifier: 'none',
    unlockedConceptTag: 'CONDUCTOR ARCS (5×4)',
    frostNodeCoords: [],
  },
  {
    quotaLevel: 4,
    quotaTarget: 2400,
    cyclesAllowed: 4,
    gridCols: 5,
    gridRows: 5,
    baseOrbsPerLaunch: 3,
    bossModifier: 'none',
    unlockedConceptTag: 'FROST NODES (THAW WITH HEAT)',
    frostNodeCoords: [
      { col: 1, row: 2 },
      { col: 3, row: 2 },
    ],
  },
  {
    quotaLevel: 5,
    quotaTarget: 6000,
    cyclesAllowed: 4,
    gridCols: 6,
    gridRows: 5,
    baseOrbsPerLaunch: 3,
    bossModifier: 'volatile_boiler',
    bossAnnouncement: 'BOSS HAZARD: VOLATILE BOILER (+35% HEAT & +1× RECYCLE BONUS)',
    unlockedConceptTag: 'BOSS QUOTA (6×5 WORKBENCH)',
    frostNodeCoords: [
      { col: 2, row: 1 },
      { col: 3, row: 3 },
    ],
  },
  {
    quotaLevel: 6,
    quotaTarget: 15000,
    cyclesAllowed: 4,
    gridCols: 6,
    gridRows: 5,
    baseOrbsPerLaunch: 4,
    bossModifier: 'heavy_ore',
    bossAnnouncement: 'BOSS HAZARD: LEADEN ORE (FASTER DROP, 1.5× BASE VALUE)',
    unlockedConceptTag: 'MASTER WATCHMAKER',
    frostNodeCoords: [
      { col: 1, row: 3 },
      { col: 4, row: 2 },
    ],
  },
];

export function getQuotaStageConfig(level: number): QuotaStageConfig {
  const idx = Math.max(0, Math.min(QUOTA_STAGES.length - 1, level - 1));
  const base = QUOTA_STAGES[idx];
  if (level <= QUOTA_STAGES.length) {
    return base;
  }
  const extra = level - QUOTA_STAGES.length;
  return {
    ...base,
    quotaLevel: level,
    quotaTarget: Math.round(base.quotaTarget * Math.pow(2.2, extra)),
  };
}
