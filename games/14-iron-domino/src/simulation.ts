/**
 * IRONBREAKER // DOMINO FOUNDRY — Deterministic Knockback & Environmental Domino Tactics Simulation
 * Pure deterministic state + seeded PRNG, full Consequence Oracle preview calculator,
 * multi-step environmental chain reactions, persistent battlefield scars, and rule-bending relics.
 */

export const GRID_SIZE = 8;
export const MAX_ROOMS = 5;

export type TileKind =
  | 'floor'
  | 'pit'
  | 'water'
  | 'ice'
  | 'conveyor_n'
  | 'conveyor_s'
  | 'conveyor_e'
  | 'conveyor_w'
  | 'bumper_ne'
  | 'bumper_nw'
  | 'bumper_se'
  | 'bumper_sw'
  | 'spring_wall';

export type EntityKind =
  | 'player'
  | 'bruiser'
  | 'sentry'
  | 'bomber'
  | 'shield_guard'
  | 'boss_pylon'
  | 'boss_core'
  | 'barrel'
  | 'pillar'
  | 'shock_coil'
  | 'bounty_vault';

export type ToolKind = 'ram' | 'harpoon' | 'mortar' | 'move';

export type RelicId =
  | 'rubberized_walls'
  | 'chain_polarity'
  | 'domino_encore'
  | 'conductive_chassis'
  | 'seismic_aftershock'
  | 'grappling_overdrive';

export interface RelicDefinition {
  id: RelicId;
  name: string;
  tag: string;
  ruleText: string;
  accentColor: string;
}

export const RELIC_CATALOG: readonly RelicDefinition[] = [
  {
    id: 'rubberized_walls',
    name: 'RUBBERIZED FOUNDRY WALLS',
    tag: 'ELASTIC RICOCHET',
    ruleText:
      'Knocked-back units bounce off arena walls and pillars at 100% velocity in the opposite direction instead of stopping, triggering double wall-slam damage (+2 Hazard DMG).',
    accentColor: '#f59e0b',
  },
  {
    id: 'chain_polarity',
    name: 'CHAIN POLARITY COILS',
    tag: 'MAGNETIC IMPLOSION',
    ruleText:
      'Units struck by knockback become magnetized on impact, pulling all orthogonally adjacent enemies and barrels 1 tile toward them.',
    accentColor: '#38bdf8',
  },
  {
    id: 'domino_encore',
    name: 'DOMINO ENCORE FURNACE',
    tag: 'HAZARD REFUND + BARREL',
    ruleText:
      'Whenever an environmental hazard kills an enemy, refund +1 Action Piston (AP) and spawn an unstable Volatile Slag Barrel at their corpse.',
    accentColor: '#ef4444',
  },
  {
    id: 'conductive_chassis',
    name: 'ARC-WELDED CHASSIS',
    tag: 'IMPACT LIGHTNING',
    ruleText:
      'Every unit-to-unit or wall collision discharges an electric arc (1 Hazard DMG) into adjacent enemies and connected Coolant Pools.',
    accentColor: '#22d3ee',
  },
  {
    id: 'seismic_aftershock',
    name: 'SEISMIC AFTERSHOCK ANVIL',
    tag: 'CARDINAL WAVE',
    ruleText:
      'Whenever a Slag Barrel detonates or a Pillar collapses, send a cardinal shockwave 2 tiles down all 4 axes, shoving aligned units 1 tile outward.',
    accentColor: '#a3e635',
  },
  {
    id: 'grappling_overdrive',
    name: 'PNEUMATIC OVERDRIVE',
    tag: '+1 KNOCKBACK & SHOCK',
    ruleText:
      'Piston Ram and Winch Harpoon shove or yank targets +1 extra tile and blast the tile behind the initial target for 1 Hazard DMG.',
    accentColor: '#fb923c',
  },
];

export interface GridPos {
  x: number;
  y: number;
}

export interface SurfaceScar {
  id: string;
  x: number;
  y: number;
  kind: 'scorch' | 'cracks' | 'rubble' | 'puddle_spark' | 'slag_splatter' | 'smoke_plume';
  intensity: number;
  angle: number;
}

export interface DioramaEntity {
  id: string;
  kind: EntityKind;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: { dx: number; dy: number };
  isEnemy: boolean;
  isProp: boolean;
  magnetizedTurns: number;
  shieldedFront: boolean;
  intent?: {
    kind: 'ram' | 'zap' | 'detonate' | 'summon';
    targetX: number;
    targetY: number;
    damage: number;
    description: string;
  };
  // Visual articulation & squash-stretch state
  squashX: number;
  squashY: number;
  flashTimerMs: number;
  bobPhase: number;
}

export type ChainEventKind =
  | 'tool_fire'
  | 'move'
  | 'shove'
  | 'pull'
  | 'wall_slam'
  | 'wall_bounce'
  | 'entity_collision'
  | 'barrel_blast'
  | 'pillar_collapse'
  | 'pit_drop'
  | 'shock_arc'
  | 'ice_slide'
  | 'ice_shatter'
  | 'conveyor_push'
  | 'bumper_deflect'
  | 'vault_crack'
  | 'pylon_overload'
  | 'relic_trigger'
  | 'enemy_attack';

export interface ChainEvent {
  stepIndex: number;
  kind: ChainEventKind;
  entityId: string;
  from: GridPos;
  to: GridPos;
  damage: number;
  killed: boolean;
  hazardKill: boolean;
  badgeText: string;
  badgeColor: string;
  delayMs: number; // Staggered 70-100ms micro-delay per domino step
  hitStopMs: number; // Escalating 40ms -> 65ms hit-stop
  cameraPunch: { dx: number; dy: number };
}

export interface KnockbackArrow {
  entityId: string;
  from: GridPos;
  to: GridPos;
  kind: 'shove' | 'pull' | 'bounce' | 'slide' | 'conveyor' | 'bumper';
}

export interface EntityPrediction {
  id: string;
  name: string;
  startHp: number;
  predictedHp: number;
  damageTaken: number;
  killed: boolean;
  hazardKill: boolean;
  startPos: GridPos;
  finalPos: GridPos;
  badges: string[];
}

export interface ConsequenceOracleResult {
  valid: boolean;
  reason: string;
  tool: ToolKind;
  targetPos: GridPos;
  chainCount: number;
  hazardKills: number;
  directKills: number;
  totalDamage: number;
  vaultCracked: boolean;
  events: ChainEvent[];
  knockbackArrows: KnockbackArrow[];
  entityPredictions: Record<string, EntityPrediction>;
  tileBadges: Array<{ pos: GridPos; text: string; color: string; priority: number }>;
  resultingState: GameState;
}

export interface PlayerAction {
  type: 'use_tool' | 'overclock_turn' | 'end_turn' | 'select_relic';
  tool?: ToolKind;
  targetX?: number;
  targetY?: number;
  relicId?: RelicId;
}

export interface GameState {
  seed: number;
  rngState: number;
  roomNumber: number;
  roomTitle: string;
  roomSubtitle: string;
  turnNumber: number;
  phase: 'playing' | 'relic_draft' | 'victory' | 'defeat';
  selectedTool: ToolKind;
  hoveredTile: GridPos;
  ap: number;
  maxAp: number;
  tiles: TileKind[][];
  iceCracked: boolean[][];
  scars: SurfaceScar[];
  entities: DioramaEntity[];
  activeRelics: RelicId[];
  relicChoices: RelicId[];
  // Scoring & Greed vs. Safety Telemetry
  score: number;
  unbankedBounty: number;
  greedMultiplier: number;
  overclockCountThisRoom: number;
  vaultsCrackedTotal: number;
  // Run Post-Mortem Stats
  bestSingleTurnChain: number;
  bestChainDescription: string;
  environmentalKills: number;
  directKills: number;
  totalDominoLinks: number;
  causeOfTermination: string;
  // Diegetic Tutorial Callout (vanishes after first action)
  tutorialCalloutVisible: boolean;
  tutorialCalloutText: string;
  // Last executed turn log for choreographed UI playback
  lastActionEvents: ChainEvent[];
  lastBannerText: string;
}

/**
 * Deterministic Mulberry32 PRNG stepping function.
 */
