# MosTransport UI Kit

> **Источник истины:** страницы `/login` и `/404` (`NotFoundPage`).  
> Всё новое branded / auth / error / onboarding UI обязано следовать этому документу.  
> Dashboard-shell (`src/shared/theme/theme.ts`) пока на старой системе (чёрный primary, IBM Plex, pill-кнопки) — **не смешивать** с этой DS без явной миграции.


| Эталон            | Путь                                                    |
| ----------------- | ------------------------------------------------------- |
| Login theme       | `src/pages/LoginPage/loginTheme.ts`                     |
| Login styles      | `src/pages/LoginPage/LoginPage.styles.ts`               |
| Login page        | `src/pages/LoginPage/LoginPage.tsx`                     |
| Hero              | `src/pages/LoginPage/HeroSection.tsx`                   |
| Login card / form | `src/components/auth/LoginCard.tsx`, `LoginForm.tsx`    |
| 404 styles        | `src/pages/NotFoundPage/NotFoundPage.styles.ts`         |
| 404 page          | `src/pages/NotFoundPage/NotFoundPage.tsx`               |
| Logo              | `src/components/branding/AppLogo.tsx`                   |
| Icons             | `src/shared/ui/Icon.tsx` + `@hugeicons/core-free-icons` |


---



## 1. Дизайн-принципы

1. **Светлая городская палитра** — холодные синие, почти-белые фоны, тёмный navy-текст. Никакого purple gradient / cream / terracotta / dark-mode по умолчанию.
2. **Brand first на marketing-поверхностях** — логотип TIM крупный, читаемый, не «eyebrow». На login-hero логотип вверху слева, заголовок — главный текстовый сигнал.
3. **Одна композиция на viewport** — login = split (hero | form), 404 = content | illustration. Не dashboard-сетка, не карточки ради карточек.
4. **Реальный visual anchor** — фото/иллюстрация трамвая edge-to-edge (login) или полноразмерная 404-иллюстрация. Декоративный градиент — только как поддержка контраста текста, не как главный визуал.
5. **Soft elevation** — карточки почти белые, лёгкий blur, дышащая тень. Без multi-layer glow и «плавающих» sticker-бейджей.
6. **Fluid type + short-height** — `clamp()` и специальные `@media (max-height: …)` — UI должен жить и на коротких ноутбуках.
7. **Inter для branded surfaces** — выразительный, современный sans. App-shell пока на IBM Plex — не путать.
8. **Без шумовых элементов** — никаких pill-clusters, stat strips, floating badges поверх hero, emoji.

---



## 2. Бренд



### 2.1 Продукт


|               |                                                                          |
| ------------- | ------------------------------------------------------------------------ |
| Продукт       | МосТранс · Прогноз загрузки трамваев                                     |
| Организация   | Транспортные инновации Москвы (TIM)                                      |
| Tone of voice | Спокойный, точный, городской. Короткие фразы. Без маркетингового пафоса. |
| Язык UI       | Русский                                                                  |




### 2.2 Логотип

- Файл: `src/assets/tim_logo.png`
- Компонент: `<AppLogo />` / `<AppLogo compact />`
- Asset **белый на прозрачном** → всегда `filter: brightness(0)` на светлом фоне (чёрный логотип).
- `objectPosition: left center`, `objectFit: contain`, `draggable={false}`, `pointerEvents: none`.
- `alt="Транспортные инновации Москвы"`.


| Контекст               | Ширина                      |
| ---------------------- | --------------------------- |
| Login hero (md)        | `clamp(150px, 18vw, 190px)` |
| Login hero (lg)        | `clamp(180px, 15vw, 250px)` |
| Login mobile (compact) | `min(180px, 60vw)`          |
| 404 desktop            | `210px` fixed               |
| 404 mobile             | `min(180px, 55vw)`          |


**Нельзя:** цветной фильтр, drop-shadow glow, центрировать логотип на hero без причины, уменьшать до «favicon-размера» в header brand-страниц.

### 2.3 Иллюстрации / ассеты


