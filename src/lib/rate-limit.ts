import { LRUCache } from "lru-cache";

/** Лимит попыток входа по IP. Паттерн family.zarik.ru. */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// 5 попыток за 10 минут с одного IP
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

const cache = new LRUCache<string, RateLimitEntry>({
  max: 500,
  ttl: WINDOW_MS,
});

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = cache.get(ip);

  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + WINDOW_MS };
    cache.set(ip, newEntry);
    return { allowed: true, remaining: LIMIT - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  cache.set(ip, entry);
  return { allowed: true, remaining: LIMIT - entry.count, resetAt: entry.resetAt };
}

/** Достаёт IP клиента из заголовков запроса. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
