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

export type RadioState = "off" | "static" | "transmitting";

export const RADIO_STATES: readonly RadioState[] = [
  "off",
  "static",
  "transmitting",
];

export const RADIO_SIZE = { width: 280, height: 390 } as const;

/**
 * Handheld radio station. `static` flicks the signal bars and noise screen,
 * `transmitting` pushes the PTT button and fires warm sound waves,
 * `eventProgress` drives the wave amplitude and the LED.
 */
export const Radio: React.FC<PropProps<RadioState>> = (props) => {
  const { x, y, scale = 1, state, eventProgress = 0, seed, style, className } =
    props;
  const frame = usePropFrame(props);
  const event = eventLevel(eventProgress);
  const seedValue = seed ?? 0;
  const uid = `radio-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const off = state === "off";
  const isStatic = state === "static";
  const transmitting = state === "transmitting";

  const led = off
    ? 0.08
    : transmitting
      ? pulse(frame, 0.34, 0.45 + event * 0.25, 1)
      : isStatic
        ? 0.25 + 0.6 * loopPhase(frame, 22, seedValue, 3)
        : 0.3;

  const bars =
    off
      ? 0
      : transmitting
        ? 4
        : isStatic
          ? 1 + Math.round(loopPhase(frame, 14, seedValue, 2) * 3)
          : 1;

  const noise = Array.from({ length: 9 }, (_, i) => {
    const row = i;
    const blink = Math.floor(frame / 2);
    const w = 20 + rand(seedValue + i * 7, blink) * 48;
    return { y: 62 + row * 9, w, alpha: 0.2 + rand(seedValue + i, blink + 3) * 0.55 };
  });

  const layout: PropLayout<RadioState> = {
    x,
    y,
    scale,
    state,
    eventProgress: event,
    seed: seedValue,
  };

  const waveColor = transmitting ? "#FFC077" : "#9FE7F2";
  const waves = Array.from({ length: 4 }, (_, i) => {
    const p = loopPhase(frame, 40, seedValue, i + 8);
    const r = 18 + i * 15 + p * 6;
    return {
      r,
      opacity:
        off
          ? 0
          : (1 - Math.abs(p - 0.5) * 2) *
            (transmitting ? 0.4 + event * 0.6 : 0.18 + event * 0.35),
    };
  });

  return (
    <div
      className={className}
      style={propContainerStyle(RADIO_SIZE, layout, style)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${RADIO_SIZE.width} ${RADIO_SIZE.height}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3D615A" />
            <stop offset="55%" stopColor="#28443F" />
            <stop offset="100%" stopColor="#172D2B" />
          </linearGradient>
          <linearGradient id={`${uid}-screen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0D2622" />
            <stop offset="100%" stopColor="#051110" />
          </linearGradient>
          <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={transmitting ? "#FFB25E" : "#8FE3F0"} stopOpacity="0.42" />
            <stop offset="100%" stopColor={transmitting ? "#FFB25E" : "#8FE3F0"} stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx={136} cy={374} rx={84} ry={13} fill="#05030A" opacity={0.46} />

        {/* sound waves */}
        <g>
          <circle cx={222} cy={252} r={90} fill={`url(#${uid}-halo)`} opacity={off ? 0 : 0.55 + event * 0.3} />
          {waves.map((wave, i) => (
            <path
              key={`wave-${i}`}
              d={`M 226 ${252 - wave.r} A ${wave.r} ${wave.r} 0 0 1 226 ${252 + wave.r}`}
              fill="none"
              stroke={waveColor}
              strokeWidth={PROP_OUTLINE}
              strokeLinecap="round"
              opacity={wave.opacity}
            />
          ))}
        </g>

        <g transform={`translate(${transmitting ? Math.sin(frame * 3.1) * 1.2 : 0} 0)`}>
          {/* antenna */}
          <path d="M 198 126 L 218 26" stroke={INK} strokeWidth={8} strokeLinecap="round" />
          <path d="M 198 126 L 218 26" stroke="#8FA3B8" strokeWidth={3.4} strokeLinecap="round" />
          <circle cx={218} cy={26} r={5} fill="#FFC077" stroke={INK} strokeWidth={2.4} />

          {/* PTT button */}
          <rect x={26} y={184} width={18} height={48} rx={7} fill="#2A3D3A" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect
            x={31}
            y={transmitting ? 190 : 200}
            width={8}
            height={transmitting ? 22 : 20}
            rx={4}
            fill={transmitting ? "#C25A3A" : "#4A625C"}
          />

          {/* body */}
          <rect x={42} y={116} width={180} height={244} rx={20} fill={`url(#${uid}-body)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={54} y={128} width={156} height={220} rx={14} fill="none" stroke="#53746D" strokeWidth={2} opacity={0.45} />

          {/* top knobs */}
          <circle cx={70} cy={106} r={13} fill="#1D302D" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <path d={`M 70 106 L ${70 + Math.cos(frame * 0.03) * 8} ${106 + Math.sin(frame * 0.03) * 8}`} stroke="#8FA3B8" strokeWidth={3} strokeLinecap="round" />
          <circle cx={198} cy={108} r={10} fill="#1D302D" stroke={INK} strokeWidth={PROP_OUTLINE} />

          {/* LED */}
          <circle cx={232} cy={140} r={5} fill={transmitting ? "#FF8A4C" : isStatic ? "#FFC077" : "#3A5A52"} opacity={0.35 + 0.65 * led} />

          {/* screen */}
          <rect x={58} y={142} width={94} height={74} rx={7} fill={`url(#${uid}-screen)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
          {off ? (
            <path d="M 62 148 L 84 154 M 62 162 L 76 166" stroke="#1B3530" strokeWidth={2} opacity={0.4} />
          ) : isStatic ? (
            <g>
              {noise.map((line, i) => (
                <rect
                  key={`noise-${i}`}
                  x={64}
                  y={line.y}
                  width={line.w}
                  height={2.4}
                  rx={1.2}
                  fill={i % 3 === 0 ? "#CFF8FF" : "#8FE3F0"}
                  opacity={line.alpha}
                />
              ))}
              <text x={108} y={206} textAnchor="middle" fontFamily="Arial Black, Segoe UI, sans-serif" fontSize={9} fontWeight={900} fill="#6FA9A0">
                110.4
              </text>
            </g>
          ) : (
            <g>
              <text x={72} y={168} fontFamily="Arial Black, Segoe UI, sans-serif" fontSize={16} fontWeight={900} fill="#FFD7A3">
                TX
              </text>
              <rect x={70} y={180} width={62} height={6} rx={3} fill="#1E3B36" />
              <rect x={70} y={180} width={62 * (0.4 + event * 0.6)} height={6} rx={3} fill="#FFB25E" opacity={0.9} />
              <path d="M 126 192 C 136 200 136 206 126 214" fill="none" stroke="#FFC077" strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
              <path d="M 132 186 C 146 200 146 206 132 220" fill="none" stroke="#FFC077" strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
            </g>
          )}

          {/* signal bars */}
          <g>
            {[0, 1, 2, 3].map((i) => {
              const active = i < bars;
              return (
                <rect
                  key={`bar-${i}`}
                  x={72 + i * 12}
                  y={224 - i * 4}
                  width={7}
                  height={8 + i * 4}
                  rx={2}
                  fill={active ? "#9FE7F2" : "#203A35"}
                  opacity={active ? 0.65 + 0.35 * led : 0.7}
                />
              );
            })}
          </g>

          {/* speaker grill */}
          <rect x={58} y={244} width={148} height={86} rx={10} fill="#142825" stroke={INK} strokeWidth={PROP_OUTLINE} />
          {Array.from({ length: 7 }, (_, row) =>
            Array.from({ length: 13 }, (_, col) => (
              <circle
                key={`hole-${row}-${col}`}
                cx={70 + col * 10.5}
                cy={256 + row * 10.5}
                r={2.5}
                fill="#06100F"
                opacity={0.85}
              />
            )),
          )}

          {/* brand plate */}
          <text
            x={132}
            y={350}
            textAnchor="middle"
            fontFamily="Arial Black, Segoe UI, sans-serif"
            fontSize={11}
            fontWeight={900}
            fill="#7FA69E"
            opacity={0.6}
          >
            FIELD RADIO
          </text>
        </g>
      </svg>
    </div>
  );
};

export const radioProp: PropDefinition<RadioState> = {
  id: "radio",
  name: "Radio",
  description:
    "Handheld radio: off, hissing static with a flickering signal meter, or transmitting with sound waves.",
  states: RADIO_STATES,
  defaultState: "off",
  size: RADIO_SIZE,
  focus: (layout) => ({ x: 132, y: layout.state === "off" ? 160 : 150 }),
  Component: Radio,
};
