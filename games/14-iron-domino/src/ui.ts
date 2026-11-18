/**
 * IRONBREAKER // DOMINO FOUNDRY — HTML5 Canvas Diorama Renderer & Choreographed Domino Sequencer
 * Renders multi-part articulated silhouettes, persistent battlefield scars, live Consequence Oracle
 * trajectory & knockback previews, staggered 70-100ms chain pacing, escalating 40-65ms hit-stop,
 * and minimal diegetic brass blueprint HUD.
 */

import { FoundryAudioEngine } from './audio';
import {
  ChainEvent,
  ConsequenceOracleResult,
  DioramaEntity,
  GRID_SIZE,
  GameState,
  GridPos,
  RELIC_CATALOG,
  RelicId,
  SurfaceScar,
  TileKind,
  ToolKind,
  getPlayer,
  inBounds,
} from './simulation';

export interface BoardViewport {
  width: number;
  height: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  tileSize: number;
}

export interface FloatingPopup {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  lifeMs: number;
  maxLifeMs: number;
  scale: number;
}

export interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  lifeMs: number;
  maxLifeMs: number;
}

export interface ToolButtonRect {
  tool: ToolKind | 'overclock' | 'end_turn';
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  hotkey: string;
}

export interface RelicCardRect {
  relicId: RelicId;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Manages choreographed 1-by-1 domino playback with 70-100ms staggered micro-delays,
 * escalating 40-65ms hit-stop, directional camera punch, and floating badges.
 */
export class DioramaChoreographer {
  public queue: ChainEvent[] = [];
  public activeStepIndex = 0;
  public stepTimerMs = 0;
  public hitStopRemainingMs = 0;
  public lastHitStopDurationMs = 0;
  public cameraPunchX = 0;
  public cameraPunchY = 0;
  public popups: FloatingPopup[] = [];
  public particles: SparkParticle[] = [];
  public activeArcs: Array<{ from: GridPos; to: GridPos; color: string; lifeMs: number }> = [];
  public toolButtons: ToolButtonRect[] = [];
  public relicCards: RelicCardRect[] = [];

  public enqueueChainEvents(
    events: ChainEvent[],
    state: GameState,
    audio?: FoundryAudioEngine
  ): void {
    if (events.length === 0) return;
    this.queue = events.map((e) => ({ ...e }));
    this.activeStepIndex = 0;
    this.stepTimerMs = 0;
    // Trigger the first domino step immediately for zero-latency physical responsiveness!
    this.triggerEventVisuals(this.queue[0], 1, state, audio);
    this.stepTimerMs = this.queue[0].delayMs;
  }

  public isPlayingChain(): boolean {
    return this.activeStepIndex < this.queue.length;
  }

  public update(dtMs: number, state: GameState, audio?: FoundryAudioEngine): void {
    // 1. Decay directional camera punch spring
    this.cameraPunchX *= Math.pow(0.82, dtMs / 16);
    this.cameraPunchY *= Math.pow(0.82, dtMs / 16);
    if (Math.abs(this.cameraPunchX) < 0.1) this.cameraPunchX = 0;
    if (Math.abs(this.cameraPunchY) < 0.1) this.cameraPunchY = 0;

    // 2. Recover entity squash-and-stretch & flash timers
    for (const ent of state.entities) {
      ent.squashX += (1 - ent.squashX) * Math.min(1, dtMs * 0.014);
      ent.squashY += (1 - ent.squashY) * Math.min(1, dtMs * 0.014);
      if (ent.flashTimerMs > 0) {
        ent.flashTimerMs = Math.max(0, ent.flashTimerMs - dtMs);
      }
    }

    // 3. Process escalating Hit-Stop (freezes domino advance while preserving camera punch tension)
    if (this.hitStopRemainingMs > 0) {
      this.hitStopRemainingMs = Math.max(0, this.hitStopRemainingMs - dtMs);
      return;
    }

    // 4. Advance staggered 70-100ms domino sequence 1-by-1
    if (this.activeStepIndex < this.queue.length) {
      this.stepTimerMs -= dtMs;
      while (this.stepTimerMs <= 0 && this.activeStepIndex < this.queue.length) {
        this.activeStepIndex += 1;
        if (this.activeStepIndex < this.queue.length) {
          const nextEv = this.queue[this.activeStepIndex];
          this.triggerEventVisuals(nextEv, this.activeStepIndex + 1, state, audio);
          this.stepTimerMs += nextEv.delayMs;
          if (this.hitStopRemainingMs > 0) {
            break;
          }
        }
      }
    }

    // 5. Update popups & particles
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.lifeMs -= dtMs;
      p.y += p.vy * (dtMs / 1000);
      if (p.lifeMs <= 0) this.popups.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.lifeMs -= dtMs;
      pt.x += pt.vx * (dtMs / 1000);
      pt.y += pt.vy * (dtMs / 1000);
      pt. vx *= 0.95;
      pt.vy *= 0.95;
      if (pt.lifeMs <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.activeArcs.length - 1; i >= 0; i--) {
      this.activeArcs[i].lifeMs -= dtMs;
      if (this.activeArcs[i].lifeMs <= 0) this.activeArcs.splice(i, 1);
    }
  }