export function nextRandom(state: { rngState: number }): number {
  let t = (state.rngState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  state.rngState = t >>> 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    hoveredTile: { ...state.hoveredTile },
    tiles: state.tiles.map((row) => [...row]),
    iceCracked: state.iceCracked.map((row) => [...row]),
    scars: state.scars.map((s) => ({ ...s })),
    entities: state.entities.map((e) => ({
      ...e,
      facing: { ...e.facing },
      intent: e.intent ? { ...e.intent } : undefined,
    })),
    activeRelics: [...state.activeRelics],
    relicChoices: [...state.relicChoices],
    lastActionEvents: state.lastActionEvents.map((ev) => ({
      ...ev,
      from: { ...ev.from },
      to: { ...ev.to },
      cameraPunch: { ...ev.cameraPunch },
    })),
  };
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function getEntityAt(state: GameState, x: number, y: number): DioramaEntity | undefined {
  return state.entities.find((e) => e.hp > 0 && e.x === x && e.y === y);
}

export function getPlayer(state: GameState): DioramaEntity | undefined {
  return state.entities.find((e) => e.kind === 'player' && e.hp > 0);
}

export function getLivingEnemies(state: GameState): DioramaEntity[] {
  return state.entities.filter((e) => e.isEnemy && e.hp > 0);
}

function makeEmptyTiles(): { tiles: TileKind[][]; iceCracked: boolean[][] } {
  const tiles: TileKind[][] = [];
  const iceCracked: boolean[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    tiles.push(new Array<TileKind>(GRID_SIZE).fill('floor'));
    iceCracked.push(new Array<boolean>(GRID_SIZE).fill(false));
  }
  return { tiles, iceCracked };
}

function makeEntity(
  id: string,
  kind: EntityKind,
  name: string,
  x: number,
  y: number,
  hp: number,
  isEnemy: boolean,
  isProp: boolean,
  facing = { dx: 1, dy: 0 },
  shieldedFront = false
): DioramaEntity {
  return {
    id,
    kind,
    name,
    x,
    y,
    hp,
    maxHp: hp,
    facing,
    isEnemy,
    isProp,
    magnetizedTurns: 0,
    shieldedFront,
    squashX: 1,
    squashY: 1,
    flashTimerMs: 0,
    bobPhase: (x * 0.7 + y * 1.1) % (Math.PI * 2),
  };
}

/**
 * Builds one of the 5 handcrafted + seed-varied tactical foundry rooms.
 * Room 1 boots with an irresistible pre-staged 6+ link domino chain already lined up under the cursor!
 */
export function setupRoom(state: GameState, roomNumber: number): void {
  const { tiles, iceCracked } = makeEmptyTiles();
  state.tiles = tiles;
  state.iceCracked = iceCracked;
  state.scars = [];
  state.entities = [];
  state.roomNumber = roomNumber;
  state.turnNumber = 1;
  state.ap = state.maxAp;
  state.unbankedBounty = 0;
  state.greedMultiplier = 1;
  state.overclockCountThisRoom = 0;
  state.lastActionEvents = [];

  if (roomNumber === 1) {
    state.roomTitle = 'SECTOR 01 // SLAG CRUCIBLE';
    state.roomSubtitle = 'Volatile Barrels, Molten Smelter Pits & High-Voltage Coolant Coils';

    // Molten Smelter Pits
    tiles[1][4] = 'pit';
    tiles[1][5] = 'pit';
    tiles[6][1] = 'pit';
    tiles[6][2] = 'pit';

    // Conductive Coolant Pool in East trench
    tiles[3][6] = 'water';
    tiles[4][6] = 'water';
    tiles[5][6] = 'water';

    // Directional Brass Bumper
    tiles[2][2] = 'bumper_se';

    // Player at (1, 4) -> wait: row=4, col=1 (tiles[y][x])
    // Let's keep tiles indexed as tiles[y][x] consistently!
    // Clear (1,4) for player
    tiles[4][1] = 'floor';
    tiles[1][4] = 'pit'; // (x=4, y=1) is a Molten Pit!

    const player = makeEntity('player', 'player', 'PILEDRIVER MK-IV', 1, 4, 6, false, false, {
      dx: 1,
      dy: 0,
    });

    // Irresistible pre-staged domino line at y=4:
    // Player at (1,4) aims PISTON RAM at Slag Bruiser at (2,4).
    // Shoving Bruiser (2,4) East 3 tiles slams it into Volatile Barrel at (4,4)!
    // Barrel (4,4) explodes (3x3), hitting:
    //  - Clockwork Sentry at (4,3) -> shoved North 2 tiles from (4,3) into Molten Pit at (4,1)! (PIT DROP KILL!)
    //  - Volatile Crawler at (4,5) -> shoved South 2 tiles into Load-Bearing Pillar at (4,6)! (PILLAR COLLAPSE KILL!)
    //  - Second Slag Barrel at (5,4) -> chain-detonates!
    //  - Second Barrel (5,4) hits Shock Coil at (6,4) + Overcharge Vault at (5,5) + Bruiser in Coolant Pool at (6,3)!
    const e1 = makeEntity('e_bruiser_1', 'bruiser', 'SLAG BRUISER', 2, 4, 3, true, false, {
      dx: -1,
      dy: 0,
    });
    const b1 = makeEntity('prop_barrel_1', 'barrel', 'VOLATILE BARREL', 4, 4, 1, false, true);
    const e2 = makeEntity('e_sentry_1', 'sentry', 'ARC SENTRY', 4, 3, 2, true, false, {
      dx: -1,
      dy: 0,
    });
    const e3 = makeEntity('e_bomber_1', 'bomber', 'FURNACE CRAWLER', 4, 5, 2, true, false, {
      dx: -1,
      dy: 0,
    });
    const p1 = makeEntity('prop_pillar_1', 'pillar', 'SUPPORT PILLAR', 4, 6, 1, false, true);
    const b2 = makeEntity('prop_barrel_2', 'barrel', 'VOLATILE BARREL', 5, 4, 1, false, true);
    const coil1 = makeEntity('prop_coil_1', 'shock_coil', 'TESLA COIL', 6, 4, 2, false, true);
    const e4 = makeEntity('e_bruiser_2', 'bruiser', 'COOLANT GUARD', 6, 3, 3, true, false, {
      dx: -1,
      dy: 0,
    });
    const vault = makeEntity('prop_vault_1', 'bounty_vault', 'OVERCHARGE VAULT', 5, 5, 1, false, true);

    state.entities.push(player, e1, b1, e2, e3, p1, b2, coil1, e4, vault);
    state.selectedTool = 'ram';
    state.hoveredTile = { x: 2, y: 4 };
  } else if (roomNumber === 2) {
    state.roomTitle = 'SECTOR 02 // CRYO-GLASS SLIDEWAY';
    state.roomSubtitle = 'Frictionless Cryo-Glass Grates & 90-Degree Pinball Deflector Bumpers';

    // Ice bridge down row y=3 and col x=5
    for (let x = 2; x <= 5; x++) tiles[3][x] = 'ice';
    for (let y = 4; y <= 6; y++) tiles[y][5] = 'ice';

    // Pinball bumper at (5,3) deflects East-moving units South!
    tiles[3][5] = 'bumper_sw'; // Reflects (+1,0) -> (0,+1) South!
    tiles[7][5] = 'pit';
    tiles[6][2] = 'pit';
    tiles[1][3] = 'pit';
    tiles[1][4] = 'pit';

    const player = makeEntity('player', 'player', 'PILEDRIVER MK-IV', 1, 3, 6, false, false, {
      dx: 1,
      dy: 0,
    });
    const g1 = makeEntity(
      'e_guard_2',
      'shield_guard',
      'BULWARK GUARD',
      2,
      3,
      4,
      true,
      false,
      { dx: -1, dy: 0 },
      true
    );
    const b1 = makeEntity('prop_barrel_2a', 'barrel', 'VOLATILE BARREL', 5, 6, 1, false, true);
    const e2 = makeEntity('e_sentry_2a', 'sentry', 'CRYO SENTRY', 4, 6, 2, true, false, {
      dx: -1,
      dy: 0,
    });
    const e3 = makeEntity('e_bruiser_2b', 'bruiser', 'SLAG BRUISER', 6, 6, 3, true, false, {
      dx: -1,
      dy: 0,
    });
    const vault = makeEntity('prop_vault_2', 'bounty_vault', 'OVERCHARGE VAULT', 5, 5, 1, false, true);
    const p1 = makeEntity('prop_pillar_2', 'pillar', 'SUPPORT PILLAR', 6, 3, 1, false, true);

    state.entities.push(player, g1, b1, e2, e3, vault, p1);
    state.selectedTool = 'ram';
    state.hoveredTile = { x: 2, y: 3 };
  } else if (roomNumber === 3) {
    state.roomTitle = 'SECTOR 03 // CONVEYOR SMELTERY';
    state.roomSubtitle = 'Automated Foundry Conveyors Feeding Central Molten Smelter Pits';

    // Conveyor belt loop pushing East into Molten Pit at (6,4)
    tiles[4][3] = 'conveyor_e';
    tiles[4][4] = 'conveyor_e';
    tiles[4][5] = 'conveyor_e';
    tiles[4][6] = 'pit';

    // North conveyor lane
    tiles[2][4] = 'conveyor_s';
    tiles[3][4] = 'conveyor_s';

    // Coolant pool
    tiles[5][4] = 'water';
    tiles[6][4] = 'water';

    const player = makeEntity('player', 'player', 'PILEDRIVER MK-IV', 1, 4, 6, false, false, {
      dx: 1,
      dy: 0,
    });
    const e1 = makeEntity('e_bruiser_3a', 'bruiser', 'FORGE BRUISER', 2, 4, 3, true, false, {
      dx: -1,
      dy: 0,
    });
    const e2 = makeEntity(
      'e_guard_3b',
      'shield_guard',
      'BULWARK GUARD',
      4,
      2,
      4,
      true,
      false,
      { dx: 0, dy: 1 },
      true
    );
    const b1 = makeEntity('prop_barrel_3a', 'barrel', 'VOLATILE BARREL', 4, 1, 1, false, true);
    const e3 = makeEntity('e_bomber_3c', 'bomber', 'FURNACE CRAWLER', 5, 5, 2, true, false, {
      dx: -1,
      dy: 0,
    });
    const coil = makeEntity('prop_coil_3', 'shock_coil', 'TESLA COIL', 4, 5, 2, false, true);
    const vault = makeEntity('prop_vault_3', 'bounty_vault', 'OVERCHARGE VAULT', 3, 5, 1, false, true);

    state.entities.push(player, e1, e2, b1, e3, coil, vault);
    state.selectedTool = 'ram';
    state.hoveredTile = { x: 2, y: 4 };
  } else if (roomNumber === 4) {
    state.roomTitle = 'SECTOR 04 // TESLA HYDRO-TURBINE';
    state.roomSubtitle = 'Interlocking Conductive Coolant Channels & Spring-Wall Ricochets';

    for (let x = 3; x <= 6; x++) {
      tiles[2][x] = 'water';
      tiles[5][x] = 'water';
    }
    tiles[3][5] = 'water';
    tiles[4][5] = 'water';

    tiles[3][7] = 'spring_wall';
    tiles[4][7] = 'spring_wall';
    tiles[0][4] = 'pit';
    tiles[7][4] = 'pit';

    const player = makeEntity('player', 'player', 'PILEDRIVER MK-IV', 1, 3, 6, false, false, {
      dx: 1,
      dy: 0,
    });
    const e1 = makeEntity('e_bomber_4a', 'bomber', 'VOLATILE CRAWLER', 2, 3, 2, true, false, {
      dx: -1,
      dy: 0,
    });
    const coil1 = makeEntity('prop_coil_4a', 'shock_coil', 'NORTH TURBINE COIL', 4, 3, 2, false, true);
    const e2 = makeEntity('e_sentry_4b', 'sentry', 'ARC SENTRY ALPHA', 4, 2, 2, true, false, {
      dx: -1,
      dy: 0,
    });
    const e3 = makeEntity('e_bruiser_4c', 'bruiser', 'HYDRO BRUISER', 5, 2, 3, true, false, {
      dx: -1,
      dy: 0,
    });
    const e4 = makeEntity('e_guard_4d', 'shield_guard', 'TURBINE GUARD', 5, 5, 4, true, false, {
      dx: -1,
      dy: 0,
    });
    const b1 = makeEntity('prop_barrel_4', 'barrel', 'VOLATILE BARREL', 4, 5, 1, false, true);
    const vault = makeEntity('prop_vault_4', 'bounty_vault', 'OVERCHARGE VAULT', 3, 5, 1, false, true);

    state.entities.push(player, e1, coil1, e2, e3, e4, b1, vault);
    state.selectedTool = 'ram';
    state.hoveredTile = { x: 2, y: 3 };
  } else {
    // ROOM 5: BOSS DIORAMA — THE FOUNDRY LEVIATHAN
    state.roomTitle = 'SECTOR 05 // THE LEVIATHAN CORE';
    state.roomSubtitle = 'Shatter Both Ferro-Shield Power Pylons via Chain Reactions to Expose the Core!';

    tiles[1][4] = 'conveyor_e';
    tiles[1][5] = 'conveyor_e';
    tiles[6][4] = 'conveyor_e';
    tiles[6][5] = 'conveyor_e';
    tiles[3][4] = 'water';
    tiles[4][4] = 'water';
    tiles[3][5] = 'water';
    tiles[4][5] = 'water';
    tiles[0][6] = 'pit';
    tiles[7][6] = 'pit';

    const player = makeEntity('player', 'player', 'PILEDRIVER MK-IV', 1, 3, 6, false, false, {
      dx: 1,
      dy: 0,
    });
    const boss = makeEntity(
      'boss_leviathan',
      'boss_core',
      'FOUNDRY LEVIATHAN',
      6,
      3,
      14,
      true,
      false,
      { dx: -1, dy: 0 },
      true
    );
    const pylonN = makeEntity(
      'boss_pylon_n',
      'boss_pylon',
      'NORTH FERRO-PYLON',
      6,
      1,
      4,
      true,
      false,
      { dx: -1, dy: 0 }
    );
    const pylonS = makeEntity(
      'boss_pylon_s',
      'boss_pylon',
      'SOUTH FERRO-PYLON',
      6,
      6,
      4,
      true,
      false,
      { dx: -1, dy: 0 }
    );

    const b1 = makeEntity('prop_barrel_5a', 'barrel', 'VOLATILE BARREL', 4, 3, 1, false, true);
    const b2 = makeEntity('prop_barrel_5b', 'barrel', 'VOLATILE BARREL', 5, 1, 1, false, true);
    const b3 = makeEntity('prop_barrel_5c', 'barrel', 'VOLATILE BARREL', 5, 6, 1, false, true);
    const e1 = makeEntity('e_bruiser_5a', 'bruiser', 'IRON VANGUARD', 2, 3, 3, true, false, {
      dx: -1,
      dy: 0,
    });
    const coil = makeEntity('prop_coil_5', 'shock_coil', 'CORE TESLA COIL', 5, 3, 2, false, true);
    const vault = makeEntity('prop_vault_5', 'bounty_vault', 'OVERCHARGE VAULT', 4, 5, 1, false, true);

    state.entities.push(player, boss, pylonN, pylonS, b1, b2, b3, e1, coil, vault);
    state.selectedTool = 'ram';
    state.hoveredTile = { x: 2, y: 3 };
  }

  refreshEnemyIntents(state);
}

export function createInitialState(seed = 20261108): GameState {
  const { tiles, iceCracked } = makeEmptyTiles();
  const state: GameState = {
    seed,
    rngState: seed >>> 0,
    roomNumber: 1,
    roomTitle: '',
    roomSubtitle: '',
    turnNumber: 1,
    phase: 'playing',
    selectedTool: 'ram',
    hoveredTile: { x: 2, y: 4 },
    ap: 2,
    maxAp: 2,
    tiles,
    iceCracked,
    scars: [],
    entities: [],
    activeRelics: [],
    relicChoices: [],
    score: 0,
    unbankedBounty: 0,
    greedMultiplier: 1,
    overclockCountThisRoom: 0,
    vaultsCrackedTotal: 0,
    bestSingleTurnChain: 0,
    bestChainDescription: 'No Domino Chain Triggered Yet',
    environmentalKills: 0,
    directKills: 0,
    totalDominoLinks: 0,
    causeOfTermination: 'In Progress',
    tutorialCalloutVisible: true,
    tutorialCalloutText:
      'CLICK [2,4] OR PRESS [SPACE] TO FIRE PISTON RAM -> TRIGGER 7-STEP DOMINO CASCADE!',
    lastActionEvents: [],
    lastBannerText: 'DOMINO ORACLE ACTIVE // AIM & RELEASE TO TRIGGER CASCADE',
  };

  setupRoom(state, 1);
  return state;
}

export function refreshEnemyIntents(state: GameState): void {
  const player = getPlayer(state);
  if (!player) return;

  for (const ent of state.entities) {
    if (!ent.isEnemy || ent.hp <= 0) {
      ent.intent = undefined;
      continue;
    }
    if (ent.kind === 'boss_pylon') {
      ent.intent = {
        kind: 'zap',
        targetX: ent.x,
        targetY: ent.y,
        damage: 0,
        description: 'FERRO-SHIELD GENERATOR (DESTROY VIA KNOCKBACK/BLAST)',
      };
      continue;
    }
    const dx = Math.sign(player.x - ent.x);
    const dy = Math.sign(player.y - ent.y);
    ent.facing = Math.abs(player.x - ent.x) >= Math.abs(player.y - ent.y) ? { dx: dx || -1, dy: 0 } : { dx: 0, dy: dy || 1 };

    if (ent.kind === 'boss_core') {
      ent.intent = {
        kind: 'zap',
        targetX: player.x,
        targetY: player.y,
        damage: 2,
        description: 'SLAG CANNON BARRAGE (2 DMG + SPAWN BARREL)',
      };
    } else if (ent.kind === 'bomber') {
      ent.intent = {
        kind: 'detonate',
        targetX: player.x,
        targetY: player.y,
        damage: 2,
        description: 'CHARGE & SELF-DETONATE (2 DMG + KNOCKBACK)',
      };
    } else {
      ent.intent = {
        kind: 'ram',
        targetX: player.x,
        targetY: player.y,
        damage: 1,
        description: 'HYDRAULIC CHARGE (1 DMG + SHOVE)',
      };
    }
  }
}

function addScar(
  state: GameState,
  x: number,
  y: number,
  kind: SurfaceScar['kind'],
  intensity = 1
): void {
  if (!inBounds(x, y)) return;
  const angle = ((x * 73 + y * 137 + state.scars.length * 29) % 360) * (Math.PI / 180);
  state.scars.push({
    id: `scar_${state.roomNumber}_${state.turnNumber}_${state.scars.length}`,
    x,
    y,
    kind,
    intensity,
    angle,
  });
}

function pushChainEvent(
  events: ChainEvent[],
  partial: Omit<ChainEvent, 'stepIndex' | 'delayMs' | 'hitStopMs'>
): ChainEvent {
  const stepIndex = events.length + 1;
  // Staggered 75-95ms micro-delays so every domino falls 1-by-1
  const delayMs = Math.min(100, 75 + (stepIndex % 4) * 6);
  // Escalating hit-stop from 40ms up to 65ms as the chain climbs!
  const hitStopMs = Math.min(65, 40 + (stepIndex - 1) * 5);
  const full: ChainEvent = {
    ...partial,
    stepIndex,
    delayMs,
    hitStopMs,
  };
  events.push(full);
  return full;
}

function recordKill(
  state: GameState,
  target: DioramaEntity,
  isHazard: boolean,
  events: ChainEvent[]
): void {
  if (!target.isEnemy) return;
  if (isHazard) {
    state.environmentalKills += 1;
    state.unbankedBounty += 120 * state.greedMultiplier;
  } else {
    state.directKills += 1;
    state.unbankedBounty += 60 * state.greedMultiplier;
  }

  // Rule-Bending Relic: Domino Encore
  // Whenever an environmental hazard kills an enemy, refund +1 AP and spawn an unstable barrel at their corpse!
  if (isHazard && state.activeRelics.includes('domino_encore')) {
    state.ap = Math.min(state.maxAp + 2, state.ap + 1);
    const occupied = getEntityAt(state, target.x, target.y);
    if (!occupied && state.tiles[target.y][target.x] !== 'pit') {
      const barrelId = `encore_barrel_${state.turnNumber}_${state.entities.length}`;
      state.entities.push(
        makeEntity(barrelId, 'barrel', 'ENCORE BARREL', target.x, target.y, 1, false, true)
      );
      pushChainEvent(events, {
        kind: 'relic_trigger',
        entityId: barrelId,
        from: { x: target.x, y: target.y },
        to: { x: target.x, y: target.y },
        damage: 0,
        killed: false,
        hazardKill: false,
        badgeText: 'DOMINO ENCORE! +1 AP & BARREL',
        badgeColor: '#ef4444',
        cameraPunch: { dx: 0, dy: -1 },
      });
    }
  }
}

/**
 * Applies damage to an entity and handles immediate secondary triggers
 * (e.g. Barrel detonation, Pillar collapse, Shock Coil discharge, Vault crack, Pylon overload).
 */
function applyDamage(
  state: GameState,
  target: DioramaEntity,
  amount: number,
  isHazard: boolean,
  sourceDir: { dx: number; dy: number },
  events: ChainEvent[],
  arrows: KnockbackArrow[],
  depth: number
): void {
  if (target.hp <= 0 || depth > 32) return;

  // Boss Core Ferro-Shield protection while any Boss Pylon is alive
  if (target.kind === 'boss_core') {
    const pylonsAlive = state.entities.some((e) => e.kind === 'boss_pylon' && e.hp > 0);
    if (pylonsAlive && !isHazard) {
      pushChainEvent(events, {
        kind: 'wall_slam',
        entityId: target.id,
        from: { x: target.x, y: target.y },
        to: { x: target.x, y: target.y },
        damage: 0,
        killed: false,
        hazardKill: false,
        badgeText: 'FERRO-SHIELDED! BREAK PYLONS',
        badgeColor: '#94a3b8',
        cameraPunch: sourceDir,
      });
      return;
    }
  }

  // Bulwark Shield Guard blocks direct (non-hazard) front attacks
  if (target.kind === 'shield_guard' && target.shieldedFront && !isHazard) {
    pushChainEvent(events, {
      kind: 'wall_slam',
      entityId: target.id,
      from: { x: target.x, y: target.y },
      to: { x: target.x, y: target.y },
      damage: 0,
      killed: false,
      hazardKill: false,
      badgeText: 'ARMOR BLOCKED! USE KNOCKBACK',
      badgeColor: '#f59e0b',
      cameraPunch: sourceDir,
    });
    return;
  }

  const effectiveDamage = Math.max(0, amount);
  target.hp = Math.max(0, target.hp - effectiveDamage);
  target.flashTimerMs = 220;
  target.squashX = sourceDir.dx !== 0 ? 0.72 : 1.24;
  target.squashY = sourceDir.dy !== 0 ? 0.72 : 1.24;

  const killed = target.hp === 0;
  if (killed) {
    recordKill(state, target, isHazard, events);
  }

  // Handle environmental prop/unit destruction cascades
  if (target.kind === 'barrel' && killed) {
    detonateBarrel(state, target, events, arrows, depth + 1);
  } else if (target.kind === 'pillar' && killed) {
    collapsePillar(state, target, events, arrows, depth + 1);
  } else if (target.kind === 'shock_coil') {
    triggerShockCoil(state, target, events, arrows, depth + 1);
  } else if (target.kind === 'bounty_vault' && killed) {
    crackBountyVault(state, target, events, arrows, depth + 1);
  } else if (target.kind === 'bomber' && killed) {
    detonateBarrel(state, target, events, arrows, depth + 1);
  } else if (target.kind === 'sentry' && killed) {
    triggerShockCoil(state, target, events, arrows, depth + 1);
  } else if (target.kind === 'boss_pylon' && killed) {
    triggerPylonOverload(state, target, events, arrows, depth + 1);
  }
}

function detonateBarrel(
  state: GameState,
  barrel: DioramaEntity,
  events: ChainEvent[],
  arrows: KnockbackArrow[],
  depth: number
): void {
  if (depth > 32) return;
  barrel.hp = 0;
  addScar(state, barrel.x, barrel.y, 'scorch', 1.4);
  addScar(state, barrel.x, barrel.y, 'smoke_plume', 1.0);

  pushChainEvent(events, {
    kind: 'barrel_blast',
    entityId: barrel.id,
    from: { x: barrel.x, y: barrel.y },
    to: { x: barrel.x, y: barrel.y },
    damage: 3,
    killed: true,
    hazardKill: true,
    badgeText: 'SLAG BLAST! 3 DMG',
    badgeColor: '#ef4444',
    cameraPunch: { dx: 0, dy: -1 },
  });

  state.unbankedBounty += 50 * state.greedMultiplier;

  // Collect all living entities in 3x3 around the barrel
  const neighbors: Array<{ ent: DioramaEntity; dx: number; dy: number }> = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = barrel.x + dx;
      const ny = barrel.y + dy;
      if (!inBounds(nx, ny)) continue;
      addScar(state, nx, ny, 'slag_splatter', 0.7);
      const ent = getEntityAt(state, nx, ny);
      if (ent && ent.id !== barrel.id) {
        neighbors.push({ ent, dx, dy });
      }
    }
  }

  // Sort so orthogonal North/South neighbors resolve first, then East/West, then diagonals
  neighbors.sort((a, b) => {
    const manA = Math.abs(a.dx) + Math.abs(a.dy);
    const manB = Math.abs(b.dx) + Math.abs(b.dy);
    if (manA !== manB) return manA - manB;
    return Math.abs(b.dy) - Math.abs(a.dy);
  });

  for (const { ent, dx, dy } of neighbors) {
    if (ent.hp <= 0) continue;
    const pushDir =
      Math.abs(dx) + Math.abs(dy) === 2
        ? { dx, dy: 0 }
        : { dx, dy };
    // Deal 1 blast damage to units so the shockwave launches them into pits, pillars, and walls!
    // Props (barrels, pillars, vaults, coils, pylons) take full 3 blast damage to chain-detonate!
    const blastDmg = ent.isProp || ent.kind === 'boss_pylon' || ent.kind === 'boss_core' ? 3 : 1;
    applyDamage(state, ent, blastDmg, true, pushDir, events, arrows, depth + 1);
    if (ent.hp > 0 && ent.kind !== 'pillar' && ent.kind !== 'shock_coil') {
      displaceEntity(state, ent, pushDir.dx, pushDir.dy, 2, 'shove', events, arrows, depth + 1);
    }
  }

  // Relic: Seismic Aftershock — cardinal wave 2 tiles outward along all 4 axes
  if (state.activeRelics.includes('seismic_aftershock')) {
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const d of dirs) {
      for (let dist = 2; dist <= 3; dist++) {
        const tx = barrel.x + d.dx * dist;
        const ty = barrel.y + d.dy * dist;
        const hit = getEntityAt(state, tx, ty);
        if (hit && hit.hp > 0) {
          pushChainEvent(events, {
            kind: 'relic_trigger',
            entityId: hit.id,
            from: { x: barrel.x, y: barrel.y },
            to: { x: tx, y: ty },
            damage: 1,
            killed: false,
            hazardKill: false,
            badgeText: 'SEISMIC WAVE!',
            badgeColor: '#a3e635',
            cameraPunch: d,
          });
          displaceEntity(state, hit, d.dx, d.dy, 1, 'shove', events, arrows, depth + 1);
        }
      }
    }
  }
}

