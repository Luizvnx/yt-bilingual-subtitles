"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  Volume2,
  Trash2,
  Loader2,
  Sparkles,
  Download,
  Check,
} from "lucide-react";

interface VocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export function VocabularyModal({
  isOpen,
  onClose,
  user,
}: VocabularyModalProps) {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingAnki, setDownloadingAnki] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    setLoading(true);

    fetch("/api/vocabulary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setWords(data?.words || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, user]);

  if (!isOpen) return null;

  const playWord = (word: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/vocabulary/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWords((prev) => prev.filter((w) => w.id !== id));
      }
    } catch {}
  };

  const handleDownloadApkg = async () => {
    try {
      setDownloadingAnki(true);
      const res = await fetch("/api/vocabulary/export/anki");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao gerar arquivo Anki.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meu_vocabulario_bilingual_subtitles.apkg";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err?.message || "Erro ao baixar baralho do Anki.");
    } finally {
      setDownloadingAnki(false);
    }
  };

  const handleExportAnkiTsv = () => {
    const tsv = words
      .map((w) => `${w.word}\t${w.translationPt}\t${w.phonetics || ""}`)
      .join("\n");
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/20 bg-zinc-950 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 mb-4 gap-3 pr-8 sm:pr-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md flex-shrink-0">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Meu Caderno de Vocabulário
              </h2>
              <p className="text-xs text-zinc-400">
                {words.length} palavras salvas para revisão
              </p>
            </div>
          </div>

          {words.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadApkg}
                disabled={downloadingAnki}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
                title="Baixar pacote oficial .apkg para abrir direto no Anki"
              >
                {downloadingAnki ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>Baixar Anki (.apkg)</span>
              </button>

              <button
                onClick={handleExportAnkiTsv}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition-colors"
                title="Copiar lista tabulada para colar em notas"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <span>Copiar TSV</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Lista de Palavras com Scroll */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
              <span className="text-xs text-zinc-400">Carregando seu vocabulário...</span>
            </div>
          ) : words.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              Você ainda não salvou nenhuma palavra. Clique em qualquer palavra durante a reprodução do vídeo para salvá-la aqui!
            </div>
          ) : (
            words.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3.5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => playWord(item.word)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 active:scale-95 transition-all"
                    title="Ouvir pronúncia"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white capitalize">
                        {item.word}
                      </span>
                      {item.phonetics && (
                        <span className="text-xs font-mono text-zinc-400">
                          {item.phonetics}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-emerald-400 mt-0.5">
                      {item.translationPt}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-red-400 transition-colors"
                  title="Remover do vocabulário"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