| Ассет            | Файл                              | Использование                             |
| ---------------- | --------------------------------- | ----------------------------------------- |
| Login hero photo | `login_screen.png`                | Full-bleed cover, desktop only            |
| 404 illustration | `404_logo.png`                    | Правая колонка / mobile bottom            |
| (legacy)         | `notfound_screen.png`, `hero.png` | Не использовать в новых экранах без ревью |


Правила изображений:

- `pointerEvents: none`, `userSelect: none`, `draggable={false}`
- Decorative → `alt=""` + `aria-hidden`
- Login: `objectFit: cover`; на lg — `objectPosition: left center`, на md — `center center`
- 404: `objectFit: contain`, `objectPosition: center right`

---



## 3. Цвета (токены)

Имена — канонические. В коде пока часто inline hex — при рефакторе собирать в theme/tokens.

### 3.1 Primary (Brand Blue)


| Token                    | Hex                        | Где                                                       |
| ------------------------ | -------------------------- | --------------------------------------------------------- |
| `color.primary.main`     | `#2867D8`                  | Contained buttons, focus borders, links, checked checkbox |
| `color.primary.dark`     | `#1F56B8`                  | Hover primary                                             |
| `color.primary.light`    | `#4B82E3`                  | Reserved (hover soft / accents)                           |
| `color.primary.contrast` | `#FFFFFF`                  | Текст на primary                                          |
| `color.primary.hoverBg`  | `rgba(40, 103, 216, 0.04)` | Outlined hover bg, action.hover                           |




### 3.2 Text


| Token                    | Hex                   | Роль                                                     |
| ------------------------ | --------------------- | -------------------------------------------------------- |
| `color.text.primary`     | `#07162F`             | Заголовки login, checkbox label                          |
| `color.text.ink`         | `#0E203B` / `#102440` | 404 title / 404 number (почти эквивалентны primary text) |
| `color.text.body`        | `#4A5568`             | Hero description                                         |
| `color.text.muted`       | `#6B819C`             | 404 description                                          |
| `color.text.secondary`   | `#7B879D`             | MUI `text.secondary`                                     |
| `color.text.placeholder` | `#8B96AA`             | Input placeholder, divider label                         |
| `color.text.icon`        | `#64748B`             | Field icons                                              |
| `color.text.button`      | `#101A30` / `#1A2B45` | Outlined button label                                    |
| `color.text.label`       | `#9BB0C8`             | Uppercase eyebrow (404)                                  |




### 3.3 Surfaces


| Token               | Value                    | Роль                                        |
| ------------------- | ------------------------ | ------------------------------------------- |
| `color.bg.page`     | `#F5F9FE`                | Login page / desktop login panel            |
| `color.bg.pageSoft` | `#F7FAFE → #F3F7FC`      | Mobile login vertical gradient              |
| `color.bg.page404`  | `#F8FAFE → #FFFFFF`      | 404 page gradient                           |
| `color.bg.paper`    | `#FFFFFF`                | Cards / inputs                              |
| `color.bg.card`     | `rgba(255,255,255,0.96)` | Login card (+ `backdrop-filter: blur(8px)`) |
| `color.bg.white`    | `#FFFFFF`                | 404 base                                    |




### 3.4 Borders & lines


| Token                     | Hex / value                 | Роль                         |
| ------------------------- | --------------------------- | ---------------------------- |
| `color.border.default`    | `#D7E0EC`                   | theme.divider                |
| `color.border.input`      | `#D6DEEA`                   | OutlinedInput idle           |
| `color.border.inputHover` | `#2867D8`                   | Input hover/focus            |
| `color.border.button`     | `#B9C5D8`                   | Outlined button idle (login) |
| `color.border.buttonAlt`  | `#C5D3E8`                   | Outlined button idle (404)   |
| `color.border.divider`    | `#D8DFE9`                   | Form «или» divider           |
| `color.border.card`       | `rgba(210, 220, 235, 0.45)` | Login card stroke            |
| `color.border.ring`       | `rgba(185, 216, 255, 0.85)` | 404 decorative oval          |




### 3.5 Overlay / wash

