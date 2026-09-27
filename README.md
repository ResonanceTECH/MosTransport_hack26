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
