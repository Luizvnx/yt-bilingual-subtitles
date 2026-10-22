"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { SubtitleStudio } from "@/components/SubtitleStudio";
import { WordPopover } from "@/components/WordPopover";
import { AuthModal } from "@/components/AuthModal";
import { VocabularyModal } from "@/components/VocabularyModal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { LegalModal, LegalModalTab } from "@/components/LegalModal";
import { HistoryGrid } from "@/components/HistoryGrid";
import { CuratedCatalog, ALL_LESSONS } from "@/components/CuratedCatalog";
import { LevelUpCelebrationModal } from "@/components/LevelUpCelebrationModal";
import { StageDebugBar } from "@/components/StageDebugBar";
import {
  getUserGamification,
  saveUserGamification,
  cleanupLegacyGamification,
} from "@/lib/gamification";
import { VideoRecord } from "@/lib/security";
import { fetchWithAuth, getClientAuthHeaders } from "@/lib/apiClient";
import {
  Sparkles,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Crown,
  Zap,
  Clipboard,
  Cpu,
  ArrowRight,
  Flame,
  LayoutGrid,
  Tv,
  BookOpen,
  Keyboard,
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

  // Estado de Autenticação, Quotas e Modais
  const [user, setUser] = useState<any>(null);
  const [usage, setUsage] = useState<{
    videosUsed: number;
    videosLimit: number;
    minutesUsed: number;
    month: string;
  } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [vocabModalOpen, setVocabModalOpen] = useState(false);
  const [studioLayout, setStudioLayout] = useState<"split" | "theater" | "focus">("split");

  // Atalhos de teclado no Estúdio (R para repetir frase atual)
  useEffect(() => {
    if (!currentVideo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        const currentSeg = currentVideo.segments?.find(
          (s) => currentTime >= s.start && currentTime <= s.end
        );
        if (currentSeg) {
          handleSeek(currentSeg.start);
        } else if (currentTime > 0) {
          handleSeek(Math.max(0, currentTime - 3));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentVideo, currentTime]);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalModalTab>("terms");

  // Referência para o player do YouTube
  const playerRef = useRef<any>(null);

  // Estados e controle da Animação de Fim de Vídeo / XP / Level Up
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    earnedXp: number;
    previousXp: number;
    newXp: number;
    lessonTitle: string;
    streak: number;
    nextLesson?: any;
  } | null>(null);
  const celebratedVideoRef = useRef<string | null>(null);

  // Reseta guard quando um novo vídeo é selecionado
  useEffect(() => {
    celebratedVideoRef.current = null;
  }, [currentVideo?.videoId]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/subtitles/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.videos || []);
      }
    } catch { }
  };

  const fetchUserAndUsage = async () => {
    try {
      const res = await fetchWithAuth("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data?.token && typeof window !== "undefined") {
          try {
            localStorage.setItem("ytsubs_auth_token", data.token);
          } catch {}
        }
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
          cleanupLegacyGamification();
        }
        if (data?.usage) setUsage(data.usage);
      } else {
        setUser(null);
        cleanupLegacyGamification();
      }
    } catch {
      setUser(null);
      cleanupLegacyGamification();
    }
  };

  // Carrega usuário atual, quotas e histórico ao montar a página
  useEffect(() => {
    // 1. Checa sessão e quotas atuais (via Cookie HTTP-Only)
    fetchUserAndUsage();

    // 2. Carrega histórico de vídeos
    fetchHistory();

    // 3. Checa parâmetros de retorno na URL (erros ou notificações de autenticação/pagamento)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const authErr = params.get("auth_error");
      const billingStatus = params.get("billing");

      if (authErr) {
        if (authErr === "google_credentials_missing") {
          setAuthMessage(
            "Para conectar sua conta real do Google com foto e nome, insira suas credenciais GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no arquivo .env da sua VPS/aplicação."
          );
        } else {
          setAuthMessage(`Não foi possível autenticar com o Google: ${authErr}`);
        }
        setAuthModalOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (billingStatus === "success") {
        fetchUserAndUsage();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
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

  const handleProcess = async (
    e?: React.FormEvent,
    overrideUrl?: string
  ) => {
    if (e) e.preventDefault();
    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl) return;

    if (overrideUrl) {
      setUrl(targetUrl);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setLoading(true);
    setErrorMessage("");
    setProgressStage(5);
    setProgressStatus("Iniciando canal de streaming com o YouTube...");

    const savedToken =
      typeof window !== "undefined"
        ? localStorage.getItem("ytsubs_auth_token") || ""
        : "";
    const tokenParam = savedToken ? `&token=${encodeURIComponent(savedToken)}` : "";

    const streamUrl = `/api/subtitles/stream?url=${encodeURIComponent(
      targetUrl
    )}&model=${encodeURIComponent(model)}${tokenParam}`;

    const es = new EventSource(streamUrl, { withCredentials: true });
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
        fetchUserAndUsage();
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
          if (data.requireUpgrade || data.code === "QUOTA_EXCEEDED" || data.code === "DURATION_EXCEEDED") {
            setUpgradeModalOpen(true);
          }
          setLoading(false);
          return;
        }
      } catch { }

      // Se foi desconexão transitória do streaming, tenta recuperar diretamente via endpoint REST
      setProgressStatus("Sincronizando estúdio com o servidor...");
      try {
        const fallbackRes = await fetchWithAuth("/api/subtitles/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl, model }),
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
          fetchUserAndUsage();
          setLoading(false);
          setTimeout(() => {
            document.getElementById("studio-section")?.scrollIntoView({
              behavior: "smooth",
            });
          }, 150);
          return;
        } else if (fallbackData.error) {
          setErrorMessage(fallbackData.error);
          if (fallbackData.requireUpgrade || fallbackData.code === "QUOTA_EXCEEDED" || fallbackData.code === "DURATION_EXCEEDED") {
            setUpgradeModalOpen(true);
          } else if (fallbackData.requireAuth) {
            setAuthModalOpen(true);
          }
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

  const handleAlternativeSwitched = async (newVideoId: string) => {
    if (!newVideoId || newVideoId === currentVideo?.videoId) return;
    try {
      const res = await fetch(`/api/subtitles/${newVideoId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.segments && data.segments.length > 1) {
          setCurrentVideo((prev) =>
            prev
              ? {
                  ...prev,
                  embedVideoId: newVideoId,
                  segments: data.segments,
                }
              : prev
          );
        }
      }
    } catch {}
  };

  // Rastreamento de tempo atual de reprodução
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  // Disparo da Animação de Fim de Vídeo, XP Ring e Subida de Nível
  const handleVideoEnded = () => {
    if (!currentVideo) return;
    if (celebratedVideoRef.current === currentVideo.videoId) return;
    celebratedVideoRef.current = currentVideo.videoId;

    // Identifica se faz parte do catálogo curado ou da trilha Duolingo
    const lessonIndex = ALL_LESSONS.findIndex(
      (l) => l.videoId === currentVideo.videoId || l.url === currentVideo.url
    );
    const lesson = lessonIndex !== -1 ? ALL_LESSONS[lessonIndex] : null;
    const nextLesson =
      lessonIndex !== -1 && lessonIndex + 1 < ALL_LESSONS.length
        ? ALL_LESSONS[lessonIndex + 1]
        : null;

    const earnedXp = lesson?.xp || 35;
    let prevXp = 0;
    let currentStreak = 0;

    if (user?.id) {
      try {
        const stats = getUserGamification(user.id);
        prevXp = stats.xp;
        currentStreak = stats.streak;
        const newXp = prevXp + earnedXp;
        const completedSet = new Set(stats.completedIds);
        if (lesson?.id) completedSet.add(lesson.id);
        completedSet.add(currentVideo.videoId);

        saveUserGamification(user.id, {
          xp: newXp,
          streak: currentStreak,
          completedIds: completedSet,
        });
      } catch (err) {
        console.warn("[page] Falha ao persistir XP do usuário:", err);
      }
    }

    setCelebrationData({
      earnedXp,
      previousXp: prevXp,
      newXp: prevXp + earnedXp,
      lessonTitle: lesson?.title || currentVideo.title || "Lição Concluída",
      streak: currentStreak || 1,
      nextLesson,
    });
    setCelebrationOpen(true);
  };

  const handleWordClick = (word: string, e: React.MouseEvent) => {
    setPopoverWord(word);
    setPopoverPos({ x: e.clientX, y: e.clientY });
  };

  const handleLogout = async () => {
    try {
      await fetchWithAuth("/api/auth/logout", { method: "POST" });
    } catch { }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("ytsubs_auth_token");
        cleanupLegacyGamification();
        window.dispatchEvent(
          new CustomEvent("ytsubs_xp_updated", { detail: { xp: 0, streak: 0 } })
        );
        window.dispatchEvent(
          new CustomEvent("ytsubs_lesson_completed", {})
        );
      } catch {}
    }
    setUser(null);
    setUsage(null);
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
        onOpenUpgrade={() => setUpgradeModalOpen(true)}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto pt-4 sm:pt-8 relative">
          {/* Top Token Badge */}
          <div className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-indigo-500/15 via-zinc-900/90 to-zinc-950 border border-indigo-500/30 border-b-[3px] border-b-indigo-600 px-4 py-1.5 shadow-[0_4px_16px_rgba(99,102,241,0.25)] select-none">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="font-display font-black text-xs text-indigo-200 tracking-wide">
              Estúdio Inteligente de Imersão em Inglês
            </span>
          </div>

          {/* Headline with Ambient Nebula Glow */}
          <div className="relative">
            <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-[550px] h-[220px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/20 to-pink-500/15 blur-3xl rounded-full" />
            <h1 className="relative text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-white leading-[1.15]">
              Aprenda inglês com o que você{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
                ama assistir
              </span>
            </h1>
          </div>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto font-medium">
            Cole o link de qualquer vídeo do YouTube. Obtenha legendas bilíngues
            sincronizadas, dicionário instantâneo com pronúncia nativa e caderno de vocabulário.
          </p>

          {/* Prompt Box de Entrada estilo Gemini / Perplexity */}
          <form
            onSubmit={handleProcess}
            className="mt-6 rounded-3xl border border-white/15 bg-[#0B0D14]/90 p-3 sm:p-4 shadow-[0_16px_48px_rgba(0,0,0,0.8)] backdrop-blur-2xl specular-top focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-[border-color,box-shadow] duration-200 text-left"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full flex items-center">
                <input
                  type="text"
                  required
                  placeholder="Cole o link do YouTube (ex: https://www.youtube.com/watch?v=...)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-2xl bg-transparent px-4 py-3.5 pr-20 text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setUrl(text.trim());
                    } catch {}
                  }}
                  className="absolute right-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:translate-y-0.5 border border-white/10 text-[11px] font-semibold text-zinc-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                  title="Colar link da área de transferência"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  <span>Colar</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 px-7 py-3.5 font-display font-black text-sm text-white shadow-[0_6px_20px_rgba(99,102,241,0.4)] border border-indigo-400/30 border-b-[4px] border-b-indigo-800 hover:brightness-110 active:translate-y-0.5 active:border-b-2 disabled:opacity-50 transition-all cursor-pointer shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processando IA...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                    <span>Gerar Estúdio</span>
                  </>
                )}
              </button>
            </div>

            {/* Rodapé do Input Card: Seletor de Modo de Transcrição Amigável */}
            <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-zinc-300">Modo de Transcrição:</span>
                </div>
                <div className="inline-flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                  {[
                    { id: "base", label: "Equilibrado (Recomendado)", note: "Melhor equilíbrio: rápido e com alta precisão" },
                    { id: "tiny", label: "Ultra Rápido", note: "Processamento instantâneo para falas nítidas" },
                    { id: "small", label: "Alta Precisão", note: "Mais detalhado para vocabulário técnico e sotaques" },
                  ].map((m) => {
                    const isSelected = model === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModel(m.id)}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-display font-bold transition-colors cursor-pointer border-b-2 flex items-center justify-center ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm border-indigo-800"
                            : "text-zinc-400 hover:text-white hover:bg-white/5 border-transparent"
                        }`}
                        title={m.note}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 font-medium">
                Sincronização bilíngue PT/EN instantânea
              </div>
            </div>
          </form>

          {/* Inspiration Quick-Chips */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-zinc-500">
              Vídeos de exemplo:
            </span>
            {[
              {
                label: "TED: How Language Shapes Thought",
                url: "https://www.youtube.com/watch?v=RKK7wGAYP6k",
              },
              {
                label: "Veritasium: Math & Physics",
                url: "https://www.youtube.com/watch?v=bhi5GuHl91U",
              },
              {
                label: "BBC: Daily English",
                url: "https://www.youtube.com/watch?v=36YnV9STBqc",
              },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setUrl(chip.url);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 border-b-[2px] border-b-zinc-800 hover:border-indigo-500/40 text-[11px] font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <span>{chip.label}</span>
                <ArrowRight className="h-3 w-3 text-indigo-400" />
              </button>
            ))}
          </div>

          {/* Indicador de Quota para Usuários Gratuitos */}
          {user && user.tier !== "pro" && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
              <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 border-b-[3px] border-b-zinc-850 bg-[#0B0D14] px-4 py-2 text-xs text-zinc-300 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-400">Vídeos gratuitos hoje:</span>
                  <span className="font-display font-black text-white text-sm">
                    {(usage as any)?.dailyVideosUsed || 0}/2
                  </span>
                  <div className="flex items-center gap-1.5 ml-1">
                    {[0, 1].map((idx) => {
                      const isFilled =
                        ((usage as any)?.dailyVideosUsed || 0) > idx;
                      return (
                        <div
                          key={idx}
                          className={`h-2 w-4 rounded-md transition-all ${
                            isFilled
                              ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                              : "bg-zinc-800"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
                <span className="text-zinc-600">•</span>
                <button
                  type="button"
                  onClick={() => setUpgradeModalOpen(true)}
                  className="font-display font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                >
                  Ilimitado no PRO →
                </button>
              </div>
            </div>
          )}

          {!user && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 border-b-[3px] border-b-zinc-850 bg-[#0B0D14] px-4 py-2 text-center text-xs text-zinc-300 shadow-md">
              <span>Experimente vídeos gratuitamente ou</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMessage("");
                    setAuthModalOpen(true);
                  }}
                  className="font-display font-black text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  conecte sua conta
                </button>
                <span className="hidden xs:inline">para salvar seu progresso e histórico</span>
              </div>
            )}

          {/* Barra de Progresso e Status em Tempo Real 3D */}
          {loading && (
            <div className="mt-4 rounded-3xl border border-indigo-500/40 border-b-[4px] border-b-indigo-700 bg-gradient-to-b from-indigo-500/10 via-[#0B0D14] to-[#070A0F] p-4 sm:p-5 text-left space-y-3 shadow-[0_8px_32px_rgba(99,102,241,0.25)] animate-in fade-in duration-200 specular-top">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.8)] border-b border-indigo-700">
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  </div>
                  <div>
                    <p className="font-display font-black text-sm text-white">
                      {progressStatus || "Processando áudio e gerando legendas..."}
                    </p>
                    <p className="text-[11px] text-indigo-300/80 font-medium">
                      Inteligência Artificial Whisper detectando falas nativas
                    </p>
                  </div>
                </div>
                <span className="font-display font-black text-xl text-indigo-400">
                  {progressStage}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-900 border border-white/10 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(99,102,241,0.8)] transition-all duration-500 ease-out"
                  style={{ width: `${progressStage}%` }}
                />
              </div>
            </div>
          )}

          {/* Alerta de Erro com Card 3D */}
          {errorMessage && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-red-500/40 border-b-[4px] border-b-red-700 bg-gradient-to-b from-red-500/15 via-[#0B0D14] to-[#070A0F] p-4 text-left shadow-[0_6px_24px_rgba(239,68,68,0.2)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.7)] shrink-0 border-b border-red-700">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-red-200 leading-relaxed">
                  {errorMessage}
                </span>
              </div>
              {/(plano pro|quota|limite|minutos|upgrade)/i.test(errorMessage) && (
                <button
                  type="button"
                  onClick={() => setUpgradeModalOpen(true)}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-b from-amber-500 to-amber-600 border-b-[3px] border-b-amber-700 text-zinc-950 font-display font-black text-xs px-3.5 py-2 shadow-md hover:brightness-110 active:translate-y-0.5 active:border-b transition-all cursor-pointer"
                >
                  <Crown className="h-3.5 w-3.5 fill-current" />
                  <span>Conhecer o Plano PRO</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* Estúdio Interativo de Estudo (Quando um vídeo estiver ativo) */}
        {currentVideo && (
          <section id="studio-section" className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {currentVideo.title}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {currentVideo.uploader} • {currentVideo.segmentsCount} frases sincronizadas
                </p>
              </div>

              {/* Alternador de Modo de Layout do Estúdio */}
              <div className="flex items-center gap-1 bg-[#090C15] p-1 rounded-2xl border border-white/10 shadow-inner text-xs">
                <button
                  type="button"
                  onClick={() => setStudioLayout("split")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-display font-bold transition-all cursor-pointer ${
                    studioLayout === "split"
                      ? "bg-indigo-600 text-white shadow-md border-b-2 border-indigo-800"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Modo Dividido: Vídeo e legendas lado a lado"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Dividido</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudioLayout("theater")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-display font-bold transition-all cursor-pointer ${
                    studioLayout === "theater"
                      ? "bg-indigo-600 text-white shadow-md border-b-2 border-indigo-800"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Modo Cinema: Vídeo ampliado no topo e legendas abaixo"
                >
                  <Tv className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cinema</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudioLayout("focus")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-display font-bold transition-all cursor-pointer ${
                    studioLayout === "focus"
                      ? "bg-indigo-600 text-white shadow-md border-b-2 border-indigo-800"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Modo Foco Leitura: Transcrição ampla para estudo profundo"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Foco Leitura</span>
                </button>
              </div>
            </div>

            {/* Aviso se o vídeo possuir pouca ou nenhuma fala detectada */}
            {(currentVideo.hasRealSpeech === false || currentVideo.segmentsCount <= 1) && (
              <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm">
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">
                    Aviso: Poucas ou nenhuma fala detectada neste vídeo
                  </p>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Este conteúdo possui apenas música ou efeitos sonoros sem diálogos falados. Para treinar sua audição, shadowing e vocabulário com máxima eficácia, recomendamos escolher vídeos de diálogos reais no catálogo curado abaixo.
                  </p>
                </div>
              </div>
            )}

            {/* Layout Dinâmico: Split vs Cinema vs Foco */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start w-full">
              {/* Coluna do Player YouTube */}
              <div
                className={`w-full transition-all ${
                  studioLayout === "theater"
                    ? "lg:col-span-12 max-w-4xl mx-auto"
                    : studioLayout === "focus"
                    ? "lg:col-span-4"
                    : "lg:col-span-7"
                }`}
              >
                <YouTubePlayer
                  videoId={currentVideo.videoId}
                  embedVideoId={
                    currentVideo.embedVideoId ||
                    (currentVideo.videoId === "kPa7bsKwL-c"
                      ? "zgaCZOQCpp8"
                      : currentVideo.videoId === "k2qgadSvNyU"
                      ? "ClhLNUPqv8Q"
                      : undefined)
                  }
                  title={currentVideo.title}
                  segments={currentVideo.segments}
                  currentTime={currentTime}
                  onTimeUpdate={handleTimeUpdate}
                  playerRef={playerRef}
                  onAlternativeSwitched={handleAlternativeSwitched}
                  onVideoEnded={handleVideoEnded}
                />
              </div>

              {/* Coluna da Transcrição Lateral Interativa */}
              <div
                className={`w-full transition-all ${
                  studioLayout === "theater"
                    ? "lg:col-span-12 h-[450px]"
                    : studioLayout === "focus"
                    ? "lg:col-span-8 h-[600px]"
                    : "lg:col-span-5 h-[420px] sm:h-[500px] lg:h-[540px]"
                }`}
              >
                <SubtitleStudio
                  segments={currentVideo.segments}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  onWordClick={handleWordClick}
                  videoId={currentVideo.videoId}
                  videoTitle={currentVideo.title}
                  user={user}
                  onOpenAuth={() => {
                    setAuthMessage("Faça login ou crie sua conta para acessar o Quiz com IA.");
                    setAuthModalOpen(true);
                  }}
                  onOpenUpgrade={() => setUpgradeModalOpen(true)}
                />
              </div>
            </div>

            {/* Barra de Atalhos de Teclado Rápida para o Estudante */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 py-2 px-4 rounded-2xl bg-white/[0.03] border border-white/5 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <Keyboard className="h-3.5 w-3.5 text-indigo-400" />
                <span>Atalhos de Teclado:</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px] border border-white/10 shadow-sm">
                  R
                </kbd>
                <span>Repetir Frase</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px] border border-white/10 shadow-sm">
                  Espaço
                </kbd>
                <span>Play / Pausa</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1">
                <span className="text-indigo-400 font-bold">1-Clique</span>
                <span>no texto abre Dicionário & Áudio Nativo</span>
              </span>
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
            onRequireUpgrade={() => setUpgradeModalOpen(true)}
          />
        )}

        {/* Catálogo Curado por Níveis ("O Que Estudar Hoje?") */}
        <div id="catalog-section" className="border-t border-white/10 pt-8">
          <CuratedCatalog
            onSelectVideo={(videoUrl) => {
              handleProcess(undefined, videoUrl);
            }}
            isLoading={loading}
            user={user}
            onRequireLogin={(msg) => {
              setAuthMessage(
                msg ||
                  "Crie sua conta gratuita ou faça login para acessar os vídeos do catálogo."
              );
              setAuthModalOpen(true);
            }}
            onRequireUpgrade={() => setUpgradeModalOpen(true)}
          />
        </div>

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
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          fetchUserAndUsage();
          fetchHistory();
        }}
        initialMessage={authMessage}
      />

      {/* Modal do Caderno de Vocabulário */}
      <VocabularyModal
        isOpen={vocabModalOpen}
        onClose={() => setVocabModalOpen(false)}
        user={user}
      />

      {/* Modal de Planos e Assinatura PRO (Fase 5 do Roadmap) */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgradeSuccess={(newTier) => {
          if (user) setUser({ ...user, tier: newTier });
          fetchUserAndUsage();
        }}
        currentTier={user?.tier || "free"}
        isAuthenticated={!!user}
        onOpenAuth={() => {
          setAuthMessage("Faça login ou crie sua conta para assinar o Plano PRO.");
          setAuthModalOpen(true);
        }}
      />

      {/* Modal de Informações Legais, Termos e Suporte */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />

      {/* Modal Celebratório de Fim de Vídeo, XP Ring & Level Up */}
      {celebrationData && (
        <LevelUpCelebrationModal
          isOpen={celebrationOpen}
          onClose={() => setCelebrationOpen(false)}
          user={user}
          earnedXp={celebrationData.earnedXp}
          previousXp={celebrationData.previousXp}
          newXp={celebrationData.newXp}
          lessonTitle={celebrationData.lessonTitle}
          streak={celebrationData.streak}
          onContinue={() => {
            if (celebrationData.nextLesson) {
              handleProcess(undefined, celebrationData.nextLesson.url);
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              const el = document.getElementById("catalog-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }
          }}
          onReviewQuiz={() => {
            window.dispatchEvent(
              new CustomEvent("ytsubs_switch_tab", { detail: { tab: "quiz" } })
            );
            const el = document.getElementById("studio-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

      {/* Barra de Testes e Ferramentas QA (Ativa Exclusivamente em Stage) */}
      <StageDebugBar
        onTriggerCelebration={({ earnedXp, previousXp, newXp, title }) => {
          setCelebrationData({
            earnedXp,
            previousXp,
            newXp,
            lessonTitle: title,
            streak: parseInt(localStorage.getItem("ytsubs_streak") || "1", 10),
          });
          setCelebrationOpen(true);
        }}
      />

      {/* Rodapé Confiável e Profissional */}
      <footer className="border-t border-white/10 bg-black/60 py-10 text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-semibold text-zinc-300 text-sm">
                YT Bilingual Subtitles
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Plataforma de Imersão e Estudo Ativo com Vídeos Reais do YouTube
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab("terms");
                  setLegalModalOpen(true);
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Termos de Uso
              </button>
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab("privacy");
                  setLegalModalOpen(true);
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Privacidade (LGPD)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab("support");
                  setLegalModalOpen(true);
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Dúvidas & Suporte
              </button>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500 text-center sm:text-left">
            <p>
              © 2026 YT Bilingual Subtitles. Todos os direitos reservados.
            </p>
            <p className="text-[10px] text-zinc-600 max-w-md">
              Não afiliado ao Google LLC ou YouTube. As marcas, áudios e vídeos pertencem aos seus respectivos proprietários.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
