// 5-Night Escalating Narrative, Artifacts, Hallmarks & Endings for THE WEIGHT OF BRASS & BONE

import type { AcousticSignature } from './audio';

export type ArtifactVisualType =
  | 'sovereign_coin'
  | 'bullion_ingot'
  | 'silver_chalice'
  | 'pocket_chronometer'
  | 'harbor_passport'
  | 'reliquary_bone'
  | 'crown_matrix';

export type HallmarkStyle =
  | 'crown_upright' // Valid Royal Mint
  | 'crown_inverted' // Forged Backwards/Inverted Crown
  | 'sunburst_8' // Valid Admiralty 8-Point Sunburst
  | 'sunburst_6_cracked' // Forged 6-Point Star
  | 'anchor_keys' // Valid Guild Silver Anchor & Keys
  | 'auditor_sting'; // Undercover Crown Auditor Trap Mark

export type UVRevealType =
  | 'clean'
  | 'genuine_watermark'
  | 'blood_hex_veins'
  | 'syndicate_cipher'
  | 'false_crown_die'
  | 'ancient_aether_matrix';

export type LoupeMicroDetail =
  | 'clean_mint_rim'
  | 'shaved_rim_scratches'
  | 'forged_inverted_crown'
  | 'detonator_fuse_wire'
  | 'hand_carved_wax_bribe'
  | 'auditor_sting_etching'
  | 'cracked_bone_seal'
  | 'master_cypher_engraving';

export type ClaimantArchetype =
  | 'merchant'
  | 'cutpurse'
  | 'aristocrat'
  | 'factor'
  | 'nun'
  | 'clockmaker'
  | 'mother'
  | 'auditor'
  | 'captain'
  | 'syndicate'
  | 'apothecary'
  | 'envoy'
  | 'printer'
  | 'inquisitor';

export interface ClaimantCase {
  id: string;
  night: number;
  claimantName: string;
  claimantTitle: string;
  archetype: ClaimantArchetype;
  openingLine: string;
  reactionCertify: string;
  reactionSeize: string;
  reactionFence: string;
  artifactName: string;
  visualType: ArtifactVisualType;
  declaredMaterial: string;
  declaredWeightGrams: number;
  actualWeightGrams: number;
  declaredHallmark: string;
  hallmarkStyle: HallmarkStyle;
  acousticSignature: AcousticSignature;
  acousticLabel: string;
  loupeDetail: LoupeMicroDetail;
  loupeInscription: string;
  uvReveal: UVRevealType;
  uvInscription: string;
  baseFeeSovereigns: number;
  fenceValueSovereigns: number;
  isAuthentic: boolean;
  discrepancySummary: string;
  // Moral & faction flags
  isRefugeeBribe?: boolean;
  bribeBonusSovereigns?: number;
  isAuditorSting?: boolean;
  isResistanceCipher?: boolean;
  isGrandMatrix?: boolean;
}

export interface NightBriefing {
  night: number;
  title: string;
  subtitle: string;
  contrabandHeadline: string;
  contrabandRules: string[];
  rentAndOilCost: number;
}

export type EndingId =
  | 'royal_arch_appraiser'
  | 'shadow_baron_syndicate'
  | 'underground_lantern'
  | 'blackwater_gallows';

export interface EndingSummary {
  id: EndingId;
  title: string;
  subtitle: string;
  epilogue: string;
  sealColor: string;
}

