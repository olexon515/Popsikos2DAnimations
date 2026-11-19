import React from "react";
import {
  enterSpring,
  INFO,
  INFO_DISPLAY,
  INFO_MONO,
  INFO_OUTLINE,
  InfoSvg,
  rand,
  routePath,
  sampleRoute,
  staggerSpring,
  useInfoClock,
  useUid,
} from "./shared";
import type {
  InfographicDefinition,
  InfographicRenderProps,
  SchematicLink,
  SchematicNode,
  SchematicNodeKind,
  SchematicStatus,
  SchematicsConfig,
} from "./types";
import { resolveInfoBox } from "./types";

const SCHEMATICS_SIZE = { width: 640, height: 440 } as const;

type PlacedNode = SchematicNode & { px: number; py: number };

const NODE_SIZE = { width: 138, height: 66 } as const;

const kindColor = (kind: SchematicNodeKind | undefined): string => {
  switch (kind) {
    case "generator":
    case "source":
      return INFO.power;
    case "pump":
      return INFO.water;
    case "tank":
      return INFO.accent;
    case "junction":
      return INFO.warn;
    case "load":
      return "#B8C7C2";
    default:
      return INFO.accent;
  }
};

const statusColor = (status: SchematicStatus | undefined): string => {
  if (status === "fault") return INFO.critical;
  if (status === "off") return "#5C6B72";
  return INFO.accent;
};

const NodeIcon: React.FC<{ kind?: SchematicNodeKind; color: string }> = ({
  kind,
  color,
}) => {
  switch (kind) {
    case "generator":
    case "source":
      return (
        <g>
          <circle
            cx={0}
            cy={0}
            r={12}
            fill="none"
            stroke={color}
            strokeWidth={2.6}
          />
          <path d="M 2 -8 L -5 1 L 0 1 L -2 8 L 5 -1 L 0 -1 Z" fill={color} />
        </g>
      );
    case "pump":
      return (
        <g>
          <circle
            cx={0}
            cy={0}
            r={12}
            fill="none"
            stroke={color}
            strokeWidth={2.6}
          />
          <g stroke={color} strokeWidth={2.4} strokeLinecap="round">
            <path d="M 0 -7 L 0 7" />
            <path d="M -6 -3.5 L 6 3.5" />
            <path d="M -6 3.5 L 6 -3.5" />
          </g>
        </g>
      );
    case "tank":
      return (
        <g>
          <rect
            x={-9}
            y={-11}
            width={18}
            height={23}
            rx={5}
            fill="none"
            stroke={color}
            strokeWidth={2.6}
          />
          <path
            d="M -9 -4 L 9 -4 M -9 4 L 9 4"
            stroke={color}
            strokeWidth={1.8}
            opacity={0.65}
          />
        </g>
      );
    case "junction":
      return (
        <g>
          <path
            d="M 0 -12 L 12 0 L 0 12 L -12 0 Z"
            fill="none"
            stroke={color}
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          <circle cx={0} cy={0} r={3.4} fill={color} />
        </g>
      );
    case "load":
      return (
        <g>
          <path
            d="M 0 -12 A 8 8 0 0 1 5 -1 L 7 5 L -7 5 L -5 -1 A 8 8 0 0 1 0 -12 Z"
            fill="none"
            stroke={color}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <path
            d="M -5 9 L 5 9"
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        </g>
      );
    default:
      return (
        <circle
          cx={0}
          cy={0}
          r={9}
          fill="none"
          stroke={color}
          strokeWidth={2.6}
        />
      );
  }
};

