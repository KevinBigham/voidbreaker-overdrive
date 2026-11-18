import {
  BoardTile,
  CascadePreview,
  CascadeStep,
  Direction,
  GridPos,
  Piece,
  QueuedAction,
  RelicDef,
  ToolKind
} from './types';
import { DIR_VECTORS } from './simulation';

// Strict 4-Color Semantic Palette (Law 4)
export const PALETTE = {
  // 1. Deep Matte Slate / Obsidian
  obsidianDeep: '#070A0F',
  obsidianChassis: '#0E131D',
  obsidianTile: '#141B29',
  obsidianRecess: '#0B0F17',
  obsidianRim: '#232E42',

  // 2. Warm Brass / Amber
  brassBright: '#F6C868',
  brassCore: '#E5A93C',
  brassDark: '#9A6B19',
  brassShadow: '#4A3108',

  // 3. Electric Cyan (Causality, Combos, Pylons)
  cyanBright: '#7AF8FF',
  cyanCore: '#00F0FF',
  cyanDim: '#007B8A',
  cyanGlow: 'rgba(0, 240, 255, 0.26)',

  // 4. Signal Coral / Crimson (Enemy Threats & Lethal Hazards)
  coralBright: '#FF708A',
  coralCore: '#FF2E54',
  coralDark: '#7D1128',
  coralGlow: 'rgba(255, 46, 84, 0.25)'
};

interface PieceSpringState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lift: number;
  vLift: number;
  angle: number;
  vAngle: number;
  scale: number;
  vScale: number;
}

export interface FloatingCallout {
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color: string;
  age: number;
  maxAge: number;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export interface RenderViewState {
  stageNumber: number;
  turnNumber: number;
  stageTitle: string;
  newVerbTag: string;
  score: number;
  maxActions: number;
  usedActions: number;
  tiles: BoardTile[][];
  pieces: Piece[];
  queuedActions: QueuedAction[];
  activePreview: CascadePreview | null;
  activeStepBanner: CascadeStep | null;
  isResolving: boolean;
  hoveredTile: GridPos | null;
  hoveredPieceId: string | null;
  selectedTool: ToolKind | null;
  toolDir: Direction;
  draggingFromPieceId: string | null;
  cursorPx: { x: number; y: number };
  cursorVel: { x: number; y: number };
  boardJolt: { x: number; y: number };
  relicChoices: RelicDef[] | null;
  hoveredRelicIndex: number | null;
  activeRelics: RelicDef[];
  callouts: FloatingCallout[];
  shockwaves: ShockwaveRing[];
  timeSec: number;
}

export interface BoardLayoutMetrics {
  canvasW: number;
  canvasH: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  tileSize: number;
  dockY: number;
  pistonSlotRect: { x: number; y: number; w: number; h: number };
  coilSlotRect: { x: number; y: number; w: number; h: number };
  undoRect: { x: number; y: number; w: number; h: number };
  resolveRect: { x: number; y: number; w: number; h: number };
  relicCardRects: Array<{ x: number; y: number; w: number; h: number }>;
}

function dirToRadians(dir: Direction): number {
  switch (dir) {
    case 'E':
      return 0;
    case 'S':
      return Math.PI * 0.5;
    case 'W':
      return Math.PI;
    case 'N':
      return -Math.PI * 0.5;
  }
}

export class BrassCascadeRenderer {
  private springs = new Map<string, PieceSpringState>();

  public computeLayout(canvasW: number, canvasH: number): BoardLayoutMetrics {
    const minDim = Math.min(canvasW, canvasH);
    const boardSize = Math.floor(Math.min(canvasW * 0.84, (canvasH - 168) * 0.84, 540));
    const tileSize = Math.floor(boardSize / 6);
    const exactBoardSize = tileSize * 6;
    const boardX = Math.floor((canvasW - exactBoardSize) / 2);
    const boardY = Math.max(58, Math.floor((canvasH - exactBoardSize - 92) / 2));
    const dockY = boardY + exactBoardSize + 18;

    const slotW = Math.floor(exactBoardSize * 0.22);
    const slotH = 62;
    const gap = Math.floor(exactBoardSize * 0.025);

    const pistonSlotRect = {
      x: boardX,
      y: dockY,
      w: slotW,
      h: slotH
    };
    const coilSlotRect = {
      x: boardX + slotW + gap,
      y: dockY,
      w: slotW,
      h: slotH
    };
    const undoRect = {
      x: boardX + (slotW + gap) * 2,
      y: dockY,
      w: Math.floor(exactBoardSize * 0.19),
      h: slotH
    };
    const resolveRect = {
      x: undoRect.x + undoRect.w + gap,
      y: dockY,
      w: boardX + exactBoardSize - (undoRect.x + undoRect.w + gap),
      h: slotH
    };

    const cardW = Math.min(250, Math.floor((canvasW - 64) / 3));
    const cardH = Math.min(185, Math.floor(minDim * 0.3));
    const totalCardsW = cardW * 3 + 28;
    const startCardX = Math.floor((canvasW - totalCardsW) / 2);
    const cardY = Math.floor(boardY + exactBoardSize * 0.5 - cardH * 0.5);

    const relicCardRects = [0, 1, 2].map((i) => ({
      x: startCardX + i * (cardW + 14),
      y: cardY,
      w: cardW,
      h: cardH
    }));

    return {
      canvasW,
      canvasH,
      boardX,
      boardY,
      boardSize: exactBoardSize,
      tileSize,
      dockY,
      pistonSlotRect,
      coilSlotRect,
      undoRect,
      resolveRect,
      relicCardRects
    };
  }

