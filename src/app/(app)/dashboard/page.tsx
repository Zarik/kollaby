import { getDashboardStats } from "@/lib/repo";
import { CITIES, SERVICE_NAME } from "@/config/game";

// Живые цифры — без кэширования.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Дашборд · Коллабы",
};

const card = "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm";

function StatCard({
  value,
  label,
  hint,
  accent = "text-stone-900",
}: {
  value: number | string;
  label: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="mt-1 text-sm font-medium text-stone-700">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-stone-400">{hint}</div>}
    </div>
  );
}

/** Горизонтальный бар-чарт по городам. */
function CityBars({
  rows,
  color,
}: {
  rows: { city: string; value: number }[];
  color: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.city} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-stone-600">{r.city}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-stone-100">
            <div
              className={`h-full rounded ${color}`}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right tabular-nums font-medium text-stone-700">
            {r.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const s = getDashboardStats();

  // Визиты по всем 8 городам (включая нулевые) — полная картина.
  const cityByName = new Map(s.byCity.map((c) => [c.city, c]));
  const cityRows = CITIES.map((city) => ({
    city,
    planned: cityByName.get(city)?.planned ?? 0,
    passed: cityByName.get(city)?.passed ?? 0,
    confirmed: cityByName.get(city)?.confirmed ?? 0,
  })).sort((a, b) => b.planned - a.planned || b.confirmed - a.confirmed);

  const plannedRows = cityRows.map((r) => ({ city: r.city, value: r.planned }));
  const realRows = CITIES.map((city) => ({
    city,
    value: cityByName.get(city)?.confirmed ?? 0,
  })).sort((a, b) => b.value - a.value || a.city.localeCompare(b.city));
  const passedTotal = cityRows.reduce((sum, r) => sum + r.passed, 0);

  const presenceByCity = new Map(s.presenceByCity.map((p) => [p.city, p.teams]));

  // Воронка коллабораций
  const funnel = [
    { label: "Предложено", n: s.proposalsTotal, color: "bg-indigo-500" },
    { label: "Согласовано", n: s.proposalsAccepted, color: "bg-emerald-500" },
    { label: "Ожидает", n: s.proposalsPending, color: "bg-amber-500" },
    { label: "Отклонено", n: s.proposalsDeclined, color: "bg-stone-400" },
  ];
  const funnelMax = Math.max(1, s.proposalsTotal);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Дашборд</h1>
        <p className="mt-1 text-sm text-stone-500">
          Общая статистика сервиса «{SERVICE_NAME}». Данные обезличены — без названий,
          номеров и контактов команд.
        </p>
      </header>

      {/* Ключевые цифры */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard value={s.teams} label="Команд зарегистрировано" accent="text-indigo-600" />
        <StatCard
          value={s.plans}
          label="Заявлено визитов"
          hint={`в ${s.citiesCovered} из ${CITIES.length} городов`}
        />
        <StatCard
          value={s.matchPairs}
          label="Пересечений команд"
          hint="совпали по городу и дате"
          accent="text-sky-600"
        />
        <StatCard
          value={s.proposalsAccepted}
          label="Коллабораций согласовано"
          hint={`из ${s.proposalsTotal} предложенных`}
          accent="text-emerald-600"
        />
      </div>

      {/* Визиты по городам: планы vs реальность */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Запланированные визиты */}
        <section className={card}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-stone-900">Запланированные визиты</h2>
            <span className="text-xs text-stone-400">
              всего: <b className="text-indigo-600">{s.plans}</b>
            </span>
          </div>
          <p className="mb-4 text-xs text-stone-400">
            Заявки команд по городам{passedTotal > 0 ? ` · из них прошло ${passedTotal}` : ""}.
          </p>
          {s.plans === 0 ? (
            <p className="text-sm text-stone-400">Пока нет заявок.</p>
          ) : (
            <CityBars rows={plannedRows} color="bg-indigo-500" />
          )}
        </section>

        {/* Реальные визиты по «Я здесь» */}
        <section className={card}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-stone-900">Реальные визиты</h2>
            <span className="text-xs text-stone-400">
              всего: <b className="text-emerald-600">{s.confirmedVisits}</b>
            </span>
          </div>
          <p className="mb-4 text-xs text-stone-400">
            По кнопке «Я здесь» — засчитаны сессии дольше часа.
          </p>
          {s.confirmedVisits === 0 ? (
            <p className="text-sm text-stone-400">Пока нет подтверждённых визитов.</p>
          ) : (
            <CityBars rows={realRows} color="bg-emerald-500" />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Коллаборации */}
        <section className={card}>
          <h2 className="mb-4 text-base font-semibold text-stone-900">Коллаборации</h2>
          {s.proposalsTotal === 0 ? (
            <p className="text-sm text-stone-400">
              Предложений пока не было. Они появляются, когда команды договариваются о встрече.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {funnel.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-stone-600">{f.label}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-stone-100">
                    <div
                      className={`h-full rounded ${f.color}`}
                      style={{ width: `${(f.n / funnelMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right tabular-nums font-medium text-stone-700">
                    {f.n}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Кто здесь сейчас */}
        <section className={card}>
          <h2 className="mb-1 text-base font-semibold text-stone-900">Кто здесь сейчас</h2>
          <p className="mb-4 text-sm text-stone-500">
            Команд отмечено в городах прямо сейчас: <b>{s.presenceActive}</b>
          </p>
          {s.presenceActive === 0 ? (
            <p className="text-sm text-stone-400">Сейчас никто не отмечен.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {CITIES.filter((c) => (presenceByCity.get(c) ?? 0) > 0).map((c) => (
                <li
                  key={c}
                  className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-1.5 text-sm"
                >
                  <span className="text-stone-600">{c}</span>
                  <span className="tabular-nums font-medium text-emerald-600">
                    {presenceByCity.get(c)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Вовлечённость */}
      <section className={card}>
        <h2 className="mb-4 text-base font-semibold text-stone-900">Вовлечённость</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            value={s.teams > 0 ? `${Math.round((s.teamsWithPlans / s.teams) * 100)}%` : "—"}
            label="Команд с планами"
            hint={`${s.teamsWithPlans} из ${s.teams}`}
          />
          <StatCard value={s.daysCovered} label="Дней с визитами" />
          <StatCard
            value={s.teams > 0 ? (s.plans / s.teams).toFixed(1) : "0"}
            label="Визитов на команду"
          />
          <StatCard value={s.proposalsPending} label="Предложений ждут ответа" />
        </div>
      </section>
    </div>
  );
}