  private triggerEventVisuals(
    ev: ChainEvent,
    chainLinkNumber: number,
    state: GameState,
    audio?: FoundryAudioEngine
  ): void {
    // Escalating Hit-Stop (40ms -> 65ms)
    this.hitStopRemainingMs = ev.hitStopMs;
    this.lastHitStopDurationMs = ev.hitStopMs;

    // Directional Camera Punch scaled by chain link escalation
    const punchMag = Math.min(16, 6 + chainLinkNumber * 1.8);
    this.cameraPunchX = (ev.cameraPunch.dx || 0) * punchMag;
    this.cameraPunchY = (ev.cameraPunch.dy || -0.6) * punchMag;

    // Squash & stretch target entity
    const targetEnt = state.entities.find((e) => e.id === ev.entityId);
    if (targetEnt) {
      targetEnt.squashX = ev.cameraPunch.dx !== 0 ? 0.66 : 1.32;
      targetEnt.squashY = ev.cameraPunch.dy !== 0 ? 0.66 : 1.32;
      targetEnt.flashTimerMs = 240;
    }

    // Spawn floating domino badge
    this.popups.push({
      x: ev.to.x + 0.5,
      y: ev.to.y + 0.2,
      vy: -0.65,
      text: chainLinkNumber > 1 ? `[#${chainLinkNumber}] ${ev.badgeText}` : ev.badgeText,
      color: ev.badgeColor,
      lifeMs: 1150,
      maxLifeMs: 1150,
      scale: Math.min(1.4, 1 + chainLinkNumber * 0.06),
    });

    // Spawn metallic/slag spark burst
    const count = ev.kind === 'barrel_blast' || ev.kind === 'pillar_collapse' ? 18 : 10;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (chainLinkNumber * 0.37);
      const speed = 1.4 + (i % 4) * 0.85;
      this.particles.push({
        x: ev.to.x + 0.5,
        y: ev.to.y + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: ev.kind === 'barrel_blast' ? 5 : 3.5,
        color: ev.badgeColor,
        lifeMs: 420 + (i % 3) * 110,
        maxLifeMs: 530,
      });
    }

    if (
      ev.kind === 'shock_arc' ||
      ev.kind === 'pylon_overload' ||
      ev.kind === 'pull' ||
      ev.kind === 'shove'
    ) {
      this.activeArcs.push({
        from: { ...ev.from },
        to: { ...ev.to },
        color: ev.badgeColor,
        lifeMs: 360,
      });
    }

    // Play procedural Web Audio foley + harmonic escalation chord
    if (audio) {
      audio.playChainHarmonic(chainLinkNumber, ev.hazardKill);
      if (ev.kind === 'barrel_blast' || ev.kind === 'pillar_collapse') {
        audio.playExplosion();
      } else if (ev.kind === 'ice_shatter' || ev.kind === 'vault_crack') {
        audio.playGlassShatter();
      } else if (
        ev.kind === 'entity_collision' ||
        ev.kind === 'wall_slam' ||
        ev.kind === 'wall_bounce' ||
        ev.kind === 'bumper_deflect'
      ) {
        audio.playMetallicClang(chainLinkNumber);
      } else if (ev.kind === 'shove' || ev.kind === 'pull' || ev.kind === 'tool_fire') {
        audio.playKineticLaunch(ev.kind === 'pull' ? 'harpoon' : 'ram');
      }
    }
  }
}

export function computeBoardViewport(width: number, height: number): BoardViewport {
  // Reserve minimal top bar (54px) and bottom tactical dock (68px), leaving >85% of screen for the diorama!
  const topPad = 56;
  const bottomPad = 70;
  const availW = Math.max(280, width - 36);
  const availH = Math.max(280, height - topPad - bottomPad);
  const boardSize = Math.floor(Math.min(availW, availH));
  const tileSize = boardSize / GRID_SIZE;
  const boardX = Math.floor((width - boardSize) / 2);
  const boardY = Math.floor(topPad + (availH - boardSize) / 2);

  return {
    width,
    height,
    boardX,
    boardY,
    boardSize,
    tileSize,
  };
}

export function screenToGridTile(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  vp: BoardViewport
): GridPos | null {
  const localX = clientX - canvasRect.left;
  const localY = clientY - canvasRect.top;
  const gx = Math.floor((localX - vp.boardX) / vp.tileSize);
  const gy = Math.floor((localY - vp.boardY) / vp.tileSize);
  if (!inBounds(gx, gy)) return null;
  return { x: gx, y: gy };
}

/**
 * Main Canvas Renderer for IRONBREAKER // DOMINO FOUNDRY.
 */
