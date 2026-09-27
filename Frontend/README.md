# Frontend - UI прогноза загрузки трамваев

SPA для диспетчеров и админов: карта, KPI, графики, сценарии коэффициентов, экспорт, метаданные модели, админ-мониторинг.

**Контракт с бэкендом — единственный источник истины:** [`openapi/openapi.yaml`](./openapi/openapi.yaml).  
Клиентские типы генерируются из него (`npm run generate:api` → `src/shared/api/schema.d.ts`). Не изобретайте эндпоинты вне OpenAPI — UI их не вызовет.

---

## Быстрый старт

### Демо без бэкенда (MSW)

```bash
cd Frontend
npm install
npm run dev          # http://localhost:5173
# или
docker compose up --build   # http://localhost:8080
```

Демо-логины:

| Логин | Пароль | Роли |
|-------|--------|------|
| `demo_dispatcher` | `dispatcher` | `dispatcher` |
| `demo_admin` | `admin` | `dispatcher` + `admin` |

### Подключение реального бэкенда

1. Бэкенд слушает **`:8000`**, префикс API **`/api/v1`**.
2. В `.env` (локально) или runtime env (Docker):

```env
VITE_USE_MSW=false
VITE_DEMO_AUTH=false          # или true, если Keycloak ещё нет
VITE_API_BASE_URL=/api/v1
VITE_API_PROXY=http://localhost:8000
```

3. Vite в dev проксирует `/api/*` → `VITE_API_PROXY` (см. `vite.config.ts`).
4. В Docker nginx проксирует `/api/` → `backend:8000` (имя сервиса в compose-сети).

Пока `USE_MSW=true`, браузер **не ходит** на ваш API — отвечает Service Worker.

---

## Стек

| Слой | Технология |
|------|------------|
| UI | React 19, MUI 6, Emotion |
| Данные | TanStack Query 5 |
| Роутинг | react-router-dom 7 |
| Карта | MapLibre GL (`react-map-gl`) |
| Графики | ECharts |
| Auth | demo localStorage **или** Keycloak (OIDC via `oidc-client-ts`) |
| Моки | MSW 2 |
| Сборка | Vite 8, TypeScript 5.8 |
| Прод | multi-stage Docker → nginx:alpine |

Дизайн-токены и UI-kit: [`UI_KIT.md`](./UI_KIT.md).  
Тестирование (5 основных типов, MSW): [`test.md`](./test.md) — `npm run test` / `npm run test:e2e`.

---

## Архитектура папки `src/`

```
src/
├── pages/           # экраны (Dashboard, Forecast, Coefficients, …)
├── widgets/         # UI-блоки с запросами (карта, KPI, графики, фильтры)
├── features/        # доменная логика (фильтры URL, recompute, Grafana URL)
├── components/      # мелкие презентационные (login, errors, logo)
└── shared/
    ├── api/         # client, endpoints, OpenAPI types, ошибки
    ├── auth/        # OIDC + demo, ProtectedRoute
    ├── config/      # runtime env, пороги загрузки
    ├── guards/      # RoleGuard
    ├── mocks/       # MSW handlers + синтетические маршруты 3/7/17
    ├── theme/       # brand + MUI themes
    └── telemetry/   # Web Vitals + api timing → POST /telemetry
```

Алиас: `@/*` → `src/*`.

---

## Конфиг (runtime > build-time)

`index.html` грузит `/config.js` **до** бандла. Приоритет:

1. `window.__APP_CONFIG__` (runtime, Docker entrypoint)
2. `import.meta.env.VITE_*` (Vite build / `.env`)
3. дефолты в `src/shared/config/env.ts`

