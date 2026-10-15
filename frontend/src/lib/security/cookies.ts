import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "bilingual_auth_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

/**
 * Utilitários para gestão de sessão segura via Cookies HTTP-Only.
 * GARANTIA ARQUITETURAL: Zero dados sensíveis ou tokens em localStorage do navegador.
 */

export function setAuthCookieOnResponse(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true, // Inacessível por JavaScript no cliente (anti-XSS)
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Prevenção contra CSRF
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}

export function clearAuthCookieOnResponse(response: NextResponse): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

export async function getAuthTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(AUTH_COOKIE_NAME);
  return cookie?.value || null;
}
