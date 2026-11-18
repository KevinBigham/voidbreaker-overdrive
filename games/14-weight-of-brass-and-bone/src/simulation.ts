// Core Physics, Damped Spring Scale, Draggable Instruments & Nightly Progression
// for THE WEIGHT OF BRASS & BONE

import { BrassBoneAudioEngine } from './audio';
import {
  CLAIMANT_ROSTER,
  ClaimantCase,
  ENDINGS,
  EndingId,
  EndingSummary,
  NIGHT_BRIEFINGS,
  NightBriefing,
} from './story';

export const WORKBENCH_WIDTH = 1280;
export const WORKBENCH_HEIGHT = 800;

// Key Workbench Coordinates
export const SCALE_PIVOT_X = 215;
export const SCALE_PIVOT_Y = 280;
export const SCALE_BEAM_HALF = 102;
export const SCALE_PAN_DROP_Y = 108;

export const MAT_CENTER_X = 635;
export const MAT_CENTER_Y = 430;

export const SLIP_HOME_X = 760;
export const SLIP_HOME_Y = 435;

export const ARTIFACT_HOME_X = 535;
export const ARTIFACT_HOME_Y = 430;

export const LEDGER_CENTER_X = 210;
export const LEDGER_CENTER_Y = 655;

export const OSCILLOGRAPH_X = 1085;
export const OSCILLOGRAPH_Y = 295;

export const INK_PAD_X = 955;
export const INK_PAD_Y = 485;

export const SMUGGLER_DRAWER_X = 635;
export const SMUGGLER_DRAWER_Y = 762;

export type DraggableId =
  | 'artifact'
  | 'claimant_slip'
  | 'weight_10'
  | 'weight_20'
  | 'weight_50'
  | 'weight_100'
  | 'loupe'
  | 'uv_lens'
  | 'tuning_fork'
  | 'stamp_green'
  | 'stamp_red';

export type VerdictChoice = 'certify' | 'confiscate' | 'fence';

export interface DraggableObject {
  id: DraggableId;
  label: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  rotation: number;
  lift: number; // 0 resting on desk, 1 lifted in hand
  bounceY: number;
  bounceVy: number;
  radius: number;
  zIndex: number;
  grams?: number;
  onLeftPan?: boolean;
  onRightPan?: boolean;
}

export interface StampImprint {
  choice: 'certify' | 'confiscate';
  relX: number; // relative to slip center
  relY: number;
  angle: number;
}

export interface CaseAuditRecord {
  caseId: string;
  claimantName: string;
  artifactName: string;
  choice: VerdictChoice;
  wasAuthentic: boolean;
  discrepancySummary: string;
  outcomeNote: string;
  coinDelta: number;
  suspicionDelta: number;
  correctAppraisal: boolean;
}

export interface RaindropStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

export type ShiftPhase =
  | 'inspecting'
  | 'verdict_transition'
  | 'night_summary'
  | 'ending_dossier';

export interface WorkbenchState {
  seed: number;
  phase: ShiftPhase;
  night: number; // 1..5
  caseIndexInNight: number;
  globalCaseIndex: number;
  currentCase: ClaimantCase;
  nightCases: ClaimantCase[];
  nightBriefing: NightBriefing;

  // Player Economy & Faction Alignments
  sovereigns: number;
  suspicion: number; // 0..4 (4 = Inquisition arrest)
  crownCommendations: number;
  syndicateFavor: number;
  humanityScore: number;
  totalCorrectAppraisals: number;
  totalCompletedCases: number;

  // Time & Patience
  elapsedTimeSec: number;
  claimantPatienceSec: number;
  claimantMaxPatienceSec: number;
  typewriterChars: number;
  activeDialogue: string;

  // Brass Balance Scale Physics (theta, omega)
  scaleAngle: number;
  scaleOmega: number;
  scaleTargetAngle: number;
  leftPanMassGrams: number;
  rightPanMassGrams: number;

  // Acoustic Oscillograph State
  oscillographTimer: number;
  oscillographMaxTimer: number;
  oscillographAmplitude: number;
  lastAcousticLabel: string;

  // Flip-Page Reference Ledger (0: Hallmarks, 1: Weights, 2: Contraband Notice)
  ledgerPage: 0 | 1 | 2;
  ledgerFlipAnim: number; // 0..1 animation

  // Stamps & Ink Pad
  greenStampInked: boolean;
  redStampInked: boolean;
  slipImprints: StampImprint[];
  inkHintTimer: number;

  // Smuggler's Fence Drawer
  drawerOpenRatio: number; // 0 closed .. 1 open

  // Inspection Progress Flags for Current Artifact
  inspectedWeight: boolean;
  inspectedLoupe: boolean;
  inspectedAcoustic: boolean;
  inspectedUV: boolean;

  // Sensory Camera Hit-Stop & Jolt
  hitStopMs: number;
  cameraJoltX: number;
  cameraJoltY: number;
  cameraJoltVx: number;
  cameraJoltVy: number;

