import React from "react";
import { INK } from "../palette";
import { eventLevel, loopPhase, PROP_OUTLINE, pulse, usePropFrame } from "./shared";
import {
  propContainerStyle,
  type PropDefinition,
  type PropLayout,
  type PropProps,
} from "./types";

export type ToolsState = "idle" | "active" | "sparks";

export const TOOLS_STATES: readonly ToolsState[] = ["idle", "active", "sparks"];

export const TOOLS_SIZE = { width: 460, height: 400 } as const;

/**
 * Tool set on a pegboard: an open-end wrench, a screwdriver and a soldering
 * iron. `active` spins the screwdriver and heats the iron tip; `sparks`
 * adds a deterministic solder spark shower. `eventProgress` scales both.
 */
export const Tools: React.FC<PropProps<ToolsState>> = (props) => {
  const { x, y, scale = 1, state, eventProgress = 0, seed, style, className } =
    props;
  const frame = usePropFrame(props);
  const event = eventLevel(eventProgress);
  const seedValue = seed ?? 0;
  const uid = `tools-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const active = state === "active" || state === "sparks";
  const sparking = state === "sparks";

  const screwTurn = active ? Math.sin(frame * 0.55) * (4 + event * 8) : 0;
  const tipGlow = active ? 0.45 + 0.55 * pulse(frame, 0.26, 0.4 + event * 0.3, 1) : 0.1;

  const layout: PropLayout<ToolsState> = {
    x,
    y,
    scale,
    state,
    eventProgress: event,
    seed: seedValue,
  };

  const sparks = Array.from({ length: 18 }, (_, i) => {
    const p = loopPhase(frame, 18, seedValue + 4, i);
    const angle = -1.6 + (i / 18) * 3.2 + Math.sin(i * 2.1) * 0.2;
    const dist = p * (24 + (i % 5) * 9);
    return {
      cx: 304 + Math.cos(angle) * dist,
      cy: 306 + Math.sin(angle) * dist + p * p * 26,
      r: 1.4 + (i % 3) * 0.8,
      opacity: (1 - p) * (sparking ? 1 : 0.28),
    };
  });

  const smoke = Array.from({ length: 5 }, (_, i) => {
    const p = loopPhase(frame, 64, seedValue + 9, i);
    return {
      cx: 304 + Math.sin(frame * 0.08 + i) * 8,
      cy: 300 - p * 66,
      r: 3 + p * 10,
      opacity: active ? (1 - p) * 0.28 : 0,
    };
  });

  return (
    <div className={className} style={propContainerStyle(TOOLS_SIZE, layout, style)}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${TOOLS_SIZE.width} ${TOOLS_SIZE.height}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-peg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A4259" />
            <stop offset="100%" stopColor="#222839" />
          </linearGradient>
          <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C2CBDB" />
            <stop offset="50%" stopColor="#8C97AC" />
            <stop offset="100%" stopColor="#5E6879" />
          </linearGradient>
          <radialGradient id={`${uid}-heat`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF6D8" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#FFB25E" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FF7A3D" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-bench`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A3F52" />
            <stop offset="100%" stopColor="#2A2333" />
          </linearGradient>
        </defs>

        <ellipse cx={230} cy={372} rx={196} ry={16} fill="#05030A" opacity={0.42} />

        {/* bench */}
        <rect x={20} y={344} width={420} height={24} rx={5} fill={`url(#${uid}-bench)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
        <rect x={42} y={368} width={16} height={26} fill="#211B28" stroke={INK} strokeWidth={2.4} />
        <rect x={402} y={368} width={16} height={26} fill="#211B28" stroke={INK} strokeWidth={2.4} />

        {/* pegboard */}
        <rect x={40} y={26} width={380} height={304} rx={10} fill={`url(#${uid}-peg)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
        <rect x={50} y={36} width={360} height={284} rx={6} fill="none" stroke="#5E6884" strokeWidth={2} opacity={0.35} />
        {Array.from({ length: 7 }, (_, row) =>
          Array.from({ length: 17 }, (_, col) => (
            <circle
              key={`peg-${row}-${col}`}
              cx={62 + col * 21}
              cy={54 + row * 38}
              r={2.6}
              fill="#12151F"
              opacity={0.7}
            />
          )),
        )}

        {/* wrench */}
        <g transform="rotate(-16 140 132)">
          <path
            d="M 74 120 L 194 120 Q 212 120 212 132 Q 212 144 194 144 L 74 144 L 52 154 Q 38 154 38 140 L 52 132 Q 38 130 38 122 Q 38 108 52 108 Z"
            fill={`url(#${uid}-metal)`}
            stroke={INK}
            strokeWidth={PROP_OUTLINE}
            strokeLinejoin="round"
          />
          <circle cx={208} cy={132} r={17} fill="none" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <circle cx={208} cy={132} r={8} fill="#222839" stroke={INK} strokeWidth={2} />
          <path d="M 82 126 H 188" stroke="#E4EAF4" strokeWidth={2.4} opacity={0.45} />
        </g>

        {/* screwdriver */}
        <g transform={`rotate(${12 + screwTurn} 332 128)`}>
          <rect x={310} y={48} width={44} height={96} rx={18} fill="#B85438" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={316} y={58} width={12} height={72} rx={6} fill="#E08A62" opacity={0.4} />
          <rect x={326} y={54} width={12} height={84} rx={6} fill="#8E3A26" opacity={0.5} />
          <rect x={326} y={142} width={10} height={80} rx={3} fill={`url(#${uid}-metal)`} stroke={INK} strokeWidth={2.4} />
          <path d="M 326 222 L 336 222 L 333 242 L 329 242 Z" fill="#9AA5B8" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
        </g>

        {/* soldering iron cable */}
        <path
          d="M 126 300 C 90 306 74 330 58 350"
          fill="none"
          stroke="#1A1720"
          strokeWidth={5}
          strokeLinecap="round"
        />

        {/* soldering iron */}
        <g transform="rotate(-7 220 300)">
          <rect x={118} y={284} width={126} height={30} rx={14} fill="#6A3D33" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={128} y={290} width={88} height={7} rx={3.5} fill="#A2664F" opacity={0.45} />
          <rect x={238} y={288} width={26} height={22} rx={5} fill="#8C97AC" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <path d="M 262 292 L 306 302 L 306 312 L 262 314 Z" fill={`url(#${uid}-metal)`} stroke={INK} strokeWidth={PROP_OUTLINE} strokeLinejoin="round" />
        </g>

        {/* heat glow */}
        {active ? (
          <g>
            <ellipse cx={304} cy={306} rx={40} ry={30} fill={`url(#${uid}-heat)`} opacity={0.35 + tipGlow * 0.5} />
            {smoke.map((puff, i) => (
              <circle
                key={`smoke-${i}`}
                cx={puff.cx}
                cy={puff.cy}
                r={puff.r}
                fill="#D5D9E4"
                opacity={puff.opacity}
              />
            ))}
          </g>
        ) : null}

        {/* solder sparks */}
        {sparking || active ? (
          <g>
            {sparks.map((spark, i) => (
              <circle
                key={`spark-${i}`}
                cx={spark.cx}
                cy={spark.cy}
                r={spark.r}
                fill={i % 3 === 0 ? "#FFF6D8" : "#FFC077"}
                opacity={spark.opacity}
              />
            ))}
            <path
              d={`M 304 306 L ${314 + Math.sin(frame * 4.6) * 7} ${292 + Math.cos(frame * 3.8) * 6} L ${
                326 + Math.sin(frame * 2.9) * 5
              } ${306 + Math.sin(frame * 5.7) * 5}`}
              fill="none"
              stroke="#8FE3F0"
              strokeWidth={PROP_OUTLINE}
              opacity={sparking ? 0.55 + 0.45 * pulse(frame, 0.8) : 0.14}
            />
          </g>
        ) : null}

        <text
          x={230}
          y={18}
          textAnchor="middle"
          fontFamily="Arial Black, Segoe UI, sans-serif"
          fontSize={11}
          fontWeight={900}
          fill="#8E93A8"
          opacity={0.5}
        >
          {state.toUpperCase()}
        </text>
      </svg>
    </div>
  );
};

export const toolsProp: PropDefinition<ToolsState> = {
  id: "tools",
  name: "Tools",
  description:
    "Tool pegboard: wrench, screwdriver and soldering iron - idle, working or sparking at the solder tip.",
  states: TOOLS_STATES,
  defaultState: "idle",
  size: TOOLS_SIZE,
  focus: { x: 304, y: 306 },
  Component: Tools,
};
