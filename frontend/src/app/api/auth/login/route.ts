import { NextRequest, NextResponse } from "next/server";
import {
  UserLoginSchema,
  userRepository,
  CryptoService,
  setAuthCookieOnResponse,
  checkRateLimit,
  getClientIp,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  // Rate limiting anti-força bruta: máx 5 tentativas por minuto por IP
  const ip = getClientIp(request);
  const { allowed, retryAfter } = checkRateLimit(`login:${ip}`, 5, 60);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "Muitas tentativas de login incorretas. Aguarde um minuto.",
        retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição JSON inválido ou vazio." },
      { status: 400 }
    );
  }

  try {
    const validated = UserLoginSchema.parse(body);

    const user = await userRepository.verifyCredentials(
      validated.email,
      validated.password
    );

    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const token = await CryptoService.generateAuthToken(
      user.id,
      user.role,
      user.tier
    );

    const response = NextResponse.json({
      message: "Login efetuado com sucesso!",
      user,
    });

    return setAuthCookieOnResponse(response, token);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Formato de e-mail ou senha inválido.", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
