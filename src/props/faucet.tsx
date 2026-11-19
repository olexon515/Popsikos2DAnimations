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

export type FaucetState = "closed" | "dripping" | "flowing" | "dry";

export const FAUCET_STATES: readonly FaucetState[] = [
  "closed",
  "dripping",
  "flowing",
  "dry",
];

export const FAUCET_SIZE = { width: 320, height: 420 } as const;

/**
 * Industrial faucet / valve. `closed` is silent, `dripping` releases
 * deterministic droplets, `flowing` opens the valve into a wavy stream,
 * `dry` is a rusted pipe with no water. `eventProgress` turns the wheel.
 */
export const Faucet: React.FC<PropProps<FaucetState>> = (props) => {
  const { x, y, scale = 1, state, eventProgress = 0, seed, style, className } =
    props;
  const frame = usePropFrame(props);
  const event = eventLevel(eventProgress);
  const seedValue = seed ?? 0;
  const uid = `faucet-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const dry = state === "dry";
  const dripping = state === "dripping";
  const flowing = state === "flowing";

  const valveAngle =
    (state === "closed" || dry ? 0 : dripping ? 26 + event * 22 : 78 + event * 38) +
    Math.sin(frame * 0.06) * 1.6;

  const steel = dry ? "#5C5046" : "#5A6580";
  const steelDark = dry ? "#3E352E" : "#333C52";
  const spoutX = 250;
  const spoutY = 254;

  const drops = Array.from({ length: 3 }, (_, i) => {
    const p = loopPhase(frame, 34, seedValue + 2, i);
    return {
      cy: spoutY + 8 + p * 120,
      r: 3.6 + (i % 2) * 0.9,
      opacity: p < 0.88 ? 0.85 : 0.25,
    };
  });

  const rust = Array.from({ length: 7 }, (_, i) => ({
    cx: 134 + rand(seedValue + i, 3) * 44,
    cy: 180 + rand(seedValue + i, 9) * 150,
    r: 2 + rand(seedValue, i) * 3.4,
  }));

  const layout: PropLayout<FaucetState> = {
    x,
    y,
    scale,
    state,
    eventProgress: event,
    seed: seedValue,
  };

  return (
    <div
      className={className}
      style={propContainerStyle(FAUCET_SIZE, layout, style)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${FAUCET_SIZE.width} ${FAUCET_SIZE.height}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={steelDark} />
            <stop offset="45%" stopColor={steel} />
            <stop offset="100%" stopColor={steelDark} />
          </linearGradient>
          <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BDF5FF" />
            <stop offset="100%" stopColor="#4FC3E0" />
          </linearGradient>
          <radialGradient id={`${uid}-splash`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#BDF5FF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#4FC3E0" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx={160} cy={404} rx={98} ry={14} fill="#05030A" opacity={0.45} />

        {/* base plate */}
        <rect x={104} y={356} width={112} height={44} rx={8} fill="#2A3044" stroke={INK} strokeWidth={PROP_OUTLINE} />
        <rect x={118} y={364} width={84} height={6} rx={3} fill="#4E5874" opacity={0.55} />
        <circle cx={124} cy={386} r={3} fill="#0D111C" />
        <circle cx={196} cy={386} r={3} fill="#0D111C" />

        {/* riser */}
        <rect x={134} y={146} width={48} height={216} rx={9} fill={`url(#${uid}-steel)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
        <rect x={128} y={150} width={60} height={14} rx={5} fill="#434C66" stroke={INK} strokeWidth={2.6} />
        <rect x={128} y={332} width={60} height={14} rx={5} fill="#434C66" stroke={INK} strokeWidth={2.6} />

        {/* valve stem + wheel */}
        <rect x={148} y={108} width={14} height={44} rx={5} fill="#434C66" stroke={INK} strokeWidth={PROP_OUTLINE} />
        <g transform={`rotate(${valveAngle} 156 98)`}>
          <circle cx={156} cy={98} r={46} fill="none" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <circle cx={156} cy={98} r={46} fill="none" stroke={dry ? "#9A6A42" : "#B99452"} strokeWidth={11} />
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2;
            return (
              <path
                key={`spoke-${i}`}
                d={`M 156 98 L ${156 + Math.cos(a) * 42} ${98 + Math.sin(a) * 42}`}
                stroke={dry ? "#8A5C3A" : "#A8843F"}
                strokeWidth={7}
                strokeLinecap="round"
              />
            );
          })}
          <circle cx={156} cy={98} r={12} fill="#6E5530" stroke={INK} strokeWidth={PROP_OUTLINE} />
        </g>

        {/* spout */}
        <path
          d="M 172 196 H 232 Q 250 196 250 218 V 244"
          fill="none"
          stroke={INK}
          strokeWidth={26}
          strokeLinecap="round"
        />
        <path
          d="M 172 196 H 232 Q 250 196 250 218 V 244"
          fill="none"
          stroke={`url(#${uid}-steel)`}
          strokeWidth={20}
          strokeLinecap="round"
        />
        <rect x={236} y={238} width={28} height={16} rx={5} fill="#3A445C" stroke={INK} strokeWidth={PROP_OUTLINE} />

        {/* rust details */}
        {rust.map((spot, i) => (
          <circle
            key={`rust-${i}`}
            cx={spot.cx}
            cy={spot.cy}
            r={spot.r}
            fill="#7A4A34"
            opacity={dry ? 0.65 : 0.18}
          />
        ))}

        {/* water stream */}
        {flowing ? (
          <g>
            <ellipse cx={spoutX} cy={398} rx={46} ry={12} fill={`url(#${uid}-splash)`} opacity={0.8} />
            <path
              d={`M ${spoutX} ${spoutY} C ${spoutX - 5 + Math.sin(frame * 0.22) * 4} 300 ${
                spoutX + 7 + Math.sin(frame * 0.18 + 1) * 5
              } 346 ${spoutX} 398`}
              fill="none"
              stroke={`url(#${uid}-water)`}
              strokeWidth={10}
              strokeLinecap="round"
              opacity={0.9}
            />
            <path
              d={`M ${spoutX - 2} ${spoutY + 4} C ${spoutX - 6} 300 ${spoutX + 3} 350 ${spoutX - 2} 394`}
              fill="none"
              stroke="#E8FCFF"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.65}
            />
            {[0, 1, 2, 3].map((i) => {
              const p = loopPhase(frame, 20, seedValue, i + 30);
              const dir = i % 2 === 0 ? 1 : -1;
              return (
                <circle
                  key={`splash-${i}`}
                  cx={spoutX + dir * (10 + p * 28)}
                  cy={398 - Math.sin(p * Math.PI) * (14 + i * 4)}
                  r={2.4 + (i % 2)}
                  fill="#BDF5FF"
                  opacity={1 - p * 0.8}
                />
              );
            })}
          </g>
        ) : null}

        {/* droplets */}
        {dripping
          ? drops.map((drop, i) => (
              <g key={`drop-${i}`} transform={`translate(${spoutX} ${drop.cy})`} opacity={drop.opacity}>
                <path
                  d={`M 0 ${-drop.r * 2} C ${drop.r} ${-drop.r * 0.5} ${drop.r} ${drop.r * 0.6} 0 ${drop.r * 1.4} C ${
                    -drop.r
                  } ${drop.r * 0.6} ${-drop.r} ${-drop.r * 0.5} 0 ${-drop.r * 2} Z`}
                  fill={`url(#${uid}-water)`}
                  stroke="#2A8FA8"
                  strokeWidth={1.6}
                />
              </g>
            ))
          : null}

        {/* drip shimmer on the nozzle */}
        {!dry && (dripping || flowing) ? (
          <circle cx={spoutX} cy={spoutY - 4} r={4} fill="#CFFAFF" opacity={0.35 + 0.5 * pulse(frame, 0.3)} />
        ) : null}

        {dry ? (
          <g stroke="#6A4530" strokeWidth={2.4} strokeLinecap="round" opacity={0.7}>
            <path d="M 146 232 L 166 244 L 158 262" />
            <path d="M 170 302 L 152 314 L 164 330" />
          </g>
        ) : null}

        <text
          x={160}
          y={414}
          textAnchor="middle"
          fontFamily="Arial Black, Segoe UI, sans-serif"
          fontSize={10}
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

export const faucetProp: PropDefinition<FaucetState> = {
  id: "faucet",
  name: "Faucet",
  description:
    "Industrial valve: closed, dripping deterministic drops, flowing stream or a rusted dry pipe.",
  states: FAUCET_STATES,
  defaultState: "closed",
  size: FAUCET_SIZE,
  focus: { x: 250, y: 272 },
  Component: Faucet,
};
