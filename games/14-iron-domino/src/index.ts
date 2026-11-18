/**
 * IRONBREAKER // DOMINO FOUNDRY — Main Interactive Entry Point & DOM Controller
 * Connects deterministic simulation + Consequence Oracle (simulation.ts),
 * HTML5 Canvas Diorama Renderer + Choreographer (ui.ts), and Web Audio Foley (audio.ts).
 */

import type { ArgonGameInstance, ArgonGameMetadata } from '../../shared-contract';
import { FoundryAudioEngine } from './audio';
import {
  ConsequenceOracleResult,
  GameState,
  ToolKind,
  createInitialState,
  executeAction,
  inBounds,
  previewAction,
} from './simulation';
import {
  BoardViewport,
  DioramaChoreographer,
  computeBoardViewport,
  renderDiorama,
  screenToGridTile,
} from './ui';

export const metadata: ArgonGameMetadata = {
  id: '14-iron-domino',
  number: 14,
  title: 'IRONBREAKER // DOMINO FOUNDRY',
  subtitle: 'Deterministic Knockback & Environmental Domino Tactics',
  genre: 'Systemic Chain-Reaction Tactical Toy (Into the Breach × Bomberman × Pinball)',
  primaryReference: 'Into the Breach + Bomberman',
  supportingReference: 'Pinball + Heat Signature',
  oneSentenceLoop:
    'Aim your Piledriver Rig using the deterministic Consequence Oracle to shove, harpoon, and ricochet enemies through volatile slag barrels, collapsing pillars, conductive coolant pools, and pinball bumpers, then decide whether to bank your combo bounty safely or Overclock your reactor for double payout.',
  shortGoal:
    'Trigger multi-step environmental chain reactions and crack optional Overcharge Vaults across 4 foundry sectors.',
  longGoal:
    'Draft rule-bending physical relics (Rubberized Walls, Chain Polarity, Domino Encore) and shatter the Foundry Leviathan Boss Contraption in Sector 05.',
  controlsSummary:
    'Mouse Hover: Live Consequence Oracle Preview | Left-Click / Space: Execute | [1-4]: Switch Tool | [G]: Overclock | [B/E]: Bank & End Turn | [M]: Mute | [R]: Restart',
  accentColor: '#f59e0b',
};

export interface DominoFoundryInstance extends ArgonGameInstance {
  getState(): GameState;
  getOraclePreview(): ConsequenceOracleResult;
  dispatchAction(action: Parameters<typeof executeAction>[1]): ReturnType<typeof executeAction>;
}

