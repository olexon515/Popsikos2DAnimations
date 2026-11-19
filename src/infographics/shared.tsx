import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp01, lerp, rand } from "../Camera";
import type { InfographicPlacement, ResolvedInfoBox } from "./types";
import { infoContainerStyle, resolveInfoBox } from "./types";

/**
 * Shared animation + drawing helpers for the Infographic & UI Engine.
 *
 * Everything here is deterministic: time comes from the frame clock, the
 * only "randomness" is `rand(seed, i)`. `Math.random()` is forbidden.
 *
 * Re-exported so an infographic file needs a single import:
 *
 * ```ts
 * import { enterSpring, interpolate, rand, spring } from "./shared";
 * ```
 */
export { clamp01, interpolate, lerp, rand, spring };

/** Comic outline weight used by every infographic (same as props / actors). */
export const INFO_OUTLINE = 3;

export const INFO_MONO =
  '"Consolas", "SF Mono", "Segoe UI Mono", "Courier New", monospace';
export const INFO_DISPLAY =
  '"Arial Black", "Segoe UI Black", "Impact", "Montserrat", sans-serif';

/** Shared HUD palette - cool tactical glass with warm hazards. */
export const INFO = {
  accent: "#5BE7A9",
  accentSoft: "#2C6E5B",
  warn: "#FFC247",
  danger: "#FF7A55",
  critical: "#FF3D5A",
  water: "#5AC8FF",
  fuel: "#FFB01F",
  power: "#FFE066",
  med: "#FF8FA3",
  radiation: "#C6FF3D",
  text: "#EAF7F0",
  dim: "#8FB3A8",
  panel: "rgba(4, 16, 25, 0.86)",
  panelSoft: "rgba(6, 23, 34, 0.72)",
  deep: "#041019",
  road: "#122A38",
} as const;

/** Status -> colour, shared by markers / nodes / links. */
export const STATUS_COLOR: Record<string, string> = {
  ok: INFO.accent,
  low: INFO.warn,
  critical: INFO.critical,
  fault: INFO.critical,
  off: "#5C6B72",
};

/** Colour per resource / schematic type. */
export const RESOURCE_COLOR: Record<string, string> = {
  water: INFO.water,
  fuel: INFO.fuel,
  power: INFO.power,
  med: INFO.med,
  radiation: INFO.radiation,
};

/**
 * Frame + fps resolver. An explicit override (`frame` / `fps` prop) always
 * wins, which is what `computeShot`-style unit tests and the registry
 * wrapper use.
 */
export const useInfoClock = (props: {
  frame?: number;
  fps?: number;
}): { frame: number; fps: number } => {
  const current = useCurrentFrame();
  const { fps: videoFps } = useVideoConfig();
  return {
    frame: props.frame ?? current,
    fps: props.fps ?? videoFps,
  };
};

/** Stable per-instance id prefix for `<defs>` (gradients, patterns, clips). */
export const useUid = (prefix: string): string => {
  const raw = React.useId();
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
};

/** Spring entrance 0..1 with a delay, safe for negative local frames. */
export const enterSpring = (
  frame: number,
  fps: number,
  delay = 0,
  damping = 13,
): number => {
  const local = frame - delay;
  if (local <= 0) return 0;
  return spring({
    frame: local,
    fps,
    config: { damping, mass: 0.5, stiffness: 150 },
  });
};

