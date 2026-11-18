import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Camera,
  clamp,
  clamp01,
  lerp,
  makeCamera,
  rand,
  smoothstep,
} from "./Camera";
import { DEFAULT_LOCATION, LocationId } from "./locations";
import { HEIGHT, INK, PALETTE, WIDTH } from "./palette";

/* ==================================================================== */
/*  Public types                                                        */
/* ==================================================================== */

export type ShotType =
  | "wide"
  | "medium"
  | "closeup"
  | "extreme-closeup"
  | "top-down"
  | "pov"
  | "object-focus"
  | "map";

export type ShotMotion = "push-in" | "pull-out" | "pan" | "static";

export type ShotTarget = { x: number; y: number };

export type ShotPreset = {
  type: ShotType;
  /** 1-based order used by the demo badge. */
  index: number;
  /** Short uppercase name, e.g. "EXTREME". */
  label: string;
  /** Ukrainian human-readable name for docs / badges. */
  titleUk: string;
  /** Base zoom range: [start, end] before motion is applied. */
  zoom: [number, number];
  /** Vertical line (0..1 of frame height) where `target` should land. */
  focusLine: number;
  /** Extra headroom after the focus solve, in px. */
  lift: number;
  /** Parallax strength multiplier for the authored pan/drift. */
  parallax: number;
  /** Organic handheld amplitude in px. */
  handheld: number;
  /** Background defocus in px for the depth-of-field look. */
  backgroundBlur: number;
  /** Extra edge vignette (0..1). */
  vignette: number;
  /** Accent colour used by the HUD + effects. */
  accent: string;
  defaultMotion: ShotMotion;
  /** One-line description for the docs table. */
  descUk: string;
};

export type ShotFx = {
  type: ShotType;
  accent: string;
  /** Background defocus in px (feed it into `World backgroundBlur`). */
  focusBlur: number;
  /** Generic edge vignette 0..1. */
  vignette: number;
  /** First-person vignette + breathing fog strength 0..1. */
  pov: number;
  /** Tactical grid / scanline strength 0..1. */
  scan: number;
  /** White flash 0..1 (extreme close-up punch). */
  flash: number;
  /** Film grain 0..1. */
  grain: number;
  /** Breathing fog opacity 0..1 (POV). */
  breathe: number;
  /** Where the target lands on screen - used by the focus reticle. */
  focusPoint: ShotTarget;
  /** Parallax multiplier exposed for custom layers. */
  parallax: number;
};

export type ShotState = {
  camera: Camera;
  fx: ShotFx;
  preset: ShotPreset;
  frame: number;
  progress: number;
  motion: ShotMotion;
  target: ShotTarget;
  durationInFrames: number;
};

export type ShotComputeInput = {
  type: ShotType;
  durationInFrames: number;
  frame: number;
  motion?: ShotMotion;
  target?: ShotTarget;
  /** Handheld multiplier: 0 = locked off, 1 = preset default, >1 = heavier. */
  shake?: number;
  fps?: number;
};

/* ==================================================================== */
/*  Presets - the eight cinematic shot types                            */
/* ==================================================================== */

export const SHOT_PRESETS: Record<ShotType, ShotPreset> = {
  wide: {
    type: "wide",
    index: 1,
    label: "WIDE",
    titleUk: "Загальний план",
    zoom: [1.02, 1.12],
    focusLine: 0.52,
    lift: 0,
    parallax: 1,
    handheld: 1.1,
    backgroundBlur: 0,
    vignette: 0.22,
    accent: "#FFC247",
    defaultMotion: "push-in",
    descUk: "Увесь зріст персонажів і середовище, повільний наїзд.",
  },
  medium: {
    type: "medium",
    index: 2,
    label: "MEDIUM",
    titleUk: "Середній план",
    zoom: [1.25, 1.35],
    focusLine: 0.38,
    lift: 0,
    parallax: 0.85,
    handheld: 1.8,
    backgroundBlur: 1.2,
    vignette: 0.3,
    accent: "#FFB01F",
    defaultMotion: "static",
    descUk: "По пояс, двоє в кадрі - оптимально для діалогу.",
  },
  closeup: {
    type: "closeup",
    index: 3,
    label: "CLOSE-UP",
    titleUk: "Крупний план",
    zoom: [1.5, 1.65],
    focusLine: 0.27,
    lift: 90,
    parallax: 0.6,
    handheld: 2.6,
    backgroundBlur: 2.5,
    vignette: 0.46,
    accent: "#FF9A57",
    defaultMotion: "push-in",
    descUk: "Портрет; камера сама піднімається, щоб підпис на 48% не закрив рот.",
  },
  "extreme-closeup": {
    type: "extreme-closeup",
    index: 4,
    label: "EXTREME",
    titleUk: "Екстремальний наїзд",
    zoom: [2.1, 2.4],
    focusLine: 0.42,
    lift: 140,
    parallax: 0.4,
    handheld: 1.4,
    backgroundBlur: 4,
    vignette: 0.6,
    accent: "#FF6A3D",
    defaultMotion: "push-in",
    descUk: "Очі на весь кадр: різкий імпульс входу + легка вібрація.",
  },
  "top-down": {
    type: "top-down",
    index: 5,
    label: "TOP-DOWN",
    titleUk: "Вид зверху",
    zoom: [1.14, 1.26],
    focusLine: 0.5,
    lift: 0,
    parallax: 1.25,
    handheld: 0.8,
    backgroundBlur: 0,
    vignette: 0.28,
    accent: "#7FE7C4",
    defaultMotion: "pan",
    descUk: "Проекція зверху: маківки персонажів, тіні та предмети на поверхні.",
  },
  pov: {
    type: "pov",
    index: 6,
    label: "POV",
    titleUk: "Від першої особи",
    zoom: [1.16, 1.26],
    focusLine: 0.46,
    lift: 0,
    parallax: 1.4,
    handheld: 7,
    backgroundBlur: 0.8,
    vignette: 0.9,
    accent: "#9AD7FF",
    defaultMotion: "push-in",
    descUk: "Погляд героя: ходьба/дихання, похитування та м'яка віньєтка.",
  },
  "object-focus": {
    type: "object-focus",
    index: 7,
    label: "OBJECT",
    titleUk: "Акцент на предметі",
    zoom: [1.7, 1.95],
    focusLine: 0.46,
    lift: 0,
    parallax: 0.7,
    handheld: 1.2,
    backgroundBlur: 7,
    vignette: 0.48,
    accent: "#FFE066",
    defaultMotion: "push-in",
    descUk: "Зум на координати об'єкта + розмиття задніх шарів (depth of field).",
  },
  map: {
    type: "map",
    index: 8,
    label: "MAP",
    titleUk: "Тактична карта",
    zoom: [1.0, 1.05],
    focusLine: 0.5,
    lift: 0,
    parallax: 0.6,
    handheld: 0.4,
    backgroundBlur: 0,
    vignette: 0.2,
    accent: "#5BE7A9",
    defaultMotion: "static",
    descUk: "2D-схема: анімовані маршрути, маркери цілей і підписи.",
  },
};

