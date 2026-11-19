#!/usr/bin/env python3
"""
generate_voices.py - ElevenLabs text-to-speech for the dialogue track.

Pipeline:
    script_voices.json  ->  ElevenLabs API  ->  public/voices/*.mp3
                        ->  python build_dialogue.py  ->  src/dialogueTimeline.ts

Nothing beyond the Python standard library is used (urllib.request, json, subprocess),
so a fresh clone only needs Python 3.10+ and a key in `.env`.

Setup (once):
    cp .env.example .env          # Windows: Copy-Item .env.example .env
    # put the real key into .env:  ELEVENLABS_API_KEY=...
    python generate_voices.py

Voices live in `voices_config.json`; if that file is missing the script falls back to
`voices_config.example.json` (public Rachel / Adam / Bella / Antoni voice IDs), so the
project works out of the box.

No key? Two supported paths:
  * put your own audio into public/voices/ as <NN>_<speaker>.mp3 and run
    `python build_dialogue.py`;
  * or set ELEVENLABS_API_KEY in `.env` and let this script do both steps.

Usage:
    python generate_voices.py [--force] [--skip-build] [--dry-run]

    --force       re-generate files that already exist (default: skip, saves credits)
    --skip-build  do not run build_dialogue.py afterwards
    --dry-run     print what would be requested, make no network calls
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(ROOT, ".env")
SCRIPT_FILE = os.path.join(ROOT, "script_voices.json")
CONFIG_FILE = os.path.join(ROOT, "voices_config.json")
CONFIG_EXAMPLE = os.path.join(ROOT, "voices_config.example.json")
VOICES_DIR = os.path.join(ROOT, "public", "voices")
BUILD_SCRIPT = os.path.join(ROOT, "build_dialogue.py")

API_ROOT = "https://api.elevenlabs.io/v1/text-to-speech"
DEFAULT_MODEL = "eleven_flash_v2_5"
DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"
TIMEOUT_SECONDS = 90
MAX_ATTEMPTS = 3

AUDIO_EXTS = {".mp3", ".wav"}
NAME_RE = re.compile(r"^\d+[\s._-]*(?P<speaker>.+)$")
PLACEHOLDER_MARKERS = (
    "your_elevenlabs_api_key_here",
    "встав",
    "сюди",
    "свій",
    "change_me",
    "changeme",
    "replace_me",
    "insert_your",
)


# --------------------------------------------------------------------------- #
# console helpers
# --------------------------------------------------------------------------- #
def _force_utf8_console() -> None:
    """Keep Ukrainian messages readable in Windows consoles and pipes."""
    if os.name == "nt":
        try:
            import ctypes

            ctypes.windll.kernel32.SetConsoleOutputCP(65001)
        except Exception:  # pragma: no cover - best effort only
            pass
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):  # pragma: no cover - exotic streams
            pass


_force_utf8_console()


def say(uk: str, en: str) -> None:
    """Print the Ukrainian line first, then the English one."""
    print(uk)
    print(en)


def fail(message: str, code: int = 1) -> None:
    print(f"\n[generate_voices] {message}", file=sys.stderr)
    raise SystemExit(code)


def missing_key_help(found_voices: int) -> int:
    say(
        "\n[generate_voices] Ключ ElevenLabs не знайдено (або він ще заглушка).",
        "[generate_voices] ElevenLabs API key not found (or still a placeholder).",
    )
    say(
        "\nЯк увімкнути авто-озвучку:",
        "\nHow to enable automatic voice-over:",
    )
    say(
        "  1. Скопіюй шаблон:   Copy-Item .env.example .env   (macOS/Linux: cp .env.example .env)\n"
        "  2. Відкрий .env і впиши ключ:   ELEVENLABS_API_KEY=твій_ключ\n"
        "     (ключ береться тут: https://elevenlabs.io/app/settings/api-keys)\n"
        "  3. Запусти:   python generate_voices.py",
        "  1. Copy the template:   cp .env.example .env\n"
        "  2. Open .env and add:   ELEVENLABS_API_KEY=your_key\n"
        "     (get a key at https://elevenlabs.io/app/settings/api-keys)\n"
        "  3. Run:   python generate_voices.py",
    )
    say(
        "\nАбо без ключа: поклади готові файли у public/voices/ "
        "(01_narrator.mp3, 02_char1.mp3, 03_char2.mp3, ...) і запусти\n"
        "  python build_dialogue.py",
        "\nOr without a key: drop ready files into public/voices/ "
        "(01_narrator.mp3, 02_char1.mp3, 03_char2.mp3, ...) and run\n"
        "  python build_dialogue.py",
    )
    if found_voices:
        say(
            f"\nУ public/voices/ уже є {found_voices} аудіофайл(ів). "
            "Перебудовую таймлайн без генерації...",
            f"\npublic/voices/ already contains {found_voices} audio file(s). "
            "Rebuilding the timeline without generation...",
        )
        return 0
    say(
        "\nДетальніше: AGENTS.md, розділ 3.5.",
        "\nMore details: AGENTS.md, section 3.5.",
    )
    return 2


# --------------------------------------------------------------------------- #
# configuration
# --------------------------------------------------------------------------- #
def read_env(path: str) -> dict[str, str]:
    """Minimal .env reader: KEY=VALUE, # comments, optional quotes."""
    values: dict[str, str] = {}
    if not os.path.isfile(path):
        return values
    with open(path, encoding="utf-8-sig") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if key.startswith("export "):
                key = key[len("export "):].strip()
            values[key] = value.strip().strip('"').strip("'")
    return values