function collapsePillar(
  state: GameState,
  pillar: DioramaEntity,
  events: ChainEvent[],
  arrows: KnockbackArrow[],
  depth: number
): void {
  if (depth > 32) return;
  pillar.hp = 0;
  addScar(state, pillar.x, pillar.y, 'rubble', 1.5);
  addScar(state, pillar.x, pillar.y, 'cracks', 1.2);

  pushChainEvent(events, {
    kind: 'pillar_collapse',
    entityId: pillar.id,
    from: { x: pillar.x, y: pillar.y },
    to: { x: pillar.x, y: pillar.y },
    damage: 3,
    killed: true,
    hazardKill: true,
    badgeText: 'PILLAR COLLAPSE!',
    badgeColor: '#f59e0b',
    cameraPunch: { dx: 0, dy: 1 },
  });

  state.unbankedBounty += 65 * state.greedMultiplier;

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  for (const d of dirs) {
    const nx = pillar.x + d.dx;
    const ny = pillar.y + d.dy;
    const neighbor = getEntityAt(state, nx, ny);
    if (neighbor && neighbor.hp > 0) {
      applyDamage(state, neighbor, 2, true, d, events, arrows, depth + 1);
      if (neighbor.hp > 0) {
        displaceEntity(state, neighbor, d.dx, d.dy, 1, 'shove', events, arrows, depth + 1);
      }
    }
  }
}

