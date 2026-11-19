import React, { useId } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, rand } from "./Camera";
import { INK, PALETTE } from "./palette";

export type EyeType = "normal" | "wide" | "squint" | "angry";
export type MouthType = "closed" | "half" | "scream" | "sad" | "smirk";
export type ArmPose = "idle" | "shock" | "explain" | "point" | "crossed";
export type BodyPosture = "neutral" | "lean-forward" | "recoil" | "slumped";
export type HairStyle = "crop" | "long" | "braid" | "bun" | "mohawk" | "bald";
export type GlassesStyle = "none" | "round" | "square" | "goggles";

export type CharacterProps = {
  /** Screen X of the character's centre (in px). */
  x: number;
  /** Screen Y of the character's feet line (in px). */
  y: number;
  scale?: number;
  flipX?: boolean;
  eyeType?: EyeType;
  /** Pupil shift inside the eye, in local units (-7 .. 7). */
  pupilOffset?: { x: number; y: number };
  mouthType?: MouthType;
  isTalking?: boolean;
  bodyColor?: string;
  skinColor?: string;
  hairColor?: string;
  /** Which side the sunset light hits: controls the rim light on the head. */
  sunSide?: "left" | "right";
  /** Draw the soft oval floor shadow. */
  shadow?: boolean;
  breathePhase?: number;

  /* ---------------- Advanced Character Acting ---------------- */

  /**
   * Five hand-authored arm performances with smooth two-joint bends and a
   * 3 px comic outline: relaxed idle, raised shock, open-palm explain,
   * extended point and defensive crossed arms.
   */
  armPose?: ArmPose;
  /** Torso plastic: neutral, lean-forward, recoil or slumped. */
  bodyPosture?: BodyPosture;
  /** Extra head tilt in degrees (negative = left, positive = right). */
  headTilt?: number;
  /**
   * Scene-space point to look at (same coordinate system as `x`/`y`).
   * When provided the character solves the gaze vector itself and turns the
   * pupils (plus a small head turn) toward that point.
   */
  lookAt?: { x: number; y: number };
  /** Reactive listening: light deterministic head nods every ~2.5 s. */
  isListening?: boolean;
  /**
   * Voice loudness 0..1 (usually `voiceAmplitude(speaker, frame)` from
   * `dialogueTimeline.ts`). Drives a continuous closed -> half -> scream mouth
   * opening instead of the 3-frame talk flip.
   */
  voiceAmplitude?: number;
  /** Seed for deterministic blinks / nods / gaze idle (no Math.random). */
  seed?: number;

  /* ---------------- Appearance / wardrobe ---------------- */

  hairStyle?: HairStyle;
  glasses?: GlassesStyle;
  hood?: boolean;
  backpack?: boolean;
  beard?: boolean;
  /** Optional beard tint; defaults to `hairColor` (grey beards read better darker). */
  beardColor?: string;
  /** Scarf / hood / backpack accent colour. */
  accentColor?: string;
};

const VW = 400;
const VH = 640;
const HEAD = { cx: 200, cy: 168, r: 92 };
const EYE_Y = 158;
const EYE_X = [168, 232];
const MOUTH = { cx: 200, cy: 214 };
const SHOULDER = { left: [146, 294] as const, right: [254, 294] as const };
const HIPS = { x: 200, y: 470 };

const STROKE = 3;

type ArmSpec = {
  elbow: readonly [number, number];
  wrist: readonly [number, number];
  hand?: "fist" | "open" | "palm" | "point";
};

/**
 * Arm choreography in local 400x640 units. Every pose is a shoulder -> elbow ->
 * wrist chain drawn with a single quadratic curve, so the joint stays smooth
 * at any scale. `front` lifts the arms over the torso (pointing, crossed, palm).
 */
const ARM_POSES: Record<ArmPose, { left: ArmSpec; right: ArmSpec; front: boolean }> = {
  idle: {
    left: { elbow: [106, 352], wrist: [110, 414], hand: "fist" },
    right: { elbow: [294, 352], wrist: [290, 412], hand: "fist" },
    front: false,
  },
  shock: {
    left: { elbow: [92, 302], wrist: [56, 232], hand: "open" },
    right: { elbow: [308, 302], wrist: [344, 232], hand: "open" },
    front: false,
  },
  explain: {
    left: { elbow: [112, 354], wrist: [118, 420], hand: "fist" },
    right: { elbow: [304, 318], wrist: [342, 258], hand: "palm" },
    front: true,
  },
  point: {
    left: { elbow: [108, 356], wrist: [116, 422], hand: "fist" },
    right: { elbow: [300, 332], wrist: [366, 314], hand: "point" },
    front: true,
  },
  crossed: {
    left: { elbow: [134, 368], wrist: [242, 330], hand: "fist" },
    right: { elbow: [266, 368], wrist: [158, 330], hand: "fist" },
    front: true,
  },
};

