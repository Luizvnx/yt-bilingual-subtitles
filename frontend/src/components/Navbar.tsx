"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, User, LogOut, History, Crown, BookOpen } from "lucide-react";

interface NavbarProps {
  user: any;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenVocabulary: () => void;
}

export function Navbar({
  user,
  onOpenAuth,
  onLogout,
  onOpenVocabulary,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/60 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">
                Bilingual Subtitles
              </span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                IA
              </span>
            </div>
            <p className="text-xs text-zinc-400">Estudo de Idiomas com IA</p>
          </div>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenVocabulary}
            className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors"
          >
            <BookOpen className="h-4 w-4 text-indigo-400" />
            <span>Meu Vocabulário</span>
          </button>

          <a
            href="#history-section"
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <History className="h-4 w-4 text-zinc-400" />
            <span className="hidden sm:inline">Biblioteca</span>
          </a>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-300">
                <Crown className="h-3.5 w-3.5 text-indigo-400" />
                <span className="font-semibold capitalize">{user.tier}</span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-300 font-medium truncate max-w-[120px]">
                  {user.name}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Sair da conta"
                className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <User className="h-4 w-4" />
              <span>Entrar / Cadastrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