export function renderDiorama(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  oracle: ConsequenceOracleResult,
  choreo: DioramaChoreographer,
  vp: BoardViewport,
  nowMs: number,
  audioMuted = false
): void {
  ctx.save();
  ctx.clearRect(0, 0, vp.width, vp.height);

  // 1. Warm Cast-Iron & Blueprint Backdrop
  const bgGrad = ctx.createRadialGradient(
    vp.width * 0.5,
    vp.height * 0.48,
    vp.boardSize * 0.1,
    vp.width * 0.5,
    vp.height * 0.5,
    Math.max(vp.width, vp.height) * 0.75
  );
  bgGrad.addColorStop(0, '#1f1916');
  bgGrad.addColorStop(0.65, '#130f0d');
  bgGrad.addColorStop(1, '#090706');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, vp.width, vp.height);

  // Subtle industrial blueprint grid lines in margin
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.05)';
  ctx.lineWidth = 1;
  const bgStep = 36;
  for (let x = 0; x < vp.width; x += bgStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, vp.height);
    ctx.stroke();
  }
  for (let y = 0; y < vp.height; y += bgStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(vp.width, y);
    ctx.stroke();
  }

  // Apply directional camera punch offset to the diorama board
  ctx.save();
  ctx.translate(choreo.cameraPunchX, choreo.cameraPunchY);

  // 2. Chunky Isometric-Beveled Foundry Platform Base beneath the 8x8 grid
  const bevelDepth = 14;
  ctx.fillStyle = '#0c0908';
  ctx.fillRect(vp.boardX - 8, vp.boardY - 8, vp.boardSize + 16, vp.boardSize + 16 + bevelDepth);
  ctx.fillStyle = '#29201b';
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  ctx.fillRect(vp.boardX - 6, vp.boardY - 6, vp.boardSize + 12, vp.boardSize + 12);
  ctx.strokeRect(vp.boardX - 6, vp.boardY - 6, vp.boardSize + 12, vp.boardSize + 12);

  // 3. Render 8x8 Foundry Tiles
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const tx = vp.boardX + gx * vp.tileSize;
      const ty = vp.boardY + gy * vp.tileSize;
      const tile = state.tiles[gy][gx];
      drawFoundryTile(
        ctx,
        tile,
        tx,
        ty,
        vp.tileSize,
        gx,
        gy,
        state.iceCracked[gy][gx],
        nowMs
      );
    }
  }

  // 4. Render Persistent Battlefield Scars (Scorch marks, cracks, rubble, slag splatters)
  for (const scar of state.scars) {
    drawSurfaceScar(ctx, scar, vp, nowMs);
  }

  // 5. Render Consequence Oracle Live Preview Underlay (Target tile highlight, blast zones, knockback paths)
  if (state.phase === 'playing') {
    drawConsequenceOracleUnderlay(ctx, state, oracle, vp, nowMs);
  }

  // 6. Render Boss Ferro-Shield Tethers (in Room 5 when Pylons are alive)
  const boss = state.entities.find((e) => e.kind === 'boss_core' && e.hp > 0);
  if (boss) {
    const pylons = state.entities.filter((e) => e.kind === 'boss_pylon' && e.hp > 0);
    for (const pylon of pylons) {
      const bx = vp.boardX + (boss.x + 0.5) * vp.tileSize;
      const by = vp.boardY + (boss.y + 0.5) * vp.tileSize;
      const px = vp.boardX + (pylon.x + 0.5) * vp.tileSize;
      const py = vp.boardY + (pylon.y + 0.5) * vp.tileSize;

      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 7. Render Multi-Part Articulated Entities (Sorted top-to-bottom for 2.5D diorama depth)
  const livingEntities = state.entities
    .filter((e) => e.hp > 0)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  for (const ent of livingEntities) {
    drawArticulatedEntity(ctx, ent, vp, nowMs, boss && state.entities.some((p) => p.kind === 'boss_pylon' && p.hp > 0));
  }

  // 8. Render Active Choreographed Arcs & Spark Particles
  for (const arc of choreo.activeArcs) {
    const ax = vp.boardX + (arc.from.x + 0.5) * vp.tileSize;
    const ay = vp.boardY + (arc.from.y + 0.5) * vp.tileSize;
    const bx = vp.boardX + (arc.to.x + 0.5) * vp.tileSize;
    const by = vp.boardY + (arc.to.y + 0.5) * vp.tileSize;
    ctx.save();
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo((ax + bx) * 0.5 + Math.sin(nowMs * 0.05) * 8, (ay + by) * 0.5 - 8);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.restore();
  }

  for (const pt of choreo.particles) {
    const px = vp.boardX + pt.x * vp.tileSize;
    const py = vp.boardY + pt.y * vp.tileSize;
    const alpha = Math.max(0, pt.lifeMs / pt.maxLifeMs);
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(px - pt.size * 0.5, py - pt.size * 0.5, pt.size, pt.size);
    ctx.globalAlpha = 1;
  }

  // 9. Render Consequence Oracle Top Badges ("CHAIN x7!", "HAZARD KILL!", "-3 HP")
  if (state.phase === 'playing') {
    drawConsequenceOracleBadges(ctx, state, oracle, vp, nowMs);
  }

  // 10. Render Choreographed Floating Popups
  for (const pop of choreo.popups) {
    const px = vp.boardX + pop.x * vp.tileSize;
    const py = vp.boardY + pop.y * vp.tileSize;
    drawPillBadge(ctx, px, py, pop.text, pop.color, '#0f0c0a', 12 * pop.scale);
  }

  // 11. Render 1-Line Diegetic Tutorial Callout on First Turn (Vanishes after 1st action!)
  if (state.tutorialCalloutVisible && state.phase === 'playing') {
    const calloutY = vp.boardY + 22;
    const pulse = 1 + Math.sin(nowMs * 0.008) * 0.025;
    ctx.save();
    ctx.translate(vp.boardX + vp.boardSize * 0.5, calloutY);
    ctx.scale(pulse, pulse);
    drawPillBadge(
      ctx,
      0,
      0,
      state.tutorialCalloutText,
      '#fef3c7',
      '#78350f',
      12.5
    );
    ctx.restore();
  }

  ctx.restore(); // End camera punch transform

  // 12. Minimal Diegetic Top Status Strip & Bottom Tool Dock
  drawDiegeticHud(ctx, state, oracle, choreo, vp, audioMuted);

  // 13. Relic Draft Modal or Run Post-Mortem Overlay
  if (state.phase === 'relic_draft') {
    drawRelicDraftOverlay(ctx, state, choreo, vp);
  } else if (state.phase === 'victory' || state.phase === 'defeat') {
    drawPostMortemOverlay(ctx, state, vp);
  }

  ctx.restore();
}

function drawFoundryTile(
  ctx: CanvasRenderingContext2D,
  tile: TileKind,
  tx: number,
  ty: number,
  size: number,
  gx: number,
  gy: number,
  iceCracked: boolean,
  nowMs: number
): void {
  const pad = 2;
  const innerX = tx + pad;
  const innerY = ty + pad;
  const innerS = size - pad * 2;

  if (tile === 'pit') {
    // Open Molten Slag Smelter Pit
    ctx.fillStyle = '#1c0a06';
    ctx.fillRect(innerX, innerY, innerS, innerS);

    const glow = 0.55 + Math.sin(nowMs * 0.004 + gx + gy) * 0.18;
    ctx.fillStyle = `rgba(239, 68, 68, ${glow})`;
    ctx.fillRect(innerX + 5, innerY + 5, innerS - 10, innerS - 10);

    // Hazard chevron rim
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(innerX + 2, innerY + 2, innerS - 4, innerS - 4);
    return;
  }

  // Base riveted steel floor plate
  ctx.fillStyle = (gx + gy) % 2 === 0 ? '#27201c' : '#221c18';
  ctx.fillRect(innerX, innerY, innerS, innerS);

  // Top-left bevel highlight & bottom-right shadow
  ctx.strokeStyle = 'rgba(254, 243, 199, 0.07)';
  ctx.lineWidth = 1;
  ctx.strokeRect(innerX + 0.5, innerY + 0.5, innerS - 1, innerS - 1);

  // Corner rivets
  ctx.fillStyle = '#443830';
  const rOff = 5;
  ctx.fillRect(innerX + rOff, innerY + rOff, 2, 2);
  ctx.fillRect(innerX + innerS - rOff - 2, innerY + rOff, 2, 2);
  ctx.fillRect(innerX + rOff, innerY + innerS - rOff - 2, 2, 2);
  ctx.fillRect(innerX + innerS - rOff - 2, innerY + innerS - rOff - 2, 2, 2);

  if (tile === 'water') {
    // Conductive Coolant Pool
    ctx.fillStyle = 'rgba(14, 165, 233, 0.36)';
    ctx.fillRect(innerX + 3, innerY + 3, innerS - 6, innerS - 6);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(innerX + 4, innerY + 4, innerS - 8, innerS - 8);

    // Voltage wave line
    const waveY = innerY + innerS * 0.5 + Math.sin(nowMs * 0.005 + gx) * 4;
    ctx.beginPath();
    ctx.moveTo(innerX + 8, waveY);
    ctx.lineTo(innerX + innerS - 8, waveY);
    ctx.stroke();
  } else if (tile === 'ice') {
    // Fragile Cryo-Glass Grate
    ctx.fillStyle = iceCracked ? 'rgba(56, 189, 248, 0.25)' : 'rgba(186, 230, 253, 0.35)';
    ctx.fillRect(innerX + 2, innerY + 2, innerS - 4, innerS - 4);
    ctx.strokeStyle = iceCracked ? '#f59e0b' : '#7dd3fc';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(innerX + 3, innerY + 3, innerS - 6, innerS - 6);
    if (iceCracked) {
      ctx.beginPath();
      ctx.moveTo(innerX + 5, innerY + 5);
      ctx.lineTo(innerX + innerS - 5, innerY + innerS - 5);
      ctx.moveTo(innerX + innerS - 6, innerY + 6);
      ctx.lineTo(innerX + 6, innerY + innerS - 6);
      ctx.stroke();
    }
  } else if (
    tile === 'conveyor_e' ||
    tile === 'conveyor_w' ||
    tile === 'conveyor_n' ||
    tile === 'conveyor_s'
  ) {
    ctx.fillStyle = '#332820';
    ctx.fillRect(innerX + 4, innerY + 4, innerS - 8, innerS - 8);
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    const cx = innerX + innerS * 0.5;
    const cy = innerY + innerS * 0.5;
    const dir =
      tile === 'conveyor_e'
        ? { dx: 1, dy: 0 }
        : tile === 'conveyor_w'
          ? { dx: -1, dy: 0 }
          : tile === 'conveyor_s'
            ? { dx: 0, dy: 1 }
            : { dx: 0, dy: -1 };
    ctx.beginPath();
    ctx.moveTo(cx - dir.dx * 8 - dir.dy * 6, cy - dir.dy * 8 - dir.dx * 6);
    ctx.lineTo(cx + dir.dx * 8, cy + dir.dy * 8);
    ctx.lineTo(cx - dir.dx * 8 + dir.dy * 6, cy - dir.dy * 8 + dir.dx * 6);
    ctx.stroke();
  } else if (
    tile === 'bumper_ne' ||
    tile === 'bumper_nw' ||
    tile === 'bumper_se' ||
    tile === 'bumper_sw' ||
    tile === 'spring_wall'
  ) {
    ctx.fillStyle = '#d97706';
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(innerX + innerS * 0.2, innerY + innerS * 0.2);
    ctx.lineTo(innerX + innerS * 0.8, innerY + innerS * 0.2);
    ctx.lineTo(innerX + innerS * 0.2, innerY + innerS * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Subtle coordinate label in corner for blueprint clarity
  ctx.fillStyle = 'rgba(254, 243, 199, 0.16)';
  ctx.font = '600 9px "JetBrains Mono", monospace';
  ctx.fillText(`${gx},${gy}`, innerX + 4, innerY + innerS - 4);
}

function drawSurfaceScar(
  ctx: CanvasRenderingContext2D,
  scar: SurfaceScar,
  vp: BoardViewport,
  nowMs: number
): void {
  const cx = vp.boardX + (scar.x + 0.5) * vp.tileSize;
  const cy = vp.boardY + (scar.y + 0.5) * vp.tileSize;
  const r = vp.tileSize * 0.34 * scar.intensity;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(scar.angle);

  if (scar.kind === 'scorch' || scar.kind === 'slag_splatter') {
    ctx.fillStyle =
      scar.kind === 'scorch' ? 'rgba(10, 8, 7, 0.68)' : 'rgba(239, 68, 68, 0.28)';
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.4);
    ctx.lineTo(-r * 0.3, -r);
    ctx.lineTo(r * 0.8, -r * 0.6);
    ctx.lineTo(r, r * 0.3);
    ctx.lineTo(r * 0.2, r * 0.9);
    ctx.lineTo(-r * 0.7, r * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (scar.kind === 'cracks') {
    ctx.strokeStyle = 'rgba(15, 11, 9, 0.82)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.3);
    ctx.lineTo(0, 0);
    ctx.lineTo(r * 0.85, -r * 0.55);
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.4, r * 0.85);
    ctx.stroke();
  } else if (scar.kind === 'rubble') {
    ctx.fillStyle = '#57493f';
    ctx.strokeStyle = '#1c1613';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-10, -6, 9, 7);
    ctx.strokeRect(-10, -6, 9, 7);
    ctx.fillRect(2, 1, 8, 6);
    ctx.strokeRect(2, 1, 8, 6);
  } else if (scar.kind === 'puddle_spark') {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.5;
    const jiggle = Math.sin(nowMs * 0.015 + scar.x) * 3;
    ctx.beginPath();
    ctx.moveTo(-10, jiggle);
    ctx.lineTo(0, -jiggle);
    ctx.lineTo(10, jiggle);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Multi-Part Articulated Silhouette Renderer (Zero plain programmer circles!).
 * Every unit and prop has a distinct multi-shape mechanical silhouette, directional facing,
 * idle breathing/bobbing, squash-and-stretch on impact, and health segments.
 */
function drawArticulatedEntity(
  ctx: CanvasRenderingContext2D,
  ent: DioramaEntity,
  vp: BoardViewport,
  nowMs: number,
  bossShieldActive = false
): void {
  const cx = vp.boardX + (ent.x + 0.5) * vp.tileSize;
  const cy = vp.boardY + (ent.y + 0.5) * vp.tileSize;
  const bob = ent.isProp ? 0 : Math.sin(nowMs * 0.0045 + ent.bobPhase) * 2.2;
  const s = vp.tileSize * 0.38;

  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.scale(ent.squashX, ent.squashY);

  // Drop shadow bevel
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-s * 0.85, s * 0.65, s * 1.7, s * 0.35);

  if (ent.kind === 'player') {
    // PILEDRIVER MK-IV — Dual heavy caterpillar treads + brass octagonal hull + directional pneumatic ram
    ctx.fillStyle = '#3f342d';
    ctx.strokeStyle = '#14110f';
    ctx.lineWidth = 2;
    // Left & Right Treads
    ctx.fillRect(-s * 0.95, -s * 0.8, s * 0.42, s * 1.6);
    ctx.strokeRect(-s * 0.95, -s * 0.8, s * 0.42, s * 1.6);
    ctx.fillRect(s * 0.53, -s * 0.8, s * 0.42, s * 1.6);
    ctx.strokeRect(s * 0.53, -s * 0.8, s * 0.42, s * 1.6);

    // Main Warm Brass Hull
    ctx.fillStyle = ent.flashTimerMs > 0 ? '#fef3c7' : '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.75);
    ctx.lineTo(s * 0.6, -s * 0.75);
    ctx.lineTo(s * 0.78, 0);
    ctx.lineTo(s * 0.6, s * 0.75);
    ctx.lineTo(-s * 0.6, s * 0.75);
    ctx.lineTo(-s * 0.78, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Directional Hydraulic Ram Piston Arm
    const pdx = ent.facing.dx * s * 0.95;
    const pdy = ent.facing.dy * s * 0.95;
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(pdx - 6, pdy - 6, 12, 12);
    ctx.strokeRect(pdx - 6, pdy - 6, 12, 12);

    // Glowing Cyan Cockpit Visor
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-s * 0.38, -s * 0.28, s * 0.76, s * 0.36);
  } else if (ent.kind === 'barrel') {
    // VOLATILE SLAG BARREL — Octagonal ribbed hazard drum with glowing molten lid
    ctx.fillStyle = '#991b1b';
    ctx.strokeStyle = '#fef2f2';
    ctx.lineWidth = 1.8;
    ctx.fillRect(-s * 0.68, -s * 0.78, s * 1.36, s * 1.56);
    ctx.strokeRect(-s * 0.68, -s * 0.78, s * 1.36, s * 1.56);

    // Amber hazard stripe band
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-s * 0.68, -s * 0.2, s * 1.36, s * 0.4);

    // Glowing volatile diamond core
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.45);
    ctx.lineTo(s * 0.35, 0);
    ctx.lineTo(0, s * 0.45);
    ctx.lineTo(-s * 0.35, 0);
    ctx.closePath();
    ctx.fill();
  } else if (ent.kind === 'pillar') {
    // LOAD-BEARING FOUNDRY PILLAR — Fluted I-beam column with capital rivets
    ctx.fillStyle = '#78716c';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.fillRect(-s * 0.75, -s * 0.85, s * 1.5, s * 0.36);
    ctx.strokeRect(-s * 0.75, -s * 0.85, s * 1.5, s * 0.36);
    ctx.fillRect(-s * 0.52, -s * 0.49, s * 1.04, s * 0.98);
    ctx.strokeRect(-s * 0.52, -s * 0.49, s * 1.04, s * 0.98);
    ctx.fillRect(-s * 0.75, s * 0.49, s * 1.5, s * 0.36);
    ctx.strokeRect(-s * 0.75, s * 0.49, s * 1.5, s * 0.36);
  } else if (ent.kind === 'shock_coil') {
    // HIGH-VOLTAGE TESLA COIL — Copper base + 3 ceramic insulator fins + cyan arc crown
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.8;
    ctx.fillRect(-s * 0.65, -s * 0.2, s * 1.3, s * 0.3);
    ctx.fillRect(-s * 0.55, -s * 0.6, s * 1.1, s * 0.28);
    ctx.fillRect(-s * 0.3, -s * 0.85, s * 0.6, s * 1.65);
    ctx.strokeRect(-s * 0.3, -s * 0.85, s * 0.6, s * 1.65);
  } else if (ent.kind === 'bounty_vault') {
    // OVERCHARGE BULLION VAULT — Gilded safe + emerald crystal prism
    ctx.fillStyle = '#65a30d';
    ctx.strokeStyle = '#ecfccb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9);
    ctx.lineTo(s * 0.82, 0);
    ctx.lineTo(0, s * 0.9);
    ctx.lineTo(-s * 0.82, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-s * 0.28, -s * 0.28, s * 0.56, s * 0.56);
  } else if (ent.kind === 'boss_core') {
    // THE FOUNDRY LEVIATHAN — Multi-part siege furnace boss
    const bScale = 1.22;
    ctx.scale(bScale, bScale);
    ctx.fillStyle = ent.flashTimerMs > 0 ? '#fef3c7' : '#7f1d1d';
    ctx.strokeStyle = bossShieldActive ? '#38bdf8' : '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-s * 0.9, -s * 0.85, s * 1.8, s * 1.7);
    ctx.strokeRect(-s * 0.9, -s * 0.85, s * 1.8, s * 1.7);

    // Furnace grate ribs
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-s * 0.55, -s * 0.45, s * 1.1, s * 0.25);
    ctx.fillRect(-s * 0.55, s * 0.1, s * 1.1, s * 0.25);
  } else if (ent.kind === 'boss_pylon') {
    // FERRO-SHIELD POWER PYLON
    ctx.fillStyle = '#0369a1';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9);
    ctx.lineTo(s * 0.75, s * 0.75);
    ctx.lineTo(-s * 0.75, s * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // ENEMY AUTOMATONS (Bruiser, Sentry, Bomber, Shield Guard)
    const bodyColor =
      ent.flashTimerMs > 0
        ? '#fef3c7'
        : ent.kind === 'bruiser'
          ? '#dc2626'
          : ent.kind === 'sentry'
            ? '#0284c7'
            : ent.kind === 'bomber'
              ? '#ea580c'
              : '#d97706';

    // Articulated Shoulder Pads + Hex Torso
    ctx.fillStyle = '#292524';
    ctx.fillRect(-s * 0.92, -s * 0.5, s * 1.84, s * 0.45);

    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.65, -s * 0.75);
    ctx.lineTo(s * 0.65, -s * 0.75);
    ctx.lineTo(s * 0.82, s * 0.2);
    ctx.lineTo(s * 0.45, s * 0.78);
    ctx.lineTo(-s * 0.45, s * 0.78);
    ctx.lineTo(-s * 0.82, s * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing furnace eye slit
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-s * 0.42, -s * 0.35, s * 0.84, s * 0.24);

    // Bulwark directional riot shield plate
    if (ent.kind === 'shield_guard') {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-s * 0.92, -s * 0.75, s * 0.28, s * 1.5);
      ctx.strokeRect(-s * 0.92, -s * 0.75, s * 0.28, s * 1.5);
    }
  }

  ctx.restore();

  // Draw crisp segmented HP pips below entity
  if (ent.maxHp > 1 || ent.isEnemy || ent.kind === 'player') {
    const pipW = Math.min(12, (vp.tileSize - 12) / Math.max(1, ent.maxHp));
    const totalW = ent.maxHp * pipW;
    const startX = cx - totalW * 0.5;
    const pipY = cy + vp.tileSize * 0.34;

    for (let i = 0; i < ent.maxHp; i++) {
      ctx.fillStyle =
        i < ent.hp
          ? ent.kind === 'player'
            ? '#a3e635'
            : '#ef4444'
          : 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(startX + i * pipW + 1, pipY, Math.max(3, pipW - 2), 5);
    }
  }
}

