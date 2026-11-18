import { ArgonGameInstance, ArgonGameMetadata } from '../../shared-contract';
import { BrassAudioEngine } from './audio';
import { buildStages, RELIC_CATALOG } from './levels';
import { BoardLayoutMetrics, BrassCascadeRenderer, PALETTE, RenderViewState } from './renderer';
import {
  CLOCKWISE_DIR,
  clonePieces,
  cloneTiles,
  DIR_VECTORS,
  inBounds,
  simulateCascade
} from './simulation';
import {
  BoardTile,
  CascadePreview,
  CascadeStep,
  Direction,
  GridPos,
  Piece,
  QueuedAction,
  RelicDef,
  RelicId,
  StageDefinition,
  ToolKind
} from './types';

export const metadata: ArgonGameMetadata = {
  id: '14-brass-cascade',
  number: 14,
  title: 'BRASS CASCADE',
  subtitle: 'Tactile Spatial Domino Tactics',
  genre: 'Spatial Chain-Reaction Tactics',
  primaryReference: 'Into the Breach',
  supportingReference: 'Opus Magnum',
  oneSentenceLoop:
    'Snap heavy brass mechanisms and kinetic shoves onto a 6x6 magnetic board with full live causality preview, then trigger sequential harmonic domino cascades.',
  shortGoal: 'Trigger multi-step environmental chain reactions to clear Stage 1 in 1 move.',
  longGoal: 'Master all 5 systemic board stages and transformative spatial physics relics.',
  controlsSummary:
    'Left-Click/Drag: Aim Shove or Snap Mechanism | R: Rotate | Z / Right-Click: Undo | Space: Resolve Cascade',
  accentColor: '#E5A93C'
};