  // Verdict Transition Timer
  transitionTimerSec: number;
  pendingVerdict: VerdictChoice | null;

  // Draggable Physical Workbench Objects
  objects: Record<DraggableId, DraggableObject>;
  draggedId: DraggableId | null;
  dragOffsetX: number;
  dragOffsetY: number;
  pointerX: number;
  pointerY: number;
  zCounter: number;

  // Night Audit Records & Ending
  tonightRecords: CaseAuditRecord[];
  allRecords: CaseAuditRecord[];
  rentPaidTonight: boolean;
  trendingEnding: EndingId;
  finalEnding: EndingSummary | null;

  // Ambient Rain Streaks in Upper Window
  raindrops: RaindropStreak[];
}

function createInitialObjects(): Record<DraggableId, DraggableObject> {
  const make = (
    id: DraggableId,
    label: string,
    homeX: number,
    homeY: number,
    radius: number,
    zIndex: number,
    grams?: number
  ): DraggableObject => ({
    id,
    label,
    x: homeX,
    y: homeY,
    targetX: homeX,
    targetY: homeY,
    homeX,
    homeY,
    vx: 0,
    vy: 0,
    rotation: 0,
    lift: 0,
    bounceY: 0,
    bounceVy: 0,
    radius,
    zIndex,
    grams,
    onLeftPan: false,
    onRightPan: false,
  });

  return {
    artifact: make('artifact', 'Relic', ARTIFACT_HOME_X, ARTIFACT_HOME_Y, 46, 5),
    claimant_slip: make('claimant_slip', 'Appraisal Slip', SLIP_HOME_X, SLIP_HOME_Y, 78, 3),
    weight_10: make('weight_10', '10g Brass Weight', 105, 488, 22, 6, 10),
    weight_20: make('weight_20', '20g Brass Weight', 160, 488, 24, 7, 20),
    weight_50: make('weight_50', '50g Brass Weight', 222, 488, 27, 8, 50),
    weight_100: make('weight_100', '100g Brass Weight', 292, 488, 31, 9, 100),
    tuning_fork: make('tuning_fork', 'Acoustic Tuning Fork', 950, 325, 38, 10),
    stamp_green: make('stamp_green', 'CERTIFY Iron Stamp', 1085, 485, 38, 11),
    stamp_red: make('stamp_red', 'CONFISCATE Iron Stamp', 1185, 485, 38, 12),
    loupe: make('loupe', '2.5x Jeweler’s Loupe', 1055, 650, 62, 20),
    uv_lens: make('uv_lens', 'UV Aether Lens', 1185, 650, 62, 21),
  };
}

export function getCasesForNight(night: number): ClaimantCase[] {
  return CLAIMANT_ROSTER.filter((c) => c.night === night);
}

export function getScalePanPositions(scaleAngle: number): {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
} {
  const cos = Math.cos(scaleAngle);
  const sin = Math.sin(scaleAngle);
  return {
    leftX: SCALE_PIVOT_X - cos * SCALE_BEAM_HALF,
    leftY: SCALE_PIVOT_Y - sin * SCALE_BEAM_HALF + SCALE_PAN_DROP_Y,
    rightX: SCALE_PIVOT_X + cos * SCALE_BEAM_HALF,
    rightY: SCALE_PIVOT_Y + sin * SCALE_BEAM_HALF + SCALE_PAN_DROP_Y,
  };
}

export function createInitialState(seed = 18911108): WorkbenchState {
  const raindrops: RaindropStreak[] = [];
  let s = seed >>> 0;
  const nextRand = (): number => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  for (let i = 0; i < 48; i++) {
    raindrops.push({
      x: nextRand() * WORKBENCH_WIDTH,
      y: nextRand() * 210,
      length: 14 + nextRand() * 22,
      speed: 190 + nextRand() * 140,
      alpha: 0.16 + nextRand() * 0.28,
    });
  }

  const night1Cases = getCasesForNight(1);
  const firstCase = night1Cases[0];
  const objects = createInitialObjects();

  // Slide artifact and slip down from the pass-through window slot onto the mat
  objects.artifact.y = 195;
  objects.claimant_slip.y = 195;

  return {
    seed,
    phase: 'inspecting',
    night: 1,
    caseIndexInNight: 0,
    globalCaseIndex: 0,
    currentCase: firstCase,
    nightCases: night1Cases,
    nightBriefing: NIGHT_BRIEFINGS[0],

    sovereigns: 25,
    suspicion: 0,
    crownCommendations: 0,
    syndicateFavor: 0,
    humanityScore: 0,
    totalCorrectAppraisals: 0,
    totalCompletedCases: 0,

    elapsedTimeSec: 0,
    claimantPatienceSec: 75,
    claimantMaxPatienceSec: 75,
    typewriterChars: 0,
    activeDialogue: firstCase.openingLine,

    scaleAngle: 0,
    scaleOmega: 0,
    scaleTargetAngle: 0,
    leftPanMassGrams: 0,
    rightPanMassGrams: 0,

    oscillographTimer: 0,
    oscillographMaxTimer: 3.6,
    oscillographAmplitude: 0,
    lastAcousticLabel: 'READY — TAP ARTIFACT WITH FORK',

    ledgerPage: 0,
    ledgerFlipAnim: 0,

    greenStampInked: false,
    redStampInked: false,
    slipImprints: [],
    inkHintTimer: 0,

    drawerOpenRatio: 0,

    inspectedWeight: false,
    inspectedLoupe: false,
    inspectedAcoustic: false,
    inspectedUV: false,

    hitStopMs: 0,
    cameraJoltX: 0,
    cameraJoltY: 0,
    cameraJoltVx: 0,
    cameraJoltVy: 0,

    transitionTimerSec: 0,
    pendingVerdict: null,

    objects,
    draggedId: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    pointerX: MAT_CENTER_X,
    pointerY: MAT_CENTER_Y,
    zCounter: 30,

    tonightRecords: [],
    allRecords: [],
    rentPaidTonight: false,
    trendingEnding: 'royal_arch_appraiser',
    finalEnding: null,

    raindrops,
  };
}

