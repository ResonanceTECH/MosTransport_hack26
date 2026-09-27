# MosTransport hack26

Рабочая ветка DB и observability: `db-observability-vova`.

## Обязательные правила работы

Перед любыми изменениями на общей ВМ проверьте `pwd`, текущую ветку и `git status`. Для этой зоны допустимы только:

- папка `/home/aristarkhshavreev/MosTransport_hack26_db_observability`;
- ветка `db-observability-vova`.

Не изменяйте чужие рабочие копии и ветки. Не выполняйте push, merge, rebase, force-push, reset или clean без отдельного разрешения. Общесерверные настройки и публикацию портов сначала согласуйте с командой. Реальные секреты храните только в локальном `.env`; этот файл не коммитится.

Полный регламент, структура нашей зоны, реестр портов, env, healthchecks, команды и интерфейсы с frontend, backend, ETL и ML описаны в [docs/db-observability/WORKING_RULES.md](docs/db-observability/WORKING_RULES.md).

## Безопасная стартовая проверка

```bash
cd /home/aristarkhshavreev/MosTransport_hack26_db_observability
pwd
git branch --show-current
git status
```

Продолжать работу можно только при совпадении папки и ветки, указанных выше.

## Docker на общей ВМ

На ВМ установлены Docker Engine 29.8.1, Docker Compose plugin 5.5.1 и Buildx 0.37.1 из официального репозитория Docker для Ubuntu 24.04. Служба Docker включена при загрузке и сейчас активна. Доступ к Docker выполняется через `sudo`; пользователя в привилегированную группу `docker` не добавляли.

Проверка установленного Docker:

```bash
sudo docker --version
sudo docker compose version
sudo systemctl is-active docker
sudo docker run --rm hello-world
```

Файл Compose общего стека будет добавлен отдельным блоком после согласования сервисов, портов, переменных окружения и healthcheck'ов. Полная процедура установки и рабочие правила приведены в [регламенте DB и observability](docs/db-observability/WORKING_RULES.md).
