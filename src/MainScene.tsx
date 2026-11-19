import React from "react";
import {
  AbsoluteFill,
  Audio,
  Loop,
  Sequence,
  interpolate,
  staticFile,
} from "remotion";
import { Camera, Layer } from "./Camera";
import { Character, MouthType } from "./Character";
import { characterProps } from "./characters";
import { DIALOGUE, HAS_DIALOGUE, isSpeaking, voiceAmplitude } from "./dialogueTimeline";
import { DURATION, HEIGHT, PALETTE, WIDTH } from "./palette";
import {
  CinematicShot,
  ShotType,
  TopDownPlate,
} from "./ShotEngine";
import { DynamicCaption, HookTitle } from "./TextOverlays";
import { DEFAULT_LOCATION, LocationId, getLocation } from "./locations";
import { Prop, getPropInteractionPoint } from "./props";
import { Infographic } from "./infographics";
import type {
  AnimatedRoutesConfig,
  CountersConfig,
  InventoryConfig,
  ProceduralMapConfig,
  ResourceMarkersConfig,
  SchematicsConfig,
  WarningConfig,
} from "./infographics";

/* ------------------------------------------------------------------ */
/* Timeline: eight shots, one per cinematic preset                     */
/* ------------------------------------------------------------------ */

type ShotSpec = { type: ShotType; name: string };

const SHOTS: readonly ShotSpec[] = [
  { type: "wide", name: "01 Wide - the street" },
  { type: "medium", name: "02 Medium - dialogue" },
  { type: "closeup", name: "03 Close-up - Char 1" },
  { type: "extreme-closeup", name: "04 Extreme - the eyes" },
  { type: "top-down", name: "05 Top-down - heads" },
  { type: "pov", name: "06 POV - first person" },
  { type: "object-focus", name: "07 Object - road sign" },
  { type: "map", name: "08 Tactical map" },
] as const;

const SHOT_COUNT = SHOTS.length;
const SHOT_LEN = Math.max(1, Math.round(DURATION / SHOT_COUNT));

const shotStart = (index: number): number =>
  Math.min(DURATION - 1, index * SHOT_LEN);

const shotFrames = (index: number): number => {
  const start = shotStart(index);
  const end = index === SHOT_COUNT - 1 ? DURATION : Math.min(DURATION, (index + 1) * SHOT_LEN);
  return Math.max(1, end - start);
};

const shotEnd = (index: number): number => shotStart(index) + shotFrames(index);

const WIND_LOOP_FRAMES = 360;

/* ------------------------------------------------------------------ */
/* Interactive prop placements                                         */
/* The same placement is used by <Prop /> and by getPropInteractionPoint */
/* so a character's lookAt or an object-focus target stays glued to it. */
/* ------------------------------------------------------------------ */

const PHONE_SPOT = {
  x: 1002,
  y: 1724,
  scale: 0.6,
  state: "ringing",
  eventProgress: 0.75,
  seed: 23,
} as const;
const PHONE_FOCUS = getPropInteractionPoint("phone", PHONE_SPOT);

const NOTEBOOK_SPOT = {
  x: 545,
  y: 1698,
  scale: 0.7,
  state: "open",
  eventProgress: 0,
  seed: 19,
} as const;
const NOTEBOOK_FOCUS = getPropInteractionPoint("notebook", NOTEBOOK_SPOT);

const TANKS_SPOT = {
  x: 66,
  y: 1700,
  scale: 0.72,
  state: "leaking",
  eventProgress: 0.6,
  seed: 7,
} as const;

const PUMP_SPOT = {
  x: 170,
  y: 1640,
  scale: 0.72,
  state: "pumping",
  eventProgress: 0.7,
  seed: 13,
} as const;

const RADIO_SPOT = {
  x: 930,
  y: 1600,
  scale: 0.78,
  state: "static",
  eventProgress: 0.5,
  seed: 11,
} as const;

const GENERATOR_SPOT = {
  x: 540,
  y: 1660,
  scale: 1.45,
  state: "sparking",
  eventProgress: 0.8,
  seed: 41,
} as const;
const GENERATOR_FOCUS = getPropInteractionPoint("generator", GENERATOR_SPOT);

const TOOLS_SPOT = {
  x: 900,
  y: 1640,
  scale: 0.64,
  state: "sparks",
  eventProgress: 0.9,
  seed: 31,
} as const;

const FAUCET_SPOT = {
  x: 842,
  y: 1746,
  scale: 0.9,
  state: "dripping",
  eventProgress: 0.7,
  seed: 17,
} as const;