export function computeTrendingEnding(state: WorkbenchState): EndingId {
  if (state.suspicion >= 4 || state.sovereigns < 0) {
    return 'blackwater_gallows';
  }
  if (state.syndicateFavor >= 3 && state.syndicateFavor >= state.crownCommendations) {
    return 'shadow_baron_syndicate';
  }
  if (state.humanityScore >= 2 && state.humanityScore >= state.syndicateFavor) {
    return 'underground_lantern';
  }
  return 'royal_arch_appraiser';
}

export function flipLedgerPage(
  state: WorkbenchState,
  targetPage: 0 | 1 | 2,
  audio?: BrassBoneAudioEngine
): void {
  if (state.ledgerPage === targetPage) return;
  state.ledgerPage = targetPage;
  state.ledgerFlipAnim = 1.0;
  audio?.playParchmentSlide();
}

export function strikeArtifactWithTuningFork(
  state: WorkbenchState,
  audio?: BrassBoneAudioEngine
): void {
  state.inspectedAcoustic = true;
  state.oscillographTimer = state.oscillographMaxTimer;
  state.oscillographAmplitude = 1.0;
  state.lastAcousticLabel = state.currentCase.acousticLabel;
  audio?.playTuningForkStrike(state.currentCase.acousticSignature);
}

