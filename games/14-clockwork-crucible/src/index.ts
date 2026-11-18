import type { ArgonGameInstance, ArgonGameMetadata } from '../../shared-contract';
import { CrucibleFoleyEngine } from './audio';
import { CrucibleWorkbenchRenderer } from './renderer';
import { CrucibleWorkbenchSim, WORKBENCH_HEIGHT, WORKBENCH_WIDTH } from './simulation';
import { WORKBENCH_ATTACHMENTS } from './types';

export * from './types';
export * from './audio';
export * from './simulation';
export * from './renderer';

export const metadata: ArgonGameMetadata = {
  id: '14-clockwork-crucible',
  number: 14,
  title: 'The Brass Crucible',
  subtitle: 'Tactile Alchemical Engine & Chain-Reaction Press',
  genre: 'Real-Time Physical Workbench & Chain-Reaction Press',
  primaryReference: 'Opus Magnum & Potion Craft',
  supportingReference: "Wilmot's Warehouse & Balatro",
  oneSentenceLoop:
    'Grab raw elemental beads from a brass chute, work the bellows, prism lens, and shear-blade to drive emergent 5-state transmutations inside a pressurized smoked-glass crucible, and pull the discharge lever to assay minted brass coins.',
  shortGoal: 'Crack the Lead Geode with heat or impact and pull the Discharge Lever to clear Commission #1.',
  longGoal:
    'Master all 5 physical reagent states, bolt all 4 brass mechanisms onto your workbench, and fulfill the Magnum Opus commission.',
  controlsSummary:
    'Mouse Drag/Flick Beads & Levers | Space: Pump Bellows | C: Shear-Blade | V: Vent Clamp | Enter: Discharge | 1-4: Bolted Mechanisms',
  accentColor: '#d49b35',
};

export interface CrucibleStateSnapshot {
  seed: number;
  commissionLevel: number;
  commissionTitle: string;
  commissionCoinsEarned: number;
  quotaCoins: number;
  walletCoins: number;
  totalCoinsMinted: number;
  pressureBar: number;
  pressureMultiplier: number;
  ventClamped: boolean;
  beadCount: number;
  boltedAttachments: string[];
}

