import type {
  ArgonGameInstance,
  ArgonGameMetadata,
} from '../../shared-contract';
import { CrucibleAudioEngine } from './audio';
import {
  RenderTransform,
  computeWorkbenchTransform,
  renderCrucibleWorkbench,
  screenToWorkbench,
} from './renderer';
import {
  CRUCIBLE_CENTER_X,
  CRUCIBLE_CENTER_Y,
  CRUCIBLE_RADIUS_X,
  CRUCIBLE_RADIUS_Y,
  DIVIDER_Y,
  WORKBENCH_HEIGHT,
  WORKBENCH_WIDTH,
  activateAttachmentVerb,
  createInitialState,
  dispenseChuteLoadout,
  pullDischargeLever,
  pumpBellows,
  purchaseAttachment,
  stepSimulation,
  strikeCopperAnvilHammer,
  togglePressureLockGate,
  triggerShearBlade,
} from './simulation';
import type { CruciblePressState } from './types';

export const metadata: ArgonGameMetadata = {
  id: '14-crucible-press',
  number: 14,
  title: 'CRUCIBLE PRESS // ALCHEMICAL WORKBENCH',
  subtitle: 'Tactile Brass & Smoked-Glass Chain-Reaction Press',
  genre: 'Real-Time Physical Workbench & Alchemical Distillation Engine',
  primaryReference: 'Opus Magnum + Potion Craft',
  supportingReference: "Wilmot's Warehouse + Balatro",
  oneSentenceLoop:
    'Grab raw alchemical reagents with a spring-tethered hand, slot them into a smoked-glass crucible, work physical brass levers and lenses to stoke emergent 5-reagent chain reactions, and push your internal Bar pressure before pulling the Discharge Lever to cascade minted coins onto the Assay Scales.',
  shortGoal: 'Fulfill the pinned Parchment Commission ("Crack & Distill.") by minting Brass Coins on the Assay Scale.',
  longGoal:
    'Bolt permanent physical attachments (Centrifuge Spinner, Cryo-Condenser, Twin-Jaw Crusher, Magnetic Lodestone Ring) onto your workbench and master Quicksilver geometric loops (△ ×3, ◇ ×5) and Philosopher Salt crystallization.',
  controlsSummary:
    'Mouse Only: Drag & Flick beads, Pump Bellows, Pull & Release Shear-Blade, Aim Prism Lens, Clamp Pressure-Lock Gate, Pull Discharge Lever.',
  accentColor: '#d49b35',
};