// Execute a Verdict: 'certify' (Green Stamp), 'confiscate' (Red Stamp), or 'fence' (Smuggler's Drawer)
export function commitVerdict(
  state: WorkbenchState,
  choice: VerdictChoice,
  imprintRelX = 0,
  imprintRelY = 68,
  audio?: BrassBoneAudioEngine
): void {
  if (state.phase !== 'inspecting') return;

  const c = state.currentCase;
  state.pendingVerdict = choice;
  state.phase = 'verdict_transition';
  state.transitionTimerSec = 1.05;

  if (choice === 'certify' || choice === 'confiscate') {
    state.slipImprints.push({
      choice,
      relX: Math.max(-65, Math.min(65, imprintRelX)),
      relY: Math.max(-85, Math.min(85, imprintRelY)),
      angle: (Math.random() - 0.5) * 0.14,
    });
    // 45ms hit-stop + directional camera jolt + heavy stamp slam sound
    state.hitStopMs = 45;
    state.cameraJoltY = 9.5;
    state.cameraJoltX = choice === 'certify' ? -3.5 : 3.5;
    audio?.playStampSlam(choice === 'certify');
  } else {
    // Smuggler's Drawer Fence
    state.hitStopMs = 35;
    state.cameraJoltY = 6;
    audio?.playDrawerFence();
  }

  let coinDelta = 0;
  let suspicionDelta = 0;
  let correctAppraisal = false;
  let outcomeNote = '';

  if (choice === 'fence') {
    state.activeDialogue = c.reactionFence;
    coinDelta = c.fenceValueSovereigns;
    suspicionDelta = c.isAuditorSting ? 2 : 1;
    state.syndicateFavor += c.isGrandMatrix ? 3 : 1;
    correctAppraisal = !c.isAuthentic && !c.isAuditorSting;
    outcomeNote = c.isAuditorSting
      ? 'AUDITOR TRAP SPRUNG! Fenced an Inquisition test piece (+2 Suspicion).'
      : `Fenced via Smuggler’s Drawer (+${coinDelta}g, +1 Suspicion).`;
  } else if (choice === 'certify') {
    state.activeDialogue = c.reactionCertify;
    if (c.isAuthentic) {
      correctAppraisal = true;
      coinDelta = c.baseFeeSovereigns;
      state.crownCommendations += 1;
      outcomeNote = `Certified authentic relic (+${coinDelta}g fee).`;
    } else if (c.isRefugeeBribe) {
      correctAppraisal = true; // Moral mercy path
      coinDelta = c.baseFeeSovereigns + (c.bribeBonusSovereigns ?? 15);
      state.humanityScore += 2;
      suspicionDelta = 1;
      outcomeNote = `Mercy shown to Refugee Mother (+${coinDelta}g, +Humanity, +1 Suspicion).`;
    } else if (c.isResistanceCipher) {
      correctAppraisal = true; // Resistance path
      coinDelta = c.baseFeeSovereigns + 6;
      state.humanityScore += 2;
      suspicionDelta = 1;
      outcomeNote = `Certified Free Harbor Cipher (+${coinDelta}g, +Humanity, +1 Suspicion).`;
    } else if (c.isGrandMatrix) {
      correctAppraisal = true;
      coinDelta = c.baseFeeSovereigns + 15;
      state.humanityScore += 3;
      outcomeNote = `Certified Imperial Matrix for the Free Harbor (+${coinDelta}g).`;
    } else if (c.isAuditorSting) {
      correctAppraisal = false;
      coinDelta = -8;
      suspicionDelta = 2;
      outcomeNote = `FAILED AUDITOR STING! Certified lead test chalice (-8g fine, +2 Suspicion).`;
    } else {
      correctAppraisal = false;
      coinDelta = -6;
      suspicionDelta = 1;
      outcomeNote = `MISSED FORGERY! Certified counterfeit relic (-6g fine, +1 Suspicion).`;
    }
  } else {
    // choice === 'confiscate'
    state.activeDialogue = c.reactionSeize;
    if (!c.isAuthentic) {
      correctAppraisal = true;
      const bonus = c.isAuditorSting ? 10 : c.isGrandMatrix ? 20 : 4;
      coinDelta = c.baseFeeSovereigns + bonus;
      state.crownCommendations += c.isGrandMatrix ? 3 : 1;
      if (c.isAuditorSting && state.suspicion > 0) {
        suspicionDelta = -1;
      }
      outcomeNote = c.isAuditorSting
        ? `PASSED AUDITOR STING! Commendation awarded (+${coinDelta}g, -1 Suspicion).`
        : `Seized counterfeit/contraband for Crown (+${coinDelta}g bounty).`;
    } else {
      correctAppraisal = false;
      coinDelta = -6;
      suspicionDelta = 1;
      outcomeNote = `FALSE SEIZURE! Confiscated genuine relic (-6g penalty, +1 Suspicion).`;
    }
  }

  state.sovereigns += coinDelta;
  state.suspicion = Math.max(0, Math.min(5, state.suspicion + suspicionDelta));
  state.totalCompletedCases += 1;
  if (correctAppraisal) {
    state.totalCorrectAppraisals += 1;
  }

  const record: CaseAuditRecord = {
    caseId: c.id,
    claimantName: c.claimantName,
    artifactName: c.artifactName,
    choice,
    wasAuthentic: c.isAuthentic,
    discrepancySummary: c.discrepancySummary,
    outcomeNote,
    coinDelta,
    suspicionDelta,
    correctAppraisal,
  };

  state.tonightRecords.push(record);
  state.allRecords.push(record);
  state.typewriterChars = 0;
  state.trendingEnding = computeTrendingEnding(state);
}

function resetWorkbenchForCase(state: WorkbenchState, nextCase: ClaimantCase): void {
  state.currentCase = nextCase;
  state.activeDialogue = nextCase.openingLine;
  state.typewriterChars = 0;
  state.claimantPatienceSec = 75;
  state.claimantMaxPatienceSec = 75;
  state.pendingVerdict = null;
  state.slipImprints = [];
  state.greenStampInked = false;
  state.redStampInked = false;
  state.inspectedWeight = false;
  state.inspectedLoupe = false;
  state.inspectedAcoustic = false;
  state.inspectedUV = false;
  state.oscillographTimer = 0;
  state.oscillographAmplitude = 0;
  state.lastAcousticLabel = 'READY — TAP ARTIFACT WITH FORK';
  state.draggedId = null;

  // Return artifact & slip from pass-through slot onto velvet mat
  const art = state.objects.artifact;
  art.onLeftPan = false;
  art.onRightPan = false;
  art.x = ARTIFACT_HOME_X;
  art.y = 195;
  art.targetX = ARTIFACT_HOME_X;
  art.targetY = ARTIFACT_HOME_Y;
  art.vx = 0;
  art.vy = 0;
  art.lift = 0;

  const slip = state.objects.claimant_slip;
  slip.x = SLIP_HOME_X;
  slip.y = 195;
  slip.targetX = SLIP_HOME_X;
  slip.targetY = SLIP_HOME_Y;
  slip.vx = 0;
  slip.vy = 0;
  slip.lift = 0;

  // Return stamps and tuning fork to their cradles
  for (const id of ['stamp_green', 'stamp_red', 'tuning_fork'] as DraggableId[]) {
    const obj = state.objects[id];
    obj.targetX = obj.homeX;
    obj.targetY = obj.homeY;
    obj.lift = 0;
  }
}

