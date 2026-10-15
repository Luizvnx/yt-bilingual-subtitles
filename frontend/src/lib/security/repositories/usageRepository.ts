import { BaseRepository } from "./base";

export interface UsageRecord {
  id: string;
  userId: string;
  monthYear: string; // "YYYY-MM"
  videosProcessedIds: string[];
  minutesProcessed: number;
  lastProcessedAt: string;
}

export interface QuotaCheckResult {
  canProcess: boolean;
  reason?: string;
  code?: "QUOTA_EXCEEDED" | "DURATION_EXCEEDED" | "AUTH_REQUIRED";
  videosUsed: number;
  videosLimit: number;
  minutesUsed: number;
  tier: "free" | "pro";
}

export class UsageRepository extends BaseRepository<UsageRecord> {
  constructor() {
    super("usage_saas.json");
  }

  public getCurrentMonthKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  public getUsage(userId: string, monthYear?: string): UsageRecord {
    const month = monthYear || this.getCurrentMonthKey();
    const records = this.readData();
    const found = records.find((r) => r.userId === userId && r.monthYear === month);
    if (found) return found;

    return {
      id: `${userId}_${month}`,
      userId,
      monthYear: month,
      videosProcessedIds: [],
      minutesProcessed: 0,
      lastProcessedAt: new Date().toISOString(),
    };
  }

  public recordVideoUsage(
    userId: string,
    videoId: string,
    durationSeconds: number = 0
  ): UsageRecord {
    const month = this.getCurrentMonthKey();
    const records = this.readData();
    const recordIndex = records.findIndex(
      (r) => r.userId === userId && r.monthYear === month
    );

    const nowIso = new Date().toISOString();
    const durationMinutes = Math.ceil(durationSeconds / 60);

    if (recordIndex >= 0) {
      const rec = records[recordIndex];
      if (!rec.videosProcessedIds.includes(videoId)) {
        rec.videosProcessedIds.push(videoId);
        rec.minutesProcessed += durationMinutes;
      }
      rec.lastProcessedAt = nowIso;
      records[recordIndex] = rec;
      this.writeData(records);
      return rec;
    } else {
      const newRec: UsageRecord = {
        id: `${userId}_${month}`,
        userId,
        monthYear: month,
        videosProcessedIds: [videoId],
        minutesProcessed: durationMinutes,
        lastProcessedAt: nowIso,
      };
      records.push(newRec);
      this.writeData(records);
      return newRec;
    }
  }

  public checkQuota(
    userId: string | undefined,
    tier: "free" | "pro",
    videoId: string,
    durationSeconds?: number
  ): QuotaCheckResult {
    const FREE_LIMIT = 3;
    const FREE_MAX_DURATION_SECONDS = 600; // 10 minutos
    const PRO_MAX_DURATION_SECONDS = 3600; // 60 minutos

    // Visitante não autenticado (Guest)
    if (!userId) {
      if (durationSeconds && durationSeconds > FREE_MAX_DURATION_SECONDS) {
        return {
          canProcess: false,
          reason: "Vídeos com mais de 10 minutos são exclusivos do Plano PRO. Crie sua conta ou faça upgrade para desbloquear vídeos de até 60 minutos!",
          code: "DURATION_EXCEEDED",
          videosUsed: 0,
          videosLimit: 1,
          minutesUsed: 0,
          tier: "free",
        };
      }
      return {
        canProcess: true,
        videosUsed: 0,
        videosLimit: 1,
        minutesUsed: 0,
        tier: "free",
      };
    }

    const usage = this.getUsage(userId);
    const alreadyProcessed = usage.videosProcessedIds.includes(videoId);

    if (tier === "pro") {
      if (durationSeconds && durationSeconds > PRO_MAX_DURATION_SECONDS) {
        return {
          canProcess: false,
          reason: "Vídeos com mais de 60 minutos excedem a capacidade de processamento do sistema.",
          code: "DURATION_EXCEEDED",
          videosUsed: usage.videosProcessedIds.length,
          videosLimit: 9999,
          minutesUsed: usage.minutesProcessed,
          tier: "pro",
        };
      }
      return {
        canProcess: true,
        videosUsed: usage.videosProcessedIds.length,
        videosLimit: 9999,
        minutesUsed: usage.minutesProcessed,
        tier: "pro",
      };
    }

    // Plano Free
    if (alreadyProcessed) {
      return {
        canProcess: true,
        videosUsed: usage.videosProcessedIds.length,
        videosLimit: FREE_LIMIT,
        minutesUsed: usage.minutesProcessed,
        tier: "free",
      };
    }

    if (durationSeconds && durationSeconds > FREE_MAX_DURATION_SECONDS) {
      return {
        canProcess: false,
        reason: "Vídeos com mais de 10 minutos são exclusivos do Plano PRO. Faça upgrade para desbloquear vídeos de até 60 minutos!",
        code: "DURATION_EXCEEDED",
        videosUsed: usage.videosProcessedIds.length,
        videosLimit: FREE_LIMIT,
        minutesUsed: usage.minutesProcessed,
        tier: "free",
      };
    }

    if (usage.videosProcessedIds.length >= FREE_LIMIT) {
      return {
        canProcess: false,
        reason: `Você atingiu o limite de ${FREE_LIMIT} novos vídeos gratuitos deste mês. Assine o Plano PRO para processar vídeos ilimitados!`,
        code: "QUOTA_EXCEEDED",
        videosUsed: usage.videosProcessedIds.length,
        videosLimit: FREE_LIMIT,
        minutesUsed: usage.minutesProcessed,
        tier: "free",
      };
    }

    return {
      canProcess: true,
      videosUsed: usage.videosProcessedIds.length,
      videosLimit: FREE_LIMIT,
      minutesUsed: usage.minutesProcessed,
      tier: "free",
    };
  }
}

export const usageRepository = new UsageRepository();
