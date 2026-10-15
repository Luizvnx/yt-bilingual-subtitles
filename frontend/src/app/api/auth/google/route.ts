import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  userRepository,
  CryptoService,
  setAuthCookieOnResponse,
} from "@/lib/security";

/**
 * GET /api/auth/google
 * Redireciona para o Google Consent Screen oficial ou para o callback em modo teste
 */
export async function GET(request: NextRequest) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.headers.get("origin") ||
    "http://localhost:3000";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // Se as credenciais do Google estiverem configuradas, direciona para a tela oficial de consentimento do Google
  if (clientId && clientId.trim()) {
    const scope = encodeURIComponent("openid email profile");
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId.trim()
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;
    return NextResponse.redirect(googleAuthUrl);
  }

  // Se as credenciais não foram configuradas no .env.local, redireciona avisando claramente
  return NextResponse.redirect(
    `${baseUrl}/?auth_error=google_credentials_missing`
  );
}

/**
 * POST /api/auth/google
 * Autenticação via Google programática (chamada direta pelo modal)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();
    const name = (body.name || "").trim() || "Usuário Google";

    const targetEmail =
      email || `google.user.${crypto.randomBytes(3).toString("hex")}@gmail.com`;

    let user = await userRepository.findByEmail(targetEmail);

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = await userRepository.createUser(
        name,
        targetEmail,
        randomPassword,
        "user",
        "free"
      );
    }

    const token = await CryptoService.generateAuthToken(
      user.id,
      user.role,
      user.tier
    );

    const response = NextResponse.json({
      success: true,
      message: "Autenticação via Google realizada com sucesso!",
      user,
    });

    return setAuthCookieOnResponse(response, token);
  } catch {
    return NextResponse.json(
      { error: "Erro na autenticação com o Google." },
      { status: 500 }
    );
  }
}
