# MosTransport UI Kit

> **Источник истины:**  
> • Branded / auth / error: `/login`, `/404`, `/forbidden`  
> • App shell / analytics: `src/shared/theme/theme.ts` + `AppLayout` / `AppTopBar`  
>
> Токены: `src/shared/theme/brand.ts`. `loginTheme` и `lightTheme` собираются из них (+ shared `controls.ts`).  
> Login — отдельный `ThemeProvider` (lock-scroll split, auth text/bg). Dark mode — **только** app-shell.


| Эталон              | Путь                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| Brand tokens        | `src/shared/theme/brand.ts`                                          |
| Shared controls     | `src/shared/theme/controls.ts`                                       |
| Login theme         | `src/pages/LoginPage/loginTheme.ts` (uses `brand` + controls)        |
| Login styles        | `src/pages/LoginPage/LoginPage.styles.ts`                            |
| Login page          | `src/pages/LoginPage/LoginPage.tsx`                                  |
| Hero                | `src/pages/LoginPage/HeroSection.tsx`                                |
| Login card / form   | `src/components/auth/LoginCard.tsx`, `LoginForm.tsx`                 |
| 404 styles          | `src/pages/NotFoundPage/NotFoundPage.styles.ts`                      |
| 404 page            | `src/pages/NotFoundPage/NotFoundPage.tsx`                            |
| 403 styles          | `src/pages/ForbiddenPage/ForbiddenPage.styles.ts`                    |
| 403 page            | `src/pages/ForbiddenPage/ForbiddenPage.tsx`                          |
| Error content       | `src/components/errors/*`                                            |
| App theme (L/D)     | `src/shared/theme/theme.ts` (uses `brand` + controls)                |
| Color mode          | `src/shared/theme/ColorModeProvider.tsx`                             |
| App layout / chrome | `src/widgets/layout/AppLayout.tsx`, `AppTopBar.tsx`                  |
| Logo                | `src/components/branding/AppLogo.tsx`                                |
| Icons               | `src/shared/ui/Icon.tsx` + `@hugeicons/core-free-icons`              |
| Load semantics      | `LOAD_COLORS` / `loadLevel.ts` / `loadThresholds.ts`                 |


---



## 1. Дизайн-принципы

1. **Светлая городская палитра** — холодные синие, почти-белые фоны, тёмный navy-текст. Никакого purple gradient / cream / terracotta. Dark mode — opt-in только в app-shell.
2. **Один brand primary** — `#2867D8` на auth, error **и** dashboard. Не чёрный primary, не pill `borderRadius: 999`.
3. **Brand first на marketing-поверхностях** — логотип TIM крупный. На login-hero логотип вверху слева, заголовок — главный текстовый сигнал.
4. **Одна композиция на viewport (brand)** — login = split (hero \| form), 404 = content \| illustration, 403 = centered illustration + copy. Не dashboard-сетка.
5. **Dashboard = density + clarity** — KPI / map / charts в Paper-блоках, bento top-bar, bottom nav у диспетчера. Карточки здесь — контейнеры взаимодействия (ок).
6. **Реальный visual anchor** — фото трамвая edge-to-edge (login) или крупная иллюстрация (404/403).
7. **Soft elevation** — почти белые поверхности, дышащая тень `0 4–12px … rgba(31,70,120,…)`. Без multi-layer glow.
8. **Fluid type + short-height** — `clamp()` и `@media (max-height: …)` на branded. App: `100dvh` + carousel при тесном viewport.
9. **Inter везде** — branded и app. IBM Plex — только fallback в stack.
10. **Без шумовых элементов** — никаких pill-clusters, floating badges поверх hero, emoji.



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
| 404 / 403 desktop      | `210px` fixed               |
| 404 / 403 mobile       | `min(180px, 55vw)`          |
| App top bar            | compact, в bento-чипе       |


**Нельзя:** цветной фильтр, drop-shadow glow, центрировать логотип на hero без причины, уменьшать до «favicon-размера» в header brand-страниц.

### 2.3 Иллюстрации / ассеты