export function mountGame(
  container: HTMLElement,
  options?: { initialSeed?: number; debug?: boolean }
): ArgonGameInstance & { sim: CrucibleWorkbenchSim } {
  container.innerHTML = '';

  // Apply Modern Web Guidance `efficient-background-processing`:
  // Use content-visibility: auto with contain-intrinsic-size and pause RAF when skipped
  const host = document.createElement('div');
  host.className = 'crucible-workbench-host';
  host.style.cssText = `
    width: 100%;
    height: 100%;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1c1613;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    content-visibility: auto;
    contain-intrinsic-size: auto none auto 760px;
  `;

  const canvas = document.createElement('canvas');
  canvas.width = WORKBENCH_WIDTH;
  canvas.height = WORKBENCH_HEIGHT;
  canvas.setAttribute(
    'aria-label',
    'The Brass Crucible: Tactile Alchemical Workbench and Chain-Reaction Press'
  );
  canvas.style.cssText = `
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    cursor: grab;
    display: block;
  `;

  host.appendChild(canvas);
  container.appendChild(host);

  const foley = new CrucibleFoleyEngine();
  const sim = new CrucibleWorkbenchSim(options?.initialSeed ?? 20261108, foley);
  const renderer = new CrucibleWorkbenchRenderer();
  let debugMode = Boolean(options?.debug);

  const ctx = canvas.getContext('2d');

  // Map pointer event clientX/Y into canonical 1280x760 workbench coordinates
  function toWorkbenchCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return { x: WORKBENCH_WIDTH * 0.5, y: WORKBENCH_HEIGHT * 0.5 };
    }
    const scaleX = WORKBENCH_WIDTH / rect.width;
    const scaleY = WORKBENCH_HEIGHT / rect.height;
    const scale = Math.max(scaleX, scaleY);
    const renderedW = WORKBENCH_WIDTH / scale;
    const renderedH = WORKBENCH_HEIGHT / scale;
    const offsetX = rect.left + (rect.width - renderedW) * 0.5;
    const offsetY = rect.top + (rect.height - renderedH) * 0.5;

    const x = Math.max(0, Math.min(WORKBENCH_WIDTH, (clientX - offsetX) * scale));
    const y = Math.max(0, Math.min(WORKBENCH_HEIGHT, (clientY - offsetY) * scale));
    return { x, y };
  }

  const onPointerDown = (e: PointerEvent) => {
    const pt = toWorkbenchCoords(e.clientX, e.clientY);
    sim.handlePointerDown(pt.x, pt.y);
    if (sim.draggedBeadId !== null || sim.activeControlDrag !== null) {
      canvas.style.cursor = 'grabbing';
    }
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore in synthetic test environments
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const pt = toWorkbenchCoords(e.clientX, e.clientY);
    sim.handlePointerMove(pt.x, pt.y);
  };

  const onPointerUp = (e: PointerEvent) => {
    sim.handlePointerUp();
    canvas.style.cursor = 'grab';
    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.code === 'Space') {
      e.preventDefault();
      sim.pumpBellows(1.0);
    } else if (e.code === 'Enter') {
      e.preventDefault();
      sim.pullDischargeLever();
    } else if (e.key === 'c' || e.key === 'C') {
      sim.pullShearBlade();
    } else if (e.key === 'v' || e.key === 'V') {
      sim.toggleVentClamp();
    } else if (e.key === 'r' || e.key === 'R') {
      sim.dispenseChuteSupply();
    } else if (e.key === 'd' || e.key === 'D') {
      debugMode = !debugMode;
    } else if (e.key >= '1' && e.key <= '4') {
      const idx = Number(e.key) - 1;
      const spec = WORKBENCH_ATTACHMENTS[idx];
      if (spec) {
        sim.interactAttachment(spec.id);
      }
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);

  let rafId: number | null = null;
  let isPaused = false;
  let lastTime = performance.now();

  function renderFrame(now: number): void {
    if (isPaused) {
      rafId = null;
      return;
    }
    const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    sim.step(dt);
    if (ctx) {
      renderer.render(ctx, sim, debugMode);
    }
    rafId = requestAnimationFrame(renderFrame);
  }

  function startSimulation(): void {
    if (!isPaused && rafId !== null) return;
    isPaused = false;
    lastTime = performance.now();
    rafId = requestAnimationFrame(renderFrame);
  }

  function stopSimulation(): void {
    isPaused = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Direct listener on element with content-visibility: auto (since event does not bubble)
  const onContentVisibilityChange = (event: Event) => {
    const cvEvent = event as Event & { skipped?: boolean };
    if (cvEvent.skipped) {
      stopSimulation();
    } else {
      startSimulation();
    }
  };
  host.addEventListener('contentvisibilityautostatechange', onContentVisibilityChange);

  // IntersectionObserver fallback for older browsers without content-visibility support
  let intersectionObserver: IntersectionObserver | null = null;
  const isContentVisibilitySupported =
    typeof document !== 'undefined' && 'contentVisibility' in document.documentElement.style;
  if (!isContentVisibilitySupported && typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            startSimulation();
          } else {
            stopSimulation();
          }
        }
      },
      { rootMargin: '200px' }
    );
    intersectionObserver.observe(host);
  }

  // Render initial frame immediately (< 1ms boot) and start 60fps loop
  sim.step(1 / 60);
  if (ctx) {
    renderer.render(ctx, sim, debugMode);
  }
  startSimulation();

  return {
    sim,
    destroy(): void {
      stopSimulation();
      host.removeEventListener('contentvisibilityautostatechange', onContentVisibilityChange);
      intersectionObserver?.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      container.innerHTML = '';
    },
    getStateSnapshot(): CrucibleStateSnapshot {
      return {
        seed: sim.seed,
        commissionLevel: sim.currentCommission.level,
        commissionTitle: sim.currentCommission.title,
        commissionCoinsEarned: sim.commissionCoinsEarned,
        quotaCoins: sim.currentCommission.quotaCoins,
        walletCoins: sim.walletCoins,
        totalCoinsMinted: sim.totalCoinsMinted,
        pressureBar: Number(sim.pressureBar.toFixed(2)),
        pressureMultiplier: sim.getPressureYieldMultiplier(),
        ventClamped: sim.ventClamped,
        beadCount: sim.beads.length,
        boltedAttachments: Array.from(sim.boltedAttachments),
      };
    },
    restartWithSeed(seed: number): void {
      sim.resetWithSeed(seed);
      if (ctx) {
        renderer.render(ctx, sim, debugMode);
      }
    },
    toggleDebug(force?: boolean): void {
      debugMode = force !== undefined ? force : !debugMode;
      if (ctx) {
        renderer.render(ctx, sim, debugMode);
      }
    },
  };
}