| Ключ | Env (Vite) | Docker env | Дефолт | Назначение |
|------|------------|------------|--------|------------|
| `API_BASE_URL` | `VITE_API_BASE_URL` | `API_BASE_URL` | `/api/v1` | База всех запросов |
| `KEYCLOAK_URL` | `VITE_KEYCLOAK_URL` | `KEYCLOAK_URL` | `""` | Пусто → demo auth |
| `KEYCLOAK_REALM` | `VITE_KEYCLOAK_REALM` | `KEYCLOAK_REALM` | `transport` | Realm |
| `KEYCLOAK_CLIENT_ID` | `VITE_KEYCLOAK_CLIENT_ID` | `KEYCLOAK_CLIENT_ID` | `web` | Public client |
| `USE_MSW` | `VITE_USE_MSW` | `USE_MSW` | `true` | Включить моки |
| `DEMO_AUTH` | `VITE_DEMO_AUTH` | `DEMO_AUTH` | `true` | Локальный логин без KC |
| `GRAFANA_URL` | `VITE_GRAFANA_URL` | `GRAFANA_URL` | `""` | Кнопка мониторинга (admin) |
| `MAP_STYLE_URL` | `VITE_MAP_STYLE_URL` | `MAP_STYLE_URL` | Carto Positron | Стиль MapLibre |
| `MAP_PROVIDER` | `VITE_MAP_PROVIDER` | — | `maplibre` | `maplibre` \| `2gis` \| `yandex` |
| — | `VITE_API_PROXY` | — | `http://localhost:8000` | Только Vite proxy target |
| — | `VITE_2GIS_API_KEY` / `VITE_YANDEX_MAPS_API_KEY` | — | — | Ключи карт (не хардкодить) |

Docker: `docker-entrypoint.sh` подставляет env в `config.template.js` → `/config.js` при старте контейнера. **URL бэкенда/Keycloak можно менять без rebuild образа.**

---

## Auth и роли

### Режимы

| Режим | Условие | Как работает |
|-------|---------|--------------|
| **Demo** | `DEMO_AUTH=true` **или** пустой `KEYCLOAK_URL` | Логин/пароль из таблицы выше; токен `demo.<username>.<ts>` в `localStorage` |
| **OIDC** | `DEMO_AUTH=false` + задан `KEYCLOAK_URL` | Authorization Code → `/auth/callback`; silent renew |

### Что ждёт бэкенд

Каждый API-запрос (кроме `skipAuth`) несёт:

```
Authorization: Bearer <access_token>
X-Request-ID: <uuid>          # клиент всегда ставит; эхо в ответе желательно
Accept: application/json
```

При `401` клиент один раз пробует refresh, иначе редирект на `/login`.  
При `403` — редирект на `/forbidden`.

### Роли (RBAC на UI)

| Роль | Доступ |
|------|--------|
| `dispatcher` | `/dashboard`, `/forecast`, `/coefficients`, `/exports`, `/model` |
| `admin` | всё выше + `/admin/system` (recompute + Grafana) |

OIDC: роли читаются из `realm_access.roles` и `resource_access[<client_id>].roles`. Ожидаемые имена: **`dispatcher`**, **`admin`**. Если ролей нет — UI считает пользователя `dispatcher`.

Keycloak client:

- type: **public**
- Valid redirect: `{origin}/auth/callback`
- Post logout: `{origin}/login`
- scopes: `openid profile email`

---

## HTTP-контракт (кратко)

Полные схемы — в OpenAPI. Ниже — что UI реально дергает.

База: `{API_BASE_URL}` = `/api/v1`.

### Эндпоинты

