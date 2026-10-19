"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, User, LogOut, History, BookOpen, Crown } from "lucide-react";

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
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 w-full">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group select-none shrink-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-bold text-sm sm:text-base text-zinc-100 tracking-tight">
                YT Bilingual
              </span>
              <span className="hidden sm:inline-block font-semibold text-sm sm:text-base text-zinc-300">
                Subtitles
              </span>
              <span className="rounded-md bg-zinc-800/80 border border-zinc-700/60 px-1 py-0.2 sm:px-1.5 sm:py-0.5 text-[9px] sm:text-[10px] font-medium text-zinc-400">
                PRO
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-zinc-500 font-normal">
              Imersão e prática com vídeos reais
            </p>
          </div>
        </Link>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenVocabulary}
            className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors"
            title="Meu Vocabulário"
          >
            <BookOpen className="h-4 w-4 text-zinc-400" />
            <span className="hidden sm:inline">Meu Vocabulário</span>
          </button>

          <a
            href="#history-section"
            className="flex items-center gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors"
            title="Biblioteca de vídeos salvos"
          >
            <History className="h-4 w-4 text-zinc-400" />
            <span className="hidden md:inline">Biblioteca</span>
          </a>

          {!user && (
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition-colors"
              title="Planos e Assinatura"
            >
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden md:inline">Planos</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-2 border-l border-white/10">
              {/* Profile Card */}
              <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 py-1 pl-1 pr-2 sm:pr-3 shadow-sm">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "Foto de perfil"}
                    className="h-5 w-5 sm:h-6 sm:w-6 rounded-full object-cover border border-zinc-700/60"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] sm:text-[11px] font-bold text-white shadow-inner">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}

                <span className="text-xs font-medium text-zinc-200 truncate max-w-[70px] sm:max-w-[140px]">
                  {user.name ? user.name.split(" ")[0] : user.email?.split("@")[0]}
                </span>

                {user.tier === "pro" ? (
                  <span className="flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                    <Crown className="h-2.5 w-2.5" />
                    <span>PRO</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenUpgrade}
                    className="flex items-center gap-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                    title="Desbloquear vídeos ilimitados"
                  >
                    <Crown className="h-3 w-3" />
                    <span className="hidden sm:inline">Upgrade</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Sair da conta"
                className="rounded-lg p-1.5 sm:p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-850 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-200 active:scale-95 transition-all shadow-sm shrink-0"
            >
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-zinc-700" />
              <span>Entrar<span className="hidden sm:inline"> / Cadastrar</span></span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
