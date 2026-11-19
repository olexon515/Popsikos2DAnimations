import React from "react";
import {
  clamp01,
  formatNumber,
  INFO,
  INFO_DISPLAY,
  INFO_MONO,
  INFO_OUTLINE,
  InfoSvg,
  lerp,
  progressIn,
  useInfoClock,
} from "./shared";
import type {
  CounterItem,
  CountersConfig,
  InfographicDefinition,
  InfographicRenderProps,
} from "./types";
import { resolveInfoBox } from "./types";

const COUNTERS_SIZE = { width: 560, height: 380 } as const;

type ItemBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const polar = (
  cx: number,
  cy: number,
  r: number,
  deg: number,
): { x: number; y: number } => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
};

const arcPath = (
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string => {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
};

const CounterCard: React.FC<{
  item: CounterItem;
  box: ItemBox;
  value: number;
  ratio: number;
  color: string;
  frame: number;
  appear: number;
}> = ({ item, box, value, ratio, color, frame, appear }) => {
  const variant = item.variant ?? "digital";
  const decimals = item.decimals ?? 0;
  const text = formatNumber(value, decimals);
  const unit = item.unit ?? "";
  const left = box.x + 18;

  return (
    <g opacity={appear}>
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={12}
        fill="rgba(6, 23, 34, 0.6)"
        stroke={color}
        strokeWidth={1.6}
        opacity={0.9}
      />
      <rect x={box.x} y={box.y + 10} width={5} height={box.height - 20} rx={2.5} fill={color} />

      {variant === "digital" ? (
        <g>
          <text
            x={left}
            y={box.y + 26}
            fill={INFO.dim}
            fontFamily={INFO_MONO}
            fontSize={16}
            letterSpacing={3}
          >
            {item.label}
          </text>
          <text
            x={left}
            y={box.y + box.height - 22}
            fill={INFO.text}
            fontFamily={INFO_DISPLAY}
            fontSize={Math.min(54, box.height * 0.44)}
            fontWeight={900}
          >
            {item.prefix ?? ""}
            {text}
            <tspan
              fill={color}
              fontFamily={INFO_MONO}
              fontSize={20}
              fontWeight={700}
              letterSpacing={1}
            >
              {" "}
              {unit}
            </tspan>
          </text>
          <g>
            {Array.from({ length: 22 }, (_, k) => {
              const tickOn = k / 22 <= ratio;
              return (
                <rect
                  key={`tick${k}`}
                  x={box.x + box.width - 18 - (21 - k) * 8}
                  y={box.y + box.height - 26}
                  width={4}
                  height={tickOn ? 14 : 8}
                  rx={1}
                  fill={tickOn ? color : INFO.dim}
                  opacity={tickOn ? 0.85 : 0.22}
                />
              );
            })}
          </g>
          <circle
            cx={box.x + box.width - 18}
            cy={box.y + 20}
            r={4.5}
            fill={item.critical ? INFO.critical : color}
            opacity={0.55 + 0.4 * Math.sin(frame * 0.16)}
          />
        </g>
      ) : null}

      {variant === "bar" ? (
        <g>
          <text
            x={left}
            y={box.y + 28}
            fill={INFO.dim}
            fontFamily={INFO_MONO}
            fontSize={16}
            letterSpacing={3}
          >
            {item.label}
          </text>
          <text
            x={box.x + box.width - 18}
            y={box.y + 30}
            fill={item.critical ? INFO.critical : color}
            fontFamily={INFO_DISPLAY}
            fontSize={24}
            fontWeight={900}
            textAnchor="end"
          >
            {text}
            <tspan fontFamily={INFO_MONO} fontSize={15} fontWeight={700}>
              {" "}
              {unit}
            </tspan>
          </text>
          <rect
            x={left}
            y={box.y + box.height - 36}
            width={box.width - 36}
            height={20}
            rx={10}
            fill="#081A24"
            stroke={INFO.dim}
            strokeWidth={1.4}
            opacity={0.8}
          />
          <rect
            x={left}
            y={box.y + box.height - 36}
            width={Math.max(4, (box.width - 36) * ratio)}
            height={20}
            rx={10}
            fill={item.critical ? INFO.critical : color}
          />
          <rect
            x={left}
            y={box.y + box.height - 36}
            width={Math.max(4, (box.width - 36) * ratio)}
            height={8}
            rx={4}
            fill="#FFFFFF"
            opacity={0.16}
          />
          <g stroke={INFO.dim} strokeWidth={1.4} opacity={0.35}>
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={`thr${f}`}
                x1={left + (box.width - 36) * f}
                y1={box.y + box.height - 40}
                x2={left + (box.width - 36) * f}
                y2={box.y + box.height - 12}
              />
            ))}
          </g>
        </g>
      ) : null}

      {variant === "radial" ? (
        <g>
          <text
            x={left}
            y={box.y + 30}
            fill={INFO.dim}
            fontFamily={INFO_MONO}
            fontSize={16}
            letterSpacing={3}
          >
            {item.label}
          </text>
          <text
            x={left}
            y={box.y + box.height - 40}
            fill={INFO.text}
            fontFamily={INFO_DISPLAY}
            fontSize={32}
            fontWeight={900}
          >
            {text}
            <tspan fill={color} fontFamily={INFO_MONO} fontSize={17} fontWeight={700}>
              {" "}
              {unit}
            </tspan>
          </text>
          <text
            x={left}
            y={box.y + box.height - 18}
            fill={INFO.dim}
            fontFamily={INFO_MONO}
            fontSize={13}
            letterSpacing={1.8}
            opacity={0.8}
          >
            МАКС {formatNumber(item.max ?? 100)}
            {unit}
          </text>
          {(() => {
            const r = Math.min(box.height / 2 - 16, 52);
            const cx = box.x + box.width - r - 22;
            const cy = box.y + box.height / 2;
            const start = -135;
            const sweep = 270;
            const end = start + Math.max(2, sweep * ratio);
            return (
              <g>
                <path
                  d={arcPath(cx, cy, r, start, start + sweep)}
                  fill="none"
                  stroke="#0B2630"
                  strokeWidth={12}
                  strokeLinecap="round"
                />
                <path
                  d={arcPath(cx, cy, r, start, end)}
                  fill="none"
                  stroke={item.critical ? INFO.critical : color}
                  strokeWidth={12}
                  strokeLinecap="round"
                />
                <path
                  d={arcPath(cx, cy, r - 8, start, end)}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.35}
                />
                <g stroke={INFO.dim} strokeWidth={1.6} opacity={0.35}>
                  {Array.from({ length: 13 }, (_, k) => {
                    const d = start + (sweep / 12) * k;
                    const a = polar(cx, cy, r + 10, d);
                    const b = polar(cx, cy, r + (k % 3 === 0 ? 18 : 14), d);
                    return (
                      <line key={`gt${k}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                    );
                  })}
                </g>
                <text
                  x={cx}
                  y={cy + 8}
                  fill={INFO.text}
                  fontFamily={INFO_DISPLAY}
                  fontSize={20}
                  fontWeight={900}
                  textAnchor="middle"
                >
                  {Math.round(clamp01(ratio) * 100)}%
                </text>
              </g>
            );
          })()}
        </g>
      ) : null}
    </g>
  );
};

/**
 * Animated counters in three variants (`digital`, `bar`, `radial`).
 *
 * Every item counts from `from` to `to` over `duration` frames, started at
 * `startFrame` and staggered per item. The frame is the only source of time.
 */
export const Counters: React.FC<InfographicRenderProps<CountersConfig>> = (
  props,
) => {
  const { config } = props;
  const { frame } = useInfoClock(props);
  const box = resolveInfoBox(config, COUNTERS_SIZE);
  const W = box.width;
  const H = box.height;

  const accent = config.accent ?? INFO.accent;
  const items = config.items;
  const columns = Math.max(
    1,
    Math.min(config.columns ?? 1, Math.max(1, items.length)),
  );
  const rows = Math.max(1, Math.ceil(items.length / columns));
  const pad = 22;
  const headerH = config.title ? 52 : 10;
  const gap = 10;
  const gridX = pad;
  const gridY = pad + headerH;
  const gridW = W - pad * 2;
  const gridH = H - gridY - pad;
  const cellW = (gridW - gap * (columns - 1)) / columns;
  const cellH = (gridH - gap * (rows - 1)) / rows;
  const startFrame = config.startFrame ?? 4;
  const stagger = config.stagger ?? 5;
  const duration = config.duration ?? 44;
  const showPanel = config.panel !== false;
  const sheenX = ((frame * 5) % (W + 240)) - 120;

  return (
    <InfoSvg config={config} defaultSize={COUNTERS_SIZE}>
      {() => (
        <g>
          <defs>
            <linearGradient id="counterSheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity={0} />
              <stop offset="50%" stopColor={accent} stopOpacity={0.09} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>

          {showPanel ? (
            <g>
              <rect
                x={0}
                y={0}
                width={W}
                height={H}
                rx={16}
                fill={INFO.panel}
                stroke={accent}
                strokeWidth={INFO_OUTLINE}
                opacity={0.96}
              />
              <rect
                x={0}
                y={0}
                width={W}
                height={H}
                rx={16}
                fill="none"
                stroke={accent}
                strokeWidth={1}
                opacity={0.2}
              />
              <rect
                x={sheenX}
                y={0}
                width={120}
                height={H}
                fill="url(#counterSheen)"
              />
              <g stroke={accent} strokeWidth={3} opacity={0.7} fill="none">
                <path d="M 10 34 L 10 10 L 34 10" />
                <path d={`M ${W - 34} 10 L ${W - 10} 10 L ${W - 10} 34`} />
                <path d={`M 10 ${H - 34} L 10 ${H - 10} L 34 ${H - 10}`} />
                <path
                  d={`M ${W - 34} ${H - 10} L ${W - 10} ${H - 10} L ${
                    W - 10
                  } ${H - 34}`}
                />
              </g>
            </g>
          ) : null}

          {config.title ? (
            <g>
              <text
                x={pad + 6}
                y={pad + 34}
                fill={INFO.text}
                fontFamily={INFO_DISPLAY}
                fontSize={27}
                fontWeight={900}
                letterSpacing={1}
              >
                {config.title}
              </text>
              <line
                x1={pad + 6}
                y1={pad + 44}
                x2={W - pad}
                y2={pad + 44}
                stroke={accent}
                strokeWidth={2}
                opacity={0.25}
              />
            </g>
          ) : null}

          {items.map((item, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const cell: ItemBox = {
              x: gridX + col * (cellW + gap),
              y: gridY + row * (cellH + gap),
              width: cellW,
              height: cellH,
            };
            const t = progressIn(frame, startFrame + i * stagger, duration);
            const value = lerp(item.from, item.to, t);
            const ratio = clamp01(value / Math.max(1, item.max ?? 100));
            const color = item.color ?? accent;
            return (
              <CounterCard
                key={`${item.label}-${i}`}
                item={item}
                box={cell}
                value={value}
                ratio={ratio}
                color={color}
                frame={frame}
                appear={0.25 + 0.75 * clamp01(t + 0.25)}
              />
            );
          })}
        </g>
      )}
    </InfoSvg>
  );
};

export const countersInfographic = {
  id: "counters",
  name: "Counters",
  titleUk: "Лічильники ресурсів",
  description:
    "Animated from -> to counters in digital, bar and radial variants with units, labels and thresholds.",
  defaultSize: COUNTERS_SIZE,
  usage: ["hud", "plate"],
  Component: Counters,
} as const satisfies InfographicDefinition<"counters", CountersConfig>;
