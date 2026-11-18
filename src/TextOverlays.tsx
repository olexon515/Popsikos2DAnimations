import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Viral vertical typography for 1080x1920.
 *
 * Both components are pure CSS text (no bitmap assets), use a local heavy sans
 * stack (Arial Black / Segoe UI Black / Impact), and fake a real comic outline
 * by stacking a stroked copy behind the filled copy - cleaner than
 * -webkit-text-stroke alone, which is centred and eats into the glyph.
 */

const FONT_FAMILY =
  '"Arial Black", "Segoe UI Black", "Impact", "Montserrat", sans-serif';

const INK = "#08060D";
const PAPER = "#FFF8EE";
const ACCENT_GRADIENT =
  "linear-gradient(180deg, #FFE566 0%, #FFB01F 48%, #FF6A1A 100%)";

/** Ukrainian + Latin letters and digits survive; everything else is dropped. */
const PUNCTUATION = /[^\u0041-\u005A\u0061-\u007A\u0030-\u0039\u0410-\u044F\u0406\u0456\u0407\u0457\u0404\u0454\u0490\u0491]/g;

/** Compare words ignoring case and punctuation ("СОНЦЯ..." === "сонця"). */
const bare = (word: string): string => word.replace(PUNCTUATION, "").toUpperCase();

const splitWords = (text: string): string[] => text.split(/\s+/).filter(Boolean);

type Pop = {
  scale: number;
  translateY: number;
  rotate: number;
  opacity: number;
};

/** Punchy spring entrance: overshoots slightly, then settles. */
const popIn = (frame: number, fps: number, delay: number, fromScale: number): Pop => {
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 11, mass: 0.55, stiffness: 140 },
  });

  return {
    scale: fromScale + (1 - fromScale) * progress,
    translateY: (1 - progress) * 46,
    rotate: (1 - progress) * -4,
    opacity: Math.max(0, Math.min(1, progress * 1.7)),
  };
};

/**
 * One word with a thick comic outline and an optional accent gradient.
 * The stroked copy is absolutely positioned behind the real text, so layout
 * is driven only by the filled copy and nothing shifts while animating.
 */
const OutlinedWord: React.FC<{
  text: string;
  accent?: boolean;
  stroke: number;
  glow?: boolean;
}> = ({ text, accent = false, stroke, glow = false }) => (
  <span
    style={{
      display: "inline-block",
      position: "relative",
      whiteSpace: "nowrap",
      filter: glow ? "drop-shadow(0 0 22px rgba(255, 150, 40, 0.55))" : undefined,
    }}
  >
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        whiteSpace: "nowrap",
        color: "transparent",
        WebkitTextStroke: `${stroke}px ${INK}`,
      }}
    >
      {text}
    </span>
    <span
      style={{
        position: "relative",
        whiteSpace: "nowrap",
        color: accent ? "transparent" : PAPER,
        backgroundImage: accent ? ACCENT_GRADIENT : undefined,
        WebkitBackgroundClip: accent ? "text" : undefined,
        WebkitTextFillColor: accent ? "transparent" : undefined,
        textShadow: accent ? undefined : "0 3px 0 rgba(8, 6, 13, 0.35)",
      }}
    >
      {text}
    </span>
  </span>
);

export type HookTitleProps = {
  /** Full headline, e.g. "ДЕНЬ 1: НЕБО ПОЧЕРВОНІЛО". Text before ":" becomes a badge. */
  text: string;
  /** Word(s) painted with the hot orange/yellow gradient. */
  highlight?: string;
  /** Distance from the top of the frame, in px. */
  top?: number;
  /** Entrance delay, in frames (relative to the enclosing Sequence). */
  delay?: number;
  /** Frame at which the title starts to leave. Omit to keep it until the cut. */
  exitAt?: number;
  fontSize?: number;
};

