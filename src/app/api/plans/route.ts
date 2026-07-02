import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { createPlan, getPlansByTeam } from "@/lib/repo";
import { isCity, isPartOfDay, SEASON } from "@/config/game";
import { isTransport } from "@/lib/transport";
import { todayISO } from "@/lib/time";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Нижняя граница заявки: позднейшая из начала сезона и сегодня (прошлое нельзя). */
function minVisitDate(): string {
  const today = todayISO();
  return today > SEASON.start ? today : SEASON.start;
}

function isValidVisitDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  // реальная дата (не 2026-02-31) + в пределах сезона, не в прошлом
  const d = new Date(date + "T00:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
    return false;
  }
  return date >= minVisitDate() && date <= SEASON.end;
}

export async function GET(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ plans: getPlansByTeam(auth.teamId) });
}

export async function POST(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const city = String(body.city ?? "");
  const visitDate = String(body.visitDate ?? "");
  const partOfDay = String(body.partOfDay ?? "");
  const note = body.note != null ? String(body.note).trim() || null : null;
  // Транспорт (опционально): 'foot' | 'car'.
  // car_seats — свободные места (car); foot_people — сколько человек (foot).
  const transport = isTransport(body.transport) ? body.transport : null;
  let carSeats: number | null = null;
  if (transport === "car" && body.carSeats != null && body.carSeats !== "") {
    const n = Number(body.carSeats);
    if (!Number.isInteger(n) || n < 0 || n > 20) {
      return NextResponse.json(
        { error: "Свободных мест — целое число от 0 до 20" },
        { status: 400 },
      );
    }
    carSeats = n;
  }
  let footPeople: number | null = null;
  if (transport === "foot" && body.footPeople != null && body.footPeople !== "") {
    const n = Number(body.footPeople);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      return NextResponse.json(
        { error: "Человек — целое число от 1 до 20" },
        { status: 400 },
      );
    }
    footPeople = n;
  }

  if (!isCity(city)) return NextResponse.json({ error: "Неизвестный город" }, { status: 400 });
  if (!isValidVisitDate(visitDate))
    return NextResponse.json(
      { error: `Выберите дату в пределах ${minVisitDate()} — ${SEASON.end} (прошедшие даты недоступны)` },
      { status: 400 },
    );
  if (!isPartOfDay(partOfDay))
    return NextResponse.json({ error: "Укажите время суток" }, { status: 400 });

  const plan = createPlan({ teamId: auth.teamId, city, visitDate, partOfDay, note, transport, carSeats, footPeople });
  return NextResponse.json({ plan }, { status: 201 });
}
