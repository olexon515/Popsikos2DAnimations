import React from "react";
import {
  formatNumber,
  INFO,
  INFO_MONO,
  INFO_OUTLINE,
  InfoSvg,
  INFO_DISPLAY,
  RESOURCE_COLOR,
  STATUS_COLOR,
  staggerSpring,
  textWidth,
  useInfoClock,
  useUid,
} from "./shared";
import type {
  InfographicDefinition,
  InfographicRenderProps,
  ResourceKind,
  ResourceMarker,
  ResourceMarkersConfig,
  ResourceStatus,
} from "./types";
import { resolveInfoBox } from "./types";

const MARKERS_SIZE = { width: 1080, height: 1920 } as const;

const LEGEND: ReadonlyArray<{ type: ResourceKind; label: string }> = [
  { type: "water", label: "ВОДА" },
  { type: "fuel", label: "ПАЛИВО" },
  { type: "power", label: "ЖИВЛЕННЯ" },
  { type: "med", label: "МЕДИЦИНА" },
  { type: "radiation", label: "РАДІАЦІЯ" },
];

const STATUS_LABEL: Record<ResourceStatus, string> = {
  ok: "НОРМА",
  low: "НИЗЬКО",
  critical: "КРИТИЧНО",
};

/** Vector glyph for a resource type, drawn around (0, 0), roughly 26 px tall. */
const ResourceIcon: React.FC<{ type: ResourceKind; color: string }> = ({
  type,
  color,
}) => {
  switch (type) {
    case "water":
      return (
        <g>
          <path
            d="M 0 -13 C 6 -5 11 0 11 6 A 11 11 0 0 1 -11 6 C -11 0 -6 -5 0 -13 Z"
            fill={color}
          />
          <path
            d="M -4 4 A 5 5 0 0 0 0 10"
            fill="none"
            stroke={INFO.deep}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.55}
          />
        </g>
      );
    case "fuel":
      return (
        <g>
          <path
            d="M -9 -10 L 3 -10 L 9 -4 L 9 11 L -9 11 Z"
            fill={color}
            stroke={INFO.deep}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <path
            d="M -4 -10 L -4 -3 L 3 -3 L 3 -10"
            fill="none"
            stroke={INFO.deep}
            strokeWidth={2}
          />
          <path
            d="M 9 -2 L 13 -2 L 13 6"
            fill="none"
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        </g>
      );
    case "power":
      return (
        <path
          d="M 2 -14 L -9 2 L -1 2 L -3 14 L 9 -2 L 1 -2 Z"
          fill={color}
          stroke={INFO.deep}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      );
    case "med":
      return (
        <g fill={color}>
          <rect x={-4} y={-12} width={8} height={24} rx={2} />
          <rect x={-12} y={-4} width={24} height={8} rx={2} />
        </g>
      );
    case "radiation":
      return (
        <g>
          <g fill={color}>
            <path d="M 0 0 L -4 -13 A 13.5 13.5 0 0 1 10 -8 Z" />
            <path
              d="M 0 0 L -4 -13 A 13.5 13.5 0 0 1 10 -8 Z"
              transform="rotate(120)"
            />
            <path
              d="M 0 0 L -4 -13 A 13.5 13.5 0 0 1 10 -8 Z"
              transform="rotate(240)"
            />
          </g>
          <circle cx={0} cy={0} r={4.2} fill={INFO.deep} />
        </g>
      );
    default:
      return null;
  }
};

const MarkerLabel: React.FC<{
  marker: ResourceMarker;
  x: number;
  y: number;
  width: number;
  color: string;
  status: ResourceStatus;
  showValue: boolean;
  appear: number;
}> = ({ marker, x, y, width, color, status, showValue, appear }) => {
  const statusColor = STATUS_COLOR[status] ?? INFO.accent;
  const valueText =
    marker.value === undefined
      ? undefined
      : `${formatNumber(marker.value)}${marker.unit ? ` ${marker.unit}` : ""}`;
  const flip = x > width * 0.58;
  const plateW = Math.max(
    168,
    textWidth(marker.label, 19, 1.4) + 40,
    valueText ? textWidth(valueText, 17, 0.6) + 40 : 0,
  );
  const plateH = valueText ? 64 : 46;
  const plateX = flip ? x - 44 - plateW : x + 44;
  const plateY = y - plateH / 2;
  const anchorX = flip ? plateX + plateW : plateX;

  return (
    <g opacity={appear}>
      <line
        x1={x}
        y1={y}
        x2={anchorX}
        y2={plateY + plateH / 2}
        stroke={color}
        strokeWidth={2}
        opacity={0.6}
      />
      <circle cx={anchorX} cy={plateY + plateH / 2} r={3} fill={color} />
      <g>
        <rect
          x={plateX}
          y={plateY}
          width={plateW}
          height={plateH}
          rx={10}
          fill="rgba(4, 16, 25, 0.86)"
          stroke={color}
          strokeWidth={INFO_OUTLINE}
        />
        <rect
          x={plateX}
          y={plateY}
          width={7}
          height={plateH}
          rx={3}
          fill={statusColor}
        />
        <text
          x={plateX + 22}
          y={plateY + 27}
          fill={INFO.text}
          fontFamily={INFO_DISPLAY}
          fontSize={19}
          fontWeight={900}
          letterSpacing={1.2}
        >
          {marker.label}
        </text>
        {valueText && showValue ? (
          <text
            x={plateX + 22}
            y={plateY + 52}
            fill={statusColor}
            fontFamily={INFO_MONO}
            fontSize={17}
            letterSpacing={0.6}
          >
            {valueText}
            <tspan fill={INFO.dim} fontSize={13} letterSpacing={1.6}>
              {"  "}
              {STATUS_LABEL[status]}
            </tspan>
          </text>
        ) : null}
      </g>
    </g>
  );
};

