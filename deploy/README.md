# Деплой — push-to-deploy

Прод собирается **на сервере**: `git push` в bare-репозиторий запускает
`post-receive`-хук, который ставит зависимости, делает standalone-сборку и
перезапускает приложение под PM2 за nginx-proxy.

> ℹ️ Конкретные адрес сервера, SSH-пользователь и абсолютные пути здесь намеренно
> не публикуются — они в приватных ops-заметках мейнтейнера. **Деплой на прод
> выполняет только мейнтейнер;** контрибьюторы вносят изменения через pull request.

## Как задеплоить (мейнтейнер)

Remote `live` указывает на bare-репозиторий на сервере. Каждый деплой:

```bash
git push live master
```

Сборка идёт на сервере в фоне; прогресс пишется в `deploy.log` на сервере.

## Что происходит на сервере

```
repo.git (bare)  ← push master
   └─ hooks/post-receive
        ├─ checkout кода в  app/
        └─ запуск  shared/deploy.sh  (detached, лог → deploy.log):
             npm ci → next build → собрать standalone (static + public)
             → симлинк better-sqlite3-<hash> (фикс Turbopack)
             → подключить shared/.env + ecosystem
             → swap nodeapp (старое в nodeapp.old)
             → pm2 restart + health-check
```

## Раскладка (относительно корня сайта на сервере)

| Путь | Назначение |
|------|-----------|
| `repo.git/` | bare-репозиторий, точка приёма push |
| `app/` | рабочее дерево (checkout кода, сборка) |
| `nodeapp/` | то, что реально крутит PM2 (standalone) |
| `nodeapp.old/` | предыдущая версия — для отката |
| `shared/.env` | секреты (JWT, SMTP). **Вне сборки — пересборка не трогает** |
| `shared/ecosystem.config.js` | конфиг PM2 (порт, `DB_PATH`) |
| `shared/deploy.sh` | сам скрипт сборки/деплоя (idempotent, под flock) |
| `data/kollaby.db` | **прод-БД. Вне nodeapp — деплой её не трогает** |

## Откат

Откат — переключением `nodeapp` ↔ `nodeapp.old` с последующим `pm2 restart`
(точные команды — в `shared/deploy.sh` на сервере).
