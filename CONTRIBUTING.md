# Вклад в «Коллабы»

Спасибо за интерес к проекту! Баг-репорты, идеи и pull-request'ы приветствуются.

Полное руководство — в разделе [**«Как внести вклад»** в README](README.md#как-внести-вклад-contributing).
Краткая выжимка ниже.

## Быстрый старт
```bash
git clone https://github.com/Zarik/kollaby.git
cd kollaby
npm install
cp .env.example .env.local      # заполнить JWT_SECRET
npm run dev                     # http://localhost:3000
```
Сгенерировать `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Процесс
1. Для крупной работы — заведите **issue** и согласуйте подход. Мелкие фиксы можно слать сразу PR'ом.
2. Форк → ветка от `master`: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
3. Перед коммитом: `npm run lint` и `npm run build` должны проходить.
4. Коммиты — Conventional Commits на русском (`feat:`, `fix:`, `docs:`…).
5. PR в `master`: опишите что и зачем, приложите скриншоты для UI, сошлитесь на issue.

## Стиль и правила
- Язык — **TypeScript**, существующий стиль и структура (`src/app/api`, `src/components`, `src/lib`).
- Города, сезон и времена суток — только в `src/config/game.ts` (единый источник правды).
- **Никогда** не коммитьте секреты. `.env*`, `data/` и SQLite-файлы уже в `.gitignore`;
  ключи и SMTP-пароли держите только в локальном `.env.local`.

## Лицензия
Отправляя PR, вы соглашаетесь, что ваш вклад распространяется на условиях [MIT](LICENSE).
