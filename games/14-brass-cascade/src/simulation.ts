import {
  BoardTile,
  CascadeEventKind,
  CascadePreview,
  CascadeStep,
  Direction,
  GridPos,
  Piece,
  QueuedAction,
  RelicId
} from './types';

export const DIR_VECTORS: Record<Direction, GridPos> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 }
};

export const OPPOSITE_DIR: Record<Direction, Direction> = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E'
};

export const CLOCKWISE_DIR: Record<Direction, Direction> = {
  N: 'E',
  E: 'S',
  S: 'W',
  W: 'N'
};

const MULTIPLIER_LADDER = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export function getMultiplierForStep(stepCount: number): number {
  const idx = Math.max(0, Math.min(MULTIPLIER_LADDER.length - 1, stepCount - 1));
  return MULTIPLIER_LADDER[idx];
}

export function cloneTiles(tiles: BoardTile[][]): BoardTile[][] {
  return tiles.map((row) => row.map((t) => ({ ...t })));
}

export function clonePieces(pieces: Piece[]): Piece[] {
  return pieces.map((p) => ({ ...p }));
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < 6 && y >= 0 && y < 6;
}

function reflectPrism(dir: Direction, kind: 'prism_ne' | 'prism_nw'): Direction {
  if (kind === 'prism_ne') {
    // '/' mirror: E <-> N, S <-> W
    const map: Record<Direction, Direction> = { E: 'N', N: 'E', S: 'W', W: 'S' };
    return map[dir];
  } else {
    // '\' mirror: E <-> S, N <-> W
    const map: Record<Direction, Direction> = { E: 'S', S: 'E', N: 'W', W: 'N' };
    return map[dir];
  }
}

/**
 * Deterministic forward causality solver.
 * Used identically for the real-time Zero-Math Live Causality Preview
 * and the sequential beat-by-beat resolution phase.
 */
