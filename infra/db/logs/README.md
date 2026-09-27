# Logs DB — самостоятельный модуль

Здесь находится законченный, отдельно запускаемый модуль централизованных логов. Он не меняет корневой docker-compose.yml и не публикует PostgreSQL на host-порты. При сборке общего стека эту конфигурацию нужно встроить в корневой Compose с сохранением контрактов ниже.

## Карта модуля и стыковок

| Часть / связь | Контракт, владелец и проверка |
| --- | --- |
| logs-db — Вова | PostgreSQL 16, внутренний адрес logs-db:8000; постоянный volume logs-db-data; readiness через pg_isready -p 8000; host-порт не публикуется |
| Backend, ETL, ML → /common → logs-db | Владельцы сервисов + Вова. [Контракт и инструкция `/common`](../../../common/README.md): JSON-пачки и X-Request-ID в request_id; writer-учётка имеет только INSERT; при сбое БД остаётся stdout fallback |
| Grafana → logs-db | Вова; отдельная LOGIN-учётка — член grafana_ro, только SELECT; соединение внутри Docker-сети |
| logs-retention → logs-db | Вова; стартует после service_healthy; отдельная LOGIN-учётка может выполнить только delete_expired_logs_batch(); раз в час удаляются записи старше 7 суток пачками до 10 000 |
| Контракт logs | Ровно прикладные поля ts, service, level, request_id, user_id, event, message, method, path, status, latency_ms, payload; типы и nullable-поля описаны в корневом README, раздел 5.1 |
| Индексы | (ts), (service, ts), (request_id), (level, ts); соответствуют ТЗ |

SQL-схема и групповые права находятся в 001_logs_schema.sql. 002_create_login_roles.sh создаёт отдельные LOGIN-учётки и связывает их с группами. Данные сохраняются в именованном Docker volume. SQL-файлы и shell-скрипты монтируются только для чтения.

## Первый запуск

Команды выполнять из нашей рабочей копии и нашей ветки:

~~~bash
cd /home/aristarkhshavreev/MosTransport_hack26_db_observability
pwd
git branch --show-current
git status
cd infra/db/logs

cp .env.example .env
chmod 600 .env
~~~

В локальном .env замени все значения replace-before-start уникальными случайными паролями. Их можно получить через openssl rand -hex 32. Не копируй пароли, вывод docker compose config или сам .env в Git, README, скриншоты и сообщения. Шаблон содержит только явно нерабочие демонстрационные значения.

Запуск и проверка:

~~~bash
sudo docker compose --env-file .env -f compose.yaml config -q
sudo docker compose --env-file .env -f compose.yaml up -d --wait
sudo docker compose --env-file .env -f compose.yaml ps
sudo docker compose --env-file .env -f compose.yaml logs --tail=100 logs-db logs-retention
~~~

Оба сервиса должны быть healthy. Автоматическая SQL-инициализация и bootstrap LOGIN-учёток выполняются только при первом создании пустого volume. На ВМ открыт только внутренний порт 8000 в частной Docker-сети; ни один порт не публикуется наружу.

## Проверки и диагностика

Проверить точный состав таблицы:

~~~bash
sudo docker compose --env-file .env -f compose.yaml exec -T logs-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d+ public.logs"'
~~~

Проверить индексы и групповые роли:

~~~bash
sudo docker compose --env-file .env -f compose.yaml exec -T logs-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='\''public'\'' AND tablename='\''logs'\'' ORDER BY indexname;"'
sudo docker compose --env-file .env -f compose.yaml exec -T logs-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\du+"'
sudo docker compose --env-file .env -f compose.yaml logs --since=10m logs-retention
~~~

Writer может вставлять, но не читать/обновлять/удалять; Grafana может читать, но не изменять таблицу; maintenance не имеет прямых SELECT/DELETE и вызывает только функцию пакетной очистки. Пароли в SQL-логи не выводятся.

| Симптом | Проверить |
| --- | --- |
| logs-db не healthy | compose ps и logs logs-db; корректность .env; свободное место; pg_isready |
| отсутствует таблица/роль | логи первого запуска: init-скрипты исполняются только на пустом volume; старый volume требует ручного применения миграции |
| writer получает permission denied | имя LOGIN-учётки и членство в logs_writer; не выдавать приложению административную учётку |
| Grafana не видит логи | адрес logs-db:8000, имя БД, членство в grafana_ro, фильтр времени и request_id |
| retention не чистит | состояние/logs retention logs, последний успешный heartbeat, interval и членство maintenance LOGIN в logs_maintenance |
| растёт диск | объём logs-db-data, временные границы записей, логи очистителя и состояние autovacuum |

Команды просмотра:

~~~bash
sudo docker compose --env-file .env -f compose.yaml ps
sudo docker compose --env-file .env -f compose.yaml logs --tail=200 logs-db logs-retention
sudo docker compose --env-file .env -f compose.yaml exec -T logs-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) AS rows, min(ts), max(ts) FROM public.logs;"'
~~~

## Пересборка, обновление схемы и восстановление

- Безопасно пересоздать контейнеры, сохранив данные: sudo docker compose --env-file .env -f compose.yaml up -d --force-recreate. Именованный volume остаётся.
- Init-скрипты не запускаются повторно поверх существующего volume. Новую версию миграции применяй явно:

~~~bash
sudo docker compose --env-file .env -f compose.yaml exec -T logs-db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < 001_logs_schema.sql
~~~

- Перед переносом сохрани данные таблицы в локальный закрытый архив: формат содержит идентификаторы пользователей, поэтому держи файл с правами только владельца.

~~~bash
umask 077
sudo docker compose --env-file .env -f compose.yaml exec -T logs-db sh -c 'pg_dump --data-only --format=custom --table=public.logs -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > logs-data.dump
~~~

Файлы *.dump игнорируются Git. Восстанавливай такой data-only dump только в заранее поднятую БД со схемой и ролями, где таблица public.logs пуста; перед восстановлением проверь SELECT count(*) = 0:

~~~bash
sudo docker compose --env-file .env -f compose.yaml exec -T logs-db sh -c 'pg_restore --data-only -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < logs-data.dump
~~~

Не применяй pg_restore --clean, docker compose down -v, docker volume rm/prune или команды очистки Docker. Они могут удалить единственную копию данных. Для свежего тестового экземпляра используй отдельное имя Compose-проекта и новый volume, не трогая рабочую БД.

На существующем volume изменение переменной в .env само по себе не меняет пароль роли PostgreSQL. Сначала поменяй пароль интерактивно администратором через psql-команду \password имя_учётки; затем обнови соответствующее значение только в локальном .env и пересоздай клиентские контейнеры без удаления volume. При росте объёма/скорости логов отдельно пересмотри пакет и дневное партиционирование; текущая политика — семь дней, пакет до 10 000 и запуск каждый час.
