import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedRoutes, animatedRoutesInfographic } from "./AnimatedRoutes";
import { Counters, countersInfographic } from "./Counters";
import { InventoryHUD, inventoryInfographic } from "./InventoryHUD";
import { ProceduralMap, proceduralMapInfographic } from "./ProceduralMap";
import {
  ResourceMarkers,
  resourceMarkersInfographic,
} from "./ResourceMarkers";
import { Schematics, schematicsInfographic } from "./Schematics";
import { WarningBanner, warningInfographic } from "./WarningBanner";
import type {
  InfographicConfigMap,
  InfographicDefinition,
  InfographicId,
  InfographicPlacement,
  InfographicProps,
  InfographicSummary,
} from "./types";

/**
 * Infographic & UI Engine registry.
 *
 * Register a new component by adding its definition file next to this one and
 * listing it below - `InfographicId` then picks the key up automatically and
 * `<Infographic id="..." />` starts accepting the new config type.
 */
export const INFOGRAPHICS = {
  procedural_map: proceduralMapInfographic,
  resource_markers: resourceMarkersInfographic,
  counters: countersInfographic,
  schematics: schematicsInfographic,
  inventory: inventoryInfographic,
  warning: warningInfographic,
  animated_routes: animatedRoutesInfographic,
} as const satisfies {
  [K in InfographicId]: InfographicDefinition<K, InfographicConfigMap[K]>;
};

export const INFOGRAPHIC_IDS = Object.keys(INFOGRAPHICS) as InfographicId[];

export const DEFAULT_INFOGRAPHIC: InfographicId = "procedural_map";

export const INFOGRAPHIC_LIST: readonly InfographicSummary[] =
  INFOGRAPHIC_IDS.map((id) => {
    const definition = INFOGRAPHICS[id];
    return {
      id: definition.id,
      name: definition.name,
      titleUk: definition.titleUk,
      description: definition.description,
      defaultSize: definition.defaultSize,
      usage: definition.usage,
    };
  });

export const getInfographic = <K extends InfographicId>(id: K) =>
  INFOGRAPHICS[id];

/**
 * Typed, registry-driven renderer.
 *
 * ```tsx
 * // screen-space HUD over the frame
 * <Infographic
 *   id="warning"
 *   config={{ x: 54, y: 170, level: "danger", title: "ПЕРЕГРІВ ГЕНЕРАТОРА" }}
 * />
 *
 * // inside the map plate - inherits the camera transform
 * <Layer camera={camera} depth={0.45}>
 *   <Infographic id="procedural_map" config={{ seed: 7 }} />
 *   <Infographic id="animated_routes" config={{ routes: [...] }} />
 * </Layer>
 * ```
 */
export const Infographic: React.FC<InfographicProps> = (props) => {
  const current = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { id, config, frame, className, style } = props;
  const definition = INFOGRAPHICS[
    id
  ] as unknown as InfographicDefinition<string, InfographicPlacement>;
  const Component = definition.Component;
  const resolved = {
    ...config,
    ...(className ? { className } : null),
    ...(style ? { style } : null),
  } as unknown as InfographicPlacement;

  return React.createElement(Component, {
    config: resolved,
    frame: frame ?? config.frame ?? current,
    fps,
  });
};

export {
  AnimatedRoutes,
  Counters,
  InventoryHUD,
  ProceduralMap,
  ResourceMarkers,
  Schematics,
  WarningBanner,
};
export {
  animatedRoutesInfographic,
  countersInfographic,
  inventoryInfographic,
  proceduralMapInfographic,
  resourceMarkersInfographic,
  schematicsInfographic,
  warningInfographic,
};
export {
  INFO,
  INFO_DISPLAY,
  INFO_MONO,
  INFO_OUTLINE,
  InfoSvg,
  RESOURCE_COLOR,
  STATUS_COLOR,
  appear,
  enterSpring,
  formatNumber,
  interpolate,
  lerp,
  partialRoute,
  progressIn,
  rand,
  routePath,
  sampleRoute,
  staggerSpring,
  clamp01,
  spring,
  textWidth,
  toPxPoints,
  useInfoClock,
  useUid,
} from "./shared";
export { infoContainerStyle, infoPoint, resolveInfoBox } from "./types";
export type {
  AnimatedRouteSpec,
  AnimatedRoutesConfig,
  CounterItem,
  CounterVariant,
  CountersConfig,
  InfographicConfigMap,
  InfographicDefinition,
  InfographicId,
  InfographicPlacement,
  InfographicPoint,
  InfographicProps,
  InfographicRenderProps,
  InfographicSpace,
  InfographicSummary,
  InventoryConfig,
  InventoryIcon,
  InventorySlot,
  ProceduralMapConfig,
  ProceduralMapRoute,
  ResourceKind,
  ResourceMarker,
  ResourceMarkersConfig,
  ResourceStatus,
  ResolvedInfoBox,
  SchematicLink,
  SchematicNode,
  SchematicNodeKind,
  SchematicStatus,
  SchematicsConfig,
  WarningConfig,
  WarningLevel,
} from "./types";