```
heroOverlay:
  linear-gradient(90deg,
    rgba(245,249,255,0.72) 0%,
    rgba(245,249,255,0.35) 28%,
    rgba(245,249,255,0) 55%)

mobileLoginBg:
  radial-gradient(ellipse 70% 45% at 50% 0%, rgba(120,170,240,0.16) 0%, transparent 70%),
  linear-gradient(180deg, #F7FAFE 0%, #F3F7FC 100%)
```

Только горизонтальный soft-wash слева на hero — **без** вертикального белого fade поверх фото.

### 3.6 Semantic (минимальный набор)

Пока явный error — через MUI `<Alert severity="error" />`.  
Load-level цвета dashboard (`#1B8F4A / #E6A700 / #E31E24`) **не часть** этой branded DS.

---



## 4. Типографика



### 4.1 Family

```
Branded / auth / 404:
  "Inter", system-ui, -apple-system, sans-serif

Fallback stack на 404 также допускает IBM Plex Sans вторым.
Google Fonts weights: 400, 500, 600, 700 (+ 800 для 404 number — browser synthetic/extra).
```

Подключение: `index.html` (Inter + IBM Plex Sans).

### 4.2 Scale


| Role                       | Size                                                      | Weight  | Line-height | Letter-spacing | Color          | Пример                            |
| -------------------------- | --------------------------------------------------------- | ------- | ----------- | -------------- | -------------- | --------------------------------- |
| **Display / Hero H1**      | md `clamp(34px,4vw,48px)` · lg `clamp(42px,4vw,68px)`     | 700     | 1.05        | `-0.025em`     | `#07162F`      | «Данные сегодня…»                 |
| **Page H1 (card)**         | `clamp(34px,3vw,52px)`                                    | 700     | 1.12        | `-0.02em`      | `#07162F`      | «Вход в систему»                  |
| **Error number**           | desktop `168px` · mobile `clamp(80px,22vw,120px)`         | 800     | 0.88        | `-0.045em`     | `#102440`      | `404`                             |
| **Section H2**             | desktop `40px` · mobile `clamp(26px,7vw,34px)`            | 700     | 1.12        | `-0.02em`      | `#0E203B`      | «Кажется, этот маршрут…»          |
| **Eyebrow label**          | `13px`                                                    | 600     | —           | `0.28em`       | `#9BB0C8`      | `СТРАНИЦА НЕ НАЙДЕНА` (uppercase) |
| **Body / hero desc**       | md `clamp(15px,1.5vw,19px)` · lg `clamp(17px,1.4vw,22px)` | 400     | 1.4         | —              | `#4A5568`      | Hero copy                         |
| **Body muted**             | `17px` / mobile `15px`                                    | 400     | 1.45        | —              | `#6B819C`      | 404 description                   |
| **Button**                 | `15–16px`                                                 | 600     | —           | —              | contrast / ink | Primary / SSO                     |
| **Field input**            | `15px`                                                    | 400     | —           | —              | primary text   | TextField                         |
| **Meta / link / checkbox** | `14px`                                                    | 400–500 | —           | —              | ink / primary  | «Запомнить», «Забыли пароль?»     |
| **Divider label**          | `14px`                                                    | 400     | —           | —              | `#8B96AA`      | «или»                             |




### 4.3 Правила набора

- Заголовки: **negative tracking** (`-0.02em` … `-0.045em`).
- Hero title разбивается на **отдельные строки** (`display: block` на `.hero-line`), не одним абзацем.
- Eyebrow: всегда `textTransform: uppercase` + широкий tracking.
- `textTransform: none` на всех кнопках (override MUI default).
- Описание hero может использовать `whiteSpace: pre-line` для ручных переносов.



### 4.4 Short-height overrides


| Media               | Что жмём                                                  |
| ------------------- | --------------------------------------------------------- |
| `max-height: 760px` | Hero title ↓, description ↓, card padding ↓, field gaps ↓ |
| `max-height: 800px` | Login title ↓, field height → 54px                        |


---



## 5. Spacing & layout



### 5.1 База

Используем MUI spacing (8px) + `clamp()` для вертикали, привязанной к viewport.

Типичные ритмы:

