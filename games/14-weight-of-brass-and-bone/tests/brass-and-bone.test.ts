import { describe, expect, it } from 'vitest';
import { metadata, mountGame } from '../src/index';
import {
  INK_PAD_X,
  INK_PAD_Y,
  SMUGGLER_DRAWER_X,
  SMUGGLER_DRAWER_Y,
  WorkbenchState,
  advanceAfterVerdict,
  commitVerdict,
  createInitialState,
  flipLedgerPage,
  getScalePanPositions,
  pointerDownWorkbench,
  pointerMoveWorkbench,
  pointerUpWorkbench,
  startNextNightOrFinish,
  stepSimulation,
  strikeArtifactWithTuningFork,
} from '../src/simulation';
import { CLAIMANT_ROSTER, NIGHT_BRIEFINGS } from '../src/story';

describe('THE WEIGHT OF BRASS & BONE — Diegetic Appraiser Workbench Suite', () => {
  it('exposes complete ArgonGameMetadata and mounts strictly without HTML HUD buttons', () => {
    expect(metadata.id).toBe('14-weight-of-brass-and-bone');
    expect(metadata.title).toContain('THE WEIGHT OF BRASS & BONE');

    const container = document.createElement('div');
    const instance = mountGame(container, { initialSeed: 1891 });

    // Strict Zero-HUD check: no <button>, no sidebars, only the stage and canvas
    expect(container.querySelectorAll('button').length).toBe(0);
    expect(container.querySelector('canvas')).not.toBeNull();

    const snap = instance.getStateSnapshot?.() as WorkbenchState;
    expect(snap.night).toBe(1);
    expect(snap.currentCase.id).toBe('n1_c1_vance');

    instance.destroy();
  });

  it('simulates the damped spring Brass Balance Scale when weights and artifacts are placed on pans', () => {
    const state = createInitialState(1891);
    const pans = getScalePanPositions(state.scaleAngle);

    // Drag artifact onto the Right Pan
    const art = state.objects.artifact;
    pointerDownWorkbench(state, art.x, art.y);
    expect(state.draggedId).toBe('artifact');
    pointerMoveWorkbench(state, pans.rightX, pans.rightY);
    for (let i = 0; i < 20; i++) stepSimulation(state, 16);
    pointerUpWorkbench(state);
    expect(art.onRightPan).toBe(true);

    // Step simulation: right pan has 30g, left pan has 0g -> scale tips positive
    for (let i = 0; i < 40; i++) stepSimulation(state, 16);
    expect(state.rightPanMassGrams).toBe(30);
    expect(state.scaleAngle).toBeGreaterThan(0.1);

    // Now place 10g + 20g counterweights onto the Left Pan to balance 30g!
    for (const wId of ['weight_10', 'weight_20'] as const) {
      const w = state.objects[wId];
      const curPans = getScalePanPositions(state.scaleAngle);
      pointerDownWorkbench(state, w.x, w.y);
      pointerMoveWorkbench(state, curPans.leftX, curPans.leftY);
      for (let i = 0; i < 15; i++) stepSimulation(state, 16);
      pointerUpWorkbench(state);
      expect(w.onLeftPan).toBe(true);
    }

    for (let i = 0; i < 90; i++) stepSimulation(state, 16);
    expect(state.leftPanMassGrams).toBe(30);
    expect(state.inspectedWeight).toBe(true);
    expect(Math.abs(state.scaleAngle)).toBeLessThan(0.02);
  });

  it('activates Loupe, UV Aether Lens, Tuning Fork Oscillograph, and Reference Ledger pages', () => {
    const state = createInitialState(1891);

    // Flip through all 3 Ledger pages
    expect(state.ledgerPage).toBe(0);
    flipLedgerPage(state, 1);
    expect(state.ledgerPage).toBe(1);
    flipLedgerPage(state, 2);
    expect(state.ledgerPage).toBe(2);

    // Drag Loupe over Artifact
    const loupe = state.objects.loupe;
    const art = state.objects.artifact;
    pointerDownWorkbench(state, loupe.x, loupe.y);
    pointerMoveWorkbench(state, art.x, art.y);
    for (let i = 0; i < 25; i++) stepSimulation(state, 16);
    expect(state.inspectedLoupe).toBe(true);
    pointerUpWorkbench(state);

    // Drag UV Lens over Artifact
    const uv = state.objects.uv_lens;
    pointerDownWorkbench(state, uv.x, uv.y);
    pointerMoveWorkbench(state, art.x, art.y);
    for (let i = 0; i < 25; i++) stepSimulation(state, 16);
    expect(state.inspectedUV).toBe(true);
    pointerUpWorkbench(state);

    // Strike Artifact with Tuning Fork
    strikeArtifactWithTuningFork(state);
    expect(state.inspectedAcoustic).toBe(true);
    expect(state.oscillographTimer).toBeGreaterThan(2.0);
  });

  it('supports dipping Iron Stamps into the Ink Pad, stamping the Slip, Fencing in Smuggler Drawer, and progressing across all 5 Nights', () => {
    const state = createInitialState(1891);
    expect(NIGHT_BRIEFINGS.length).toBe(5);
    expect(CLAIMANT_ROSTER.length).toBe(16);

    // Dip Green Stamp in Ink Pad then slam onto Claimant Slip
    const sg = state.objects.stamp_green;
    const slip = state.objects.claimant_slip;
    pointerDownWorkbench(state, sg.x, sg.y);
    pointerMoveWorkbench(state, INK_PAD_X, INK_PAD_Y);
    for (let i = 0; i < 15; i++) stepSimulation(state, 16);
    expect(state.greenStampInked).toBe(true);

    pointerMoveWorkbench(state, slip.x, slip.y + 40);
    for (let i = 0; i < 15; i++) stepSimulation(state, 16);
    pointerUpWorkbench(state);

    expect(state.phase).toBe('verdict_transition');
    expect(state.slipImprints.length).toBe(1);
    expect(state.hitStopMs).toBeGreaterThan(0);

    // Advance to Visitor 2 (Callum — underweight shaved sovereign)
    advanceAfterVerdict(state);
    expect(state.phase).toBe('inspecting');
    expect(state.currentCase.id).toBe('n1_c2_callum');

    // Fence Callum's coin in the Smuggler's Drawer at the bottom edge of the desk
    const art = state.objects.artifact;
    pointerDownWorkbench(state, art.x, art.y);
    pointerMoveWorkbench(state, SMUGGLER_DRAWER_X, SMUGGLER_DRAWER_Y - 10);
    for (let i = 0; i < 20; i++) stepSimulation(state, 16);
    expect(state.drawerOpenRatio).toBeGreaterThan(0.5);
    pointerUpWorkbench(state);

    expect(state.pendingVerdict).toBe('fence');
    expect(state.syndicateFavor).toBeGreaterThanOrEqual(1);
    advanceAfterVerdict(state);

    // Visitor 3 (Lady Evelyn — forged inverted crown ingot) -> Seize with Red Stamp
    expect(state.currentCase.id).toBe('n1_c3_evelyn');
    commitVerdict(state, 'confiscate');
    advanceAfterVerdict(state);

    // End of Night 1 -> Post-Night Balance Sheet
    expect(state.phase).toBe('night_summary');
    expect(state.tonightRecords.length).toBe(3);
    expect(state.rentPaidTonight).toBe(true);

    // Advance into Night 2
    startNextNightOrFinish(state);
    expect(state.phase).toBe('inspecting');
    expect(state.night).toBe(2);
    expect(state.currentCase.id).toBe('n2_c1_krell');
  });
});
