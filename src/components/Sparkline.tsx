"use client";

import { useState } from "react";
import { formatVisitDate } from "@/lib/date";

/**
 * Мини-график по сезону (SVG, заливка тянется по ширине через
 * preserveAspectRatio="none"). markerIndex — красная точка «сегодня».
 * При наведении показывает значение и дату в тултипе у курсора.
 */
export default function Sparkline({
  values,
  dates,
  lineClass,
  areaClass,
  accentClass,
  markerIndex,
}: {
  values: number[];
  dates: string[];
  lineClass: string;
  areaClass?: string;
  /** Класс фона точки/тултипа при наведении, напр. "bg-indigo-500". */
  accentClass: string;
  markerIndex?: number;
}) {
  const w = 600;
  const h = 60;
  const n = values.length;
  const max = Math.max(1, ...values);

  // Геометрия точки i в процентах ширины/высоты контейнера.
  const leftPct = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * 100);
  const topPct = (i: number) => ((h - 3 - (values[i] / max) * (h - 6)) / h) * 100;

  const pts = values.map((v, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * w;
    const y = h - 3 - (v / max) * (h - 6);
    return [x, y] as const;
  });
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  const hasMarker = markerIndex != null && markerIndex >= 0 && n > 1;

  const [hover, setHover] = useState<number | null>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (n <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const i = Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
    setHover(i);
  }

  return (
    <div
      className="relative"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
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
            style={{ left: `${leftPct(markerIndex)}%` }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 ring-1 ring-white"
            style={{ left: `${leftPct(markerIndex)}%`, top: `${topPct(markerIndex)}%` }}
            title="Сегодня"
          />
        </>
      )}

      {hover != null && (
        <>
          {/* вертикальная направляющая */}
          <span
            className="pointer-events-none absolute top-0 bottom-0 w-px -translate-x-1/2 bg-stone-300"
            style={{ left: `${leftPct(hover)}%` }}
            aria-hidden
          />
          {/* точка под курсором */}
          <span
            className={`pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white ${accentClass}`}
            style={{ left: `${leftPct(hover)}%`, top: `${topPct(hover)}%` }}
            aria-hidden
          />
          {/* тултип со значением и датой */}
          <span
            className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium text-white shadow ${accentClass}`}
            style={{ left: `${leftPct(hover)}%`, top: `calc(${topPct(hover)}% - 6px)` }}
          >
            {values[hover]} · {formatVisitDate(dates[hover])}
          </span>
        </>
      )}
    </div>
  );
}
