import React from "react";
import {
  clamp01,
  INFO,
  INFO_DISPLAY,
  INFO_MONO,
  INFO_OUTLINE,
  InfoSvg,
  staggerSpring,
  useInfoClock,
  useUid,
} from "./shared";
import type {
  InfographicDefinition,
  InfographicRenderProps,
  InventoryConfig,
  InventoryIcon,
  InventorySlot,
} from "./types";
import { resolveInfoBox } from "./types";

const INVENTORY_SIZE = { width: 420, height: 640 } as const;
const ICON_COLOR = "#D8E9E2";

const ItemIcon: React.FC<{ icon: InventoryIcon; color: string }> = ({
  icon,
  color,
}) => {
  switch (icon) {
    case "medkit":
      return (
        <g>
          <rect
            x={-14}
            y={-11}
            width={28}
            height={22}
            rx={5}
            fill="none"
            stroke={color}
            strokeWidth={2.6}
          />
          <path
            d="M -5 -11 L -5 -15 L 5 -15 L 5 -11"
            fill="none"
            stroke={color}
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          <g fill={INFO.med}>
            <rect x={-2.4} y={-6} width={4.8} height={13} rx={1.4} />
            <rect x={-6.5} y={-1.8} width={13} height={4.8} rx={1.4} />
          </g>
        </g>
      );
    case "water":
      return (
        <g>
          <path
            d="M 0 -16 C 7 -6 14 0 14 7 A 14 14 0 0 1 -14 7 C -14 0 -7 -6 0 -16 Z"
            fill={INFO.water}
            opacity={0.9}
          />
          <path
            d="M -5 5 A 6 6 0 0 0 0 12"
            fill="none"
            stroke={INFO.deep}
            strokeWidth={2.4}
            strokeLinecap="round"
            opacity={0.5}
          />
        </g>
      );
    case "fuel":
      return (
        <g>
          <path
            d="M -12 -13 L 4 -13 L 12 -5 L 12 14 L -12 14 Z"
            fill="none"
            stroke={INFO.fuel}
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          <path
            d="M -6 -13 L -6 -4 L 4 -4 L 4 -13"
            fill="none"
            stroke={INFO.fuel}
            strokeWidth={2.4}
          />
          <path
            d="M 12 -2 L 17 -2 L 17 8"
            fill="none"
            stroke={INFO.fuel}
            strokeWidth={2.8}
            strokeLinecap="round"
          />
        </g>
      );
    case "ammo":
      return (
        <g fill={INFO.warn}>
          {[-9, 0, 9].map((x) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <rect x={-3} y={-4} width={6} height={17} rx={2} />
              <path d="M -3 -4 L 0 -15 L 3 -4 Z" />
            </g>
          ))}
        </g>
      );
    case "radio":
      return (
        <g>
          <rect
            x={-13}
            y={-8}
            width={26}
            height={22}
            rx={4}
            fill="none"
            stroke={color}
            strokeWidth={2.6}
          />
          <line
            x1={-9}
            y1={-8}
            x2={-14}
            y2={-19}
            stroke={color}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          <rect x={2} y={-3} width={8} height={6} rx={1.4} fill={INFO.accent} />
          <g stroke={INFO.accent} strokeWidth={2} fill="none" opacity={0.7}>
            <path d="M -9 2 A 4 4 0 0 1 -9 9" />
            <path d="M -12 0 A 8 8 0 0 1 -12 12" />
          </g>
        </g>
      );
    case "battery":
      return (
        <g>
          <rect
            x={-13}
            y={-9}
            width={26}
            height={19}
            rx={4}
            fill="none"
            stroke={color}
            strokeWidth={2.6}
          />
          <rect x={-4} y={-13} width={8} height={4} rx={1.4} fill={color} />
          <g fill={INFO.accent}>
            <rect x={-8} y={-4} width={5} height={9} rx={1} />
            <rect x={-1} y={-4} width={5} height={9} rx={1} />
            <rect x={6} y={-4} width={4} height={9} rx={1} opacity={0.3} />
          </g>
        </g>
      );
    case "key":
      return (
        <g
          fill="none"
          stroke={INFO.warn}
          strokeWidth={2.8}
          strokeLinecap="round"
        >
          <circle cx={-7} cy={-7} r={6.5} />
          <path d="M -2 -2 L 12 12" />
          <path d="M 6 6 L 10 2" />
          <path d="M 10 10 L 14 6" />
        </g>
      );
    case "tool":
      return (
        <g>
          <path
            d="M -12 -11 A 6 6 0 0 0 -4 -3 L 10 11 L 13 8 L -1 -6 A 6 6 0 0 0 5 -14 Z"
            fill="none"
            stroke={color}
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          <circle cx={-9} cy={-9} r={2} fill={INFO.deep} />
        </g>
      );
    case "food":
      return (
        <g>
          <rect
            x={-11}
            y={-9}
            width={22}
            height={22}
            rx={3}
            fill="none"
            stroke={color}
            strokeWidth={2.6}
          />
          <ellipse
            cx={0}
            cy={-9}
            rx={11}
            ry={4}
            fill="none"
            stroke={color}
            strokeWidth={2.2}
          />
          <line
            x1={-11}
            y1={3}
            x2={11}
            y2={3}
            stroke={color}
            strokeWidth={2}
            opacity={0.6}
          />
        </g>
      );
    case "map":
      return (
        <g
          fill="none"
          stroke={INFO.accent}
          strokeWidth={2.4}
          strokeLinejoin="round"
        >
          <path d="M -14 -10 L -5 -14 L 4 -10 L 14 -14 L 14 11 L 4 15 L -5 11 L -14 15 Z" />
          <path d="M -5 -14 L -5 11 M 4 -10 L 4 15" />
          <path d="M -9 0 L -2 5 L 8 -4" stroke={INFO.warn} strokeWidth={2} />
        </g>
      );
    case "mask":
      return (
        <g>
          <circle
            cx={0}
            cy={-2}
            r={12}
            fill="none"
            stroke={color}
            strokeWidth={2.6}
          />
          <circle cx={-12} cy={7} r={4.5} fill="none" stroke={color} strokeWidth={2.2} />
          <circle cx={12} cy={7} r={4.5} fill="none" stroke={color} strokeWidth={2.2} />
          <g fill={INFO.accent} opacity={0.85}>
            <circle cx={-4} cy={-4} r={2.2} />
            <circle cx={4} cy={-4} r={2.2} />
          </g>
        </g>
      );
    case "flare":
      return (
        <g>
          <rect
            x={-4}
            y={-2}
            width={8}
            height={18}
            rx={2.5}
            fill="none"
            stroke={color}
            strokeWidth={2.4}
          />
          <path
            d="M 0 -14 C 7 -7 5 -3 0 -3 C -5 -3 -7 -7 0 -14 Z"
            fill={INFO.danger}
          />
          <path d="M 0 -3 L 0 2" stroke={INFO.warn} strokeWidth={2} />
        </g>
      );
    default:
      return (
        <rect
          x={-11}
          y={-11}
          width={22}
          height={22}
          rx={4}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
        />
      );
  }
};

