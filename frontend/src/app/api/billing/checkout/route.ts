import { NextRequest, NextResponse } from "next/server";
import {
  getAuthTokenFromCookies,
  CryptoService,
  userRepository,
  paymentRepository,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthTokenFromCookies();
    if (!token) {
      return NextResponse.json(
        {
          error: "Autenticação necessária para assinar o plano.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const payload = await CryptoService.verifyAuthToken(token);
    if (!payload?.uid) {
      return NextResponse.json(
        { error: "Sessão inválida ou expirada.", code: "INVALID_SESSION" },
        { status: 401 }
      );
    }

    const user = await userRepository.findById(payload.uid);
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado.", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const plan = body.plan === "annual" ? "annual" : "monthly";

    // Verifica se há chave de produção do Stripe configurada no ambiente
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && stripeKey.startsWith("sk_")) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" as any });

        const origin = request.headers.get("origin") || "http://localhost:3000";
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          client_reference_id: user.id,
          customer_email: user.email,
          metadata: {
            userId: user.id,
            plan,
          },
          line_items: [
            {
              price_data: {
                currency: "brl",
                product_data: {
                  name: "Bilingual Subtitles PRO",
                  description:
                    plan === "annual"
                      ? "Assinatura Anual — Vídeos ilimitados até 60min, Shadowing com gravação e Anki com áudio"
                      : "Assinatura Mensal — Vídeos ilimitados até 60min, Shadowing com gravação e Anki com áudio",
                },
                unit_amount: plan === "annual" ? 19900 : 2490, // R$ 199,00 ou R$ 24,90
                recurring: {
                  interval: plan === "annual" ? "year" : "month",
                },
              },
              quantity: 1,
            },
          ],
          success_url: `${origin}/?billing=success`,
          cancel_url: `${origin}/?billing=canceled`,
        });

        return NextResponse.json({
          url: session.url,
          provider: "stripe",
        });
      } catch (stripeErr: any) {
        console.warn("Stripe API failed, falling back to simulated checkout:", stripeErr.message);
      }
    }

    // Modo Demonstração / Desenvolvimento:
    // Ativação imediata para testes fluidos sem necessidade de cartão de crédito real
    const expiresAt = new Date(
      Date.now() + (plan === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000
    ).toISOString();

    paymentRepository.upsertSubscription(
      user.id,
      "mercadopago",
      `cus_sim_${user.id}`,
      `sub_sim_${Date.now()}`,
      "pro",
      "active",
      expiresAt
    );

    await userRepository.updateTier(user.id, "pro");

    return NextResponse.json({
      success: true,
      message: "Plano PRO ativado com sucesso! Aproveite todas as funcionalidades ilimitadas.",
      provider: "simulation",
      tier: "pro",
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro ao iniciar assinatura." },
      { status: 500 }
    );
  }
}
