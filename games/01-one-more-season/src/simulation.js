import { ATTRIBUTE_KEYS, clamp, clampAttribute, clampFatigue, computeEffectiveMultiplier, computeEffectiveStat, computeStarterPostMatchFatigueDelta, CONFIG, RULES_VERSION, } from './config.ts';
import { getOpponentForFixture, INITIAL_ROSTER, RECAP_TEMPLATES, } from './content.ts';
import { createRng, normalizeSeed } from './rng.ts';
export function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
}
export function createInitialState(seed = CONFIG.defaultSeed) {
    const normalized = normalizeSeed(seed);
    const roster = INITIAL_ROSTER.map((tpl) => ({
        id: tpl.id,
        name: tpl.name,
        number: tpl.number,
        role: tpl.role,
        roleTitle: tpl.roleTitle,
        bio: tpl.bio,
        attack: tpl.attack,
        defense: tpl.defense,
        control: tpl.control,
        stamina: tpl.stamina,
        fatigue: tpl.initialFatigue,
        matchesStarted: 0,
        matchesBenched: 0,
    }));
    const selectedStarterIds = INITIAL_ROSTER.filter((p) => p.defaultStarter).map((p) => p.id);
    return {
        rulesVersion: RULES_VERSION,
        seed: normalized,
        rngState: normalized,
        fixtureNumber: 1,
        phase: 'preparation',
        roster,
        selectedStarterIds,
        selectedPlan: 'Balanced',
        prepPointsRemaining: CONFIG.prepPointsPerFixture,
        prepActionsThisFixture: [],
        currentMatch: null,
        seasonHistory: [],
        commandLog: [],
    };
}
export function computeTeamEffectiveRatings(roster, starterIds) {
    const starterSet = new Set(starterIds);
    const starters = roster
        .filter((p) => starterSet.has(p.id))
        .map((p) => {
        const effectiveMultiplier = computeEffectiveMultiplier(p.fatigue);
        return {
            id: p.id,
            name: p.name,
            role: p.role,
            fatigue: p.fatigue,
            effectiveMultiplier,
            rawAttack: p.attack,
            rawDefense: p.defense,
            rawControl: p.control,
            stamina: p.stamina,
            effectiveAttack: computeEffectiveStat(p.attack, p.fatigue),
            effectiveDefense: computeEffectiveStat(p.defense, p.fatigue),
            effectiveControl: computeEffectiveStat(p.control, p.fatigue),
        };
    });
    const rawAttack = starters.reduce((sum, s) => sum + s.rawAttack, 0);
    const rawDefense = starters.reduce((sum, s) => sum + s.rawDefense, 0);
    const rawControl = starters.reduce((sum, s) => sum + s.rawControl, 0);
    const effectiveAttack = Number(starters.reduce((sum, s) => sum + s.effectiveAttack, 0).toFixed(4));
    const effectiveDefense = Number(starters.reduce((sum, s) => sum + s.effectiveDefense, 0).toFixed(4));
    const effectiveControl = Number(starters.reduce((sum, s) => sum + s.effectiveControl, 0).toFixed(4));
    const averageFatigue = starters.length > 0
        ? Number((starters.reduce((sum, s) => sum + s.fatigue, 0) / starters.length).toFixed(2))
        : 0;
    return {
        starters,
        rawAttack,
        rawDefense,
        rawControl,
        effectiveAttack,
        effectiveDefense,
        effectiveControl,
        averageFatigue,
    };
}
/**
 * Exact Matchup & Tendency Modifier Contract:
 * Team effective attributes (Attack + Control vs opponent Defense + Control)
 * and the visible opponent tendency shift up to ±15 percentage points
 * between the 0-point and 7-point outcomes while keeping probabilities
 * non-negative and summing to 100% (1.0).
 */
