# Коллабы · Главный ход

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Live](https://img.shields.io/badge/live-leto2026.zarik.ru-2ea44f)](https://leto2026.zarik.ru)

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
Деплой на прод выполняет **только мейнтейнер**. Контрибьюторы вносят изменения через
**pull request на GitHub** — выкатку на сервер делает мейнтейнер после merge.

## Как внести вклад (Contributing)

Проект открыт для контрибьюторов — баг-репорты, идеи и pull-request'ы приветствуются.

### С чего начать
1. **Issue** — перед крупной работой заведите issue: опишите баг или предложите фичу,
   чтобы согласовать подход до написания кода. Мелкие фиксы (опечатки, очевидные баги)
   можно слать сразу PR'ом.
2. **Форк и ветка** — форкните репозиторий, создайте ветку от `master`:
   ```bash
   git checkout -b feat/краткое-описание   # или fix/…, docs/…, chore/…
   ```
3. **Настройка окружения** — см. раздел [«Запуск»](#запуск) выше: `npm install`,
   `cp .env.example .env.local`, заполнить `JWT_SECRET`, `npm run dev`.

### Перед коммитом
```bash
npm run lint     # ESLint должен проходить без ошибок
npm run build    # сборка должна быть зелёной
```
- Код — **TypeScript**, без `any` без необходимости. Соблюдайте существующий стиль
  (отступы, именование, структуру компонентов).
- Конфиг игры (города, сезон, времена суток) — только в `src/config/game.ts`,
  это единственный источник правды. Не хардкодьте города/даты по коду.
- Новый код — рядом с тем, что уже есть: API в `src/app/api/*`, UI-компоненты в
  `src/components/*`, серверная логика в `src/lib/*`.

### Коммиты
Conventional Commits на русском: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
Пример: `feat: фильтр календаря по времени суток`. Одна логическая правка — один коммит.

### Pull request
- PR в ветку `master` репозитория. В описании: **что** и **зачем**; если есть UI —
  приложите скриншоты; сошлитесь на issue (`Closes #123`).
- PR должен проходить `npm run lint` и `npm run build`.
- Не коммитьте секреты: `.env*`, `data/` и SQLite-файлы — в `.gitignore`. Любые ключи
  и SMTP-пароли только локально в `.env.local`, **никогда** в коде или истории.
- Шаблон PR подставится автоматически — заполните чек-лист.

Подробнее — в [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Не в MVP (на потом)
Telegram-бот, push/Telegram-уведомления, карта городов, матчинг с допуском по датам.

## Лицензия
[MIT](LICENSE) © Zarik. Используйте, копируйте и форкайте свободно с сохранением
уведомления об авторстве.
