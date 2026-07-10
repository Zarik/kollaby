import { db } from "./db";
import { nowISO, todayISO } from "./time";

/** Слой доступа к данным: команды, заявки, присутствие, предложения коллабораций. */

// ─── Типы строк БД ──────────────────────────────────────────────────────────

export interface Team {
  id: number;
  number: string;
  name: string;
  password_hash: string;
  email: string;
  phone: string;
  telegram: string | null; // username без @
  max_link: string | null; // полная ссылка max.ru
  contacts_consent: number; // 0 | 1
  reset_token_hash: string | null; // sha256 одноразового токена сброса пароля
  reset_expires: string | null; // срок действия токена (ISO)
  created_at: string;
}

export interface Plan {
  id: number;
  team_id: number;
  city: string;
  visit_date: string;
  part_of_day: string;
  note: string | null;
  transport: string | null; // 'foot' | 'car' | null
  car_seats: number | null; // свободные места (только для 'car')
  foot_people: number | null; // сколько человек (только для 'foot')
  created_at: string;
}

export interface Proposal {
  id: number;
  from_team_id: number;
  to_team_id: number;
  city: string;
  visit_date: string;
  part_of_day: string | null;
  message: string | null;
  status: "proposed" | "accepted" | "declined";
  created_at: string;
}

/** Публичная карточка команды (без хеша пароля). Контакты — только при согласии. */
export interface PublicTeam {
  id: number;
  number: string;
  name: string;
  email: string | null;
  phone: string | null;
  telegram: string | null;
  maxLink: string | null;
  contactsShared: boolean;
}

export function toPublicTeam(t: Team): PublicTeam {
  const shared = t.contacts_consent === 1;
  return {
    id: t.id,
    number: t.number,
    name: t.name,
    email: shared ? t.email : null,
    phone: shared ? t.phone : null,
    telegram: shared ? t.telegram : null,
    maxLink: shared ? t.max_link : null,
    contactsShared: shared,
  };
}

// ─── Команды ────────────────────────────────────────────────────────────────

export function getTeamByNumber(number: string): Team | undefined {
  return db
    .prepare("SELECT * FROM teams WHERE number = ?")
    .get(number) as Team | undefined;
}

export function getTeamById(id: number): Team | undefined {
  return db.prepare("SELECT * FROM teams WHERE id = ?").get(id) as
    | Team
    | undefined;
}

export function createTeam(input: {
  number: string;
  name: string;
  passwordHash: string;
  email: string;
  phone: string;
  telegram?: string | null;
  maxLink?: string | null;
  consent: boolean;
}): Team {
  const info = db
    .prepare(
      `INSERT INTO teams (number, name, password_hash, email, phone, telegram, max_link, contacts_consent, created_at)
       VALUES (@number, @name, @passwordHash, @email, @phone, @telegram, @maxLink, @consent, @createdAt)`,
    )
    .run({
      number: input.number,
      name: input.name,
      passwordHash: input.passwordHash,
      email: input.email,
      phone: input.phone,
      telegram: input.telegram ?? null,
      maxLink: input.maxLink ?? null,
      consent: input.consent ? 1 : 0,
      createdAt: nowISO(),
    });
  return getTeamById(Number(info.lastInsertRowid))!;
}

export function updateTeamProfile(
  id: number,
  input: {
    name: string;
    email: string;
    phone: string;
    telegram?: string | null;
    maxLink?: string | null;
    consent: boolean;
  },
): void {
  db.prepare(
    `UPDATE teams SET name = @name, email = @email, phone = @phone,
       telegram = @telegram, max_link = @maxLink, contacts_consent = @consent
     WHERE id = @id`,
  ).run({
    id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    telegram: input.telegram ?? null,
    maxLink: input.maxLink ?? null,
    consent: input.consent ? 1 : 0,
  });
}

