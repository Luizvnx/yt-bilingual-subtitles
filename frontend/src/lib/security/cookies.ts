import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "bilingual_auth_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

/**
 * Determina dinamicamente se o cookie deve ter a flag Secure.
 * Em conexões HTTP sem SSL (ex: http://IP:PORTA da VPS ou localhost), a flag Secure
 * faz os navegadores modernos (Chrome, Firefox, Safari) REJEITAREM o cookie ou se
 * recusarem a enviá-lo nas requisições, quebrando a sessão do usuário.
 * Em conexões HTTPS ou quando NEXT_PUBLIC_BASE_URL começa com https://, ativa Secure automaticamente.
 */
export function shouldSetSecureCookie(req?: NextRequest): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;

  if (req) {
    const proto = req.headers.get("x-forwarded-proto") || req.nextUrl?.protocol;
    if (proto === "https" || proto === "https:") return true;
    if (proto === "http" || proto === "http:") return false;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";
  if (baseUrl.startsWith("https://")) return true;

  // Por padrão em ambientes acessados via HTTP direto (ex: localhost:3000)
  return false;
}

export function setAuthCookieOnResponse(
  response: NextResponse,
  token: string,
  req?: NextRequest
): NextResponse {
  const isSecure = shouldSetSecureCookie(req);

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true, // Inacessível por JavaScript no cliente (anti-XSS)
    secure: isSecure,
    sameSite: "lax", // Prevenção contra CSRF
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}

export function clearAuthCookieOnResponse(
  response: NextResponse,
  req?: NextRequest
): NextResponse {
  const isSecure = shouldSetSecureCookie(req);

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

export async function getAuthTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(AUTH_COOKIE_NAME);
    return cookie?.value || null;
  } catch {
    return null;
  }
}

/**
 * Extração de token multi-canal altamente resiliente:
 * 1. Header `Authorization: Bearer <token>`
 * 2. Parâmetro de URL `?token=<token>` (essencial para EventSource / SSE)
 * 3. Cookie HTTP-Only `bilingual_auth_session`
 */
export async function getAuthTokenFromRequest(
  request?: NextRequest
): Promise<string | null> {
  if (request) {
    // 1. Header Authorization
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) return token;
    }

    // 2. Query param ?token=
    const queryToken = request.nextUrl?.searchParams?.get("token");
    if (queryToken && queryToken.trim()) return queryToken.trim();
  }

  // 3. Cookie HTTP-Only
  return await getAuthTokenFromCookies();
}
