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

  // Carrega métricas de quota do usuário
  const usage = usageRepository.getUsage(user.id);
  const today = usageRepository.getTodayKey();
  const past7Days = usageRepository.getPast7DaysKeys();
  const dailyVideosUsed = (usage.videosByDay?.[today] || []).length;

  const weeklySet = new Set<string>();
  for (const d of past7Days) {
    for (const v of usage.videosByDay?.[d] || []) {
      weeklySet.add(v);
    }
  }
  const weeklyVideosUsed = weeklySet.size;
  const translationsToday = usage.translationsByDay?.[today] || 0;

  return NextResponse.json({
    user,
    usage: {
      videosUsed: usage.videosProcessedIds.length,
      videosLimit: user.tier === "pro" ? 9999 : 6,
      dailyVideosUsed,
      dailyVideosLimit: user.tier === "pro" ? 9999 : 2,
      weeklyVideosUsed,
      weeklyVideosLimit: user.tier === "pro" ? 9999 : 6,
      translationsUsedToday: translationsToday,
      translationsLimitToday: user.tier === "pro" ? 9999 : 20,
      minutesUsed: usage.minutesProcessed,
      month: usage.monthYear,
    },
  });
}
