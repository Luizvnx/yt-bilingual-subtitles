import { NextRequest, NextResponse } from "next/server";
import {
  UserRegisterSchema,
  userRepository,
  CryptoService,
  setAuthCookieOnResponse,
  checkRateLimit,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  // Rate limiting: máx 5 cadastros por minuto por IP
  const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
  const { allowed, retryAfter } = checkRateLimit(`register:${ip}`, 5, 60);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "Muitas tentativas de cadastro. Tente novamente mais tarde.",
        retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const validated = UserRegisterSchema.parse(body);

    const user = await userRepository.createUser(
      validated.name,
      validated.email,
      validated.password,
      "user",
      "free"
    );

    const token = await CryptoService.generateAuthToken(
      user.id,
      user.role,
      user.tier
    );

    const response = NextResponse.json(
      {
        message: "Conta criada com sucesso!",
        user,
      },
      { status: 201 }
    );

    return setAuthCookieOnResponse(response, token);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }
    if (error?.message?.includes("já está cadastrado")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
