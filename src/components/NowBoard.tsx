"use client";

import { useCallback, useEffect, useState } from "react";
import { CITIES } from "@/config/game";
import { jsonFetch } from "@/lib/client";
import { plural } from "@/lib/plural";
import Contacts from "@/components/Contacts";
import ProfileLink from "@/components/ProfileLink";

interface NowTeam {
  teamId: number;
  number: string;
  name: string;
  email: string | null;
  phone: string | null;
  telegram: string | null;
  maxLink: string | null;
  contactsShared: boolean;
  isMine: boolean;
  checkedInAt: string;
}
interface CityBlock {
  city: string;
  teams: NowTeam[];
}

const card = "rounded-2xl border border-stone-200 bg-white p-4 shadow-sm";

export default function NowBoard() {
  const [cities, setCities] = useState<CityBlock[]>([]);
  const [myCity, setMyCity] = useState<string | null>(null);
  const [selectCity, setSelectCity] = useState<string>(CITIES[0]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [now, mine] = await Promise.all([
        jsonFetch<{ cities: CityBlock[] }>("/api/now"),
        jsonFetch<{ presence: { city: string } | null }>("/api/presence"),
      ]);
      setCities(now.cities);
      setMyCity(mine.presence?.city ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // мягкий авто-рефреш
    return () => clearInterval(t);
  }, [load]);

  async function checkIn() {
    setBusy(true);
    setError("");
    try {
      await jsonFetch("/api/presence", {
        method: "POST",
        body: JSON.stringify({ city: selectCity }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    setBusy(true);
    setError("");
    try {
      await jsonFetch("/api/presence", { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  function toggleReveal(id: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <section className={card}>
        <h1 className="mb-1 text-lg font-semibold text-stone-900">Кто здесь сейчас</h1>
        <p className="mb-3 text-sm text-stone-500">
          Отметьтесь по приезде — статус держится до конца дня или нажмите
          «Мы уехали». Так другие команды увидят, что вы в городе.
        </p>

        {myCity ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 p-3">
            <span className="text-sm text-emerald-800">
              Вы отмечены в городе <b>{myCity}</b>.
            </span>
            <button
              onClick={checkOut}
              disabled={busy}
              className="ml-auto rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              Мы уехали
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectCity}
              onChange={(e) => setSelectCity(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={checkIn}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Я здесь
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cities.map((block) => (
          <section key={block.city} className={card}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900">{block.city}</h2>
              <span className="text-xs text-stone-400">
                {block.teams.length === 0
                  ? "пусто"
                  : `${block.teams.length} ${plural(block.teams.length, [
                      "команда",
                      "команды",
                      "команд",
                    ])}`}
              </span>
            </div>
            {block.teams.length === 0 ? (
              <p className="text-sm text-stone-400">Сейчас никого.</p>
            ) : (
              <ul className="space-y-1.5">
                {block.teams.map((t) => (
                  <li key={t.teamId} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-stone-700">
                        №{t.number} «{t.name}»
                        {t.isMine && (
                          <span className="ml-1 text-xs text-indigo-600">(вы)</span>
                        )}
                        <ProfileLink teamId={t.teamId} className="ml-1" />
                      </span>
                      {!t.isMine && t.contactsShared && (
                        <button
                          onClick={() => toggleReveal(t.teamId)}
                          className="rounded-md px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-50"
                        >
                          {revealed.has(t.teamId) ? "Скрыть" : "Контакты"}
                        </button>
                      )}
                    </div>
                    {revealed.has(t.teamId) && t.contactsShared && (
                      <Contacts
                        email={t.email}
                        phone={t.phone}
                        telegram={t.telegram}
                        maxLink={t.maxLink}
                        className="mt-0.5 block text-xs text-stone-500"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