function triggerShockCoil(
  state: GameState,
  coil: DioramaEntity,
  events: ChainEvent[],
  arrows: KnockbackArrow[],
  depth: number
): void {
  if (depth > 32) return;
  addScar(state, coil.x, coil.y, 'puddle_spark', 1.3);

  pushChainEvent(events, {
    kind: 'shock_arc',
    entityId: coil.id,
    from: { x: coil.x, y: coil.y },
    to: { x: coil.x, y: coil.y },
    damage: 2,
    killed: false,
    hazardKill: false,
    badgeText: 'HIGH-VOLTAGE ARC!',
    badgeColor: '#38bdf8',
    cameraPunch: { dx: 1, dy: -1 },
  });

  // Flood-fill all connected 'water' tiles + orthogonal neighbors of the coil
  const electrified = new Set<string>();
  const queue: GridPos[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = coil.x + dx;
      const ny = coil.y + dy;
      if (!inBounds(nx, ny)) continue;
      const key = `${nx},${ny}`;
      electrified.add(key);
      if (state.tiles[ny][nx] === 'water') {
        queue.push({ x: nx, y: ny });
      }
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const d of dirs) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      const key = `${nx},${ny}`;
      if (inBounds(nx, ny) && state.tiles[ny][nx] === 'water' && !electrified.has(key)) {
        electrified.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  for (const key of electrified) {
    const [xs, ys] = key.split(',');
    const tx = Number(xs);
    const ty = Number(ys);
    if (state.tiles[ty][tx] === 'water') {
      addScar(state, tx, ty, 'puddle_spark', 1.0);
    }
    const ent = getEntityAt(state, tx, ty);
    if (ent && ent.id !== coil.id && ent.hp > 0 && ent.kind !== 'shock_coil') {
      const willKill = ent.hp <= 2;
      pushChainEvent(events, {
        kind: 'shock_arc',
        entityId: ent.id,
        from: { x: coil.x, y: coil.y },
        to: { x: tx, y: ty },
        damage: 2,
        killed: willKill,
        hazardKill: willKill,
        badgeText: willKill ? 'ELECTROCUTED! -2' : 'ARC SHOCK -2',
        badgeColor: '#38bdf8',
        cameraPunch: { dx: Math.sign(tx - coil.x), dy: Math.sign(ty - coil.y) },
      });
      applyDamage(
        state,
        ent,
        2,
        true,
        { dx: Math.sign(tx - coil.x) || 1, dy: Math.sign(ty - coil.y) },
        events,
        arrows,
        depth + 1
      );
    }
  }
}

function crackBountyVault(
  state: GameState,
  vault: DioramaEntity,
  events: ChainEvent[],
  arrows: KnockbackArrow[],
  depth: number
): void {
  vault.hp = 0;
  state.vaultsCrackedTotal += 1;
  state.unbankedBounty += 150 * state.greedMultiplier;
  state.ap = Math.min(state.maxAp + 2, state.ap + 1);
  addScar(state, vault.x, vault.y, 'cracks', 1.3);

  pushChainEvent(events, {
    kind: 'vault_crack',
    entityId: vault.id,
    from: { x: vault.x, y: vault.y },
    to: { x: vault.x, y: vault.y },
    damage: 0,
    killed: true,
    hazardKill: false,
    badgeText: 'VAULT CRACKED! +150 & +1 AP',
    badgeColor: '#a3e635',
    cameraPunch: { dx: 0, dy: -1 },
  });

  // Thermal shockwave shoves adjacent units 1 tile outward
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  for (const d of dirs) {
    const ent = getEntityAt(state, vault.x + d.dx, vault.y + d.dy);
    if (ent && ent.hp > 0 && ent.kind !== 'player') {
      displaceEntity(state, ent, d.dx, d.dy, 1, 'shove', events, arrows, depth + 1);
    }
  }
}

function triggerPylonOverload(
  state: GameState,
  pylon: DioramaEntity,
  events: ChainEvent[],
  arrows: KnockbackArrow[],
  depth: number
): void {
  addScar(state, pylon.x, pylon.y, 'scorch', 1.5);
  const boss = state.entities.find((e) => e.kind === 'boss_core' && e.hp > 0);
  if (!boss) return;

  pushChainEvent(events, {
    kind: 'pylon_overload',
    entityId: boss.id,
    from: { x: pylon.x, y: pylon.y },
    to: { x: boss.x, y: boss.y },
    damage: 4,
    killed: boss.hp <= 4,
    hazardKill: true,
    badgeText: 'PYLON OVERLOAD! -4 BOSS HP',
    badgeColor: '#38bdf8',
    cameraPunch: { dx: 1, dy: 0 },
  });

  applyDamage(state, boss, 4, true, { dx: 1, dy: 0 }, events, arrows, depth + 1);
}

/**
 * Core deterministic knockback & environmental interaction resolver.
 * Moves `entity` step-by-step along `(dx, dy)` for `steps` tiles, checking:
 * - Arena Wall slams & Rubberized Wall bounces
 * - Entity-to-Entity collisions (slams into Barrels, Pillars, Shock Coils, Vaults, or other Enemies)
 * - Molten Pit drops (instant Hazard Kill!)
 * - Cryo-Glass / Ice sliding & shattering
 * - Directional Pinball Bumpers (90-degree deflection + bonus velocity)
 * - Spring Walls (180-degree high-velocity ricochet)
 * - Mechanized Conveyor Belts
 * - Rule-bending Relics (Rubberized Walls, Chain Polarity, Conductive Chassis)
 */
export function displaceEntity(
  state: GameState,
  entity: DioramaEntity,
  dx: number,
  dy: number,
  steps: number,
  moveKind: KnockbackArrow['kind'],
  events: ChainEvent[],
  arrows: KnockbackArrow[],
  depth = 0
): void {
  if (entity.hp <= 0 || steps <= 0 || (dx === 0 && dy === 0) || depth > 32) return;

  let curDx = Math.sign(dx);
  let curDy = Math.sign(dy);
  let remainingSteps = steps;
  const rubberized = state.activeRelics.includes('rubberized_walls');

  while (remainingSteps > 0 && entity.hp > 0) {
    const startX = entity.x;
    const startY = entity.y;
    const nextX = startX + curDx;
    const nextY = startY + curDy;

    // 1. Check Arena Wall collision
    if (!inBounds(nextX, nextY)) {
      const wallDmg = rubberized ? 3 : 1;
      const willKill = entity.hp <= wallDmg;
      addScar(state, startX, startY, 'cracks', 0.9);

      pushChainEvent(events, {
        kind: rubberized ? 'wall_bounce' : 'wall_slam',
        entityId: entity.id,
        from: { x: startX, y: startY },
        to: { x: startX, y: startY },
        damage: wallDmg,
        killed: willKill,
        hazardKill: willKill,
        badgeText: rubberized
          ? `RUBBER BOUNCE! -${wallDmg}`
          : willKill
            ? `WALL CRUSH KILL! -${wallDmg}`
            : `WALL SLAM -${wallDmg}`,
        badgeColor: rubberized ? '#f59e0b' : '#fb923c',
        cameraPunch: { dx: curDx, dy: curDy },
      });

      applyDamage(state, entity, wallDmg, true, { dx: curDx, dy: curDy }, events, arrows, depth + 1);
      triggerCollisionRelics(state, entity, { dx: curDx, dy: curDy }, events, arrows, depth + 1);

      if (rubberized && entity.hp > 0) {
        // Reverse direction and continue with at least 2 tiles of bounce momentum!
        curDx = -curDx;
        curDy = -curDy;
        remainingSteps = Math.max(remainingSteps, 2);
        moveKind = 'bounce';
        continue;
      }
      break;
    }

    // 2. Check Entity/Obstacle collision at (nextX, nextY)
    const blocker = getEntityAt(state, nextX, nextY);
    if (blocker && blocker.id !== entity.id) {
      const collisionDmg = rubberized ? 2 : 1;
      addScar(state, nextX, nextY, 'cracks', 1.0);

      pushChainEvent(events, {
        kind: 'entity_collision',
        entityId: blocker.id,
        from: { x: startX, y: startY },
        to: { x: nextX, y: nextY },
        damage: collisionDmg,
        killed: blocker.hp <= collisionDmg,
        hazardKill: true,
        badgeText:
          blocker.kind === 'barrel'
            ? 'BARREL IMPACT!'
            : blocker.kind === 'pillar'
              ? 'PILLAR SLAM!'
              : blocker.kind === 'bounty_vault'
                ? 'VAULT IMPACT!'
                : `DOMINO SLAM! -${collisionDmg}`,
        badgeColor: '#f59e0b',
        cameraPunch: { dx: curDx, dy: curDy },
      });

      // Both the moving entity and the blocker take collision impact damage!
      applyDamage(state, entity, 1, true, { dx: curDx, dy: curDy }, events, arrows, depth + 1);
      applyDamage(
        state,
        blocker,
        collisionDmg,
        true,
        { dx: curDx, dy: curDy },
        events,
        arrows,
        depth + 1
      );

      triggerCollisionRelics(state, blocker, { dx: curDx, dy: curDy }, events, arrows, depth + 1);

      // Transfer momentum into the blocker if it survived and is movable!
      if (
        blocker.hp > 0 &&
        blocker.kind !== 'pillar' &&
        blocker.kind !== 'shock_coil' &&
        blocker.kind !== 'boss_pylon'
      ) {
        const transferSteps = Math.max(1, remainingSteps);
        displaceEntity(
          state,
          blocker,
          curDx,
          curDy,
          transferSteps,
          'shove',
          events,
          arrows,
          depth + 1
        );
      }

      // If Rubberized Walls is active and we hit a solid Pillar/Coil, bounce back!
      if (rubberized && entity.hp > 0 && (blocker.kind === 'pillar' || blocker.kind === 'shock_coil')) {
        curDx = -curDx;
        curDy = -curDy;
        remainingSteps = Math.max(1, remainingSteps - 1);
        moveKind = 'bounce';
        continue;
      }
      break;
    }

    // 3. Advance entity into (nextX, nextY)
    entity.x = nextX;
    entity.y = nextY;
    remainingSteps -= 1;

    arrows.push({
      entityId: entity.id,
      from: { x: startX, y: startY },
      to: { x: nextX, y: nextY },
      kind: moveKind,
    });

    const tile = state.tiles[nextY][nextX];

    // 4. Check Molten Pit drop!
    if (tile === 'pit') {
      if (entity.kind === 'boss_core') {
        pushChainEvent(events, {
          kind: 'pit_drop',
          entityId: entity.id,
          from: { x: startX, y: startY },
          to: { x: nextX, y: nextY },
          damage: 4,
          killed: entity.hp <= 4,
          hazardKill: true,
          badgeText: 'MOLTEN SLAG BURN! -4',
          badgeColor: '#ef4444',
          cameraPunch: { dx: curDx, dy: curDy },
        });
        applyDamage(state, entity, 4, true, { dx: curDx, dy: curDy }, events, arrows, depth + 1);
        entity.x = startX;
        entity.y = startY;
      } else {
        addScar(state, nextX, nextY, 'smoke_plume', 1.5);
        pushChainEvent(events, {
          kind: 'pit_drop',
          entityId: entity.id,
          from: { x: startX, y: startY },
          to: { x: nextX, y: nextY },
          damage: entity.hp,
          killed: true,
          hazardKill: true,
          badgeText: 'HAZARD KILL! PIT DROP',
          badgeColor: '#ef4444',
          cameraPunch: { dx: curDx, dy: curDy },
        });
        applyDamage(
          state,
          entity,
          entity.hp + 99,
          true,
          { dx: curDx, dy: curDy },
          events,
          arrows,
          depth + 1
        );
      }
      return;
    }

    // 5. Check Cryo-Glass / Ice Tile (slides without consuming a step, cracks into a Pit!)
    if (tile === 'ice') {
      if (state.iceCracked[nextY][nextX]) {
        // Shatters into an open Pit!
        state.tiles[nextY][nextX] = 'pit';
        addScar(state, nextX, nextY, 'cracks', 1.4);
        pushChainEvent(events, {
          kind: 'ice_shatter',
          entityId: entity.id,
          from: { x: startX, y: startY },
          to: { x: nextX, y: nextY },
          damage: entity.hp,
          killed: true,
          hazardKill: true,
          badgeText: 'CRYO-GLASS SHATTER KILL!',
          badgeColor: '#38bdf8',
          cameraPunch: { dx: 0, dy: 1 },
        });
        applyDamage(
          state,
          entity,
          entity.hp + 99,
          true,
          { dx: curDx, dy: curDy },
          events,
          arrows,
          depth + 1
        );
        return;
      } else {
        state.iceCracked[nextY][nextX] = true;
        remainingSteps += 1; // Frictionless slide preserves momentum!
        moveKind = 'slide';
        pushChainEvent(events, {
          kind: 'ice_slide',
          entityId: entity.id,
          from: { x: startX, y: startY },
          to: { x: nextX, y: nextY },
          damage: 0,
          killed: false,
          hazardKill: false,
          badgeText: 'CRYO SLIDE!',
          badgeColor: '#38bdf8',
          cameraPunch: { dx: curDx, dy: curDy },
        });
      }
    }

    // 6. Check Directional Pinball Bumpers & Spring Walls
    if (
      tile === 'bumper_ne' ||
      tile === 'bumper_nw' ||
      tile === 'bumper_se' ||
      tile === 'bumper_sw' ||
      tile === 'spring_wall'
    ) {
      if (tile === 'spring_wall') {
        curDx = -curDx;
        curDy = -curDy;
      } else if (tile === 'bumper_sw') {
        // Deflects East (+1,0) -> South (0,+1) or North (0,-1) -> West (-1,0)
        if (curDx !== 0) {
          curDx = 0;
          curDy = 1;
        } else {
          curDx = -1;
          curDy = 0;
        }
      } else if (tile === 'bumper_se') {
        if (curDx !== 0) {
          curDx = 0;
          curDy = 1;
        } else {
          curDx = 1;
          curDy = 0;
        }
      } else if (tile === 'bumper_nw') {
        if (curDx !== 0) {
          curDx = 0;
          curDy = -1;
        } else {
          curDx = -1;
          curDy = 0;
        }
      } else if (tile === 'bumper_ne') {
        if (curDx !== 0) {
          curDx = 0;
          curDy = -1;
        } else {
          curDx = 1;
          curDy = 0;
        }
      }
      remainingSteps = Math.max(remainingSteps + 1, 2);
      moveKind = 'bumper';
      pushChainEvent(events, {
        kind: 'bumper_deflect',
        entityId: entity.id,
        from: { x: nextX, y: nextY },
        to: { x: nextX + curDx, y: nextY + curDy },
        damage: 1,
        killed: entity.hp <= 1,
        hazardKill: entity.hp <= 1,
        badgeText: 'PINBALL RICOCHET! +SPEED',
        badgeColor: '#f59e0b',
        cameraPunch: { dx: curDx, dy: curDy },
      });
      applyDamage(state, entity, 1, true, { dx: curDx, dy: curDy }, events, arrows, depth + 1);
    }
  }

  // 7. After coming to rest on a Conveyor Belt, the belt immediately shoves the entity 1 tile!
  if (entity.hp > 0 && depth < 10) {
    const finalTile = state.tiles[entity.y][entity.x];
    const convDir =
      finalTile === 'conveyor_e'
        ? { dx: 1, dy: 0 }
        : finalTile === 'conveyor_w'
          ? { dx: -1, dy: 0 }
          : finalTile === 'conveyor_s'
            ? { dx: 0, dy: 1 }
            : finalTile === 'conveyor_n'
              ? { dx: 0, dy: -1 }
              : null;

    if (convDir) {
      pushChainEvent(events, {
        kind: 'conveyor_push',
        entityId: entity.id,
        from: { x: entity.x, y: entity.y },
        to: { x: entity.x + convDir.dx, y: entity.y + convDir.dy },
        damage: 0,
        killed: false,
        hazardKill: false,
        badgeText: 'CONVEYOR SHOVE!',
        badgeColor: '#fb923c',
        cameraPunch: convDir,
      });
      displaceEntity(
        state,
        entity,
        convDir.dx,
        convDir.dy,
        1,
        'conveyor',
        events,
        arrows,
        depth + 1
      );
    }
  }
}

function triggerCollisionRelics(
  state: GameState,
  centerEntity: DioramaEntity,
  dir: { dx: number; dy: number },
  events: ChainEvent[],
  arrows: KnockbackArrow[],
  depth: number
): void {
  if (depth > 12) return;

  // Relic: Chain Polarity — pulls all orthogonally adjacent enemies/barrels 1 tile toward the struck unit!
  if (state.activeRelics.includes('chain_polarity')) {
    centerEntity.magnetizedTurns = 1;
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const d of dirs) {
      // Look 2 tiles away so pulling 1 tile moves them adjacent to centerEntity
      const tx = centerEntity.x + d.dx * 2;
      const ty = centerEntity.y + d.dy * 2;
      const adj = getEntityAt(state, tx, ty);
      if (adj && adj.id !== 'player' && adj.hp > 0) {
        pushChainEvent(events, {
          kind: 'relic_trigger',
          entityId: adj.id,
          from: { x: tx, y: ty },
          to: { x: centerEntity.x + d.dx, y: centerEntity.y + d.dy },
          damage: 1,
          killed: adj.hp <= 1,
          hazardKill: adj.hp <= 1,
          badgeText: 'MAGNETIC PULL! -1',
          badgeColor: '#38bdf8',
          cameraPunch: { dx: -d.dx, dy: -d.dy },
        });
        applyDamage(state, adj, 1, true, { dx: -d.dx, dy: -d.dy }, events, arrows, depth + 1);
        if (adj.hp > 0) {
          displaceEntity(state, adj, -d.dx, -d.dy, 1, 'pull', events, arrows, depth + 1);
        }
      }
    }
  }

  // Relic: Conductive Chassis — discharges 1 Electric Hazard DMG to adjacent enemies and water pools
  if (state.activeRelics.includes('conductive_chassis')) {
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const d of dirs) {
      const nx = centerEntity.x + d.dx;
      const ny = centerEntity.y + d.dy;
      const adj = getEntityAt(state, nx, ny);
      if (adj && adj.isEnemy && adj.hp > 0 && adj.id !== centerEntity.id) {
        pushChainEvent(events, {
          kind: 'relic_trigger',
          entityId: adj.id,
          from: { x: centerEntity.x, y: centerEntity.y },
          to: { x: nx, y: ny },
          damage: 1,
          killed: adj.hp <= 1,
          hazardKill: adj.hp <= 1,
          badgeText: 'ARC CHASSIS! -1',
          badgeColor: '#22d3ee',
          cameraPunch: dir,
        });
        applyDamage(state, adj, 1, true, d, events, arrows, depth + 1);
      }
    }
  }
}

