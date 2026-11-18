import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Layer, rand } from "../../Camera";
import { HEIGHT, HORIZON_Y, INK, PALETTE, WIDTH } from "../../palette";

const S = 3;

const CRACKS = [
  "M 120 1740 L 152 1698 L 146 1652 L 176 1616 L 168 1572 L 194 1534",
  "M 168 1572 L 206 1548 M 176 1616 L 214 1602",
  "M 236 1440 L 258 1486 L 248 1530 L 276 1564 L 268 1614 L 292 1652",
  "M 268 1614 L 306 1628 M 248 1530 L 218 1538",
  "M 462 1600 L 448 1650 L 486 1690 L 470 1744 L 512 1790",
  "M 486 1690 L 520 1682 M 470 1744 L 438 1760",
  "M 622 1460 L 658 1504 L 642 1548 L 682 1588 L 666 1642",
  "M 666 1642 L 702 1652 M 642 1548 L 612 1560",
  "M 812 1540 L 844 1588 L 826 1636 L 862 1684 L 848 1738 L 884 1786",
  "M 848 1738 L 888 1748 M 826 1636 L 796 1650",
  "M 956 1430 L 980 1490 L 962 1544 L 998 1596",
  "M 88 1868 L 128 1832 L 116 1790 M 560 1790 L 592 1752 L 580 1712",
  "M 700 1890 L 736 1848 L 722 1806 M 340 1900 L 372 1866 L 358 1830",
];

