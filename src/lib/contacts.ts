/** Нормализация опциональных контактов: Telegram и MAX. */

/**
 * Telegram → username без @.
 * Принимает «@account», «account», «https://t.me/account» — возвращает «account».
 */
export function normalizeTelegram(raw: unknown): string | null {
  let s = String(raw ?? "").trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "");
  s = s.replace(/^@/, "");
  s = s.replace(/\/+$/, "").trim();
  return s || null;
}

/**
 * MAX → полная ссылка. Принимает полный URL или «max.ru/u/...» (допишет https://).
 */
export function normalizeMax(raw: unknown): string | null {
  let s = String(raw ?? "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  return s;
}