/** Сохранить хеш токена сброса пароля и срок его действия. */
export function setResetToken(teamId: number, tokenHash: string, expiresAt: string): void {
  db.prepare("UPDATE teams SET reset_token_hash = ?, reset_expires = ? WHERE id = ?").run(
    tokenHash,
    expiresAt,
    teamId,
  );
}

/** Команда по действующему (не протухшему) токену сброса. */
export function getTeamByResetTokenHash(tokenHash: string): Team | undefined {
  return db
    .prepare("SELECT * FROM teams WHERE reset_token_hash = ? AND reset_expires > ?")
    .get(tokenHash, nowISO()) as Team | undefined;
}

/** Погасить токен сброса (после использования). */
export function clearResetToken(teamId: number): void {
  db.prepare("UPDATE teams SET reset_token_hash = NULL, reset_expires = NULL WHERE id = ?").run(
    teamId,
  );
}

export function updateTeamPassword(id: number, passwordHash: string): void {
  db.prepare("UPDATE teams SET password_hash = ? WHERE id = ?").run(
    passwordHash,
    id,
  );
}

// ─── Заявки (планы) ───────────────────────────────────────────────────────────

export function createPlan(input: {
  teamId: number;
  city: string;
  visitDate: string;
  partOfDay: string;
  note?: string | null;
  transport?: string | null;
  carSeats?: number | null;
  footPeople?: number | null;
}): Plan {
  const info = db
    .prepare(
      `INSERT INTO plans (team_id, city, visit_date, part_of_day, note, transport, car_seats, foot_people, created_at)
       VALUES (@teamId, @city, @visitDate, @partOfDay, @note, @transport, @carSeats, @footPeople, @createdAt)`,
    )
    .run({
      teamId: input.teamId,
      city: input.city,
      visitDate: input.visitDate,
      partOfDay: input.partOfDay,
      note: input.note ?? null,
      transport: input.transport ?? null,
      carSeats: input.carSeats ?? null,
      footPeople: input.footPeople ?? null,
      createdAt: nowISO(),
    });
  return db
    .prepare("SELECT * FROM plans WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as Plan;
}

export function getPlansByTeam(teamId: number): Plan[] {
  return db
    .prepare(
      "SELECT * FROM plans WHERE team_id = ? ORDER BY visit_date, city",
    )
    .all(teamId) as Plan[];
}

/** Есть ли у команды заявка в этом городе на эту дату. */
export function hasPlan(teamId: number, city: string, visitDate: string): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM plans WHERE team_id = ? AND city = ? AND visit_date = ? LIMIT 1",
    )
    .get(teamId, city, visitDate);
  return row !== undefined;
}

/** Удаляет заявку, только если она принадлежит команде. Возвращает true при удалении. */
export function deletePlan(id: number, teamId: number): boolean {
  const info = db
    .prepare("DELETE FROM plans WHERE id = ? AND team_id = ?")
    .run(id, teamId);
  return info.changes > 0;
}

export interface CalendarEntry {
  plan_id: number;
  visit_date: string;
  part_of_day: string;
  transport: string | null;
  car_seats: number | null;
  foot_people: number | null;
  team_id: number;
  number: string;
  name: string;
}

/** Заявки по городу за период (для календаря). */
export function getCityCalendar(
  city: string,
  from: string,
  to: string,
): CalendarEntry[] {
  return db
    .prepare(
      `SELECT p.id AS plan_id, p.visit_date, p.part_of_day, p.transport, p.car_seats, p.foot_people,
              t.id AS team_id, t.number, t.name
       FROM plans p
       JOIN teams t ON t.id = p.team_id
       WHERE p.city = ? AND p.visit_date BETWEEN ? AND ?
       ORDER BY p.visit_date, t.number`,
    )
    .all(city, from, to) as CalendarEntry[];
}

// ─── Матчинг планов ───────────────────────────────────────────────────────────

