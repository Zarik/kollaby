"use client";

import { useEffect, useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  addMonths,
  isAfter,
  isBefore,
} from "date-fns";
import { CITIES, SEASON, partOfDayLabel, type PartOfDay } from "@/config/game";
import { jsonFetch } from "@/lib/client";

interface CalendarEntry {
  planId: number;
  visitDate: string;
  partOfDay: string;
  team: { id: number; number: string; name: string };
  isMine: boolean;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const seasonStart = new Date(SEASON.start + "T00:00:00");
const seasonEnd = new Date(SEASON.end + "T00:00:00");

export default function CityCalendar({ refreshKey }: { refreshKey: number }) {
  const [city, setCity] = useState<string>(CITIES[0]);
  const [month, setMonth] = useState<Date>(startOfMonth(seasonStart));
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const from = format(startOfMonth(month), "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    jsonFetch<{ entries: CalendarEntry[] }>(
      `/api/calendar?city=${encodeURIComponent(city)}&from=${from}&to=${to}`,
    )
      .then((data) => {
        if (!cancelled) setEntries(data.entries);
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
  }, [city, from, to, refreshKey]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const e of entries) {
      const list = map.get(e.visitDate) ?? [];
      list.push(e);
      map.set(e.visitDate, list);
    }
    return map;
  }, [entries]);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(month),
        end: endOfMonth(month),
      }),
    [month],
  );

  // смещение под понедельник как первый день недели
  const leadBlanks = (getDay(startOfMonth(month)) + 6) % 7;

  const canPrev = isAfter(startOfMonth(month), startOfMonth(seasonStart));
  const canNext = isBefore(startOfMonth(month), startOfMonth(seasonEnd));

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-stone-900">Календарь по городу</h2>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => canPrev && setMonth(addMonths(month, -1))}
          disabled={!canPrev}
          className="rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-30"
        >
          ←
        </button>
        <span className="text-sm font-medium capitalize text-stone-700">
          {format(month, "LLLL yyyy")}
        </span>
        <button
          onClick={() => canNext && setMonth(addMonths(month, 1))}
          disabled={!canNext}
          className="rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-30"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-7 gap-1 ${loading ? "opacity-50" : ""}`}>
        {Array.from({ length: leadBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const inSeason = iso >= SEASON.start && iso <= SEASON.end;
          const dayEntries = byDate.get(iso) ?? [];
          return (
            <div
              key={iso}
              className={`min-h-16 rounded-lg border p-1 text-left ${
                inSeason
                  ? "border-stone-200 bg-white"
                  : "border-transparent bg-stone-50 text-stone-300"
              }`}
            >
              <div className="text-[11px] font-medium text-stone-400">
                {format(day, "d")}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {dayEntries.slice(0, 4).map((e) => (
                  <span
                    key={e.planId}
                    title={`№${e.team.number} ${e.team.name} · ${partOfDayLabel(
                      e.partOfDay as PartOfDay,
                    )}`}
                    className={`inline-block rounded px-1 text-[10px] font-medium ${
                      e.isMine
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    №{e.team.number}
                  </span>
                ))}
                {dayEntries.length > 4 && (
                  <span className="text-[10px] text-stone-400">
                    +{dayEntries.length - 4}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-stone-400">
        Чипсы — команды, заявившие визит в этот день. Ваши выделены цветом. Наведите для деталей.
      </p>
    </section>
  );
}
