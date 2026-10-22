/**
 * Gamification Storage & Progress Helper
 *
 * Gerencia a persistência de XP, Ofensiva (Streak) e Lições Concluídas
 * com escopo estrito por usuário autenticado (user.id).
 *
 * Se o usuário não estiver logado (visitante/guest):
 * - XP = 0
 * - Streak = 0
 * - Lições Concluídas = Set vazio
 * - Limpa chaves legadas e resíduos de testes anteriores do navegador.
 */

export interface UserGamificationState {
  xp: number;
  streak: number;
  completedIds: Set<string>;
}

const LEGACY_KEYS = [
  "ytsubs_xp",
  "ytsubs_streak",
  "ytsubs_completed",
  "ytsubs_last_active",
  "ytsubs_current_lesson_id",
];

export function cleanupLegacyGamification(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {}
}

export function getUserGamification(userId?: string | null): UserGamificationState {
  if (typeof window === "undefined") {
    return { xp: 0, streak: 0, completedIds: new Set() };
  }

  // Visitante não autenticado nunca herda dados de sessões ou testes anteriores
  if (!userId) {
    cleanupLegacyGamification();
    return { xp: 0, streak: 0, completedIds: new Set() };
  }

  try {
    const xpKey = `ytsubs_${userId}_xp`;
    const streakKey = `ytsubs_${userId}_streak`;
    const completedKey = `ytsubs_${userId}_completed`;
    const lastActiveKey = `ytsubs_${userId}_last_active`;

    const savedXp = localStorage.getItem(xpKey);
    const savedStreak = localStorage.getItem(streakKey);
    const savedCompleted = localStorage.getItem(completedKey);
    const lastActiveDate = localStorage.getItem(lastActiveKey);

    const xp = savedXp ? parseInt(savedXp, 10) : 0;
    let streak = savedStreak ? parseInt(savedStreak, 10) : 1;

    // Validação da sequência diária (Streak)
    const todayStr = new Date().toDateString();
    if (lastActiveDate) {
      const lastDate = new Date(lastActiveDate);
      const diffDays = Math.floor(
        (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 1) {
        streak = 1; // Quebrou a sequência
        localStorage.setItem(streakKey, "1");
      }
    } else {
      localStorage.setItem(lastActiveKey, todayStr);
      localStorage.setItem(streakKey, "1");
    }

    let completedIds = new Set<string>();
    if (savedCompleted) {
      try {
        const arr = JSON.parse(savedCompleted);
        if (Array.isArray(arr)) {
          completedIds = new Set(arr);
        }
      } catch {}
    }

    return { xp, streak, completedIds };
  } catch (err) {
    console.warn("[gamification] Erro ao carregar progresso:", err);
    return { xp: 0, streak: 0, completedIds: new Set() };
  }
}

export function saveUserGamification(
  userId: string | null | undefined,
  update: {
    xp?: number;
    streak?: number;
    completedIds?: Set<string> | string[];
  }
): void {
  if (typeof window === "undefined" || !userId) return;

  try {
    const todayStr = new Date().toDateString();
    localStorage.setItem(`ytsubs_${userId}_last_active`, todayStr);

    if (update.xp !== undefined) {
      localStorage.setItem(`ytsubs_${userId}_xp`, String(update.xp));
    }
    if (update.streak !== undefined) {
      localStorage.setItem(`ytsubs_${userId}_streak`, String(update.streak));
    }
    if (update.completedIds !== undefined) {
      const arr =
        update.completedIds instanceof Set
          ? Array.from(update.completedIds)
          : update.completedIds;
      localStorage.setItem(`ytsubs_${userId}_completed`, JSON.stringify(arr));
    }

    // Dispara eventos locais para atualização reativa
    window.dispatchEvent(
      new CustomEvent("ytsubs_xp_updated", {
        detail: { xp: update.xp, streak: update.streak, userId },
      })
    );
    window.dispatchEvent(
      new CustomEvent("ytsubs_lesson_completed", {
        detail: { userId },
      })
    );
  } catch (err) {
    console.warn("[gamification] Erro ao salvar progresso:", err);
  }
}
