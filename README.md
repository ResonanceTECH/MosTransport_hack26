# Прогноз пассажиропотока трамвайной сети Москвы

Веб-сервис для диспетчеров и администраторов: прогноз загрузки маршрутов, карта по часам, what-if по внешним факторам, экспорт и мониторинг.

| Документ | Ссылка |
|----------|--------|
| Общий README (эта ветка) | https://github.com/ResonanceTECH/MosTransport_hack26/tree/main |
| Frontend | https://github.com/ResonanceTECH/MosTransport_hack26/tree/front_dev |
| Backend | https://github.com/ResonanceTECH/MosTransport_hack26/tree/backend |
| ML (PIPELINE + SOLUTION) | https://github.com/ResonanceTECH/MosTransport_hack26/tree/ml |

В ветке `front_dev` дополнительно: `README.md` с инструкцией запуска, UI Kit и тесты клиентской части.

---

## Точки входа развёрнутого решения

Основные компоненты контейнеризированы и запускаются через Docker / Docker Compose.

| Компонент | URL |
|-----------|-----|
| **Frontend** | http://81.26.181.180:443 |
| **Backend** (Swagger) | http://81.26.181.180:1000/docs |
| **ETL** (Swagger) | http://81.26.181.180:1010/docs |
| **ML** (Swagger) | http://81.26.181.180:1020/docs |
| **БД сервиса** | `81.26.181.180:1030` |
| **БД логов** | `81.26.181.180:8000` |
| **Prometheus** | http://81.26.181.180:8010 |
| **Grafana** | http://81.26.181.180:8020 |

Подробные инструкции по установке зависимостей, настройке `.env` и запуску — в README соответствующих модулей и в этом файле.

### Локальный запуск (Docker Compose)

```bash
git clone https://github.com/ResonanceTECH/MosTransport_hack26.git
cd MosTransport_hack26
cp .env.example .env   # ключи внешних API — только сюда, не в git

# Датасет организаторов (не в репозитории):
# https://disk.yandex.ru/d/DiFwlfMOauxjBg → dataset.zip в корень

docker compose up -d --build
```

| Что | URL |
|-----|-----|
| UI | http://localhost:8080 |
| Backend API / Swagger | http://localhost:8001/docs |
| Grafana | http://localhost:3000 (`admin` / `admin`) |

### Демо-учётки

| Логин | Пароль | Роль |
|-------|--------|------|
| `demo_dispatcher` | `dispatcher` | dispatcher |
| `demo_admin` | `admin` | admin (+ доступ к `/admin/system`) |

---

## Сценарий демо (5–7 мин)

1. Открыть http://localhost:8080 (или http://81.26.181.180:443) → войти как `demo_dispatcher` / `dispatcher`
2. `/dashboard` — выбрать маршрут и дату, крутить час на карте, кликнуть остановку
3. `/forecast` — график baseline / adjusted / actual + heatmap stop×hour
4. `/coefficients` — сдвинуть `k_weather`, `k_event`, `k_season`, `k_traffic` → KPI пересчитывается сразу
5. `/exports` — скачать CSV или XLSX
6. `/model` — версия модели, WAPE, область применимости, источники данных
7. (admin) `/admin/system` → recompute + Grafana

> В корневом `docker-compose.yml` у frontend по умолчанию часто `USE_MSW=true` + `DEMO_AUTH=true` — UI на моках. Для живого API: `USE_MSW=false`.

---

## Проблема и ценность

Диспетчеру нужно заранее понимать, где и когда трамвайная сеть будет перегружена: пики по часам, остановкам, сегментам; влияние погоды, событий, сезонности, трафика.

Сервис даёт:

- **Прогноз загрузки** по маршруту / остановке / сегменту на `day` / `month` / `year`
- **Карту** с цветовой шкалой `low | medium | high` и слайдером часа
- **What-if**: коэффициенты внешних факторов с мгновенным пересчётом  
  `adjusted ≈ baseline × ∏k_*`
- **Экспорт** для отчётности (CSV / XLSX)
- **Прозрачность модели**: метрики качества, ограничения, ссылки на внешние источники
- **Наблюдаемость**: Prometheus + Grafana, сквозной `X-Request-ID`

---

## Возможности продукта

### Роли

| Роль | Доступ |
|------|--------|
| `dispatcher` | `/dashboard`, `/forecast`, `/coefficients`, `/exports`, `/model` |
| `admin` | всё + `/admin/system` |

Auth: demo-логин (хакатон) или Keycloak OIDC (`Authorization: Bearer`).

### Экраны

