import React from "react";
import {
  enterSpring,
  INFO,
  INFO_DISPLAY,
  INFO_MONO,
  INFO_OUTLINE,
  InfoSvg,
  useInfoClock,
  useUid,
} from "./shared";
import type {
  InfographicDefinition,
  InfographicRenderProps,
  WarningConfig,
  WarningLevel,
} from "./types";
import { resolveInfoBox } from "./types";

const WARNING_SIZE = { width: 972, height: 190 } as const;

const LEVELS: Record<
  WarningLevel,
  { color: string; label: string; tag: string; icon: "triangle" | "octagon" }
> = {
  caution: {
    color: INFO.warn,
    label: "УВАГА",
    tag: "LEVEL 1 · CAUTION",
    icon: "triangle",
  },
  danger: {
    color: INFO.danger,
    label: "НЕБЕЗПЕКА",
    tag: "LEVEL 2 · DANGER",
    icon: "triangle",
  },
  critical: {
    color: INFO.critical,
    label: "КРИТИЧНО",
    tag: "LEVEL 3 · CRITICAL",
    icon: "octagon",
  },
};

const AlertIcon: React.FC<{ color: string; shape: "triangle" | "octagon" }> = ({
  color,
  shape,
}) => (
  <g>
    {shape === "triangle" ? (
      <path
        d="M 0 -27 L 27 23 L -27 23 Z"
        fill="rgba(4, 16, 25, 0.9)"
        stroke={color}
        strokeWidth={INFO_OUTLINE}
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M -11 -27 L 11 -27 L 27 -11 L 27 11 L 11 27 L -11 27 L -27 11 L -27 -11 Z"
        fill="rgba(4, 16, 25, 0.9)"
        stroke={color}
        strokeWidth={INFO_OUTLINE}
        strokeLinejoin="round"
      />
    )}
    <path
      d="M 0 -14 L 0 6"
      stroke={color}
      strokeWidth={6}
      strokeLinecap="round"
    />
    <circle cx={0} cy={15} r={3.4} fill={color} />
  </g>
);

/**
 * Warning / hazard banner.
 *
 * `level` picks the colour, label and icon shape (`caution`, `danger`,
 * `critical`); the banner springs in with hazard stripes, a pulsing beacon
 * and an optional blinking dot. Sized as a wide screen-space strip by
 * default, but works at any `width` / `height` on a plate too.
 */