def is_placeholder(value: str) -> bool:
    low = value.strip().lower()
    if not low:
        return True
    return any(marker in low for marker in PLACEHOLDER_MARKERS)


def resolve_api_key() -> tuple[str, str]:
    """Return (key, source); ('', '') when the key is absent or a placeholder."""
    file_values = read_env(ENV_FILE)
    candidates = (
        ("файл .env / .env file", file_values.get("ELEVENLABS_API_KEY", "")),
        ("змінна середовища / environment variable", os.environ.get("ELEVENLABS_API_KEY", "")),
    )
    for source, value in candidates:
        if value and not is_placeholder(value):
            return value.strip(), source
    return "", ""


def load_json(path: str, label: str) -> object:
    try:
        with open(path, encoding="utf-8-sig") as handle:
            return json.load(handle)
    except FileNotFoundError:
        fail(
            f"Немає {label} ({os.path.relpath(path, ROOT)}).\n"
            f"[generate_voices] Missing {label} ({os.path.relpath(path, ROOT)}).",
            1,
        )
    except json.JSONDecodeError as exc:
        fail(
            f"{label} містить невалідний JSON: {exc}\n"
            f"[generate_voices] {label} is not valid JSON: {exc}",
            1,
        )
    raise AssertionError("unreachable")


def load_config() -> dict:
    if os.path.isfile(CONFIG_FILE):
        config = load_json(CONFIG_FILE, "voices_config.json")
    elif os.path.isfile(CONFIG_EXAMPLE):
        say(
            "[generate_voices] voices_config.json не знайдено - беру voices_config.example.json.",
            "[generate_voices] voices_config.json not found - using voices_config.example.json.",
        )
        config = load_json(CONFIG_EXAMPLE, "voices_config.example.json")
    else:
        fail(
            "Немає voices_config.json і voices_config.example.json.\n"
            "[generate_voices] Both voices_config.json and voices_config.example.json are missing.",
            1,
        )
    if not isinstance(config, dict):
        fail(
            "Конфіг голосів має бути JSON-об'єктом.\n"
            "[generate_voices] The voice config must be a JSON object.",
            1,
        )
    return config


def pick_voice(config: dict, speaker: str) -> tuple[str, dict]:
    """Resolve a speaker to (voice_id, merged voice_settings)."""
    voices = config.get("voices")
    if not isinstance(voices, dict):
        voices = config
    entry = voices.get(speaker)
    if entry is None:
        entry = voices.get("default")
    if entry is None:
        return "", {}

    default_settings = config.get("default_settings")
    base = dict(default_settings) if isinstance(default_settings, dict) else {}

    if isinstance(entry, str):
        return entry.strip(), base
    if not isinstance(entry, dict):
        return "", base

    voice_id = str(entry.get("voice_id", "")).strip()
    settings = entry.get("settings")
    if isinstance(settings, dict):
        base.update(settings)
    return voice_id, base


