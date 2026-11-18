import { describe, expect, it } from 'vitest';
import { BrassBoneAudio } from '../src/audio';
import {
  BrassBoneSimulation,
  DRAWER_RECT,
  INK_PAD_RECT,
  LEDGER_RECT,
  STICKY_NOTE_RECT,
   getCasesForNight,
  mountGame,
} from '../src/index';

describe('THE WEIGHT OF BRASS & BONE — Diegetic Appraiser Workbench Suite', () => {
  it('enforces the 100% Diegetic Zero-HUD Rule (only a single canvas in DOM, zero HTML buttons or sidebars)', () => {
    const container = document.createElement('div');
    const instance = mountGame(container, { initialSeed: 1891 });

    const canvases = container.querySelectorAll('canvas');
    const buttons = container.querySelectorAll('button');
    const sidebars = container.querySelectorAll('aside, nav, table');

    expect(canvases.length).toBe(1);
    expect(buttons.length).toBe(0);
    expect(sidebars.length).toBe(0);

    const snap = instance.getStateSnapshot?.() as {
      night: number;
      claimantName: string;
      sovereigns: number;
    };
    expect(snap.night).toBe(1);
    expect(snap.claimantName).toBe('Thomas Poole');
    expect(snap.sovereigns).toBe(30);

    instance.destroy();
  });

  it('simulates the Brass Balance Scale damped spring oscillator when weighing relics and brass counterweights', () => {
    const sim = new BrassBoneSimulation(new BrassBoneAudio(), 1891);
    const pans = sim.getScalePanPositions(0);

    // Pick up the 30g Gold Sovereign artifact and drop it on the Right Pan
    const art = sim.objects.get('artifact')!;
    sim.onPointerDown(art.x, art.y);
    sim.onPointerMove(pans.rightX, pans.rightY);
    sim.update(0.016);
    sim.onPointerUp();

    expect(art.onRightPan).toBe(true);

    // Step physics so the beam tips rightward (positive angle)
    for (let i = 0; i < 40; i++) sim.update(0.016);
    expect(sim.state.rightPanGrams).toBe(30);
    expect(sim.state.scaleAngle).toBeGreaterThan(0.15);

    // Now drop 10g and 20g brass weights onto the Left Pan to balance the 30g Sovereign
    const w10 = sim.objects.get('weight_10')!;
    const w20 = sim.objects.get('weight_20')!;
    const tiltedPans = sim.getScalePanPositions(sim.state.scaleAngle);

    sim.onPointerDown(w10.x, w10.y);
    sim.onPointerMove(tiltedPans.leftX, tiltedPans.leftY);
    sim.update(0.016);
    sim.onPointerUp();

    const tiltedPans2 = sim.getScalePanPositions(sim.state.scaleAngle);
    sim.onPointerDown(w20.x, w20.y);
    sim.onPointerMove(tiltedPans2.leftX, tiltedPans2.leftY);
    sim.update(0.016);
    sim.onPointerUp();

    for (let i = 0; i < 90; i++) sim.update(0.016);
    expect(sim.state.leftPanGrams).toBe(30);
    expect(Math.abs(sim.state.scaleAngle)).toBeLessThan(0.02);
  });

  it('applies spring lag, velocity-based tilt clamp(vx * 0.015, -0.25, 0.25), and micro-bounce on dragged objects', () => {
    const sim = new BrassBoneSimulation(new BrassBoneAudio(), 1891);
    const loupe = sim.objects.get('loupe')!;

    sim.onPointerDown(loupe.x, loupe.y);
    expect(loupe.targetLift).toBe(1);

    // Rapidly move pointer left
    sim.onPointerMove(loupe.x - 280, loupe.y);
    sim.update(0.016);
    expect(loupe.vx).toBeLessThan(0);
    expect(loupe.rotation).toBeLessThan(0);
    expect(loupe.rotation).toBeGreaterThanOrEqual(-0.25);

    sim.onPointerUp();
    expect(loupe.targetLift).toBe(0);
    expect(loupe.bounceScale).toBeLessThan(1.0);
  });

  it('triggers Acoustic Stethoscope / Tuning Fork material resonance and Oscillograph waveform on tap', () => {
    const sim = new BrassBoneSimulation(new BrassBoneAudio(), 1891);
    // Load Night 2 Case 1 (Imperial Bullion Ingot with secret 95Hz Hollow Lead Core)
    const night2Cases = getCasesForNight(2);
    sim.loadCase(night2Cases[0]);

    for (let i = 0; i < 30; i++) sim.update(0.016);

    const fork = sim.objects.get('tuning_fork')!;
    const art = sim.objects.get('artifact')!;

    sim.onPointerDown(fork.x, fork.y);
    sim.onPointerMove(art.x, art.y);
    sim.update(0.016);
    sim.onPointerUp();

    expect(sim.state.lastTestedResonance).toBe('hollow_lead');
    expect(sim.state.oscillographActive).toBeGreaterThan(0.8);
  });

  it('flips between the 3 illustrated pages of the Reference Ledger and unpins the Night 1 Sticky Note', () => {
    const sim = new BrassBoneSimulation(new BrassBoneAudio(), 1891);
    expect(sim.state.stickyNoteDismissed).toBe(false);

    // Click the Night 1 Sticky Note to unpin it
    sim.onPointerDown(STICKY_NOTE_RECT.x + 20, STICKY_NOTE_RECT.y + 20);
    expect(sim.state.stickyNoteDismissed).toBe(true);

    // Flip Reference Ledger forward through all 3 pages
    expect(sim.state.ledgerPage).toBe(0);
    sim.onPointerDown(LEDGER_RECT.x + LEDGER_RECT.w - 30, LEDGER_RECT.y + 100);
    expect(sim.state.ledgerPage).toBe(1);
    sim.onPointerDown(LEDGER_RECT.x + LEDGER_RECT.w - 30, LEDGER_RECT.y + 100);
    expect(sim.state.ledgerPage).toBe(2);
  });

  it('inks the Heavy Iron Stamps, slams them onto the Assay Slip with 45ms hit-stop, and supports Fencing in the Smuggler’s Drawer', () => {
    const sim = new BrassBoneSimulation(new BrassBoneAudio(), 1891);
    for (let i = 0; i < 35; i++) sim.update(0.016);

    // Case 1: Dip Green Stamp in Ink Pad and slam onto the Assay Slip
    const greenStamp = sim.objects.get('stamp_certify')!;
    const slip = sim.objects.get('assay_slip')!;

    sim.onPointerDown(greenStamp.x, greenStamp.y);
    sim.onPointerMove(INK_PAD_RECT.x + 40, INK_PAD_RECT.y + 30);
    sim.update(0.016);
    expect(greenStamp.inkAmount).toBe(1.0);

    sim.onPointerMove(slip.x, slip.y);
    sim.update(0.016);
    sim.onPointerUp();

    expect(sim.state.hitStopTimer).toBeCloseTo(0.045, 2);
    expect(sim.state.pendingDecision).toBe('certify');
    expect(sim.state.sovereigns).toBe(42); // 30 + 12g payout

    // Advance past exit transition to Case 2 (Silas Vane's forged 20g Sovereign)
    for (let i = 0; i < 70; i++) sim.update(0.016);
    expect(sim.state.caseIndexInNight).toBe(1);

    // Case 2: Drag artifact down into the hidden Smuggler's Drawer to Fence it for 2x payout!
    const art = sim.objects.get('artifact')!;
    sim.onPointerDown(art.x, art.y);
    sim.onPointerMove(DRAWER_RECT.x + 120, DRAWER_RECT.y + 10);
    for (let i = 0; i < 20; i++) sim.update(0.016);
    expect(sim.state.drawerOpenAmount).toBeGreaterThan(0.5);
    sim.onPointerUp();

    expect(sim.state.pendingDecision).toBe('fence');
    expect(sim.state.suspicion).toBe(1);
    expect(sim.state.sovereigns).toBe(68); // 42 + 26g fence payout

    // Advance to Case 3 and complete Night 1 to verify Honest Post-Night Ledger
    for (let i = 0; i < 70; i++) sim.update(0.016);
    expect(sim.state.caseIndexInNight).toBe(2);

    sim.triggerDecision('certify');
    for (let i = 0; i < 70; i++) sim.update(0.016);
    expect(sim.state.phase).toBe('night_summary');
    expect(sim.state.nightRecords.length).toBe(3);
  });
});
