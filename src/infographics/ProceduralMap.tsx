import React from "react";
import {
  enterSpring,
  INFO,
  INFO_DISPLAY,
  INFO_MONO,
  INFO_OUTLINE,
  InfoSvg,
  rand,
  useInfoClock,
  useUid,
  clamp01,
} from "./shared";
import type {
  InfographicDefinition,
  InfographicRenderProps,
  ProceduralMapConfig,
} from "./types";
import { resolveInfoBox } from "./types";

const MAP_SIZE = { width: 1080, height: 1920 } as const;

/** Closed wobbly ring - the simplest believable topographic contour. */
const contourPath = (
  cx: number,
  cy: number,
  radius: number,
  wobble: number,
  phase: number,
): string => {
  const points: string[] = [];
  const steps = 44;
  for (let k = 0; k < steps; k += 1) {
    const a = (k / steps) * Math.PI * 2;
    const r =
      radius *
      (1 +
        Math.sin(a * 3 + phase) * wobble +
        Math.sin(a * 5 - phase * 0.8) * wobble * 0.45);
    points.push(
      `${(cx + Math.cos(a) * r * 1.25).toFixed(1)},${(
        cy +
        Math.sin(a) * r * 0.7
      ).toFixed(1)}`,
    );
  }
  return `M ${points.join(" L ")} Z`;
};

/**
 * Procedural tactical map.
 *
 * Draws a deterministic coordinate grid, terrain contours, district blocks,
 * infection zones, optional fenced routes and a radar / scan-line sweep.
 * Every detail comes from `seed` + `rand(seed, i)` and the frame clock.
 *
 * ```tsx
 * // full-frame plate inside the map shot
 * <Layer camera={camera} depth={0.45}>
 *   <Infographic id="procedural_map" config={{ seed: 7, title: "СЕКТОР 07" }} />
 * </Layer>
 * ```
 */
export const ProceduralMap: React.FC<
  InfographicRenderProps<ProceduralMapConfig>