export const NIGHT_BRIEFINGS: NightBriefing[] = [
  {
    night: 1,
    title: 'NIGHT I // THE WEIGHT OF GOLD',
    subtitle: 'Weight Mismatches & Forged Royal Hallmarks',
    contrabandHeadline: 'ROYAL MINT DECREE #1891-A',
    contrabandRules: [
      '1. Weigh every coin & ingot on the Brass Balance Scale.',
      '2. Inspect seals under the 2.5x Loupe: Royal Crowns MUST have 3 upright peaks.',
      '3. Shaved coins or Inverted Crown dies MUST be stamped RED (Confiscate).',
    ],
    rentAndOilCost: 12,
  },
  {
    night: 2,
    title: 'NIGHT II // ECHOES IN THE BRASS',
    subtitle: 'Acoustic Tuning-Fork Resonance & Internal Forgeries',
    contrabandHeadline: 'ADMIRALTY ACOUSTIC ALERT',
    contrabandRules: [
      '1. Counterfeiters are plating Lead cores in gold of exact weight!',
      '2. Tap artifacts with the Tuning Fork & watch the Brass Oscillograph.',
      '3. Solid Gold/Silver rings pure; Lead thugs flat; Bomb mechanisms tick at 6Hz!',
    ],
    rentAndOilCost: 14,
  },
  {
    night: 3,
    title: 'NIGHT III // THE INQUISITOR’S TEST',
    subtitle: 'Moral Bribes, Desperate Refugees & Undercover Crown Auditors',
    contrabandHeadline: 'INQUISITION STING WARNING',
    contrabandRules: [
      '1. Undercover Crown Auditors walk the pier offering bribes for bad silver.',
      '2. Check chalice rims under the Loupe for "INQUISITION STING" marks.',
      '3. Harbor Passports require an upright Crown wax seal (10g).',
    ],
    rentAndOilCost: 16,
  },
  {
    night: 4,
    title: 'NIGHT IV // AETHER & BLOOD',
    subtitle: 'UV Aether Lens Curses & Invisible Syndicate Ciphers',
    contrabandHeadline: 'OCCULT QUARANTINE EDICT',
    contrabandRules: [
      '1. Sweep the Violet UV Aether Lens across every ingot and passport.',
      '2. Confiscate Blood-Hexed gold bearing pulsing Aether plague veins.',
      '3. Watch for Rebel Syndicate invisible cipher ink on diplomatic passes.',
    ],
    rentAndOilCost: 18,
  },
  {
    night: 5,
    title: 'NIGHT V // THE GRAND HEIST',
    subtitle: 'The Stolen Imperial Matrix & Final Reckoning',
    contrabandHeadline: 'MARTIAL LAW AT BLACKWATER PIER',
    contrabandRules: [
      '1. High Inquisitor Malakor inspects your post personally tonight.',
      '2. Combine Scale, Loupe, Tuning Fork & UV Lens on every relic.',
      '3. The Stolen Imperial Crown Matrix (150g) decides the fate of the port.',
    ],
    rentAndOilCost: 20,
  },
];

