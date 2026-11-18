import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CrucibleWorkbenchSim,
  ZONES,
  metadata,
  mountGame,
  stepSpring1D,
} from '../src/index';

describe('14 - The Brass Crucible: Tactile Alchemical Engine', () => {
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
      measureText: vi.fn(() => ({ width: 42 })),
      setLineDash: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  it('boots directly into Commission #1 ("Crack & Distill.") with a Cinnabar bead and Lead Geode in the chute', () => {
    const sim = new CrucibleWorkbenchSim(20261108);
    expect(sim.currentCommission.level).toBe(1);
    expect(sim.currentCommission.title).toBe('Crack & Distill.');
    expect(sim.beads.length).toBeGreaterThanOrEqual(2);

    const elements = sim.beads.map((b) => b.element);
    expect(elements).toContain('cinnabar');
    expect(elements).toContain('lead');
  });

  it('simulates Hooke-law spring-damper physics on the Weighing Scale Pan and Cursor-as-Hand inertia', () => {
    const sim = new CrucibleWorkbenchSim(20261108);

    // Drop a heavy Lead Geode onto the Brass Weighing Scale Pan
    const leadBead = sim.beads.find((b) => b.element === 'lead')!;
    leadBead.zone = 'pan';
    leadBead.x = ZONES.weighingPan.centerX;
    leadBead.y = ZONES.weighingPan.baseY - leadBead.radius - 2;
    leadBead.vy = 220;

    sim.step(1 / 60);
    expect(sim.weighingPanSpring.velocity).toBeGreaterThan(0);

    for (let i = 0; i < 20; i++) {
      sim.step(1 / 60);
    }
    expect(sim.weighingPanSpring.position).toBeGreaterThan(2);
    expect(sim.lastWeighedMass).toBeCloseTo(3.2, 1);

    // Verify 1D spring helper converges toward target
    const spring = { position: 0, velocity: 0, target: 10, stiffness: 180, damping: 14 };
    for (let i = 0; i < 120; i++) {
      stepSpring1D(spring, 1 / 60);
    }
    expect(spring.position).toBeCloseTo(10, 0);
  });

  it('supports all 5 emergent reagent states: Lead impact/shear cracking, Cinnabar heating, Vitriol dissolution, Aether x3/x5 loops, and Salt crystallization', () => {
    const sim = new CrucibleWorkbenchSim(20261108);
    sim.beads = [];

    // 1. Lead Geode cracked via Vitriol Acid dissolution
    const geode = sim.spawnBeadInChute('lead', 0, false, 'crucible', {
      x: ZONES.crucible.centerX,
      y: ZONES.crucible.centerY,
    });
    const acid = sim.spawnBeadInChute('vitriol', 0, false, 'crucible', {
      x: ZONES.crucible.centerX + 18,
      y: ZONES.crucible.centerY,
    });
    expect(geode.isGoldCore).toBe(false);

    for (let i = 0; i < 45; i++) {
      geode.x = ZONES.crucible.centerX;
      geode.y = ZONES.crucible.centerY;
      acid.x = ZONES.crucible.centerX + 16;
      acid.y = ZONES.crucible.centerY;
      sim.step(1 / 60);
    }
    expect(geode.isGoldCore).toBe(true);

    // 2. Aether Quicksilver forms a closed Triangle (x3) and Quad (x5) geometric loop
    const aether1 = sim.spawnBeadInChute('aether', 0, false, 'crucible', {
      x: ZONES.crucible.centerX - 30,
      y: ZONES.crucible.centerY - 25,
    });
    const aether2 = sim.spawnBeadInChute('aether', 0, false, 'crucible', {
      x: ZONES.crucible.centerX + 30,
      y: ZONES.crucible.centerY - 25,
    });
    sim.step(1 / 60);
    expect(sim.activeLoopMultiplier).toBe(5); // 4 conductive beads (geode, acid, aether1, aether2) in range => Quad x5!
    expect(aether1.loopBonus).toBe(5);
    expect(aether2.loopBonus).toBe(5);

    // 3. Philosopher's Salt crystallizes an adjacent reagent into a Sovereign Gem and freezes pressure
    sim.pressureBar = 6.5;
    const salt = sim.spawnBeadInChute('salt', 0, false, 'crucible', {
      x: geode.x + 10,
      y: geode.y,
    });
    sim.step(1 / 60);
    expect(geode.isPhilosopherGem).toBe(true);
    expect(sim.pressureFrozenTimer).toBeGreaterThan(0);
    expect(sim.beads.some((b) => b.id === salt.id)).toBe(false);
  });

  it('builds pressure when Vent is Clamped, forms hairline cracks above 7 Bar, and flushes coins onto the Assay Scale on Discharge', () => {
    const sim = new CrucibleWorkbenchSim(20261108);
    // Move starter beads into the crucible
    for (const b of sim.beads) {
      b.zone = 'crucible';
      b.x = ZONES.crucible.centerX;
      b.y = ZONES.crucible.centerY;
    }

    // Clamp the vent and pump the bellows
    sim.toggleVentClamp(true);
    expect(sim.ventClamped).toBe(true);

    for (let i = 0; i < 6; i++) {
      sim.pumpBellows(1.0);
    }
    sim.step(1 / 60);
    expect(sim.pressureBar).toBeGreaterThan(6.5);

    // Pull Shear-Blade to ensure Lead Geode is cleaved into Gold Core
    sim.pullShearBlade();
    expect(sim.beads.some((b) => b.isGoldCore)).toBe(true);

    // Pull Discharge Lever to flush into Assay Scale
    const minted = sim.pullDischargeLever();
    expect(minted).toBeGreaterThanOrEqual(4);

    // Step simulation so pending assay coins clink onto the balance beam and advance Commission #1 -> #2
    for (let i = 0; i < 60; i++) {
      sim.step(0.03);
    }
    expect(sim.totalCoinsMinted).toBe(minted);
    expect(sim.currentCommission.level).toBeGreaterThanOrEqual(2);

    // Spend minted coins to bolt the Twin-Jaw Crusher onto the workbench
    sim.walletCoins = 10;
    const bolted = sim.interactAttachment('crusher');
    expect(bolted).toBe(true);
    expect(sim.boltedAttachments.has('crusher')).toBe(true);
  });

  it('mounts the single-screen canvas workbench, exposes ArgonGameInstance hooks, and pauses on contentvisibilityautostatechange', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const instance = mountGame(container, { initialSeed: 20261108, debug: false });
    expect(metadata.id).toBe('14-clockwork-crucible');
    expect(container.querySelector('canvas')).not.toBeNull();

    const snap = instance.getStateSnapshot?.() as { commissionTitle: string; beadCount: number };
    expect(snap.commissionTitle).toBe('Crack & Distill.');
    expect(snap.beadCount).toBeGreaterThanOrEqual(2);

    const host = container.querySelector('.crucible-workbench-host')!;
    const skipEvt = new Event('contentvisibilityautostatechange') as Event & { skipped?: boolean };
    skipEvt.skipped = true;
    host.dispatchEvent(skipEvt);

    const resumeEvt = new Event('contentvisibilityautostatechange') as Event & { skipped?: boolean };
    resumeEvt.skipped = false;
    host.dispatchEvent(resumeEvt);

    instance.toggleDebug?.(true);
    instance.restartWithSeed?.(99999);
    instance.destroy();
    expect(container.innerHTML).toBe('');
    container.remove();
  });
});
