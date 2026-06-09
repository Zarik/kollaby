// Разовый сид демо-данных в ЛОКАЛЬНУЮ dev-БД для проверки /dashboard.
// НЕ для прода. Демо-команды — номера 9001..9008.
import Database from "better-sqlite3";

const db = new Database("./data/kollaby.db");
db.pragma("foreign_keys = ON");

const CITIES = ["Веребье", "Высоковск", "Заветное", "Кава", "Короцко", "Мстинский мост", "Оксочи", "Травково"];
const PARTS = ["morning", "day", "evening"];
const now = new Date().toISOString();
const endOfDay = (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.toISOString(); })();

// очистка прошлого сида (каскадом удалит их планы/предложения/присутствие)
const demoNumbers = Array.from({ length: 8 }, (_, i) => String(9001 + i));
const del = db.prepare("DELETE FROM teams WHERE number = ?");
for (const n of demoNumbers) del.run(n);

const insTeam = db.prepare(
  `INSERT INTO teams (number, name, password_hash, email, phone, telegram, max_link, contacts_consent, created_at)
   VALUES (?, ?, 'x', ?, '+70000000000', NULL, NULL, ?, ?)`,
);
const ids = [];
for (let i = 0; i < 8; i++) {
  const num = demoNumbers[i];
  const info = insTeam.run(num, `Демо ${num}`, `demo${num}@example.ru`, i % 2, now);
  ids.push(Number(info.lastInsertRowid));
}

const insPlan = db.prepare(
  `INSERT INTO plans (team_id, city, visit_date, part_of_day, note, created_at) VALUES (?, ?, ?, ?, NULL, ?)`,
);
const dates = ["2026-06-12", "2026-06-13", "2026-06-14", "2026-06-20", "2026-07-04", "2026-07-18", "2026-08-01"];
let p = 0;
for (let i = 0; i < ids.length; i++) {
  // у каждой команды 2-3 заявки
  const k = 2 + (i % 2);
  for (let j = 0; j < k; j++) {
    const city = CITIES[(i + j) % CITIES.length];
    const date = dates[(i * 2 + j) % dates.length];
    const part = PARTS[(i + j) % PARTS.length];
    insPlan.run(ids[i], city, date, part, now);
    p++;
  }
}
// гарантируем пересечения: 3 команды в один слот
const slotCity = "Веребье", slotDate = "2026-06-12";
for (const tid of [ids[1], ids[3], ids[5]]) insPlan.run(tid, slotCity, slotDate, "day", now);

// предложения коллабораций
const insProp = db.prepare(
  `INSERT INTO collab_proposals (from_team_id, to_team_id, city, visit_date, part_of_day, message, status, created_at)
   VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
);
insProp.run(ids[1], ids[3], slotCity, slotDate, "day", "accepted", now);
insProp.run(ids[3], ids[5], slotCity, slotDate, "day", "accepted", now);
insProp.run(ids[0], ids[2], "Кава", "2026-06-13", "morning", "proposed", now);
insProp.run(ids[2], ids[4], "Оксочи", "2026-06-20", "evening", "proposed", now);
insProp.run(ids[4], ids[6], "Травково", "2026-07-04", "day", "declined", now);

// присутствие «Я здесь сейчас»
const insPres = db.prepare(
  `INSERT INTO presence (team_id, city, checked_in_at, expires_at) VALUES (?, ?, ?, ?)
   ON CONFLICT(team_id) DO UPDATE SET city=excluded.city, checked_in_at=excluded.checked_in_at, expires_at=excluded.expires_at`,
);
insPres.run(ids[0], "Веребье", now, endOfDay);
insPres.run(ids[1], "Веребье", now, endOfDay);
insPres.run(ids[2], "Кава", now, endOfDay);

console.log(`seed готов: 8 команд, ~${p + 3} визитов, 5 предложений, 3 присутствия`);
db.close();
