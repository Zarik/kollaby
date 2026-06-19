import { eachDayOfInterval, format } from "date-fns";
import { getDashboardStats } from "@/lib/repo";
import { CITIES, SEASON, SERVICE_NAME } from "@/config/game";
import { formatVisitDate } from "@/lib/date";

// Подписи краёв сезона для осей графиков — из конфига, без хардкода.
const SEASON_START_LABEL = formatVisitDate(SEASON.start);
const SEASON_END_LABEL = formatVisitDate(SEASON.end);

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

/** Бар-чарт с двумя сегментами: прошло (по дате) + впереди. */
function PlannedBars({
  rows,
}: {
  rows: { city: string; passed: number; upcoming: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.passed + r.upcoming));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.city} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-stone-600">{r.city}</span>
          <div className="flex h-5 flex-1 overflow-hidden rounded bg-stone-100">
            <div
              className="h-full bg-stone-400"
              style={{ width: `${(r.passed / max) * 100}%` }}
            />
            <div
              className="h-full bg-indigo-500"
              style={{ width: `${(r.upcoming / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right tabular-nums font-medium text-stone-700">
            {r.passed + r.upcoming}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Мини-график по сезону (SVG). area — заливка; markerIndex — точка «сегодня». */
function Sparkline({
  values,
  lineClass,
  areaClass,
  markerIndex,
}: {
  values: number[];
  lineClass: string;
  areaClass?: string;
  markerIndex?: number;
}) {
  const w = 600;
  const h = 60;
  const n = values.length;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * w;
    const y = h - 3 - (v / max) * (h - 6);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  const hasMarker = markerIndex != null && markerIndex >= 0 && n > 1;
  const markerLeft = hasMarker ? (markerIndex / (n - 1)) * 100 : 0;
  const markerTop = hasMarker
    ? ((h - 3 - (values[markerIndex] / max) * (h - 6)) / h) * 100
    : 0;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-16 w-full">
        {areaClass && <path d={area} className={areaClass} />}
        <path
          d={line}
          fill="none"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          className={lineClass}
        />
      </svg>
      {hasMarker && (
        <>
          <span
            className="pointer-events-none absolute top-0 bottom-0 w-px -translate-x-1/2 bg-red-500/40"
            style={{ left: `${markerLeft}%` }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 ring-1 ring-white"
            style={{ left: `${markerLeft}%`, top: `${markerTop}%` }}
            title="Сегодня"
          />
        </>
      )}
    </div>
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

  const plannedRows = cityRows.map((r) => ({
    city: r.city,
    passed: r.passed,
    upcoming: Math.max(0, r.planned - r.passed),
  }));
  const realRows = CITIES.map((city) => ({
    city,
    value: cityByName.get(city)?.confirmed ?? 0,
  })).sort((a, b) => b.value - a.value || a.city.localeCompare(b.city));
  const passedTotal = cityRows.reduce((sum, r) => sum + r.passed, 0);

  const presenceByCity = new Map(s.presenceByCity.map((p) => [p.city, p.teams]));

  // Динамика по сезону: заявки по датам + накопительные регистрации.
  const seasonDays = eachDayOfInterval({
    start: new Date(SEASON.start + "T00:00:00"),
    end: new Date(SEASON.end + "T00:00:00"),
  }).map((d) => format(d, "yyyy-MM-dd"));
  const t = new Date();
  const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
    t.getDate(),
  ).padStart(2, "0")}`;
  const todayIndex = seasonDays.indexOf(todayStr);

  const visitsMap = new Map(s.visitsByDate.map((r) => [r.date, r.n]));
  const realMap = new Map(s.realByDate.map((r) => [r.date, r.n]));
  const visitsSeries: number[] = [];
  const realSeries: number[] = [];
  for (const d of seasonDays) {
    visitsSeries.push(visitsMap.get(d) ?? 0);
    realSeries.push(realMap.get(d) ?? 0);
  }

  // Воронка вовлечения
  const reach = [
    { label: "Заявили план", n: s.funnel.planned, color: "bg-indigo-500" },
    { label: "Есть пересечение", n: s.funnel.matched, color: "bg-sky-500" },
    { label: "Дошли до предложения", n: s.funnel.proposed, color: "bg-amber-500" },
    { label: "Состоялась коллаборация", n: s.funnel.collaborated, color: "bg-emerald-500" },
  ];
  const reachMax = Math.max(1, s.funnel.planned);

  // План vs факт
  const pvfPct = s.passedPlans > 0 ? Math.round((s.confirmedPlans / s.passedPlans) * 100) : 0;

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

      {/* Динамика по сезону */}
      <section className={card}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-stone-900">Динамика по сезону</h2>
          {todayIndex >= 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              сегодня
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-stone-700">Заявки по датам</span>
              <span className="text-xs text-stone-400">всего {s.plans}</span>
            </div>
            <Sparkline
              values={visitsSeries}
              lineClass="stroke-indigo-500"
              areaClass="fill-indigo-500/10"
              markerIndex={todayIndex}
            />
            <div className="mt-1 flex justify-between text-[11px] text-stone-400">
              <span>{SEASON_START_LABEL}</span>
              <span>{SEASON_END_LABEL}</span>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-stone-700">Реальные визиты</span>
              <span className="text-xs text-stone-400">всего {s.confirmedVisits}</span>
            </div>
            <Sparkline
              values={realSeries}
              lineClass="stroke-emerald-500"
              areaClass="fill-emerald-500/10"
              markerIndex={todayIndex}
            />
            <div className="mt-1 flex justify-between text-[11px] text-stone-400">
              <span>{SEASON_START_LABEL}</span>
              <span>{SEASON_END_LABEL}</span>
            </div>
          </div>
        </div>
      </section>

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
            <>
              <PlannedBars rows={plannedRows} />
              <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-stone-400" /> прошло
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-indigo-500" /> впереди
                </span>
              </div>
            </>
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
            По кнопке «Я здесь» — засчитаны сессии дольше 10 минут.
          </p>
          {s.confirmedVisits === 0 ? (
            <p className="text-sm text-stone-400">Пока нет подтверждённых визитов.</p>
          ) : (
            <CityBars rows={realRows} color="bg-emerald-500" />
          )}
        </section>
      </div>

      {/* Путь к коллаборации + План vs факт */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Воронка вовлечения */}
        <section className={card}>
          <h2 className="mb-1 text-base font-semibold text-stone-900">Путь к коллаборации</h2>
          <p className="mb-4 text-xs text-stone-400">
            Сколько команд доходит до каждого шага — видно, где теряем.
          </p>
          <ul className="space-y-2.5">
            {reach.map((r) => (
              <li key={r.label} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 text-stone-600">{r.label}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-stone-100">
                  <div
                    className={`h-full rounded ${r.color}`}
                    style={{ width: `${(r.n / reachMax) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right tabular-nums font-medium text-stone-700">
                  {r.n}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* План vs факт */}
        <section className={card}>
          <h2 className="mb-1 text-base font-semibold text-stone-900">План vs факт</h2>
          <p className="mb-4 text-xs text-stone-400">
            Доля прошедших планов, подтверждённых присутствием «Я здесь» (&gt;10 мин).
          </p>
          {s.passedPlans === 0 ? (
            <p className="text-sm text-stone-400">Прошедших планов пока нет.</p>
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums text-emerald-600">
                  {pvfPct}%
                </span>
                <span className="text-sm text-stone-500">
                  {s.confirmedPlans} из {s.passedPlans} прошедших планов
                </span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${pvfPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-stone-400">
                Остальные заявки не подтверждены присутствием — команда не отметилась или
                пробыла меньше 10 минут.
              </p>
            </div>
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
