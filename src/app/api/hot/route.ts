import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { getHotSlots, getPlansByTeam } from "@/lib/repo";

export async function GET(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  // Слоты, где уже есть заявка этой команды — пометим «вы здесь».
  const mineKeys = new Set(
    getPlansByTeam(auth.teamId).map((p) => `${p.city}|${p.visit_date}`),
  );

  const hot = getHotSlots(8).map((s) => ({
    city: s.city,
    visitDate: s.visit_date,
    teams: s.teams,
    mine: mineKeys.has(`${s.city}|${s.visit_date}`),
  }));

  return NextResponse.json({ hot });
}