const DOOR_SPOT = {
  x: 216,
  y: 1810,
  scale: 0.82,
  state: "banging",
  eventProgress: 0.8,
  seed: 29,
} as const;

/* ------------------------------------------------------------------ */
/* Infographic & UI Engine demo configs                                */
/* Screen-space HUD -> mounted after <World>; plate -> mounted inside  */
/* <Layer camera depth>. Every config is typed by the registry.        */
/* ------------------------------------------------------------------ */

const ALEX_INVENTORY: InventoryConfig = {
  x: 700,
  y: 88,
  width: 346,
  height: 600,
  title: "ІНВЕНТАР",
  owner: "ALEX",
  columns: 2,
  compact: true,
  showHints: true,
  delay: 6,
  slots: [
    {
      name: "АПТЕЧКА",
      icon: "medkit",
      qty: 2,
      active: true,
      hint: "АКТИВНИЙ СЛОТ",
      durability: 0.82,
    },
    { name: "ВОДА", icon: "water", qty: 4 },
    { name: "ПАЛИВО", icon: "fuel", qty: 1, durability: 0.35 },
    { name: "НАБОЇ", icon: "ammo", qty: 24 },
    { name: "РАЦІЯ", icon: "radio", qty: 1 },
    { name: "БАТАРЕЯ", icon: "battery", qty: 3, durability: 0.6 },
  ],
};

const RESOURCE_METERS: CountersConfig = {
  x: 560,
  y: 120,
  width: 466,
  height: 470,
  title: "РЕСУРСИ ГРУПИ",
  startFrame: 12,
  stagger: 6,
  duration: 52,
  items: [
    {
      label: "ВОДА",
      from: 0,
      to: 62,
      unit: "%",
      variant: "digital",
      max: 100,
      color: "#5AC8FF",
    },
    {
      label: "ПАЛИВО",
      from: 0,
      to: 18,
      unit: "%",
      variant: "bar",
      max: 100,
      color: "#FFB01F",
      critical: true,
    },
    {
      label: "ЖИВЛЕННЯ",
      from: 0,
      to: 72,
      unit: "%",
      variant: "radial",
      max: 100,
      color: "#FFE066",
    },
  ],
};

const WARNING_OVERHEAT: WarningConfig = {
  x: 54,
  y: 170,
  width: 972,
  height: 176,
  level: "danger",
  title: "ПЕРЕГРІВ ГЕНЕРАТОРА",
  subtitle: "ТИСК 4.8 БАР · РОЗРИВ ЛІНІЇ 02",
  code: "ALERT-07",
  delay: 8,
};

const POWER_SCHEMATICS: SchematicsConfig = {
  x: 54,
  y: 380,
  width: 620,
  height: 430,
  seed: 41,
  title: "СХЕМА ЖИВЛЕННЯ",
  subtitle: "ГЕНЕРАТОР · НАСОС · РЕЗЕРВУАР",
  flowSpeed: 1,
  nodes: [
    {
      id: "gen",
      label: "ГЕНЕРАТОР",
      kind: "generator",
      x: 0.11,
      y: 0.2,
      value: "3.2 кВт",
    },
    {
      id: "shield",
      label: "ЩИТ",
      kind: "junction",
      x: 0.42,
      y: 0.2,
      value: "220 В",
    },
    {
      id: "pump",
      label: "НАСОС",
      kind: "pump",
      x: 0.78,
      y: 0.2,
      value: "4.8 бар",
      status: "fault",
    },
    {
      id: "tank",
      label: "РЕЗЕРВУАР",
      kind: "tank",
      x: 0.78,
      y: 0.72,
      value: "62 %",
    },
    {
      id: "light",
      label: "СВІТЛО",
      kind: "load",
      x: 0.18,
      y: 0.72,
      value: "OFF",
      status: "off",
    },
  ],
  links: [
    { from: "gen", to: "shield", type: "power" },
    { from: "shield", to: "pump", type: "power", fault: true, label: "ЛІНІЯ 02" },
    { from: "pump", to: "tank", type: "water" },
    { from: "shield", to: "light", type: "power" },
  ],
};

const MAP_PLATE: ProceduralMapConfig = {
  seed: 7,
  x: 0,
  y: 0,
  width: 1080,
  height: 1920,
  title: "СЕКТОР 07",
  subtitle: "ТАКТИЧНА КАРТА · ЖИВА МЕРЕЖА",
  grid: 90,
  blocks: 16,
  zones: 4,
  scan: "radar",
  radarSpeed: 1.4,
  labels: ["ПІВНІЧНИЙ КВАРТАЛ", "СТАРИЙ ЗАВОД", "РІЧКОВИЙ ПОРТ"],
  routes: [
    {
      points: [
        { x: 0.1, y: 0.82 },
        { x: 0.26, y: 0.7 },
        { x: 0.38, y: 0.56 },
        { x: 0.52, y: 0.47 },
      ],
      color: "#5BE7A9",
      label: "КОРИДОР",
    },
  ],
};