export function advanceAfterVerdict(
  state: WorkbenchState,
  audio?: BrassBoneAudioEngine
): void {
  // Check immediate arrest if suspicion reached 4+
  if (state.suspicion >= 4) {
    state.trendingEnding = 'blackwater_gallows';
    state.finalEnding = ENDINGS.blackwater_gallows;
    state.phase = 'ending_dossier';
    audio?.playParchmentSlide();
    return;
  }

  if (state.caseIndexInNight + 1 < state.nightCases.length) {
    state.caseIndexInNight += 1;
    state.globalCaseIndex += 1;
    resetWorkbenchForCase(state, state.nightCases[state.caseIndexInNight]);
    state.phase = 'inspecting';
    audio?.playParchmentSlide();
  } else {
    // End of Night -> Slide Post-Night Balance Sheet onto the desk!
    if (!state.rentPaidTonight) {
      state.sovereigns -= state.nightBriefing.rentAndOilCost;
      state.rentPaidTonight = true;
    }
    state.trendingEnding = computeTrendingEnding(state);
    state.phase = 'night_summary';
    audio?.playParchmentSlide();
  }
}

export function startNextNightOrFinish(
  state: WorkbenchState,
  audio?: BrassBoneAudioEngine
): void {
  if (state.phase === 'ending_dossier') {
    const fresh = createInitialState(state.seed + 1);
    Object.assign(state, fresh);
    return;
  }

  if (state.phase !== 'night_summary') return;

  // Check bankruptcy or completed Night 5
  if (state.sovereigns < 0 || state.suspicion >= 4) {
    state.trendingEnding = 'blackwater_gallows';
    state.finalEnding = ENDINGS.blackwater_gallows;
    state.phase = 'ending_dossier';
    audio?.playStampSlam(false);
    return;
  }

  if (state.night >= 5) {
    const finalId = computeTrendingEnding(state);
    state.trendingEnding = finalId;
    state.finalEnding = ENDINGS[finalId];
    state.phase = 'ending_dossier';
    audio?.playStampSlam(true);
    return;
  }

  // Advance to Next Night
  state.night += 1;
  state.nightBriefing = NIGHT_BRIEFINGS[state.night - 1];
  state.nightCases = getCasesForNight(state.night);
  state.caseIndexInNight = 0;
  state.globalCaseIndex += 1;
  state.tonightRecords = [];
  state.rentPaidTonight = false;

  // Return counterweights and lenses to home cradles at start of new night
  for (const obj of Object.values(state.objects)) {
    obj.onLeftPan = false;
    obj.onRightPan = false;
    obj.targetX = obj.homeX;
    obj.targetY = obj.homeY;
    obj.lift = 0;
  }

  resetWorkbenchForCase(state, state.nightCases[0]);
  state.phase = 'inspecting';
  audio?.playParchmentSlide();
}