- Field gap: `clamp(12px, 2vh, 18px)`
- Form top: `clamp(20px, 3vh, 32px)`
- Button top: `clamp(16px, 2vh, 24px)`
- Divider block: `clamp(18px, 2.5vh, 28px)` сверху / снизу
- 404 content stack: label → number → title(+22) → desc(+16) → buttons(+28, gap 12)



### 5.2 Breakpoints (фактические в коде)


| Имя            | Значение                    | Где                                     |
| -------------- | --------------------------- | --------------------------------------- |
| Mobile / stack | `< md (900px)` MUI          | Login: hero скрыт, logo compact сверху  |
| 404 mobile     | `< 768px` (`useMediaQuery`) | Обычный flow + scroll                   |
| Desktop login  | `≥ md`                      | Split grid, `100dvh`, overflow hidden   |
| Wide           | `lg`                        | Шире hero type / logo, grid `3fr / 2fr` |


**Важно:** login и 404 используют **разные** mobile breakpoints (900 vs 768). При унификации новых страниц предпочитать **768** для content/illustration и **md(900)** если нужен MUI grid split как у login — документировать выбор в PR.

### 5.3 Login layout

```
grid (md+):
  columns: minmax(0,1fr) minmax(380px,1fr)   // lg: 3fr / minmax(430px,2fr)
  height: 100dvh
  overflow: hidden (desktop)

Left  = Hero (full-bleed photo + overlay + logo + copy)
Right = Login panel (centered card)
Mobile = logo + card, soft radial bg, scroll OK
```



### 5.4 404 layout (desktop)

Фиксированный design canvas **1440 × 900**, scale-to-fit:

```
scale = min(vw / 1440, vh / 900)
outer frame = 1440*scale × 900*scale
inner canvas transform: scale(s); transform-origin: top left

grid:
  "logo logo"
  "content illustration"
  columns: 460px | 1fr
  padding: 36 / 28 / 24 / 56 (t/r/b/l)
  columnGap: 16
```

На desktop: `overflow: hidden` на `html/body`.  
На mobile: column flex, scroll, illustration снизу.

---



## 6. Radius, shadow, stroke


| Token                | Value                                           | Применение                             |
| -------------------- | ----------------------------------------------- | -------------------------------------- |
| `radius.card`        | `24px` (short-height `20px`)                    | Login card                             |
| `radius.input`       | `12px`                                          | OutlinedInput, theme.shape             |
| `radius.button`      | `10px` (login theme) / `12px` **(404 buttons)** | Стремиться к **12px** для новых кнопок |
| `shadow.card`        | `0 12px 40px rgba(31, 70, 120, 0.08)`           | Login card                             |
| `shadow.button`      | `none` (idle + hover)                           | Все contained                          |
| `stroke.card`        | `1px solid rgba(210,220,235,0.45)`              | Login card                             |
| `stroke.focus`       | `1.5px` primary                                 | Focused input                          |
| `stroke.outlinedBtn` | `1.5px` (404) / `1px` (login outlined)          | Prefer 1.5 на error/CTA secondary      |
| `blur.card`          | `backdrop-filter: blur(8px)`                    | Login card                             |


---



## 7. Компоненты



### 7.1 Button — Primary (contained)

```
height:     clamp(52px, 6vh, 62px)  | 404 fixed 52
maxHeight:  64
radius:     12px (target) / 10px (loginTheme root)
bg:         #2867D8 → hover #1F56B8
color:      #FFFFFF
weight:     600
size:       15–16px
shadow:     none always
textTransform: none
fullWidth:  forms yes; 404 CTA — auto width + px ~ 3.25
```

Label examples: «Войти», «Вернуться на главную», «Войти через SSO».

Disabled: стандартный MUI opacity при `submitting`.

### 7.2 Button — Secondary (outlined)

```
height:     same as primary
border:     #B9C5D8 (login) / #C5D3E8 @ 1.5px (404)
color:      #101A30 / #1A2B45
hover:      border #2867D8, bg rgba(40,103,216,0.04), color #2867D8 (404)
weight:     600
startIcon: optional (SSO → Building03, size 20, color #101A30)
```



### 7.3 TextField (Outlined)