export const SHOT_TYPES: readonly ShotType[] = [
  "wide",
  "medium",
  "closeup",
  "extreme-closeup",
  "top-down",
  "pov",
  "object-focus",
  "map",
];

export const isShotType = (value: string): value is ShotType =>
  Object.prototype.hasOwnProperty.call(SHOT_PRESETS, value);

export const DEFAULT_SHOT_TARGET: ShotTarget = {
  x: WIDTH / 2,
  y: HEIGHT * 0.62,
};

const EASE_MOVE = Easing.bezier(0.42, 0, 0.28, 1);
const EASE_PUNCH = Easing.bezier(0.16, 1, 0.3, 1);

type FocusSolve = {
  panX: number;
  panY: number;
  zoom: number;
  maxPanX: number;
  maxPanY: number;
};

/**
 * Solve the camera that puts `target` on the preset's focus line.
 * Pan is clamped to the layer bleed, so a shot can never expose a raw edge.
 */
const solveFocus = (
  zoom: number,
  target: ShotTarget,
  preset: ShotPreset,
  autoLift: number,
  motion: ShotMotion,
  progress: number,
): FocusSolve => {
  const maxPanX = Math.max(0, (zoom - 1) * WIDTH * 0.5 * 0.94);
  const maxPanY = Math.max(0, (zoom - 1) * HEIGHT * 0.5 * 0.94);

  const desiredX = (target.x - WIDTH / 2) * zoom;
  const desiredY =
    (target.y - HEIGHT / 2) * zoom +
    HEIGHT / 2 -
    preset.focusLine * HEIGHT +
    preset.lift +
    autoLift;

  let panX = desiredX;
  const panY = desiredY;

  if (motion === "pan") {
    panX += lerp(-1, 1, EASE_MOVE(progress)) * WIDTH * 0.075 * preset.parallax;
  }

  return {
    panX: clamp(panX, -maxPanX, maxPanX),
    panY: clamp(panY, -maxPanY, maxPanY),
    zoom,
    maxPanX,
    maxPanY,
  };
};

/**
 * Pure, frame-driven camera solver. Exported so the shot behaviour can be
 * unit-tested or reused outside of Remotion (pass an explicit `frame`).
 */
export const computeShot = (input: ShotComputeInput): ShotState => {
  const {
    type,
    durationInFrames,
    frame,
    motion = SHOT_PRESETS[type].defaultMotion,
    target = DEFAULT_SHOT_TARGET,
    shake = 1,
    fps = 30,
  } = input;

  const preset = SHOT_PRESETS[type];
  const last = Math.max(1, durationInFrames - 1);
  const progress = clamp01(frame / last);
  const ease = EASE_MOVE(progress);
  const t = frame / fps;

  const [z0, z1] = preset.zoom;

  let zoom: number;
  switch (motion) {
    case "pull-out":
      zoom = lerp(z1, z0, ease);
      break;
    case "static":
      zoom = lerp(z0, z1, 0.18) + Math.sin(frame * 0.06) * 0.004;
      break;
    case "pan":
      zoom = lerp(z0, z1, 0.55) + Math.sin(frame * 0.045) * 0.006;
      break;
    case "push-in":
    default:
      zoom = lerp(z0, z1, ease);
      break;
  }

  // Extreme close-up: a hard, short punch on entry, then a slow creep.
  if (type === "extreme-closeup" && motion === "push-in") {
    const punch = EASE_PUNCH(clamp01(frame / 7));
    zoom = lerp(z0 - 0.34, lerp(z0, z1, ease), punch);
  }

  // Top-down: a slow orbit around the plate.
  let roll = 0;
  if (type === "top-down") {
    roll = Math.sin(progress * Math.PI * 2) * 1.8;
  }

  // Organic handheld motion (deterministic sums of sines, never Math.random).
  let shakeX =
    (Math.sin(t * 1.7 + 0.4) * 1.6 + Math.sin(t * 0.61 + 2.1) * 2.2) *
    preset.handheld *
    shake;
  let shakeY =
    (Math.cos(t * 1.31 + 1.2) * 1.4 + Math.sin(t * 0.47) * 2.4) *
    preset.handheld *
    shake;

  // POV: a 1.85 Hz walk cycle layered on top of breathing.
  if (type === "pov") {
    const stride = Math.PI * 2 * 1.85 * t;
    shakeY += Math.sin(stride) * preset.handheld * shake * 0.85;
    shakeY += Math.sin(stride * 2) * preset.handheld * shake * 0.22;
    shakeX += Math.sin(stride * 0.5) * preset.handheld * shake * 0.7;
    roll += Math.sin(stride * 0.5 + 0.6) * 0.42;
  }

  // Extreme close-up: fine vibration, decaying after the punch.
  if (type === "extreme-closeup") {
    const decay = 0.45 + 0.55 * Math.exp(-frame / 26);
    shakeX += (Math.sin(frame * 3.7) * 0.55 + Math.sin(frame * 8.3) * 0.22) * decay;
    shakeY += Math.cos(frame * 4.1) * 0.5 * decay;
    zoom += Math.sin(frame * 2.9) * 0.0035 * decay;
  }

  const autoLift =
    type === "closeup" ? 90 : type === "extreme-closeup" ? 70 : 0;

  const solved = solveFocus(zoom, target, preset, autoLift, motion, progress);

  let panX = solved.panX;
  let panY = solved.panY;

  // Top-down: a slow lateral orbit around the plate.
  if (type === "top-down") {
    panX = clamp(
      panX + Math.sin(progress * Math.PI * 2) * WIDTH * 0.05 * preset.parallax,
      -solved.maxPanX,
      solved.maxPanX,
    );
    panY = clamp(
      panY + Math.cos(progress * Math.PI * 2) * HEIGHT * 0.025,
      -solved.maxPanY,
      solved.maxPanY,
    );
  }

  const camera: Camera = makeCamera({
    zoom,
    panX,
    panY,
    shakeX,
    shakeY,
    roll,
    tiltX: 0,
    perspective: 1500,
  });

  const focusPoint: ShotTarget = {
    x: WIDTH / 2 + (target.x - WIDTH / 2) * zoom - panX,
    y: HEIGHT / 2 + (target.y - HEIGHT / 2) * zoom - panY,
  };

  const focusRamp =
    type === "object-focus" ? smoothstep(clamp01((frame - 3) / 10)) : 0;

  const fx: ShotFx = {
    type,
    accent: preset.accent,
    focusBlur:
      type === "object-focus"
        ? preset.backgroundBlur * focusRamp +
          Math.sin(frame * 0.07) * 0.25 * focusRamp
        : 0,
    vignette: preset.vignette,
    pov: type === "pov" ? 0.9 : 0,
    scan: type === "map" || type === "top-down" ? 1 : 0,
    flash:
      type === "extreme-closeup"
        ? clamp01(1 - frame / 9) * 0.34 +
          (clamp01((frame - 1) / 3) * clamp01(1 - frame / 12) * 0.08)
        : 0,
    grain:
      type === "extreme-closeup"
        ? 0.34
        : type === "pov"
          ? 0.12
          : type === "map"
            ? 0.08
            : 0,
    breathe: type === "pov" ? 0.55 + 0.25 * Math.sin(frame / 13) : 0,
    focusPoint,
    parallax: preset.parallax,
  };

  return {
    camera,
    fx,
    preset,
    frame,
    progress,
    motion,
    target,
    durationInFrames,
  };
};

