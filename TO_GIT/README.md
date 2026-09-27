# ML: прогноз посадок на трамвайных маршрутах Москвы

Решение раздела Data Science хакатона: почасовой прогноз посадок (успешных валидаций) по 10 трамвайным маршрутам на 61 день вперёд, метрика WAPE-score.

**Лучший результат на платформе — 0.88265** (ансамбль 0.9 · LightGBM + 0.1 · PyTorch; baseline организаторов около 0.48).

| Папка | Что внутри |
|---|---|
| [`PIPELINE/`](PIPELINE) | процесс обучения: данные из ETL, оценка данных, признаки без утечек, LightGBM и PyTorch, подбор гиперпараметров (Optuna), бэктест, абляция источников, SHAP, сабмиты с проверкой, журнал результатов платформы, тесты. Полное описание — [`PIPELINE/README.md`](PIPELINE/README.md) |
| [`SOLUTION/`](SOLUTION) | сервис предсказаний: FastAPI (`/health`, `/predict`), модель в `model.pkl`, JSON Schema запроса и ответа, OpenAPI, Dockerfile, тесты. Описание — [`SOLUTION/README.md`](SOLUTION/README.md) |

Результаты сабмитов:

| Модель | Платформа (ноябрь–декабрь 2025) | Локально: сентябрь–октябрь |
|---|---|---|
| **ансамбль 0.9 · LightGBM + 0.1 · PyTorch** | **0.88265** | 0.7800 |
| LightGBM | 0.88226 | 0.7738 |
| PyTorch MLP | 0.87022 | 0.8234 |

Как части связаны:

```
ETL-сервис (MosTransport_hack26)          PIPELINE                         SOLUTION
POST /make_data -> GET /get_data/{id} --> train.py prepare -> ... -> export --> model/model.pkl
                        |                                                      |
                        +------------- строки features_hourly ----------> POST /predict -> прогноз
```

Быстрый старт сервиса: `cd SOLUTION && docker compose up -d --build`, затем `curl localhost:8080/health`.
