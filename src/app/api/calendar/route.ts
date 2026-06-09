import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { getCityCalendar } from "@/lib/repo";
import { isCity, SEASON } from "@/config/game";

/** Заявки по городу за период: /api/calendar?city=Кава&from=2026-06-01&to=2026-06-30 */
export async function GET(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const city = searchParams.get("city") ?? "";
  const from = searchParams.get("from") || SEASON.start;
  const to = searchParams.get("to") || SEASON.end;

  if (!isCity(city)) {
    return NextResponse.json({ error: "Неизвестный город" }, { status: 400 });
  }

  const entries = getCityCalendar(city, from, to).map((e) => ({
    planId: e.plan_id,
    visitDate: e.visit_date,
    partOfDay: e.part_of_day,
    team: { id: e.team_id, number: e.number, name: e.name },
    isMine: e.team_id === auth.teamId,
  }));

  return NextResponse.json({ city, from, to, entries });
}
