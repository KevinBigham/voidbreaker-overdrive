import { GAME_CONFIG } from './config.ts';
import { validateStateHoldCapacity } from './simulation.ts';
export function serializeRunState(state) {
    const envelope = {
        gameId: GAME_CONFIG.gameId,
        version: GAME_CONFIG.saveVersion,
        savedAtIso: new Date().toISOString(),
        state: structuredClone(state),
    };
    return JSON.stringify(envelope);
}
export function deserializeRunState(rawJson) {
    try {
        const parsed = JSON.parse(rawJson);
        if (!parsed || typeof parsed !== 'object') {
            return { ok: false, error: 'Invalid save JSON payload.' };
        }
        if (parsed.gameId !== GAME_CONFIG.gameId) {
            return { ok: false, error: `Save belongs to another game (${String(parsed.gameId)}).` };
        }
        if (parsed.version !== GAME_CONFIG.saveVersion) {
            return { ok: false, error: `Unsupported save version: ${String(parsed.version)}.` };
        }
        const st = parsed.state;
        if (!st ||
            typeof st.seed !== 'number' ||
            typeof st.currentNodeId !== 'string' ||
            !Array.isArray(st.edges) ||
            !Array.isArray(st.contracts) ||
            !Array.isArray(st.installedModules)) {
            return { ok: false, error: 'Corrupted run state structure.' };
        }
        const cloned = structuredClone(st);
        const holdValidation = validateStateHoldCapacity(cloned);
        if (!holdValidation.valid) {
            return { ok: false, error: `Invalid saved loadout: ${holdValidation.reason}` };
        }
        // Important: Do NOT regenerate or reroll edges or contracts on load!
        return { ok: true, state: cloned };
    }
    catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to parse save data.',
        };
    }
}
export function saveRunToStorage(state, storage = typeof localStorage !== 'undefined'
    ? localStorage
    : undefined) {
    if (!storage)
        return false;
    try {
        storage.setItem(GAME_CONFIG.saveStorageKey, serializeRunState(state));
        return true;
    }
    catch {
        return false;
    }
}
export function loadRunFromStorage(storage = typeof localStorage !== 'undefined'
    ? localStorage
    : undefined) {
    if (!storage)
        return null;
    try {
        const raw = storage.getItem(GAME_CONFIG.saveStorageKey);
        if (!raw)
            return null;
        const res = deserializeRunState(raw);
        return res.ok && res.state ? res.state : null;
    }
    catch {
        return null;
    }
}
export function clearSavedRunFromStorage(storage = typeof localStorage !== 'undefined'
    ? localStorage
    : undefined) {
    if (!storage)
        return;
    try {
        storage.removeItem(GAME_CONFIG.saveStorageKey);
    }
    catch {
        // ignore storage removal errors
    }
}
