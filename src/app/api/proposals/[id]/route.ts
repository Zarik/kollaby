import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import { setProposalStatus, getProposalById, getTeamById } from "@/lib/repo";
import { sendProposalAnswerEmail } from "@/lib/mail";

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

  // Уведомляем инициатора о принятии/отклонении. Не валим запрос при сбое SMTP.
  try {
    const proposal = getProposalById(proposalId);
    const initiator = proposal ? getTeamById(proposal.from_team_id) : undefined;
    const answerer = getTeamById(auth.teamId); // ответившая команда = адресат
    console.info(`[proposals/answer] id=${proposalId} status=${status} proposal=${!!proposal} initiator=${initiator?.email ?? "null"} answerer=${answerer?.number ?? "null"}`);
    if (proposal && initiator && answerer) {
      const shares = answerer.contacts_consent === 1;
      await sendProposalAnswerEmail({
        toEmail: initiator.email,
        toName: initiator.name,
        answerNumber: answerer.number,
        answerName: answerer.name,
        status,
        city: proposal.city,
        visitDate: proposal.visit_date,
        partOfDay: proposal.part_of_day,
        answerEmail: shares ? answerer.email : null,
        answerPhone: shares ? answerer.phone : null,
        answerTelegram: shares ? answerer.telegram : null,
        answerMax: shares ? answerer.max_link : null,
      });
      console.info(`[proposals/answer] письмо отправлено на ${initiator.email}`);
    } else {
      console.warn(`[proposals/answer] письмо НЕ отправлено — proposal=${!!proposal} initiator=${!!initiator} answerer=${!!answerer}`);
    }
  } catch (err) {
    console.error("[proposals/answer] ошибка отправки письма:", err);
  }

  return NextResponse.json({ ok: true, status });
}
