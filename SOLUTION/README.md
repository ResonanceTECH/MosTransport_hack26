# SOLUTION: сервис предсказаний пассажиропотока

FastAPI-сервис, который по данным в формате ETL-таблицы `features_hourly` (та же схема, на которой обучались модели) возвращает прогноз посадок на трамвайных маршрутах по часам. Модели — LightGBM и PyTorch MLP из [`../PIPELINE`](../PIPELINE), упакованы в `model/model.pkl`. По умолчанию отвечает ансамбль 0.9 · LightGBM + 0.1 · PyTorch — лучший на платформе хакатона (WAPE-score **0.88265** на скрытых ноябре–декабре 2025).

## Структура

```
SOLUTION/
├── app/
│   ├── main.py        FastAPI: /health, /predict, обработка ошибок, JSON-логи, X-Request-ID
│   ├── schemas.py     Pydantic-схемы запроса и ответа
│   ├── features.py    признаки из строк запроса (та же логика, что PIPELINE/features.py)
│   └── predictor.py   загрузка model.pkl, прогноз baseline / LightGBM / PyTorch / ансамбля
├── model/model.pkl    модели и метаданные (963 КБ)
├── schemas/
│   ├── predict_request.schema.json    JSON Schema (draft 2020-12) запроса
│   └── predict_response.schema.json   JSON Schema ответа
├── openapi.json       спецификация API (OpenAPI 3.1)
├── examples/
│   ├── request_example.json   реальный запрос: маршруты 1 и 17, 56 дней истории + 7 дней прогноза
│   └── expected_ensemble.csv  ожидаемый ответ (значения из сабмита)
├── tests/test_api.py  14 тестов
├── Dockerfile, docker-compose.yml, requirements.txt
```

## Запуск

Docker:

```bash
docker compose up -d --build          # или: docker build -t transport-ml . && docker run -p 8080:8080 transport-ml
curl http://localhost:8080/health
curl -X POST http://localhost:8080/predict -H 'Content-Type: application/json' --data-binary @examples/request_example.json
```

Локально:

```bash
python3.12 -m venv venv && venv/bin/pip install -r requirements.txt
# macOS без Homebrew: LightGBM нужен libomp — см. ../PIPELINE/fix_lightgbm_macos.sh
venv/bin/uvicorn app.main:app --port 8080
venv/bin/python -m pytest             # тесты
venv/bin/python -m app.main schemas   # пересобрать schemas/*.json и openapi.json
```

Образ: `python:3.12-slim` + `libgomp1` (OpenMP для LightGBM) + CPU-сборка PyTorch; работает от непривилегированного пользователя, есть `HEALTHCHECK` по `/health`. Переменные: `MODEL_PATH` (по умолчанию `/app/model/model.pkl`), `PORT` (8080 — ETL-сервис занимает 8000).

## API

Интерактивная документация — `/docs`, спецификация — [`openapi.json`](openapi.json).

### `GET /health`

**200** — модель загружена:

```json
{"status": "OK", "model_loaded": true, "default_model": "ensemble",
 "trained_on": {"from": "2025-01-01", "to": "2025-10-31"}, "version": "1.0.0"}
```

**503** `MODEL_NOT_LOADED` — файл модели не найден или повреждён, причина в `error.details.reason`.

### `POST /predict`

Тело — [`schemas/predict_request.schema.json`](schemas/predict_request.schema.json):

| Поле | Тип | Описание |
|---|---|---|
| `model` | `ensemble` \| `lightgbm` \| `pytorch` \| `baseline`, необязательно | по умолчанию `ensemble` |
| `origin` | date, необязательно | первый день прогноза; по умолчанию — самая ранняя дата со строками `boardings = null` |
| `rows` | массив, 1–200 000 | строки «маршрут × дата × час»: история с известными `boardings` и часы для прогноза с `boardings = null` |

Строка (`FeatureRow`) — поля ETL-таблицы `features_hourly`; остальные поля ETL (`ts_hour`, `split`, `weather_source`, …) допускаются и игнорируются, поэтому ответ ETL `GET /get_data/{id}` можно передать как есть:

