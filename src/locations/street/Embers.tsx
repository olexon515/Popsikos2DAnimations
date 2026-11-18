import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Layer, rand } from "../../Camera";
import { HEIGHT, PALETTE, WIDTH } from "../../palette";

type Particle = {
  x: number;
  size: number;
  speed: number;
  sway: number;
  phase: number;
  startY: number;
  hot: boolean;
  bright: number;
};

const TRAVEL = HEIGHT + 400;

const PARTICLES: Particle[] = Array.from({ length: 78 }, (_, i) => ({
  x: rand(7, i) * (WIDTH + 160) - 80,
  size: 1.4 + rand(11, i) * 3.4,
  speed: 30 + rand(13, i) * 62,
  sway: 12 + rand(17, i) * 34,
  phase: rand(19, i) * Math.PI * 2,
  startY: rand(23, i) * TRAVEL,
  hot: rand(29, i) > 0.42,
  bright: 0.35 + rand(31, i) * 0.55,
}));

/** Layer 5 - ash and sparks drifting up through the whole frame. */
export const Embers: React.FC<{ camera: Camera }> = ({ camera }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  return (
    <Layer camera={camera} depth={1.18}>
      <AbsoluteFill>
        <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ overflow: "visible" }}>
          <defs>
            <radialGradient id="emberGlow">
              <stop offset="0%" stopColor={PALETTE.ember} stopOpacity={0.75} />
              <stop offset="100%" stopColor={PALETTE.emberHot} stopOpacity={0} />
            </radialGradient>
          </defs>

          {PARTICLES.map((p, i) => {
            const travel = (p.startY - t * p.speed) % TRAVEL;
            const y = (travel < 0 ? travel + TRAVEL : travel) - 200;
            const x = p.x + Math.sin(t * 1.4 + p.phase) * p.sway + Math.sin(t * 0.6 + i) * 6;
            const fade = Math.min(1, Math.max(0, (HEIGHT - y) / 260)) * Math.min(1, Math.max(0, y / 220));
            const flicker = 0.75 + 0.25 * Math.sin(t * 6 + p.phase * 1.7);
            const opacity = fade * p.bright * flicker;

            return (
              <g key={i} opacity={opacity}>
                {p.hot ? (
                  <>
                    <circle cx={x} cy={y} r={p.size * 4.2} fill="url(#emberGlow)" opacity={0.5} />
                    <circle cx={x} cy={y} r={p.size} fill={PALETTE.ember} />
                  </>
                ) : (
                  <circle cx={x} cy={y} r={p.size * 0.8} fill={PALETTE.ash} opacity={0.8} />
                )}
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
    </Layer>
  );
};