| Маршрут | Назначение |
|---------|------------|
| `/login` | Вход |
| `/dashboard` | Карта маршрута, KPI, фильтры, клик по остановке |
| `/forecast` | Timeseries + heatmap + сводка |
| `/coefficients` | Пресеты/слайдеры факторов, сохранение сценариев |
| `/exports` | Выгрузка прогноза CSV/XLSX |
| `/model` | Метаданные модели, WAPE, источники, применимость |
| `/admin/system` | Recompute job, ссылка на Grafana |

Фильтры живут в URL (`route`, `horizon`, `date`, `stop`, `hour`, `k_*` …) и один в один уходят в API.

### Горизонты и загрузка

- `day` — почасовой ряд (~24 точки)
- `month` / `year` — агрегат; UI ожидает `meta.estimated: true`
- Уровни на карте: `low | medium | high` (пороги UI: medium ≥ 140, high ≥ 260)

---

## Архитектура

```
Браузер (React + MapLibre + ECharts)
        │  /api/v1  (nginx proxy)
        ▼
Backend (FastAPI) ──► ETL (FastAPI) ──► PostgreSQL
        │                  │
        │                  ├── внешние API (погода, календарь, …)
        │                  └── ML (FastAPI, LightGBM / ансамбль)
        ▼
   Keycloak · Prometheus · Grafana · logs-db
```

**Горячий путь:** пользователь читает уже посчитанные прогнозы из БД. ETL/модель работают по расписанию или по admin-recompute. Коэффициенты применяются на backend без переобучения.

Целевая латентность горячего пути: **p95 < 300 ms**.

---

## ML-решение

