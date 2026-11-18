export type Direction = 'N' | 'E' | 'S' | 'W';

export interface GridPos {
  x: number;
  y: number;
}

export type TileKind =
  | 'floor'      // Standard machined slate recess
  | 'chasm'      // Lethal pit (unless frozen into cryo-bridge by relic)
  | 'ice'        // Frictionless slide tile (created by Cryo-Slide Chasms relic)
  | 'bumper'     // Raised brass-rimmed obsidian pillar (wall slam +1 dmg)
  | 'vent'       // Telegraphed enemy spawn vent (blocking deals 1 dmg + +2x combo!)
  | 'piston'     // Stage 2+: Directional spring-piston floor tile (shoves 2 tiles in dir)
  | 'pylon'      // Stage 3+: Conductive rail/pylon tile (triggers chain lightning when struck/stepped)
  | 'portal_a'   // Stage 5+: Paired phase portal entry/exit A
  | 'portal_b'   // Stage 5+: Paired phase portal entry/exit B
  | 'prism_ne'   // Stage 5+: Angled deflector mirror (/ bends N<->E, S<->W)
  | 'prism_nw';  // Stage 5+: Angled deflector mirror (\ bends N<->W, S<->E)

export interface BoardTile {
  x: number;
  y: number;
  kind: TileKind;
  dir?: Direction; // Used for piston tiles
  cracked?: boolean;
}

export type PieceFaction = 'player' | 'enemy' | 'neutral';

export type PieceKind =
  | 'vanguard'   // Player Brass Anchor (can shove or be used as Tesla tether node)
  | 'piston_mech'// Placed Brass Repulsor Piston mechanism
  | 'pulse_coil' // Placed Brass Omni-Pulse mechanism (pushes all 4 cardinal neighbors)
  | 'striker'    // Coral Enemy: telegraphs directional lunge/strike
  | 'juggernaut' // Coral Heavy Enemy: 2-3 HP, heavy knockback transfer
  | 'bounty_core'// Volatile Bounty Core: charges up each turn left alive (1x -> 2x -> 4x)
  | 'barrel';    // Stage 4+: Volatile Bomb Barrel that slides when struck and detonates 3x3

export interface Piece {
  id: string;
  kind: PieceKind;
  faction: PieceFaction;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dir: Direction;
  turnOrder?: number;      // For enemies: 1, 2, 3...
  bountyLevel?: number;    // For bounty_core: 1, 2, 3 (payout multiplier)
  isQueuedMech?: boolean;  // Placed during current planning phase
}

export type ToolKind = 'ram_shove' | 'piston_mech' | 'pulse_coil';

export interface QueuedAction {
  id: string;
  tool: ToolKind;
  sourcePieceId?: string; // If 'ram_shove' from an existing player piece
  targetX: number;
  targetY: number;
  dir: Direction;
}

export type RelicId =
  | 'elastic_rim'      // Pieces that slam into a board edge rebound 2 tiles in the opposite direction.
  | 'tesla_tether'     // Deploying a mechanism aligned with a friendly piece zaps every tile between them.
  | 'cryo_chasms'      // Enemies pushed into chasms freeze the pit into a frictionless slide bridge.
  | 'ricochet_transfer'// Enemy-into-enemy collisions bounce the striker 1 tile backward and double target knockback.
  | 'volatile_shrapnel'// Destroyed enemies detonate kinetically, shoving all 4 orthogonal neighbors 1 tile outward.
  | 'aftershock_coil'; // Repulsor Pistons also pull the tile behind them 1 step forward after firing.

export interface RelicDef {
  id: RelicId;
  name: string;
  ruleText: string; // Strictly 1 sentence max per Law 8
}

export type CascadeEventKind =
  | 'deploy'
  | 'shove'
  | 'slide'
  | 'collide_piece'
  | 'collide_wall'
  | 'rebound'
  | 'chasm_drop'
  | 'cryo_freeze'
  | 'vent_block'
  | 'piston_launch'
  | 'pylon_zap'
  | 'barrel_detonate'
  | 'portal_warp'
  | 'prism_deflect'
  | 'destroy'
  | 'enemy_telegraph_fire';

export interface CascadeStep {
  stepIndex: number;        // 1-based domino index (1, 2, 3...)
  kind: CascadeEventKind;
  label: string;            // Concise diegetic tag e.g. "SLAM", "ZAP", "DROP", "BLAST"
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  dir?: Direction;
  pieceId?: string;
  targetPieceId?: string;
  damageDealt?: number;
  comboMultiplier: number;  // 1, 2, 3, 5, 8...
  scoreDelta: number;
  arcTargets?: GridPos[];   // For lightning arcs / blast zones
  boardSnapshot: {
    tiles: BoardTile[][];
    pieces: Piece[];
  };
}

export interface CascadePreview {
  steps: CascadeStep[];
  finalTiles: BoardTile[][];
  finalPieces: Piece[];
  totalComboSteps: number;
  peakMultiplier: number;
  predictedScoreDelta: number;
  doomedPieceIds: Set<string>;
  damagedPieceMap: Map<string, number>; // pieceId -> remaining hp
}

export interface StageDefinition {
  stageNumber: number;
  title: string;
  newVerbTag: string;
  turnsInStage: number;
  tiles: BoardTile[][];
  initialPieces: Piece[];
  waveReinforcements: Array<{
    turn: number;
    pieces: Piece[];
    vents: GridPos[];
  }>;
}