/* ==================================================================== */
/*  <CinematicShot>                                                     */
/* ==================================================================== */

export type CinematicShotState = ShotState;

export type CinematicShotProps = {
  type: ShotType;
  durationInFrames: number;
  /** World-space point of interest: camera centres/lifts to it. */
  target?: ShotTarget;
  /** Location id - used by the HUD and the special plates. */
  location?: LocationId;
  /** 0 = locked off, 1 = preset feel (default), >1 = heavier. */
  shake?: number;
  motion?: ShotMotion;
  /** `true` shows the auto HUD badge, a string overrides its text. */
  label?: boolean | string;
  /**
   * Scene content. Pass a function to receive the solved `camera` and `fx`:
   *
   *   <CinematicShot type="closeup" durationInFrames={150}>
   *     {({ camera, fx }) => (
   *       <World camera={camera} backgroundBlur={fx.focusBlur}>…</World>
   *     )}
   *   </CinematicShot>
   */
  children?:
    | React.ReactNode
    | ((state: CinematicShotState) => React.ReactNode);
  style?: React.CSSProperties;
};

export const CinematicShot: React.FC<CinematicShotProps> = ({
  type,
  durationInFrames,
  target,
  location = DEFAULT_LOCATION,
  shake,
  motion,
  label = false,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const state = computeShot({
    type,
    durationInFrames,
    frame,
    motion,
    target,
    shake,
    fps,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: PALETTE.shadow,
        overflow: "hidden",
        ...style,
      }}
    >
      {typeof children === "function" ? children(state) : children}
      <ShotEffects state={state} />
      {label ? (
        <ShotBadge
          state={state}
          location={location}
          text={typeof label === "string" ? label : undefined}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/* ==================================================================== */
/*  Screen-space effects                                                */
/* ==================================================================== */

const MONO = '"Consolas", "SF Mono", "Segoe UI Mono", "Courier New", monospace';
const DISPLAY =
  '"Arial Black", "Segoe UI Black", "Impact", "Montserrat", sans-serif';

const Grain: React.FC<{ seed: number; opacity: number }> = ({ seed, opacity }) => {
  if (opacity <= 0) return null;
  const dots = Array.from({ length: 46 }, (_, i) => {
    const x = rand(seed + 11, i) * WIDTH;
    const y = rand(seed + 29, i + 7) * HEIGHT;
    const r = 1 + rand(seed + 47, i + 3) * 1.8;
    return { x, y, r };
  });
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill={i % 3 === 0 ? "#FFEEDD" : "#FFFFFF"}
          opacity={0.1 + (i % 5) * 0.03}
        />
      ))}
      <rect
        width={WIDTH}
        height={HEIGHT}
        fill="transparent"
        style={{ opacity: 0 }}
      />
    </svg>
  );
};

const FocusReticle: React.FC<{ point: ShotTarget; accent: string; frame: number }> = ({
  point,
  accent,
  frame,
}) => {
  const pulse = 0.72 + 0.28 * Math.sin(frame * 0.16);
  const size = 118;
  const arm = 34;
  const x = clamp(point.x, 70, WIDTH - 70);
  const y = clamp(point.y, 80, HEIGHT - 80);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ position: "absolute", inset: 0 }}
    >
      <g
        stroke={accent}
        strokeWidth={3}
        fill="none"
        opacity={0.55 * pulse}
        strokeLinecap="round"
      >
        <path d={`M ${x - size} ${y - size + arm} L ${x - size} ${y - size} L ${x - size + arm} ${y - size}`} />
        <path d={`M ${x + size - arm} ${y - size} L ${x + size} ${y - size} L ${x + size} ${y - size + arm}`} />
        <path d={`M ${x - size} ${y + size - arm} L ${x - size} ${y + size} L ${x - size + arm} ${y + size}`} />
        <path d={`M ${x + size - arm} ${y + size} L ${x + size} ${y + size} L ${x + size} ${y + size - arm}`} />
      </g>
      <circle cx={x} cy={y} r={7} fill={accent} opacity={0.8 * pulse} />
      <circle cx={x} cy={y} r={16} stroke={accent} strokeWidth={2} fill="none" opacity={0.35} />
    </svg>
  );
};

