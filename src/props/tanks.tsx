import React from "react";
import { rand } from "../Camera";
import { INK } from "../palette";
import { eventLevel, loopPhase, PROP_OUTLINE, pulse, usePropFrame } from "./shared";
import {
  propContainerStyle,
  type PropDefinition,
  type PropLayout,
  type PropProps,
} from "./types";

export type TanksState = "full" | "half" | "empty" | "leaking";

export const TANKS_STATES: readonly TanksState[] = [
  "full",
  "half",
  "empty",
  "leaking",
];

export const TANKS_SIZE = { width: 480, height: 540 } as const;

const LEVELS: Record<TanksState, number> = {
  full: 0.92,
  half: 0.5,
  empty: 0.05,
  leaking: 0.34,
};

/**
 * Twin liquid tanks with a ladder and connecting pipes. The liquid surface
 * ripples deterministically; `leaking` adds a crack, falling drops and a
 * growing puddle. `eventProgress` intensifies the leak.
 */
export const Tanks: React.FC<PropProps<TanksState>> = (props) => {
  const { x, y, scale = 1, state, eventProgress = 0, seed, style, className } =
    props;
  const frame = usePropFrame(props);
  const event = eventLevel(eventProgress);
  const seedValue = seed ?? 0;
  const uid = `tanks-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const level = LEVELS[state];
  const leaking = state === "leaking";
  const ripple = Math.sin(frame * 0.09) * 2.4;
  const surfaceA = 480 - level * 290 + ripple;
  const surfaceB = 470 - level * 0.8 * 210 + Math.sin(frame * 0.11 + 1) * 2;

  const layout: PropLayout<TanksState> = {
    x,
    y,
    scale,
    state,
    eventProgress: event,
    seed: seedValue,
  };

  const bubbles = Array.from({ length: 8 }, (_, i) => {
    const p = loopPhase(frame, 90, seedValue + 3, i);
    const inLeft = i % 2 === 0;
    return {
      cx: inLeft
        ? 108 + rand(seedValue + i, 1) * 100
        : 292 + rand(seedValue + i, 2) * 78,
      cy: inLeft ? 470 - p * (470 - surfaceA) : 464 - p * (464 - surfaceB),
      r: 1.6 + rand(seedValue + i, 5) * 2.6,
      opacity: level > 0.08 ? (1 - p) * 0.55 : 0,
    };
  });

  const drops = Array.from({ length: 4 }, (_, i) => {
    const p = loopPhase(frame, 26, seedValue + 8, i);
    return {
      cy: 436 + p * 64,
      opacity: leaking ? (p < 0.9 ? 0.9 : 0.2) : 0,
    };
  });

  return (
    <div className={className} style={propContainerStyle(TANKS_SIZE, layout, style)}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${TANKS_SIZE.width} ${TANKS_SIZE.height}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2B3348" />
            <stop offset="35%" stopColor="#5B6684" />
            <stop offset="70%" stopColor="#3A435C" />
            <stop offset="100%" stopColor="#202637" />
          </linearGradient>
          <linearGradient id={`${uid}-liquid`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7FE3EF" />
            <stop offset="100%" stopColor="#2C8FA6" />
          </linearGradient>
          <clipPath id={`${uid}-clip-left`}>
            <rect x={88} y={190} width={142} height={292} rx={22} />
          </clipPath>
          <clipPath id={`${uid}-clip-right`}>
            <rect x={276} y={264} width={110} height={208} rx={18} />
          </clipPath>
          <radialGradient id={`${uid}-leak`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7FE3EF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7FE3EF" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx={240} cy={522} rx={214} ry={22} fill="#05030A" opacity={0.45} />

        {/* connecting pipes */}
        <rect x={222} y={478} width={62} height={16} rx={6} fill="#333C52" stroke={INK} strokeWidth={PROP_OUTLINE} />
        <path d="M 222 214 H 286 Q 306 214 306 234 V 292" fill="none" stroke={INK} strokeWidth={16} strokeLinecap="round" />
        <path d="M 222 214 H 286 Q 306 214 306 234 V 292" fill="none" stroke="#5A6278" strokeWidth={10} strokeLinecap="round" />
        <circle cx={250} cy={214} r={11} fill="#B99452" stroke={INK} strokeWidth={2.4} />
        <path d="M 250 203 V 225 M 239 214 H 261" stroke="#6E5530" strokeWidth={3} />

        {/* puddle */}
        {leaking ? (
          <g>
            <ellipse cx={345} cy={502} rx={74 + event * 18} ry={13} fill="#2C8FA6" opacity={0.28} />
            <ellipse cx={344} cy={500} rx={40 + event * 8} ry={7} fill="#7FE3EF" opacity={0.22} />
          </g>
        ) : null}

        {/* left tank */}
        <g>
          <ellipse cx={159} cy={480} rx={71} ry={15} fill="#11141F" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={84} y={180} width={150} height={310} rx={27} fill={`url(#${uid}-metal)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
          <ellipse cx={159} cy={180} rx={75} ry={20} fill="#4C5674" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <ellipse cx={159} cy={180} rx={52} ry={12} fill="#333C52" opacity={0.8} />

          <g clipPath={`url(#${uid}-clip-left)`}>
            <rect x={88} y={surfaceA} width={142} height={490 - surfaceA} fill={`url(#${uid}-liquid)`} />
            <path
              d={`M 88 ${surfaceA} Q 120 ${surfaceA - 6} 159 ${surfaceA} T 230 ${surfaceA} V ${surfaceA + 12} H 88 Z`}
              fill="#BDF5FF"
              opacity={0.55}
            />
            {bubbles
              .filter((_, i) => i % 2 === 0)
              .map((bubble, i) => (
                <circle
                  key={`left-bubble-${i}`}
                  cx={bubble.cx}
                  cy={bubble.cy}
                  r={bubble.r}
                  fill="#E8FCFF"
                  opacity={bubble.opacity}
                />
              ))}
          </g>

          <rect x={84} y={232} width={150} height={12} fill="#202637" opacity={0.72} />
          <rect x={84} y={314} width={150} height={10} fill="#202637" opacity={0.6} />
          <rect x={84} y={408} width={150} height={12} fill="#202637" opacity={0.72} />
          <rect x={98} y={196} width={18} height={6} rx={3} fill="#8E93A8" opacity={0.6} />
          <text
            x={159}
            y={292}
            textAnchor="middle"
            fontFamily="Arial Black, Segoe UI, sans-serif"
            fontSize={19}
            fontWeight={900}
            fill="#0E1119"
            opacity={0.55}
          >
            H2O
          </text>
          <path d="M 205 200 V 470" stroke="#8E93A8" strokeWidth={2} opacity={0.18} />
        </g>

        {/* right tank */}
        <g>
          <ellipse cx={331} cy={470} rx={58} ry={13} fill="#11141F" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={272} y={252} width={118} height={220} rx={22} fill={`url(#${uid}-metal)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
          <ellipse cx={331} cy={252} rx={59} ry={17} fill="#4C5674" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <ellipse cx={331} cy={252} rx={38} ry={10} fill="#333C52" opacity={0.8} />

          <g clipPath={`url(#${uid}-clip-right)`}>
            <rect x={276} y={surfaceB} width={110} height={482 - surfaceB} fill={`url(#${uid}-liquid)`} opacity={0.92} />
            <path
              d={`M 276 ${surfaceB} Q 303 ${surfaceB - 5} 331 ${surfaceB} T 386 ${surfaceB} V ${surfaceB + 10} H 276 Z`}
              fill="#BDF5FF"
              opacity={0.5}
            />
            {bubbles
              .filter((_, i) => i % 2 === 1)
              .map((bubble, i) => (
                <circle
                  key={`right-bubble-${i}`}
                  cx={bubble.cx}
                  cy={bubble.cy}
                  r={bubble.r}
                  fill="#E8FCFF"
                  opacity={bubble.opacity}
                />
              ))}
          </g>

          <rect x={272} y={300} width={118} height={9} fill="#202637" opacity={0.65} />
          <rect x={272} y={386} width={118} height={10} fill="#202637" opacity={0.7} />
          <circle cx={331} cy={222} r={9} fill="#1A1F2E" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <path d="M 331 213 V 231 M 322 222 H 340" stroke="#8E93A8" strokeWidth={2.4} />

          {leaking ? (
            <g>
              <path d="M 350 420 L 362 434 L 354 446 L 366 458" fill="none" stroke="#0B0710" strokeWidth={3.4} strokeLinecap="round" />
              <ellipse cx={358} cy={444} rx={26} ry={26} fill={`url(#${uid}-leak)`} opacity={0.6 + 0.4 * pulse(frame, 0.3)} />
              {drops.map((drop, i) => (
                <ellipse
                  key={`leak-drop-${i}`}
                  cx={362 + (i % 2 === 0 ? -3 : 4)}
                  cy={drop.cy}
                  rx={2.6}
                  ry={4}
                  fill="#7FE3EF"
                  stroke="#2A8FA8"
                  strokeWidth={1.2}
                  opacity={drop.opacity}
                />
              ))}
            </g>
          ) : null}

          <text
            x={331}
            y={352}
            textAnchor="middle"
            fontFamily="Arial Black, Segoe UI, sans-serif"
            fontSize={13}
            fontWeight={900}
            fill="#0E1119"
            opacity={0.5}
          >
            AUX
          </text>
        </g>

        {/* ladder */}
        <g stroke={INK} strokeWidth={PROP_OUTLINE} strokeLinecap="round">
          <path d="M 52 206 V 486" />
          <path d="M 74 206 V 486" />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={`rung-${i}`} d={`M 52 ${228 + i * 32} H 74`} />
          ))}
        </g>
        <g stroke="#7E879E" strokeWidth={3.2} strokeLinecap="round">
          <path d="M 52 206 V 486" />
          <path d="M 74 206 V 486" />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={`rung-in-${i}`} d={`M 52 ${228 + i * 32} H 74`} />
          ))}
        </g>
      </svg>
    </div>
  );
};

export const tanksProp: PropDefinition<TanksState> = {
  id: "tanks",
  name: "Tanks",
  description:
    "Twin liquid tanks: full, half, empty or leaking with a crack, drops and a puddle.",
  states: TANKS_STATES,
  defaultState: "empty",
  size: TANKS_SIZE,
  focus: { x: 159, y: 320 },
  Component: Tanks,
};
