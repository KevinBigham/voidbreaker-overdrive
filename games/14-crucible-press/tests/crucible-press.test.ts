import { describe, expect, it } from 'vitest';
import {
  handlePointerDownAtWorkbench,
  handlePointerMoveAtWorkbench,
  handlePointerUpAtWorkbench,
  metadata,
  mountGame,
} from '../src/index';
import {
  CRUCIBLE_CENTER_X,
  CRUCIBLE_CENTER_Y,
  DIVIDER_Y,
  activateAttachmentVerb,
  createInitialState,
  pullDischargeLever,
  pumpBellows,
  purchaseAttachment,
  spawnBead,
  stepSimulation,
  togglePressureLockGate,
  triggerShearBlade,
  updateConductiveNetwork,
} from '../src/simulation';

describe('14 — Crucible Press // Tactile Alchemical Workbench', () => {
  it('boots immediately with a Cinnabar bead and a Lead geode in the chute and "Crack & Distill." slip', () => {
    const state = createInitialState(20261108);
    expect(state.currentCommission.slipTitle).toBe('Crack & Distill.');

    const chuteBeads = state.beads.filter((b) => b.location === 'chute');
    expect(chuteBeads.map((b) => b.kind)).toEqual(['cinnabar', 'lead_geode']);

    // Also includes a Quicksilver droplet on the Heated Copper Anvil for the Physical Artifact Test
    const anvilBeads = state.beads.filter((b) => b.location === 'anvil');
    expect(anvilBeads.some((b) => b.kind === 'quicksilver')).toBe(true);
  });

  it('implements Cursor-as-Hand spring tether where heavy Lead lags more than light Philosopher Salt', () => {
    const stateLead = createInitialState(101);
    const lead = spawnBead(stateLead, 'lead', 400, 300, 'crucible');
    handlePointerDownAtWorkbench(stateLead, 400, 300);
    expect(stateLead.hand.draggedBeadId).toBe(lead.id);
    handlePointerMoveAtWorkbench(stateLead, 550, 300);
    stepSimulation(stateLead, 0.016);
    stepSimulation(stateLead, 0.016);

    const stateSalt = createInitialState(101);
    const salt = spawnBead(stateSalt, 'salt', 400, 300, 'crucible');
    handlePointerDownAtWorkbench(stateSalt, 400, 300);
    expect(stateSalt.hand.draggedBeadId).toBe(salt.id);
    handlePointerMoveAtWorkbench(stateSalt, 550, 300);
    stepSimulation(stateSalt, 0.016);
    stepSimulation(stateSalt, 0.016);

    // Light Salt snaps much closer to the moved cursor hand than heavy Lead
    expect(salt.x).toBeGreaterThan(lead.x + 15);
    handlePointerUpAtWorkbench(stateLead);
    handlePointerUpAtWorkbench(stateSalt);
  });

  it('simulates all 5 physical reagent chemistries and closed Quicksilver Triangle (x3) / Quad (x5) loops', () => {
    const state = createInitialState(202);
    state.beads = [];

    // 1. Heavy Lead dropped from height crushes a brittle Lead Geode on impact
    const geode = spawnBead(state, 'lead_geode', CRUCIBLE_CENTER_X, 320, 'crucible', 0, 0);
    spawnBead(state, 'lead', CRUCIBLE_CENTER_X, 285, 'crucible', 0, 220);
    for (let i = 0; i < 6; i++) stepSimulation(state, 0.016);
    expect(geode.kind).toBe('gold_core');

    // 2. Cinnabar radiates heat to neighbors and ignites volatile gases
    state.beads = [];
    spawnBead(state, 'cinnabar', CRUCIBLE_CENTER_X, 320, 'crucible');
    state.vapors.push({
      id: 99,
      x: CRUCIBLE_CENTER_X + 20,
      y: 320,
      vx: 0,
      vy: 0,
      radius: 14,
      kind: 'volatile_gas',
      life: 0,
      maxLife: 1.0,
      temperature: 120,
    });
    stepSimulation(state, 0.02);
    expect(state.vapors[0].kind).toBe('ignition_flare');

    // 3. Vitriol dissolves Geode outer shells and corrodes the brass divider when unvented
    state.beads = [];
    togglePressureLockGate(state, true);
    const acidGeode = spawnBead(state, 'lead_geode', CRUCIBLE_CENTER_X - 60, DIVIDER_Y - 22, 'crucible');
    spawnBead(state, 'vitriol', CRUCIBLE_CENTER_X - 55, DIVIDER_Y - 22, 'crucible');
    for (let i = 0; i < 60; i++) stepSimulation(state, 0.025);
    expect(acidGeode.kind).toBe('gold_core');
    expect(state.dividerIntegrity).toBeLessThan(1.0);

    // 4. Quicksilver conductive arcs detect Triangle (x3) and Quad (x5) closed geometric loops
    state.beads = [];
    spawnBead(state, 'quicksilver', CRUCIBLE_CENTER_X - 45, 320, 'crucible');
    spawnBead(state, 'quicksilver', CRUCIBLE_CENTER_X + 45, 320, 'crucible');
    spawnBead(state, 'quicksilver', CRUCIBLE_CENTER_X, 385, 'crucible');
    updateConductiveNetwork(state);
    expect(state.activeLoopOrder).toBe(3);

    spawnBead(state, 'quicksilver', CRUCIBLE_CENTER_X, 265, 'crucible');
    updateConductiveNetwork(state);
    expect(state.activeLoopOrder).toBe(4);

    // 5. Philosopher's Salt freezes reactions and fuses adjacent reagents into a Philosopher's Gem
    spawnBead(state, 'salt', CRUCIBLE_CENTER_X, 325, 'crucible');
    stepSimulation(state, 0.02);
    expect(state.beads.some((b) => b.kind === 'philosopher_gem')).toBe(true);
  });

  it('supports Push-Your-Luck pressure build, Shear-Blade cleaving, Discharge coin cascade, and Workbench Attachments', () => {
    const state = createInitialState(303);
    const geode = spawnBead(state, 'lead_geode', CRUCIBLE_CENTER_X, 290, 'crucible');
    const cleaved = triggerShearBlade(state);
    expect(cleaved).toBeGreaterThanOrEqual(1);
    expect(geode.kind).toBe('gold_core');

    // Clamp vent and pump bellows to build pressure & spawn hairline glass cracks
    togglePressureLockGate(state, true);
    for (let i = 0; i < 8; i++) {
      pumpBellows(state, 1.0);
    }
    stepSimulation(state, 0.03);
    expect(state.vesselPressureBar).toBeGreaterThan(6.2);
    expect(state.cracks.length).toBeGreaterThan(0);

    // Pull Discharge Lever to flush into Assay Scale coin cascade
    const minted = pullDischargeLever(state);
    expect(minted).toBeGreaterThanOrEqual(3);
    expect(state.pendingAssayCoins).toBe(minted);

    // Step simulation so coins drop onto the Assay Scale pan and dip its Hooke's-law spring
    for (let i = 0; i < 90; i++) {
      stepSimulation(state, 0.025);
    }
    expect(state.mintedCoins).toBeGreaterThanOrEqual(3);
    expect(state.commissionIndex).toBeGreaterThanOrEqual(1);

    // Bolt and operate a physical Workbench Attachment
    state.mintedCoins = 20;
    expect(purchaseAttachment(state, 'centrifuge_spinner')).toBe(true);
    expect(activateAttachmentVerb(state, 'centrifuge_spinner')).toBe(true);
  });

  it('mounts cleanly into a DOM container with zero external HUD clutter', () => {
    const container = document.createElement('div');
    const instance = mountGame(container, { initialSeed: 20261108 });
    expect(metadata.id).toBe('14-crucible-press');
    expect(container.querySelector('canvas')).not.toBeNull();
    instance.destroy();
  });
});