/**
 * Renders the Live Consequence Oracle trajectory lines, knockback vector arrows, and blast zones.
 */
function drawConsequenceOracleUnderlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  oracle: ConsequenceOracleResult,
  vp: BoardViewport,
  nowMs: number
): void {
  const player = getPlayer(state);
  if (!player) return;

  const hx = vp.boardX + state.hoveredTile.x * vp.tileSize;
  const hy = vp.boardY + state.hoveredTile.y * vp.tileSize;

  // Hovered tile reticle
  ctx.save();
  ctx.strokeStyle = oracle.valid ? '#f59e0b' : 'rgba(239, 68, 68, 0.65)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(hx + 3, hy + 3, vp.tileSize - 6, vp.tileSize - 6);

  if (!oracle.valid) {
    ctx.restore();
    return;
  }

  // Primary Aim Ray from Player to Target
  const px = vp.boardX + (player.x + 0.5) * vp.tileSize;
  const py = vp.boardY + (player.y + 0.5) * vp.tileSize;
  const tx = vp.boardX + (oracle.targetPos.x + 0.5) * vp.tileSize;
  const ty = vp.boardY + (oracle.targetPos.y + 0.5) * vp.tileSize;

  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -(nowMs * 0.03) % 22;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);

  // Render every predicted knockback / slide / bounce arrow in the chain reaction!
  for (const arrow of oracle.knockbackArrows) {
    const ax = vp.boardX + (arrow.from.x + 0.5) * vp.tileSize;
    const ay = vp.boardY + (arrow.from.y + 0.5) * vp.tileSize;
    const bx = vp.boardX + (arrow.to.x + 0.5) * vp.tileSize;
    const by = vp.boardY + (arrow.to.y + 0.5) * vp.tileSize;

    const arrowColor =
      arrow.kind === 'bounce' || arrow.kind === 'bumper'
        ? '#f59e0b'
        : arrow.kind === 'slide'
          ? '#38bdf8'
          : arrow.kind === 'pull'
            ? '#22d3ee'
            : '#fb923c';

    drawVectorArrow(ctx, ax, ay, bx, by, arrowColor);
  }

  // Highlight predicted Barrel Blast 3x3 zones
  for (const ev of oracle.events) {
    if (ev.kind === 'barrel_blast') {
      const bx = vp.boardX + (ev.to.x - 1) * vp.tileSize;
      const by = vp.boardY + (ev.to.y - 1) * vp.tileSize;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.72)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(bx + 2, by + 2, vp.tileSize * 3 - 4, vp.tileSize * 3 - 4);
      ctx.strokeRect(bx + 2, by + 2, vp.tileSize * 3 - 4, vp.tileSize * 3 - 4);
    }
  }

  ctx.restore();
}