```
height root:   xs 56 / md 60 / lg 62  (short-h: 52–54)
radius:        12
bg:            #FFFFFF
border idle:   #D6DEEA
border hover:  #2867D8
border focus:  #2867D8, width 1.5
font:          15px
padding:       theme 16×14; в login fields py:0 (высота через root)
placeholder:   #8B96AA, opacity 1
ellipsis:      overflow hidden на input
```

**Adornments:**

- Start: Hugeicon 20px, color `#64748B`, strokeWidth `1.75`
- End (password toggle): IconButton `size="small"`, aria-label «Показать/Скрыть пароль»

Placeholders (не labels): «Электронная почта», «Пароль».  
Validation: helperText под полем, русские сообщения («Введите логин или email»).

### 7.4 Checkbox + FormControlLabel

```
unchecked: #B9C5D8
checked:   #2867D8
size:      small
label:     14px / #07162F
row:       space-between с link «Забыли пароль?»
```



### 7.5 Link

```
color:      #2867D8
weight:     500
decoration: none → underline on hover
size:       14px в meta-ряду
```



### 7.6 Divider («или»)

```
MuiDivider with children
color label: #8B96AA / 14px
line:        #D8DFE9
```



### 7.7 Card / Panel

Login card — единственный «card» в DS (контейнер взаимодействия):

```
maxWidth:   xs 480 / md 460 / lg 520
bg:         rgba(255,255,255,0.96)
radius:     24
shadow:     0 12px 40px rgba(31,70,120,0.08)
border:     1px solid rgba(210,220,235,0.45)
blur:       8px
padding:    xs 24 | md clamp(24px,3vh,40px) clamp(26px,2.5vw,42px)
```

**Правило:** карточки не использовать в hero и не плодить на brand-страницах без интерактива.

### 7.8 Alert

MUI `<Alert severity="error" />` над формой, `mb: 1.5`. Пока без кастомного override — не изобретать красный «tram» accent на auth.

### 7.9 Icon

Обёртка: `<Icon icon={…} size={20} color="…" strokeWidth={1.75} />`  
Библиотека: `@hugeicons/core-free-icons` + `@hugeicons/react`.

Канон в forms: `UserIcon`, `LockIcon`, `ViewIcon` / `ViewOffIcon`, `Building03Icon`.  
Default stroke в `Icon`: `1.5`; в login fields используем `1.75`.

### 7.10 AppLogo

См. §2.2. Всегда через компонент, не сырой `<img>` с другим фильтром.

---



## 8. Паттерны страниц



### 8.1 Auth / Login (split hero)

1. `ThemeProvider theme={loginTheme}` — **обязателен** (не глобальный app theme).
2. Desktop: lock scroll на `html/body` при `min-width: 900px`.
3. Hero только `md+`; mobile — compact logo над карточкой.
4. Одна H1 на карточке («Вход в систему»); hero H1 — про продукт.
5. Form: email → password → options row → primary → divider → SSO.
6. SSO-only mode: только одна primary «Войти через SSO».



### 8.2 Error / 404

1. Eyebrow → giant number (+ decorative ring) → H2 → body → CTA pair (primary + outlined back).
2. Desktop: design-canvas scale (1440×900), не «просто flex».
3. Ring: absolute oval `rotate(-16deg)`, `border 1.5px`, opacity 0.75 — **не** перекрывать логотип (`line-height` у wrap ≠ 0).
4. Primary → `/dashboard`; secondary → `navigate(-1)`.
5. Не превращать в dashboard chrome (sidebar/header app).



### 8.3 Будущие empty / forbidden / maintenance

Копировать **структуру 404** (eyebrow + display number/icon + title + muted body + 2 CTAs + optional illustration), цвета и кнопки из этого kit.  
Текущий `ForbiddenPage` — **не эталон**, подлежит редизайну под DS.

---



## 9. Motion

Сейчас motion минимален (без framer на login/404). При добавлении:

- 2–3 осознанных движения max на screen (logo/content fade-in, soft image ken-burns **не** обязателен).
- Duration ~200–320ms, easing standard ease-out.
- Не анимировать blur/shadow на каждый hover кнопки.
- Respect `prefers-reduced-motion`.

---



## 10. Accessibility

