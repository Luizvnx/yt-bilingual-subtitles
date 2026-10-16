"use client";

import React, { useEffect, useState } from "react";
import {
  Volume2,
  BookmarkPlus,
  X,
  Loader2,
  Check,
  Lock,
} from "lucide-react";

import { speakInEnglish } from "@/lib/tts";

interface WordPopoverProps {
  word: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
  user: any;
  onRequireLogin: () => void;
  onWordSaved?: () => void;
}

export function WordPopover({
  word,
  position,
  onClose,
  user,
  onRequireLogin,
  onWordSaved,
}: WordPopoverProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Pronúncia imediata garantindo voz nativa em inglês
  const speakImmediate = (text: string) => {
    speakInEnglish(text);
  };

  useEffect(() => {
    if (!word) return;
    setLoading(true);
    setSaved(false);
    setSaveError("");

    // Pronúncia instantânea na hora em que clica!
    speakImmediate(word);

    // Busca dados em paralelo no cache / API de dicionário
    fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => {
        setData({ word, translationPt: word, phonetics: `/${word}/` });
        setLoading(false);
      });
  }, [word]);

  if (!position) return null;

  const playPronunciation = () => {
    if (data?.audioUrl) {
      const audio = new Audio(data.audioUrl);
      audio.play().catch(() => speakImmediate(word));
    } else {
      speakImmediate(word);
    }
  };

  const handleSaveWord = async () => {
    // 1. Validação estrita: exige usuário autenticado
    if (!user) {
      onRequireLogin();
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: data?.word || word,
          translationPt: data?.translationPt || word,
          phonetics: data?.phonetics || "",
          partOfSpeech: data?.partOfSpeech || "",
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Erro ao salvar.");
      }

      setSaved(true);
      if (onWordSaved) onWordSaved();
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao salvar palavra.");
    } finally {
      setSaving(false);
    }
  };

  // Ajusta a posição para não vazar da tela
  const style: React.CSSProperties = {
    top: Math.max(10, Math.min(position.y + 15, window.innerHeight - 280)),
    left: Math.max(10, Math.min(position.x - 130, window.innerWidth - 320)),
  };

  return (
    <div
      style={style}
      className="fixed z-50 w-72 rounded-2xl border border-white/20 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white capitalize">
            {word}
          </span>
          {data?.partOfSpeech && (
            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 italic">
              {data.partOfSpeech}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          <span className="text-[11px] text-zinc-400">Carregando tradução...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Fonética & Áudio */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-indigo-400">
              {data?.phonetics || `/${word}/`}
            </span>
            <button
              onClick={playPronunciation}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 active:scale-95 transition-all"
              title="Ouvir pronúncia"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Ouvir</span>
            </button>
          </div>

          {/* Tradução */}
          <div className="rounded-xl bg-white/5 p-2.5 border border-white/5">
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
              Significado em Português
            </p>
            <p className="text-sm font-semibold text-emerald-400">
              {data?.translationPt || "Tradução contextual"}
            </p>
          </div>

          {/* Definição em inglês (se houver) */}
          {data?.definitionEn && (
            <p className="text-xs text-zinc-400 line-clamp-2 italic">
              "{data.definitionEn}"
            </p>
          )}

          {saveError && (
            <p className="text-[11px] text-red-400">{saveError}</p>
          )}

          {/* Ação: Salvar no Vocabulário com Validação de Login */}
          <button
            onClick={handleSaveWord}
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
              saved
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : user
                ? "bg-white/10 text-white hover:bg-white/20 active:scale-98"
                : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25"
            }`}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Salva no seu Caderno!</span>
              </>
            ) : !user ? (
              <>
                <Lock className="h-3.5 w-3.5 text-indigo-400" />
                <span>Entrar para Salvar Palavra</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="h-3.5 w-3.5 text-indigo-400" />
                <span>Salvar no Meu Vocabulário</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
