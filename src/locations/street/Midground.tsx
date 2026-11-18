import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Layer } from "../../Camera";
import { HEIGHT, INK, PALETTE, WIDTH } from "../../palette";

const S = 3; // outline weight

/**
 * Layer 3 - the middle ground props: bent street signs, concrete rubble,
 * a charred tree. Everything here carries the 3px comic outline.
 */
export const Midground: React.FC<{ camera: Camera }> = ({ camera }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  return (
    <Layer camera={camera} depth={0.78}>
      <AbsoluteFill>
        <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ overflow: "visible" }}>
          {/* ---------------- charred tree ---------------- */}
          <g transform={`translate(-60 0) rotate(${Math.sin(t * 0.6) * 0.3} 150 1492)`}>
            <ellipse cx={152} cy={1494} rx={124} ry={22} fill="#08060D" opacity={0.42} />
            {/* tapered trunk in two segments */}
            <path d="M 158 1490 C 150 1432 152 1394 156 1358" fill="none" stroke={INK} strokeWidth={45} strokeLinecap="round" />
            <path d="M 158 1490 C 150 1432 152 1394 156 1358" fill="none" stroke="#1E1529" strokeWidth={39} strokeLinecap="round" />
            <path d="M 156 1362 C 162 1322 162 1286 168 1248" fill="none" stroke={INK} strokeWidth={31} strokeLinecap="round" />
            <path d="M 156 1362 C 162 1322 162 1286 168 1248" fill="none" stroke="#241733" strokeWidth={25} strokeLinecap="round" />
            {/* main limbs */}
            <g stroke={INK} strokeWidth={19} strokeLinecap="round" fill="none">
              <path d="M 160 1386 C 196 1352 222 1320 234 1288" />
              <path d="M 154 1330 C 126 1304 96 1290 70 1286" />
              <path d="M 162 1284 C 184 1258 198 1236 206 1214" />
              <path d="M 158 1262 C 142 1238 132 1218 128 1198" />
            </g>
            <g stroke="#241733" strokeWidth={13} strokeLinecap="round" fill="none">
              <path d="M 160 1386 C 196 1352 222 1320 234 1288" />
              <path d="M 154 1330 C 126 1304 96 1290 70 1286" />
              <path d="M 162 1284 C 184 1258 198 1236 206 1214" />
              <path d="M 158 1262 C 142 1238 132 1218 128 1198" />
            </g>
            {/* twigs */}
            <g stroke="#1E1529" strokeWidth={5.5} strokeLinecap="round" fill="none">
              <path d="M 234 1288 C 248 1266 254 1246 252 1228" />
              <path d="M 226 1300 C 246 1296 258 1286 264 1272" />
              <path d="M 70 1286 C 54 1272 46 1256 44 1240" />
              <path d="M 206 1214 C 216 1196 218 1178 214 1162" />
              <path d="M 128 1198 C 122 1182 114 1170 104 1162" />
            </g>
            {/* warm rim light on the sun side */}
            <path d="M 176 1470 C 172 1400 172 1326 176 1258" fill="none" stroke="#FFA877" strokeWidth={3} opacity={0.32} />
            {/* embers in the wood */}
            <g fill={PALETTE.emberHot}>
              <circle cx={142} cy={1400} r={3.4} opacity={0.5} />
              <circle cx={160} cy={1448} r={2.6} opacity={0.4} />
              <circle cx={154} cy={1310} r={2.8} opacity={0.5} />
            </g>
            <g fill={PALETTE.ember} opacity={0.85}>
              <circle cx={234} cy={1288} r={2.6} />
              <circle cx={206} cy={1214} r={2.4} />
              <circle cx={70} cy={1286} r={2.2} />
              <circle cx={252} cy={1228} r={1.8} />
            </g>
          </g>

          {/* ---------------- leaning road sign ---------------- */}
          <g transform="translate(-150 110) rotate(9 664 1478)">
            <ellipse cx={664} cy={1482} rx={92} ry={18} fill="#08060D" opacity={0.38} />
            <rect x={656} y={1236} width={16} height={246} rx={3} fill="#2A2C3E" stroke={INK} strokeWidth={S} />
            {/* main board */}
            <g transform="rotate(-4 664 1236)">
              <rect x={572} y={1120} width={184} height={128} rx={10} fill="#8F3A2C" stroke={INK} strokeWidth={S} />
              <rect x={586} y={1134} width={156} height={100} rx={6} fill="#773024" />
              {/* arrow + warning glyph */}
              <path
                d="M 618 1184 L 676 1184 M 656 1166 L 678 1184 L 656 1202"
                fill="none"
                stroke="#F4D2A8"
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
              <path d="M 604 1150 L 604 1240" stroke={INK} strokeWidth={S} opacity={0.5} />
            </g>
            {/* small half-torn secondary sign */}
            <g transform="rotate(14 700 1310)">
              <path
                d="M 678 1288 L 742 1296 L 736 1348 L 690 1344 Z"
                fill="#7C4A3A"
                stroke={INK}
                strokeWidth={S}
                strokeLinejoin="round"
              />
              <path d="M 690 1310 L 730 1316" stroke="#F4D2A8" strokeWidth={5} opacity={0.6} />
            </g>
          </g>

          {/* ---------------- concrete rubble ---------------- */}
          <g>
            <ellipse cx={946} cy={1606} rx={128} ry={22} fill="#08060D" opacity={0.36} />
            <path
              d="M 852 1600 L 872 1540 L 940 1524 L 1006 1548 L 1032 1598 Z"
              fill="#3C4059"
              stroke={INK}
              strokeWidth={S}
              strokeLinejoin="round"
            />
            <path d="M 892 1592 L 918 1546 L 950 1588 Z" fill="#2B2F45" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
            {/* exposed rebar */}
            <g stroke="#8E5A46" strokeWidth={S} strokeLinecap="round">
              <path d="M 986 1552 L 1024 1524" />
              <path d="M 994 1564 L 1040 1540" />
            </g>
            <path
              d="M 796 1618 L 812 1586 L 846 1580 L 860 1612 Z"
              fill="#333750"
              stroke={INK}
              strokeWidth={S}
              strokeLinejoin="round"
            />
            <path
              d="M 1010 1638 L 1026 1602 L 1058 1612 L 1064 1640 Z"
              fill="#2E3249"
              stroke={INK}
              strokeWidth={S}
              strokeLinejoin="round"
            />
          </g>

          {/* ---------------- a few fire-lit cracks in the rubble ---------------- */}
          <g fill={PALETTE.emberHot} opacity={0.35}>
            <rect x={932} y={1568} width={22} height={3} rx={1.5} />
            <rect x={876} y={1578} width={14} height={3} rx={1.5} />
          </g>
        </svg>
      </AbsoluteFill>
    </Layer>
  );
};
