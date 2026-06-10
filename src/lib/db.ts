import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

/**
 * Подключение к SQLite (better-sqlite3) + инициализация схемы.
 * Singleton, чтобы переживать HMR в dev-режиме.
 */

const DB_PATH =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "kollaby.db");

function createDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database): void {
  // better-sqlite3 .exec() выполняет многооператорный DDL (это НЕ child_process).
  const runSchema = db.exec.bind(db);
  runSchema(`
    CREATE TABLE IF NOT EXISTS teams (
      id               INTEGER PRIMARY KEY,
      number           TEXT NOT NULL UNIQUE,     -- логин: номер команды
      name             TEXT NOT NULL,            -- название (информационное)
      password_hash    TEXT NOT NULL,
      email            TEXT NOT NULL,
      phone            TEXT NOT NULL,
      telegram         TEXT,                     -- username без @ (опционально)
      max_link         TEXT,                     -- полная ссылка max.ru (опционально)
      contacts_consent INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id          INTEGER PRIMARY KEY,
      team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      city        TEXT NOT NULL,
      visit_date  TEXT NOT NULL,                 -- ISO yyyy-mm-dd
      part_of_day TEXT NOT NULL,                 -- morning | day | evening
      note        TEXT,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_plans_city_date ON plans(city, visit_date);
    CREATE INDEX IF NOT EXISTS idx_plans_team ON plans(team_id);

    CREATE TABLE IF NOT EXISTS presence (
      id            INTEGER PRIMARY KEY,
      team_id       INTEGER NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
      city          TEXT NOT NULL,
      checked_in_at TEXT NOT NULL,
      expires_at    TEXT NOT NULL                -- конец дня; активно пока expires_at > now
    );
    CREATE INDEX IF NOT EXISTS idx_presence_city ON presence(city);

    CREATE TABLE IF NOT EXISTS collab_proposals (
      id           INTEGER PRIMARY KEY,
      from_team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      to_team_id   INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      city         TEXT NOT NULL,
      visit_date   TEXT NOT NULL,
      part_of_day  TEXT,
      message      TEXT,
      status       TEXT NOT NULL DEFAULT 'proposed', -- proposed | accepted | declined
      created_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_proposals_to ON collab_proposals(to_team_id, status);
    CREATE INDEX IF NOT EXISTS idx_proposals_from ON collab_proposals(from_team_id);

    -- История присутствия: завершённые сессии «Я здесь» (после «Мы уехали»,
    -- протухания или смены города). Используется для статистики реальных визитов.
    CREATE TABLE IF NOT EXISTS presence_log (
      id            INTEGER PRIMARY KEY,
      team_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      city          TEXT NOT NULL,
      checked_in_at TEXT NOT NULL,
      ended_at      TEXT NOT NULL,
      duration_min  INTEGER NOT NULL              -- длительность сессии в минутах
    );
    CREATE INDEX IF NOT EXISTS idx_presence_log_city ON presence_log(city);
  `);

  // Миграции для уже существующих баз (идемпотентно)
  ensureColumn(db, "teams", "telegram", "ALTER TABLE teams ADD COLUMN telegram TEXT");
  ensureColumn(db, "teams", "max_link", "ALTER TABLE teams ADD COLUMN max_link TEXT");
}

/** Добавляет колонку, если её ещё нет (ALTER через prepare/run — без многооператорного exec). */
function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  ddl: string,
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  if (!cols.some((c) => c.name === column)) {
    db.prepare(ddl).run();
  }
}

// Singleton через globalThis (переживает HMR)
const globalForDb = globalThis as unknown as {
  __kollabyDb?: Database.Database;
};

export const db: Database.Database = globalForDb.__kollabyDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__kollabyDb = db;
}