/** Orthogonal elbow between two node centres - the classic schematic look. */
const linkPoints = (
  a: { px: number; py: number },
  b: { px: number; py: number },
): Array<{ x: number; y: number }> => {
  const dx = Math.abs(b.px - a.px);
  const dy = Math.abs(b.py - a.py);
  if (dx < 24 || dy < 24) {
    return [
      { x: a.px, y: a.py },
      { x: b.px, y: b.py },
    ];
  }
  if (dx >= dy) {
    const mid = (a.px + b.px) / 2;
    return [
      { x: a.px, y: a.py },
      { x: mid, y: a.py },
      { x: mid, y: b.py },
      { x: b.px, y: b.py },
    ];
  }
  const mid = (a.py + b.py) / 2;
  return [
    { x: a.px, y: a.py },
    { x: a.px, y: mid },
    { x: b.px, y: mid },
    { x: b.px, y: b.py },
  ];
};

const SchematicNodeCard: React.FC<{
  node: PlacedNode;
  appear: number;
}> = ({ node, appear }) => {
  const kind = node.kind ?? "junction";
  const status = node.status ?? "ok";
  const color = kindColor(kind);
  const ring = statusColor(status);
  const w = NODE_SIZE.width;
  const h = NODE_SIZE.height;
  const left = node.px - w / 2;
  const top = node.py - h / 2;

  return (
    <g opacity={appear}>
      {status === "fault" ? (
        <rect
          x={left - 7}
          y={top - 7}
          width={w + 14}
          height={h + 14}
          rx={14}
          fill="none"
          stroke={INFO.critical}
          strokeWidth={2}
          opacity={0.55}
        />
      ) : null}
      <rect
        x={left}
        y={top}
        width={w}
        height={h}
        rx={11}
        fill="rgba(4, 16, 25, 0.93)"
        stroke={ring === INFO.accent ? color : ring}
        strokeWidth={INFO_OUTLINE}
      />
      <path
        d={`M ${left + 11} ${top + h - 1} L ${left + 11} ${top + 1}`}
        stroke={color}
        strokeWidth={4}
        opacity={0.65}
      />
      <g transform={`translate(${left + 24} ${node.py})`}>
        <NodeIcon kind={kind} color={color} />
      </g>
      <text
        x={left + 44}
        y={node.value ? node.py - 1 : node.py + 5}
        fill={INFO.text}
        fontFamily={INFO_DISPLAY}
        fontSize={13}
        fontWeight={900}
        letterSpacing={0.5}
      >
        {node.label}
      </text>
      {node.value ? (
        <text
          x={left + 44}
          y={node.py + 17}
          fill={color}
          fontFamily={INFO_MONO}
          fontSize={12}
          letterSpacing={0.4}
        >
          {node.value}
        </text>
      ) : null}
      <circle
        cx={left + w - 13}
        cy={top + 13}
        r={4.5}
        fill={ring}
        opacity={status === "fault" ? 0.55 : 0.9}
      />
    </g>
  );
};

/**
 * Power / water schematic.
 *
 * `nodes` are placed by normalized 0..1 coordinates; `links` connect node ids
 * with an animated flow (`power` = fast pulses, `water` = slow droplets) and
 * can be flagged `fault` to show a broken line, break marks and sparks.
 */