export function stepSimulation(
  state: WorkbenchState,
  dtMs: number,
  audio?: BrassBoneAudioEngine
): void {
  if (state.hitStopMs > 0) {
    state.hitStopMs = Math.max(0, state.hitStopMs - dtMs);
    return;
  }

  const dt = Math.min(0.05, Math.max(0.001, dtMs / 1000));
  state.elapsedTimeSec += dt;

  // Camera jolt spring decay
  const joltK = 180;
  const joltC = 18;
  const ax = -joltK * state.cameraJoltX - joltC * state.cameraJoltVx;
  const ay = -joltK * state.cameraJoltY - joltC * state.cameraJoltVy;
  state.cameraJoltVx += ax * dt;
  state.cameraJoltVy += ay * dt;
  state.cameraJoltX += state.cameraJoltVx * dt;
  state.cameraJoltY += state.cameraJoltVy * dt;

  // Animate rain streaks in upper window
  for (const drop of state.raindrops) {
    drop.y += drop.speed * dt;
    drop.x -= drop.speed * 0.18 * dt;
    if (drop.y > 215) {
      drop.y = -15;
      drop.x = ((drop.x + WORKBENCH_WIDTH * 1.37) % WORKBENCH_WIDTH);
    }
  }

  // Typewriter dialogue progression
  if (state.typewriterChars < state.activeDialogue.length) {
    state.typewriterChars = Math.min(
      state.activeDialogue.length,
      state.typewriterChars + dt * 48
    );
  }

  // Ledger flip animation decay
  if (state.ledgerFlipAnim > 0) {
    state.ledgerFlipAnim = Math.max(0, state.ledgerFlipAnim - dt * 4.2);
  }

  if (state.inkHintTimer > 0) {
    state.inkHintTimer = Math.max(0, state.inkHintTimer - dt);
  }

  // Oscillograph needle decay
  if (state.oscillographTimer > 0) {
    state.oscillographTimer = Math.max(0, state.oscillographTimer - dt);
    state.oscillographAmplitude = Math.min(1, state.oscillographTimer / 1.2);
  } else {
    state.oscillographAmplitude = 0;
  }

  // Verdict transition countdown
  if (state.phase === 'verdict_transition') {
    state.transitionTimerSec -= dt;
    if (state.transitionTimerSec <= 0) {
      advanceAfterVerdict(state, audio);
    }
  }

  // Claimant patience & ambient rain/tick
  if (state.phase === 'inspecting') {
    state.claimantPatienceSec = Math.max(0, state.claimantPatienceSec - dt);
    const patienceRatio = state.claimantPatienceSec / state.claimantMaxPatienceSec;
    audio?.stepAmbient(dt, patienceRatio);

    if (state.claimantPatienceSec <= 0) {
      // Claimant storms off if ignored for full 75s
      commitVerdict(
        state,
        state.currentCase.isAuthentic ? 'confiscate' : 'certify',
        0,
        68,
        audio
      );
    }
  }

  // Compute total mass on Left Pan & Right Pan of the Brass Scale
  let leftMass = 0;
  for (const id of ['weight_10', 'weight_20', 'weight_50', 'weight_100'] as DraggableId[]) {
    const w = state.objects[id];
    if (w.onLeftPan && state.draggedId !== id) {
      leftMass += w.grams ?? 0;
    }
  }
  const art = state.objects.artifact;
  const rightMass =
    art.onRightPan && state.draggedId !== 'artifact'
      ? state.currentCase.actualWeightGrams
      : 0;

  state.leftPanMassGrams = leftMass;
  state.rightPanMassGrams = rightMass;
  if (rightMass > 0 && leftMass > 0) {
    state.inspectedWeight = true;
  }

  // Damped Spring Oscillator for Brass Balance Scale:
  // theta_ddot = -k * (theta - theta_target) - c * theta_dot
  const massDiff = rightMass - leftMass;
  state.scaleTargetAngle = Math.max(-0.42, Math.min(0.42, massDiff / 85));
  const scaleK = 36;
  const scaleC = 4.0;
  const angularAccel =
    -scaleK * (state.scaleAngle - state.scaleTargetAngle) - scaleC * state.scaleOmega;
  state.scaleOmega += angularAccel * dt;
  state.scaleAngle += state.scaleOmega * dt;

  if (Math.abs(state.scaleOmega) > 0.22) {
    audio?.playScaleCreak(state.scaleOmega);
  }

  const pans = getScalePanPositions(state.scaleAngle);

  // Lock weights on Left Pan to pan position
  const panWeights: DraggableObject[] = [];
  for (const id of ['weight_10', 'weight_20', 'weight_50', 'weight_100'] as DraggableId[]) {
    const w = state.objects[id];
    if (w.onLeftPan && state.draggedId !== id) {
      panWeights.push(w);
    }
  }
  panWeights.forEach((w, idx) => {
    const offset = (idx - (panWeights.length - 1) / 2) * 24;
    w.targetX = pans.leftX + offset;
    w.targetY = pans.leftY - 12;
  });

  // Lock artifact on Right Pan to pan position
  if (art.onRightPan && state.draggedId !== 'artifact') {
    art.targetX = pans.rightX;
    art.targetY = pans.rightY - 16;
  }

  // Smuggler's Drawer slides open when dragging the artifact toward the bottom edge
  const wantDrawerOpen =
    state.draggedId === 'artifact' && state.objects.artifact.y > 575 ? 1 : 0;
  state.drawerOpenRatio += (wantDrawerOpen - state.drawerOpenRatio) * Math.min(1, dt * 10);

  // Update spring physics for all draggable objects on the workbench
  const springK = 260;
  const springDamp = 22;

  for (const obj of Object.values(state.objects)) {
    const isDragged = state.draggedId === obj.id;
    const targetLift = isDragged ? 1 : 0;
    obj.lift += (targetLift - obj.lift) * Math.min(1, dt * 14);

    // Micro-bounce vertical settle after release
    if (!isDragged && (Math.abs(obj.bounceY) > 0.05 || Math.abs(obj.bounceVy) > 0.05)) {
      const bAccel = -320 * obj.bounceY - 18 * obj.bounceVy;
      obj.bounceVy += bAccel * dt;
      obj.bounceY += obj.bounceVy * dt;
    } else if (isDragged) {
      obj.bounceY = 0;
      obj.bounceVy = 0;
    }

    const axObj = -springK * (obj.x - obj.targetX) - springDamp * obj.vx;
    const ayObj = -springK * (obj.y - obj.targetY) - springDamp * obj.vy;
    obj.vx += axObj * dt;
    obj.vy += ayObj * dt;
    obj.x += obj.vx * dt;
    obj.y += obj.vy * dt;

    // Velocity-based tilt per mandatory craft spec:
    // rotation = clamp(vx * 0.015, -0.25, 0.25)
    const desiredRot = isDragged
      ? Math.max(-0.25, Math.min(0.25, obj.vx * 0.015))
      : 0;
    obj.rotation += (desiredRot - obj.rotation) * Math.min(1, dt * 15);
  }

  // Check continuous proximity interactions while dragging tools
  const slip = state.objects.claimant_slip;
  const loupe = state.objects.loupe;
  const uv = state.objects.uv_lens;
  const fork = state.objects.tuning_fork;

  if (
    Math.hypot(loupe.x - art.x, loupe.y - art.y) < 95 ||
    Math.hypot(loupe.x - slip.x, loupe.y - slip.y) < 95
  ) {
    state.inspectedLoupe = true;
  }

  if (
    Math.hypot(uv.x - art.x, uv.y - art.y) < 95 ||
    Math.hypot(uv.x - slip.x, uv.y - slip.y) < 95
  ) {
    state.inspectedUV = true;
  }

  // If dragging Tuning Fork and it touches the Artifact, strike it!
  if (
    state.draggedId === 'tuning_fork' &&
    Math.hypot(fork.x - art.x, fork.y - art.y) < 72 &&
    state.oscillographTimer < state.oscillographMaxTimer - 0.45
  ) {
    strikeArtifactWithTuningFork(state, audio);
  }

  // If dragging Green or Red Stamp over the Ink Pad, charge with ink!
  if (state.draggedId === 'stamp_green') {
    const sg = state.objects.stamp_green;
    if (Math.hypot(sg.x - INK_PAD_X, sg.y - INK_PAD_Y) < 78 && !state.greenStampInked) {
      state.greenStampInked = true;
      audio?.playInkPadSquelch();
    }
  }
  if (state.draggedId === 'stamp_red') {
    const sr = state.objects.stamp_red;
    if (Math.hypot(sr.x - INK_PAD_X, sr.y - INK_PAD_Y) < 78 && !state.redStampInked) {
      state.redStampInked = true;
      audio?.playInkPadSquelch();
    }
  }
}