export function handlePointerDownAtWorkbench(
  state: CruciblePressState,
  wx: number,
  wy: number
): void {
  state.hand.x = wx;
  state.hand.y = wy;
  state.hand.vx = 0;
  state.hand.vy = 0;
  state.hand.isDown = true;
  state.hand.dragKind = 'none';
  state.hand.draggedBeadId = null;
  state.hand.draggedAttachmentId = null;

  // 1. Check Diegetic Top Bezel Utility Pins (Mute Bell & Reset Bench)
  if (wy >= 12 && wy <= 40) {
    if (wx >= 752 && wx <= 828) {
      state.muted = !state.muted;
      return;
    }
    if (wx >= 832 && wx <= 906) {
      const fresh = createInitialState(state.seed + 1);
      fresh.muted = state.muted;
      Object.assign(state, fresh);
      return;
    }
  }

  // 2. Check Physical Workbench Attachment Sockets (Right-Bottom panel)
  for (const att of state.attachments) {
    if (Math.abs(wx - att.socketX) <= 72 && Math.abs(wy - att.socketY) <= 34) {
      if (!att.unlocked) {
        purchaseAttachment(state, att.id);
      } else {
        activateAttachmentVerb(state, att.id);
      }
      state.hand.dragKind = 'attachment_control';
      state.hand.draggedAttachmentId = att.id;
      return;
    }
  }

  // Also check bolted attachment mechanisms directly on the Crucible
  if (
    Math.hypot(wx - 822, wy - 182) <= 22 &&
    state.attachments.some((a) => a.id === 'cryo_condenser' && a.unlocked)
  ) {
    activateAttachmentVerb(state, 'cryo_condenser');
    return;
  }
  if (
    Math.hypot(wx - 828, wy - 468) <= 24 &&
    state.attachments.some((a) => a.id === 'centrifuge_spinner' && a.unlocked)
  ) {
    activateAttachmentVerb(state, 'centrifuge_spinner');
    return;
  }

  // 3. Check Reagent Beads (Topmost first so grabbing beads always feels crisp)
  for (let i = state.beads.length - 1; i >= 0; i--) {
    const b = state.beads[i];
    if (Math.hypot(wx - b.x, wy - b.y) <= b.radius + 10) {
      state.hand.dragKind = 'bead';
      state.hand.draggedBeadId = b.id;
      state.soundQueue.push({
        type: b.kind === 'lead' ? 'thud_lead' : 'clink_glass',
        pitch: 20 / b.radius,
        intensity: 0.55,
      });
      return;
    }
  }

  // 4. Check Chute Refill Pull-Handle (x: 195..310, y: 246..292)
  if (wx >= 195 && wx <= 310 && wy >= 246 && wy <= 292) {
    state.hand.dragKind = 'chute_pull';
    state.chutePullSpring.target = 0.85;
    dispenseChuteLoadout(state);
    return;
  }

  // 5. Check Heated Copper Anvil Drop-Hammer (x: 210..286, y: 540..612)
  if (wx >= 210 && wx <= 286 && wy >= 540 && wy <= 612) {
    state.hand.dragKind = 'anvil_hammer';
    state.anvilHammerSpring.position = 0.95;
    state.anvilHammerSpring.target = 0.95;
    state.soundQueue.push({ type: 'ratchet_click', pitch: 0.9, intensity: 0.8 });
    return;
  }

  // 6. Check Weighted Brass Bellows Handle (x: 345..468, y: 550..652)
  if (wx >= 345 && wx <= 468 && wy >= 550 && wy <= 652) {
    state.hand.dragKind = 'bellows_lever';
    pumpBellows(state, 1.0);
    return;
  }

  // 7. Check Pressure-Lock Gate Handle across Top Crucible Neck (x: 555..750, y: 82..126)
  if (wx >= 555 && wx <= 750 && wy >= 82 && wy <= 126) {
    state.hand.dragKind = 'pressure_gate';
    togglePressureLockGate(state);
    return;
  }

  // 8. Check Spring-Loaded Shear-Blade Handle on Right Crucible Wall (x: 740..885, y: 255..320)
  if (wx >= 740 && wx <= 885 && wy >= 255 && wy <= 320) {
    state.hand.dragKind = 'shear_blade';
    state.shearArmed = true;
    state.shearBladeSpring.target = 0.95;
    state.shearBladeSpring.position = Math.max(0.45, state.shearBladeSpring.position);
    state.soundQueue.push({ type: 'ratchet_click', pitch: 1.1, intensity: 0.9 });
    return;
  }

  // 9. Check Rotatable Prism Lens on Left Crucible Arm (x: 360..425, y: 232..298)
  if (wx >= 360 && wx <= 425 && wy >= 232 && wy <= 298) {
    state.hand.dragKind = 'prism_lens';
    state.soundQueue.push({ type: 'ratchet_click', pitch: 1.2, intensity: 0.7 });
    return;
  }

  // 10. Check Internal Brass Divider Latch at (424, DIVIDER_Y)
  if (Math.hypot(wx - 424, wy - DIVIDER_Y) <= 18) {
    state.hand.dragKind = 'divider_latch';
    if (state.dividerOpen || state.dividerIntegrity < 1) {
      state.dividerOpen = false;
      state.dividerIntegrity = 1.0;
    } else {
      state.dividerOpen = true;
    }
    state.soundQueue.push({ type: 'clink_brass', pitch: 1.05, intensity: 0.9 });
    return;
  }

  // 11. Check Heavy Brass Discharge Lever on Right Panel (x: 916..1000, y: 268..435)
  if (wx >= 916 && wx <= 1000 && wy >= 268 && wy <= 435) {
    state.hand.dragKind = 'discharge_lever';
    state.dischargeSpring.target = 0.95;
    state.soundQueue.push({ type: 'ratchet_click', pitch: 0.85, intensity: 0.9 });
    return;
  }

  // 12. Check Rotating Alembic Drum Rim inside/around the Crucible
  const distFromCrucible = Math.hypot(
    (wx - CRUCIBLE_CENTER_X) / CRUCIBLE_RADIUS_X,
    (wy - CRUCIBLE_CENTER_Y) / CRUCIBLE_RADIUS_Y
  );
  if (distFromCrucible >= 0.65 && distFromCrucible <= 1.18) {
    state.hand.dragKind = 'alembic_drum';
    state.hand.lastRatchetTooth = Math.floor((state.alembicAngle * 12) / Math.PI);
  }
}