export function computePossessionProbabilities(params) {
    const { team, clubPlan, teamRatings, opponent } = params;
    const tacticalPlanUsed = team === 'club' ? clubPlan : opponent.defaultPlan;
    const baseDistribution = CONFIG.basePlanDistributions[tacticalPlanUsed];
    const offenseRating = team === 'club'
        ? Number((teamRatings.effectiveAttack + teamRatings.effectiveControl).toFixed(4))
        : Number((opponent.attack + opponent.control).toFixed(4));
    const defenseRating = team === 'club'
        ? Number((opponent.defense + opponent.control).toFixed(4))
        : Number((teamRatings.effectiveDefense + teamRatings.effectiveControl).toFixed(4));
    const attributeDelta = Number((offenseRating - defenseRating).toFixed(4));
    const attributeShift = Number((attributeDelta * CONFIG.attributeDeltaShiftScale).toFixed(6));
    const tendencyShift = team === 'club'
        ? opponent.tendency.clubPlanModifier[clubPlan]
        : opponent.tendency.opponentPossessionModifier[clubPlan];
    const rawShift = Number((attributeShift + tendencyShift).toFixed(6));
    const maxPositive = Math.min(CONFIG.maxProbabilityShift, baseDistribution.p0, 1 - baseDistribution.p7);
    const maxNegative = -Math.min(CONFIG.maxProbabilityShift, baseDistribution.p7, 1 - baseDistribution.p0);
    const totalShift = Number(clamp(rawShift, maxNegative, maxPositive).toFixed(6));
    const p7 = Number((baseDistribution.p7 + totalShift).toFixed(6));
    const p3 = Number(baseDistribution.p3.toFixed(6));
    const p0 = Number((1 - p7 - p3).toFixed(6));
    return {
        team,
        tacticalPlanUsed,
        clubSelectedPlan: clubPlan,
        baseDistribution: { ...baseDistribution },
        offenseRating,
        defenseRating,
        attributeDelta,
        attributeShift,
        tendencyShift,
        rawShift,
        totalShift,
        probabilities: { p0, p3, p7 },
    };
}
export function resolvePointsFromRoll(roll, probabilities) {
    if (roll < probabilities.p0) {
        return 0;
    }
    if (roll < probabilities.p0 + probabilities.p3) {
        return 3;
    }
    return 7;
}
function pickPossessionActors(starters, team, possessionIndex) {
    const ordered = [...starters].sort((a, b) => {
        if (team === 'club') {
            const scoreA = a.effectiveAttack * 1.4 + a.effectiveControl;
            const scoreB = b.effectiveAttack * 1.4 + b.effectiveControl;
            return scoreB - scoreA;
        }
        else {
            const scoreA = a.effectiveDefense * 1.4 + a.effectiveControl;
            const scoreB = b.effectiveDefense * 1.4 + b.effectiveControl;
            return scoreB - scoreA;
        }
    });
    const keyIdx = (possessionIndex - 1) % Math.min(3, ordered.length);
    const supportIdx = (keyIdx + 1 + Math.floor((possessionIndex - 1) / 2)) % ordered.length;
    const finalSupportIdx = supportIdx === keyIdx ? (keyIdx + 1) % ordered.length : supportIdx;
    return {
        keyPlayer: ordered[keyIdx],
        supportPlayer: ordered[finalSupportIdx],
    };
}
function formatSignedPct(shift) {
    const pct = (shift * 100).toFixed(1);
    return shift >= 0 ? `+${pct}%` : `${pct}%`;
}
export function generateDecisiveEvents(possessions, opponent, clubPlan) {
    const scored = possessions.map((pos) => {
        let priority = 0;
        const leadBefore = Math.sign(pos.clubScoreBefore - pos.opponentScoreBefore);
        const leadAfter = Math.sign(pos.clubScoreAfter - pos.opponentScoreAfter);
        if (leadBefore !== leadAfter) {
            priority += 32;
        }
        if (pos.wasShiftedSwing) {
            priority += 36;
        }
        if (pos.points === 7) {
            priority += 26;
        }
        else if (pos.points === 3) {
            priority += 14;
        }
        else if (pos.team === 'opponent' && pos.points === 0) {
            priority += 12;
        }
        else if (pos.team === 'club' &&
            pos.points === 0 &&
            pos.keyPlayerFatigue >= 35) {
            priority += 18;
        }
        if (pos.half === 2) {
            priority += 6;
        }
        return { pos, priority };
    });
    scored.sort((a, b) => {
        if (b.priority !== a.priority)
            return b.priority - a.priority;
        return b.pos.possessionIndex - a.pos.possessionIndex;
    });
    const chosenPossessions = scored
        .slice(0, 3)
        .map((s) => s.pos)
        .sort((a, b) => a.possessionIndex - b.possessionIndex);
    const usedTemplateIds = new Set();
    return chosenPossessions.map((pos, idx) => {
        const candidates = RECAP_TEMPLATES.filter((tpl) => {
            if (usedTemplateIds.has(tpl.id))
                return false;
            if (pos.team === 'club' && pos.points === 7) {
                return (tpl.category === 'club_breakthrough_7' ||
                    tpl.category === 'tendency_exploit');
            }
            if (pos.team === 'club' && pos.points === 3) {
                return tpl.category === 'club_clinical_3';
            }
            if (pos.team === 'club' && pos.points === 0) {
                return pos.keyPlayerFatigue >= 30
                    ? tpl.category === 'fatigue_swing' || tpl.category === 'club_stalled_0'
                    : tpl.category === 'club_stalled_0' || tpl.category === 'fatigue_swing';
            }
            if (pos.team === 'opponent' && pos.points === 0) {
                return tpl.category === 'club_defensive_stand_0';
            }
            if (pos.team === 'opponent' && pos.points === 7) {
                return tpl.category === 'opponent_punish_7';
            }
            if (pos.team === 'opponent' && pos.points === 3) {
                return tpl.category === 'opponent_chip_3';
            }
            return true;
        });
        const fallbackPool = RECAP_TEMPLATES.filter((t) => !usedTemplateIds.has(t.id));
        const chosenTemplate = candidates[0] ?? fallbackPool[0] ?? RECAP_TEMPLATES[0];
        usedTemplateIds.add(chosenTemplate.id);
        const ctx = {
            possessionIndex: pos.possessionIndex,
            half: pos.half,
            team: pos.team,
            points: pos.points,
            tacticalPlan: clubPlan,
            opponentName: opponent.name,
            tendencyName: opponent.tendency.name,
            keyPlayerName: pos.keyPlayerName,
            keyPlayerRole: pos.keyPlayerRole,
            keyPlayerFatigue: pos.keyPlayerFatigue,
            supportPlayerName: pos.supportPlayerName,
            clubScoreAfter: pos.clubScoreAfter,
            opponentScoreAfter: pos.opponentScoreAfter,
            totalShiftPct: formatSignedPct(pos.totalShift),
            rollDisplay: pos.roll.toFixed(3),
        };
        return {
            eventIndex: idx + 1,
            possessionIndex: pos.possessionIndex,
            templateId: chosenTemplate.id,
            templateTitle: chosenTemplate.title,
            category: chosenTemplate.category,
            headline: chosenTemplate.renderHeadline(ctx),
            body: chosenTemplate.renderBody(ctx),
            team: pos.team,
            points: pos.points,
            roll: pos.roll,
            totalShift: pos.totalShift,
            probabilities: { ...pos.probabilities },
        };
    });
}
/**
 * Pure match resolution for 8 alternating possessions per side (16 total).
 */
