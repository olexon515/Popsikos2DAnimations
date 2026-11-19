import type React from "react";

/**
 * Interactive Prop Engine - shared contract.
 *
 * Every prop is a pure SVG artboard that:
 *  - is placed by a scene-space anchor `{ x, y }` (bottom-centre of the artboard);
 *  - scales uniformly with `scale`;
 *  - renders one of its declared `state`s;
 *  - reacts to a 0..1 `eventProgress` for one-shot actions
 *    (vibration, opening, page flip, spark burst, ...);
 *  - animates only from the Remotion frame and a deterministic `seed`
 *    (`rand(seed, i)` from `src/Camera.tsx`; `Math.random()` is forbidden);
 *  - exposes a local `focus` point, which the registry turns into a
 *    scene-space **interactionPoint** for `Character.lookAt` or
 *    `CinematicShot.target` (object-focus).
 */

/** A point in the scene plane (same coordinate space as `<Character x/y>`). */
export type PropPoint = { x: number; y: number };

/** Any state identifier; every prop narrows it to its own string union. */
export type PropState = string;

/** Runtime placement of one prop instance in scene coordinates. */
export type PropLayout<TState extends PropState = PropState> = {
  /** Scene X of the bottom-centre anchor. */
  x: number;
  /** Scene Y of the bottom-centre anchor (the "ground" line). */
  y: number;
  /** Uniform scale: artboard units -> scene px. */
  scale: number;
  state: TState;
  /** 0..1 progress of the prop's one-shot event. */
  eventProgress: number;
  /** Deterministic seed for procedural flicker, sparks, drops, pages, ... */
  seed: number;
};

/** Props accepted by every prop SVG component. */
export type PropProps<TState extends PropState = PropState> = {
  x: number;
  y: number;
  /** Uniform scale, default `1`. */
  scale?: number;
  state: TState;
  /** 0..1 event progress, default `0`. */
  eventProgress?: number;
  /** Deterministic seed, default `0`. */
  seed?: number;
  /** Optional frame override; by default the component reads `useCurrentFrame()`. */
  frame?: number;
  style?: React.CSSProperties;
  className?: string;
};

/**
 * Focus point in **local artboard coordinates** (0,0 = top-left).
 * May be static or computed from the current layout (e.g. a crack appears).
 */
export type PropFocus<TState extends PropState = PropState> =
  | PropPoint
  | ((layout: PropLayout<TState>) => PropPoint);

/** One entry of the `PROPS` registry. */
export type PropDefinition<TState extends PropState = PropState> = {
  /** Stable registry key, e.g. `phone`. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** One-line summary used by docs and HUD labels. */
  description: string;
  /** Every state the SVG component understands. */
  states: readonly TState[];
  /** State used when the scene does not specify one. */
  defaultState: TState;
  /** Local artboard size before `scale`; anchor = bottom centre. */
  size: { width: number; height: number };
  /** Local focus point -> scene-space interactionPoint via `resolvePropFocus`. */
  focus: PropFocus<TState>;
  /** The SVG component itself. */
  Component: React.FC<PropProps<TState>>;
};

/** Public metadata available without touching a component. */
export type PropSummary = {
  id: string;
  name: string;
  description: string;
  states: readonly string[];
  defaultState: string;
  size: { width: number; height: number };
};

/** Map a local artboard point to scene space for a given layout. */
export const propScenePoint = (
  size: { width: number; height: number },
  layout: PropLayout,
  local: PropPoint,
): PropPoint => ({
  x: layout.x + (local.x - size.width / 2) * layout.scale,
  y: layout.y + (local.y - size.height) * layout.scale,
});

/**
 * Resolve a definition's local `focus` into a scene-space interactionPoint.
 *
 * ```ts
 * const point = resolvePropFocus(PROPS.phone, {
 *   x: 540, y: 1680, scale: 1.2, state: "ringing",
 *   eventProgress: 0.4, seed: 7,
 * });
 * // -> { x: 540, y: 1416 }  (screen centre of the phone)
 * ```
 */
export const resolvePropFocus = <TState extends PropState>(
  definition: PropDefinition<TState>,
  layout: PropLayout<TState>,
): PropPoint => {
  const local =
    typeof definition.focus === "function"
      ? definition.focus(layout)
      : definition.focus;
  return propScenePoint(definition.size, layout, local);
};

/**
 * CSS for the absolutely positioned prop wrapper.
 * `x/y` is the bottom-centre anchor, so the artboard stands on the ground.
 */
export const propContainerStyle = (
  size: { width: number; height: number },
  layout: PropLayout,
  style?: React.CSSProperties,
): React.CSSProperties => ({
  position: "absolute",
  left: 0,
  top: 0,
  width: size.width,
  height: size.height,
  transformOrigin: "0 0",
  transform: `translate(${layout.x - size.width / 2}px, ${
    layout.y - size.height
  }px) scale(${layout.scale})`,
  overflow: "visible",
  pointerEvents: "none",
  ...style,
});