function drawConsequenceOracleBadges(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  oracle: ConsequenceOracleResult,
  vp: BoardViewport,
  nowMs: number
): void {
  if (!oracle.valid) return;

  const bob = Math.sin(nowMs * 0.008) * 2.5;

  // Per-entity predicted damage & kill badges
  for (const pred of Object.values(oracle.entityPredictions)) {
    if (pred.badges.length === 0) continue;
    const ex = vp.boardX + (pred.startPos.x + 0.5) * vp.tileSize;
    const ey = vp.boardY + (pred.startPos.y + 0.12) * vp.tileSize + bob;
    const label = pred. killed
      ? pred.hazardKill
        ? `HAZARD KILL! (-${pred.damageTaken})`
        : `KILL! (-${pred.damageTaken})`
      : pred.badges[0];
    const bgColor = pred.killed ? '#ef4444' : '#f59e0b';
    drawPillBadge(ctx, ex, ey, label, '#fef3c7', bgColor, 10.5);
  }

  // Chain summary badge at target tile
  if (oracle.chainCount >= 2) {
    const tx = vp.boardX + (oracle.targetPos.x + 0.5) * vp.tileSize;
    const ty = vp.boardY + (oracle.targetPos.y - 0.12) * vp.tileSize + bob;
    drawPillBadge(
      ctx,
      tx,
      ty,
      `ORACLE: CHAIN x${oracle.chainCount}!`,
      '#14110f',
      '#fbbf24',
      11.5
    );
  }
}

function drawVectorArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 9;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPillBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
  textColor: string,
  bgColor: string,
  fontSize = 11
): void {
  ctx.save();
  ctx.font = `800 ${fontSize}px "Inter", system-ui, sans-serif`;
  const metrics = ctx.measureText(text);
  const w = metrics.width + 14;
  const h = fontSize + 9;
  const rx = cx - w * 0.5;
  const ry = cy - h * 0.5;

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 1.2;
  ctx.fillRect(rx, ry, w, h);
  ctx.strokeRect(rx, ry, w, h);

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 0.5);
  ctx.restore();
}

function drawDiegeticHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  oracle: ConsequenceOracleResult,
  choreo: DioramaChoreographer,
  vp: BoardViewport,
  audioMuted: boolean
): void {
  const player = getPlayer(state);

  // Top Brass Blueprint Header Bar (50px height)
  ctx.fillStyle = 'rgba(18, 14, 12, 0.92)';
  ctx.fillRect(0, 0, vp.width, 50);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 50);
  ctx.lineTo(vp.width, 50);
  ctx.stroke();

  ctx.fillStyle = '#fef3c7';
  ctx.font = '900 14px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${state.roomTitle}  //  TURN ${state.turnNumber}`, 16, 21);

  ctx.fillStyle = '#f59e0b';
  ctx.font = '700 11px "Inter", system-ui, sans-serif';
  ctx.fillText(
    `HULL: ${player?.hp ?? 0}/${player?.maxHp ?? 6}   |   PISTONS (AP): ${state.ap}/${state.maxAp}   |   SCORE: ${state.score}   |   UNBANKED POT: +${state.unbankedBounty} (x${state.greedMultiplier})   |   AUDIO [M]: ${audioMuted ? 'MUTED' : 'ON'}`,
    16,
    39
  );

  // Bottom Tactical Tool Dock (64px height)
  const dockY = vp.height - 62;
  ctx.fillStyle = 'rgba(18, 14, 12, 0.94)';
  ctx.fillRect(0, dockY, vp.width, 62);
  ctx.beginPath();
  ctx.moveTo(0, dockY);
  ctx.lineTo(vp.width, dockY);
  ctx.stroke();

  const buttons: Array<{
    tool: ToolKind | 'overclock' | 'end_turn';
    label: string;
    hotkey: string;
  }> = [
    { tool: 'ram', label: 'PISTON RAM (SHOVE 3)', hotkey: '1' },
    { tool: 'harpoon', label: 'WINCH HARPOON (PULL 3)', hotkey: '2' },
    { tool: 'mortar', label: 'REPULSOR MORTAR (RADIAL)', hotkey: '3' },
    { tool: 'move', label: 'TREAD MOVE (1-2 TILES)', hotkey: '4' },
    { tool: 'overclock', label: `OVERCLOCK (+2 AP / x${state.greedMultiplier * 2})`, hotkey: 'G' },
    { tool: 'end_turn', label: 'BANK POT & END TURN', hotkey: 'B' },
  ];

  const btnW = Math.min(176, Math.floor((vp.width - 40) / buttons.length) - 6);
  const totalW = buttons.length * (btnW + 6);
  let curX = Math.max(12, Math.floor((vp.width - totalW) * 0.5));
  choreo.toolButtons = [];

  for (const b of buttons) {
    const isSelected = state.selectedTool === b.tool;
    const by = dockY + 8;
    const bh = 44;

    choreo.toolButtons.push({
      tool: b.tool,
      x: curX,
      y: by,
      w: btnW,
      h: bh,
      label: b.label,
      hotkey: b.hotkey,
    });

    ctx.fillStyle = isSelected
      ? '#d97706'
      : b.tool === 'overclock'
        ? '#7f1d1d'
        : b.tool === 'end_turn'
          ? '#1e3a8a'
          : '#29201b';
    ctx.strokeStyle = isSelected ? '#fef3c7' : '#78350f';
    ctx.lineWidth = isSelected ? 2 : 1.2;
    ctx.fillRect(curX, by, btnW, bh);
    ctx.strokeRect(curX, by, btnW, bh);

    ctx.fillStyle = '#fef3c7';
    ctx.font = '800 10.5px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`[${b.hotkey}] ${b.label}`, curX + btnW * 0.5, by + 18);

    ctx.fillStyle = isSelected ? '#14110f' : '#cbd5e1';
    ctx.font = '600 9.5px "Inter", system-ui, sans-serif';
    const sub =
      b.tool === 'overclock'
        ? 'Greed Risk: -1 Hull'
        : b.tool === 'end_turn'
          ? `Bank +${state.unbankedBounty}`
          : oracle.valid && isSelected
            ? `Oracle: Chain x${oracle.chainCount}`
            : 'Click Board to Fire';
    ctx.fillText(sub, curX + btnW * 0.5, by + 33);

    curX += btnW + 6;
  }
}

function drawRelicDraftOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  choreo: DioramaChoreographer,
  vp: BoardViewport
): void {
  ctx.fillStyle = 'rgba(10, 8, 7, 0.86)';
  ctx.fillRect(0, 0, vp.width, vp.height);

  ctx.fillStyle = '#fef3c7';
  ctx.font = '900 22px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `SECTOR 0${state.roomNumber} CLEARED — DRAFT A RULE-BENDING RELIC`,
    vp.width * 0.5,
    vp.height * 0.22
  );

  ctx.fillStyle = '#f59e0b';
  ctx.font = '700 13px "Inter", system-ui, sans-serif';
  ctx.fillText(
    'Zero flat stat boosts. Every relic rewrites the physical domino laws of the foundry. Press [1], [2], or [3] or Click a Card:',
    vp.width * 0.5,
    vp.height * 0.27
  );

  const cardW = Math.min(250, Math.floor((vp.width - 64) / 3));
  const cardH = 210;
  const totalW = state.relicChoices.length * (cardW + 16) - 16;
  let startX = Math.floor((vp.width - totalW) * 0.5);
  const cardY = Math.floor(vp.height * 0.34);

  choreo.relicCards = [];
  state.relicChoices.forEach((relicId, idx) => {
    const def = RELIC_CATALOG.find((r) => r.id === relicId)!;
    choreo.relicCards.push({
      relicId,
      x: startX,
      y: cardY,
      w: cardW,
      h: cardH,
    });

    ctx.fillStyle = '#231c18';
    ctx.strokeStyle = def.accentColor;
    ctx.lineWidth = 2.5;
    ctx.fillRect(startX, cardY, cardW, cardH);
    ctx.strokeRect(startX, cardY, cardW, cardH);

    ctx.fillStyle = def.accentColor;
    ctx.font = '900 13px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`[${idx + 1}] ${def.name}`, startX + 14, cardY + 28);

    ctx.fillStyle = '#fef3c7';
    ctx.font = '700 10px "Inter", system-ui, sans-serif';
    ctx.fillText(`RULE MODIFIER // ${def.tag}`, startX + 14, cardY + 48);

    // Wrap ruleText cleanly
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 11.5px "Inter", system-ui, sans-serif';
    wrapCanvasText(ctx, def.ruleText, startX + 14, cardY + 74, cardW - 28, 17);

    startX += cardW + 16;
  });
}

function drawPostMortemOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  vp: BoardViewport
): void {
  ctx.fillStyle = 'rgba(10, 8, 7, 0.88)';
  ctx.fillRect(0, 0, vp.width, vp.height);

  const boxW = Math.min(540, vp.width - 32);
  const boxH = 310;
  const bx = Math.floor((vp.width - boxW) * 0.5);
  const by = Math.floor((vp.height - boxH) * 0.5);

  ctx.fillStyle = '#1f1815';
  ctx.strokeStyle = state.phase === 'victory' ? '#a3e635' : '#ef4444';
  ctx.lineWidth = 3;
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeRect(bx, by, boxW, boxH);

  ctx.fillStyle = state.phase === 'victory' ? '#a3e635' : '#ef4444';
  ctx.font = '900 22px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    state.phase === 'victory'
      ? 'FOUNDRY LIBERATED // RUN VICTORY!'
      : 'RIG HULL BREACHED // POST-MORTEM REPORT',
    bx + boxW * 0.5,
    by + 38
  );

  const lines = [
    `Final Bullion Score: ${state.score}`,
    `Best Single-Turn Chain Reaction: ${state.bestChainDescription}`,
    `Environmental Kills vs. Direct Kills: ${state.environmentalKills} Hazard  /  ${state.directKills} Direct`,
    `Overcharge Vaults Cracked: ${state.vaultsCrackedTotal}`,
    `Active Rule-Bending Relics: ${state.activeRelics.length > 0 ? state.activeRelics.join(', ') : 'None'}`,
    `Cause of Termination: ${state.causeOfTermination}`,
  ];

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fef3c7';
  ctx.font = '600 13px "Inter", system-ui, sans-serif';
  lines.forEach((line, idx) => {
    ctx.fillText(line, bx + 26, by + 82 + idx * 30);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 14px "Inter", system-ui, sans-serif';
  ctx.fillText(
    'PRESS [R] OR [SPACE] FOR INSTANT "ONE MORE RUN" RESTART',
    bx + boxW * 0.5,
    by + boxH - 24
  );
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = w;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}
