import React from "react";
import { INK } from "../palette";
import { eventLevel, loopPhase, PROP_OUTLINE, pulse, usePropFrame } from "./shared";
import {
  propContainerStyle,
  type PropDefinition,
  type PropLayout,
  type PropProps,
} from "./types";

export type PumpState = "idle" | "pumping" | "jammed";

export const PUMP_STATES: readonly PumpState[] = ["idle", "pumping", "jammed"];

export const PUMP_SIZE = { width: 400, height: 430 } as const;

/**
 * Piston pump. `pumping` drives the rod and the flywheel and settles the
 * pressure gauge; `jammed` freezes the piston and makes the needle tremble
 * at the red line. `eventProgress` scales the stroke and needle motion.
 */
export const Pump: React.FC<PropProps<PumpState>> = (props) => {
  const { x, y, scale = 1, state, eventProgress = 0, seed, style, className } =
    props;
  const frame = usePropFrame(props);
  const event = eventLevel(eventProgress);
  const seedValue = seed ?? 0;
  const uid = `pump-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const pumping = state === "pumping";
  const jammed = state === "jammed";

  const piston = pumping
    ? Math.sin(frame * 0.22) * 22 * (0.45 + event * 0.55)
    : jammed
      ? -16 + Math.sin(frame * 7.5) * 1.4
      : 0;

  const flyAngle = pumping ? frame * (4.5 + event * 2) : jammed ? Math.sin(frame * 0.4) * 2 : 0;

  const pressure = pumping
    ? 58 + Math.sin(frame * 0.9) * 3.4 + event * 12
    : jammed
      ? 91 + Math.sin(frame * 5.3) * 7 + Math.cos(frame * 9.1) * 4
      : 6 + Math.sin(frame * 0.7) * 1.2;
  const needleAngle = -220 + Math.max(0, Math.min(100, pressure)) * 2.6;

  const vibration = pumping
    ? Math.sin(frame * 4.2) * (0.9 + event * 1.2)
    : jammed
      ? Math.sin(frame * 11.4) * (1.4 + event * 1.6)
      : 0;

  const layout: PropLayout<PumpState> = {
    x,
    y,
    scale,
    state,
    eventProgress: event,
    seed: seedValue,
  };

  const steam = Array.from({ length: 5 }, (_, i) => {
    const p = loopPhase(frame, 52, seedValue + 1, i);
    return {
      cx: 210 + Math.sin(frame * 0.09 + i) * 14,
      cy: 132 - p * 74,
      r: 5 + p * 13,
      opacity: jammed ? (1 - p) * 0.35 : 0,
    };
  });

  return (
    <div className={className} style={propContainerStyle(PUMP_SIZE, layout, style)}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${PUMP_SIZE.width} ${PUMP_SIZE.height}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#465171" />
            <stop offset="100%" stopColor="#252C41" />
          </linearGradient>
          <radialGradient id={`${uid}-face`} cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#F4EFDB" />
            <stop offset="100%" stopColor="#CFC7AC" />
          </radialGradient>
          <radialGradient id={`${uid}-heat`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF8A4C" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FF8A4C" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx={200} cy={416} rx={172} ry={20} fill="#05030A" opacity={0.46} />

        {/* steam behind the cylinder */}
        {jammed
          ? steam.map((puff, i) => (
              <circle
                key={`steam-${i}`}
                cx={puff.cx}
                cy={puff.cy}
                r={puff.r}
                fill="#B7BBC8"
                opacity={puff.opacity}
              />
            ))
          : null}

        <g transform={`translate(${vibration} 0)`}>
          {/* base skid */}
          <rect x={46} y={392} width={308} height={24} rx={7} fill="#202637" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={66} y={402} width={36} height={6} rx={3} fill="#3C4459" />
          <rect x={298} y={402} width={36} height={6} rx={3} fill="#3C4459" />

          {/* piston rod */}
          <rect x={210} y={62 + piston} width={18} height={104} rx={5} fill="#9AA5B8" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={190} y={54 + piston} width={58} height={20} rx={7} fill="#4B5570" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <circle cx={219} cy={64 + piston} r={4} fill="#1B2130" />

          {/* cylinder */}
          <rect x={150} y={150} width={138} height={104} rx={20} fill={`url(#${uid}-body)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={164} y={170} width={110} height={64} rx={12} fill="#1B2130" opacity={0.55} />
          <rect x={204} y={180 + piston * 0.35} width={30} height={44} rx={5} fill="#5C6888" stroke={INK} strokeWidth={2.4} />
          <path d="M 150 214 H 288 M 150 194 H 288" stroke="#6F7C9C" strokeWidth={2.4} opacity={0.45} />
          <circle cx={162} cy={162} r={3.4} fill="#121725" />
          <circle cx={276} cy={162} r={3.4} fill="#121725" />
          <circle cx={162} cy={242} r={3.4} fill="#121725" />
          <circle cx={276} cy={242} r={3.4} fill="#121725" />

          {/* pump body */}
          <rect x={78} y={250} width={236} height={144} rx={16} fill={`url(#${uid}-body)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={94} y={266} width={204} height={112} rx={10} fill="none" stroke="#5A6788" strokeWidth={2.4} opacity={0.45} />
          <path d="M 118 300 H 168 M 118 316 H 168 M 118 332 H 152" stroke="#1A2030" strokeWidth={4} strokeLinecap="round" opacity={0.65} />

          {/* warning lamp */}
          <circle
            cx={280}
            cy={282}
            r={7}
            fill={jammed ? "#FF5E3A" : pumping ? "#7BE08A" : "#3A4658"}
            opacity={jammed ? 0.45 + 0.55 * pulse(frame, 0.5) : pumping ? 0.85 : 0.6}
          />

          {/* flywheel */}
          <circle cx={320} cy={322} r={48} fill="#171C2A" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <g transform={`rotate(${flyAngle} 320 322)`}>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2;
              return (
                <path
                  key={`fly-${i}`}
                  d={`M 320 322 L ${320 + Math.cos(a) * 40} ${322 + Math.sin(a) * 40}`}
                  stroke="#6E7C9C"
                  strokeWidth={6}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
          <circle cx={320} cy={322} r={11} fill="#4B5570" stroke={INK} strokeWidth={PROP_OUTLINE} />

          {/* outlet pipe */}
          <path d="M 314 250 V 222 Q 314 208 330 208 H 372" fill="none" stroke={INK} strokeWidth={18} strokeLinecap="round" />
          <path d="M 314 250 V 222 Q 314 208 330 208 H 372" fill="none" stroke="#5A6278" strokeWidth={11} strokeLinecap="round" />
          <rect x={362} y={196} width={22} height={24} rx={5} fill="#303849" stroke={INK} strokeWidth={PROP_OUTLINE} />

          {/* pressure gauge */}
          <g>
            <circle cx={108} cy={160} r={56} fill="#2A3044" stroke={INK} strokeWidth={PROP_OUTLINE} />
            <circle cx={108} cy={160} r={48} fill={`url(#${uid}-face)`} stroke={INK} strokeWidth={2.4} />
            {Array.from({ length: 11 }, (_, i) => {
              const a = ((-220 + i * 26) * Math.PI) / 180;
              const inner = i % 5 === 0 ? 34 : 39;
              return (
                <path
                  key={`tick-${i}`}
                  d={`M ${108 + Math.cos(a) * 44} ${160 + Math.sin(a) * 44} L ${
                    108 + Math.cos(a) * inner
                  } ${160 + Math.sin(a) * inner}`}
                  stroke={i >= 8 ? "#B23A2A" : "#3A3428"}
                  strokeWidth={i % 5 === 0 ? 3 : 1.8}
                  strokeLinecap="round"
                />
              );
            })}
            <path
              d="M 70 196 A 48 48 0 0 1 146 196"
              fill="none"
              stroke="#B23A2A"
              strokeWidth={3}
              opacity={0.55}
            />
            <g transform={`rotate(${needleAngle} 108 160)`}>
              <path d="M 108 160 L 108 122" stroke="#B23A2A" strokeWidth={3.4} strokeLinecap="round" />
            </g>
            <circle cx={108} cy={160} r={6} fill="#2A3044" stroke={INK} strokeWidth={2.4} />
            <text x={108} y={186} textAnchor="middle" fontFamily="Arial Black, Segoe UI, sans-serif" fontSize={8} fontWeight={900} fill="#4A4334">
              BAR
            </text>
          </g>
        </g>

        {jammed ? (
          <ellipse cx={108} cy={160} rx={72} ry={72} fill={`url(#${uid}-heat)`} opacity={0.4 + 0.3 * pulse(frame, 0.4)} />
        ) : null}

        <text
          x={200}
          y={422}
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

export const pumpProp: PropDefinition<PumpState> = {
  id: "pump",
  name: "Pump",
  description:
    "Piston pump: idle, pumping with a moving rod and flywheel, or jammed with a trembling red-line gauge.",
  states: PUMP_STATES,
  defaultState: "idle",
  size: PUMP_SIZE,
  focus: { x: 108, y: 160 },
  Component: Pump,
};
