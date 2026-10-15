"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { SubtitleStudio } from "@/components/SubtitleStudio";
import { WordPopover } from "@/components/WordPopover";
import { AuthModal } from "@/components/AuthModal";
import { VocabularyModal } from "@/components/VocabularyModal";
import { HistoryGrid } from "@/components/HistoryGrid";
import { VideoRecord } from "@/lib/security";
import {
  Sparkles,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [model, setModel] = useState("base");
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentVideo, setCurrentVideo] = useState<VideoRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [history, setHistory] = useState<VideoRecord[]>([]);

  // Estado do Popover do Dicionário
  const [popoverWord, setPopoverWord] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // Estado de Autenticação e Modais
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [vocabModalOpen, setVocabModalOpen] = useState(false);

  // Referência para o player do YouTube
  const playerRef = useRef<any>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/subtitles/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.videos || []);
      }
    } catch { }
  };

  // Carrega usuário atual e histórico ao montar a página
  useEffect(() => {
    // 1. Checa sessão atual (via Cookie HTTP-Only)
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => { });

    // 2. Carrega histórico de vídeos
    fetchHistory();
  }, []);

  // Referência para conexão de streaming Server-Sent Events (SSE)
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fecha conexão SSE ao desmontar
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setLoading(true);
    setErrorMessage("");
    setProgressStage(5);
    setProgressStatus("Iniciando canal de streaming com o YouTube...");

    const streamUrl = `/api/subtitles/stream?url=${encodeURIComponent(
      url.trim()
    )}&model=${encodeURIComponent(model)}`;

    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;
    let isCompleted = false;

    es.addEventListener("progress", (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgressStage(data.stage || 50);
        setProgressStatus(data.message || "Processando vídeo...");
      } catch { }
    });

    es.addEventListener("complete", (event) => {
      try {
        isCompleted = true;
        const data = JSON.parse(event.data);

        // Fecha a conexão do stream imediatamente para evitar que o navegador dispare onerror no fechamento
        es.close();
        eventSourceRef.current = null;

        setProgressStage(100);
        setProgressStatus(data.message || "Estúdio pronto!");
        setErrorMessage("");
        setCurrentVideo(data.video);
        setCurrentTime(0);
        fetchHistory();
        setLoading(false);

        // Scroll suave até o estúdio de estudo
        setTimeout(() => {
          document.getElementById("studio-section")?.scrollIntoView({
            behavior: "smooth",
          });
        }, 150);
      } catch { }
    });

    es.addEventListener("error", async (event: any) => {
      // Se o processamento já concluiu com sucesso, ignora evento de encerramento
      if (isCompleted) return;

      es.close();
      eventSourceRef.current = null;

      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          setErrorMessage(data.error || "Erro no processamento.");
          setLoading(false);
          return;
        }
      } catch { }

      // Se foi desconexão transitória do streaming, tenta recuperar diretamente via endpoint REST
      setProgressStatus("Sincronizando estúdio com o servidor...");
      try {
        const fallbackRes = await fetch("/api/subtitles/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), model }),
        });
        const fallbackData = await fallbackRes.json();

        if (fallbackRes.ok && fallbackData.video) {
          isCompleted = true;
          setProgressStage(100);
          setProgressStatus("Estúdio pronto!");
          setErrorMessage("");
          setCurrentVideo(fallbackData.video);
          setCurrentTime(0);
          fetchHistory();
          setLoading(false);
          setTimeout(() => {
            document.getElementById("studio-section")?.scrollIntoView({
              behavior: "smooth",
            });
          }, 150);
          return;
        } else if (fallbackData.error) {
          setErrorMessage(fallbackData.error);
          setLoading(false);
          return;
        }
      } catch { }

      setErrorMessage("Falha de conexão com o servidor de legendas. Tente novamente.");
      setLoading(false);
    });
  };

  const handleSeek = (seconds: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(seconds, true);
    }
  };

  const handleWordClick = (word: string, e: React.MouseEvent) => {
    setPopoverWord(word);
    setPopoverPos({ x: e.clientX, y: e.clientY });
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch { }
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja realmente remover este vídeo do histórico?")) return;

    try {
      const res = await fetch(`/api/subtitles/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (currentVideo?.id === id) {
          setCurrentVideo(null);
        }
        fetchHistory();
      }
    } catch { }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white selection:bg-indigo-500 selection:text-white">
      {/* Navbar Superior */}
      <Navbar
        user={user}
        onOpenAuth={() => {
          setAuthMessage("");
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenVocabulary={() => {
          if (!user) {
            setAuthMessage(
              "Faça login ou crie sua conta para acessar seu caderno de vocabulário."
            );
            setAuthModalOpen(true);
          } else {
            setVocabModalOpen(true);
          }
        }}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto pt-4 sm:pt-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Estudo de Inglês com Vídeos Reais</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Aprenda inglês com o que você{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              ama assistir
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto">
            Cole o link de qualquer vídeo do YouTube. Obtenha legendas bilíngues
            sincronizadas, dicionário instantâneo com pronúncia nativa e caderno de vocabulário.
          </p>

          {/* Prompt Box de Entrada estilo Gemini / Perplexity */}
          <form
            onSubmit={handleProcess}
            className="mt-6 rounded-2xl sm:rounded-3xl border border-white/15 bg-white/5 p-2 shadow-2xl backdrop-blur-xl focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                required
                placeholder="Cole o link do YouTube (ex: https://www.youtube.com/watch?v=...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none"
              />

              <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2 px-2 pb-2 sm:p-0">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-zinc-300 focus:outline-none"
                >
                  <option value="base">Whisper Base (Rápido)</option>
                  <option value="tiny">Whisper Tiny (Ultra-rápido)</option>
                  <option value="small">Whisper Small (Mais preciso)</option>
                </select>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Gerar Estúdio</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Barra de Progresso e Status em Tempo Real */}
          {loading && (
            <div className="mt-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-left space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-300 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                  {progressStatus}
                </span>
                <span className="font-mono font-bold text-indigo-400">
                  {progressStage}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressStage}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center justify-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </section>

        {/* Estúdio Interativo de Estudo (Quando um vídeo estiver ativo) */}
        {currentVideo && (
          <section id="studio-section" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {currentVideo.title}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {currentVideo.uploader} • {currentVideo.segmentsCount} frases sincronizadas
                </p>
              </div>
            </div>

            {/* Layout Grid: Player à Esquerda, Studio à Direita */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Coluna do Player YouTube (7 de 12 colunas) */}
              <div className="lg:col-span-7">
                <YouTubePlayer
                  videoId={currentVideo.videoId}
                  segments={currentVideo.segments}
                  currentTime={currentTime}
                  onTimeUpdate={setCurrentTime}
                  playerRef={playerRef}
                />
              </div>

              {/* Coluna da Transcrição Lateral Interativa (5 de 12 colunas) */}
              <div className="lg:col-span-5 h-[480px] sm:h-[540px]">
                <SubtitleStudio
                  segments={currentVideo.segments}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  onWordClick={handleWordClick}
                />
              </div>
            </div>
          </section>
        )}

        {/* Popover Flutuante do Dicionário */}
        {popoverWord && (
          <WordPopover
            word={popoverWord}
            position={popoverPos}
            onClose={() => setPopoverWord(null)}
            user={user}
            onRequireLogin={() => {
              setAuthMessage(
                "Faça login ou crie sua conta para salvar palavras no seu vocabulário pessoal."
              );
              setAuthModalOpen(true);
            }}
          />
        )}

        {/* Seção de Biblioteca e Histórico */}
        <section id="history-section" className="space-y-4 pt-8 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Sua Biblioteca de Vídeos
            </h3>
            <span className="text-xs text-zinc-400">
              {history.length} vídeos salvos
            </span>
          </div>

          <HistoryGrid
            videos={history}
            onSelectVideo={(vid) => {
              setCurrentVideo(vid);
              setCurrentTime(0);
              window.scrollTo({ top: 350, behavior: "smooth" });
            }}
            onDeleteVideo={handleDeleteHistory}
          />
        </section>
      </main>

      {/* Modal de Autenticação com suporte a Google */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedUser) => setUser(loggedUser)}
        initialMessage={authMessage}
      />

      {/* Modal do Caderno de Vocabulário */}
      <VocabularyModal
        isOpen={vocabModalOpen}
        onClose={() => setVocabModalOpen(false)}
        user={user}
      />

      {/* Rodapé */}
      <footer className="border-t border-white/10 bg-black/40 py-6 text-center text-xs text-zinc-500">
        <p>
          YT Bilingual Subtitles • Estudo de Idiomas por Imersão com
          Inteligência Artificial
        </p>
      </footer>
    </div>
  );
}
