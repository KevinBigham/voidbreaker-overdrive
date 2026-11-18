import type {
  ArgonGameInstance,
  ArgonGameMetadata,
} from '../../shared-contract';
import { CathodeAudioEngine } from './audio';
import {
  WorkbenchTransform,
  computeWorkbenchTransform,
  renderCathodeWorkbench,
} from './renderer';
import {
  CathodeWorkbenchState,
  DeskContrabandTool,
  MAGNETIC_PULL_RADIUS,
  MAGNETIC_SNAP_RADIUS,
  SOCKETS,
  applyContrabandToolToSocket,
  claimSupplyDrawerToolAndAdvanceChamber,
  createInitialState,
  executePlungerTurn,
  setRouteSwitch,
  stepUpTransformerCrank,
  stepWorkbenchSimulation,
  wakeUpContraption,
} from './simulation';

export const metadata: ArgonGameMetadata = {
  id: '14-cathode-roulette',
  number: 14,
  title: 'CATHODE ROULETTE // THE TESLA VALUATION',
  subtitle: 'Tactile Brass Workbench & High-Stakes Contraption Thriller',
  genre: 'Tactile Workbench & Push-Your-Luck Contraption Thriller',
  primaryReference: 'Buckshot Roulette + Inscryption',
  supportingReference: 'Papers, Please + Opus Magnum',
  oneSentenceLoop:
    'Inspect the high-voltage batch loaded into the revolving brass feeder drum, manipulate physical contraband tools on the felt workbench, flip the heavy copper route knife-switch or crank the step-up transformer, and physically pull down the Commit Plunger to tip the brass balance scale before your glass vacuum fuses shatter.',
  shortGoal:
    'Slot the glowing brass ignition cartridge to wake the machine and tip the Chamber 01 Brass Balance Scale past 450g.',
  longGoal:
    'Survive escalating chambers by counting live, blank, and volatile cores and chaining physical contraband tools (X-Ray Loupe, Copper Jumper Clamp, Polarity Inverter Magnet, Lead Blast Shield, 3X Overclock Weight).',
  controlsSummary:
    '100% Mouse Manipulation: Grab, Drag, Slot (<28px Magnetic Snap), Flip Route Switch, Crank Step-Up Wheel, and Pull Down + Release the Commit Plunger (plus Keyboard shortcuts Space / V / G / C / M / R).',
  accentColor: '#f59e0b',
};

const STORAGE_BEST_KEY = 'cathode_roulette_best_grams_v1';

