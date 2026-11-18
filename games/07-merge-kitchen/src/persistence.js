import { MERGE_KITCHEN_CONFIG } from './config.ts';
import { createInitialState } from './simulation.ts';
export function createDefaultProfile() {
    return {
        version: MERGE_KITCHEN_CONFIG.SAVE_VERSION,
        bestScore: 0,
        mostOrdersServed: 0,
        highestTierReached: 1,
        highestValueReached: 2,
        gamesPlayed: 1,
        totalWins: 0,
        soundEnabled: true,
        reducedMotion: false,
    };
}
function isValidGrid(grid) {
    if (!Array.isArray(grid) || grid.length !== MERGE_KITCHEN_CONFIG.GRID_SIZE) {
        return false;
    }
    for (const row of grid) {
        if (!Array.isArray(row) || row.length !== MERGE_KITCHEN_CONFIG.GRID_SIZE) {
            return false;
        }
        for (const cell of row) {
            if (typeof cell !== 'number' || !Number.isFinite(cell) || cell < 0) {
                return false;
            }
        }
    }
    return true;
}
export function isValidGameState(candidate) {
    if (!candidate || typeof candidate !== 'object') {
        return false;
    }
    const s = candidate;
    if (s.version !== MERGE_KITCHEN_CONFIG.SAVE_VERSION) {
        return false;
    }
    if (!isValidGrid(s.grid)) {
        return false;
    }
    if (typeof s.score !== 'number' || typeof s.ordersServed !== 'number') {
        return false;
    }
    if (!Array.isArray(s.tickets) || s.tickets.length !== MERGE_KITCHEN_CONFIG.ORDER_SLOT_COUNT) {
        return false;
    }
    if (!s.rng || typeof s.rng.seed !== 'number') {
        return false;
    }
    return true;
}
export function saveGameState(state, storage = typeof window !== 'undefined' ? window.localStorage : null) {
    if (!storage)
        return false;
    try {
        storage.setItem(MERGE_KITCHEN_CONFIG.STORAGE_KEY_STATE, JSON.stringify(state));
        return true;
    }
    catch {
        return false;
    }
}
export function loadGameState(fallbackSeed = MERGE_KITCHEN_CONFIG.DEFAULT_SEED, storage = typeof window !== 'undefined' ? window.localStorage : null) {
    if (!storage) {
        return {
            state: createInitialState(fallbackSeed),
            restoredFromSave: false,
            recoveredFromCorruption: false,
        };
    }
    try {
        const raw = storage.getItem(MERGE_KITCHEN_CONFIG.STORAGE_KEY_STATE);
        if (!raw) {
            return {
                state: createInitialState(fallbackSeed),
                restoredFromSave: false,
                recoveredFromCorruption: false,
            };
        }
        const parsed = JSON.parse(raw);
        if (isValidGameState(parsed)) {
            return {
                state: parsed,
                restoredFromSave: true,
                recoveredFromCorruption: false,
            };
        }
        // Corrupted or outdated payload: clean up and recover gracefully
        storage.removeItem(MERGE_KITCHEN_CONFIG.STORAGE_KEY_STATE);
        return {
            state: createInitialState(fallbackSeed),
            restoredFromSave: false,
            recoveredFromCorruption: true,
        };
    }
    catch {
        try {
            storage.removeItem(MERGE_KITCHEN_CONFIG.STORAGE_KEY_STATE);
        }
        catch {
            // ignore
        }
        return {
            state: createInitialState(fallbackSeed),
            restoredFromSave: false,
            recoveredFromCorruption: true,
        };
    }
}
export function loadProfile(storage = typeof window !== 'undefined' ? window.localStorage : null) {
    const defaults = createDefaultProfile();
    if (!storage)
        return defaults;
    try {
        const raw = storage.getItem(MERGE_KITCHEN_CONFIG.STORAGE_KEY_PROFILE);
        if (!raw)
            return defaults;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return defaults;
        }
        return {
            version: MERGE_KITCHEN_CONFIG.SAVE_VERSION,
            bestScore: typeof parsed.bestScore === 'number' ? Math.max(0, parsed.bestScore) : 0,
            mostOrdersServed: typeof parsed.mostOrdersServed === 'number' ? Math.max(0, parsed.mostOrdersServed) : 0,
            highestTierReached: typeof parsed.highestTierReached === 'number'
                ? Math.max(1, parsed.highestTierReached)
                : 1,
            highestValueReached: typeof parsed.highestValueReached === 'number'
                ? Math.max(2, parsed.highestValueReached)
                : 2,
            gamesPlayed: typeof parsed.gamesPlayed === 'number' ? Math.max(1, parsed.gamesPlayed) : 1,
            totalWins: typeof parsed.totalWins === 'number' ? Math.max(0, parsed.totalWins) : 0,
            soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
            reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : false,
        };
    }
    catch {
        return defaults;
    }
}
export function saveProfile(profile, storage = typeof window !== 'undefined' ? window.localStorage : null) {
    if (!storage)
        return false;
    try {
        storage.setItem(MERGE_KITCHEN_CONFIG.STORAGE_KEY_PROFILE, JSON.stringify(profile));
        return true;
    }
    catch {
        return false;
    }
}
export function syncProfileWithState(profile, state, justWon = false) {
    return {
        ...profile,
        bestScore: Math.max(profile.bestScore, state.score),
        mostOrdersServed: Math.max(profile.mostOrdersServed, state.ordersServed),
        highestTierReached: Math.max(profile.highestTierReached, state.highestTier),
        highestValueReached: Math.max(profile.highestValueReached, state.highestValue),
        totalWins: justWon ? profile.totalWins + 1 : profile.totalWins,
    };
}
export function exportSaveString(state, profile) {
    const bundle = {
        gameId: MERGE_KITCHEN_CONFIG.GAME_ID,
        version: MERGE_KITCHEN_CONFIG.SAVE_VERSION,
        exportedAt: new Date().toISOString(),
        state,
        profile,
    };
    return JSON.stringify(bundle);
}
export function importSaveString(jsonText) {
    try {
        const parsed = JSON.parse(jsonText);
        if (parsed && isValidGameState(parsed.state)) {
            return {
                ok: true,
                state: parsed.state,
                profile: parsed.profile,
            };
        }
        if (isValidGameState(parsed)) {
            return {
                ok: true,
                state: parsed,
            };
        }
        return {
            ok: false,
            error: 'Invalid Merge Kitchen save structure or version mismatch.',
        };
    }
    catch {
        return {
            ok: false,
            error: 'Could not parse save JSON string.',
        };
    }
}