| Ассет            | Файл                              | Использование                                  |
| ---------------- | --------------------------------- | ---------------------------------------------- |
| Login hero photo | `login_screen.png`                | Full-bleed cover, desktop only                 |
| 404 illustration | `404_logo.png`                    | Правая колонка / mobile bottom                 |
| 403 illustration | `notfound_screen.png`             | Centered above title (ForbiddenIllustration)   |
| (legacy)         | `hero.png`                        | Не использовать в новых экранах без ревью      |


Правила изображений:

- `pointerEvents: none`, `userSelect: none`, `draggable={false}`
- Decorative → `alt=""` + `aria-hidden`
- Login: `objectFit: cover`; на lg — `objectPosition: left center`, на md — `center center`
- 404: `objectFit: contain`, `objectPosition: center right`
- 403: `objectFit: contain`, `objectPosition: center`, maxHeight ~360 desktop / ~260 mobile

---



## 3. Цвета (токены)

Канон: `src/shared/theme/brand.ts`. Login/app темы читают оттуда; 404/403 styles пока часто inline hex — тянуть к `brand.*` при правках.

### 3.1 Primary (Brand Blue)


| Token                    | Hex                        | Где                                                       |
| ------------------------ | -------------------------- | --------------------------------------------------------- |
| `color.primary.main`     | `#2867D8`                  | Contained buttons, focus borders, links, map accents      |
| `color.primary.dark`     | `#1F56B8`                  | Hover primary                                             |
| `color.primary.light`    | `#4B82E3`                  | Dark-mode primary / soft accents                          |
| `color.primary.contrast` | `#FFFFFF`                  | Текст на primary                                          |
| `color.primary.hoverBg`  | `rgba(40, 103, 216, 0.04)` | Outlined hover bg, action.hover                           |
| `color.secondary.main`   | `#1A4FA0`                  | App secondary (navy-blue, не MT-red)                      |




### 3.2 Text


| Token                    | Hex                   | Роль                                                     |
| ------------------------ | --------------------- | -------------------------------------------------------- |
| `color.text.primary`     | `#07162F`             | Заголовки login, checkbox label                          |
| `color.text.app`         | `#0A1F44`             | App-shell `palette.text.primary`                         |
| `color.text.ink`         | `#0E203B` / `#102440` | 404/403 title / 404 number                               |
| `color.text.body`        | `#4A5568`             | Hero description                                         |
| `color.text.muted`       | `#6B819C`             | 404/403 description, app `text.secondary`                |
| `color.text.secondary`   | `#7B879D`             | Login theme `text.secondary`                             |
| `color.text.placeholder` | `#8B96AA`             | Input placeholder, divider label                         |
| `color.text.icon`        | `#64748B`             | Field icons                                              |
| `color.text.button`      | `#101A30` / `#1A2B45` | Outlined button label (login / 404)                      |
| `color.text.label`       | `#9BB0C8`             | Uppercase eyebrow (404), 403 error code                  |




### 3.3 Surfaces


| Token               | Value                    | Роль                                        |
| ------------------- | ------------------------ | ------------------------------------------- |
| `color.bg.page`     | `#F5F9FE`                | Login page / desktop login panel            |
| `color.bg.app`      | `#F6F9FD`                | App-shell `background.default`              |
| `color.bg.pageSoft` | `#F7FAFE → #F3F7FC`      | Mobile login vertical gradient              |
| `color.bg.page404`  | `#F8FAFE → #FFFFFF`      | 404 / 403 page gradient                     |
| `color.bg.paper`    | `#FFFFFF`                | Cards / inputs / bento chips                |
| `color.bg.card`     | `rgba(255,255,255,0.96)` | Login card (+ `backdrop-filter: blur(8px)`) |
| `color.bg.segment`  | `#EEF3FA`                | ToggleButtonGroup track                     |




### 3.4 Borders & lines


| Token                     | Hex / value                 | Роль                         |
| ------------------------- | --------------------------- | ---------------------------- |
| `color.border.default`    | `#D7E0EC`                   | theme.divider, AppBar        |
| `color.border.input`      | `#D6DEEA`                   | OutlinedInput idle           |
| `color.border.inputHover` | `#2867D8`                   | Input hover/focus            |
| `color.border.button`     | `#B9C5D8`                   | Outlined button idle         |
| `color.border.buttonAlt`  | `#C5D3E8`                   | Outlined button idle (404)   |
| `color.border.divider`    | `#D8DFE9`                   | Form «или» divider           |
| `color.border.card`       | `rgba(210, 220, 235, 0.45)` | Login card stroke            |
| `color.border.paper`      | `rgba(215, 224, 236, 0.7)`  | App Paper / Card             |
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