Репозиторий / ветка: [ml](https://github.com/ResonanceTECH/MosTransport_hack26/tree/ml)

| Раздел | Ссылка |
|--------|--------|
| PIPELINE (обучение и исследование) | https://github.com/ResonanceTECH/MosTransport_hack26/blob/ml/PIPELINE |
| README PIPELINE | https://github.com/ResonanceTECH/MosTransport_hack26/blob/ml/PIPELINE/README.md |
| SOLUTION (сервис инференса) | https://github.com/ResonanceTECH/MosTransport_hack26/blob/ml/SOLUTION |
| README SOLUTION | https://github.com/ResonanceTECH/MosTransport_hack26/blob/ml/SOLUTION/README.md |
| TO_GIT / SOLUTION (модуль для сдачи) | https://github.com/ResonanceTECH/MosTransport_hack26/tree/ml/TO_GIT/SOLUTION |

### Задача модели

Почасовой прогноз посадок / успешных валидаций по **10 трамвайным маршрутам Москвы** на **61 день** вперёд.

- **Метрика:** WAPE-score  
- **Лучший результат на платформе:** `0.88265`  
- **Модель:** ансамбль **0.9 LightGBM + 0.1 PyTorch**

Сравнение на платформе:

| Модель | WAPE |
|--------|------|
| Ансамбль 0.9 LGBM + 0.1 PT | **0.88265** |
| LightGBM | 0.88226 |
| PyTorch MLP | 0.87022 |
| Baseline организаторов | ~0.48 |

Локальная оценка (сентябрь–октябрь):

| Модель | WAPE |
|--------|------|
| Ансамбль | 0.7800 |
| LightGBM | 0.7738 |
| PyTorch MLP | 0.8234 |

### PIPELINE

Реализовано:

- получение и подготовка данных из ETL;
- анализ качества данных;
- формирование признаков без утечек;
- обучение LightGBM и PyTorch-моделей;
- подбор гиперпараметров (Optuna);
- backtesting;
- абляция внешних источников;
- SHAP-анализ;
- формирование и проверка сабмитов;
- журнал результатов на платформе;
- тесты.

### SOLUTION (инференс)

Размещено:

- FastAPI-сервис инференса;
- `GET /health`;
- `POST /predict` (и связанные endpoint’ы);
- артефакт модели `model.pkl`;
- JSON Schema запросов и ответов;
- OpenAPI;
- Dockerfile;
- тесты.

#### Быстрый запуск ML-сервиса

```bash
cd SOLUTION
docker compose up -d --build
curl localhost:8080/health
```

Полные инструкции по обучению, инференсу, структуре данных и запуску — в README разделов **PIPELINE** и **SOLUTION**.

---

## API — точки входа

- Префикс: `/api/v1`
- Swagger (локально): http://localhost:8001/docs  
- Swagger (стенд): http://81.26.181.180:1000/docs  
- Контракт фронта: `Frontend/openapi/openapi.yaml`

### Публичное API (Frontend → Backend)

| Method | Path | Назначение |
|--------|------|------------|
| `GET` | `/routes` | Список маршрутов |
| `GET` | `/routes/{id}/stops` | Остановки |
| `GET` | `/routes/{id}/geometry` | GeoJSON линии |
| `GET` | `/forecast` | Timeseries baseline/adjusted/actual |
| `GET` | `/forecast/map` | Точки карты на час |
| `GET` | `/forecast/heatmap` | Матрица stop × hour |
| `GET` | `/forecast/kpi` | KPI по фильтрам |
| `GET` | `/forecast/export?format=csv\|xlsx` | Файл |
| `GET` | `/factors` | Пресеты коэффициентов + источники |
| `GET` | `/model/info` | Метаданные модели |
| `POST` | `/telemetry` | Клиентская телеметрия |
| `POST` | `/forecast/recompute` | Пересчёт (admin) |
| `GET` / `POST` / `DELETE` | `/user-scenarios` | Сохранённые сценарии |

Заголовки: `Authorization: Bearer …`, `X-Request-ID: <uuid>`.

Health: `GET /health/live`, `GET /health/ready`.  
Metrics: `GET /metrics`.

### Внутреннее API ETL (`/etl/v1`)

- `POST /ingest`
- `GET /forecast`
- `GET /forecast/map`
- `GET /reference/routes…`
- `POST /external/refresh`
- `POST /forecast/precompute`

Swagger ETL (стенд): http://81.26.181.180:1010/docs

---

## Источники данных

Ключи внешних API хранятся **только в `.env`** (шаблон — `.env.example`). В README и git секреты не коммитим.

| # | Источник | Зачем | Документация / URL | Статус |
|---|----------|-------|--------------------|--------|
| 1 | **Яндекс Погода** (Yandex Weather API) | прогноз погоды для инференса | https://yandex.ru/dev/weather/doc/ru/ | интегрирован (ключ в `.env`, лимит ~10 000 запросов) |
| 2 | **Open-Meteo Historical** | историческая погода для обучения | https://archive-api.open-meteo.com | интегрирован (без ключа) |
| 3 | **2GIS API** | транспортная ситуация / загруженность | https://docs.2gis.com/ · [кабинет](https://platform.2gis.ru/ru/dashboard) | stub / ограничен (нет полноценной истории) |
| 4 | **Производственный календарь РФ** | рабочие / выходные / праздники | https://github.com/isdayoff/calendars/tree/main/db/2026 | интегрирован |
| 5 | **data.mos.ru** | маршруты, инфраструктура, стройки и городские факторы | https://data.mos.ru/developers/documentation | stub (опционально) |
| 6 | **Датасет организаторов** | исторический пассажиропоток | https://disk.yandex.ru/d/DiFwlfMOauxjBg | обязателен локально (`dataset.zip`) |

---

## Стек

| Слой | Технологии |
|------|------------|
| Frontend | React 19, TypeScript, Vite, MUI 6, MapLibre GL, ECharts, TanStack Query, MSW |
| Auth | Keycloak (OIDC) + demo-режим для жюри |
| Backend / ETL | Python 3.12, FastAPI, uvicorn, httpx, pydantic |
| ML | LightGBM + PyTorch (ансамбль), Optuna, FastAPI |
| БД | PostgreSQL 16 |
| Observability | Prometheus, Grafana, cAdvisor, JSON-логи + `X-Request-ID` |
| Delivery | Docker Compose, nginx (SPA + proxy `/api/`) |

---

## Структура репозитория

```
Frontend/     UI + nginx
Backend/      публичное API
etl/          ingest, внешние данные, precompute
ml/           модель / инференс (см. также ветку ml: PIPELINE, SOLUTION)
auth/         realm Keycloak
infra/        миграции БД, Prometheus, Grafana, loadtest
common/       общий logging/metrics
docker-compose.yml
.env.example
```

---

## Ограничения и область применимости

- Фокус: трамвайные маршруты Москвы из датасета хакатона (демо-маршруты в моках: 3, 7, 17; ML — 10 маршрутов, горизонт 61 день).
- Прогноз зависит от полноты и периода датасета; `month`/`year` — агрегированные оценки.
- 2GIS / data.mos.ru — заглушки или ограниченные (нет полноценной истории).
- Без ключа Яндекс Погоды прогноз погоды деградирует (историческая погода через Open-Meteo остаётся).
- Keycloak требует `auth/realm-export.json`; при его отсутствии работает demo auth.
- Лимиты backend в compose: 2 CPU, 2 GB RAM (swap запрещён по ТЗ).

---

## План развития

1. Полный Keycloak realm + отказ от demo-auth в проде  
2. Живые 2GIS / data.mos.ru с историей или альтернативными архивами  
3. Онлайн-дообучение / инкрементальный recompute по расписанию  
4. Алерты Grafana по p95 / ошибкам внешних API  
5. Мультимаршрутное сравнение и сегментная аналитика в UI  

---

## Лицензия

MIT
