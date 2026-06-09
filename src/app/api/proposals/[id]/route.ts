import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { setProposalStatus } from "@/lib/repo";

/** Принять / отклонить входящее предложение (только адресат). */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/proposals/[id]">,
) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const proposalId = Number(id);
  if (!Number.isInteger(proposalId)) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const status = body.status;
  if (status !== "accepted" && status !== "declined") {
    return NextResponse.json({ error: "Статус должен быть accepted или declined" }, { status: 400 });
  }

  const changed = setProposalStatus(proposalId, auth.teamId, status);
  if (!changed) {
    return NextResponse.json(
      { error: "Предложение не найдено или уже обработано" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, status });
}