### 3.6 Semantic / load levels (app + map)

```
LOAD_COLORS (theme.ts):
  low:    #2E9E6B
  medium: #E5A000
  high:   #D64545

LOAD_THRESHOLDS (loadThresholds.ts):
  medium ≥ 140, high ≥ 260

Labels: Низкая / Средняя / Высокая
```

MUI semantic: `success #2E9E6B`, `warning #E5A000`, `error #D64545`, `info #2867D8`.  
Auth error — через MUI `<Alert severity="error" />`, без кастомного «tram» accent.

### 3.7 Dark mode (app-shell only)


| Token     | Value     |
| --------- | --------- |
| bg        | `#0B1526` |
| paper     | `#132038` |
| text      | `#E8EEF7` |
| secondary | `#9BB0C8` |
| divider   | `#243552` |
| primary   | `#4B82E3` |

Хранится в `localStorage` key `mostrans-color-mode`. Login/404/403 **не** переключаются.

---



## 4. Типографика



### 4.1 Family

```
All surfaces:
  "Inter", system-ui, -apple-system, sans-serif

App theme + 404/403 also list IBM Plex Sans as fallback.
Google Fonts (index.html): Inter + IBM Plex Sans, wght 400–700.
```

### 4.2 Scale — branded


| Role                       | Size                                                      | Weight  | Line-height | Letter-spacing | Color          | Пример                            |
| -------------------------- | --------------------------------------------------------- | ------- | ----------- | -------------- | -------------- | --------------------------------- |
| **Display / Hero H1**      | md `clamp(34px,4vw,48px)` · lg `clamp(42px,4vw,68px)`     | 700     | 1.05        | `-0.025em`     | `#07162F`      | «Данные сегодня…»                 |
| **Page H1 (card)**         | `clamp(34px,3vw,52px)`                                    | 700     | 1.12        | `-0.02em`      | `#07162F`      | «Вход в систему»                  |
| **Error number**           | desktop `168px` · mobile `clamp(80px,22vw,120px)`         | 800     | 0.88        | `-0.045em`     | `#102440`      | `404`                             |
| **Section H2 / 403 title** | 404: `40px` · 403: `48px` · mobile clamp                  | 700     | 1.12        | `-0.02em`      | `#0E203B`      | «Кажется…» / «Нет доступа»        |
| **Eyebrow label**          | `13px`                                                    | 600     | —           | `0.28em`       | `#9BB0C8`      | `СТРАНИЦА НЕ НАЙДЕНА` (uppercase) |
| **Body / hero desc**       | md `clamp(15px,1.5vw,19px)` · lg `clamp(17px,1.4vw,22px)` | 400     | 1.4         | —              | `#4A5568`      | Hero copy                         |
| **Body muted**             | 404 `17px` · 403 `19px` · mobile ↓                        | 400     | 1.45–1.5    | —              | `#6B819C`      | Error description                 |
| **Button**                 | `15–16px`                                                 | 600     | —           | —              | contrast / ink | Primary / SSO                     |
| **Field input**            | `15px`                                                    | 400     | —           | —              | primary text   | TextField                         |
| **Meta / link / checkbox** | `14px`                                                    | 400–500 | —           | —              | ink / primary  | «Запомнить», «Забыли пароль?»     |
| **Divider label**          | `14px`                                                    | 400     | —           | —              | `#8B96AA`      | «или»                             |
| **Error code line**        | `14px`                                                    | 500     | —           | —              | `#9BB0C8`      | `Код ошибки: 403`                 |




### 4.3 Scale — app shell


| Role            | Approx                         | Notes                                      |
| --------------- | ------------------------------ | ------------------------------------------ |
| Page H1         | MUI `h5`, weight 700           | `<PageHeader />`                           |
| KPI value       | `18–20px`, weight 700, `-0.025em` | `KpiBar`                                |
| KPI caption     | `11.5px`, weight 600           | `text.secondary`                           |
| Nav / tabs      | `14px`, weight 600             | `textTransform: none`                      |
| Bottom nav label| caption, weight 600            | Active → primary                           |


