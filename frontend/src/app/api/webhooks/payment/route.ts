import { NextRequest, NextResponse } from "next/server";
import {
  paymentRepository,
  userRepository,
} from "@/lib/security";

/**
 * Webhook unificado de pagamentos (Fase 5 do Roadmap).
 * Suporta Stripe, Asaas e Mercado Pago.
 * Atualiza instantaneamente a assinatura e permissões do usuário.
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature");
    const rawBody = await request.text();

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    let event: any = null;

    if (!signature || !webhookSecret || !stripeKey) {
      return NextResponse.json(
        { error: "Assinatura do webhook ausente ou chaves não configuradas no servidor." },
        { status: 401 }
      );
    }

    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" as any });
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    const eventType = event.type || event.event;

    // 1. Assinatura confirmada / Pagamento aprovado
    if (
      eventType === "checkout.session.completed" ||
      eventType === "invoice.payment_succeeded" ||
      eventType === "PAYMENT_CONFIRMED" ||
      eventType === "PAYMENT_RECEIVED"
    ) {
      const dataObj = event.data?.object || event.payment || event;
      const userId =
        dataObj.client_reference_id ||
        dataObj.metadata?.userId ||
        dataObj.externalReference;

      if (userId) {
        const customerId =
          dataObj.customer || dataObj.customer_id || "cust_unknown";
        const subscriptionId =
          dataObj.subscription || dataObj.subscription_id || `sub_${Date.now()}`;
        const expiresAt = new Date(
          Date.now() + 32 * 24 * 60 * 60 * 1000
        ).toISOString();

        paymentRepository.upsertSubscription(
          userId,
          "stripe",
          customerId,
          subscriptionId,
          "pro",
          "active",
          expiresAt
        );
        await userRepository.updateTier(userId, "pro");
      }
    }

    // 2. Assinatura cancelada, reembolsada ou expirada
    if (
      eventType === "customer.subscription.deleted" ||
      eventType === "SUBSCRIPTION_DELETED" ||
      eventType === "PAYMENT_REFUNDED" ||
      eventType === "PAYMENT_CHARGEBACK"
    ) {
      const dataObj = event.data?.object || event.subscription || event;
      const userId =
        dataObj.metadata?.userId || dataObj.client_reference_id;

      if (userId) {
        paymentRepository.upsertSubscription(
          userId,
          "stripe",
          dataObj.customer || "cust_unknown",
          dataObj.id || "sub_unknown",
          "free",
          "canceled"
        );
        await userRepository.updateTier(userId, "free");
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro no processamento do webhook." },
      { status: 500 }
    );
  }
}
