import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { getActivePresence } from "@/lib/repo";
import { CITIES } from "@/config/game";

/** Доска «Кто здесь сейчас»: активное присутствие, сгруппированное по городам. */
export async function GET(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  const rows = getActivePresence();

  const byCity = new Map<
    string,
    Array<{
      teamId: number;
      number: string;
      name: string;
      email: string | null;
      phone: string | null;
      telegram: string | null;
      maxLink: string | null;
      contactsShared: boolean;
      isMine: boolean;
      checkedInAt: string;
    }>
  >();
  for (const c of CITIES) byCity.set(c.name, []);

  for (const r of rows) {
    const shared = r.contacts_consent === 1;
    byCity.get(r.city)?.push({
      teamId: r.team_id,
      number: r.number,
      name: r.name,
      email: shared ? r.email : null,
      phone: shared ? r.phone : null,
      telegram: shared ? r.telegram : null,
      maxLink: shared ? r.max_link : null,
      contactsShared: shared,
      isMine: r.team_id === auth.teamId,
      checkedInAt: r.checked_in_at,
    });
  }

  const cities = CITIES.map((c) => ({
    city: c.name,
    active: c.active,
    teams: byCity.get(c.name) ?? [],
  }));
  return NextResponse.json({ cities });
}
