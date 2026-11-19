import React from "react";
import { INK } from "../palette";
import { eventLevel, loopPhase, PROP_OUTLINE, pulse, usePropFrame } from "./shared";
import {
  propContainerStyle,
  type PropDefinition,
  type PropLayout,
  type PropProps,
} from "./types";

export type GeneratorState = "off" | "running" | "sparking" | "broken";

export const GENERATOR_STATES: readonly GeneratorState[] = [
  "off",
  "running",
  "sparking",
  "broken",
];

export const GENERATOR_SIZE = { width: 380, height: 420 } as const;

/**
 * Portable fuel generator. `running` vibrates the frame, spins the cooling
 * fan and puffs exhaust smoke; `sparking` adds a deterministic spark shower
 * around the terminal; `broken` tilts the unit into an oil puddle.
 */
export const Generator: React.FC<PropProps<GeneratorState>> = (props) => {
  const { x, y, scale = 1, state, eventProgress = 0, seed, style, className } =
    props;
  const frame = usePropFrame(props);
  const event = eventLevel(eventProgress);
  const seedValue = seed ?? 0;
  const uid = `gen-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const running = state === "running" || state === "sparking";
  const sparking = state === "sparking";
  const broken = state === "broken";

  const vibration = running
    ? Math.sin(frame * 1.85) * (1.1 + event * 1.9)
    : broken
      ? 0
      : 0;
  const fanSpeed = running ? 6.5 + event * 7 : 0;
  const fanAngle = frame * fanSpeed;
  const coilGlow = running ? 0.55 + 0.45 * pulse(frame, 0.24, 0.5, 1) : 0.08;

  const layout: PropLayout<GeneratorState> = {
    x,
    y,
    scale,
    state,
    eventProgress: event,
    seed: seedValue,
  };

  const smoke = Array.from({ length: 7 }, (_, i) => {
    const p = loopPhase(frame, 86, seedValue, i + 4);
    return {
      p,
      cx: 246 + Math.sin(frame * 0.06 + i * 1.7) * (6 + i * 2),
      cy: 108 - p * 118 - i * 4,
      r: 5 + p * 17 + i * 0.6,
      opacity: (1 - p) * (running ? 0.34 : broken ? 0.18 : 0),
    };
  });

  const sparks = Array.from({ length: 15 }, (_, i) => {
    const p = loopPhase(frame, 20, seedValue + 5, i);
    const base = -2.4 + (i / 15) * 2.1;
    const spread = 32 + (i % 5) * 13;
    const sx = 246 + Math.cos(base) * p * spread;
    const sy = 214 + Math.sin(base) * p * (spread * 0.7) + p * p * 34;
    return {
      sx,
      sy,
      opacity: (1 - p) * (sparking ? 1 : 0.25),
      size: 1.6 + (i % 4) * 0.7,
    };
  });

  return (
    <div
      className={className}
      style={propContainerStyle(GENERATOR_SIZE, layout, style)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${GENERATOR_SIZE.width} ${GENERATOR_SIZE.height}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4C5775" />
            <stop offset="100%" stopColor="#262D43" />
          </linearGradient>
          <linearGradient id={`${uid}-tank`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A64A38" />
            <stop offset="100%" stopColor="#6E2E24" />
          </linearGradient>
          <radialGradient id={`${uid}-heat`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFC077" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF7A3D" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx={190} cy={404} rx={162} ry={22} fill="#05030A" opacity={0.46} />

        {/* oil puddle when broken */}
        {broken ? (
          <g>
            <ellipse cx={148} cy={400} rx={92} ry={15} fill="#1C1A16" stroke={INK} strokeWidth={PROP_OUTLINE} opacity={0.9} />
            <ellipse cx={132} cy={397} rx={46} ry={6} fill="#3A352A" opacity={0.45} />
          </g>
        ) : null}

        {/* exhaust smoke */}
        {running || broken
          ? smoke.map((puff, i) => (
              <circle
                key={`smoke-${i}`}
                cx={puff.cx}
                cy={puff.cy}
                r={puff.r}
                fill="#8E93A8"
                opacity={puff.opacity}
              />
            ))
          : null}

        <g transform={`translate(${vibration} 0) ${broken ? "rotate(-3.4 190 300)" : ""}`}>
          {/* skid frame */}
          <rect x={52} y={372} width={276} height={20} rx={7} fill="#202637" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <circle cx={92} cy={392} r={17} fill="#161B29" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <circle cx={92} cy={392} r={6} fill="#3C4459" />
          <circle cx={288} cy={392} r={17} fill="#161B29" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <circle cx={288} cy={392} r={6} fill="#3C4459" />

          {/* fuel tank */}
          <rect x={92} y={140} width={196} height={58} rx={17} fill={`url(#${uid}-tank)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={112} y={152} width={156} height={7} rx={3.5} fill="#D07A5A" opacity={0.35} />
          <circle cx={252} cy={160} r={11} fill="#20202B" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <path d="M 252 151 L 252 169 M 243 160 L 261 160" stroke="#8E93A8" strokeWidth={2.4} strokeLinecap="round" />
          <text x={126} y={186} fontFamily="Arial Black, Segoe UI, sans-serif" fontSize={12} fontWeight={900} fill="#F0D6C0" opacity={0.6}>
            FUEL
          </text>

          {/* body */}
          <rect x={68} y={206} width={244} height={158} rx={12} fill={`url(#${uid}-body)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={84} y={222} width={92} height={10} rx={5} fill="#1B2130" opacity={0.6} />
          <rect x={84} y={240} width={92} height={10} rx={5} fill="#1B2130" opacity={0.45} />
          <rect x={84} y={258} width={70} height={10} rx={5} fill="#1B2130" opacity={0.35} />

          {/* engine cylinder */}
          <rect x={118} y={258} width={120} height={62} rx={12} fill="#1C2233" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <path d="M 132 272 H 224 M 132 288 H 224 M 132 304 H 224" stroke="#4E5A78" strokeWidth={3} opacity={0.55} />
          <circle cx={196} cy={274} r={4} fill="#FFC077" opacity={coilGlow} />
          <circle cx={214} cy={274} r={4} fill="#8FE3F0" opacity={running ? 0.65 : 0.12} />

          {/* cooling fan */}
          <circle cx={104} cy={296} r={44} fill="#171C2A" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <g transform={`rotate(${fanAngle} 104 296)`}>
            {Array.from({ length: 5 }, (_, i) => {
              const a = (i / 5) * Math.PI * 2;
              const bx = 104 + Math.cos(a) * 6;
              const by = 296 + Math.sin(a) * 6;
              const ex = 104 + Math.cos(a) * 36;
              const ey = 296 + Math.sin(a) * 36;
              return (
                <path
                  key={`blade-${i}`}
                  d={`M ${bx} ${by} Q ${104 + Math.cos(a + 0.5) * 28} ${296 + Math.sin(a + 0.5) * 28} ${ex} ${ey}`}
                  fill="none"
                  stroke="#6E7C9C"
                  strokeWidth={8}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
          <circle cx={104} cy={296} r={9} fill="#3C4459" stroke={INK} strokeWidth={PROP_OUTLINE} />

          {/* control panel */}
          <rect x={248} y={224} width={50} height={78} rx={7} fill="#1A1F2E" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <circle cx={273} cy={246} r={14} fill="#E8E2CE" stroke={INK} strokeWidth={2.4} />
          <path d={`M 273 246 L ${273 + Math.cos(-2.2 + coilGlow * 2.2) * 10} ${246 + Math.sin(-2.2 + coilGlow * 2.2) * 10}`} stroke="#C2452F" strokeWidth={2.4} strokeLinecap="round" />
          <rect x={259} y={268} width={28} height={14} rx={5} fill="#323B52" stroke={INK} strokeWidth={2.4} />
          <circle cx={263} cy={287} r={3.4} fill={running ? "#7BE08A" : "#3A4658"} opacity={running ? 0.4 + 0.6 * pulse(frame, 0.4) : 1} />

          {/* exhaust */}
          <path d="M 232 206 V 126 Q 232 112 248 112 H 264" fill="none" stroke={INK} strokeWidth={18} strokeLinecap="round" />
          <path d="M 232 206 V 126 Q 232 112 248 112 H 264" fill="none" stroke="#5A6278" strokeWidth={11} strokeLinecap="round" />
          <rect x={258} y={98} width={30} height={30} rx={9} fill="#303849" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={262} y={102} width={22} height={5} rx={2.5} fill="#7C869E" opacity={0.5} />
        </g>

        {/* spark burst */}
        {sparking || running ? (
          <g>
            <ellipse cx={246} cy={214} rx={60} ry={50} fill={`url(#${uid}-heat)`} opacity={sparking ? 0.5 + event * 0.4 : 0.12} />
            {sparks.map((spark, i) => (
              <circle
                key={`spark-${i}`}
                cx={spark.sx}
                cy={spark.sy}
                r={spark.size}
                fill={i % 3 === 0 ? "#FFF6D8" : "#FFC077"}
                opacity={spark.opacity}
              />
            ))}
            <path
              d={`M 246 214 L ${258 + Math.sin(frame * 4.1) * 8} ${198 + Math.cos(frame * 3.4) * 7} L ${272 + Math.sin(frame * 2.7) * 6} ${212 + Math.sin(frame * 5.3) * 6}`}
              fill="none"
              stroke="#8FE3F0"
              strokeWidth={PROP_OUTLINE}
              opacity={sparking ? 0.55 + 0.45 * pulse(frame, 0.7) : 0.12}
            />
          </g>
        ) : null}

        {/* status stencil */}
        <text
          x={190}
          y={414}
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

export const generatorProp: PropDefinition<GeneratorState> = {
  id: "generator",
  name: "Generator",
  description:
    "Fuel generator: off, running with a spinning fan and smoke, sparking terminal or broken with an oil leak.",
  states: GENERATOR_STATES,
  defaultState: "off",
  size: GENERATOR_SIZE,
  focus: { x: 190, y: 272 },
  Component: Generator,
};
