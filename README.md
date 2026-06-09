# Коллабы · Главный ход

Сервис координации команд городской игры **«Главный ход»** (формат «Бегущий город»).
Сезон — лето (10 июня – 31 августа), 8 городов. Помогает командам находить друг друга
для **коллабораций** (совместное фото в пределах одного города).

🌐 **Прод:** [leto2026.zarik.ru](https://leto2026.zarik.ru)

## Два режима
- **Планирование** — команда заявляет «город + дата + время суток»; сервис показывает
  пересечения с другими командами (лента «Возможности») и календарь по городу. По матчу
  можно **предложить коллаборацию** — адресату уходит email.
- **Кто здесь сейчас** — кнопки «Я здесь» / «Мы уехали»; доска присутствия по городам.
  Статус «Я здесь» живёт до конца дня. Контакты команды раскрываются по клику (при согласии).

## Профили команд
Публичная страница `/team/[id]` — фото команды (с сайта «Бегущего города» по номеру),
название и контакты: email, телефон, Telegram, MAX. Все контакты кликабельны
(`tel:`, `mailto:`, `t.me`, ссылка MAX) и показываются только при согласии команды.

## Стек
Next.js 16 (App Router) · TypeScript · better-sqlite3 · jose (JWT) · bcryptjs · nodemailer · Tailwind v4.

## Запуск
```bash
npm install
cp .env.example .env.local   # заполнить JWT_SECRET (см. ниже), при желании SMTP
npm run dev                  # http://localhost:3000
```
Сгенерировать `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Переменные окружения
| Переменная | Назначение |
|------------|-----------|
| `JWT_SECRET` | Секрет подписи JWT (обязательно) |
| `DB_PATH` | Путь к SQLite (по умолчанию `./data/kollaby.db`) |
| `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` | SMTP для писем. Без них письма логируются в консоль |
| `APP_URL` | Публичный адрес для ссылок в письмах |

## Структура
- `src/config/game.ts` — города, сезон, времена суток (единый источник правды).
- `src/lib/` — `db.ts` (схема), `repo.ts` (запросы), `auth.ts`, `session.ts`, `rate-limit.ts`, `mail.ts`.
- `src/proxy.ts` — middleware (защита страниц; в Next 16 middleware называется proxy).
- `src/app/api/*` — route handlers (auth, plans, matches, calendar, presence, now, proposals, team).
- `src/app/(app)/*` — защищённые страницы (plan, now, team); `src/app/page.tsx` — вход/регистрация.
- `src/components/*` — клиентские компоненты UI.

## Авторизация
Логин — **номер команды + пароль** (одна учётка на команду). Название команды —
отдельный отображаемый атрибут. Регистрация требует согласия на показ контактов.

## Деплой
Standalone-сборка под PM2 + nginx-proxy (Timeweb / Hestia). Боевой порт — `3011`.
```bash
npm run build
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
# → залить .next/standalone на сервер, запустить server.js через PM2
```
> ⚠️ Две Linux-засады при деплое standalone:
> 1. **better-sqlite3** — нативный модуль: на сервере пересобрать из исходников
>    (`npm install better-sqlite3@<ver> --no-save`), не копировать Windows-бинарник.
> 2. **Turbopack** даёт externalized-модулю хеш-имя (`better-sqlite3-<hash>`) — нужен симлинк
>    `node_modules/better-sqlite3-<hash> → better-sqlite3` (хеш см. в `.next/server/chunks/`).

## Не в MVP (на потом)
Telegram-бот, push/Telegram-уведомления, карта городов, матчинг с допуском по датам.
