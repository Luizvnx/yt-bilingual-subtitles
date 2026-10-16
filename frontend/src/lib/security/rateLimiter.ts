interface RateLimitRecord {
  timestamps: number[];
}

/**
 * Rate Limiter baseado em Janela Deslizante (Sliding Window).
 * Padrão de Projeto: Singleton / Middleware Helper.
 */
class InMemoryRateLimiter {
  private static instance: InMemoryRateLimiter;
  private records: Map<string, RateLimitRecord> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryRateLimiter {
    if (!InMemoryRateLimiter.instance) {
      InMemoryRateLimiter.instance = new InMemoryRateLimiter();
    }
    return InMemoryRateLimiter.instance;
  }

  public isAllowed(
    key: string,
    limit: number,
    periodSeconds: number
  ): { allowed: boolean; retryAfter: number } {
    const now = Date.now();
    const windowStart = now - periodSeconds * 1000;

    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // Filtra timestamps dentro da janela ativa
    record.timestamps = record.timestamps.filter((t) => t > windowStart);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0];
      const retryAfter = Math.ceil((oldest + periodSeconds * 1000 - now) / 1000);
      return { allowed: false, retryAfter: Math.max(1, retryAfter) };
    }

    record.timestamps.push(now);
    return { allowed: true, retryAfter: 0 };
  }
}

export const rateLimiter = InMemoryRateLimiter.getInstance();

export function checkRateLimit(
  key: string,
  limit: number = 60,
  periodSeconds: number = 60
): { allowed: boolean; retryAfter: number } {
  return rateLimiter.isAllowed(key, limit, periodSeconds);
}

export function getClientIp(request: { headers: { get: (name: string) => string | null } }): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      const candidate = parts[0];
      if (/^[a-fA-F0-9:.]+$/.test(candidate)) {
        return candidate;
      }
    }
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp && /^[a-fA-F0-9:.]+$/.test(realIp.trim())) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

