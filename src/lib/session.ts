import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload, type AuthPayload } from "./auth";

/** Результат проверки авторизации в API-роуте. */
export type RequireTeamResult =
  | { ok: true; teamId: number; payload: AuthPayload }
  | { ok: false; response: NextResponse };

/** Требует авторизованную команду; иначе отдаёт готовый 401-ответ. */
export async function requireTeam(
  request: NextRequest,
): Promise<RequireTeamResult> {
  const payload = await getAuthPayload(request);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Не авторизовано" }, { status: 401 }),
    };
  }
  return { ok: true, teamId: Number(payload.sub), payload };
}
