# Деплой — push-to-deploy

Прод: **leto2026.zarik.ru** (Timeweb/Hestia, PM2, порт 3011).
Деплой = `git push` в bare-репозиторий на сервере → hook собирает и перезапускает.

## Как задеплоить

Один раз добавить remote:

```bash
git remote add live ssh://user@your-server/path/to/site/repo.git
```

Дальше каждый деплой:

```bash
git push live master
```

Сборка идёт **на сервере в фоне**. Смотреть прогресс:

```bash
ssh your-server tail -f /path/to/site/deploy.log
```

## Что происходит на сервере

```
repo.git (bare)  ← push master
   └─ hooks/post-receive
        ├─ checkout кода в  app/
        └─ запуск  shared/deploy.sh  (detached, лог → deploy.log):
             npm ci → next build → собрать standalone (static+public)
             → симлинк better-sqlite3-<hash> (фикс Turbopack)
             → подключить shared/.env + ecosystem
             → swap nodeapp (старое в nodeapp.old)
             → pm2 restart + health-check http://127.0.0.1:3011
```

## Где что лежит (на сервере)

| Путь | Назначение |
|------|-----------|
| `repo.git/` | bare-репозиторий, точка приёма push |
| `app/` | рабочее дерево (checkout кода, тут идёт сборка) |
| `nodeapp/` | то, что реально крутит PM2 (standalone) |
| `nodeapp.old/` | предыдущая версия — для отката |
| `shared/.env` | секреты (JWT, SMTP). **Вне сборки — пересборка не трогает** |
| `shared/ecosystem.config.js` | конфиг PM2 (порт 3011, DB_PATH) |
| `shared/deploy.sh` | сам скрипт сборки/деплоя |
| `data/kollaby.db` | **прод-БД. Вне nodeapp — деплой её не трогает** |

## Откат

```bash
ssh your-server "cd /path/to/site && rm -rf nodeapp && mv nodeapp.old nodeapp && pm2 restart kollaby"
```

## Почему так (а не локальная сборка + scp)

- **Сборка на Linux-сервере** убирает кросс-платформенную возню с нативным `better-sqlite3`
  (на Windows он собирается под Windows и не работает на сервере).
- **Один `git push`** вместо tar→scp→распаковка→ручной ребилд.
- Сборка идёт под `setsid`/detached, поэтому обрыв SSH во время сборки не ломает деплой.
- `.env` и БД вынесены в `shared/` и `data/` — пересборка их не затрагивает.
