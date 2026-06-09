import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken, buildAuthCookie } from "@/lib/auth";
import { getTeamByNumber } from "@/lib/repo";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`login:${clientIp(request)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте через несколько минут." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  let body: { number?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const number = String(body.number ?? "").trim();
  const password = String(body.password ?? "");
  if (!number || !password) {
    return NextResponse.json({ error: "Укажите номер команды и пароль" }, { status: 400 });
  }

  const team = getTeamByNumber(number);
  const ok = team ? await bcrypt.compare(password, team.password_hash) : false;
  if (!team || !ok) {
    return NextResponse.json({ error: "Неверный номер команды или пароль" }, { status: 401 });
  }

  const token = await signToken({ sub: String(team.id), number: team.number, name: team.name });
  const isSecure = request.nextUrl.protocol === "https:";
  const response = NextResponse.json({ ok: true, teamId: team.id });
  response.headers.set("Set-Cookie", buildAuthCookie(token, isSecure));
  return response;
}
