# AGENTS.md — Popsikos2DAnimations

> Інструкція для AI-агентів (OpenCode, Claude Code тощо), які змінюють, розширюють або рендерять цей проєкт.
> **Оновлено:** 2026-11-18 · **Корінь:** `./` (корінь репозиторію)
> Дзеркало для Claude Skills (за наявності): `~/.claude/skills/popsikos-2d-animations/SKILL.md`

---

## 0. Що це і як почати за 5 хвилин

**Popsikos2DAnimations** — вертикальні 2D-мультфільми на тему апокаліпсису: **1080×1920, 30 fps**, уся графіка — SVG + React, без 3D і без растрових ассетів. Декорації винесені в модульні локації (`src/locations/`), звук синтезований локально (`generate_sfx.py`), діалоги та lip-sync генеруються з `public/voices/` (`build_dialogue.py`), титри — CSS-текст із comic-обводкою, а 8 кінематографічних планів (wide → map) дає `src/ShotEngine.tsx`. Акторська гра (5 поз рук, постава, погляд, авто-моргання, кивки, `voiceAmplitude`) живе в `src/Character.tsx`, а готові герої — модульні пресети в `src/characters/`.

| Параметр | Значення |
|---|---|
| Remotion / React / TS | 4.0.544 / 19.3.1 / 5.9.3 |
| ID композиції | **`Popsikos2DAnimations`** (на ньому зав'язані команди рендера; не перейменовувати без запиту) |
| Точка входу | `src/index.ts` → `src/Root.tsx` → `src/MainScene.tsx` |
| Тривалість за замовч. | `TOTAL_FRAMES` із `src/dialogueTimeline.ts` (мінімум 1800 кадрів = 60 с @ 30 fps; якщо потрібно 12 с без озвучки — налаштовується в `build_dialogue.py` / `palette.ts`) |
| Еталонна локація | `street` (`src/locations/street/`) |
| Еталонний персонаж | `survivor_alex` (`src/characters/survivor_alex.ts`) |
| Акторська система | `src/Character.tsx` — 5 поз рук, постава, погляд, моргання, `voiceAmplitude` (розділи 2.4, 2.10, 2.11) |
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

Акторські кадри (після змін у `Character.tsx` / `src/characters/`): **34** (моргання Alex),
**60** (Alex `explain` + `voiceAmplitude`), **112** (Maya `point`, Alex слухає), **560** (крупний
план, погляд на знак), **785** (extreme close-up у goggles). Перевіряй, що рот/очі не закриті
титрами, руки не входять у корпус, окуляри й борода не з'їдають обличчя.

Перевірка всіх 8 шотів (по одному кадру з середини кожного плану при `DURATION=1800`):

```bash
for f in 110 335 560 785 1010 1235 1460 1685; do
  npx remotion still src/index.ts Popsikos2DAnimations out/shot-$f.png --frame=$f
done
```

Окремо перевіряй стики планів (`cut`): кадр `224/225`, `449/450`, `674/675`, `899/900`, `1124/1125`, `1349/1350`, `1574/1575` — не має бути щілин, стрибків віньєтки або розмиття, що лишилось від `object-focus`.

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
| `src/MainScene.tsx` | головна сцена: 8 шотів через `CinematicShot`, `World` (рендерить обрану локацію + depth-of-field), `Atmosphere`, `<Audio>`, титри |
| `src/Character.tsx` | SVG-маріонетка: очі, зіниці, рот, дихання, мова + **Advanced Character Acting** (5 поз рук, постава, погляд, авто-моргання, `voiceAmplitude`) |
| `src/characters/types.ts` | контракт `CharacterPreset` / `CharacterLook` для модульного реєстру героїв |
| `src/characters/index.ts` | реєстр `CHARACTERS`, тип `CharacterId`, хелпер `characterProps()` |
| `src/characters/<preset>.ts` | готові герої: `survivor_alex`, `scout_maya`, `commander_viktor`, `engineer_noa` |
| `src/Camera.tsx` | тип `Camera`, компонент `Layer` (паралакс), `cameraTransform`, `rand`, `clamp`, `lerp`, `smoothstep`, `STATIC_CAMERA` |
| `src/ShotEngine.tsx` | **Cinematic Shot Engine**: 8 пресетів (`ShotType`), `<CinematicShot>`, `TopDownPlate`, `TacticalMap` |
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

1. Вісім `<Sequence>` зі шотами - по одному на кожен `ShotType` (рівні частки `DURATION`; за 60 с це по 225 кадрів).
2. `<Atmosphere />` — віньєтка, bloom, нижній fade (screen-space).
3. `<Audio>`-шар (зациклений `wind_ambient`, SFX-хіти на кожному каті та `DIALOGUE` із `public/voices/`).
4. `<Sequence>` з `HookTitle` і трьома `DynamicCaption` (крупний план, POV, карта).

Демо-таймлайн (для `DURATION = 1800`, 60 с @ 30 fps):

| Кадри | `ShotType` | Що в кадрі | Камера / ефект |
|---|---|---|---|
| 0–224 | `wide` | Alex + Maya + Viktor на повний зріст; жести, погляди, реакції | zoom 1.02→1.12, плавний push-in, легкий handheld |
| 225–449 | `medium` | діалог Alex ↔ Maya: `explain`/`point`, схрещені руки, кивки | zoom 1.25→1.35, `pan`, злегка розмитий далекий план |
| 450–674 | `closeup` | обличчя Alex + підпис на 48%, погляд на дорожній знак | zoom 1.5→1.65, автоматичний `panY`-підйом, DOF 2.5 px |
| 675–899 | `extreme-closeup` | очі Maya в goggles на весь кадр | zoom 2.1→2.4, імпульс входу 7 кадрів, вібрація, grain |
| 900–1124 | `top-down` | маківки героїв, мангал/знак/дерево зверху | plate + орбітальний `pan`, roll ±1.8° |
| 1125–1349 | `pov` | вулиця від першої особи + плечі глядача | handheld 7 px, walk-cycle 1.85 Hz, POV-віньєтка |
| 1350–1574 | `object-focus` | дорожній знак, ретикул, боке | zoom 1.7→1.95, CSS blur 7 px на далеких шарах |
| 1575–1799 | `map` | тактична карта: маршрути, цілі, HUD | `static` + scanline, маркери й підписи |

Порядок малювання в `World`: **Sky+Horizon (far plane, `backgroundBlur`) → Ground (`0.45 × blur`) → Midground → dust band (depth .92) → actors (depth 1) → Embers → Atmosphere → audio → text**. Підлога (`Ground`) навмисно під пропсами (`Midground`), інакше поверхня землі ховає декорації на середньому плані.

### 2.3 `Camera.tsx`

```ts
type Camera = {
  zoom: number;
  panX: number;
  panY: number;
  shakeX: number;
  shakeY: number;
  roll?: number;        // Dutch angle, deg (per depth)
  tiltX?: number;       // high-angle 2.5D projection, deg
  perspective?: number; // perspective distance for tiltX, px
};
```

`roll`, `tiltX` та `perspective` **опційні**: старі шоти, де камера створюється як `{ zoom, panX, panY, shakeX, shakeY }`, працюють без змін. `Layer` застосовує:

```ts
scale = 1 + (camera.zoom - 1) * depth;
tx = -camera.panX * depth + camera.shakeX * depth;
ty = -camera.panY * depth + camera.shakeY * depth;
transform = perspective(p) translate3d(tx,ty,0) rotateX(tiltX·min(1,depth)) rotate(roll·depth) scale(s)
```

- `depth 0` — нескінченно далеко; `depth 1` — площина акторів; `>1` — передній план.
- Рекомендовані `depth`: Sky `0.18`, Horizon `0.45`, Midground `0.78`, dust band `0.92`, Ground/actors `1`, Embers `1.18`.
- `cameraTransform(camera, depth)` — чистий хелпер, який повертає CSS-рядок для власних шарів.
- `makeCamera(partial)` / `mixCamera(a, b, t)` — безпечні дефолти та блендинг камер.
- `lerp`, `clamp01`, `smoothstep`, `dampedWave(frame, amp, decay, speed)` — для власних анімацій.
- `rand(seed, i)` — детермінований [0,1), щоб рендери були байт-у-байт стабільні. Не замінюй на `Math.random()`.
- `clamp(v, min, max)`.
- `STATIC_CAMERA` — нульова камера для тестів.

**Пастка країв:** при `zoom = 1` будь-який `pan` оголює край шару. Тому:
1. SVG у всіх шарах мають `style={{ overflow: "visible" }}`;
2. `Ground` простягається до `HEIGHT + 620` (і ширше за `WIDTH` на `[-100, WIDTH + 100]`);
3. для крупних планів використовується підняття `panY` ≈ 300–396.

`CinematicShot` сам клампить `panX/panY` до bleed-запасу шару: `maxPan = (zoom − 1) × size/2 × 0.94`. Якщо збільшуєш `panX/panY` або опускаєш `zoom` — обов'язково перевір кадри на щілини по краях і знизу.

### 2.4 `Character.tsx` — точні пропи (базові + акторські)

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

Акторський варіант (усе — **опційні** пропи, старі виклики працюють без змін):

```tsx
<Character
  x={540}
  y={1900}
  scale={2.05}
  {...characterProps("survivor_alex", { lookAt: { x: 660, y: 1340 } })}
  armPose="explain"
  bodyPosture="lean-forward"
  headTilt={-4}
  isListening={false}
  voiceAmplitude={voiceAmplitude("char1", globalFrame)}
/>
```

#### Базові пропи

| Prop | Тип | За замовч. | Що робить |
|---|---|---|---|
| `x` | `number` (обов'язковий) | — | центр персонажа по X у px кадру |
| `y` | `number` (обов'язковий) | — | **лінія стоп** у px; контейнер зсунутий `translate(-50%, -100%)` |
| `scale` | `number` | `1` | масштаб; локальне полотно 400×640 |
| `flipX` | `boolean` | `false` | дзеркалить SVG; `sunSide` і **локальний напрямок зіниць** враховуються автоматично |
| `eyeType` | `"normal" \| "wide" \| "squint" \| "angry"` | `"normal"` | `wide` зменшує зіниці; `squint` — вузька лінза; `angry` додає брови |
| `pupilOffset` | `{ x: number; y: number }` | `{x:0,y:0}` | ручний зсув зіниць, обрізається до −7…7; **ігнорується, якщо заданий `lookAt`** |
| `mouthType` | `"closed" \| "half" \| "scream" \| "sad" \| "smirk"` | `"closed"` | форма рота в спокої |
| `isTalking` | `boolean` | `false` | старий lip-sync: перемикає рот кожні 3 кадри; `smirk` зберігається. Якщо заданий `voiceAmplitude`, рот веде амплітуда |
| `bodyColor` | `string` | `PALETTE.jacketBlue` | колір куртки |
| `skinColor` | `string` | `PALETTE.skin` | шкіра |
| `hairColor` | `string` | `PALETTE.hair` | волосся |
| `sunSide` | `"left" \| "right"` | `"left"` | **у screen-space**; всередині враховується `flipX` |
| `shadow` | `boolean` | `true` | м'яка овальна тінь під ногами |
| `breathePhase` | `number` | `0` | фазовий зсув дихання/похитування для розсинхрону персонажів |

#### Акторські пропи (Advanced Character Acting)

| Prop | Тип | За замовч. | Що робить |
|---|---|---|---|
| `armPose` | `"idle" \| "shock" \| "explain" \| "point" \| "crossed"` | `"idle"` | 5 окремих поз рук: плече → лікоть → зап'ясток однією квадратичною кривою, контур **3 px** (`ink 29 / колір 23`). `shock` — руки вгору з відкритими долонями; `explain` — права долоня вперед; `point` — вказівний палець; `crossed` — руки схрещені на грудях |
| `bodyPosture` | `"neutral" \| "lean-forward" \| "recoil" \| "slumped"` | `"neutral"` | пластика корпусу навколо таза (rot + dy + scaleY): нахил уперед, відсмикування, зсутуленість; голова отримує додатковий `headDy` |
| `headTilt` | `number` | `0` | додатковий нахил голови в градусах (**−** вліво, **+** вправо); додається до живих мікрорухів і до автоматичного повороту за `lookAt` |
| `lookAt` | `{ x: number; y: number }` | — | точка в **координатах сцени** (та сама площина, що `x`/`y` персонажа). Персонаж сам рахує вектор `dx/dy` від центру голови `y − 472·scale`, повертає зіниці (до ±7 локальних одиниць) і додає легкий поворот голови ≤ 6°. Для `flipX` X-компонента дзеркалиться |
| `isListening` | `boolean` | `false` | реактивне слухання: детерміновані легкі кивки головою кожні ~2.5 с (13 кадрів руху, амплітуда 2.4–5.6° з `rand(seed, cycle)`) |
| `voiceAmplitude` | `number` 0..1 | — | плавна амплітуда голосу (бери `voiceAmplitude(speaker, frame)` з `dialogueTimeline.ts`). Рот безперервно морфиться `closed → half → scream` замість дискретного перемикання; за < 0.03 показується `mouthType` |
| `seed` | `number` | `0` | сід для детермінованих моргань/кивків/дрібного дрейфу погляду; у пресетів різний, щоб герої не блимали синхронно |

**Авто-моргання:** без `Math.random()` — інтервали будуються з `rand(seed, i)`: перша серія на кадрі `24 + rand(seed,7)·46`, далі пауза `58–144` кадри. Закриття триває **3–4 кадри**, перший/останній кадр — напівприкриті (0.55), середина — повністю (1.0). Вії малюються окремою дугою.

**Геометрія:** локальне полотно 400×640, голова `cx=200 cy=168 r=92`, очі `y=158 x=168/232`, рот `(200,214)`, ступні `y≈606`. Плечі `(146/254, 294)`, таз `(200,470)`. Дихання `sin(t*1.5)*3.2`, sway `±0.75°`.

#### Пропси зовнішності (для пресетів)

| Prop | Тип | За замовч. | Що робить |
|---|---|---|---|
| `hairStyle` | `"crop" \| "long" \| "braid" \| "bun" \| "mohawk" \| "bald"` | `"crop"` | зачіска; `braid` додає косу, `bun` — пучок, `long` — масу волосся за головою |
| `glasses` | `"none" \| "round" \| "square" \| "goggles"` | `"none"` | окуляри або тактичні goggles зі strap-ом |
| `hood` | `boolean` | `false` | капюшон (задня маса + передній обід + комір); колір = `accentColor` або `bodyColor` |
| `backpack` | `boolean` | `false` | рюкзак: два боки за корпусом + лямки поверх куртки; колір = `accentColor` |
| `beard` | `boolean` | `false` | борода + вуса; малюється під ротом, рот лишається читабельним |
| `beardColor` | `string` | `hairColor` | окремий тон бороди (сива борода краще темніша за волосся) |
| `accentColor` | `string` | — | шарф/комір/лямки/капюшон одним акцентним кольором |

**Правило сумісності:** нові параметри додавай тільки як **опційні** з дефолтом. Не перейменовуй і не видаляй існуючі пропи — на них зав'язані всі шоти. Повний опис акторської системи та реєстру — розділи **2.10** і **2.11**.

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

### 2.9 Cinematic Shot Engine (`src/ShotEngine.tsx`)

Двигун шотів — це шар поверх `Camera`: він рахує камеру, паралакс, handheld, ефекти й композицію для 8 кінематографічних планів. Імпорт:

```ts
import {
  CinematicShot,   // компонент-обгортка
  SHOT_PRESETS,   // Record<ShotType, ShotPreset>
  SHOT_TYPES,     // масив усіх 8 типів у порядку демо
  computeShot,    // чистий солвер (можна тестувати без React)
  TopDownPlate,   // plate для top-down
  TacticalMap,    // інфографічна карта для map
} from "./ShotEngine";
```

#### Вісім типів шотів

| `type` | Назва | Базовий zoom | Композиція | Паралакс / рух за замовч. |
|---|---|---|---|---|
| `wide` | Загальний план | 1.02–1.12 | повний зріст персонажів + середовище, багато неба | `parallax 1.0`, повільний `push-in`, handheld 1.1 px |
| `medium` | Середній план | 1.25–1.35 | два персонажі по пояс/до колін, діалог | `parallax 0.85`, `pan`, легкий DOF 1.2 px |
| `closeup` | Крупний план | 1.5–1.65 | обличчя + плечі, **авто-підйом `panY`** (focusLine 0.27 + `lift 90`), щоб підпис 48% був під ротом | `parallax 0.6`, `push-in`, DOF 2.5 px |
| `extreme-closeup` | Екстремальний наїзд | 2.1–2.4 | очі/обличчя на весь кадр | імпульс входу 7 кадрів, вібрація ~0.5 px, grain, flash |
| `top-down` | Вид зверху | 1.14–1.26 | окрема plate-проекція: маківки героїв, тіні, дерево/знак/люк на поверхні | `parallax 1.25`, орбітальний `pan`, roll ±1.8° |
| `pov` | Від першої особи | 1.16–1.26 | вулиця з очей героя, плечі глядача внизу | handheld 7 px, walk-cycle 1.85 Hz, м'яка віньєтка |
| `object-focus` | Акцент на предметі | 1.7–1.95 | об'єкт у центрі + ретикул, задні шари розмиті | `parallax 0.7`, CSS blur 7 px → `World backgroundBlur` |
| `map` | Тактична карта | 1.0–1.05 | 2D-схема: сітка, блоки, анімовані маршрути, маркери, HUD | `parallax 0.6`, `static`, scanline |

#### `<CinematicShot>` — повний API

```tsx
<CinematicShot
  type="closeup"                       // обов'язково
  durationInFrames={225}               // обов'язково, довжина <Sequence>
  target={{ x: 540, y: 986 }}          // точка фокусу в координатах кадру
  location="street"                    // LocationId для HUD/plate
  shake={1}                            // 0 = locked, 1 = пресет, >1 = сильніше
  motion="push-in"                     // "push-in" | "pull-out" | "pan" | "static"
  label                                // true = авто-HUD, рядок = власний текст
>
  {({ camera, fx, frame, progress, preset, target, motion }) => (
    <World camera={camera} backgroundBlur={fx.focusBlur}>
      <Character x={540} y={1900} scale={2.05} />
    </World>
  )}
</CinematicShot>
```

| Prop | Тип | За замовч. | Що робить |
|---|---|---|---|
| `type` | `ShotType` | — | один із 8 пресетів вище |
| `durationInFrames` | `number` | — | довжина шоту; має збігатися з `<Sequence>` |
| `target` | `{ x, y }` | `{540, 1190}` | точка, яку камера ставить на `focusLine` пресета |
| `location` | `LocationId` | `DEFAULT_LOCATION` | для HUD-беджа та plate-компонентів |
| `shake` | `number` | `1` | множник handheld/вібрації |
| `motion` | `ShotMotion` | пресет | напрям руху камери |
| `label` | `boolean \| string` | `false` | верхній лівий HUD: номер, тип, motion, локація, тривалість |
| `children` | `ReactNode \| (state) => ReactNode` | — | сцена; функція отримує `camera`, `fx`, `frame`, `progress`, `preset` |

#### `motion` — як рухається камера

| `motion` | zoom | pan |
|---|---|---|
| `push-in` | `zoom[0] → zoom[1]` (ease in-out) | до `target` |
| `pull-out` | `zoom[1] → zoom[0]` | до `target` |
| `pan` | середній zoom + дихання | додає горизонтальний sweep ±7.5% ширини × `parallax` |
| `static` | майже нерухомий + мікродрейф | до `target` |

Солвер `computeShot` сам:
1. ставить `target` на `focusLine` пресета;
2. додає `lift` (headroom) і авто-підйом для `closeup`/`extreme-closeup`;
3. клампить `panX/panY` до bleed-запасу шару, щоб не було щілин;
4. додає детермінований handheld (`sin`/`cos`, без `Math.random()`);
5. повертає `fx` з `focusBlur`, `vignette`, `pov`, `flash`, `grain`, `focusPoint`.

#### Приклади

**1. Крупний план з автоматичним headroom:**

```tsx
<Sequence from={450} durationInFrames={225} name="03 Close-up">
  <CinematicShot
    type="closeup"
    durationInFrames={225}
    target={{ x: 540, y: 986 }}
    motion="push-in"
    location="street"
    label
  >
    {({ camera, fx }) => (
      <World camera={camera} location="street" backgroundBlur={fx.focusBlur}>
        <Character x={540} y={1900} scale={2.05} eyeType="wide" mouthType="sad" />
      </World>
    )}
  </CinematicShot>
</Sequence>
```

**2. Вид зверху (plate):**

```tsx
<CinematicShot type="top-down" durationInFrames={225} motion="pan">
  {({ camera }) => (
    <Layer camera={camera} depth={1}>
      <TopDownPlate location="street" />
    </Layer>
  )}
</CinematicShot>
```

**3. Тактична карта:**

```tsx
<CinematicShot type="map" durationInFrames={225} target={{ x: 742, y: 812 }}>
  {({ camera }) => (
    <Layer camera={camera} depth={0.45}>
      <TacticalMap location="street" target={{ x: 742, y: 812 }} />
    </Layer>
  )}
</CinematicShot>
```

**4. Предметний шот із DOF:**

```tsx
<CinematicShot
  type="object-focus"
  durationInFrames={225}
  target={{ x: 568, y: 1349 }}
  label="OBJECT · ROAD SIGN"
>
  {({ camera, fx }) => (
    <World camera={camera} location="street" backgroundBlur={fx.focusBlur}>
      <></>
    </World>
  )}
</CinematicShot>
```

**5. Тест без React:**

```ts
import { computeShot } from "./ShotEngine";

const { camera, fx } = computeShot({
  type: "extreme-closeup",
  durationInFrames: 225,
  frame: 40,
  target: { x: 540, y: 612 },
  motion: "push-in",
  shake: 1,
});

console.log(camera.zoom, camera.panY, fx.focusPoint);
```

#### Важливі нюанси

- `target` живе в координатах **площини акторів** (`depth 1`). Якщо фокус на глибшому шарі (знак у `Midground`, depth `0.78`), зсувай `target` так, щоб розв'язок для depth 1 збігся з реальною точкою (у демо: `{ x: 568, y: 1349 }` замість `{ x: 560, y: 1298 }`).
- `fx.focusBlur` треба передати у `World backgroundBlur`; сам `CinematicShot` не знає, з яких шарів складається локація.
- `top-down` і `map` — самодостатні plate-компоненти: вони рендеряться замість `World`, а `LocationId` лише підписує HUD.
- `label` вмикай для демо/дебагу; у фінальному фільмі його зазвичай вимикають.
- Усі ефекти детерміновані: `rand(seed, i)` + frame-based `sin`. `Math.random()` заборонений.
- Нові пресети додавай у `SHOT_PRESETS` і `SHOT_TYPES`; `ShotType` виводиться з ключів `SHOT_PRESETS`, тому TS сам підкаже, де оновити демо.

### 2.10 Advanced Character Acting — як ставити гру

Акторська система живе в `src/Character.tsx` і керується пропсами, тому один і той самий
компонент грає і головного героя, і масовку. Ключові принципи:

1. **Пози рук — це дані, не код у сцені.** `armPose` обирає одну з п'яти поз у `ARM_POSES`;
   позицію задають лише три точки (плече, лікоть, зап'ясток), а рука малюється однією
   квадратичною кривою з двома проходами (`INK` 29 px → колір куртки 23 px = рівний контур 3 px).
2. **Поза може змінюватися під час шоту.** Пропси читаються щокадру, тож можна робити
   `armPose={speaking ? "point" : "crossed"}` — персонаж відповідає жестом рівно на своїй репліці.
3. **Погляд — у координатах сцени, не екрана.** `lookAt={{ x, y }}` — це та сама площина, де
   стоять актори (`<Layer depth={1}>`). Не передавай координати камери/зуму: `Character` сам
   знає своє положення і масштаб. Якщо персонаж `flipX`, X-напрямок дзеркалиться автоматично.
4. **`voiceAmplitude` замінює старий `isTalking`.** Бери готовий хелпер із `dialogueTimeline.ts`:

```tsx
import { isSpeaking, voiceAmplitude } from "./dialogueTimeline";
import { characterProps } from "./characters";

const g = from + frame; // глобальний кадр композиції

<Character
  x={332}
  y={1732}
  {...characterProps("survivor_alex", {
    armPose: isSpeaking("char1", g) ? "explain" : "idle",
    lookAt: { x: 752, y: 1006 },
    isListening: isSpeaking("char2", g),
    voiceAmplitude: voiceAmplitude("char1", g),
  })}
/>
```

`voiceAmplitude` віконує 0/1-огинаючу (±2 кадри) і додає детермінований складовий флаттер,
тому рот відкривається плавно: `0` → закрита лінія/`mouthType`, `≈0.4` → `half`, `≈1` → `scream`.
Не викликай `Math.random()` для «живості» — усі мікрорухи вже засіяні через `seed`.

5. **Слухання — це окремий шар гри.** `isListening` вмикає кивки кожні ~2.5 с; вмикай його
   лише тоді, коли говорить **інший** персонаж (`isListening={otherTalking}`), інакше герой
   киватиме сам собі.
6. **Моргання безперервне.** Воно не залежить від `isTalking`: очі закриваються на 3–4 кадри
   з інтервалом 58–144 кадри, серії різні для кожного `seed`.

Рекомендовані комбінації:

| Стан | `armPose` | `bodyPosture` | Інше |
|---|---|---|---|
| спокійна присутність | `idle` | `neutral` | `lookAt` на співрозмовника |
| пояснює | `explain` | `lean-forward` | `voiceAmplitude` + `headTilt` 2–4° |
| наказує / вказує | `point` | `neutral` | різкий `lookAt` у бік цілі |
| шок / тривога | `shock` | `recoil` | `eyeType="wide"`, `headTilt` протилежний руху |
| слухає | `crossed` / `idle` | `neutral` | `isListening`, погляд на мовця |
| втома / розбитість | `idle` | `slumped` | `mouthType="sad"`, повільний `breathePhase` |

### 2.11 Модульний реєстр персонажів (`src/characters/`)

Персонажі, як і локації, — це модулі. Кожен герой — окремий файл-пресет, який описує
**зовнішність і стандартну поставу**, але не позицію на сцені й не живу гру.

```
src/characters/
├─ types.ts              CharacterLook / CharacterPreset
├─ index.ts              CHARACTERS, CharacterId, getCharacter(), characterProps()
├─ survivor_alex.ts      blue field jacket, crop + stubble, backpack
├─ scout_maya.ts         plum hoodie, braid, goggles, scarf
├─ commander_viktor.ts   command coat, bald + grey beard, crossed arms
└─ engineer_noa.ts       teal jumpsuit, bun, square glasses, tool backpack
```

Публічний API:

```ts
import {
  CHARACTERS,        // Record<CharacterId, CharacterPreset>
  CHARACTER_LIST,    // масив пресетів у порядку реєстрації
  CHARACTER_IDS,     // CharacterId[]
  DEFAULT_CHARACTER, // "survivor_alex"
  getCharacter,      // (id) => CharacterPreset
  characterProps,    // (id, overrides?) => Partial<CharacterProps>
} from "./characters";
```

`characterProps` збирає `look` пресета й мерджить overrides — це стандартний спосіб
поставити героя в шот:

```tsx
<Character
  x={540}
  y={1674}
  {...characterProps("scout_maya", {
    scale: 1.04,                       // масштаб під конкретний план
    lookAt: { x: 332, y: 986 },        // координати сцени
    isTalking: mayaTalking,
    voiceAmplitude: voiceAmplitude("char2", g),
    isListening: alexTalking,
  })}
/>
```

#### Покрокова інструкція для агента: створити нового персонажа

Коли користувач просить нового героя (наприклад: «додай медика з рудим хвостом і
медичною сумкою»), виконай рівно ці кроки:

1. **Придумай `id`** у `snake_case`: `<role>_<name>` (`medic_oleg`, `sniper_kira`).
   Це ключ реєстру; він потрапить у `CharacterId` автоматично.
2. **Створи файл `src/characters/<id>.ts`** за шаблоном:

```ts
import { PALETTE } from "../palette";
import type { CharacterPreset } from "./types";

export const medicOleg: CharacterPreset = {
  id: "medic_oleg",
  name: "Oleg",
  role: "Medic / sniper support",
  look: {
    scale: 1.06,
    eyeType: "normal",
    mouthType: "closed",
    bodyColor: PALETTE.jacketOlive,
    skinColor: PALETTE.skin,
    hairColor: PALETTE.hairAuburn,
    hairStyle: "bun",
    glasses: "round",
    hood: false,
    backpack: true,
    beard: false,
    accentColor: "#7C3B44",
    armPose: "idle",
    bodyPosture: "neutral",
    headTilt: -3,
    sunSide: "left",
    breathePhase: 0.9,
    seed: 131, // унікальний, щоб моргання не збігалося
  },
};
```

3. **Вибери риси, які реально розрізняють героїв** — не копіюй попередній пресет:
   інша зачіска (`hairStyle`), інший силует (`hood`, `backpack`, `beard`), інші
   окуляри (`glasses`), інший акцент (`accentColor`), інший зріст (`scale` 0.95–1.2),
   інший `seed`. Обличчя має читатися навіть у `wide`.
4. **Кольори** бери з `PALETTE` (`jacketBlue`, `jacketPlum`, `jacketOlive`, `jacketTeal`,
   `coatCommand`, `hairGrey`, `hairAuburn`, `hairBlonde`). Якщо потрібен новий тон —
   додай його в `PALETTE` (`src/palette.ts`), а не розкидай hex по сцені.
5. **Зареєструй пресет** у `src/characters/index.ts`:

```ts
import { medicOleg } from "./medic_oleg";

export const CHARACTERS = {
  survivor_alex: survivorAlex,
  scout_maya: scoutMaya,
  commander_viktor: commanderViktor,
  engineer_noa: engineerNoa,
  medic_oleg: medicOleg,
} as const satisfies Record<string, CharacterPreset>;
```

6. **Постав героя в сцену** через `characterProps("medic_oleg", { ... })` у потрібному
   `ShotWide`/`ShotMedium`/`ShotCloseup`. Дай йому `lookAt` на співрозмовника та
   `isListening={otherTalking}` — інакше він виглядатиме «вирізаним».
7. **Перевір:** `npm run lint`, потім `npx remotion still` на кадрі, де герой у кадрі
   (широкий і крупний план). Дивись: обличчя не закрите волоссям/капюшоном, борода не
   з'їдає рот, руки не входять у корпус, окуляри не зсунуті, персонаж не обрізаний.
8. **Онови документацію**, якщо додаєш нову рису зовнішності: рядок у таблиці §2.4 і
   приклад у цьому розділі.

**Заборонено:** змінювати `id="Popsikos2DAnimations"`, ламати існуючі `id` пресетів
(на них можуть посилатися сцени), дублювати `seed` у сусідніх героїв або тягнути
растрові ассети — уся графіка лишається SVG.

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

3. Скрипт виміряє тривалість кожного файлу через `ffprobe`, розставить репліки з паузою `0.25 s`, згенерує `src/dialogueTimeline.ts` з `TOTAL_FRAMES`, масивом `DIALOGUE`, `ENVELOPES` та хелперами `isSpeaking()` / `voiceAmplitude()` для кожного спікера.
4. У `MainScene.tsx` уже підключені `DIALOGUE` (озвучка), `isSpeaking("char1" | "char2" | "narrator", globalFrame)` (автоматичне керування `isTalking`) і `voiceAmplitude(speaker, globalFrame)` (плавна амплітуда для `Character.voiceAmplitude`).

**Правила якісної синхронізації:**
- рот має бути закритий у паузах ≥ 4–6 кадрів та під час реплік `narrator`;
- не вмикай `isTalking` на тихих хвостах реверберації;
- перевіряй очима кадри на початку/всередині/в кінці фрази (`npx remotion still`), а не лише на слух.

---

## 4. Правила безпеки

### 4.1 Не видаляти і не ламати базові компоненти

Без явного прохання користувача **заборонено** видаляти, перейменовувати або переписувати з нуля:

`src/MainScene.tsx`, `src/Character.tsx`, `src/Camera.tsx`, `src/ShotEngine.tsx`, `src/TextOverlays.tsx`, `src/palette.ts`, `src/Root.tsx`, `src/index.ts`, `src/locations/types.ts`, `src/locations/street/*`, `src/characters/types.ts`, `src/characters/index.ts`, `generate_sfx.py`, `build_dialogue.py`, `SOUNDS.md`, `public/sfx/*`.

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

- Створювати нових героїв у `src/characters/<id>.ts` і реєструвати їх у `src/characters/index.ts` (див. §2.11).
- Змінювати `look` існуючих пресетів та їхню стандартну поставу, не змінюючи `id`.
- Ставити акторські пропси (`armPose`, `bodyPosture`, `headTilt`, `lookAt`, `isListening`, `voiceAmplitude`, `seed`) у будь-якому шоті `MainScene.tsx`.
- Додавати нові риси зовнішності в `Character.tsx` — **тільки опційними пропсами** з дефолтом, що зберігає старий вигляд.
- Створювати нові локації у `src/locations/<name>/` за шаблоном `street/` і реєструвати їх у `src/locations/index.ts`.
- Перемикати `location` у `MainScene.tsx`, `Root.tsx` або в окремих шотах (`<World location="...">`).
- Тексти титрів, тайминги появ, гучності окремих звуків (з перевіркою кліпінгу).
- Нові опційні пропси `Character`/`TextOverlays` з дефолтами.
- Розширювати `SHOT_PRESETS`/`SHOT_TYPES` у `src/ShotEngine.tsx` новими планами та ефектами (зберігаючи 8 базових пресетів).
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
| Підпис закриває рот | у `closeup`/`extreme-closeup` не опускай `panY` нижче авто-підйому; пресет сам ставить `focusLine 0.27`, перевір кадр на 48% |
| Задній план не розмивається | передай `fx.focusBlur` у `<World backgroundBlur={fx.focusBlur}>`; `CinematicShot` не знає шарів локації |
| Щілина в `top-down`/`map` | plate має bleed `-160..+160`, а `Layer` краще ставити з `depth 1` (top-down) або `0.45` (map); не збільшуй `shake` понад 1.5 |
| Камера «стрибає» на карті | для `map` використовуй `motion="static"` і `shake ≤ 0.5`, інакше HUD-текст тремтить |
| `target` не туди наводить | `target` — координати площини акторів (depth 1); для `Midground` (0.78) компенсуй зсув вручну |
| Рот не рухається | не запущено `python build_dialogue.py` після зміни `public/voices/` або `isTalking` не збігається з Sequence |
| Рот не рухається при `voiceAmplitude` | амплітуда < 0.03 у паузі — це нормально; перевір, що ти передаєш глобальний кадр `from + frame`, а не локальний `frame` |
| Погляд «не туди» | `lookAt` — координати **сцени/площини акторів**, а не екрана після зуму; для `flipX` нічого компенсувати не треба, компонент робить це сам |
| Очі персонажа заплющені на кожному кадрі | `rand(seed, i)` отримав однаковий `seed` у сусідів і збігся з морганням; дай унікальні `seed` у пресетах |
| Руки «вросли» в корпус | `armPose` змінює геометрію плече→лікоть→зап'ясток; для `crossed`/`point`/`explain` руки малюються поверх куртки, не дублюй їх вручну |
| Борода з'їдає рот | зменш висоту бороди або дай `beardColor`, а не `hairColor`; рот малюється після бороди, але темний тон на темному не читається |
| Капюшон ховає обличчя | `hood` малює обід поверх волосся; для крупних планів лишай `hood={false}` або піднімай `headTilt`
| Тиша в кінці | немає фонового беду після останнього SFX — перевір `<Loop>` на `wind_ambient.wav` |
| Рендер без звуку | `<Audio>` поза композицією / `staticFile` на неіснуючий файл |

---

## 5. Швидка шпаргалка команд

```bash
npm run lint
npx remotion still src/index.ts Popsikos2DAnimations out/check.png --frame=150
# акторські кадри (моргання / explain / point / close-up / extreme):
npx remotion still src/index.ts Popsikos2DAnimations out/acting-blink.png --frame=34
npx remotion still src/index.ts Popsikos2DAnimations out/acting-talk1.png --frame=60
npx remotion still src/index.ts Popsikos2DAnimations out/acting-talk2.png --frame=112
npx remotion still src/index.ts Popsikos2DAnimations out/acting-closeup.png --frame=560
npx remotion still src/index.ts Popsikos2DAnimations out/acting-extreme.png --frame=785
# усі 8 шотів (wide, medium, closeup, extreme, top-down, pov, object-focus, map):
npx remotion still src/index.ts Popsikos2DAnimations out/shot-1.png --frame=110
npx remotion still src/index.ts Popsikos2DAnimations out/shot-3.png --frame=560
npx remotion still src/index.ts Popsikos2DAnimations out/shot-8.png --frame=1685
python generate_sfx.py
python build_dialogue.py
npx remotion render src/index.ts Popsikos2DAnimations out/episode.mp4 --codec=h264 --crf=18 --image-format=png --pixel-format=yuv420p
```

**Швидкий старт зі шотами:** імпортуй `CinematicShot` та `SHOT_TYPES` з `src/ShotEngine.tsx`; кожен план — це `<Sequence from={start} durationInFrames={len}>` з `<CinematicShot type=... motion=... target=...>`, а `computeShot({ type, durationInFrames, frame, target, motion, shake })` дає ту саму камеру без React (для тестів/утиліт). Повний перелік типів і пропсів — розділ **2.9**.
