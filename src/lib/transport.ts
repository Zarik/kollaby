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

/** Подпись для списков: «пешком» / «на авто, 3 места» / «на авто». */
export function transportLabel(
  t: string | null | undefined,
  seats: number | null | undefined,
): string {
  if (t === "foot") return "пешком";
  if (t === "car") {
    if (seats != null && seats > 0) {
      return `на авто, ${seats} ${pluralSeats(seats)}`;
    }
    return "на авто";
  }
  return "";
}

function pluralSeats(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "свободное место";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "свободных места";
  return "свободных мест";
}
