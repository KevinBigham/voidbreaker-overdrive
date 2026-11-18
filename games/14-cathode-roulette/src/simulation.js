export const DESK_WIDTH = 1280;
export const DESK_HEIGHT = 800;
export const MAGNETIC_SNAP_RADIUS = 28;
export const MAGNETIC_PULL_RADIUS = 64;
// Socket Coordinates in 1280x800 Virtual Desk Space
export const SOCKETS = {
    ignitionSocket: { x: 520, y: 455 },
    drumCenter: { x: 610, y: 365 },
    drumShuntTerminals: { x: 610, y: 492 },
    drumMagnetCoil: { x: 482, y: 365 },
    fuseShieldRail: { x: 215, y: 152 },
    scaleRightPan: { x: 815, y: 195 },
    knifeSwitchCenter: { x: 345, y: 365 },
    transformerCrankCenter: { x: 895, y: 365 },
    plungerTrack: { x: 1125, topY: 270, bottomY: 495 },
};
export function nextRandom(state) {
    let t = (state.rngState += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function createSpringNeedle(initialValue = 0, stiffness = 170, damping = 11) {
    return {
        value: initialValue,
        target: initialValue,
        velocity: 0,
        stiffness,
        damping,
    };
}
export function stepSpringNeedle(needle, dtSec) {
    // F = -kx - cv
    const displacement = needle.value - needle.target;
    const force = -needle.stiffness * displacement - needle.damping * needle.velocity;
    needle.velocity += force * dtSec;
    needle.value += needle.velocity * dtSec;
}
const TOOL_CATALOG = {
    xray_loupe: {
        title: 'PHOSPHOR X-RAY LOUPE',
        shortHint: 'DRAG TO DRUM WINDOW → REVEAL NEXT CORE',
        socketLabel: 'DRUM LENS',
        homeX: 165,
        homeY: 695,
        targetSocketX: SOCKETS.drumCenter.x,
        targetSocketY: SOCKETS.drumCenter.y,
    },
    jumper_clamp: {
        title: 'COPPER JUMPER CLAMP',
        shortHint: 'CLIP SHUNT TERMINALS → EJECT CURRENT CORE',
        socketLabel: 'SHUNT TERMINALS',
        homeX: 375,
        homeY: 695,
        targetSocketX: SOCKETS.drumShuntTerminals.x,
        targetSocketY: SOCKETS.drumShuntTerminals.y,
    },
    inverter_magnet: {
        title: 'POLARITY INVERTER MAGNET',
        shortHint: 'SLOT ON FIELD COIL → FLIP BLANK ↔ LIVE',
        socketLabel: 'FIELD COIL',
        homeX: 585,
        homeY: 695,
        targetSocketX: SOCKETS.drumMagnetCoil.x,
        targetSocketY: SOCKETS.drumMagnetCoil.y,
    },
    blast_shield: {
        title: 'LEAD BLAST SHIELD',
        shortHint: 'SLIDE OVER GLASS FUSES → ABSORB 1 MISFIRE',
        socketLabel: 'FUSE ARMOR RAIL',
        homeX: 795,
        homeY: 695,
        targetSocketX: SOCKETS.fuseShieldRail.x,
        targetSocketY: SOCKETS.fuseShieldRail.y,
    },
    overclock_weight: {
        title: '3X OVERCLOCK IRON WEIGHT',
        shortHint: 'DROP ON SCALE PAN → 3X PAYOUT (LOCKS GROUND 2 TURNS)',
        socketLabel: 'SCALE PAYOUT PAN',
        homeX: 1005,
        homeY: 695,
        targetSocketX: SOCKETS.scaleRightPan.x,
        targetSocketY: SOCKETS.scaleRightPan.y,
    },
};
export function createDeskTool(kind, idSuffix) {
    const spec = TOOL_CATALOG[kind];
    return {
        id: `${kind}_${idSuffix}`,
        kind,
        title: spec.title,
        shortHint: spec.shortHint,
        socketLabel: spec.socketLabel,
        homeX: spec.homeX,
        homeY: spec.homeY,
        x: spec.homeX,
        y: spec.homeY,
        targetSocketX: spec.targetSocketX,
        targetSocketY: spec.targetSocketY,
        isDragging: false,
        liftProgress: 0,
        nearSnapSocket: false,
        consumed: false,
        slottedActive: false,
        cracked: false,
    };
}
export function createInitialState(seed = 20261108) {
    const fuses = [0, 1, 2, 3].map((i) => ({
        index: i,
        x: 118 + i * 64,
        y: 152,
        intact: true,
        filamentGlow: 0.25,
        shatterFlash: 0,
        crackSeed: (seed + i * 97) % 1000,
        smokeParticles: [],
    }));
    const deskTools = [
        createDeskTool('xray_loupe', 1),
        createDeskTool('jumper_clamp', 2),
        createDeskTool('inverter_magnet', 3),
        createDeskTool('blast_shield', 4),
        createDeskTool('overclock_weight', 5),
    ];
    const state = {
        seed,
        rngState: seed >>> 0 || 20261108,
        phase: 'boot_awaiting_starter',
        machineAwake: false,
        cathodeWarmup: 0.12,
        starterCartridge: {
            x: 392,
            y: 455,
            homeX: 392,
            homeY: 455,
            socketX: SOCKETS.ignitionSocket.x,
            socketY: SOCKETS.ignitionSocket.y,
            isDragging: false,
            liftProgress: 0,
            nearSocket: false,
            slotted: false,
        },
        chamberNumber: 1,
        batchNumberInChamber: 1,
        totalTurnsExecuted: 0,
        bestGramsRecord: 0,
        totalRunGrams: 0,
        drumBatchInitialCounts: { live: 3, blank: 2, volatile: 1 },
        drumQueue: ['live', 'blank', 'live', 'volatile', 'blank', 'live'],
        spentShells: [],
        drumAngleRad: 0,
        drumTargetAngleRad: 0,
        drumAngularVel: 0,
        batchRevealBannerMs: 0,
        currentCoreRevealed: false,
        currentCoreInverted: false,
        groundSurgeBonusActive: false,
        leadShieldArmed: false,
        leadShieldCracked: false,
        overclockTurnsRemaining: 0,
        routeTarget: 'vault',
        knifeSwitchLeverAnim: 0,
        knifeSwitchDragging: false,
        stepUpMultiplier: 1,
        crankWheelAngleRad: 0,
        crankWheelDragging: false,
        plunger: {
            x: SOCKETS.plungerTrack.x,
            topY: SOCKETS.plungerTrack.topY,
            bottomY: SOCKETS.plungerTrack.bottomY,
            travel: 0,
            velocity: 0,
            isDragging: false,
            lastRatchetNotch: 0,
            armedPastSear: false,
        },
        fuses,
        fusesRemaining: 4,
        scaleQuotaGrams: 450,
        scaleAccumulatedGrams: 0,
        scaleBeamNeedle: createSpringNeedle(-0.28, 130, 8.5),
        scalePanWeights: [],
        odometerDisplayGrams: 0,
        kilovoltNeedle: createSpringNeedle(0.05, 180, 9.5),
        amperageNeedle: createSpringNeedle(0.04, 165, 10.0),
        deskTools,
        supplyDrawerTools: [],
        supplyDrawerOpenProgress: 0,
        cameraShakeY: 0,
        cameraShakeVelY: 0,
        cameraShakeRot: 0,
        cameraShakeVelRot: 0,
        arcFlashAlpha: 0,
        sparks: [],
        lastTurnStamp: {
            text: 'SLOT IGNITION CORE →',
            subtext: 'DRAG GLOWING BRASS CARTRIDGE INTO SOCKET',
            color: '#f59e0b',
            ageMs: 0,
            durationMs: 999999,
        },
    };
    return state;
}
export function triggerCameraThump(state, verticalImpulse, rotationalImpulse) {
    state.cameraShakeVelY += verticalImpulse;
    state.cameraShakeVelRot += rotationalImpulse;
}
export function spawnSparks(state, x, y, count, color = '#fbbf24', speedScale = 1) {
    for (let i = 0; i < count; i++) {
        const angle = nextRandom(state) * Math.PI * 2;
        const speed = (65 + nextRandom(state) * 220) * speedScale;
        state.sparks.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 40,
            life: 0,
            maxLife: 0.22 + nextRandom(state) * 0.35,
            color,
            size: 2 + nextRandom(state) * 2.8,
        });
    }
}
export function loadNewBatchIntoDrum(state, audio) {
    // Deterministic high-tension batch composition scaling with chamberNumber
    const chamber = state.chamberNumber;
    const liveCount = Math.min(4, 2 + Math.floor((chamber + 1) / 2));
    const blankCount = Math.min(4, 2 + Math.floor(chamber / 2));
    const volatileCount = chamber >= 2 ? 2 : 1;
    state.drumBatchInitialCounts = {
        live: liveCount,
        blank: blankCount,
        volatile: volatileCount,
    };
    const batch = [];
    for (let i = 0; i < liveCount; i++)
        batch.push('live');
    for (let i = 0; i < blankCount; i++)
        batch.push('blank');
    for (let i = 0; i < volatileCount; i++)
        batch.push('volatile');
    // Fisher-Yates shuffle with seeded PRNG
    for (let i = batch.length - 1; i > 0; i--) {
        const j = Math.floor(nextRandom(state) * (i + 1));
        const tmp = batch[i];
        batch[i] = batch[j];
        batch[j] = tmp;
    }
    state.drumQueue = batch;
    state.spentShells = [];
    state.currentCoreRevealed = false;
    state.currentCoreInverted = false;
    state.drumTargetAngleRad += Math.PI * 1.5;
    state.batchRevealBannerMs = 3200;
    state.lastTurnStamp = {
        text: `BATCH LOADED: ${liveCount} LIVE · ${blankCount} BLANK · ${volatileCount} VOLATILE`,
        subtext: 'CHOOSE ROUTE SWITCH, CRANK VOLTAGE, OR PULL DETONATOR',
        color: '#fbbf24',
        ageMs: 0,
        durationMs: 3600,
    };
    updateAnalogNeedleTargets(state);
    audio?.playDrumRatchet(batch.length);
}
export function wakeUpContraption(state, audio) {
    state.starterCartridge.slotted = true;
    state.starterCartridge.isDragging = false;
    state.starterCartridge.x = state.starterCartridge.socketX;
    state.starterCartridge.y = state.starterCartridge.socketY;
    state.starterCartridge.liftProgress = 0;
    state.machineAwake = true;
    state.phase = 'active_turn';
    state.cathodeWarmup = 1.0;
    // Immediate needle bounce & mechanical table thump
    state.kilovoltNeedle.velocity += 6.2;
    state.amperageNeedle.velocity += 5.4;
    triggerCameraThump(state, 180, 0.018);
    spawnSparks(state, SOCKETS.ignitionSocket.x, SOCKETS.ignitionSocket.y, 22, '#fbbf24', 1.1);
    for (const fuse of state.fuses) {
        if (fuse.intact)
            fuse.filamentGlow = 1.0;
    }
    audio?.playCathodeWakeup();
    loadNewBatchIntoDrum(state, audio);
}
export function updateAnalogNeedleTargets(state) {
    if (!state.machineAwake || state.phase === 'chassis_meltdown') {
        state.kilovoltNeedle.target = 0.02;
        state.amperageNeedle.target = 0.02;
        return;
    }
    // Kilovolt needle reflects Step-Up Transformer (1x -> 2x -> 4x -> 8x) + Overclock Weight
    const multNorm = state.stepUpMultiplier === 1
        ? 0.24
        : state.stepUpMultiplier === 2
            ? 0.48
            : state.stepUpMultiplier === 4
                ? 0.74
                : 0.96;
    const overclockBoost = state.overclockTurnsRemaining > 0 ? 0.12 : 0;
    state.kilovoltNeedle.target = Math.min(1.05, multNorm + overclockBoost);
    // Amperage needle reflects live threat ratio in remaining drumQueue
    const rem = state.drumQueue.length;
    if (rem === 0) {
        state.amperageNeedle.target = 0.15;
    }
    else {
        const liveOrVol = state.drumQueue.filter((c) => c === 'live' || c === 'volatile').length;
        state.amperageNeedle.target = Math.min(1.0, 0.18 + (liveOrVol / rem) * 0.78);
    }
    // Balance scale beam angle (-0.32 rad when empty -> +0.32 rad when quota tipped)
    const ratio = Math.min(1.35, state.scaleAccumulatedGrams / Math.max(1, state.scaleQuotaGrams));
    state.scaleBeamNeedle.target = -0.28 + ratio * 0.56;
}
export function setRouteSwitch(state, target, audio) {
    if (state.phase !== 'active_turn')
        return false;
    if (target === 'chassis' && state.overclockTurnsRemaining > 0) {
        // Safety ground locked by 3X Overclock Weight!
        triggerCameraThump(state, 70, -0.008);
        state.lastTurnStamp = {
            text: 'SAFETY GROUND LOCKED!',
            subtext: `3X OVERCLOCK WEIGHT LOCKSVAULT FOR ${state.overclockTurnsRemaining} MORE TURN(S)`,
            color: '#ef4444',
            ageMs: 0,
            durationMs: 2200,
        };
        return false;
    }
    if (state.routeTarget !== target) {
        state.routeTarget = target;
        audio?.playKnifeSwitchFlip(target === 'vault');
        spawnSparks(state, SOCKETS.knifeSwitchCenter.x, SOCKETS.knifeSwitchCenter.y + (target === 'vault' ? -28 : 28), 10, target === 'vault' ? '#f59e0b' : '#38bdf8', 0.7);
    }
    return true;
}
export function stepUpTransformerCrank(state, audio) {
    if (state.phase !== 'active_turn')
        return state.stepUpMultiplier;
    const nextMult = state.stepUpMultiplier === 1
        ? 2
        : state.stepUpMultiplier === 2
            ? 4
            : state.stepUpMultiplier === 4
                ? 8
                : 1;
    state.stepUpMultiplier = nextMult;
    state.crankWheelAngleRad += Math.PI * 0.5;
    state.kilovoltNeedle.velocity += 3.8;
    updateAnalogNeedleTargets(state);
    audio?.playTransformerCrank(nextMult);
    spawnSparks(state, SOCKETS.transformerCrankCenter.x, SOCKETS.transformerCrankCenter.y - 36, 12, nextMult >= 4 ? '#ef4444' : '#fbbf24', 0.85);
    return nextMult;
}
export function applyContrabandToolToSocket(state, tool, audio) {
    if (state.phase !== 'active_turn' || tool.consumed)
        return false;
    if (tool.kind === 'xray_loupe') {
        state.currentCoreRevealed = true;
        tool.consumed = true;
        tool.slottedActive = false;
        audio?.playMagneticSnap();
        const current = state.drumQueue[0] ?? 'live';
        const label = current === 'volatile'
            ? 'VOLATILE 2X OVERCHARGER'
            : current === 'live'
                ? 'LIVE HIGH-VOLTAGE CORE'
                : 'INERT BLANK SHELL';
        state.lastTurnStamp = {
            text: `X-RAY LOUPE: [${label}]`,
            subtext: 'CHAMBERED CORE SILHOUETTE VERIFIED',
            color: '#4ade80',
            ageMs: 0,
            durationMs: 3400,
        };
        spawnSparks(state, SOCKETS.drumCenter.x, SOCKETS.drumCenter.y, 16, '#4ade80', 0.8);
        return true;
    }
    if (tool.kind === 'jumper_clamp') {
        if (state.drumQueue.length === 0)
            return false;
        const ejected = state.drumQueue.shift();
        state.spentShells.push({
            id: state.totalTurnsExecuted * 10 + state.spentShells.length + 1,
            type: ejected,
            outcome: 'ejected',
            x: 92 + (state.spentShells.length % 4) * 44,
            y: 525 + Math.floor(state.spentShells.length / 4) * 34,
            rotation: (nextRandom(state) - 0.5) * 0.35,
        });
        state.currentCoreRevealed = false;
        state.currentCoreInverted = false;
        state.drumTargetAngleRad += Math.PI / 3;
        tool.consumed = true;
        audio?.playMagneticSnap();
        audio?.playDrumRatchet(state.spentShells.length);
        spawnSparks(state, SOCKETS.drumShuntTerminals.x, SOCKETS.drumShuntTerminals.y, 24, '#38bdf8', 1.1);
        state.lastTurnStamp = {
            text: `SHUNT EJECTED: [${ejected.toUpperCase()}]`,
            subtext: 'CORE BYPASSED WITHOUT FIRING',
            color: '#38bdf8',
            ageMs: 0,
            durationMs: 2800,
        };
        if (state.drumQueue.length === 0) {
            state.batchNumberInChamber += 1;
            loadNewBatchIntoDrum(state, audio);
        }
        else {
            updateAnalogNeedleTargets(state);
        }
        return true;
    }
    if (tool.kind === 'inverter_magnet') {
        if (state.drumQueue.length === 0)
            return false;
        const current = state.drumQueue[0];
        state.drumQueue[0] = current === 'blank' ? 'live' : 'blank';
        state.currentCoreInverted = !state.currentCoreInverted;
        tool.consumed = true;
        audio?.playMagneticSnap();
        spawnSparks(state, SOCKETS.drumMagnetCoil.x, SOCKETS.drumMagnetCoil.y, 20, '#c084fc', 1.0);
        state.lastTurnStamp = {
            text: 'POLARITY INVERTED!',
            subtext: 'NEXT CORE CHARGE FLIPPED (BLANK ↔ LIVE)',
            color: '#c084fc',
            ageMs: 0,
            durationMs: 2800,
        };
        updateAnalogNeedleTargets(state);
        return true;
    }
    if (tool.kind === 'blast_shield') {
        tool.slottedActive = true;
        tool.x = SOCKETS.fuseShieldRail.x;
        tool.y = SOCKETS.fuseShieldRail.y;
        state.leadShieldArmed = true;
        state.leadShieldCracked = false;
        audio?.playMagneticSnap();
        spawnSparks(state, SOCKETS.fuseShieldRail.x, SOCKETS.fuseShieldRail.y, 14, '#94a3b8', 0.75);
        state.lastTurnStamp = {
            text: 'LEAD BLAST SHIELD LOCKED',
            subtext: 'WILL ABSORB NEXT CATASTROPHIC FUSE BLOWOUT',
            color: '#cbd5e1',
            ageMs: 0,
            durationMs: 2800,
        };
        return true;
    }
    if (tool.kind === 'overclock_weight') {
        tool.slottedActive = true;
        tool.consumed = true;
        tool.x = SOCKETS.scaleRightPan.x;
        tool.y = SOCKETS.scaleRightPan.y;
        state.overclockTurnsRemaining = 2;
        state.routeTarget = 'vault';
        state.scaleBeamNeedle.velocity += 2.2;
        updateAnalogNeedleTargets(state);
        audio?.playMagneticSnap();
        triggerCameraThump(state, 130, 0.012);
        spawnSparks(state, SOCKETS.scaleRightPan.x, SOCKETS.scaleRightPan.y, 18, '#f59e0b', 0.9);
        state.lastTurnStamp = {
            text: '3X OVERCLOCK WEIGHT DROPPED!',
            subtext: 'PAYOUT ×3 FOR 2 TURNS · SAFETY GROUND BOLTED SHUT',
            color: '#f59e0b',
            ageMs: 0,
            durationMs: 3200,
        };
        return true;
    }
    return false;
}
function blowGlassFuses(state, count, reasonText, audio) {
    if (state.leadShieldArmed) {
        // Lead Blast Shield absorbs the entire catastrophic misfire!
        state.leadShieldArmed = false;
        state.leadShieldCracked = true;
        for (const tool of state.deskTools) {
            if (tool.kind === 'blast_shield' && tool.slottedActive) {
                tool.cracked = true;
                tool.consumed = true;
            }
        }
        state.arcFlashAlpha = 0.65;
        triggerCameraThump(state, 260, -0.024);
        spawnSparks(state, SOCKETS.fuseShieldRail.x, SOCKETS.fuseShieldRail.y, 36, '#fbbf24', 1.35);
        audio?.playFuseShatter(true);
        state.lastTurnStamp = {
            text: 'LEAD SHIELD CRACKED — FUSES SAVED!',
            subtext: reasonText,
            color: '#38bdf8',
            ageMs: 0,
            durationMs: 3200,
        };
        return;
    }
    let blownNow = 0;
    for (let i = state.fuses.length - 1; i >= 0 && blownNow < count; i--) {
        const fuse = state.fuses[i];
        if (fuse.intact) {
            fuse.intact = false;
            fuse.shatterFlash = 1.0;
            fuse.filamentGlow = 0;
            blownNow++;
            spawnSparks(state, fuse.x, fuse.y, 28, '#f87171', 1.3);
            for (let s = 0; s < 8; s++) {
                fuse.smokeParticles.push({
                    x: fuse.x + (nextRandom(state) - 0.5) * 14,
                    y: fuse.y - 6,
                    vx: (nextRandom(state) - 0.5) * 16,
                    vy: -22 - nextRandom(state) * 28,
                    alpha: 0.75,
                    radius: 5 + nextRandom(state) * 7,
                });
            }
        }
    }
    state.fusesRemaining = state.fuses.filter((f) => f.intact).length;
    state.arcFlashAlpha = 0.92;
    triggerCameraThump(state, 340, 0.035);
    audio?.playFuseShatter(false);
    if (state.fusesRemaining <= 0) {
        state.phase = 'chassis_meltdown';
        state.starterCartridge.slotted = false;
        state.starterCartridge.x = state.starterCartridge.homeX;
        state.starterCartridge.y = state.starterCartridge.homeY;
        state.lastTurnStamp = {
            text: 'ALL GLASS FUSES SHATTERED!',
            subtext: 'SLOT RE-FUSE CARTRIDGE OR PULL PLUNGER TO REBUILD',
            color: '#ef4444',
            ageMs: 0,
            durationMs: 999999,
        };
        updateAnalogNeedleTargets(state);
    }
}
function dropBrassWeightOnScale(state, grams, label, color = '#fbbf24') {
    state.scaleAccumulatedGrams += grams;
    state.totalRunGrams += grams;
    if (state.totalRunGrams > state.bestGramsRecord) {
        state.bestGramsRecord = state.totalRunGrams;
    }
    const count = state.scalePanWeights.length;
    state.scalePanWeights.push({
        id: state.totalTurnsExecuted * 100 + count,
        grams,
        label,
        x: SOCKETS.scaleRightPan.x - 28 + (count % 4) * 18,
        y: SOCKETS.scaleRightPan.y - 65,
        vy: 140,
        landed: false,
        color,
    });
    state.scaleBeamNeedle.velocity += 2.6;
    updateAnalogNeedleTargets(state);
}
function openContrabandSupplyDrawer(state, audio) {
    state.phase = 'supply_drawer_pick';
    state.supplyDrawerOpenProgress = 0;
    const allKinds = [
        'xray_loupe',
        'jumper_clamp',
        'inverter_magnet',
        'blast_shield',
        'overclock_weight',
    ];
    // Pick 3 distinct contraband tools for the velvet supply drawer
    const pool = [...allKinds];
    const choices = [];
    for (let i = 0; i < 3; i++) {
        const idx = Math.floor(nextRandom(state) * pool.length);
        const kind = pool.splice(idx, 1)[0];
        const tool = createDeskTool(kind, `drawer_${state.chamberNumber}_${i}`);
        tool.inSupplyDrawer = true;
        tool.homeX = 410 + i * 230;
        tool.homeY = 670;
        tool.x = tool.homeX;
        tool.y = tool.homeY;
        // Target is the tool's standard desk slot so dragging it up/onto the mat claims it!
        tool.targetSocketX = TOOL_CATALOG[kind].homeX;
        tool.targetSocketY = TOOL_CATALOG[kind].homeY;
        choices.push(tool);
    }
    state.supplyDrawerTools = choices;
    audio?.playQuotaBellAndStamp();
    state.lastTurnStamp = {
        text: `CHAMBER 0${state.chamberNumber} QUOTA TIPPED!`,
        subtext: 'GRAB 1 CONTRABAND TOOL FROM THE DRAWER TO START NEXT CHAMBER',
        color: '#4ade80',
        ageMs: 0,
        durationMs: 999999,
    };
}
export function claimSupplyDrawerToolAndAdvanceChamber(state, pickedTool, audio) {
    if (state.phase !== 'supply_drawer_pick')
        return;
    // Replace or replenish that tool kind on the desk mat
    const spec = TOOL_CATALOG[pickedTool.kind];
    const existingIdx = state.deskTools.findIndex((t) => t.kind === pickedTool.kind);
    const freshTool = createDeskTool(pickedTool.kind, `replenished_${state.chamberNumber}_${Date.now() % 1000}`);
    freshTool.x = spec.homeX;
    freshTool.y = spec.homeY;
    if (existingIdx >= 0) {
        state.deskTools[existingIdx] = freshTool;
    }
    else {
        state.deskTools.push(freshTool);
    }
    // Also restore 1 blown glass fuse if any fuse was blown!
    for (const fuse of state.fuses) {
        if (!fuse.intact) {
            fuse.intact = true;
            fuse.filamentGlow = 1.0;
            fuse.shatterFlash = 0;
            fuse.smokeParticles = [];
            break;
        }
    }
    state.fusesRemaining = state.fuses.filter((f) => f.intact).length;
    // Advance Chamber
    state.chamberNumber += 1;
    state.batchNumberInChamber = 1;
    state.scaleAccumulatedGrams = 0;
    state.scaleQuotaGrams = Math.round(450 + (state.chamberNumber - 1) * 300);
    state.scalePanWeights = [];
    state.stepUpMultiplier = 1;
    state.overclockTurnsRemaining = 0;
    state.supplyDrawerTools = [];
    state.supplyDrawerOpenProgress = 0;
    state.phase = 'active_turn';
    audio?.playMagneticSnap();
    loadNewBatchIntoDrum(state, audio);
}
export function executePlungerTurn(state, audio) {
    if (state.phase === 'boot_awaiting_starter') {
        wakeUpContraption(state, audio);
        return;
    }
    if (state.phase === 'chassis_meltdown') {
        return;
    }
    if (state.phase === 'supply_drawer_pick') {
        if (state.supplyDrawerTools[0]) {
            claimSupplyDrawerToolAndAdvanceChamber(state, state.supplyDrawerTools[0], audio);
        }
        return;
    }
    if (state.drumQueue.length === 0) {
        loadNewBatchIntoDrum(state, audio);
        return;
    }
    const drawnCore = state.drumQueue.shift();
    state.totalTurnsExecuted += 1;
    state.currentCoreRevealed = false;
    state.currentCoreInverted = false;
    state.drumTargetAngleRad += Math.PI / 3;
    // Needle oscillation impulse on detonation
    state.kilovoltNeedle.velocity += 7.5;
    state.amperageNeedle.velocity += 6.8;
    const mult = state.stepUpMultiplier;
    const overclockMult = state.overclockTurnsRemaining > 0 ? 3 : 1;
    const surgeMult = state.groundSurgeBonusActive ? 1.5 : 1;
    let shellOutcome = 'vault_scored';
    if (state.routeTarget === 'vault') {
        if (drawnCore === 'live' || drawnCore === 'volatile') {
            const baseGrams = drawnCore === 'volatile' ? 300 : 150;
            const totalGrams = Math.round(baseGrams * mult * overclockMult * surgeMult);
            state.groundSurgeBonusActive = false;
            state.stepUpMultiplier = 1;
            dropBrassWeightOnScale(state, totalGrams, `${totalGrams}g`, drawnCore === 'volatile' ? '#f97316' : '#fbbf24');
            shellOutcome = 'vault_scored';
            triggerCameraThump(state, 220, 0.018);
            spawnSparks(state, SOCKETS.scaleRightPan.x, SOCKETS.scaleRightPan.y, drawnCore === 'volatile' ? 34 : 22, '#fbbf24', 1.2);
            audio?.playVaultDischargeLive(drawnCore === 'volatile');
            state.lastTurnStamp = {
                text: `VAULT DISCHARGE: +${totalGrams}g!`,
                subtext: `${drawnCore === 'volatile' ? 'VOLATILE 2X CORE' : 'LIVE HV CORE'} × ${mult}X STEP-UP${overclockMult > 1 ? ' × 3X OVERCLOCK' : ''}`,
                color: '#4ade80',
                ageMs: 0,
                durationMs: 3200,
            };
        }
        else {
            // Discharged an INERT BLANK into the Target Vault -> Inductive Backfire Penalty!
            shellOutcome = 'vault_backfire';
            const hadHighStepUp = mult >= 2;
            state.stepUpMultiplier = 1;
            state.groundSurgeBonusActive = false;
            const penaltyGrams = Math.min(state.scaleAccumulatedGrams, 75);
            state.scaleAccumulatedGrams = Math.max(0, state.scaleAccumulatedGrams - penaltyGrams);
            if (state.scalePanWeights.length > 0 && penaltyGrams > 0) {
                state.scalePanWeights.pop();
            }
            state.scaleBeamNeedle.velocity -= 2.1;
            if (hadHighStepUp) {
                blowGlassFuses(state, 1, `BLANK FIRED INTO VAULT AT ${mult}X STEP-UP CAUSED BACK-EMF BLOWOUT!`, audio);
            }
            else {
                triggerCameraThump(state, 130, -0.012);
                audio?.playVaultDischargeBlank();
                state.lastTurnStamp = {
                    text: 'DRY VAULT MISFIRE! (-75g)',
                    subtext: 'INERT BLANK WASTED TEMPO & DRAINED VAULT COIL',
                    color: '#f59e0b',
                    ageMs: 0,
                    durationMs: 3000,
                };
            }
        }
    }
    else {
        // Routed to CHASSIS GROUND (Self-Test)
        if (drawnCore === 'blank') {
            // Safe Ground! Grants +75g Stabilizer Weight + Ground Surge Capacitor (1.5x next Vault shot) + preserves Step-Up Multiplier!
            shellOutcome = 'chassis_safe';
            state.groundSurgeBonusActive = true;
            dropBrassWeightOnScale(state, 75, '75g', '#38bdf8');
            triggerCameraThump(state, 95, 0.008);
            spawnSparks(state, SOCKETS.knifeSwitchCenter.x, SOCKETS.knifeSwitchCenter.y + 45, 18, '#38bdf8', 0.95);
            audio?.playChassisGroundSafe();
            state.lastTurnStamp = {
                text: 'CLEAN CHASSIS GROUND! (+75g + SURGE)',
                subtext: 'BLANK SAFELY GROUNDED · NEXT VAULT SHOT +50% · STEP-UP KEPT',
                color: '#38bdf8',
                ageMs: 0,
                durationMs: 3200,
            };
        }
        else {
            // Grounded a LIVE or VOLATILE core into your own Chassis!
            shellOutcome = 'chassis_blown';
            const fusesToBlow = drawnCore === 'volatile' ? 2 : 1;
            state.stepUpMultiplier = 1;
            state.groundSurgeBonusActive = false;
            blowGlassFuses(state, fusesToBlow, `${drawnCore.toUpperCase()} CORE GROUNDED INTO CHASSIS (${fusesToBlow} FUSE${fusesToBlow > 1 ? 'S' : ''} BLOWN)`, audio);
            if (state.phase !== 'chassis_meltdown' && !state.leadShieldCracked) {
                state.lastTurnStamp = {
                    text: `CHASSIS ARC-FLASH! (-${fusesToBlow} FUSE)`,
                    subtext: `${drawnCore === 'volatile' ? 'VOLATILE OVERCHARGER' : 'LIVE HV CORE'} SHORTED DIRECTLY INTO YOUR FUSE BANK`,
                    color: '#ef4444',
                    ageMs: 0,
                    durationMs: 3400,
                };
            }
        }
    }
    // Record spent shell on the workbench tray
    state.spentShells.push({
        id: state.totalTurnsExecuted,
        type: drawnCore,
        outcome: shellOutcome,
        x: 92 + ((state.spentShells.length) % 4) * 44,
        y: 525 + Math.floor(state.spentShells.length / 4) * 34,
        rotation: (nextRandom(state) - 0.5) * 0.35,
    });
    if (state.overclockTurnsRemaining > 0) {
        state.overclockTurnsRemaining = Math.max(0, state.overclockTurnsRemaining - 1);
    }
    updateAnalogNeedleTargets(state);
    if (state.phase === 'chassis_meltdown') {
        return;
    }
    // Did the Brass Balance Scale tip past the Chamber Quota?
    if (state.scaleAccumulatedGrams >= state.scaleQuotaGrams) {
        openContrabandSupplyDrawer(state, audio);
        return;
    }
    // If the Feeder Drum is now empty, mechanically load and shuffle a fresh batch!
    if (state.drumQueue.length === 0) {
        state.batchNumberInChamber += 1;
        loadNewBatchIntoDrum(state, audio);
    }
}
export function stepWorkbenchSimulation(state, dtMs, audio) {
    const dtSec = Math.min(0.05, Math.max(0.001, dtMs / 1000));
    // 1. Cathode warm-up & analog needle damped springs (F = -kx - cv)
    if (state.machineAwake && state.phase !== 'chassis_meltdown') {
        state.cathodeWarmup = Math.min(1, state.cathodeWarmup + dtSec * 1.4);
    }
    else if (state.phase === 'chassis_meltdown') {
        state.cathodeWarmup = Math.max(0.08, state.cathodeWarmup - dtSec * 0.8);
    }
    stepSpringNeedle(state.kilovoltNeedle, dtSec);
    stepSpringNeedle(state.amperageNeedle, dtSec);
    stepSpringNeedle(state.scaleBeamNeedle, dtSec);
    // Smooth mechanical odometer drum roll
    const odoDiff = state.scaleAccumulatedGrams - state.odometerDisplayGrams;
    if (Math.abs(odoDiff) > 0.2) {
        state.odometerDisplayGrams += odoDiff * Math.min(1, dtSec * 10);
    }
    else {
        state.odometerDisplayGrams = state.scaleAccumulatedGrams;
    }
    // 2. Feeder Drum rotation spring
    const drumDiff = state.drumTargetAngleRad - state.drumAngleRad;
    const drumForce = drumDiff * 120 - state.drumAngularVel * 11;
    state.drumAngularVel += drumForce * dtSec;
    state.drumAngleRad += state.drumAngularVel * dtSec;
    // 3. Knife Switch lever animation
    const targetSwitchPos = state.routeTarget === 'vault' ? 0 : 1;
    state.knifeSwitchLeverAnim += (targetSwitchPos - state.knifeSwitchLeverAnim) * Math.min(1, dtSec * 18);
    // 4. Commit Lever / Detonator Plunger spring-return physics when not held
    if (!state.plunger.isDragging && state.plunger.travel > 0.001) {
        const k = 190;
        const c = 14;
        const force = -k * state.plunger.travel - c * state.plunger.velocity;
        state.plunger.velocity += force * dtSec;
        state.plunger.travel = Math.max(0, state.plunger.travel + state.plunger.velocity * dtSec);
        if (state.plunger.travel <= 0.002 && Math.abs(state.plunger.velocity) < 0.05) {
            state.plunger.travel = 0;
            state.plunger.velocity = 0;
        }
    }
    // 5. Starter cartridge return / lift animation
    if (!state.starterCartridge.slotted) {
        const targetLift = state.starterCartridge.isDragging ? 1 : 0;
        state.starterCartridge.liftProgress +=
            (targetLift - state.starterCartridge.liftProgress) * Math.min(1, dtSec * 16);
        if (!state.starterCartridge.isDragging) {
            state.starterCartridge.x +=
                (state.starterCartridge.homeX - state.starterCartridge.x) * Math.min(1, dtSec * 12);
            state.starterCartridge.y +=
                (state.starterCartridge.homeY - state.starterCartridge.y) * Math.min(1, dtSec * 12);
        }
    }
    // 6. Desk Contraband Tools lift shadow & home return physics
    for (const tool of state.deskTools) {
        if (tool.consumed && !tool.slottedActive)
            continue;
        const targetLift = tool.isDragging ? 1 : 0;
        tool.liftProgress += (targetLift - tool.liftProgress) * Math.min(1, dtSec * 16);
        if (!tool.isDragging && !tool.slottedActive) {
            tool.x += (tool.homeX - tool.x) * Math.min(1, dtSec * 14);
            tool.y += (tool.homeY - tool.y) * Math.min(1, dtSec * 14);
        }
    }
    // Supply drawer slide animation
    if (state.phase === 'supply_drawer_pick') {
        state.supplyDrawerOpenProgress = Math.min(1, state.supplyDrawerOpenProgress + dtSec * 4.5);
        for (const dTool of state.supplyDrawerTools) {
            const targetLift = dTool.isDragging ? 1 : 0;
            dTool.liftProgress += (targetLift - dTool.liftProgress) * Math.min(1, dtSec * 16);
            if (!dTool.isDragging) {
                dTool.x += (dTool.homeX - dTool.x) * Math.min(1, dtSec * 14);
                dTool.y += (dTool.homeY - dTool.y) * Math.min(1, dtSec * 14);
            }
        }
    }
    // 7. Physical Brass Weights dropping onto the Scale Pan
    for (const w of state.scalePanWeights) {
        if (!w.landed) {
            w.vy += 680 * dtSec;
            w.y += w.vy * dtSec;
            if (w.y >= SOCKETS.scaleRightPan.y - 8) {
                w.y = SOCKETS.scaleRightPan.y - 8;
                w.vy = 0;
                w.landed = true;
            }
        }
    }
    // 8. Camera Table-Thump spring recovery
    const camForceY = -260 * state.cameraShakeY - 18 * state.cameraShakeVelY;
    state.cameraShakeVelY += camForceY * dtSec;
    state.cameraShakeY += state.cameraShakeVelY * dtSec;
    const camForceRot = -280 * state.cameraShakeRot - 19 * state.cameraShakeVelRot;
    state.cameraShakeVelRot += camForceRot * dtSec;
    state.cameraShakeRot += state.cameraShakeVelRot * dtSec;
    if (state.arcFlashAlpha > 0) {
        state.arcFlashAlpha = Math.max(0, state.arcFlashAlpha - dtSec * 2.8);
    }
    if (state.batchRevealBannerMs > 0) {
        state.batchRevealBannerMs = Math.max(0, state.batchRevealBannerMs - dtMs);
    }
    if (state.lastTurnStamp) {
        state.lastTurnStamp.ageMs += dtMs;
    }
    // 9. Update Blown Glass Fuse Smoke Wisps & Sparks
    for (const fuse of state.fuses) {
        if (fuse.shatterFlash > 0) {
            fuse.shatterFlash = Math.max(0, fuse.shatterFlash - dtSec * 2.4);
        }
        if (!fuse.intact) {
            if (nextRandom(state) < dtSec * 4.5 && fuse.smokeParticles.length < 18) {
                fuse.smokeParticles.push({
                    x: fuse.x + (nextRandom(state) - 0.5) * 10,
                    y: fuse.y - 12,
                    vx: (nextRandom(state) - 0.5) * 14,
                    vy: -18 - nextRandom(state) * 22,
                    alpha: 0.55,
                    radius: 4 + nextRandom(state) * 5,
                });
            }
            for (let i = fuse.smokeParticles.length - 1; i >= 0; i--) {
                const p = fuse.smokeParticles[i];
                p.x += p.vx * dtSec;
                p.y += p.vy * dtSec;
                p.radius += 8 * dtSec;
                p.alpha -= 0.32 * dtSec;
                if (p.alpha <= 0.01) {
                    fuse.smokeParticles.splice(i, 1);
                }
            }
        }
    }
    for (let i = state.sparks.length - 1; i >= 0; i--) {
        const sp = state.sparks[i];
        sp.life += dtSec;
        sp.x += sp.vx * dtSec;
        sp.y += sp.vy * dtSec;
        sp.vy += 360 * dtSec;
        if (sp.life >= sp.maxLife) {
            state.sparks.splice(i, 1);
        }
    }
    void audio;
}