export const Schematics: React.FC<InfographicRenderProps<SchematicsConfig>> = (
  props,
) => {
  const { config } = props;
  const { frame, fps } = useInfoClock(props);
  const uid = useUid("schema");
  const box = resolveInfoBox(config, SCHEMATICS_SIZE);
  const W = box.width;
  const H = box.height;

  const accent = config.accent ?? INFO.accent;
  const showLegend = config.legend !== false;
  const flowSpeed = config.flowSpeed ?? 1;
  const pad = 26;
  const headerH = config.title ? 74 : 18;
  const footerH = showLegend ? 54 : 16;
  const innerTop = headerH + 8;
  const innerH = H - innerTop - footerH;
  const placed: Record<string, PlacedNode> = {};

  config.nodes.forEach((node) => {
    placed[node.id] = {
      ...node,
      px: pad + node.x * (W - pad * 2),
      py: innerTop + node.y * innerH,
    };
  });

  const renderLink = (link: SchematicLink, index: number) => {
    const a = placed[link.from];
    const b = placed[link.to];
    if (!a || !b) return null;
    const points = linkPoints(a, b);
    const path = routePath(points);
    const baseColor = link.fault
      ? INFO.critical
      : link.type === "water"
        ? INFO.water
        : INFO.power;
    const flow = link.type === "water" ? 0.9 : 1.9;
    const speed = flowSpeed * flow;
    const dashOffset = -(frame * speed) % 60;
    const pulseA = sampleRoute(
      points,
      (((frame * speed * 0.011 + index * 0.29) % 1) + 1) % 1,
    );
    const pulseB = sampleRoute(
      points,
      (((frame * speed * 0.011 + index * 0.29 + 0.5) % 1) + 1) % 1,
    );
    const mid = sampleRoute(points, 0.5);
    const flicker = link.fault
      ? 0.45 + 0.45 * Math.abs(Math.sin(frame * 0.42 + index))
      : 1;

    return (
      <g key={`${link.from}-${link.to}-${index}`} opacity={flicker}>
        <path
          d={path}
          fill="none"
          stroke={INFO.deep}
          strokeWidth={8}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.9}
        />
        <path
          d={path}
          fill="none"
          stroke={baseColor}
          strokeWidth={INFO_OUTLINE}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={link.fault ? 0.9 : 0.32}
        />
        <path
          d={path}
          fill="none"
          stroke={baseColor}
          strokeWidth={2.4}
          strokeDasharray={link.fault ? "7 9" : "12 14"}
          strokeDashoffset={dashOffset}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.95}
        />
        {!link.fault ? (
          <g>
            <circle
              cx={pulseA.point.x}
              cy={pulseA.point.y}
              r={link.type === "water" ? 5.5 : 4.5}
              fill={baseColor}
            />
            <circle
              cx={pulseB.point.x}
              cy={pulseB.point.y}
              r={3.2}
              fill={baseColor}
              opacity={0.55}
            />
          </g>
        ) : (
          <g transform={`translate(${mid.point.x} ${mid.point.y})`}>
            <g transform={`rotate(${mid.angle})`}>
              <line
                x1={-11}
                y1={-11}
                x2={11}
                y2={11}
                stroke={INFO.critical}
                strokeWidth={4}
                strokeLinecap="round"
              />
              <line
                x1={-11}
                y1={11}
                x2={11}
                y2={-11}
                stroke={INFO.critical}
                strokeWidth={4}
                strokeLinecap="round"
              />
            </g>
            {Array.from({ length: 5 }, (_, k) => {
              const sx = (rand(config.seed ?? 0, index * 17 + k) - 0.5) * 34;
              const sy =
                (rand((config.seed ?? 0) + 9, index * 17 + k) - 0.5) * 34;
              const on = Math.sin(frame * 0.5 + k * 1.8 + index) > 0;
              return (
                <circle
                  key={`spark${k}`}
                  cx={sx}
                  cy={sy}
                  r={2.2 + rand((config.seed ?? 0) + 3, k) * 2}
                  fill={INFO.warn}
                  opacity={on ? 0.9 : 0.15}
                />
              );
            })}
          </g>
        )}
        {link.label ? (
          <g transform={`translate(${mid.point.x} ${mid.point.y - 20})`}>
            <rect
              x={-46}
              y={-13}
              width={92}
              height={24}
              rx={6}
              fill={INFO.deep}
              stroke={baseColor}
              strokeWidth={1.6}
              opacity={0.92}
            />
            <text
              x={0}
              y={4}
              fill={baseColor}
              fontFamily={INFO_MONO}
              fontSize={11}
              letterSpacing={1}
              textAnchor="middle"
            >
              {link.label}
            </text>
          </g>
        ) : null}
      </g>
    );
  };

  const entry = enterSpring(frame, fps, config.delay ?? 0);

  return (
    <InfoSvg config={config} defaultSize={SCHEMATICS_SIZE}>
      {() => (
        <g>
          <defs>
            <linearGradient id={`${uid}-panel`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(6, 26, 36, 0.94)" />
              <stop offset="100%" stopColor="rgba(3, 12, 20, 0.94)" />
            </linearGradient>
            <pattern
              id={`${uid}-dots`}
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <circle cx={1} cy={1} r={1} fill={accent} opacity={0.1} />
            </pattern>
          </defs>

          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            rx={16}
            fill={`url(#${uid}-panel)`}
            stroke={accent}
            strokeWidth={INFO_OUTLINE}
            opacity={0.97}
          />
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            rx={16}
            fill={`url(#${uid}-dots)`}
          />
          <g stroke={accent} strokeWidth={3} opacity={0.6} fill="none">
            <path d="M 10 34 L 10 10 L 34 10" />
            <path d={`M ${W - 34} 10 L ${W - 10} 10 L ${W - 10} 34`} />
            <path d={`M 10 ${H - 34} L 10 ${H - 10} L 34 ${H - 10}`} />
            <path
              d={`M ${W - 34} ${H - 10} L ${W - 10} ${H - 10} L ${W - 10} ${
                H - 34
              }`}
            />
          </g>

          {config.title ? (
            <g>
              <text
                x={pad + 4}
                y={34}
                fill={INFO.text}
                fontFamily={INFO_DISPLAY}
                fontSize={26}
                fontWeight={900}
                letterSpacing={0.8}
              >
                {config.title}
              </text>
              {config.subtitle ? (
                <text
                  x={pad + 6}
                  y={56}
                  fill={accent}
                  fontFamily={INFO_MONO}
                  fontSize={13}
                  letterSpacing={3}
                  opacity={0.8}
                >
                  {config.subtitle}
                </text>
              ) : null}
              <line
                x1={pad + 4}
                y1={66}
                x2={W - pad}
                y2={66}
                stroke={accent}
                strokeWidth={2}
                opacity={0.24}
              />
            </g>
          ) : null}

          <g>{config.links.map((link, i) => renderLink(link, i))}</g>

          <g>
            {config.nodes.map((node, i) => {
              const placedNode = placed[node.id];
              if (!placedNode) return null;
              return (
                <SchematicNodeCard
                  key={node.id}
                  node={placedNode}
                  appear={Math.min(
                    1,
                    staggerSpring(frame, fps, i, config.delay ?? 0, 4) * 0.6 +
                      0.4,
                  )}
                />
              );
            })}
          </g>

          {showLegend ? (
            <g transform={`translate(${pad + 4} ${H - 28})`}>
              {[
                { color: INFO.power, label: "ЖИВЛЕННЯ" },
                { color: INFO.water, label: "ВОДА" },
                { color: INFO.critical, label: "РОЗРИВ" },
              ].map((entryItem, i) => (
                <g key={entryItem.label} transform={`translate(${i * 148} 0)`}>
                  <line
                    x1={0}
                    y1={0}
                    x2={28}
                    y2={0}
                    stroke={entryItem.color}
                    strokeWidth={3}
                    strokeDasharray={i === 2 ? "7 6" : undefined}
                  />
                  <text
                    x={38}
                    y={5}
                    fill={INFO.dim}
                    fontFamily={INFO_MONO}
                    fontSize={12}
                    letterSpacing={1.6}
                  >
                    {entryItem.label}
                  </text>
                </g>
              ))}
              <text
                x={W - pad * 2 - 4}
                y={5}
                fill={accent}
                fontFamily={INFO_MONO}
                fontSize={11}
                letterSpacing={1.4}
                textAnchor="end"
                opacity={0.6}
              >
                {Math.round(entry * 100)}% · NOMINAL
              </text>
            </g>
          ) : null}
        </g>
      )}
    </InfoSvg>
  );
};

export const schematicsInfographic = {
  id: "schematics",
  name: "Schematics",
  titleUk: "Схема живлення / води",
  description:
    "Power and water schematic: nodes by normalized coordinates, animated flow links and fault / break indication.",
  defaultSize: SCHEMATICS_SIZE,
  usage: ["hud", "plate"],
  Component: Schematics,
} as const satisfies InfographicDefinition<"schematics", SchematicsConfig>;