export const CLAIMANT_ROSTER: ClaimantCase[] = [
  // ================= NIGHT 1 (Weight & Hallmarks) =================
  {
    id: 'n1_c1_vance',
    night: 1,
    claimantName: 'Master Cedric Vance',
    claimantTitle: 'Eastern Tea Factor',
    archetype: 'merchant',
    openingLine:
      'Evening, Appraiser. One clean Gold Sovereign from the Royal Mint—just need my harbor voucher stamped.',
    reactionCertify: 'Much obliged. May your oil lamp burn warm till dawn.',
    reactionSeize: 'Seized?! That coin came straight from the Royal Paymaster!',
    reactionFence: 'Wait—where did my sovereign go? You sly dock-rat...',
    artifactName: 'Royal Gold Sovereign',
    visualType: 'sovereign_coin',
    declaredMaterial: '24k Mint Gold',
    declaredWeightGrams: 30,
    actualWeightGrams: 30,
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'crown_upright',
    acousticSignature: 'gold_sine',
    acousticLabel: '528Hz Pure Gold Sine',
    loupeDetail: 'clean_mint_rim',
    loupeInscription: 'REX IV · UPRIGHT CROWN · 30G',
    uvReveal: 'clean',
    uvInscription: 'NO OCCULT RESIDUE',
    baseFeeSovereigns: 10,
    fenceValueSovereigns: 18,
    isAuthentic: true,
    discrepancySummary: 'Authentic 30g Royal Gold Sovereign with upright 3-peak Crown.',
  },
  {
    id: 'n1_c2_callum',
    night: 1,
    claimantName: '“Hollow-Thumb” Callum',
    claimantTitle: 'Wharf Stevedore',
    archetype: 'cutpurse',
    openingLine:
      'Hurry it along, mate. Sovereign’s shiny enough in this fog, ain’t no need for the balance pan.',
    reactionCertify: 'Ha! Easiest ten sovereigns on the pier. Drinks on me!',
    reactionSeize: 'Blast your brass scales! A man takes a little gold dust off the edge...',
    reactionFence: 'A fence behind the Royal window? Deal—split the take!',
    artifactName: 'Clipped Gold Sovereign',
    visualType: 'sovereign_coin',
    declaredMaterial: '24k Mint Gold',
    declaredWeightGrams: 30,
    actualWeightGrams: 20, // Underweight!
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'crown_upright',
    acousticSignature: 'gold_sine',
    acousticLabel: '528Hz Thin Gold Ring',
    loupeDetail: 'shaved_rim_scratches',
    loupeInscription: 'RIM FILED & HOLLOWED (-10G)',
    uvReveal: 'clean',
    uvInscription: 'NO OCCULT RESIDUE',
    baseFeeSovereigns: 10,
    fenceValueSovereigns: 20,
    isAuthentic: false,
    discrepancySummary: 'Underweight coin: weighs 20g instead of 30g (rim shaved & hollowed).',
  },
  {
    id: 'n1_c3_evelyn',
    night: 1,
    claimantName: 'Lady Evelyn Morley',
    claimantTitle: 'Fallen Peeress',
    archetype: 'aristocrat',
    openingLine:
      'My late husband’s trade ingot. It weighs a full hundred grams—do not insult our house with that jeweler’s glass.',
    reactionCertify: 'At last, someone who respects breeding over petty bureaucracy.',
    reactionSeize: 'You dare confiscate Morley bullion?! The backwards crown was a minting flaw!',
    reactionFence: 'Quietly into the drawer? Very well... pay me in unmarked coin.',
    artifactName: 'Imperial Trade Ingot',
    visualType: 'bullion_ingot',
    declaredMaterial: 'Fine Bullion Bar',
    declaredWeightGrams: 100,
    actualWeightGrams: 100,
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'crown_inverted', // Forged hallmark!
    acousticSignature: 'gold_sine',
    acousticLabel: '528Hz Bullion Harmonic',
    loupeDetail: 'forged_inverted_crown',
    loupeInscription: 'FORGED DIE: INVERTED CROWN',
    uvReveal: 'clean',
    uvInscription: 'NO OCCULT RESIDUE',
    baseFeeSovereigns: 12,
    fenceValueSovereigns: 24,
    isAuthentic: false,
    discrepancySummary: 'Forged hallmark under Loupe: Inverted 3-Peak Crown die.',
  },

  // ================= NIGHT 2 (Acoustic & Internal Forgeries) =================
  {
    id: 'n2_c1_krell',
    night: 2,
    claimantName: 'Alderman Horace Krell',
    claimantTitle: 'Foundry Syndic',
    archetype: 'factor',
    openingLine:
      'Dead-on 100 grams on the scale and a crisp upright Crown seal. Stamp it green before my carriage freezes.',
    reactionCertify: 'Pleasure doing business. Never mind how heavy it sits in the pocket.',
    reactionSeize: 'Curse that tuning fork! How did you hear the lead slug inside?!',
    reactionFence: 'You know a buyer for gilded lead? Here—take it under the counter.',
    artifactName: 'Gilded Foundry Ingot',
    visualType: 'bullion_ingot',
    declaredMaterial: 'Fine Bullion Bar',
    declaredWeightGrams: 100,
    actualWeightGrams: 100,
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'crown_upright',
    acousticSignature: 'lead_thud', // Dead Lead Thud!
    acousticLabel: '118Hz DEAD LEAD THUD',
    loupeDetail: 'clean_mint_rim',
    loupeInscription: 'GOLD ELECTROPLATE SEAM',
    uvReveal: 'clean',
    uvInscription: 'NO OCCULT RESIDUE',
    baseFeeSovereigns: 12,
    fenceValueSovereigns: 24,
    isAuthentic: false,
    discrepancySummary: 'Acoustic forgery: Tuning Fork reveals a dead 118Hz Lead Core inside the 100g ingot.',
  },
  {
    id: 'n2_c2_meredith',
    night: 2,
    claimantName: 'Sister Meredith',
    claimantTitle: 'Almoner of St. Jude',
    archetype: 'nun',
    openingLine:
      'Our parish silver chalice, Appraiser. We pledge it for winter coal—hear how purely the silver rings.',
    reactionCertify: 'Bless you, child. The orphans of Blackwater Pier will sleep warm tonight.',
    reactionSeize: 'Confiscated?! Heaven forgive you, that chalice was consecrated!',
    reactionFence: 'Selling church silver to the Syndicate? May God have mercy on your ledger.',
    artifactName: 'Guild Silver Chalice',
    visualType: 'silver_chalice',
    declaredMaterial: 'Sterling Guild Silver',
    declaredWeightGrams: 80,
    actualWeightGrams: 80,
    declaredHallmark: 'Anchor & Crossed Keys',
    hallmarkStyle: 'anchor_keys',
    acousticSignature: 'silver_ring',
    acousticLabel: '880Hz Pure Silver Chime',
    loupeDetail: 'clean_mint_rim',
    loupeInscription: 'GUILD ANCHOR & KEYS · 80G',
    uvReveal: 'clean',
    uvInscription: 'CONSECRATED SILVER',
    baseFeeSovereigns: 12,
    fenceValueSovereigns: 22,
    isAuthentic: true,
    discrepancySummary: 'Authentic 80g Guild Silver Chalice with pure 880Hz chime.',
  },
  {
    id: 'n2_c3_viktor',
    night: 2,
    claimantName: 'Viktor Kael',
    claimantTitle: 'Agitated Horologist',
    archetype: 'clockmaker',
    openingLine:
      'A standard 60-gram Admiralty chronometer. Please—don’t tap the brass casing with your fork, the spring is tight.',
    reactionCertify: 'It passed! Clear the customs house before midnight if you value your ears...',
    reactionSeize: 'Down! Don’t drop it in the seizure bin—the detonator escapement is live!',
    reactionFence: 'The Syndicate ordered that infernal timepiece anyway. Slip it down gently!',
    artifactName: 'Brass Pocket Chronometer',
    visualType: 'pocket_chronometer',
    declaredMaterial: 'Naval Brass & Quartz',
    declaredWeightGrams: 60,
    actualWeightGrams: 60,
    declaredHallmark: '8-Point Sunburst',
    hallmarkStyle: 'sunburst_8',
    acousticSignature: 'clockwork_bomb', // Fast 6Hz bomb tick!
    acousticLabel: '6Hz ERRATIC BOMB DETONATOR',
    loupeDetail: 'detonator_fuse_wire',
    loupeInscription: 'PRIMED FULMINATE FUSE WIRE',
    uvReveal: 'clean',
    uvInscription: 'NITRO-POWDER TRACE',
    baseFeeSovereigns: 14,
    fenceValueSovereigns: 28,
    isAuthentic: false,
    discrepancySummary: 'Contraband Clockwork Bomb: 6Hz erratic detonator tick & fuse wire under Loupe.',
  },

  // ================= NIGHT 3 (The Inquisitor's Test & Moral Bribes) =================
  {
    id: 'n3_c1_marta',
    night: 3,
    claimantName: 'Marta Lindqvist',
    claimantTitle: 'Refugee Mother',
    archetype: 'mother',
    openingLine:
      'Please... my boy has black-lung fever. I know the wax Crown on our steamer pass is hand-carved, but take my last 15 sovereigns and stamp Green.',
    reactionCertify: 'Thank you! Thank you—we will remember your kindness across the sea!',
    reactionSeize: 'No! Without that pass they will send us back to the sulfur mines!',
    reactionFence: 'Selling a mother’s passport to smugglers? What has this city become...',
    artifactName: 'Sealed Harbor Passport',
    visualType: 'harbor_passport',
    declaredMaterial: 'Stamped Vellum & Wax',
    declaredWeightGrams: 10,
    actualWeightGrams: 10,
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'crown_inverted', // Hand-carved flawed seal
    acousticSignature: 'parchment_crisp',
    acousticLabel: 'Crisp Vellum Rustle',
    loupeDetail: 'hand_carved_wax_bribe',
    loupeInscription: 'CRUDE WAX SEAL + 15G PLEA NOTE',
    uvReveal: 'clean',
    uvInscription: 'TEAR-STAINED VELLUM',
    baseFeeSovereigns: 10,
    fenceValueSovereigns: 18,
    isAuthentic: false,
    isRefugeeBribe: true,
    bribeBonusSovereigns: 15,
    discrepancySummary: 'Moral Choice: Hand-carved refugee wax seal (Certify for +Humanity & +15g plea, or Seize for Crown strictness).',
  },
  {
    id: 'n3_c2_cross',
    night: 3,
    claimantName: 'Septimus Cross',
    claimantTitle: '“Dockside Peddler”',
    archetype: 'auditor',
    openingLine:
      'Psst—Appraiser. This silver chalice is a little light and lead-lined, I admit it. Stamp it Green and we split twenty sovereigns.',
    reactionCertify: 'Aha! Under section 9 of the Royal Code, I cite you for accepting a bribe!',
    reactionSeize: 'Well spotted, Appraiser. I am Inspector Cross of the Crown Audit—take this commendation.',
    reactionFence: 'Fencing an Inquisition sting piece right in front of an Auditor?! Down in my black book you go!',
    artifactName: 'Test Guild Chalice',
    visualType: 'silver_chalice',
    declaredMaterial: 'Sterling Guild Silver',
    declaredWeightGrams: 80,
    actualWeightGrams: 60, // Underweight!
    declaredHallmark: 'Anchor & Crossed Keys',
    hallmarkStyle: 'auditor_sting',
    acousticSignature: 'lead_thud',
    acousticLabel: '118Hz Dull Lead Alloy',
    loupeDetail: 'auditor_sting_etching',
    loupeInscription: 'CROWN AUDITOR TRAP #09',
    uvReveal: 'clean',
    uvInscription: 'INQUISITION ASSAY MARK',
    baseFeeSovereigns: 14,
    fenceValueSovereigns: 10,
    isAuthentic: false,
    isAuditorSting: true,
    discrepancySummary: 'Undercover Crown Auditor Sting: 60g underweight lead chalice marked "CROWN AUDITOR TRAP #09".',
  },
  {
    id: 'n3_c3_harlon',
    night: 3,
    claimantName: 'Captain Harlon Vane',
    claimantTitle: 'Admiralty Quartermaster',
    archetype: 'captain',
    openingLine:
      'Admiralty survey chronometer from HMS Ironclad. Sixty grams, steady 1Hz escapement—verify it on the double.',
    reactionCertify: 'Shipshape and Bristol fashion. Good work, Appraiser.',
    reactionSeize: 'Confiscating Royal Navy issue?! The First Sea Lord will hear of this!',
    reactionFence: 'Stealing Admiralty instruments?! You’ll hang from the yardarm!',
    artifactName: 'Naval Survey Chronometer',
    visualType: 'pocket_chronometer',
    declaredMaterial: 'Naval Brass & Quartz',
    declaredWeightGrams: 60,
    actualWeightGrams: 60,
    declaredHallmark: '8-Point Sunburst',
    hallmarkStyle: 'sunburst_8',
    acousticSignature: 'clockwork_steady',
    acousticLabel: '1Hz Steady Naval Escapement',
    loupeDetail: 'clean_mint_rim',
    loupeInscription: 'ADMIRALTY 8-PT SUNBURST · 60G',
    uvReveal: 'clean',
    uvInscription: 'CLEAN NAVAL BRASS',
    baseFeeSovereigns: 12,
    fenceValueSovereigns: 24,
    isAuthentic: true,
    discrepancySummary: 'Authentic 60g Naval Chronometer with 8-Point Sunburst and steady 1Hz tick.',
  },
  {
    id: 'n3_c4_vesper',
    night: 3,
    claimantName: 'Vesper of the Rookery',
    claimantTitle: 'Syndicate Whisper-Broker',
    archetype: 'syndicate',
    openingLine:
      'The Inquisition wants this whispering saint’s bone burned. Slip it into your bottom drawer instead, and the Night Syndicate pays double.',
    reactionCertify: 'Certified openly? Bold move, friend—though the Inquisitors won’t like the hum.',
    reactionSeize: 'Turning Syndicate bone over to the Crown? Cold choice, Appraiser.',
    reactionFence: 'Smooth as velvet. Thirty-two sovereigns in your tray, and the Rookery remembers its friends.',
    artifactName: 'Whispering Reliquary Bone',
    visualType: 'reliquary_bone',
    declaredMaterial: 'Catacomb Ivory & Brass',
    declaredWeightGrams: 50,
    actualWeightGrams: 50,
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'crown_inverted',
    acousticSignature: 'cursed_whisper',
    acousticLabel: '311Hz Detuned Bone Whisper',
    loupeDetail: 'cracked_bone_seal',
    loupeInscription: 'CATACOMB HEX FRACTURE',
    uvReveal: 'blood_hex_veins',
    uvInscription: 'AETHER MARROW LUMINESCENCE',
    baseFeeSovereigns: 14,
    fenceValueSovereigns: 32,
    isAuthentic: false,
    discrepancySummary: 'Contraband Whispering Reliquary Bone (50g): emits 311Hz occult whisper & UV marrow glow.',
  },

  // ================= NIGHT 4 (UV Aether Curses & Invisible Ink) =================
  {
    id: 'n4_c1_mourne',
    night: 4,
    claimantName: 'Dr. Alistair Mourne',
    claimantTitle: 'Quarantine Apothecary',
    archetype: 'apothecary',
    openingLine:
      'Treasury bullion from the Lazar-House ward. Weight, hallmark, and ring are flawless—no need to trouble yourself with the violet lens.',
    reactionCertify: 'Splendid! The plague-bound gold enters circulation before dawn.',
    reactionSeize: 'You saw the blood-veins under the Aether glass?! Back, before the miasma wakes!',
    reactionFence: 'The Syndicate alchemists pay handsomely for blood-hexed gold. Wise trade.',
    artifactName: 'Quarantine Bullion Ingot',
    visualType: 'bullion_ingot',
    declaredMaterial: 'Fine Bullion Bar',
    declaredWeightGrams: 100,
    actualWeightGrams: 100,
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'crown_upright',
    acousticSignature: 'gold_sine',
    acousticLabel: '528Hz Pure Gold Sine',
    loupeDetail: 'clean_mint_rim',
    loupeInscription: 'REX IV · UPRIGHT CROWN · 100G',
    uvReveal: 'blood_hex_veins', // Hidden UV plague curse!
    uvInscription: 'AETHER PLAGUE BLOOD-VEINS',
    baseFeeSovereigns: 15,
    fenceValueSovereigns: 30,
    isAuthentic: false,
    discrepancySummary: 'UV Contraband: Passes Scale, Loupe & Tuning Fork, but UV Aether Lens reveals Plague Blood-Veins.',
  },
  {
    id: 'n4_c2_clara',
    night: 4,
    claimantName: 'Envoy Clara Renault',
    claimantTitle: 'Consulate Courier',
    archetype: 'envoy',
    openingLine:
      'Diplomatic harbor passport for the dawn packet. Look under your violet lens—you will see the genuine Royal watermark.',
    reactionCertify: 'Merci, Appraiser. A thorough inspection is a comfort in dark times.',
    reactionSeize: 'This is an outrage! My diplomatic watermark is wholly genuine!',
    reactionFence: 'Stealing a Consulate pouch?! The Ambassador will demand your head!',
    artifactName: 'Diplomatic Harbor Passport',
    visualType: 'harbor_passport',
    declaredMaterial: 'Stamped Vellum & Wax',
    declaredWeightGrams: 10,
    actualWeightGrams: 10,
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'crown_upright',
    acousticSignature: 'parchment_crisp',
    acousticLabel: 'Crisp Vellum Rustle',
    loupeDetail: 'clean_mint_rim',
    loupeInscription: 'GENUINE CONSULATE SEAL · 10G',
    uvReveal: 'genuine_watermark',
    uvInscription: 'ROYAL CROWN UV WATERMARK',
    baseFeeSovereigns: 14,
    fenceValueSovereigns: 26,
    isAuthentic: true,
    discrepancySummary: 'Authentic 10g Diplomatic Passport with Upright Crown and Genuine UV Watermark.',
  },
  {
    id: 'n4_c3_soren',
    night: 4,
    claimantName: 'Soren Pike',
    claimantTitle: 'Night-Press Compositor',
    archetype: 'printer',
    openingLine:
      'To the naked eye, it’s a simple merchant pass. Through your UV glass, it carries the Resistance escape routes. Help us get twelve families out.',
    reactionCertify: 'The lantern burns bright! Twelve souls board the free schooner tonight.',
    reactionSeize: 'You hand the Resistance cipher to the Inquisitors? Then the pier is truly lost.',
    reactionFence: 'Selling rebel routes to the Smuggler’s Drawer? Cold profit, Appraiser.',
    artifactName: 'Ciphered Harbor Passport',
    visualType: 'harbor_passport',
    declaredMaterial: 'Stamped Vellum & Wax',
    declaredWeightGrams: 10,
    actualWeightGrams: 10,
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'crown_upright',
    acousticSignature: 'parchment_crisp',
    acousticLabel: 'Crisp Vellum Rustle',
    loupeDetail: 'clean_mint_rim',
    loupeInscription: 'UPRIGHT CROWN SEAL · 10G',
    uvReveal: 'syndicate_cipher', // Invisible rebel ink!
    uvInscription: 'FREE HARBOR RESISTANCE CIPHER',
    baseFeeSovereigns: 14,
    fenceValueSovereigns: 28,
    isAuthentic: false,
    isResistanceCipher: true,
    discrepancySummary: 'UV Rebel Cipher: UV Aether Lens reveals invisible Resistance escape map (Seize for Crown, or Certify for Underground Lantern).',
  },

  // ================= NIGHT 5 (The Grand Heist) =================
  {
    id: 'n5_c1_malakor',
    night: 5,
    claimantName: 'High Inquisitor Malakor',
    claimantTitle: 'Lord of the Iron Tribunal',
    archetype: 'inquisitor',
    openingLine:
      'I bring the Cathedral’s Sacred Reliquary Bone for midnight re-certification. Weigh it, ring it, lens it—and do not falter.',
    reactionCertify: 'Your hands are steady, Appraiser. The Tribunal notes your diligence.',
    reactionSeize: 'You dare seize the High Inquisitor’s sacred relic?! Guards, mark this booth!',
    reactionFence: 'Did you just drop the Cathedral Reliquary into a smuggler’s chute in front of me?!',
    artifactName: 'Sacred Cathedral Reliquary',
    visualType: 'reliquary_bone',
    declaredMaterial: 'Consecrated Saint Ivory',
    declaredWeightGrams: 50,
    actualWeightGrams: 50,
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'crown_upright',
    acousticSignature: 'silver_ring',
    acousticLabel: '880Hz Pure Reliquary Chime',
    loupeDetail: 'clean_mint_rim',
    loupeInscription: 'SANCTUS REX · 50G VERIFIED',
    uvReveal: 'genuine_watermark',
    uvInscription: 'PURE CONSECRATED HALO',
    baseFeeSovereigns: 16,
    fenceValueSovereigns: 30,
    isAuthentic: true,
    discrepancySummary: 'Authentic 50g Consecrated Cathedral Reliquary verified across all 4 instruments.',
  },
  {
    id: 'n5_c2_defector',
    night: 5,
    claimantName: 'Julian Sterling',
    claimantTitle: 'Treasury Die-Sink',
    archetype: 'factor',
    openingLine:
      'A proof sovereign from the Chancellor’s shadow mint. Thirty grams and pure gold tone—only your lenses can spot the treason.',
    reactionCertify: 'The shadow mint’s coin is laundered! The Chancellor owns the treasury now.',
    reactionSeize: 'Sharp eyes! Both the 6-point star and the UV counter-die gave it away.',
    reactionFence: 'Into the Fence Drawer it goes—now the Syndicate can strike its own sovereigns!',
    artifactName: 'Chancellor’s Proof Sovereign',
    visualType: 'sovereign_coin',
    declaredMaterial: '24k Mint Gold',
    declaredWeightGrams: 30,
    actualWeightGrams: 30,
    declaredHallmark: 'Upright 3-Peak Crown',
    hallmarkStyle: 'sunburst_6_cracked', // Forged 6-pt cracked star!
    acousticSignature: 'gold_sine',
    acousticLabel: '528Hz Pure Gold Sine',
    loupeDetail: 'forged_inverted_crown',
    loupeInscription: 'CRACKED 6-PT SHADOW DIE',
    uvReveal: 'false_crown_die',
    uvInscription: 'FALSE CROWN DIE #00',
    baseFeeSovereigns: 16,
    fenceValueSovereigns: 34,
    isAuthentic: false,
    discrepancySummary: 'Shadow Mint Forgery: Loupe reveals cracked 6-point die & UV Lens reveals "FALSE CROWN DIE #00".',
  },
  {
    id: 'n5_c3_grand_matrix',
    night: 5,
    claimantName: 'Vesper & Soren Pike',
    claimantTitle: 'The Midnight Coalition',
    archetype: 'syndicate',
    openingLine:
      'The Stolen Imperial Crown Matrix—150 grams of Aether-forged brass. Seize it for the Crown, Certify it to fund the Free Harbor, or Fence it in your drawer to rule the Syndicate!',
    reactionCertify: 'You stamped it Green! With this Matrix, every refugee family buys safe passage at dawn!',
    reactionSeize: 'You return the Imperial Matrix to the Crown! The High Inquisitor names you Grand Royal Appraiser!',
    reactionFence: 'Down the Smuggler’s Chute! Fifty sovereigns in gold—we own every press in Blackwater Port!',
    artifactName: 'Imperial Crown Matrix',
    visualType: 'crown_matrix',
    declaredMaterial: '150g Master Mint Matrix',
    declaredWeightGrams: 150,
    actualWeightGrams: 150, // Matches 100g + 50g weights on the scale!
    declaredHallmark: 'Master Royal Cypher',
    hallmarkStyle: 'crown_upright',
    acousticSignature: 'cursed_whisper',
    acousticLabel: 'Dual Harmonic Aether Resonance',
    loupeDetail: 'master_cypher_engraving',
    loupeInscription: 'IMPERIAL MASTER MATRIX · 150G',
    uvReveal: 'ancient_aether_matrix',
    uvInscription: 'SOVEREIGN AETHER SIGIL',
    baseFeeSovereigns: 25,
    fenceValueSovereigns: 50,
    isAuthentic: false, // Stolen contraband master relic!
    isGrandMatrix: true,
    discrepancySummary: 'The Stolen 150g Imperial Crown Matrix: Seize for Crown glory, Certify for the Free Harbor, or Fence for Syndicate rule.',
  },
];

