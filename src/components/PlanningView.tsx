"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CITIES,
  PARTS_OF_DAY,
  SEASON,
  partOfDayLabel,
  type PartOfDay,
} from "@/config/game";
import { jsonFetch } from "@/lib/client";
import { formatVisitDate } from "@/lib/date";
import CityCalendar from "@/components/CityCalendar";
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

const STATUS_LABEL: Record<Proposal["status"], string> = {
  proposed: "Ожидает ответа",
  accepted: "Принято",
  declined: "Отклонено",
};

const card = "rounded-2xl border border-stone-200 bg-white p-4 shadow-sm";

export default function PlanningView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [incoming, setIncoming] = useState<Proposal[]>([]);
  const [outgoing, setOutgoing] = useState<Proposal[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");

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
      const [p, m, pr] = await Promise.all([
        jsonFetch<{ plans: Plan[] }>("/api/plans"),
        jsonFetch<{ matches: Match[] }>("/api/matches"),
        jsonFetch<{ incoming: Proposal[]; outgoing: Proposal[] }>("/api/proposals"),
      ]);
      setPlans(p.plans);
      setMatches(m.matches);
      setIncoming(pr.incoming);
      setOutgoing(pr.outgoing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const proposedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const o of outgoing) s.add(`${o.team.id}|${o.city}|${o.visitDate}`);
    return s;
  }, [outgoing]);

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

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
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
        {matches.length === 0 ? (
          <p className="text-sm text-stone-500">
            Пока нет пересечений. Заявите визиты ниже — и здесь появятся команды,
            планы которых совпали с вашими по городу и дате.
          </p>
        ) : (
          <ul className="space-y-2">
            {matches.map((m) => {
              const key = matchKey(m);
              const alreadyProposed = proposedKeys.has(key);
              return (
                <li
                  key={`${key}|${m.myPart}`}
                  className="rounded-xl border border-stone-200 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-stone-900">
                        {m.city}
                      </span>
                      <span className="text-stone-500">
                        {" · "}
                        {formatVisitDate(m.visitDate)} · вы: {partOfDayLabel(m.myPart as PartOfDay)},
                        они: {partOfDayLabel(m.otherPart as PartOfDay)}
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
                    {alreadyProposed ? (
                      <span className="text-xs font-medium text-stone-400">
                        Предложено ✓
                      </span>
                    ) : composeKey === key ? null : (
                      <button
                        onClick={() => {
                          setComposeKey(key);
                          setComposeMsg("");
                          setNotice("");
                        }}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Предложить коллаборацию
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

      {/* Входящие предложения */}
      {incoming.length > 0 && (
        <section className={card}>
          <h2 className="mb-3 text-base font-semibold text-stone-900">
            Входящие предложения
          </h2>
          <ul className="space-y-2">
            {incoming.map((p) => (
              <li key={p.id} className="rounded-xl border border-stone-200 p-3">
                <div className="text-sm text-stone-700">
                  Команда №{p.team.number} «{p.team.name}»
                  <ProfileLink teamId={p.team.id} className="mx-1" />— {p.city},{" "}
                  {formatVisitDate(p.visitDate)}
                  {p.partOfDay && `, ${partOfDayLabel(p.partOfDay as PartOfDay)}`}
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
                  {p.status === "proposed" ? (
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
            ))}
          </ul>
        </section>
      )}

      {/* Заявить визит + мои планы */}
      <section className={card}>
        <h2 className="mb-3 text-base font-semibold text-stone-900">Мои планы</h2>
        <form
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
            min={SEASON.start}
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

      {/* Календарь по городу */}
      <CityCalendar refreshKey={refreshKey} />
    </div>
  );
}