const MAP_ROUTES: AnimatedRoutesConfig = {
  x: 0,
  y: 0,
  width: 1080,
  height: 1920,
  showGrid: false,
  routes: [
    {
      points: [
        { x: 0.12, y: 0.84 },
        { x: 0.24, y: 0.74 },
        { x: 0.34, y: 0.62 },
        { x: 0.44, y: 0.52 },
        { x: 0.55, y: 0.47 },
        { x: 0.58, y: 0.4 },
      ],
      color: "#FFB01F",
      label: "МАРШРУТ А",
      note: "ПІВНІЧНИЙ КОРИДОР · 860 М",
      startFrame: 10,
      drawDuration: 58,
    },
    {
      points: [
        { x: 0.86, y: 0.86 },
        { x: 0.78, y: 0.72 },
        { x: 0.7, y: 0.58 },
        { x: 0.62, y: 0.5 },
        { x: 0.56, y: 0.46 },
      ],
      color: "#5BE7A9",
      label: "МАРШРУТ Б",
      note: "ОБХІД ЗАВАЛУ · 1240 М",
      startFrame: 20,
      drawDuration: 54,
      dash: true,
    },
  ],
};

const MAP_RESOURCES: ResourceMarkersConfig = {
  x: 0,
  y: 0,
  width: 1080,
  height: 1920,
  markerScale: 1.1,
  markers: [
    {
      x: 0.84,
      y: 0.2,
      type: "power",
      label: "ПІДСТАНЦІЯ",
      value: 0,
      unit: "%",
      status: "critical",
    },
    {
      x: 0.66,
      y: 0.6,
      type: "water",
      label: "РЕЗЕРВУАР 3",
      value: 62,
      unit: "%",
      status: "ok",
    },
    {
      x: 0.26,
      y: 0.36,
      type: "fuel",
      label: "ПАЛИВО B2",
      value: 18,
      unit: "%",
      status: "low",
    },
    {
      x: 0.15,
      y: 0.55,
      type: "med",
      label: "МЕДПУНКТ",
      value: 42,
      unit: "%",
      status: "low",
    },
    {
      x: 0.52,
      y: 0.72,
      type: "radiation",
      label: "ЗОНА Р-4",
      value: 820,
      unit: "мкР/г",
      status: "critical",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* World: location layers + actors, with optional depth-of-field blur  */
/* ------------------------------------------------------------------ */

const World: React.FC<{
  camera: Camera;
  flash?: number;
  location?: LocationId;
  /** Blur applied to the far layers only (Sky + Horizon). */
  backgroundBlur?: number;
  children: React.ReactNode;
}> = ({
  camera,
  flash = 0,
  location = DEFAULT_LOCATION,
  backgroundBlur = 0,
  children,
}) => {
  const { Sky, Horizon, Ground, Midground, Embers, dustBandBackground } =
    getLocation(location);
  const bandBackground =
    dustBandBackground ??
    "linear-gradient(to bottom, rgba(255,107,61,0) 62%, rgba(255,138,76,0.14) 82%, rgba(255,138,76,0) 100%)";

  const farStyle: React.CSSProperties =
    backgroundBlur > 0.05
      ? {
          filter: `blur(${backgroundBlur.toFixed(2)}px) saturate(0.92) brightness(0.84)`,
          transform: `scale(${1 + backgroundBlur * 0.008})`,
        }
      : {};

  // The floor sits between the far plane and the props: give it a fraction of
  // the defocus so the horizon line does not look like a hard cut-out.
  const midStyle: React.CSSProperties =
    backgroundBlur > 0.5
      ? {
          filter: `blur(${(backgroundBlur * 0.45).toFixed(2)}px)`,
          transform: `scale(${1 + backgroundBlur * 0.003})`,
        }
      : {};

  return (
    <>
      {/* far plane - the only part that goes fully out of focus */}
      <AbsoluteFill style={farStyle}>
        <Sky camera={camera} flash={flash} />
        <Horizon camera={camera} />
      </AbsoluteFill>
      {/* the floor must sit under the standing props */}
      <AbsoluteFill style={midStyle}>
        <Ground camera={camera} />
      </AbsoluteFill>
      <Midground camera={camera} />
      {/* thin dust band that separates the prop plane from the actors */}
      <Layer camera={camera} depth={0.92}>
        <AbsoluteFill style={{ background: bandBackground }} />
      </Layer>
      <Layer camera={camera} depth={1}>
        {children}
      </Layer>
      <Embers camera={camera} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 01 - WIDE                                                           */
/* ------------------------------------------------------------------ */

const ShotWide: React.FC<{
  from: number;
  durationInFrames: number;
  location: LocationId;
}> = ({ from, durationInFrames, location }) => (
  <CinematicShot
    type="wide"
    durationInFrames={durationInFrames}
    target={{ x: 540, y: 1200 }}
    motion="push-in"
    location={location}
    label
  >
    {({ camera, frame }) => {
      const g = from + frame;
      const alexTalking = isSpeaking("char1", g);
      const mayaTalking = isSpeaking("char2", g);
      return (
        <>
          <World camera={camera} location={location}>
            {/* Environmental props. They sit behind the actors; the phone is the
                target Maya glances at whenever she is not speaking. */}
            <Prop id="tanks" {...TANKS_SPOT} />
            <Prop id="phone" {...PHONE_SPOT} />
            {/* Viktor keeps the group honest: crossed arms, watching both of them. */}
            <Character
              x={176}
              y={1642}
              {...characterProps("commander_viktor", {
                scale: 1.0,
                armPose: "crossed",
                lookAt: { x: 540, y: 1174 },
                isListening: alexTalking || mayaTalking,
              })}
            />
            {/* Alex explains with an open palm while his eyes flick to Maya. */}
            <Character
              x={540}
              y={1674}
              {...characterProps("survivor_alex", {
                scale: 1.04,
                armPose: alexTalking ? "explain" : "idle",
                bodyPosture: alexTalking ? "lean-forward" : "neutral",
                lookAt: { x: 880, y: 1170 },
                isTalking: alexTalking,
                isListening: !alexTalking && mayaTalking,
                voiceAmplitude: voiceAmplitude("char1", g),
              })}
            />
            {/* Maya points at the horizon, then reacts to Alex's line. When the
                dialogue pauses she looks down at the prop interactionPoint. */}
            <Character
              x={880}
              y={1654}
              {...characterProps("scout_maya", {
                scale: 1.0,
                armPose: mayaTalking ? "point" : "idle",
                lookAt: mayaTalking ? { x: 540, y: 1170 } : PHONE_FOCUS,
                isTalking: mayaTalking,
                isListening: alexTalking,
                voiceAmplitude: voiceAmplitude("char2", g),
              })}
            />
          </World>
          {/* Screen-space HUD: mounted after <World>, so it does not parallax. */}
          <Infographic id="inventory" config={ALEX_INVENTORY} />
        </>
      );
    }}
  </CinematicShot>
);

/* ------------------------------------------------------------------ */
/* 02 - MEDIUM (dialogue)                                              */
/* ------------------------------------------------------------------ */

const ShotMedium: React.FC<{
  from: number;
  durationInFrames: number;
  location: LocationId;
}> = ({ from, durationInFrames, location }) => (
  <CinematicShot
    type="medium"
    durationInFrames={durationInFrames}
    target={{ x: 545, y: 1040 }}
    motion="pan"
    shake={0.7}
    location={location}
    label
  >
    {({ camera, frame }) => {
      const g = from + frame;
      const alexTalking = isSpeaking("char1", g);
      const mayaTalking = isSpeaking("char2", g);
      return (
        <>
          <World camera={camera} location={location} backgroundBlur={1.4}>
            {/* Working pump, a hissing radio and an open field journal frame
                the dialogue. When nobody talks Alex glances at the journal. */}
            <Prop id="pump" {...PUMP_SPOT} />
            <Prop id="radio" {...RADIO_SPOT} />
            <Prop id="notebook" {...NOTEBOOK_SPOT} />
            {/* Alex leans in and explains; while Maya talks he listens and nods. */}
            <Character
              x={332}
              y={1732}
              {...characterProps("survivor_alex", {
                scale: 1.58,
                armPose: alexTalking ? "explain" : "idle",
                bodyPosture: alexTalking ? "lean-forward" : "neutral",
                lookAt:
                  !alexTalking && !mayaTalking
                    ? NOTEBOOK_FOCUS
                    : { x: 750, y: 1006 },
                isTalking: alexTalking,
                isListening: mayaTalking,
                voiceAmplitude: voiceAmplitude("char1", g),
              })}
            />
            {/* Maya answers with a point; the rest of the time her arms are crossed. */}
            <Character
              x={752}
              y={1742}
              {...characterProps("scout_maya", {
                scale: 1.55,
                armPose: mayaTalking ? "point" : "crossed",
                bodyPosture: mayaTalking ? "recoil" : "neutral",
                lookAt: { x: 332, y: 986 },
                isTalking: mayaTalking,
                isListening: alexTalking,
                voiceAmplitude: voiceAmplitude("char2", g),
              })}
            />
          </World>
          {/* Screen-space resource meters: digital + bar + radial, animated. */}
          <Infographic id="counters" config={RESOURCE_METERS} />
        </>
      );
    }}
  </CinematicShot>
);

/* ------------------------------------------------------------------ */
/* 03 - CLOSE-UP (auto headroom for the 48% caption)                   */
/* ------------------------------------------------------------------ */

const ShotCloseup: React.FC<{
  from: number;
  durationInFrames: number;
  location: LocationId;
}> = ({ from, durationInFrames, location }) => (
  <CinematicShot
    type="closeup"
    durationInFrames={durationInFrames}
    target={{ x: 540, y: 986 }}
    motion="push-in"
    shake={0.8}
    location={location}
    label
  >
    {({ camera, fx, frame }) => {
      const g = from + frame;
      const speaking = isSpeaking("char1", g);
      return (
        <World
          camera={camera}
          location={location}
          backgroundBlur={fx.focusBlur}
        >
          {/* Alex talks to the group, but his gaze keeps sliding to the road sign. */}
          <Character
            x={540}
            y={1900}
            {...characterProps("survivor_alex", {
              scale: 2.05,
              eyeType: "wide",
              bodyPosture: speaking ? "lean-forward" : "neutral",
              armPose: speaking ? "explain" : "idle",
              headTilt: -3,
              lookAt: { x: 660, y: 1340 },
              isTalking: speaking,
              voiceAmplitude: voiceAmplitude("char1", g),
            })}
          />
        </World>
      );
    }}
  </CinematicShot>
);

/* ------------------------------------------------------------------ */
/* 04 - EXTREME CLOSE-UP (eyes, punch-in + vibration)                  */
/* ------------------------------------------------------------------ */

const ShotExtreme: React.FC<{
  from: number;
  durationInFrames: number;
  location: LocationId;
}> = ({ from, durationInFrames, location }) => {
  const mouth: MouthType = isSpeaking("char1", from) ? "half" : "closed";
  return (
    <CinematicShot
      type="extreme-closeup"
      durationInFrames={durationInFrames}
      target={{ x: 540, y: 612 }}
      motion="push-in"
      location={location}
      label
    >
      {({ camera, fx }) => (
        <World
          camera={camera}
          location={location}
          backgroundBlur={fx.focusBlur}
        >
          {/* Goggles catch the light as Maya's pupils track something off-frame. */}
          <Character
            x={540}
            y={1980}
            {...characterProps("scout_maya", {
              scale: 3,
              eyeType: "wide",
              mouthType: mouth,
              armPose: "shock",
              headTilt: 3,
              lookAt: { x: 890, y: 640 },
              isListening: false,
            })}
          />
        </World>
      )}
    </CinematicShot>
  );
};

/* ------------------------------------------------------------------ */
/* 05 - TOP-DOWN (heads + surface props)                               */
/* ------------------------------------------------------------------ */

const ShotTopDown: React.FC<{
  durationInFrames: number;
  location: LocationId;
}> = ({ durationInFrames, location }) => (
  <CinematicShot
    type="top-down"
    durationInFrames={durationInFrames}
    target={{ x: 540, y: 1120 }}
    motion="pan"
    location={location}
    label
  >
    {({ camera }) => (
      <Layer camera={camera} depth={1}>
        <TopDownPlate location={location} />
      </Layer>
    )}
  </CinematicShot>
);

/* ------------------------------------------------------------------ */
/* 06 - POV (first person + shoulders silhouette)                      */
/* ------------------------------------------------------------------ */

const PovForeground: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="povShoulders" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#120C1B" stopOpacity={0.94} />
          <stop offset="100%" stopColor="#05030A" stopOpacity={1} />
        </linearGradient>
        <radialGradient id="povTorch" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE0B8" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#FFD0A0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={540} cy={1610} rx={340} ry={280} fill="url(#povTorch)" />
      <path
        d="M 20 1980 C 80 1740 258 1592 540 1592 C 822 1592 1000 1740 1060 1980 L 1060 2010 L 20 2010 Z"
        fill="url(#povShoulders)"
      />
      <path
        d="M 132 1920 C 196 1720 336 1646 540 1646 C 744 1646 884 1720 948 1920"
        fill="none"
        stroke="#FF9E6A"
        strokeWidth={4}
        opacity={0.22}
      />
    </svg>
  </AbsoluteFill>
);

const ShotPov: React.FC<{
  durationInFrames: number;
  location: LocationId;
}> = ({ durationInFrames, location }) => (
  <CinematicShot
    type="pov"
    durationInFrames={durationInFrames}
    target={{ x: 540, y: 1180 }}
    motion="push-in"
    location={location}
    label
  >
    {({ camera }) => (
      <>
        <World camera={camera} location={location} backgroundBlur={1.2}>
          {/* POV walk-past: a banging blast door on the left, a dripping
              faucet on the right. Both animate from the frame clock only. */}
          <Prop id="door" {...DOOR_SPOT} />
          <Prop id="faucet" {...FAUCET_SPOT} />
        </World>
        <PovForeground />
      </>
    )}
  </CinematicShot>
);

/* ------------------------------------------------------------------ */
/* 07 - OBJECT FOCUS (road sign + background blur)                     */
/* ------------------------------------------------------------------ */

const ShotObjectFocus: React.FC<{
  durationInFrames: number;
  location: LocationId;
}> = ({ durationInFrames, location }) => (
  <CinematicShot
    type="object-focus"
    durationInFrames={durationInFrames}
    target={GENERATOR_FOCUS}
    motion="push-in"
    shake={0.6}
    location={location}
    label="OBJECT · GENERATOR"
  >
    {({ camera, fx, progress }) => (
      <>
        <World
          camera={camera}
          location={location}
          backgroundBlur={fx.focusBlur}
        >
          {/* Noa points at the generator; `lookAt` and the camera `target` both
              come from the prop registry interactionPoint. */}
          <Character
            x={214}
            y={1780}
            {...characterProps("engineer_noa", {
              scale: 1.05,
              armPose: "point",
              bodyPosture: "lean-forward",
              headTilt: 4,
              lookAt: GENERATOR_FOCUS,
              isListening: false,
            })}
          />
          <Prop
            id="generator"
            {...GENERATOR_SPOT}
            eventProgress={0.35 + progress * 0.65}
          />
          <Prop
            id="tools"
            {...TOOLS_SPOT}
            eventProgress={0.4 + progress * 0.6}
          />
        </World>
        {/* Screen-space HUD: fault banner + live power schematic. */}
        <Infographic id="warning" config={WARNING_OVERHEAT} />
        <Infographic id="schematics" config={POWER_SCHEMATICS} />
      </>
    )}
  </CinematicShot>
);

/* ------------------------------------------------------------------ */
/* 08 - MAP (tactical infographic)                                     */
/* ------------------------------------------------------------------ */

const ShotMap: React.FC<{
  durationInFrames: number;
  location: LocationId;
}> = ({ durationInFrames, location }) => (
  <CinematicShot
    type="map"
    durationInFrames={durationInFrames}
    target={{ x: 742, y: 812 }}
    motion="static"
    location={location}
    label="MAP · SECTOR 07"
  >
    {({ camera }) => (
      <Layer camera={camera} depth={0.45}>
        {/* Plate + overlays share one Layer, so they parallax together. */}
        <Infographic id="procedural_map" config={MAP_PLATE} />
        <Infographic id="animated_routes" config={MAP_ROUTES} />
        <Infographic id="resource_markers" config={MAP_RESOURCES} />
      </Layer>
    )}
  </CinematicShot>
);

/* ------------------------------------------------------------------ */
/* Screen-space grade: vignette, bloom, subtle top/bottom falloff       */
/* ------------------------------------------------------------------ */

const Atmosphere: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <defs>
        <radialGradient id="vignette" cx="50%" cy="48%" r="72%">
          <stop offset="45%" stopColor="#05030A" stopOpacity={0} />
          <stop offset="78%" stopColor="#05030A" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#05030A" stopOpacity={0.72} />
        </radialGradient>
        <radialGradient id="bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8A4C" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#FF8A4C" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="bottomFade" gradientUnits="userSpaceOnUse" x1="0" y1={HEIGHT * 0.84} x2="0" y2={HEIGHT}>
          <stop offset="0%" stopColor="#05030A" stopOpacity={0} />
          <stop offset="100%" stopColor="#05030A" stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="url(#vignette)" />
      <ellipse cx={726} cy={1012} rx={560} ry={420} fill="url(#bloom)" />
      <rect x={0} y={HEIGHT * 0.84} width={WIDTH} height={HEIGHT * 0.16} fill="url(#bottomFade)" />
    </svg>
  </AbsoluteFill>
);

export type MainSceneProps = {
  location?: LocationId;
};

export const MainScene: React.FC<MainSceneProps> = ({
  location = DEFAULT_LOCATION,
}) => {
  const closeupStart = shotStart(2);
  const extremeStart = shotStart(3);
  const topDownStart = shotStart(4);
  const povStart = shotStart(5);
  const objectStart = shotStart(6);
  const mapStart = shotStart(7);

  const closeupDur = shotFrames(2);
  const povDur = shotFrames(5);
  const mapDur = shotFrames(7);

  const titleDur = Math.max(1, Math.min(shotFrames(0) - 24, 210));
  const captionCloseupFrom = closeupStart + 18;
  const captionCloseupDur = Math.max(1, closeupDur - 30);
  const captionPovFrom = povStart + 20;
  const captionPovDur = Math.max(1, povDur - 42);
  const captionMapFrom = mapStart + 26;
  const captionMapDur = Math.max(1, mapDur - 46);

  const sirenDur = Math.max(1, Math.min(108, closeupDur - 18));
  const cuts = SHOTS.slice(1).map((_, i) => shotStart(i + 1));

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.shadow, overflow: "hidden" }}>
      {/* ---------------------------------------------------------------- */}
      {/* eight cinematic shots                                            */}
      {/* ---------------------------------------------------------------- */}
      <Sequence
        durationInFrames={shotFrames(0)}
        name={SHOTS[0].name}
      >
        <ShotWide from={0} durationInFrames={shotFrames(0)} location={location} />
      </Sequence>

      <Sequence
        from={shotStart(1)}
        durationInFrames={shotFrames(1)}
        name={SHOTS[1].name}
      >
        <ShotMedium
          from={shotStart(1)}
          durationInFrames={shotFrames(1)}
          location={location}
        />
      </Sequence>

      <Sequence
        from={closeupStart}
        durationInFrames={closeupDur}
        name={SHOTS[2].name}
      >
        <ShotCloseup
          from={closeupStart}
          durationInFrames={closeupDur}
          location={location}
        />
      </Sequence>

      <Sequence
        from={extremeStart}
        durationInFrames={shotFrames(3)}
        name={SHOTS[3].name}
      >
        <ShotExtreme
          from={extremeStart}
          durationInFrames={shotFrames(3)}
          location={location}
        />
      </Sequence>

      <Sequence
        from={topDownStart}
        durationInFrames={shotFrames(4)}
        name={SHOTS[4].name}
      >
        <ShotTopDown
          durationInFrames={shotFrames(4)}
          location={location}
        />
      </Sequence>

      <Sequence
        from={povStart}
        durationInFrames={shotFrames(5)}
        name={SHOTS[5].name}
      >
        <ShotPov durationInFrames={shotFrames(5)} location={location} />
      </Sequence>

      <Sequence
        from={objectStart}
        durationInFrames={shotFrames(6)}
        name={SHOTS[6].name}
      >
        <ShotObjectFocus
          durationInFrames={shotFrames(6)}
          location={location}
        />
      </Sequence>

      <Sequence
        from={mapStart}
        durationInFrames={mapDur}
        name={SHOTS[7].name}
      >
        <ShotMap durationInFrames={mapDur} location={location} />
      </Sequence>

      <Atmosphere />

      {/* ---------------------------------------------------------------- */}
      {/* background sound: wind bed looped over the entire video length   */}
      {/* ---------------------------------------------------------------- */}
      <Loop durationInFrames={WIND_LOOP_FRAMES} name="Audio: wind bed (looped)">
        <Audio
          src={staticFile("sfx/wind_ambient.wav")}
          loopVolumeCurveBehavior="extend"
          volume={(f) =>
            interpolate(f, [0, 18, DURATION - 24, DURATION], [0, 0.25, 0.25, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      </Loop>

      {/* ---------------------------------------------------------------- */}
      {/* SFX hits, one accent per cut                                     */}
      {/* ---------------------------------------------------------------- */}
      <Sequence from={2} durationInFrames={5} name="Audio: title pop">
        <Audio src={staticFile("sfx/pop.wav")} volume={0.7} />
      </Sequence>

      {cuts.map((cut, i) => (
        <Sequence
          key={`glitch-${i}`}
          from={Math.max(0, cut - 2)}
          durationInFrames={9}
          name={`Audio: glitch cut ${i + 1}`}
        >
          <Audio src={staticFile("sfx/glitch.wav")} volume={0.22} />
        </Sequence>
      ))}

      <Sequence
        from={extremeStart}
        durationInFrames={12}
        name="Audio: extreme whoosh"
      >
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.5} />
      </Sequence>

      <Sequence
        from={closeupStart}
        durationInFrames={75}
        name="Audio: explosion"
      >
        <Audio src={staticFile("sfx/explosion.wav")} volume={0.78} />
      </Sequence>

      <Sequence
        from={closeupStart + 12}
        durationInFrames={sirenDur}
        name="Audio: siren"
      >
        <Audio
          src={staticFile("sfx/siren.wav")}
          volume={(f) =>
            interpolate(f, [0, 20, Math.max(21, sirenDur - 24), sirenDur], [0, 0.2, 0.2, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      </Sequence>

      <Sequence
        from={Math.max(0, topDownStart - 2)}
        durationInFrames={16}
        name="Audio: top-down whoosh"
      >
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.55} />
      </Sequence>

      <Sequence
        from={Math.max(0, objectStart - 2)}
        durationInFrames={14}
        name="Audio: object whoosh"
      >
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.4} />
      </Sequence>

      <Sequence
        from={Math.max(0, mapStart - 3)}
        durationInFrames={18}
        name="Audio: map whoosh"
      >
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.5} />
      </Sequence>

      <Sequence
        from={captionCloseupFrom}
        durationInFrames={5}
        name="Audio: caption pop 1"
      >
        <Audio src={staticFile("sfx/pop.wav")} volume={0.45} />
      </Sequence>

      <Sequence
        from={captionPovFrom}
        durationInFrames={5}
        name="Audio: caption pop 2"
      >
        <Audio src={staticFile("sfx/pop.wav")} volume={0.45} />
      </Sequence>

      <Sequence
        from={captionMapFrom}
        durationInFrames={5}
        name="Audio: caption pop 3"
      >
        <Audio src={staticFile("sfx/pop.wav")} volume={0.45} />
      </Sequence>

      {/* ---------------------------------------------------------------- */}
      {/* multi-voice dialogue track (from public/voices/)                */}
      {/* ---------------------------------------------------------------- */}
      {DIALOGUE.map((line) => (
        <Sequence
          key={`${line.index}-${line.file}`}
          from={line.startFrame}
          durationInFrames={Math.max(1, line.durationInFrames)}
          name={`Voice ${line.index + 1}: ${line.speaker}`}
        >
          <Audio
            src={staticFile(`voices/${line.file}`)}
            volume={(f) => {
              const dur = line.durationInFrames;
              if (dur <= 6) return 0.95;
              return interpolate(f, [0, 2, dur - 3, dur], [0, 0.95, 0.95, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
            }}
          />
        </Sequence>
      ))}

      {/* ---------------------------------------------------------------- */}
      {/* viral type: hook title + contextual captions                     */}
      {/* ---------------------------------------------------------------- */}
      <Sequence durationInFrames={titleDur} name="Title: day 1">
        <HookTitle
          text="ДЕНЬ 1: НЕБО ПОЧЕРВОНІЛО"
          highlight="ПОЧЕРВОНІЛО"
          top={140}
          delay={4}
          exitAt={Math.max(10, titleDur - 16)}
        />
      </Sequence>

      <Sequence
        from={captionCloseupFrom}
        durationInFrames={captionCloseupDur}
        name="Caption: not a sunset (48%)"
      >
        <DynamicCaption
          text="ЦЕ НЕ ЗАХІД СОНЦЯ..."
          highlight={["НЕ ЗАХІД"]}
          top="48%"
          delay={2}
          exitAt={Math.max(10, Math.round(captionCloseupDur * 0.84))}
        />
      </Sequence>

      <Sequence
        from={captionPovFrom}
        durationInFrames={captionPovDur}
        name="Caption: don't look back (POV)"
      >
        <DynamicCaption
          text="НЕ ОЗИРАЙСЯ"
          highlight={["ОЗИРАЙСЯ"]}
          top="48%"
          delay={2}
          exitAt={Math.max(10, Math.round(captionPovDur * 0.86))}
        />
      </Sequence>

      <Sequence
        from={captionMapFrom}
        durationInFrames={captionMapDur}
        name="Caption: they are here (map)"
      >
        <DynamicCaption
          text="ВОНИ ВЖЕ ТУТ"
          highlight={["ВЖЕ"]}
          top="76%"
          delay={2}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

/* Re-export for convenience in scripts / tests. */
export { shotEnd, shotFrames, shotStart, SHOTS, SHOT_COUNT, HAS_DIALOGUE };
