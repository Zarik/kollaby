import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { getAgenda } from "@/lib/repo";
import { todayISO } from "@/lib/time";

/** Заявки по датам (сегодня и будущее) — для вида «Календарь по датам». */
export async function GET(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  const entries = getAgenda(todayISO()).map((r) => ({
    date: r.visit_date,
    city: r.city,
    partOfDay: r.part_of_day,
    transport: r.transport,
    carSeats: r.car_seats,
    footPeople: r.foot_people,
    team: { id: r.team_id, number: r.number, name: r.name, isMine: r.team_id === auth.teamId },
  }));

  return NextResponse.json({ entries });
}