export interface MatchRow {
  my_plan_id: number;
  city: string;
  visit_date: string;
  my_part: string;
  other_plan_id: number;
  other_part: string;
  other_transport: string | null;
  other_car_seats: number | null;
  other_foot_people: number | null;
  other_team_id: number;
  other_number: string;
  other_name: string;
}

/** Все пересечения планов команды с чужими (тот же город + дата). */
export function getMatchesForTeam(teamId: number): MatchRow[] {
  return db
    .prepare(
      `SELECT myp.id AS my_plan_id, myp.city, myp.visit_date, myp.part_of_day AS my_part,
              op.id AS other_plan_id, op.part_of_day AS other_part,
              op.transport AS other_transport, op.car_seats AS other_car_seats,
              op.foot_people AS other_foot_people,
              t.id AS other_team_id, t.number AS other_number, t.name AS other_name
       FROM plans myp
       JOIN plans op
         ON op.city = myp.city
        AND op.visit_date = myp.visit_date
        AND op.team_id != myp.team_id
       JOIN teams t ON t.id = op.team_id
       WHERE myp.team_id = ?
       ORDER BY myp.visit_date, myp.city, t.number`,
    )
    .all(teamId) as MatchRow[];
}

// ─── Присутствие «Я здесь» ────────────────────────────────────────────────────

interface PresenceSession {
  team_id: number;
  city: string;
  checked_in_at: string;
}

