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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group select-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base text-zinc-100 tracking-tight">
                Bilingual Subtitles
              </span>
              <span className="rounded-md bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-normal">
              Imersão e prática com vídeos reais
            </p>
          </div>
        </Link>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenVocabulary}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors"
          >
            <BookOpen className="h-4 w-4 text-zinc-400" />
            <span>Meu Vocabulário</span>
          </button>

          <a
            href="#history-section"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors"
          >
            <History className="h-4 w-4 text-zinc-400" />
            <span className="hidden sm:inline">Biblioteca</span>
          </a>

          {!user && (
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition-colors"
            >
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Planos</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
              {/* Profile Card */}
              <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 py-1 pl-1 pr-3 shadow-sm">
                {/* User Avatar */}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "Foto de perfil"}
                    className="h-6 w-6 rounded-full object-cover border border-zinc-700/60"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white shadow-inner">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}

                {/* User Name */}
                <span className="text-xs font-medium text-zinc-200 truncate max-w-[110px] sm:max-w-[150px]">
                  {user.name || user.email?.split("@")[0]}
                </span>

                {/* Tier Badge */}
                {user.tier === "pro" ? (
                  <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                    <Crown className="h-3 w-3" />
                    <span>PRO</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenUpgrade}
                    className="flex items-center gap-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                    title="Desbloquear vídeos ilimitados"
                  >
                    <Crown className="h-3 w-3" />
                    <span>Upgrade</span>
                  </button>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                title="Sair da conta"
                className="rounded-lg p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-850 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-200 active:scale-95 transition-all shadow-sm"
            >
              <User className="h-4 w-4 text-zinc-700" />
              <span>Entrar / Cadastrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
