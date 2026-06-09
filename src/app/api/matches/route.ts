import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { getMatchesForTeam } from "@/lib/repo";

export async function GET(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  const matches = getMatchesForTeam(auth.teamId).map((m) => ({
    city: m.city,
    visitDate: m.visit_date,
    myPart: m.my_part,
    otherPart: m.other_part,
    samePartOfDay: m.my_part === m.other_part,
    team: { id: m.other_team_id, number: m.other_number, name: m.other_name },
  }));

  return NextResponse.json({ matches });
}