### 4.4 Правила набора

- Заголовки: **negative tracking** (`-0.02em` … `-0.045em`).
- Hero title разбивается на **отдельные строки** (`display: block` на `.hero-line`).
- Eyebrow: всегда `textTransform: uppercase` + широкий tracking.
- `textTransform: none` на всех кнопках / tabs / toggles.
- Описание hero может использовать `whiteSpace: pre-line`.



### 4.5 Short-height overrides (login)


| Media               | Что жмём                                                  |
| ------------------- | --------------------------------------------------------- |
| `max-height: 760px` | Hero title ↓, description ↓, card padding ↓, field gaps ↓ |
| `max-height: 800px` | Login title ↓, field height → 54px                        |


---



## 5. Spacing & layout



### 5.1 База

MUI spacing (8px) + `clamp()` для branded vertical rhythm.

Типичные ритмы (login):

- Field gap: `clamp(12px, 2vh, 18px)`
- Form top: `clamp(20px, 3vh, 32px)`
- Button top: `clamp(16px, 2vh, 24px)`
- Divider block: `clamp(18px, 2.5vh, 28px)` сверху / снизу
- 404 content stack: label → number → title(+22) → desc(+16) → buttons(+28, gap 12)
- 403 stack: illustration → title(+10) → desc(+16) → button(+32) → code(+28)



### 5.2 Breakpoints


| Имя                 | Значение                              | Где                                              |
| ------------------- | ------------------------------------- | ------------------------------------------------ |
| Mobile / stack      | `< md (900px)` MUI                    | Login: hero скрыт, logo compact сверху           |
| Error mobile        | `< 768px`                             | 404 / 403: flow + scroll                         |
| Filters drawer      | `< lg`                                | Temporary drawer вместо inline sidebar           |
| Top bar desktop     | `≥ 1200px`                            | Filters toggle semantics                         |
| Spacious dashboard  | `≥ 1600×1180`                         | Full static grid; иначе `BlockCarousel`          |
| Desktop login       | `≥ md`                                | Split grid, `100dvh`, overflow hidden            |
| Wide login          | `lg`                                  | Шире hero type / logo, grid `3fr / 2fr`          |


**Важно:** login и error используют **разные** mobile breakpoints (900 vs 768). Для новых error/marketing — **768**; для MUI split как login — **md(900)**.

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

### 5.5 403 layout (desktop)

Тот же canvas **1440 × 900**, но **centered column** (не 2-col grid):

```
logo: absolute top-left (36 / 56)
content: flex column, align center, maxWidth 760
illustration above title (maxWidth 680, maxHeight 360)
single primary CTA → /dashboard
footer line: «Код ошибки: 403»
```

### 5.6 App shell layout