- Секции с `aria-label` («О продукте», «Авторизация»).
- Decorative images: `alt=""`, `aria-hidden`.
- Password toggle: осмысленный `aria-label`.
- Focus rings: не убивать outline у IconButton/Link; input focus = primary border 1.5.
- Контраст: navy `#07162F` / `#0E203B` на `#F5F9FE` / white — ок; muted `#6B819C` только для secondary body.
- Forms: `noValidate` + своя валидация; `autoComplete` username / current-password.
- Не использовать `line-height: 0` на крупных цифрах рядом с логотипом.

---



## 11. Do / Don’t



### Do

- Использовать `#2867D8` как единственный brand primary на auth/error.
- Inter + negative tracking на заголовках.
- Soft blue-gray surfaces (`#F5F9FE` family).
- Full-bleed photo / large illustration as visual anchor.
- `clamp` + short-height media.
- Кнопки без тени, radius ~12, weight 600, без uppercase.
- Логику стилей держать в `*.styles.ts` рядом со страницей; theme overrides — в `loginTheme` (или будущем `brandTheme`).



### Don’t

- Не тащить dashboard theme (чёрный primary, pill `borderRadius: 999`, IBM Plex) на login/404.
- Не purple / indigo gradients, cream+serif, dark neo-glass.
- Не карточки в hero, не floating badges на фото.
- Не inset «картинка в скруглённой плашке» вместо full-bleed.
- Не emoji, не stat strips на первом viewport brand-страниц.
- Не смешивать 404-scale-canvas с обычным flow на desktop без причины.
- Не коммитить сырые цветные логотипы без `brightness(0)` на светлом фоне.

---



## 12. Чеклист для новой branded-страницы

- [ ] `ThemeProvider` с brand/login theme (или общий `brandTheme`, когда вынесем)
- [ ] Font Inter, colors из §3
- [ ] Logo через `<AppLogo />`
- [ ] Primary/outlined buttons по §7.1–7.2
- [ ] Одна ясная композиция на первый viewport
- [ ] Реальный visual anchor (фото/иллюстрация) или осознанный typographic-only layout как 404 content
- [ ] Mobile + short-height проверены
- [ ] Нет dashboard chrome, если это auth/error/marketing
- [ ] Русский копирайт, спокойный тон
- [ ] A11y: labels, alt, focus

---



## 13. Миграция / долг


| Что                            | Статус                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| Login + 404                    | ✅ Эталон DS                                                     |
| `loginTheme` vs global `theme` | ⚠️ Две системы; вынести `brandTheme`                            |
| `ForbiddenPage`                | ❌ Не в DS                                                       |
| Dashboard widgets              | Старая MT/Uber-density тема — отдельно                          |
| Color tokens file              | Пока inline hex — собрать при рефакторе                         |
| Button radius 10 vs 12         | Унифицировать к 12                                              |
| Font weight 800 на 404         | Добавить `wght@800` в Google Fonts link при желании точного cut |


---



## 14. Quick reference (copy-paste)

```ts
export const brand = {
  primary: '#2867D8',
  primaryHover: '#1F56B8',
  primarySoft: 'rgba(40, 103, 216, 0.04)',
  text: '#07162F',
  textInk: '#0E203B',
  textBody: '#4A5568',
  textMuted: '#6B819C',
  textPlaceholder: '#8B96AA',
  textLabel: '#9BB0C8',
  textIcon: '#64748B',
  textButton: '#101A30',
  bg: '#F5F9FE',
  paper: '#FFFFFF',
  border: '#D6DEEA',
  borderStrong: '#B9C5D8',
  borderButton: '#C5D3E8',
  borderDivider: '#D8DFE9',
  borderCard: 'rgba(210, 220, 235, 0.45)',
  ring: 'rgba(185, 216, 255, 0.85)',
  shadowCard: '0 12px 40px rgba(31, 70, 120, 0.08)',
  radiusCard: 24,
  radiusControl: 12,
  radiusButton: 12,
  font: '"Inter", system-ui, -apple-system, sans-serif',
  designCanvas: { w: 1440, h: 900 },
} as const
```

---

*Документ отражает состояние кода на момент создания. При изменении login/404 - обновлять этот файл в том же PR.*