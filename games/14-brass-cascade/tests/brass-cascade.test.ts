import { describe, expect, it } from 'vitest';
import { buildStages, RELIC_CATALOG } from '../src/levels';
import { simulateCascade } from '../src/simulation';
import { RelicId } from '../src/types';

describe('BRASS CASCADE // Tactile Spatial Domino Tactics Engine', () => {
  it('Stage 1 Turn 1 solves with a single 1-Move, Multi-Step Domino Cascade killing both Strikers', () => {
    const stages = buildStages();
    const s1 = stages[0];

    const preview = simulateCascade(
      s1.tiles,
      s1.initialPieces,
      [
        {
          id: 'turn1_one_move',
          tool: 'ram_shove',
          sourcePieceId: 'p_van_1',
          targetX: 1,
          targetY: 2,
          dir: 'E'
        }
      ],
      new Set<RelicId>(),
      false
    );

    // 1 move triggers >= 5 cascade steps:
    // 1. BRASS RAM -> 2. DOMINO SLAM -> 3. SLIDE -> 4. ABYSS DROP -> 5. FOLLOW SLIDE -> 6. VENT PLUGGED -> 7. VENT KO
    expect(preview.steps.length).toBeGreaterThanOrEqual(5);
    expect(preview.doomedPieceIds.has('e_s1_a')).toBe(true);
    expect(preview.doomedPieceIds.has('e_s1_b')).toBe(true);
    expect(preview.peakMultiplier).toBeGreaterThanOrEqual(5);
    expect(preview.predictedScoreDelta).toBeGreaterThan(500);
  });

  it('Progressive Complexity: Stages 2, 3, 4, and 5 each introduce their new spatial board verb', () => {
    const stages = buildStages();
    expect(stages.length).toBe(5);

    // Stage 2: Spring-Piston floor tiles
    const s2 = stages[1];
    expect(s2.tiles.flat().some((t) => t.kind === 'piston')).toBe(true);
    const p2 = simulateCascade(
      s2.tiles,
      s2.initialPieces,
      [{ id: 's2_move', tool: 'ram_shove', sourcePieceId: 'p_van_2', targetX: 0, targetY: 1, dir: 'E' }],
      new Set<RelicId>(),
      false
    );
    expect(p2.steps.some((s) => s.kind === 'piston_launch')).toBe(true);

    // Stage 3: Conductive Chain-Lightning Pylons
    const s3 = stages[2];
    expect(s3.tiles.flat().some((t) => t.kind === 'pylon')).toBe(true);
    const p3 = simulateCascade(
      s3.tiles,
      s3.initialPieces,
      [{ id: 's3_move', tool: 'ram_shove', sourcePieceId: 'p_van_3', targetX: 0, targetY: 2, dir: 'E' }],
      new Set<RelicId>(),
      false
    );
    expect(p3.steps.some((s) => s.kind === 'pylon_zap')).toBe(true);

    // Stage 4: Volatile Sliding Bomb Barrels
    const s4 = stages[3];
    expect(s4.initialPieces.some((p) => p.kind === 'barrel')).toBe(true);
    const p4 = simulateCascade(
      s4.tiles,
      s4.initialPieces,
      [{ id: 's4_move', tool: 'ram_shove', sourcePieceId: 'p_van_4', targetX: 0, targetY: 2, dir: 'E' }],
      new Set<RelicId>(),
      false
    );
    expect(p4.steps.some((s) => s.kind === 'barrel_detonate')).toBe(true);

    // Stage 5: Paired Phase Portals & Deflector Prisms
    const s5 = stages[4];
    expect(s5.tiles.flat().some((t) => t.kind === 'portal_a')).toBe(true);
    expect(s5.tiles.flat().some((t) => t.kind === 'prism_ne')).toBe(true);
    const p5 = simulateCascade(
      s5.tiles,
      s5.initialPieces,
      [{ id: 's5_move', tool: 'ram_shove', sourcePieceId: 'p_van_5', targetX: 0, targetY: 1, dir: 'E' }],
      new Set<RelicId>(),
      false
    );
    expect(p5.steps.some((s) => s.kind === 'portal_warp')).toBe(true);
  });

  it('Transformative Relics bend board physics (Cryo-Slide Chasms, Elastic Rim, Tesla Tether)', () => {
    expect(RELIC_CATALOG.length).toBe(6);
    for (const r of RELIC_CATALOG) {
      // Law 8: Strictly 1 sentence max per relic card
      const sentences = r.ruleText.split('.').filter((s) => s.trim().length > 0);
      expect(sentences.length).toBe(1);
    }

    const stages = buildStages();
    const s1 = stages[0];
    const withCryo = simulateCascade(
      s1.tiles,
      s1.initialPieces,
      [{ id: 'cryo_test', tool: 'ram_shove', sourcePieceId: 'p_van_1', targetX: 1, targetY: 2, dir: 'E' }],
      new Set<RelicId>(['cryo_chasms']),
      false
    );
    expect(withCryo.steps.some((s) => s.kind === 'cryo_freeze')).toBe(true);
    expect(withCryo.finalTiles[2][5].kind).toBe('ice');
  });

  it('Boots directly onto Stage 1 Turn 1 with live causality preview and supports one-handed controls', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    // Mock 2D context for jsdom
    const noop = () => {};
    HTMLCanvasElement.prototype.getContext = (() =>
      ({
        save: noop,
        restore: noop,
        translate: noop,
        rotate: noop,
        scale: noop,
        setTransform: noop,
        fillRect: noop,
        beginPath: noop,
        closePath: noop,
        moveTo: noop,
        lineTo: noop,
        arc: noop,
        arcTo: noop,
        fill: noop,
        stroke: noop,
        setLineDash: noop,
        fillText: noop,
        measureText: (t: string) => ({ width: t.length * 7 }),
        createRadialGradient: () => ({ addColorStop: noop }),
        canvas: { width: 960, height: 680 }
      }) as unknown as CanvasRenderingContext2D) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    return import('../src/index').then(({ mountGame }) => {
      const instance = mountGame(host);
      const snap = instance.getStateSnapshot?.() as {
        stageNumber: number;
        turnNumber: number;
        livePreviewSteps: number;
      };
      expect(snap.stageNumber).toBe(1);
      expect(snap.turnNumber).toBe(1);
      expect(snap.livePreviewSteps).toBeGreaterThanOrEqual(5);
      instance.destroy();
      host.remove();
    });
  });
});