export function handlePointerMoveAtWorkbench(
  state: CruciblePressState,
  wx: number,
  wy: number
): void {
  const prevX = state.hand.x;
  const prevY = state.hand.y;
  state.hand.vx = (wx - prevX) * 60;
  state.hand.vy = (wy - prevY) * 60;
  state.hand.x = wx;
  state.hand.y = wy;

  if (!state.hand.isDown) return;

  switch (state.hand.dragKind) {
    case 'bellows_lever': {
      const pull = Math.min(1.1, Math.max(0, (wy - 565) / 65));
      const prevTooth = Math.floor(state.bellowsSpring.target * 6);
      const nextTooth = Math.floor(pull * 6);
      state.bellowsSpring.target = pull;
      if (nextTooth > prevTooth) {
        pumpBellows(state, 0.35);
      }
      break;
    }

    case 'shear_blade': {
      const pull = Math.min(1.2, Math.max(0.1, (wx - 765) / 75));
      state.shearBladeSpring.target = pull;
      state.shearArmed = pull >= 0.25;
      break;
    }

    case 'prism_lens': {
      const angle = Math.atan2(wy - 265, Math.max(30, wx - 392));
      const clamped = Math.min(0.68, Math.max(-0.45, angle));
      const prevTooth = Math.floor(state.prismTargetAngle * 14);
      const nextTooth = Math.floor(clamped * 14);
      state.prismTargetAngle = clamped;
      if (prevTooth !== nextTooth) {
        state.soundQueue.push({ type: 'ratchet_click', pitch: 1.25, intensity: 0.55 });
      }
      break;
    }

    case 'alembic_drum': {
      const prevAngle = Math.atan2(prevY - CRUCIBLE_CENTER_Y, prevX - CRUCIBLE_CENTER_X);
      const currAngle = Math.atan2(wy - CRUCIBLE_CENTER_Y, wx - CRUCIBLE_CENTER_X);
      let delta = currAngle - prevAngle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      state.alembicAngularVel = delta * 42;
      state.alembicAngle += delta;

      const tooth = Math.floor((state.alembicAngle * 10) / Math.PI);
      if (tooth !== state.hand.lastRatchetTooth) {
        state.hand.lastRatchetTooth = tooth;
        state.soundQueue.push({ type: 'ratchet_click', pitch: 1.0, intensity: 0.65 });
      }
      break;
    }

    case 'discharge_lever': {
      const pull = Math.min(1.1, Math.max(0, (wy - 285) / 115));
      state.dischargeSpring.target = pull;
      break;
    }
  }
}

export function handlePointerUpAtWorkbench(state: CruciblePressState): void {
  if (!state.hand.isDown) return;

  if (state.hand.dragKind === 'shear_blade') {
    triggerShearBlade(state);
  } else if (state.hand.dragKind === 'anvil_hammer') {
    strikeCopperAnvilHammer(state);
  } else if (state.hand.dragKind === 'discharge_lever') {
    // Pulling or clicking the Discharge Handle flushes the vessel
    pullDischargeLever(state);
    state.dischargeSpring.target = 0;
  } else if (state.hand.dragKind === 'bellows_lever') {
    state.bellowsSpring.target = 0;
  } else if (state.hand.dragKind === 'chute_pull') {
    state.chutePullSpring.target = 0;
  } else if (state.hand.dragKind === 'bead' && state.hand.draggedBeadId !== null) {
    const b = state.beads.find((item) => item.id === state.hand.draggedBeadId);
    if (b) {
      // Impart cursor flick momentum (weighted inversely by mass)
      const flickScale = 0.45 / Math.sqrt(b.mass);
      b.vx += state.hand.vx * flickScale;
      b.vy += state.hand.vy * flickScale;
    }
  }

  state.hand.isDown = false;
  state.hand.dragKind = 'none';
  state.hand.draggedBeadId = null;
  state.hand.draggedAttachmentId = null;
}