/**
 * Resolves the player's tool or movement action on `state` (mutating `state` deterministically)
 * and returns the structured events and knockback arrows produced.
 */
export function resolveToolActionOnState(
  state: GameState,
  tool: ToolKind,
  targetX: number,
  targetY: number
): {
  valid: boolean;
  reason: string;
  events: ChainEvent[];
  arrows: KnockbackArrow[];
} {
  const events: ChainEvent[] = [];
  const arrows: KnockbackArrow[] = [];

  if (state.phase !== 'playing') {
    return { valid: false, reason: 'Room not in active play phase', events, arrows };
  }
  const player = getPlayer(state);
  if (!player) {
    return { valid: false, reason: 'Piledriver Rig offline', events, arrows };
  }
  if (state.ap <= 0) {
    return {
      valid: false,
      reason: '0 AP remaining — Press [B] to Bank & End Turn or [G] to Overclock!',
      events,
      arrows,
    };
  }
  if (!inBounds(targetX, targetY)) {
    return { valid: false, reason: 'Target outside foundry grid', events, arrows };
  }

  const rdx = targetX - player.x;
  const rdy = targetY - player.y;
  const manhattan = Math.abs(rdx) + Math.abs(rdy);
  const bonusKnockback = state.activeRelics.includes('grappling_overdrive') ? 1 : 0;

  if (tool === 'move') {
    if (manhattan === 0 || manhattan > 2) {
      return { valid: false, reason: 'Move range is 1-2 tiles', events, arrows };
    }
    if (state.tiles[targetY][targetX] === 'pit') {
      return { valid: false, reason: 'Cannot walk into Molten Slag Pit', events, arrows };
    }
    if (getEntityAt(state, targetX, targetY)) {
      return { valid: false, reason: 'Tile occupied — switch to [1] Ram or [2] Harpoon', events, arrows };
    }

    const fromPos = { x: player.x, y: player.y };
    player.x = targetX;
    player.y = targetY;
    player.facing = { dx: Math.sign(rdx) || player.facing.dx, dy: Math.sign(rdy) };
    state.ap -= 1;
    state.tutorialCalloutVisible = false;

    pushChainEvent(events, {
      kind: 'move',
      entityId: player.id,
      from: fromPos,
      to: { x: targetX, y: targetY },
      damage: 0,
      killed: false,
      hazardKill: false,
      badgeText: 'TREAD REPOSITION',
      badgeColor: '#94a3b8',
      cameraPunch: { dx: Math.sign(rdx), dy: Math.sign(rdy) },
    });
    arrows.push({
      entityId: player.id,
      from: fromPos,
      to: { x: targetX, y: targetY },
      kind: 'shove',
    });

    // Check if player stepped onto a conveyor belt
    displaceEntity(state, player, 0, 0, 0, 'conveyor', events, arrows, 0);
    refreshEnemyIntents(state);
    return { valid: true, reason: 'Moved', events, arrows };
  }

  if (tool === 'ram') {
    if ((rdx !== 0 && rdy !== 0) || manhattan === 0) {
      return { valid: false, reason: 'Piston Ram fires along a cardinal row or column', events, arrows };
    }
    const dir = { dx: Math.sign(rdx), dy: Math.sign(rdy) };
    // Find first entity along ray up to 3 tiles away
    let hitEntity: DioramaEntity | undefined;
    for (let dist = 1; dist <= 3; dist++) {
      const cx = player.x + dir.dx * dist;
      const cy = player.y + dir.dy * dist;
      if (!inBounds(cx, cy)) break;
      const found = getEntityAt(state, cx, cy);
      if (found) {
        hitEntity = found;
        break;
      }
    }
    if (!hitEntity) {
      return { valid: false, reason: 'No target in Piston Ram range (1-3 tiles)', events, arrows };
    }

    player.facing = dir;
    state.ap -= 1;
    state.tutorialCalloutVisible = false;

    pushChainEvent(events, {
      kind: 'shove',
      entityId: hitEntity.id,
      from: { x: player.x, y: player.y },
      to: { x: hitEntity.x, y: hitEntity.y },
      damage: 1,
      killed: hitEntity.hp <= 1 && !hitEntity.shieldedFront,
      hazardKill: false,
      badgeText: 'PISTON RAM! SHOVE 3',
      badgeColor: '#f59e0b',
      cameraPunch: dir,
    });

    const behindPos = { x: hitEntity.x + dir.dx, y: hitEntity.y + dir.dy };
    applyDamage(state, hitEntity, 1, false, dir, events, arrows, 0);
    if (hitEntity.hp > 0 && hitEntity.kind !== 'pillar' && hitEntity.kind !== 'shock_coil') {
      displaceEntity(
        state,
        hitEntity,
        dir.dx,
        dir.dy,
        3 + bonusKnockback,
        'shove',
        events,
        arrows,
        0
      );
    }

    if (state.activeRelics.includes('grappling_overdrive') && inBounds(behindPos.x, behindPos.y)) {
      const secondary = getEntityAt(state, behindPos.x, behindPos.y);
      if (secondary && secondary.hp > 0) {
        applyDamage(state, secondary, 1, true, dir, events, arrows, 1);
      }
    }
  } else if (tool === 'harpoon') {
    if ((rdx !== 0 && rdy !== 0) || manhattan === 0) {
      return { valid: false, reason: 'Winch Harpoon fires along a cardinal row or column', events, arrows };
    }
    const dir = { dx: Math.sign(rdx), dy: Math.sign(rdy) };
    let hitEntity: DioramaEntity | undefined;
    for (let dist = 1; dist <= 5; dist++) {
      const cx = player.x + dir.dx * dist;
      const cy = player.y + dir.dy * dist;
      if (!inBounds(cx, cy)) break;
      const found = getEntityAt(state, cx, cy);
      if (found) {
        hitEntity = found;
        break;
      }
    }
    if (!hitEntity) {
      return { valid: false, reason: 'No target in Winch Harpoon line (1-5 tiles)', events, arrows };
    }

    player.facing = dir;
    state.ap -= 1;
    state.tutorialCalloutVisible = false;

    const pullDir = { dx: -dir.dx, dy: -dir.dy };
    pushChainEvent(events, {
      kind: 'pull',
      entityId: hitEntity.id,
      from: { x: hitEntity.x, y: hitEntity.y },
      to: { x: player.x + dir.dx, y: player.y + dir.dy },
      damage: 1,
      killed: hitEntity.hp <= 1,
      hazardKill: false,
      badgeText: 'WINCH YANK!',
      badgeColor: '#38bdf8',
      cameraPunch: pullDir,
    });

    applyDamage(state, hitEntity, 1, false, pullDir, events, arrows, 0);
    if (hitEntity.hp > 0 && hitEntity.kind !== 'pillar' && hitEntity.kind !== 'shock_coil') {
      displaceEntity(
        state,
        hitEntity,
        pullDir.dx,
        pullDir.dy,
        3 + bonusKnockback,
        'pull',
        events,
        arrows,
        0
      );
    }
  } else if (tool === 'mortar') {
    if (manhattan === 0 || manhattan > 6) {
      return { valid: false, reason: 'Repulsor Mortar range is 1-6 tiles', events, arrows };
    }
    player.facing = { dx: Math.sign(rdx) || 1, dy: Math.sign(rdy) };
    state.ap -= 1;
    state.tutorialCalloutVisible = false;
    addScar(state, targetX, targetY, 'scorch', 1.0);

    pushChainEvent(events, {
      kind: 'tool_fire',
      entityId: player.id,
      from: { x: player.x, y: player.y },
      to: { x: targetX, y: targetY },
      damage: 1,
      killed: false,
      hazardKill: false,
      badgeText: 'REPULSOR BLAST!',
      badgeColor: '#a3e635',
      cameraPunch: { dx: 0, dy: -1 },
    });

    const centerHit = getEntityAt(state, targetX, targetY);
    if (centerHit) {
      applyDamage(state, centerHit, 1, true, { dx: 0, dy: -1 }, events, arrows, 0);
    }

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const d of dirs) {
      const adj = getEntityAt(state, targetX + d.dx, targetY + d.dy);
      if (adj && adj.hp > 0) {
        displaceEntity(state, adj, d.dx, d.dy, 2 + bonusKnockback, 'shove', events, arrows, 0);
      }
    }
  }

  // Update chain telemetry
  const chainSteps = events.length;
  state.totalDominoLinks += chainSteps;
  if (chainSteps > state.bestSingleTurnChain) {
    state.bestSingleTurnChain = chainSteps;
    const summaryBadges = events
      .slice(0, 4)
      .map((e) => e.badgeText)
      .join(' -> ');
    state.bestChainDescription = `CHAIN x${chainSteps} (${summaryBadges})`;
  }

  state.lastActionEvents = events;
  state.lastBannerText =
    chainSteps >= 3
      ? `DOMINO CASCADE x${chainSteps}! +${state.unbankedBounty} UNBANKED BOUNTY`
      : events[events.length - 1]?.badgeText ?? 'ACTION EXECUTED';

  checkRoomCompletion(state);
  refreshEnemyIntents(state);
  return { valid: true, reason: 'Executed', events, arrows };
}