export function mountGame(
  container: HTMLElement,
  options?: { initialSeed?: number; debug?: boolean }
): DominoFoundryInstance {
  const initialSeed = options?.initialSeed ?? 20261108;
  const audio = new FoundryAudioEngine(false);
  const choreo = new DioramaChoreographer();
  let state: GameState = createInitialState(initialSeed);
  let oracle: ConsequenceOracleResult = previewAction(state);

  container.innerHTML = `
    <style>
      .df-stage {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 100dvh;
        background: #120f0d;
        color: #fef3c7;
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
        /* Efficient Background Processing per modern-web-guidance */
        content-visibility: auto;
        contain-intrinsic-size: auto none auto 720px;
      }

      .df-canvas {
        display: block;
        width: 100%;
        height: 100%;
        cursor: crosshair;
        touch-action: none;
      }

      .df-top-actions {
        position: absolute;
        top: 10px;
        right: 14px;
        display: flex;
        gap: 8px;
        z-index: 10;
      }

      .df-btn {
        min-block-size: 28px;
        min-inline-size: 28px;
        padding: 6px 11px;
        background: #27201c;
        border: 1.5px solid #f59e0b;
        color: #fef3c7;
        font: 800 11px/1 "Inter", system-ui, sans-serif;
        cursor: pointer;
      }

      .df-btn:hover {
        background: #d97706;
        color: #120f0d;
      }

      .df-btn:focus-visible,
      .df-canvas:focus-visible {
        outline: 3px solid #38bdf8;
        outline-offset: 3px;
      }

      .visually-hidden:where(:not(:focus-within, :active)) {
        position: absolute !important;
        clip-path: inset(50%) !important;
        overflow: hidden !important;
        width: 1px !important;
        height: 1px !important;
        margin: -1px !important;
        padding: 0 !important;
        border: 0 !important;
        white-space: nowrap !important;
      }
    </style>
    <div class="df-stage" id="df-stage-root">
      <h1 class="visually-hidden">Ironbreaker: Domino Foundry Tactical Diorama</h1>
      <div id="df-live-status" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>
      <canvas
        class="df-canvas"
        id="df-canvas"
        tabindex="0"
        aria-label="Ironbreaker Domino Foundry 8 by 8 Tactical Board"
      ></canvas>
      <div class="df-top-actions">
        <button type="button" class="df-btn" id="df-btn-mute" aria-pressed="false">[M] AUDIO: ON</button>
        <button type="button" class="df-btn" id="df-btn-overclock">[G] OVERCLOCK</button>
        <button type="button" class="df-btn" id="df-btn-bank">[B] BANK TURN</button>
        <button type="button" class="df-btn" id="df-btn-restart">[R] RESTART</button>
      </div>
    </div>
  `;

  const stageRoot = container.querySelector<HTMLElement>('#df-stage-root')!;
  const canvas = container.querySelector<HTMLCanvasElement>('#df-canvas')!;
  const liveStatus = container.querySelector<HTMLElement>('#df-live-status')!;
  const btnMute = container.querySelector<HTMLButtonElement>('#df-btn-mute')!;
  const btnOverclock = container.querySelector<HTMLButtonElement>('#df-btn-overclock')!;
  const btnBank = container.querySelector<HTMLButtonElement>('#df-btn-bank')!;
  const btnRestart = container.querySelector<HTMLButtonElement>('#df-btn-restart')!;
  const ctx = canvas.getContext('2d');

  let viewport: BoardViewport = computeBoardViewport(960, 720);
  let rafId: number | null = null;
  let isPaused = false;
  let lastFrameMs = performance.now();

  function announce(msg: string): void {
    liveStatus.textContent = msg;
  }

  function recomputeOracle(): void {
    oracle = previewAction(state, state.selectedTool, state.hoveredTile.x, state.hoveredTile.y);
  }

  function syncCanvasSize(): void {
    const rect = stageRoot.getBoundingClientRect();
    const w = Math.max(640, Math.floor(rect.width || window.innerWidth || 960));
    const h = Math.max(520, Math.floor(rect.height || window.innerHeight || 720));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    viewport = computeBoardViewport(canvas.width, canvas.height);
  }

  function renderNow(nowMs = performance.now()): void {
    if (!ctx) return;
    renderDiorama(ctx, state, oracle, choreo, viewport, nowMs, audio.isMuted());
  }

  function performAction(action: Parameters<typeof executeAction>[1]): ReturnType<typeof executeAction> {
    const res = executeAction(state, action);
    if (res.valid) {
      choreo.enqueueChainEvents(res.events, state, audio);
      recomputeOracle();
      announce(state.lastBannerText);
    } else {
      audio.playAimRatchet(0);
    }
    renderNow();
    return res;
  }

  const onPointerMove = (e: MouseEvent): void => {
    if (state.phase !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const tile = screenToGridTile(e.clientX, e.clientY, rect, viewport);
    if (tile && (tile.x !== state.hoveredTile.x || tile.y !== state.hoveredTile.y)) {
      state.hoveredTile = tile;
      audio.playAimRatchet(tile.x + tile.y);
      recomputeOracle();
      renderNow();
    }
  };

  const onPointerDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    // 1. Check if in Relic Draft phase and clicking a card
    if (state.phase === 'relic_draft') {
      for (const card of choreo.relicCards) {
        if (
          localX >= card.x &&
          localX <= card.x + card.w &&
          localY >= card.y &&
          localY <= card.y + card.h
        ) {
          performAction({ type: 'select_relic', relicId: card.relicId });
          return;
        }
      }
      return;
    }

    // 2. Check if in Victory/Defeat post-mortem
    if (state.phase === 'victory' || state.phase === 'defeat') {
      state = createInitialState(state.seed + 1);
      recomputeOracle();
      renderNow();
      return;
    }

    // 3. Check Bottom Dock Tool Buttons
    for (const btn of choreo.toolButtons) {
      if (
        localX >= btn.x &&
        localX <= btn.x + btn.w &&
        localY >= btn.y &&
        localY <= btn.y + btn.h
      ) {
        if (btn.tool === 'overclock') {
          performAction({ type: 'overclock_turn' });
        } else if (btn.tool === 'end_turn') {
          performAction({ type: 'end_turn' });
        } else {
          state.selectedTool = btn.tool;
          audio.playAimRatchet(2);
          recomputeOracle();
          renderNow();
        }
        return;
      }
    }

    // 4. Check Board Tile Click
    const tile = screenToGridTile(e.clientX, e.clientY, rect, viewport);
    if (tile) {
      state.hoveredTile = tile;
      recomputeOracle();
      performAction({
        type: 'use_tool',
        tool: state.selectedTool,
        targetX: tile.x,
        targetY: tile.y,
      });
    }
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();

    if (key === 'm') {
      const muted = audio.toggleMute();
      btnMute.setAttribute('aria-pressed', String(muted));
      btnMute.textContent = `[M] AUDIO: ${muted ? 'MUTED' : 'ON'}`;
      renderNow();
      return;
    }

    if (key === 'r') {
      state = createInitialState(state.seed);
      recomputeOracle();
      announce('Sector restarted.');
      renderNow();
      return;
    }

    if (state.phase === 'victory' || state.phase === 'defeat') {
      if (key === ' ' || key === 'enter') {
        e.preventDefault();
        state = createInitialState(state.seed + 1);
        recomputeOracle();
        renderNow();
      }
      return;
    }

    if (state.phase === 'relic_draft') {
      if (key === '1' || key === '2' || key === '3') {
        const idx = Number(key) - 1;
        const chosen = state.relicChoices[idx];
        if (chosen) {
          performAction({ type: 'select_relic', relicId: chosen });
        }
      }
      return;
    }

    if (key === '1') {
      state.selectedTool = 'ram';
      audio.playAimRatchet(1);
      recomputeOracle();
      renderNow();
    } else if (key === '2') {
      state.selectedTool = 'harpoon';
      audio.playAimRatchet(2);
      recomputeOracle();
      renderNow();
    } else if (key === '3') {
      state.selectedTool = 'mortar';
      audio.playAimRatchet(3);
      recomputeOracle();
      renderNow();
    } else if (key === '4') {
      state.selectedTool = 'move';
      audio.playAimRatchet(4);
      recomputeOracle();
      renderNow();
    } else if (key === 'g') {
      performAction({ type: 'overclock_turn' });
    } else if (key === 'b' || key === 'e') {
      performAction({ type: 'end_turn' });
    } else if (key === ' ' || key === 'enter') {
      e.preventDefault();
      performAction({
        type: 'use_tool',
        tool: state.selectedTool,
        targetX: state.hoveredTile.x,
        targetY: state.hoveredTile.y,
      });
    } else if (
      key === 'arrowup' ||
      key === 'w' ||
      key === 'arrowdown' ||
      key === 's' ||
      key === 'arrowleft' ||
      key === 'a' ||
      key === 'arrowright' ||
      key === 'd'
    ) {
      e.preventDefault();
      const dx = key === 'arrowright' || key === 'd' ? 1 : key === 'arrowleft' || key === 'a' ? -1 : 0;
      const dy = key === 'arrowdown' || key === 's' ? 1 : key === 'arrowup' || key === 'w' ? -1 : 0;
      const nx = state.hoveredTile.x + dx;
      const ny = state.hoveredTile.y + dy;
      if (inBounds(nx, ny)) {
        state.hoveredTile = { x: nx, y: ny };
        audio.playAimRatchet(nx + ny);
        recomputeOracle();
        renderNow();
      }
    }
  };

  const onMuteClick = (): void => {
    const muted = audio.toggleMute();
    btnMute.setAttribute('aria-pressed', String(muted));
    btnMute.textContent = `[M] AUDIO: ${muted ? 'MUTED' : 'ON'}`;
    renderNow();
  };

  const onOverclockClick = (): void => {
    performAction({ type: 'overclock_turn' });
  };

  const onBankClick = (): void => {
    performAction({ type: 'end_turn' });
  };

  const onRestartClick = (): void => {
    state = createInitialState(state.seed);
    recomputeOracle();
    renderNow();
  };

  const onResize = (): void => {
    syncCanvasSize();
    renderNow();
  };

  function startLoop(): void {
    if (rafId !== null) return;
    isPaused = false;
    lastFrameMs = performance.now();
    const tick = (nowMs: number): void => {
      if (isPaused) {
        rafId = null;
        return;
      }
      const dtMs = Math.min(50, Math.max(1, nowMs - lastFrameMs));
      lastFrameMs = nowMs;
      choreo.update(dtMs, state, audio);
      renderNow(nowMs);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop(): void {
    isPaused = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Efficient Background Processing per modern-web-guidance:
  // Listen directly on stageRoot for contentvisibilityautostatechange, with IntersectionObserver fallback
  const onContentVisibilityChange = (event: Event): void => {
    const cvEvent = event as Event & { skipped?: boolean };
    if (cvEvent.skipped) {
      stopLoop();
    } else {
      startLoop();
    }
  };
  stageRoot.addEventListener('contentvisibilityautostatechange', onContentVisibilityChange);

  let intersectionObserver: IntersectionObserver | null = null;
  const isContentVisibilitySupported =
    typeof document !== 'undefined' && 'contentVisibility' in document.documentElement.style;
  if (!isContentVisibilitySupported && typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            startLoop();
          } else {
            stopLoop();
          }
        }
      },
      { rootMargin: '200px' }
    );
    intersectionObserver.observe(stageRoot);
  }

  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mousedown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  btnMute.addEventListener('click', onMuteClick);
  btnOverclock.addEventListener('click', onOverclockClick);
  btnBank.addEventListener('click', onBankClick);
  btnRestart.addEventListener('click', onRestartClick);

  syncCanvasSize();
  recomputeOracle();
  renderNow();
  startLoop();

  return {
    getState(): GameState {
      return state;
    },
    getOraclePreview(): ConsequenceOracleResult {
      return oracle;
    },
    dispatchAction(action) {
      return performAction(action);
    },
    getStateSnapshot() {
      return {
        roomNumber: state.roomNumber,
        turnNumber: state.turnNumber,
        phase: state.phase,
        score: state.score,
        unbankedBounty: state.unbankedBounty,
        bestSingleTurnChain: state.bestSingleTurnChain,
        environmentalKills: state.environmentalKills,
        directKills: state.directKills,
        activeRelics: [...state.activeRelics],
      };
    },
    restartWithSeed(seed: number) {
      state = createInitialState(seed);
      recomputeOracle();
      renderNow();
    },
    toggleDebug() {
      renderNow();
    },
    destroy() {
      stopLoop();
      stageRoot.removeEventListener('contentvisibilityautostatechange', onContentVisibilityChange);
      if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
      }
      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      btnMute.removeEventListener('click', onMuteClick);
      btnOverclock.removeEventListener('click', onOverclockClick);
      btnBank.removeEventListener('click', onBankClick);
      btnRestart.removeEventListener('click', onRestartClick);
      audio.destroy();
      container.innerHTML = '';
    },
  };
}
