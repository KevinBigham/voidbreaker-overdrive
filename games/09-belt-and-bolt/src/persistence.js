import { CONFIG } from './config';
import { createInitialState } from './simulation';
export const SAVE_SCHEMA_VERSION = 1;
const DEFAULT_BEST_RECORD = {
    bestWaveReached: 1,
    bestQuotaProgress: 0,
    bestCreditsEarned: 0,
    campaignsWon: 0,
};
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
export function serializeGameState(state, bestRecord) {
    const currentBest = bestRecord ?? computeUpdatedBestRecord(state, DEFAULT_BEST_RECORD);
    const envelope = {
        schemaVersion: SAVE_SCHEMA_VERSION,
        savedAtIso: new Date().toISOString(),
        state: deepClone(state),
        bestRecord: currentBest,
    };
    return JSON.stringify(envelope);
}
export function deserializeGameState(rawJson) {
    try {
        const parsed = JSON.parse(rawJson);
        if (!parsed ||
            parsed.schemaVersion !== SAVE_SCHEMA_VERSION ||
            !parsed.state ||
            typeof parsed.state.gridSize !== 'number' ||
            !Array.isArray(parsed.state.grid)) {
            return null;
        }
        const fallback = createInitialState({ seed: parsed.state.seed ?? 9092026 });
        const restoredState = {
            ...fallback,
            ...deepClone(parsed.state),
        };
        const bestRecord = {
            ...DEFAULT_BEST_RECORD,
            ...(parsed.bestRecord ?? {}),
        };
        return { state: restoredState, bestRecord };
    }
    catch {
        return null;
    }
}
export function computeUpdatedBestRecord(state, prev) {
    return {
        bestWaveReached: Math.max(prev.bestWaveReached, state.wave),
        bestQuotaProgress: Math.max(prev.bestQuotaProgress, state.quotaProgress),
        bestCreditsEarned: Math.max(prev.bestCreditsEarned, state.stats.totalCreditsEarned),
        campaignsWon: prev.campaignsWon + (state.status === 'victory' && prev.campaignsWon === 0 ? 1 : 0),
    };
}
export function saveGameToStorage(state, storageKey = CONFIG.STORAGE_KEY) {
    try {
        if (typeof window === 'undefined' || !window.localStorage)
            return false;
        const prev = loadGameFromStorage(storageKey)?.bestRecord ?? DEFAULT_BEST_RECORD;
        const updatedBest = computeUpdatedBestRecord(state, prev);
        const payload = serializeGameState(state, updatedBest);
        window.localStorage.setItem(storageKey, payload);
        return true;
    }
    catch {
        return false;
    }
}
export function loadGameFromStorage(storageKey = CONFIG.STORAGE_KEY) {
    try {
        if (typeof window === 'undefined' || !window.localStorage)
            return null;
        const raw = window.localStorage.getItem(storageKey);
        if (!raw)
            return null;
        return deserializeGameState(raw);
    }
    catch {
        return null;
    }
}
export function clearSavedGame(storageKey = CONFIG.STORAGE_KEY) {
    try {
        if (typeof window === 'undefined' || !window.localStorage)
            return;
        window.localStorage.removeItem(storageKey);
    }
    catch {
        // ignore storage errors in restricted environments
    }
}
