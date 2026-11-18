export type ArtifactCategory =
  | 'sovereign_coin'
  | 'bullion_ingot'
  | 'brass_compass'
  | 'sanctified_reliquary'
  | 'cameo_locket'
  | 'transit_charter';

export type ResonanceSignature =
  | 'pure_gold'      // 880Hz + 1320Hz harmonic ring (Clean Gold)
  | 'hollow_lead'    // 95Hz dead flat thud (Forged lead core)
  | 'brass_hum'      // 440Hz warm harmonic hum (Clean Brass)
  | 'ticking_bomb'   // Rapid 6Hz mechanical escapement + spring whine (Contraband Bomb)
  | 'silver_chime'   // 1175Hz bright crystalline chime (Clean Silver/Reliquary)
  | 'whisper_curse'  // Dissonant warbling whisper (Counterfeit / Occult seal)
  | 'crisp_parchment'; // Dry parchment rustle (Document)

export type HallmarkStyle =
  | 'crown_5_valid'     // Authentic 5-spired Royal Crown
  | 'crown_5_reversed'  // Forged backwards/inverted Crown with file scratches
  | 'crown_3_crude'     // Forged 3-spired crude stamp
  | 'admiralty_anchor'  // Authentic Admiralty Anchor & Star
  | 'admiralty_forged'  // Misaligned Anchor with missing fouled rope
  | 'inquisitor_seal'   // Authentic High Seal of the Crown
  | 'hand_drawn_seal';  // Desperate hand-drawn ink seal

export type UvSignature =
  | 'none'              // Clean under UV Aether light
  | 'syndicate_spider'  // Glowing violet Syndicate Spider-Rune & cipher
  | 'plague_veins'      // Pulsing crimson-violet Plague Blood-Veins
  | 'auditor_watermark' // Hidden Crown Auditor entrapment watermark
  | 'royal_aether_thread'; // Authentic security aether thread

export type DecisionType = 'certify' | 'seize' | 'fence';

export interface ArtifactSpec {
  id: string;
  name: string;
  subtitle: string;
  category: ArtifactCategory;
  claimedWeightG: number;
  actualWeightG: number;
  expectedHallmark: HallmarkStyle;
  actualHallmark: HallmarkStyle;
  expectedResonance: ResonanceSignature;
  actualResonance: ResonanceSignature;
  uvSignature: UvSignature;
  microDetailText: string;
  uvDetailText: string;
  serialNumber: string;
  basePayout: number;
  fencePayout: number;
  isGenuine: boolean;
  discrepancySummary: string; // Shown on Post-Night Ledger
  isMoralDilemma?: boolean;
  isAuditorTrap?: boolean;
  isSyndicateRequest?: boolean;
}

export interface ClaimantCase {
  id: string;
  night: number;
  claimantName: string;
  claimantRole: string;
  silhouetteType: 'worker' | 'cutpurse' | 'aristocrat' | 'sailor' | 'mother' | 'inquisitor' | 'apothecary' | 'syndicate';
  dialogue: string;
  patienceSeconds: number;
  artifact: ArtifactSpec;
  specialOutcomeNotes?: {
    onCertify?: string;
    onSeize?: string;
    onFence?: string;
  };
}

export type DeskObjectId =
  | 'artifact'
  | 'assay_slip'
  | 'weight_10'
  | 'weight_20'
  | 'weight_50'
  | 'weight_100'
  | 'loupe'
  | 'uv_lens'
  | 'tuning_fork'
  | 'stamp_certify'
  | 'stamp_seize';

export interface DeskPhysicalObject {
  id: DeskObjectId;
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
  lift: number;        // 0 on desk, 1 lifted in hand
  targetLift: number;
  bounceScale: number; // micro-bounce on drop
  bounceVel: number;
  radius: number;
  width: number;
  height: number;
  weightGrams?: number;
  onLeftPan?: boolean;
  onRightPan?: boolean;
  inkState?: 'dry' | 'green' | 'red';
  inkAmount?: number; // 0..1
}

export interface StampMark {
  type: 'certify' | 'seize';
  offsetX: number;
  offsetY: number;
  rotation: number;
  alpha: number;
}

export interface NightCaseRecord {
  claimantName: string;
  artifactName: string;
  decision: DecisionType;
  wasGenuine: boolean;
  caughtDiscrepancy: boolean;
  discrepancyText: string;
  coinsDelta: number;
  suspicionDelta: number;
  moralNote?: string;
}

export type EndingId =
  | 'crown_assessor'
  | 'syndicate_kingpin'
  | 'guardian_of_exiles'
  | 'newgate_prison';

export interface WorkbenchState {
  night: number; // 1..5
  caseIndexInNight: number;
  phase: 'inspecting' | 'stamping_exit' | 'night_summary' | 'campaign_ending';
  activeCase: ClaimantCase;
  timeElapsed: number;
  claimantTimer: number;
  typewriterChars: number;
  stickyNoteDismissed: boolean;

  // Player resources & narrative alignment
  sovereigns: number;
  suspicion: number; // 0..5 (5 = arrested)
  mercyPoints: number;
  syndicatePoints: number;
  crownLoyalty: number;

  // Scale damped spring oscillator state
  scaleAngle: number;       // theta in radians (-0.38 to +0.38)
  scaleAngularVel: number;  // d(theta)/dt
  leftPanGrams: number;
  rightPanGrams: number;

  // Acoustic Oscillograph state
  oscillographActive: number; // decays from 1 to 0
  oscillographPhase: number;
  lastTestedResonance: ResonanceSignature | null;
  lastTestedArtifactName: string;

  // Reference Ledger state
  ledgerPage: 0 | 1 | 2; // 0: Hallmarks, 1: Weights & Acoustics, 2: Contraband & Notices
  ledgerFlipAnim: number; // 0..1 animation

  // Smuggler's Drawer state
  drawerOpenAmount: number; // 0..1

  // Camera shake & hitstop
  hitStopTimer: number;
  cameraShakeX: number;
  cameraShakeY: number;
  cameraShakeVX: number;
  cameraShakeVY: number;

  // Current slip stamp marks
  stampMarks: StampMark[];
  pendingDecision: DecisionType | null;
  transitionTimer: number;

  // Night records for the Honest Post-Night Ledger
  nightRecords: NightCaseRecord[];
  allRecords: NightCaseRecord[];
  lastNightRentCost: number;
  lastNightOilCost: number;
  trendingEnding: EndingId;
}
