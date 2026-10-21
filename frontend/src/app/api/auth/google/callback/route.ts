import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  userRepository,
  CryptoService,
  setAuthCookieOnResponse,
} from "@/lib/security";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const isMock = searchParams.get("mock") === "true";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||
    "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${baseUrl}/?auth_error=${encodeURIComponent(error)}`);
  }

  try {
    let email = "";
    let name = "";
    let avatar = "";

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // 1. Fluxo Real com Google OAuth2 (quando as credenciais estiverem configuradas no .env)
    if (code && clientId && clientSecret) {
      // Troca o código pelo Token de Acesso
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        throw new Error("Falha ao obter token do Google.");
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Obtém o perfil do usuário pelo Google UserInfo API
      const userRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!userRes.ok) {
        throw new Error("Falha ao obter perfil do Google.");
      }

      const profile = await userRes.json();
      email = (profile.email || "").trim().toLowerCase();
      name = profile.name || profile.given_name || "Usuário Google";
      avatar = profile.picture || "";
    } else if (isMock && process.env.NODE_ENV === "development") {
      email = "usuario.google@gmail.com";
      name = "Estudante Google";
    } else {
      return NextResponse.redirect(`${baseUrl}/?auth_error=Codigo_Google_Invalido`);
    }

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/?auth_error=Email_Google_Nao_Encontrado`);
    }

    // Procura ou cadastra o usuário no repositório
    let user = await userRepository.findByEmail(email);
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = await userRepository.createUser(
        name,
        email,
        randomPassword,
        "user",
        "free",
        avatar
      );
    } else if (avatar && (!user.avatar || user.avatar !== avatar)) {
      const updated = await userRepository.updateProfile(user.id, { avatar, name });
      if (updated) user = updated;
    }

    // Emite token JWT assinado
    const token = await CryptoService.generateAuthToken(
      user.id,
      user.role,
      user.tier
    );

    // Redireciona para a home com Cookie HttpOnly seguro ativado
    const response = NextResponse.redirect(`${baseUrl}/?auth=success`);
    return setAuthCookieOnResponse(response, token, request);
  } catch (err: any) {
    console.error("[Google OAuth Callback Error]:", err);
    return NextResponse.redirect(
      `${baseUrl}/?auth_error=${encodeURIComponent(err?.message || "Erro de login")}`
    );
  }
}
