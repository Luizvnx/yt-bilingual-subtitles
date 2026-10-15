"use client";

import React, { useEffect, useState } from "react";
import { Volume2, BookmarkPlus, X, Loader2, Check } from "lucide-react";

interface WordPopoverProps {
  word: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function WordPopover({ word, position, onClose }: WordPopoverProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!word) return;
    setLoading(true);
    setSaved(false);

    fetch(`/api/dictionary/lookup?word=${encodeURIComponent(word)}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => {
        setData({ word, translationPt: word });
        setLoading(false);
      });
  }, [word]);

  if (!position) return null;

  const playPronunciation = () => {
    if (data?.audioUrl) {
      const audio = new Audio(data.audioUrl);
      audio.play();
    } else {
      // Fallback para Web Speech API nativa do navegador
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSaveWord = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Ajusta a posição para não vazar da tela
  const style: React.CSSProperties = {
    top: Math.max(10, Math.min(position.y + 15, window.innerHeight - 250)),
    left: Math.max(10, Math.min(position.x - 120, window.innerWidth - 300)),
  };

  return (
    <div
      style={style}
      className="fixed z-50 w-72 rounded-2xl border border-white/20 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white capitalize">{word}</span>
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
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
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
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
              title="Ouvir pronúncia nativa"
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

          {/* Ação: Salvar */}
          <button
            onClick={handleSaveWord}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${
              saved
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-white/10 text-white hover:bg-white/20 active:scale-98"
            }`}
          >
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Salva no Caderno!</span>
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
