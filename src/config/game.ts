/**
 * Конфигурация игры «Главный ход» — единственный источник правды
 * по бренду, городам, сезону и временам суток.
 * Меняется здесь, без правок остального кода.
 */

export const GAME_NAME = "Главный ход";
export const SERVICE_NAME = "Коллабы";

/** 8 городов игры (по алфавиту). */
export const CITIES = [
  "Веребье",
  "Высоковск",
  "Заветное",
  "Кава",
  "Короцко",
  "Мстинский мост",
  "Оксочи",
  "Травково",
] as const;

export type City = (typeof CITIES)[number];

export function isCity(value: unknown): value is City {
  return typeof value === "string" && (CITIES as readonly string[]).includes(value);
}

/** Сезон игры (включительно), ISO yyyy-mm-dd. */
export const SEASON = {
  start: "2026-06-10",
  end: "2026-08-28",
} as const;

/** Время суток для заявок. */
export const PARTS_OF_DAY = [
  { id: "morning", label: "Утро" },
  { id: "day", label: "День" },
  { id: "evening", label: "Вечер" },
] as const;

export type PartOfDay = (typeof PARTS_OF_DAY)[number]["id"];

export function isPartOfDay(value: unknown): value is PartOfDay {
  return (
    typeof value === "string" &&
    PARTS_OF_DAY.some((p) => p.id === value)
  );
}

export function partOfDayLabel(id: PartOfDay): string {
  return PARTS_OF_DAY.find((p) => p.id === id)?.label ?? id;
}

/**
 * Фото команды с сайта «Бегущего города» (railway2026), размер med (500×225).
 * Пример: .../photo-railway2026-teams-101-med.jpg
 */
export function teamPhotoUrl(number: string): string {
  const safe = encodeURIComponent(number);
  return `https://img.runcity.org/content/rst/team_start/railway2026/photo-railway2026-teams-${safe}-med.jpg`;
}

/**
 * Полноразмерное фото команды с сайта «Бегущего города».
 * Пример: .../101.jpg
 */
export function teamPhotoFullUrl(number: string): string {
  const safe = encodeURIComponent(number);
  return `https://img.runcity.org/content/rst/team_start/railway2026/${safe}.jpg`;
}
