import { useCurrentFrame } from "remotion";
import { clamp01, rand } from "../Camera";
import type { PropProps, PropState } from "./types";

/** Comic outline weight used by every prop (same as locations / characters). */
export const PROP_OUTLINE = 3;

/** Frame clock for a prop: explicit override wins, otherwise Remotion frame. */
export const usePropFrame = <TState extends PropState>(
  props: PropProps<TState>,
): number => {
  const current = useCurrentFrame();
  return props.frame ?? current;
};

/** Deterministic 0..1 loop phase with a per-index seed offset. */
export const loopPhase = (
  frame: number,
  length: number,
  seed = 0,
  index = 0,
): number => {
  const safeLength = Math.max(1, length);
  const offset = Math.floor(rand(seed, index) * safeLength);
  const value = (frame + offset) % safeLength;
  return ((value < 0 ? value + safeLength : value) / safeLength);
};

/** Soft 0..1 sine pulse (never touches `Math.random()`). */
export const pulse = (frame: number, speed = 0.1, min = 0.4, max = 1): number =>
  min + (max - min) * (0.5 + 0.5 * Math.sin(frame * speed));

/** Clamp helper re-exported so prop files do not import half of `Camera`. */
export const eventLevel = (value: number | undefined): number => clamp01(value ?? 0);
