import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Layer, rand } from "../../Camera";
import { PALETTE, WIDTH, HEIGHT, HORIZON_Y } from "../../palette";

const Cloud: React.FC<{ x: number; y: number; s: number; o: number; drift: number }> = ({
  x,
  y,
  s,
  o,
  drift,
}) => (
  <g transform={`translate(${x + drift} ${y}) scale(${s})`} opacity={o}>
    <ellipse cx={0} cy={2} rx={148} ry={22} fill={PALETTE.skyTop} />
    <ellipse cx={-104} cy={8} rx={74} ry={16} fill={PALETTE.skyTop} />
    <ellipse cx={86} cy={-6} rx={92} ry={24} fill={PALETTE.skyMid} />
    <ellipse cx={26} cy={-14} rx={64} ry={20} fill={PALETTE.skyMid} />
    <ellipse cx={-46} cy={-6} rx={52} ry={14} fill={PALETTE.skyMid} opacity={0.8} />
    {/* sunset rim on the underside */}
    <ellipse cx={6} cy={18} rx={150} ry={8} fill={PALETTE.haze} opacity={0.45} />
    <ellipse cx={-52} cy={14} rx={70} ry={5} fill={PALETTE.sunMid} opacity={0.25} />
  </g>
);

export const Sky: React.FC<{ camera: Camera; flash: number }> = ({ camera, flash }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const sunX = 726;
  const sunY = 1012;
  const smoke = Array.from({ length: 7 }, (_, i) => i);

  return (
    <Layer camera={camera} depth={0.18}>
      <AbsoluteFill>
        <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="skyGrad" gradientUnits="userSpaceOnUse" x1="0" y1={-60} x2="0" y2={HORIZON_Y + 20}>
              <stop offset="0" stopColor={PALETTE.skyNight} />
              <stop offset="0.16" stopColor={PALETTE.skyTop} />
              <stop offset="0.4" stopColor={PALETTE.skyMid} />
              <stop offset="0.6" stopColor={PALETTE.skyMaroon} />
              <stop offset="0.76" stopColor="#C8423E" />
              <stop offset="0.88" stopColor={PALETTE.skyWarm} />
              <stop offset="1" stopColor={PALETTE.skyHot} />
            </linearGradient>

            <radialGradient id="sunGlow">
              <stop offset="0%" stopColor={PALETTE.sunMid} stopOpacity={0.85} />
              <stop offset="38%" stopColor={PALETTE.skyWarm} stopOpacity={0.45} />
              <stop offset="100%" stopColor={PALETTE.skyWarm} stopOpacity={0} />
            </radialGradient>

            <radialGradient id="sunDisc">
              <stop offset="0%" stopColor={PALETTE.sunCore} />
              <stop offset="45%" stopColor={PALETTE.sunCore} stopOpacity={0.95} />
              <stop offset="72%" stopColor={PALETTE.sunMid} stopOpacity={0.85} />
              <stop offset="100%" stopColor={PALETTE.sunEdge} stopOpacity={0.6} />
            </radialGradient>

            <linearGradient id="horizonHaze" gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON_Y - 260} x2="0" y2={HORIZON_Y + 10}>
              <stop offset="0%" stopColor={PALETTE.haze} stopOpacity={0} />
              <stop offset="100%" stopColor={PALETTE.haze} stopOpacity={0.5} />
            </linearGradient>

            <filter id="smokeBlur" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
            <filter id="cloudBlur" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          <rect x={-80} y={-80} width={WIDTH + 160} height={HORIZON_Y + 120} fill="url(#skyGrad)" />

          {/* huge smoking sun */}
          <circle cx={sunX} cy={sunY} r={560} fill="url(#sunGlow)" opacity={0.6 + flash * 0.4} />
          <circle cx={sunX} cy={sunY} r={214} fill="url(#sunDisc)" opacity={0.95} />

          {smoke.map((i) => {
            const r = 210 + i * 26 + Math.sin(t * 0.5 + i) * 8;
            return (
              <ellipse
                key={i}
                cx={sunX + Math.sin(t * 0.32 + i * 1.7) * 16}
                cy={sunY - i * 12 + Math.cos(t * 0.24 + i) * 10}
                rx={r}
                ry={r * 0.34}
                fill={i % 2 === 0 ? PALETTE.sunEdge : PALETTE.sunCore}
                opacity={0.1}
                filter="url(#smokeBlur)"
              />
            );
          })}

          {/* low drifting clouds */}
          <g filter="url(#cloudBlur)">
            <Cloud x={120} y={766} s={1.15} o={0.5} drift={-t * 7} />
            <Cloud x={780} y={690} s={0.9} o={0.42} drift={-t * 5} />
            <Cloud x={430} y={872} s={1.45} o={0.55} drift={-t * 9} />
            <Cloud x={1000} y={930} s={1.2} o={0.45} drift={-t * 6} />
            <Cloud x={-30} y={1002} s={1.3} o={0.4} drift={-t * 4} />
            <Cloud x={640} y={1010} s={1.05} o={0.35} drift={-t * 8} />
          </g>

          {/* heat haze just above the skyline */}
          <rect x={-80} y={HORIZON_Y - 300} width={WIDTH + 160} height={330} fill="url(#horizonHaze)" />

          {/* distant explosion flash */}
          <circle
            cx={sunX}
            cy={sunY - 60}
            r={520}
            fill={PALETTE.skyWarm}
            opacity={flash * 0.55}
            filter="url(#smokeBlur)"
          />

          {/* fine ash speckles far away */}
          {Array.from({ length: 40 }, (_, i) => {
            const px = rand(3, i) * (WIDTH + 120) - 60;
            const py = ((rand(5, i) * 1300 - t * (8 + rand(9, i) * 14)) % 1300 + 1300) % 1300;
            return (
              <circle
                key={`a${i}`}
                cx={px}
                cy={py}
                r={0.8 + rand(11, i) * 1.2}
                fill={PALETTE.ash}
                opacity={0.12 + rand(13, i) * 0.18}
              />
            );
          })}
        </svg>
      </AbsoluteFill>
    </Layer>
  );
};