export function checkRoomCompletion(state: GameState): void {
  const player = getPlayer(state);
  if (!player || player.hp <= 0) {
    state.phase = 'defeat';
    state.causeOfTermination = `Hull Breached in Room ${state.roomNumber} (${state.roomTitle})`;
    return;
  }

  const remainingEnemies = getLivingEnemies(state);
  if (remainingEnemies.length === 0) {
    // Bank any remaining unbanked bounty automatically on room clear
    state.score += state.unbankedBounty;
    state.unbankedBounty = 0;

    if (state.roomNumber >= MAX_ROOMS) {
      state.phase = 'victory';
      state.causeOfTermination = 'Foundry Leviathan Core Destroyed — Total Victory!';
      state.lastBannerText = 'LEVIATHAN CORE DESTROYED // FOUNDRY LIBERATED!';
    } else {
      // Offer 3 rule-bending relics not yet owned (or from catalog)
      const pool = RELIC_CATALOG.map((r) => r.id).filter((id) => !state.activeRelics.includes(id));
      const choices: RelicId[] = [];
      const copy = [...(pool.length >= 3 ? pool : RELIC_CATALOG.map((r) => r.id))];
      while (choices.length < 3 && copy.length > 0) {
        const idx = Math.floor(nextRandom(state) * copy.length);
        choices.push(copy.splice(idx, 1)[0]);
      }
      state.relicChoices = choices;
      state.phase = 'relic_draft';
      state.lastBannerText = `SECTOR 0${state.roomNumber} CLEARED! DRAFT A RULE-BENDING RELIC`;
    }
  }
}

