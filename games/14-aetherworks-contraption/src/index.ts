import {
  ArgonGameInstance,
  ArgonGameMetadata,
  ArgonGameModule,
} from '../../shared-contract';
import {
  computeLayout,
  getTrayModulePosition,
  renderWorkbench,
  WorkbenchLayout,
} from './renderer';
import {
  cashOutCruciblePot,
  ContraptionModule,
  ContraptionState,
  createInitialState,
  dropModuleOnSocket,
  getModuleAtSocket,
  pickupModule,
  pullLaunchLever,
  rotateModule,
  selectBlueprintCard,
  stepSimulation,
  triggerOverclockRecycle,
} from './sim';
import { ClockworkSynth } from './synth';

export const metadata: ArgonGameMetadata = {
  id: '14-clockwork-crucible',
  number: 14,
  title: 'AETHERWORKS // CLOCKWORK CRUCIBLE',
  subtitle: 'Tactile Clockwork Contraption & Chain-Reaction Roguelike',
  genre: 'Tactile Clockwork Contraption & Synergistic Chain-Reaction Puzzle-Roguelike',
  primaryReference: 'Opus Magnum',
  supportingReference: 'Balatro × Mini Metro',
  oneSentenceLoop:
    'Snap and rotate brass contraption modules on a watchmaker workbench, pull the heavy spring lever to cascade Aether orbs through splitting and transmuting chain reactions, and push your luck on the Overclock Recycle Valve before the boiler blows.',
  shortGoal: 'Beat the Quota 1 score target (120) within 3 cycles on the 3×3 workbench.',
  longGoal:
    'Expand your workbench from 3×3 to 6×5 across escalating Boss Quotas by drafting transformative Blueprints and Relics.',
  controlsSummary:
    'Drag / Click to snap parts • Right-Click / Scroll / [R] to Rotate • Pull Launch Lever • Hold Overclock Valve or [Space] to 2× Recycle',
  accentColor: '#fbbf24',
};

