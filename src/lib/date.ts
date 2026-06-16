import { format } from "date-fns";
import { ru } from "date-fns/locale";

/**
 * ISO-дата `yyyy-mm-dd` → «13 июля» (день + месяц в родительном падеже, без года).
 * Год опускаем — сезон игры укладывается в одно лето, неоднозначности нет.
 */
export function formatVisitDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return format(new Date(y, m - 1, d), "d MMMM", { locale: ru });
}

/** Заголовок месяца для календаря: «Июнь 2026» (на русском). */
export function formatMonthTitle(date: Date): string {
  return format(date, "LLLL yyyy", { locale: ru });
}

/** Дата с днём недели для ленты: «вт, 10 июня». */
export function formatAgendaDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return format(new Date(y, m - 1, d), "EEEEEE, d MMMM", { locale: ru });
}