const SlotCard: React.FC<{
  slot: InventorySlot;
  x: number;
  y: number;
  width: number;
  height: number;
  frame: number;
  appear: number;
}> = ({ slot, x, y, width, height, frame, appear }) => {
  const active = slot.active === true;
  const pulse = 0.55 + 0.45 * Math.sin(frame * 0.13);
  const iconScale = Math.max(0.55, Math.min(1.35, height / 150));
  const nameY = y + height - (slot.durability !== undefined ? 26 : 15);

  return (
    <g opacity={appear}>
      {active ? (
        <rect
          x={x - 5}
          y={y - 5}
          width={width + 10}
          height={height + 10}
          rx={16}
          fill="none"
          stroke={INFO.accent}
          strokeWidth={2}
          opacity={0.25 + 0.35 * pulse}
        />
      ) : null}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={12}
        fill={active ? "rgba(19, 48, 43, 0.94)" : "rgba(5, 20, 28, 0.9)"}
        stroke={active ? INFO.accent : "#31505C"}
        strokeWidth={active ? INFO_OUTLINE : 1.6}
      />
      {active ? (
        <g>
          <rect
            x={x + 8}
            y={y + 8}
            width={42}
            height={18}
            rx={4}
            fill={INFO.accent}
          />
          <text
            x={x + 29}
            y={y + 21}
            fill={INFO.deep}
            fontFamily={INFO_MONO}
            fontSize={10}
            fontWeight={700}
            letterSpacing={1.2}
            textAnchor="middle"
          >
            АКТ
          </text>
        </g>
      ) : null}
      <g
        transform={`translate(${x + width / 2} ${y + height * 0.4}) scale(${iconScale})`}
      >
        <ItemIcon
          icon={slot.icon}
          color={active ? INFO.accent : ICON_COLOR}
        />
      </g>
      <text
        x={x + 12}
        y={nameY}
        fill={active ? INFO.text : "#C4D8D1"}
        fontFamily={INFO_DISPLAY}
        fontSize={Math.max(10, Math.min(13, (width - 64) / 5.5))}
        fontWeight={900}
        letterSpacing={0.2}
      >
        {slot.name}
      </text>
      <g transform={`translate(${x + width - 20} ${y + height - 20})`}>
        <rect
          x={-20}
          y={-12}
          width={40}
          height={24}
          rx={7}
          fill="rgba(2, 9, 14, 0.92)"
          stroke={active ? INFO.accent : "#3A5A66"}
          strokeWidth={1.6}
        />
        <text
          x={0}
          y={5}
          fill={active ? INFO.accent : INFO.text}
          fontFamily={INFO_MONO}
          fontSize={13}
          fontWeight={700}
          textAnchor="middle"
        >
          ×{slot.qty}
        </text>
      </g>
      {slot.durability !== undefined ? (
        <g>
          <rect
            x={x + 12}
            y={y + height - 12}
            width={width - 24}
            height={4}
            rx={2}
            fill="#23333C"
          />
          <rect
            x={x + 12}
            y={y + height - 12}
            width={(width - 24) * clamp01(slot.durability)}
            height={4}
            rx={2}
            fill={slot.durability < 0.35 ? INFO.critical : INFO.accent}
          />
        </g>
      ) : null}
    </g>
  );
};