const POSTURES: Record<
  BodyPosture,
  { rot: number; dx: number; dy: number; scaleY: number; headDy: number }
> = {
  neutral: { rot: 0, dx: 0, dy: 0, scaleY: 1, headDy: 0 },
  "lean-forward": { rot: 2.4, dx: 2, dy: 4, scaleY: 0.99, headDy: 5 },
  recoil: { rot: -3.6, dx: -2, dy: -6, scaleY: 1.01, headDy: -5 },
  slumped: { rot: -1.4, dx: 0, dy: 12, scaleY: 0.975, headDy: 9 },
};

/**
 * Deterministic blink: 3-4 closed frames, random-looking gaps from `rand`.
 * Returns 0 = open, 1 = fully closed (edges are partial for a natural flick).
 */
const BLINK_GAP_MIN = 58;
const BLINK_GAP_VAR = 86;

const blinkAmount = (frame: number, seed: number): number => {
  let start = 24 + Math.floor(rand(seed, 7) * 46);
  let index = 0;
  while (start <= frame) {
    const length = 3 + Math.floor(rand(seed, 101 + index) * 2); // 3 or 4 frames
    if (frame >= start && frame < start + length) {
      const local = frame - start;
      return local === 0 || local === length - 1 ? 0.55 : 1;
    }
    start += BLINK_GAP_MIN + Math.floor(rand(seed, 17 + index) * BLINK_GAP_VAR);
    index += 1;
  }
  return 0;
};

