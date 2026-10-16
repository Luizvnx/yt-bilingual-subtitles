import { NextRequest, NextResponse } from "next/server";
import {
  getAuthTokenFromCookies,
  CryptoService,
  userRepository,
  paymentRepository,
} from "@/lib/security";

/**
 * Utilitário de desenvolvimento para alternar o plano entre "free" e "pro"
 * permitindo testar o comportamento visual, cotas e limites sem burocracia.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Endpoint indisponível em ambiente de produção." },
      { status: 404 }
    );
  }

  const token = await getAuthTokenFromCookies();
  if (!token) {
    return NextResponse.json(
      { error: "Você precisa estar conectado para alternar o plano." },
      { status: 401 }
    );
  }

  const payload = await CryptoService.verifyAuthToken(token);
  if (!payload?.uid) {
    return NextResponse.json(
      { error: "Sessão inválida." },
      { status: 401 }
    );
  }

  const user = await userRepository.findById(payload.uid);
  if (!user) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 }
    );
  }

  const currentTier = paymentRepository.getActiveSubscriptionTier(user.id);
  const newTier = currentTier === "pro" ? "free" : "pro";

  paymentRepository.upsertSubscription(
    user.id,
    "mercadopago",
    `cus_${user.id}`,
    `sub_test_${Date.now()}`,
    newTier,
    newTier === "pro" ? "active" : "canceled"
  );
  await userRepository.updateTier(user.id, newTier);

  return NextResponse.json({
    success: true,
    previousTier: currentTier,
    newTier,
    message:
      newTier === "pro"
        ? "Plano PRO ativado com sucesso!"
        : "Revertido para o Plano Estudante (Gratuito).",
  });
}
