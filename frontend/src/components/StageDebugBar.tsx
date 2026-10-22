"use client";

import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Zap,
  Crown,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { calculateLevel } from "./LevelUpCelebrationModal";
import {
  getUserGamification,
  saveUserGamification,
  cleanupLegacyGamification,
} from "@/lib/gamification";

interface StageDebugBarProps {
  user?: any;
  onTriggerCelebration: (data: {
    earnedXp: number;
    previousXp: number;
    newXp: number;
    title: string;
  }) => void;
}

export function StageDebugBar({ user, onTriggerCelebration }: StageDebugBarProps) {
  const [isStageEnv, setIsStageEnv] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [currentXp, setCurrentXp] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Validação estrita de ambiente: roda APENAS em Stage ou desenvolvimento local
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStage =
      process.env.NEXT_PUBLIC_ENVIRONMENT === "stage" ||
      window.location.port === "3001" ||
      window.location.hostname.includes("stage") ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    setIsStageEnv(isStage);

    const loadXp = () => {
      try {
        if (!user) {
          setCurrentXp(0);
          return;
        }
        const stats = getUserGamification(user.id);
        setCurrentXp(stats.xp);
      } catch {}
    };

    loadXp();

    const handleXpUpdate = (e: any) => {
      if (e?.detail?.xp !== undefined) {
        setCurrentXp(e.detail.xp);
      } else {
        loadXp();
      }
    };

    window.addEventListener("ytsubs_xp_updated", handleXpUpdate);
    window.addEventListener("storage", loadXp);
    return () => {
      window.removeEventListener("ytsubs_xp_updated", handleXpUpdate);
      window.removeEventListener("storage", loadXp);
    };
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Botão 1: Adicionar +50 XP e disparar a animação
  const handleAdd50Xp = () => {
    try {
      const prev = currentXp;
      const earned = 50;
      const nextXp = prev + earned;

      if (user?.id) {
        saveUserGamification(user.id, { xp: nextXp, streak: 1 });
      } else {
        window.dispatchEvent(
          new CustomEvent("ytsubs_xp_updated", { detail: { xp: nextXp } })
        );
      }
      setCurrentXp(nextXp);

      onTriggerCelebration({
        earnedXp: earned,
        previousXp: prev,
        newXp: nextXp,
        title: "Teste de Gamificação (+50 XP)",
      });

      showToast("+50 XP adicionados!");
    } catch (err) {
      console.warn("Erro ao adicionar XP de teste:", err);
    }
  };

  // Botão 2: Forçar Subida de Nível (Level Up) imediato
  const handleForceLevelUp = () => {
    try {
      const prev = currentXp;
      const lvl = calculateLevel(prev);

      const needed = Math.max(50, lvl.nextThreshold - prev + 25);
      const nextXp = prev + needed;

      if (user?.id) {
        saveUserGamification(user.id, { xp: nextXp, streak: 1 });
      } else {
        window.dispatchEvent(
          new CustomEvent("ytsubs_xp_updated", { detail: { xp: nextXp } })
        );
      }
      setCurrentXp(nextXp);

      onTriggerCelebration({
        earnedXp: needed,
        previousXp: prev,
        newXp: nextXp,
        title: `Teste de Subida de Nível (Rumo ao Nível ${lvl.level + 1})`,
      });

      showToast(`Level Up forçado! Novo Nível: ${lvl.level + 1}`);
    } catch (err) {
      console.warn("Erro ao forçar Level Up:", err);
    }
  };

  // Botão 3: Resetar Níveis e Progresso
  const handleResetProgress = () => {
    try {
      cleanupLegacyGamification();
      if (user?.id) {
        saveUserGamification(user.id, {
          xp: 0,
          streak: 0,
          completedIds: [],
        });
      }
      setCurrentXp(0);

      window.dispatchEvent(
        new CustomEvent("ytsubs_xp_updated", { detail: { xp: 0, streak: 0 } })
      );
      window.dispatchEvent(
        new CustomEvent("ytsubs_lesson_completed", { detail: { reset: true } })
      );

      showToast("Níveis e trilha resetados para o início (0 XP)!");
    } catch (err) {
      console.warn("Erro ao resetar progresso:", err);
    }
  };

  if (!isStageEnv) return null;

  const levelInfo = calculateLevel(currentXp);

  return (
    <aside
      aria-label="Painel de Testes STAGE"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-sans select-none"
    >
      {/* Toast Informativo de Ação */}
      {toastMessage && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Barra de Controle de Testes */}
      <div className="rounded-2xl border border-amber-500/50 bg-zinc-950/90 p-2.5 shadow-2xl shadow-amber-500/10 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          {/* Badge Indicador de Stage */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-[11px] tracking-wider">
            <FlaskConical className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>STAGE QA</span>
          </div>

          {!isCollapsed && (
            <>
              {/* Info de Status Atual */}
              <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-900/90 border border-white/5 text-[11px]">
                <span className="font-semibold text-zinc-400">
                  Nível <b className="text-amber-400">{levelInfo.level}</b>
                </span>
                <span className="text-zinc-600">•</span>
                <span className="font-semibold text-zinc-300">
                  {currentXp} XP
                </span>
              </div>

              {/* Botão +50 XP */}
              <button
                type="button"
                onClick={handleAdd50Xp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
                title="Ganha +50 XP e abre a animação de preenchimento"
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>+50 XP</span>
              </button>

              {/* Botão Level Up */}
              <button
                type="button"
                onClick={handleForceLevelUp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                title="Sobe para o próximo nível imediatamente e roda a animação completa de comemoração"
              >
                <Crown className="h-3.5 w-3.5 fill-current" />
                <span>Level Up</span>
              </button>

              {/* Botão Resetar Níveis */}
              <button
                type="button"
                onClick={handleResetProgress}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/25 text-red-300 font-semibold text-xs active:scale-95 transition-all cursor-pointer"
                title="Reseta XP para 0 e limpa as lições concluídas para testar do zero"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Resetar</span>
              </button>
            </>
          )}

          {/* Botão Minimizar / Expandir */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isCollapsed ? "Expandir Painel de Testes" : "Minimizar"}
          >
            {isCollapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