export function mountGame(
  container: HTMLElement,
  options?: { initialSeed?: number; debug?: boolean }
): ArgonGameInstance {
  container.innerHTML = '';

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @layer base, components;
    @layer base {
      :where(.brass-cascade-host) {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 560px;
        background: #070A0F;
        overflow: hidden;
        user-select: none;
        content-visibility: auto;
        contain-intrinsic-size: auto none auto 640px;
      }
      :where(.brass-cascade-canvas) {
        display: block;
        width: 100%;
        height: 100%;
        cursor: grab;
        touch-action: none;
      }
      :where(.brass-cascade-canvas:active) {
        cursor: grabbing;
      }
    }
  `;
  container.appendChild(styleEl);

  const host = document.createElement('div');
  host.className = 'brass-cascade-host';
  const canvas = document.createElement('canvas');
  canvas.className = 'brass-cascade-canvas';
  canvas.setAttribute('aria-label', 'Brass Cascade 6x6 Spatial Tactics Board');
  host.appendChild(canvas);
  container.appendChild(host);

  const ctx = canvas.getContext('2d')!;
  const audio = new BrassAudioEngine();
  const renderer = new BrassCascadeRenderer();

  let stages: StageDefinition[] = buildStages();
  let currentStageIdx = 0;
  let turnNumber = 1;
  let score = 0;
  const maxActions = 2;

  let baseTiles: BoardTile[][] = cloneTiles(stages[0].tiles);
  let basePieces: Piece[] = clonePieces(stages[0].initialPieces);
  let queuedActions: QueuedAction[] = [];

  const activeRelicIds = new Set<RelicId>();
  const activeRelics: RelicDef[] = [];
  let relicChoices: RelicDef[] | null = null;
  let hoveredRelicIndex: number | null = null;

  let selectedTool: ToolKind = 'piston_mech';
  let toolDir: Direction = 'E';
  let hoveredTile: GridPos | null = { x: 2, y: 2 }; // Immediate Turn 1 causality preview!
  let hoveredPieceId: string | null = 'p_van_1';
  let draggingFromPieceId: string | null = null;
  let cursorPx = { x: 0, y: 0 };
  let cursorVel = { x: 0, y: 0 };
  let boardJolt = { x: 0, y: 0 };

  let isResolving = false;
  let resolutionSteps: CascadeStep[] = [];
  let resolutionStepIdx = 0;
  let resolutionBeatTimer = 0;
  let hitStopTimer = 0;
  let activeStepBanner: CascadeStep | null = null;
  let pendingPostResolutionPreview: CascadePreview | null = null;

  const callouts: RenderViewState['callouts'] = [];
  const shockwaves: RenderViewState['shockwaves'] = [];

  let layout: BoardLayoutMetrics = renderer.computeLayout(960, 700);
  let rafId = 0;
  let isPausedByVisibility = false;
  let lastFrameTime = performance.now();
  let elapsedSec = 0;

  function loadStage(idx: number): void {
    stages = buildStages();
    currentStageIdx = ((idx % stages.length) + stages.length) % stages.length;
    const stg = stages[currentStageIdx];
    turnNumber = 1;
    baseTiles = cloneTiles(stg.tiles);
    basePieces = clonePieces(stg.initialPieces);
    queuedActions = [];
    isResolving = false;
    activeStepBanner = null;
    relicChoices = null;
    toolDir = 'E';
    selectedTool = 'piston_mech';
    // Highlight the player's Vanguard on Stage 1 Turn 1 so the 5-step cascade is visible immediately
    const vanguard = basePieces.find((p) => p.faction === 'player');
    if (vanguard) {
      hoveredPieceId = vanguard.id;
      hoveredTile = { x: Math.min(5, vanguard.x + 1), y: vanguard.y };
    }
  }

  function buildCandidateActions(): QueuedAction[] {
    if (isResolving || relicChoices) return queuedActions;
    if (queuedActions.length >= maxActions) return queuedActions;

    // 1. If dragging from a friendly piece toward a direction, preview ram_shove
    if (draggingFromPieceId && hoveredTile) {
      const src = getWorkingPieces().find((p) => p.id === draggingFromPieceId);
      if (src) {
        const dx = hoveredTile.x - src.x;
        const dy = hoveredTile.y - src.y;
        if (dx !== 0 || dy !== 0) {
          const dir: Direction =
            Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : dy > 0 ? 'S' : 'N';
          return [
            ...queuedActions,
            {
              id: 'preview_drag_ram',
              tool: 'ram_shove',
              sourcePieceId: src.id,
              targetX: src.x,
              targetY: src.y,
              dir
            }
          ];
        }
      }
    }

    if (!hoveredTile) return queuedActions;
    const workingPieces = getWorkingPieces();
    const workingTiles = getWorkingTiles();

    // 2. If hovering an enemy or tile orthogonally adjacent to a friendly Vanguard, preview ram_shove!
    const vanguard = workingPieces.find((p) => p.faction === 'player' && p.kind === 'vanguard');
    if (vanguard) {
      const dx = hoveredTile.x - vanguard.x;
      const dy = hoveredTile.y - vanguard.y;
      const manhattan = Math.abs(dx) + Math.abs(dy);
      const occupant = workingPieces.find(
        (p) => p.hp > 0 && p.x === hoveredTile!.x && p.y === hoveredTile!.y
      );
      if (manhattan === 1 && (occupant || selectedTool === 'ram_shove')) {
        const dir: Direction = dx === 1 ? 'E' : dx === -1 ? 'W' : dy === 1 ? 'S' : 'N';
        return [
          ...queuedActions,
          {
            id: 'preview_adj_ram',
            tool: 'ram_shove',
            sourcePieceId: vanguard.id,
            targetX: vanguard.x,
            targetY: vanguard.y,
            dir
          }
        ];
      }
      // Or if hovering directly on the Vanguard itself, preview its facing shove!
      if (manhattan === 0) {
        return [
          ...queuedActions,
          {
            id: 'preview_self_ram',
            tool: 'ram_shove',
            sourcePieceId: vanguard.id,
            targetX: vanguard.x,
            targetY: vanguard.y,
            dir: vanguard.dir
          }
        ];
      }
    }

    // 3. Otherwise, if hovering an empty floor tile, preview placing the selected Brass Mechanism
    const occ = workingPieces.find(
      (p) => p.hp > 0 && p.x === hoveredTile!.x && p.y === hoveredTile!.y
    );
    const tileKind = workingTiles[hoveredTile.y][hoveredTile.x].kind;
    if (!occ && tileKind !== 'chasm' && tileKind !== 'bumper') {
      const mechTool: ToolKind = selectedTool === 'pulse_coil' ? 'pulse_coil' : 'piston_mech';
      return [
        ...queuedActions,
        {
          id: 'preview_mech',
          tool: mechTool,
          targetX: hoveredTile.x,
          targetY: hoveredTile.y,
          dir: toolDir
        }
      ];
    }

    return queuedActions;
  }

  function getCommittedSimulation(): CascadePreview {
    return simulateCascade(baseTiles, basePieces, queuedActions, activeRelicIds, false);
  }

  function getWorkingTiles(): BoardTile[][] {
    if (isResolving && activeStepBanner) {
      return activeStepBanner.boardSnapshot.tiles;
    }
    return getCommittedSimulation().finalTiles;
  }

  function getWorkingPieces(): Piece[] {
    if (isResolving && activeStepBanner) {
      return activeStepBanner.boardSnapshot.pieces;
    }
    return getCommittedSimulation().finalPieces;
  }

  function computeLivePreview(): CascadePreview | null {
    if (isResolving || relicChoices) return null;
    const candidateActions = buildCandidateActions();
    if (candidateActions.length === 0) return null;
    return simulateCascade(baseTiles, basePieces, candidateActions, activeRelicIds, false);
  }

  function queueActionFromBoardClick(tile: GridPos): void {
    if (isResolving || relicChoices) return;
    if (queuedActions.length >= maxActions) {
      audio.playUndoRelease();
      return;
    }

    const workingPieces = getWorkingPieces();
    const workingTiles = getWorkingTiles();
    const vanguard = workingPieces.find((p) => p.faction === 'player' && p.kind === 'vanguard');
    const occupant = workingPieces.find((p) => p.hp > 0 && p.x === tile.x && p.y === tile.y);

    // Clicking on the Vanguard itself fires its facing shove!
    if (vanguard && tile.x === vanguard.x && tile.y === vanguard.y) {
      queuedActions.push({
        id: `act_${Date.now()}_${queuedActions.length}`,
        tool: 'ram_shove',
        sourcePieceId: vanguard.id,
        targetX: vanguard.x,
        targetY: vanguard.y,
        dir: vanguard.dir
      });
      renderer.snapPieceSpring(vanguard.id, 1.28);
      audio.playMagneticSnap();
      return;
    }

    // Clicking an adjacent enemy (or adjacent tile when dragging from Vanguard) queues a Kinetic Ram
    if (vanguard) {
      const dx = tile.x - vanguard.x;
      const dy = tile.y - vanguard.y;
      if (Math.abs(dx) + Math.abs(dy) === 1 && (occupant || draggingFromPieceId === vanguard.id)) {
        const dir: Direction = dx === 1 ? 'E' : dx === -1 ? 'W' : dy === 1 ? 'S' : 'N';
        queuedActions.push({
          id: `act_${Date.now()}_${queuedActions.length}`,
          tool: 'ram_shove',
          sourcePieceId: vanguard.id,
          targetX: vanguard.x,
          targetY: vanguard.y,
          dir
        });
        renderer.snapPieceSpring(vanguard.id, 1.28);
        audio.playMagneticSnap();
        return;
      }
    }

    // Otherwise, snap the selected Brass Mechanism onto an empty valid tile!
    if (!occupant) {
      const tKind = workingTiles[tile.y][tile.x].kind;
      if (tKind !== 'chasm' && tKind !== 'bumper') {
        const mechTool: ToolKind = selectedTool === 'pulse_coil' ? 'pulse_coil' : 'piston_mech';
        const actId = `act_${Date.now()}_${queuedActions.length}`;
        queuedActions.push({
          id: actId,
          tool: mechTool,
          targetX: tile.x,
          targetY: tile.y,
          dir: toolDir
        });
        audio.playMagneticSnap();
        callouts.push({
          x: tile.x,
          y: tile.y,
          text: mechTool === 'pulse_coil' ? 'COIL PRIMED' : `PISTON [${toolDir}]`,
          color: PALETTE.brassBright,
          age: 0,
          maxAge: 0.55
        });
      }
    }
  }

  function undoLastAction(): void {
    if (isResolving || relicChoices) return;
    if (queuedActions.length > 0) {
      queuedActions.pop();
      audio.playUndoRelease();
    }
  }

  function rotateActiveOrientation(): void {
    if (isResolving || relicChoices) return;
    toolDir = CLOCKWISE_DIR[toolDir];
    const vanguard = basePieces.find((p) => p.faction === 'player' && p.kind === 'vanguard');
    if (vanguard && queuedActions.length === 0) {
      vanguard.dir = CLOCKWISE_DIR[vanguard.dir];
      renderer.snapPieceSpring(vanguard.id, 1.15);
    } else if (queuedActions.length > 0) {
      const last = queuedActions[queuedActions.length - 1];
      last.dir = CLOCKWISE_DIR[last.dir];
    }
    audio.playRatchetRotate();
  }

  function triggerResolutionPhase(): void {
    if (isResolving || relicChoices) return;

    // If player hits SPACE on Turn 1 without having clicked yet, execute the currently previewed move!
    const actionsToRun =
      queuedActions.length > 0 ? [...queuedActions] : buildCandidateActions();

    if (actionsToRun.length === 0) return;
    queuedActions = actionsToRun;

    const fullSim = simulateCascade(baseTiles, basePieces, queuedActions, activeRelicIds, true);
    pendingPostResolutionPreview = fullSim;
    resolutionSteps = fullSim.steps;
    resolutionStepIdx = 0;
    resolutionBeatTimer = 0;
    hitStopTimer = 0;
    isResolving = true;

    if (resolutionSteps.length === 0) {
      finishResolutionPhase();
    } else {
      triggerStepJuice(resolutionSteps[0]);
    }
  }

  function triggerStepJuice(step: CascadeStep): void {
    activeStepBanner = step;
    const isHeavy =
      step.kind === 'collide_piece' ||
      step.kind === 'collide_wall' ||
      step.kind === 'barrel_detonate' ||
      step.kind === 'chasm_drop' ||
      step.kind === 'destroy';

    audio.playCascadeStepNote(step.stepIndex, isHeavy);

    // 42ms hit-stop on impact steps + directional board jolt
    if (isHeavy) {
      hitStopTimer = 0.042;
      const vec = step.dir ? DIR_VECTORS[step.dir] : { x: 0, y: 1 };
      boardJolt = { x: vec.x * 7, y: vec.y * 7 };
    }

    const stepScore = step.scoreDelta;
    score += stepScore;

    shockwaves.push({
      x: step.toX,
      y: step.toY,
      radius: 6,
      maxRadius: step.kind === 'barrel_detonate' ? 84 : 42,
      color: step.kind === 'enemy_telegraph_fire' ? PALETTE.coralCore : PALETTE.cyanBright,
      alpha: 0.95
    });

    callouts.push({
      x: step.toX,
      y: step.toY,
      text: `${step.label} ${step.comboMultiplier}x`,
      subtext: stepScore > 0 ? `+${stepScore}` : undefined,
      color: step.kind === 'enemy_telegraph_fire' ? PALETTE.coralBright : PALETTE.cyanBright,
      age: 0,
      maxAge: 0.78
    });
  }

  function finishResolutionPhase(): void {
    isResolving = false;
    activeStepBanner = null;

    // Spare Action Pin Overclock Bonus (Law 6: reward clearing in fewer moves!)
    const unusedPins = Math.max(0, maxActions - queuedActions.length);
    if (unusedPins > 0 && (pendingPostResolutionPreview?.predictedScoreDelta ?? 0) > 0) {
      const bonus = Math.round((pendingPostResolutionPreview?.predictedScoreDelta ?? 100) * 0.5);
      score += bonus;
      callouts.push({
        x: 2.5,
        y: 2.5,
        text: `1-MOVE OVERCLOCK +${bonus}`,
        color: PALETTE.brassBright,
        age: 0,
        maxAge: 1.1
      });
    }

    if (pendingPostResolutionPreview) {
      baseTiles = cloneTiles(pendingPostResolutionPreview.finalTiles);
      // Keep permanent pieces (remove temporary turn pulse coils if desired, or keep brass pistons on board!)
      basePieces = clonePieces(pendingPostResolutionPreview.finalPieces).map((p) => ({
        ...p,
        isQueuedMech: false
      }));
    }
    queuedActions = [];
    pendingPostResolutionPreview = null;

    // Greedy Bounty Core escalation: surviving bounty cores double their payout multiplier!
    for (const p of basePieces) {
      if (p.kind === 'bounty_core' && p.hp > 0) {
        p.bountyLevel = Math.min(4, (p.bountyLevel ?? 1) * 2);
        callouts.push({
          x: p.x,
          y: p.y,
          text: `BOUNTY CHARGED ${p.bountyLevel}x$!`,
          color: PALETTE.brassBright,
          age: 0,
          maxAge: 1.0
        });
      }
    }

    const stg = stages[currentStageIdx];
    const remainingEnemies = basePieces.filter((p) => p.hp > 0 && p.faction === 'enemy');

    // Check if stage waves are complete or all enemies cleared on final turn
    if (turnNumber >= stg.turnsInStage && remainingEnemies.length === 0) {
      advanceOrOfferRelics();
      return;
    }

    if (turnNumber < stg.turnsInStage) {
      turnNumber++;
      const wave = stg.waveReinforcements.find((w) => w.turn === turnNumber);
      if (wave) {
        for (const v of wave.vents) {
          if (inBounds(v.x, v.y)) {
            baseTiles[v.y][v.x].kind = 'vent';
          }
        }
        for (const np of wave.pieces) {
          const occupied = basePieces.some((p) => p.hp > 0 && p.x === np.x && p.y === np.y);
          if (!occupied) {
            basePieces.push({ ...np });
          }
        }
      }
    } else if (remainingEnemies.length === 0) {
      advanceOrOfferRelics();
    } else {
      // Allow player to finish remaining enemies or advance after turn 3
      turnNumber++;
      if (turnNumber > stg.turnsInStage + 1) {
        advanceOrOfferRelics();
      }
    }
  }

  function advanceOrOfferRelics(): void {
    audio.playStageClearChord();
    const available = RELIC_CATALOG.filter((r) => !activeRelicIds.has(r.id));
    if (available.length >= 3) {
      relicChoices = available.slice(0, 3);
      hoveredRelicIndex = 0;
    } else {
      loadStage(currentStageIdx + 1);
    }
  }

  function pickRelic(index: number): void {
    if (!relicChoices || !relicChoices[index]) return;
    const chosen = relicChoices[index];
    activeRelicIds.add(chosen.id);
    activeRelics.push(chosen);
    audio.playMagneticSnap();
    audio.playStageClearChord();
    relicChoices = null;
    loadStage(currentStageIdx + 1);
  }

  // Resize handling
  function syncCanvasSize(): void {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(640, Math.floor(rect.width || 960));
    const h = Math.max(540, Math.floor(rect.height || 680));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout = renderer.computeLayout(w, h);
  }

  const resizeObserver =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => syncCanvasSize()) : null;
  resizeObserver?.observe(host);
  syncCanvasSize();

  function getPointerBoardCoords(e: MouseEvent | PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function hitTestRect(
    px: number,
    py: number,
    r: { x: number; y: number; w: number; h: number }
  ): boolean {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  const onPointerMove = (e: PointerEvent) => {
    const pt = getPointerBoardCoords(e);
    cursorVel = {
      x: pt.x - cursorPx.x,
      y: pt.y - cursorPx.y
    };
    cursorPx = pt;

    if (relicChoices) {
      const idx = layout.relicCardRects.findIndex((r) => hitTestRect(pt.x, pt.y, r));
      if (idx !== -1 && idx !== hoveredRelicIndex) {
        hoveredRelicIndex = idx;
        audio.playHoverTick(0.6);
      }
      return;
    }

    const gx = Math.floor((pt.x - layout.boardX) / layout.tileSize);
    const gy = Math.floor((pt.y - layout.boardY) / layout.tileSize);

    if (inBounds(gx, gy)) {
      if (!hoveredTile || hoveredTile.x !== gx || hoveredTile.y !== gy) {
        hoveredTile = { x: gx, y: gy };
        const velMag = Math.hypot(cursorVel.x, cursorVel.y);
        audio.playHoverTick(velMag * 0.08);
      }
      const p = getWorkingPieces().find((piece) => piece.hp > 0 && piece.x === gx && piece.y === gy);
      hoveredPieceId = p ? p.id : null;
    } else {
      hoveredTile = null;
      hoveredPieceId = null;
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    const pt = getPointerBoardCoords(e);
    cursorPx = pt;

    // Right-click: Rotate if hovering a piece, or Undo last queued move
    if (e.button === 2) {
      e.preventDefault();
      if (queuedActions.length > 0 && !hoveredTile) {
        undoLastAction();
      } else {
        rotateActiveOrientation();
      }
      return;
    }

    if (relicChoices) {
      const idx = layout.relicCardRects.findIndex((r) => hitTestRect(pt.x, pt.y, r));
      if (idx !== -1) {
        pickRelic(idx);
      }
      return;
    }

    // Check bottom dock buttons
    if (hitTestRect(pt.x, pt.y, layout.pistonSlotRect)) {
      if (selectedTool === 'piston_mech') {
        rotateActiveOrientation();
      } else {
        selectedTool = 'piston_mech';
        audio.playMagneticSnap();
      }
      return;
    }
    if (hitTestRect(pt.x, pt.y, layout.coilSlotRect)) {
      selectedTool = 'pulse_coil';
      audio.playMagneticSnap();
      return;
    }
    if (hitTestRect(pt.x, pt.y, layout.undoRect)) {
      undoLastAction();
      return;
    }
    if (hitTestRect(pt.x, pt.y, layout.resolveRect)) {
      triggerResolutionPhase();
      return;
    }

    // Board interaction
    const gx = Math.floor((pt.x - layout.boardX) / layout.tileSize);
    const gy = Math.floor((pt.y - layout.boardY) / layout.tileSize);
    if (inBounds(gx, gy)) {
      hoveredTile = { x: gx, y: gy };
      const workingPieces = getWorkingPieces();
      const clickedPiece = workingPieces.find((p) => p.hp > 0 && p.x === gx && p.y === gy);
      if (clickedPiece && clickedPiece.faction === 'player') {
        draggingFromPieceId = clickedPiece.id;
        audio.playHoverTick(1.0);
        return;
      }
      queueActionFromBoardClick({ x: gx, y: gy });
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!draggingFromPieceId) return;
    const pt = getPointerBoardCoords(e);
    const gx = Math.floor((pt.x - layout.boardX) / layout.tileSize);
    const gy = Math.floor((pt.y - layout.boardY) / layout.tileSize);

    const src = getWorkingPieces().find((p) => p.id === draggingFromPieceId);
    if (src && inBounds(gx, gy)) {
      const dx = gx - src.x;
      const dy = gy - src.y;
      if (dx === 0 && dy === 0) {
        // Clicked & released on Vanguard itself -> queue ram in its current facing direction
        queueActionFromBoardClick({ x: gx, y: gy });
      } else if (queuedActions.length < maxActions) {
        const dir: Direction =
          Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : dy > 0 ? 'S' : 'N';
        queuedActions.push({
          id: `act_${Date.now()}_${queuedActions.length}`,
          tool: 'ram_shove',
          sourcePieceId: src.id,
          targetX: src.x,
          targetY: src.y,
          dir
        });
        renderer.snapPieceSpring(src.id, 1.28);
        audio.playMagneticSnap();
      }
    }
    draggingFromPieceId = null;
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (relicChoices) {
      if (e.key === '1') pickRelic(0);
      if (e.key === '2') pickRelic(1);
      if (e.key === '3') pickRelic(2);
      return;
    }

    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      triggerResolutionPhase();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      rotateActiveOrientation();
    } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
      e.preventDefault();
      undoLastAction();
    } else if (e.key === '1') {
      selectedTool = 'piston_mech';
      audio.playHoverTick(0.8);
    } else if (e.key === '2') {
      selectedTool = 'pulse_coil';
      audio.playHoverTick(0.8);
    }
  };

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);

  // Modern Web Guidance: Efficient Background Processing via contentvisibilityautostatechange
  // with IntersectionObserver fallback for older browsers
  const onContentVisibilityAutoStateChange = (event: Event) => {
    const cvEvent = event as Event & { skipped?: boolean };
    isPausedByVisibility = Boolean(cvEvent.skipped);
    if (!isPausedByVisibility) {
      lastFrameTime = performance.now();
    }
  };
  host.addEventListener('contentvisibilityautostatechange', onContentVisibilityAutoStateChange);

  let intersectionObserver: IntersectionObserver | null = null;
  if (
    typeof document !== 'undefined' &&
    !('contentVisibility' in document.documentElement.style) &&
    typeof IntersectionObserver !== 'undefined'
  ) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isPausedByVisibility = !entry.isIntersecting;
          if (!isPausedByVisibility) {
            lastFrameTime = performance.now();
          }
        }
      },
      { rootMargin: '200px' }
    );
    intersectionObserver.observe(host);
  }

  function tick(now: number): void {
    rafId = requestAnimationFrame(tick);
    if (isPausedByVisibility) return;

    const rawDt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    elapsedSec += dt;

    // Decay directional board jolt & cursor velocity
    boardJolt.x *= Math.pow(0.001, dt);
    boardJolt.y *= Math.pow(0.001, dt);
    cursorVel.x *= 0.82;
    cursorVel.y *= 0.82;

    // Update shockwaves & callouts
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 10 * dt;
      sw.alpha -= dt * 2.1;
      if (sw.alpha <= 0) shockwaves.splice(i, 1);
    }
    for (let i = callouts.length - 1; i >= 0; i--) {
      const c = callouts[i];
      c.age += dt;
      if (c.age >= c.maxAge) callouts.splice(i, 1);
    }

    // Sequential Beat-by-Beat Resolution Stepping (Law 7: ~150ms per beat + 42ms hit-stop)
    if (isResolving) {
      if (hitStopTimer > 0) {
        hitStopTimer -= dt;
      } else {
        resolutionBeatTimer += dt;
        const beatDuration = 0.155;
        if (resolutionBeatTimer >= beatDuration) {
          resolutionBeatTimer = 0;
          resolutionStepIdx++;
          if (resolutionStepIdx < resolutionSteps.length) {
            triggerStepJuice(resolutionSteps[resolutionStepIdx]);
          } else {
            finishResolutionPhase();
          }
        }
      }
    }

    const stg = stages[currentStageIdx];
    const viewState: RenderViewState = {
      stageNumber: stg.stageNumber,
      turnNumber,
      stageTitle: stg.title,
      newVerbTag: stg.newVerbTag,
      score,
      maxActions,
      usedActions: queuedActions.length,
      tiles: getWorkingTiles(),
      pieces: getWorkingPieces(),
      queuedActions,
      activePreview: computeLivePreview(),
      activeStepBanner,
      isResolving,
      hoveredTile,
      hoveredPieceId,
      selectedTool,
      toolDir,
      draggingFromPieceId,
      cursorPx,
      cursorVel,
      boardJolt,
      relicChoices,
      hoveredRelicIndex,
      activeRelics,
      callouts,
      shockwaves,
      timeSec: elapsedSec
    };

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Keep layout dimensions in CSS pixels
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const proxyCanvas = { width: cssW, height: cssH };
    Object.defineProperty(ctx, 'canvas', { value: proxyCanvas, configurable: true });
    layout = renderer.render(ctx, viewState, dt);
    ctx.restore();
  }

  loadStage(options?.initialSeed ? options.initialSeed % 5 : 0);
  rafId = requestAnimationFrame(tick);

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      host.removeEventListener('contentvisibilityautostatechange', onContentVisibilityAutoStateChange);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
    },
    getStateSnapshot() {
      return {
        stageNumber: stages[currentStageIdx].stageNumber,
        turnNumber,
        score,
        queuedActionsCount: queuedActions.length,
        activeRelics: Array.from(activeRelicIds),
        pieces: getWorkingPieces(),
        livePreviewSteps: computeLivePreview()?.steps.length ?? 0
      };
    },
    restartWithSeed(seed: number) {
      score = 0;
      activeRelicIds.clear();
      activeRelics.length = 0;
      loadStage(Math.abs(seed) % 5);
    }
  };
}
