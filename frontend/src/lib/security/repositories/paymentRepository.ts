import crypto from "crypto";
import { BaseRepository } from "./base";

export interface SubscriptionRecord {
  id: string;
  userId: string;
  gateway: "stripe" | "asaas" | "mercadopago";
  gatewayCustomerId: string;
  gatewaySubscriptionId: string;
  planTier: "free" | "pro";
  status: "active" | "past_due" | "canceled";
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Repositório de Assinaturas e Pagamentos (Conformidade PCI-DSS).
 * Armazena apenas referências opacas do gateway externo.
 * REGRA ABSOLUTA: Nenhum dado de cartão de crédito é recebido ou armazenado.
 */
export class PaymentRepository extends BaseRepository<SubscriptionRecord> {
  constructor() {
    super("subscriptions_saas.json");
  }

  public getByUserId(
    userId: string,
    authenticatedUserId: string
  ): SubscriptionRecord | null {
    BaseRepository.enforceTenantScope(userId, authenticatedUserId);
    const records = this.readData();
    return records.find((r) => r.userId === userId) || null;
  }

  public upsertSubscription(
    userId: string,
    gateway: "stripe" | "asaas" | "mercadopago",
    gatewayCustomerId: string,
    gatewaySubscriptionId: string,
    planTier: "free" | "pro",
    status: "active" | "past_due" | "canceled",
    expiresAt?: string
  ): SubscriptionRecord {
    const nowIso = new Date().toISOString();
    const records = this.readData();

    const existing = records.find((r) => r.userId === userId);

    if (existing) {
      existing.gateway = gateway;
      existing.gatewayCustomerId = gatewayCustomerId;
      existing.gatewaySubscriptionId = gatewaySubscriptionId;
      existing.planTier = planTier;
      existing.status = status;
      existing.expiresAt = expiresAt;
      existing.updatedAt = nowIso;
      this.writeData(records);
      return existing;
    }

    const newRecord: SubscriptionRecord = {
      id: `sub_${crypto.randomBytes(6).toString("hex")}`,
      userId,
      gateway,
      gatewayCustomerId,
      gatewaySubscriptionId,
      planTier,
      status,
      expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    records.push(newRecord);
    this.writeData(records);
    return newRecord;
  }

  public getActiveSubscriptionTier(userId: string): "free" | "pro" {
    const records = this.readData();
    const active = records.find(
      (r) => r.userId === userId && r.status === "active"
    );
    return active ? active.planTier : "free";
  }
}

export const paymentRepository = new PaymentRepository();