  public snapPieceSpring(pieceId: string, scaleImpulse = 1.24): void {
    const s = this.springs.get(pieceId);
    if (s) {
      s.vScale += (scaleImpulse - 1) * 16;
      s.vLift -= 18;
    }
  }

  private updateSprings(state: RenderViewState, dt: number): void {
    const clampedDt = Math.min(0.033, Math.max(0.001, dt));
    const stiffness = 430;
    const damping = 21;

    const activeIds = new Set<string>();
    for (const p of state.pieces) {
      activeIds.add(p.id);
      let s = this.springs.get(p.id);
      const targetAngle = dirToRadians(p.dir);
      if (!s) {
        s = {
          x: p.x,
          y: p.y,
          vx: 0,
          vy: 0,
          lift: 0,
          vLift: 0,
          angle: targetAngle,
          vAngle: 0,
          scale: 1.16,
          vScale: 0
        };
        this.springs.set(p.id, s);
      }

      // Shortest angular distance
      let angleDiff = targetAngle - s.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const fx = (p.x - s.x) * stiffness - s.vx * damping;
      const fy = (p.y - s.y) * stiffness - s.vy * damping;
      s.vx += fx * clampedDt;
      s.vy += fy * clampedDt;
      s.x += s.vx * clampedDt;
      s.y += s.vy * clampedDt;

      const isHovered = state.hoveredPieceId === p.id || state.draggingFromPieceId === p.id;
      const targetLift = isHovered ? 11 : 0;
      const fLift = (targetLift - s.lift) * 360 - s.vLift * 22;
      s.vLift += fLift * clampedDt;
      s.lift = Math.max(0, s.lift + s.vLift * clampedDt);

      const fAngle = angleDiff * 380 - s.vAngle * 20;
      s.vAngle += fAngle * clampedDt;
      s.angle += s.vAngle * clampedDt;

      const targetScale = isHovered ? 1.07 : 1.0;
      const fScale = (targetScale - s.scale) * 420 - s.vScale * 19;
      s.vScale += fScale * clampedDt;
      s.scale += s.vScale * clampedDt;
    }

    for (const key of this.springs.keys()) {
      if (!activeIds.has(key)) {
        this.springs.delete(key);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, state: RenderViewState, dt: number): BoardLayoutMetrics {
    this.updateSprings(state, dt);
    const layout = this.computeLayout(ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    // 1. Matte Obsidian Table Surface
    ctx.fillStyle = PALETTE.obsidianDeep;
    ctx.fillRect(0, 0, layout.canvasW, layout.canvasH);

    // Subtle radial spotlight over the mechanical board
    const bgGrad = ctx.createRadialGradient(
      layout.canvasW * 0.5,
      layout.boardY + layout.boardSize * 0.5,
      layout.boardSize * 0.1,
      layout.canvasW * 0.5,
      layout.boardY + layout.boardSize * 0.5,
      layout.boardSize * 0.95
    );
    bgGrad.addColorStop(0, PALETTE.obsidianTile);
    bgGrad.addColorStop(1, PALETTE.obsidianDeep);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, layout.canvasW, layout.canvasH);

    // Apply directional board jolt during sequential resolution beats
    ctx.translate(state.boardJolt.x, state.boardJolt.y);

    // 2. Top Diegetic Brass Nameplate (Strictly 2 Numbers: STAGE.TURN & SCORE + Action Pins)
    this.drawTopBezel(ctx, layout, state);

    // 3. Machined 6x6 Obsidian & Brass Board Frame
    this.drawBoardChassisAndTiles(ctx, layout, state);

    // 4. Telegraphed Enemy Intent Vectors (Law 4: 100% Telegraphed 1 Turn Ahead)
    this.drawEnemyTelegraphs(ctx, layout, state);

    // 5. Live Causality Preview Underlay (Blast / Arc zones)
    if (state.activePreview && !state.isResolving) {
      this.drawPreviewZones(ctx, layout, state.activePreview, state.timeSec);
    }

    // 6. Tactile Pieces (with Hover Lift, Velocity Tilt, Drop Shadow & Diegetic Pips)
    this.drawPieces(ctx, layout, state);

    // 7. Ghost Mechanism / Aim Vector Preview + Full Live Causality Domino Vectors
    if (!state.isResolving) {
      this.drawGhostPlacementAndAim(ctx, layout, state);
      if (state.activePreview && state.activePreview.steps.length > 0) {
        this.drawCausalityChainOverlay(ctx, layout, state.activePreview, state.timeSec);
      }
    }

    // 8. Active Resolution Step Lightning / Blast Visuals & Floating Callouts
    this.drawShockwavesAndCallouts(ctx, layout, state);

    // 9. Bottom Recessed Brass Dock & Diegetic Bezel Controls
    this.drawBottomDockAndControls(ctx, layout, state);

    // 10. Between-Stage Transformative Relic Selection Overlay (Law 8)
    if (state.relicChoices && state.relicChoices.length > 0) {
      this.drawRelicSelectionModal(ctx, layout, state);
    }

    ctx.restore();
    return layout;
  }

  private drawTopBezel(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayoutMetrics,
    state: RenderViewState
  ): void {
    const { boardX, boardY, boardSize } = layout;
    const headerY = boardY - 44;

    // Left Number #1: STAGE.TURN + Stage Verb Tag
    ctx.fillStyle = PALETTE.brassBright;
    ctx.font = '700 15px "JetBrains Mono", "SF Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`STG ${state.stageNumber}.${state.turnNumber}`, boardX, headerY + 16);

    ctx.fillStyle = PALETTE.cyanCore;
    ctx.font = '600 11px "JetBrains Mono", "SF Mono", monospace';
    ctx.fillText(state.newVerbTag, boardX, headerY + 32);

    // Center: Physical Brass Action Capacitor Pins (Diegetic Action Budget)
    const pinCount = state.maxActions;
    const availPins = Math.max(0, state.maxActions - state.usedActions);
    const centerX = boardX + boardSize * 0.5;

    ctx.fillStyle = PALETTE.brassCore;
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ACTION PINS', centerX, headerY + 11);

    for (let i = 0; i < pinCount; i++) {
      const px = centerX - ((pinCount - 1) * 28) / 2 + i * 28;
      const py = headerY + 25;
      const isCharged = i < availPins;

      // Socket recess
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.obsidianRecess;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isCharged ? PALETTE.brassCore : PALETTE.obsidianRim;
      ctx.stroke();

      // Physical brass pin head
      ctx.beginPath();
      ctx.arc(px, isCharged ? py - 2 : py + 1, isCharged ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isCharged ? PALETTE.brassBright : PALETTE.brassShadow;
      ctx.fill();
    }

    // Right Number #2: SCORE (plus live predicted cascade delta if previewing)
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.brassBright;
    ctx.font = '700 16px "JetBrains Mono", "SF Mono", monospace';
    const scoreStr = String(state.score).padStart(5, '0');
    ctx.fillText(scoreStr, boardX + boardSize, headerY + 16);

    if (state.activePreview && state.activePreview.predictedScoreDelta > 0 && !state.isResolving) {
      ctx.fillStyle = PALETTE.cyanBright;
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText(
        `+${state.activePreview.predictedScoreDelta} (${state.activePreview.peakMultiplier}x CASCADE)`,
        boardX + boardSize,
        headerY + 32
      );
    } else if (state.activeStepBanner) {
      ctx.fillStyle = PALETTE.cyanBright;
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText(
        `${state.activeStepBanner.label} // ${state.activeStepBanner.comboMultiplier}x`,
        boardX + boardSize,
        headerY + 32
      );
    } else {
      ctx.fillStyle = PALETTE.brassDark;
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillText('DRAG PIECE TO SHOVE // R ROTATE', boardX + boardSize, headerY + 32);
    }
  }

  private drawBoardChassisAndTiles(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayoutMetrics,
    state: RenderViewState
  ): void {
    const { boardX, boardY, boardSize, tileSize } = layout;

    // Heavy Machined Obsidian & Brass Outer Frame
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = PALETTE.obsidianChassis;
    this.roundRect(ctx, boardX - 10, boardY - 10, boardSize + 20, boardSize + 20, 12);
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.brassDark;
    this.roundRect(ctx, boardX - 10, boardY - 10, boardSize + 20, boardSize + 20, 12);
    ctx.stroke();

    // Corner brass rivets
    const corners = [
      [boardX - 4, boardY - 4],
      [boardX + boardSize + 4, boardY - 4],
      [boardX - 4, boardY + boardSize + 4],
      [boardX + boardSize + 4, boardY + boardSize + 4]
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.brassCore;
      ctx.fill();
    }

    // Draw 6x6 Tiles
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const tile = state.tiles[y][x];
        const tx = boardX + x * tileSize;
        const ty = boardY + y * tileSize;
        const pad = 3;
        const isHovered = state.hoveredTile?.x === x && state.hoveredTile?.y === y;

        // Base slot
        this.roundRect(ctx, tx + pad, ty + pad, tileSize - pad * 2, tileSize - pad * 2, 7);
        if (tile.kind === 'chasm') {
          ctx.fillStyle = PALETTE.obsidianDeep;
          ctx.fill();
          ctx.strokeStyle = PALETTE.coralDark;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Inner abyss depth steps
          ctx.strokeStyle = 'rgba(255, 46, 84, 0.22)';
          this.roundRect(ctx, tx + 9, ty + 9, tileSize - 18, tileSize - 18, 4);
          ctx.stroke();
        } else if (tile.kind === 'ice') {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.14)';
          ctx.fill();
          ctx.strokeStyle = PALETTE.cyanCore;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (tile.kind === 'bumper') {
          ctx.fillStyle = PALETTE.obsidianRim;
          ctx.fill();
          ctx.strokeStyle = PALETTE.brassCore;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Raised octagonal brass-rimmed anvil
          ctx.fillStyle = PALETTE.obsidianChassis;
          this.roundRect(ctx, tx + 10, ty + 10, tileSize - 20, tileSize - 20, 5);
          ctx.fill();
          ctx.strokeStyle = PALETTE.brassDark;
          ctx.stroke();
        } else {
          ctx.fillStyle = isHovered ? PALETTE.obsidianRim : PALETTE.obsidianTile;
          ctx.fill();
          ctx.strokeStyle = isHovered ? PALETTE.brassCore : PALETTE.obsidianRim;
          ctx.lineWidth = isHovered ? 1.8 : 1;
          ctx.stroke();
        }

        const cx = tx + tileSize * 0.5;
        const cy = ty + tileSize * 0.5;

        // Diegetic Tile Feature Symbols
        if (tile.kind === 'vent') {
          // Signal Coral glowing subterranean spawn grate
          ctx.save();
          ctx.strokeStyle = PALETTE.coralCore;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, tileSize * 0.28, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - tileSize * 0.18, cy + i * 6);
            ctx.lineTo(cx + tileSize * 0.18, cy + i * 6);
            ctx.stroke();
          }
          ctx.fillStyle = PALETTE.coralBright;
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('VENT', cx, ty + tileSize - 7);
          ctx.restore();
        } else if (tile.kind === 'piston' && tile.dir) {
          // Brass Spring-Piston Plate
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(dirToRadians(tile.dir));
          ctx.strokeStyle = PALETTE.brassBright;
          ctx.lineWidth = 2.2;
          // Double chevron launcher
          for (const offset of [-6, 3]) {
            ctx.beginPath();
            ctx.moveTo(offset - 5, -9);
            ctx.lineTo(offset + 5, 0);
            ctx.lineTo(offset - 5, 9);
            ctx.stroke();
          }
          ctx.restore();
        } else if (tile.kind === 'pylon') {
          // Conductive Chain-Lightning Pylon
          ctx.save();
          ctx.strokeStyle = PALETTE.cyanCore;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, tileSize * 0.27, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, tileSize * 0.12, 0, Math.PI * 2);
          ctx.fillStyle = PALETTE.cyanBright;
          ctx.fill();
          ctx.restore();
        } else if (tile.kind === 'portal_a' || tile.kind === 'portal_b') {
          ctx.save();
          ctx.strokeStyle = PALETTE.cyanBright;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.arc(cx, cy, tileSize * 0.3, state.timeSec * 2, state.timeSec * 2 + Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = PALETTE.cyanBright;
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(tile.kind === 'portal_a' ? 'WARP A' : 'WARP B', cx, cy + 4);
          ctx.restore();
        } else if (tile.kind === 'prism_ne' || tile.kind === 'prism_nw') {
          ctx.save();
          ctx.strokeStyle = PALETTE.cyanBright;
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (tile.kind === 'prism_ne') {
            ctx.moveTo(cx - 14, cy + 14);
            ctx.lineTo(cx + 14, cy - 14);
          } else {
            ctx.moveTo(cx - 14, cy - 14);
            ctx.lineTo(cx + 14, cy + 14);
          }
          ctx.stroke();
          ctx.restore();
        }

        // Diegetic cracks on damaged floor/bumpers
        if (tile.cracked) {
          ctx.save();
          ctx.strokeStyle = PALETTE.brassDark;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(cx - 8, cy - 6);
          ctx.lineTo(cx + 2, cy + 1);
          ctx.lineTo(cx + 9, cy - 4);
          ctx.moveTo(cx + 2, cy + 1);
          ctx.lineTo(cx - 3, cy + 10);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  private drawEnemyTelegraphs(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayoutMetrics,
    state: RenderViewState
  ): void {
    const { boardX, boardY, tileSize } = layout;

    for (const p of state.pieces) {
      if (p.hp <= 0 || p.faction !== 'enemy') continue;
      const vec = DIR_VECTORS[p.dir];
      const tx = p.x + vec.x;
      const ty = p.y + vec.y;
      if (tx < 0 || tx >= 6 || ty < 0 || ty >= 6) continue;

      const startPx = boardX + (p.x + 0.5) * tileSize;
      const startPy = boardY + (p.y + 0.5) * tileSize;
      const endPx = boardX + (tx + 0.5) * tileSize;
      const endPy = boardY + (ty + 0.5) * tileSize;

      const isDoomed = state.activePreview?.doomedPieceIds.has(p.id) ?? false;

      ctx.save();
      ctx.globalAlpha = isDoomed ? 0.25 : 0.85;
      ctx.strokeStyle = PALETTE.coralCore;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(startPx, startPy);
      ctx.lineTo(endPx, endPy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target tile threat bracket
      const rx = boardX + tx * tileSize + 8;
      const ry = boardY + ty * tileSize + 8;
      const rw = tileSize - 16;
      ctx.strokeStyle = PALETTE.coralCore;
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, rx, ry, rw, rw, 5);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPreviewZones(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayoutMetrics,
    preview: CascadePreview,
    timeSec: number
  ): void {
    const { boardX, boardY, tileSize } = layout;
    const pulse = 0.16 + 0.08 * Math.sin(timeSec * 8);

    for (const step of preview.steps) {
      if (step.arcTargets && step.arcTargets.length > 0) {
        for (const cell of step.arcTargets) {
          const rx = boardX + cell.x * tileSize + 5;
          const ry = boardY + cell.y * tileSize + 5;
          ctx.fillStyle = `rgba(0, 240, 255, ${pulse})`;
          this.roundRect(ctx, rx, ry, tileSize - 10, tileSize - 10, 6);
          ctx.fill();
        }
      }
    }
  }

  private drawPieces(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayoutMetrics,
    state: RenderViewState
  ): void {
    const { boardX, boardY, tileSize } = layout;

    // Sort pieces so lifted/hovered pieces render on top
    const sorted = [...state.pieces].sort((a, b) => {
      const la = this.springs.get(a.id)?.lift ?? 0;
      const lb = this.springs.get(b.id)?.lift ?? 0;
      return la - lb;
    });

    for (const p of sorted) {
      if (p.hp <= 0) continue;
      const sp = this.springs.get(p.id);
      const gx = sp ? sp.x : p.x;
      const gy = sp ? sp.y : p.y;
      const lift = sp ? sp.lift : 0;
      const scale = sp ? sp.scale : 1;
      const angle = sp ? sp.angle : dirToRadians(p.dir);

      const isHovered = state.hoveredPieceId === p.id || state.draggingFromPieceId === p.id;
      const tiltX = isHovered ? Math.max(-6, Math.min(6, state.cursorVel.x * 0.18)) : 0;
      const tiltY = isHovered ? Math.max(-6, Math.min(6, state.cursorVel.y * 0.18)) : 0;

      const centerX = boardX + (gx + 0.5) * tileSize + tiltX;
      const centerY = boardY + (gy + 0.5) * tileSize - lift + tiltY;
      const radius = tileSize * 0.36 * scale;

      ctx.save();

      // Soft mechanical drop-shadow proportional to hover lift
      ctx.beginPath();
      ctx.arc(
        boardX + (gx + 0.5) * tileSize,
        boardY + (gy + 0.5) * tileSize + 5 + lift * 0.45,
        radius * 0.98,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = isHovered ? 'rgba(0, 0, 0, 0.68)' : 'rgba(0, 0, 0, 0.45)';
      ctx.fill();

      // Piece body according to strict 4-color semantic palette
      if (p.faction === 'player') {
        // Warm Brass / Amber Heavy Automaton or Mechanism
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.brassDark;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = PALETTE.brassBright;
        ctx.stroke();

        // Inner machined brass bezel
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.76, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.obsidianChassis;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = PALETTE.brassCore;
        ctx.stroke();

        // Directional turret / piston wedge
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        if (p.kind === 'pulse_coil') {
          ctx.strokeStyle = PALETTE.cyanBright;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = PALETTE.brassBright;
          ctx.beginPath();
          ctx.moveTo(radius * 0.55, 0);
          ctx.lineTo(-radius * 0.28, -radius * 0.36);
          ctx.lineTo(-radius * 0.12, 0);
          ctx.lineTo(-radius * 0.28, radius * 0.36);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else if (p.faction === 'enemy') {
        // Signal Coral / Crimson Threat Piece
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.coralDark;
        ctx.fill();
        ctx.lineWidth = p.kind === 'juggernaut' ? 3.2 : 2.2;
        ctx.strokeStyle = PALETTE.coralCore;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE.obsidianChassis;
        ctx.fill();

        // Directional threat arrow inside enemy
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.fillStyle = PALETTE.coralBright;
        ctx.beginPath();
        ctx.moveTo(radius * 0.5, 0);
        ctx.lineTo(-radius * 0.25, -radius * 0.32);
        ctx.lineTo(-radius * 0.25, radius * 0.32);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Diegetic Turn Order Number etched on enemy rim
        if (p.turnOrder !== undefined) {
          ctx.fillStyle = PALETTE.coralBright;
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`#${p.turnOrder}`, centerX, centerY - radius - 4);
        }
      } else {
        // Neutral Piece: Volatile Bomb Barrel or Bounty Core
        const isBounty = p.kind === 'bounty_core';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.92, 0, Math.PI * 2);
        ctx.fillStyle = isBounty ? PALETTE.brassShadow : PALETTE.coralDark;
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = isBounty ? PALETTE.brassBright : PALETTE.coralBright;
        ctx.stroke();

        ctx.fillStyle = isBounty ? PALETTE.brassBright : PALETTE.coralBright;
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isBounty ? `${p.bountyLevel ?? 1}x$` : 'TNT', centerX, centerY + 3.5);
      }

      // Diegetic Health Pips etched along the bottom rim of the piece
      const previewRemainingHp = state.activePreview?.damagedPieceMap.get(p.id) ?? p.hp;
      for (let i = 0; i < p.maxHp; i++) {
        const pipX = centerX - ((p.maxHp - 1) * 8) / 2 + i * 8;
        const pipY = centerY + radius - 3;
        const isAliveNow = i < p.hp;
        const willSurvive = i < previewRemainingHp;

        ctx.beginPath();
        ctx.arc(pipX, pipY, 3, 0, Math.PI * 2);
        if (!isAliveNow) {
          ctx.fillStyle = PALETTE.obsidianDeep;
        } else if (!willSurvive) {
          // Flashing Cyan pip indicating predicted damage!
          ctx.fillStyle = PALETTE.cyanCore;
        } else {
          ctx.fillStyle = p.faction === 'player' ? PALETTE.brassBright : PALETTE.coralBright;
        }
        ctx.fill();
      }

      // Lethal Capture / KO Reticle if Live Causality Preview predicts this piece dies!
      if (state.activePreview?.doomedPieceIds.has(p.id) && !state.isResolving) {
        ctx.save();
        ctx.strokeStyle = PALETTE.cyanCore;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Crisp cyan 'KO' badge
        ctx.fillStyle = PALETTE.obsidianDeep;
        this.roundRect(ctx, centerX - 14, centerY - 8, 28, 16, 4);
        ctx.fill();
        ctx.strokeStyle = PALETTE.cyanBright;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = PALETTE.cyanBright;
        ctx.font = '800 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('KO', centerX, centerY + 3.5);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  private drawGhostPlacementAndAim(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayoutMetrics,
    state: RenderViewState
  ): void {
    const { boardX, boardY, tileSize } = layout;

    // If dragging a dock mechanism over a valid tile, draw lifted magnetic ghost piece
    if (
      (state.selectedTool === 'piston_mech' || state.selectedTool === 'pulse_coil') &&
      state.hoveredTile
    ) {
      const { x, y } = state.hoveredTile;
      const cx = boardX + (x + 0.5) * tileSize;
      const cy = boardY + (y + 0.5) * tileSize - 8;
      const r = tileSize * 0.34;

      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.brassDark;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = PALETTE.cyanBright;
      ctx.stroke();

      if (state.selectedTool === 'piston_mech') {
        ctx.translate(cx, cy);
        ctx.rotate(dirToRadians(state.toolDir));
        ctx.fillStyle = PALETTE.brassBright;
        ctx.beginPath();
        ctx.moveTo(r * 0.55, 0);
        ctx.lineTo(-r * 0.28, -r * 0.35);
        ctx.lineTo(-r * 0.28, r * 0.35);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = PALETTE.cyanBright;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawCausalityChainOverlay(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayoutMetrics,
    preview: CascadePreview,
    timeSec: number
  ): void {
    const { boardX, boardY, tileSize } = layout;

    ctx.save();
    // 1. Draw trajectory vectors in Electric Cyan
    for (const step of preview.steps) {
      if (step.fromX === step.toX && step.fromY === step.toY) continue;
      const x1 = boardX + (step.fromX + 0.5) * tileSize;
      const y1 = boardY + (step.fromY + 0.5) * tileSize;
      const x2 = boardX + (step.toX + 0.5) * tileSize;
      const y2 = boardY + (step.toY + 0.5) * tileSize;

      ctx.strokeStyle = PALETTE.cyanCore;
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = -timeSec * 36;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Directional arrowhead
      const ang = Math.atan2(y2 - y1, x2 - x1);
      ctx.fillStyle = PALETTE.cyanBright;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 10 * Math.cos(ang - 0.45), y2 - 10 * Math.sin(ang - 0.45));
      ctx.lineTo(x2 - 10 * Math.cos(ang + 0.45), y2 - 10 * Math.sin(ang + 0.45));
      ctx.closePath();
      ctx.fill();
    }

    // 2. Draw Numbered Domino Sequence Badges (1, 2, 3...) at key cascade events
    const badgeCountsAtTile = new Map<string, number>();
    for (const step of preview.steps) {
      if (step.kind === 'slide') continue;
      const key = `${step.toX},${step.toY}`;
      const stackIdx = badgeCountsAtTile.get(key) ?? 0;
      badgeCountsAtTile.set(key, stackIdx + 1);

      const bx = boardX + (step.toX + 0.5) * tileSize + (stackIdx % 2 === 0 ? -16 : 16);
      const by = boardY + (step.toY + 0.5) * tileSize - 18 - Math.floor(stackIdx / 2) * 16;

      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.obsidianDeep;
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = PALETTE.cyanBright;
      ctx.stroke();

      ctx.fillStyle = PALETTE.cyanBright;
      ctx.font = '800 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(step.stepIndex), bx, by + 3.5);
    }

    ctx.restore();
  }

  private drawShockwavesAndCallouts(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayoutMetrics,
    state: RenderViewState
  ): void {
    const { boardX, boardY, tileSize } = layout;

    // Shockwave rings
    for (const sw of state.shockwaves) {
      const px = boardX + (sw.x + 0.5) * tileSize;
      const py = boardY + (sw.y + 0.5) * tileSize;
      ctx.save();
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Active resolution lightning arcs
    if (state.isResolving && state.activeStepBanner?.arcTargets) {
      const step = state.activeStepBanner;
      const ox = boardX + (step.fromX + 0.5) * tileSize;
      const oy = boardY + (step.fromY + 0.5) * tileSize;
      ctx.save();
      ctx.strokeStyle = PALETTE.cyanBright;
      ctx.lineWidth = 2.8;
      for (const t of step.arcTargets ?? []) {
        const tx = boardX + (t.x + 0.5) * tileSize;
        const ty = boardY + (t.y + 0.5) * tileSize;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo((ox + tx) * 0.5 + (Math.random() - 0.5) * 14, (oy + ty) * 0.5 + (Math.random() - 0.5) * 14);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Floating beat callouts
    for (const c of state.callouts) {
      const px = boardX + (c.x + 0.5) * tileSize;
      const py = boardY + (c.y + 0.5) * tileSize - (c.age / c.maxAge) * 28 - 14;
      const alpha = Math.max(0, 1 - c.age / c.maxAge);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '800 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.obsidianDeep;
      ctx.fillText(c.text, px + 1, py + 1);
      ctx.fillStyle = c.color;
      ctx.fillText(c.text, px, py);
      if (c.subtext) {
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillStyle = PALETTE.brassBright;
        ctx.fillText(c.subtext, px, py + 13);
      }
      ctx.restore();
    }
  }

  private drawBottomDockAndControls(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayoutMetrics,
    state: RenderViewState
  ): void {
    const { pistonSlotRect, coilSlotRect, undoRect, resolveRect } = layout;
    const canAct = state.usedActions < state.maxActions && !state.isResolving;

    // 1. Repulsor Piston Dock Slot
    const isPistonSelected = state.selectedTool === 'piston_mech';
    this.drawBezelButton(
      ctx,
      pistonSlotRect,
      isPistonSelected ? PALETTE.cyanCore : PALETTE.brassCore,
      isPistonSelected ? PALETTE.obsidianRim : PALETTE.obsidianChassis,
      `PISTON [${state.toolDir}]`,
      canAct ? 'CLICK/DRAG' : 'NO PINS'
    );

    // 2. Omni-Pulse Coil Dock Slot
    const isCoilSelected = state.selectedTool === 'pulse_coil';
    this.drawBezelButton(
      ctx,
      coilSlotRect,
      isCoilSelected ? PALETTE.cyanCore : PALETTE.brassCore,
      isCoilSelected ? PALETTE.obsidianRim : PALETTE.obsidianChassis,
      'OMNI COIL',
      canAct ? '360° SHOVE' : 'NO PINS'
    );

    // 3. Undo / Reset Turn Bezel Lever
    const canUndo = state.queuedActions.length > 0 && !state.isResolving;
    this.drawBezelButton(
      ctx,
      undoRect,
      canUndo ? PALETTE.brassBright : PALETTE.obsidianRim,
      PALETTE.obsidianChassis,
      'UNDO [Z]',
      canUndo ? `${state.queuedActions.length} QUEUED` : 'READY'
    );

    // 4. Pulsing Central Brass RESOLVE CORE
    const pulseGlow = 0.5 + 0.5 * Math.sin(state.timeSec * 5);
    const hasMoves = state.queuedActions.length > 0;
    this.drawBezelButton(
      ctx,
      resolveRect,
      hasMoves ? PALETTE.cyanBright : PALETTE.brassBright,
      hasMoves ? 'rgba(0, 240, 255, 0.16)' : PALETTE.obsidianChassis,
      state.isResolving ? 'RESOLVING...' : 'RESOLVE [SPACE]',
      state.usedActions === 1 ? '+50% 1-PIN BONUS!' : pulseGlow > 0.5 ? 'FIRE CASCADE' : 'COMMIT TURN'
    );
  }

  private drawBezelButton(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number },
    borderColor: string,
    fillColor: string,
    title: string,
    subtitle: string
  ): void {
    ctx.save();
    ctx.fillStyle = fillColor;
    this.roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    ctx.fillStyle = PALETTE.brassBright;
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, rect.x + rect.w * 0.5, rect.y + 26);

    ctx.fillStyle = PALETTE.cyanCore;
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillText(subtitle, rect.x + rect.w * 0.5, rect.y + 44);
    ctx.restore();
  }

  private drawRelicSelectionModal(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayoutMetrics,
    state: RenderViewState
  ): void {
    const { canvasW, canvasH, relicCardRects } = layout;
    if (!state.relicChoices) return;

    ctx.save();
    ctx.fillStyle = 'rgba(7, 10, 15, 0.88)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = PALETTE.brassBright;
    ctx.font = '800 18px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STAGE CLEARED // SELECT 1 BRASS RELIC', canvasW * 0.5, relicCardRects[0].y - 26);

    state.relicChoices.forEach((relic, idx) => {
      const r = relicCardRects[idx];
      const isHovered = state.hoveredRelicIndex === idx;
      const lift = isHovered ? 6 : 0;

      ctx.fillStyle = isHovered ? PALETTE.obsidianRim : PALETTE.obsidianChassis;
      this.roundRect(ctx, r.x, r.y - lift, r.w, r.h, 10);
      ctx.fill();
      ctx.lineWidth = isHovered ? 2.5 : 1.6;
      ctx.strokeStyle = isHovered ? PALETTE.cyanBright : PALETTE.brassCore;
      ctx.stroke();

      ctx.fillStyle = PALETTE.brassBright;
      ctx.font = '800 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(relic.name, r.x + r.w * 0.5, r.y - lift + 34);

      // Wrap 1-sentence rule text cleanly
      ctx.fillStyle = PALETTE.cyanBright;
      ctx.font = '500 11px "JetBrains Mono", monospace';
      this.wrapText(ctx, relic.ruleText, r.x + r.w * 0.5, r.y - lift + 68, r.w - 28, 17);

      ctx.fillStyle = PALETTE.brassCore;
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillText(`[CLICK OR PRESS ${idx + 1}]`, r.x + r.w * 0.5, r.y - lift + r.h - 18);
    });

    ctx.restore();
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    startY: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let y = startY;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, centerX, y);
        line = w;
        y += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, centerX, y);
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
