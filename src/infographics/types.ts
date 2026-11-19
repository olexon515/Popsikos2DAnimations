import type React from "react";

/**
 * Infographic & UI Engine - shared contract.
 *
 * Every infographic is a pure, config-driven SVG artboard that:
 *  - is placed by the top-left corner of its artboard in canvas coordinates
 *    (1080 x 1920, the same plane as `Character`, props and the map plate);
 *  - scales uniformly with `scale`;
 *  - animates only from the Remotion frame, `fps` and a deterministic `seed`
 *    (`rand(seed, i)` from `src/Camera.tsx`; `Math.random()` is forbidden);
 *  - uses a 3 px ink outline and heavy Ukrainian display typography, matching
 *    the rest of the film.
 *
 * The same component works in two places:
 *  - **screen-space HUD** - mount `<Infographic />` directly inside a shot
 *    (after `<World />`) and it floats over the frame;
 *  - **inside the map plate** - mount it inside `<Layer camera={camera}
 *    depth={0.45}>` and it inherits the camera transform like a printed layer.
 *
 * Marker / route / node coordinates are **normalized 0..1** of the artboard,
 * so a config keeps working at any `width` / `height`.
 */

/** A point in artboard space. `{ x: 0, y: 0 }` is the top-left corner. */
export type InfographicPoint = { x: number; y: number };

/** Where a definition is designed to live (`hud`, `plate`, or both). */
export type InfographicSpace = "hud" | "plate";

/**
 * Placement + master animation knobs shared by every infographic config.
 * All fields are optional so a config stays small and readable.
 */
export type InfographicPlacement = {
  /** Left edge of the artboard in canvas px. */
  x?: number;
  /** Top edge of the artboard in canvas px. */
  y?: number;
  /** Artboard width in px (component default when omitted). */
  width?: number;
  /** Artboard height in px (component default when omitted). */
  height?: number;
  /** Uniform scale about the top-left corner. */
  scale?: number;
  /** Master opacity 0..1. */
  opacity?: number;
  /** Local frame override; otherwise the Remotion frame is used. */
  frame?: number;
  /** Deterministic seed for procedural detail. */
  seed?: number;
  /** Entry delay in frames. */
  delay?: number;
  /** Accent colour override. */
  accent?: string;
  className?: string;
  style?: React.CSSProperties;
};

/** Resolved placement, produced by `resolveInfoBox`. */
export type ResolvedInfoBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  opacity: number;
};

/** Props every infographic SVG component receives. */
export type InfographicRenderProps<TConfig> = {
  config: TConfig;
  /** Resolved frame (falls back to the Remotion clock when omitted). */
  frame?: number;
  /** Resolved fps (falls back to `useVideoConfig()` when omitted). */
  fps?: number;
};

/** One entry of the `INFOGRAPHICS` registry. */
export type InfographicDefinition<TId extends string, TConfig> = {
  /** Stable registry key, e.g. `counters`. */
  id: TId;
  /** Human-readable English name. */
  name: string;
  /** Ukrainian name used in HUD labels and docs. */
  titleUk: string;
  /** One-line summary for docs / tooling. */
  description: string;
  /** Artboard size used when the config omits `width` / `height`. */
  defaultSize: { width: number; height: number };
  /** Where the component is designed to be used. */
  usage: readonly InfographicSpace[];
  /** The SVG component itself. */
  Component: React.FC<InfographicRenderProps<TConfig>>;
};

/** Public metadata available without rendering the component. */
export type InfographicSummary = {
  id: string;
  name: string;
  titleUk: string;
  description: string;
  defaultSize: { width: number; height: number };
  usage: readonly InfographicSpace[];
};

/* ==================================================================== */
/*  1. procedural_map                                                   */
/* ==================================================================== */

export type ProceduralMapRoute = {
  /** Normalized 0..1 points of a static (already fenced) route. */
  points: readonly InfographicPoint[];
  color?: string;
  label?: string;
};