export const WarningBanner: React.FC<InfographicRenderProps<WarningConfig>> = (
  props,
) => {
  const { config } = props;
  const { frame, fps } = useInfoClock(props);
  const uid = useUid("warn");
  const box = resolveInfoBox(config, WARNING_SIZE);
  const W = box.width;
  const H = box.height;

  const level = LEVELS[config.level] ?? LEVELS.caution;
  const color = config.accent ?? level.color;
  const pulseSpeed = config.pulseSpeed ?? 0.16;
  const stripes = config.stripes !== false;
  const blink = config.blink !== false;

  const entry = enterSpring(frame, fps, config.delay ?? 0, 11);
  const shown = Math.max(0, Math.min(1, entry));
  const pulse = 0.55 + 0.45 * Math.sin(frame * pulseSpeed);
  const stripeOffset = (frame * 1.6) % 20;
  const sheenX = ((frame * 6) % (W + 320)) - 160;

  const stripeW = stripes ? 68 : 0;
  const iconX = stripeW + 52;
  const textX = iconX + 56;
  const textAvail = Math.max(180, W - textX - 210);
  const titleSize = Math.max(
    20,
    Math.min(H * 0.24, (textAvail / Math.max(6, config.title.length)) * 1.55),
  );
  const subtitleSize = Math.max(12, Math.min(18, H * 0.1));

  return (
    <InfoSvg config={config} defaultSize={WARNING_SIZE}>
      {() => (
        <g
          opacity={shown}
          transform={`translate(0 ${(1 - shown) * -30}) scale(${
            0.94 + 0.06 * shown
          }, ${0.94 + 0.06 * shown})`}
          style={{ transformOrigin: `${W / 2}px ${H / 2}px` }}
        >
          <defs>
            <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(20, 12, 10, 0.96)" />
              <stop offset="48%" stopColor="rgba(6, 16, 22, 0.96)" />
              <stop offset="100%" stopColor="rgba(4, 12, 18, 0.96)" />
            </linearGradient>
            <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0} />
              <stop offset="50%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <clipPath id={`${uid}-clip`}>
              <rect x={0} y={0} width={W} height={H} rx={14} />
            </clipPath>
            <clipPath id={`${uid}-stripes`}>
              <rect x={0} y={0} width={stripeW} height={H} />
            </clipPath>
          </defs>

          {config.level === "critical" ? (
            <rect
              x={-7}
              y={-7}
              width={W + 14}
              height={H + 14}
              rx={18}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={0.18 + 0.3 * pulse}
            />
          ) : null}

          <g clipPath={`url(#${uid}-clip)`}>
            <rect width={W} height={H} rx={14} fill={`url(#${uid}-bg)`} />
            <rect
              x={sheenX}
              y={0}
              width={160}
              height={H}
              fill={`url(#${uid}-sheen)`}
            />
            <rect
              x={0}
              y={0}
              width={W * 0.62}
              height={H}
              fill={color}
              opacity={0.05}
            />
            {stripes ? (
              <g clipPath={`url(#${uid}-stripes)`}>
                <rect width={stripeW} height={H} fill={color} opacity={0.12} />
                {Array.from({ length: Math.ceil(H / 20) + 4 }, (_, i) => {
                  const x = -stripeW + i * 20 + stripeOffset;
                  return (
                    <line
                      key={`stripe${i}`}
                      x1={x}
                      y1={H + 10}
                      x2={x + H + 20}
                      y2={-10}
                      stroke={color}
                      strokeWidth={11}
                      opacity={0.55}
                    />
                  );
                })}
              </g>
            ) : null}
            <rect
              x={stripeW}
              y={0}
              width={3}
              height={H}
              fill={color}
              opacity={0.85}
            />
            {stripes ? (
              <g>
                <rect
                  x={0}
                  y={H - 10}
                  width={W}
                  height={10}
                  fill={color}
                  opacity={0.16}
                />
                {Array.from({ length: Math.ceil(W / 18) + 2 }, (_, i) => (
                  <line
                    key={`bottom${i}`}
                    x1={i * 18 + (frame % 18)}
                    y1={H}
                    x2={i * 18 + 10 + (frame % 18)}
                    y2={H - 10}
                    stroke={color}
                    strokeWidth={4}
                    opacity={0.5}
                  />
                ))}
              </g>
            ) : null}
          </g>

          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            rx={14}
            fill="none"
            stroke={color}
            strokeWidth={INFO_OUTLINE}
          />

          <g transform={`translate(${iconX} ${H / 2})`}>
            <g transform={`scale(${H > 170 ? 1 : 0.8})`}>
              <AlertIcon color={color} shape={level.icon} />
            </g>
          </g>

          <g>
            <text
              x={textX}
              y={H * 0.28}
              fill={color}
              fontFamily={INFO_MONO}
              fontSize={Math.max(12, H * 0.085)}
              fontWeight={700}
              letterSpacing={4}
            >
              {level.label} · {level.tag}
            </text>
            <text
              x={textX}
              y={H * 0.61}
              fill={INFO.text}
              fontFamily={INFO_DISPLAY}
              fontSize={titleSize}
              fontWeight={900}
              letterSpacing={0.4}
            >
              {config.title.toUpperCase()}
            </text>
            {config.subtitle ? (
              <text
                x={textX}
                y={H * 0.85}
                fill={INFO.dim}
                fontFamily={INFO_MONO}
                fontSize={subtitleSize}
                letterSpacing={1.2}
              >
                {config.subtitle.toUpperCase()}
              </text>
            ) : null}
          </g>

          <g transform={`translate(${W - 34} 34)`}>
            {config.code ? (
              <text
                x={0}
                y={0}
                fill={color}
                fontFamily={INFO_MONO}
                fontSize={Math.max(12, H * 0.075)}
                letterSpacing={2}
                textAnchor="end"
                opacity={0.9}
              >
                {config.code}
              </text>
            ) : null}
            {blink ? (
              <g transform={`translate(0 ${H * 0.18})`}>
                <circle
                  cx={-5}
                  cy={0}
                  r={5}
                  fill={color}
                  opacity={0.35 + 0.65 * pulse}
                />
                <circle cx={-5} cy={0} r={11} fill="none" stroke={color} strokeWidth={1.6} opacity={0.25 * pulse} />
                <text
                  x={-22}
                  y={4}
                  fill={INFO.dim}
                  fontFamily={INFO_MONO}
                  fontSize={Math.max(10, H * 0.06)}
                  letterSpacing={2}
                  textAnchor="end"
                >
                  LIVE
                </text>
              </g>
            ) : null}
          </g>
        </g>
      )}
    </InfoSvg>
  );
};

export const warningInfographic = {
  id: "warning",
  name: "Warning banner",
  titleUk: "Плашка попередження",
  description:
    "Hazard banner in caution / danger / critical levels with stripes, beacon and a spring entrance.",
  defaultSize: WARNING_SIZE,
  usage: ["hud", "plate"],
  Component: WarningBanner,
} as const satisfies InfographicDefinition<"warning", WarningConfig>;