/**
 * The "Consequence Oracle" — runs a deterministic dry-run clone of the step to return
 * exact predicted knockbacks, trajectories, damage numbers, and hazard kill badges BEFORE committing.
 */
export function previewAction(
  state: GameState,
  tool: ToolKind = state.selectedTool,
  targetX = state.hoveredTile.x,
  targetY = state.hoveredTile.y
): ConsequenceOracleResult {
  const simClone = cloneState(state);
  const beforeEntities = new Map<string, DioramaEntity>();
  for (const ent of state.entities) {
    if (ent.hp > 0) {
      beforeEntities.set(ent.id, { ...ent, facing: { ...ent.facing } });
    }
  }

  const outcome = resolveToolActionOnState(simClone, tool, targetX, targetY);

  const entityPredictions: Record<string, EntityPrediction> = {};
  let hazardKills = 0;
  let directKills = 0;
  let totalDamage = 0;
  let vaultCracked = false;

  for (const [id, startEnt] of beforeEntities.entries()) {
    const afterEnt = simClone.entities.find((e) => e.id === id);
    const predictedHp = afterEnt ? Math.max(0, afterEnt.hp) : 0;
    const damageTaken = Math.max(0, startEnt.hp - predictedHp);
    const killed = startEnt.hp > 0 && predictedHp === 0;
    const relEvents = outcome.events.filter((ev) => ev.entityId === id);
    const isHazardKill =
      killed && relEvents.some((ev) => ev.hazardKill || ev.kind !== 'shove');

    if (killed && startEnt.isEnemy) {
      if (isHazardKill) hazardKills += 1;
      else directKills += 1;
    }
    if (killed && startEnt.kind === 'bounty_vault') {
      vaultCracked = true;
    }
    totalDamage += damageTaken;

    const badges: string[] = [];
    if (damageTaken > 0) badges.push(`-${damageTaken} HP`);
    if (killed && startEnt.isEnemy) {
      badges.push(isHazardKill ? 'HAZARD KILL!' : 'KILL!');
    }
    if (killed && startEnt.kind === 'bounty_vault') {
      badges.push('VAULT CRACKED!');
    }
    for (const ev of relEvents) {
      if (
        ev.kind === 'pit_drop' ||
        ev.kind === 'barrel_blast' ||
        ev.kind === 'pillar_collapse' ||
        ev.kind === 'wall_bounce'
      ) {
        if (!badges.includes(ev.badgeText)) badges.push(ev.badgeText);
      }
    }

    entityPredictions[id] = {
      id,
      name: startEnt.name,
      startHp: startEnt.hp,
      predictedHp,
      damageTaken,
      killed,
      hazardKill: isHazardKill,
      startPos: { x: startEnt.x, y: startEnt.y },
      finalPos: afterEnt ? { x: afterEnt.x, y: afterEnt.y } : { x: startEnt.x, y: startEnt.y },
      badges,
    };
  }

  const tileBadges: Array<{ pos: GridPos; text: string; color: string; priority: number }> = [];
  if (outcome.valid && outcome.events.length > 0) {
    if (outcome.events.length >= 2) {
      tileBadges.push({
        pos: { x: targetX, y: targetY },
        text: `CHAIN x${outcome.events.length}!`,
        color: '#f59e0b',
        priority: 10,
      });
    }
    if (hazardKills > 0) {
      tileBadges.push({
        pos: { x: targetX, y: Math.max(0, targetY - 1) },
        text: hazardKills > 1 ? `HAZARD KILL x${hazardKills}!` : 'HAZARD KILL!',
        color: '#ef4444',
        priority: 9,
      });
    }
  }

  return {
    valid: outcome.valid,
    reason: outcome.reason,
    tool,
    targetPos: { x: targetX, y: targetY },
    chainCount: outcome.events.length,
    hazardKills,
    directKills,
    totalDamage,
    vaultCracked,
    events: outcome.events,
    knockbackArrows: outcome.arrows,
    entityPredictions,
    tileBadges,
    resultingState: simClone,
  };
}

