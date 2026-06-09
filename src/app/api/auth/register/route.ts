import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken, buildAuthCookie } from "@/lib/auth";
import { createTeam, getTeamByNumber } from "@/lib/repo";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { normalizeTelegram, normalizeMax } from "@/lib/contacts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`reg:${clientIp(request)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте через несколько минут." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const number = String(body.number ?? "").trim();
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const telegram = normalizeTelegram(body.telegram);
  const maxLink = normalizeMax(body.maxLink);
  const consent = body.consent === true;
  const rules = body.rules === true;

  if (!number) return NextResponse.json({ error: "Укажите номер команды" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Укажите название команды" }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "Пароль не короче 6 символов" }, { status: 400 });
  if (!EMAIL_RE.test(email))
    return NextResponse.json({ error: "Укажите корректный email" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Укажите телефон" }, { status: 400 });
  if (!rules)
    return NextResponse.json({ error: "Подтвердите ознакомление с правилами" }, { status: 400 });
  if (!consent)
    return NextResponse.json(
      { error: "Нужно согласие на показ контактов другим командам" },
      { status: 400 },
    );

  if (getTeamByNumber(number)) {
    return NextResponse.json(
      { error: `Команда с номером ${number} уже зарегистрирована` },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const team = createTeam({
    number,
    name,
    passwordHash,
    email,
    phone,
    telegram,
    maxLink,
    consent,
  });

  const token = await signToken({ sub: String(team.id), number: team.number, name: team.name });
  const isSecure = request.nextUrl.protocol === "https:";
  const response = NextResponse.json({ ok: true, teamId: team.id });
  response.headers.set("Set-Cookie", buildAuthCookie(token, isSecure));
  return response;
}
