import { BoardTile, Piece, RelicDef, StageDefinition, TileKind } from './types';

export const RELIC_CATALOG: RelicDef[] = [
  {
    id: 'elastic_rim',
    name: 'ELASTIC RIM SPRINGS',
    ruleText: 'Pieces that slam into a board edge rebound 2 tiles in the opposite direction.'
  },
  {
    id: 'tesla_tether',
    name: 'TESLA TETHER',
    ruleText: 'Deploying a mechanism aligned with a friendly piece zaps every tile between them.'
  },
  {
    id: 'cryo_chasms',
    name: 'CRYO-SLIDE CHASMS',
    ruleText: 'Enemies pushed into chasms freeze the pit into a frictionless ice bridge.'
  },
  {
    id: 'ricochet_transfer',
    name: 'RICOCHET TRANSFER',
    ruleText: 'Enemy collisions bounce the striker 1 tile backward and add +1 target knockback.'
  },
  {
    id: 'volatile_shrapnel',
    name: 'VOLATILE SHRAPNEL',
    ruleText: 'Destroyed enemies detonate kinetically, shoving all 4 orthogonal neighbors 1 tile outward.'
  },
  {
    id: 'aftershock_coil',
    name: 'AFTERSHOCK PISTONS',
    ruleText: 'Repulsor Pistons also pull the tile behind them 1 step forward after firing.'
  }
];

function createEmptyGrid(defaultKind: TileKind = 'floor'): BoardTile[][] {
  const grid: BoardTile[][] = [];
  for (let y = 0; y < 6; y++) {
    const row: BoardTile[] = [];
    for (let x = 0; x < 6; x++) {
      row.push({ x, y, kind: defaultKind });
    }
    grid.push(row);
  }
  return grid;
}