| Поле | Тип | Обязательно |
|---|---|---|
| `route_id` | int, один из `1, 5, 7, 11, 12, 17, 25, 26, 28, 50` | да |
| `date` | `YYYY-MM-DD` | да |
| `hour` | int 0–23 | да |
| `boardings` | число ≥ 0 или `null` (прогнозировать) | нет |
| `day_type` | `workday` \| `saturday` \| `sunday` | да |
| `is_dayoff`, `is_short_day`, `is_holiday`, `is_transfer_workday` | bool | да |
| `temperature_c`, `precipitation_mm`, `snowfall_cm`, `wind_speed_ms`, `humidity_pct`, `cloud_cover_pct` | число или `null` | нет |
| `precip_type` | `none` \| `rain` \| `snow` \| `sleet` \| `hail` \| `null` | нет |
| `traffic_congestion_index`, `traffic_duration_s` | число или `null` | нет |

Модели считают признаки истории по посадкам за **56 дней до `origin`** (профили маршрута по часу и типу дня за 28 и 56 дней, средний дневной уровень за 7 и 28 дней), поэтому в запросе нужна история минимум за 56 дней; при меньшей истории сервис отвечает, но добавляет предупреждение. Маршрут без посадок за 28 дней до `origin` получает прогноз 0.

**200** — [`schemas/predict_response.schema.json`](schemas/predict_response.schema.json):

```json
{
  "model": "ensemble",
  "origin": "2025-11-01",
  "horizon_days": 7,
  "rows": 336,
  "total_prediction": 442704.3,
  "warnings": [],
  "predictions": [{"route_id": 1, "date": "2025-11-01", "hour": 8, "prediction": 1981.9}, "..."]
}
```

Ошибки — в формате команды `{"error": {"code", "message", "details", "request_id"}}`:

| HTTP | `code` | Когда |
|---|---|---|
| 422 | `VALIDATION_ERROR` | нарушение схемы, пустой `rows`, дубликаты (`route_id`, `date`, `hour`), нечего прогнозировать, неизвестный маршрут или модель, час вне 0–23 |
| 404 / 405 | `NOT_FOUND` / `METHOD_NOT_ALLOWED` | неизвестный путь или метод |
| 503 | `MODEL_NOT_LOADED` | модель не загружена |
| 500 | `INTERNAL_ERROR` | непредвиденная ошибка, подробности в логе по `request_id` |

Каждый ответ содержит `X-Request-ID` (принимается из запроса или генерируется); логи — JSON-строки в stdout (`service: ml`, `request_id`, `method`, `path`, `status`, `latency_ms`, события `model_loaded`, `predict_done`).

## Связка с ETL-сервисом

```python
import httpx
meta = httpx.post("http://etl:8000/make_data", json={"date_from": "2025-09-06", "date_to": "2025-12-31"}).json()
rows = httpx.get(f"http://etl:8000/get_data/{meta['id']}").json()["rows"]
forecast = httpx.post("http://ml:8080/predict", json={"origin": "2025-11-01", "rows": rows}).json()
```

## Проверка

- `pytest`: 14 тестов — `/health`; прогноз на примере совпадает с `submission_ensemble.csv` (336 часов, расхождение ≤ 1 из-за округления); все четыре модели; `origin` по умолчанию; маршрут без истории → 0 и предупреждение; 6 видов некорректных запросов → 422; неизвестный путь → 404 в формате команды.
- Живой запуск через uvicorn: `/health` → 200; пример (3 024 строки) → 200 за 0,13 с.
- Сквозная связка: 28 080 строк из ETL `GET /get_data` (история с 6 сентября + ноябрь–декабрь) → `POST /predict` → 14 640 прогнозов, совпадают с `submission_ensemble.csv` (сумма 12 548 889 против 12 548 858 в сабмите с округлением по часам), предупреждение про маршрут 5 без истории.
- Docker-образ в среде разработки не собирался (Docker не установлен); `Dockerfile` рассчитан на `linux/amd64` и `linux/arm64`.

## `model.pkl`

Словарь из стандартных объектов Python и NumPy — без классов пайплайна, поэтому загружается независимо от структуры кода: текст модели LightGBM (63 дерева), веса MLP 512-256-128 (NumPy), параметры препроцессинга (медианы, средние, стандартные отклонения, словари one-hot), вес ансамбля 0.9, модель по умолчанию, период обучения (2025-01-01 … 2025-10-31), метрики бэктеста и платформы. Собирается в пайплайне: `python train.py export --output ../SOLUTION/model/model.pkl`.
