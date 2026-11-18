import { CONFIG } from './config';
export const SAVE_SCHEMA_VERSION = 1;
export function createDefaultCareerStats() {
    return {
        highScore: 0,
        maxLevelReached: 1,
        maxComboReached: 1,
        totalBlocksClearedLifetime: 0,
        gamesPlayed: 0,
        victoriesUnlocked: 0,
    };
}
export function cloneOrbitState(state) {
    return {
        ...state,
        stacks: state.stacks.map((faceStack) => faceStack.map((b) => ({ ...b }))),
        fallingShards: state.fallingShards.map((s) => ({ ...s })),
        waveQueue: state.waveQueue.map((q) => ({ ...q })),
        events: [],
    };
}
export function serializeOrbitEnvelope(career, activeRun) {
    const envelope = {
        schemaVersion: SAVE_SCHEMA_VERSION,
        gameId: CONFIG.GAME_ID,
        updatedAtIso: new Date().toISOString(),
        career: { ...career },
        activeRun: activeRun ? cloneOrbitState(activeRun) : null,
    };
    return JSON.stringify(envelope);
}
export function deserializeOrbitEnvelope(rawJson) {
    try {
        const parsed = JSON.parse(rawJson);
        if (!parsed ||
            parsed.schemaVersion !== SAVE_SCHEMA_VERSION ||
            parsed.gameId !== CONFIG.GAME_ID ||
            !parsed.career) {
            return null;
        }
        const career = {
            highScore: Math.max(0, Number(parsed.career.highScore) || 0),
            maxLevelReached: Math.max(1, Number(parsed.career.maxLevelReached) || 1),
            maxComboReached: Math.max(1, Number(parsed.career.maxComboReached) || 1),
            totalBlocksClearedLifetime: Math.max(0, Number(parsed.career.totalBlocksClearedLifetime) || 0),
            gamesPlayed: Math.max(0, Number(parsed.career.gamesPlayed) || 0),
            victoriesUnlocked: Math.max(0, Number(parsed.career.victoriesUnlocked) || 0),
        };
        let activeRun = null;
        if (parsed.activeRun &&
            typeof parsed.activeRun.seed === 'number' &&
            Array.isArray(parsed.activeRun.stacks) &&
            (parsed.activeRun.numSides === 6 ||
                parsed.activeRun.numSides === 7 ||
                parsed.activeRun.numSides === 8)) {
            activeRun = cloneOrbitState(parsed.activeRun);
        }
        return {
            schemaVersion: SAVE_SCHEMA_VERSION,
            gameId: CONFIG.GAME_ID,
            updatedAtIso: typeof parsed.updatedAtIso === 'string'
                ? parsed.updatedAtIso
                : new Date().toISOString(),
            career,
            activeRun,
        };
    }
    catch {
        return null;
    }
}
export function loadOrbitSave(storageKey = CONFIG.STORAGE_KEY) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) {
                const loaded = deserializeOrbitEnvelope(raw);
                if (loaded)
                    return loaded;
            }
        }
    }
    catch {
        // Fallback to in-memory default if localStorage is blocked
    }
    return {
        schemaVersion: SAVE_SCHEMA_VERSION,
        gameId: CONFIG.GAME_ID,
        updatedAtIso: new Date().toISOString(),
        career: createDefaultCareerStats(),
        activeRun: null,
    };
}
export function saveOrbitState(career, activeRun, storageKey = CONFIG.STORAGE_KEY) {
    const updatedCareer = {
        highScore: Math.max(career.highScore, activeRun?.score ?? 0),
        maxLevelReached: Math.max(career.maxLevelReached, activeRun?.level ?? 1),
        maxComboReached: Math.max(career.maxComboReached, activeRun?.maxComboReached ?? 1),
        totalBlocksClearedLifetime: career.totalBlocksClearedLifetime,
        gamesPlayed: career.gamesPlayed,
        victoriesUnlocked: career.victoriesUnlocked + (activeRun?.victoryUnlocked ? 1 : 0),
    };
    const json = serializeOrbitEnvelope(updatedCareer, activeRun);
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(storageKey, json);
        }
    }
    catch {
        // Ignore quota/sandbox errors
    }
    return deserializeOrbitEnvelope(json);
}