/** Записать завершённую сессию присутствия в историю (presence_log). */
function logPresenceSession(s: PresenceSession, endedAt: string): void {
  const start = new Date(s.checked_in_at).getTime();
  const end = new Date(endedAt).getTime();
  const durationMin = Math.max(0, Math.round((end - start) / 60000));
  db.prepare(
    `INSERT INTO presence_log (team_id, city, checked_in_at, ended_at, duration_min)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(s.team_id, s.city, s.checked_in_at, endedAt, durationMin);
}

export function checkIn(teamId: number, city: string, expiresAt: string): void {
  // Если команда уже была отмечена — закрываем прежнюю сессию в истории.
  const prev = db
    .prepare("SELECT team_id, city, checked_in_at FROM presence WHERE team_id = ?")
    .get(teamId) as PresenceSession | undefined;
  if (prev) logPresenceSession(prev, nowISO());

  db.prepare(
    `INSERT INTO presence (team_id, city, checked_in_at, expires_at)
     VALUES (@teamId, @city, @now, @expiresAt)
     ON CONFLICT(team_id) DO UPDATE SET
       city = excluded.city,
       checked_in_at = excluded.checked_in_at,
       expires_at = excluded.expires_at`,
  ).run({ teamId, city, now: nowISO(), expiresAt });
}

export function checkOut(teamId: number): void {
  const row = db
    .prepare("SELECT team_id, city, checked_in_at FROM presence WHERE team_id = ?")
    .get(teamId) as PresenceSession | undefined;
  if (row) logPresenceSession(row, nowISO());
  db.prepare("DELETE FROM presence WHERE team_id = ?").run(teamId);
}

/** Чистка протухшего присутствия (ленивая, при чтении) + запись в историю. */
export function cleanupExpiredPresence(): void {
  const now = nowISO();
  const expired = db
    .prepare(
      "SELECT team_id, city, checked_in_at, expires_at FROM presence WHERE expires_at <= ?",
    )
    .all(now) as (PresenceSession & { expires_at: string })[];
  // Сессия истекает в конце дня — фиксируем ended_at = expires_at.
  for (const e of expired) logPresenceSession(e, e.expires_at);
  db.prepare("DELETE FROM presence WHERE expires_at <= ?").run(now);
}

export interface PresenceRow {
  city: string;
  checked_in_at: string;
  team_id: number;
  number: string;
  name: string;
  email: string;
  phone: string;
  telegram: string | null;
  max_link: string | null;
  contacts_consent: number;
}

/** Активное присутствие (с предварительной чисткой протухшего). */
export function getActivePresence(): PresenceRow[] {
  cleanupExpiredPresence();
  return db
    .prepare(
      `SELECT pr.city, pr.checked_in_at,
              t.id AS team_id, t.number, t.name, t.email, t.phone,
              t.telegram, t.max_link, t.contacts_consent
       FROM presence pr
       JOIN teams t ON t.id = pr.team_id
       WHERE pr.expires_at > ?
       ORDER BY pr.city, pr.checked_in_at DESC`,
    )
    .all(nowISO()) as PresenceRow[];
}

/** Текущее присутствие команды (или undefined). */
export function getMyPresence(
  teamId: number,
): { city: string; expires_at: string } | undefined {
  cleanupExpiredPresence();
  return db
    .prepare(
      "SELECT city, expires_at FROM presence WHERE team_id = ? AND expires_at > ?",
    )
    .get(teamId, nowISO()) as { city: string; expires_at: string } | undefined;
}

// ─── Предложения коллабораций ─────────────────────────────────────────────────

export function createProposal(input: {
  fromTeamId: number;
  toTeamId: number;
  city: string;
  visitDate: string;
  partOfDay?: string | null;
  message?: string | null;
}): Proposal {
  const info = db
    .prepare(
      `INSERT INTO collab_proposals
         (from_team_id, to_team_id, city, visit_date, part_of_day, message, status, created_at)
       VALUES (@fromTeamId, @toTeamId, @city, @visitDate, @partOfDay, @message, 'proposed', @createdAt)`,
    )
    .run({
      fromTeamId: input.fromTeamId,
      toTeamId: input.toTeamId,
      city: input.city,
      visitDate: input.visitDate,
      partOfDay: input.partOfDay ?? null,
      message: input.message ?? null,
      createdAt: nowISO(),
    });
  return db
    .prepare("SELECT * FROM collab_proposals WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as Proposal;
}

/** Не дублировать активное предложение тому же адресату на тот же слот. */
export function findOpenProposal(
  fromTeamId: number,
  toTeamId: number,
  city: string,
  visitDate: string,
): Proposal | undefined {
  return db
    .prepare(
      `SELECT * FROM collab_proposals
       WHERE from_team_id = ? AND to_team_id = ? AND city = ? AND visit_date = ?
         AND status = 'proposed'`,
    )
    .get(fromTeamId, toTeamId, city, visitDate) as Proposal | undefined;
}

export interface ProposalView {
  id: number;
  city: string;
  visit_date: string;
  part_of_day: string | null;
  message: string | null;
  status: string;
  created_at: string;
  team_id: number;
  number: string;
  name: string;
  email: string;
  phone: string;
  telegram: string | null;
  max_link: string | null;
  contacts_consent: number;
}

/** Входящие предложения для команды (с данными отправителя). */
export function getIncomingProposals(teamId: number): ProposalView[] {
  return db
    .prepare(
      `SELECT cp.id, cp.city, cp.visit_date, cp.part_of_day, cp.message, cp.status, cp.created_at,
              t.id AS team_id, t.number, t.name, t.email, t.phone, t.telegram, t.max_link, t.contacts_consent
       FROM collab_proposals cp
       JOIN teams t ON t.id = cp.from_team_id
       WHERE cp.to_team_id = ?
       ORDER BY cp.created_at DESC`,
    )
    .all(teamId) as ProposalView[];
}

/** Исходящие предложения команды (с данными адресата). */
export function getOutgoingProposals(teamId: number): ProposalView[] {
  return db
    .prepare(
      `SELECT cp.id, cp.city, cp.visit_date, cp.part_of_day, cp.message, cp.status, cp.created_at,
              t.id AS team_id, t.number, t.name, t.email, t.phone, t.telegram, t.max_link, t.contacts_consent
       FROM collab_proposals cp
       JOIN teams t ON t.id = cp.to_team_id
       WHERE cp.from_team_id = ?
       ORDER BY cp.created_at DESC`,
    )
    .all(teamId) as ProposalView[];
}

export function getProposalById(id: number): Proposal | undefined {
  return db
    .prepare("SELECT * FROM collab_proposals WHERE id = ?")
    .get(id) as Proposal | undefined;
}

/** Сменить статус предложения, только если команда — адресат. Возвращает true при изменении. */
export function setProposalStatus(
  id: number,
  toTeamId: number,
  status: "accepted" | "declined",
): boolean {
  const info = db
    .prepare(
      `UPDATE collab_proposals SET status = ?
       WHERE id = ? AND to_team_id = ? AND status = 'proposed'`,
    )
    .run(status, id, toTeamId);
  return info.changes > 0;
}

// ─── «Горячие даты»: слоты город+дата с наибольшим пересечением команд ────────

export interface HotSlot {
  city: string;
  visit_date: string;
  teams: number;
}

/**
 * Слоты (город + дата), где планируют ≥2 команд, по убыванию числа команд.
 * Только сегодня и будущее — прошедшие даты не показываем.
 */
export function getHotSlots(limit = 8): HotSlot[] {
  return db
    .prepare(
      `SELECT city, visit_date, COUNT(DISTINCT team_id) AS teams
       FROM plans
       WHERE visit_date >= ?
       GROUP BY city, visit_date
       HAVING teams >= 2
       ORDER BY teams DESC, visit_date ASC, city ASC
       LIMIT ?`,
    )
    .all(todayISO(), limit) as HotSlot[];
}

export interface AgendaRow {
  visit_date: string;
  city: string;
  part_of_day: string;
  transport: string | null;
  car_seats: number | null;
  foot_people: number | null;
  team_id: number;
  number: string;
  name: string;
}

/** Все заявки начиная с даты `from` (для вида «Календарь по датам»). */
export function getAgenda(from: string): AgendaRow[] {
  return db
    .prepare(
      `SELECT p.visit_date, p.city, p.part_of_day, p.transport, p.car_seats, p.foot_people,
              t.id AS team_id, t.number, t.name
       FROM plans p
       JOIN teams t ON t.id = p.team_id
       WHERE p.visit_date >= ?
       ORDER BY p.visit_date, p.city, p.part_of_day, t.number`,
    )
    .all(from) as AgendaRow[];
}

// ─── Дашборд: агрегированная статистика (без персональных данных) ─────────────

export interface DashboardStats {
  teams: number;
  plans: number;
  teamsWithPlans: number;
  citiesCovered: number;
  daysCovered: number;
  matchPairs: number; // уникальные пары команд, чьи планы пересеклись (город+дата), за весь сезон
  matchPairsUpcoming: number; // из них — по датам с сегодняшнего дня
  proposalsTotal: number;
  proposalsAccepted: number;
  proposalsDeclined: number;
  proposalsPending: number;
  // Разбивка предложений на прошедшие (visit_date < сегодня) и будущие — по статусам.
  proposalsSplit: {
    total: { passed: number; upcoming: number };
    accepted: { passed: number; upcoming: number };
    proposed: { passed: number; upcoming: number };
    declined: { passed: number; upcoming: number };
  };
  presenceActive: number; // команд отмечено «Я здесь» прямо сейчас
  confirmedVisits: number; // реальных визитов (по истории «Я здесь», дольше 10 минут)
  byCity: { city: string; planned: number; passed: number; confirmed: number }[];
  presenceByCity: { city: string; teams: number }[];
  // Воронка вовлечения (число команд на каждом шаге)
  funnel: { planned: number; matched: number; proposed: number; collaborated: number };
  // План vs факт: прошедшие планы и сколько из них подтверждено присутствием (>10 мин)
  passedPlans: number;
  confirmedPlans: number;
  // Динамика по датам
  visitsByDate: { date: string; n: number }[]; // заявки по visit_date
  regsByDate: { date: string; n: number }[]; // регистрации по дате создания
  realByDate: { date: string; n: number }[]; // реальные визиты (>10 мин) по дате заезда
}

function scalar(sql: string, ...params: unknown[]): number {
  const row = db.prepare(sql).get(...params) as { n: number } | undefined;
  return row?.n ?? 0;
}

/**
 * Сводная статистика для /dashboard. Только обезличенные агрегаты —
 * ни названий, ни номеров, ни контактов команд.
 */
export function getDashboardStats(): DashboardStats {
  cleanupExpiredPresence();
  const now = nowISO();

  const byStatus = db
    .prepare(`SELECT status, COUNT(*) AS n FROM collab_proposals GROUP BY status`)
    .all() as { status: string; n: number }[];
  const statusCount = (s: string) =>
    byStatus.find((r) => r.status === s)?.n ?? 0;

  // Сегодняшняя дата (локальная) для разделения «прошло / впереди».
  const t = new Date();
  const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
    t.getDate(),
  ).padStart(2, "0")}`;

  // Предложения коллабораций: прошедшие (дата визита уже была) и будущие, по статусам.
  const propSplitRows = db
    .prepare(
      `SELECT status,
         SUM(CASE WHEN visit_date < ? THEN 1 ELSE 0 END) AS passed,
         SUM(CASE WHEN visit_date >= ? THEN 1 ELSE 0 END) AS upcoming
       FROM collab_proposals GROUP BY status`,
    )
    .all(today, today) as { status: string; passed: number; upcoming: number }[];
  const splitOf = (s: string) => {
    const r = propSplitRows.find((x) => x.status === s);
    return { passed: r?.passed ?? 0, upcoming: r?.upcoming ?? 0 };
  };
  const splitTotal = propSplitRows.reduce(
    (a, r) => ({ passed: a.passed + r.passed, upcoming: a.upcoming + r.upcoming }),
    { passed: 0, upcoming: 0 },
  );

  // Визиты по городам: запланировано, прошло (дата в прошлом), реально были (>1ч).
  const plannedRows = db
    .prepare(`SELECT city, COUNT(*) AS n FROM plans GROUP BY city`)
    .all() as { city: string; n: number }[];
  const passedRows = db
    .prepare(`SELECT city, COUNT(*) AS n FROM plans WHERE visit_date < ? GROUP BY city`)
    .all(today) as { city: string; n: number }[];
  const confirmedRows = db
    .prepare(
      `SELECT city, COUNT(*) AS n FROM presence_log WHERE duration_min > 10 GROUP BY city`,
    )
    .all() as { city: string; n: number }[];

  const cityMap = new Map<string, { planned: number; passed: number; confirmed: number }>();
  const bump = (city: string, key: "planned" | "passed" | "confirmed", n: number) => {
    const cur = cityMap.get(city) ?? { planned: 0, passed: 0, confirmed: 0 };
    cur[key] = n;
    cityMap.set(city, cur);
  };
  for (const r of plannedRows) bump(r.city, "planned", r.n);
  for (const r of passedRows) bump(r.city, "passed", r.n);
  for (const r of confirmedRows) bump(r.city, "confirmed", r.n);
  const byCity = [...cityMap.entries()]
    .map(([city, v]) => ({ city, ...v }))
    .sort((a, b) => b.planned - a.planned || a.city.localeCompare(b.city));

  const presenceByCity = db
    .prepare(
      `SELECT city, COUNT(*) AS teams FROM presence WHERE expires_at > ?
       GROUP BY city ORDER BY teams DESC, city`,
    )
    .all(now) as { city: string; teams: number }[];

  return {
    teams: scalar(`SELECT COUNT(*) AS n FROM teams`),
    plans: scalar(`SELECT COUNT(*) AS n FROM plans`),
    teamsWithPlans: scalar(`SELECT COUNT(DISTINCT team_id) AS n FROM plans`),
    citiesCovered: scalar(`SELECT COUNT(DISTINCT city) AS n FROM plans`),
    daysCovered: scalar(`SELECT COUNT(DISTINCT visit_date) AS n FROM plans`),
    matchPairs: scalar(
      `SELECT COUNT(*) AS n FROM (
         SELECT DISTINCT a.team_id AS t1, b.team_id AS t2
         FROM plans a JOIN plans b
           ON a.city = b.city AND a.visit_date = b.visit_date AND a.team_id < b.team_id
       )`,
    ),
    matchPairsUpcoming: scalar(
      `SELECT COUNT(*) AS n FROM (
         SELECT DISTINCT a.team_id AS t1, b.team_id AS t2
         FROM plans a JOIN plans b
           ON a.city = b.city AND a.visit_date = b.visit_date AND a.team_id < b.team_id
         WHERE a.visit_date >= ?
       )`,
      today,
    ),
    proposalsTotal: byStatus.reduce((s, r) => s + r.n, 0),
    proposalsAccepted: statusCount("accepted"),
    proposalsDeclined: statusCount("declined"),
    proposalsPending: statusCount("proposed"),
    proposalsSplit: {
      total: splitTotal,
      accepted: splitOf("accepted"),
      proposed: splitOf("proposed"),
      declined: splitOf("declined"),
    },
    presenceActive: scalar(`SELECT COUNT(*) AS n FROM presence WHERE expires_at > ?`, now),
    confirmedVisits: scalar(`SELECT COUNT(*) AS n FROM presence_log WHERE duration_min > 10`),
    byCity,
    presenceByCity,
    funnel: {
      planned: scalar(`SELECT COUNT(DISTINCT team_id) AS n FROM plans`),
      matched: scalar(
        `SELECT COUNT(DISTINCT a.team_id) AS n FROM plans a
         JOIN plans b ON a.city = b.city AND a.visit_date = b.visit_date AND a.team_id <> b.team_id`,
      ),
      proposed: scalar(
        `SELECT COUNT(*) AS n FROM (
           SELECT from_team_id AS t FROM collab_proposals
           UNION SELECT to_team_id FROM collab_proposals)`,
      ),
      collaborated: scalar(
        `SELECT COUNT(*) AS n FROM (
           SELECT from_team_id AS t FROM collab_proposals WHERE status = 'accepted'
           UNION SELECT to_team_id FROM collab_proposals WHERE status = 'accepted')`,
      ),
    },
    passedPlans: scalar(`SELECT COUNT(*) AS n FROM plans WHERE visit_date < ?`, today),
    confirmedPlans: scalar(
      // Смягчённое совпадение: команда была в этом городе в окне ±1 день от даты
      // заявки. checked_in_at хранится в UTC — приводим к МСК (+3, часовой пояс игры).
      `SELECT COUNT(*) AS n FROM plans p
       WHERE p.visit_date < ?
         AND EXISTS (
           SELECT 1 FROM presence_log pl
           WHERE pl.team_id = p.team_id AND pl.city = p.city
             AND date(datetime(pl.checked_in_at, '+3 hours'))
                 BETWEEN date(p.visit_date, '-1 day') AND date(p.visit_date, '+1 day')
             AND pl.duration_min > 10)`,
      today,
    ),
    visitsByDate: db
      .prepare(`SELECT visit_date AS date, COUNT(*) AS n FROM plans GROUP BY visit_date ORDER BY visit_date`)
      .all() as { date: string; n: number }[],
    regsByDate: db
      .prepare(
        `SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS n FROM teams GROUP BY date ORDER BY date`,
      )
      .all() as { date: string; n: number }[],
    realByDate: db
      .prepare(
        // Дата визита — по МСК (+3, часовой пояс игры), а не UTC: иначе
        // ночные отметки (00:00–03:00 МСК) уезжают на предыдущий день.
        `SELECT substr(datetime(checked_in_at, '+3 hours'), 1, 10) AS date, COUNT(*) AS n
         FROM presence_log WHERE duration_min > 10 GROUP BY date ORDER BY date`,
      )
      .all() as { date: string; n: number }[],
  };
}
