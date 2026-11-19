import React from "react";
import { rand, clamp01 } from "../Camera";
import { INK } from "../palette";
import { eventLevel, PROP_OUTLINE, usePropFrame } from "./shared";
import {
  propContainerStyle,
  type PropDefinition,
  type PropLayout,
  type PropProps,
} from "./types";

export type NotebookState = "closed" | "open" | "flipping";

export const NOTEBOOK_STATES: readonly NotebookState[] = [
  "closed",
  "open",
  "flipping",
];

export const NOTEBOOK_SIZE = { width: 380, height: 480 } as const;

/**
 * Field notebook. `closed` shows a leather cover with a label, `open`
 * reveals handwritten notes and a hand-drawn radio-tower diagram,
 * `flipping` turns the right page by `eventProgress`.
 */
export const Notebook: React.FC<PropProps<NotebookState>> = (props) => {
  const { x, y, scale = 1, state, eventProgress = 0, seed, style, className } =
    props;
  const frame = usePropFrame(props);
  const event = eventLevel(eventProgress);
  const seedValue = seed ?? 0;
  const uid = `note-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const closed = state === "closed";
  const flip = state === "flipping" ? clamp01(event) : 0;
  const pageLift = Math.sin(frame * 0.07) * 1.2;

  const layout: PropLayout<NotebookState> = {
    x,
    y,
    scale,
    state,
    eventProgress: event,
    seed: seedValue,
  };

  const noteLines = Array.from({ length: 10 }, (_, i) => ({
    y: 190 + i * 19,
    w: 56 + rand(seedValue + i, 5) * 66,
    indent: i % 4 === 0 ? 10 : 0,
  }));

  return (
    <div
      className={className}
      style={propContainerStyle(NOTEBOOK_SIZE, layout, style)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${NOTEBOOK_SIZE.width} ${NOTEBOOK_SIZE.height}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-leather`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7A5236" />
            <stop offset="55%" stopColor="#5C3A27" />
            <stop offset="100%" stopColor="#3E2619" />
          </linearGradient>
          <linearGradient id={`${uid}-paper`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F2E7CB" />
            <stop offset="100%" stopColor="#DCCBAA" />
          </linearGradient>
          <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9B896" />
            <stop offset="100%" stopColor="#A08D6B" />
          </linearGradient>
        </defs>

        <ellipse cx={190} cy={452} rx={132} ry={18} fill="#05030A" opacity={0.45} />

        {closed ? (
          <g transform={`rotate(-2 190 290)`}>
            <rect x={76} y={104} width={228} height={322} rx={13} fill={`url(#${uid}-leather)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
            <rect x={88} y={116} width={204} height={298} rx={8} fill="none" stroke="#C9A46A" strokeWidth={2} strokeDasharray="6 6" opacity={0.4} />
            {/* spine */}
            <rect x={76} y={104} width={22} height={322} rx={9} fill="#3A2418" stroke={INK} strokeWidth={PROP_OUTLINE} />
            <path d="M 84 130 V 400" stroke="#8A6242" strokeWidth={2.4} strokeDasharray="3 7" opacity={0.6} />

            {/* elastic strap */}
            <rect x={254} y={104} width={16} height={322} fill="#2B2A36" stroke={INK} strokeWidth={2.4} />
            <rect x={256} y={104} width={5} height={322} fill="#4A4759" opacity={0.7} />

            {/* label */}
            <rect x={116} y={158} width={122} height={76} rx={6} fill="#D8C69C" stroke={INK} strokeWidth={PROP_OUTLINE} />
            <text x={177} y={192} textAnchor="middle" fontFamily="Arial Black, Segoe UI, sans-serif" fontSize={22} fontWeight={900} fill="#3A2718">
              LOG 07
            </text>
            <text x={177} y={212} textAnchor="middle" fontFamily="Arial, Segoe UI, sans-serif" fontSize={9} fill="#5C452C">
              ПОЛЬОВИЙ ЖУРНАЛ
            </text>

            {/* corner wear */}
            <path d="M 290 400 L 304 414 L 290 426 Z" fill="#241509" opacity={0.6} />
            <path d="M 100 410 L 112 420 L 100 426 Z" fill="#241509" opacity={0.5} />
            <circle cx={224} cy={286} r={4} fill="#2B2A36" opacity={0.7} />
          </g>
        ) : (
          <g>
            {/* back cover */}
            <rect x={44} y={124} width={292} height={296} rx={12} fill="#3E2619" stroke={INK} strokeWidth={PROP_OUTLINE} />
            <rect x={52} y={132} width={276} height={280} rx={8} fill={`url(#${uid}-edge)`} />

            {/* left page */}
            <g transform={`translate(0 ${pageLift})`}>
              <rect x={58} y={136} width={132} height={268} rx={5} fill={`url(#${uid}-paper)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
              <path d="M 68 156 H 180 M 68 392 H 180" stroke="#B7A47F" strokeWidth={1.6} opacity={0.6} />
              {/* hand-drawn radio tower */}
              <g stroke="#4A3A28" strokeWidth={2.4} strokeLinecap="round" fill="none">
                <path d="M 112 352 L 124 208 L 136 352" />
                <path d="M 106 352 H 142" />
                <path d="M 124 208 V 188" />
                <circle cx={124} cy={184} r={5} />
                <path d="M 104 300 L 124 286 L 144 300" opacity={0.75} />
                <path d="M 94 276 Q 124 236 154 276" opacity={0.5} />
                <path d="M 84 254 Q 124 198 164 254" opacity={0.35} />
              </g>
              <path d="M 86 330 L 100 320 L 112 332 L 128 310 L 146 326" stroke="#8A3A2A" strokeWidth={2.2} fill="none" opacity={0.7} />
              <text x={124} y={378} textAnchor="middle" fontFamily="Arial, Segoe UI, sans-serif" fontSize={8} fill="#6A5436" opacity={0.8}>
                СИГНАЛ 07
              </text>
            </g>

            {/* right page */}
            <g transform={`translate(0 ${-pageLift})`}>
              <rect x={190} y={136} width={130} height={268} rx={5} fill={`url(#${uid}-paper)`} stroke={INK} strokeWidth={PROP_OUTLINE} />
              <path d="M 190 146 V 394" stroke="#B7A47F" strokeWidth={1.6} opacity={0.5} />
              <text x={204} y={170} fontFamily="Arial Black, Segoe UI, sans-serif" fontSize={11} fontWeight={900} fill="#3F2F1E">
                ДЕНЬ 14
              </text>
              <path d="M 204 178 H 292" stroke="#8A3A2A" strokeWidth={1.8} />
              {noteLines.map((line, i) => (
                <path
                  key={`line-${i}`}
                  d={`M ${204 + line.indent} ${line.y} H ${204 + line.indent + line.w}`}
                  stroke="#4A3A28"
                  strokeWidth={i % 3 === 0 ? 2.2 : 1.6}
                  strokeLinecap="round"
                  opacity={0.75}
                />
              ))}
              <path d="M 272 356 L 284 344 L 296 356 L 284 368 Z" fill="none" stroke="#8A3A2A" strokeWidth={2} opacity={0.7} />
              <path d="M 276 376 H 306" stroke="#4A3A28" strokeWidth={1.6} opacity={0.6} />
            </g>

            {/* spine shadow */}
            <path d="M 190 136 V 404" stroke="#7A6545" strokeWidth={7} opacity={0.35} />

            {/* flipping page */}
            {state === "flipping" ? (
              <g
                transform={`translate(190 0) scale(${Math.max(0.04, 1 - flip)} 1) translate(-190 0)`}
              >
                <path
                  d="M 190 136 H 320 Q 314 270 320 404 H 190 Z"
                  fill={`url(#${uid}-paper)`}
                  stroke={INK}
                  strokeWidth={PROP_OUTLINE}
                />
                <path d="M 208 168 H 300 M 208 196 H 284 M 208 224 H 296" stroke="#4A3A28" strokeWidth={1.6} opacity={0.4} />
                <path d="M 320 136 Q 328 270 320 404" fill="none" stroke="#8A7A58" strokeWidth={3} opacity={0.5} />
              </g>
            ) : null}

            {/* page edges */}
            {Array.from({ length: 5 }, (_, i) => (
              <path
                key={`edge-${i}`}
                d={`M ${196 + i} 398 H ${318 + i * 0.5}`}
                stroke="#A08D6B"
                strokeWidth={1.4}
                opacity={0.7}
              />
            ))}
          </g>
        )}

        <text
          x={190}
          y={30}
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

export const notebookProp: PropDefinition<NotebookState> = {
  id: "notebook",
  name: "Notebook",
  description:
    "Field notebook: closed leather cover, open spread with handwritten notes and a tower diagram, or a page flipping.",
  states: NOTEBOOK_STATES,
  defaultState: "closed",
  size: NOTEBOOK_SIZE,
  focus: (layout) =>
    layout.state === "closed" ? { x: 190, y: 198 } : { x: 190, y: 268 },
  Component: Notebook,
};