const ShotEffects: React.FC<{ state: ShotState }> = ({ state }) => {
  const { fx, preset, frame } = state;
  const seed = Math.floor(frame / 2) + 7;
  const scanY = (frame * 9) % (HEIGHT + 260) - 130;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Generic cinematic edge vignette */}
      <AbsoluteFill
        style={{
          opacity: preset.vignette,
          background:
            "radial-gradient(118% 92% at 50% 46%, rgba(0,0,0,0) 40%, rgba(3,2,7,0.5) 80%, rgba(2,1,5,0.88) 100%)",
        }}
      />

      {/* POV - soft lens vignette, breathing fog, warm bottom light */}
      {fx.pov > 0 ? (
        <AbsoluteFill style={{ opacity: fx.pov }}>
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(84% 66% at 50% 47%, rgba(0,0,0,0) 30%, rgba(2,2,6,0.55) 72%, rgba(0,0,0,0.97) 100%)",
            }}
          />
          <AbsoluteFill
            style={{
              opacity: fx.breathe,
              background:
                "radial-gradient(52% 20% at 50% 102%, rgba(255,214,178,0.16), rgba(0,0,0,0) 70%)",
            }}
          />
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(to top, rgba(255,150,100,0.10) 0%, rgba(255,120,60,0.02) 14%, rgba(0,0,0,0) 30%)",
            }}
          />
        </AbsoluteFill>
      ) : null}

      {/* Object focus - dim everything outside the target, add reticle + bokeh */}
      {fx.type === "object-focus" ? (
        <AbsoluteFill>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            style={{ position: "absolute", inset: 0 }}
          >
            <defs>
              <radialGradient id="objectFocusScrim">
                <stop offset="0%" stopColor="#05030A" stopOpacity={0} />
                <stop offset="26%" stopColor="#05030A" stopOpacity={0} />
                <stop offset="58%" stopColor="#05030A" stopOpacity={0.34} />
                <stop offset="100%" stopColor="#05030A" stopOpacity={0.72} />
              </radialGradient>
            </defs>
            <rect
              width={WIDTH}
              height={HEIGHT}
              fill="url(#objectFocusScrim)"
              opacity={0.85}
            />
            {Array.from({ length: 12 }, (_, i) => {
              const angle = rand(71, i) * Math.PI * 2;
              const dist = 420 + rand(83, i) * 620;
              return (
                <circle
                  key={`b${i}`}
                  cx={clamp(fx.focusPoint.x + Math.cos(angle) * dist, 40, WIDTH - 40)}
                  cy={clamp(fx.focusPoint.y + Math.sin(angle) * dist, 80, HEIGHT - 80)}
                  r={10 + rand(97, i) * 26}
                  fill={preset.accent}
                  opacity={0.03 + rand(103, i) * 0.05}
                />
              );
            })}
          </svg>
          <FocusReticle
            point={fx.focusPoint}
            accent={preset.accent}
            frame={frame}
          />
        </AbsoluteFill>
      ) : null}

      {/* Top-down - blueprint grid + cool light bloom */}
      {fx.type === "top-down" ? (
        <AbsoluteFill>
          <AbsoluteFill
            style={{
              opacity: 0.14,
              backgroundImage:
                "linear-gradient(rgba(140,255,220,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(140,255,220,0.45) 1px, transparent 1px)",
              backgroundSize: "90px 90px",
            }}
          />
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(72% 46% at 50% 36%, rgba(120,255,220,0.10), rgba(0,0,0,0) 70%)",
            }}
          />
        </AbsoluteFill>
      ) : null}

      {/* Map - scanline sweep */}
      {fx.type === "map" ? (
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,0) ${scanY - 70}px, rgba(120,255,200,0.10) ${scanY}px, rgba(0,0,0,0) ${scanY + 70}px)`,
          }}
        />
      ) : null}

      {/* Extreme close-up punch flash */}
      {fx.flash > 0 ? (
        <AbsoluteFill
          style={{
            opacity: fx.flash,
            background:
              "radial-gradient(90% 60% at 50% 42%, #FFF2DE 0%, rgba(255,176,110,0.7) 45%, rgba(255,106,61,0) 78%)",
            mixBlendMode: "screen",
          }}
        />
      ) : null}

      <Grain seed={seed} opacity={fx.grain} />
    </AbsoluteFill>
  );
};

/* ==================================================================== */
/*  HUD badge (self-documenting demo)                                   */
/* ==================================================================== */

const ShotBadge: React.FC<{
  state: ShotState;
  location: LocationId;
  text?: string;
}> = ({ state, location, text }) => {
  const { preset, frame, motion, durationInFrames } = state;
  const { fps } = useVideoConfig();
  const appear = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });
  const index = preset.index < 10 ? `0${preset.index}` : `${preset.index}`;

  return (
    <div
      style={{
        position: "absolute",
        top: 58,
        left: 54,
        pointerEvents: "none",
        opacity: appear,
        transform: `translateY(${(1 - appear) * -10}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: preset.accent,
            boxShadow: `0 0 20px ${preset.accent}`,
          }}
        />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "#FFF3E6",
            textShadow: "0 2px 10px rgba(0,0,0,0.7)",
          }}
        >
          {index} · {text ?? preset.label}
        </span>
      </div>
      <div
        style={{
          marginTop: 7,
          fontFamily: MONO,
          fontSize: 18,
          letterSpacing: "0.14em",
          color: "#FFE8D2",
          opacity: 0.62,
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
        }}
      >
        {motion.toUpperCase()} · {location.toUpperCase()} ·{" "}
        {(durationInFrames / fps).toFixed(1)}S
      </div>
    </div>
  );
};

/* ==================================================================== */
/*  Top-down plate: heads, shadows and props seen from above            */
/* ==================================================================== */

export type TopDownActor = {
  x: number;
  y: number;
  /** Rotation of the head/front direction in degrees (0 = facing down). */
  dir?: number;
  bodyColor?: string;
  hairColor?: string;
  label?: string;
};

export type TopDownPlateProps = {
  location?: LocationId;
  actors?: TopDownActor[];
};

const DEFAULT_TOPDOWN_ACTORS: TopDownActor[] = [
  {
    x: 366,
    y: 1178,
    dir: 34,
    bodyColor: PALETTE.jacketBlue,
    hairColor: PALETTE.hair,
    label: "CHAR 1",
  },
  {
    x: 712,
    y: 1402,
    dir: 212,
    bodyColor: PALETTE.jacketPlum,
    hairColor: PALETTE.hair,
    label: "CHAR 2",
  },
];

