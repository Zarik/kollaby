/** Способ передвижения в заявке визита. */

export type Transport = "foot" | "car";

export function isTransport(value: unknown): value is Transport {
  return value === "foot" || value === "car";
}

export function transportEmoji(t: string | null | undefined): string {
  if (t === "car") return "🚗";
  if (t === "foot") return "🚶";
  return "";
}

/**
 * Подпись для списков: «пешком, 4 человека» / «на авто, 3 свободных места».
 * seats — свободные места (для car), people — сколько человек (для foot).
 */
export function transportLabel(
  t: string | null | undefined,
  seats: number | null | undefined,
  people?: number | null,
): string {
  if (t === "foot") {
    if (people != null && people > 0) {
      return `пешком, ${people} ${pluralRu(people, ["человек", "человека", "человек"])}`;
    }
    return "пешком";
  }
  if (t === "car") {
    if (seats != null && seats > 0) {
      return `на авто, ${seats} ${pluralRu(seats, [
        "свободное место",
        "свободных места",
        "свободных мест",
      ])}`;
    }
    return "на авто";
  }
  return "";
}

function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
