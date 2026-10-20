import { BaseRepository } from "./base";

export interface UsageRecord {
  id: string;
  userId: string;
  monthYear: string; // "YYYY-MM"
  videosProcessedIds: string[];
  minutesProcessed: number;
  lastProcessedAt: string;
  videosByDay?: { [date: string]: string[] }; // YYYY-MM-DD -> list of videoIds
  translationsByDay?: { [date: string]: number }; // YYYY-MM-DD -> count
}

export interface QuotaCheckResult {
  canProcess: boolean;
  reason?: string;
  code?: "QUOTA_EXCEEDED" | "DURATION_EXCEEDED" | "AUTH_REQUIRED";
  videosUsed: number;
  videosLimit: number;
  dailyVideosUsed: number;
  dailyVideosLimit: number;
  weeklyVideosUsed: number;
  weeklyVideosLimit: number;
  minutesUsed: number;
  tier: "free" | "pro";
}

export interface TranslationQuotaResult {
  allowed: boolean;
  reason?: string;
  code?: "QUOTA_EXCEEDED" | "AUTH_REQUIRED";
  count: number;
  limit: number;
}

// Armazenamento em memória para limites de visitantes por IP
const GUEST_TRANSLATIONS_BY_IP = new Map<string, { [date: string]: number }>();

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

  public getTodayKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  public getPast7DaysKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      keys.push(`${year}-${month}-${day}`);
    }
    return keys;
  }

  public getUsage(userId: string, monthYear?: string): UsageRecord {
    const month = monthYear || this.getCurrentMonthKey();
    const records = this.readData();
    const found = records.find((r) => r.userId === userId && r.monthYear === month);
    if (found) {
      if (!found.videosByDay) found.videosByDay = {};
      if (!found.translationsByDay) found.translationsByDay = {};
      return found;
    }

    return {
      id: `${userId}_${month}`,
      userId,
      monthYear: month,
      videosProcessedIds: [],
      minutesProcessed: 0,
      lastProcessedAt: new Date().toISOString(),
      videosByDay: {},
      translationsByDay: {},
    };
  }

  public recordVideoUsage(
    userId: string,
    videoId: string,
    durationSeconds: number = 0
  ): UsageRecord {
    const month = this.getCurrentMonthKey();
    const today = this.getTodayKey();
    const records = this.readData();
    const recordIndex = records.findIndex(
      (r) => r.userId === userId && r.monthYear === month
    );

    const nowIso = new Date().toISOString();
    const durationMinutes = Math.ceil(durationSeconds / 60);

    if (recordIndex >= 0) {
      const rec = records[recordIndex];
      if (!rec.videosByDay) rec.videosByDay = {};
      if (!rec.translationsByDay) rec.translationsByDay = {};

      if (!rec.videosProcessedIds.includes(videoId)) {
        rec.videosProcessedIds.push(videoId);
        rec.minutesProcessed += durationMinutes;
      }

      if (!rec.videosByDay[today]) {
        rec.videosByDay[today] = [];
      }
      if (!rec.videosByDay[today].includes(videoId)) {
        rec.videosByDay[today].push(videoId);
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
        videosByDay: { [today]: [videoId] },
        translationsByDay: {},
      };
      records.push(newRec);
      this.writeData(records);
      return newRec;
    }
  }

  public recordTranslationUsage(userId: string | undefined, ip?: string): void {
    const today = this.getTodayKey();

    if (userId) {
      const month = this.getCurrentMonthKey();
      const records = this.readData();
      const recordIndex = records.findIndex(
        (r) => r.userId === userId && r.monthYear === month
      );

      if (recordIndex >= 0) {
        const rec = records[recordIndex];
        if (!rec.translationsByDay) rec.translationsByDay = {};
        rec.translationsByDay[today] = (rec.translationsByDay[today] || 0) + 1;
        records[recordIndex] = rec;
        this.writeData(records);
      } else {
        const newRec: UsageRecord = {
          id: `${userId}_${month}`,
          userId,
          monthYear: month,
          videosProcessedIds: [],
          minutesProcessed: 0,
          lastProcessedAt: new Date().toISOString(),
          videosByDay: {},
          translationsByDay: { [today]: 1 },
        };
        records.push(newRec);
        this.writeData(records);
      }
    } else if (ip) {
      const current = GUEST_TRANSLATIONS_BY_IP.get(ip) || {};
      current[today] = (current[today] || 0) + 1;
      GUEST_TRANSLATIONS_BY_IP.set(ip, current);
    }
  }

  public checkTranslationQuota(
    userId: string | undefined,
    tier: "free" | "pro",
    ip?: string
  ): TranslationQuotaResult {
    const FREE_DAILY_LIMIT = 20;
    const GUEST_DAILY_LIMIT = 5;
    const today = this.getTodayKey();

    if (tier === "pro") {
      return { allowed: true, count: 0, limit: 9999 };
    }

    if (userId) {
      const usage = this.getUsage(userId);
      const countToday = usage.translationsByDay?.[today] || 0;

      if (countToday >= FREE_DAILY_LIMIT) {
        return {
          allowed: false,
          reason: `Você atingiu seu limite diário de ${FREE_DAILY_LIMIT} traduções gratuitas. Assine o Plano PRO para consultas ilimitadas!`,
          code: "QUOTA_EXCEEDED",
          count: countToday,
          limit: FREE_DAILY_LIMIT,
        };
      }

      return {
        allowed: true,
        count: countToday,
        limit: FREE_DAILY_LIMIT,
      };
    }

    // Visitante (Guest)
    const guestCounts = (ip && GUEST_TRANSLATIONS_BY_IP.get(ip)) || {};
    const guestToday = guestCounts[today] || 0;

    if (guestToday >= GUEST_DAILY_LIMIT) {
      return {
        allowed: false,
        reason: `Você atingiu o limite de ${GUEST_DAILY_LIMIT} traduções gratuitas para visitantes. Crie sua conta para continuar estudando!`,
        code: "AUTH_REQUIRED",
        count: guestToday,
        limit: GUEST_DAILY_LIMIT,
      };
    }

    return {
      allowed: true,
      count: guestToday,
      limit: GUEST_DAILY_LIMIT,
    };
  }

  public checkQuota(
    userId: string | undefined,
    tier: "free" | "pro",
    videoId: string,
    durationSeconds?: number
  ): QuotaCheckResult {
    const FREE_DAILY_LIMIT = 2;
    const FREE_WEEKLY_LIMIT = 6;
    const FREE_MAX_DURATION_SECONDS = 600; // 10 minutos
    const PRO_MAX_DURATION_SECONDS = 3600; // 60 minutos
    const today = this.getTodayKey();
    const past7Days = this.getPast7DaysKeys();

    // 1. Visitante não autenticado (Guest)
    // Conforme especificação: vídeos de conteúdo são exclusivos para quem tem conta criada e logada
    if (!userId) {
      return {
        canProcess: false,
        reason: "Crie sua conta gratuita ou faça login para acessar os vídeos e estúdios de estudo!",
        code: "AUTH_REQUIRED",
        videosUsed: 0,
        videosLimit: 0,
        dailyVideosUsed: 0,
        dailyVideosLimit: FREE_DAILY_LIMIT,
        weeklyVideosUsed: 0,
        weeklyVideosLimit: FREE_WEEKLY_LIMIT,
        minutesUsed: 0,
        tier: "free",
      };
    }

    const usage = this.getUsage(userId);
    const alreadyProcessed = usage.videosProcessedIds.includes(videoId);

    // Contagem de vídeos diários e semanais
    const videosToday = usage.videosByDay?.[today] || [];
    const dailyUsed = videosToday.length;

    let weeklyUsed = 0;
    const weeklyVideoSet = new Set<string>();
    for (const d of past7Days) {
      const vids = usage.videosByDay?.[d] || [];
      for (const v of vids) {
        weeklyVideoSet.add(v);
      }
    }
    weeklyUsed = weeklyVideoSet.size;

    // 2. Usuário PRO: Acesso Ilimitado até 60 minutos
    if (tier === "pro") {
      if (durationSeconds && durationSeconds > PRO_MAX_DURATION_SECONDS) {
        return {
          canProcess: false,
          reason: "Vídeos com mais de 60 minutos excedem a capacidade de processamento do sistema.",
          code: "DURATION_EXCEEDED",
          videosUsed: usage.videosProcessedIds.length,
          videosLimit: 9999,
          dailyVideosUsed: dailyUsed,
          dailyVideosLimit: 9999,
          weeklyVideosUsed: weeklyUsed,
          weeklyVideosLimit: 9999,
          minutesUsed: usage.minutesProcessed,
          tier: "pro",
        };
      }
      return {
        canProcess: true,
        videosUsed: usage.videosProcessedIds.length,
        videosLimit: 9999,
        dailyVideosUsed: dailyUsed,
        dailyVideosLimit: 9999,
        weeklyVideosUsed: weeklyUsed,
        weeklyVideosLimit: 9999,
        minutesUsed: usage.minutesProcessed,
        tier: "pro",
      };
    }

    // 3. Usuário Gratuito (Free)
    // Se o vídeo já foi desbloqueado/processado pelo usuário, permite revisar sem gastar nova quota
    if (alreadyProcessed) {
      return {
        canProcess: true,
        videosUsed: usage.videosProcessedIds.length,
        videosLimit: FREE_WEEKLY_LIMIT,
        dailyVideosUsed: dailyUsed,
        dailyVideosLimit: FREE_DAILY_LIMIT,
        weeklyVideosUsed: weeklyUsed,
        weeklyVideosLimit: FREE_WEEKLY_LIMIT,
        minutesUsed: usage.minutesProcessed,
        tier: "free",
      };
    }

    // Validação estrita de duração máxima do plano Free (10 minutos)
    if (durationSeconds && durationSeconds > FREE_MAX_DURATION_SECONDS) {
      return {
        canProcess: false,
        reason: "Vídeos com mais de 10 minutos são exclusivos do Plano PRO. Faça upgrade para desbloquear vídeos de até 60 minutos!",
        code: "DURATION_EXCEEDED",
        videosUsed: usage.videosProcessedIds.length,
        videosLimit: FREE_WEEKLY_LIMIT,
        dailyVideosUsed: dailyUsed,
        dailyVideosLimit: FREE_DAILY_LIMIT,
        weeklyVideosUsed: weeklyUsed,
        weeklyVideosLimit: FREE_WEEKLY_LIMIT,
        minutesUsed: usage.minutesProcessed,
        tier: "free",
      };
    }

    // Validação de limite diário (2 vídeos/dia)
    if (dailyUsed >= FREE_DAILY_LIMIT) {
      return {
        canProcess: false,
        reason: `Você atingiu seu limite de ${FREE_DAILY_LIMIT} vídeos gratuitos hoje. Volte amanhã ou faça upgrade para o Plano PRO para praticar ilimitadamente!`,
        code: "QUOTA_EXCEEDED",
        videosUsed: usage.videosProcessedIds.length,
        videosLimit: FREE_WEEKLY_LIMIT,
        dailyVideosUsed: dailyUsed,
        dailyVideosLimit: FREE_DAILY_LIMIT,
        weeklyVideosUsed: weeklyUsed,
        weeklyVideosLimit: FREE_WEEKLY_LIMIT,
        minutesUsed: usage.minutesProcessed,
        tier: "free",
      };
    }

    // Validação de limite semanal (6 vídeos/semana)
    if (weeklyUsed >= FREE_WEEKLY_LIMIT) {
      return {
        canProcess: false,
        reason: `Você atingiu seu limite de ${FREE_WEEKLY_LIMIT} vídeos gratuitos desta semana. Assine o Plano PRO para estudar sem restrições!`,
        code: "QUOTA_EXCEEDED",
        videosUsed: usage.videosProcessedIds.length,
        videosLimit: FREE_WEEKLY_LIMIT,
        dailyVideosUsed: dailyUsed,
        dailyVideosLimit: FREE_DAILY_LIMIT,
        weeklyVideosUsed: weeklyUsed,
        weeklyVideosLimit: FREE_WEEKLY_LIMIT,
        minutesUsed: usage.minutesProcessed,
        tier: "free",
      };
    }

    return {
      canProcess: true,
      videosUsed: usage.videosProcessedIds.length,
      videosLimit: FREE_WEEKLY_LIMIT,
      dailyVideosUsed: dailyUsed,
      dailyVideosLimit: FREE_DAILY_LIMIT,
      weeklyVideosUsed: weeklyUsed,
      weeklyVideosLimit: FREE_WEEKLY_LIMIT,
      minutesUsed: usage.minutesProcessed,
      tier: "free",
    };
  }
}

export const usageRepository = new UsageRepository();
