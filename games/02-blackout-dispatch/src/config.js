export const CONFIG = {
    RULES_VERSION: '1.0.0',
    STORAGE_KEY: 'argon_game02_blackout_dispatch_v1',
    GRID_SIZE: 8,
    TOTAL_TURNS: 12,
    MAX_ACTIONS_PER_TURN: 2,
    BASE_MATERIAL_INCOME_PER_TURN: 15,
    RELAY_MATERIAL_BONUS_PER_TURN: 2,
    REROUTE_COST_MAT: 5,
    DEFAULT_SEED: 20261106,
    LINKS: {
        standard: {
            type: 'standard',
            name: 'Standard Line',
            shortLabel: 'STD 4MW',
            capacityMW: 4,
            buildCostMat: 10,
            repairCostMat: 5,
            windImmune: false,
            description: '4 MW capacity, 10 Mat. Economical feeder line; vulnerable to storm wind strikes.',
        },
        heavy: {
            type: 'heavy',
            name: 'Heavy Trunk',
            shortLabel: 'HVY 8MW',
            capacityMW: 8,
            buildCostMat: 20,
            repairCostMat: 8,
            windImmune: false,
            description: '8 MW capacity, 20 Mat. High-throughput arterial line; vulnerable to storm wind strikes.',
        },
        shielded: {
            type: 'shielded',
            name: 'Storm-Shielded Conduit',
            shortLabel: 'SHD 5MW',
            capacityMW: 5,
            buildCostMat: 25,
            repairCostMat: 10,
            windImmune: true,
            description: '5 MW capacity, 25 Mat. Armored underground/insulated conduit; IMMUNE to standard wind strikes.',
        },
    },
};
export function getUpgradeCostMat(fromType, toType, isDamaged) {
    if (fromType === toType) {
        return isDamaged ? CONFIG.LINKS[fromType].repairCostMat : 0;
    }
    const diff = Math.max(10, CONFIG.LINKS[toType].buildCostMat - CONFIG.LINKS[fromType].buildCostMat + (isDamaged ? 5 : 0));
    return diff;
}
export function coordKey(row, col) {
    return `${row},${col}`;
}
export function parseCoordKey(key) {
    const [r, c] = key.split(',').map(Number);
    return { row: r, col: c };
}
export function makeEdgeId(a, b) {
    const cA = typeof a === 'string' ? parseCoordKey(a) : a;
    const cB = typeof b === 'string' ? parseCoordKey(b) : b;
    const kA = coordKey(cA.row, cA.col);
    const kB = coordKey(cB.row, cB.col);
    if (cA.row < cB.row || (cA.row === cB.row && cA.col <= cB.col)) {
        return `${kA}--${kB}`;
    }
    return `${kB}--${kA}`;
}
export function parseEdgeId(edgeId) {
    const [nodeA, nodeB] = edgeId.split('--');
    return {
        nodeA,
        nodeB,
        coordA: parseCoordKey(nodeA),
        coordB: parseCoordKey(nodeB),
    };
}
export function isOrthogonallyAdjacent(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}
export function formatEdgeLabel(edgeId) {
    const { nodeA, nodeB } = parseEdgeId(edgeId);
    return `(${nodeA})↔(${nodeB})`;
}
