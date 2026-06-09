import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

/** JWT-авторизация команды через HttpOnly-cookie. Паттерн family.zarik.ru. */

const COOKIE_NAME = "kollaby_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

export interface AuthPayload extends JWTPayload {
  sub: string; // teamId (строкой)
  number: string; // номер команды
  name: string; // название команды
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET не задан в .env");
  return new TextEncoder().encode(secret);
}

export async function signToken(
  payload: Omit<AuthPayload, "iat" | "exp">,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value ?? null;
}

/** Полезная нагрузка из запроса (для route handlers). */
export async function getAuthPayload(
  request: NextRequest,
): Promise<AuthPayload | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

/** Полезная нагрузка из cookie (для серверных компонентов). */
export async function getServerAuthPayload(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function buildAuthCookie(token: string, secure: boolean): string {
  const flags = [
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  return `${COOKIE_NAME}=${token}; ${flags}`;
}

export function buildClearCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