export const HookTitle: React.FC<HookTitleProps> = ({
  text,
  highlight = "",
  top = 140,
  delay = 0,
  exitAt,
  fontSize = 96,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colon = text.indexOf(":");
  const kicker = colon >= 0 ? text.slice(0, colon + 1).trim() : null;
  const body = colon >= 0 ? text.slice(colon + 1).trim() : text;
  const words = splitWords(body);

  const accented = new Set(splitWords(highlight).map(bare));

  const exit =
    exitAt === undefined
      ? 1
      : interpolate(frame, [exitAt, exitAt + 14], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const kickerPop = popIn(frame, fps, delay, 0.7);

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: "0 44px",
        fontFamily: FONT_FAMILY,
        fontWeight: 900,
        textTransform: "uppercase",
        textAlign: "center",
        pointerEvents: "none",
        opacity: exit,
        transform: `translateY(${(1 - exit) * -36}px) scale(${1 + (1 - exit) * 0.05})`,
        transformOrigin: "50% 0%",
      }}
    >
      {kicker ? (
        <div
          style={{
            transform: `translateY(${kickerPop.translateY * 0.6}px) scale(${kickerPop.scale}) rotate(${kickerPop.rotate * 0.5}deg)`,
            opacity: kickerPop.opacity,
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "10px 28px 12px",
              borderRadius: 18,
              background:
                "linear-gradient(180deg, rgba(26, 16, 30, 0.94) 0%, rgba(10, 7, 15, 0.96) 100%)",
              border: "3px solid #FFC21F",
              boxShadow:
                "0 8px 0 rgba(8, 6, 13, 0.65), 0 18px 28px rgba(0, 0, 0, 0.45)",
              color: "#FFD86B",
              fontSize: 46,
              lineHeight: 1,
              letterSpacing: "0.09em",
            }}
          >
            {kicker}
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          columnGap: "0.26em",
          rowGap: 0,
          maxWidth: 1000,
          fontSize,
          lineHeight: 1.02,
          letterSpacing: "-0.018em",
          filter:
            "drop-shadow(0 10px 0 rgba(8, 6, 13, 0.4)) drop-shadow(0 26px 34px rgba(0, 0, 0, 0.5))",
        }}
      >
        {words.map((word, i) => {
          const pop = popIn(frame, fps, delay + 4 + i * 3, 1.55);
          const accent = accented.has(bare(word));

          return (
            <span
              key={`${word}-${i}`}
              style={{
                display: "inline-block",
                transformOrigin: "50% 100%",
                opacity: pop.opacity,
                transform: `translateY(${pop.translateY}px) scale(${pop.scale}) rotate(${pop.rotate}deg)`,
              }}
            >
              <OutlinedWord text={word} accent={accent} stroke={22} glow={accent} />
            </span>
          );
        })}
      </div>
    </div>
  );
};

export type DynamicCaptionProps = {
  /** Short phrase, 2-4 words. */
  text: string;
  /** Key words to highlight with the accent gradient. */
  highlight?: string[];
  /** CSS top offset; the block is vertically centred on this line. */
  top?: number | string;
  delay?: number;
  exitAt?: number;
  fontSize?: number;
};

export const DynamicCaption: React.FC<DynamicCaptionProps> = ({
  text,
  highlight = [],
  top = "48%",
  delay = 0,
  exitAt,
  fontSize = 72,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = splitWords(text);
  const accented = new Set(
    highlight.flatMap((entry) => splitWords(entry)).map(bare),
  );

  const exit =
    exitAt === undefined
      ? 1
      : interpolate(frame, [exitAt, exitAt + 12], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        padding: "0 44px",
        transform: "translateY(-50%)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          columnGap: "0.3em",
          rowGap: "0.06em",
          margin: "0 auto",
          width: "fit-content",
          maxWidth: 992,
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          textTransform: "uppercase",
          fontSize,
          lineHeight: 1.06,
          letterSpacing: "0.004em",
          textAlign: "center",
          opacity: exit,
          transform: `translateY(${(1 - exit) * -26}px) scale(${1 - (1 - exit) * 0.04})`,
          filter:
            "drop-shadow(0 9px 0 rgba(8, 6, 13, 0.4)) drop-shadow(0 22px 30px rgba(0, 0, 0, 0.55))",
        }}
      >
        {/* soft scrim so the line reads over flashes and faces */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: "-26px -46px",
            borderRadius: 48,
            background:
              "radial-gradient(120% 100% at 50% 50%, rgba(6, 4, 10, 0.52) 0%, rgba(6, 4, 10, 0.3) 58%, rgba(6, 4, 10, 0) 100%)",
            zIndex: -1,
          }}
        />

        {words.map((word, i) => {
          const pop = popIn(frame, fps, delay + i * 2, 0.85);
          const accent = accented.has(bare(word));

          return (
            <span
              key={`${word}-${i}`}
              style={{
                display: "inline-block",
                transformOrigin: "50% 100%",
                opacity: pop.opacity,
                transform: `translateY(${pop.translateY * 0.65}px) scale(${pop.scale})`,
              }}
            >
              <OutlinedWord text={word} accent={accent} stroke={14} glow={accent} />
            </span>
          );
        })}
      </div>
    </div>
  );
};