export function mountGame(
  container: HTMLElement,
  options?: { initialSeed?: number; debug?: boolean }
): ArgonGameInstance {
  const initialSeed = options?.initialSeed ?? 20261108;
  const audio = new CrucibleAudioEngine();
  let state: CruciblePressState = createInitialState(initialSeed);
  state.debug = Boolean(options?.debug);

  // Zero DOM sidebars, zero combat logs, zero HTML buttons outside the canvas
  container.innerHTML = `
    <style>
      .cp-workbench-stage {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 100dvh;
        background: #1c1613;
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        /* Efficient Background Processing per modern-web-guidance */
        content-visibility: auto;
        contain-intrinsic-size: auto none auto 720px;
      }
      .cp-workbench-canvas {
        display: block;
        width: 100%;
        height: 100%;
        cursor: grab;
      }
      .cp-workbench-canvas:active {
        cursor: grabbing;
      }
    </style>
    <div class="cp-workbench-stage" id="cp-stage">
      <canvas
        class="cp-workbench-canvas"
        id="cp-canvas"
        aria-label="Brass and Smoked-Glass Alchemical Crucible Press Workbench"
      ></canvas>
    </div>
  `;

  const stageEl = container.querySelector('#cp-stage') as HTMLDivElement;
  const canvas = container.querySelector('#cp-canvas') as HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  const isJsDom =
    typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
  if (!isJsDom) {
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
  }

  let transform: RenderTransform = computeWorkbenchTransform(
    WORKBENCH_WIDTH,
    WORKBENCH_HEIGHT
  );

  const resizeCanvas = () => {
    const rect = stageEl.getBoundingClientRect();
    const cssW = Math.max(320, rect.width || window.innerWidth || WORKBENCH_WIDTH);
    const cssH = Math.max(240, rect.height || window.innerHeight || WORKBENCH_HEIGHT);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    transform = computeWorkbenchTransform(cssW, cssH);
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const onPointerDown = (ev: PointerEvent) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    canvas.setPointerCapture?.(ev.pointerId);
    const rect = canvas.getBoundingClientRect();
    const pt = screenToWorkbench(ev.clientX, ev.clientY, rect, transform);
    handlePointerDownAtWorkbench(state, pt.x, pt.y);
    audio.setMuted(state.muted);
    audio.flushEvents(state.soundQueue);
  };

  const onPointerMove = (ev: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const pt = screenToWorkbench(ev.clientX, ev.clientY, rect, transform);
    handlePointerMoveAtWorkbench(state, pt.x, pt.y);
  };

  const onPointerUp = (ev: PointerEvent) => {
    canvas.releasePointerCapture?.(ev.pointerId);
    handlePointerUpAtWorkbench(state);
    audio.flushEvents(state.soundQueue);
  };

  const onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    const delta = Math.sign(ev.deltaY) * 0.12;
    if (state.hand.x < 440) {
      state.prismTargetAngle = Math.min(
        0.68,
        Math.max(-0.45, state.prismTargetAngle + delta * 0.6)
      );
    } else {
      state.alembicAngularVel += delta * 6.5;
    }
    state.soundQueue.push({ type: 'ratchet_click', pitch: 1.1, intensity: 0.55 });
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // Pause simulation when off-screen per modern-web-guidance efficient-background-processing
  let isPausedByVisibility = false;
  let rafId = 0;
  let lastTime = performance.now();

  const onContentVisibilityChange = (event: Event) => {
    const cvEvent = event as Event & { skipped?: boolean };
    isPausedByVisibility = Boolean(cvEvent.skipped);
    if (!isPausedByVisibility) {
      lastTime = performance.now();
    } else {
      audio.updateContinuousSteam(0, false);
    }
  };
  stageEl.addEventListener(
    'contentvisibilityautostatechange',
    onContentVisibilityChange
  );

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
            lastTime = performance.now();
          }
        }
      },
      { rootMargin: '200px' }
    );
    intersectionObserver.observe(stageEl);
  }

  const tick = (now: number) => {
    rafId = window.requestAnimationFrame(tick);
    if (isPausedByVisibility) return;

    const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    stepSimulation(state, dt);
    audio.setMuted(state.muted);
    audio.updateContinuousSteam(state.vesselPressureBar, state.ventClosed);
    audio.flushEvents(state.soundQueue);

    if (ctx) {
      renderCrucibleWorkbench(ctx, state, transform);
    }
  };

  // Render first frame immediately (< 1ms boot) before first animation tick
  if (ctx) {
    renderCrucibleWorkbench(ctx, state, transform);
  }
  rafId = window.requestAnimationFrame(tick);

  return {
    destroy() {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      stageEl.removeEventListener(
        'contentvisibilityautostatechange',
        onContentVisibilityChange
      );
      intersectionObserver?.disconnect();
      audio.destroy();
      container.innerHTML = '';
    },
    getStateSnapshot() {
      return state;
    },
    restartWithSeed(seed: number) {
      state = createInitialState(seed);
    },
    toggleDebug(force?: boolean) {
      state.debug = force !== undefined ? force : !state.debug;
    },
  };
}