> = (props) => {
  const { config } = props;
  const { frame, fps } = useInfoClock(props);
  const uid = useUid("pmap");
  const box = resolveInfoBox(config, MAP_SIZE);
  const W = box.width;
  const H = box.height;

  const seed = config.seed;
  const accent = config.accent ?? INFO.accent;
  const warning = INFO.danger;
  const grid = config.grid ?? 90;
  const scan = config.scan ?? "radar";
  const radarSpeed = config.radarSpeed ?? 1.6;
  const showHud = config.showHud !== false;
  const showCompass = config.showCompass !== false;
  const appear = enterSpring(frame, fps, config.delay ?? 0);

  const cols = 5;
  const rows = 3;
  const areaTop = H * 0.17;
  const areaH = H * 0.66;
  const cellW = (W - 200) / cols;
  const cellH = areaH / rows;
  const blockCount = Math.max(1, config.blocks ?? 15);

  const blocks = Array.from({ length: blockCount }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols) % rows;
    const bw = cellW * (0.46 + rand(seed + 3, i) * 0.3);
    const bh = cellH * (0.44 + rand(seed + 5, i) * 0.32);
    return {
      x: 100 + col * cellW + rand(seed + 7, i) * (cellW - bw),
      y: areaTop + row * cellH + rand(seed + 11, i) * (cellH - bh),
      w: bw,
      h: bh,
      rot: (rand(seed + 13, i) - 0.5) * 4,
      hatch: i % 4 === 0,
    };
  });

  const contours = Array.from({ length: 7 }, (_, i) =>
    contourPath(
      W * (0.26 + rand(seed + 21, i) * 0.48),
      H * (0.28 + rand(seed + 23, i) * 0.46),
      62 + rand(seed + 27, i) * 130,
      0.16 + rand(seed + 29, i) * 0.1,
      rand(seed + 31, i) * Math.PI * 2,
    ),
  );

  const zoneCount = Math.max(0, config.zones ?? 3);
  const zones = Array.from({ length: zoneCount }, (_, i) => ({
    x: W * (0.16 + rand(seed + 41, i) * 0.68),
    y: H * (0.22 + rand(seed + 43, i) * 0.54),
    r: 58 + rand(seed + 47, i) * 82,
    spin: (frame * (0.25 + rand(seed + 49, i) * 0.5)) % 360,
    pulse: 0.55 + 0.45 * Math.sin(frame * 0.08 + i * 1.7),
  }));

  const gridLines: Array<{ x1: number; y1: number; x2: number; y2: number }> =
    [];
  for (let gx = grid; gx < W; gx += grid) {
    gridLines.push({ x1: gx, y1: 0, x2: gx, y2: H });
  }
  for (let gy = grid; gy < H; gy += grid) {
    gridLines.push({ x1: 0, y1: gy, x2: W, y2: gy });
  }

  const roads = [0.28, 0.5, 0.72].map((f) => W * f);

  const radarRadius = Math.max(W, H) * 0.52;
  const radarAngle = (frame * radarSpeed) % 360;
  const sweepEnd = -0.66;
  const blips = Array.from({ length: 7 }, (_, i) => {
    const a = rand(seed + 61, i) * Math.PI * 2;
    const r = (0.2 + rand(seed + 63, i) * 0.72) * radarRadius;
    return {
      x: W / 2 + Math.cos(a) * r,
      y: H / 2 + Math.sin(a) * r * 0.72,
      hot: rand(seed + 67, i) > 0.6,
      phase: rand(seed + 71, i) * Math.PI * 2,
    };
  });

  const labels = config.labels ?? [];
  const scanY = ((frame * 9) % (H + 240)) - 120;

  return (
    <InfoSvg config={config} defaultSize={MAP_SIZE}>
      {() => (
        <g opacity={Math.max(0.15, appear)}>
          <defs>
            <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#041019" />
              <stop offset="52%" stopColor="#061722" />
              <stop offset="100%" stopColor="#030A10" />
            </linearGradient>
            <pattern
              id={`${uid}-grid`}
              width={grid}
              height={grid}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${grid} 0 L 0 0 0 ${grid}`}
                fill="none"
                stroke={accent}
                strokeWidth={1}
                opacity={0.09}
              />
            </pattern>
            <pattern
              id={`${uid}-hatch`}
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="12"
                stroke={accent}
                strokeWidth={2}
                opacity={0.18}
              />
            </pattern>
            <pattern
              id={`${uid}-danger`}
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(38)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="14"
                stroke={warning}
                strokeWidth={3}
                opacity={0.3}
              />
            </pattern>
            <radialGradient id={`${uid}-zone`}>
              <stop offset="0%" stopColor={warning} stopOpacity={0.5} />
              <stop offset="62%" stopColor={warning} stopOpacity={0.16} />
              <stop offset="100%" stopColor={warning} stopOpacity={0} />
            </radialGradient>
            <radialGradient id={`${uid}-glow`} cx="50%" cy="48%" r="62%">
              <stop offset="0%" stopColor={accent} stopOpacity={0.09} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </radialGradient>
            <radialGradient id={`${uid}-vignette`} cx="50%" cy="48%" r="72%">
              <stop offset="48%" stopColor="#02060A" stopOpacity={0} />
              <stop offset="100%" stopColor="#02060A" stopOpacity={0.9} />
            </radialGradient>
            <linearGradient
              id={`${uid}-sweep`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor={accent} stopOpacity={0.26} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
            <filter
              id={`${uid}-soft`}
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* base + grid ------------------------------------------------ */}
          <rect
            x={-80}
            y={-80}
            width={W + 160}
            height={H + 160}
            fill={`url(#${uid}-bg)`}
          />
          <rect
            x={-80}
            y={-80}
            width={W + 160}
            height={H + 160}
            fill={`url(#${uid}-grid)`}
          />

          {/* terrain contours ------------------------------------------ */}
          <g
            fill="none"
            stroke={accent}
            strokeWidth={2}
            strokeLinejoin="round"
          >
            {contours.map((d, i) => (
              <path
                key={`contour${i}`}
                d={d}
                opacity={0.08 + (i % 3) * 0.025}
              />
            ))}
          </g>

          {/* dry river -------------------------------------------------- */}
          <path
            d={`M -60 ${H * 0.63} C ${W * 0.2} ${H * 0.58}, ${
              W * 0.32
            } ${H * 0.69}, ${W * 0.5} ${H * 0.62} C ${W * 0.68} ${
              H * 0.55
            }, ${W * 0.82} ${H * 0.68}, ${W + 60} ${H * 0.6} L ${
              W + 60
            } ${H * 0.655} C ${W * 0.82} ${H * 0.735}, ${W * 0.68} ${
              H * 0.61
            }, ${W * 0.5} ${H * 0.68} C ${W * 0.32} ${H * 0.75}, ${
              W * 0.2
            } ${H * 0.645}, -60 ${H * 0.695} Z`}
            fill="#0B2C33"
            opacity={0.6}
          />
          <path
            d={`M -60 ${H * 0.63} C ${W * 0.2} ${H * 0.58}, ${
              W * 0.32
            } ${H * 0.69}, ${W * 0.5} ${H * 0.62} C ${W * 0.68} ${
              H * 0.55
            }, ${W * 0.82} ${H * 0.68}, ${W + 60} ${H * 0.6}`}
            fill="none"
            stroke={accent}
            strokeWidth={2}
            opacity={0.32}
          />

          {/* district blocks ------------------------------------------- */}
          <g>
            {blocks.map((b, i) => (
              <g
                key={`blk${i}`}
                transform={`rotate(${b.rot} ${b.x + b.w / 2} ${
                  b.y + b.h / 2
                })`}
              >
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx={10}
                  fill={b.hatch ? `url(#${uid}-hatch)` : "#0A1A26"}
                  stroke="#1E3547"
                  strokeWidth={2.5}
                  opacity={0.9}
                />
                <rect
                  x={b.x + 10}
                  y={b.y + 10}
                  width={Math.max(8, b.w - 20)}
                  height={4}
                  rx={2}
                  fill={accent}
                  opacity={0.12 + rand(seed + 17, i) * 0.1}
                />
              </g>
            ))}
          </g>

          {/* street grid ----------------------------------------------- */}
          <g stroke={INFO.road} strokeWidth={20} fill="none" opacity={0.92}>
            {roads.map((x, i) => (
              <path key={`rv${i}`} d={`M ${x} 120 L ${x} ${H - 80}`} />
            ))}
            <path d={`M 60 ${H * 0.43} L ${W - 60} ${H * 0.43}`} />
            <path d={`M 60 ${H * 0.79} L ${W - 60} ${H * 0.79}`} />
          </g>
          <g
            stroke={accent}
            strokeWidth={1.2}
            opacity={0.14}
            fill="none"
            strokeDasharray="14 18"
          >
            {roads.map((x, i) => (
              <path key={`rl${i}`} d={`M ${x} 140 L ${x} ${H - 100}`} />
            ))}
            <path d={`M 80 ${H * 0.43} L ${W - 80} ${H * 0.43}`} />
            <path d={`M 80 ${H * 0.79} L ${W - 80} ${H * 0.79}`} />
          </g>

          <rect
            x={-80}
            y={-80}
            width={W + 160}
            height={H + 160}
            fill={`url(#${uid}-glow)`}
          />

          {/* infection zones ------------------------------------------- */}
          {zones.map((z, i) => (
            <g key={`zone${i}`} opacity={0.55 + z.pulse * 0.35}>
              <circle
                cx={z.x}
                cy={z.y}
                r={z.r * 1.5}
                fill={`url(#${uid}-zone)`}
                opacity={0.5}
              />
              <circle
                cx={z.x}
                cy={z.y}
                r={z.r}
                fill={`url(#${uid}-danger)`}
                fillOpacity={0.22}
                stroke={warning}
                strokeWidth={INFO_OUTLINE}
                strokeDasharray="10 8"
                transform={`rotate(${z.spin} ${z.x} ${z.y})`}
              />
              <circle
                cx={z.x}
                cy={z.y}
                r={z.r + 14}
                fill="none"
                stroke={warning}
                strokeWidth={2}
                opacity={0.35 * z.pulse}
              />
              <text
                x={z.x}
                y={z.y + 8}
                fill={warning}
                fontFamily={INFO_MONO}
                fontSize={22}
                fontWeight={700}
                textAnchor="middle"
                letterSpacing={1}
              >
                !
              </text>
            </g>
          ))}

          {/* fenced routes --------------------------------------------- */}
          {(config.routes ?? []).map((route, i) => {
            const pts = route.points
              .map((p) => `${p.x * W},${p.y * H}`)
              .join(" ");
            const color = route.color ?? INFO.fuel;
            return (
              <g key={`route${i}`} fill="none" strokeLinecap="round">
                <polyline
                  points={pts}
                  stroke={color}
                  strokeWidth={10}
                  opacity={0.14}
                  filter={`url(#${uid}-soft)`}
                />
                <polyline
                  points={pts}
                  stroke={color}
                  strokeWidth={INFO_OUTLINE}
                  strokeDasharray="20 16"
                  strokeDashoffset={-(frame * 2 + i * 11) % 36}
                  opacity={0.7}
                />
                {route.label ? (
                  <text
                    x={(route.points[0]?.x ?? 0.1) * W + 16}
                    y={(route.points[0]?.y ?? 0.1) * H - 12}
                    fill={color}
                    fontFamily={INFO_MONO}
                    fontSize={18}
                    letterSpacing={2}
                    opacity={0.8}
                  >
                    {route.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* radar sweep ------------------------------------------------ */}
          {scan === "radar" ? (
            <g>
              <g
                stroke={accent}
                fill="none"
                opacity={0.16}
                strokeDasharray="6 12"
              >
                <circle cx={W / 2} cy={H / 2} r={radarRadius * 0.34} />
                <circle cx={W / 2} cy={H / 2} r={radarRadius * 0.64} />
                <circle cx={W / 2} cy={H / 2} r={radarRadius * 0.92} />
              </g>
              <g transform={`rotate(${radarAngle} ${W / 2} ${H / 2})`}>
                <path
                  d={`M ${W / 2} ${H / 2} L ${W / 2 + radarRadius} ${
                    H / 2
                  } A ${radarRadius} ${radarRadius} 0 0 0 ${
                    W / 2 + Math.cos(sweepEnd) * radarRadius
                  } ${H / 2 + Math.sin(sweepEnd) * radarRadius} Z`}
                  fill={`url(#${uid}-sweep)`}
                />
                <line
                  x1={W / 2}
                  y1={H / 2}
                  x2={W / 2 + radarRadius}
                  y2={H / 2}
                  stroke={accent}
                  strokeWidth={2}
                  opacity={0.45}
                />
              </g>
              <g>
                {blips.map((b, i) => (
                  <g
                    key={`blip${i}`}
                    opacity={
                      (b.hot ? 0.55 : 0.32) +
                      0.3 * Math.abs(Math.sin(frame * 0.06 + b.phase))
                    }
                  >
                    <circle cx={b.x} cy={b.y} r={12} fill={accent} opacity={0.18} />
                    <circle
                      cx={b.x}
                      cy={b.y}
                      r={4}
                      fill={b.hot ? warning : accent}
                    />
                  </g>
                ))}
              </g>
            </g>
          ) : null}

          {scan === "line" ? (
            <g>
              <rect
                x={0}
                y={scanY - 60}
                width={W}
                height={120}
                fill={accent}
                opacity={0.05}
              />
              <line
                x1={0}
                y1={scanY}
                x2={W}
                y2={scanY}
                stroke={accent}
                strokeWidth={2}
                opacity={0.35}
              />
            </g>
          ) : null}

          {/* district captions ----------------------------------------- */}
          {labels.map((label, i) => (
            <g key={`label${i}`}>
              <line
                x1={70}
                y1={areaTop + i * 78 + 40}
                x2={92}
                y2={areaTop + i * 78 + 40}
                stroke={accent}
                strokeWidth={2}
                opacity={0.5}
              />
              <text
                x={104}
                y={areaTop + i * 78 + 47}
                fill={INFO.text}
                fontFamily={INFO_MONO}
                fontSize={17}
                letterSpacing={2.4}
                opacity={0.55}
              >
                {label}
              </text>
            </g>
          ))}

          {/* HUD -------------------------------------------------------- */}
          {showHud ? (
            <g>
              <g>
                <text
                  x={54}
                  y={140}
                  fill={INFO.text}
                  fontFamily={INFO_DISPLAY}
                  fontSize={54}
                  fontWeight={900}
                  letterSpacing={1}
                >
                  {config.title ?? "СЕКТОР 07"}
                </text>
                <text
                  x={56}
                  y={184}
                  fill={accent}
                  fontFamily={INFO_MONO}
                  fontSize={19}
                  letterSpacing={5}
                  opacity={0.82}
                >
                  {config.subtitle ?? "ТАКТИЧНА КАРТА · ЖИВА МЕРЕЖА"}
                </text>
                <line
                  x1={56}
                  y1={212}
                  x2={406}
                  y2={212}
                  stroke={accent}
                  strokeWidth={2}
                  opacity={0.4}
                />
              </g>

              <g transform={`translate(${W - 196} 118)`}>
                <circle cx={0} cy={0} r={10} fill={warning} opacity={0.9} />
                <circle
                  cx={0}
                  cy={0}
                  r={20}
                  fill="none"
                  stroke={warning}
                  strokeWidth={2}
                  opacity={0.32 + 0.22 * Math.sin(frame * 0.16)}
                />
                <text
                  x={30}
                  y={7}
                  fill={INFO.text}
                  fontFamily={INFO_MONO}
                  fontSize={18}
                  letterSpacing={3}
                >
                  LIVE
                </text>
                <text
                  x={0}
                  y={40}
                  fill={accent}
                  fontFamily={INFO_MONO}
                  fontSize={14}
                  letterSpacing={2}
                  opacity={0.7}
                >
                  SAT-LINK 98%
                </text>
              </g>

              {showCompass ? (
                <g transform={`translate(${W - 96} ${H - 156})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={56}
                    fill={INFO.deep}
                    fillOpacity={0.55}
                    stroke={accent}
                    strokeWidth={2}
                    opacity={0.75}
                  />
                  <circle
                    cx={0}
                    cy={0}
                    r={40}
                    fill="none"
                    stroke={accent}
                    strokeWidth={1}
                    opacity={0.24}
                  />
                  <path d="M 0 -34 L 10 9 L 0 2 L -10 9 Z" fill={warning} opacity={0.9} />
                  <text
                    x={0}
                    y={-40}
                    fill={INFO.text}
                    fontFamily={INFO_MONO}
                    fontSize={15}
                    textAnchor="middle"
                    letterSpacing={2}
                  >
                    N
                  </text>
                </g>
              ) : null}

              <g>
                <text
                  x={54}
                  y={H - 116}
                  fill={INFO.text}
                  fontFamily={INFO_MONO}
                  fontSize={21}
                  letterSpacing={3}
                  opacity={0.72}
                >
                  T+{(frame / Math.max(1, fps)).toFixed(1)}S · GRID {grid}M
                </text>
                <line
                  x1={54}
                  y1={H - 74}
                  x2={274}
                  y2={H - 74}
                  stroke={accent}
                  strokeWidth={3}
                  opacity={0.75}
                />
                <line
                  x1={54}
                  y1={H - 88}
                  x2={54}
                  y2={H - 60}
                  stroke={accent}
                  strokeWidth={3}
                  opacity={0.75}
                />
                <line
                  x1={274}
                  y1={H - 88}
                  x2={274}
                  y2={H - 60}
                  stroke={accent}
                  strokeWidth={3}
                  opacity={0.75}
                />
                <text
                  x={54}
                  y={H - 40}
                  fill={accent}
                  fontFamily={INFO_MONO}
                  fontSize={16}
                  letterSpacing={2}
                  opacity={0.6}
                >
                  0 · 50 М
                </text>
              </g>
            </g>
          ) : null}

          {/* frame + vignette ------------------------------------------ */}
          <rect
            x={26}
            y={26}
            width={W - 52}
            height={H - 52}
            fill="none"
            stroke={accent}
            strokeWidth={2}
            opacity={0.22}
          />
          <g stroke={accent} strokeWidth={4} opacity={0.55} fill="none">
            <path d={`M 26 86 L 26 26 L 86 26`} />
            <path d={`M ${W - 86} 26 L ${W - 26} 26 L ${W - 26} 86`} />
            <path
              d={`M 26 ${H - 86} L 26 ${H - 26} L 86 ${H - 26}`}
            />
            <path
              d={`M ${W - 86} ${H - 26} L ${W - 26} ${H - 26} L ${
                W - 26
              } ${H - 86}`}
            />
          </g>
          <rect
            width={W}
            height={H}
            fill={`url(#${uid}-vignette)`}
            opacity={0.62}
          />
          <text
            x={W / 2}
            y={H - 18}
            fill={accent}
            fontFamily={INFO_MONO}
            fontSize={12}
            letterSpacing={5}
            textAnchor="middle"
            opacity={0.28}
          >
            POPSIKOS TACTICAL NETWORK · SEED {seed} · PROGRESS{" "}
            {Math.round(clamp01(appear) * 100)}%
          </text>
        </g>
      )}
    </InfoSvg>
  );
};

export const proceduralMapInfographic = {
  id: "procedural_map",
  name: "Procedural map",
  titleUk: "Процедурна тактична карта",
  description:
    "Seed-driven tactical map: coordinate grid, terrain contours, districts, infection zones and a radar sweep.",
  defaultSize: MAP_SIZE,
  usage: ["hud", "plate"],
  Component: ProceduralMap,
} as const satisfies InfographicDefinition<"procedural_map", ProceduralMapConfig>;