export function pointerDownWorkbench(
  state: WorkbenchState,
  wx: number,
  wy: number,
  audio?: BrassBoneAudioEngine
): void {
  state.pointerX = wx;
  state.pointerY = wy;

  // 1. Brass Mute Bell Pull on upper-right clock casing (x: 1185..1245, y: 28..145)
  if (wx >= 1170 && wx <= 1258 && wy >= 24 && wy <= 145) {
    if (audio) {
      audio.setMuted(!audio.muted);
      audio.playWeightClink(10);
    }
    return;
  }

  // 2. If Post-Night Balance Sheet or Final Ending Dossier is on the desk, clicking the Wax Seal / Stamp box advances!
  if (state.phase === 'night_summary' || state.phase === 'ending_dossier') {
    if (wx >= 340 && wx <= 940 && wy >= 140 && wy <= 720) {
      startNextNightOrFinish(state, audio);
    }
    return;
  }

  if (state.phase !== 'inspecting') return;

  // 3. Check Flip-Page Reference Ledger clicks (Bottom-Left: x: 45..375, y: 545..765)
  if (wx >= 45 && wx <= 375 && wy >= 545 && wy <= 765) {
    // Check bottom index tabs first
    if (wy >= 725) {
      if (wx < 155) {
        flipLedgerPage(state, 0, audio);
      } else if (wx < 265) {
        flipLedgerPage(state, 1, audio);
      } else {
        flipLedgerPage(state, 2, audio);
      }
      return;
    }
    // Left half flips back, right half flips forward
    if (wx < LEDGER_CENTER_X) {
      const prev = ((state.ledgerPage + 2) % 3) as 0 | 1 | 2;
      flipLedgerPage(state, prev, audio);
    } else {
      const next = ((state.ledgerPage + 1) % 3) as 0 | 1 | 2;
      flipLedgerPage(state, next, audio);
    }
    return;
  }

  // 4. Pick up top-most draggable object under cursor
  const candidates = Object.values(state.objects)
    .filter((obj) => Math.hypot(wx - obj.x, wy - obj.y) <= obj.radius * 1.15)
    .sort((a, b) => b.zIndex - a.zIndex);

  if (candidates.length > 0) {
    const picked = candidates[0];
    state.draggedId = picked.id;
    state.dragOffsetX = picked.x - wx;
    state.dragOffsetY = picked.y - wy;
    state.zCounter += 1;
    // Keep Loupe & UV Lens at highest z-layer so their magnification always renders on top
    picked.zIndex =
      picked.id === 'loupe' || picked.id === 'uv_lens'
        ? 1000 + state.zCounter
        : state.zCounter;

    if (picked.grams) {
      picked.onLeftPan = false;
      audio?.playWeightClink(picked.grams);
    } else if (picked.id === 'artifact') {
      picked.onRightPan = false;
      audio?.playParchmentSlide();
    } else if (picked.id === 'claimant_slip') {
      audio?.playParchmentSlide();
    } else if (picked.id === 'stamp_green' || picked.id === 'stamp_red') {
      audio?.playWeightClink(80);
    } else {
      audio?.playWeightClink(30);
    }
  }
}

