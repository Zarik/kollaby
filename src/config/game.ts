/**
 * Конфигурация игры «Главный ход» — единственный источник правды
 * по бренду, городам, сезону и временам суток.
 * Меняется здесь, без правок остального кода.
 */

export const GAME_NAME = "Главный ход";
export const SERVICE_NAME = "Коллабы";

export interface CityInfo {
  /** Отображаемое имя локации. */
  name: string;
  /**
   * true — локация открыта для новых операций (заявки, отметки «Я здесь»,
   * предложения коллабораций). false — закрыта: остаётся только для просмотра
   * истории (календарь, дашборд), везде показывается серым.
   */
  active: boolean;
}

/**
 * Все локации игры (по алфавиту). Единственный источник правды.
 * Летний сезон по 8 городам завершён — активна только финальная точка.
 */
export const CITIES = [
  { name: "Веребье", active: false },
  { name: "Высоковск", active: false },
  { name: "Заветное", active: false },
  { name: "Кава", active: false },
  { name: "Короцко", active: false },
  { name: "Москва: «Депо. Три вокзала»", active: true },
  { name: "Мстинский мост", active: false },
  { name: "Оксочи", active: false },
  { name: "Санкт-Петербург: место в разработке", active: true },
  { name: "Травково", active: false },
] as const satisfies readonly CityInfo[];

export type City = (typeof CITIES)[number]["name"];

/** Имена всех локаций — для мест, где нужен просто перечень. */
export const CITY_NAMES = CITIES.map((c) => c.name) as readonly City[];

/** Имена активных локаций (открытых для новых операций). */
export const ACTIVE_CITY_NAMES = CITIES.filter((c) => c.active).map(
  (c) => c.name,
) as readonly City[];

export function isCity(value: unknown): value is City {
  return typeof value === "string" && CITIES.some((c) => c.name === value);
}

/** Известная локация, открытая для новых операций. */
export function isActiveCity(value: unknown): value is City {
  return (
    typeof value === "string" && CITIES.some((c) => c.name === value && c.active)
  );
}

/** Открыта ли локация с таким именем (неизвестная — считается закрытой). */
export function cityActive(name: string): boolean {
  return CITIES.some((c) => c.name === name && c.active);
}

/** Сезон игры (включительно), ISO yyyy-mm-dd. */
export const SEASON = {
  start: "2026-06-10",
  end: "2026-09-30",
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
