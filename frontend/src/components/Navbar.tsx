"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, User, LogOut, History, BookOpen, Crown, Flame, Zap } from "lucide-react";
import { getUserGamification } from "@/lib/gamification";

interface NavbarProps {
  user: any;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenVocabulary: () => void;
  onOpenUpgrade?: () => void;
}

export function Navbar({
  user,
  onOpenAuth,
  onLogout,
  onOpenVocabulary,
  onOpenUpgrade,
}: NavbarProps) {
  // Estado local para Gamificação no Header (Streak e XP) - Inicia em 0 para não vazar dados
  const [streak, setStreak] = useState<number>(0);
  const [xp, setXp] = useState<number>(0);

  useEffect(() => {
    const syncGamification = () => {
      if (typeof window === "undefined") return;
      if (!user) {
        setStreak(0);
        setXp(0);
        return;
      }
      try {
        const stats = getUserGamification(user.id);
        setStreak(stats.streak);
        setXp(stats.xp);
      } catch {}
    };

    syncGamification();

    const handleXpUpdate = (e: any) => {
      if (!user) {
        setStreak(0);
        setXp(0);
        return;
      }
      if (e?.detail?.userId && e.detail.userId !== user.id) return;
      if (e?.detail?.xp !== undefined) {
        setXp(e.detail.xp);
      }
      if (e?.detail?.streak !== undefined) {
        setStreak(e.detail.streak);
      }
    };

    window.addEventListener("ytsubs_xp_updated", handleXpUpdate);
    window.addEventListener("storage", syncGamification);

    return () => {
      window.removeEventListener("ytsubs_xp_updated", handleXpUpdate);
      window.removeEventListener("storage", syncGamification);
    };
  }, [user?.id]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#070A0F]/90 backdrop-blur-2xl specular-top">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-2 sm:px-6 lg:px-8 w-full">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-3 group select-none shrink-0">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.4)] border-b-2 sm:border-b-[3px] border-indigo-700 group-hover:scale-105 active:translate-y-0.5 active:border-b transition-all">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-display font-black text-sm sm:text-lg text-white tracking-tight">
                YT Bilingual
              </span>
              <span className="hidden sm:inline-block font-display font-bold text-base sm:text-lg text-zinc-300">
                Subtitles
              </span>
              {process.env.NEXT_PUBLIC_ENVIRONMENT === "stage" && (
                <span className="flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-500/50 border-b-2 border-b-amber-600 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-display font-black text-amber-300 tracking-wider">
                  <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  STAGE
                </span>
              )}
            </div>
            <p className="hidden md:block text-[11px] text-zinc-400 font-medium">
              Imersão e prática com vídeos reais do YouTube
            </p>
          </div>
        </Link>

        {/* Central Gamification HUD (Streak & XP) */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Streak 3D Token */}
          <div
            className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-b from-orange-500/15 via-zinc-900/90 to-zinc-950 border border-orange-500/40 border-b-2 sm:border-b-[3px] border-b-orange-600 shadow-[0_2px_10px_rgba(249,115,22,0.2)] active:translate-y-0.5 active:border-b select-none transition-all cursor-default"
            title="Sua sequência diária de estudos (Ofensiva)"
          >
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md sm:rounded-lg bg-gradient-to-tr from-orange-600 to-amber-400 text-white shadow-[0_0_8px_rgba(249,115,22,0.6)] shrink-0 border-b border-orange-700">
              <Flame className="h-3 w-3 sm:h-4 sm:w-4 fill-white text-white drop-shadow" />
            </div>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="font-display font-black text-white text-xs sm:text-base leading-none">
                {streak}
              </span>
              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider text-orange-400 leading-none">
                {streak === 1 ? "dia" : "dias"}
              </span>
            </div>
          </div>

          {/* XP Total 3D Token */}
          <div
            className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-b from-amber-500/15 via-zinc-900/90 to-zinc-950 border border-amber-500/40 border-b-2 sm:border-b-[3px] border-b-amber-600 shadow-[0_2px_10px_rgba(245,158,11,0.2)] active:translate-y-0.5 active:border-b select-none transition-all cursor-default"
            title="Pontos de experiência (XP) acumulados"
          >
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md sm:rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 text-zinc-950 shadow-[0_0_8px_rgba(245,158,11,0.6)] shrink-0 border-b border-amber-700">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 fill-current text-zinc-950 stroke-[2.5]" />
            </div>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="font-display font-black text-amber-300 text-xs sm:text-base leading-none">
                {xp}
              </span>
              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider text-amber-400 leading-none">
                XP
              </span>
            </div>
          </div>
        </div>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenVocabulary}
            className="flex items-center gap-1.5 rounded-lg sm:rounded-xl p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 active:translate-y-0.5 transition-all cursor-pointer"
            title="Meu Vocabulário"
          >
            <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Vocabulário</span>
          </button>

          <a
            href="#history-section"
            className="hidden md:flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 active:translate-y-0.5 transition-all cursor-pointer"
            title="Biblioteca de vídeos salvos"
          >
            <History className="h-4 w-4 text-zinc-400 shrink-0" />
            <span>Biblioteca</span>
          </a>

          {!user && (
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-display font-black text-amber-300 bg-gradient-to-b from-amber-500/20 via-zinc-900 to-zinc-950 border border-amber-500/40 border-b-[3px] border-b-amber-600 shadow-[0_2px_12px_rgba(245,158,11,0.25)] hover:brightness-110 active:translate-y-0.5 active:border-b transition-all cursor-pointer"
              title="Planos e Assinatura"
            >
              <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Planos PRO</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-white/10">
              {/* Profile Card 3D */}
              <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border border-white/10 border-b-2 sm:border-b-[3px] border-b-zinc-800 bg-[#0B0D14] py-0.5 sm:py-1 pl-1 sm:pl-1.5 pr-2 sm:pr-3 shadow-md">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "Foto de perfil"}
                    className="h-5 w-5 sm:h-6 sm:w-6 rounded-lg sm:rounded-xl object-cover border border-zinc-700/60"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-[10px] sm:text-[11px] font-display font-black text-white shadow-inner">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}

                <span className="text-xs font-semibold text-zinc-200 truncate max-w-[60px] sm:max-w-[130px]">
                  {user.name ? user.name.split(" ")[0] : user.email?.split("@")[0]}
                </span>

                {user.tier === "pro" ? (
                  <span className="flex items-center gap-1 rounded-md sm:rounded-lg bg-gradient-to-b from-amber-500 to-amber-600 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-display font-black text-zinc-950 shadow-sm border-b border-amber-700">
                    <Crown className="h-2.5 w-2.5 fill-current shrink-0" />
                    <span>PRO</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenUpgrade}
                    className="flex items-center gap-0.5 sm:gap-1 rounded-md sm:rounded-lg bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-display font-bold text-amber-300 border border-amber-500/40 border-b-2 border-b-amber-600 transition-all cursor-pointer"
                    title="Desbloquear vídeos ilimitados"
                  >
                    <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                    <span className="hidden sm:inline">Upgrade</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Sair da conta"
                className="rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 border border-indigo-400/30 border-b-2 sm:border-b-[3px] border-b-indigo-800 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-display font-black text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:brightness-110 active:translate-y-0.5 active:border-b transition-all cursor-pointer shrink-0 whitespace-nowrap"
            >
              <User className="h-3.5 w-3.5 text-indigo-200 shrink-0" />
              <span>Entrar<span className="hidden sm:inline"> / Cadastrar</span></span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