export function simulateMatch(params) {
    const { fixtureNumber, roster, starterIds, clubPlan, prepActions, rngState, } = params;
    if (starterIds.length !== CONFIG.startersCount) {
        throw new Error(`Expected ${CONFIG.startersCount} starters, got ${starterIds.length}`);
    }
    const opponent = getOpponentForFixture(fixtureNumber);
    const teamRatings = computeTeamEffectiveRatings(roster, starterIds);
    const rng = createRng(rngState);
    const rngStateBeforeMatch = rng.getState();
    const clubBreakdown = computePossessionProbabilities({
        team: 'club',
        clubPlan,
        teamRatings,
        opponent,
    });
    const opponentBreakdown = computePossessionProbabilities({
        team: 'opponent',
        clubPlan,
        teamRatings,
        opponent,
    });
    const possessions = [];
    let clubScore = 0;
    let opponentScore = 0;
    for (let i = 1; i <= CONFIG.totalPossessions; i++) {
        const team = i % 2 === 1 ? 'club' : 'opponent';
        const half = i <= 8 ? 1 : 2;
        const breakdown = team === 'club' ? clubBreakdown : opponentBreakdown;
        const roll = Number(rng.nextFloat().toFixed(6));
        const points = resolvePointsFromRoll(roll, breakdown.probabilities);
        const baseOutcomeWithoutShift = resolvePointsFromRoll(roll, breakdown.baseDistribution);
        const wasShiftedSwing = points !== baseOutcomeWithoutShift;
        const clubScoreBefore = clubScore;
        const opponentScoreBefore = opponentScore;
        if (team === 'club') {
            clubScore += points;
        }
        else {
            opponentScore += points;
        }
        const actors = pickPossessionActors(teamRatings.starters, team, i);
        possessions.push({
            possessionIndex: i,
            half,
            team,
            tacticalPlanUsed: breakdown.tacticalPlanUsed,
            clubSelectedPlan: clubPlan,
            offenseRating: breakdown.offenseRating,
            defenseRating: breakdown.defenseRating,
            attributeDelta: breakdown.attributeDelta,
            attributeShift: breakdown.attributeShift,
            tendencyShift: breakdown.tendencyShift,
            totalShift: breakdown.totalShift,
            baseProbabilities: { ...breakdown.baseDistribution },
            probabilities: { ...breakdown.probabilities },
            roll,
            points,
            baseOutcomeWithoutShift,
            wasShiftedSwing,
            clubScoreBefore,
            opponentScoreBefore,
            clubScoreAfter: clubScore,
            opponentScoreAfter: opponentScore,
            keyPlayerId: actors.keyPlayer.id,
            keyPlayerName: actors.keyPlayer.name,
            keyPlayerRole: actors.keyPlayer.role,
            keyPlayerFatigue: actors.keyPlayer.fatigue,
            supportPlayerId: actors.supportPlayer.id,
            supportPlayerName: actors.supportPlayer.name,
        });
    }
    const rngStateAfterMatch = rng.getState();
    const outcome = clubScore > opponentScore ? 'W' : clubScore < opponentScore ? 'L' : 'D';
    const starterSet = new Set(starterIds);
    const reserveIds = roster
        .filter((p) => !starterSet.has(p.id))
        .map((p) => p.id);
    const fatigueTransitions = roster.map((player) => {
        const wasStarter = starterSet.has(player.id);
        const rawDelta = wasStarter
            ? computeStarterPostMatchFatigueDelta(player.stamina)
            : CONFIG.postMatchReserveFatigueDelta;
        const fatigueAfter = clampFatigue(player.fatigue + rawDelta);
        return {
            playerId: player.id,
            playerName: player.name,
            wasStarter,
            stamina: player.stamina,
            fatigueBefore: player.fatigue,
            fatigueDelta: fatigueAfter - player.fatigue,
            fatigueAfter,
        };
    });
    const decisiveEvents = generateDecisiveEvents(possessions, opponent, clubPlan);
    const matchResult = {
        fixtureNumber,
        opponentId: opponent.id,
        opponentName: opponent.name,
        opponentShortName: opponent.shortName,
        tendencyName: opponent.tendency.name,
        clubPlan,
        opponentPlan: opponent.defaultPlan,
        starterIds: [...starterIds],
        reserveIds,
        prepActions: prepActions.map((a) => ({ ...a })),
        teamRatingsAtKickoff: teamRatings,
        opponentRatings: {
            attack: opponent.attack,
            defense: opponent.defense,
            control: opponent.control,
        },
        rngStateBeforeMatch,
        rngStateAfterMatch,
        possessions,
        clubScore,
        opponentScore,
        outcome,
        decisiveEvents,
        fatigueTransitions,
        fatigueApplied: false,
        devChoiceApplied: false,
        devChoice: null,
    };
    return {
        matchResult,
        nextRngState: rngStateAfterMatch,
    };
}
/**
 * Pure state transition boundary. Returns a new GameState or throws a descriptive Error on invalid command.
 */
