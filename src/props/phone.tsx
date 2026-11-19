import React from "react";
import { INK } from "../palette";
import { eventLevel, loopPhase, PROP_OUTLINE, pulse, usePropFrame } from "./shared";
import {
  propContainerStyle,
  type PropDefinition,
  type PropLayout,
  type PropProps,
} from "./types";

export type PhoneState = "idle" | "ringing" | "broken" | "off";

export const PHONE_STATES: readonly PhoneState[] = [
  "idle",
  "ringing",
  "broken",
  "off",
];

export const PHONE_SIZE = { width: 220, height: 360 } as const;

/**
 * Smartphone. `ringing` vibrates and pulses the screen; `eventProgress`
 * amplifies the vibration and the incoming-call waves. `broken` shows a
 * cracked panel, `off` is a dead screen, `idle` a dim lock screen.
 */
export const Phone: React.FC<PropProps<PhoneState>> = (props) => {
  const { x, y, scale = 1, state, eventProgress = 0, seed, style, className } =
    props;
  const frame = usePropFrame(props);
  const event = eventLevel(eventProgress);
  const seedValue = seed ?? 0;
  const uid = `phone-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const ringing = state === "ringing";
  const broken = state === "broken";
  const off = state === "off";

  const vibrate = ringing
    ? Math.sin(frame * 2.45) * (1.4 + event * 4.6) +
      Math.sin(frame * 5.1) * (0.6 + event * 1.4)
    : 0;

  const layout: PropLayout<PhoneState> = {
    x,
    y,
    scale,
    state,
    eventProgress: event,
    seed: seedValue,
  };

  const led = ringing ? pulse(frame, 0.42, 0.35, 1) : off ? 0.08 : 0.45;

  return (
    <div
      className={className}
      style={propContainerStyle(PHONE_SIZE, layout, style)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${PHONE_SIZE.width} ${PHONE_SIZE.height}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4A5372" />
            <stop offset="55%" stopColor="#2C3249" />
            <stop offset="100%" stopColor="#171B2A" />
          </linearGradient>
          <linearGradient id={`${uid}-screen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#132437" />
            <stop offset="100%" stopColor="#071019" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFB25E" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFB25E" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-dead`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#101720" />
            <stop offset="100%" stopColor="#05070B" />
          </linearGradient>
        </defs>

        {/* ground shadow */}
        <ellipse cx={110} cy={350} rx={76} ry={12} fill="#05030A" opacity={0.46} />

        {/* incoming-call halo */}
        {ringing ? (
          <g>
            <ellipse
              cx={110}
              cy={172}
              rx={104}
              ry={150}
              fill={`url(#${uid}-glow)`}
              opacity={0.35 + event * 0.55}
            />
            {Array.from({ length: 3 }, (_, i) => {
              const p = loopPhase(frame, 34, seedValue, i + 11);
              const r = 58 + p * 52;
              return (
                <circle
                  key={`ring-${i}`}
                  cx={110}
                  cy={168}
                  r={r}
                  fill="none"
                  stroke="#FFC077"
                  strokeWidth={PROP_OUTLINE}
                  opacity={(1 - p) * (0.18 + event * 0.5)}
                />
              );
            })}
          </g>
        ) : null}

        <g transform={`translate(${vibrate} 0)`}>
          {/* side buttons */}
          <rect x={28} y={112} width={8} height={34} rx={3} fill="#20253A" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={28} y={158} width={8} height={52} rx={3} fill="#20253A" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <rect x={184} y={132} width={8} height={62} rx={3} fill="#20253A" stroke={INK} strokeWidth={PROP_OUTLINE} />

          {/* body */}
          <rect
            x={34}
            y={14}
            width={152}
            height={332}
            rx={28}
            fill={`url(#${uid}-body)`}
            stroke={INK}
            strokeWidth={PROP_OUTLINE}
          />
          {/* speaker slit + camera */}
          <rect x={88} y={29} width={44} height={6} rx={3} fill="#070A12" opacity={0.8} />
          <circle cx={148} cy={32} r={4} fill="#1B2A38" stroke={INK} strokeWidth={2} />
          <circle cx={148} cy={32} r={1.9} fill="#6E8FA8" />

          {/* screen */}
          <rect
            x={48}
            y={46}
            width={124}
            height={252}
            rx={16}
            fill={broken || off ? `url(#${uid}-dead)` : `url(#${uid}-screen)`}
            stroke={INK}
            strokeWidth={PROP_OUTLINE}
          />

          {ringing ? (
            <g>
              <rect
                x={58}
                y={58}
                width={104}
                height={228}
                rx={10}
                fill="#0C2A33"
                opacity={0.9}
              />
              <circle cx={110} cy={132} r={35} fill="#143B46" stroke="#8FE3F0" strokeWidth={PROP_OUTLINE} />
              <path
                d="M 96 120 C 96 146 124 146 124 120 L 119 116 C 112 122 108 122 101 116 Z"
                fill="#8FE3F0"
                stroke={INK}
                strokeWidth={2}
              />
              <path d="M 90 152 C 100 160 120 160 130 152" fill="none" stroke="#8FE3F0" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
              <text
                x={110}
                y={196}
                textAnchor="middle"
                fontFamily="Arial Black, Segoe UI, sans-serif"
                fontSize={13}
                fontWeight={900}
                fill="#FFD7A3"
                opacity={0.65 + 0.35 * led}
              >
                ВХІДНИЙ
              </text>
              <text
                x={110}
                y={216}
                textAnchor="middle"
                fontFamily="Arial, Segoe UI, sans-serif"
                fontSize={9}
                fill="#7FB7C6"
              >
                НЕВІДОМИЙ
              </text>
              <rect x={74} y={244} width={72} height={18} rx={9} fill="#8FE3F0" opacity={0.18 + event * 0.4} />
              <rect x={86} y={249} width={48} height={8} rx={4} fill="#B9F1FA" opacity={0.5 + 0.5 * led} />
            </g>
          ) : broken ? (
            <g>
              <rect x={58} y={58} width={104} height={228} rx={10} fill="#0A1119" opacity={0.85} />
              <path
                d="M 72 62 L 96 112 L 86 134 L 112 172 L 100 198 L 126 238 L 116 282"
                fill="none"
                stroke="#8FA2B8"
                strokeWidth={2.4}
                opacity={0.85}
              />
              <path
                d="M 96 112 L 134 96 M 112 172 L 156 158 M 100 198 L 66 214 M 126 238 L 158 250"
                fill="none"
                stroke="#6E7F96"
                strokeWidth={1.8}
                opacity={0.7}
              />
              <path d="M 58 200 L 100 198 L 126 238 L 162 228 L 162 286 L 58 286 Z" fill="#05080D" opacity={0.86} />
              <rect x={74} y={70} width={30} height={16} rx={3} fill="#28384A" opacity={0.5} />
              <rect x={130} y={112} width={20} height={10} rx={2} fill="#1B2736" opacity={0.6} />
              <circle cx={144} cy={196} r={7} fill="#3E5268" opacity={0.35} />
            </g>
          ) : off ? (
            <g>
              <path d="M 60 60 L 96 46 L 96 296 L 60 282 Z" fill="#121A24" opacity={0.45} />
              <path d="M 62 78 L 88 70 M 62 96 L 80 91" stroke="#26313F" strokeWidth={2} opacity={0.4} />
            </g>
          ) : (
            <g>
              <rect x={58} y={58} width={104} height={228} rx={10} fill="#0B1A27" opacity={0.92} />
              <text
                x={110}
                y={126}
                textAnchor="middle"
                fontFamily="Arial Black, Segoe UI, sans-serif"
                fontSize={34}
                fontWeight={900}
                fill="#B9D6E8"
              >
                03:14
              </text>
              <text
                x={110}
                y={146}
                textAnchor="middle"
                fontFamily="Arial, Segoe UI, sans-serif"
                fontSize={9}
                fill="#5E8199"
              >
                СЕКТОР 07
              </text>
              <rect x={70} y={164} width={80} height={26} rx={8} fill="#12283A" stroke="#27445C" strokeWidth={2} />
              <circle cx={82} cy={177} r={4} fill="#FF9A57" />
              <rect x={92} y={172} width={46} height={4} rx={2} fill="#7C9DB2" opacity={0.7} />
              <rect x={92} y={180} width={30} height={3} rx={1.5} fill="#4C6A80" opacity={0.7} />
              <rect x={70} y={200} width={80} height={48} rx={8} fill="#0E2130" stroke="#20384C" strokeWidth={2} />
              <path d="M 80 232 L 96 214 L 108 226 L 122 208 L 140 232" fill="none" stroke="#FFB25E" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
              <circle cx={110} cy={266} r={5} fill="#27445C" />
            </g>
          )}

          {/* home button */}
          <circle cx={110} cy={318} r={13} fill="#141827" stroke={INK} strokeWidth={PROP_OUTLINE} />
          <circle cx={110} cy={318} r={5} fill={ringing ? "#FFC077" : "#37405A"} opacity={ringing ? led : 0.8} />

          {/* alert LED */}
          <circle
            cx={110}
            cy={22}
            r={3.2}
            fill={ringing ? "#FFB25E" : broken ? "#FF5E3A" : "#8FE3F0"}
            opacity={ringing ? 0.4 + 0.6 * led : broken ? 0.35 : 0.25}
          />
        </g>

        {/* vibration marks */}
        {ringing ? (
          <g stroke="#FFC077" strokeWidth={PROP_OUTLINE} strokeLinecap="round" fill="none">
            <path d={`M 20 150 L 10 158 L 20 166`} opacity={0.35 + event * 0.55} />
            <path d={`M 200 150 L 210 158 L 200 166`} opacity={0.35 + event * 0.55} />
            <path d={`M 20 198 L 12 204 L 20 210`} opacity={0.25 + event * 0.35} />
          </g>
        ) : null}
      </svg>
    </div>
  );
};

export const phoneProp: PropDefinition<PhoneState> = {
  id: "phone",
  name: "Phone",
  description:
    "Smartphone: idle lock screen, ringing alert with vibration, cracked panel or powered off.",
  states: PHONE_STATES,
  defaultState: "idle",
  size: PHONE_SIZE,
  focus: (layout) => ({ x: 110, y: layout.state === "broken" ? 160 : 142 }),
  Component: Phone,
};
