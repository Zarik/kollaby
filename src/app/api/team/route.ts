import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireTeam } from "@/lib/session";
import { getTeamById, updateTeamProfile, updateTeamPassword } from "@/lib/repo";
import { normalizeTelegram, normalizeMax } from "@/lib/contacts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  const team = getTeamById(auth.teamId);
  if (!team) return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });

  return NextResponse.json({
    team: {
      id: team.id,
      number: team.number,
      name: team.name,
      email: team.email,
      phone: team.phone,
      telegram: team.telegram ?? "",
      maxLink: team.max_link ?? "",
      contactsConsent: team.contacts_consent === 1,
    },
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireTeam(request);
  if (!auth.ok) return auth.response;

  const team = getTeamById(auth.teamId);
  if (!team) return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const telegram = normalizeTelegram(body.telegram);
  const maxLink = normalizeMax(body.maxLink);
  const consent = body.consent === true;

  if (!name) return NextResponse.json({ error: "Укажите название команды" }, { status: 400 });
  if (!EMAIL_RE.test(email))
    return NextResponse.json({ error: "Укажите корректный email" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });

  updateTeamProfile(auth.teamId, { name, email, phone, telegram, maxLink, consent });

  // Опциональная смена пароля
  const newPassword = body.newPassword != null ? String(body.newPassword) : "";
  if (newPassword) {
    const currentPassword = String(body.currentPassword ?? "");
    const ok = await bcrypt.compare(currentPassword, team.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Текущий пароль неверен" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Новый пароль не короче 6 символов" }, { status: 400 });
    }
    updateTeamPassword(auth.teamId, await bcrypt.hash(newPassword, 10));
  }

  return NextResponse.json({ ok: true });
}
