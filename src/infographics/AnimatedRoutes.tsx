import React from "react";
import {
  INFO,
  INFO_DISPLAY,
  INFO_MONO,
  INFO_OUTLINE,
  InfoSvg,
  clamp01,
  partialRoute,
  progressIn,
  routePath,
  sampleRoute,
  textWidth,
  toPxPoints,
  useInfoClock,
  useUid,
} from "./shared";
import type {
  AnimatedRouteSpec,
  AnimatedRoutesConfig,
  InfographicDefinition,
  InfographicRenderProps,
} from "./types";
import { resolveInfoBox } from "./types";

const ROUTES_SIZE = { width: 1080, height: 1920 } as const;

const clampSpan = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Animated vector routes with a progressive line draw.
 *
 * Each route draws from `points[0]` to the last point over `drawDuration`
 * frames, carries a moving arrow head, numbered waypoints and an optional
 * leader-line callout. Perfect on top of `procedural_map` or as a standalone
 * HUD sketch.
 */
export const AnimatedRoutes: React.FC<
  InfographicRenderProps<AnimatedRoutesConfig>
> = (props) => {
  const { config } = props;
  const { frame } = useInfoClock(props);
  const uid = useUid("routes");
  const box = resolveInfoBox(config, ROUTES_SIZE);
  const W = box.width;
  const H = box.height;
  const accent = config.accent ?? INFO.accent;
  const showGrid = config.showGrid === true;
  const showWaypoints = config.showWaypoints !== false;
  const showCallout = config.showCallout !== false;

  const renderRoute = (route: AnimatedRouteSpec, index: number) => {
    const pts = toPxPoints(route.points, W, H);
    if (pts.length < 2) return null;
    const start = route.startFrame ?? 4;
    const duration = route.drawDuration ?? 46;
    const t = progressIn(frame, start + (route.delay ?? 0), duration);
    const drawn = partialRoute(pts, t);
    const head = sampleRoute(pts, t);
    const last = pts[pts.length - 1];
    const color = route.color ?? accent;
    const dash = route.dash === true;

    const calloutW = Math.max(
      196,
      textWidth(route.label ?? "", 22, 0.6) + 40,
      route.note ? textWidth(route.note, 13, 1.4) + 40 : 0,
    );
    const calloutH = route.note ? 82 : 58;
    const dir = last.x > W * 0.62 ? -1 : 1;
    const boxX = clampSpan(
      last.x + dir * 96 - (dir < 0 ? calloutW : 0),
      24,
      W - calloutW - 24,
    );
    const boxY = clampSpan(last.y - calloutH - 96, 90, H - calloutH - 30);
    const attachX = dir < 0 ? boxX + calloutW : boxX;
    const attachY = boxY + calloutH;
    const calloutIn = clamp01((t - 0.82) / 0.18);

    return (
      <g key={`route${index}`}>
        <path
          d={routePath(drawn)}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.13}
        />
        <path
          d={routePath(drawn)}
          fill="none"
          stroke={color}
          strokeWidth={INFO_OUTLINE + 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dash ? "18 14" : undefined}
          strokeDashoffset={dash ? -(frame * 2.4) : undefined}
          opacity={0.95}
        />
        <path
          d={routePath(drawn)}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.4}
        />

        {showWaypoints
          ? pts.map((pt, k) => {
              const threshold = pts.length <= 1 ? 0 : k / (pts.length - 1);
              const seen = t >= threshold - 0.02;
              if (!seen) return null;
              const isLast = k === pts.length - 1;
              return (
                <g key={`wp${k}`} opacity={seen ? 1 : 0}>
                  {isLast ? (
                    <g>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={16}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        opacity={0.5}
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={7}
                        fill={color}
                        stroke={INFO.deep}
                        strokeWidth={2.4}
                      />
                    </g>
                  ) : (
                    <g>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={9}
                        fill={INFO.deep}
                        stroke={color}
                        strokeWidth={2.6}
                      />
                      <circle cx={pt.x} cy={pt.y} r={3.2} fill={color} />
                      {route.label ? (
                        <text
                          x={pt.x + 16}
                          y={pt.y - 10}
                          fill={color}
                          fontFamily={INFO_MONO}
                          fontSize={11}
                          letterSpacing={1.2}
                          opacity={0.55}
                        >
                          {k + 1 < 10 ? `0${k + 1}` : `${k + 1}`}
                        </text>
                      ) : null}
                    </g>
                  )}
                </g>
              );
            })
          : null}

        {route.arrow !== false ? (
          <g
            transform={`translate(${head.point.x} ${head.point.y}) rotate(${
              head.angle
            }) scale(${t >= 1 ? 0.94 + 0.06 * Math.sin(frame * 0.18) : 1})`}
            opacity={t > 0 ? 1 : 0}
          >
            <circle cx={2} cy={0} r={17} fill={color} opacity={0.16} />
            <path
              d="M 3 -11 L 21 0 L 3 11 L 8 0 Z"
              fill={color}
              stroke={INFO.deep}
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
          </g>
        ) : null}

        {showCallout && route.label ? (
          <g opacity={calloutIn}>
            <line
              x1={last.x}
              y1={last.y}
              x2={attachX}
              y2={attachY}
              stroke={color}
              strokeWidth={2}
              opacity={0.7}
            />
            <circle cx={last.x} cy={last.y} r={3.4} fill={color} />
            <rect
              x={boxX}
              y={boxY}
              width={calloutW}
              height={calloutH}
              rx={10}
              fill="rgba(4, 16, 25, 0.92)"
              stroke={color}
              strokeWidth={INFO_OUTLINE}
            />
            <rect
              x={boxX}
              y={boxY}
              width={6}
              height={calloutH}
              rx={3}
              fill={color}
            />
            <text
              x={boxX + 20}
              y={boxY + 32}
              fill={INFO.text}
              fontFamily={INFO_DISPLAY}
              fontSize={21}
              fontWeight={900}
              letterSpacing={0.6}
            >
              {route.label}
            </text>
            {route.note ? (
              <text
                x={boxX + 20}
                y={boxY + 58}
                fill={color}
                fontFamily={INFO_MONO}
                fontSize={13}
                letterSpacing={1.4}
              >
                {route.note}
              </text>
            ) : null}
          </g>
        ) : null}

        {!showCallout && route.label ? (
          <text
            x={last.x + 26}
            y={last.y + 8}
            fill={color}
            fontFamily={INFO_MONO}
            fontSize={17}
            letterSpacing={2}
            opacity={0.85}
          >
            {route.label}
          </text>
        ) : null}
      </g>
    );
  };

  return (
    <InfoSvg config={config} defaultSize={ROUTES_SIZE}>
      {() => (
        <g>
          <defs>
            <pattern
              id={`${uid}-grid`}
              width="90"
              height="90"
              patternUnits="userSpaceOnUse"
            >
              <circle cx={1} cy={1} r={1.4} fill={accent} opacity={0.16} />
              <path
                d="M 90 0 L 0 0 0 90"
                fill="none"
                stroke={accent}
                strokeWidth={1}
                opacity={0.045}
              />
            </pattern>
          </defs>

          {showGrid ? (
            <rect
              x={-40}
              y={-40}
              width={W + 80}
              height={H + 80}
              fill={`url(#${uid}-grid)`}
            />
          ) : null}

          {config.routes.map((route, i) => renderRoute(route, i))}

          {config.title ? (
            <g>
              <text
                x={54}
                y={292}
                fill={INFO.text}
                fontFamily={INFO_DISPLAY}
                fontSize={34}
                fontWeight={900}
                letterSpacing={0.8}
              >
                {config.title}
              </text>
              <text
                x={56}
                y={318}
                fill={accent}
                fontFamily={INFO_MONO}
                fontSize={13}
                letterSpacing={4}
                opacity={0.8}
              >
                МАРШРУТИ · {config.routes.length} ЛІНІЇ · LIVE
              </text>
            </g>
          ) : null}
        </g>
      )}
    </InfoSvg>
  );
};

export const animatedRoutesInfographic = {
  id: "animated_routes",
  name: "Animated routes",
  titleUk: "Анімовані маршрути",
  description:
    "Vector routes drawn point by point, moving arrow heads, numbered waypoints and leader-line callouts.",
  defaultSize: ROUTES_SIZE,
  usage: ["hud", "plate"],
  Component: AnimatedRoutes,
} as const satisfies InfographicDefinition<
  "animated_routes",
  AnimatedRoutesConfig
>;
