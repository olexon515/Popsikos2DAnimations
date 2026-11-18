import React, { useId } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { clamp } from "./Camera";
import { INK, PALETTE } from "./palette";

export type EyeType = "normal" | "wide" | "squint" | "angry";
export type MouthType = "closed" | "half" | "scream" | "sad" | "smirk";

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
};

const VW = 400;
const VH = 640;
const HEAD = { cx: 200, cy: 168, r: 92 };
const EYE_Y = 158;
const EYE_X = [168, 232];
const MOUTH = { cx: 200, cy: 214 };

const STROKE = 3;

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
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const uid = useId().replace(/:/g, "");

  // --- living micro-motion -------------------------------------------------
  const breathe = Math.sin(t * 1.5 + breathePhase) * 3.2;
  const sway = Math.sin(t * 0.85 + breathePhase) * 0.75;
  const headBob = Math.sin(t * 1.5 + breathePhase + 0.5) * 1.8;
  const headTilt = Math.sin(t * 0.95 + breathePhase + 1.1) * 1.5;

  // --- talking mouth -------------------------------------------------------
  const talkFlip = Math.floor(frame / 3) % 2 === 0;
  // While talking, keep the character's signature smirk instead of resetting it.
  const talkClosed: MouthType = mouthType === "smirk" ? "smirk" : "closed";
  const mouth: MouthType = isTalking ? (talkFlip ? talkClosed : "half") : mouthType;

  const px = clamp(pupilOffset.x, -7, 7);
  const py = clamp(pupilOffset.y, -7, 7);
  const pupilShrink = eyeType === "wide" ? 0.72 : eyeType === "angry" ? 0.85 : 1;

  // sunSide is expressed in screen space; flipX mirrors the artwork, so swap it here.
  const light = flipX ? (sunSide === "left" ? "right" : "left") : sunSide;

  const headClip = `head-${uid}`;
  const bodyClip = `body-${uid}`;
  const shadowGrad = `shadow-${uid}`;
  const faceLight = `faceLight-${uid}`;

  const eye = (cx: number, i: number) => {
    const dir = i === 0 ? -1 : 1;

    if (eyeType === "squint") {
      return (
        <g key={cx}>
          {/* narrow lens-shaped eye: both lids close in */}
          <path
            d={`M ${cx - 20} ${EYE_Y - 1} Q ${cx} ${EYE_Y - 10} ${cx + 20} ${EYE_Y - 1} Q ${cx} ${EYE_Y + 9} ${cx - 20} ${EYE_Y - 1} Z`}
            fill="#FFF7ED"
            stroke={INK}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          <circle cx={cx + px * 0.75} cy={EYE_Y - 0.5 + py * 0.4} r={5.9 * pupilShrink} fill="#0E0B14" />
        </g>
      );
    }

    if (eyeType === "wide") {
      return (
        <g key={cx}>
          <ellipse cx={cx} cy={EYE_Y} rx={24} ry={28} fill="#FFF7ED" stroke={INK} strokeWidth={STROKE} />
          <circle cx={cx + px} cy={EYE_Y + py} r={5.6} fill="#0E0B14" />
          <circle cx={cx + px - 1.8} cy={EYE_Y + py - 2.2} r={1.7} fill="#FFFFFF" opacity={0.9} />
        </g>
      );
    }

    // normal + angry share the eye shape
    return (
      <g key={cx}>
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
      </g>
    );
  };

  const mouthShape = () => {
    const { cx, cy } = MOUTH;
    switch (mouth) {
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

          {/* ---------- arms (behind torso) ---------- */}
          <g>
            <path d="M 146 294 Q 106 352 110 414" fill="none" stroke={INK} strokeWidth={29} />
            <path d="M 254 294 Q 294 352 290 412" fill="none" stroke={INK} strokeWidth={29} />
            <path d="M 146 294 Q 106 352 110 414" fill="none" stroke={bodyColor} strokeWidth={23} />
            <path d="M 254 294 Q 294 352 290 412" fill="none" stroke={bodyColor} strokeWidth={23} />
            <circle cx={110} cy={420} r={16} fill={skinColor} stroke={INK} strokeWidth={STROKE} />
            <circle cx={290} cy={418} r={16} fill={skinColor} stroke={INK} strokeWidth={STROKE} />
          </g>

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
          </g>

          {/* ---------- neck ---------- */}
          <g>
            <rect x={186} y={212} width={28} height={44} rx={8} fill={skinColor} stroke={INK} strokeWidth={STROKE} />
          </g>

          {/* ---------- head ---------- */}
          <g transform={`translate(0 ${headBob}) rotate(${headTilt} 200 250)`}>
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
            </g>

            {/* hair */}
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

            {/* face layers */}
            {eye(EYE_X[0], 0)}
            {eye(EYE_X[1], 1)}
            {mouthShape()}
          </g>
        </g>
      </svg>
    </div>
  );
};
