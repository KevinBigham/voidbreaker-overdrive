import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAIN_HARMONIC_FREQUENCIES, FoundryAudioEngine } from '../src/audio';
import { mountGame } from '../src/index';
import {
  computeBoardSignature,
  createInitialState,
  executeAction,
  previewAction,
  setupRoom,
} from '../src/simulation';
import { DioramaChoreographer } from '../src/ui';

describe('IRONBREAKER // DOMINO FOUNDRY — Systemic Chain-Reaction & Consequence Oracle Suite', () => {
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
      measureText: vi.fn(() => ({ width: 54 })),
      setLineDash: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('1. Determinism: identical seed + action sequence produces 100% identical board state signatures', () => {
    const runSequence = (seed: number) => {
      const state = createInitialState(seed);
      // Action 1: Execute the pre-staged Room 1 Piston Ram domino cascade at (2,4)
      executeAction(state, { type: 'use_tool', tool: 'ram', targetX: 2, targetY: 4 });
      // Action 2: Overclock turn (+2 AP & x2 Greed Multiplier)
      executeAction(state, { type: 'overclock_turn' });
      // Action 3: Reposition to (1,3)
      executeAction(state, { type: 'use_tool', tool: 'move', targetX: 1, targetY: 3 });
      // Action 4: Bank & End Turn
      executeAction(state, { type: 'end_turn' });
      return computeBoardSignature(state);
    };

    const sigA = runSequence(20261108);
    const sigB = runSequence(20261108);
    const sigDifferent = runSequence(99999999);

    expect(sigA).toBe(sigB);
    expect(sigA.length).toBeGreaterThan(40);
    // Different seed produces different RNG state signature
    expect(sigA).not.toBe(sigDifferent);
  });

  it('2. Consequence Oracle Accuracy: dry-run preview matches 100% with the actual executed turn outcome', () => {
    const state = createInitialState(20261108);

    // Room 1 boots pre-aimed at (2,4) with Piston Ram
    const oracle = previewAction(state, 'ram', 2, 4);
    expect(oracle.valid).toBe(true);
    expect(oracle.chainCount).toBeGreaterThanOrEqual(6);
    expect(oracle.hazardKills).toBeGreaterThanOrEqual(2);
    expect(oracle.vaultCracked).toBe(true);

    const predictedSignature = computeBoardSignature(oracle.resultingState);

    // Now execute the exact same action on the live state
    const executed = executeAction(state, {
      type: 'use_tool',
      tool: 'ram',
      targetX: 2,
      targetY: 4,
    });

    expect(executed.valid).toBe(true);
    expect(executed.events.length).toBe(oracle.chainCount);
    expect(computeBoardSignature(state)).toBe(predictedSignature);

    // Verify every single event step, badge, hit-stop, and delay matches 100%
    for (let i = 0; i < oracle.events.length; i++) {
      expect(executed.events[i]).toEqual(oracle.events[i]);
    }
  });

  it('3. Multi-Step Environmental Chain Reactions & Rule-Bending Relics (Rubberized Walls, Chain Polarity, Domino Encore, Cryo-Bumper, Boss Pylon Overload)', () => {
    // 3A. Room 1 Pre-Staged 6+ Step Chain: Shove -> Barrel 1 Blast -> Pit Drop Kill + Pillar Collapse + Barrel 2 Blast -> Tesla Coil Arc + Vault Crack
    const room1 = createInitialState(20261108);
    const res1 = executeAction(room1, { type: 'use_tool', tool: 'ram', targetX: 2, targetY: 4 });
    expect(res1.valid).toBe(true);
    const kinds1 = res1.events.map((e) => e.kind);
    expect(kinds1).toContain('shove');
    expect(kinds1).toContain('entity_collision');
    expect(kinds1).toContain('barrel_blast');
    expect(kinds1).toContain('pit_drop');
    expect(kinds1).toContain('pillar_collapse');
    expect(kinds1).toContain('shock_arc');
    expect(kinds1).toContain('vault_crack');
    expect(room1.scars.length).toBeGreaterThanOrEqual(5);

    // 3B. Room 2 Cryo-Glass Slide -> 90-Degree Pinball Bumper Deflection -> Barrel Detonation -> Secondary Kills
    const room2 = createInitialState(20261108);
    setupRoom(room2, 2);
    const res2 = executeAction(room2, { type: 'use_tool', tool: 'ram', targetX: 2, targetY: 3 });
    expect(res2.valid).toBe(true);
    const kinds2 = res2.events.map((e) => e.kind);
    expect(kinds2).toContain('ice_slide');
    expect(kinds2).toContain('bumper_deflect');
    expect(kinds2).toContain('barrel_blast');
    expect(room2.environmentalKills).toBeGreaterThanOrEqual(2);

    // 3C. Rule-Bending Relics: Rubberized Walls + Domino Encore + Chain Polarity
    const relicState = createInitialState(20261108);
    relicState.activeRelics.push('rubberized_walls', 'domino_encore', 'chain_polarity');
    // Place an enemy at (6,2) and shove it East into the arena wall at x=7 -> bounces West!
    relicState.entities.push({
      id: 'test_wall_target',
      kind: 'sentry',
      name: 'WALL TEST SENTRY',
      x: 6,
      y: 2,
      hp: 3,
      maxHp: 3,
      facing: { dx: -1, dy: 0 },
      isEnemy: true,
      isProp: false,
      magnetizedTurns: 0,
      shieldedFront: false,
      squashX: 1,
      squashY: 1,
      flashTimerMs: 0,
      bobPhase: 0,
    });
    const player = relicState.entities.find((e) => e.kind === 'player')!;
    player.x = 5;
    player.y = 2;

    const apBefore = relicState.ap;
    const bounceRes = executeAction(relicState, {
      type: 'use_tool',
      tool: 'ram',
      targetX: 6,
      targetY: 2,
    });
    expect(bounceRes.valid).toBe(true);
    expect(bounceRes.events.some((e) => e.kind === 'wall_bounce')).toBe(true);
    // Enemy had 3 HP: took 1 direct + 3 rubber wall slam = killed by hazard!
    // Domino Encore refunds +1 AP (so AP stays equal to apBefore) and spawns an Encore Barrel!
    expect(relicState.ap).toBe(apBefore);
    expect(relicState.entities.some((e) => e.id.startsWith('encore_barrel_'))).toBe(true);

    // 3D. Room 5 Boss Contraption: Breaking Ferro-Shield Pylon triggers Pylon Overload (-4 Boss HP)
    const room5 = createInitialState(20261108);
    setupRoom(room5, 5);
    const bossBefore = room5.entities.find((e) => e.kind === 'boss_core')!;
    expect(bossBefore.hp).toBe(14);
    // Lob Repulsor Mortar at (5,2) to detonate or shove barrel (5,1) into North Ferro-Pylon (6,1)
    const pylonN = room5.entities.find((e) => e.id === 'boss_pylon_n')!;
    pylonN.hp = 2; // Prime pylon for single barrel blast destruction
    const bossRes = executeAction(room5, {
      type: 'use_tool',
      tool: 'mortar',
      targetX: 5,
      targetY: 1,
    });
    expect(bossRes.valid).toBe(true);
    expect(bossRes.events.some((e) => e.kind === 'pylon_overload')).toBe(true);
    expect(bossBefore.hp).toBeLessThan(14);
  });

  it('4. Choreographed Pacing, Harmonic Audio Escalation, DOM Mount, Controls & Clean destroy()', () => {
    // Verify escalating Hit-Stop (40ms -> 65ms) and 70-100ms micro-delays in choreographer
    const state = createInitialState(20261108);
    const audio = new FoundryAudioEngine();
    const choreo = new DioramaChoreographer();

    // Verify monotonic pitch escalation across chain steps
    let prevHz = 0;
    for (let step = 1; step <= CHAIN_HARMONIC_FREQUENCIES.length; step++) {
      const hz = audio.playChainHarmonic(step, step % 3 === 0);
      expect(hz).toBeGreaterThan(prevHz);
      prevHz = hz;
    }

    const res = executeAction(state, { type: 'use_tool', tool: 'ram', targetX: 2, targetY: 4 });
    expect(res.events.length).toBeGreaterThanOrEqual(6);
    expect(res.events[0].hitStopMs).toBe(40);
    expect(res.events[res.events.length - 1].hitStopMs).toBe(65);
    for (const ev of res.events) {
      expect(ev.delayMs).toBeGreaterThanOrEqual(70);
      expect(ev.delayMs).toBeLessThanOrEqual(100);
    }

    choreo.enqueueChainEvents(res.events, state, audio);
    expect(choreo.isPlayingChain()).toBe(true);
    expect(choreo.hitStopRemainingMs).toBe(40);

    // Step choreographer past hit-stop and micro-delays for all 12+ domino links
    for (let i = 0; i < 80; i++) {
      choreo.update(50, state, audio);
    }
    expect(choreo.isPlayingChain()).toBe(false);

    // Mount DOM & test keyboard/button controls and clean destroy()
    const container = document.createElement('div');
    document.body.appendChild(container);
    const instance = mountGame(container, { initialSeed: 20261108 });

    expect(container.querySelector('#df-canvas')).not.toBeNull();
    expect(instance.getState().roomNumber).toBe(1);
    expect(instance.getState().tutorialCalloutVisible).toBe(true);
    expect(instance.getOraclePreview().chainCount).toBeGreaterThanOrEqual(6);

    // Press Spacebar to fire the pre-staged Room 1 domino chain!
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(instance.getState().tutorialCalloutVisible).toBe(false);
    expect(instance.getState().environmentalKills).toBeGreaterThanOrEqual(2);

    // Toggle Mute with [M]
    const muteBtn = container.querySelector<HTMLButtonElement>('#df-btn-mute')!;
    expect(muteBtn.getAttribute('aria-pressed')).toBe('false');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
    expect(muteBtn.getAttribute('aria-pressed')).toBe('true');

    // Clean leak-free destroy()
    instance.destroy();
    expect(container.innerHTML).toBe('');
    container.remove();
  });
});
