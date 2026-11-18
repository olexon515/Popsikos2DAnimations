# Popsikos2DAnimations — vertical 2D animation studio

[![Made with Remotion](https://img.shields.io/badge/made%20with-Remotion-0B84F3)](https://www.remotion.dev/)

A pure 2D (SVG + React) vertical cartoon built with [Remotion](https://www.remotion.dev/):
**1080×1920, 30 fps**, fully local procedural sound design, multi-voice dialogue with
automatic lip-sync, comic-style Ukrainian typography — and a **modular location system**
(`src/locations/`) so you can build new places with an AI agent.

- [English](#english)
- [Українською](#українською)

---

## English

### Quick start

Requirements: Node.js `^20.19.0 || ^22.13.0 || >=24`, Python 3.10+ with `numpy`,
`ffmpeg` + `ffprobe` in `PATH` (only needed for sound and dialogue generation).

```bash
# 1. install dependencies (run inside the repository root)
npm install

# 2. preview in Remotion Studio
npm run dev

# 3. type-check + lint
npm run lint

# 4. regenerate the six base WAVs (numpy + ffmpeg, no network)
python generate_sfx.py

# 5. (optional) rebuild the dialogue timeline + lip-sync from public/voices/
python build_dialogue.py

# 6. render the film with sound and captions
npx remotion render src/index.ts Popsikos2DAnimations out/episode.mp4 \
  --codec=h264 --crf=18 --image-format=png --pixel-format=yuv420p
```

On Windows PowerShell use `` ` `` instead of `\` for line continuation, or keep the
command on a single line.

### Project in 30 seconds

```
generate_sfx.py        procedural sound synthesis  -> public/sfx/*.wav
build_dialogue.py      dialogue timing + lip-sync    -> src/dialogueTimeline.ts
SOUNDS.md              sound catalogue: duration, loudness, mix timeline
AGENTS.md              full agent handbook (environment, rules, checklists)
src/
├─ Root.tsx            composition registration (1080x1920, 30 fps, DURATION)
├─ MainScene.tsx      three shots, camera, grade, audio mix, text overlays
├─ Character.tsx       SVG puppet: 4 eye types, 5 mouths, breathing, talking
├─ TextOverlays.tsx    HookTitle + DynamicCaption (spring, comic outline)
├─ Camera.tsx          parallax Layer, camera type, deterministic random
├─ palette.ts          colours + frame constants
├─ dialogueTimeline.ts generated dialogue + speech envelopes
└─ locations/
   ├─ types.ts         LocationDefinition contract
   ├─ index.ts         registry: LOCATIONS, LocationId, getLocation()
   └─ street/          reference location: Sky, Horizon, Ground, Midground, Embers
```

### Locations are pluggable

A location is just a folder with five SVG layers plus a small manifest:

```ts
// src/locations/index.ts
export const LOCATIONS = {
  street: streetLocation,
  bunker: bunkerLocation, // <- your new location
} as const satisfies Record<string, LocationDefinition>;
```

Pick it by name anywhere in the scene:

```tsx
<MainScene location="bunker" />                 // whole composition
<World camera={camera} location="bunker">…</World> // a single shot
```

The reference implementation lives in `src/locations/street/` and is documented
step by step in [`AGENTS.md`](./AGENTS.md#28-модульна-система-локацій-srclocations-та-створення-нових-локацій).

### Use it with OpenCode / Claude Code

Both tools read the repository instructions automatically, so you can simply ask
for a change in plain language and the agent will follow `AGENTS.md`.

**OpenCode**

1. Install OpenCode and open this folder:

   ```bash
   cd path/to/popsikos-2d-animations
   opencode
   ```

2. The agent detects `AGENTS.md` and the bundled project skill automatically.
3. Ask for work, for example:

   > «Додай локацію `metro` — тунель метро з аварійним освітленням, і постав її
   > на другий шот. Потім зроби still-кадри й перевір, що немає щілин.»

**Claude Code**

1. Copy the skill into your Claude skills folder (Windows:
   `%USERPROFILE%\.claude\skills\popsikos-2d-animations\SKILL.md`,
   macOS/Linux: `~/.claude/skills/popsikos-2d-animations/SKILL.md`).
2. Start Claude Code in the repository root:

   ```bash
   cd path/to/popsikos-2d-animations
   claude
   ```

3. The Popsikos2DAnimations skill activates on any location, render, audio or
   typography request; `AGENTS.md` carries the authoritative rules.

### Generate a whole episode with one prompt

The project is built so that a single request can produce a complete result:

> «Створи серію 2: локація `rooftop`, новий SFX `rain` у `generate_sfx.py`,
> запиши репліки в `public/voices/`, згенеруй таймлайн, зроби lint, still-кадри
> і рендер у `out/episode02.mp4`.»

What the agent does under the hood (defined in `AGENTS.md`):

| Step | Command / file |
|---|---|
| New location | `src/locations/<name>/` → registered in `src/locations/index.ts` |
| New sound | function + `library` entry in `generate_sfx.py` → `python generate_sfx.py` → row in `SOUNDS.md` |
| New dialogue | `public/voices/NN_speaker.wav` → `python build_dialogue.py` |
| Scene + captions | `src/MainScene.tsx` (`location=`, `HookTitle`, `DynamicCaption`, `<Audio>`) |
| Verification | `npm run lint` → `npx remotion still …` → `npx remotion render …` |

### Notes

- Every visual is SVG/React — no 3D, no raster assets.
- Sound is synthesised from noise and oscillators, then cleaned and limited with ffmpeg.
- Text uses local heavy fonts (Arial Black / Segoe UI Black / Impact) with a layered
  stroke + gradient fill, so Ukrainian glyphs render without network access.
- Close-up shots are framed with headroom so the `DynamicCaption` at 48% never
  covers the character's mouth.
- Determinism matters: use `rand(seed, i)` from `src/Camera.tsx`, never `Math.random()`.

### Repository hygiene

`.gitignore` keeps generated and personal files out of Git:

```
node_modules/  out/  dist/  .env  .env.local
public/voices/  public/voice.mp3
Thumbs.db  __pycache__/  *.py[cod]
```

The base sound library `public/sfx/*.wav` **is** committed, so a fresh clone can
render immediately.

Remotion docs: [the fundamentals](https://www.remotion.dev/docs/the-fundamentals).

---

## Українською

### Швидкий старт

Потрібно: Node.js `^20.19.0 || ^22.13.0 || >=24`, Python 3.10+ з `numpy`,
`ffmpeg` + `ffprobe` у `PATH` (тільки для генерації звуку й діалогів).

```bash
# 1. залежності (з кореня репозиторію)
npm install

# 2. попередній перегляд у Remotion Studio
npm run dev

# 3. перевірка типів і лінт
npm run lint

# 4. перегенерувати шість базових WAV (numpy + ffmpeg, без інтернету)
python generate_sfx.py

# 5. (опційно) перебудувати таймлайн діалогів і lip-sync із public/voices/
python build_dialogue.py

# 6. фінальний рендер зі звуком і титрами
npx remotion render src/index.ts Popsikos2DAnimations out/episode.mp4 \
  --codec=h264 --crf=18 --image-format=png --pixel-format=yuv420p
```

У Windows PowerShell замість `\` для переносу рядка використовуй `` ` `` або
запиши команду одним рядком.

### Структура проєкту

```
generate_sfx.py        процедурний синтез звуку   -> public/sfx/*.wav
build_dialogue.py      таймлайн діалогів + lip-sync -> src/dialogueTimeline.ts
SOUNDS.md              каталог звуків: тривалість, гучність, мапа міксу
AGENTS.md              повний довідник для агента (середовище, правила, чеклісти)
src/
├─ Root.tsx            реєстрація композиції (1080x1920, 30 fps, DURATION)
├─ MainScene.tsx      три шоти, камера, грейд, аудіомікс, титри
├─ Character.tsx       SVG-маріонетка: 4 типи очей, 5 ротів, дихання, мова
├─ TextOverlays.tsx    HookTitle + DynamicCaption (spring, comic-обводка)
├─ Camera.tsx          паралакс Layer, тип Camera, детермінований random
├─ palette.ts          кольори + константи кадру
├─ dialogueTimeline.ts згенеровані діалоги та огинаючі мовлення
└─ locations/
   ├─ types.ts         контракт LocationDefinition
   ├─ index.ts         реєстр: LOCATIONS, LocationId, getLocation()
   └─ street/          еталонна локація: Sky, Horizon, Ground, Midground, Embers
```

### Локації — це модулі

Локація — це папка з п'ятьма SVG-шарами та коротким маніфестом:

```ts
// src/locations/index.ts
export const LOCATIONS = {
  street: streetLocation,
  bunker: bunkerLocation, // <- нова локація
} as const satisfies Record<string, LocationDefinition>;
```

Далі локація обирається за іменем у будь-якому місці сцени:

```tsx
<MainScene location="bunker" />                     // вся композиція
<World camera={camera} location="bunker">…</World>   // окремий шот
```

Еталонна реалізація — `src/locations/street/`; покрокова інструкція для агента
є в [`AGENTS.md`](./AGENTS.md#28-модульна-система-локацій-srclocations-та-створення-нових-локацій).

### Робота в OpenCode / Claude Code

Обидва інструменти читають інструкції репозиторію автоматично, тому достатньо
попросити зміну звичайною мовою — агент діятиме за `AGENTS.md`.

**OpenCode**

1. Встанови OpenCode і відкрий папку проєкту:

   ```bash
   cd шлях/до/popsikos-2d-animations
   opencode
   ```

2. Агент підхоплює `AGENTS.md` і вбудований скіл проєкту автоматично.
3. Формулюй завдання, наприклад:

   > «Додай локацію `metro` — тунель метро з аварійним освітленням, і постав її
   > на другий шот. Потім зроби still-кадри й перевір, що немає щілин.»

**Claude Code**

1. Скопіюй скіл у теку Claude skills (Windows:
   `%USERPROFILE%\.claude\skills\popsikos-2d-animations\SKILL.md`,
   macOS/Linux: `~/.claude/skills/popsikos-2d-animations/SKILL.md`).
2. Запусти Claude Code у корені репозиторію:

   ```bash
   cd шлях/до/popsikos-2d-animations
   claude
   ```

3. Скіл Popsikos2DAnimations активується на будь-який запит щодо локацій,
   рендера, звуку чи титрів; істина правил — в `AGENTS.md`.

### Ціла серія однією командою

Проєкт побудований так, щоб один запит давав готовий результат:

> «Створи серію 2: локація `rooftop`, новий SFX `rain` у `generate_sfx.py`,
> запиши репліки в `public/voices/`, згенеруй таймлайн, зроби lint, still-кадри
> і рендер у `out/episode02.mp4`.»

Що агент робить під капотом (за `AGENTS.md`):

| Крок | Команда / файл |
|---|---|
| Нова локація | `src/locations/<name>/` → реєстрація в `src/locations/index.ts` |
| Новий звук | функція + запис у `library` в `generate_sfx.py` → `python generate_sfx.py` → рядок у `SOUNDS.md` |
| Нова озвучка | `public/voices/NN_speaker.wav` → `python build_dialogue.py` |
| Сцена й титри | `src/MainScene.tsx` (`location=`, `HookTitle`, `DynamicCaption`, `<Audio>`) |
| Перевірка | `npm run lint` → `npx remotion still …` → `npx remotion render …` |

### Нотатки

- Уся графіка — SVG/React; без 3D і без растрових ассетів.
- Звук синтезований із шуму й осциляторів, потім очищений і обмежений через ffmpeg.
- Титри — локальні важкі шрифти (Arial Black / Segoe UI Black / Impact) зі
  стекованою обводкою та градієнтом, тому українські гліфи рендеряться без мережі.
- Крупні плани кадровані із запасом зверху, щоб `DynamicCaption` на 48% не
  закривав рот персонажа.
- Детермінованість важлива: використовуй `rand(seed, i)` з `src/Camera.tsx`,
  а не `Math.random()`.

### Чистота репозиторію

`.gitignore` тримає поза Git згенеровані та персональні файли:

```
node_modules/  out/  dist/  .env  .env.local
public/voices/  public/voice.mp3
Thumbs.db  __pycache__/  *.py[cod]
```

Базова бібліотека `public/sfx/*.wav` **комітиться**, тому свіжий клон одразу
готовий до рендера.

Документація Remotion: [the fundamentals](https://www.remotion.dev/docs/the-fundamentals).
