import React from "react";
import { clamp01 } from "../Camera";
import { INK } from "../palette";
import { eventLevel, loopPhase, PROP_OUTLINE, pulse, usePropFrame } from "./shared";
import {
  propContainerStyle,
  type PropDefinition,
  type PropLayout,
  type PropProps,
} from "./types";

export type DoorState = "closed" | "opening" | "open" | "banging";

export const DOOR_STATES: readonly DoorState[] = [
  "closed",
  "opening",
  "open",
  "banging",
];

export const DOOR_SIZE = { width: 420, height: 640 } as const;

/**
 * Hermetic blast door. `opening` slides the leaf by `eventProgress` and spins
 * the wheel handle, `open` reveals the lit interior, `banging` trembles the
 * leaf from hits on the outside. Focus follows the handle.
 */
export const Door: React.FC<PropProps<DoorState>> = (props) => {
  const { x, y, scale = 1, state, eventProgress = 0, seed, style, className } =
    props;
  const frame = usePropFrame(props);
  const event = eventLevel(eventProgress);
  const seedValue = seed ?? 0;
  const uid = `door-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const open =
    state === "open"
      ? 1
      : state === "opening"
        ? clamp01(event)
        : state === "banging"
          ? 0.012
          : 0;
  const banging = state === "banging";
  const hit =
    banging
      ? Math.sin(frame * 2.3) * (4 + event * 6) +
        Math.sin(frame * 7.4) * (1.2 + event * 2)
      : 0;
  const handleAngle = open * 190 + (banging ? Math.sin(frame * 3.1) * 5 : 0);
  const interiorLight = 0.16 + open * 0.84;

  const layout: PropLayout<DoorState> = {
    x,
    y,
    scale,
    state,
    eventProgress: event,
    seed: seedValue,
  };

  const dust = Array.from({ length: 7 }, (_, i) => {
    const p = loopPhase(frame, 42, seedValue + 2, i);
    return {
      cx: 84 + (i % 2 === 0 ? 0 : 252) + (i % 3 === 0 ? 14 : -10),
      cy: 92 + p * 470,
      r: 1.4 + (i % 3) * 0.9,
      opacity: banging ? (1 - p) * 0.5 : 0,
    };
  });

  return (
    <div className={className} style={propContainerStyle(DOOR_SIZE, layout, style)}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${DOOR_SIZE.width} ${DOOR_SIZE.height}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-frame`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5A6278" />
            <stop offset="55%" stopColor="#3A4157" />
            <stop offset="100%" stopColor="#242A3B" />
          </linearGradient>
          <linearGradient id={`${uid}-leaf`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#59637F" />
            <stop offset="50%" stopColor="#414A64" />
            <stop offset="100%" stopColor="#2C3347" />
          </linearGradient>
          <radialGradient id={`${uid}-light`} cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor="#FFD08A" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#FF8A4C" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FF5E3A" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-port`}>
            <rect x={80} y={76} width={260} height={504} rx={6} />
          </clipPath>
        </defs>

        <ellipse cx={210} cy={610} rx={168} ry={20} fill="#05030A" opacity={0.45} />

        {/* concrete frame */}
        <rect x={36} y={24} width={348} height={576} rx={12} fill={`url(#${uid}-frame)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
        <rect x={50} y={38} width={320} height={548} rx={8} fill="none" stroke="#767F96" strokeWidth={2.2} opacity={0.35} />
        {[
          [58, 50],
          [362, 50],
          [58, 574],
          [362, 574],
          [58, 312],
          [362, 312],
        ].map(([cx, cy], i) => (
          <circle key={`bolt-${i}`} cx={cx} cy={cy} r={4.2} fill="#1C2130" stroke={INK} strokeWidth={2} />
        ))}

        {/* dark opening + warm interior */}
        <rect x={80} y={76} width={260} height={504} rx={6} fill="#05060B" />
        <ellipse cx={210} cy={330} rx={160} ry={300} fill={`url(#${uid}-light)`} opacity={interiorLight} />
        <path
          d="M 96 560 L 118 130 M 324 560 L 302 130"
          stroke="#FFC077"
          strokeWidth={PROP_OUTLINE}
          opacity={open * 0.35}
        />

        {/* sliding leaf */}
        <g clipPath={`url(#${uid}-port)`}>
          <g transform={`translate(${-open * 252 + hit} 0)`}>
            <rect x={82} y={78} width={256} height={500} rx={6} fill={`url(#${uid}-leaf)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
            <rect x={102} y={100} width={216} height={456} rx={4} fill="none" stroke="#7C87A3" strokeWidth={2.4} opacity={0.35} />

            {/* diagonal braces */}
            <path d="M 108 116 L 314 534" stroke="#2A3044" strokeWidth={12} opacity={0.65} />
            <path d="M 314 116 L 108 534" stroke="#2A3044" strokeWidth={12} opacity={0.4} />

            {/* warning stripes */}
            <g>
              <rect x={110} y={492} width={212} height={38} rx={3} fill="#C9A43C" opacity={0.85} />
              {Array.from({ length: 9 }, (_, i) => (
                <path
                  key={`stripe-${i}`}
                  d={`M ${114 + i * 24} 530 L ${132 + i * 24} 492`}
                  stroke={INK}
                  strokeWidth={9}
                  opacity={0.75}
                />
              ))}
            </g>

            {/* label */}
            <text
              x={210}
              y={148}
              textAnchor="middle"
              fontFamily="Arial Black, Segoe UI, sans-serif"
              fontSize={16}
              fontWeight={900}
              fill="#C9D3E8"
              opacity={0.65}
            >
              СЕКТОР 7
            </text>
            <text
              x={210}
              y={168}
              textAnchor="middle"
              fontFamily="Arial, Segoe UI, sans-serif"
              fontSize={9}
              fill="#8A94AB"
              opacity={0.8}
            >
              ГЕРМЕТИЧНІ ДВЕРІ
            </text>

            {/* wheel handle */}
            <g transform={`rotate(${handleAngle} 210 330)`}>
              <circle cx={210} cy={330} r={40} fill="none" stroke={INK} strokeWidth={PROP_OUTLINE} />
              <circle cx={210} cy={330} r={40} fill="none" stroke="#B99452" strokeWidth={10} />
              {[0, 1, 2, 3].map((i) => {
                const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
                return (
                  <path
                    key={`handle-${i}`}
                    d={`M 210 330 L ${210 + Math.cos(a) * 36} ${330 + Math.sin(a) * 36}`}
                    stroke="#A8843F"
                    strokeWidth={7}
                    strokeLinecap="round"
                  />
                );
              })}
              <circle cx={210} cy={330} r={11} fill="#6E5530" stroke={INK} strokeWidth={PROP_OUTLINE} />
            </g>

            {/* hinges */}
            <rect x={86} y={140} width={18} height={54} rx={5} fill="#333B52" stroke={INK} strokeWidth={2.4} />
            <rect x={86} y={470} width={18} height={54} rx={5} fill="#333B52" stroke={INK} strokeWidth={2.4} />
          </g>
        </g>

        {/* frame lip over the leaf */}
        <rect x={74} y={70} width={272} height={516} rx={8} fill="none" stroke={INK} strokeWidth={PROP_OUTLINE} />

        {/* banging impact flashes */}
        {banging ? (
          <g>
            <ellipse
              cx={300}
              cy={330}
              rx={18 + event * 20}
              ry={44 + event * 30}
              fill="#FF8A4C"
              opacity={0.12 + 0.28 * pulse(frame, 0.5)}
            />
            {dust.map((mote, i) => (
              <circle
                key={`dust-${i}`}
                cx={mote.cx}
                cy={mote.cy}
                r={mote.r}
                fill="#C9D3E8"
                opacity={mote.opacity}
              />
            ))}
            <path
              d={`M 372 ${300 - event * 6} L 392 316 L 372 ${332 + event * 6}`}
              fill="none"
              stroke="#FFC077"
              strokeWidth={PROP_OUTLINE}
              strokeLinecap="round"
              opacity={0.35 + 0.5 * pulse(frame, 0.8)}
            />
          </g>
        ) : null}

        <text
          x={210}
          y={30}
          textAnchor="middle"
          fontFamily="Arial Black, Segoe UI, sans-serif"
          fontSize={11}
          fontWeight={900}
          fill="#8E93A8"
          opacity={0.55}
        >
          {state.toUpperCase()}
        </text>
      </svg>
    </div>
  );
};

export const doorProp: PropDefinition<DoorState> = {
  id: "door",
  name: "Door",
  description:
    "Hermetic blast door: closed, sliding open with a rotating wheel, fully open, or banging from outside hits.",
  states: DOOR_STATES,
  defaultState: "closed",
  size: DOOR_SIZE,
  focus: (layout) => {
    const slide =
      layout.state === "open"
        ? 1
        : layout.state === "opening"
          ? clamp01(layout.eventProgress)
          : 0;
    return { x: 210 - slide * 252, y: 330 };
  },
  Component: Door,
};
