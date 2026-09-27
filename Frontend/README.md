# MosTransport_hack26

Хакатон Московского транспорта: **ИИ-прогноз загрузки трамвайных маршрутов**.

## Компоненты решения

| Часть | Путь | Статус |
|-------|------|--------|
| Frontend (диспетчерский UI) | [`Frontend/`](./Frontend) | готов к демо (MSW) |
| Backend / ML | — | подключается через `/api/v1` |

## Быстрый запуск frontend

```bash
docker compose up --build
```

Открыть: **http://localhost:8080**

Демо-вход:

- `demo_dispatcher` / `dispatcher`
- `demo_admin` / `admin`

Локальная разработка:

```bash
cd Frontend && npm install && npm run dev
```

Подробности: [Frontend/README.md](./Frontend/README.md).

## Производительность решения

Требование заказчика — фиксировать производительность.

### Frontend (клиент)

| Метрика | Значение |
|---------|----------|
| `npm run build` | проходит без ошибок TS |
| Main bundle (gzip) | ~661 KB |
| MapLibre (gzip) | ~286 KB |
| Telemetry | Web Vitals LCP/INP/CLS → `/api/v1/telemetry` |

Интерактивный сценарий диспетчера (фильтры → карта → коэффициенты) рассчитан на прохождение за **1–2 минуты** без пояснений разработчика.

### Backend / ML

*(заполняется командой backend после замеров latency/WAPE/throughput)*

| Метрика | Цель / факт |
|---------|-------------|
| Forecast API p95 | TBD |
| WAPE модели | см. `GET /api/v1/model/info` |
| Cold start Docker | TBD |

## Архитектура UI

Один origin: nginx отдаёт SPA и проксирует `/api/*` на backend.  
Keycloak/API URL задаются runtime-конфигом (`config.js`), не hardcoded в bundle.