| Method | Path | Кто | Назначение |
|--------|------|-----|------------|
| `GET` | `/routes` | any auth | Список маршрутов `{ items: RouteSummary[] }` |
| `GET` | `/routes/{id}` | any | Детали + остановки |
| `GET` | `/routes/{id}/geometry` | any | GeoJSON LineString `[lon, lat][]` |
| `GET` | `/forecast` | any | Timeseries baseline/adjusted/actual |
| `GET` | `/forecast/map` | any | Точки остановок с `load` + `level` на час |
| `GET` | `/forecast/heatmap` | any | Матрица stop × hour |
| `GET` | `/forecast/kpi` | any | KPI по фильтрам |
| `GET` | `/forecast/export?format=csv\|xlsx` | any | Файл + `Content-Disposition` |
| `GET` | `/factors` | any | Пресеты коэффициентов + источники |
| `GET` | `/model/info` | any | Метаданные модели / WAPE |
| `POST` | `/forecast/recompute` | **admin** | `202` + `{ job_id, status }` |
| `POST` | `/telemetry` | any | Batch событий → `204` |
| `GET` | `/user-scenarios` | any | Сохранённые сценарии |
| `POST` | `/user-scenarios` | any | `201` создать |
| `DELETE` | `/user-scenarios/{id}` | any | `204` |

Клиент: `src/shared/api/endpoints.ts`.

### Общие query-параметры прогноза

| Param | Обязательный | Описание |
|-------|--------------|----------|
| `route` | да | id маршрута; допускаются CSV (`17,3`) |
| `horizon` | да | `day` \| `month` \| `year` |
| `date` | нет | `YYYY-MM-DD` |
| `date_from` / `date_to` | нет | период |
| `stop` | нет | id остановки |
| `segment_from` / `segment_to` | нет | сегмент |
| `from` / `to` | нет | `HH:MM` (окно суток) |
| `grouping` | нет | `route` \| `stop` \| `segment` |
| `hour` | нет | `0…23` (карта) |
| `k_weather`, `k_event`, `k_season`, `k_traffic` | нет | множители, default `1` |

Фильтры живут в **URL search params** (`useDashboardFilters`) и один в один уходят в API.

### Ошибки

```json
{
  "message": "human readable",
  "request_id": "uuid",
  "code": "optional_machine_code"
}
```

Статусы, на которые UI завязан: `400`, `401`, `403`, `404`, `503`.  
`GET /forecast?simulate_error=503` — только в MSW для демо деградации.

### Уровни загрузки

Бэкенд отдаёт `level: low | medium | high` на карте. UI-пороги (если считаете сами):

```ts
// src/shared/config/loadThresholds.ts
{ medium: 140, high: 260 }
```

Цвета: `LOAD_COLORS` в `brand.ts` (green / amber / red).

### Горизонты

- `day` — почасовой ряд (~24 точки)
- `month` / `year` — агрегированный; UI ожидает `meta.estimated: true`

### Коэффициенты

`adjusted ≈ baseline × ∏k_*`. В ответах прогноза/KPI желателен блок:

```json
"effect": { "delta_percent": 12.5, "delta_passengers": 150 }
```

### Экспорт

`Content-Type`: `text/csv` или xlsx MIME.  
Заголовок `Content-Disposition: attachment; filename="…"`.

### Telemetry

Клиент шлёт раз в 10с (и beacon на unload):

```json
{ "events": [{ "type": "web_vital|api_error|api_performance|…", "ts": "ISO", "payload": {} }] }
```

Можно принимать и молча `204` — UI не блокируется на ошибках telemetry.

---

## Страницы ↔ API

| Route | Роль | Основные вызовы |
|-------|------|-----------------|
| `/login` | public | — |
| `/auth/callback` | OIDC | — |
| `/dashboard` | dispatcher+ | `routes`, `forecast/map`, `forecast/kpi`, geometry |
| `/forecast` | dispatcher+ | `forecast`, `forecast/heatmap`, `forecast/kpi` |
| `/coefficients` | dispatcher+ | `factors`, `forecast/kpi`, `user-scenarios` CRUD |
| `/exports` | dispatcher+ | `forecast/export` |
| `/model` | dispatcher+ | `model/info`, `factors` |
| `/admin/system` | admin | `POST /forecast/recompute`, открытие Grafana |
| `/forbidden`, `/404` | — | — |

---

## Docker / nginx

```bash
docker compose up --build
# :8080 → nginx SPA + proxy /api/ → backend:8000
```

