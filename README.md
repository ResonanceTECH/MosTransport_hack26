# MosTransport_hack26
# Прогноз пассажиропотока трамвайной сети Москвы

Веб-сервис для диспетчеров и администраторов: прогноз загрузки трамвайных маршрутов на горизонты **день / месяц / год**, карта по часам, сценарии внешних факторов, экспорт и мониторинг.

---

## Для жюри — быстрый старт

### Ссылка на сервис

Публичного облачного URL нет. Сервис поднимается локально:

| Что | URL |
|-----|-----|
| **UI (точка входа)** | http://localhost:8080 |
| Backend API | http://localhost:8001 |
| OpenAPI (Swagger) | http://localhost:8001/docs |
| Grafana | http://localhost:3000 (`admin` / `admin`) |
| Prometheus | http://localhost:9090 |
| Keycloak | http://localhost:8081 |

Репозиторий: https://github.com/ResonanceTECH/MosTransport_hack26

### Запуск (Docker Compose)

```bash
git clone https://github.com/ResonanceTECH/MosTransport_hack26.git
cd MosTransport_hack26
cp .env.example .env

# Датасет (не в git): положить dataset.zip в корень
# https://disk.yandex.ru/d/DiFwlfMOauxjBg

docker compose up -d --build

# Опционально — прогон ETL
docker compose run --rm etl python -m app.pipeline.ingest
```

Требования: Docker + Docker Compose, ~4–8 GB RAM, порты `8080`, `8001`, `8081`, `3000`, `9090`, `5432` свободны.

### Демо-учётки

| **Логин**         | **Пароль**   | **Роль**   | **Что доступно**                                |
| :---------------- | :----------- | :--------- | :---------------------------------------------- |
| `demo_dispatcher` | `dispatcher` | dispatcher | Карта, прогноз, коэффициенты, экспорт, модель   |
| `demo_admin`      | `admin`      | admin      | Всё выше + `/admin/system` (recompute, Grafana) |

### Сценарий демо (5–7 мин)

1. Открыть **http://localhost:8080** → войти как `demo_dispatcher` / `dispatcher`
2. **/dashboard** — выбрать маршрут и дату, крутить час на карте, кликнуть остановку
3. **/forecast** — график baseline / adjusted / actual + heatmap stop×hour
4. **/coefficients** — сдвинуть `k_weather`, `k_event`, `k_season`, `k_traffic` → KPI пересчитывается сразу
5. **/exports** — скачать CSV или XLSX
6. **/model** — версия модели, WAPE, область применимости, источники данных
7. (admin) `/admin/system` → recompute + Grafana

> В корневом `docker-compose.yml` у frontend по умолчанию `USE_MSW=true` + `DEMO_AUTH=true` — UI работает на моках. Для живого API: `USE_MSW=false`.

---

## Проблема и ценность

Диспетчеру нужно заранее понимать, где и когда трамвайная сеть будет перегружена: пики по часам, остановкам, сегментам; влияние погоды, событий, сезонности, трафика.

Сервис даёт:

- **Прогноз загрузки** по маршруту / остановке / сегменту на day / month / year
- **Карту** с цветовой шкалой `low | medium | high` и слайдером часа
- **What-if**: коэффициенты внешних факторов с мгновенным пересчётом `adjusted ≈ baseline × ∏k_*`
- **Экспорт** для отчётности (CSV / XLSX)
- **Прозрачность модели**: метрики качества, ограничения, ссылки на внешние источники
- **Наблюдаемость**: Prometheus + Grafana, сквозной `X-Request-ID`

---

## Возможности продукта

### Роли

| **Роль**     | **Доступ**                                                       |
| :----------- | :--------------------------------------------------------------- |
| `dispatcher` | `/dashboard`, `/forecast`, `/coefficients`, `/exports`, `/model` |
| `admin`      | всё + `/admin/system`                                            |

Auth: demo-логин (хакатон) или Keycloak OIDC (`Authorization: Bearer`).

### Экраны

| **Маршрут**     | **Назначение**                                   |
| :-------------- | :----------------------------------------------- |
| `/login`        | Вход                                             |
| `/dashboard`    | Карта маршрута, KPI, фильтры, клик по остановке  |
| `/forecast`     | Timeseries + heatmap + сводка                    |
| `/coefficients` | Пресеты/слайдеры факторов, сохранение сценариев  |
| `/exports`      | Выгрузка прогноза CSV/XLSX                       |
| `/model`        | Метаданные модели, WAPE, источники, применимость |
| `/admin/system` | Recompute job, ссылка на Grafana                 |

Фильтры живут в URL (`route`, `horizon`, `date`, `stop`, `hour`, `k_*` …) и один в один уходят в API.

### Горизонты и загрузка

- `day` — почасовой ряд (~24 точки)
- `month` / `year` — агрегат; UI ожидает `meta.estimated: true`
- Уровни на карте: `low | medium | high` (пороги UI: medium ≥ 140, high ≥ 260)

---

## Архитектура

Браузер (React + MapLibre + ECharts)

        │  /api/v1  (nginx proxy)
        ▼

Backend (FastAPI) ──► ETL (FastAPI) ──► PostgreSQL
        │                  │
        │                  ├── внешние API (погода, календарь, …)
        │                  └── ML (FastAPI, LightGBM)
        ▼

   Keycloak · Prometheus · Grafana · logs-db

