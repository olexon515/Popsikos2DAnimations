#!/usr/bin/env python3
"""
generate_sfx.py - a fully local, procedural sound library for Popsikos2DAnimations 2D shorts.

Nothing is downloaded: every sound is synthesised from numpy noise / oscillators,
then polished with ffmpeg (sub-rumble cleanup + brickwall limiter) and written as
16-bit PCM WAV, 44100 Hz, stereo.

Usage:
    python generate_sfx.py

Output:
    public/sfx/wind_ambient.wav   12.00 s
    public/sfx/explosion.wav       2.50 s
    public/sfx/siren.wav           4.00 s
    public/sfx/whoosh.wav          0.50 s
    public/sfx/glitch.wav          0.30 s
    public/sfx/pop.wav             0.15 s
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import wave

import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "public", "sfx")
RAW_DIR = os.path.join(OUT_DIR, "_raw")


# --------------------------------------------------------------------------
# small DSP helpers (FFT based, so no scipy dependency)
# --------------------------------------------------------------------------
def n_samples(duration: float) -> int:
    return int(round(duration * SR))


def time_axis(duration: float) -> np.ndarray:
    return np.arange(n_samples(duration), dtype=np.float64) / SR


def rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


def spectral(x: np.ndarray, gain) -> np.ndarray:
    """Shape a signal in the frequency domain with an arbitrary gain curve."""
    n = x.shape[0]
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(n, 1.0 / SR)
    shaped = spec * gain(freqs)
    return np.fft.irfft(shaped, n)


def lowpass(cutoff: float, order: int = 2):
    return lambda f: 1.0 / np.sqrt(1.0 + (f / max(cutoff, 1e-6)) ** (2 * order))


def highpass(cutoff: float, order: int = 2):
    return lambda f: 1.0 / np.sqrt(
        1.0 + (max(cutoff, 1e-6) / np.maximum(f, 1e-6)) ** (2 * order)
    )


def bandpass(low: float, high: float, order: int = 2):
    return lambda f: lowpass(high, order)(f) * highpass(low, order)(f)


def noise(n: int, seed: int) -> np.ndarray:
    return rng(seed).normal(0.0, 1.0, n)


def fade(x: np.ndarray, fade_in: float = 0.0, fade_out: float = 0.0) -> np.ndarray:
    """Equal-power-ish raised-cosine fades, in seconds."""
    y = x.copy()
    n = y.shape[0]
    fi = min(n, int(fade_in * SR))
    fo = min(n, int(fade_out * SR))
    if fi > 0:
        ramp = 0.5 - 0.5 * np.cos(np.linspace(0.0, np.pi, fi))
        y[:fi] *= ramp[:, None] if y.ndim == 2 else ramp
    if fo > 0:
        ramp = 0.5 + 0.5 * np.cos(np.linspace(0.0, np.pi, fo))
        y[n - fo :] *= ramp[:, None] if y.ndim == 2 else ramp
    return y


def stereo(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    n = min(left.shape[0], right.shape[0])
    return np.stack([left[:n], right[:n]], axis=1)


def peak_normalise(sig: np.ndarray, target: float) -> np.ndarray:
    peak = float(np.max(np.abs(sig)))
    if peak < 1e-9:
        return sig
    return sig / peak * target


def write_wav(path: str, data: np.ndarray) -> None:
    """data: float frames shaped (n, 2) in [-1, 1]."""
    pcm = np.clip(data, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype("<i2")
    with wave.open(path, "wb") as fh:
        fh.setnchannels(2)
        fh.setsampwidth(2)
        fh.setframerate(SR)
        fh.writeframes(pcm.tobytes())


# --------------------------------------------------------------------------
# 1. wind_ambient.wav - 12 s of wind, ruins and a low pressure hum
# --------------------------------------------------------------------------
def make_wind(duration: float = 12.0) -> np.ndarray:
    t = time_axis(duration)
    n = t.shape[0]

    def channel(seed: int, detune: float) -> np.ndarray:
        r = rng(seed)
        white = r.normal(0.0, 1.0, n)

        # broad rushing body of the wind
        body = spectral(white, lambda f: lowpass(430, 2)(f) * highpass(38, 2)(f))
        gust = 0.52 + 0.48 * (
            0.5 + 0.5 * np.sin(2 * np.pi * 0.043 * t + detune)
        ) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.017 * t + 1.7))

        # a thin whistling layer that comes and goes
        howl_src = r.normal(0.0, 1.0, n)
        howl = spectral(howl_src, bandpass(760, 1580, 2))
        howl_env = 0.5 + 0.5 * np.sin(2 * np.pi * 0.071 * t - 1.1 + detune)
        howl_env = np.clip(howl_env, 0.0, 1.0) ** 2

        # far-away pressure / ruins rumble
        rumble = spectral(r.normal(0.0, 1.0, n), lowpass(95, 2))
        rumble_env = 0.55 + 0.45 * np.sin(2 * np.pi * 0.029 * t + detune * 2.0)

        sig = body * 1.0 * gust + howl * 0.5 * howl_env + rumble * 2.2 * rumble_env

        # two slightly detuned low tones give the "dead city" beating
        sig += 0.05 * np.sin(2 * np.pi * (53.0 + detune * 1.4) * t)
        sig += 0.035 * np.sin(2 * np.pi * (57.5 - detune * 0.9) * t)
        return sig

    left = channel(101, 0.0)
    right = channel(202, 0.6)

    # a couple of slow metallic groans of the ruins
    for start, freq, amp, seed in ((2.6, 128.0, 0.16, 7), (7.4, 96.0, 0.14, 11), (10.3, 143.0, 0.10, 13)):
        i0 = int(start * SR)
        length = int(1.9 * SR)
        tt = np.arange(length) / SR
        env = np.exp(-((tt - 0.55) ** 2) / (2 * 0.42**2))
        groan = (
            np.sin(2 * np.pi * freq * tt + 0.8 * np.sin(2 * np.pi * 3.1 * tt))
            + 0.4 * np.sin(2 * np.pi * freq * 1.51 * tt)
        )
        groan *= env * amp
        groan += spectral(rng(seed).normal(0.0, 1.0, length), bandpass(150, 900, 2)) * env * amp * 0.35
        avail = min(length, n - i0)
        if avail <= 0:
            continue
        left[i0 : i0 + avail] += groan[:avail]
        right[i0 : i0 + avail] += np.roll(groan, 311)[:avail]

    left = fade(left, 1.1, 1.2)
    right = fade(right, 1.1, 1.2)
    data = stereo(left, right)
    data = peak_normalise(data, 0.72)
    return np.tanh(data * 1.05) / np.tanh(1.05)


# --------------------------------------------------------------------------
# 2. explosion.wav - 2.5 s distant detonation with a deep sub tail
# --------------------------------------------------------------------------
def make_explosion(duration: float = 2.5) -> np.ndarray:
    t = time_axis(duration)
    n = t.shape[0]
    r = rng(404)

    # pitch-diving sub
    sub_freq = 27.0 + 88.0 * np.exp(-t / 0.26)
    sub_phase = 2 * np.pi * np.cumsum(sub_freq) / SR
    sub = np.sin(sub_phase) * np.exp(-t / 0.9)
    sub += 0.35 * np.sin(0.5 * sub_phase) * np.exp(-t / 1.35)

    def body_channel(seed: int) -> np.ndarray:
        rr = rng(seed)
        blast = spectral(rr.normal(0.0, 1.0, n), lambda f: lowpass(1100, 2)(f) * highpass(35, 2)(f))
        blast *= np.exp(-t / 0.38)
        crack = spectral(rr.normal(0.0, 1.0, n), highpass(1700, 2))
        crack *= np.exp(-t / 0.055)
        rumble = spectral(rr.normal(0.0, 1.0, n), bandpass(48, 190, 2))
        rumble *= np.exp(-t / 1.05)
        return blast * 0.9 + crack * 0.45 + rumble * 1.25

    left = body_channel(411)
    right = body_channel(412)

    # debris crackle scattered through the tail
    for _ in range(26):
        start = int((0.18 + r.random() ** 2 * 1.9) * SR)
        length = int((0.01 + r.random() * 0.03) * SR)
        if start + length >= n:
            continue
        click = r.normal(0.0, 1.0, length) * np.exp(-np.arange(length) / (length * 0.35))
        click = spectral(click, bandpass(700, 5200, 1)) * 0.16 * (0.4 + r.random())
        pan = r.random()
        left[start : start + length] += click * (1.0 - pan * 0.7)
        right[start : start + length] += click * (0.3 + pan * 0.7)

    left = sub * 1.5 + left
    right = sub * 1.5 + right
    data = stereo(left, right)
    data = peak_normalise(data, 1.0)
    # soft saturation glues the layers together
    data = np.tanh(data * 1.6) / np.tanh(1.6)
    return fade(data, 0.002, 0.35)


# --------------------------------------------------------------------------
# 3. siren.wav - 4 s air-raid wail
# --------------------------------------------------------------------------
def make_siren(duration: float = 4.0) -> np.ndarray:
    t = time_axis(duration)

    wail = 0.5 - 0.5 * np.cos(2 * np.pi * 0.42 * t)  # 0..1, two sweeps
    freq = 470.0 + 420.0 * wail + 7.0 * np.sin(2 * np.pi * 5.3 * t)
    phase = 2 * np.pi * np.cumsum(freq) / SR

    tone = (
        0.62 * np.sin(phase)
        + 0.24 * np.sin(2 * phase + 0.4)
        + 0.11 * np.sin(3 * phase + 1.1)
        + 0.05 * np.sin(4 * phase)
    )
    # a little air around the horn
    air = spectral(rng(77).normal(0.0, 1.0, t.shape[0]), bandpass(900, 3400, 1)) * 0.05
    sig = tone + air
    sig = spectral(sig, lambda f: bandpass(240, 4200, 1)(f) * (0.55 + 0.45 * highpass(500, 1)(f)))

    # slap-back echo between the buildings
    delay = int(0.21 * SR)
    echo = np.zeros_like(sig)
    echo[delay:] += sig[:-delay] * 0.32
    echo[delay * 2 :] += sig[: -delay * 2] * 0.11
    sig = sig + echo

    env = 0.65 + 0.35 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.42 * t + 1.4))
    sig *= env
    left = fade(sig, 0.35, 0.75)
    right = fade(np.roll(sig, 190), 0.35, 0.75) * 0.97
    data = stereo(left, right) * 0.6
    data = peak_normalise(data, 0.85)
    return np.tanh(data * 1.2) / np.tanh(1.2)


# --------------------------------------------------------------------------
# 4. whoosh.wav - 0.5 s camera-transition swipe
# --------------------------------------------------------------------------
def make_whoosh(duration: float = 0.5) -> np.ndarray:
    t = time_axis(duration)
    n = t.shape[0]

    def gauss(center: float, width: float) -> np.ndarray:
        return np.exp(-((t - center) ** 2) / (2 * width**2))

    low_src = noise(n, 501)
    mid_src = noise(n, 502)
    high_src = noise(n, 503)

    low = spectral(low_src, bandpass(90, 620, 2)) * gauss(0.22, 0.11) * 1.15
    mid = spectral(mid_src, bandpass(520, 2600, 2)) * gauss(0.17, 0.075)
    high = spectral(high_src, bandpass(2400, 9000, 2)) * gauss(0.115, 0.045) * 0.7

    # a small pitched "swish" riding on top of the noise
    sweep = 260.0 + 2600.0 * np.clip((t - 0.04) / 0.3, 0.0, 1.0) ** 2
    swish_phase = 2 * np.pi * np.cumsum(sweep) / SR
    swish = np.sin(swish_phase) * gauss(0.16, 0.055) * 0.16

    mono = low + mid + high + swish
    # equal-power pan from left to right
    pan = np.clip(t / duration, 0.0, 1.0)
    left = mono * np.cos(pan * np.pi / 2) * 1.25
    right = mono * np.sin(pan * np.pi / 2) * 1.25
    data = stereo(fade(left, 0.004, 0.09), fade(right, 0.004, 0.09))
    data = peak_normalise(data, 0.9)
    return np.tanh(data * 1.35) / np.tanh(1.35)


# --------------------------------------------------------------------------
# 5. glitch.wav - 0.3 s digital crackle
# --------------------------------------------------------------------------
def make_glitch(duration: float = 0.3) -> np.ndarray:
    t = time_axis(duration)
    n = t.shape[0]
    r = rng(909)

    # sample & hold noise, then bit-crush it
    hold = 24
    sh = np.repeat(r.normal(0.0, 1.0, n // hold + 1), hold)[:n]
    sh = np.round(sh * 7.0) / 7.0

    # hard random gates
    gate_step = 110
    gate = np.repeat((r.random(n // gate_step + 1) > 0.42).astype(np.float64), gate_step)[:n]
    sh *= gate

    # square blips at two fixed pitches
    blip_a = np.sign(np.sin(2 * np.pi * 1180.0 * t)) * 0.16
    blip_b = np.sign(np.sin(2 * np.pi * 640.0 * t)) * 0.12
    blip_gate = np.repeat((r.random(n // 260 + 1) > 0.55).astype(np.float64), 260)[:n]
    blips = (blip_a + blip_b) * blip_gate

    # a couple of tight clicks at the head
    click_env = np.exp(-t / 0.008)
    clicks = r.normal(0.0, 1.0, n) * click_env * 0.35

    mono = sh * 0.55 + blips + clicks
    mono = spectral(mono, lambda f: highpass(240, 2)(f) * lowpass(12000, 2)(f))

    left = fade(mono, 0.002, 0.012)
    right = fade(np.roll(mono, 37) * 0.92, 0.002, 0.012)
    data = peak_normalise(stereo(left, right), 0.8)
    return np.tanh(data * 1.5) / np.tanh(1.5)


# --------------------------------------------------------------------------
# 6. pop.wav - 0.15 s cartoon UI click
# --------------------------------------------------------------------------
def make_pop(duration: float = 0.15) -> np.ndarray:
    t = time_axis(duration)
    n = t.shape[0]

    freq = 340.0 + 1500.0 * np.exp(-t / 0.028)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t / 0.05)
    body += 0.35 * np.sin(2.02 * phase) * np.exp(-t / 0.032)
    body *= 0.9

    click = spectral(rng(31).normal(0.0, 1.0, n), highpass(2200, 2)) * np.exp(-t / 0.006) * 0.4
    bubble = np.sin(2 * np.pi * 180.0 * t) * np.exp(-t / 0.06) * 0.2

    mono = body + click + bubble
    mono = spectral(mono, lowpass(9000, 2))
    left = fade(mono, 0.002, 0.02)
    right = fade(np.roll(mono, 11), 0.002, 0.02)
    data = peak_normalise(stereo(left, right), 0.9)
    return np.tanh(data * 1.3) / np.tanh(1.3)


# --------------------------------------------------------------------------
# ffmpeg polish: clean sub-rumble + brickwall limit, keep 16-bit stereo
# --------------------------------------------------------------------------
def ffmpeg_polish(raw_path: str, final_path: str) -> bool:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        return False
    cmd = [
        ffmpeg,
        "-y",
        "-v",
        "error",
        "-i",
        raw_path,
        "-af",
        "highpass=f=24,alimiter=limit=0.97:level=0",
        "-ar",
        str(SR),
        "-ac",
        "2",
        "-c:a",
        "pcm_s16le",
        final_path,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, OSError) as exc:
        print(f"  ! ffmpeg polish failed for {os.path.basename(final_path)}: {exc}")
        return False


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(RAW_DIR, exist_ok=True)

    library = [
        ("wind_ambient.wav", 12.0, "0.25", make_wind),
        ("explosion.wav", 2.5, "0.80", make_explosion),
        ("siren.wav", 4.0, "0.20", make_siren),
        ("whoosh.wav", 0.5, "0.60", make_whoosh),
        ("glitch.wav", 0.3, "0.30", make_glitch),
        ("pop.wav", 0.15, "0.70", make_pop),
    ]

    print(f"synthesising into {OUT_DIR}")
    print(f"{'file':<18}{'length':>8}  {'peak':>6}  {'clips':>5}")
    print("-" * 46)

    for name, duration, _vol, fn in library:
        data = fn(duration)
        raw_path = os.path.join(RAW_DIR, name)
        final_path = os.path.join(OUT_DIR, name)

        write_wav(raw_path, data)
        if not ffmpeg_polish(raw_path, final_path):
            shutil.copyfile(raw_path, final_path)

        with wave.open(final_path, "rb") as fh:
            frames = fh.getnframes()
            channels = fh.getnchannels()
            rate = fh.getframerate()
            width = fh.getsampwidth()
            pcm = np.frombuffer(fh.readframes(frames), dtype="<i2").astype(np.float64) / 32768.0
        peak = float(np.max(np.abs(pcm)))
        clipped = int(np.sum(np.abs(pcm) > 0.999))
        print(
            f"{name:<18}{frames / rate:>7.2f}s  {peak:>6.3f}  {clipped:>5}"
            f"   {channels}ch/{rate}Hz/{width * 8}bit"
        )

    shutil.rmtree(RAW_DIR, ignore_errors=True)
    print("-" * 46)
    print("done - see SOUNDS.md for the volume guide")
    return 0


if __name__ == "__main__":
    sys.exit(main())