def load_script() -> list[dict]:
    data = load_json(SCRIPT_FILE, "script_voices.json")
    if not isinstance(data, list) or not data:
        fail(
            "script_voices.json має бути непорожнім масивом реплік.\n"
            "[generate_voices] script_voices.json must be a non-empty array of lines.",
            1,
        )

    lines: list[dict] = []
    for index, item in enumerate(data, 1):
        if not isinstance(item, dict):
            fail(f"Репліка #{index} має бути об'єктом.", 1)
        file_name = str(item.get("file", "")).strip()
        speaker = str(item.get("speaker", "")).strip().lower()
        text = str(item.get("text", "")).strip()
        if not file_name or not speaker or not text:
            fail(
                f"Репліка #{index}: потрібні поля file, speaker і text.\n"
                f"[generate_voices] Line #{index}: file, speaker and text are required.",
                1,
            )
        if os.path.basename(file_name) != file_name:
            fail(
                f"Репліка #{index}: 'file' має бути простим ім'ям без шляхів ({file_name!r}).",
                1,
            )
        ext = os.path.splitext(file_name)[1].lower()
        if ext not in AUDIO_EXTS:
            fail(
                f"Репліка #{index}: підтримуються лише .mp3/.wav ({file_name!r}).",
                1,
            )
        if not NAME_RE.match(os.path.splitext(file_name)[0]):
            print(
                f"[generate_voices] Увага: {file_name} не має префікса <NN>_ - "
                "build_dialogue.py все одно прийме файл, але сортування може бути непередбачуваним."
            )
        lines.append(
            {"file": file_name, "speaker": speaker, "text": text, "index": index}
        )
    return lines


# --------------------------------------------------------------------------- #
# ElevenLabs API
# --------------------------------------------------------------------------- #
def http_hint(code: int) -> str:
    hints = {
        401: "Невірний ключ. Перевір ELEVENLABS_API_KEY у .env / Invalid API key.",
        403: "Ключ не має доступу до TTS. Перевір права ключа / Key lacks TTS permission.",
        404: "Голос не знайдено. Перевір voice_id у voices_config.json / Unknown voice_id.",
        422: "Некоректний запит (текст або налаштування голосу) / Invalid request body.",
        429: "Перевищено ліміт запитів. Зачекай і повтори / Rate limit exceeded, retry later.",
    }
    return hints.get(code, "Див. https://elevenlabs.io/docs/api-reference/text-to-speech")


def synthesize(line: dict, voice_id: str, settings: dict, model: str, output_format: str,
               api_key: str) -> bytes:
    query = urllib.parse.urlencode({"output_format": output_format})
    url = f"{API_ROOT}/{urllib.parse.quote(voice_id)}?{query}"
    payload: dict = {"text": line["text"], "model_id": model}
    if settings:
        payload["voice_settings"] = settings
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return response.read()


def synthesize_with_retry(line: dict, voice_id: str, settings: dict, model: str,
                          output_format: str, api_key: str) -> bytes:
    delay = 2.0
    last_error = ""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return synthesize(line, voice_id, settings, model, output_format, api_key)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace").strip()[:400]
            last_error = f"HTTP {exc.code}: {body or exc.reason}"
            if exc.code in (429, 500, 502, 503, 504) and attempt < MAX_ATTEMPTS:
                print(
                    f"  ... {exc.code} на спробі {attempt}/{MAX_ATTEMPTS}, "
                    f"повтор через {delay:.0f} с"
                )
                time.sleep(delay)
                delay *= 2
                continue
            fail(
                f"{line['file']}: {last_error}\n"
                f"  {http_hint(exc.code)}",
                1,
            )
        except urllib.error.URLError as exc:
            last_error = str(exc.reason)
            if attempt < MAX_ATTEMPTS:
                print(
                    f"  ... мережева помилка на спробі {attempt}/{MAX_ATTEMPTS}, "
                    f"повтор через {delay:.0f} с ({last_error})"
                )
                time.sleep(delay)
                delay *= 2
                continue
            fail(
                f"{line['file']}: немає зв'язку з api.elevenlabs.io ({last_error}).\n"
                "[generate_voices] Cannot reach api.elevenlabs.io.",
                1,
            )
    fail(f"{line['file']}: {last_error}", 1)
    raise AssertionError("unreachable")


# --------------------------------------------------------------------------- #
# pipeline
# --------------------------------------------------------------------------- #
def existing_voices() -> list[str]:
    if not os.path.isdir(VOICES_DIR):
        return []
    return [
        name
        for name in sorted(os.listdir(VOICES_DIR))
        if os.path.isfile(os.path.join(VOICES_DIR, name))
        and os.path.splitext(name)[1].lower() in AUDIO_EXTS
    ]


def stem_conflicts(file_name: str) -> list[str]:
    """Other audio files with the same <NN>_<speaker> stem (e.g. .wav next to .mp3).

    build_dialogue.py treats every audio file as a line, so two files with the same
    stem would duplicate the line. We never delete user audio: --force renames the
    old file to *.bak instead.
    """
    if not os.path.isdir(VOICES_DIR):
        return []
    stem = os.path.splitext(file_name)[0].lower()
    conflicts: list[str] = []
    for name in sorted(os.listdir(VOICES_DIR)):
        path = os.path.join(VOICES_DIR, name)
        if name == file_name or not os.path.isfile(path):
            continue
        if os.path.splitext(name)[1].lower() not in AUDIO_EXTS:
            continue
        if os.path.splitext(name)[0].lower() == stem:
            conflicts.append(name)
    return conflicts


