"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { SubtitleSegment } from "@/lib/security";
import {
  EyeOff,
  Languages,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Music2,
  RotateCw,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT: any;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  segments: SubtitleSegment[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  playerRef: React.MutableRefObject<any>;
}

export function YouTubePlayer({
  videoId,
  title,
  segments,
  currentTime,
  onTimeUpdate,
  playerRef,
}: YouTubePlayerProps) {
  const [subMode, setSubMode] = useState<"bilingual" | "en" | "pt" | "none">(
    "bilingual"
  );
  const [activeVideoId, setActiveVideoId] = useState(videoId);
  const [altVideo, setAltVideo] = useState<{
    id: string;
    title: string;
    owner?: string;
  } | null>(null);
  const [isUsingAlternative, setIsUsingAlternative] = useState(false);
  const [isSearchingAlt, setIsSearchingAlt] = useState(false);
  const [hasEmbedRestriction, setHasEmbedRestriction] = useState(false);
  const [isVirtualPlaying, setIsVirtualPlaying] = useState(false);

  // Duração máxima calculada com base no último segmento de legenda
  const maxDuration =
    segments && segments.length > 0
      ? Math.max(...segments.map((s) => s.end || 0)) + 5
      : 300;

  // Pré-busca versão alternativa sincronizada em segundo plano
  useEffect(() => {
    setActiveVideoId(videoId);
    setIsUsingAlternative(false);
    setHasEmbedRestriction(false);
    setAltVideo(null);
    setIsVirtualPlaying(false);

    if (!videoId) return;

    const controller = new AbortController();
    const queryTitle = title || "";

    fetch(
      `/api/subtitles/alternative?v=${videoId}&title=${encodeURIComponent(queryTitle)}`,
      { signal: controller.signal }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.id && data.id !== videoId) {
          setAltVideo(data);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [videoId, title]);

  // Função para alternar para a versão sem restrição de reprodução externa
  const switchToAlternative = useCallback(
    async (targetAlt?: { id: string; title: string }) => {
      setIsSearchingAlt(true);
      try {
        let target = targetAlt || altVideo;
        if (!target) {
          const res = await fetch(
            `/api/subtitles/alternative?v=${videoId}&title=${encodeURIComponent(
              title || ""
            )}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.id) {
              target = data;
              setAltVideo(data);
            }
          }
        }

        if (target && target.id && target.id !== activeVideoId) {
          console.log(
            `[YouTubePlayer] Trocando automaticamente para versão alternativa: ${target.id} (${target.title})`
          );
          setActiveVideoId(target.id);
          setIsUsingAlternative(true);
          setHasEmbedRestriction(false);
          setIsSearchingAlt(false);

          if (
            playerRef.current &&
            typeof playerRef.current.loadVideoById === "function"
          ) {
            playerRef.current.loadVideoById(target.id);
          }
          return true;
        }
      } catch (err) {
        console.warn("[YouTubePlayer] Falha ao alternar versão:", err);
      }
      setIsSearchingAlt(false);
      return false;
    },
    [altVideo, videoId, title, activeVideoId, playerRef]
  );

  // Carrega a API do YouTube IFrame sob demanda com proteção anti-restrição
  useEffect(() => {
    if (!activeVideoId) return;

    let pollInterval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      // Destrói instância anterior se existir
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch {}
      }

      try {
        const originUrl =
          typeof window !== "undefined" && window.location.origin
            ? window.location.origin
            : "http://localhost:3000";

        playerRef.current = new window.YT.Player("youtube-iframe-target", {
          videoId: activeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            fs: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: originUrl,
            widget_referrer: originUrl,
          },
          events: {
            onReady: () => {
              // Polling de sincronização em tempo real (100ms)
              pollInterval = setInterval(() => {
                if (
                  playerRef.current &&
                  typeof playerRef.current.getCurrentTime === "function"
                ) {
                  try {
                    const time = playerRef.current.getCurrentTime();
                    if (typeof time === "number" && !isNaN(time)) {
                      onTimeUpdate(time);
                    }
                  } catch {}
                }
              }, 100);
            },
            onError: async (event: any) => {
              const errorCode = event?.data;
              console.warn("[YouTubePlayer] Erro na reprodução:", errorCode);
              // Códigos 150, 101, 152, 153, 2: Restrição de reprodução externa imposta pela gravadora / VEVO
              if (
                errorCode === 150 ||
                errorCode === 101 ||
                errorCode === 152 ||
                errorCode === 153 ||
                errorCode === 2
              ) {
                const switched = await switchToAlternative();
                if (!switched) {
                  setHasEmbedRestriction(true);
                }
              }
            },
          },
        });
      } catch (err) {
        console.warn("[YouTubePlayer] Erro ao inicializar YT.Player:", err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existingScript = document.getElementById("youtube-iframe-script");
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-script";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [activeVideoId, switchToAlternative, playerRef, onTimeUpdate]);

  // Modo Virtual de Estudo: se absolutamente nenhuma versão estiver disponível
  useEffect(() => {
    if (!hasEmbedRestriction || !isVirtualPlaying) return;

    const timer = setInterval(() => {
      onTimeUpdate(Math.min(maxDuration, currentTime + 0.2));
    }, 200);

    return () => clearInterval(timer);
  }, [hasEmbedRestriction, isVirtualPlaying, currentTime, maxDuration, onTimeUpdate]);

  const handleVirtualSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(maxDuration, newTime));
    onTimeUpdate(clamped);
  };

  // Deriva o segmento de legenda ativo com base no tempo atual
  const activeSegment =
    segments?.find((s) => currentTime >= s.start && currentTime <= s.end) ||
    null;

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex flex-col rounded-3xl border border-white/10 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Barra de Status Inteligente Anti-Bloqueio */}
      {isUsingAlternative ? (
        <div className="flex items-center justify-between bg-emerald-950/80 border-b border-emerald-500/20 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">
              Versão Sincronizada Ativa
            </span>
            <span className="hidden sm:inline text-emerald-400/80 text-[11px]">
              (áudio e tempo idênticos ao videoclipe original)
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setActiveVideoId(videoId);
                setIsUsingAlternative(false);
                if (playerRef.current?.loadVideoById) {
                  playerRef.current.loadVideoById(videoId);
                }
              }}
              className="text-[11px] text-zinc-400 hover:text-white transition-colors underline"
            >
              Tentar Original
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-300 hover:text-white font-medium"
            >
              <span>YouTube</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : altVideo ? (
        <div className="flex items-center justify-between bg-zinc-900/90 border-b border-white/10 px-4 py-1.5 text-xs">
          <span className="text-[11px] text-zinc-400 truncate max-w-[280px] sm:max-w-none">
            Se o YouTube mostrar "Vídeo indisponível", use a versão sincronizada:
          </span>
          <button
            type="button"
            onClick={() => switchToAlternative()}
            disabled={isSearchingAlt}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-all shadow-md shadow-indigo-600/20 shrink-0"
          >
            <RefreshCw
              className={`h-3 w-3 ${isSearchingAlt ? "animate-spin" : ""}`}
            />
            <span>
              {isSearchingAlt ? "Conectando..." : "Carregar Sem Restrição"}
            </span>
          </button>
        </div>
      ) : null}

      {/* Container de Vídeo IFrame Proporção 16:9 */}
      <div className="relative aspect-video w-full bg-black">
        <div id="youtube-iframe-target" className="h-full w-full" />

        {/* Loading Overlay quando está trocando para alternativa */}
        {isSearchingAlt && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4 text-center">
            <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-bold text-white">
              Restrição detectada pela gravadora
            </p>
            <p className="text-xs text-zinc-300 mt-1 max-w-sm">
              Conectando versão alternativa sincronizada com áudio e tempo
              idênticos para o estudo...
            </p>
          </div>
        )}

        {/* Overlay Especial de Fallback: Quando absolutamente nenhuma alternativa puder ser reproduzida */}
        {hasEmbedRestriction && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-between bg-zinc-950/95 p-6 backdrop-blur-md text-center border border-amber-500/30">
            {/* Topo do Aviso */}
            <div className="flex flex-col items-center max-w-lg space-y-2 mt-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
                <Music2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Restrição da Gravadora / VEVO</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Reprodução externa bloqueada pela gravadora
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                A gravadora deste videoclipe desativou a exibição direta fora do
                YouTube oficial.{" "}
                <span className="text-emerald-400 font-medium">
                  Suas legendas bilíngues e vocabulário estão 100% prontos ao
                  lado!
                </span>
              </p>
            </div>

            {/* Painel Central com Controles de Sincronização da Letra */}
            <div className="w-full max-w-md bg-zinc-900/90 rounded-2xl p-4 border border-white/10 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-mono text-emerald-400 font-semibold">
                  {formatSeconds(currentTime)}
                </span>
                <span className="text-zinc-500 font-medium">
                  Sincronizador de Letra
                </span>
                <span className="font-mono">{formatSeconds(maxDuration)}</span>
              </div>

              {/* Barra de Progresso / Scrubber */}
              <input
                type="range"
                min={0}
                max={maxDuration}
                step={0.5}
                value={currentTime}
                onChange={(e) => handleVirtualSeek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              {/* Botões de Controle */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => handleVirtualSeek(currentTime - 5)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                  title="Voltar 5 segundos"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsVirtualPlaying(!isVirtualPlaying)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-lg ${
                    isVirtualPlaying
                      ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                  }`}
                >
                  {isVirtualPlaying ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span>Pausar Estudo</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Sincronizar Letra</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleVirtualSeek(currentTime + 5)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                  title="Avançar 5 segundos"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Ações Secundárias */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors border border-white/10"
              >
                <span>Ouvir Música no YouTube</span>
                <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
              </a>

              <button
                type="button"
                onClick={() => switchToAlternative()}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline transition-colors"
              >
                Buscar outra versão compatível
              </button>
            </div>
          </div>
        )}

        {/* Overlay de Legenda Dinâmica Flutuante sobre o vídeo */}
        {subMode !== "none" && activeSegment && !hasEmbedRestriction && (
          <div className="pointer-events-none absolute bottom-12 inset-x-0 flex flex-col items-center justify-center px-4">
            <div className="max-w-2xl rounded-2xl bg-black/85 px-6 py-3 text-center shadow-2xl backdrop-blur-md border border-white/15 animate-in fade-in duration-200">
              {(subMode === "bilingual" || subMode === "en") && (
                <p className="text-base sm:text-lg font-bold text-white tracking-wide leading-snug">
                  {activeSegment.text_en}
                </p>
              )}
              {(subMode === "bilingual" || subMode === "pt") && (
                <p className="text-sm sm:text-base font-medium text-emerald-400 mt-1 leading-snug">
                  {activeSegment.text_pt}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Barra de Controles de Exibição das Legendas no Vídeo */}
      <div className="flex items-center justify-between border-t border-white/10 bg-zinc-900/50 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <Languages className="h-4 w-4 text-indigo-400" />
          <span className="font-semibold text-zinc-300">Modo de Legendas:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSubMode("bilingual")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              subMode === "bilingual"
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Bilíngue (EN/PT)
          </button>
          <button
            onClick={() => setSubMode("en")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              subMode === "en"
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Apenas Inglês
          </button>
          <button
            onClick={() => setSubMode("pt")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
              subMode === "pt"
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Apenas Português
          </button>
          <button
            onClick={() => setSubMode("none")}
            className={`rounded-lg px-2 py-1 font-semibold transition-all ${
              subMode === "none"
                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
            title="Ocultar legendas no vídeo"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