/**
 * Character inventory panel.
 *
 * Slots carry a vector icon, a quantity and an `active` highlight; the panel
 * springs in per-slot. Designed for a screen-space HUD corner, but works just
 * as well on a map/plate layer.
 */
export const InventoryHUD: React.FC<
  InfographicRenderProps<InventoryConfig>
> = (props) => {
  const { config } = props;
  const { frame, fps } = useInfoClock(props);
  const uid = useUid("inv");
  const box = resolveInfoBox(config, INVENTORY_SIZE);
  const W = box.width;
  const H = box.height;

  const accent = config.accent ?? INFO.accent;
  const compact = config.compact === true;
  const showHints = config.showHints === true;
  const pad = compact ? 14 : 20;
  const columns = Math.max(
    1,
    Math.min(config.columns ?? 2, Math.max(1, config.slots.length)),
  );
  const rows = Math.max(1, Math.ceil(config.slots.length / columns));
  const headerH = compact ? 58 : 76;
  const gridX = pad;
  const gridY = pad + headerH;
  const gridW = W - pad * 2;
  const gridH = H - gridY - pad;
  const gap = compact ? 8 : 10;
  const cellW = (gridW - gap * (columns - 1)) / columns;
  const cellH = (gridH - gap * (rows - 1)) / rows;
  const active = config.slots.find((slot) => slot.active === true);
  const subtitle = showHints && active?.hint ? active.hint : active?.name;

  return (
    <InfoSvg config={config} defaultSize={INVENTORY_SIZE}>
      {() => (
        <g>
          <defs>
            <linearGradient id={`${uid}-panel`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(6, 26, 36, 0.94)" />
              <stop offset="100%" stopColor="rgba(3, 12, 20, 0.94)" />
            </linearGradient>
            <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity={0} />
              <stop offset="50%" stopColor={accent} stopOpacity={0.08} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
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
          />
          <rect
            x={((frame * 4) % (W + 200)) - 100}
            y={0}
            width={100}
            height={H}
            fill={`url(#${uid}-sheen)`}
          />
          <g stroke={accent} strokeWidth={3} opacity={0.65} fill="none">
            <path d="M 10 32 L 10 10 L 32 10" />
            <path d={`M ${W - 32} 10 L ${W - 10} 10 L ${W - 10} 32`} />
            <path d={`M 10 ${H - 32} L 10 ${H - 10} L 32 ${H - 10}`} />
            <path
              d={`M ${W - 32} ${H - 10} L ${W - 10} ${H - 10} L ${W - 10} ${
                H - 32
              }`}
            />
          </g>

          <g>
            <text
              x={pad + 4}
              y={pad + 26}
              fill={INFO.text}
              fontFamily={INFO_DISPLAY}
              fontSize={compact ? 22 : 27}
              fontWeight={900}
              letterSpacing={0.8}
            >
              {config.title ?? "ІНВЕНТАР"}
            </text>
            {config.owner || subtitle ? (
              <text
                x={pad + 5}
                y={pad + (compact ? 44 : 48)}
                fill={accent}
                fontFamily={INFO_MONO}
                fontSize={compact ? 11 : 12}
                letterSpacing={2.2}
                opacity={0.85}
              >
                {config.owner ? config.owner.toUpperCase() : "СКЛАД"}
                {subtitle ? ` · ${subtitle.toUpperCase()}` : ""}
              </text>
            ) : null}
            <line
              x1={pad + 4}
              y1={pad + headerH - 8}
              x2={W - pad}
              y2={pad + headerH - 8}
              stroke={accent}
              strokeWidth={2}
              opacity={0.25}
            />
          </g>

          {config.slots.map((slot, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const show = staggerSpring(frame, fps, i, config.delay ?? 0, 4);
            return (
              <SlotCard
                key={`${slot.name}-${i}`}
                slot={slot}
                x={gridX + col * (cellW + gap)}
                y={gridY + row * (cellH + gap)}
                width={cellW}
                height={cellH}
                frame={frame}
                appear={Math.min(1, 0.35 + show * 0.65)}
              />
            );
          })}

          <text
            x={W / 2}
            y={H - 8}
            fill={accent}
            fontFamily={INFO_MONO}
            fontSize={9}
            letterSpacing={3}
            textAnchor="middle"
            opacity={0.3}
          >
            FIELD KIT · {config.slots.length} SLOTS
          </text>
        </g>
      )}
    </InfoSvg>
  );
};

export const inventoryInfographic = {
  id: "inventory",
  name: "Inventory HUD",
  titleUk: "Панель інвентарю",
  description:
    "Character inventory grid: vector icons, quantities, active-slot highlight and durability bars.",
  defaultSize: INVENTORY_SIZE,
  usage: ["hud", "plate"],
  Component: InventoryHUD,
} as const satisfies InfographicDefinition<"inventory", InventoryConfig>;