export function mountGame(
  container: HTMLElement,
  options?: { initialSeed?: number; debug?: boolean }
): ArgonGameInstance {
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  canvas.setAttribute('aria-label', 'Clockwork Crucible Mechanical Workbench');
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const synth = new ClockworkSynth();

  let state: ContraptionState = createInitialState(options?.initialSeed ?? 1337);
  let width = container.clientWidth || window.innerWidth || 1024;
  let height = container.clientHeight || window.innerHeight || 720;
  let layout: WorkbenchLayout = computeLayout(width, height, state);

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = container.clientWidth || window.innerWidth || 1024;
    height = container.clientHeight || window.innerHeight || 720;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    layout = computeLayout(width, height, state);
  };
  resize();
  window.addEventListener('resize', resize);

  const flushAudioQueue = () => {
    while (state.audioQueue.length > 0) {
      const ev = state.audioQueue.shift()!;
      switch (ev.type) {
        case 'pickup_clack':
          synth.playPickupClack();
          break;
        case 'ratchet_click':
          synth.playRatchetClick(ev.angleDeg);
          break;
        case 'socket_seat':
          synth.playSocketSeat(ev.neighborCount);
          break;
        case 'lever_thunk':
          synth.playLeverThunk();
          break;
        case 'cascade_note':
          synth.playCascadeNote(ev.activationIndex, ev.tier);
          break;
        case 'overclock_recycle':
          synth.playOverclockRecycle(ev.multiplier);
          break;
        case 'pneumatic_cashout':
          synth.playPneumaticCashOut(ev.multiplier);
          break;
        case 'gasket_blowout':
          synth.playGasketBlowout();
          break;
      }
    }
  };

  const getPointerPos = (e: MouseEvent | PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const findModuleAtPoint = (px: number, py: number): ContraptionModule | null => {
    // Check grid sockets first
    const gx = (px - layout.gridLeft) / layout.cellSize;
    const gy = (py - layout.gridTop) / layout.cellSize;
    if (gx >= 0 && gx < state.gridCols && gy >= 0 && gy < state.gridRows) {
      const col = Math.floor(gx);
      const row = Math.floor(gy);
      const m = getModuleAtSocket(state, col, row);
      if (m) return m;
    }

    // Check parts tray
    const unplaced = state.modules.filter((m) => m.col === null || m.row === null);
    for (let i = 0; i < unplaced.length; i++) {
      const pos = getTrayModulePosition(layout, i);
      if (Math.hypot(px - pos.x, py - pos.y) <= layout.traySlotSize * 0.52) {
        return unplaced[i];
      }
    }
    return null;
  };

  const onPointerMove = (e: PointerEvent) => {
    const { x, y } = getPointerPos(e);
    layout = computeLayout(width, height, state);

    const gx = (x - layout.gridLeft) / layout.cellSize;
    const gy = (y - layout.gridTop) / layout.cellSize;
    state.cursorGridX = gx;
    state.cursorGridY = gy;

    if (gx >= 0 && gx < state.gridCols && gy >= 0 && gy < state.gridRows) {
      state.hoveredSocket = { col: Math.floor(gx), row: Math.floor(gy) };
    } else {
      state.hoveredSocket = null;
    }

    if (state.isDraggingLever) {
      const trackTop = layout.leverBox.y + 24;
      const trackH = Math.max(40, layout.leverBox.h - 48);
      state.leverPull = Math.max(0, Math.min(1, (y - trackTop) / trackH));
      if (state.leverPull >= 0.78 && state.phase === 'wiring') {
        pullLaunchLever(state);
        flushAudioQueue();
      }
      return;
    }

    if (state.phase === 'draft') {
      layout.draftCardBoxes.forEach((box, idx) => {
        if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
          state.hoveredDraftIndex = idx;
        }
      });
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    const { x, y } = getPointerPos(e);
    layout = computeLayout(width, height, state);

    // Right click rotates hovered or selected module immediately
    if (e.button === 2) {
      e.preventDefault();
      const targetMod = findModuleAtPoint(x, y);
      rotateModule(state, targetMod ? targetMod.id : undefined, 1);
      flushAudioQueue();
      return;
    }

    if (state.phase === 'gameover') {
      state = createInitialState(state.seed + 1);
      layout = computeLayout(width, height, state);
      return;
    }

    if (state.phase === 'draft') {
      for (let i = 0; i < layout.draftCardBoxes.length; i++) {
        const box = layout.draftCardBoxes[i];
        if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
          selectBlueprintCard(state, i);
          layout = computeLayout(width, height, state);
          flushAudioQueue();
          return;
        }
      }
      return;
    }

    // Check Overclock Valve wheel click/hold
    const distToValve = Math.hypot(x - layout.valveBox.x, y - layout.valveBox.y);
    if (distToValve <= layout.valveBox.r + 14) {
      state.overclockValveHeld = true;
      if (state.phase === 'cascade' && state.orbs.length === 0 && state.cruciblePot > 0) {
        triggerOverclockRecycle(state);
      }
      flushAudioQueue();
      return;
    }

    // Check Cash-Out / Bank Now button below valve
    const cb = layout.cashOutBox;
    if (x >= cb.x && x <= cb.x + cb.w && y >= cb.y && y <= cb.y + cb.h) {
      if (state.phase === 'cascade' && state.cruciblePot > 0) {
        cashOutCruciblePot(state);
        flushAudioQueue();
      }
      return;
    }

    // Check Launch Lever box
    const lb = layout.leverBox;
    if (x >= lb.x - 10 && x <= lb.x + lb.w + 10 && y >= lb.y - 10 && y <= lb.y + lb.h + 10) {
      if (state.phase === 'wiring') {
        state.isDraggingLever = true;
        state.leverPull = 0.45;
      }
      return;
    }

    // Check Module pickup or socket click
    if (state.phase === 'wiring') {
      const hitMod = findModuleAtPoint(x, y);
      const gx = (x - layout.gridLeft) / layout.cellSize;
      const gy = (y - layout.gridTop) / layout.cellSize;

      if (hitMod) {
        pickupModule(state, hitMod.id, gx, gy);
        canvas.style.cursor = 'grabbing';
        flushAudioQueue();
        return;
      }

      // If clicking an empty socket while a tray module is selected, snap it right in!
      if (
        state.hoveredSocket &&
        state.selectedModuleId &&
        !getModuleAtSocket(state, state.hoveredSocket.col, state.hoveredSocket.row)
      ) {
        dropModuleOnSocket(
          state,
          state.selectedModuleId,
          state.hoveredSocket.col,
          state.hoveredSocket.row
        );
        flushAudioQueue();
      }
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const { x, y } = getPointerPos(e);
    layout = computeLayout(width, height, state);
    canvas.style.cursor = 'grab';

    if (state.isDraggingLever) {
      state.isDraggingLever = false;
      if (state.phase === 'wiring') {
        pullLaunchLever(state);
        flushAudioQueue();
      }
    }

    if (state.overclockValveHeld) {
      state.overclockValveHeld = false;
      if (state.phase === 'cascade' && state.orbs.length === 0 && state.cruciblePot > 0) {
        cashOutCruciblePot(state);
        flushAudioQueue();
      }
    }

    if (state.draggedModuleId) {
      const gx = (x - layout.gridLeft) / layout.cellSize;
      const gy = (y - layout.gridTop) / layout.cellSize;
      if (gx >= 0 && gx < state.gridCols && gy >= 0 && gy < state.gridRows) {
        dropModuleOnSocket(state, state.draggedModuleId, Math.floor(gx), Math.floor(gy));
      } else {
        dropModuleOnSocket(state, state.draggedModuleId, null, null);
      }
      flushAudioQueue();
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const { x, y } = getPointerPos(e);
    const hoverMod = findModuleAtPoint(x, y);
    const dir = e.deltaY >= 0 ? 1 : -1;
    rotateModule(state, hoverMod ? hoverMod.id : undefined, dir);
    flushAudioQueue();
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (state.phase === 'gameover' && (e.key === 'r' || e.key === 'R' || e.key === ' ')) {
      state = createInitialState(state.seed + 1);
      layout = computeLayout(width, height, state);
      return;
    }

    if (state.phase === 'draft') {
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        selectBlueprintCard(state, Number(e.key) - 1);
        layout = computeLayout(width, height, state);
        flushAudioQueue();
      } else if (e.key === 'ArrowLeft') {
        state.hoveredDraftIndex = (state.hoveredDraftIndex + 2) % 3;
      } else if (e.key === 'ArrowRight') {
        state.hoveredDraftIndex = (state.hoveredDraftIndex + 1) % 3;
      } else if (e.key === ' ' || e.key === 'Enter') {
        selectBlueprintCard(state, state.hoveredDraftIndex);
        layout = computeLayout(width, height, state);
        flushAudioQueue();
      }
      return;
    }

    if (e.key === 'r' || e.key === 'R') {
      rotateModule(state, undefined, 1);
      flushAudioQueue();
    } else if (e.key === ' ') {
      e.preventDefault();
      if (state.phase === 'wiring') {
        if (state.draggedModuleId) {
          rotateModule(state, state.draggedModuleId, 1);
        } else {
          pullLaunchLever(state);
        }
        flushAudioQueue();
      } else if (state.phase === 'cascade') {
        state.overclockValveHeld = true;
        if (state.orbs.length === 0 && state.cruciblePot > 0) {
          triggerOverclockRecycle(state);
          flushAudioQueue();
        }
      }
    } else if (e.key === 'Enter' && state.phase === 'wiring') {
      pullLaunchLever(state);
      flushAudioQueue();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ' && state.overclockValveHeld) {
      state.overclockValveHeld = false;
      if (state.phase === 'cascade' && state.orbs.length === 0 && state.cruciblePot > 0) {
        cashOutCruciblePot(state);
        flushAudioQueue();
      }
    }
  };

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  let rafId = 0;
  let lastTime = performance.now();

  const frame = (now: number) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    stepSimulation(state, dt);
    flushAudioQueue();

    if (ctx) {
      layout = computeLayout(width, height, state);
      renderWorkbench(ctx, state, layout);
    }

    rafId = requestAnimationFrame(frame);
  };

  // Immediate first render so workbench is visible in < 1 frame
  if (ctx) {
    renderWorkbench(ctx, state, layout);
  }
  rafId = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
    getStateSnapshot() {
      return state;
    },
    restartWithSeed(seed: number) {
      state = createInitialState(seed);
      layout = computeLayout(width, height, state);
    },
  };
}

const gameModule: ArgonGameModule = {
  metadata,
  mountGame,
};

export default gameModule;
