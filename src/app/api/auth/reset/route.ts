import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { signToken, buildAuthCookie } from "@/lib/auth";
import {
  getTeamByResetTokenHash,
  updateTeamPassword,
  clearResetToken,
} from "@/lib/repo";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

/** Установка нового пароля по одноразовому токену из письма. Сразу логинит. */
export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`reset:${clientIp(request)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте через несколько минут." },
      { status: 429 },
    );
  }

  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (!token) {
    return NextResponse.json({ error: "Отсутствует токен сброса" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Пароль не короче 6 символов" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const team = getTeamByResetTokenHash(tokenHash);
  if (!team) {
    return NextResponse.json(
      { error: "Ссылка недействительна или устарела. Запросите сброс ещё раз." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  updateTeamPassword(team.id, passwordHash);
  clearResetToken(team.id);

  // Сразу логиним — пользователь попадает в сервис с новым паролем.
  const jwt = await signToken({ sub: String(team.id), number: team.number, name: team.name });
  const isSecure = request.nextUrl.protocol === "https:";
  const response = NextResponse.json({ ok: true, teamId: team.id });
  response.headers.set("Set-Cookie", buildAuthCookie(jwt, isSecure));
  return response;
}