export function mountGame(
  container: HTMLElement,
  options?: { initialSeed?: number; debug?: boolean }
): ArgonGameInstance {
  const initialSeed = options?.initialSeed ?? 20261108;
  const audio = new CathodeAudioEngine();
  let state: CathodeWorkbenchState = createInitialState(initialSeed);

  try {
    const savedBest = Number(localStorage.getItem(STORAGE_BEST_KEY) ?? '0');
    if (Number.isFinite(savedBest) && savedBest > 0) {
      state.bestGramsRecord = savedBest;
    }
  } catch {
    // Ignore storage errors in restricted environments
  }

  // Zero-DOM Diegetic UI: Only the stage container and full-bleed 100vw x 100vh Canvas exist!
  container.innerHTML = `
    <style>
      .cr-workbench-stage {
        position: relative;
        width: 100vw;
        height: 100dvh;
        min-height: 100vh;
        background: #090705;
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        /* Efficient Background Processing per modern-web-guidance */
        content-visibility: auto;
        contain-intrinsic-size: auto none auto 800px;
      }

      .cr-workbench-canvas {
        display: block;
        width: 100%;
        height: 100%;
        cursor: grab;
      }

      .cr-workbench-canvas:active {
        cursor: grabbing;
      }
    </style>
    <div class="cr-workbench-stage" id="cr-stage-root">
      <canvas
        class="cr-workbench-canvas"
        id="cr-canvas"
        aria-label="Cathode Roulette Tactile Brass Workbench"
      ></canvas>
    </div>
  `;

  const stageRoot = container.querySelector<HTMLElement>('#cr-stage-root')!;
  const canvas = container.querySelector<HTMLCanvasElement>('#cr-canvas')!;
  const ctx = canvas.getContext('2d')!;

  let viewportW = 1280;
  let viewportH = 800;
  let lastTransform: WorkbenchTransform = computeWorkbenchTransform(viewportW, viewportH);

  const reducedMotionQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  function resizeCanvas(): void {
    const rect = stageRoot.getBoundingClientRect();
    viewportW = Math.max(320, Math.floor(rect.width || window.innerWidth || 1280));
    viewportH = Math.max(320, Math.floor(rect.height || window.innerHeight || 800));
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    canvas.width = Math.floor(viewportW * dpr);
    canvas.height = Math.floor(viewportH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastTransform = computeWorkbenchTransform(viewportW, viewportH);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function clientToDesk(clientX: number, clientY: number): { dx: number; dy: number } {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { offsetX, offsetY, scale } = computeWorkbenchTransform(viewportW, viewportH);
    return {
      dx: (px - offsetX) / (scale || 1),
      dy: (py - offsetY) / (scale || 1),
    };
  }

  function persistBestGrams(): void {
    try {
      if (state.bestGramsRecord > 0) {
        localStorage.setItem(STORAGE_BEST_KEY, String(state.bestGramsRecord));
      }
    } catch {
      // Ignore storage errors
    }
  }

  function restartRun(newSeed: number): void {
    const prevBest = state.bestGramsRecord;
    state = createInitialState(newSeed);
    state.bestGramsRecord = prevBest;
  }

  let activeDraggedTool: DeskContrabandTool | null = null;
  let activeDrawerTool: DeskContrabandTool | null = null;
  let crankStartAngle = 0;
  let crankAccumulatedRad = 0;

  function onPointerDown(e: PointerEvent): void {
    const { dx, dy } = clientToDesk(e.clientX, e.clientY);

    // 1. Check Diegetic Top-Right Brass Faceplate Screws (Audio Mute [M] / Reset [R])
    const mRect = lastTransform.muteBtnRect;
    if (dx >= mRect.x && dx <= mRect.x + mRect.w && dy >= mRect.y && dy <= mRect.y + mRect.h) {
      audio.muted = !audio.muted;
      state.lastTurnStamp = {
        text: audio.muted ? 'AUDIO MUTED [M]' : 'WEBAUDIO FOLEY ACTIVE [M]',
        subtext: 'DIEGETIC BRASS AUDIO TOGGLE',
        color: '#fbbf24',
        ageMs: 0,
        durationMs: 1800,
      };
      return;
    }

    const rRect = lastTransform.resetBtnRect;
    if (dx >= rRect.x && dx <= rRect.x + rRect.w && dy >= rRect.y && dy <= rRect.y + rRect.h) {
      restartRun(state.seed + 1);
      audio.playMagneticSnap();
      return;
    }

    // 2. If in Supply Drawer Pick phase, check the 3 physical tools in the open drawer
    if (state.phase === 'supply_drawer_pick') {
      for (const dTool of state.supplyDrawerTools) {
        if (Math.abs(dx - dTool.x) <= 92 && Math.abs(dy - dTool.y) <= 50) {
          dTool.isDragging = true;
          activeDrawerTool = dTool;
          audio.playGrabObject();
          return;
        }
      }
    }

    // 3. Check Unslotted Starter / Re-Fuse Ignition Cartridge (3-Second Visual Comprehension)
    if (!state.starterCartridge.slotted) {
      const distToCart = Math.hypot(
        dx - state.starterCartridge.x,
        dy - state.starterCartridge.y
      );
      const distToSocket = Math.hypot(
        dx - state.starterCartridge.socketX,
        dy - state.starterCartridge.socketY
      );
      if (distToCart <= 46) {
        state.starterCartridge.isDragging = true;
        audio.playGrabObject();
        return;
      }
      if (distToSocket <= 42) {
        // Clicking the pulsing socket directly also snaps the cartridge right in
        if (state.phase === 'chassis_meltdown') {
          restartRun(state.seed + 1);
        }
        wakeUpContraption(state, audio);
        return;
      }
    }

    // 4. Check Commit Lever / Detonator Plunger Handle
    const plungerHandleY =
      state.plunger.topY + state.plunger.travel * (state.plunger.bottomY - state.plunger.topY);
    if (
      Math.abs(dx - state.plunger.x) <= 74 &&
      dy >= state.plunger.topY - 28 &&
      dy <= state.plunger.bottomY + 36
    ) {
      state.plunger.isDragging = true;
      state.plunger.velocity = 0;
      const newTravel = Math.max(
        0,
        Math.min(1, (dy - state.plunger.topY) / (state.plunger.bottomY - state.plunger.topY))
      );
      if (Math.abs(dy - plungerHandleY) > 25) {
        state.plunger.travel = newTravel;
      }
      audio.playGrabObject();
      return;
    }

    // 5. Check Physical Contraband Tools on the Felt Mat
    if (state.phase === 'active_turn') {
      for (let i = state.deskTools.length - 1; i >= 0; i--) {
        const tool = state.deskTools[i];
        if (tool.consumed || tool.slottedActive) continue;
        if (Math.abs(dx - tool.x) <= 88 && Math.abs(dy - tool.y) <= 48) {
          tool.isDragging = true;
          activeDraggedTool = tool;
          audio.playGrabObject();
          return;
        }
      }
    }

    // 6. Check Route Selector Knife Switch (Grab/Drag or Flip)
    const kcx = SOCKETS.knifeSwitchCenter.x;
    const kcy = SOCKETS.knifeSwitchCenter.y;
    if (Math.abs(dx - kcx) <= 72 && Math.abs(dy - kcy) <= 105) {
      state.knifeSwitchDragging = true;
      if (dy < kcy - 10) {
        setRouteSwitch(state, 'vault', audio);
      } else if (dy > kcy + 10) {
        setRouteSwitch(state, 'chassis', audio);
      } else {
        setRouteSwitch(state, state.routeTarget === 'vault' ? 'chassis' : 'vault', audio);
      }
      return;
    }

    // 7. Check Step-Up Transformer Rotary Crank Wheel
    const tcx = SOCKETS.transformerCrankCenter.x;
    const tcy = SOCKETS.transformerCrankCenter.y + 22;
    if (Math.hypot(dx - tcx, dy - tcy) <= 68 || (Math.abs(dx - tcx) <= 82 && Math.abs(dy - (tcy - 72)) <= 24)) {
      state.crankWheelDragging = true;
      crankStartAngle = Math.atan2(dy - tcy, dx - tcx);
      crankAccumulatedRad = 0;
      stepUpTransformerCrank(state, audio);
      return;
    }
  }

  function onPointerMove(e: PointerEvent): void {
    const { dx, dy } = clientToDesk(e.clientX, e.clientY);

    // 1. Dragging Starter / Re-Fuse Ignition Cartridge with <28px Magnetic Snap
    if (state.starterCartridge.isDragging) {
      const dist = Math.hypot(
        dx - state.starterCartridge.socketX,
        dy - state.starterCartridge.socketY
      );
      if (dist < MAGNETIC_SNAP_RADIUS) {
        // Magnetic snap directly into the brass socket!
        state.starterCartridge.x = state.starterCartridge.socketX;
        state.starterCartridge.y = state.starterCartridge.socketY;
        state.starterCartridge.nearSocket = true;
        if (state.phase === 'chassis_meltdown') {
          restartRun(state.seed + 1);
        }
        wakeUpContraption(state, audio);
      } else if (dist < MAGNETIC_PULL_RADIUS) {
        // Magnetic pull toward socket center
        const pull = 0.45;
        state.starterCartridge.x = dx + (state.starterCartridge.socketX - dx) * pull;
        state.starterCartridge.y = dy + (state.starterCartridge.socketY - dy) * pull;
        state.starterCartridge.nearSocket = true;
      } else {
        state.starterCartridge.x = dx;
        state.starterCartridge.y = dy;
        state.starterCartridge.nearSocket = false;
      }
      return;
    }

    // 2. Dragging a Contraband Tool from the Supply Drawer
    if (activeDrawerTool && activeDrawerTool.isDragging) {
      activeDrawerTool.x = dx;
      activeDrawerTool.y = dy;
      activeDrawerTool.nearSnapSocket = dy < 600;
      return;
    }

    // 3. Dragging a Physical Contraband Tool on the Workbench (<28px Magnetic Snap)
    if (activeDraggedTool && activeDraggedTool.isDragging) {
      const dist = Math.hypot(
        dx - activeDraggedTool.targetSocketX,
        dy - activeDraggedTool.targetSocketY
      );
      if (dist < MAGNETIC_SNAP_RADIUS) {
        activeDraggedTool.x = activeDraggedTool.targetSocketX;
        activeDraggedTool.y = activeDraggedTool.targetSocketY;
        activeDraggedTool.nearSnapSocket = true;
      } else if (dist < MAGNETIC_PULL_RADIUS) {
        const pull = 0.42;
        activeDraggedTool.x = dx + (activeDraggedTool.targetSocketX - dx) * pull;
        activeDraggedTool.y = dy + (activeDraggedTool.targetSocketY - dy) * pull;
        activeDraggedTool.nearSnapSocket = true;
      } else {
        activeDraggedTool.x = dx;
        activeDraggedTool.y = dy;
        activeDraggedTool.nearSnapSocket = false;
      }
      return;
    }

    // 4. Dragging the Commit Lever / Detonator Plunger down the track
    if (state.plunger.isDragging) {
      const nextTravel = Math.max(
        0,
        Math.min(1, (dy - state.plunger.topY) / (state.plunger.bottomY - state.plunger.topY))
      );
      const notch = Math.floor(nextTravel * 8);
      if (notch !== state.plunger.lastRatchetNotch) {
        state.plunger.lastRatchetNotch = notch;
        audio.playPlungerRatchet(nextTravel);
      }
      state.plunger.travel = nextTravel;
      state.plunger.armedPastSear = nextTravel >= 0.76;
      return;
    }

    // 5. Dragging the Route Knife Switch
    if (state.knifeSwitchDragging) {
      const kcy = SOCKETS.knifeSwitchCenter.y;
      if (dy < kcy - 8) {
        setRouteSwitch(state, 'vault', audio);
      } else if (dy > kcy + 8) {
        setRouteSwitch(state, 'chassis', audio);
      }
      return;
    }

    // 6. Cranking the Step-Up Transformer Wheel in a circle
    if (state.crankWheelDragging) {
      const tcx = SOCKETS.transformerCrankCenter.x;
      const tcy = SOCKETS.transformerCrankCenter.y + 22;
      const curAngle = Math.atan2(dy - tcy, dx - tcx);
      let delta = curAngle - crankStartAngle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      crankStartAngle = curAngle;
      crankAccumulatedRad += Math.abs(delta);
      state.crankWheelAngleRad += delta;
      if (crankAccumulatedRad >= Math.PI * 0.65) {
        crankAccumulatedRad = 0;
        stepUpTransformerCrank(state, audio);
      }
    }
  }

  function onPointerUp(): void {
    // 1. Release Starter Cartridge
    if (state.starterCartridge.isDragging) {
      state.starterCartridge.isDragging = false;
      const dist = Math.hypot(
        state.starterCartridge.x - state.starterCartridge.socketX,
        state.starterCartridge.y - state.starterCartridge.socketY
      );
      if (dist <= MAGNETIC_PULL_RADIUS) {
        if (state.phase === 'chassis_meltdown') {
          restartRun(state.seed + 1);
        }
        wakeUpContraption(state, audio);
      }
    }

    // 2. Release Supply Drawer Tool
    if (activeDrawerTool) {
      const dTool = activeDrawerTool;
      dTool.isDragging = false;
      activeDrawerTool = null;
      claimSupplyDrawerToolAndAdvanceChamber(state, dTool, audio);
      return;
    }

    // 3. Release Contraband Tool -> Check if within Magnetic Snap / Pull Socket
    if (activeDraggedTool) {
      const tool = activeDraggedTool;
      tool.isDragging = false;
      activeDraggedTool = null;
      const dist = Math.hypot(
        tool.x - tool.targetSocketX,
        tool.y - tool.targetSocketY
      );
      if (dist <= MAGNETIC_PULL_RADIUS) {
        applyContrabandToolToSocket(state, tool, audio);
      }
      tool.nearSnapSocket = false;
    }

    // 4. Release Commit Lever / Detonator Plunger
    if (state.plunger.isDragging) {
      state.plunger.isDragging = false;
      if (state.plunger.travel >= 0.76) {
        state.plunger.travel = 1.0;
        state.plunger.velocity = -4.5;
        if (state.phase === 'chassis_meltdown') {
          restartRun(state.seed + 1);
          wakeUpContraption(state, audio);
        } else {
          executePlungerTurn(state, audio);
          persistBestGrams();
        }
      }
      state.plunger.armedPastSear = false;
    }

    state.knifeSwitchDragging = false;
    state.crankWheelDragging = false;
  }

  function onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'm') {
      audio.muted = !audio.muted;
      return;
    }
    if (key === 'r') {
      restartRun(state.seed + 1);
      return;
    }
    if (key === 'v' || key === 'arrowup' || key === 'w') {
      setRouteSwitch(state, 'vault', audio);
      return;
    }
    if (key === 'g' || key === 'arrowdown' || key === 's') {
      setRouteSwitch(state, 'chassis', audio);
      return;
    }
    if (key === 'c' || key === 'arrowright' || key === 'd') {
      stepUpTransformerCrank(state, audio);
      return;
    }
    if (key === ' ' || e.code === 'Space' || key === 'enter') {
      e.preventDefault();
      if (state.phase === 'boot_awaiting_starter') {
        wakeUpContraption(state, audio);
      } else if (state.phase === 'chassis_meltdown') {
        restartRun(state.seed + 1);
        wakeUpContraption(state, audio);
      } else {
        state.plunger.travel = 1.0;
        executePlungerTurn(state, audio);
        persistBestGrams();
      }
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);

  // Animation Loop + Efficient Background Processing per modern-web-guidance
  let rafId = 0;
  let isPausedByVisibility = false;
  let lastFrameTime = performance.now();

  function frame(now: number): void {
    if (isPausedByVisibility) return;
    const dtMs = Math.min(48, Math.max(0, now - lastFrameTime));
    lastFrameTime = now;

    stepWorkbenchSimulation(state, dtMs, audio);
    lastTransform = renderCathodeWorkbench(
      ctx,
      state,
      viewportW,
      viewportH,
      Boolean(reducedMotionQuery?.matches)
    );

    rafId = requestAnimationFrame(frame);
  }

  function startSimulationLoop(): void {
    if (!isPausedByVisibility && rafId !== 0) return;
    isPausedByVisibility = false;
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function stopSimulationLoop(): void {
    isPausedByVisibility = true;
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  // 1. Direct listener for contentvisibilityautostatechange (does not bubble in some browsers)
  const onContentVisibilityChange = (event: Event): void => {
    const cvEvent = event as Event & { skipped?: boolean };
    if (cvEvent.skipped) {
      stopSimulationLoop();
    } else {
      startSimulationLoop();
    }
  };
  stageRoot.addEventListener('contentvisibilityautostatechange', onContentVisibilityChange);

  // 2. Fallback using IntersectionObserver for older browsers without content-visibility
  let intersectionObserver: IntersectionObserver | null = null;
  const isContentVisibilitySupported =
    typeof document !== 'undefined' && 'contentVisibility' in document.documentElement.style;
  if (!isContentVisibilitySupported && typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            startSimulationLoop();
          } else {
            stopSimulationLoop();
          }
        }
      },
      { rootMargin: '200px' }
    );
    intersectionObserver.observe(stageRoot);
  }

  // Initial synchronous render + start loop
  lastTransform = renderCathodeWorkbench(
    ctx,
    state,
    viewportW,
    viewportH,
    Boolean(reducedMotionQuery?.matches)
  );
  rafId = requestAnimationFrame(frame);

  return {
    destroy(): void {
      stopSimulationLoop();
      stageRoot.removeEventListener('contentvisibilityautostatechange', onContentVisibilityChange);
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      container.innerHTML = '';
    },
    restartWithSeed(seed: number): void {
      restartRun(seed);
    },
    getStateSnapshot(): unknown {
      return state;
    },
  };
}
