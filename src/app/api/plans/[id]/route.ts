import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { deletePlan } from "@/lib/repo";

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

  const removed = deletePlan(planId, auth.teamId);
  if (!removed) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
