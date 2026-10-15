import { NextResponse } from "next/server";
import {
  getAuthTokenFromCookies,
  CryptoService,
  userRepository,
  paymentRepository,
  usageRepository,
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

  // Carrega métricas de quota do mês atual
  const usage = usageRepository.getUsage(user.id);

  return NextResponse.json({
    user,
    usage: {
      videosUsed: usage.videosProcessedIds.length,
      videosLimit: user.tier === "pro" ? 9999 : 3,
      minutesUsed: usage.minutesProcessed,
      month: usage.monthYear,
    },
  });
}
