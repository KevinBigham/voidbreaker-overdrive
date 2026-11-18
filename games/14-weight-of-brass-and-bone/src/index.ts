import type {
  ArgonGameInstance,
  ArgonGameMetadata,
} from '../../shared-contract';
import { BrassBoneAudioEngine } from './audio';
import {
  WorkbenchTransform,
  computeWorkbenchTransform,
  renderWorkbench,
} from './renderer';
import {
  WorkbenchState,
  commitVerdict,
  createInitialState,
  flipLedgerPage,
  pointerDownWorkbench,
  pointerMoveWorkbench,
  pointerUpWorkbench,
  startNextNightOrFinish,
  stepSimulation,
  strikeArtifactWithTuningFork,
} from './simulation';

export const metadata: ArgonGameMetadata = {
  id: '14-weight-of-brass-and-bone',
  number: 14,
  title: 'THE WEIGHT OF BRASS & BONE',
  subtitle: 'Diegetic Nocturnal Appraiser & Forgery-Detective Thriller',
  genre: 'Tactile Tabletop Appraiser / Forgery Detective Thriller',
  primaryReference: 'Papers, Please + Strange Horticulture',
  supportingReference: 'Potion Craft + Inscryption',
  oneSentenceLoop:
    'Physically weigh coins, relics, and sealed passports on your damped-spring brass scale, inspect micro-hallmarks and UV Aether curses through clipped 2.5x lenses, tap them with an acoustic tuning fork, and slam down your iron Certify or Confiscate stamp—or fence them through your hidden smuggler’s drawer.',
  shortGoal:
    'Spot clever weight, hallmark, acoustic, and UV Aether forgeries while paying nightly booth rent & lamp oil.',
  longGoal:
    'Survive all 5 escalating nights at Blackwater Pier and unlock 1 of 4 endings across the Crown, the Night Syndicate, or the Free Harbor Resistance.',
  controlsSummary:
    'Mouse: Drag & drop artifacts, counterweights (10g–100g), 2.5x Loupe, UV Aether Lens, Tuning Fork, and Iron Stamps. Click Ledger pages [1/2/3] to flip.',
  accentColor: '#d97706',
};

