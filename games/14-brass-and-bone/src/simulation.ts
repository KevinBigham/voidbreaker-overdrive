import { BrassBoneAudio } from './audio';
import { CAMPAIGN_CASES, getCasesForNight } from './cases';
import type {
  ClaimantCase,
  DecisionType,
  DeskObjectId,
  DeskPhysicalObject,
  EndingId,
  NightCaseRecord,
  WorkbenchState,
} from './types';

export const WORKBENCH_WIDTH = 1280;
export const WORKBENCH_HEIGHT = 760;

// Geometry Constants on the 1280x760 Mahogany Desk
export const SCALE_PIVOT_X = 225;
export const SCALE_PIVOT_Y = 252;
export const SCALE_BEAM_HALF_LEN = 112;
export const SCALE_PAN_DROP_Y = 92;

export const INK_PAD_RECT = { x: 965, y: 392, w: 210, h: 68 };
export const OSCILLOGRAPH_RECT = { x: 1005, y: 205, w: 225, h: 150 };
export const LEDGER_RECT = { x: 36, y: 512, w: 388, h: 226 };
export const DRAWER_RECT = { x: 485, y: 672, w: 350, h: 86 };
export const STICKY_NOTE_RECT = { x: 462, y: 214, w: 185, h: 74 };

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export class BrassBoneSimulation {
  public state: WorkbenchState;
  public objects: Map<DeskObjectId, DeskPhysicalObject> = new Map();
  public draggedId: DeskObjectId | null = null;
  public dragOffsetX = 0;
  public dragOffsetY = 0;
  public pointerX = WORKBENCH_WIDTH * 0.5;
  public pointerY = WORKBENCH_HEIGHT * 0.5;
  public audio: BrassBoneAudio;
  private resonanceCooldown = 0;

  constructor(audio: BrassBoneAudio, initialSeed = 1891) {
    this.audio = audio;
    void initialSeed;
    const firstCase = getCasesForNight(1)[0] ?? CAMPAIGN_CASES[0];
    this.state = {
      night: 1,
      caseIndexInNight: 0,
      phase: 'inspecting',
      activeCase: firstCase,
      timeElapsed: 0,
      claimantTimer: firstCase.patienceSeconds,
      typewriterChars: 0,
      stickyNoteDismissed: false,

      sovereigns: 30,
      suspicion: 0,
      mercyPoints: 0,
      syndicatePoints: 0,
      crownLoyalty: 0,

      scaleAngle: 0,
      scaleAngularVel: 0,
      leftPanGrams: 0,
      rightPanGrams: 0,

      oscillographActive: 0,
      oscillographPhase: 0,
      lastTestedResonance: null,
      lastTestedArtifactName: '',

      ledgerPage: 0,
      ledgerFlipAnim: 0,

      drawerOpenAmount: 0,

      hitStopTimer: 0,
      cameraShakeX: 0,
      cameraShakeY: 0,
      cameraShakeVX: 0,
      cameraShakeVY: 0,

      stampMarks: [],
      pendingDecision: null,
      transitionTimer: 0,

      nightRecords: [],
      allRecords: [],
      lastNightRentCost: 15,
      lastNightOilCost: 5,
      trendingEnding: 'crown_assessor',
    };

    this.initDeskObjects();
  }

  private initDeskObjects(): void {
    this.objects.clear();

    const addObj = (
      id: DeskObjectId,
      label: string,
      homeX: number,
      homeY: number,
      radius: number,
      width: number,
      height: number,
      extra?: Partial<DeskPhysicalObject>
    ) => {
      this.objects.set(id, {
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
        targetLift: 0,
        bounceScale: 1,
        bounceVel: 0,
        radius,
        width,
        height,
        ...extra,
      });
    };

    // Active Artifact on the center baize velvet mat
    addObj('artifact', this.state.activeCase.artifact.name, 560, 415, 54, 110, 110);

    // Claimant's Assay Slip on the center-right baize mat
    addObj('assay_slip', 'Assay Slip', 748, 415, 85, 184, 236);

    // Brass Counterweights on the Left Scale Tray
    addObj('weight_10', '10g', 98, 468, 22, 36, 42, { weightGrams: 10 });
    addObj('weight_20', '20g', 168, 468, 25, 40, 46, { weightGrams: 20 });
    addObj('weight_50', '50g', 248, 468, 28, 46, 52, { weightGrams: 50 });
    addObj('weight_100', '100g', 338, 468, 33, 54, 60, { weightGrams: 100 });

    // Acoustic Stethoscope / Tuning Fork (Top Right)
    addObj('tuning_fork', 'Tuning Fork', 935, 285, 42, 46, 128);

    // Heavy Iron Stamps (Middle Right)
    addObj('stamp_certify', 'CERTIFY & PAY', 985, 515, 44, 78, 92, {
      inkState: 'green',
      inkAmount: 1.0,
    });
    addObj('stamp_seize', 'CONFISCATE', 1155, 515, 44, 78, 92, {
      inkState: 'red',
      inkAmount: 1.0,
    });

    // Jeweler's Magnifying Loupe & UV Aether Lens (Bottom Right)
    addObj('loupe', 'Jeweler’s Loupe (2.5×)', 985, 652, 62, 124, 124);
    addObj('uv_lens', 'UV Aether Lens (2.5×)', 1155, 652, 62, 124, 124);
  }

  public getScalePanPositions(angle = this.state.scaleAngle): {
    leftX: number;
    leftY: number;
    rightX: number;
    rightY: number;
  } {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const leftBeamX = SCALE_PIVOT_X - cosA * SCALE_BEAM_HALF_LEN;
    const leftBeamY = SCALE_PIVOT_Y - sinA * SCALE_BEAM_HALF_LEN;
    const rightBeamX = SCALE_PIVOT_X + cosA * SCALE_BEAM_HALF_LEN;
    const rightBeamY = SCALE_PIVOT_Y + sinA * SCALE_BEAM_HALF_LEN;
    return {
      leftX: leftBeamX,
      leftY: leftBeamY + SCALE_PAN_DROP_Y,
      rightX: rightBeamX,
      rightY: rightBeamY + SCALE_PAN_DROP_Y,
    };
  }

  public loadCase(claimantCase: ClaimantCase): void {
    this.state.activeCase = claimantCase;
    this.state.phase = 'inspecting';
    this.state.claimantTimer = claimantCase.patienceSeconds;
    this.state.typewriterChars = 0;
    this.state.stampMarks = [];
    this.state.pendingDecision = null;
    this.state.transitionTimer = 0;
    this.state.lastTestedResonance = null;
    this.state.lastTestedArtifactName = '';
    this.state.oscillographActive = 0;
    this.draggedId = null;

    // Return weights and tools to clean positions or keep weights on tray
    for (const obj of this.objects.values()) {
      obj.targetLift = 0;
      if (obj.id === 'artifact') {
        obj.label = claimantCase.artifact.name;
        obj.onRightPan = false;
        obj.x = 560;
        obj.y = 360;
        obj.targetX = 560;
        obj.targetY = 415;
        obj.vx = 0;
        obj.vy = 0;
      } else if (obj.id === 'assay_slip') {
        obj.x = 748;
        obj.y = 365;
        obj.targetX = 748;
        obj.targetY = 415;
        obj.vx = 0;
        obj.vy = 0;
      } else if (obj.id.startsWith('weight_')) {
        obj.onLeftPan = false;
        obj.targetX = obj.homeX;
        obj.targetY = obj.homeY;
      } else if (obj.id === 'stamp_certify') {
        obj.inkState = 'green';
        obj.inkAmount = 1.0;
        obj.targetX = obj.homeX;
        obj.targetY = obj.homeY;
      } else if (obj.id === 'stamp_seize') {
        obj.inkState = 'red';
        obj.inkAmount = 1.0;
        obj.targetX = obj.homeX;
        obj.targetY = obj.homeY;
      } else {
        obj.targetX = obj.homeX;
        obj.targetY = obj.homeY;
      }
    }

    this.audio.playParchmentSlide();
  }

  public update(dtSeconds: number): void {
    const dt = clamp(dtSeconds, 0.001, 0.05);
    this.state.timeElapsed += dt;

    if (this.resonanceCooldown > 0) {
      this.resonanceCooldown = Math.max(0, this.resonanceCooldown - dt);
    }

    // 1. Hit-stop handling (45ms freeze on heavy stamp slam)
    if (this.state.hitStopTimer > 0) {
      this.state.hitStopTimer = Math.max(0, this.state.hitStopTimer - dt);
      this.updateCameraShake(dt);
      return;
    }

    this.updateCameraShake(dt);

    // 2. Typewriter dialogue reveal
    if (this.state.phase === 'inspecting') {
      const fullLen = this.state.activeCase.dialogue.length;
      if (this.state.typewriterChars < fullLen) {
        this.state.typewriterChars = Math.min(fullLen, this.state.typewriterChars + dt * 42);
      }

      // Claimant patience countdown
      this.state.claimantTimer = Math.max(0, this.state.claimantTimer - dt);
      const patienceRatio = this.state.claimantTimer / Math.max(1, this.state.activeCase.patienceSeconds);
      this.audio.updateClockTick(patienceRatio);

      // If patience runs out completely, claimant storms out and we auto-seize/default with penalty
      if (this.state.claimantTimer <= 0 && !this.state.pendingDecision) {
        this.triggerDecision('seize', true);
      }
    }

    // 3. Stamping exit transition
    if (this.state.phase === 'stamping_exit') {
      this.state.transitionTimer -= dt;
      if (this.state.transitionTimer <= 0) {
        this.advanceToNextCaseOrNight();
      }
    }

    // 4. Ledger page flip decay
    if (this.state.ledgerFlipAnim > 0) {
      this.state.ledgerFlipAnim = Math.max(0, this.state.ledgerFlipAnim - dt * 3.5);
    }

    // 5. Oscillograph decay & phase
    if (this.state.oscillographActive > 0) {
      this.state.oscillographActive = Math.max(0, this.state.oscillographActive - dt * 0.35);
      this.state.oscillographPhase += dt * 28;
    }

    // 6. Smuggler's Drawer proximity open/close
    const artifactObj = this.objects.get('artifact');
    const isDraggingArtifactNearDrawer =
      this.draggedId === 'artifact' &&
      artifactObj !== undefined &&
      artifactObj.y > 515 &&
      artifactObj.x > 400 &&
      artifactObj.x < 920;
    const isPointerOnDrawerHandle =
      this.pointerY > 665 && this.pointerX > 480 && this.pointerX < 840;
    const targetDrawer = isDraggingArtifactNearDrawer || isPointerOnDrawerHandle ? 1 : 0;
    this.state.drawerOpenAmount += (targetDrawer - this.state.drawerOpenAmount) * Math.min(1, dt * 10);

    // 7. Compute Brass Balance Scale damped spring oscillator:
    //    theta_ddot = -k * (theta - theta_target) - c * theta_dot
    this.updateScalePhysics(dt);

    // 8. Update all physical desk objects (spring lag, velocity tilt, lift shadow, micro-bounce)
    this.updatePhysicalObjects(dt);
  }

  private updateCameraShake(dt: number): void {
    const kShake = 180;
    const cShake = 16;
    const ax = -kShake * this.state.cameraShakeX - cShake * this.state.cameraShakeVX;
    const ay = -kShake * this.state.cameraShakeY - cShake * this.state.cameraShakeVY;
    this.state.cameraShakeVX += ax * dt;
    this.state.cameraShakeVY += ay * dt;
    this.state.cameraShakeX += this.state.cameraShakeVX * dt;
    this.state.cameraShakeY += this.state.cameraShakeVY * dt;
  }

  private updateScalePhysics(dt: number): void {
    let leftG = 0;
    for (const obj of this.objects.values()) {
      if (obj.onLeftPan && obj.weightGrams && this.draggedId !== obj.id) {
        leftG += obj.weightGrams;
      }
    }
    const art = this.objects.get('artifact');
    const rightG =
      art && art.onRightPan && this.draggedId !== 'artifact'
        ? this.state.activeCase.artifact.actualWeightG
        : 0;

    this.state.leftPanGrams = leftG;
    this.state.rightPanGrams = rightG;

    // Positive angle tips right pan down; negative angle tips left pan down
    const weightDiff = rightG - leftG;
    const thetaTarget = clamp(weightDiff / 110, -0.36, 0.36);

    const k = 38.0; // Spring stiffness
    const c = 4.2;  // Damping coefficient
    const angularAccel = -k * (this.state.scaleAngle - thetaTarget) - c * this.state.scaleAngularVel;

    this.state.scaleAngularVel += angularAccel * dt;
    this.state.scaleAngle += this.state.scaleAngularVel * dt;

    if (Math.abs(this.state.scaleAngularVel) > 0.22) {
      this.audio.playScaleCreak(this.state.scaleAngularVel);
    }
  }

  private updatePhysicalObjects(dt: number): void {
    const pans = this.getScalePanPositions(this.state.scaleAngle);

    // Arrange weights seated on the left pan neatly
    let leftPanSlotIndex = 0;
    const leftPanOffsets = [
      { dx: -24, dy: -6 },
      { dx: 22, dy: -6 },
      { dx: 0, dy: -22 },
      { dx: 0, dy: 4 },
    ];

    for (const obj of this.objects.values()) {
      if (this.draggedId !== obj.id) {
        if (obj.onLeftPan) {
          const slot = leftPanOffsets[leftPanSlotIndex % leftPanOffsets.length];
          leftPanSlotIndex++;
          obj.targetX = pans.leftX + slot.dx;
          obj.targetY = pans.leftY + slot.dy;
        } else if (obj.onRightPan && obj.id === 'artifact') {
          obj.targetX = pans.rightX;
          obj.targetY = pans.rightY - 12;
        }
      }

      // Spring-damper tracking toward (targetX, targetY)
      const stiffness = this.draggedId === obj.id ? 260 : 140;
      const damping = this.draggedId === obj.id ? 22 : 17;
      const ax = (obj.targetX - obj.x) * stiffness - obj.vx * damping;
      const ay = (obj.targetY - obj.y) * stiffness - obj.vy * damping;

      obj.vx += ax * dt;
      obj.vy += ay * dt;
      obj.x += obj.vx * dt;
      obj.y += obj.vy * dt;

      // Mandatory velocity-based tilt: rotation = clamp(vx * 0.015, -0.25, 0.25)
      const targetRot = clamp(obj.vx * 0.015, -0.25, 0.25);
      obj.rotation += (targetRot - obj.rotation) * Math.min(1, dt * 18);

      // Lift height interpolation for soft offset drop shadow
      obj.lift += (obj.targetLift - obj.lift) * Math.min(1, dt * 16);

      // Micro-bounce spring when dropped on desk
      const bAccel = (1.0 - obj.bounceScale) * 280 - obj.bounceVel * 18;
      obj.bounceVel += bAccel * dt;
      obj.bounceScale += obj.bounceVel * dt;
    }

    // Check live interaction if dragging the Tuning Fork over the Artifact
    if (this.draggedId === 'tuning_fork' && this.resonanceCooldown <= 0) {
      const fork = this.objects.get('tuning_fork');
      const art = this.objects.get('artifact');
      if (fork && art && Math.hypot(fork.x - art.x, fork.y - art.y) < 82) {
        this.strikeTuningFork();
      }
    }

    // Check live interaction if dragging a Stamp over the Ink Pad
    if (this.draggedId === 'stamp_certify' || this.draggedId === 'stamp_seize') {
      const stamp = this.objects.get(this.draggedId);
      if (
        stamp &&
        stamp.x >= INK_PAD_RECT.x &&
        stamp.x <= INK_PAD_RECT.x + INK_PAD_RECT.w &&
        stamp.y >= INK_PAD_RECT.y &&
        stamp.y <= INK_PAD_RECT.y + INK_PAD_RECT.h
      ) {
        if ((stamp.inkAmount ?? 0) < 0.95) {
          this.audio.playInkPadSquelch();
        }
        stamp.inkAmount = 1.0;
        stamp.inkState = stamp.id === 'stamp_certify' ? 'green' : 'red';
      }
    }
  }

  public strikeTuningFork(): void {
    this.resonanceCooldown = 0.65;
    const sig = this.state.activeCase.artifact.actualResonance;
    this.state.lastTestedResonance = sig;
    this.state.lastTestedArtifactName = this.state.activeCase.artifact.name;
    this.state.oscillographActive = 1.0;
    this.state.oscillographPhase = 0;

    const fork = this.objects.get('tuning_fork');
    if (fork) {
      fork.bounceScale = 1.14;
    }
    this.audio.playTuningForkResonance(sig);
  }

  public flipLedgerPage(direction: -1 | 1 | 0, explicitPage?: 0 | 1 | 2): void {
    const nextPage =
      explicitPage !== undefined
        ? explicitPage
        : (((this.state.ledgerPage + direction + 3) % 3) as 0 | 1 | 2);
    if (nextPage !== this.state.ledgerPage) {
      this.state.ledgerPage = nextPage;
      this.state.ledgerFlipAnim = 1.0;
      this.audio.playParchmentSlide();
    }
  }

  public onPointerDown(x: number, y: number): void {
    this.pointerX = x;
    this.pointerY = y;
    this.audio.unlock();

    // If on Post-Night Summary Ledger, clicking the Wax Seal / Continue area starts next night
    if (this.state.phase === 'night_summary') {
      if (x >= 320 && x <= 960 && y >= 540 && y <= 700) {
        this.audio.playStampSlam();
        this.startNextNight();
      }
      return;
    }

    // If on Final Campaign Ending Ledger, clicking the Seal restarts a fresh 5-Night shift
    if (this.state.phase === 'campaign_ending') {
      if (x >= 320 && x <= 960 && y >= 540 && y <= 710) {
        this.audio.playStampSlam();
        this.restartCampaign();
      }
      return;
    }

    if (this.state.phase !== 'inspecting') return;

    // 1. Check Night 1 Sticky Note unpin
    if (
      this.state.night === 1 &&
      !this.state.stickyNoteDismissed &&
      x >= STICKY_NOTE_RECT.x &&
      x <= STICKY_NOTE_RECT.x + STICKY_NOTE_RECT.w &&
      y >= STICKY_NOTE_RECT.y &&
      y <= STICKY_NOTE_RECT.y + STICKY_NOTE_RECT.h
    ) {
      this.state.stickyNoteDismissed = true;
      this.audio.playParchmentSlide();
      return;
    }

    // 2. Check Reference Ledger Tabs & Page Corners (Bottom Left)
    if (
      x >= LEDGER_RECT.x &&
      x <= LEDGER_RECT.x + LEDGER_RECT.w &&
      y >= LEDGER_RECT.y - 24 &&
      y <= LEDGER_RECT.y + LEDGER_RECT.h
    ) {
      // Top index tabs
      if (y < LEDGER_RECT.y + 28) {
        const relX = x - LEDGER_RECT.x;
        const tabWidth = LEDGER_RECT.w / 3;
        const tabIdx = clamp(Math.floor(relX / tabWidth), 0, 2) as 0 | 1 | 2;
        this.flipLedgerPage(0, tabIdx);
        return;
      }
      // Left or right half of book flips backward/forward
      if (x < LEDGER_RECT.x + LEDGER_RECT.w * 0.5) {
        this.flipLedgerPage(-1);
      } else {
        this.flipLedgerPage(1);
      }
      return;
    }

    // 3. Pick up the top-most physical object under the cursor
    // Priority order: Loupe/UV/Fork/Stamps/Weights/Artifact/AssaySlip
    const pickOrder: DeskObjectId[] = [
      'loupe',
      'uv_lens',
      'tuning_fork',
      'stamp_certify',
      'stamp_seize',
      'weight_10',
      'weight_20',
      'weight_50',
      'weight_100',
      'artifact',
      'assay_slip',
    ];

    for (const id of pickOrder) {
      const obj = this.objects.get(id);
      if (!obj) continue;

      const hit =
        id === 'assay_slip'
          ? Math.abs(x - obj.x) <= obj.width * 0.5 && Math.abs(y - obj.y) <= obj.height * 0.5
          : Math.hypot(x - obj.x, y - obj.y) <= obj.radius + 10;

      if (hit) {
        this.draggedId = id;
        this.dragOffsetX = obj.x - x;
        this.dragOffsetY = obj.y - y;
        obj.targetLift = 1;
        obj.bounceScale = 1.06;

        if (id.startsWith('weight_')) {
          obj.onLeftPan = false;
          this.audio.playBrassWeightClink(obj.weightGrams ?? 20);
        } else if (id === 'artifact') {
          obj.onRightPan = false;
          this.audio.playParchmentSlide();
        } else if (id === 'assay_slip') {
          this.audio.playParchmentSlide();
        }
        return;
      }
    }
  }

  public onPointerMove(x: number, y: number): void {
    this.pointerX = x;
    this.pointerY = y;
    if (!this.draggedId) return;

    const obj = this.objects.get(this.draggedId);
    if (!obj) return;

    obj.targetX = clamp(x + this.dragOffsetX, 45, WORKBENCH_WIDTH - 45);
    obj.targetY = clamp(y + this.dragOffsetY, 150, WORKBENCH_HEIGHT - 25);
  }

  public onPointerUp(): void {
    if (!this.draggedId) return;
    const id = this.draggedId;
    const obj = this.objects.get(id);
    this.draggedId = null;
    if (!obj) return;

    obj.targetLift = 0;
    obj.bounceScale = 0.91; // triggers landing micro-bounce
    obj.bounceVel = 2.4;

    const dropX = obj.targetX;
    const dropY = obj.targetY;
    const pans = this.getScalePanPositions(this.state.scaleAngle);

    // 1. Dropping a Brass Weight
    if (id.startsWith('weight_')) {
      const distToLeftPan = Math.min(
        Math.hypot(dropX - pans.leftX, dropY - pans.leftY),
        Math.hypot(obj.x - pans.leftX, obj.y - pans.leftY)
      );
      if (distToLeftPan < 92) {
        obj.onLeftPan = true;
        this.audio.playBrassWeightClink(obj.weightGrams ?? 50);
        // Excites scale beam slightly on impact
        this.state.scaleAngularVel -= ((obj.weightGrams ?? 20) / 100) * 0.65;
      } else {
        obj.onLeftPan = false;
        obj.targetX = obj.homeX;
        obj.targetY = obj.homeY;
        this.audio.playBrassWeightClink(obj.weightGrams ?? 20);
      }
      return;
    }

    // 2. Dropping the Artifact
    if (id === 'artifact') {
      // Check if dropped into the Hidden Smuggler's Drawer at the bottom edge of the desk
      if (
        dropY > 580 &&
        dropX >= DRAWER_RECT.x - 35 &&
        dropX <= DRAWER_RECT.x + DRAWER_RECT.w + 35
      ) {
        this.audio.playStampSlam();
        this.triggerDecision('fence');
        return;
      }

      // Check if dropped onto the Scale's Right Pan
      const distToRightPan = Math.min(
        Math.hypot(dropX - pans.rightX, dropY - pans.rightY),
        Math.hypot(obj.x - pans.rightX, obj.y - pans.rightY)
      );
      if (distToRightPan < 98) {
        obj.onRightPan = true;
        this.audio.playBrassWeightClink(this.state.activeCase.artifact.actualWeightG);
        this.state.scaleAngularVel += (this.state.activeCase.artifact.actualWeightG / 100) * 0.75;
        return;
      }

      // Otherwise keep it where dropped on the velvet mat (or clamp to mat bounds)
      obj.onRightPan = false;
      obj.targetX = clamp(dropX, 465, 845);
      obj.targetY = clamp(dropY, 255, 585);
      return;
    }

    // 3. Dropping the Assay Slip
    if (id === 'assay_slip') {
      obj.targetX = clamp(dropX, 510, 815);
      obj.targetY = clamp(dropY, 280, 565);
      this.audio.playParchmentSlide();
      return;
    }

    // 4. Dropping the Tuning Fork
    if (id === 'tuning_fork') {
      const art = this.objects.get('artifact');
      if (
        art &&
        (Math.hypot(dropX - art.x, dropY - art.y) < 98 ||
          Math.hypot(dropX - art.targetX, dropY - art.targetY) < 98)
      ) {
        this.strikeTuningFork();
      }
      obj.targetX = obj.homeX;
      obj.targetY = obj.homeY;
      return;
    }

    // 5. Dropping an Iron Stamp (CERTIFY or SEIZE)
    if (id === 'stamp_certify' || id === 'stamp_seize') {
      const slip = this.objects.get('assay_slip');
      // Check if over the Ink Pad
      if (
        dropX >= INK_PAD_RECT.x - 15 &&
        dropX <= INK_PAD_RECT.x + INK_PAD_RECT.w + 15 &&
        dropY >= INK_PAD_RECT.y - 15 &&
        dropY <= INK_PAD_RECT.y + INK_PAD_RECT.h + 15
      ) {
        obj.inkAmount = 1.0;
        this.audio.playInkPadSquelch();
        obj.targetX = obj.homeX;
        obj.targetY = obj.homeY;
        return;
      }

      // Check if slammed onto the Claimant's Assay Slip
      if (
        slip &&
        (Math.abs(dropX - slip.x) <= slip.width * 0.6 ||
          Math.abs(dropX - slip.targetX) <= slip.width * 0.6) &&
        (Math.abs(dropY - slip.y) <= slip.height * 0.6 ||
          Math.abs(dropY - slip.targetY) <= slip.height * 0.6)
      ) {
        const decision: DecisionType = id === 'stamp_certify' ? 'certify' : 'seize';
        this.state.stampMarks.push({
          type: decision,
          offsetX: clamp(dropX - slip.targetX, -45, 45),
          offsetY: clamp(dropY - slip.targetY, -70, 75),
          rotation: clamp(obj.rotation, -0.15, 0.15),
          alpha: 0.95,
        });

        // Mandatory Heavy Stamp Slam sensory feedback:
        // Low-pass noise burst + 65Hz sub-thud + 45ms hit-stop + directional camera jolt
        this.audio.playStampSlam();
        this.state.hitStopTimer = 0.045;
        this.state.cameraShakeVY = 16;
        this.state.cameraShakeVX = (decision === 'certify' ? -1 : 1) * 7;

        obj.targetX = obj.homeX;
        obj.targetY = obj.homeY;
        this.triggerDecision(decision);
        return;
      }

      obj.targetX = obj.homeX;
      obj.targetY = obj.homeY;
      return;
    }

    // 6. Loupe or UV Lens: allow leaving it resting over the velvet mat for hands-free reading,
    // or returning it to its brass cradle if dropped on the right side of the desk!
    if (id === 'loupe' || id === 'uv_lens') {
      if (dropX > 875) {
        obj.targetX = obj.homeX;
        obj.targetY = obj.homeY;
      } else {
        obj.targetX = clamp(dropX, 450, 860);
        obj.targetY = clamp(dropY, 240, 620);
      }
    }
  }

  public triggerDecision(decision: DecisionType, timedOut = false): void {
    if (this.state.phase !== 'inspecting' || this.state.pendingDecision) return;
    this.state.pendingDecision = decision;
    this.state.phase = 'stamping_exit';
    this.state.transitionTimer = 0.85;
    this.state.stickyNoteDismissed = true;

    const currentCase = this.state.activeCase;
    const art = currentCase.artifact;

    let coinsDelta = 0;
    let suspicionDelta = 0;
    let caughtDiscrepancy = false;
    let moralNote: string | undefined;

    if (art.isAuditorTrap) {
      // Special Night 3 Crown Auditor Entrapment Case
      if (decision === 'seize') {
        coinsDelta = art.basePayout;
        suspicionDelta = -1;
        caughtDiscrepancy = true;
        this.state.crownLoyalty += 2;
        moralNote = currentCase.specialOutcomeNotes?.onSeize;
      } else if (decision === 'certify') {
        coinsDelta = -15;
        suspicionDelta = 2;
        caughtDiscrepancy = false;
        moralNote = currentCase.specialOutcomeNotes?.onCertify;
      } else {
        coinsDelta = -20;
        suspicionDelta = 2;
        caughtDiscrepancy = false;
        moralNote = currentCase.specialOutcomeNotes?.onFence;
      }
    } else if (art.isMoralDilemma) {
      // Special Night 3 Desperate Mother & Child Case
      if (decision === 'certify') {
        coinsDelta = 18;
        suspicionDelta = 0;
        caughtDiscrepancy = true;
        this.state.mercyPoints += 2;
        moralNote = currentCase.specialOutcomeNotes?.onCertify;
      } else if (decision === 'seize') {
        coinsDelta = art.basePayout;
        suspicionDelta = 0;
        caughtDiscrepancy = true;
        this.state.crownLoyalty += 1;
        moralNote = currentCase.specialOutcomeNotes?.onSeize;
      } else {
        coinsDelta = art.fencePayout;
        suspicionDelta = 1;
        caughtDiscrepancy = true;
      }
    } else if (decision === 'fence') {
      // Slipped under the counter into the Smuggler's Drawer
      coinsDelta = art.fencePayout;
      suspicionDelta = 1;
      caughtDiscrepancy = !art.isGenuine || Boolean(art.isSyndicateRequest);
      this.state.syndicatePoints += art.isSyndicateRequest ? 2 : 1;
      moralNote =
        currentCase.specialOutcomeNotes?.onFence ??
        `Fenced via Smuggler’s Drawer (+${art.fencePayout}g, +1 Suspicion).`;
    } else if (decision === 'certify') {
      if (art.isGenuine) {
        coinsDelta = art.basePayout;
        caughtDiscrepancy = true;
        this.state.crownLoyalty += 1;
      } else {
        // Missed a forgery or curse!
        coinsDelta = -8;
        suspicionDelta = 1;
        caughtDiscrepancy = false;
        moralNote = `Missed Forgery Penalty (-8g, +1 Suspicion).`;
      }
    } else if (decision === 'seize') {
      if (timedOut) {
        coinsDelta = -5;
        suspicionDelta = 1;
        caughtDiscrepancy = false;
        moralNote = 'Claimant lost patience before inspection completed (-5g).';
      } else if (!art.isGenuine) {
        coinsDelta = art.basePayout;
        caughtDiscrepancy = true;
        this.state.crownLoyalty += 1;
        moralNote = currentCase.specialOutcomeNotes?.onSeize;
      } else {
        // Wrongfully confiscated a genuine item
        coinsDelta = -6;
        suspicionDelta = 1;
        caughtDiscrepancy = false;
        moralNote = 'Wrongful Confiscation of authentic item (-6g, +1 Suspicion).';
      }
    }

    this.state.sovereigns = Math.max(0, this.state.sovereigns + coinsDelta);
    this.state.suspicion = clamp(this.state.suspicion + suspicionDelta, 0, 5);
    this.state.trendingEnding = this.computeTrendingEnding();

    const record: NightCaseRecord = {
      claimantName: currentCase.claimantName,
      artifactName: art.name,
      decision,
      wasGenuine: art.isGenuine,
      caughtDiscrepancy,
      discrepancyText: art.discrepancySummary,
      coinsDelta,
      suspicionDelta,
      moralNote,
    };

    this.state.nightRecords.push(record);
    this.state.allRecords.push(record);

    // Slide artifact and slip out (either up to the window or down into the Smuggler's Drawer)
    const artObj = this.objects.get('artifact');
    const slipObj = this.objects.get('assay_slip');
    if (artObj) {
      artObj.onRightPan = false;
      artObj.targetX = decision === 'fence' ? 660 : 560;
      artObj.targetY = decision === 'fence' ? 730 : 145;
    }
    if (slipObj) {
      slipObj.targetX = 748;
      slipObj.targetY = 145;
    }
  }

  public computeTrendingEnding(): EndingId {
    if (this.state.suspicion >= 5 || this.state.sovereigns <= 0) {
      return 'newgate_prison';
    }
    if (this.state.syndicatePoints >= 3) {
      return 'syndicate_kingpin';
    }
    if (this.state.mercyPoints >= 2) {
      return 'guardian_of_exiles';
    }
    return 'crown_assessor';
  }

  private advanceToNextCaseOrNight(): void {
    const nightCases = getCasesForNight(this.state.night);
    const nextIdx = this.state.caseIndexInNight + 1;

    if (nextIdx < nightCases.length) {
      this.state.caseIndexInNight = nextIdx;
      this.loadCase(nightCases[nextIdx]);
    } else {
      // End of Night: Deduct Rent & Lamp Oil and slide out the Honest Post-Night Ledger
      this.state.lastNightRentCost = 12 + this.state.night * 2;
      this.state.lastNightOilCost = 5;
      const totalDeduction = this.state.lastNightRentCost + this.state.lastNightOilCost;
      this.state.sovereigns = Math.max(0, this.state.sovereigns - totalDeduction);
      this.state.trendingEnding = this.computeTrendingEnding();

      if (this.state.night >= 5 || this.state.suspicion >= 5) {
        this.state.phase = 'campaign_ending';
      } else {
        this.state.phase = 'night_summary';
      }
      this.audio.playParchmentSlide();
    }
  }

  public startNextNight(): void {
    this.state.night = Math.min(5, this.state.night + 1);
    this.state.caseIndexInNight = 0;
    this.state.nightRecords = [];
    const nightCases = getCasesForNight(this.state.night);
    if (nightCases.length > 0) {
      this.loadCase(nightCases[0]);
    }
  }

  public restartCampaign(): void {
    this.state.night = 1;
    this.state.caseIndexInNight = 0;
    this.state.sovereigns = 30;
    this.state.suspicion = 0;
    this.state.mercyPoints = 0;
    this.state.syndicatePoints = 0;
    this.state.crownLoyalty = 0;
    this.state.nightRecords = [];
    this.state.allRecords = [];
    this.state.stickyNoteDismissed = false;
    this.initDeskObjects();
    const firstCase = getCasesForNight(1)[0];
    if (firstCase) {
      this.loadCase(firstCase);
    }
  }
}