export function applyCommand(currentState, command) {
    const state = cloneState(currentState);
    switch (command.type) {
        case 'SET_STARTERS': {
            if (state.phase !== 'preparation') {
                throw new Error('Can only change starters during preparation phase.');
            }
            const uniqueIds = Array.from(new Set(command.starterIds));
            if (uniqueIds.length !== CONFIG.startersCount) {
                throw new Error(`Must select exactly ${CONFIG.startersCount} distinct starters.`);
            }
            const rosterIds = new Set(state.roster.map((p) => p.id));
            for (const id of uniqueIds) {
                if (!rosterIds.has(id)) {
                    throw new Error(`Unknown player ID in starter list: ${id}`);
                }
            }
            state.selectedStarterIds = uniqueIds;
            state.commandLog.push(command);
            return state;
        }
        case 'SWAP_STARTER': {
            if (state.phase !== 'preparation') {
                throw new Error('Can only swap starters during preparation phase.');
            }
            const starterIdx = state.selectedStarterIds.indexOf(command.starterId);
            if (starterIdx === -1) {
                throw new Error(`Player ${command.starterId} is not currently a starter.`);
            }
            if (state.selectedStarterIds.includes(command.reserveId)) {
                throw new Error(`Player ${command.reserveId} is already a starter.`);
            }
            const existsInRoster = state.roster.some((p) => p.id === command.reserveId);
            if (!existsInRoster) {
                throw new Error(`Unknown reserve player ID: ${command.reserveId}`);
            }
            state.selectedStarterIds[starterIdx] = command.reserveId;
            state.commandLog.push(command);
            return state;
        }
        case 'SET_TACTICAL_PLAN': {
            if (state.phase !== 'preparation') {
                throw new Error('Can only change tactical plan during preparation phase.');
            }
            if (!CONFIG.basePlanDistributions[command.plan]) {
                throw new Error(`Invalid tactical plan: ${command.plan}`);
            }
            state.selectedPlan = command.plan;
            state.commandLog.push(command);
            return state;
        }
        case 'SPEND_PREP_REST': {
            if (state.phase !== 'preparation') {
                throw new Error('Can only spend preparation points during preparation phase.');
            }
            if (state.prepPointsRemaining <= 0) {
                throw new Error('No preparation points remaining for this fixture.');
            }
            if (state.prepActionsThisFixture.some((a) => a.playerId === command.playerId)) {
                throw new Error('Each player may receive at most one preparation action per fixture.');
            }
            const player = state.roster.find((p) => p.id === command.playerId);
            if (!player) {
                throw new Error(`Unknown player ID: ${command.playerId}`);
            }
            const fatigueBefore = player.fatigue;
            const fatigueAfter = clampFatigue(player.fatigue + CONFIG.restFatigueDelta);
            player.fatigue = fatigueAfter;
            state.prepPointsRemaining -= 1;
            state.prepActionsThisFixture.push({
                playerId: player.id,
                playerName: player.name,
                kind: 'rest',
                fatigueBefore,
                fatigueAfter,
            });
            state.commandLog.push(command);
            return state;
        }
        case 'SPEND_PREP_TRAIN': {
            if (state.phase !== 'preparation') {
                throw new Error('Can only spend preparation points during preparation phase.');
            }
            if (state.prepPointsRemaining <= 0) {
                throw new Error('No preparation points remaining for this fixture.');
            }
            if (state.prepActionsThisFixture.some((a) => a.playerId === command.playerId)) {
                throw new Error('Each player may receive at most one preparation action per fixture.');
            }
            if (!ATTRIBUTE_KEYS.includes(command.attribute)) {
                throw new Error(`Invalid attribute: ${command.attribute}`);
            }
            const player = state.roster.find((p) => p.id === command.playerId);
            if (!player) {
                throw new Error(`Unknown player ID: ${command.playerId}`);
            }
            const attributeBefore = player[command.attribute];
            if (attributeBefore >= CONFIG.maxAttribute) {
                throw new Error(`${player.name}'s ${command.attribute} is already at maximum (${CONFIG.maxAttribute}).`);
            }
            const attributeAfter = clampAttribute(attributeBefore + CONFIG.trainAttributeDelta);
            const fatigueBefore = player.fatigue;
            const fatigueAfter = clampFatigue(fatigueBefore + CONFIG.trainFatigueDelta);
            player[command.attribute] = attributeAfter;
            player.fatigue = fatigueAfter;
            state.prepPointsRemaining -= 1;
            state.prepActionsThisFixture.push({
                playerId: player.id,
                playerName: player.name,
                kind: 'train',
                attribute: command.attribute,
                fatigueBefore,
                fatigueAfter,
                attributeBefore,
                attributeAfter,
            });
            state.commandLog.push(command);
            return state;
        }
        case 'RESET_PREP_ACTIONS': {
            if (state.phase !== 'preparation') {
                throw new Error('Can only reset preparation actions during preparation phase.');
            }
            for (let i = state.prepActionsThisFixture.length - 1; i >= 0; i--) {
                const action = state.prepActionsThisFixture[i];
                const player = state.roster.find((p) => p.id === action.playerId);
                if (player) {
                    player.fatigue = action.fatigueBefore;
                    if (action.kind === 'train' &&
                        action.attribute &&
                        action.attributeBefore !== undefined) {
                        player[action.attribute] = action.attributeBefore;
                    }
                }
            }
            state.prepActionsThisFixture = [];
            state.prepPointsRemaining = CONFIG.prepPointsPerFixture;
            state.commandLog.push(command);
            return state;
        }
        case 'COMMIT_MATCH': {
            if (state.phase !== 'preparation') {
                throw new Error('Can only commit match from preparation phase.');
            }
            const { matchResult, nextRngState } = simulateMatch({
                fixtureNumber: state.fixtureNumber,
                roster: state.roster,
                starterIds: state.selectedStarterIds,
                clubPlan: state.selectedPlan,
                prepActions: state.prepActionsThisFixture,
                rngState: state.rngState,
            });
            state.rngState = nextRngState;
            // Guarded post-match fatigue application (idempotent)
            if (!matchResult.fatigueApplied) {
                const starterSet = new Set(state.selectedStarterIds);
                for (const player of state.roster) {
                    const transition = matchResult.fatigueTransitions.find((t) => t.playerId === player.id);
                    if (transition) {
                        player.fatigue = transition.fatigueAfter;
                    }
                    if (starterSet.has(player.id)) {
                        player.matchesStarted += 1;
                    }
                    else {
                        player.matchesBenched += 1;
                    }
                }
                matchResult.fatigueApplied = true;
            }
            state.currentMatch = matchResult;
            state.seasonHistory.push(matchResult);
            state.phase = 'match_review';
            state.commandLog.push(command);
            return state;
        }
        case 'PROCEED_FROM_MATCH': {
            if (state.phase !== 'match_review') {
                throw new Error('Can only proceed from match_review phase.');
            }
            if (state.fixtureNumber < CONFIG.seasonFixtures) {
                state.phase = 'development';
            }
            else {
                state.phase = 'season_recap';
            }
            state.commandLog.push(command);
            return state;
        }
        case 'APPLY_DEVELOPMENT': {
            if (state.phase !== 'development') {
                throw new Error('Can only apply post-match development during development phase.');
            }
            if (!state.currentMatch) {
                throw new Error('No active match record for post-match development.');
            }
            if (state.currentMatch.devChoiceApplied) {
                throw new Error('Post-match development has already been applied for this fixture.');
            }
            if (!ATTRIBUTE_KEYS.includes(command.attribute)) {
                throw new Error(`Invalid attribute: ${command.attribute}`);
            }
            const player = state.roster.find((p) => p.id === command.playerId);
            if (!player) {
                throw new Error(`Unknown player ID: ${command.playerId}`);
            }
            const beforeValue = player[command.attribute];
            if (beforeValue >= CONFIG.maxAttribute) {
                throw new Error(`${player.name}'s ${command.attribute} is already at maximum (${CONFIG.maxAttribute}).`);
            }
            const afterValue = clampAttribute(beforeValue + CONFIG.postMatchDevAttributeDelta);
            player[command.attribute] = afterValue;
            const devRecord = {
                playerId: player.id,
                playerName: player.name,
                attribute: command.attribute,
                beforeValue,
                afterValue,
            };
            state.currentMatch.devChoiceApplied = true;
            state.currentMatch.devChoice = devRecord;
            const historyEntry = state.seasonHistory[state.seasonHistory.length - 1];
            if (historyEntry &&
                historyEntry.fixtureNumber === state.currentMatch.fixtureNumber) {
                historyEntry.devChoiceApplied = true;
                historyEntry.devChoice = devRecord;
            }
            // Advance to next fixture preparation
            state.fixtureNumber += 1;
            state.prepPointsRemaining = CONFIG.prepPointsPerFixture;
            state.prepActionsThisFixture = [];
            state.phase = 'preparation';
            state.commandLog.push(command);
            return state;
        }
        default: {
            const exhaustiveCheck = command;
            throw new Error(`Unhandled command: ${JSON.stringify(exhaustiveCheck)}`);
        }
    }
}
export function getSeasonSummary(state) {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    for (const m of state.seasonHistory) {
        pointsFor += m.clubScore;
        pointsAgainst += m.opponentScore;
        if (m.outcome === 'W')
            wins += 1;
        else if (m.outcome === 'D')
            draws += 1;
        else
            losses += 1;
    }
    const isComplete = state.seasonHistory.length >= CONFIG.seasonFixtures;
    const succeeded = wins >= CONFIG.seasonWinTarget;
    return {
        wins,
        draws,
        losses,
        pointsFor,
        pointsAgainst,
        targetWins: CONFIG.seasonWinTarget,
        isComplete,
        succeeded,
    };
}
/**
 * Runs a full 6-fixture season using one of the contrasting strategies through the pure command boundary.
 */
