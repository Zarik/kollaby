/** Утилиты времени. Храним всё как ISO-строки (UTC) — лексикографическое сравнение корректно. */

export function nowISO(): string {
  return new Date().toISOString();
}

/** Сегодняшняя дата (локальная для сервера) в формате yyyy-mm-dd. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Конец текущего дня (локального для сервера) в ISO.
 * Используется как срок жизни статуса «Я здесь» — до конца дня.
 */
export function endOfDayISO(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