```
AppLayout (100dvh, column, overflow hidden):
  AppTopBar          — bento chips (filters / logo / theme / user)
  main (flex 1)      — page Outlet, scroll
  DispatcherBottomNavigation — fixed; reserve DISPATCHER_BOTTOM_NAV_SPACE

Filters: temporary Drawer < lg; on dashboard also inline sidebar when spacious.
FILTERS_SIDEBAR_WIDTH / dashboard filters column = 300

Chrome: `AppTopBar` + `DispatcherBottomNavigation`. Nav items — `widgets/layout/nav.ts`.

---



## 6. Radius, shadow, stroke


| Token                | Value                                           | Применение                             |
| -------------------- | ----------------------------------------------- | -------------------------------------- |
| `radius.card`        | `24px` (short-height `20px`)                    | Login card                             |
| `radius.paper`       | `14px` (`theme.shape`)                          | App Paper / Card                       |
| `radius.input`       | `12px`                                          | OutlinedInput                          |
| `radius.button`      | `12px` (`brand.radiusButton`)                   | Contained / outlined buttons           |
| `radius.chip`        | `8px`                                           | MuiChip                                |
| `radius.toggle`      | `10px` btn / `12px` group                       | ToggleButton                           |
| `radius.bento`       | `~20px` (`borderRadius: 2.5`)                   | TopBar chips, bottom nav md            |
| `shadow.card`        | `0 12px 40px rgba(31, 70, 120, 0.08)`           | Login card                             |
| `shadow.paper`       | `0 4px 18px rgba(31, 70, 120, 0.05)` = `CARD_SHADOW` | App Paper / bento                 |
| `shadow.nav`         | `0 8px 28px rgba(31, 70, 120, 0.1)`             | Bottom nav desktop                     |
| `shadow.button`      | `none` (idle + hover)                           | Все contained                          |
| `stroke.card`        | `1px solid rgba(210,220,235,0.45)`              | Login card                             |
| `stroke.paper`       | `1px solid rgba(215,224,236,0.7)`               | App Paper                              |
| `stroke.focus`       | `1.5px` primary                                 | Focused input                          |
| `stroke.outlinedBtn` | `1.5px` (404) / `1px` (login outlined)          | Prefer 1.5 на error/CTA secondary      |
| `blur.card`          | `backdrop-filter: blur(8px)`                    | Login card                             |


---



## 7. Компоненты



### 7.1 Button — Primary (contained)

```
height:     clamp(52px, 6vh, 62px)  | 404 fixed 52 | 403 fixed 56
maxHeight:  64
radius:     12px (target) / 10px (loginTheme root)
bg:         #2867D8 → hover #1F56B8
color:      #FFFFFF
weight:     600
size:       15–16px
shadow:     none always
textTransform: none
fullWidth:  forms yes; error CTA — auto width + px ~ 3.25–4
```

Label examples: «Войти», «Вернуться на главную», «Войти через SSO».

Disabled: стандартный MUI opacity при `submitting`.

### 7.2 Button — Secondary (outlined)

```
height:     same as primary
border:     #B9C5D8 (login/app) / #C5D3E8 @ 1.5px (404)
color:      #101A30 / #1A2B45 / app #0A1F44
hover:      border #2867D8, bg rgba(40,103,216,0.04), color #2867D8 (404)
weight:     600
startIcon: optional (SSO → Building03, size 20, color #101A30)
```



### 7.3 TextField (Outlined)

```
height root:   xs 56 / md 60 / lg 62  (short-h: 52–54)  — login
radius:        12
bg:            #FFFFFF
border idle:   #D6DEEA
border hover:  #2867D8
border focus:  #2867D8, width 1.5
font:          15px
placeholder:   #8B96AA, opacity 1
```

**Adornments:** Hugeicon 20px, color `#64748B`, strokeWidth `1.75`.  
Password toggle: IconButton `size="small"`, aria-label «Показать/Скрыть пароль».

### 7.4 Checkbox + FormControlLabel

```
unchecked: #B9C5D8
checked:   #2867D8
size:      small
label:     14px / #07162F
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

**Login card** — единственный «card» на brand-поверхностях:

```
maxWidth:   xs 480 / md 460 / lg 520
bg:         rgba(255,255,255,0.96)
radius:     24
shadow:     0 12px 40px rgba(31,70,120,0.08)
border:     1px solid rgba(210,220,235,0.45)
blur:       8px
```

**App Paper / Card** — рабочие контейнеры аналитики:

```
elevation:  0
radius:     14
border:     1px solid rgba(215,224,236,0.7)
shadow:     CARD_SHADOW
bg:         paper
```

**Правило:** карточки не использовать в hero; в dashboard — ок, если это контейнер данных/контроля.

### 7.8 Alert

MUI `<Alert severity="error" />` над формой, `mb: 1.5`.

### 7.9 Icon

`<Icon icon={…} size={20} color="…" strokeWidth={1.75} />`  
`@hugeicons/core-free-icons` + `@hugeicons/react`.

Forms: `UserIcon`, `LockIcon`, `ViewIcon` / `ViewOffIcon`, `Building03Icon`.  
Chrome: `FilterHorizontalIcon`, `Moon02Icon` / `Sun03Icon`, `Logout01Icon`, …

### 7.10 AppLogo

См. §2.2. Всегда через компонент, не сырой `<img>` с другим фильтром.

### 7.11 Toggle / Tabs / Slider (app)

- `ToggleButtonGroup`: track `#EEF3FA`, selected = primary filled.
- `Tabs`: `textTransform: none`, weight 600, minHeight 40.
- `Slider`: color primary.

### 7.12 Bento chip (AppTopBar)

```
minHeight: 48
radius:    2.5 (~20px)
border:    1px divider
shadow:    CARD_SHADOW
bg:        paper
```

Группы: filters toggle · logo · (spacer) · theme toggle · user menu.

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
3. Ring: absolute oval `rotate(-16deg)`, `border 1.5px`, opacity 0.75 — **не** перекрывать логотип.
4. Primary → `/dashboard`; secondary → `navigate(-1)`.
5. Без app chrome (sidebar/header).



### 8.3 Error / 403 Forbidden

1. Centered illustration → H1 «Нет доступа» → muted body → primary «Вернуться на главную» → `Код ошибки: 403`.
2. Desktop: тот же 1440×900 scale-canvas, centered column.
3. Primary → `/dashboard`. Один CTA (без outlined back) — осознанное отличие от 404.
4. Роуты: `/forbidden`; редирект из `RoleGuard` / `ApiErrorRedirect` на 403.



### 8.4 Empty / maintenance (будущие)

Копировать структуру **403** (illustration + title + muted body + CTA + optional code) или **404** (eyebrow + number), цвета/кнопки из kit.



### 8.5 App shell / Dashboard

1. Обёрнуто в `ColorModeProvider` → `lightTheme` / `darkTheme`.
2. Chrome: `AppTopBar` + page + `DispatcherBottomNavigation` (dispatcher/admin).
3. Фильтры: `FiltersPanel` в drawer (`< lg`) или inline.
4. Dashboard density:
   - spacious (`min-width: 1600px` **and** `min-height: 1180px`) → static grid map + charts + details;
   - иначе → `BlockCarousel` (свайп страниц блоков).
5. Semantic load: только через `LOAD_COLORS` / `loadColor()` / `LOAD_LEVEL_LABELS`.
6. Страницы: `/dashboard`, `/forecast`, `/coefficients`, `/exports`, `/model` + `PageHeader` где нужен title row.

---



## 9. Widgets map (app)



| Область        | Компонент                     | Путь                                      |
| -------------- | ----------------------------- | ----------------------------------------- |
| Layout         | `AppLayout`                   | `widgets/layout/AppLayout.tsx`            |
| Top bar        | `AppTopBar`                   | `widgets/layout/AppTopBar.tsx`            |
| Bottom nav     | `DispatcherBottomNavigation`  | `widgets/layout/DispatcherBottomNavigation.tsx` |
| Nav config     | `DISPATCHER_NAV`              | `widgets/layout/nav.ts`                   |
| Page title     | `PageHeader`                  | `widgets/layout/PageHeader.tsx`           |
| Carousel       | `BlockCarousel`               | `widgets/layout/BlockCarousel.tsx`        |
| Filters        | `FiltersPanel`                | `widgets/filters/FiltersPanel.tsx`        |
| KPI            | `KpiBar`                      | `widgets/kpi/KpiBar.tsx`                  |
| Map            | `ForecastMap` / MapLibre      | `widgets/map/*`                           |
| Time           | `TimeSlider`                  | `widgets/map/TimeSlider.tsx`              |
| Charts         | `ForecastChart`, `HeatmapChart` | `widgets/charts/*`                      |
| Coefficients   | `CoefficientsPanel`           | `widgets/coefficients/CoefficientsPanel.tsx` |
| Stop           | `StopInfoCard`, `StopDrawer`  | `widgets/stop/*`                          |
| Export         | `ExportButtons`               | `widgets/export/ExportButtons.tsx`        |
---



## 10. Motion

Branded: motion минимален (без framer на login/404/403).

При добавлении:

- 2–3 осознанных движения max на screen.
- Duration ~200–320ms, ease-out.
- Не анимировать blur/shadow на каждый hover кнопки.
- Respect `prefers-reduced-motion`.

App: carousel swipe / map transitions — функциональные, не декоративный noise.

---



## 11. Accessibility

- Секции с `aria-label` («О продукте», «Авторизация», «Навигация диспетчера»).
- Decorative images: `alt=""`, `aria-hidden`.
- Password toggle / theme / filters: осмысленный `aria-label`.
- Focus rings: не убивать outline у IconButton/Link; input focus = primary border 1.5.
- Контраст: navy на `#F5F9FE` / `#F6F9FD` / white — ок; muted `#6B819C` только для secondary body.
- Forms: `noValidate` + своя валидация; `autoComplete` username / current-password.
- Не использовать `line-height: 0` на крупных цифрах рядом с логотипом.

---



## 12. Do / Don’t



### Do

- Использовать `#2867D8` как единственный brand primary (auth **и** app).
- Inter + negative tracking на заголовках.
- Soft blue-gray surfaces (`#F5F9FE` / `#F6F9FD` family).
- Full-bleed photo / large illustration as visual anchor на brand.
- `clamp` + short-height media на login.
- Кнопки без тени, radius ~12, weight 600, без uppercase.
- Load colors только из `LOAD_COLORS`.
- Стили branded-страниц — в `*.styles.ts` рядом со страницей.



### Don’t

- Не возвращать чёрный primary / pill `999` / IBM-Plex-as-primary-font на app.
- Не purple / indigo gradients, cream+serif, dark neo-glass на brand.
- Не карточки в hero, не floating badges на фото.
- Не inset «картинка в скруглённой плашке» вместо full-bleed на login.
- Не emoji, не stat strips на первом viewport brand-страниц.
- Не смешивать 404-scale-canvas с обычным flow на desktop без причины.
- Не включать dark mode на login/404/403.
- Не коммитить сырые цветные логотипы без `brightness(0)` на светлом фоне.
- Не хардкодить load-цвета вне `LOAD_COLORS`.

---



## 13. Чеклист



### Branded-страница

- [ ] `ThemeProvider` с brand/login theme (или осознанно без — как 404/403 на inline sx)
- [ ] Font Inter, colors из §3
- [ ] Logo через `<AppLogo />`
- [ ] Primary/outlined buttons по §7.1–7.2
- [ ] Одна ясная композиция на первый viewport
- [ ] Реальный visual anchor или typographic-only как 404 content
- [ ] Mobile + short-height проверены
- [ ] Нет app chrome
- [ ] Русский копирайт, спокойный тон
- [ ] A11y: labels, alt, focus

### App / widget

- [ ] Использует `lightTheme` tokens (primary, paper, CARD_SHADOW)
- [ ] Radius controls ~12, paper ~14
- [ ] Load semantics через `loadColor` / `LOAD_COLORS`
- [ ] Работает в light **и** dark (если видно в shell)
- [ ] Не ломает `100dvh` + bottom nav inset
- [ ] На тесном viewport — carousel / scroll, не overflow hell

---



## 14. Миграция / долг


| Что                            | Статус                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| Login + 404                    | ✅ Эталон branded DS                                             |
| Forbidden (403)                | ✅ В DS (centered canvas)                                        |
| App theme → brand blue / Inter | ✅ `theme.ts` выровнен                                           |
| `loginTheme` vs `lightTheme`   | ✅ Общий `brand.ts` + `controls.ts`; login — auth overrides      |
| Button radius                  | ✅ 12 везде (`brand.radiusButton`)                               |
| `AppSidebar` / `AppHeader`     | ✅ Удалены; chrome = TopBar + BottomNav, nav в `nav.ts`          |
| Font weight 800 на 404         | Добавить `wght@800` в Google Fonts при желании точного cut      |
| Dark mode coverage             | Частичный (shell); виджеты проверять вручную                    |
| 404/403 inline hex → `brand`   | ⚠️ Можно постепенно подтянуть styles к `brand.*`                |


---



## 15. Quick reference

Импорт:

```ts
import { brand, LOAD_COLORS, CARD_SHADOW } from '@/shared/theme/brand'
// или re-export:
import { brand, LOAD_COLORS, CARD_SHADOW } from '@/shared/theme/theme'
```

См. полный объект в `src/shared/theme/brand.ts`.

---

*Документ отражает состояние кода. При изменении login / 404 / 403 / `theme.ts` / app chrome — обновлять этот файл в том же PR.*
