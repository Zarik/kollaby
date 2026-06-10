import { NextRequest, NextResponse } from "next/server";
import { requireTeam } from "@/lib/session";
import {
  createProposal,
  findOpenProposal,
  getIncomingProposals,
  getOutgoingProposals,
  getTeamById,
  hasPlan,
  type ProposalView,
} from "@/lib/repo";
import { isCity } from "@/config/game";
import { sendProposalEmail } from "@/lib/mail";
import { todayISO } from "@/lib/time";

/** Сериализация: контакты другой стороны — только при её согласии. */
function serialize(p: ProposalView) {
  const shared = p.contacts_consent === 1;
  return {
    id: p.id,
    city: p.city,
    visitDate: p.visit_date,
    partOfDay: p.part_of_day,
    message: p.message,
    status: p.status,
    createdAt: p.created_at,
    team: {
      id: p.team_id,
      number: p.number,
      name: p.name,
      email: shared ? p.email : null,
      phone: shared ? p.phone : null,
      telegram: shared ? p.telegram : null,
      maxLink: shared ? p.max_link : null,
      contactsShared: shared,
    },
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;
  const today = todayISO();
  // Показываем только сегодня и будущее; прошедшие предложения не показываем.
  return NextResponse.json({
    incoming: getIncomingProposals(auth.teamId)
      .filter((p) => p.visit_date >= today)
      .map(serialize),
    outgoing: getOutgoingProposals(auth.teamId)
      .filter((p) => p.visit_date >= today)
      .map(serialize),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const toTeamId = Number(body.toTeamId);
  const city = String(body.city ?? "");
  const visitDate = String(body.visitDate ?? "");
  const partOfDay = body.partOfDay != null ? String(body.partOfDay) : null;
  const message = body.message != null ? String(body.message).trim() || null : null;

  if (!Number.isInteger(toTeamId) || toTeamId === auth.teamId) {
    return NextResponse.json({ error: "Некорректная команда-адресат" }, { status: 400 });
  }
  if (!isCity(city)) {
    return NextResponse.json({ error: "Неизвестный город" }, { status: 400 });
  }

  const recipient = getTeamById(toTeamId);
  if (!recipient) {
    return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
  }

  // Предлагать можно только при реальном пересечении планов
  if (!hasPlan(auth.teamId, city, visitDate) || !hasPlan(toTeamId, city, visitDate)) {
    return NextResponse.json(
      { error: "Нет совпадения планов по этому городу и дате" },
      { status: 400 },
    );
  }

  if (findOpenProposal(auth.teamId, toTeamId, city, visitDate)) {
    return NextResponse.json(
      { error: "Вы уже предложили коллаборацию на этот слот" },
      { status: 409 },
    );
  }

  const sender = getTeamById(auth.teamId)!;
  const proposal = createProposal({
    fromTeamId: auth.teamId,
    toTeamId,
    city,
    visitDate,
    partOfDay,
    message,
  });

  let emailed = true;
  try {
    const senderShares = sender.contacts_consent === 1;
    await sendProposalEmail({
      toEmail: recipient.email,
      toName: recipient.name,
      fromNumber: sender.number,
      fromName: sender.name,
      fromEmail: senderShares ? sender.email : null,
      fromPhone: senderShares ? sender.phone : null,
      fromTelegram: senderShares ? sender.telegram : null,
      fromMax: senderShares ? sender.max_link : null,
      city,
      visitDate,
      partOfDay,
      message,
    });
  } catch (err) {
    emailed = false;
    console.error("[proposals] не удалось отправить письмо:", err);
  }

  return NextResponse.json({ proposal, emailed }, { status: 201 });
}