/**
 * Executes a PlayerAction on `state` in place.
 */
export function executeAction(
  state: GameState,
  action: PlayerAction
): {
  valid: boolean;
  reason: string;
  events: ChainEvent[];
} {
  if (action.type === 'use_tool') {
    const tool = action.tool ?? state.selectedTool;
    const tx = action.targetX ?? state.hoveredTile.x;
    const ty = action.targetY ?? state.hoveredTile.y;
    state.selectedTool = tool;
    state.hoveredTile = { x: tx, y: ty };
    const res = resolveToolActionOnState(state, tool, tx, ty);
    return { valid: res.valid, reason: res.reason, events: res.events };
  }

  if (action.type === 'overclock_turn') {
    // Greed vs. Safety "Push Your Turn" mechanic!
    const player = getPlayer(state);
    if (!player || state.phase !== 'playing') {
      return { valid: false, reason: 'Cannot overclock right now', events: [] };
    }
    if (player.hp <= 1) {
      return {
        valid: false,
        reason: 'Hull too critical (1 HP) to Overclock! Bank your turn safely.',
        events: [],
      };
    }

    player.hp -= 1;
    state.ap += 2;
    state.greedMultiplier *= 2;
    state.overclockCountThisRoom += 1;
    state.tutorialCalloutVisible = false;

    const events: ChainEvent[] = [];
    pushChainEvent(events, {
      kind: 'relic_trigger',
      entityId: player.id,
      from: { x: player.x, y: player.y },
      to: { x: player.x, y: player.y },
      damage: 1,
      killed: false,
      hazardKill: false,
      badgeText: `OVERCLOCK! +2 AP & x${state.greedMultiplier} BOUNTY`,
      badgeColor: '#ef4444',
      cameraPunch: { dx: 0, dy: -1 },
    });

    // Spawn a volatile barrel in an open tile near enemies to sweeten the board!
    for (let y = 2; y <= 5; y++) {
      let spawned = false;
      for (let x = 3; x <= 6; x++) {
        if (state.tiles[y][x] === 'floor' && !getEntityAt(state, x, y)) {
          state.entities.push(
            makeEntity(
              `overclock_barrel_${state.turnNumber}_${x}_${y}`,
              'barrel',
              'OVERCLOCK BARREL',
              x,
              y,
              1,
              false,
              true
            )
          );
          spawned = true;
          break;
        }
      }
      if (spawned) break;
    }

    state.lastActionEvents = events;
    state.lastBannerText = `REACTOR OVERCLOCKED! +2 AP // GREED MULTIPLIER x${state.greedMultiplier}`;
    return { valid: true, reason: 'Overclocked', events };
  }

  if (action.type === 'end_turn') {
    if (state.phase !== 'playing') {
      return { valid: false, reason: 'Not in playing phase', events: [] };
    }
    const events: ChainEvent[] = [];
    const player = getPlayer(state);

    // Banking unbanked bounty safely
    if (state.unbankedBounty > 0) {
      state.score += state.unbankedBounty;
      if (player && state.unbankedBounty >= 200 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + 1);
      }
      state.unbankedBounty = 0;
    }
    state.greedMultiplier = 1;

    // Enemy turn resolution: living enemies step 1 tile toward player or execute telegraph
    if (player) {
      for (const enemy of getLivingEnemies(state)) {
        if (enemy.hp <= 0 || enemy.kind === 'boss_pylon') continue;
        const dx = Math.sign(player.x - enemy.x);
        const dy = Math.sign(player.y - enemy.y);
        const dist = Math.abs(player.x - enemy.x) + Math.abs(player.y - enemy.y);

        if (dist === 1) {
          // Melee / Close attack
          const dmg = enemy.kind === 'boss_core' ? 2 : 1;
          pushChainEvent(events, {
            kind: 'enemy_attack',
            entityId: player.id,
            from: { x: enemy.x, y: enemy.y },
            to: { x: player.x, y: player.y },
            damage: dmg,
            killed: player.hp <= dmg,
            hazardKill: false,
            badgeText: `${enemy.name} STRIKE -${dmg}`,
            badgeColor: '#ef4444',
            cameraPunch: { dx, dy },
          });
          applyDamage(state, player, dmg, false, { dx, dy }, events, [], 0);
        } else if (enemy.kind !== 'boss_core') {
          // Step 1 tile toward player along preferred axis if safe
          const stepDirs =
            Math.abs(player.x - enemy.x) >= Math.abs(player.y - enemy.y)
              ? [
                  { dx, dy: 0 },
                  { dx: 0, dy },
                ]
              : [
                  { dx: 0, dy },
                  { dx, dy: 0 },
                ];
          for (const sd of stepDirs) {
            if (sd.dx === 0 && sd.dy === 0) continue;
            const nx = enemy.x + sd.dx;
            const ny = enemy.y + sd.dy;
            if (
              inBounds(nx, ny) &&
              state.tiles[ny][nx] !== 'pit' &&
              !getEntityAt(state, nx, ny)
            ) {
              displaceEntity(state, enemy, sd.dx, sd.dy, 1, 'shove', events, [], 0);
              break;
            }
          }
        } else if (enemy.kind === 'boss_core') {
          // Boss lobs a volatile barrel onto the board and fires slag pulse if player is aligned
          if (player.x === enemy.x || player.y === enemy.y) {
            pushChainEvent(events, {
              kind: 'enemy_attack',
              entityId: player.id,
              from: { x: enemy.x, y: enemy.y },
              to: { x: player.x, y: player.y },
              damage: 1,
              killed: player.hp <= 1,
              hazardKill: false,
              badgeText: 'LEVIATHAN BEAM -1',
              badgeColor: '#ef4444',
              cameraPunch: { dx: -1, dy: 0 },
            });
            applyDamage(state, player, 1, false, { dx: -1, dy: 0 }, events, [], 0);
          }
        }
      }
    }

    state.turnNumber += 1;
    state.ap = state.maxAp;
    state.lastActionEvents = events;
    state.lastBannerText = `TURN ${state.turnNumber} // PISTONS RECHARGED (${state.ap} AP)`;
    checkRoomCompletion(state);
    refreshEnemyIntents(state);
    return { valid: true, reason: 'Turn ended', events };
  }

  if (action.type === 'select_relic') {
    if (state.phase !== 'relic_draft') {
      return { valid: false, reason: 'Not in relic draft phase', events: [] };
    }
    const chosen = action.relicId ?? state.relicChoices[0];
    if (!chosen) {
      return { valid: false, reason: 'No relic specified', events: [] };
    }
    if (!state.activeRelics.includes(chosen)) {
      state.activeRelics.push(chosen);
    }
    state.phase = 'playing';
    setupRoom(state, state.roomNumber + 1);
    const relicDef = RELIC_CATALOG.find((r) => r.id === chosen);
    state.lastBannerText = `INSTALLED ${relicDef?.name ?? chosen} // ENTERING SECTOR 0${state.roomNumber}`;
    return { valid: true, reason: 'Relic drafted', events: [] };
  }

  return { valid: false, reason: 'Unknown action', events: [] };
}

/**
 * Computes a deterministic string digest of the board state for headless verification tests.
 */
export function computeBoardSignature(state: GameState): string {
  const entPart = state.entities
    .map((e) => `${e.id}:${e.kind}@${e.x},${e.y}#${e.hp}`)
    .join('|');
  const scarPart = state.scars.map((s) => `${s.kind}@${s.x},${s.y}`).join(',');
  return `R${state.roomNumber}:T${state.turnNumber}:AP${state.ap}:S${state.score}:B${state.unbankedBounty}:RNG${state.rngState}:E[${entPart}]:SC[${scarPart}]`;
}