def run_build() -> int:
    print("\n[generate_voices] python build_dialogue.py")
    result = subprocess.run([sys.executable, BUILD_SCRIPT], cwd=ROOT)
    if result.returncode != 0:
        fail(
            "build_dialogue.py завершився з помилкою (перевір ffmpeg/ffprobe у PATH).\n"
            "[generate_voices] build_dialogue.py failed (check ffmpeg/ffprobe in PATH).",
            1,
        )
    return 0


def main(argv: list[str]) -> int:
    valid_flags = {"--force", "--skip-build", "--dry-run", "-h", "--help"}
    unknown = [arg for arg in argv if arg not in valid_flags]
    if "-h" in argv or "--help" in argv:
        print(__doc__)
        return 0
    if unknown:
        fail(
            f"Невідомі аргументи: {' '.join(unknown)}. "
            "Доступно: --force, --skip-build, --dry-run, --help",
            1,
        )

    force = "--force" in argv
    skip_build = "--skip-build" in argv
    dry_run = "--dry-run" in argv

    api_key, key_source = resolve_api_key()
    found = existing_voices()

    if not api_key:
        code = missing_key_help(len(found))
        if code == 0 and not skip_build:
            return run_build()
        return code

    config = load_config()
    lines = load_script()

    model = str(config.get("model", DEFAULT_MODEL)).strip() or DEFAULT_MODEL
    output_format = (
        str(config.get("output_format", DEFAULT_OUTPUT_FORMAT)).strip()
        or DEFAULT_OUTPUT_FORMAT
    )

    print(
        f"[generate_voices] key: {key_source} | model: {model} | "
        f"lines: {len(lines)} | output: {output_format}"
    )

    os.makedirs(VOICES_DIR, exist_ok=True)
    generated = 0
    skipped = 0
    failures: list[str] = []

    for line in lines:
        voice_id, settings = pick_voice(config, line["speaker"])
        if not voice_id:
            print(
                f"  !! {line['file']}: немає голосу для '{line['speaker']}' "
                "і немає 'default' у voices_config.json - пропускаю"
            )
            failures.append(line["file"])
            continue

        target = os.path.join(VOICES_DIR, line["file"])
        if os.path.isfile(target) and os.path.getsize(target) > 0 and not force:
            print(f"  = {line['file']}  (уже є, --force щоб перезаписати)")
            skipped += 1
            continue

        conflicts = stem_conflicts(line["file"])
        if conflicts:
            if not force:
                print(
                    f"  !! {line['file']}: у public/voices/ уже є "
                    f"{', '.join(conflicts)} з тим самим номером і спікером."
                )
                print(
                    "     Видали/перейменуй його або запусти з --force "
                    "(старий файл буде перейменовано в .bak, не видалено)."
                )
                skipped += 1
                continue
            for old in conflicts:
                old_path = os.path.join(VOICES_DIR, old)
                backup = old_path + ".bak"
                if dry_run:
                    print(f"  ~ {old} -> {old}.bak (dry-run)")
                    continue
                os.replace(old_path, backup)
                print(f"  ~ {old} -> {old}.bak (щоб не дублювати репліку)")

        preview = line["text"] if len(line["text"]) <= 60 else line["text"][:57] + "..."
        print(f"  > {line['file']}  [{line['speaker']} -> {voice_id}]  {preview}")
        if dry_run:
            generated += 1
            continue

        audio = synthesize_with_retry(
            line, voice_id, settings, model, output_format, api_key
        )
        if not audio:
            print(f"  !! {line['file']}: порожня відповідь від API - пропускаю")
            failures.append(line["file"])
            continue

        temp_path = target + ".part"
        with open(temp_path, "wb") as handle:
            handle.write(audio)
        os.replace(temp_path, target)
        generated += 1

    print(
        f"\n[generate_voices] готово: {generated} згенеровано, {skipped} пропущено, "
        f"{len(failures)} з помилкою"
    )
    if failures:
        print(f"[generate_voices] не вдалося: {', '.join(failures)}")

    if dry_run:
        print("[generate_voices] --dry-run: мережевих запитів не було, build_dialogue.py не запускався.")
        return 0

    if skip_build:
        print("[generate_voices] --skip-build: таймлайн не перебудовано.")
        return 0

    if not generated and not found:
        fail(
            "Не згенеровано жодного файлу - немає що аналізувати.\n"
            "[generate_voices] Nothing was generated - nothing to analyse.",
            1,
        )

    return run_build()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