Важно для бэкенд-compose:

1. Сервис бэкенда должен называться **`backend`** и слушать **`8000`**, либо поправьте `nginx.conf` (`$api_upstream`).
2. Отключите моки:

```yaml
environment:
  USE_MSW: "false"
  DEMO_AUTH: "false"   # если есть Keycloak
  KEYCLOAK_URL: "https://…"
  API_BASE_URL: "/api/v1"
  GRAFANA_URL: "https://…"
```

3. Build-args `VITE_USE_MSW` / `VITE_DEMO_AUTH` зашиваются в бандл как fallback; **runtime env перекрывает** через `config.js`.

---

## Скрипты

```bash
npm run dev           # Vite :5173
npm run build         # tsc + vite build
npm run preview       # превью dist
npm run typecheck     # tsc -b
npm run lint          # oxlint
npm run generate:api  # openapi → schema.d.ts
```

После изменения `openapi/openapi.yaml` — **обязательно** `generate:api` и коммит обновлённого `schema.d.ts`.

---

## Чеклист для бэкенда (чтобы UI «завелся»)

- [ ] Префикс `/api/v1`, CORS не нужен при same-origin через nginx/proxy
- [ ] JWT (или demo-токен в dev) в `Authorization: Bearer`
- [ ] Роли `dispatcher` / `admin` в токене (для OIDC)
- [ ] `POST /forecast/recompute` → `403` не-админам, `202` админу
- [ ] Ошибки в формате `{ message, request_id }`
- [ ] Геометрия: `coordinates` как `[lon, lat]`
- [ ] Карта: `MapStopLoad.level` согласован с порогами или осмысленный `load`
- [ ] Export отдаёт blob + `Content-Disposition`
- [ ] `GET /routes` возвращает хотя бы один маршрут (UI default `route=17`)

Референс поведения — MSW: `src/shared/mocks/handlers.ts` + данные `tramData.ts` (маршруты **3, 7, 17**).

---

## Типовые сценарии интеграции

**A. Локально: Vite + ваш API**

```bash
# Frontend/.env
VITE_USE_MSW=false
VITE_DEMO_AUTH=true          # пока нет Keycloak
VITE_API_PROXY=http://localhost:8000

npm run dev
# UI :5173 → proxy → backend :8000
# Demo-токен уйдёт в Authorization — бэкенд должен либо принимать demo.*,
# либо временно отключить auth-check в dev.
```

**B. Docker UI + Docker API (один compose на корне репо)**

```yaml
services:
  backend:
    # image / build…
    ports: ["8000:8000"]
  frontend:
    build: ./Frontend
    ports: ["8080:80"]
    environment:
      USE_MSW: "false"
      DEMO_AUTH: "true"   # или false + KEYCLOAK_*
      API_BASE_URL: "/api/v1"
```

Nginx во frontend-контейнере режет `/api/` на `backend:8000`.

**C. Прод с Keycloak**

```
USE_MSW=false
DEMO_AUTH=false
KEYCLOAK_URL=https://sso.example
KEYCLOAK_REALM=transport
KEYCLOAK_CLIENT_ID=web
```

---

## Производительность (клиент)

| Метрика | Примечание |
|---------|------------|
| Telemetry | LCP / INP / CLS + `api_performance` → `/telemetry` |
| React Query | `staleTime: 30s`, без retry на 401/403/404 |
| Bundle | MapLibre отдельным чанком; gzip on в nginx |

---

## Что не трогать бэкенду

- `UI_KIT.md`, `src/shared/theme/*` — визуал
- MSW — только для фронт-демо; в проде `USE_MSW=false`
- Имена query-параметров и схемы OpenAPI — ломают UI без синхронного `generate:api`

Вопросы по контракту — правьте **`openapi/openapi.yaml`**, потом регенерируйте типы. UI подтянется через `endpoints.ts` / schema.
