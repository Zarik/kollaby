import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { deletePlan, getPlanById } from "@/lib/repo";
import { cityActive } from "@/config/game";

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/plans/[id]">,
) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const planId = Number(id);
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const plan = getPlanById(planId);
  if (!plan || plan.team_id !== auth.teamId) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  if (!cityActive(plan.city)) {
    return NextResponse.json(
      { error: "Заявку в закрытом городе изменить нельзя" },
      { status: 403 },
    );
  }

  const removed = deletePlan(planId, auth.teamId);
  if (!removed) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