/**
 * Resource marker array (`water | fuel | power | med | radiation`).
 *
 * Each marker carries normalized `{x, y}`, a reading (`value` + `unit`), a
 * Ukrainian label and a status (`ok | low | critical`) that drives the ring,
 * the plate stripe and the pulse.
 */
export const ResourceMarkers: React.FC<
  InfographicRenderProps<ResourceMarkersConfig>
> = (props) => {
  const { config } = props;
  const { frame, fps } = useInfoClock(props);
  const uid = useUid("rmark");
  const box = resolveInfoBox(config, MARKERS_SIZE);
  const W = box.width;
  const H = box.height;

  const accent = config.accent ?? INFO.accent;
  const pulseSpeed = config.pulseSpeed ?? 0.12;
  const markerScale = config.markerScale ?? 1;
  const showValues = config.showValues !== false;
  const showLegend = config.showLegend === true;

  return (
    <InfoSvg config={config} defaultSize={MARKERS_SIZE}>
      {() => (
        <g>
          <defs>
            <radialGradient id={`${uid}-ping`}>
              <stop offset="0%" stopColor={accent} stopOpacity={0} />
              <stop offset="70%" stopColor={accent} stopOpacity={0.1} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </radialGradient>
          </defs>

          {config.title ? (
            <g>
              <text
                x={54}
                y={284}
                fill={INFO.text}
                fontFamily={INFO_DISPLAY}
                fontSize={40}
                fontWeight={900}
                letterSpacing={1}
              >
                {config.title}
              </text>
              {config.subtitle ? (
                <text
                  x={56}
                  y={318}
                  fill={accent}
                  fontFamily={INFO_MONO}
                  fontSize={17}
                  letterSpacing={4}
                  opacity={0.8}
                >
                  {config.subtitle}
                </text>
              ) : null}
            </g>
          ) : null}

          {config.markers.map((marker, i) => {
            const x = marker.x * W;
            const y = marker.y * H;
            const type = marker.type;
            const status = marker.status ?? "ok";
            const color = RESOURCE_COLOR[type] ?? accent;
            const statusColor = STATUS_COLOR[status] ?? accent;
            const entry = staggerSpring(frame, fps, i, config.delay ?? 0, 5);
            const ringPhase = ((frame * pulseSpeed + i * 0.37) % 1 + 1) % 1;
            const ringR = (46 + ringPhase * 38) * markerScale;
            const pulse = 0.6 + 0.4 * Math.sin(frame * 0.11 + i * 1.3);
            const r = 29 * markerScale;

            return (
              <g key={`${marker.label}-${i}`}>
                <g opacity={Math.min(1, entry)}>
                  <circle
                    cx={x}
                    cy={y}
                    r={ringR}
                    fill="none"
                    stroke={statusColor}
                    strokeWidth={2}
                    opacity={(1 - ringPhase) * 0.5}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 14 * markerScale}
                    fill={statusColor}
                    opacity={0.08 * pulse}
                  />
                  {status === "critical" ? (
                    <circle
                      cx={x}
                      cy={y}
                      r={r + 10 * markerScale}
                      fill="none"
                      stroke={statusColor}
                      strokeWidth={2}
                      strokeDasharray="5 7"
                      transform={`rotate(${(frame * 1.4) % 360} ${x} ${y})`}
                      opacity={0.75}
                    />
                  ) : null}
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill="rgba(4, 16, 25, 0.9)"
                    stroke={statusColor}
                    strokeWidth={INFO_OUTLINE}
                  />
                  <g transform={`translate(${x} ${y}) scale(${0.74 * markerScale})`}>
                    <ResourceIcon type={type} color={color} />
                  </g>
                  <circle
                    cx={x - r * 0.62}
                    cy={y - r * 0.62}
                    r={5 * markerScale}
                    fill={statusColor}
                    stroke={INFO.deep}
                    strokeWidth={2}
                  />
                </g>
                <MarkerLabel
                  marker={marker}
                  x={x}
                  y={y}
                  width={W}
                  color={color}
                  status={status}
                  showValue={showValues}
                  appear={Math.min(1, entry)}
                />
              </g>
            );
          })}

          {showLegend ? (
            <g transform={`translate(54 ${H - 236})`}>
              {LEGEND.map((entry, i) => (
                <g key={entry.type} transform={`translate(${i * 184} 0)`}>
                  <rect
                    x={0}
                    y={0}
                    width={172}
                    height={44}
                    rx={9}
                    fill="rgba(4, 16, 25, 0.78)"
                    stroke={RESOURCE_COLOR[entry.type]}
                    strokeWidth={2}
                    opacity={0.9}
                  />
                  <g transform={`translate(26 22) scale(0.62)`}>
                    <ResourceIcon
                      type={entry.type}
                      color={RESOURCE_COLOR[entry.type]}
                    />
                  </g>
                  <text
                    x={46}
                    y={27}
                    fill={INFO.text}
                    fontFamily={INFO_MONO}
                    fontSize={13}
                    letterSpacing={1.6}
                    opacity={0.85}
                  >
                    {entry.label}
                  </text>
                </g>
              ))}
            </g>
          ) : null}
        </g>
      )}
    </InfoSvg>
  );
};

export const resourceMarkersInfographic = {
  id: "resource_markers",
  name: "Resource markers",
  titleUk: "Маркери ресурсів",
  description:
    "Array of water / fuel / power / med / radiation markers with values, labels and ok / low / critical status.",
  defaultSize: MARKERS_SIZE,
  usage: ["hud", "plate"],
  Component: ResourceMarkers,
} as const satisfies InfographicDefinition<
  "resource_markers",
  ResourceMarkersConfig
>;