const TopDownHead: React.FC<{ actor: TopDownActor; index: number }> = ({
  actor,
  index,
}) => {
  const dir = actor.dir ?? 0;
  const body = actor.bodyColor ?? PALETTE.jacketBlue;
  const hair = actor.hairColor ?? PALETTE.hair;
  const labelOffset = 1;

  return (
    <g transform={`translate(${actor.x} ${actor.y})`}>
      {/* cast shadow */}
      <ellipse cx={16} cy={22} rx={118} ry={92} fill="#000000" opacity={0.42} />
      <ellipse cx={8} cy={12} rx={82} ry={66} fill="#000000" opacity={0.32} />

      {/* shoulders / jacket from above */}
      <g transform={`rotate(${dir})`}>
        <ellipse cx={0} cy={52} rx={104} ry={62} fill={body} stroke={INK} strokeWidth={4} />
        <ellipse cx={-96} cy={44} rx={30} ry={22} fill={body} stroke={INK} strokeWidth={4} />
        <ellipse cx={96} cy={44} rx={30} ry={22} fill={body} stroke={INK} strokeWidth={4} />
        <path d="M -74 34 Q 0 6 74 34" fill="none" stroke={INK} strokeWidth={3} opacity={0.5} />
      </g>

      {/* head top */}
      <circle cx={0} cy={-4} r={64} fill={hair} stroke={INK} strokeWidth={4} />
      <circle cx={-16} cy={-18} r={40} fill="#FFFFFF" opacity={0.05} />
      <path
        d="M -34 -22 C -10 -46 26 -34 30 -8 C 33 16 12 30 -8 24 C -30 18 -40 -4 -30 -16"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={5}
        opacity={0.11}
        strokeLinecap="round"
      />
      {/* the small skin wedge tells us where the face points */}
      <g transform={`rotate(${dir + 180})`}>
        <path
          d="M -20 42 Q 0 64 20 42 Q 0 54 -20 42 Z"
          fill={PALETTE.skin}
          stroke={INK}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <circle cx={0} cy={57} r={5} fill={PALETTE.skin} stroke={INK} strokeWidth={2} />
      </g>

      {actor.label ? (
        <g transform={`translate(${labelOffset * 150} -104)`}>
          <line
            x1={0}
            y1={0}
            x2={labelOffset * -58}
            y2={54}
            stroke="#FFD9A8"
            strokeWidth={2}
            opacity={0.4}
          />
          <circle cx={0} cy={0} r={4} fill="#FFD9A8" opacity={0.65} />
          <text
            x={labelOffset * 10}
            y={-8}
            fill="#FFE3C4"
            fontFamily={MONO}
            fontSize={20}
            fontWeight={700}
            letterSpacing={3}
            textAnchor={labelOffset > 0 ? "start" : "end"}
            opacity={index === 0 ? 0.66 : 0.72}
          >
            {actor.label}
          </text>
        </g>
      ) : null}
    </g>
  );
};

/**
 * Stylised top-down projection of the reference street: asphalt plane,
 * lane paint, light pools, rubble, a burnt tree crown, a road sign and the
 * tops of the characters' heads. Fully deterministic.
 */
