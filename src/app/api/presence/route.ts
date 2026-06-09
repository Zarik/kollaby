import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { checkIn, checkOut, getMyPresence } from "@/lib/repo";
import { isCity } from "@/config/game";
import { endOfDayISO } from "@/lib/time";

export async function GET(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;
  const presence = getMyPresence(auth.teamId) ?? null;
  return NextResponse.json({ presence });
}

/** «Я здесь»: отметить присутствие в городе (живёт до конца дня). */
export async function POST(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  let body: { city?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const city = String(body.city ?? "");
  if (!isCity(city)) {
    return NextResponse.json({ error: "Неизвестный город" }, { status: 400 });
  }

  checkIn(auth.teamId, city, endOfDayISO());
  return NextResponse.json({ ok: true, presence: { city, expiresAt: endOfDayISO() } });
}

/** «Мы уехали»: снять присутствие. */
export async function DELETE(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;
  checkOut(auth.teamId);
  return NextResponse.json({ ok: true });
}
