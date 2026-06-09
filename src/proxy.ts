import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME, buildClearCookie } from "@/lib/auth";

/**
 * Proxy = middleware в Next.js 16. Защищает все маршруты, кроме `/`
 * (вход/регистрация) и `/api/auth/*`. Неавторизованных шлёт на `/`.
 */

export const config = {
  matcher: [
    // защищаем страницы; исключаем статику, favicon, файлы и весь /api
    // (API-роуты сами проверяют авторизацию и возвращают 401 JSON)
    "/((?!_next/static|_next/image|favicon\\.ico|api|.*\\.[a-z0-9]+$).*)",
  ],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  // Страница входа доступна без авторизации; авторизованных — сразу в сервис
  if (pathname === "/") {
    if (token && (await verifyToken(token))) {
      return NextResponse.redirect(new URL("/plan", request.url));
    }
    return NextResponse.next();
  }

  // Остальные маршруты — требуют авторизации
  if (!token) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Set-Cookie", buildClearCookie());
    return response;
  }

  return NextResponse.next();
}