export const TopDownPlate: React.FC<TopDownPlateProps> = ({
  location = DEFAULT_LOCATION,
  actors = DEFAULT_TOPDOWN_ACTORS,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const embers = Array.from({ length: 34 }, (_, i) => {
    const baseX = rand(211, i) * WIDTH;
    const speed = 14 + rand(223, i) * 40;
    const y = (rand(227, i) * HEIGHT + t * speed) % HEIGHT;
    const x = baseX + Math.sin(t * 0.6 + i) * 16;
    const r = 1.6 + rand(233, i) * 2.6;
    return { x, y, r, hot: i % 4 === 0 };
  });

  return (
    <AbsoluteFill>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <radialGradient id="tdAsphalt" cx="46%" cy="44%" r="78%">
            <stop offset="0%" stopColor="#39445F" />
            <stop offset="58%" stopColor="#232C42" />
            <stop offset="100%" stopColor="#101521" />
          </radialGradient>
          <radialGradient id="tdPool">
            <stop offset="0%" stopColor="#FFB27A" stopOpacity={0.34} />
            <stop offset="55%" stopColor="#FF8A4C" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#FF8A4C" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="tdTreeShadow">
            <stop offset="0%" stopColor="#05030A" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#05030A" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="tdCurb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A3F55" />
            <stop offset="100%" stopColor="#20263A" />
          </linearGradient>
          <pattern id="tdGrid" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#7FE7C4" strokeWidth={1} opacity={0.06} />
          </pattern>
        </defs>

        {/* asphalt with bleed so handheld drift never shows an edge */}
        <rect x={-160} y={-160} width={WIDTH + 320} height={HEIGHT + 320} fill="url(#tdAsphalt)" />
        <rect x={-160} y={-160} width={WIDTH + 320} height={HEIGHT + 320} fill="url(#tdGrid)" />

        {/* sidewalks */}
        <rect x={-160} y={-160} width={330} height={HEIGHT + 320} fill="#262B3E" opacity={0.9} />
        <rect x={940} y={-160} width={300} height={HEIGHT + 320} fill="#242A3C" opacity={0.9} />
        <rect x={168} y={-160} width={22} height={HEIGHT + 320} fill="url(#tdCurb)" stroke={INK} strokeWidth={4} />
        <rect x={928} y={-160} width={22} height={HEIGHT + 320} fill="url(#tdCurb)" stroke={INK} strokeWidth={4} />

        {/* lane paint - dashed centre line + side lines */}
        <g fill="#C8C2C0" opacity={0.2}>
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={`lane${i}`} x={531} y={-40 + i * 170} width={16} height={92} rx={6} />
          ))}
          <rect x={214} y={-160} width={7} height={HEIGHT + 320} />
          <rect x={896} y={-160} width={7} height={HEIGHT + 320} />
        </g>

        {/* crosswalk near the bottom */}
        <g fill="#D6CFC9" opacity={0.13}>
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={`cw${i}`} x={250 + i * 92} y={1652} width={52} height={186} rx={8} />
          ))}
        </g>

        {/* light pools from the street lamps */}
        <ellipse cx={318} cy={520} rx={330} ry={250} fill="url(#tdPool)" opacity={0.9} />
        <ellipse cx={822} cy={1124} rx={300} ry={230} fill="url(#tdPool)" opacity={0.75} />
        <ellipse cx={430} cy={1780} rx={360} ry={200} fill="url(#tdPool)" opacity={0.5} />

        {/* cracked asphalt */}
        <g fill="none" stroke="#070A12" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.8}>
          <path d="M 238 240 L 300 330 L 282 420 L 350 500 L 330 596" />
          <path d="M 282 420 L 360 446 M 330 596 L 262 640" />
          <path d="M 700 210 L 748 300 L 720 380 L 790 470" />
          <path d="M 720 380 L 650 404" />
          <path d="M 880 640 L 812 700 L 836 780 L 776 860" />
          <path d="M 252 980 L 320 1030 L 300 1120 L 372 1180" />
          <path d="M 640 1500 L 700 1560 L 676 1640 L 742 1700" />
          <path d="M 360 1560 L 420 1620 L 400 1700" />
          <path d="M 860 1420 L 900 1500 L 870 1560" />
        </g>

        {/* ---------- burnt tree seen from above ---------- */}
        <g>
          <ellipse cx={150} cy={742} rx={150} ry={120} fill="url(#tdTreeShadow)" />
          <circle cx={150} cy={726} r={46} fill="#241733" stroke={INK} strokeWidth={4} />
          <g stroke={INK} strokeWidth={17} strokeLinecap="round" fill="none">
            <path d="M 150 704 C 190 664 216 620 226 576" />
            <path d="M 132 710 C 96 676 62 650 24 640" />
            <path d="M 146 690 C 134 646 116 610 88 584" />
            <path d="M 166 700 C 190 672 214 660 244 656" />
            <path d="M 138 730 C 104 740 74 754 46 776" />
          </g>
          <g stroke="#33223F" strokeWidth={11} strokeLinecap="round" fill="none">
            <path d="M 150 704 C 190 664 216 620 226 576" />
            <path d="M 132 710 C 96 676 62 650 24 640" />
            <path d="M 146 690 C 134 646 116 610 88 584" />
            <path d="M 166 700 C 190 672 214 660 244 656" />
            <path d="M 138 730 C 104 740 74 754 46 776" />
          </g>
          <g fill={PALETTE.ember} opacity={0.8}>
            <circle cx={226} cy={576} r={3} />
            <circle cx={24} cy={640} r={2.6} />
            <circle cx={88} cy={584} r={2.4} />
            <circle cx={244} cy={656} r={2.2} />
          </g>
          <text x={250} y={852} fill="#FFE3C4" fontFamily={MONO} fontSize={19} letterSpacing={2.6} opacity={0.55}>
            BURNED TREE
          </text>
        </g>

        {/* ---------- road sign seen from above ---------- */}
        <g transform="translate(858 936) rotate(-18)">
          <ellipse cx={10} cy={16} rx={96} ry={64} fill="#000000" opacity={0.4} />
          <circle cx={0} cy={0} r={13} fill="#2A2C3E" stroke={INK} strokeWidth={4} />
          <rect x={-52} y={-96} width={104} height={148} rx={10} fill="#8F3A2C" stroke={INK} strokeWidth={4} />
          <rect x={-40} y={-84} width={80} height={124} rx={6} fill="#773024" />
          <path
            d="M -18 -32 L 20 -32 M 4 -48 L 22 -32 L 4 -16"
            fill="none"
            stroke="#F4D2A8"
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
          <text x={34} y={-116} fill="#FFE3C4" fontFamily={MONO} fontSize={19} letterSpacing={2.6} opacity={0.55}>
            ROAD SIGN
          </text>
        </g>

        {/* ---------- rubble + manhole ---------- */}
        <g>
          <ellipse cx={812} cy={1728} rx={100} ry={72} fill="#000000" opacity={0.32} />
          <path d="M 748 1746 L 772 1694 L 830 1682 L 874 1718 L 866 1766 L 786 1770 Z" fill="#3C4059" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <path d="M 790 1744 L 812 1708 L 838 1742 Z" fill="#2B2F45" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <path d="M 840 1700 L 876 1672" stroke="#8E5A46" strokeWidth={4} strokeLinecap="round" />
        </g>
        <g>
          <ellipse cx={540} cy={1626} rx={70} ry={52} fill="#000000" opacity={0.36} />
          <circle cx={540} cy={1620} r={62} fill="#141827" stroke={INK} strokeWidth={5} />
          <circle cx={540} cy={1620} r={48} fill="#0D111D" stroke={INK} strokeWidth={2} opacity={0.8} />
          <g stroke={INK} strokeWidth={2} opacity={0.55}>
            <path d="M 492 1620 L 588 1620 M 540 1558 L 540 1682" />
          </g>
        </g>
        <g opacity={0.9}>
          <ellipse cx={252} cy={1522} rx={64} ry={44} fill="#000000" opacity={0.32} />
          <path d="M 212 1546 L 232 1508 L 278 1502 L 302 1528 L 292 1558 Z" fill="#333750" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        </g>

        {/* ---------- actors: tops of heads ---------- */}
        {actors.map((actor, i) => (
          <TopDownHead key={i} actor={actor} index={i} />
        ))}

        {/* drifting embers over the plate */}
        {embers.map((e, i) => (
          <g key={`em${i}`} opacity={e.hot ? 0.8 : 0.45}>
            <circle cx={e.x} cy={e.y} r={e.r * 3.4} fill={PALETTE.emberHot} opacity={0.12} />
            <circle cx={e.x} cy={e.y} r={e.r} fill={e.hot ? PALETTE.ember : PALETTE.ash} />
          </g>
        ))}

        {/* plate footer */}
        <text
          x={WIDTH / 2}
          y={1856}
          fill="#7FE7C4"
          fontFamily={MONO}
          fontSize={15}
          letterSpacing={5}
          textAnchor="middle"
          opacity={0.45}
        >
          {location.toUpperCase()} · TOP VIEW · {t.toFixed(1)}S
        </text>
      </svg>
    </AbsoluteFill>
  );
};

/* ==================================================================== */
/*  Tactical map plate                                                  */
/* ==================================================================== */

export type TacticalMapProps = {
  location?: LocationId;
  /** Marker position on the map (plate coordinates). */
  target?: ShotTarget;
  title?: string;
};

const pointOnPolyline = (
  points: ReadonlyArray<readonly [number, number]>,
  progress: number,
): [number, number] => {
  if (points.length === 0) return [0, 0];
  const total = points.length - 1;
  const scaled = clamp01(progress) * total;
  const index = Math.min(total - 1, Math.floor(scaled));
  const local = scaled - index;
  const a = points[index];
  const b = points[index + 1] ?? a;
  return [lerp(a[0], b[0], local), lerp(a[1], b[1], local)];
};

