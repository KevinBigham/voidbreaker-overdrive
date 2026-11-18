import type { ArgonGameInstance, ArgonGameMetadata } from '../../shared-contract';
import { BrassBoneAudio } from './audio';
import { BrassBoneRenderer } from './renderer';
import {
  BrassBoneSimulation,
  WORKBENCH_HEIGHT,
  WORKBENCH_WIDTH,
} from './simulation';

export const metadata: ArgonGameMetadata = {
  id: '14-brass-and-bone',
  number: 14,
  title: 'THE WEIGHT OF BRASS & BONE',
  subtitle: 'Nocturnal Royal & Occult Appraiser',
  genre: 'Diegetic Tabletop Forgery-Detective Thriller',
  primaryReference: 'Papers, Please + Strange Horticulture',
  supportingReference: 'Potion Craft + Inscryption',
  oneSentenceLoop:
    'Physically weigh relics on a damped spring balance scale, inspect micro-hallmarks and UV curses through 2.5x lenses, tap them with a tuning fork, and slam your iron stamp onto the claimant slip.',
  shortGoal: 'Uncover weight, hallmark, acoustic, and UV Aether discrepancies across 3 claimants per night.',
  longGoal:
    'Survive all 5 escalating nights behind the counter window and shape your fate across 4 distinct endings.',
  controlsSummary:
    '100% Mouse Drag & Drop: Drag relics & brass weights onto the scale, drag the 2.5x Loupe / UV Lens over relics, tap with the Tuning Fork, click the Ledger to flip pages, and slam the Green/Red Iron Stamp onto the slip (or drag relics into the bottom Smuggler’s Drawer).',
  accentColor: '#d97706',
};

export function mountGame(
  container: HTMLElement,
  options?: { initialSeed?: number; debug?: boolean }
): ArgonGameInstance {
  container.innerHTML = '';
  container.style.cssText =
    'width:100%;height:100dvh;margin:0;padding:0;overflow:hidden;background:#120904;display:flex;align-items:center;justify-content:center;user-select:none;touch-action:none;';

  // Strictly 100% diegetic canvas: Zero HTML sidebars, zero <button> toolbars, zero external HUD!
  const canvas = document.createElement('canvas');
  canvas.width = WORKBENCH_WIDTH;
  canvas.height = WORKBENCH_HEIGHT;
  canvas.setAttribute(
    'aria-label',
    'The Weight of Brass and Bone: Diegetic Appraiser Workbench Canvas'
  );
  canvas.style.cssText =
    'width:100%;height:100%;max-width:100vw;max-height:100dvh;object-fit:contain;cursor:grab;display:block;box-shadow:0 0 60px rgba(0,0,0,0.9);';
  container.appendChild(canvas);

  const audio = new BrassBoneAudio();
  const sim = new BrassBoneSimulation(audio, options?.initialSeed ?? 1891);
  const renderer = new BrassBoneRenderer();
  let ctx: CanvasRenderingContext2D | null = null;
  if (typeof navigator === 'undefined' || !/jsdom/i.test(navigator.userAgent)) {
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
  }

  const toWorkbenchCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return { x: WORKBENCH_WIDTH * 0.5, y: WORKBENCH_HEIGHT * 0.5 };
    }
    // Account for object-fit: contain letterboxing
    const scale = Math.min(rect.width / WORKBENCH_WIDTH, rect.height / WORKBENCH_HEIGHT);
    const renderedW = WORKBENCH_WIDTH * scale;
    const renderedH = WORKBENCH_HEIGHT * scale;
    const offsetX = rect.left + (rect.width - renderedW) * 0.5;
    const offsetY = rect.top + (rect.height - renderedH) * 0.5;

    return {
      x: ((clientX - offsetX) / Math.max(1, renderedW)) * WORKBENCH_WIDTH,
      y: ((clientY - offsetY) / Math.max(1, renderedH)) * WORKBENCH_HEIGHT,
    };
  };

  const onPointerDown = (e: PointerEvent) => {
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    const pt = toWorkbenchCoords(e.clientX, e.clientY);
    sim.onPointerDown(pt.x, pt.y);
    canvas.style.cursor = sim.draggedId ? 'grabbing' : 'grab';
  };

  const onPointerMove = (e: PointerEvent) => {
    const pt = toWorkbenchCoords(e.clientX, e.clientY);
    sim.onPointerMove(pt.x, pt.y);
  };

  const onPointerUp = (e: PointerEvent) => {
    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {}
    sim.onPointerUp();
    canvas.style.cursor = 'grab';
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  let rafId = 0;
  let lastTime = performance.now();
  let isDestroyed = false;

  const renderFrame = () => {
    if (ctx) {
      try {
        renderer.render(ctx, sim);
      } catch {}
    }
  };

  const tick = (now: number) => {
    if (isDestroyed) return;
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    sim.update(dt);
    renderFrame();
    rafId = requestAnimationFrame(tick);
  };

  // Initial synchronous render so frame 1 is immediately ready
  sim.update(0.016);
  renderFrame();
  rafId = requestAnimationFrame(tick);

  return {
    destroy() {
      isDestroyed = true;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      audio.destroy();
      container.innerHTML = '';
    },
    getStateSnapshot() {
      return {
        night: sim.state.night,
        caseIndexInNight: sim.state.caseIndexInNight,
        phase: sim.state.phase,
        claimantName: sim.state.activeCase.claimantName,
        artifactName: sim.state.activeCase.artifact.name,
        sovereigns: sim.state.sovereigns,
        suspicion: sim.state.suspicion,
        scaleAngle: sim.state.scaleAngle,
        leftPanGrams: sim.state.leftPanGrams,
        rightPanGrams: sim.state.rightPanGrams,
        ledgerPage: sim.state.ledgerPage,
        trendingEnding: sim.state.trendingEnding,
        simulation: sim,
      };
    },
    restartWithSeed(seed: number) {
      void seed;
      sim.restartCampaign();
      renderFrame();
    },
  };
}

export {
  BrassBoneSimulation,
  DRAWER_RECT,
  INK_PAD_RECT,
  LEDGER_RECT,
  OSCILLOGRAPH_RECT,
  STICKY_NOTE_RECT,
  WORKBENCH_HEIGHT,
  WORKBENCH_WIDTH,
} from './simulation';
export { CAMPAIGN_CASES, getCasesForNight } from './cases';