export function mountGame(
  container: HTMLElement,
  options?: { initialSeed?: number; debug?: boolean }
): ArgonGameInstance {
  const initialSeed = options?.initialSeed ?? 18911108;
  const audio = new BrassBoneAudioEngine();
  let state: WorkbenchState = createInitialState(initialSeed);

  // STRICT ZERO-HUD RULE: Zero HTML buttons, zero sidebars, zero telemetry tables around the canvas.
  container.innerHTML = `
    <style>
      .wbb-stage {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 100dvh;
        background: #0f0804;
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        /* Efficient Background Processing per modern-web-guidance */
        content-visibility: auto;
        contain-intrinsic-size: auto none auto 800px;
      }

      .wbb-canvas {
        display: block;
        width: 100%;
        height: 100%;
        cursor: grab;
      }

      .wbb-canvas:active {
        cursor: grabbing;
      }
    </style>
    <div class="wbb-stage" id="wbb-stage-root">
      <canvas
        class="wbb-canvas"
        id="wbb-canvas"
        aria-label="The Weight of Brass and Bone Mahogany Appraiser Workbench"
      ></canvas>
    </div>
  `;

  const stageRoot = container.querySelector<HTMLElement>('#wbb-stage-root')!;
  const canvas = container.querySelector<HTMLCanvasElement>('#wbb-canvas')!;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }

  let width = 1280;
  let height = 800;
  let lastTransform: WorkbenchTransform = computeWorkbenchTransform(width, height);

  const reducedMotionQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  function resizeCanvas(): void {
    const rect = stageRoot.getBoundingClientRect();
    width = Math.max(320, Math.floor(rect.width || window.innerWidth || 1280));
    height = Math.max(320, Math.floor(rect.height || window.innerHeight || 800));
    const dpr = Math.min(
      2,
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    );
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastTransform = computeWorkbenchTransform(width, height);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function clientToWorkbench(
    clientX: number,
    clientY: number
  ): { wx: number; wy: number } {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { offsetX, offsetY, scale } = lastTransform;
    return {
      wx: (px - offsetX) / (scale || 1),
      wy: (py - offsetY) / (scale || 1),
    };
  }

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const { wx, wy } = clientToWorkbench(e.clientX, e.clientY);
    pointerDownWorkbench(state, wx, wy, audio);
  }

  function onPointerMove(e: PointerEvent): void {
    const { wx, wy } = clientToWorkbench(e.clientX, e.clientY);
    pointerMoveWorkbench(state, wx, wy);
  }

  function onPointerUp(): void {
    pointerUpWorkbench(state, audio);
  }

  function onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === '1') {
      flipLedgerPage(state, 0, audio);
    } else if (e.key === '2') {
      flipLedgerPage(state, 1, audio);
    } else if (e.key === '3') {
      flipLedgerPage(state, 2, audio);
    } else if (e.key === 'f' || e.key === 'F') {
      if (state.phase === 'inspecting') {
        strikeArtifactWithTuningFork(state, audio);
      }
    } else if (e.key === 'a' || e.key === 'A') {
      if (state.phase === 'inspecting') {
        state.greenStampInked = true;
        commitVerdict(state, 'certify', 0, 62, audio);
      }
    } else if (e.key === 'x' || e.key === 'X') {
      if (state.phase === 'inspecting') {
        state.redStampInked = true;
        commitVerdict(state, 'confiscate', 0, 62, audio);
      }
    } else if (e.key === 'd' || e.key === 'D') {
      if (state.phase === 'inspecting') {
        commitVerdict(state, 'fence', 0, 0, audio);
      }
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (state.phase === 'night_summary' || state.phase === 'ending_dossier') {
        e.preventDefault();
        startNextNightOrFinish(state, audio);
      }
    } else if (e.key === 'm' || e.key === 'M') {
      audio.setMuted(!audio.muted);
    } else if (e.key === 'r' || e.key === 'R') {
      state = createInitialState(state.seed + 1);
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);

  // Animation Loop + Efficient Background Processing per modern-web-guidance
  let rafId = 0;
  let isPausedByVisibility = false;
  let lastFrameTime = performance.now();

  function frame(now: number): void {
    if (isPausedByVisibility) return;
    const dtMs = Math.min(48, Math.max(0, now - lastFrameTime));
    lastFrameTime = now;

    stepSimulation(state, dtMs, audio);
    if (ctx) {
      lastTransform = renderWorkbench(
        ctx,
        state,
        width,
        height,
        audio.muted,
        Boolean(reducedMotionQuery?.matches)
      );
    }

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

  // 1. Direct listener for contentvisibilityautostatechange (does not bubble reliably)
  const onContentVisibilityChange = (event: Event): void => {
    const cvEvent = event as Event & { skipped?: boolean };
    if (cvEvent.skipped) {
      stopSimulationLoop();
    } else {
      startSimulationLoop();
    }
  };
  stageRoot.addEventListener(
    'contentvisibilityautostatechange',
    onContentVisibilityChange
  );

  // 2. Fallback using IntersectionObserver for older browsers without content-visibility
  let intersectionObserver: IntersectionObserver | null = null;
  const isContentVisibilitySupported =
    typeof document !== 'undefined' &&
    'contentVisibility' in document.documentElement.style;
  if (
    !isContentVisibilitySupported &&
    typeof IntersectionObserver !== 'undefined'
  ) {
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
  if (ctx) {
    lastTransform = renderWorkbench(
      ctx,
      state,
      width,
      height,
      audio.muted,
      Boolean(reducedMotionQuery?.matches)
    );
  }
  rafId = requestAnimationFrame(frame);

  return {
    destroy(): void {
      stopSimulationLoop();
      stageRoot.removeEventListener(
        'contentvisibilityautostatechange',
        onContentVisibilityChange
      );
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      container.innerHTML = '';
    },
    restartWithSeed(seed: number): void {
      state = createInitialState(seed);
    },
    getStateSnapshot(): unknown {
      return state;
    },
  };
}