const MapMarker: React.FC<{
  x: number;
  y: number;
  color: string;
  frame: number;
  label: string;
  align?: "left" | "right";
  progress?: number;
}> = ({ x, y, color, frame, label, align = "right", progress = 1 }) => {
  const pulse = 0.6 + 0.4 * Math.sin(frame * 0.12);
  const ripple = (frame % 54) / 54;
  const labelX = align === "right" ? x + 46 : x - 46;

  return (
    <g opacity={progress}>
      <circle cx={x} cy={y} r={44 + ripple * 44} fill="none" stroke={color} strokeWidth={2} opacity={(1 - ripple) * 0.5} />
      <circle cx={x} cy={y} r={26} fill="none" stroke={color} strokeWidth={3} opacity={0.85} />
      <circle cx={x} cy={y} r={11} fill={color} opacity={0.9} />
      <circle cx={x} cy={y} r={5} fill="#04120C" />
      <circle cx={x} cy={y} r={14} fill={color} opacity={0.18 * pulse} />
      <text
        x={labelX}
        y={y + 8}
        fill={color}
        fontFamily={MONO}
        fontSize={22}
        fontWeight={700}
        letterSpacing={2.6}
        textAnchor={align === "right" ? "start" : "end"}
      >
        {label}
      </text>
      <line x1={x} y1={y - 30} x2={x} y2={y - 62} stroke={color} strokeWidth={2} opacity={0.5} />
    </g>
  );
};

/**
 * Infographic tactical map: grid, city blocks, animated vector routes,
 * pulsing target markers and Ukrainian labels. Deterministic per frame.
 */
