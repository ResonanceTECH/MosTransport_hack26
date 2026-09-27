# `/common` — общие логи и request ID

Framework-agnostic Python-библиотека для Backend, ETL и ML. Владение `/common` — Вова; интеграцию в чужие каталоги и приложения выполняют их владельцы. HTTP middleware/endpoint здесь намеренно нет: framework и жизненный цикл Backend ещё не подтверждены.

## Контракт и связи

| Связь | Интерфейс / данные | Порт и env | Проверка / статус |
| --- | --- | --- | --- |
| Frontend → Backend → `/common` | Backend принимает telemetry; `/common` не создаёт публичный endpoint. `X-Request-ID` сохраняется как UUID или генерируется; библиотека возвращает его вызывающему HTTP-адаптеру для response header. | Внутренний вызов Python; HTTP-порт определяет Backend (`TBD`, Марк). | Ядро и unit-тесты реализованы; Backend adapter ждёт согласованный framework. |
| Backend / ETL / ML → `LogEmitter` | JSON stdout с точными 12 полями таблицы `logs`; безопасная контекстная корреляция через `request_context`. | Без сетевого порта. Имена сервиса ограничены `backend`, `etl`, `ml`, `frontend`. | `python3 -m unittest discover -s tests -v`. |
| `LogEmitter` → `AsyncBatchWriter` → Logs DB | stdout пишется всегда; bounded queue, batch INSERT, короткие повторы. Ошибка или переполнение очереди не блокирует request и не удаляет stdout-копию. DB-роль — `logs_writer` (INSERT only). | `LOGS_DB_HOST`, `LOGS_DB_PORT`, `LOGS_DB_NAME`, `LOGS_WRITER_USER`, `LOGS_WRITER_PASSWORD`; порт только внутри Docker-сети, обычно 5432. | Sink подключается к `infra/db/logs/compose.yaml`; сквозная проверка реальной БД выполняется при интеграции общего стека. |

Поля, типы, nullable и индексы — по корневому README, раздел 5.1, и [runbook Logs DB](../infra/db/logs/README.md), схема — `infra/db/logs/001_logs_schema.sql`. `path` сохраняется без query string, чтобы случайно не записать токен или персональные параметры. `user_id` передаёт приложение после собственной проверки JWT; `/common` токены не разбирает. Секреты и токены в `message`/`payload` не помещать.

## Установка и использование

Если общий Compose задаст корень репозитория как Docker build context, установить локальный пакет из корня репозитория; фактический build context нужно согласовать и зафиксировать:

~~~bash
python -m pip install './common[postgres]'
~~~

Пример framework-agnostic вызова:

~~~python
from mos_transport_common import (
    AsyncBatchWriter, LogEmitter, PostgresBatchSink, request_context,
)

writer = AsyncBatchWriter(PostgresBatchSink.from_env())
logger = LogEmitter("backend", writer=writer)

# В HTTP adapter передать входной request.headers.get("X-Request-ID").
with request_context(incoming_request_id) as request_id:
    logger.emit(
        "INFO", "http.request", "request completed",
        method="GET", path="/api/v1/forecast?token=not-logged",
        status=200, latency_ms=14.2, payload={"route_id": "route-42"},
    )
    # HTTP adapter устанавливает X-Request-ID: request_id в response.

# Вызвать при штатном завершении приложения; не вызывать на каждом запросе.
writer.close(timeout=5)
~~~

`request_context` использует `contextvars`; async framework обычно переносит контекст в дочерние async-задачи. Явно передавать `request_id` нужно при запуске фоновой задачи/потока, если контекст не наследуется. Writer пишет в PostgreSQL только INSERT-ом и создаёт соединение на batch; он не управляет пулом соединений приложения.

## Проверка, отказ и ограничения

~~~bash
cd common
python3 -m unittest discover -s tests -v
python3 -m compileall -q src tests
~~~

- Без `writer` библиотека выдаёт JSON stdout; это режим локальной разработки.
- В рабочем приложении stdout включён всегда, даже при настроенном Logs DB.
- DB соединение/INSERT выполняется отдельным daemon thread; очередь ограничена, переполнение не ждёт освобождения места и остаётся stdout-only.
- Ошибка DB повторяется ограниченное число раз; затем batch отбрасывается из очереди, stdout-копия сохраняется, краткое сообщение без деталей подключения уходит в stderr. При неясном результате commit ограниченные повторы могут привести к дубликату; контракт таблицы не содержит idempotency key.
- При завершении приложения вызвать `close`; при аварийном завершении процесс может потерять queued batch, тогда stdout является источником восстановления.
- `psycopg` требуется только для DB sink (`.[postgres]`); request ID и stdout-логирование используют стандартную библиотеку Python.
- Метрики HTTP из раздела 8 корневого README остаются отдельной задачей `/common`; до добавления метрик сервисам нельзя заявлять их экспорт только на основании этой библиотеки.

### Точки интеграции, требующие подтверждения владельцев

| Владелец | Нужно подтвердить |
| --- | --- |
| Марк / Backend | Python framework, lifecycle hook для `close`, middleware/response header adapter, service name, `LOGS_DB_HOST` на общем Compose network. |
| Марк / ETL | как передавать входной `X-Request-ID` в исходящие запросы и в какие места подключить logger. |
| Артур / ML | где подключить logger в batch/online процессе и передавать ли caller request ID. |
| Вова | после получения Dockerfiles/Compose определить build context, пакетную установку и фактический внутренний DNS Logs DB. |

До подтверждения этих деталей никакие чужие приложения не редактируются; интеграционные значения остаются `TBD`.
