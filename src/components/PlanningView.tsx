"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  CITIES,
  PARTS_OF_DAY,
  SEASON,
  partOfDayLabel,
  type PartOfDay,
} from "@/config/game";
import { jsonFetch } from "@/lib/client";
import { formatVisitDate } from "@/lib/date";
import { plural } from "@/lib/plural";
import CalendarTabs from "@/components/CalendarTabs";
import Contacts from "@/components/Contacts";
import ProfileLink from "@/components/ProfileLink";

interface Plan {
  id: number;
  city: string;
  visit_date: string;
  part_of_day: string;
  note: string | null;
}
interface Match {
  city: string;
  visitDate: string;
  myPart: string;
  otherPart: string;
  samePartOfDay: boolean;
  team: { id: number; number: string; name: string };
}
interface ProposalTeam {
  id: number;
  number: string;
  name: string;
  email: string | null;
  phone: string | null;
  telegram: string | null;
  maxLink: string | null;
  contactsShared: boolean;
}
interface Proposal {
  id: number;
  city: string;
  visitDate: string;
  partOfDay: string | null;
  message: string | null;
  status: "proposed" | "accepted" | "declined";
  createdAt: string;
  team: ProposalTeam;
}

interface HotSlot {
  city: string;
  visitDate: string;
  teams: number;
  mine: boolean;
}

const STATUS_LABEL: Record<Proposal["status"], string> = {
  proposed: "Ожидает ответа",
  accepted: "Принято",
  declined: "Отклонено",
};

const card = "rounded-2xl border border-stone-200 bg-white p-4 shadow-sm";

/** Сегодняшняя дата (локальная) yyyy-mm-dd — для отметки «сегодня». */
const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
})();

/** Бейдж «сегодня». */
function TodayBadge() {
  return (
    <span className="ml-1.5 rounded bg-amber-200 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-amber-800">
      сегодня
    </span>
  );
}

