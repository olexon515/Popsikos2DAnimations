import React from "react";
import { AbsoluteFill } from "remotion";

/** Screen-space camera state; parallax is derived from `depth` per layer. */
export type Camera = {
  zoom: number;
  panX: number;
  panY: number;
  shakeX: number;
  shakeY: number;
};

export const STATIC_CAMERA: Camera = {
  zoom: 1,
  panX: 0,
  panY: 0,
  shakeX: 0,
  shakeY: 0,
};

/**
 * Wraps one parallax layer.
 * depth 0 = infinitely far (never moves), depth 1 = locked to the actors,
 * depth > 1 = moves faster than them (close foreground).
 */
export const Layer: React.FC<{
  camera: Camera;
  depth: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ camera, depth, children, style }) => {
  const scale = 1 + (camera.zoom - 1) * depth;
  const tx = -camera.panX * depth + camera.shakeX * depth;
  const ty = -camera.panY * depth + camera.shakeY * depth;

  return (
    <AbsoluteFill
      style={{
        transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
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

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));
