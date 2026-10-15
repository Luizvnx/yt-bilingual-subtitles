"use client";

import React, { useRef, useEffect, useState } from "react";
import { SubtitleSegment } from "@/lib/security";
import {
  Search,
  RotateCcw,
  Copy,
  Check,
  Play,
  Volume2,
  Sparkles,
} from "lucide-react";

interface SubtitleStudioProps {
  segments: SubtitleSegment[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  onWordClick: (word: string, event: React.MouseEvent) => void;
}

export function SubtitleStudio({
  segments,
  currentTime,
  onSeek,
  onWordClick,
}: SubtitleStudioProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Encontra o índice da frase atual
  const activeIndex = segments.findIndex(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  // Rolagem suave automática (*Auto-scroll*)
  useEffect(() => {
    if (!autoScroll || !activeSegmentRef.current || !scrollContainerRef.current)
      return;

    activeSegmentRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex, autoScroll]);

  // Filtro de busca
  const filteredSegments = segments.filter((seg) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      seg.text_en.toLowerCase().includes(term) ||
      seg.text_pt.toLowerCase().includes(term)
    );
  });

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const copyToAnki = (seg: SubtitleSegment, index: number) => {
    const text = `Front: ${seg.text_en}\nBack: ${seg.text_pt}\nTime: ${formatTime(
      seg.start
    )}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Divide o texto da frase em palavras individuais interativas
  const renderInteractiveSentence = (text: string) => {
    const tokens = text.split(/(\s+|[.,!?;:"'()]+)/);
    return tokens.map((token, idx) => {
      const isWord = /^[a-zA-Z0-9'-]+$/.test(token);
      if (!isWord) {
        return <span key={idx}>{token}</span>;
      }
      return (
        <span
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            onWordClick(token, e);
          }}
          className="cursor-pointer rounded px-0.5 hover:bg-indigo-500/30 hover:text-indigo-200 hover:underline transition-colors decoration-indigo-400 underline-offset-2"
          title="Clique para traduzir, ouvir pronúncia e salvar"
        >
          {token}
        </span>
      );
    });
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-zinc-950/70 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Topo do Studio: Busca e Opções */}
      <div className="border-b border-white/10 p-4 space-y-3 bg-zinc-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Transcrição Bilíngue Interativa
            </h3>
          </div>
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-zinc-400 border border-white/5">
            {segments.length} frases
          </span>
        </div>

        {/* Input de Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar palavra ou frase (inglês ou português)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Toggle Auto-scroll */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-0"
            />
            <span>Rolagem automática (*Auto-scroll*)</span>
          </label>
          <span className="text-[11px] text-zinc-500">
            Dica: clique em qualquer palavra para abrir o dicionário
          </span>
        </div>
      </div>

      {/* Lista de Frases Sincronizadas */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-white/5"
      >
        {filteredSegments.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            Nenhuma frase encontrada para a busca informada.
          </div>
        ) : (
          filteredSegments.map((seg, idx) => {
            const isActive =
              currentTime >= seg.start && currentTime <= seg.end;
            return (
              <div
                key={idx}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => onSeek(seg.start)}
                className={`group relative rounded-2xl p-3.5 transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-transparent border-l-4 border-l-indigo-500 pl-4 shadow-lg shadow-indigo-500/10"
                    : "hover:bg-white/5 border-l-4 border-l-transparent"
                }`}
              >
                {/* Linha Superior: Timestamp e Ações */}
                <div className="flex items-center justify-between mb-1.5 text-xs text-zinc-400">
                  <span
                    className={`font-mono text-[11px] ${
                      isActive ? "text-indigo-400 font-bold" : "text-zinc-500"
                    }`}
                  >
                    {formatTime(seg.start)} - {formatTime(seg.end)}
                  </span>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Shadowing / Repetir Frase */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(seg.start);
                      }}
                      className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                      title="Repetir esta frase (Shadowing)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>

                    {/* Copiar para o Anki */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToAnki(seg, idx);
                      }}
                      className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                      title="Copiar par bilíngue para o Anki"
                    >
                      {copiedIndex === idx ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Frase em Inglês com palavras clicáveis */}
                <p
                  className={`text-sm font-semibold leading-relaxed tracking-wide ${
                    isActive ? "text-white" : "text-zinc-200"
                  }`}
                >
                  {renderInteractiveSentence(seg.text_en)}
                </p>

                {/* Frase em Português */}
                <p className="text-xs font-medium text-emerald-400/90 mt-1 leading-normal">
                  {seg.text_pt}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