/** Plain clamped 0..1 fade that starts at `delay`. */
export const appear = (frame: number, delay = 0, duration = 10): number =>
  interpolate(frame - delay, [0, Math.max(1, duration)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Eased 0..1 count / draw progress that starts at `start`. */
export const progressIn = (
  frame: number,
  start = 0,
  duration = 44,
): number => {
  const t = clamp01((frame - start) / Math.max(1, duration));
  return 1 - Math.pow(1 - t, 3);
};

/** Staggered spring entry for lists (slots, markers, counters). */
export const staggerSpring = (
  frame: number,
  fps: number,
  index: number,
  delay = 0,
  step = 4,
): number => enterSpring(frame, fps, delay + index * step);

/** `12345.6` -> `12 345.6` with a thin space, locale-independent. */
export const formatNumber = (value: number, decimals = 0): string => {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe < 0 ? "-" : "";
  const fixed = Math.abs(safe).toFixed(Math.max(0, Math.min(3, decimals)));
  const parts = fixed.split(".");
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
  return `${sign}${grouped}${parts[1] ? `.${parts[1]}` : ""}`;
};

/** Rough text width in px for hand-built SVG label plates. */
export const textWidth = (text: string, size: number, tracking = 0): number =>
  text.length * size * 0.58 + Math.max(0, text.length - 1) * tracking;

/* ==================================================================== */
/*  Polyline geometry (routes, links, flow)                             */
/* ==================================================================== */

export type PxPoint = { x: number; y: number };

export type RouteSample = {
  point: PxPoint;
  /** Direction of travel in degrees (0 = right, 90 = down). */
  angle: number;
};

/** Normalized 0..1 points -> artboard px points. */
export const toPxPoints = (
  points: ReadonlyArray<{ x: number; y: number }>,
  width: number,
  height: number,
): PxPoint[] => points.map((p) => ({ x: p.x * width, y: p.y * height }));

export const routePath = (points: readonly PxPoint[]): string => {
  if (points.length === 0) return "";
  const head = `M ${points[0].x} ${points[0].y}`;
  return points
    .slice(1)
    .reduce((acc, p) => `${acc} L ${p.x} ${p.y}`, head);
};

export const polylineLength = (points: readonly PxPoint[]): number => {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  return total;
};

/** Sample a point (and heading) at `t` 0..1 of the polyline length. */
export const sampleRoute = (
  points: readonly PxPoint[],
  t: number,
): RouteSample => {
  if (points.length === 0) return { point: { x: 0, y: 0 }, angle: 0 };
  if (points.length === 1) return { point: points[0], angle: 0 };

  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
    lengths.push(d);
    total += d;
  }
  if (total <= 0) return { point: points[0], angle: 0 };

  let remaining = clamp01(t) * total;
  for (let i = 0; i < lengths.length; i += 1) {
    const segment = lengths[i];
    if (remaining <= segment || i === lengths.length - 1) {
      const a = points[i];
      const b = points[i + 1];
      const k = segment <= 0 ? 0 : clamp01(remaining / segment);
      return {
        point: { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) },
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      };
    }
    remaining -= segment;
  }
  return { point: points[points.length - 1], angle: 0 };
};

/** Polyline truncated at `t` 0..1 - used for the "draw the line" beat. */
export const partialRoute = (
  points: readonly PxPoint[],
  t: number,
): PxPoint[] => {
  if (points.length === 0) return [];
  if (t <= 0) return [points[0]];
  if (t >= 1) return points.slice();

  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
    lengths.push(d);
    total += d;
  }
  if (total <= 0) return [points[0]];

  let remaining = clamp01(t) * total;
  const out: PxPoint[] = [points[0]];
  for (let i = 0; i < lengths.length; i += 1) {
    const segment = lengths[i];
    if (remaining >= segment) {
      out.push(points[i + 1]);
      remaining -= segment;
      continue;
    }
    const a = points[i];
    const b = points[i + 1];
    const k = segment <= 0 ? 0 : remaining / segment;
    out.push({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
    break;
  }
  return out;
};

/* ==================================================================== */
/*  <InfoSvg> - the shared artboard wrapper                             */
/* ==================================================================== */

/**
 * Absolute artboard wrapper. The children callback receives the resolved
 * box, so a component can lay itself out from `width` / `height`.
 *
 * ```tsx
 * <InfoSvg config={config} defaultSize={{ width: 640, height: 420 }}>
 *   {({ width, height }) => <rect width={width} height={height} ... />}
 * </InfoSvg>
 * ```
 */
export const InfoSvg: React.FC<{
  config: InfographicPlacement;
  defaultSize: { width: number; height: number };
  children: (box: ResolvedInfoBox) => React.ReactNode;
}> = ({ config, defaultSize, children }) => {
  const box = resolveInfoBox(config, defaultSize);
  return (
    <div className={config.className} style={infoContainerStyle(box, config)}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${box.width} ${box.height}`}
        style={{ display: "block", overflow: "visible" }}
      >
        {children(box)}
      </svg>
    </div>
  );
};
