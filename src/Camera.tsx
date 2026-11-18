import React from "react";
import { AbsoluteFill } from "remotion";

/**
 * Screen-space camera state; parallax is derived from `depth` per layer.
 *
 * `roll`, `tiltX` and `perspective` are optional so every existing shot keeps
 * working unchanged - the Cinematic Shot Engine uses them for Dutch angles,
 * high-angle (top-down) projection and first-person sway.
 */
export type Camera = {
  zoom: number;
  panX: number;
  panY: number;
  shakeX: number;
  shakeY: number;
  /** Camera roll (Dutch angle) in degrees, applied per parallax depth. */
  roll?: number;
  /** High-angle tilt in degrees (2.5D top-down projection). */
  tiltX?: number;
  /** Perspective distance used by `tiltX`, in px. */
  perspective?: number;
};

export const STATIC_CAMERA: Camera = {
  zoom: 1,
  panX: 0,
  panY: 0,
  shakeX: 0,
  shakeY: 0,
};

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/** Clamp to the 0..1 interval. */
export const clamp01 = (v: number): number => clamp(v, 0, 1);

/** Linear interpolation, unclamped (use `clamp01(t)` for an eased 0..1 mix). */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Classic smoothstep easing on 0..1. */
export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Damped sine impulse - great for impact shake / camera punches. */
export const dampedWave = (
  frame: number,
  amplitude: number,
  decay: number,
  speed = 1,
): number => Math.sin(frame * speed) * amplitude * Math.exp(-frame * decay);

/** Build a camera from a partial state, filling every field with a safe default. */
export const makeCamera = (partial: Partial<Camera> = {}): Camera => ({
  ...STATIC_CAMERA,
  ...partial,
});

/** Blend two camera states (useful for hand-authored transitions). */
export const mixCamera = (a: Camera, b: Camera, t: number): Camera => {
  const k = clamp01(t);
  return {
    zoom: lerp(a.zoom, b.zoom, k),
    panX: lerp(a.panX, b.panX, k),
    panY: lerp(a.panY, b.panY, k),
    shakeX: lerp(a.shakeX, b.shakeX, k),
    shakeY: lerp(a.shakeY, b.shakeY, k),
    roll: lerp(a.roll ?? 0, b.roll ?? 0, k),
    tiltX: lerp(a.tiltX ?? 0, b.tiltX ?? 0, k),
    perspective: lerp(a.perspective ?? 1600, b.perspective ?? 1600, k),
  };
};

/**
 * Build the CSS transform for one parallax layer.
 * depth 0 = infinitely far (never moves), depth 1 = locked to the actors,
 * depth > 1 = moves faster than them (close foreground).
 */
export const cameraTransform = (camera: Camera, depth: number): string => {
  const scale = 1 + (camera.zoom - 1) * depth;
  const tx = (-camera.panX + camera.shakeX) * depth;
  const ty = (-camera.panY + camera.shakeY) * depth;
  const roll = (camera.roll ?? 0) * depth;
  const tiltX = (camera.tiltX ?? 0) * Math.min(1, depth);
  const perspective = camera.perspective ?? 1600;

  const parts: string[] = [];
  if (tiltX !== 0) parts.push(`perspective(${perspective}px)`);
  parts.push(`translate3d(${tx}px, ${ty}px, 0)`);
  if (tiltX !== 0) parts.push(`rotateX(${tiltX}deg)`);
  if (roll !== 0) parts.push(`rotate(${roll}deg)`);
  parts.push(`scale(${scale})`);
  return parts.join(" ");
};

/** Wraps one parallax layer. */
export const Layer: React.FC<{
  camera: Camera;
  depth: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ camera, depth, children, style }) => {
  return (
    <AbsoluteFill
      style={{
        transform: cameraTransform(camera, depth),
        transformOrigin: "50% 50%",
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Deterministic pseudo-random in [0, 1) - keeps renders byte-identical. */
export const rand = (seed: number, i: number): number => {
  const v = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453123;
  return v - Math.floor(v);
};
