#!/usr/bin/env python3
"""
build_dialogue.py - multi-voice dialogue timeline + per-speaker lip-sync envelopes.

Scans public/voices/ for files named <NN>_<speaker>.<ext> (01_narrator.mp3,
02_char1.mp3, 03_char2.mp3, ...), measures every file with ffprobe, inserts a
0.25 s natural pause between lines and writes src/dialogueTimeline.ts with:

  * TOTAL_FRAMES       - composition length (never shorter than 1800 = 60 s @ 30 fps)
  * DIALOGUE           - ordered lines: startFrame, durationInFrames, speaker, file
  * ENVELOPES          - one 0/1 speech envelope per speaker on the global clock
  * isSpeaking()       - helper used by the shots for lip-sync
  * HAS_DIALOGUE       - false when public/voices/ is empty

The envelopes are measured from the audio itself (RMS per frame, thresholded and
held for a couple of frames), so char1's mouth only moves on char1 lines, char2's
only on char2 lines, and narrator lines leave both mouths closed.

Run from the project root:

    python build_dialogue.py

Requires ffmpeg + ffprobe in PATH and Python 3.9+ with numpy.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
VOICES_DIR = os.path.join(ROOT, "public", "voices")
OUT_FILE = os.path.join(ROOT, "src", "dialogueTimeline.ts")

FPS = 30
PAUSE_SECONDS = 0.25          # natural breath between two lines
MIN_TOTAL_FRAMES = 60 * FPS   # a voice-less clip is still 60 s long
TAIL_FRAMES = 30              # 1 s of picture after the last word
ANALYSIS_SR = 16000           # mono analysis rate (cheap, plenty for RMS)
HOLD_RADIUS = 2               # frames added around every detected syllable

AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".opus", ".webm"}
DEFAULT_SPEAKERS = ["narrator", "char1", "char2"]
NAME_RE = re.compile(r"^(?:\d+)[\s._-]*(?P<speaker>.+)$")


# --------------------------------------------------------------------------- #
# tooling
# --------------------------------------------------------------------------- #
def tool(name: str) -> str:
    path = shutil.which(name)
    if path is None:
        sys.exit(
            f"[build_dialogue] '{name}' not found in PATH. "
            "Install ffmpeg or fix the PATH before running this script."
        )
    return path


FFMPEG = tool("ffmpeg")
FFPROBE = tool("ffprobe")


def probe_duration(path: str) -> float:
    """Exact media duration in seconds, straight from ffprobe."""
    result = subprocess.run(
        [
            FFPROBE, "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=nw=1:nk=1",
            path,
        ],
        capture_output=True,
        check=True,
    )
    raw = result.stdout.decode("utf-8", "replace").strip()
    try:
        return max(0.0, float(raw))
    except ValueError:
        sys.exit(f"[build_dialogue] ffprobe returned no duration for {path!r}: {raw!r}")


def decode_mono(path: str) -> np.ndarray:
    """Decode any supported file to float32 mono at ANALYSIS_SR (no temp files)."""
    result = subprocess.run(
        [
            FFMPEG, "-v", "error", "-nostdin",
            "-i", path,
            "-ac", "1", "-ar", str(ANALYSIS_SR),
            "-f", "s16le", "-",
        ],
        capture_output=True,
        check=True,
    )
    return np.frombuffer(result.stdout, dtype="<i2").astype(np.float32) / 32768.0


def speech_bits(path: str, duration: float) -> list[int]:
    """One 0/1 flag per video frame: is this frame loud enough to move a mouth?"""
    pcm = decode_mono(path)
    hop = ANALYSIS_SR // FPS
    frames = max(1, int(round(duration * FPS)))

    rms = np.zeros(frames, dtype=np.float32)
    for i in range(frames):
        chunk = pcm[i * hop:(i + 1) * hop]
        if chunk.size:
            rms[i] = float(np.sqrt(np.mean(chunk.astype(np.float64) ** 2)))

    threshold = max(0.012, float(np.percentile(rms, 55)) * 0.65)
    bits = (rms > threshold).astype(np.uint8)

    # Hold short gaps so the mouth does not flicker between syllables.
    held = bits.copy()
    for i in np.flatnonzero(bits):
        held[max(0, i - HOLD_RADIUS):min(frames, i + HOLD_RADIUS + 1)] = 1
    return held.tolist()


# --------------------------------------------------------------------------- #
# scanning
# --------------------------------------------------------------------------- #
def speaker_from_name(filename: str) -> tuple[str, str]:
    """'03_char2.mp3' -> ('char2', '.mp3'); falls back to the whole stem."""
    stem, ext = os.path.splitext(filename)
    match = NAME_RE.match(stem)
    speaker = (match.group("speaker") if match else stem).strip().lower()
    speaker = re.sub(r"[^a-z0-9_]+", "_", speaker).strip("_") or "speaker"
    return speaker, ext.lower()


def scan_voices() -> list[tuple[str, str]]:
    if not os.path.isdir(VOICES_DIR):
        return []
    found: list[tuple[str, str]] = []
    for name in sorted(os.listdir(VOICES_DIR)):
        path = os.path.join(VOICES_DIR, name)
        if not os.path.isfile(path):
            continue
        speaker, ext = speaker_from_name(name)
        if ext not in AUDIO_EXTS:
            continue
        found.append((name, speaker))
    return found


# --------------------------------------------------------------------------- #
# generation
# --------------------------------------------------------------------------- #
def build() -> None:
    entries = scan_voices()
    lines: list[dict] = []
    cursor = 0.0
    speakers = list(DEFAULT_SPEAKERS)

    for index, (name, speaker) in enumerate(entries):
        path = os.path.join(VOICES_DIR, name)
        duration = probe_duration(path)
        start_frame = int(round(cursor * FPS))
        duration_frames = max(1, int(round(duration * FPS)))
        lines.append(
            {
                "index": index,
                "file": name,
                "speaker": speaker,
                "startFrame": start_frame,
                "durationInFrames": duration_frames,
                "startSeconds": round(cursor, 3),
                "durationSeconds": round(duration, 3),
                "_bits": speech_bits(path, duration),
            }
        )
        if speaker not in speakers:
            speakers.append(speaker)
        cursor += duration
        if index < len(entries) - 1:
            cursor += PAUSE_SECONDS

    speech_end = max(
        (line["startFrame"] + line["durationInFrames"] for line in lines),
        default=0,
    )
    total_frames = max(MIN_TOTAL_FRAMES, speech_end + TAIL_FRAMES)

    envelopes = {speaker: [0] * total_frames for speaker in speakers}
    for line in lines:
        start = line["startFrame"]
        for offset, flag in enumerate(line.pop("_bits")):
            frame = start + offset
            if flag and 0 <= frame < total_frames:
                envelopes[line["speaker"]][frame] = 1

    write_ts(lines, speakers, envelopes, total_frames, speech_end)

    seconds = total_frames / FPS
    print(
        f"[build_dialogue] {len(lines)} line(s), {len(speakers)} speaker(s) -> "
        f"{os.path.relpath(OUT_FILE, ROOT)}"
    )
    for line in lines:
        print(
            f"  {line['index'] + 1:02d}. {line['speaker']:<10} "
            f"frames {line['startFrame']:>4}-{line['startFrame'] + line['durationInFrames'] - 1:<4} "
            f"({line['durationSeconds']:.2f} s)  {line['file']}"
        )
    print(f"[build_dialogue] TOTAL_FRAMES = {total_frames} ({seconds:.2f} s @ {FPS} fps)")
    if not lines:
        print(f"[build_dialogue] public/voices/ is empty -> silent 60 s default timeline")


def write_ts(
    lines: list[dict],
    speakers: list[str],
    envelopes: dict[str, list[int]],
    total_frames: int,
    speech_end: int,
) -> None:
    out: list[str] = []
    out.append("// AUTO-GENERATED FILE - do not edit by hand.")
    out.append("// Regenerate with:  python build_dialogue.py")
    out.append(f"// Source: {len(lines)} file(s) in public/voices/  -  {FPS} fps")
    out.append("")
    out.append(f"export const DIALOGUE_FPS = {FPS};")
    out.append("")
    out.append("/** Composition length in frames (never shorter than 60 s). */")
    out.append(f"export const TOTAL_FRAMES = {total_frames};")
    out.append("")
    out.append("/** Last frame that still carries speech (0 when there is no voice). */")
    out.append(f"export const SPEECH_END_FRAME = {speech_end};")
    out.append("")
    out.append("export const SPEAKERS = [")
    for speaker in speakers:
        out.append(f"  {json.dumps(speaker)},")
    out.append("] as const;")
    out.append("")
    out.append("export type Speaker = (typeof SPEAKERS)[number];")
    out.append("")
    out.append("export type DialogueLine = {")
    out.append("  readonly index: number;")
    out.append("  readonly file: string;")
    out.append("  readonly speaker: Speaker;")
    out.append("  readonly startFrame: number;")
    out.append("  readonly durationInFrames: number;")
    out.append("  readonly startSeconds: number;")
    out.append("  readonly durationSeconds: number;")
    out.append("};")
    out.append("")
    out.append("export const DIALOGUE: readonly DialogueLine[] = [")
    for line in lines:
        out.append(
            "  { "
            f"index: {line['index']}, "
            f"file: {json.dumps(line['file'], ensure_ascii=False)}, "
            f"speaker: {json.dumps(line['speaker'])}, "
            f"startFrame: {line['startFrame']}, "
            f"durationInFrames: {line['durationInFrames']}, "
            f"startSeconds: {line['startSeconds']}, "
            f"durationSeconds: {line['durationSeconds']} "
            "},"
        )
    out.append("];")
    out.append("")
    out.append("export const HAS_DIALOGUE = DIALOGUE.length > 0;")
    out.append("")
    out.append("/** '0100100...' -> [0, 1, 0, 0, 1, 0, 0] (one flag per frame). */")
    out.append("const bits = (source: string): readonly number[] =>")
    out.append("  Array.from(source, (char) => (char === \"1\" ? 1 : 0));")
    out.append("")
    out.append("/** One speech envelope per speaker, aligned to the composition clock. */")
    out.append("export const ENVELOPES: Readonly<Record<Speaker, readonly number[]>> = {")
    for speaker in speakers:
        payload = "".join(str(v) for v in envelopes[speaker])
        out.append(f"  {json.dumps(speaker)}: bits(")
        out.append(f"    {json.dumps(payload)},")
        out.append("  ),")
    out.append("};")
    out.append("")
    out.append("/** True while `speaker` is actually audible on the global frame. */")
    out.append("export const isSpeaking = (speaker: string, frame: number): boolean => {")
    out.append(
        "  const envelope = (ENVELOPES as Record<string, readonly number[] | undefined>)[speaker];"
    )
    out.append("  if (!envelope) return false;")
    out.append("  return envelope[Math.round(frame)] === 1;")
    out.append("};")
    out.append("")

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8", newline="\n") as handle:
        handle.write("\n".join(out))


if __name__ == "__main__":
    build()
