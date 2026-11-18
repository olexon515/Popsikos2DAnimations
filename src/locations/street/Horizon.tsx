import React from "react";
import { AbsoluteFill } from "remotion";
import { Camera, Layer } from "../../Camera";
import { HEIGHT, HORIZON_Y, PALETTE, WIDTH } from "../../palette";

/**
 * Layer 2 - destroyed skyline. Pure silhouettes, no outlines,
 * slightly hazed by the sunset so they sit far behind the actors.
 */
export const Horizon: React.FC<{ camera: Camera }> = ({ camera }) => {
  return (
    <Layer camera={camera} depth={0.45}>
      <AbsoluteFill>
        <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="cityFade" gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON_Y - 460} x2="0" y2={HORIZON_Y}>
              <stop offset="0%" stopColor={PALETTE.silhouetteDeep} />
              <stop offset="100%" stopColor={PALETTE.silhouette} />
            </linearGradient>
            <linearGradient id="cityHaze" gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON_Y - 520} x2="0" y2={HORIZON_Y + 40}>
              <stop offset="0%" stopColor={PALETTE.haze} stopOpacity={0.02} />
              <stop offset="70%" stopColor={PALETTE.haze} stopOpacity={0.16} />
              <stop offset="100%" stopColor={PALETTE.haze} stopOpacity={0.34} />
            </linearGradient>
          </defs>

          {/* far row - lighter, more haze */}
          <g fill="#33203F" opacity={0.55}>
            <path d="M -80 1200 L -80 1030 L 10 1030 L 10 960 L 74 960 L 74 1030 L 168 1030 L 168 1110 L 246 1110 L 246 1200 Z" />
            <path d="M 760 1200 L 760 1010 L 830 1010 L 830 940 L 902 940 L 902 1010 L 1010 1010 L 1010 1090 L 1120 1090 L 1120 1200 Z" />
            <path d="M 300 1200 L 300 1080 L 380 1080 L 380 1020 L 470 1020 L 470 1090 L 560 1090 L 560 1200 Z" />
          </g>

          {/* main skyline */}
          <g fill="url(#cityFade)">
            {/* left ruins */}
            <path d="M -80 1200 L -80 900 L -18 900 L -18 820 L 28 820 L 40 800 L 46 862 L 96 868 L 96 946 L 150 940 L 162 970 L 172 1200 Z" />
            {/* collapsed tower with a bite taken out */}
            <path d="M 176 1200 L 186 830 L 214 812 L 262 826 L 268 900 L 300 892 L 312 940 L 330 944 L 336 1200 Z" />
            {/* mid block */}
            <path d="M 340 1200 L 344 1006 L 402 998 L 406 1050 L 470 1048 L 476 1200 Z" />
            {/* leaning office block */}
            <path d="M 482 1200 L 500 902 L 560 890 L 574 902 L 590 1200 Z" />
            {/* factory hall + chimneys */}
            <path d="M 596 1200 L 596 1074 L 700 1058 L 706 1200 Z" />
            <path d="M 714 1200 L 714 1002 L 742 996 L 742 1200 Z" />
            <path d="M 760 1200 L 760 1058 L 838 1048 L 852 1200 Z" />
            {/* right tower, sheared top */}
            <path d="M 862 1200 L 866 846 L 916 812 L 968 848 L 976 1200 Z" />
            {/* far right rubble */}
            <path d="M 986 1200 L 990 1092 L 1042 1076 L 1084 1102 L 1120 1090 L 1120 1200 Z" />
          </g>

          {/* chimneys */}
          <g fill={PALETTE.silhouetteDeep}>
            <path d="M 612 1072 L 622 830 L 646 826 L 650 1070 Z" />
            <path d="M 900 1052 L 908 742 L 930 740 L 936 1050 Z" />
            <path d="M 528 1044 L 536 880 L 552 878 L 556 1042 Z" />
          </g>

          {/* windows / embers inside the ruins */}
          <g fill={PALETTE.emberHot}>
            <rect x={212} y={880} width={9} height={14} opacity={0.34} />
            <rect x={236} y={922} width={9} height={14} opacity={0.22} />
            <rect x={244} y={1006} width={9} height={14} opacity={0.28} />
            <rect x={388} y={1040} width={9} height={12} opacity={0.2} />
            <rect x={516} y={956} width={9} height={13} opacity={0.3} />
            <rect x={540} y={1044} width={9} height={13} opacity={0.18} />
            <rect x={892} y={904} width={9} height={13} opacity={0.26} />
            <rect x={920} y={1010} width={9} height={13} opacity={0.2} />
            <rect x={790} y={1094} width={9} height={12} opacity={0.24} />
          </g>

          {/* smoke plumes from the chimneys */}
          <g fill={PALETTE.skyTop} opacity={0.4}>
            <ellipse cx={636} cy={770} rx={54} ry={26} />
            <ellipse cx={700} cy={700} rx={74} ry={30} opacity={0.7} />
            <ellipse cx={790} cy={636} rx={96} ry={34} opacity={0.5} />
            <ellipse cx={918} cy={666} rx={58} ry={24} opacity={0.6} />
            <ellipse cx={986} cy={606} rx={84} ry={28} opacity={0.4} />
            <ellipse cx={546} cy={812} rx={44} ry={20} opacity={0.6} />
          </g>

          {/* atmospheric haze in front of the city */}
          <rect x={-80} y={HORIZON_Y - 520} width={WIDTH + 160} height={560} fill="url(#cityHaze)" />
        </svg>
      </AbsoluteFill>
    </Layer>
  );
};