/** Layer 4 - cracked asphalt, perspective light streaks, rubble. */
export const Ground: React.FC<{ camera: Camera }> = ({ camera }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  return (
    <Layer camera={camera} depth={1}>
      <AbsoluteFill>
        <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="road" gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON_Y - 20} x2="0" y2={HEIGHT + 60}>
              <stop offset="0%" stopColor={PALETTE.asphaltTop} />
              <stop offset="45%" stopColor="#1E2539" />
              <stop offset="100%" stopColor={PALETTE.asphaltBottom} />
            </linearGradient>
            <linearGradient id="roadWarm" gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON_Y} x2="0" y2={HEIGHT}>
              <stop offset="0%" stopColor={PALETTE.haze} stopOpacity={0.3} />
              <stop offset="42%" stopColor={PALETTE.haze} stopOpacity={0.06} />
              <stop offset="100%" stopColor={PALETTE.haze} stopOpacity={0} />
            </linearGradient>
            <filter id="roadBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>

          {/* asphalt (the extra bleed keeps the frame filled when the camera lifts) */}
          <path
            d={`M -100 ${HORIZON_Y - 6} L ${WIDTH + 100} ${HORIZON_Y - 24} L ${WIDTH + 100} ${HEIGHT + 620} L -100 ${HEIGHT + 620} Z`}
            fill="url(#road)"
          />
          <path
            d={`M -100 ${HORIZON_Y - 6} L ${WIDTH + 100} ${HORIZON_Y - 24} L ${WIDTH + 100} ${HEIGHT + 620} L -100 ${HEIGHT + 620} Z`}
            fill="url(#roadWarm)"
          />

          {/* wet warm reflections running towards the viewer */}
          <g filter="url(#roadBlur)" fill={PALETTE.haze} opacity={0.1}>
            <path d={`M 470 ${HORIZON_Y} L 500 ${HORIZON_Y} L 560 ${HEIGHT} L 380 ${HEIGHT} Z`} />
            <path d={`M 560 ${HORIZON_Y} L 576 ${HORIZON_Y} L 700 ${HEIGHT} L 620 ${HEIGHT} Z`} opacity={0.7} />
            <path d={`M 300 ${HORIZON_Y} L 316 ${HORIZON_Y} L 190 ${HEIGHT} L 130 ${HEIGHT} Z`} opacity={0.5} />
            <path d={`M 790 ${HORIZON_Y} L 806 ${HORIZON_Y} L 950 ${HEIGHT} L 880 ${HEIGHT} Z`} opacity={0.45} />
          </g>

          {/* faded lane paint */}
          <g fill="#C8C2C0" opacity={0.1}>
            <path d={`M 486 ${HORIZON_Y + 30} L 498 ${HORIZON_Y + 30} L 470 ${HEIGHT} L 420 ${HEIGHT} Z`} />
            <path d={`M 600 ${HORIZON_Y + 26} L 612 ${HORIZON_Y + 26} L 690 ${HEIGHT} L 640 ${HEIGHT} Z`} />
          </g>

          {/* cracks with a warm rim highlight */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {CRACKS.map((d, i) => (
              <path key={`c${i}`} d={d} stroke={PALETTE.asphaltCrack} strokeWidth={i % 3 === 0 ? 5 : 3.2} opacity={0.65} />
            ))}
            {CRACKS.map((d, i) => (
              <path
                key={`h${i}`}
                d={d}
                stroke={PALETTE.emberHot}
                strokeWidth={1.2}
                opacity={0.12}
                transform="translate(2 -2)"
              />
            ))}
          </g>

          {/* potholes */}
          <g>
            <ellipse cx={168} cy={1772} rx={50} ry={18} fill="#0B0E18" stroke={INK} strokeWidth={S} />
            <ellipse cx={168} cy={1768} rx={37} ry={11} fill="#141827" />
            <path d="M 126 1762 Q 168 1744 210 1762" fill="none" stroke={PALETTE.emberHot} strokeWidth={2} opacity={0.16} />
            <ellipse cx={962} cy={1740} rx={60} ry={22} fill="#0B0E18" stroke={INK} strokeWidth={S} />
            <ellipse cx={962} cy={1736} rx={45} ry={13} fill="#141827" />
            <path d="M 908 1728 Q 962 1706 1016 1728" fill="none" stroke={PALETTE.emberHot} strokeWidth={2} opacity={0.16} />
          </g>

          {/* scattered rubble on the road */}
          <g>
            <path d="M 236 1846 L 262 1830 L 286 1844 L 272 1864 Z" fill="#3A3F57" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
            <path d="M 640 1880 L 664 1862 L 692 1876 L 680 1896 Z" fill="#333852" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
            <path d="M 452 1798 L 470 1786 L 492 1796 L 480 1810 Z" fill="#2F344B" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
            <path d="M 928 1902 L 950 1888 L 974 1900 L 960 1916 Z" fill="#2C3148" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
          </g>

          {/* tiny embers trapped in the cracks */}
          {Array.from({ length: 18 }, (_, i) => {
            const cx = rand(41, i) * WIDTH;
            const cy = HORIZON_Y + 120 + rand(43, i) * (HEIGHT - HORIZON_Y - 120);
            const pulse = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.4 + i));
            return (
              <g key={`e${i}`} opacity={pulse}>
                <circle cx={cx} cy={cy} r={9} fill={PALETTE.emberHot} opacity={0.18} />
                <circle cx={cx} cy={cy} r={2.4} fill={PALETTE.ember} />
              </g>
            );
          })}

          {/* broken slab framing the bottom edge of the frame */}
          <g>
            <path
              d={`M -100 ${HEIGHT + 60} L -100 1898 L 34 1874 L 96 1890 L 152 1864 L 238 1886 L 306 1868 L 374 1892 L 470 1872 L 540 1894 L 646 1870 L 724 1890 L 822 1864 L 902 1886 L 984 1862 L 1062 1882 L 1180 1868 L 1180 ${HEIGHT + 60} Z`}
              fill="#0A0C16"
              stroke={INK}
              strokeWidth={S}
              strokeLinejoin="round"
            />
            <g fill="#151A28" opacity={0.9}>
              <path d="M 96 1890 L 122 1876 L 140 1888 L 118 1894 Z" />
              <path d="M 306 1868 L 330 1858 L 344 1872 L 322 1880 Z" />
              <path d="M 724 1890 L 748 1878 L 764 1890 L 742 1896 Z" />
            </g>
            <path d="M -100 1898 L 1180 1868" stroke={PALETTE.emberHot} strokeWidth={2} opacity={0.18} />
          </g>
        </svg>
      </AbsoluteFill>
    </Layer>
  );
};
