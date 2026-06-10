// Полная очистка ДАННЫХ команды (планы, предложения, присутствие, история
// посещений), НО сама запись команды в таблице teams сохраняется.
//
// Номер команды передаётся аргументом. Путь к БД берётся из .env (DB_PATH).
//
// Безопасность: по умолчанию DRY RUN — только показывает счётчики.
// Реально удаляет ТОЛЬКО с флагом --apply. Удаление идёт одной транзакцией.
//
// Запуск (из папки, где доступен модуль better-sqlite3, например каталог
// сборки приложения на сервере):
//
//   node scripts/wipe-team-data.mjs <номер_команды>                    # dry run
//   node scripts/wipe-team-data.mjs <номер_команды> --apply            # удалить
//   node scripts/wipe-team-data.mjs <номер_команды> --env ../shared/.env
//
// Путь к БД ищется по порядку: переменная окружения DB_PATH → DB_PATH из .env
// (по умолчанию файл ".env", переопределяется флагом --env) → ./data/kollaby.db.
//
// ⚠️ Перед --apply на проде сделайте бэкап БД:
//   cp kollaby.db "kollaby.db.bak-$(date +%F_%H%M)"

import Database from "better-sqlite3";
import fs from "node:fs";

// ── Аргументы ────────────────────────────────────────────────────────────────
let teamNum;
let envPath = ".env";
let apply = false;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--apply") apply = true;
  else if (a === "--env") envPath = argv[++i];
  else if (!a.startsWith("--") && teamNum === undefined) teamNum = a;
}

if (!teamNum) {
  console.error("Usage: node scripts/wipe-team-data.mjs <номер_команды> [--apply] [--env <path-to-.env>]");
  process.exit(1);
}

// ── Путь к БД из .env (или окружения) ────────────────────────────────────────
function resolveDbPath() {
  if (process.env.DB_PATH) return process.env.DB_PATH.trim();
  try {
    const txt = fs.readFileSync(envPath, "utf8");
    const m = txt.match(/^\s*DB_PATH\s*=\s*(.*)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* файла нет — используем дефолт ниже */
  }
  return "./data/kollaby.db";
}

const dbPath = resolveDbPath();
console.log(`БД: ${dbPath}`);

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

const team = db.prepare("SELECT id, name FROM teams WHERE number = ?").get(teamNum);
if (!team) {
  console.error(`Команда №${teamNum} не найдена.`);
  process.exit(1);
}
const id = team.id;

// Все таблицы с данными команды (кроме самой teams).
const targets = [
  { table: "plans", where: "team_id = ?", params: [id] },
  { table: "presence", where: "team_id = ?", params: [id] },
  { table: "presence_log", where: "team_id = ?", params: [id] },
  { table: "collab_proposals", where: "from_team_id = ? OR to_team_id = ?", params: [id, id] },
];

console.log(`Команда №${teamNum} «${team.name}» (id ${id}). Запись самой команды НЕ удаляется.`);
let total = 0;
for (const t of targets) {
  const n = db.prepare(`SELECT COUNT(*) AS c FROM ${t.table} WHERE ${t.where}`).get(...t.params).c;
  console.log(`  ${t.table}: ${n}`);
  total += n;
}
console.log(`Итого к удалению: ${total}`);

if (total === 0) {
  console.log("Нечего удалять.");
  db.close();
  process.exit(0);
}

if (!apply) {
  console.log("\nDRY RUN — ничего не удалено. Запустите с флагом --apply, чтобы удалить.");
  db.close();
  process.exit(0);
}

const tx = db.transaction(() => {
  for (const t of targets) {
    const info = db.prepare(`DELETE FROM ${t.table} WHERE ${t.where}`).run(...t.params);
    console.log(`  ${t.table}: удалено ${info.changes}`);
  }
});
tx();

console.log(`\n✅ Готово. Данные команды №${teamNum} очищены, сама команда сохранена.`);
db.close();
