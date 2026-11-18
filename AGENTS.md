# AGENTS.md — Popsikos2DAnimations

> Інструкція для AI-агентів (OpenCode, Claude Code тощо), які змінюють, розширюють або рендерять цей проєкт.
> **Оновлено:** 2026-11-18 · **Корінь:** `./` (корінь репозиторію)
> Дзеркало для Claude Skills (за наявності): `~/.claude/skills/popsikos-2d-animations/SKILL.md`

---

## 0. Що це і як почати за 5 хвилин

**Popsikos2DAnimations** — вертикальні 2D-мультфільми на тему апокаліпсису: **1080×1920, 30 fps**, уся графіка — SVG + React, без 3D і без растрових ассетів. Декорації винесені в модульні локації (`src/locations/`), звук синтезований локально (`generate_sfx.py`), діалоги та lip-sync генеруються з `public/voices/` (`build_dialogue.py`), титри — CSS-текст із comic-обводкою.

| Параметр | Значення |
|---|---|
| Remotion / React / TS | 4.0.544 / 19.3.1 / 5.9.3 |
| ID композиції | **`Popsikos2DAnimations`** (на ньому зав'язані команди рендера; не перейменовувати без запиту) |
| Точка входу | `src/index.ts` → `src/Root.tsx` → `src/MainScene.tsx` |
| Тривалість за замовч. | `TOTAL_FRAMES` із `src/dialogueTimeline.ts` (мінімум 1800 кадрів = 60 с @ 30 fps; якщо потрібно 12 с без озвучки — налаштовується в `build_dialogue.py` / `palette.ts`) |
| Еталонна локація | `street` (`src/locations/street/`) |
| Фінальний рендер | `out/<назва>.mp4` (h264 + AAC 48 kHz stereo) |

**Перші дії нового агента (з кореня проєкту):**

```bash
npm run lint
```

Потім подивись 1–2 кадри через `npx remotion still` (розділ 1.5), прочитай `SOUNDS.md`, і лише після цього запускай рендер.

---

## 1. Середовище та команди

### 1.1 Вимоги до середовища

| Інструмент | Вимога / примітка |
|---|---|
| Node.js / npm / npx | `^20.19.0 \|\| ^22.13.0 \|\| >=24` (має бути в `PATH`) |
| Python | `python` (3.10+) + `numpy` |
| ffmpeg / ffprobe | у `PATH` (потрібні для `generate_sfx.py`, `build_dialogue.py` та перевірки відео) |
| Git | для контролю змін |

> **Примітка для Windows PowerShell:** якщо `node`/`npm` не в `PATH`, додай шлях до Node.js у поточну сесію (наприклад, `$env:PATH="C:\Program Files\nodejs;$env:PATH"`). Якщо `npm.ps1` блокується Execution Policy, викликай `npm.cmd` та `npx.cmd` явно.

### 1.2 Перевірка коду (обов'язково перед рендером)

```bash
npm run lint
```

`npm run lint` = `eslint src && tsc`. Має завершитися **без виводу помилок**. Окремо `npx tsc --noEmit` не потрібен.

### 1.3 Фінальний рендер

```bash
npx remotion render src/index.ts Popsikos2DAnimations out/episode.mp4 --codec=h264 --crf=18 --image-format=png --pixel-format=yuv420p
```

- `--image-format=png` перекриває `jpeg` з `remotion.config.ts` — так краї SVG/тексту чистіші. Не прибирай цей прапорець.
- `--pixel-format=yuv420p` — сумісність з усіма плеєрами/соцмережами.
- `--crf=18` — баланс якості й розміру.
- Перший рендер довший (бандлинг + кеш), далі швидше.
- Файл перезаписується автоматично (`Config.setOverwriteOutput(true)`).

### 1.4 Studio та бандл

```bash
npm run dev     # remotion studio
npm run build   # remotion bundle
```

Studio зручний для інтерактивної перевірки, але для агента швидше `remotion still`.

### 1.5 Перевірка кадрів без повного рендера

```bash
npx remotion still src/index.ts Popsikos2DAnimations out/check-150.png --frame=150
```

Обов'язкові кадри для перевірки після змін: **30** (заголовок), **118** (вихід заголовка), **150** (крик + підпис), **240** (склейка), **300** і **340** (Персонаж 2 + підпис), або відповідні ключові кадри нового сценарію. Дивись, що текст не закриває рот, немає щілин між шарами, гліфи не обрізані.

### 1.6 Перевірка готового відео

```bash
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,nb_frames,duration -show_entries format=duration,size -of json out/episode.mp4
```

Очікування: video `h264`, 1080×1920, `30/1`, `DURATION` кадрів; audio `aac`, 48000 Hz, 2 канали. **Наявність audio-stream обов'язкова.**

Перевірка, що звук не німий (типова помилка — `-91.0 dB`):

```bash
# Linux / macOS:
ffmpeg -v info -ss 9 -t 1 -i out/episode.mp4 -vn -af volumedetect -f null /dev/null 2>&1 | grep -E "mean_volume|max_volume"

# Windows PowerShell:
ffmpeg -v info -ss 9 -t 1 -i out/episode.mp4 -vn -af volumedetect -f null NUL 2>&1 | Select-String "mean_volume|max_volume"
```

### 1.7 Пастки PowerShell / Python

- **Кирилиця:** не переписуй `.tsx` через `Get-Content ... | Set-Content` без явного UTF-8. PowerShell 5.1 читає UTF-8 без BOM як ANSI → мохіто (`РђРЇ...`) і зламані regex. Використовуй інструменти редагування файлів або `Get-Content -Raw -Encoding UTF8` + `Set-Content -Encoding UTF8`.
- **Python -c:** уникай `{` `}` `:` у подвійних лапках PowerShell. Для складних обчислень пиши тимчасовий `.py` у системну тимчасову папку (`$env:TEMP` у Windows або `/tmp` у Linux/macOS) і видаляй після запуску.
- **Шляхи:** у командах Remotion — прямі слеші (`out/name.mp4`); у shell — лапки навколо шляхів із пробілами.
- **Кодування:** усі файли проєкту — UTF-8. Тексти титрів українською, шрифти локальні.

---

## 2. Архітектура

### 2.1 Карта файлів

| Файл / папка | Роль |
|---|---|
| `src/index.ts` | `registerRoot(RemotionRoot)` |
| `src/Root.tsx` | реєструє `<Composition id="Popsikos2DAnimations">` з `WIDTH/HEIGHT/FPS/DURATION` та `defaultProps={{ location: DEFAULT_LOCATION }}` |
| `src/palette.ts` | `INK`, `PALETTE`, `WIDTH=1080`, `HEIGHT=1920`, `FPS=30`, `DURATION=TOTAL_FRAMES`, `HORIZON_Y=1180` |
| `src/MainScene.tsx` | головна сцена: 3 шоти, `World` (рендерить обрану локацію), камера, `Atmosphere`, `<Audio>`, титри |
| `src/Character.tsx` | SVG-маріонетка: очі, зіниці, рот, дихання, мова |
| `src/Camera.tsx` | тип `Camera`, компонент `Layer` (паралакс), `rand`, `clamp`, `STATIC_CAMERA` |
| `src/TextOverlays.tsx` | `HookTitle` + `DynamicCaption` (spring, обводка, градієнт) |
| `src/dialogueTimeline.ts` | автогенерований таймлайн реплік і lip-sync огинаючих із `public/voices/` |
| `src/locations/types.ts` | TypeScript-інтерфейс `LocationDefinition`, `LocationLayerProps`, `LocationSkyProps` |
| `src/locations/index.ts` | реєстр локацій `LOCATIONS`, тип `LocationId`, `DEFAULT_LOCATION`, `getLocation()` |
| `src/locations/street/` | еталонна локація `"street"`: `Sky.tsx`, `Horizon.tsx`, `Midground.tsx`, `Ground.tsx`, `Embers.tsx`, `index.ts` |
| `generate_sfx.py` | numpy + ffmpeg генерація `public/sfx/*.wav` |
| `build_dialogue.py` | сканує `public/voices/` і генерує `src/dialogueTimeline.ts` |
| `SOUNDS.md` | каталог звуків: тривалість, гучність, мапа міксу |
| `public/sfx/` | 6 базових WAV-файлів (44100 Hz, stereo, 16-bit PCM) |
| `public/voices/` | озвучка реплік користувача (gitignored) |
| `out/` | рендери (gitignored) |

### 2.2 Композиція та таймлайн

`MainScene` приймає `{ location = DEFAULT_LOCATION }: MainSceneProps`. Всередині:

1. Три `<Sequence>` зі шотами (пропорційно `DURATION`: 1/3, 1/3, 1/3; за 12 с це 0–120, 120–240, 240–360).
2. `<Atmosphere />` — віньєтка, bloom, нижній fade (screen-space).
3. `<Audio>`-шар (зациклений `wind_ambient`, SFX-хіти та `DIALOGUE` із `public/voices/`).
4. `<Sequence>` з `HookTitle` і двома `DynamicCaption`.

| Частка тривалості | Шот | Персонаж | Камера |
|---|---|---|---|
| 0 – 1/3 | широкий план (`ShotWide`) | Char 1: x=298 y=1632 scale=1.05, `normal`, дивиться вгору; Char 2: x=792 y=1668 scale=1.0 flipX, `squint` | zoom 1.0→1.12, panX 26→−24, panY −8→16 |
| 1/3 – 2/3 | крупний план Char 1 (`ShotScream`) | x=540 y=1902 scale=2.05; `wide` з кадру 10, `scream` з кадру 13 (або lip-sync) | zoom 1.42→1.52, тремтіння 16→30→2.5 px, спалах, panY 360→396 |
| 2/3 – кінець | крупний план Char 2 (`ShotTalk`) | x=548 y=1896 scale=2.0 flipX, `squint`, `smirk`, `isTalking` | zoom 1.22→1.0, panX −20→14, panY 336→300 |

Порядок малювання в `World`: **Sky → Horizon → Ground → Midground → dust band (depth .92) → actors (depth 1) → Embers → Atmosphere → audio → text**. Підлога (`Ground`) навмисно під пропсами (`Midground`), інакше поверхня землі ховає декорації на середньому плані.

### 2.3 `Camera.tsx`

```ts
type Camera = { zoom: number; panX: number; panY: number; shakeX: number; shakeY: number };
```

`<Layer camera depth style?>` застосовує:

```ts
scale = 1 + (camera.zoom - 1) * depth;
tx = -camera.panX * depth + camera.shakeX * depth;
ty = -camera.panY * depth + camera.shakeY * depth;
```

- `depth 0` — нескінченно далеко; `depth 1` — площина акторів; `>1` — передній план.
- Рекомендовані `depth`: Sky `0.18`, Horizon `0.45`, Midground `0.78`, dust band `0.92`, Ground/actors `1`, Embers `1.18`.
- `rand(seed, i)` — детермінований [0,1), щоб рендери були байт-у-байт стабільні. Не замінюй на `Math.random()`.
- `clamp(v, min, max)`.
- `STATIC_CAMERA` — нульова камера для тестів.

**Пастка країв:** при `zoom = 1` будь-який `pan` оголює край шару. Тому:
1. SVG у всіх шарах мають `style={{ overflow: "visible" }}`;
2. `Ground` простягається до `HEIGHT + 620` (і ширше за `WIDTH` на `[-100, WIDTH + 100]`);
3. для крупних планів використовується підняття `panY` ≈ 300–396.

Якщо збільшуєш `panX/panY` або опускаєш `zoom` — обов'язково перевір кадри на щілини по краях і знизу.

### 2.4 `Character.tsx` — точні пропи

```tsx
<Character
  x={540}
  y={1902}
  scale={2.05}
  eyeType="wide"
  pupilOffset={{ x: 0, y: -4 }}
  mouthType="scream"
  isTalking={false}
  sunSide="right"
  bodyColor={PALETTE.jacketBlue}
  breathePhase={0.4}
/>
```

| Prop | Тип | За замовч. | Що робить |
|---|---|---|---|
| `x` | `number` (обов'язковий) | — | центр персонажа по X у px кадру |
| `y` | `number` (обов'язковий) | — | **лінія стоп** у px; контейнер зсунутий `translate(-50%, -100%)` |
| `scale` | `number` | `1` | масштаб; локальне полотно 400×640 |
| `flipX` | `boolean` | `false` | дзеркалить SVG; `sunSide` при цьому міняється місцями автоматично |
| `eyeType` | `"normal" \| "wide" \| "squint" \| "angry"` | `"normal"` | `wide` зменшує зіниці; `squint` — вузька лінза; `angry` додає брови |
| `pupilOffset` | `{ x: number; y: number }` | `{x:0,y:0}` | зсув зіниць, обрізається до −7…7 |
| `mouthType` | `"closed" \| "half" \| "scream" \| "sad" \| "smirk"` | `"closed"` | форма рота |
| `isTalking` | `boolean` | `false` | перемикає рот кожні 3 кадри; `smirk` зберігається |
| `bodyColor` | `string` | `PALETTE.jacketBlue` | колір куртки |
| `skinColor` | `string` | `PALETTE.skin` | шкіра |
| `hairColor` | `string` | `PALETTE.hair` | волосся |
| `sunSide` | `"left" \| "right"` | `"left"` | **у screen-space**; всередині враховується `flipX` |
| `shadow` | `boolean` | `true` | м'яка овальна тінь під ногами |
| `breathePhase` | `number` | `0` | фазовий зсув дихання/похитування для розсинхрону двох персонажів |

Геометрія (локальні координати SVG 400×640): голова `cx=200 cy=168 r=92`, очі `y=158 x=168/232`, рот `(200,214)`, контур **3px**, ступні на `y≈606`. Мікрорухи: дихання `sin(t*1.5)*3.2`, sway `±0.75°`, кивок голови, нахил. `isTalking` не змінює `mouthType` назовні — назовні це лише прапорець.

**Правило сумісності:** нові параметри додавай тільки як **опційні** з дефолтом. Не перейменовуй і не видаляй існуючі пропи — на них зав'язані всі три шоти.

### 2.5 `TextOverlays.tsx` — точні пропи

Два незалежні компоненти, обидва читають `useCurrentFrame()` **відносно свого `<Sequence>`**.

#### `HookTitle`

```tsx
<HookTitle
  text="ДЕНЬ 1: НЕБО ПОЧЕРВОНІЛО"
  highlight="ПОЧЕРВОНІЛО"
  top={140}
  delay={4}
  exitAt={104}
/>
```

| Prop | Тип | За замовч. | Що робить |
|---|---|---|---|
| `text` | `string` | — | весь заголовок; частина до першого `:` стає бейджем, решта — великими словами |
| `highlight` | `string` | `""` | слово(а) з помаранчево-жовтим градієнтом; порівняння без регістру й пунктуації |
| `top` | `number` | `140` | відступ від верху кадру, px |
| `delay` | `number` | `0` | затримка входу в кадрах (локальних) |
| `exitAt` | `number` | — | кадр початку виходу (fade + підйом); без нього лишається до кінця Sequence |
| `fontSize` | `number` | `96` | розмір великих слів, px |

Стиль: локальний стек `Arial Black / Segoe UI Black / Impact / Montserrat`, `font-weight 900`, uppercase. Обводка — не `-webkit-text-stroke` на одному шарі, а **стекована копія**: ззаду слово з `WebkitTextStroke`, спереду — заливка/градієнт. Це дає товстий рівний контур без поїдання гліфа. Spring: `damping 11, mass 0.55, stiffness 140`, вхід зі scale 1.55→1. `top: 140` — верхня третина.

#### `DynamicCaption`

```tsx
<DynamicCaption
  text="ЦЕ НЕ ЗАХІД СОНЦЯ..."
  highlight={["НЕ ЗАХІД"]}
  top="48%"
  delay={2}
  exitAt={92}
/>
```

| Prop | Тип | За замовч. | Що робить |
|---|---|---|---|
| `text` | `string` | — | 2–4 слова |
| `highlight` | `string[]` | `[]` | ключові слова/фрази; кожне слово фарбується градієнтом |
| `top` | `number \| string` | `"48%"` | вертикальна лінія центру блоку |
| `delay` | `number` | `0` | затримка входу |
| `exitAt` | `number` | — | початок fade-out |
| `fontSize` | `number` | `72` | розмір, px |

Анімація: кожне слово входить зі scale **0.85→1.0**, зсув угору, stagger 2 кадри. Під текстом — м'який радіальний скрим для читабельності на спалахах. Заголовок і підписи не мають бути інтерактивними (`pointerEvents: "none"`).

**Пастка 48%:** у крупних планах обличчя за замовчуванням якраз на 48%. Тому в `ShotScream`/`ShotTalk` камера піднята (`panY` 300–396), щоб підпис був під підборіддям. Якщо міняєш `panY`, scale або висоту персонажа — перевір кадр 150/300.

### 2.6 Еталонна локація (`src/locations/street/`)

| Компонент | Пропси | Вміст / особливості |
|---|---|---|
| `Sky` | `{ camera: Camera; flash: number }` | градієнтне небо, велике димляче сонце (cx 726, cy 1012), 7 шарів диму, 6 низьких хмар із дрейфом, далекий попіл, `flash` 0…1 підсилює спалах |
| `Horizon` | `{ camera: Camera }` | силуети хмарочосів і труб без обведення, градієнт глибини, вікна-іскри, дим, серпанок |
| `Midground` | `{ camera: Camera }` | обгоріле дерево, похилений знак, бетонні уламки, арматура; усе з контуром **3px** |
| `Ground` | `{ camera: Camera }` | асфальт із градієнтом, теплі відблиски, тріщини, вибоїни, нижня брила; асфальт має запас до `HEIGHT+620` |
| `Embers` | `{ camera: Camera }` | 78 детермінованих частинок: попіл/іскри, glow, flicker; летять знизу вгору |

`flash` у `Sky` — обов'язковий (`LocationSkyProps`); `World` передає `0` за замовчуванням.

### 2.7 `palette.ts`

`INK = #0B0710` (контур). Кольори: небо `skyNight/skyTop/skyMid/skyMaroon/skyWarm/skyHot`, сонце `sunCore/sunMid/sunEdge`, місто `silhouette/silhouetteDeep`, серпанок `haze`, асфальт `asphaltTop/asphaltBottom/asphaltCrack`, частинки `ember/emberHot/ash`, персонажі `skin/jacketBlue/jacketPlum/hair/shadow`.

Не вводь випадкові кольори напряму в купі місць — для нових локацій чи ефектів розширюй `PALETTE` у `src/palette.ts` або описуй узгоджену палітру всередині локації, щоб стиль залишався цілісним.

### 2.8 Модульна система локацій (`src/locations/`) та створення нових локацій

Декорації проєкту побудовані за модульним принципом. Кожна локація живе у власній папці `src/locations/<name>/`, реалізує контракт `LocationDefinition` із `src/locations/types.ts` і реєструється в `src/locations/index.ts`.

У `src/MainScene.tsx` локація обирається за іменем:
- на рівні всієї композиції: `<MainScene location="street" />` або через `defaultProps` у `src/Root.tsx`;
- на рівні окремого шоту (якщо в сценарії герої переходять між різними місцями дії): `<World camera={camera} location="bunker">...</World>`.

#### Покрокова інструкція для агента зі створення нової локації

Коли користувач у сценарії просить нове місце дії (наприклад: `bunker`, `forest`, `metro`, `rooftop`, `wasteland`), виконай такі кроки **за прикладом еталонної локації `src/locations/street/`**:

1. **Створи папку `src/locations/<name>/`** (назва у `lowercase` / `camelCase`, напр. `bunker`).
2. **Створи 5 файлів шарів**, скопіювавши структуру і правила з `src/locations/street/`:
   - `Sky.tsx` — приймає `LocationSkyProps` (`{ camera: Camera; flash: number }`), рендерить `<Layer camera={camera} depth={0.18}>`. Для закритих інтер'єрів (`bunker`, `metro`) замість неба рендерить стелю/дальню стіну, лампи, вентиляцію і використовує `flash` для аварійного миготіння чи спалаху.
   - `Horizon.tsx` — приймає `LocationLayerProps` (`{ camera: Camera }`), рендерить `<Layer camera={camera} depth={0.45}>`. Дальні силуети без контурів (ліс, тунель метро, стіни бункера, гори уламків) + атмосферний серпанок.
   - `Ground.tsx` — приймає `LocationLayerProps` (`{ camera: Camera }`), рендерить `<Layer camera={camera} depth={1}>`. Підлога на лінії горизонту `HORIZON_Y` (`1180`) із обов'язковим запасом по краях (`x: -100 .. WIDTH + 100`, `y` до `HEIGHT + 620`), щоб під час `pan`/`zoom` не з'являлися порожні щілини.
   - `Midground.tsx` — приймає `LocationLayerProps` (`{ camera: Camera }`), рендерить `<Layer camera={camera} depth={0.78}>`. Предмети середнього плану (столи, бочки, дерева, двері, труби) з **3px контуром** кольору `INK` і падаючими тінями.
   - `Embers.tsx` — приймає `LocationLayerProps` (`{ camera: Camera }`), рендерить `<Layer camera={camera} depth={1.18}>`. Частинки переднього плану через детермінований `rand(seed, i)` (іскри, пил у променях, попіл, сніг або краплі). Якщо частинок не треба — поверни порожній `<Layer>` або `null`.
3. **Дотримуйся технічних правил для кожного SVG-шару:**
   - імпорти з кореня: `../../Camera`, `../../palette`;
   - на `<svg>` завжди `viewBox={`0 0 ${WIDTH} ${HEIGHT}`}` і `style={{ overflow: "visible" }}`;
   - унікальні `id` у `<defs>` (градієнти/фільтри, напр. `bunkerFloorGrad` замість `road`), щоб не конфліктувати з іншими локаціями на одній сторінці/переході;
   - жодних `Math.random()` — тільки `rand(seed, i)` із `../../Camera`.
4. **Створи `src/locations/<name>/index.ts`:**

```ts
import type { LocationDefinition } from "../types";
import { Embers } from "./Embers";
import { Ground } from "./Ground";
import { Horizon } from "./Horizon";
import { Midground } from "./Midground";
import { Sky } from "./Sky";

export const bunkerLocation: LocationDefinition = {
  id: "bunker",
  name: "Underground Bunker",
  Sky,
  Horizon,
  Ground,
  Midground,
  Embers,
  // опційно: власний градієнт серпанку між Midground та персонажами (depth 0.92)
  dustBandBackground:
    "linear-gradient(to bottom, rgba(40,60,55,0) 62%, rgba(80,140,120,0.12) 82%, rgba(40,60,55,0) 100%)",
};

export { Embers, Ground, Horizon, Midground, Sky };
```

5. **Зареєструй нову локацію у `src/locations/index.ts`:**

```ts
import { bunkerLocation } from "./bunker";
import { streetLocation } from "./street";
import type { LocationDefinition } from "./types";

export const LOCATIONS = {
  street: streetLocation,
  bunker: bunkerLocation,
} as const satisfies Record<string, LocationDefinition>;
```

Після цього `LocationId` автоматично включатиме `"street" | "bunker"`.

6. **Підключи локацію в `src/MainScene.tsx`** (передай `location="<name>"` у `<MainScene>`, у `Root.tsx`, або у конкретний `<World camera={camera} location="<name>">`).
7. **Перевір результат:** запусти `npm run lint` та зроби `npx remotion still src/index.ts Popsikos2DAnimations out/check.png --frame=...` на широкому і крупному плані, щоб упевнитися, що немає щілин по краях, SVG `id` не перетинаються і текст читається на фоні.

---

## 3. Звук та озвучка

### 3.1 Бібліотека SFX

- Каталог: [`SOUNDS.md`](./SOUNDS.md) — тривалість, рекомендована гучність, мапа міксу.
- Генератор: `generate_sfx.py` (numpy + ffmpeg). Перегенерація з кореня проєкту:

```bash
python generate_sfx.py
```

- Базові файли: `public/sfx/wind_ambient.wav` (12 с), `explosion.wav` (2.5 с), `siren.wav` (4 с), `whoosh.wav` (0.5 с), `glitch.wav` (0.3 с), `pop.wav` (0.15 с). Усі 44100 Hz, stereo, 16-bit; піки від −2.3 до −0.3 dBFS; лімітер у скрипті.
- **Новий звук:** додай функцію в `generate_sfx.py` → у список `library` → запусти `python generate_sfx.py` → додай рядок у `SOUNDS.md` → підключи `<Audio>`. Не клади сторонні mp3 без потреби.

### 3.2 Як працює `<Audio>`

```tsx
import { Audio, Sequence, interpolate, staticFile } from "remotion";

<Sequence from={120} durationInFrames={75} name="Audio: explosion">
  <Audio src={staticFile("sfx/explosion.wav")} volume={0.8} />
</Sequence>
```

Правила:

1. `staticFile("sfx/...")` — тільки для файлів у `public/`; шлях без `public`.
2. Час задається **зовнішнім `<Sequence from durationInFrames>`**, а не пропсами `<Audio>`.
3. `volume` — число або `(frame) => number`, де `frame` **відносний до Sequence**. Для fade використовуй `interpolate` з `extrapolateLeft/Right: "clamp"`.
4. Аудіо тримай на верхньому рівні `MainScene`, не всередині камерного `<Layer>`.
5. Файл коротший за Sequence — обріжеться; довший — обріжеться по `durationInFrames`. Перевіряй, що останній кадр не обірваний на півслові/пів-ударі.
6. Порожня тишина в кінці — теж помилка (перевірка `volumedetect`, розділ 1.6).

### 3.3 Поточна мапа звуку (масштабується від `CUT1`, `CUT2`, `DURATION`)

- Фоновий вітер `wind_ambient.wav` зациклений через `<Loop durationInFrames={360}>` на всю довжину відео з fade-in/fade-out.
- Склейки та акценти прив'язані до `CUT1` і `CUT2`: `pop` на заголовку та обох підписах, `glitch` на переходах, `explosion` і `siren` на `CUT1`, `whoosh` на `CUT2`.

### 3.4 Мульти-озвучка та авто-lip-sync (`public/voices/` + `build_dialogue.py`)

Для реплік кількох персонажів використовується `build_dialogue.py`:

1. Поклади аудіофайли в `public/voices/` з іменами формату `<NN>_<speaker>.<ext>`, наприклад:
   - `01_narrator.wav`
   - `02_char1.wav`
   - `03_char2.wav`
2. Запусти з кореня проєкту:

```bash
python build_dialogue.py
```

3. Скрипт виміряє тривалість кожного файлу через `ffprobe`, розставить репліки з паузою `0.25 s`, згенерує `src/dialogueTimeline.ts` з `TOTAL_FRAMES`, масивом `DIALOGUE` та `ENVELOPES` для кожного спікера.
4. У `MainScene.tsx` уже підключені `DIALOGUE` (озвучка) та `isSpeaking("char1" | "char2" | "narrator", globalFrame)` (автоматичне керування `isTalking` і `mouthType`).

**Правила якісної синхронізації:**
- рот має бути закритий у паузах ≥ 4–6 кадрів та під час реплік `narrator`;
- не вмикай `isTalking` на тихих хвостах реверберації;
- перевіряй очима кадри на початку/всередині/в кінці фрази (`npx remotion still`), а не лише на слух.

---

## 4. Правила безпеки

### 4.1 Не видаляти і не ламати базові компоненти

Без явного прохання користувача **заборонено** видаляти, перейменовувати або переписувати з нуля:

`src/MainScene.tsx`, `src/Character.tsx`, `src/Camera.tsx`, `src/TextOverlays.tsx`, `src/palette.ts`, `src/Root.tsx`, `src/index.ts`, `src/locations/types.ts`, `src/locations/street/*`, `generate_sfx.py`, `build_dialogue.py`, `SOUNDS.md`, `public/sfx/*`.

- Змінюй **точково** (`edit`), зберігаючи публічні експорти та пропи.
- Нові пропси — тільки опційні; не ламай зворотну сумісність.
- Не змінюй `id="Popsikos2DAnimations"`, 1080×1920, 30 fps без запиту.
- Не видаляй еталонну локацію `street` і не ламай інтерфейс `LocationDefinition` у `src/locations/types.ts`.
- Не чіпай `node_modules`, `.git`, `package-lock.json` без потреби; Remotion 4.0.544 зафіксований.
- Не роби `git commit` / `git push`, якщо користувач про це не просив.

### 4.2 Обов'язкова перевірка кадрів перед рендером

Перед **кожним** фінальним рендером:

1. `npm run lint` — чисто.
2. Мінімум 4 still-кадри для перевірки ключових сцен і переходів (наприклад: **30**, **150**, **240**, **300** або пропорційні кадри нового сценарію).
3. Перевір на кадрах:
   - титри не закривають рот/очі персонажа;
   - немає щілин і смуг по краях/знизу (оголені краї шарів);
   - чорна обводка не з'їдена, градієнт читається;
   - персонаж не обрізаний по маківці/підборіддю;
   - українські гліфи не «мохіто» і не квадратики.
4. Лише після цього — `npx remotion render`.

### 4.3 Чекліст «готово»

- [ ] `npm run lint` без помилок.
- [ ] Still-кадри перевірені.
- [ ] `ffprobe`: h264 1080×1920, 30 fps, **є audio-stream**.
- [ ] Звук не німий у всіх чвертях; пік < 0 dBFS; немає кліпінгу.
- [ ] Тривалість відео й аудіо збігається (розбіжність ≤ 0.05 с).
- [ ] Файл лежить у `out/` під погодженим ім'ям.
- [ ] Тимчасові PNG/WAV прибрані з `out/` (сам `out/` у `.gitignore`).

### 4.4 Що можна змінювати вільно

- Створювати нові локації у `src/locations/<name>/` за шаблоном `street/` і реєструвати їх у `src/locations/index.ts`.
- Перемикати `location` у `MainScene.tsx`, `Root.tsx` або в окремих шотах (`<World location="...">`).
- Тексти титрів, тайминги появ, гучності окремих звуків (з перевіркою кліпінгу).
- Нові опційні пропси `Character`/`TextOverlays` з дефолтами.
- Додаткові звуки через `generate_sfx.py` + `SOUNDS.md`.
- Косметику та нові кольори у `PALETTE` (`src/palette.ts`).

### 4.5 Відомі граблі

| Симптом | Причина / ліки |
|---|---|
| `node`/`npm` не знайдено | Node не в PATH — додай у поточну сесію |
| `npm : ... execution policy` (Windows) | викликай `npm.cmd` / `npx.cmd` |
| ESLint `0 is now the default` | не став `from={0}` на перший `<Sequence>` |
| Кирилиця стала `РђРЇ` | PowerShell переписав UTF-8 як ANSI — віднови файл і редагуй у UTF-8 |
| Смуга/щілина по краю кадру | камера вийшла за межі шару; перевір `overflow: visible`, запас `Ground` (`HEIGHT + 620`), `panY` |
| Конфлікт градієнтів між локаціями | однакові `id` у SVG `<defs>` — давай унікальні префікси локації (`bunkerSkyGrad`) |
| Підпис закриває рот | піднято `panY` крупного плану або зменш `top`/розмір підпису |
| Рот не рухається | не запущено `python build_dialogue.py` після зміни `public/voices/` або `isTalking` не збігається з Sequence |
| Тиша в кінці | немає фонового беду після останнього SFX — перевір `<Loop>` на `wind_ambient.wav` |
| Рендер без звуку | `<Audio>` поза композицією / `staticFile` на неіснуючий файл |

---

## 5. Швидка шпаргалка команд

```bash
npm run lint
npx remotion still src/index.ts Popsikos2DAnimations out/check.png --frame=150
python generate_sfx.py
python build_dialogue.py
npx remotion render src/index.ts Popsikos2DAnimations out/episode.mp4 --codec=h264 --crf=18 --image-format=png --pixel-format=yuv420p
```