export const TacticalMap: React.FC<TacticalMapProps> = ({
  location = DEFAULT_LOCATION,
  target = { x: 742, y: 812 },
  title = "СЕКТОР 07",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const accent = "#5BE7A9";
  const warning = "#FF7A55";
  const routeA = "#FFB01F";

  const mx = clamp(target.x, 200, 900);
  const my = clamp(target.y, 520, 1500);
  const route: ReadonlyArray<readonly [number, number]> = [
    [142, 1638],
    [236, 1552],
    [268, 1408],
    [392, 1300],
    [476, 1146],
    [622, 1072],
    [684, 922],
    [mx, my],
  ];
  const routeB: ReadonlyArray<readonly [number, number]> = [
    [900, 1706],
    [818, 1612],
    [790, 1440],
    [842, 1284],
    [806, 1120],
    [mx, my],
  ];

  const routeLength = 2200;
  const dashOffset = -(frame * 7) % 64;
  const dotA = pointOnPolyline(route, ((frame / (fps * 4)) % 1 + 1) % 1);
  const dotB = pointOnPolyline(routeB, ((frame / (fps * 5) + 0.35) % 1 + 1) % 1);
  const scanY = (frame * 8) % (HEIGHT + 200) - 100;
  const link = 0.9 + Math.sin(frame * 0.18) * 0.1;

  const blocks = Array.from({ length: 13 }, (_, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const w = 130 + rand(311, i) * 90;
    const h = 150 + rand(317, i) * 120;
    return {
      x: 290 + col * 178 + rand(313, i) * 24,
      y: 360 + row * 330 + rand(323, i) * 40,
      w,
      h,
      rot: (rand(331, i) - 0.5) * 6,
      hatch: i % 3 === 0,
    };
  });

  return (
    <AbsoluteFill>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#041019" />
            <stop offset="52%" stopColor="#061722" />
            <stop offset="100%" stopColor="#030A10" />
          </linearGradient>
          <pattern id="mapGrid" width="90" height="90" patternUnits="userSpaceOnUse">
            <path d="M 90 0 L 0 0 0 90" fill="none" stroke={accent} strokeWidth={1} opacity={0.1} />
          </pattern>
          <pattern id="mapHatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="12" stroke={accent} strokeWidth={2} opacity={0.16} />
          </pattern>
          <radialGradient id="mapGlow" cx="50%" cy="48%" r="65%">
            <stop offset="0%" stopColor={accent} stopOpacity={0.08} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="mapVignette" cx="50%" cy="48%" r="72%">
            <stop offset="50%" stopColor="#02060A" stopOpacity={0} />
            <stop offset="100%" stopColor="#02060A" stopOpacity={0.88} />
          </radialGradient>
          <filter id="mapSoftGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <rect x={-140} y={-140} width={WIDTH + 280} height={HEIGHT + 280} fill="url(#mapBg)" />
        <rect x={-140} y={-140} width={WIDTH + 280} height={HEIGHT + 280} fill="url(#mapGrid)" />

        {/* river / dry canal */}
        <path
          d="M -40 1460 C 180 1390 260 1520 430 1460 C 620 1394 760 1520 1120 1430 L 1120 1560 C 760 1650 620 1524 430 1592 C 260 1652 180 1520 -40 1590 Z"
          fill="#0B2C33"
          opacity={0.55}
        />
        <path
          d="M -40 1460 C 180 1390 260 1520 430 1460 C 620 1394 760 1520 1120 1430"
          fill="none"
          stroke={accent}
          strokeWidth={2}
          opacity={0.3}
        />

        {/* city blocks */}
        <g>
          {blocks.map((b, i) => (
            <g key={`blk${i}`} transform={`rotate(${b.rot} ${b.x + b.w / 2} ${b.y + b.h / 2})`}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={10}
                fill={b.hatch ? "url(#mapHatch)" : "#0A1A26"}
                stroke="#1E3547"
                strokeWidth={2.5}
                opacity={b.hatch ? 1 : 0.85}
              />
            </g>
          ))}
        </g>

        {/* street grid */}
        <g stroke="#122A38" strokeWidth={18} opacity={0.9} fill="none">
          <path d="M 268 200 L 268 1800" />
          <path d="M 446 200 L 446 1800" />
          <path d="M 624 200 L 624 1800" />
          <path d="M 802 200 L 802 1800" />
          <path d="M 100 480 L 980 480" />
          <path d="M 100 810 L 980 810" />
          <path d="M 100 1140 L 980 1140" />
          <path d="M 100 1630 L 980 1630" />
        </g>
        <g stroke={accent} strokeWidth={1.2} opacity={0.12} fill="none">
          <path d="M 268 200 L 268 1800" />
          <path d="M 446 200 L 446 1800" />
          <path d="M 624 200 L 624 1800" />
          <path d="M 802 200 L 802 1800" />
          <path d="M 100 480 L 980 480" />
          <path d="M 100 810 L 980 810" />
          <path d="M 100 1140 L 980 1140" />
          <path d="M 100 1630 L 980 1630" />
        </g>

        <rect width={WIDTH} height={HEIGHT} fill="url(#mapGlow)" />

        {/* routes */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline
            points={route.map((p) => p.join(",")).join(" ")}
            stroke={routeA}
            strokeWidth={9}
            opacity={0.14}
            filter="url(#mapSoftGlow)"
          />
          <polyline
            points={route.map((p) => p.join(",")).join(" ")}
            stroke={routeA}
            strokeWidth={4}
            strokeDasharray="26 22"
            strokeDashoffset={dashOffset}
            opacity={0.92}
          />
          <polyline
            points={routeB.map((p) => p.join(",")).join(" ")}
            stroke={accent}
            strokeWidth={3}
            strokeDasharray="12 16"
            strokeDashoffset={-dashOffset * 0.8}
            opacity={0.55}
          />
        </g>

        {/* moving convoy dots */}
        <g>
          <circle cx={dotA[0]} cy={dotA[1]} r={18} fill={routeA} opacity={0.2} />
          <circle cx={dotA[0]} cy={dotA[1]} r={7} fill={routeA} />
          <circle cx={dotB[0]} cy={dotB[1]} r={16} fill={accent} opacity={0.18} />
          <circle cx={dotB[0]} cy={dotB[1]} r={6} fill={accent} />
        </g>

        {/* danger zone */}
        <g>
          <path
            d="M 424 1016 L 486 1122 L 362 1122 Z"
            fill={warning}
            fillOpacity={0.12}
            stroke={warning}
            strokeWidth={3}
          />
          <text
            x={424}
            y={1100}
            fill={warning}
            fontFamily={MONO}
            fontSize={26}
            fontWeight={700}
            textAnchor="middle"
          >
            !
          </text>
          <text
            x={506}
            y={1082}
            fill={warning}
            fontFamily={MONO}
            fontSize={20}
            letterSpacing={2.4}
            opacity={0.8}
          >
            НЕБЕЗПЕКА
          </text>
        </g>

        {/* entry + target markers */}
        <MapMarker x={142} y={1638} color={accent} frame={frame} label="ТОЧКА ВХОДУ" align="right" />
        <MapMarker x={mx} y={my} color={routeA} frame={frame} label="ЦІЛЬ 01" align={mx > 760 ? "left" : "right"} />

        {/* header */}
        <g>
          <text x={54} y={258} fill="#EAF7F0" fontFamily={DISPLAY} fontSize={56} fontWeight={900} letterSpacing={1}>
            {title}
          </text>
          <text x={56} y={302} fill={accent} fontFamily={MONO} fontSize={20} letterSpacing={5} opacity={0.8}>
            ТАКТИЧНА КАРТА · {location.toUpperCase()}
          </text>
          <line x1={56} y1={332} x2={392} y2={332} stroke={accent} strokeWidth={2} opacity={0.4} />
        </g>

        {/* live badge */}
        <g transform="translate(806 128)">
          <circle cx={0} cy={0} r={11} fill={warning} opacity={0.85} />
          <circle cx={0} cy={0} r={20} fill="none" stroke={warning} strokeWidth={2} opacity={0.3 * link} />
          <text x={30} y={8} fill="#FFE3C4" fontFamily={MONO} fontSize={20} letterSpacing={3}>
            LIVE
          </text>
          <text x={0} y={44} fill={accent} fontFamily={MONO} fontSize={16} letterSpacing={2} opacity={0.7}>
            SAT-LINK 98%
          </text>
        </g>

        {/* compass */}
        <g transform="translate(920 286)">
          <circle cx={0} cy={0} r={64} fill="#041019" fillOpacity={0.5} stroke={accent} strokeWidth={2} opacity={0.7} />
          <circle cx={0} cy={0} r={46} fill="none" stroke={accent} strokeWidth={1} opacity={0.24} />
          <path d="M 0 -40 L 12 10 L 0 2 L -12 10 Z" fill={warning} opacity={0.9} />
          <text x={0} y={-46} fill="#EAF7F0" fontFamily={MONO} fontSize={17} textAnchor="middle" letterSpacing={2}>
            N
          </text>
        </g>

        {/* timestamp + scale bar */}
        <g>
          <text x={54} y={1770} fill="#EAF7F0" fontFamily={MONO} fontSize={22} letterSpacing={3} opacity={0.7}>
            T+{(t).toFixed(1)}S · GRID 90M
          </text>
          <line x1={54} y1={1812} x2={274} y2={1812} stroke={accent} strokeWidth={3} opacity={0.75} />
          <line x1={54} y1={1798} x2={54} y2={1826} stroke={accent} strokeWidth={3} opacity={0.75} />
          <line x1={274} y1={1798} x2={274} y2={1826} stroke={accent} strokeWidth={3} opacity={0.75} />
          <text x={54} y={1852} fill={accent} fontFamily={MONO} fontSize={17} letterSpacing={2} opacity={0.65}>
            0 · 50 М
          </text>
          <text x={1026} y={1812} fill={accent} fontFamily={MONO} fontSize={17} letterSpacing={2} textAnchor="end" opacity={0.6}>
            CONVOY 02/03
          </text>
        </g>

        {/* scanline sweep */}
        <rect
          x={0}
          y={scanY - 60}
          width={WIDTH}
          height={120}
          fill={accent}
          opacity={0.05}
        />

        {/* frame + vignette */}
        <rect x={26} y={26} width={WIDTH - 52} height={HEIGHT - 52} fill="none" stroke={accent} strokeWidth={2} opacity={0.22} />
        <g stroke={accent} strokeWidth={4} opacity={0.55} fill="none">
          <path d="M 26 86 L 26 26 L 86 26" />
          <path d={`M ${WIDTH - 86} 26 L ${WIDTH - 26} 26 L ${WIDTH - 26} 86`} />
          <path d={`M 26 ${HEIGHT - 86} L 26 ${HEIGHT - 26} L 86 ${HEIGHT - 26}`} />
          <path d={`M ${WIDTH - 86} ${HEIGHT - 26} L ${WIDTH - 26} ${HEIGHT - 26} L ${WIDTH - 26} ${HEIGHT - 86}`} />
        </g>
        <rect width={WIDTH} height={HEIGHT} fill="url(#mapVignette)" opacity={0.7} />
        <text x={WIDTH / 2} y={HEIGHT - 44} fill={accent} fontFamily={MONO} fontSize={14} letterSpacing={6} textAnchor="middle" opacity={0.35}>
          POPSIKOS TACTICAL NETWORK · {routeLength} M ROUTE
        </text>
      </svg>
    </AbsoluteFill>
  );
};
