import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Loop,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Camera, Layer } from "./Camera";
import { Character, MouthType } from "./Character";
import { DIALOGUE, HAS_DIALOGUE, isSpeaking } from "./dialogueTimeline";
import { DURATION, HEIGHT, PALETTE, WIDTH } from "./palette";
import { DynamicCaption, HookTitle } from "./TextOverlays";
import { DEFAULT_LOCATION, LocationId, getLocation } from "./locations";

const EASE = Easing.bezier(0.42, 0, 0.28, 1);

/** Base shot durations scale proportionally with TOTAL_FRAMES. */
const SHOT1 = Math.round(DURATION * (120 / 360));
const SHOT2 = Math.round(DURATION * (120 / 360));
const SHOT3 = DURATION - SHOT1 - SHOT2;
const CUT1 = SHOT1;
const CUT2 = SHOT1 + SHOT2;
const WIND_LOOP_FRAMES = 360;

const World: React.FC<{
  camera: Camera;
  flash?: number;
  location?: LocationId;
  children: React.ReactNode;
}> = ({ camera, flash = 0, location = DEFAULT_LOCATION, children }) => {
  const { Sky, Horizon, Ground, Midground, Embers, dustBandBackground } = getLocation(location);
  const bandBackground =
    dustBandBackground ??
    "linear-gradient(to bottom, rgba(255,107,61,0) 62%, rgba(255,138,76,0.14) 82%, rgba(255,138,76,0) 100%)";

  return (
    <>
      <Sky camera={camera} flash={flash} />
      <Horizon camera={camera} />
      {/* the floor must sit under the standing props */}
      <Ground camera={camera} />
      <Midground camera={camera} />
      {/* thin dust band that separates the prop plane from the actors */}
      <Layer camera={camera} depth={0.92}>
        <AbsoluteFill
          style={{
            background: bandBackground,
          }}
        />
      </Layer>
      <Layer camera={camera} depth={1}>
        {children}
      </Layer>
      <Embers camera={camera} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 0 - 1/3 duration : wide street, slow dolly in                       */
/* ------------------------------------------------------------------ */
const ShotWide: React.FC<{ from: number; durationInFrames: number; location?: LocationId }> = ({
  from,
  durationInFrames: dur,
  location = DEFAULT_LOCATION,
}) => {
  const frame = useCurrentFrame();
  const last = Math.max(1, dur - 1);

  const zoom = interpolate(frame, [0, last], [1.0, 1.12], {
    easing: EASE,
    extrapolateRight: "clamp",
  });
  const panX = interpolate(frame, [0, last], [26, -24], { easing: EASE });
  const panY = interpolate(frame, [0, last], [-8, 16], { easing: EASE });

  const camera: Camera = { zoom, panX, panY, shakeX: 0, shakeY: 0 };
  const globalFrame = from + frame;

  return (
    <World camera={camera} location={location}>
      {/* Char 1 - calm, watching the sky */}
      <Character
        x={298}
        y={1632}
        scale={1.05}
        eyeType="normal"
        pupilOffset={{ x: -2, y: -6 }}
        mouthType="closed"
        isTalking={isSpeaking("char1", globalFrame)}
        sunSide="right"
        breathePhase={0}
        bodyColor={PALETTE.jacketBlue}
      />
      {/* Char 2 - already uneasy, glancing at Char 1 */}
      <Character
        x={792}
        y={1668}
        scale={1.0}
        flipX
        eyeType="squint"
        pupilOffset={{ x: 6, y: 1 }}
        mouthType="half"
        isTalking={isSpeaking("char2", globalFrame)}
        sunSide="left"
        breathePhase={2.1}
        bodyColor={PALETTE.jacketPlum}
      />
    </World>
  );
};

/* ------------------------------------------------------------------ */
/* 1/3 - 2/3 duration : close up on Char 1, sky detonates             */
/* ------------------------------------------------------------------ */
const ShotScream: React.FC<{ from: number; durationInFrames: number; location?: LocationId }> = ({
  from,
  durationInFrames: dur,
  location = DEFAULT_LOCATION,
}) => {
  const frame = useCurrentFrame();
  const last = Math.max(1, dur - 1);

  const zoom = interpolate(frame, [0, last], [1.42, 1.52], { easing: EASE });

  const shakeAmp = interpolate(
    frame,
    [0, 6, 26, 60, Math.min(119, last)],
    [16, 30, 12, 5, 2.5],
    { extrapolateRight: "clamp" }
  );
  const shakeX = Math.sin(frame * 2.1) * shakeAmp + Math.sin(frame * 4.7) * shakeAmp * 0.35;
  const shakeY = Math.cos(frame * 2.7) * shakeAmp + Math.cos(frame * 5.3) * shakeAmp * 0.3;

  const flash =
    interpolate(
      frame,
      [0, 3, 14, 45, Math.min(119, last)],
      [0, 1, 0.72, 0.4, 0.22],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    ) * (0.92 + 0.08 * Math.sin(frame * 1.9));

  // Lift the close-up so the 48% caption band lands below the chin.
  const panY = interpolate(frame, [0, last], [360, 396], { easing: EASE });

  const camera: Camera = { zoom, panX: 0, panY, shakeX, shakeY };
  const globalFrame = from + frame;

  const shocked = frame >= 10;
  const screaming = frame >= 13;

  const narratorTalking = isSpeaking("narrator", globalFrame);
  const char1Talking = isSpeaking("char1", globalFrame);

  let mouthType: MouthType = "closed";
  if (HAS_DIALOGUE) {
    if (narratorTalking) {
      mouthType = "closed";
    } else if (char1Talking) {
      mouthType = "half";
    } else if (screaming) {
      mouthType = "scream";
    } else {
      mouthType = "closed";
    }
  } else {
    mouthType = screaming ? "scream" : "closed";
  }

  return (
    <World camera={camera} flash={flash} location={location}>
      <Character
        x={540}
        y={1902}
        scale={2.05}
        eyeType={shocked ? "wide" : "normal"}
        pupilOffset={{ x: Math.sin(frame * 0.7) * 1.4, y: -4 }}
        mouthType={mouthType}
        isTalking={char1Talking}
        sunSide="right"
        breathePhase={0.4}
        bodyColor={PALETTE.jacketBlue}
      />
      {/* the blast washes over the whole frame */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          mixBlendMode: "screen",
          opacity: flash * 0.3,
          background:
            "radial-gradient(120% 80% at 74% 52%, #FFB067 0%, #FF7A3D 38%, rgba(255,92,45,0) 72%)",
        }}
      />
    </World>
  );
};

/* ------------------------------------------------------------------ */
/* 2/3 - end : close up on Char 2, smug, camera pulls back            */
/* ------------------------------------------------------------------ */
const ShotTalk: React.FC<{ from: number; durationInFrames: number; location?: LocationId }> = ({
  from,
  durationInFrames: dur,
  location = DEFAULT_LOCATION,
}) => {
  const frame = useCurrentFrame();
  const last = Math.max(1, dur - 1);

  const zoom = interpolate(frame, [0, last], [1.22, 1.0], { easing: EASE });
  const panX = interpolate(frame, [0, last], [-20, 14], { easing: EASE });
  // Same headroom rule as the scream shot: keep the 48% band clear of the face.
  const panY = interpolate(frame, [0, last], [336, 300], { easing: EASE });

  const camera: Camera = { zoom, panX, panY, shakeX: 0, shakeY: 0 };
  const globalFrame = from + frame;

  const narratorTalking = isSpeaking("narrator", globalFrame);
  const char2Talking = isSpeaking("char2", globalFrame);
  const talking = narratorTalking ? false : HAS_DIALOGUE ? char2Talking : frame >= 46;

  return (
    <World camera={camera} location={location}>
      <Character
        x={548}
        y={1896}
        scale={2.0}
        flipX
        eyeType="squint"
        pupilOffset={{ x: 6, y: 1 }}
        mouthType="smirk"
        isTalking={talking}
        sunSide="right"
        breathePhase={1.2}
        bodyColor={PALETTE.jacketPlum}
      />
    </World>
  );
};

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

export const MainScene: React.FC<MainSceneProps> = ({ location = DEFAULT_LOCATION }) => {
  const titleDur = Math.min(SHOT1, 120);
  const caption1From = CUT1 + 8;
  const caption1Dur = Math.min(SHOT2 - 8, 112);
  const caption2From = CUT2 + 10;
  const caption2Dur = Math.max(1, Math.min(SHOT3 - 10, 110));

  const sirenDur = Math.max(1, Math.min(108, SHOT2 - 12));

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.shadow, overflow: "hidden" }}>
      <Sequence durationInFrames={SHOT1} name="Wide street">
        <ShotWide from={0} durationInFrames={SHOT1} location={location} />
      </Sequence>
      <Sequence from={CUT1} durationInFrames={SHOT2} name="Char 1 screams">
        <ShotScream from={CUT1} durationInFrames={SHOT2} location={location} />
      </Sequence>
      <Sequence from={CUT2} durationInFrames={SHOT3} name="Char 2 talks">
        <ShotTalk from={CUT2} durationInFrames={SHOT3} location={location} />
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

      {/* SFX sequence hits */}
      <Sequence from={2} durationInFrames={5} name="Audio: title pop">
        <Audio src={staticFile("sfx/pop.wav")} volume={0.7} />
      </Sequence>

      <Sequence from={Math.max(0, CUT1 - 2)} durationInFrames={9} name="Audio: glitch cut 1">
        <Audio src={staticFile("sfx/glitch.wav")} volume={0.3} />
      </Sequence>

      <Sequence from={CUT1} durationInFrames={75} name="Audio: explosion">
        <Audio src={staticFile("sfx/explosion.wav")} volume={0.8} />
      </Sequence>

      <Sequence from={CUT1 + 12} durationInFrames={sirenDur} name="Audio: siren">
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

      <Sequence from={caption1From} durationInFrames={5} name="Audio: caption pop 1">
        <Audio src={staticFile("sfx/pop.wav")} volume={0.45} />
      </Sequence>

      <Sequence from={Math.max(0, CUT2 - 4)} durationInFrames={9} name="Audio: glitch cut 2">
        <Audio src={staticFile("sfx/glitch.wav")} volume={0.3} />
      </Sequence>

      <Sequence from={Math.max(0, CUT2 - 2)} durationInFrames={15} name="Audio: whoosh">
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.6} />
      </Sequence>

      <Sequence from={caption2From} durationInFrames={5} name="Audio: caption pop 2">
        <Audio src={staticFile("sfx/pop.wav")} volume={0.5} />
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
      {/* viral type: hook title + two dynamic captions                     */}
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

      <Sequence from={caption1From} durationInFrames={caption1Dur} name="Caption: not a sunset">
        <DynamicCaption
          text="ЦЕ НЕ ЗАХІД СОНЦЯ..."
          highlight={["НЕ ЗАХІД"]}
          top="48%"
          delay={2}
          exitAt={Math.max(10, Math.round(caption1Dur * 0.82))}
        />
      </Sequence>

      <Sequence from={caption2From} durationInFrames={caption2Dur} name="Caption: he knew">
        <DynamicCaption
          text="ВІН ЗНАВ ПРО ЦЕ"
          highlight={["ЗНАВ"]}
          top="48%"
          delay={2}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