export const ENDINGS: Record<EndingId, EndingSummary> = {
  royal_arch_appraiser: {
    id: 'royal_arch_appraiser',
    title: 'ENDING I // GRAND ROYAL APPRAISER OF THE CROWN',
    subtitle: 'Order, Precision & The Iron Seal',
    epilogue:
      'Your balance scale never lied and your iron stamp never wavered. By exposing the Shadow Mint, passing the Auditor’s sting, and seizing the Imperial Matrix for the Crown, you are elevated to Arch-Appraiser of the Royal Treasury.',
    sealColor: '#10b981',
  },
  shadow_baron_syndicate: {
    id: 'shadow_baron_syndicate',
    title: 'ENDING II // SHADOW BARON OF THE NIGHT SYNDICATE',
    subtitle: 'Double Coin Under the Mahogany Counter',
    epilogue:
      'Why serve the Crown for copper stipends when the Smuggler’s Drawer pays in heavy gold? With the stolen Imperial Matrix slipped beneath your counter, every contraband ship in Blackwater Harbor answers to your brass seal.',
    sealColor: '#f59e0b',
  },
  underground_lantern: {
    id: 'underground_lantern',
    title: 'ENDING III // LANTERN OF THE FREE HARBOR',
    subtitle: 'Mercy Hidden in the Ink',
    epilogue:
      'Behind rain-streaked glass, you bent the Crown’s cold rules so mothers, orphans, and Resistance printers could board the midnight steamer. As dawn breaks over the harbor, a hundred free lanterns flicker in salute to your booth.',
    sealColor: '#38bdf8',
  },
  blackwater_gallows: {
    id: 'blackwater_gallows',
    title: 'ENDING IV // DEBTOR’S GALLOWS AT BLACKWATER PIER',
    subtitle: 'Crushed Between the Inquisition & the Ledger',
    epilogue:
      'Whether through empty coin trays when the oil-merchant knocked or too many red marks in the Inquisitor’s ledger, the mahogany window slams shut forever. Another appraiser takes your stool before the rain stops.',
    sealColor: '#ef4444',
  },
};
