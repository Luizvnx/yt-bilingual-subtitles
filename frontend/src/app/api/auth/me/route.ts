import { NextResponse } from "next/server";
import {
  getAuthTokenFromCookies,
  CryptoService,
  userRepository,
  paymentRepository,
} from "@/lib/security";

export async function GET() {
  const token = await getAuthTokenFromCookies();
  if (!token) {
    return NextResponse.json(
      { error: "Não autenticado.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const payload = await CryptoService.verifyAuthToken(token);
  if (!payload || !payload.uid) {
    return NextResponse.json(
      { error: "Sessão inválida ou expirada.", code: "INVALID_SESSION" },
      { status: 401 }
    );
  }

  const user = await userRepository.findById(payload.uid);
  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: "Usuário não encontrado.", code: "USER_NOT_FOUND" },
      { status: 404 }
    );
  }

  // Verifica status atualizado da assinatura
  const activeTier = paymentRepository.getActiveSubscriptionTier(user.id);
  user.tier = activeTier;

  return NextResponse.json({ user });
}