export function buildStages(): StageDefinition[] {
  // =========================================================================
  // STAGE 1: THE MAGNETIC CRUCIBLE (Core Shove, Domino Collisions & Chasms)
  // =========================================================================
  const s1Tiles = createEmptyGrid();
  s1Tiles[2][3].kind = 'vent';
  s1Tiles[2][5].kind = 'chasm';
  s1Tiles[0][5].kind = 'chasm';
  s1Tiles[5][5].kind = 'chasm';
  s1Tiles[4][1].kind = 'bumper';
  s1Tiles[1][4].kind = 'bumper';

  const stage1: StageDefinition = {
    stageNumber: 1,
    title: 'STAGE 1 // KINETIC DOMINOES',
    newVerbTag: 'SHOVE + DOMINO SLAM + CHASM',
    turnsInStage: 2,
    tiles: s1Tiles,
    initialPieces: [
      {
        id: 'p_van_1',
        kind: 'vanguard',
        faction: 'player',
        x: 1,
        y: 2,
        hp: 3,
        maxHp: 3,
        dir: 'E'
      },
      {
        id: 'e_s1_a',
        kind: 'striker',
        faction: 'enemy',
        x: 2,
        y: 2,
        hp: 2,
        maxHp: 2,
        dir: 'W',
        turnOrder: 1
      },
      {
        id: 'e_s1_b',
        kind: 'striker',
        faction: 'enemy',
        x: 3,
        y: 2,
        hp: 2,
        maxHp: 2,
        dir: 'S',
        turnOrder: 2
      },
      {
        id: 'bounty_1',
        kind: 'bounty_core',
        faction: 'neutral',
        x: 2,
        y: 4,
        hp: 2,
        maxHp: 2,
        dir: 'N',
        bountyLevel: 1
      }
    ],
    waveReinforcements: [
      {
        turn: 2,
        vents: [{ x: 4, y: 3 }],
        pieces: [
          {
            id: 'e_s1_w2_a',
            kind: 'striker',
            faction: 'enemy',
            x: 2,
            y: 1,
            hp: 2,
            maxHp: 2,
            dir: 'S',
            turnOrder: 1
          },
          {
            id: 'e_s1_w2_b',
            kind: 'juggernaut',
            faction: 'enemy',
            x: 3,
            y: 1,
            hp: 3,
            maxHp: 3,
            dir: 'E',
            turnOrder: 2
          }
        ]
      }
    ]
  };

  // =========================================================================
  // STAGE 2: SPRING-PISTON FOUNDRY (+1 Verb: Directional Floor Pistons)
  // =========================================================================
  const s2Tiles = createEmptyGrid();
  s2Tiles[1][2] = { x: 2, y: 1, kind: 'piston', dir: 'E' };
  s2Tiles[1][4] = { x: 4, y: 1, kind: 'piston', dir: 'S' };
  s2Tiles[3][4] = { x: 4, y: 3, kind: 'piston', dir: 'W' };
  s2Tiles[3][1] = { x: 1, y: 3, kind: 'vent' };
  s2Tiles[5][2] = { x: 2, y: 5, kind: 'chasm' };
  s2Tiles[0][5] = { x: 5, y: 0, kind: 'chasm' };
  s2Tiles[4][4] = { x: 4, y: 4, kind: 'bumper' };

  const stage2: StageDefinition = {
    stageNumber: 2,
    title: 'STAGE 2 // SPRING-PISTON RELAYS',
    newVerbTag: 'NEW VERB: FLOOR PISTONS',
    turnsInStage: 2,
    tiles: s2Tiles,
    initialPieces: [
      {
        id: 'p_van_2',
        kind: 'vanguard',
        faction: 'player',
        x: 0,
        y: 1,
        hp: 3,
        maxHp: 3,
        dir: 'E'
      },
      {
        id: 'e_s2_a',
        kind: 'striker',
        faction: 'enemy',
        x: 1,
        y: 1,
        hp: 2,
        maxHp: 2,
        dir: 'W',
        turnOrder: 1
      },
      {
        id: 'e_s2_b',
        kind: 'juggernaut',
        faction: 'enemy',
        x: 4,
        y: 2,
        hp: 3,
        maxHp: 3,
        dir: 'W',
        turnOrder: 2
      },
      {
        id: 'e_s2_c',
        kind: 'striker',
        faction: 'enemy',
        x: 2,
        y: 3,
        hp: 2,
        maxHp: 2,
        dir: 'N',
        turnOrder: 3
      },
      {
        id: 'bounty_2',
        kind: 'bounty_core',
        faction: 'neutral',
        x: 2,
        y: 4,
        hp: 2,
        maxHp: 2,
        dir: 'N',
        bountyLevel: 1
      }
    ],
    waveReinforcements: [
      {
        turn: 2,
        vents: [{ x: 3, y: 3 }],
        pieces: [
          {
            id: 'e_s2_w2_a',
            kind: 'striker',
            faction: 'enemy',
            x: 2,
            y: 0,
            hp: 2,
            maxHp: 2,
            dir: 'S',
            turnOrder: 1
          },
          {
            id: 'e_s2_w2_b',
            kind: 'striker',
            faction: 'enemy',
            x: 4,
            y: 0,
            hp: 2,
            maxHp: 2,
            dir: 'S',
            turnOrder: 2
          }
        ]
      }
    ]
  };

  // =========================================================================
  // STAGE 3: ARC-RAIL SANCTUM (+1 Verb: Conductive Chain-Lightning Pylons)
  // =========================================================================
  const s3Tiles = createEmptyGrid();
  s3Tiles[2][2] = { x: 2, y: 2, kind: 'pylon' };
  s3Tiles[2][4] = { x: 4, y: 2, kind: 'pylon' };
  s3Tiles[4][3] = { x: 3, y: 4, kind: 'pylon' };
  s3Tiles[1][1] = { x: 1, y: 1, kind: 'piston', dir: 'E' };
  s3Tiles[4][1] = { x: 1, y: 4, kind: 'vent' };
  s3Tiles[5][5] = { x: 5, y: 5, kind: 'chasm' };
  s3Tiles[0][5] = { x: 5, y: 0, kind: 'chasm' };

  const stage3: StageDefinition = {
    stageNumber: 3,
    title: 'STAGE 3 // CONDUCTIVE PYLONS',
    newVerbTag: 'NEW VERB: CHAIN-LIGHTNING RAILS',
    turnsInStage: 2,
    tiles: s3Tiles,
    initialPieces: [
      {
        id: 'p_van_3',
        kind: 'vanguard',
        faction: 'player',
        x: 0,
        y: 2,
        hp: 3,
        maxHp: 3,
        dir: 'E'
      },
      {
        id: 'e_s3_a',
        kind: 'juggernaut',
        faction: 'enemy',
        x: 1,
        y: 2,
        hp: 3,
        maxHp: 3,
        dir: 'W',
        turnOrder: 1
      },
      {
        id: 'e_s3_b',
        kind: 'striker',
        faction: 'enemy',
        x: 4,
        y: 1,
        hp: 2,
        maxHp: 2,
        dir: 'S',
        turnOrder: 2
      },
      {
        id: 'e_s3_c',
        kind: 'striker',
        faction: 'enemy',
        x: 3,
        y: 3,
        hp: 2,
        maxHp: 2,
        dir: 'W',
        turnOrder: 3
      },
      {
        id: 'bounty_3',
        kind: 'bounty_core',
        faction: 'neutral',
        x: 4,
        y: 4,
        hp: 2,
        maxHp: 2,
        dir: 'N',
        bountyLevel: 1
      }
    ],
    waveReinforcements: [
      {
        turn: 2,
        vents: [{ x: 1, y: 4 }],
        pieces: [
          {
            id: 'e_s3_w2_a',
            kind: 'juggernaut',
            faction: 'enemy',
            x: 2,
            y: 1,
            hp: 3,
            maxHp: 3,
            dir: 'S',
            turnOrder: 1
          },
          {
            id: 'e_s3_w2_b',
            kind: 'striker',
            faction: 'enemy',
            x: 5,
            y: 2,
            hp: 2,
            maxHp: 2,
            dir: 'W',
            turnOrder: 2
          }
        ]
      }
    ]
  };

  // =========================================================================
  // STAGE 4: VOLATILE ORDNANCE YARD (+1 Verb: Sliding Bomb Barrels)
  // =========================================================================
  const s4Tiles = createEmptyGrid();
  s4Tiles[2][3] = { x: 3, y: 2, kind: 'pylon' };
  s4Tiles[4][2] = { x: 2, y: 4, kind: 'piston', dir: 'N' };
  s4Tiles[1][5] = { x: 5, y: 1, kind: 'chasm' };
  s4Tiles[5][5] = { x: 5, y: 5, kind: 'chasm' };
  s4Tiles[3][4] = { x: 4, y: 3, kind: 'vent' };
  s4Tiles[0][3] = { x: 3, y: 0, kind: 'bumper' };

  const stage4: StageDefinition = {
    stageNumber: 4,
    title: 'STAGE 4 // SLIDING BOMB BARRELS',
    newVerbTag: 'NEW VERB: SLIDING BLAST BARRELS',
    turnsInStage: 2,
    tiles: s4Tiles,
    initialPieces: [
      {
        id: 'p_van_4',
        kind: 'vanguard',
        faction: 'player',
        x: 0,
        y: 2,
        hp: 3,
        maxHp: 3,
        dir: 'E'
      },
      {
        id: 'barrel_4a',
        kind: 'barrel',
        faction: 'neutral',
        x: 1,
        y: 2,
        hp: 1,
        maxHp: 1,
        dir: 'E'
      },
      {
        id: 'barrel_4b',
        kind: 'barrel',
        faction: 'neutral',
        x: 3,
        y: 3,
        hp: 1,
        maxHp: 1,
        dir: 'S'
      },
      {
        id: 'e_s4_a',
        kind: 'juggernaut',
        faction: 'enemy',
        x: 3,
        y: 1,
        hp: 3,
        maxHp: 3,
        dir: 'W',
        turnOrder: 1
      },
      {
        id: 'e_s4_b',
        kind: 'striker',
        faction: 'enemy',
        x: 4,
        y: 2,
        hp: 2,
        maxHp: 2,
        dir: 'N',
        turnOrder: 2
      },
      {
        id: 'e_s4_c',
        kind: 'striker',
        faction: 'enemy',
        x: 2,
        y: 3,
        hp: 2,
        maxHp: 2,
        dir: 'E',
        turnOrder: 3
      },
      {
        id: 'bounty_4',
        kind: 'bounty_core',
        faction: 'neutral',
        x: 4,
        y: 4,
        hp: 2,
        maxHp: 2,
        dir: 'N',
        bountyLevel: 1
      }
    ],
    waveReinforcements: [
      {
        turn: 2,
        vents: [{ x: 4, y: 3 }],
        pieces: [
          {
            id: 'barrel_4c',
            kind: 'barrel',
            faction: 'neutral',
            x: 2,
            y: 2,
            hp: 1,
            maxHp: 1,
            dir: 'E'
          },
          {
            id: 'e_s4_w2_a',
            kind: 'juggernaut',
            faction: 'enemy',
            x: 3,
            y: 4,
            hp: 3,
            maxHp: 3,
            dir: 'N',
            turnOrder: 1
          },
          {
            id: 'e_s4_w2_b',
            kind: 'striker',
            faction: 'enemy',
            x: 1,
            y: 4,
            hp: 2,
            maxHp: 2,
            dir: 'E',
            turnOrder: 2
          }
        ]
      }
    ]
  };

  // =========================================================================
  // STAGE 5: PHASE-PRISM SINGULARITY (+1 Verb: Paired Portals & Prisms)
  // =========================================================================
  const s5Tiles = createEmptyGrid();
  s5Tiles[1][2] = { x: 2, y: 1, kind: 'portal_a' };
  s5Tiles[4][1] = { x: 1, y: 4, kind: 'portal_b' };
  s5Tiles[4][4] = { x: 4, y: 4, kind: 'prism_ne' }; // '/' bends E -> N
  s5Tiles[2][4] = { x: 4, y: 2, kind: 'pylon' };
  s5Tiles[0][4] = { x: 4, y: 0, kind: 'chasm' };
  s5Tiles[5][5] = { x: 5, y: 5, kind: 'chasm' };
  s5Tiles[3][2] = { x: 2, y: 3, kind: 'vent' };

  const stage5: StageDefinition = {
    stageNumber: 5,
    title: 'STAGE 5 // PHASE PORTALS & PRISMS',
    newVerbTag: 'NEW VERB: PORTAL WARP & PRISM',
    turnsInStage: 2,
    tiles: s5Tiles,
    initialPieces: [
      {
        id: 'p_van_5',
        kind: 'vanguard',
        faction: 'player',
        x: 0,
        y: 1,
        hp: 3,
        maxHp: 3,
        dir: 'E'
      },
      {
        id: 'barrel_5a',
        kind: 'barrel',
        faction: 'neutral',
        x: 1,
        y: 1,
        hp: 1,
        maxHp: 1,
        dir: 'E'
      },
      {
        id: 'e_s5_a',
        kind: 'juggernaut',
        faction: 'enemy',
        x: 2,
        y: 4,
        hp: 3,
        maxHp: 3,
        dir: 'N',
        turnOrder: 1
      },
      {
        id: 'e_s5_b',
        kind: 'striker',
        faction: 'enemy',
        x: 4,
        y: 3,
        hp: 2,
        maxHp: 2,
        dir: 'W',
        turnOrder: 2
      },
      {
        id: 'e_s5_c',
        kind: 'striker',
        faction: 'enemy',
        x: 4,
        y: 1,
        hp: 2,
        maxHp: 2,
        dir: 'S',
        turnOrder: 3
      },
      {
        id: 'bounty_5',
        kind: 'bounty_core',
        faction: 'neutral',
        x: 3,
        y: 4,
        hp: 2,
        maxHp: 2,
        dir: 'N',
        bountyLevel: 2
      }
    ],
    waveReinforcements: [
      {
        turn: 2,
        vents: [{ x: 2, y: 3 }],
        pieces: [
          {
            id: 'barrel_5b',
            kind: 'barrel',
            faction: 'neutral',
            x: 1,
            y: 1,
            hp: 1,
            maxHp: 1,
            dir: 'E'
          },
          {
            id: 'e_s5_w2_a',
            kind: 'juggernaut',
            faction: 'enemy',
            x: 3,
            y: 2,
            hp: 3,
            maxHp: 3,
            dir: 'W',
            turnOrder: 1
          },
          {
            id: 'e_s5_w2_b',
            kind: 'striker',
            faction: 'enemy',
            x: 4,
            y: 2,
            hp: 2,
            maxHp: 2,
            dir: 'S',
            turnOrder: 2
          }
        ]
      }
    ]
  };

  return [stage1, stage2, stage3, stage4, stage5];
}
