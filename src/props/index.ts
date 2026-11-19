import React from "react";
import { Door, doorProp } from "./door";
import { Faucet, faucetProp } from "./faucet";
import { Generator, generatorProp } from "./generator";
import { Notebook, notebookProp } from "./notebook";
import { Phone, phoneProp } from "./phone";
import { Pump, pumpProp } from "./pump";
import { Radio, radioProp } from "./radio";
import { Tanks, tanksProp } from "./tanks";
import { Tools, toolsProp } from "./tools";
import {
  propContainerStyle,
  propScenePoint,
  resolvePropFocus,
  type PropDefinition,
  type PropLayout,
  type PropPoint,
  type PropState,
  type PropSummary,
} from "./types";

/**
 * Interactive Prop Engine registry.
 *
 * Register a new prop by adding its definition file next to this one and
 * listing it below - `PropId` then picks the new key up automatically.
 */
export const PROPS = {
  phone: phoneProp,
  generator: generatorProp,
  radio: radioProp,
  faucet: faucetProp,
  pump: pumpProp,
  tanks: tanksProp,
  door: doorProp,
  notebook: notebookProp,
  tools: toolsProp,
} as const;

export type PropId = keyof typeof PROPS;

export const PROP_IDS = Object.keys(PROPS) as PropId[];

export const PROP_LIST: readonly PropSummary[] = PROP_IDS.map((id) => {
  const definition = PROPS[id];
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    states: definition.states,
    defaultState: definition.defaultState,
    size: definition.size,
  };
});

export const getProp = (id: PropId) => PROPS[id];

/** Minimal placement needed to resolve an interaction point. */
export type PropPlacement = {
  x: number;
  y: number;
  scale?: number;
  state?: string;
  eventProgress?: number;
  seed?: number;
};

/** Same as `resolvePropFocus`, but looks the definition up by registry id. */
export const getPropInteractionPoint = (
  id: PropId,
  placement: PropPlacement,
): PropPoint => {
  const definition = PROPS[id] as unknown as PropDefinition<PropState>;
  const state =
    placement.state && definition.states.indexOf(placement.state) >= 0
      ? placement.state
      : definition.defaultState;
  const layout: PropLayout<PropState> = {
    x: placement.x,
    y: placement.y,
    scale: placement.scale ?? 1,
    state,
    eventProgress: placement.eventProgress ?? 0,
    seed: placement.seed ?? 0,
  };
  return resolvePropFocus(definition, layout);
};

/** Declarative props of the registry-driven `<Prop />` wrapper. */
export type PropComponentProps = {
  id: PropId;
  x: number;
  y: number;
  scale?: number;
  /** Optional state id; invalid values fall back to the prop's default. */
  state?: string;
  eventProgress?: number;
  seed?: number;
  frame?: number;
  style?: React.CSSProperties;
  className?: string;
};

/**
 * Registry-driven renderer - handy when the prop id comes from data:
 *
 * ```tsx
 * <Prop id="generator" x={540} y={1660} scale={1.4} state="sparking" eventProgress={0.8} />
 * ```
 */
export const Prop: React.FC<PropComponentProps> = ({
  id,
  x,
  y,
  scale = 1,
  state,
  eventProgress = 0,
  seed = 0,
  frame,
  style,
  className,
}) => {
  const definition = PROPS[id] as unknown as PropDefinition<PropState>;
  const resolvedState =
    state && definition.states.indexOf(state) >= 0 ? state : definition.defaultState;
  const Component = definition.Component;
  return React.createElement(Component, {
    x,
    y,
    scale,
    state: resolvedState,
    eventProgress,
    seed,
    frame,
    style,
    className,
  });
};

export { Door, Faucet, Generator, Notebook, Phone, Pump, Radio, Tanks, Tools };
export {
  doorProp,
  faucetProp,
  generatorProp,
  notebookProp,
  phoneProp,
  pumpProp,
  radioProp,
  tanksProp,
  toolsProp,
};
export {
  propContainerStyle,
  propScenePoint,
  resolvePropFocus,
};
export type {
  PropDefinition,
  PropFocus,
  PropLayout,
  PropPoint,
  PropProps,
  PropState,
  PropSummary,
} from "./types";
