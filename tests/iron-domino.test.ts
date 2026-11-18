import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAIN_HARMONIC_FREQUENCIES, FoundryAudioEngine } from '../src/audio';
import { mountGame } from '../games/14-iron-domino/src/index';
import {
  computeBoardSignature,
  createInitialState,
  executeAction,
  previewAction,
  setupRoom,
} from '../src/simulation';
import { DioramaChoreographer } from '../src/ui';

describe('IRONBREAKER // DOMINO FOUNDRY — Root Architecture & Consequence Oracle Verification', () => {
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

  it('verifies determinism, 100% Consequence Oracle accuracy, 3+ multi-step chain reactions, and DOM mount/destroy', () => {
    const stateA = createInitialState(20261108);
    const stateB = createInitialState(20261108);

    const oracle = previewAction(stateA, 'ram', 2, 4);
    expect(oracle.valid).toBe(true);
    expect(oracle.chainCount).toBeGreaterThanOrEqual(6);

    const execA = executeAction(stateA, { type: 'use_tool', tool: 'ram', targetX: 2, targetY: 4 });
    const execB = executeAction(stateB, { type: 'use_tool', tool: 'ram', targetX: 2, targetY: 4 });

    expect(computeBoardSignature(stateA)).toBe(computeBoardSignature(stateB));
    expect(computeBoardSignature(stateA)).toBe(computeBoardSignature(oracle.resultingState));
    expect(execA.events).toEqual(execB.events);
    expect(execA.events).toEqual(oracle.events);

    // Verify Room 2 Cryo-Glass + Bumper + Barrel chain
    const r2 = createInitialState(20261108);
    setupRoom(r2, 2);
    const res2 = executeAction(r2, { type: 'use_tool', tool: 'ram', targetX: 2, targetY: 3 });
    expect(res2.events.map((e) => e.kind)).toContain('ice_slide');
    expect(res2.events.map((e) => e.kind)).toContain('bumper_deflect');
    expect(res2.events.map((e) => e.kind)).toContain('barrel_blast');

    // Verify harmonic escalation & choreographer
    const audio = new FoundryAudioEngine();
    expect(audio.playChainHarmonic(5, true)).toBe(CHAIN_HARMONIC_FREQUENCIES[4]);
    const choreo = new DioramaChoreographer();
    choreo.enqueueChainEvents(execA.events, stateA, audio);
    expect(choreo.isPlayingChain()).toBe(true);

    const host = document.createElement('div');
    document.body.appendChild(host);
    const game = mountGame(host, { initialSeed: 20261108 });
    expect(host.querySelector('canvas')).not.toBeNull();
    game.destroy();
    expect(host.innerHTML).toBe('');
    host.remove();
  });
});