export function runAutomatedSeason(seed, strategy) {
    let state = createInitialState(seed);
    while (state.phase !== 'season_recap') {
        const opponent = getOpponentForFixture(state.fixtureNumber);
        if (strategy === 'Rotated Patient Matchup') {
            // 1. Rotate out fatigued players, picking the 5 with highest effective value
            const ranked = [...state.roster].sort((a, b) => {
                const effA = (a.attack + a.defense + a.control * 1.25) *
                    computeEffectiveMultiplier(a.fatigue);
                const effB = (b.attack + b.defense + b.control * 1.25) *
                    computeEffectiveMultiplier(b.fatigue);
                return effB - effA;
            });
            const starters = ranked.slice(0, 5).map((p) => p.id);
            state = applyCommand(state, { type: 'SET_STARTERS', starterIds: starters });
            // 2. Spend 2 prep points: Rest any starter with fatigue >= 18, otherwise Train Control/Attack on freshest starter
            const starterPlayers = state.roster
                .filter((p) => state.selectedStarterIds.includes(p.id))
                .sort((a, b) => b.fatigue - a.fatigue);
            for (const sp of starterPlayers) {
                if (state.prepPointsRemaining <= 0)
                    break;
                if (sp.fatigue >= 18) {
                    state = applyCommand(state, {
                        type: 'SPEND_PREP_REST',
                        playerId: sp.id,
                    });
                }
            }
            const freshStarters = state.roster
                .filter((p) => state.selectedStarterIds.includes(p.id) &&
                !state.prepActionsThisFixture.some((a) => a.playerId === p.id))
                .sort((a, b) => a.fatigue - b.fatigue);
            for (const fp of freshStarters) {
                if (state.prepPointsRemaining <= 0)
                    break;
                const attr = fp.control < 10 ? 'control' : fp.attack < 10 ? 'attack' : 'defense';
                if (fp[attr] < 10) {
                    state = applyCommand(state, {
                        type: 'SPEND_PREP_TRAIN',
                        playerId: fp.id,
                        attribute: attr,
                    });
                }
            }
            // 3. Tactical plan: Match opponent vulnerability, favoring Patient/Balanced control
            const counterPlan = opponent.tendency.vulnerableTo === 'Aggressive'
                ? opponent.tendency.clubPlanModifier.Balanced >= 0.05
                    ? 'Balanced'
                    : 'Aggressive'
                : opponent.tendency.vulnerableTo;
            state = applyCommand(state, {
                type: 'SET_TACTICAL_PLAN',
                plan: counterPlan,
            });
        }
        else if (strategy === 'Star-Heavy Aggressive Push') {
            // 1. Prioritize high raw Attack+Control stars (p1, p2, p3, p4, p6), only benching if someone exceeds 55 fatigue
            const starPriority = ['p1', 'p2', 'p6', 'p4', 'p3', 'p5', 'p8', 'p7'];
            const available = starPriority
                .map((id) => state.roster.find((p) => p.id === id))
                .filter((p) => p.fatigue <= 58);
            const starters = (available.length >= 5
                ? available.slice(0, 5)
                : [...state.roster]
                    .sort((a, b) => b.attack + b.control - (a.attack + a.control))
                    .slice(0, 5)).map((p) => p.id);
            state = applyCommand(state, {
                type: 'SET_STARTERS',
                starterIds: starters,
            });
            // 2. Spend 1 Rest on the most tired star starter (if fatigue >= 24) and 1 Train (+Attack/+Control) on a star attacker
            const coreStartersByFatigue = state.roster
                .filter((p) => starters.includes(p.id))
                .sort((a, b) => b.fatigue - a.fatigue);
            const tiredest = coreStartersByFatigue[0];
            if (tiredest.fatigue >= 24 && state.prepPointsRemaining > 0) {
                state = applyCommand(state, {
                    type: 'SPEND_PREP_REST',
                    playerId: tiredest.id,
                });
            }
            const secondTired = coreStartersByFatigue[1];
            if (secondTired &&
                secondTired.fatigue >= 44 &&
                state.prepPointsRemaining > 0) {
                state = applyCommand(state, {
                    type: 'SPEND_PREP_REST',
                    playerId: secondTired.id,
                });
            }
            const trainCandidates = state.roster
                .filter((p) => starters.includes(p.id) &&
                !state.prepActionsThisFixture.some((a) => a.playerId === p.id))
                .sort((a, b) => b.attack - a.attack || a.fatigue - b.fatigue);
            for (const tc of trainCandidates) {
                if (state.prepPointsRemaining <= 0)
                    break;
                const attr = tc.attack < 10 ? 'attack' : tc.control < 10 ? 'control' : 'defense';
                if (tc[attr] < 10) {
                    state = applyCommand(state, {
                        type: 'SPEND_PREP_TRAIN',
                        playerId: tc.id,
                        attribute: attr,
                    });
                }
            }
            // 3. Tactical Plan: Aggressive blitz on fixtures 2, 5, 6 or when Aggressive modifier >= 0.06; Balanced otherwise
            const plan = opponent.tendency.clubPlanModifier.Aggressive >= 0.06
                ? 'Aggressive'
                : 'Balanced';
            state = applyCommand(state, { type: 'SET_TACTICAL_PLAN', plan });
        }
        else {
            // 'Neglectful Exhaustion': intentionally mismanages fatigue and matchups
            const tiredFive = [...state.roster]
                .sort((a, b) => b.fatigue - a.fatigue || a.defense - b.defense)
                .slice(0, 5)
                .map((p) => p.id);
            state = applyCommand(state, {
                type: 'SET_STARTERS',
                starterIds: tiredFive,
            });
            // Train already-tired starters (+8 fatigue) instead of resting
            for (const id of tiredFive.slice(0, 2)) {
                const p = state.roster.find((r) => r.id === id);
                const attr = p.stamina < 10 ? 'stamina' : 'defense';
                if (p[attr] < 10 && state.prepPointsRemaining > 0) {
                    state = applyCommand(state, {
                        type: 'SPEND_PREP_TRAIN',
                        playerId: id,
                        attribute: attr,
                    });
                }
            }
            // Pick worst plan against opponent tendency
            const worstPlan = opponent.tendency.vulnerableTo === 'Patient' ? 'Aggressive' : 'Patient';
            state = applyCommand(state, {
                type: 'SET_TACTICAL_PLAN',
                plan: worstPlan,
            });
        }
        // Commit match
        state = applyCommand(state, { type: 'COMMIT_MATCH' });
        state = applyCommand(state, { type: 'PROCEED_FROM_MATCH' });
        if (state.phase === 'development') {
            // Pick post-match +1 attribute development (zero fatigue cost)
            const targetId = strategy === 'Star-Heavy Aggressive Push'
                ? 'p1'
                : strategy === 'Rotated Patient Matchup'
                    ? 'p2'
                    : 'p7';
            const targetPlayer = state.roster.find((p) => p.id === targetId && p.control < 10) ??
                state.roster.find((p) => p.attack < 10) ??
                state.roster[0];
            const devAttr = strategy === 'Star-Heavy Aggressive Push'
                ? targetPlayer.attack < 10
                    ? 'attack'
                    : 'control'
                : targetPlayer.control < 10
                    ? 'control'
                    : 'attack';
            state = applyCommand(state, {
                type: 'APPLY_DEVELOPMENT',
                playerId: targetPlayer.id,
                attribute: devAttr,
            });
        }
    }
    const summary = getSeasonSummary(state);
    const avgFatigue = state.seasonHistory.reduce((sum, m) => sum + m.teamRatingsAtKickoff.averageFatigue, 0) / state.seasonHistory.length;
    return {
        strategy,
        seed,
        wins: summary.wins,
        draws: summary.draws,
        losses: summary.losses,
        succeeded: summary.succeeded,
        totalPointsFor: summary.pointsFor,
        totalPointsAgainst: summary.pointsAgainst,
        averageStarterFatigue: Number(avgFatigue.toFixed(2)),
        finalState: state,
    };
}
export function runSeasonStrategyHarness(seeds = CONFIG.documentedStrategySeeds) {
    return {
        rotatedPatient: seeds.map((s) => runAutomatedSeason(s, 'Rotated Patient Matchup')),
        starAggressive: seeds.map((s) => runAutomatedSeason(s, 'Star-Heavy Aggressive Push')),
    };
}