export const Character: React.FC<CharacterProps> = ({
  x,
  y,
  scale = 1,
  flipX = false,
  eyeType = "normal",
  pupilOffset = { x: 0, y: 0 },
  mouthType = "closed",
  isTalking = false,
  bodyColor = PALETTE.jacketBlue,
  skinColor = PALETTE.skin,
  hairColor = PALETTE.hair,
  sunSide = "left",
  shadow = true,
  breathePhase = 0,
  armPose = "idle",
  bodyPosture = "neutral",
  headTilt = 0,
  lookAt,
  isListening = false,
  voiceAmplitude,
  seed = 0,
  hairStyle = "crop",
  glasses = "none",
  hood = false,
  backpack = false,
  beard = false,
  beardColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const uid = useId().replace(/:/g, "");

  // --- living micro-motion -------------------------------------------------
  const breathe = Math.sin(t * 1.5 + breathePhase) * 3.2;
  const sway = Math.sin(t * 0.85 + breathePhase) * 0.75;
  const headBob = Math.sin(t * 1.5 + breathePhase + 0.5) * 1.8;
  const headSway = Math.sin(t * 0.95 + breathePhase + 1.1) * 1.5;
  const talkNod = isTalking ? Math.sin(frame * 0.42 + breathePhase) * 2.2 : 0;
  const talkTilt = isTalking ? Math.sin(frame * 0.55 + breathePhase) * 1.4 : 0;

  // --- reactive listening nods --------------------------------------------
  const nodOffset = Math.floor(rand(seed, 3) * 46);
  const nodClock = frame + nodOffset;
  const nodCycle = Math.floor(nodClock / 76);
  const nodLocal = nodClock % 76;
  const nodStrength = 2.4 + rand(seed, 700 + nodCycle) * 3.2;
  const listenNod =
    isListening && nodLocal < 13
      ? Math.sin((nodLocal / 13) * Math.PI) * nodStrength
      : 0;

  // --- blink ---------------------------------------------------------------
  const blink = blinkAmount(frame, seed);
  const eyeScaleY = 1 - blink * 0.92;

  // --- gaze: lookAt solves the vector, pupilOffset is the manual fallback ----
  const gazeJitter = isTalking ? Math.sin(frame * 0.8 + breathePhase) * 1.1 : 0;
  let px = clamp(pupilOffset.x, -7, 7) + gazeJitter;
  let py = clamp(pupilOffset.y, -7, 7) + gazeJitter * 0.4;
  let lookTilt = 0;

  if (lookAt) {
    // Head centre in stage coordinates: local (200, 168) -> screen.
    const headX = x;
    const headY = y - (VH - HEAD.cy) * scale;
    const dx = lookAt.x - headX;
    const dy = lookAt.y - headY;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      const reach = clamp(240 / Math.max(240, dist / Math.max(scale, 0.2)), 0.32, 1);
      const worldPx = (dx / dist) * 7 * reach;
      // flipX mirrors the artwork, so local X must be mirrored back.
      px = clamp(flipX ? -worldPx : worldPx, -7, 7);
      py = clamp((dy / dist) * 7 * reach, -7, 7);
      const screenTilt = clamp((dx / Math.max(1, dist)) * 6, -6, 6);
      // The head group is mirrored by flipX, so local rotation must be mirrored too.
      lookTilt = flipX ? -screenTilt : screenTilt;
    }
  } else {
    px = clamp(px, -7, 7);
    py = clamp(py, -7, 7);
  }

  const pupilShrink = eyeType === "wide" ? 0.72 : eyeType === "angry" ? 0.85 : 1;

  // --- voice-driven mouth ---------------------------------------------------
  const hasVoice = voiceAmplitude !== undefined;
  const amplitude = clamp(voiceAmplitude ?? 0, 0, 1);
  const voiceOpen = clamp((amplitude - 0.03) / 0.72, 0, 1);

  const talkFlip = Math.floor(frame / 3) % 2 === 0;
  // While talking, keep the character's signature smirk instead of resetting it.
  const talkClosed: MouthType = mouthType === "smirk" ? "smirk" : "closed";
  const flipMouth: MouthType = isTalking ? (talkFlip ? talkClosed : "half") : mouthType;
  const restingMouth: MouthType = hasVoice && amplitude > 0.03 ? "half" : mouthType;
  const mouth: MouthType = hasVoice ? restingMouth : flipMouth;

  // sunSide is expressed in screen space; flipX mirrors the artwork, so swap it here.
  const light = flipX ? (sunSide === "left" ? "right" : "left") : sunSide;

  const headClip = `head-${uid}`;
  const bodyClip = `body-${uid}`;
  const shadowGrad = `shadow-${uid}`;
  const faceLight = `faceLight-${uid}`;

  const hoodColor = accentColor ?? bodyColor;
  const packColor = accentColor ?? "#3A3550";
  const posture = POSTURES[bodyPosture];
  const arm = ARM_POSES[armPose];
  const screenHeadTilt = flipX ? -headTilt : headTilt;
  const headRotation = screenHeadTilt + headSway + talkTilt + lookTilt;
  const headShiftY = headBob + posture.headDy + talkNod + listenNod;

  const eye = (cx: number, i: number) => {
    const dir = i === 0 ? -1 : 1;

    return (
      <g key={cx}>
        <g
          transform={`translate(${cx} ${EYE_Y}) scale(1 ${eyeScaleY.toFixed(4)}) translate(${-cx} ${-EYE_Y})`}
        >
          {eyeType === "squint" ? (
            <>
              {/* narrow lens-shaped eye: both lids close in */}
              <path
                d={`M ${cx - 20} ${EYE_Y - 1} Q ${cx} ${EYE_Y - 10} ${cx + 20} ${EYE_Y - 1} Q ${cx} ${EYE_Y + 9} ${cx - 20} ${EYE_Y - 1} Z`}
                fill="#FFF7ED"
                stroke={INK}
                strokeWidth={STROKE}
                strokeLinejoin="round"
              />
              <circle cx={cx + px * 0.75} cy={EYE_Y - 0.5 + py * 0.4} r={5.9 * pupilShrink} fill="#0E0B14" />
            </>
          ) : eyeType === "wide" ? (
            <>
              <ellipse cx={cx} cy={EYE_Y} rx={24} ry={28} fill="#FFF7ED" stroke={INK} strokeWidth={STROKE} />
              <circle cx={cx + px} cy={EYE_Y + py} r={5.6} fill="#0E0B14" />
              <circle cx={cx + px - 1.8} cy={EYE_Y + py - 2.2} r={1.7} fill="#FFFFFF" opacity={0.9} />
            </>
          ) : (
            <>
              {/* normal + angry share the eye shape */}
              <ellipse cx={cx} cy={EYE_Y} rx={18} ry={21} fill="#FFF7ED" stroke={INK} strokeWidth={STROKE} />
              <circle cx={cx + px} cy={EYE_Y + py} r={7.2 * pupilShrink} fill="#0E0B14" />
              <circle cx={cx + px - 2} cy={EYE_Y + py - 2.4} r={1.9} fill="#FFFFFF" opacity={0.85} />
              {eyeType === "angry" ? (
                <path
                  d={`M ${cx + 21 * dir} ${EYE_Y - 33} L ${cx - 16 * dir} ${EYE_Y - 23}`}
                  fill="none"
                  stroke={INK}
                  strokeWidth={9}
                  strokeLinecap="round"
                />
              ) : null}
            </>
          )}
        </g>
        {blink > 0.45 ? (
          <path
            d={`M ${cx - 21} ${EYE_Y + 1} Q ${cx} ${EYE_Y + 9} ${cx + 21} ${EYE_Y + 1}`}
            fill="none"
            stroke={INK}
            strokeWidth={STROKE + 1.2}
            strokeLinecap="round"
          />
        ) : null}
      </g>
    );
  };

  const mouthShape = (type: MouthType) => {
    const { cx, cy } = MOUTH;
    switch (type) {
      case "half":
        return (
          <g>
            <path
              d={`M ${cx - 15} ${cy - 4} Q ${cx} ${cy + 14} ${cx + 15} ${cy - 4} L ${cx + 14} ${cy - 8} L ${cx - 14} ${cy - 8} Z`}
              fill="#2A0A16"
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
            <path d={`M ${cx - 10} ${cy + 1} Q ${cx} ${cy + 8} ${cx + 10} ${cy + 1}`} fill="#C4536B" />
            <path
              d={`M ${cx - 14} ${cy - 8} L ${cx + 14} ${cy - 8}`}
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          </g>
        );
      case "scream":
        return (
          <g>
            <ellipse cx={cx} cy={cy + 4} rx={19} ry={26} fill="#2A0A16" stroke={INK} strokeWidth={STROKE} />
            <ellipse cx={cx} cy={cy + 17} rx={11} ry={8} fill="#B8475F" />
            <ellipse cx={cx} cy={cy - 12} rx={12} ry={4} fill="#5C1830" opacity={0.8} />
          </g>
        );
      case "sad":
        return (
          <path
            d={`M ${cx - 20} ${cy + 6} Q ${cx} ${cy - 8} ${cx + 20} ${cy + 6}`}
            fill="none"
            stroke={INK}
            strokeWidth={5}
            strokeLinecap="round"
          />
        );
      case "smirk":
        return (
          <g>
            <path
              d={`M ${cx - 22} ${cy + 6} Q ${cx - 4} ${cy + 20} ${cx + 20} ${cy - 6}`}
              fill="none"
              stroke={INK}
              strokeWidth={5}
              strokeLinecap="round"
            />
            <path
              d={`M ${cx + 20} ${cy - 6} Q ${cx + 25} ${cy - 12} ${cx + 21} ${cy - 17}`}
              fill="none"
              stroke={INK}
              strokeWidth={4}
              strokeLinecap="round"
            />
          </g>
        );
      case "closed":
      default:
        return (
          <path
            d={`M ${cx - 19} ${cy - 2} Q ${cx} ${cy + 8} ${cx + 19} ${cy - 2}`}
            fill="none"
            stroke={INK}
            strokeWidth={5}
            strokeLinecap="round"
          />
        );
    }
  };

  /**
   * Continuous voice mouth: the same silhouette morphs from a thin line to the
   * scream ellipse, so `voiceAmplitude` never snaps between three fixed shapes.
   */
  const voiceMouth = (open: number) => {
    const { cx, cy } = MOUTH;
    const rx = 12 + 8 * open;
    const ry = 3 + 24 * open;
    const cyMouth = cy + 4 * open;
    return (
      <g>
        <ellipse
          cx={cx}
          cy={cyMouth}
          rx={rx}
          ry={ry}
          fill="#2A0A16"
          stroke={INK}
          strokeWidth={STROKE}
        />
        {open > 0.28 ? (
          <ellipse
            cx={cx}
            cy={cyMouth + ry * 0.56}
            rx={rx * 0.62}
            ry={Math.min(9, ry * 0.34)}
            fill="#B8475F"
          />
        ) : null}
        {open > 0.7 ? (
          <ellipse
            cx={cx}
            cy={cyMouth - ry * 0.46}
            rx={rx * 0.64}
            ry={4}
            fill="#5C1830"
            opacity={0.8}
          />
        ) : null}
        <path
          d={`M ${cx - rx * 0.9} ${cyMouth - ry * 0.92} L ${cx + rx * 0.9} ${cyMouth - ry * 0.92}`}
          stroke={INK}
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
      </g>
    );
  };

  const renderHand = (spec: ArmSpec) => {
    const [ex, ey] = spec.elbow;
    const [wx, wy] = spec.wrist;
    const angle = Math.atan2(wy - ey, wx - ex);
    const kind = spec.hand ?? "fist";

    if (kind === "point") {
      const tipX = wx + Math.cos(angle) * 32;
      const tipY = wy + Math.sin(angle) * 32;
      return (
        <g>
          <path
            d={`M ${wx} ${wy} L ${tipX} ${tipY}`}
            stroke={INK}
            strokeWidth={11}
            strokeLinecap="round"
          />
          <path
            d={`M ${wx} ${wy} L ${tipX} ${tipY}`}
            stroke={skinColor}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <circle cx={wx} cy={wy} r={15} fill={skinColor} stroke={INK} strokeWidth={STROKE} />
        </g>
      );
    }

    if (kind === "open" || kind === "palm") {
      const spread = kind === "open" ? [-0.58, -0.2, 0.16, 0.52] : [-0.42, 0, 0.42];
      const length = kind === "open" ? 21 : 17;
      const fingers = spread.map((offset, i) => {
        const a = angle + offset;
        return {
          i,
          x1: wx + Math.cos(a) * 7,
          y1: wy + Math.sin(a) * 7,
          x2: wx + Math.cos(a) * length,
          y2: wy + Math.sin(a) * length,
        };
      });
      return (
        <g>
          {fingers.map((f) => (
            <path
              key={`fi-${f.i}`}
              d={`M ${f.x1} ${f.y1} L ${f.x2} ${f.y2}`}
              stroke={INK}
              strokeWidth={9}
              strokeLinecap="round"
            />
          ))}
          {fingers.map((f) => (
            <path
              key={`fs-${f.i}`}
              d={`M ${f.x1} ${f.y1} L ${f.x2} ${f.y2}`}
              stroke={skinColor}
              strokeWidth={4}
              strokeLinecap="round"
            />
          ))}
          <circle cx={wx} cy={wy} r={15} fill={skinColor} stroke={INK} strokeWidth={STROKE} />
        </g>
      );
    }

    return (
      <g>
        <circle cx={wx} cy={wy} r={16} fill={skinColor} stroke={INK} strokeWidth={STROKE} />
        <path
          d={`M ${wx - 8} ${wy + 2} Q ${wx} ${wy + 10} ${wx + 8} ${wy + 2}`}
          fill="none"
          stroke={INK}
          strokeWidth={2}
          opacity={0.45}
          strokeLinecap="round"
        />
      </g>
    );
  };

  const renderArm = (side: "left" | "right") => {
    const spec = arm[side];
    const [sx, sy] = SHOULDER[side];
    const [ex, ey] = spec.elbow;
    const [wx, wy] = spec.wrist;
    const d = `M ${sx} ${sy} Q ${ex} ${ey} ${wx} ${wy}`;
    return (
      <g key={side}>
        <path
          d={d}
          fill="none"
          stroke={INK}
          strokeWidth={29}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={d}
          fill="none"
          stroke={bodyColor}
          strokeWidth={23}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* soft sleeve shading at the elbow joint */}
        <circle cx={ex} cy={ey} r={10} fill="#0E0B16" opacity={0.12} />
        {renderHand(spec)}
      </g>
    );
  };

  const hairBack = () => {
    if (hairStyle !== "long") return null;
    return (
      <path
        d="M 100 164 C 100 74 146 46 200 46 C 254 46 300 74 300 164 L 308 306 C 292 320 274 310 268 288 L 264 190 L 136 190 L 132 288 C 126 310 108 320 92 306 Z"
        fill={hairColor}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    );
  };

  const hairFront = () => {
    switch (hairStyle) {
      case "long":
        return (
          <>
            <path
              d="M 104 148 C 112 84 150 56 200 56 C 250 56 288 84 296 148 C 288 196 278 226 264 246 C 268 198 256 170 232 156 C 222 146 212 142 200 142 C 168 142 142 156 120 176 C 112 190 108 214 110 246 C 96 222 96 180 104 148 Z"
              fill={hairColor}
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
            <path
              d="M 118 130 Q 130 96 168 78"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={4}
              opacity={0.07}
              strokeLinecap="round"
            />
          </>
        );
      case "bun":
        return (
          <>
            <path
              d="M 110 152 C 116 92 154 66 200 66 C 246 66 284 94 290 152 C 264 130 236 120 200 120 C 164 120 136 130 110 152 Z"
              fill={hairColor}
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
            <ellipse cx={200} cy={44} rx={34} ry={30} fill={hairColor} stroke={INK} strokeWidth={STROKE} />
            <path d="M 180 36 Q 200 20 222 36" fill="none" stroke="#FFFFFF" strokeWidth={4} opacity={0.08} />
          </>
        );
      case "mohawk":
        return (
          <>
            <path
              d="M 184 158 L 178 96 L 190 118 L 196 58 L 208 112 L 220 82 L 224 158 Z"
              fill={hairColor}
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
            <path
              d="M 112 158 C 120 142 132 132 146 128"
              fill="none"
              stroke={INK}
              strokeWidth={STROKE}
              opacity={0.5}
            />
            <path
              d="M 288 158 C 280 142 268 132 254 128"
              fill="none"
              stroke={INK}
              strokeWidth={STROKE}
              opacity={0.5}
            />
          </>
        );
      case "bald":
        return (
          <path
            d="M 126 116 C 142 80 170 66 200 66 C 232 66 262 82 276 118"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={5}
            opacity={0.12}
            strokeLinecap="round"
          />
        );
      case "braid":
        return (
          <>
            <path
              d="M 110 152 C 116 92 154 66 200 66 C 246 66 284 94 290 152 C 264 130 236 120 200 120 C 164 120 136 130 110 152 Z"
              fill={hairColor}
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
            {[0, 1, 2, 3, 4].map((i) => (
              <ellipse
                key={`braid-${i}`}
                cx={280 + i * 6 + (i % 2 === 0 ? -3 : 3)}
                cy={198 + i * 27}
                rx={12}
                ry={16}
                fill={i % 2 === 0 ? hairColor : "#2A1F33"}
                stroke={INK}
                strokeWidth={STROKE}
              />
            ))}
            <circle cx={300} cy={336} r={8} fill={hairColor} stroke={INK} strokeWidth={STROKE} />
          </>
        );
      case "crop":
      default:
        return (
          <>
            <path
              d="M 110 152 C 116 92 154 66 200 66 C 246 66 284 94 290 152 C 264 130 236 120 200 120 C 164 120 136 130 110 152 Z"
              fill={hairColor}
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
            <path
              d="M 118 130 Q 130 96 168 78"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={4}
              opacity={0.07}
              strokeLinecap="round"
            />
          </>
        );
    }
  };

  const glassesNode = () => {
    if (glasses === "none") return null;
    if (glasses === "goggles") {
      return (
        <g>
          {/* side straps only: a full band would cut across the pupils */}
          <path d="M 136 158 L 102 150" stroke={INK} strokeWidth={10} strokeLinecap="round" opacity={0.9} />
          <path d="M 136 158 L 102 150" stroke={accentColor ?? "#6E5A3A"} strokeWidth={4} strokeLinecap="round" />
          <path d="M 264 158 L 298 150" stroke={INK} strokeWidth={10} strokeLinecap="round" opacity={0.9} />
          <path d="M 264 158 L 298 150" stroke={accentColor ?? "#6E5A3A"} strokeWidth={4} strokeLinecap="round" />
          <ellipse cx={168} cy={158} rx={33} ry={33} fill="#8FE3F0" fillOpacity={0.12} stroke={INK} strokeWidth={STROKE} />
          <ellipse cx={232} cy={158} rx={33} ry={33} fill="#8FE3F0" fillOpacity={0.12} stroke={INK} strokeWidth={STROKE} />
          <path d="M 196 156 L 204 156" stroke={INK} strokeWidth={STROKE} />
          <path d="M 136 136 C 150 126 162 124 176 128" fill="none" stroke="#FFFFFF" strokeWidth={3} opacity={0.4} />
        </g>
      );
    }
    if (glasses === "round") {
      return (
        <g>
          <circle cx={EYE_X[0]} cy={EYE_Y} r={27} fill="#9CD8FF" fillOpacity={0.12} stroke={INK} strokeWidth={STROKE} />
          <circle cx={EYE_X[1]} cy={EYE_Y} r={27} fill="#9CD8FF" fillOpacity={0.12} stroke={INK} strokeWidth={STROKE} />
          <path d={`M ${EYE_X[0] + 27} ${EYE_Y} L ${EYE_X[1] - 27} ${EYE_Y}`} stroke={INK} strokeWidth={STROKE} />
          <path d={`M ${EYE_X[0] - 27} ${EYE_Y - 2} L 110 150`} stroke={INK} strokeWidth={STROKE} />
          <path d={`M ${EYE_X[1] + 27} ${EYE_Y - 2} L 290 150`} stroke={INK} strokeWidth={STROKE} />
        </g>
      );
    }
    return (
      <g>
        <rect x={140} y={136} width={56} height={44} rx={9} fill="#9CD8FF" fillOpacity={0.12} stroke={INK} strokeWidth={STROKE} />
        <rect x={204} y={136} width={56} height={44} rx={9} fill="#9CD8FF" fillOpacity={0.12} stroke={INK} strokeWidth={STROKE} />
        <path d="M 196 156 L 204 156" stroke={INK} strokeWidth={STROKE} />
        <path d="M 140 152 L 112 146" stroke={INK} strokeWidth={STROKE} />
        <path d="M 260 152 L 288 146" stroke={INK} strokeWidth={STROKE} />
      </g>
    );
  };

  const armsBehind = !arm.front;
  const armsFront = arm.front;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: VW * scale,
        height: VH * scale,
        transform: `translate(-50%, -100%)${flipX ? " scaleX(-1)" : ""}`,
        transformOrigin: "50% 100%",
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id={shadowGrad}>
            <stop offset="0%" stopColor="#08060D" stopOpacity={0.5} />
            <stop offset="45%" stopColor="#08060D" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#08060D" stopOpacity={0} />
          </radialGradient>
          <radialGradient
            id={`shade-${uid}`}
            cx={light === "left" ? "76%" : "24%"}
            cy="64%"
            r="66%"
          >
            <stop offset="0%" stopColor="#2A1B3E" stopOpacity={0.42} />
            <stop offset="55%" stopColor="#2A1B3E" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#2A1B3E" stopOpacity={0} />
          </radialGradient>
          <clipPath id={headClip}>
            <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r - 1} />
          </clipPath>
          <clipPath id={bodyClip}>
            <path d="M 200 250 C 240 250 264 266 270 296 L 283 418 C 285 442 250 454 200 454 C 150 454 115 442 117 418 L 130 296 C 136 266 160 250 200 250 Z" />
          </clipPath>
        </defs>

        {shadow ? (
          <ellipse cx={200} cy={634} rx={146} ry={24} fill={`url(#${shadowGrad})`} />
        ) : null}

        <g
          transform={`translate(0 ${breathe}) rotate(${sway} 200 630)`}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {/* ---------- legs ---------- */}
          <g>
            <path d="M 170 430 Q 158 520 156 606" fill="none" stroke={INK} strokeWidth={33} />
            <path d="M 230 430 Q 242 520 244 606" fill="none" stroke={INK} strokeWidth={33} />
            <path d="M 170 430 Q 158 520 156 606" fill="none" stroke="#243052" strokeWidth={27} />
            <path d="M 230 430 Q 242 520 244 606" fill="none" stroke="#243052" strokeWidth={27} />
            <path d="M 168 560 L 158 560 M 232 560 L 242 560" stroke={INK} strokeWidth={2} opacity={0.4} />
            <ellipse cx={152} cy={614} rx={32} ry={16} fill="#15111D" stroke={INK} strokeWidth={STROKE} />
            <ellipse cx={248} cy={614} rx={32} ry={16} fill="#15111D" stroke={INK} strokeWidth={STROKE} />
          </g>

          {/* ---------- upper body: posture plastic ---------- */}
          <g
            transform={`translate(${posture.dx} ${posture.dy}) rotate(${posture.rot} ${HIPS.x} ${HIPS.y}) translate(${HIPS.x} ${HIPS.y}) scale(1 ${posture.scaleY}) translate(${-HIPS.x} ${-HIPS.y})`}
          >
            {/* backpack body sits behind the torso */}
            {backpack ? (
              <g>
                <path
                  d="M 138 288 C 96 296 84 342 90 394 C 94 430 114 450 142 450 L 142 288 Z"
                  fill={packColor}
                  stroke={INK}
                  strokeWidth={STROKE}
                  strokeLinejoin="round"
                />
                <path
                  d="M 262 288 C 304 296 316 342 310 394 C 306 430 286 450 258 450 L 258 288 Z"
                  fill={packColor}
                  stroke={INK}
                  strokeWidth={STROKE}
                  strokeLinejoin="round"
                />
                <path d="M 102 356 L 138 364" stroke={INK} strokeWidth={2} opacity={0.35} />
                <path d="M 298 356 L 262 364" stroke={INK} strokeWidth={2} opacity={0.35} />
              </g>
            ) : null}

            {/* ---------- arms behind torso ---------- */}
            {armsBehind ? (
              <g>
                {renderArm("left")}
                {renderArm("right")}
              </g>
            ) : null}

            {/* ---------- torso ---------- */}
            <g>
              <path
                d="M 200 250 C 240 250 264 266 270 296 L 283 418 C 285 442 250 454 200 454 C 150 454 115 442 117 418 L 130 296 C 136 266 160 250 200 250 Z"
                fill={bodyColor}
                stroke={INK}
                strokeWidth={STROKE}
              />
              {/* jacket shading + seam */}
              <g clipPath={`url(#${bodyClip})`}>
                <path d="M 232 240 L 300 300 L 300 470 L 244 470 Z" fill="#0E0B16" opacity={0.14} />
                <path d="M 122 404 L 300 352 L 300 380 L 122 440 Z" fill="#0E0B16" opacity={0.12} />
                <path d="M 150 260 L 200 250 L 236 262 L 128 316 Z" fill="#FFFFFF" opacity={0.06} />
                {/* warm rim light on the sunlit edge */}
                <path
                  d={light === "left" ? "M 131 290 L 118 418" : "M 269 292 L 282 416"}
                  stroke="#FF9E6A"
                  strokeWidth={6}
                  opacity={0.3}
                />
                <path
                  d={light === "left" ? "M 269 292 L 282 416" : "M 131 290 L 118 418"}
                  stroke="#FF9E6A"
                  strokeWidth={3}
                  opacity={0.12}
                />
              </g>
              <path d="M 200 292 L 200 452" stroke="#0B0710" strokeWidth={2.4} opacity={0.4} />
              <path d="M 170 262 Q 200 296 230 262" fill="none" stroke="#0B0710" strokeWidth={STROKE} opacity={0.5} />
              <path d="M 138 300 L 133 420" stroke="#FFFFFF" strokeWidth={3} opacity={0.07} />

              {/* backpack straps over the shoulders */}
              {backpack ? (
                <g>
                  <path d="M 156 298 L 176 424" stroke={INK} strokeWidth={10} strokeLinecap="round" />
                  <path d="M 156 298 L 176 424" stroke={packColor} strokeWidth={5} strokeLinecap="round" />
                  <path d="M 244 298 L 224 424" stroke={INK} strokeWidth={10} strokeLinecap="round" />
                  <path d="M 244 298 L 224 424" stroke={packColor} strokeWidth={5} strokeLinecap="round" />
                </g>
              ) : null}

              {/* hood collar / scarf */}
              {hood ? (
                <path
                  d="M 128 292 C 152 258 248 258 272 292 C 252 320 148 320 128 292 Z"
                  fill={hoodColor}
                  stroke={INK}
                  strokeWidth={STROKE}
                  strokeLinejoin="round"
                />
              ) : null}
              {accentColor && !hood ? (
                <g>
                  <path
                    d="M 174 248 C 184 262 216 262 226 248 L 232 268 C 210 282 190 282 168 268 Z"
                    fill={accentColor}
                    stroke={INK}
                    strokeWidth={STROKE}
                    strokeLinejoin="round"
                  />
                  <path d="M 214 262 L 228 300 L 216 306 L 204 270 Z" fill={accentColor} stroke={INK} strokeWidth={STROKE} />
                </g>
              ) : null}
            </g>

            {/* ---------- arms in front of torso ---------- */}
            {armsFront ? (
              <g>
                {renderArm("left")}
                {renderArm("right")}
              </g>
            ) : null}

            {/* ---------- neck ---------- */}
            <g>
              <rect x={186} y={212} width={28} height={44} rx={8} fill={skinColor} stroke={INK} strokeWidth={STROKE} />
            </g>

            {/* ---------- head ---------- */}
            <g transform={`translate(0 ${headShiftY}) rotate(${headRotation} 200 250)`}>
              {hood ? (
                <path
                  d="M 94 168 C 94 74 140 32 200 32 C 260 32 306 74 306 168 C 306 208 294 236 274 254 L 126 254 C 106 236 94 208 94 168 Z"
                  fill={hoodColor}
                  stroke={INK}
                  strokeWidth={STROKE}
                  strokeLinejoin="round"
                />
              ) : null}

              {hairBack()}

              <circle cx={110} cy={176} r={15} fill={skinColor} stroke={INK} strokeWidth={STROKE} />
              <circle cx={290} cy={176} r={15} fill={skinColor} stroke={INK} strokeWidth={STROKE} />
              <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={skinColor} stroke={INK} strokeWidth={STROKE} />

              <g clipPath={`url(#${headClip})`}>
                {/* cool shadow from the night side */}
                <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={`url(#shade-${uid})`} />
                {/* warm sky light */}
                <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={`url(#${faceLight})`} />
                {/* crisp rim light on the sun side */}
                <path
                  d={
                    light === "left"
                      ? `M 152 90 A 92 92 0 0 0 110 168`
                      : `M 248 90 A 92 92 0 0 1 290 168`
                  }
                  fill="none"
                  stroke="#FFC08F"
                  strokeWidth={6}
                  opacity={0.5}
                />

                {beard ? (
                  <g>
                    <path
                      d="M 128 194 C 138 250 166 274 200 274 C 234 274 262 250 272 194 C 254 216 230 226 200 226 C 170 226 146 216 128 194 Z"
                      fill={beardColor ?? hairColor}
                      stroke={INK}
                      strokeWidth={STROKE}
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 166 206 Q 200 214 234 206"
                      fill="none"
                      stroke={beardColor ?? hairColor}
                      strokeWidth={9}
                      strokeLinecap="round"
                    />
                  </g>
                ) : null}
              </g>

              {hairFront()}

              {/* face layers */}
              {eye(EYE_X[0], 0)}
              {eye(EYE_X[1], 1)}
              {glassesNode()}
              {hasVoice && voiceOpen > 0.05 ? voiceMouth(voiceOpen) : mouthShape(mouth)}

              {hood ? (
                <>
                  <path
                    d="M 100 152 C 106 82 148 50 200 50 C 252 50 294 82 300 152 C 272 124 238 112 200 112 C 162 112 128 124 100 152 Z"
                    fill={hoodColor}
                    stroke={INK}
                    strokeWidth={STROKE}
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 100 152 C 96 196 108 232 128 252"
                    fill="none"
                    stroke={INK}
                    strokeWidth={STROKE + 2}
                    strokeLinecap="round"
                  />
                  <path
                    d="M 300 152 C 304 196 292 232 272 252"
                    fill="none"
                    stroke={INK}
                    strokeWidth={STROKE + 2}
                    strokeLinecap="round"
                  />
                </>
              ) : null}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
