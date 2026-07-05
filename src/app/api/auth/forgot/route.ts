import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getTeamByNumber, setResetToken } from "@/lib/repo";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/mail";

/**
 * Запрос сброса пароля: по номеру команды шлём на её email одноразовую
 * ссылку (токен живёт 1 час). Ответ всегда одинаковый — не раскрываем,
 * существует ли команда с таким номером.
 */
export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`forgot:${clientIp(request)}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте через несколько минут." },
      { status: 429 },
    );
  }

  let body: { number?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const number = String(body.number ?? "").trim();
  if (!number) {
    return NextResponse.json({ error: "Укажите номер команды" }, { status: 400 });
  }

  const team = getTeamByNumber(number);
  if (team) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 час
    setResetToken(team.id, tokenHash, expiresAt);

    const base = process.env.APP_URL ?? request.nextUrl.origin;
    const resetUrl = `${base}/reset?token=${token}`;

    // Не валим запрос при сбое SMTP — ответ всё равно одинаковый.
    try {
      await sendPasswordResetEmail({
        toEmail: team.email,
        number: team.number,
        name: team.name,
        resetUrl,
      });
    } catch (err) {
      console.error("[forgot] не удалось отправить письмо сброса:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    message:
      "Если команда с таким номером зарегистрирована — на её email отправлена ссылка для сброса пароля.",
  });
}
