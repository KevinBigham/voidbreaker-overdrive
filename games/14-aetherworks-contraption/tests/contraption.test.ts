import { describe, expect, it } from 'vitest';
import { DRAFT_BLUEPRINT_POOL, MODULE_CATALOG } from '../src/blueprints';
import {
  ANGULAR_SPRING_DAMPING,
  ANGULAR_SPRING_STIFFNESS,
  cashOutCruciblePot,
  computeBlowoutChance,
  createInitialState,
  createModule,
  dropModuleOnSocket,
  openBlueprintDraft,
  pickupModule,
  pullLaunchLever,
  rotateModule,
  selectBlueprintCard,
  stepSimulation,
  triggerOverclockRecycle,
  triggerOverloadSurge,
} from '../src/sim';
import { computeHarmonicFrequency, LYDIAN_SEMITONES } from '../src/synth';

describe('Aetherworks // Clockwork Crucible Verification Suite', () => {
  it('1. verifies magnetic detent rotation (60°/90°) with angular spring overshoot (stiffness: 420, damping: 22) & grid placement', () => {
    expect(ANGULAR_SPRING_STIFFNESS).toBe(420);
    expect(ANGULAR_SPRING_DAMPING).toBe(22);

    const state = createInitialState(101);
    expect(state.gridCols).toBe(3);
    expect(state.gridRows).toBe(3);
    expect(state.modules).toHaveLength(2);

    const deflector = state.modules.find((m) => m.kind === 'deflector')!;
    expect(deflector).toBeDefined();
    expect(deflector.detentStepDeg).toBe(90);

    // Pick up the deflector from the tray
    const picked = pickupModule(state, deflector.id, 1.5, 1.5);
    expect(picked).toBe(true);
    expect(state.draggedModuleId).toBe(deflector.id);
    expect(state.audioQueue.some((a) => a.type === 'pickup_clack')).toBe(true);

    // Rotate 90° and verify angular spring overshoot above 90° before settling to 90°
    rotateModule(state, deflector.id, 1);
    expect(deflector.targetAngleDeg).toBe(90);
    expect(state.audioQueue.some((a) => a.type === 'ratchet_click')).toBe(true);

    let maxAngleReached = deflector.currentAngleDeg;
    for (let i = 0; i < 60; i++) {
      stepSimulation(state, 1 / 120);
      if (deflector.currentAngleDeg > maxAngleReached) {
        maxAngleReached = deflector.currentAngleDeg;
      }
    }
    // Spring overshoot must exceed target 90° before settling back to 90°
    expect(maxAngleReached).toBeGreaterThan(90.5);
    expect(Math.abs(deflector.currentAngleDeg - 90)).toBeLessThan(2.5);

    // Drop module onto socket (1, 1) adjacent to starter furnace at (1, 0)
    const dropped = dropModuleOnSocket(state, deflector.id, 1, 1);
    expect(dropped).toBe(true);
    expect(deflector.col).toBe(1);
    expect(deflector.row).toBe(1);
    expect(deflector.connectionPulseTimer).toBeGreaterThan(0.8);
    expect(state.particles.length).toBeGreaterThanOrEqual(12);
    expect(state.audioQueue.some((a) => a.type === 'socket_seat')).toBe(true);
  });

  it('2. verifies orb splitting (Bifrost Prism) and transmutation (Alchemy Furnace) cascades with micro hit-stop & recoil', () => {
    const state = createInitialState(202);
    // Place Furnace at (1, 0) and Bifrost Prism at (1, 1) along center drop spout column (col 1)
    const furnace = state.modules.find((m) => m.kind === 'furnace')!;
    furnace.col = 1;
    furnace.row = 0;

    const prism = createModule('mod_test_prism', 'prism', 2, 1, 1, 0);
    state.modules.push(prism);

    const launched = pullLaunchLever(state);
    expect(launched).toBe(true);
    expect(state.phase).toBe('cascade');
    const initialOrbCount = state.orbs.length;
    expect(initialOrbCount).toBe(2);

    let sawHeatedTier = false;
    let sawSplitIncrease = false;
    let sawHitStopOrRecoil = false;

    for (let i = 0; i < 180; i++) {
      stepSimulation(state, 1 / 60);
      if (state.orbs.some((o) => o.tier === 'heated' || o.tier === 'supercritical')) {
        sawHeatedTier = true;
      }
      if (state.orbs.length > initialOrbCount) {
        sawSplitIncrease = true;
      }
      if (
        furnace.hitStopTimer > 0 ||
        Math.abs(furnace.recoilY) > 0.01 ||
        prism.hitStopTimer > 0
      ) {
        sawHitStopOrRecoil = true;
      }
    }

    expect(sawHeatedTier).toBe(true);
    expect(sawSplitIncrease).toBe(true);
    expect(sawHitStopOrRecoil).toBe(true);
    expect(state.cascadeActivationCount).toBeGreaterThanOrEqual(2);
    expect(state.badges.length).toBeGreaterThan(0);
  });

  it('3. verifies Overclock Valve multiplier recycling (×2 → ×4 → ×8) vs. Boiler Pressure gasket blowout', () => {
    const state = createInitialState(303);
    pullLaunchLever(state);

    // Run until orbs enter the Collector Chute and populate the Unbanked Crucible Pot
    for (let i = 0; i < 150; i++) {
      // Keep valve held so it doesn't auto-bank before we inspect
      if (state.cruciblePot > 0 && state.orbs.length > 0) {
        state.collectSettleTimer = 0;
      }
      stepSimulation(state, 1 / 60);
      if (state.orbs.length === 0 && state.cruciblePot > 0) break;
    }

    const basePot = state.cruciblePot;
    expect(basePot).toBeGreaterThan(0);
    expect(state.overclockMultiplier).toBe(1);

    // First Overclock recycle: ×2 multiplier and orbs pumped back to top spout
    state.boilerPressure = 10;
    const recycled1 = triggerOverclockRecycle(state);
    expect(recycled1).toBe(true);
    expect(state.overclockMultiplier).toBe(2);
    expect(state.cruciblePot).toBe(basePot * 2);
    expect(state.orbs.length).toBeGreaterThanOrEqual(2);
    expect(state.boilerPressure).toBeGreaterThan(10);

    // Second Overclock recycle: ×4 multiplier
    state.orbs = [];
    state.collectedOrbsCount = 2;
    state.boilerPressure = 20;
    const recycled2 = triggerOverclockRecycle(state);
    expect(recycled2).toBe(true);
    expect(state.overclockMultiplier).toBe(4);
    expect(state.cruciblePot).toBe(basePot * 4);

    // Safe Cash-Out vents steam and banks Crucible Pot into BANKED score
    const bankedBefore = state.bankedScore;
    const cashed = cashOutCruciblePot(state);
    expect(cashed).toBe(true);
    expect(state.bankedScore).toBe(bankedBefore + basePot * 4);
    expect(state.cruciblePot).toBe(0);

    // Verify Boiler Overpressure Gasket Blowout shatters Unbanked Crucible Pot to 0
    const blowoutState = createInitialState(304);
    pullLaunchLever(blowoutState);
    blowoutState.cruciblePot = 500;
    blowoutState.collectedOrbsCount = 3;
    blowoutState.boilerPressure = 85;
    expect(computeBlowoutChance(85)).toBeGreaterThan(0.2);

    const survived = triggerOverclockRecycle(blowoutState);
    expect(survived).toBe(false);
    expect(blowoutState.gasketBlown).toBe(true);
    expect(blowoutState.cruciblePot).toBe(0);
    expect(blowoutState.audioQueue.some((a) => a.type === 'gasket_blowout')).toBe(true);
  });

  it('4. verifies Anti-Infinite-Loop Surge Protection (>4 seconds loop supercharges orb & ejects to Collector)', () => {
    const state = createInitialState(404);
    pullLaunchLever(state);
    const orb = state.orbs[0];
    expect(orb.tier).toBe('raw');
    const initialVal = orb.value;

    // Simulate orb looping for > 4.0 seconds
    orb.loopTimer = 4.05;
    stepSimulation(state, 1 / 60);

    expect(orb.isSurging).toBe(true);
    expect(orb.tier).toBe('supercritical');
    expect(orb.value).toBe(initialVal * 3);
    expect(state.badges.some((b) => b.text.includes('OVERLOAD SURGE'))).toBe(true);

    // Direct triggerOverloadSurge helper verification
    const orb2 = state.orbs[1];
    triggerOverloadSurge(state, orb2);
    expect(orb2.isSurging).toBe(true);
    expect(orb2.tier).toBe('supercritical');
  });

  it('5. verifies Harmonic Pitch Scaling along Lydian/Pentatonic scale (f = f0 * 2^(semitone/12)) & 1-sentence Blueprint Drafts', () => {
    const baseFreq = 261.63;
    const freqs = [0, 1, 2, 3, 4, 5, 6, 7].map((idx) =>
      computeHarmonicFrequency(idx, baseFreq)
    );

    // Verify strictly ascending frequencies
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]).toBeGreaterThan(freqs[i - 1]);
    }

    // Verify exact mathematical match with f = f0 * 2^(semitone/12)
    for (let i = 0; i < LYDIAN_SEMITONES.length; i++) {
      const expected = Number(
        (baseFreq * Math.pow(2, LYDIAN_SEMITONES[i] / 12)).toFixed(4)
      );
      expect(computeHarmonicFrequency(i, baseFreq)).toBe(expected);
    }
    // Octave wrap (step 7 = +12 semitones = 2 * baseFreq)
    expect(computeHarmonicFrequency(7, baseFreq)).toBeCloseTo(baseFreq * 2, 2);

    // Verify Blueprint Draft cards have strictly 1 sentence max and expand workbench grid
    for (const card of DRAFT_BLUEPRINT_POOL) {
      const sentenceCount = card.description
        .split(/(?<!\d)[.!?]+(?!\d)/)
        .filter((s) => s.trim().length > 0).length;
      expect(sentenceCount).toBe(1);
    }

    for (const modMeta of Object.values(MODULE_CATALOG)) {
      expect(modMeta.detentStepDeg === 60 || modMeta.detentStepDeg === 90).toBe(true);
    }

    const state = createInitialState(505);
    openBlueprintDraft(state);
    expect(state.phase).toBe('draft');
    expect(state.draftChoices).toHaveLength(3);

    // Pick card 0 -> advances Quota 1 (3x3) to Quota 2 (4x4)
    selectBlueprintCard(state, 0);
    expect(state.phase).toBe('wiring');
    expect(state.quotaLevel).toBe(2);
    expect(state.gridCols).toBe(4);
    expect(state.gridRows).toBe(4);
  });
});