**Горячий путь:** пользователь читает **уже посчитанные** прогнозы из БД. ETL/модель работают по расписанию или по admin-recompute. Коэффициенты применяются на backend без переобучения.

Целевая латентность горячего пути: **p95 < 300 ms**.

---

## API — точки входа

Префикс: `/api/v1`
Swagger: **http://localhost:8001/docs**
Контракт фронта: **`Frontend/openapi/openapi.yaml`**

### Публичное API (Frontend → Backend)

| **Method**        | **Path**                            | **Назначение**                      |
| :---------------- | :---------------------------------- | :---------------------------------- |
| `GET`             | `/routes`                           | Список маршрутов                    |
| `GET`             | `/routes/{id}/stops`                | Остановки                           |
| `GET`             | `/routes/{id}/geometry`             | GeoJSON линии                       |
| `GET`             | `/forecast`                         | Timeseries baseline/adjusted/actual |
| `GET`             | `/forecast/map`                     | Точки карты на час                  |
| `GET`             | `/forecast/heatmap`                 | Матрица stop × hour                 |
| `GET`             | `/forecast/kpi`                     | KPI по фильтрам                     |
| `GET`             | `/forecast/export?format=csv|xlsx`  | Файл                                |
| `GET`             | `/factors`                          | Пресеты коэффициентов + источники   |
| `GET`             | `/model/info`                       | Метаданные модели                   |
| `POST`            | `/telemetry`                        | Клиентская телеметрия               |
| `POST`            | `/forecast/recompute`               | Пересчёт (admin)                    |
| `GET/POST/DELETE` | `/user-scenarios`                   | Сохранённые сценарии                |

Заголовки: `Authorization: Bearer …`, `X-Request-ID: <uuid>`.
Health: `GET /health/live`, `GET /health/ready`. Metrics: `GET /metrics`.

### Внутреннее API ETL (`/etl/v1`)

`POST /ingest`, `GET /forecast`, `GET /forecast/map`, `GET /reference/routes…`, `POST /external/refresh`, `POST /forecast/precompute`.

---

## Источники данных

| **Источник**                  | **Зачем**                       | **URL**                                  | **Статус**                   |
| :---------------------------- | :------------------------------ | :--------------------------------------- | :--------------------------- |
| Датасет хакатона              | валидации / база обучения       | https://disk.yandex.ru/d/DiFwlfMOauxjBg  | обязателен локально          |
| Производственный календарь РФ | праздники, выходные             | https://github.com/isdayoff/calendars    | интегрирован                 |
| Open-Meteo Historical         | историческая погода (без ключа) | https://archive-api.open-meteo.com       | интегрирован                 |
| Яндекс Погода                 | прогноз погоды                  | https://yandex.ru/dev/weather/doc/ru/    | интегрирован (ключ в `.env`) |
| 2GIS                          | трафик                          | https://docs.2gis.com/                   | stub (нет истории)           |
| data.mos.ru                   | справочники / перекрытия        | https://data.mos.ru/developers           | stub (опционально)           |

Ключи только в `.env` (шаблон — `.env.example`).

---

## Стек

| **Слой**      | **Технологии**                                                               |
| :------------ | :--------------------------------------------------------------------------- |
| Frontend      | React 19, TypeScript, Vite, MUI 6, MapLibre GL, ECharts, TanStack Query, MSW |
| Auth          | Keycloak (OIDC) + demo-режим для жюри                                        |
| Backend / ETL | Python 3.12, FastAPI, uvicorn, httpx, pydantic                               |
| ML            | LightGBM, FastAPI                                                            |
| БД            | PostgreSQL 16                                                                |
| Observability | Prometheus, Grafana, cAdvisor, JSON-логи + `X-Request-ID`                    |
| Delivery      | Docker Compose, nginx (SPA + proxy `/api/`)                                  |

---

## Структура репозитория

Frontend/     UI + nginx

Backend/      публичное API

etl/          ingest, внешние данные, precompute

ml/           модель

auth/         realm Keycloak

infra/        миграции БД, Prometheus, Grafana, loadtest

common/       общий logging/metrics

docker-compose.yml

.env.example

---

## Ограничения и область применимости

- Фокус: **трамвайные маршруты Москвы** из датасета хакатона (демо-маршруты в моках: 3, 7, 17).
- Прогноз зависит от полноты и периода датасета; month/year — агрегированные оценки.
- 2GIS / data.mos.ru — заглушки или ограниченные (нет полноценной истории).
- Без ключей Яндекс Погоды прогноз погоды деградирует (историческая погода через Open-Meteo остаётся).
- Keycloak требует `auth/realm-export.json`; при его отсутствии работает **demo auth**.
- Лимиты backend в compose: 2 CPU, 2 GB RAM (swap запрещён по ТЗ).

---

## План развития

1. Полный Keycloak realm + отказ от demo-auth в проде
2. Живые 2GIS / data.mos.ru с историей или альтернативными архивами
3. Онлайн-дообучение / инкрементальный recompute по расписанию
4. Алерты Grafana по p95 / ошибкам внешних API
5. Мультимаршрутный сравнение и сегментная аналитика в UI

---

## Лицензия

MIT