export type ProceduralMapConfig = InfographicPlacement & {
  /** Required: every render is byte-identical for the same seed. */
  seed: number;
  title?: string;
  subtitle?: string;
  /** Coordinate grid step in px. Default 90. */
  grid?: number;
  /** Number of district blocks. Default 15. */
  blocks?: number;
  /** Number of infection zones. Default 3. */
  zones?: number;
  /** Static dashed routes already drawn on the map. */
  routes?: readonly ProceduralMapRoute[];
  /** Radar sweep, horizontal scan line, or nothing. Default `radar`. */
  scan?: "radar" | "line" | "none";
  /** Radar rotation in degrees per frame. Default 1.6. */
  radarSpeed?: number;
  showHud?: boolean;
  showCompass?: boolean;
  /** Optional district captions pinned to deterministic spots. */
  labels?: readonly string[];
};

/* ==================================================================== */
/*  2. resource_markers                                                 */
/* ==================================================================== */

export type ResourceKind = "water" | "fuel" | "power" | "med" | "radiation";

export type ResourceStatus = "ok" | "low" | "critical";

export type ResourceMarker = {
  /** Normalized 0..1 artboard position of the marker pin. */
  x: number;
  y: number;
  type: ResourceKind;
  label: string;
  /** Numeric reading; rendered with `unit`. */
  value?: number;
  unit?: string;
  /** Default `ok`. */
  status?: ResourceStatus;
};

export type ResourceMarkersConfig = InfographicPlacement & {
  markers: readonly ResourceMarker[];
  title?: string;
  subtitle?: string;
  showValues?: boolean;
  showLegend?: boolean;
  /** Marker pulse speed (radians per frame-ish). Default 0.12. */
  pulseSpeed?: number;
  /** Visual marker scale. Default 1. */
  markerScale?: number;
};

/* ==================================================================== */
/*  3. counters                                                         */
/* ==================================================================== */

export type CounterVariant = "digital" | "bar" | "radial";

export type CounterItem = {
  from: number;
  to: number;
  label: string;
  unit?: string;
  prefix?: string;
  /** Default `digital`. */
  variant?: CounterVariant;
  decimals?: number;
  /** Bar / radial scale maximum. Default 100. */
  max?: number;
  /** Item accent (bar, gauge, digits). */
  color?: string;
  /** Adds a red threshold cap / warning tag. */
  critical?: boolean;
};

export type CountersConfig = InfographicPlacement & {
  items: readonly CounterItem[];
  title?: string;
  /** Default 1. */
  columns?: number;
  /** Local frame when counting starts. Default 4. */
  startFrame?: number;
  /** Frames between items. Default 5. */
  stagger?: number;
  /** Count duration in frames. Default 44. */
  duration?: number;
  /** Draw the dark panel behind the counters. Default true. */
  panel?: boolean;
};

/* ==================================================================== */
/*  4. schematics                                                       */
/* ==================================================================== */

export type SchematicNodeKind =
  | "source"
  | "generator"
  | "pump"
  | "tank"
  | "junction"
  | "load";

export type SchematicStatus = "ok" | "fault" | "off";

export type SchematicNode = {
  /** Unique id used by links. */
  id: string;
  label: string;
  /** Normalized 0..1 position of the node centre inside the artboard. */
  x: number;
  y: number;
  kind?: SchematicNodeKind;
  status?: SchematicStatus;
  /** Small mono reading under the label, e.g. "3.2 кВт". */
  value?: string;
};

export type SchematicLink = {
  from: string;
  to: string;
  type: "power" | "water";
  /** Broken link: red stroke, break marks and sparks. */
  fault?: boolean;
  label?: string;
};

export type SchematicsConfig = InfographicPlacement & {
  nodes: readonly SchematicNode[];
  links: readonly SchematicLink[];
  title?: string;
  subtitle?: string;
  /** Default true. */
  legend?: boolean;
  /** Flow animation speed multiplier. Default 1. */
  flowSpeed?: number;
};

/* ==================================================================== */
/*  5. inventory                                                        */
/* ==================================================================== */

export type InventoryIcon =
  | "medkit"
  | "water"
  | "fuel"
  | "ammo"
  | "radio"
  | "battery"
  | "key"
  | "tool"
  | "food"
  | "map"
  | "mask"
  | "flare";

export type InventorySlot = {
  name: string;
  icon: InventoryIcon;
  qty: number;
  /** Highlighted slot + "AKT" tag. */
  active?: boolean;
  /** 0..1 condition bar at the bottom of the card. */
  durability?: number;
  hint?: string;
};

