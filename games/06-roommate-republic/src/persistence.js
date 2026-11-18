import { GAME_CONFIG, ROOMMATE_ORDER, } from './config.ts';
import { cloneAssumptions, createDefaultAssumptions, POLICIES, SCENARIOS, } from './content.ts';
import { generateExternalEventSchedule, } from './simulation.ts';
const DEFAULT_PREDICTIONS = {
    'scenario-1-thermostat': {
        highestNetPayer: 'priya',
        week3ShockOutcome: 'liquidity_crunch',
        behavioralShift: 'priya',
    },
    'scenario-2-grocery-jar': {
        highestNetPayer: 'priya',
        week3ShockOutcome: 'all_solvent_buffered',
        behavioralShift: 'leo',
    },
    'scenario-3-boiler-emergency': {
        highestNetPayer: 'priya',
        week3ShockOutcome: 'liquidity_crunch',
        behavioralShift: 'priya',
    },
};
export function createDefaultPersistedState(seed = GAME_CONFIG.DEFAULT_SEED) {
    const normalizedSeed = Math.floor(seed) >>> 0;
    const defaultScenario = 'scenario-1-thermostat';
    return {
        schemaVersion: GAME_CONFIG.SCHEMA_VERSION,
        seed: normalizedSeed,
        activeScenarioId: defaultScenario,
        activePolicyId: SCENARIOS[defaultScenario].defaultPolicyId,
        comparisonPolicyId: SCENARIOS[defaultScenario].recommendedComparisonPolicyId,
        predictionsByScenario: {
            'scenario-1-thermostat': { ...DEFAULT_PREDICTIONS['scenario-1-thermostat'] },
            'scenario-2-grocery-jar': { ...DEFAULT_PREDICTIONS['scenario-2-grocery-jar'] },
            'scenario-3-boiler-emergency': {
                ...DEFAULT_PREDICTIONS['scenario-3-boiler-emergency'],
            },
        },
        committedPredictionsByScenario: {
            'scenario-1-thermostat': false,
            'scenario-2-grocery-jar': false,
            'scenario-3-boiler-emergency': false,
        },
        frozenSchedulesByScenario: {
            'scenario-1-thermostat': generateExternalEventSchedule('scenario-1-thermostat', normalizedSeed),
            'scenario-2-grocery-jar': generateExternalEventSchedule('scenario-2-grocery-jar', normalizedSeed),
            'scenario-3-boiler-emergency': generateExternalEventSchedule('scenario-3-boiler-emergency', normalizedSeed),
        },
        assumptionsByScenario: {
            'scenario-1-thermostat': createDefaultAssumptions(),
            'scenario-2-grocery-jar': createDefaultAssumptions(),
            'scenario-3-boiler-emergency': createDefaultAssumptions(),
        },
        completedScenarios: [],
        completedComparisons: [],
        debriefAnswers: {},
    };
}
function isValidScenarioId(val) {
    return typeof val === 'string' && val in SCENARIOS;
}
function isValidPolicyId(val) {
    return typeof val === 'string' && val in POLICIES;
}
function sanitizeAssumptions(raw) {
    const fallback = createDefaultAssumptions();
    if (!raw || typeof raw !== 'object')
        return fallback;
    const obj = raw;
    const rawRoommates = obj.roommates && typeof obj.roommates === 'object'
        ? obj.roommates
        : {};
    for (const id of ROOMMATE_ORDER) {
        const r = rawRoommates[id];
        if (r && typeof r === 'object') {
            const ro = r;
            if (typeof ro.weeklyIncome === 'number' && Number.isFinite(ro.weeklyIncome)) {
                fallback.roommates[id].weeklyIncome = ro.weeklyIncome;
            }
            if (typeof ro.usageAppetite === 'number' && Number.isFinite(ro.usageAppetite)) {
                fallback.roommates[id].usageAppetite = ro.usageAppetite;
            }
            if (typeof ro.freeRideTemptation === 'number' &&
                Number.isFinite(ro.freeRideTemptation)) {
                fallback.roommates[id].freeRideTemptation = ro.freeRideTemptation;
            }
            if (typeof ro.auditSensitivity === 'number' &&
                Number.isFinite(ro.auditSensitivity)) {
                fallback.roommates[id].auditSensitivity = ro.auditSensitivity;
            }
            if (typeof ro.fairnessThreshold === 'number' &&
                Number.isFinite(ro.fairnessThreshold)) {
                fallback.roommates[id].fairnessThreshold = ro.fairnessThreshold;
            }
            if (typeof ro.initialCash === 'number' && Number.isFinite(ro.initialCash)) {
                fallback.roommates[id].initialCash = ro.initialCash;
            }
        }
    }
    if (typeof obj.reserveContributionRate === 'number' &&
        Number.isFinite(obj.reserveContributionRate)) {
        fallback.reserveContributionRate = obj.reserveContributionRate;
    }
    if (typeof obj.weeklyMeteringAdminFee === 'number' &&
        Number.isFinite(obj.weeklyMeteringAdminFee)) {
        fallback.weeklyMeteringAdminFee = obj.weeklyMeteringAdminFee;
    }
    if (typeof obj.choreCreditDollarValue === 'number' &&
        Number.isFinite(obj.choreCreditDollarValue)) {
        fallback.choreCreditDollarValue = obj.choreCreditDollarValue;
    }
    return cloneAssumptions(fallback);
}
export function validateAndNormalizeState(raw, fallbackSeed = GAME_CONFIG.DEFAULT_SEED) {
    if (!raw || typeof raw !== 'object')
        return null;
    const obj = raw;
    if (obj.schemaVersion !== GAME_CONFIG.SCHEMA_VERSION)
        return null;
    const seed = typeof obj.seed === 'number' && Number.isFinite(obj.seed)
        ? Math.floor(obj.seed) >>> 0
        : fallbackSeed;
    const base = createDefaultPersistedState(seed);
    if (isValidScenarioId(obj.activeScenarioId)) {
        base.activeScenarioId = obj.activeScenarioId;
    }
    if (isValidPolicyId(obj.activePolicyId)) {
        base.activePolicyId = obj.activePolicyId;
    }
    if (isValidPolicyId(obj.comparisonPolicyId)) {
        base.comparisonPolicyId = obj.comparisonPolicyId;
    }
    if (obj.predictionsByScenario && typeof obj.predictionsByScenario === 'object') {
        const preds = obj.predictionsByScenario;
        for (const sId of Object.keys(SCENARIOS)) {
            const p = preds[sId];
            if (p && typeof p === 'object') {
                if (typeof p.highestNetPayer === 'string' &&
                    ROOMMATE_ORDER.includes(p.highestNetPayer)) {
                    base.predictionsByScenario[sId].highestNetPayer =
                        p.highestNetPayer;
                }
                if (p.week3ShockOutcome === 'all_solvent_buffered' ||
                    p.week3ShockOutcome === 'liquidity_crunch') {
                    base.predictionsByScenario[sId].week3ShockOutcome = p.week3ShockOutcome;
                }
                if (typeof p.behavioralShift === 'string' &&
                    ROOMMATE_ORDER.includes(p.behavioralShift)) {
                    base.predictionsByScenario[sId].behavioralShift =
                        p.behavioralShift;
                }
            }
        }
    }
    if (obj.committedPredictionsByScenario &&
        typeof obj.committedPredictionsByScenario === 'object') {
        const comm = obj.committedPredictionsByScenario;
        for (const sId of Object.keys(SCENARIOS)) {
            if (typeof comm[sId] === 'boolean') {
                base.committedPredictionsByScenario[sId] = comm[sId];
            }
        }
    }
    if (obj.frozenSchedulesByScenario &&
        typeof obj.frozenSchedulesByScenario === 'object') {
        const scheds = obj.frozenSchedulesByScenario;
        for (const sId of Object.keys(SCENARIOS)) {
            const sc = scheds[sId];
            if (sc &&
                typeof sc === 'object' &&
                sc.scenarioId === sId &&
                Array.isArray(sc.weeks) &&
                sc.weeks.length === 4) {
                base.frozenSchedulesByScenario[sId] = sc;
            }
        }
    }
    if (obj.assumptionsByScenario &&
        typeof obj.assumptionsByScenario === 'object') {
        const assumps = obj.assumptionsByScenario;
        for (const sId of Object.keys(SCENARIOS)) {
            if (assumps[sId]) {
                base.assumptionsByScenario[sId] = sanitizeAssumptions(assumps[sId]);
            }
        }
    }
    if (Array.isArray(obj.completedScenarios)) {
        base.completedScenarios = obj.completedScenarios.filter(isValidScenarioId);
    }
    if (Array.isArray(obj.completedComparisons)) {
        base.completedComparisons =
            obj.completedComparisons.filter(isValidScenarioId);
    }
    if (obj.debriefAnswers && typeof obj.debriefAnswers === 'object') {
        const ans = obj.debriefAnswers;
        for (const [k, v] of Object.entries(ans)) {
            if (typeof v === 'string') {
                base.debriefAnswers[k] = v;
            }
        }
    }
    return base;
}
export function savePersistedState(state, storage) {
    try {
        const targetStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
        if (!targetStorage)
            return false;
        targetStorage.setItem(GAME_CONFIG.STORAGE_KEY, JSON.stringify(state));
        return true;
    }
    catch {
        return false;
    }
}
export function loadPersistedState(fallbackSeed = GAME_CONFIG.DEFAULT_SEED, storage) {
    try {
        const targetStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
        if (!targetStorage)
            return createDefaultPersistedState(fallbackSeed);
        const rawStr = targetStorage.getItem(GAME_CONFIG.STORAGE_KEY);
        if (!rawStr)
            return createDefaultPersistedState(fallbackSeed);
        const parsed = JSON.parse(rawStr);
        const validated = validateAndNormalizeState(parsed, fallbackSeed);
        return validated ?? createDefaultPersistedState(fallbackSeed);
    }
    catch {
        return createDefaultPersistedState(fallbackSeed);
    }
}
export function exportStateToJson(state) {
    return JSON.stringify(state, null, 2);
}
export function importStateFromJson(jsonStr, fallbackSeed = GAME_CONFIG.DEFAULT_SEED) {
    try {
        const parsed = JSON.parse(jsonStr);
        return validateAndNormalizeState(parsed, fallbackSeed);
    }
    catch {
        return null;
    }
}
export function clearPersistedState(storage) {
    try {
        const targetStorage = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
        targetStorage?.removeItem(GAME_CONFIG.STORAGE_KEY);
    }
    catch {
        // ignore storage errors
    }
}
