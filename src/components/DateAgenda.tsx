"use client";

import { useEffect, useMemo, useState } from "react";
import { PARTS_OF_DAY, type PartOfDay } from "@/config/game";
import { jsonFetch } from "@/lib/client";
import { formatAgendaDate } from "@/lib/date";
import { plural } from "@/lib/plural";
import { transportEmoji, transportLabel } from "@/lib/transport";

interface Entry {
  date: string;
  city: string;
  partOfDay: string;
  transport: string | null;
  carSeats: number | null;
  team: { id: number; number: string; name: string; isMine: boolean };
}

/** Цвет точки = время суток (как чипсы в календаре по городу). */
const PART_DOT: Record<PartOfDay, string> = {
  morning: "bg-amber-400",
  day: "bg-sky-400",
  evening: "bg-violet-400",
};
function partDot(p: string): string {
  return PART_DOT[p as PartOfDay] ?? "bg-stone-400";
}

const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
})();

export default function DateAgenda({
  refreshKey,
  onPickCity,
}: {
  refreshKey: number;
  onPickCity: (city: string, date: string) => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    jsonFetch<{ entries: Entry[] }>("/api/agenda")
      .then((d) => {
        if (!cancelled) setEntries(d.entries);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Группировка: дата → город (по «горячести») → чипсы команд.
  const days = useMemo(() => {
    const byDate = new Map<string, Entry[]>();
    for (const e of entries) {
      const l = byDate.get(e.date) ?? [];
      l.push(e);
      byDate.set(e.date, l);
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, list]) => {
        const byCity = new Map<string, Entry[]>();
        for (const e of list) {
          const l = byCity.get(e.city) ?? [];
          l.push(e);
          byCity.set(e.city, l);
        }
        const cities = [...byCity.entries()]
          .map(([city, es]) => {
            const teams = new Set(es.map((e) => e.team.id)).size;
            return { city, entries: es, teams, hot: teams >= 2 };
          })
          .sort((a, b) => b.teams - a.teams || a.city.localeCompare(b.city));
        const teamsTotal = new Set(list.map((e) => e.team.id)).size;
        return { date, cities, teamsTotal };
      });
  }, [entries]);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      {days.length === 0 ? (
        <p className="text-sm text-stone-400">
          {loading ? "Загрузка…" : "На ближайшие даты заявок нет."}
        </p>
      ) : (
        <div className={`space-y-2.5 ${loading ? "opacity-50" : ""}`}>
          {days.map((d) => {
            const today = d.date === TODAY;
            return (
              <div
                key={d.date}
                className={`rounded-xl border p-3 ${
                  today ? "border-indigo-300 bg-indigo-50/40" : "border-stone-200"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-900 first-letter:uppercase">
                    {formatAgendaDate(d.date)}
                  </span>
                  {today && (
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                      сегодня
                    </span>
                  )}
                  <span className="ml-auto text-xs text-stone-400">
                    {d.cities.length} {plural(d.cities.length, ["город", "города", "городов"])} ·{" "}
                    {d.teamsTotal} {plural(d.teamsTotal, ["команда", "команды", "команд"])}
                  </span>
                </div>

                {d.cities.map((c) => (
                  <div
                    key={c.city}
                    className="flex items-start gap-2.5 border-t border-stone-100 py-1.5"
                  >
                    <button
                      onClick={() => onPickCity(c.city, d.date)}
                      title="Открыть город в календаре"
                      className="flex w-32 shrink-0 items-center gap-1 text-left text-sm font-medium leading-tight text-stone-700 hover:text-indigo-600"
                    >
                      {c.hot && <span aria-hidden>🔥</span>}
                      <span>{c.city}</span>
                      <span className="text-xs font-normal text-stone-400">{c.teams}</span>
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {c.entries.map((e) => {
                        const tLabel = transportLabel(e.transport, e.carSeats);
                        return (
                          <a
                            key={`${e.team.id}|${e.partOfDay}`}
                            href={`/team/${e.team.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`№${e.team.number} «${e.team.name}»${tLabel ? ` — ${tLabel}` : ""}`}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-stone-50 ${
                              e.team.isMine ? "border-stone-400" : "border-stone-200"
                            }`}
                          >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${partDot(e.partOfDay)}`} />
                            {e.team.number}
                            {transportEmoji(e.transport)}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
        {PARTS_OF_DAY.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${partDot(p.id)}`} />
            {p.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span aria-hidden>🔥</span> пересечение (≥2 команд)
        </span>
        <span className="text-stone-400">· 🚶 пешком · 🚗 на авто (мест — по наведению)</span>
      </div>
    </section>
  );
}