export type InventoryConfig = InfographicPlacement & {
  slots: readonly InventorySlot[];
  title?: string;
  /** Character / squad name in the header. */
  owner?: string;
  /** Default 2. */
  columns?: number;
  compact?: boolean;
  showHints?: boolean;
};

/* ==================================================================== */
/*  6. warning                                                          */
/* ==================================================================== */

export type WarningLevel = "caution" | "danger" | "critical";

export type WarningConfig = InfographicPlacement & {
  level: WarningLevel;
  title: string;
  subtitle?: string;
  /** Mono code in the top-right corner, e.g. "ALERT-07". */
  code?: string;
  /** Hazard stripes on the left edge. Default true. */
  stripes?: boolean;
  /** Blinking status dot. Default true. */
  blink?: boolean;
  pulseSpeed?: number;
};

/* ==================================================================== */
/*  7. animated_routes                                                  */
/* ==================================================================== */

export type AnimatedRouteSpec = {
  /** Normalized 0..1 points, at least two. */
  points: readonly InfographicPoint[];
  color?: string;
  /** Callout title. */
  label?: string;
  /** Callout second line. */
  note?: string;
  /** Extra delay in frames. */
  delay?: number;
  /** Draw duration in frames. Default 46. */
  drawDuration?: number;
  /** Local frame at which the draw starts. Default 4. */
  startFrame?: number;
  /** Moving arrow head at the line tip. Default true. */
  arrow?: boolean;
  /** Animated dash pattern instead of a solid line. */
  dash?: boolean;
};

export type AnimatedRoutesConfig = InfographicPlacement & {
  routes: readonly AnimatedRouteSpec[];
  title?: string;
  /** Faint dotted grid behind the routes. Default false. */
  showGrid?: boolean;
  /** Numbered waypoint dots. Default true. */
  showWaypoints?: boolean;
  /** Leader-line callout boxes. Default true. */
  showCallout?: boolean;
};

/* ==================================================================== */
/*  Registry typing                                                     */
/* ==================================================================== */

/** id -> config map. Adding a component means adding one entry here. */
export type InfographicConfigMap = {
  procedural_map: ProceduralMapConfig;
  resource_markers: ResourceMarkersConfig;
  counters: CountersConfig;
  schematics: SchematicsConfig;
  inventory: InventoryConfig;
  warning: WarningConfig;
  animated_routes: AnimatedRoutesConfig;
};

export type InfographicId = keyof InfographicConfigMap;

/** Discriminated union that makes `<Infographic id=... config=... />` type-safe. */
export type InfographicProps = {
  [K in InfographicId]: {
    id: K;
    config: InfographicConfigMap[K];
    /** Overrides `config.frame`. */
    frame?: number;
    className?: string;
    style?: React.CSSProperties;
  };
}[InfographicId];

/* ==================================================================== */
/*  Placement helpers                                                   */
/* ==================================================================== */

/** Merge a config with a component's default artboard size. */
export const resolveInfoBox = (
  config: InfographicPlacement,
  fallback: { width: number; height: number },
): ResolvedInfoBox => ({
  x: config.x ?? 0,
  y: config.y ?? 0,
  width: config.width ?? fallback.width,
  height: config.height ?? fallback.height,
  scale: config.scale ?? 1,
  opacity: config.opacity ?? 1,
});

/** CSS for the absolutely positioned artboard wrapper. */
export const infoContainerStyle = (
  box: ResolvedInfoBox,
  config?: InfographicPlacement,
): React.CSSProperties => ({
  position: "absolute",
  left: 0,
  top: 0,
  width: box.width,
  height: box.height,
  transformOrigin: "0 0",
  transform: `translate(${box.x}px, ${box.y}px) scale(${box.scale})`,
  opacity: box.opacity,
  overflow: "visible",
  pointerEvents: "none",
  ...config?.style,
});

/** Map a normalized 0..1 point onto the artboard in px. */
export const infoPoint = (
  point: InfographicPoint,
  width: number,
  height: number,
): InfographicPoint => ({ x: point.x * width, y: point.y * height });
