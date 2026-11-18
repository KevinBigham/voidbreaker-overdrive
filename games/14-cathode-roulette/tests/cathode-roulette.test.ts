import { beforeEach, describe, expect, it, vi } from 'vitest';
import { metadata, mountGame } from '../src/index';
import {
  applyContrabandToolToSocket,
  claimSupplyDrawerToolAndAdvanceChamber,
  createInitialState,
  executePlungerTurn,
  setRouteSwitch,
  stepUpTransformerCrank,
  stepWorkbenchSimulation,
  wakeUpContraption,
} from '../src/simulation';

describe('CATHODE ROULETTE // THE TESLA VALUATION (14-cathode-roulette)', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 48 })),
      setLineDash: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('starts in 3-second comprehension boot_awaiting_starter phase and wakes up when starter cartridge is slotted', () => {
    const state = createInitialState(20261108);
    expect(state.phase).toBe('boot_awaiting_starter');
    expect(state.machineAwake).toBe(false);
    expect(state.starterCartridge.slotted).toBe(false);
    expect(state.fusesRemaining).toBe(4);
    expect(state.deskTools).toHaveLength(5);

    wakeUpContraption(state);
    expect(state.phase).toBe('active_turn');
    expect(state.machineAwake).toBe(true);
    expect(state.starterCartridge.slotted).toBe(true);
    expect(state.drumQueue.length).toBeGreaterThanOrEqual(5);
  });

  it('executes Vault vs Chassis routing, Step-Up Transformer multiplier, and Glass Fuse blowout', () => {
    const state = createInitialState(20261108);
    wakeUpContraption(state);

    // Force known queue: ['live', 'blank', 'live']
    state.drumQueue = ['live', 'blank', 'live'];
    setRouteSwitch(state, 'vault');
    stepUpTransformerCrank(state); // 1x -> 2x
    expect(state.stepUpMultiplier).toBe(2);

    // Pull Commit Plunger on a 'live' core routed to 'vault' at 2x -> +300g
    executePlungerTurn(state);
    expect(state.scaleAccumulatedGrams).toBe(300);
    expect(state.stepUpMultiplier).toBe(1);

    // Next core is 'blank': route to 'chassis' for safe ground (+75g + surge bonus)
    setRouteSwitch(state, 'chassis');
    executePlungerTurn(state);
    expect(state.scaleAccumulatedGrams).toBe(375);
    expect(state.groundSurgeBonusActive).toBe(true);
    expect(state.fusesRemaining).toBe(4);

    // Next core is 'live': route to 'chassis' -> blows 1 Glass Fuse!
    executePlungerTurn(state);
    expect(state.fusesRemaining).toBe(3);
  });

  it('supports all 5 physical Contraband Tools on the tabletop', () => {
    const state = createInitialState(20261108);
    wakeUpContraption(state);
    state.drumQueue = ['blank', 'live', 'volatile'];

    // 1. X-Ray Loupe reveals the chambered core
    const loupe = state.deskTools.find((t) => t.kind === 'xray_loupe')!;
    expect(applyContrabandToolToSocket(state, loupe)).toBe(true);
    expect(state.currentCoreRevealed).toBe(true);

    // 2. Polarity Inverter Magnet flips 'blank' -> 'live'
    const magnet = state.deskTools.find((t) => t.kind === 'inverter_magnet')!;
    expect(applyContrabandToolToSocket(state, magnet)).toBe(true);
    expect(state.drumQueue[0]).toBe('live');

    // 3. Copper Jumper Clamp ejects the current chambered core without firing
    const clamp = state.deskTools.find((t) => t.kind === 'jumper_clamp')!;
    expect(applyContrabandToolToSocket(state, clamp)).toBe(true);
    expect(state.spentShells.at(-1)?.outcome).toBe('ejected');
    expect(state.drumQueue).toEqual(['live', 'volatile']);

    // 4. Lead Blast Shield absorbs a catastrophic misfire without blowing any Glass Fuse
    const shield = state.deskTools.find((t) => t.kind === 'blast_shield')!;
    expect(applyContrabandToolToSocket(state, shield)).toBe(true);
    expect(state.leadShieldArmed).toBe(true);

    setRouteSwitch(state, 'chassis');
    executePlungerTurn(state); // Grounding a 'live' core while Lead Shield is armed
    expect(state.fusesRemaining).toBe(4);
    expect(state.leadShieldArmed).toBe(false);
    expect(state.leadShieldCracked).toBe(true);

    // 5. Overclock Weight multiplies payout by 3x and locks safety ground for 2 turns
    const weight = state.deskTools.find((t) => t.kind === 'overclock_weight')!;
    expect(applyContrabandToolToSocket(state, weight)).toBe(true);
    expect(state.overclockTurnsRemaining).toBe(2);
    expect(setRouteSwitch(state, 'chassis')).toBe(false); // Locked!
  });

  it('opens the Contraband Supply Drawer when the Balance Scale tips past Quota and advances Chamber', () => {
    const state = createInitialState(20261108);
    wakeUpContraption(state);
    state.drumQueue = ['volatile'];
    state.stepUpMultiplier = 2; // 300g * 2 = 600g >= 450g quota
    setRouteSwitch(state, 'vault');

    executePlungerTurn(state);
    expect(state.phase).toBe('supply_drawer_pick');
    expect(state.supplyDrawerTools).toHaveLength(3);

    claimSupplyDrawerToolAndAdvanceChamber(state, state.supplyDrawerTools[0]);
    expect(state.phase).toBe('active_turn');
    expect(state.chamberNumber).toBe(2);
  });

  it('mounts zero-DOM diegetic canvas, steps spring physics, and cleanly destroys', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const instance = mountGame(container, { initialSeed: 20261108 });
    expect(metadata.id).toBe('14-cathode-roulette');
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    // Zero HTML buttons or sidebars inside the container!
    expect(container.querySelectorAll('button')).toHaveLength(0);

    const snap = instance.getStateSnapshot?.() as ReturnType<typeof createInitialState>;
    stepWorkbenchSimulation(snap, 16);
    expect(snap.fuses).toHaveLength(4);

    instance.restartWithSeed?.(99999);
    instance.destroy();
    container.remove();
  });
});