export default function PlanningView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [incoming, setIncoming] = useState<Proposal[]>([]);
  const [outgoing, setOutgoing] = useState<Proposal[]>([]);
  const [hot, setHot] = useState<HotSlot[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // форма заявки
  const [city, setCity] = useState<string>(CITIES[0]);
  const [date, setDate] = useState("");
  const [part, setPart] = useState<PartOfDay>(PARTS_OF_DAY[0].id);
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  // компоновка предложения по матчу
  const [composeKey, setComposeKey] = useState<string | null>(null);
  const [composeMsg, setComposeMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const [p, m, pr, h] = await Promise.all([
        jsonFetch<{ plans: Plan[] }>("/api/plans"),
        jsonFetch<{ matches: Match[] }>("/api/matches"),
        jsonFetch<{ incoming: Proposal[]; outgoing: Proposal[] }>("/api/proposals"),
        jsonFetch<{ hot: HotSlot[] }>("/api/hot"),
      ]);
      setPlans(p.plans);
      setMatches(m.matches);
      setIncoming(pr.incoming);
      setOutgoing(pr.outgoing);
      setHot(h.hot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Слоты, по которым уже есть предложение (в любую сторону) — предложено или
  // договорено. Такие матчи скрываем из «Возможностей».
  const engagedKeys = useMemo(() => {
    const s = new Set<string>();
    const add = (p: Proposal) => {
      if (p.status === "proposed" || p.status === "accepted") {
        s.add(`${p.team.id}|${p.city}|${p.visitDate}`);
      }
    };
    outgoing.forEach(add);
    incoming.forEach(add);
    return s;
  }, [outgoing, incoming]);

  const visibleMatches = useMemo(
    () => matches.filter((m) => !engagedKeys.has(`${m.team.id}|${m.city}|${m.visitDate}`)),
    [matches, engagedKeys],
  );

  const pendingIncoming = useMemo(
    () => incoming.filter((p) => p.status === "proposed").length,
    [incoming],
  );

  // Все предложения — входящие и исходящие — в одном списке, по дате (ближайшие выше).
  const proposals = useMemo(
    () =>
      [
        ...incoming.map((p) => ({ ...p, dir: "in" as const })),
        ...outgoing.map((p) => ({ ...p, dir: "out" as const })),
      ].sort((a, b) => a.visitDate.localeCompare(b.visitDate)),
    [incoming, outgoing],
  );

  async function addPlan(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!date) return;
    setAdding(true);
    try {
      await jsonFetch("/api/plans", {
        method: "POST",
        body: JSON.stringify({ city, visitDate: date, partOfDay: part, note }),
      });
      setNote("");
      setDate("");
      await loadAll();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setAdding(false);
    }
  }

  async function removePlan(id: number) {
    try {
      await jsonFetch(`/api/plans/${id}`, { method: "DELETE" });
      await loadAll();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  async function propose(match: Match) {
    setSending(true);
    setNotice("");
    try {
      const res = await jsonFetch<{ emailed: boolean }>("/api/proposals", {
        method: "POST",
        body: JSON.stringify({
          toTeamId: match.team.id,
          city: match.city,
          visitDate: match.visitDate,
          partOfDay: match.myPart,
          message: composeMsg.trim() || null,
        }),
      });
      setComposeKey(null);
      setComposeMsg("");
      await loadAll();
      setNotice(
        res.emailed
          ? "Предложение отправлено — команде ушло письмо."
          : "Предложение создано (письмо не отправлено: SMTP не настроен).",
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSending(false);
    }
  }

  async function answer(id: number, status: "accepted" | "declined") {
    try {
      await jsonFetch(`/api/proposals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  function matchKey(m: Match) {
    return `${m.team.id}|${m.city}|${m.visitDate}`;
  }

  function pickHotSlot(slot: HotSlot) {
    setCity(slot.city);
    setDate(slot.visitDate);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Предложения — входящие и исходящие, выше «Возможностей» и заметнее */}
      {proposals.length > 0 && (
        <section className="rounded-2xl border-2 border-indigo-300 bg-indigo-50/60 p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-stone-900">
            Предложения
            {pendingIncoming > 0 && (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                {pendingIncoming} {plural(pendingIncoming, ["новое", "новых", "новых"])}
              </span>
            )}
          </h2>
          <ul className="space-y-2">
            {proposals.map((p) => {
              const today = p.visitDate === TODAY;
              const isIncoming = p.dir === "in";
              return (
                <li
                  key={p.id}
                  className={`rounded-xl border p-3 ${
                    today ? "border-amber-300 bg-amber-50" : "border-indigo-100 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm text-stone-700">
                      {isIncoming ? "Команда " : "Вы → команда "}№{p.team.number} «
                      {p.team.name}»
                      <ProfileLink teamId={p.team.id} className="mx-1" />— {p.city},{" "}
                      {formatVisitDate(p.visitDate)}
                      {p.partOfDay && `, ${partOfDayLabel(p.partOfDay as PartOfDay)}`}
                      {today && <TodayBadge />}
                    </div>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        isIncoming
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {isIncoming ? "входящее" : "исходящее"}
                    </span>
                  </div>
                  {p.message && (
                    <p className="mt-1 text-sm text-stone-500">«{p.message}»</p>
                  )}
                  {p.team.contactsShared && (
                    <p className="mt-1 text-xs text-stone-500">
                      Контакты:{" "}
                      <Contacts
                        email={p.team.email}
                        phone={p.team.phone}
                        telegram={p.team.telegram}
                        maxLink={p.team.maxLink}
                      />
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    {isIncoming && p.status === "proposed" ? (
                      <>
                        <button
                          onClick={() => answer(p.id, "accepted")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                          Принять
                        </button>
                        <button
                          onClick={() => answer(p.id, "declined")}
                          className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
                        >
                          Отклонить
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-stone-400">
                        {STATUS_LABEL[p.status]}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Возможности коллаборации */}
      <section className={card}>
        <h2 className="mb-3 text-base font-semibold text-stone-900">
          Возможности коллаборации
        </h2>
        {notice && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </div>
        )}
        {visibleMatches.length === 0 ? (
          <p className="text-sm text-stone-500">
            {matches.length === 0
              ? "Пока нет пересечений. Заявите визиты ниже — и здесь появятся команды, планы которых совпали с вашими по городу и дате."
              : "Все пересечения уже в работе — смотрите входящие и отправленные предложения."}
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleMatches.map((m) => {
              const key = matchKey(m);
              return (
                <li
                  key={`${key}|${m.myPart}`}
                  className={`rounded-xl border p-3 ${
                    m.visitDate === TODAY
                      ? "border-amber-300 bg-amber-50"
                      : "border-stone-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-stone-900">{m.city}</span>
                      <span className="text-stone-500">
                        {" · "}
                        {formatVisitDate(m.visitDate)}
                        {m.visitDate === TODAY && <TodayBadge />} · вы:{" "}
                        {partOfDayLabel(m.myPart as PartOfDay)}, они:{" "}
                        {partOfDayLabel(m.otherPart as PartOfDay)}
                      </span>
                      <div className="mt-0.5 text-stone-700">
                        Команда №{m.team.number} «{m.team.name}»
                        <ProfileLink teamId={m.team.id} className="ml-1" />
                        {m.samePartOfDay && (
                          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                            то же время суток
                          </span>
                        )}
                      </div>
                    </div>
                    {composeKey === key ? null : (
                      <button
                        onClick={() => {
                          setComposeKey(key);
                          setComposeMsg("");
                          setNotice("");
                        }}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Предложить коллабу
                      </button>
                    )}
                  </div>

                  {composeKey === key && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={composeMsg}
                        onChange={(e) => setComposeMsg(e.target.value)}
                        placeholder="Сообщение команде (необязательно)"
                        rows={2}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => propose(m)}
                          disabled={sending}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {sending ? "Отправка…" : "Отправить"}
                        </button>
                        <button
                          onClick={() => setComposeKey(null)}
                          className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Горячие даты */}
      {hot.length > 0 && (
        <section className={card}>
          <h2 className="mb-1 flex items-center gap-1.5 text-base font-semibold text-stone-900">
            <span aria-hidden>🔥</span> Горячие даты
          </h2>
          <p className="mb-3 text-sm text-stone-500">
            Где уже собираются команды. Нажмите — подставим город и дату в форму заявки,
            чтобы пересечься.
          </p>
          <ul className="flex flex-wrap gap-2">
            {hot.map((s) => (
              <li key={`${s.city}|${s.visitDate}`}>
                <button
                  type="button"
                  onClick={() => pickHotSlot(s)}
                  className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm transition-colors hover:border-amber-300 hover:bg-amber-100"
                >
                  <span className="font-medium text-stone-900">{s.city}</span>
                  <span className="text-stone-500">{formatVisitDate(s.visitDate)}</span>
                  <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                    {s.teams} {plural(s.teams, ["команда", "команды", "команд"])}
                  </span>
                  {s.mine && (
                    <span className="text-xs font-medium text-emerald-600">вы здесь</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Заявить визит + мои планы */}
      <section className={card}>
        <h2 className="mb-3 text-base font-semibold text-stone-900">Мои планы</h2>
        <form
          ref={formRef}
          onSubmit={addPlan}
          className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]"
        >
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            min={TODAY > SEASON.start ? TODAY : SEASON.start}
            max={SEASON.end}
            onChange={(e) => setDate(e.target.value)}
            required
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <select
            value={part}
            onChange={(e) => setPart(e.target.value as PartOfDay)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {PARTS_OF_DAY.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {adding ? "…" : "Заявить визит"}
          </button>
        </form>

        {plans.length === 0 ? (
          <p className="text-sm text-stone-500">
            Заявок пока нет. Добавьте визиты — и сервис подскажет пересечения.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {plans.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="text-stone-700">
                  <span className="font-medium text-stone-900">{p.city}</span> ·{" "}
                  {formatVisitDate(p.visit_date)} · {partOfDayLabel(p.part_of_day as PartOfDay)}
                  {p.note && <span className="text-stone-400"> — {p.note}</span>}
                </span>
                <button
                  onClick={() => removePlan(p.id)}
                  className="rounded-md px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-red-600"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Календарь: по городам / по датам */}
      <CalendarTabs refreshKey={refreshKey} />
    </div>
  );
}