export function simulateCascade(
  initialTiles: BoardTile[][],
  initialPieces: Piece[],
  actions: QueuedAction[],
  relics: Set<RelicId>,
  includeEnemyPhase = false
): CascadePreview {
  const tiles = cloneTiles(initialTiles);
  let pieces = clonePieces(initialPieces);
  const steps: CascadeStep[] = [];
  let comboStepCounter = 0;
  let totalScoreDelta = 0;

  const findPieceAt = (x: number, y: number): Piece | undefined =>
    pieces.find((p) => p.hp > 0 && p.x === x && p.y === y);

  const findPieceById = (id: string): Piece | undefined =>
    pieces.find((p) => p.hp > 0 && p.id === id);

  const recordStep = (
    kind: CascadeEventKind,
    label: string,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    basePoints: number,
    opts: {
      dir?: Direction;
      pieceId?: string;
      targetPieceId?: string;
      damageDealt?: number;
      arcTargets?: GridPos[];
      bonusComboSteps?: number;
    } = {}
  ) => {
    comboStepCounter += 1 + (opts.bonusComboSteps ?? 0);
    const mult = getMultiplierForStep(comboStepCounter);
    const scoreDelta = basePoints * mult;
    totalScoreDelta += scoreDelta;

    steps.push({
      stepIndex: steps.length + 1,
      kind,
      label,
      fromX,
      fromY,
      toX,
      toY,
      dir: opts.dir,
      pieceId: opts.pieceId,
      targetPieceId: opts.targetPieceId,
      damageDealt: opts.damageDealt,
      comboMultiplier: mult,
      scoreDelta,
      arcTargets: opts.arcTargets,
      boardSnapshot: {
        tiles: cloneTiles(tiles),
        pieces: clonePieces(pieces.filter((p) => p.hp > 0))
      }
    });
  };

  // Queue for deferred chain reactions (barrel explosions, volatile shrapnel, pylon arcs)
  const reactionQueue: Array<() => void> = [];
  let recursionGuard = 0;

  const damagePiece = (piece: Piece, amount: number, sourceX: number, sourceY: number, reasonLabel: string) => {
    if (piece.hp <= 0) return;
    piece.hp = Math.max(0, piece.hp - amount);

    if (piece.kind === 'barrel' && piece.hp <= 0) {
      // Barrel detonates!
      const bx = piece.x;
      const by = piece.y;
      reactionQueue.push(() => detonateBarrelAt(bx, by, piece.id));
      return;
    }

    if (piece.hp <= 0) {
      const bonus =
        piece.kind === 'bounty_core'
          ? 250 * (piece.bountyLevel ?? 1)
          : piece.faction === 'enemy'
            ? 120
            : 40;
      recordStep('destroy', `${reasonLabel} KO`, sourceX, sourceY, piece.x, piece.y, bonus, {
        pieceId: piece.id,
        damageDealt: amount
      });

      // Law 8 Relic: Volatile Shrapnel
      if (piece.faction === 'enemy' && relics.has('volatile_shrapnel')) {
        const ex = piece.x;
        const ey = piece.y;
        reactionQueue.push(() => {
          (['N', 'E', 'S', 'W'] as Direction[]).forEach((d) => {
            const v = DIR_VECTORS[d];
            const adj = findPieceAt(ex + v.x, ey + v.y);
            if (adj) {
              shovePiece(adj, d, 1, 0);
            }
          });
        });
      }
    }
  };

  const triggerPylonNetwork = (originX: number, originY: number) => {
    if (recursionGuard > 32) return;
    recursionGuard++;

    // Find all pylon tiles on the board
    const pylonCoords: GridPos[] = [];
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        if (tiles[y][x].kind === 'pylon') {
          pylonCoords.push({ x, y });
        }
      }
    }

    const hitPieces = new Set<Piece>();
    const arcTargets: GridPos[] = [...pylonCoords];

    for (const py of pylonCoords) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = py.x + dx;
          const ty = py.y + dy;
          if (!inBounds(tx, ty)) continue;
          const p = findPieceAt(tx, ty);
          if (p && p.faction !== 'player') {
            hitPieces.add(p);
            arcTargets.push({ x: tx, y: ty });
          }
        }
      }
    }

    if (hitPieces.size > 0 || pylonCoords.length > 1) {
      recordStep('pylon_zap', 'CHAIN ARC', originX, originY, originX, originY, 80, {
        arcTargets
      });
      hitPieces.forEach((p) => {
        damagePiece(p, 1, originX, originY, 'ARC');
      });
    }
  };

  const detonateBarrelAt = (bx: number, by: number, barrelId: string) => {
    if (recursionGuard > 32) return;
    recursionGuard++;

    const blastZone: GridPos[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (inBounds(bx + dx, by + dy)) {
          blastZone.push({ x: bx + dx, y: by + dy });
        }
      }
    }

    recordStep('barrel_detonate', 'BARREL BLAST', bx, by, bx, by, 140, {
      pieceId: barrelId,
      arcTargets: blastZone,
      bonusComboSteps: 1
    });

    // Damage & shove orthogonal and diagonal neighbors outward
    const victims: Array<{ piece: Piece; pushDir: Direction }> = [];
    for (const pos of blastZone) {
      if (pos.x === bx && pos.y === by) continue;
      const p = findPieceAt(pos.x, pos.y);
      if (p) {
        const dx = pos.x - bx;
        const dy = pos.y - by;
        const pushDir: Direction =
          Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : dy > 0 ? 'S' : 'N';
        victims.push({ piece: p, pushDir });
      }
    }

    for (const v of victims) {
      if (v.piece.hp > 0 && v.piece.faction !== 'player') {
        damagePiece(v.piece, 1, bx, by, 'BLAST');
      }
      if (v.piece.hp > 0) {
        shovePiece(v.piece, v.pushDir, 2, 0);
      }
    }
  };

  const resolveTileArrival = (piece: Piece, dir: Direction, depth: number) => {
    if (piece.hp <= 0 || depth > 8) return;
    const tile = tiles[piece.y][piece.x];

    if (tile.kind === 'chasm') {
      // Lethal drop!
      const px = piece.x;
      const py = piece.y;
      const wasEnemy = piece.faction === 'enemy';
      piece.hp = 0;
      recordStep('chasm_drop', 'ABYSS DROP', px, py, px, py, 160, {
        pieceId: piece.id,
        dir,
        bonusComboSteps: 1
      });

      // Relic: Cryo-Slide Chasms
      if (wasEnemy && relics.has('cryo_chasms')) {
        tile.kind = 'ice';
        recordStep('cryo_freeze', 'CRYO BRIDGE', px, py, px, py, 60, {
          pieceId: piece.id
        });
      }
      return;
    }

    if (tile.kind === 'vent') {
      // Plugging a telegraphed enemy spawn vent!
      tile.kind = 'floor';
      tile.cracked = true;
      recordStep('vent_block', 'VENT PLUGGED', piece.x, piece.y, piece.x, piece.y, 130, {
        pieceId: piece.id,
        damageDealt: 1,
        bonusComboSteps: 1
      });
      if (piece.faction !== 'player') {
        damagePiece(piece, 1, piece.x, piece.y, 'VENT');
      }
      return;
    }

    if (tile.kind === 'ice') {
      // Frictionless slide 2 more tiles in dir
      shovePiece(piece, dir, 2, depth + 1);
      return;
    }

    if (tile.kind === 'piston' && tile.dir) {
      const launchDir = tile.dir;
      recordStep('piston_launch', 'PISTON LAUNCH', piece.x, piece.y, piece.x, piece.y, 70, {
        pieceId: piece.id,
        dir: launchDir
      });
      shovePiece(piece, launchDir, 2, depth + 1);
      return;
    }

    if (tile.kind === 'pylon') {
      triggerPylonNetwork(piece.x, piece.y);
      return;
    }

    if (tile.kind === 'portal_a' || tile.kind === 'portal_b') {
      const targetKind = tile.kind === 'portal_a' ? 'portal_b' : 'portal_a';
      let exitPos: GridPos | null = null;
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 6; x++) {
          if (tiles[y][x].kind === targetKind) {
            exitPos = { x, y };
          }
        }
      }
      if (exitPos && !findPieceAt(exitPos.x, exitPos.y)) {
        const oldX = piece.x;
        const oldY = piece.y;
        piece.x = exitPos.x;
        piece.y = exitPos.y;
        recordStep('portal_warp', 'PHASE WARP', oldX, oldY, exitPos.x, exitPos.y, 90, {
          pieceId: piece.id,
          dir
        });
        shovePiece(piece, dir, 1, depth + 1);
      }
      return;
    }

    if (tile.kind === 'prism_ne' || tile.kind === 'prism_nw') {
      const newDir = reflectPrism(dir, tile.kind);
      recordStep('prism_deflect', 'PRISM REFLECT', piece.x, piece.y, piece.x, piece.y, 75, {
        pieceId: piece.id,
        dir: newDir
      });
      shovePiece(piece, newDir, 2, depth + 1);
      return;
    }
  };

  const shovePiece = (piece: Piece, dir: Direction, distance: number, depth: number) => {
    if (piece.hp <= 0 || depth > 8 || recursionGuard > 40) return;
    recursionGuard++;

    const vec = DIR_VECTORS[dir];
    // Bomb barrels slide up to 4 tiles until hitting something!
    const effectiveDist = piece.kind === 'barrel' ? Math.max(distance, 3) : distance;

    for (let step = 0; step < effectiveDist; step++) {
      if (piece.hp <= 0) break;
      const startX = piece.x;
      const startY = piece.y;
      const nx = startX + vec.x;
      const ny = startY + vec.y;

      // Check board edge slam
      if (!inBounds(nx, ny)) {
        const selfDmg = piece.faction === 'player' ? 0 : 1;
        recordStep('collide_wall', 'RIM SLAM', startX, startY, startX, startY, 65, {
          pieceId: piece.id,
          dir,
          damageDealt: selfDmg
        });
        if (selfDmg > 0) {
          damagePiece(piece, selfDmg, startX, startY, 'WALL');
        }
        // Relic: Elastic Rim Springs
        if (piece.hp > 0 && relics.has('elastic_rim')) {
          const opp = OPPOSITE_DIR[dir];
          recordStep('rebound', 'RIM REBOUND', startX, startY, startX, startY, 55, {
            pieceId: piece.id,
            dir: opp
          });
          shovePiece(piece, opp, 2, depth + 1);
        }
        break;
      }

      const nextTile = tiles[ny][nx];
      // Check bumper pillar collision
      if (nextTile.kind === 'bumper') {
        const selfDmg = piece.faction === 'player' ? 0 : 1;
        nextTile.cracked = true;
        recordStep('collide_wall', 'BUMPER SLAM', startX, startY, nx, ny, 75, {
          pieceId: piece.id,
          dir,
          damageDealt: selfDmg
        });
        if (selfDmg > 0) {
          damagePiece(piece, selfDmg, nx, ny, 'BUMPER');
        }
        if (piece.kind === 'barrel' && piece.hp > 0) {
          piece.hp = 0;
          detonateBarrelAt(piece.x, piece.y, piece.id);
        }
        break;
      }

      // Check piece-into-piece collision
      const blocker = findPieceAt(nx, ny);
      if (blocker) {
        const dmgToStriker = piece.faction === 'player' ? 0 : 1;
        const dmgToBlocker = blocker.faction === 'player' ? 0 : 1;

        recordStep('collide_piece', 'DOMINO SLAM', startX, startY, nx, ny, 95, {
          pieceId: piece.id,
          targetPieceId: blocker.id,
          dir,
          damageDealt: dmgToStriker + dmgToBlocker
        });

        if (dmgToStriker > 0) {
          damagePiece(piece, dmgToStriker, nx, ny, 'DOMINO');
        }
        if (dmgToBlocker > 0) {
          damagePiece(blocker, dmgToBlocker, startX, startY, 'DOMINO');
        }

        // Momentum transfer to blocker!
        const transferDist = relics.has('ricochet_transfer') ? 3 : 2;
        if (blocker.hp > 0) {
          shovePiece(blocker, dir, transferDist, depth + 1);
        }

        // If blocker moved or died, striker follows 1 tile forward (or bounces back with ricochet_transfer)
        if (piece.hp > 0) {
          if (relics.has('ricochet_transfer')) {
            shovePiece(piece, OPPOSITE_DIR[dir], 1, depth + 1);
          } else if (!findPieceAt(nx, ny)) {
            piece.x = nx;
            piece.y = ny;
            recordStep('slide', 'FOLLOW SLIDE', startX, startY, nx, ny, 35, {
              pieceId: piece.id,
              dir
            });
            resolveTileArrival(piece, dir, depth + 1);
          }
        }
        break;
      }

      // Move onto free tile (nx, ny)
      piece.x = nx;
      piece.y = ny;
      recordStep('shove', step === 0 ? 'KINETIC SHOVE' : 'SLIDE', startX, startY, nx, ny, 30, {
        pieceId: piece.id,
        dir
      });

      // Check immediate tile trigger
      const landedKind = tiles[ny][nx].kind;
      if (landedKind !== 'floor') {
        resolveTileArrival(piece, dir, depth + 1);
        break;
      }
    }

    // If a barrel finished sliding without hitting a wall, it still primes & detonates!
    if (piece.kind === 'barrel' && piece.hp > 0) {
      piece.hp = 0;
      detonateBarrelAt(piece.x, piece.y, piece.id);
    }
  };

  const drainReactionQueue = () => {
    let guard = 0;
    while (reactionQueue.length > 0 && guard < 24) {
      guard++;
      const fn = reactionQueue.shift()!;
      fn();
    }
  };

  // Execute each queued player action sequentially
  for (const act of actions) {
    recursionGuard = 0;

    if (act.tool === 'ram_shove') {
      const source = act.sourcePieceId
        ? findPieceById(act.sourcePieceId)
        : findPieceAt(act.targetX, act.targetY);
      if (!source) continue;

      const vec = DIR_VECTORS[act.dir];
      const adjX = source.x + vec.x;
      const adjY = source.y + vec.y;
      if (!inBounds(adjX, adjY)) continue;

      const adjPiece = findPieceAt(adjX, adjY);
      if (adjPiece) {
        source.dir = act.dir;
        recordStep('deploy', 'BRASS RAM', source.x, source.y, adjX, adjY, 25, {
          pieceId: source.id,
          targetPieceId: adjPiece.id,
          dir: act.dir
        });
        shovePiece(adjPiece, act.dir, 2, 0);
      } else if (tiles[adjY][adjX].kind !== 'bumper' && tiles[adjY][adjX].kind !== 'chasm') {
        // Step 1 tile in dir and ram whatever is ahead!
        const oldX = source.x;
        const oldY = source.y;
        source.x = adjX;
        source.y = adjY;
        source.dir = act.dir;
        recordStep('deploy', 'DASH & RAM', oldX, oldY, adjX, adjY, 20, {
          pieceId: source.id,
          dir: act.dir
        });
        resolveTileArrival(source, act.dir, 0);

        const frontX = source.x + vec.x;
        const frontY = source.y + vec.y;
        if (inBounds(frontX, frontY)) {
          const frontTarget = findPieceAt(frontX, frontY);
          if (frontTarget) {
            shovePiece(frontTarget, act.dir, 2, 0);
          }
        }
      }
      drainReactionQueue();
    } else if (act.tool === 'piston_mech') {
      if (!inBounds(act.targetX, act.targetY)) continue;
      if (findPieceAt(act.targetX, act.targetY)) continue;
      if (tiles[act.targetY][act.targetX].kind === 'chasm' || tiles[act.targetY][act.targetX].kind === 'bumper') {
        continue;
      }

      const mech: Piece = {
        id: `mech_${act.id}`,
        kind: 'piston_mech',
        faction: 'player',
        x: act.targetX,
        y: act.targetY,
        hp: 2,
        maxHp: 2,
        dir: act.dir,
        isQueuedMech: true
      };
      pieces.push(mech);

      recordStep('deploy', 'SNAP PISTON', act.targetX, act.targetY, act.targetX, act.targetY, 25, {
        pieceId: mech.id,
        dir: act.dir
      });

      // Relic: Tesla Tether
      if (relics.has('tesla_tether')) {
        const allies = pieces.filter(
          (p) => p.hp > 0 && p.faction === 'player' && p.id !== mech.id && (p.x === mech.x || p.y === mech.y)
        );
        for (const ally of allies) {
          const dx = Math.sign(ally.x - mech.x);
          const dy = Math.sign(ally.y - mech.y);
          let cx = mech.x + dx;
          let cy = mech.y + dy;
          const tetherCells: GridPos[] = [];
          while (cx !== ally.x || cy !== ally.y) {
            tetherCells.push({ x: cx, y: cy });
            const victim = findPieceAt(cx, cy);
            if (victim && victim.faction !== 'player') {
              damagePiece(victim, 1, mech.x, mech.y, 'TETHER');
            }
            cx += dx;
            cy += dy;
          }
          if (tetherCells.length > 0) {
            recordStep('pylon_zap', 'TESLA TETHER', mech.x, mech.y, ally.x, ally.y, 70, {
              arcTargets: tetherCells
            });
          }
        }
      }

      // Fire piston in act.dir
      const vec = DIR_VECTORS[act.dir];
      const tx = act.targetX + vec.x;
      const ty = act.targetY + vec.y;
      if (inBounds(tx, ty)) {
        const target = findPieceAt(tx, ty);
        if (target) {
          shovePiece(target, act.dir, 2, 0);
        }
      }

      // Relic: Aftershock Pistons (pull tile behind 1 step toward piston)
      if (relics.has('aftershock_coil')) {
        const bx = act.targetX - vec.x * 2;
        const by = act.targetY - vec.y * 2;
        if (inBounds(bx, by)) {
          const backTarget = findPieceAt(bx, by);
          if (backTarget) {
            shovePiece(backTarget, act.dir, 1, 0);
          }
        }
      }

      drainReactionQueue();
    } else if (act.tool === 'pulse_coil') {
      if (!inBounds(act.targetX, act.targetY)) continue;
      if (findPieceAt(act.targetX, act.targetY)) continue;
      if (tiles[act.targetY][act.targetX].kind === 'chasm' || tiles[act.targetY][act.targetX].kind === 'bumper') {
        continue;
      }

      const coil: Piece = {
        id: `coil_${act.id}`,
        kind: 'pulse_coil',
        faction: 'player',
        x: act.targetX,
        y: act.targetY,
        hp: 2,
        maxHp: 2,
        dir: 'N',
        isQueuedMech: true
      };
      pieces.push(coil);

      const pulseNeighbors: GridPos[] = [];
      (['N', 'E', 'S', 'W'] as Direction[]).forEach((d) => {
        const v = DIR_VECTORS[d];
        if (inBounds(act.targetX + v.x, act.targetY + v.y)) {
          pulseNeighbors.push({ x: act.targetX + v.x, y: act.targetY + v.y });
        }
      });

      recordStep('deploy', 'OMNI PULSE', act.targetX, act.targetY, act.targetX, act.targetY, 30, {
        pieceId: coil.id,
        arcTargets: pulseNeighbors
      });

      (['N', 'E', 'S', 'W'] as Direction[]).forEach((d) => {
        const v = DIR_VECTORS[d];
        const target = findPieceAt(act.targetX + v.x, act.targetY + v.y);
        if (target) {
          shovePiece(target, d, 2, 0);
        }
      });

      drainReactionQueue();
    }
  }

  // Optional Enemy Telegraphed Intent Resolution at end of turn
  if (includeEnemyPhase) {
    const survivingEnemies = pieces
      .filter((p) => p.hp > 0 && p.faction === 'enemy')
      .sort((a, b) => (a.turnOrder ?? 99) - (b.turnOrder ?? 99));

    for (const enemy of survivingEnemies) {
      if (enemy.hp <= 0) continue;
      const vec = DIR_VECTORS[enemy.dir];
      const tx = enemy.x + vec.x;
      const ty = enemy.y + vec.y;
      if (!inBounds(tx, ty)) continue;

      const target = findPieceAt(tx, ty);
      if (target) {
        recordStep('enemy_telegraph_fire', 'ENEMY STRIKE', enemy.x, enemy.y, tx, ty, 0, {
          pieceId: enemy.id,
          targetPieceId: target.id,
          dir: enemy.dir,
          damageDealt: 1
        });
        damagePiece(target, 1, enemy.x, enemy.y, 'STRIKE');
        if (target.hp > 0) {
          shovePiece(target, enemy.dir, 1, 0);
        }
      } else if (tiles[ty][tx].kind !== 'chasm' && tiles[ty][tx].kind !== 'bumper') {
        const ox = enemy.x;
        const oy = enemy.y;
        enemy.x = tx;
        enemy.y = ty;
        recordStep('enemy_telegraph_fire', 'ENEMY ADVANCE', ox, oy, tx, ty, 0, {
          pieceId: enemy.id,
          dir: enemy.dir
        });
        resolveTileArrival(enemy, enemy.dir, 0);
      }
      drainReactionQueue();
    }
  }

  const alivePieces = pieces.filter((p) => p.hp > 0);
  const doomedPieceIds = new Set<string>();
  const damagedPieceMap = new Map<string, number>();

  for (const initP of initialPieces) {
    const finalP = alivePieces.find((fp) => fp.id === initP.id);
    if (!finalP || finalP.hp <= 0) {
      doomedPieceIds.add(initP.id);
      damagedPieceMap.set(initP.id, 0);
    } else if (finalP.hp < initP.hp) {
      damagedPieceMap.set(initP.id, finalP.hp);
    }
  }

  const peakMultiplier = steps.reduce((max, s) => Math.max(max, s.comboMultiplier), 1);

  return {
    steps,
    finalTiles: tiles,
    finalPieces: alivePieces,
    totalComboSteps: comboStepCounter,
    peakMultiplier,
    predictedScoreDelta: totalScoreDelta,
    doomedPieceIds,
    damagedPieceMap
  };
}