export function pointerMoveWorkbench(
  state: WorkbenchState,
  wx: number,
  wy: number
): void {
  state.pointerX = wx;
  state.pointerY = wy;

  if (!state.draggedId) return;
  const obj = state.objects[state.draggedId];
  obj.targetX = Math.max(40, Math.min(WORKBENCH_WIDTH - 40, wx + state.dragOffsetX));
  obj.targetY = Math.max(60, Math.min(WORKBENCH_HEIGHT - 25, wy + state.dragOffsetY));
}

export function pointerUpWorkbench(
  state: WorkbenchState,
  audio?: BrassBoneAudioEngine
): void {
  if (!state.draggedId) return;
  const id = state.draggedId;
  const obj = state.objects[id];
  state.draggedId = null;

  // Trigger micro-bounce on release
  obj.bounceY = -9;
  obj.bounceVy = 45;

  const pans = getScalePanPositions(state.scaleAngle);
  const art = state.objects.artifact;
  const slip = state.objects.claimant_slip;

  // 1. Counterweight drop logic
  if (obj.grams) {
    const distToLeftPan = Math.hypot(obj.x - pans.leftX, obj.y - pans.leftY);
    const distToScaleLeft = Math.hypot(obj.x - (SCALE_PIVOT_X - 95), obj.y - 365);
    if (distToLeftPan < 92 || distToScaleLeft < 95) {
      obj.onLeftPan = true;
      audio?.playWeightClink(obj.grams);
    } else {
      obj.onLeftPan = false;
      obj.targetX = obj.homeX;
      obj.targetY = obj.homeY;
      audio?.playWeightClink(obj.grams);
    }
    return;
  }

  // 2. Artifact drop logic (Right Scale Pan, Smuggler's Drawer, or Velvet Mat)
  if (id === 'artifact') {
    const distToRightPan = Math.hypot(obj.x - pans.rightX, obj.y - pans.rightY);
    const distToScaleRight = Math.hypot(obj.x - (SCALE_PIVOT_X + 95), obj.y - 365);

    // Check Smuggler's Fence Drawer at bottom edge of desk
    if (obj.y > 655 && Math.abs(obj.x - SMUGGLER_DRAWER_X) < 195) {
      commitVerdict(state, 'fence', 0, 0, audio);
      return;
    }

    if (distToRightPan < 96 || distToScaleRight < 96) {
      obj.onRightPan = true;
      audio?.playWeightClink(state.currentCase.actualWeightGrams);
    } else {
      obj.onRightPan = false;
      // Keep on velvet mat where dropped, clamped nicely
      obj.targetX = Math.max(430, Math.min(840, obj.x));
      obj.targetY = Math.max(265, Math.min(595, obj.y));
      audio?.playParchmentSlide();
    }
    return;
  }

  // 3. Tuning Fork drop logic
  if (id === 'tuning_fork') {
    if (Math.hypot(obj.x - art.x, obj.y - art.y) < 95) {
      strikeArtifactWithTuningFork(state, audio);
    }
    obj.targetX = obj.homeX;
    obj.targetY = obj.homeY;
    return;
  }

  // 4. Heavy Iron Stamps drop logic (Ink Pad or Claimant's Slip!)
  if (id === 'stamp_green' || id === 'stamp_red') {
    const isGreen = id === 'stamp_green';
    const distToInk = Math.hypot(obj.x - INK_PAD_X, obj.y - INK_PAD_Y);
    if (distToInk < 85) {
      if (isGreen) state.greenStampInked = true;
      else state.redStampInked = true;
      audio?.playInkPadSquelch();
      obj.targetX = obj.homeX;
      obj.targetY = obj.homeY;
      return;
    }

    const dxSlip = obj.x - slip.x;
    const dySlip = obj.y - slip.y;
    if (Math.abs(dxSlip) < 115 && Math.abs(dySlip) < 135) {
      // If not inked yet, ink automatically if player dipped near pad or show brief ink squelch + stamp
      if (isGreen && !state.greenStampInked) {
        state.greenStampInked = true;
      }
      if (!isGreen && !state.redStampInked) {
        state.redStampInked = true;
      }
      commitVerdict(state, isGreen ? 'certify' : 'confiscate', dxSlip, dySlip, audio);
    }

    obj.targetX = obj.homeX;
    obj.targetY = obj.homeY;
    return;
  }

  // 5. Loupe & UV Lens: can stay resting over the mat/artifact/slip for hands-free inspection,
  // or snap back to their velvet cradle if dropped on the right tool rack
  if (id === 'loupe' || id === 'uv_lens') {
    if (obj.x > 960 && obj.y > 540) {
      obj.targetX = obj.homeX;
      obj.targetY = obj.homeY;
    } else {
      obj.targetX = obj.x;
      obj.targetY = obj.y;
    }
    audio?.playWeightClink(25);
    return;
  }

  // 6. Claimant Slip stays where arranged on the mat
  if (id === 'claimant_slip') {
    obj.targetX = Math.max(450, Math.min(860, obj.x));
    obj.targetY = Math.max(290, Math.min(585, obj.y));
    audio?.playParchmentSlide();
  }
}
