"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { SubtitleSegment } from "@/lib/security";
import {
  EyeOff,
  Languages,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Loader2,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT: any;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  embedVideoId?: string;
  title?: string;
  segments: SubtitleSegment[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  playerRef: React.MutableRefObject<any>;
}

export function YouTubePlayer({
  videoId,
  embedVideoId,
  title,
  segments,
  currentTime,
  onTimeUpdate,
  playerRef,
}: YouTubePlayerProps) {
  const [subMode, setSubMode] = useState<"bilingual" | "en" | "pt" | "none">(
    "bilingual"
  );

  // Determina o ID reproduzível inicial (se o clipe for restrito, já inicializa com o embedVideoId compatível)
  const initialPlayableId =
    embedVideoId || (videoId === "kPa7bsKwL-c" ? "zgaCZOQCpp8" : videoId);

  const [activeVideoId, setActiveVideoId] = useState(initialPlayableId);
  const [isUsingAlternative, setIsUsingAlternative] = useState(
    initialPlayableId !== videoId
  );
  const [altVideo, setAltVideo] = useState<{
    id: string;
    title: string;
    owner?: string;
  } | null>(
    initialPlayableId !== videoId
      ? { id: initialPlayableId, title: "Versão Sincronizada" }
      : null
  );
  const [isSearchingAlt, setIsSearchingAlt] = useState(false);
  const [hasEmbedRestriction, setHasEmbedRestriction] = useState(false);

  // Referência do container estável do DOM
  const containerRef = useRef<HTMLDivElement>(null);
  const playerIdRef = useRef("yt-player-target");

  // Duração máxima calculada com base no último segmento de legenda
  const maxDuration =
    segments && segments.length > 0
      ? Math.max(...segments.map((s) => s.end || 0)) + 5
      : 300;

  // Pré-busca versão alternativa sincronizada em segundo plano
  useEffect(() => {
    const targetId =
      embedVideoId || (videoId === "kPa7bsKwL-c" ? "zgaCZOQCpp8" : videoId);

    setActiveVideoId(targetId);
    setIsUsingAlternative(targetId !== videoId);
    setHasEmbedRestriction(false);

    if (targetId !== videoId) {
      setAltVideo({ id: targetId, title: "Versão Sincronizada" });
    }

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
  }, [videoId, embedVideoId, title]);

  // Função para alternar para a versão sem restrição de reprodução externa
  const switchToAlternative = useCallback(async () => {
    setIsSearchingAlt(true);
    try {
      let targetId = altVideo?.id;
      if (!targetId || targetId === videoId) {
        if (videoId === "kPa7bsKwL-c") {
          targetId = "zgaCZOQCpp8";
        } else {
          const res = await fetch(
            `/api/subtitles/alternative?v=${videoId}&title=${encodeURIComponent(
              title || ""
            )}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.success && data?.id && data.id !== videoId) {
              targetId = data.id;
              setAltVideo(data);
            }
          }
        }
      }

      if (targetId && targetId !== activeVideoId) {
        console.log(
          `[YouTubePlayer] Trocando dinamicamente para versão alternativa: ${targetId}`
        );
        setActiveVideoId(targetId);
        setIsUsingAlternative(true);
        setHasEmbedRestriction(false);
        setIsSearchingAlt(false);

        // Se o player já estiver instanciado no DOM, faz a troca direta
        if (
          playerRef.current &&
          typeof playerRef.current.loadVideoById === "function"
        ) {
          try {
            playerRef.current.loadVideoById(targetId);
            if (typeof playerRef.current.playVideo === "function") {
              playerRef.current.playVideo();
            }
            return true;
          } catch (e) {
            console.warn("[YouTubePlayer] loadVideoById falhou, reiniciando:", e);
          }
        }
        return true;
      }
    } catch (err) {
      console.warn("[YouTubePlayer] Erro na busca de alternativa:", err);
    }
    setIsSearchingAlt(false);
    return false;
  }, [altVideo, videoId, title, activeVideoId, playerRef]);

  // Carrega e gerencia o player do YouTube no iframe
  useEffect(() => {
    if (!activeVideoId) return;

    let pollInterval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      // Garante que o elemento HTML target exista dentro do container estável
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div id="${playerIdRef.current}" class="h-full w-full"></div>`;
      }

      try {
        const originUrl =
          typeof window !== "undefined" && window.location.origin
            ? window.location.origin
            : "http://localhost:3000";

        playerRef.current = new window.YT.Player(playerIdRef.current, {
          videoId: activeVideoId,
          playerVars: {
            autoplay: isUsingAlternative ? 1 : 0,
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
              if (pollInterval) clearInterval(pollInterval);
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
        console.warn("[YouTubePlayer] Erro ao instanciar player:", err);
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
  }, [activeVideoId, switchToAlternative, isUsingAlternative, playerRef, onTimeUpdate]);

  // Deriva o segmento de legenda ativo com base no tempo atual
  const activeSegment =
    segments?.find((s) => currentTime >= s.start && currentTime <= s.end) ||
    null;

  return (
    <div className="relative flex flex-col rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-zinc-950 overflow-hidden shadow-2xl w-full">
      {/* Top Banner de Status Anti-Bloqueio (quando versão sincronizada está ativa) */}
      {isUsingAlternative ? (
        <div className="flex items-center justify-between bg-zinc-900/90 border-b border-white/[0.08] px-3 sm:px-4 py-2 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-300 text-[11px] sm:text-xs">
              Áudio Sincronizado Ativo
            </span>
            <span className="hidden md:inline text-zinc-400 text-[11px]">
              (tempo e letra idênticos para estudo)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveVideoId(videoId);
                setIsUsingAlternative(false);
                if (playerRef.current?.loadVideoById) {
                  playerRef.current.loadVideoById(videoId);
                }
              }}
              className="text-[11px] text-zinc-400 hover:text-white transition-colors"
            >
              Vídeo Original
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <span>Abrir YT</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : altVideo ? (
        <div className="flex items-center justify-between bg-zinc-900/70 border-b border-white/[0.08] px-3 sm:px-4 py-1.5 text-xs">
          <span className="text-[11px] text-zinc-400 truncate max-w-[200px] sm:max-w-none">
            Se o vídeo oficial estiver bloqueado:
          </span>
          <button
            type="button"
            onClick={() => switchToAlternative()}
            disabled={isSearchingAlt}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-all shadow-sm shadow-indigo-600/20 shrink-0"
          >
            <RefreshCw
              className={`h-3 w-3 ${isSearchingAlt ? "animate-spin" : ""}`}
            />
            <span>{isSearchingAlt ? "Carregando..." : "Versão Compatível"}</span>
          </button>
        </div>
      ) : null}

      {/* Container de Vídeo IFrame Proporção 16:9 */}
      <div className="relative aspect-video w-full bg-black">
        {/* Container estável que nunca é destruído */}
        <div ref={containerRef} className="h-full w-full">
          <div id={playerIdRef.current} className="h-full w-full" />
        </div>

        {/* Loading Overlay com Design Glassmorphism da Identidade Visual */}
        {isSearchingAlt && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/85 backdrop-blur-md p-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-2.5" />
            <p className="text-sm font-semibold text-white">
              Conectando versão sincronizada...
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              Carregando áudio e letra compatíveis para suas legendas
            </p>
          </div>
        )}

        {/* Fallback Glassmorphic Discreto se tudo falhar */}
        {hasEmbedRestriction && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md p-6 text-center space-y-4">
            <div className="flex flex-col items-center max-w-sm space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Modo de Estudo Bilíngue</span>
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Reprodução externa restrita no clipe oficial
              </h3>
              <p className="text-xs text-zinc-400">
                Suas legendas e vocabulário estão 100% disponíveis ao lado.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => switchToAlternative()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Carregar Versão Sincronizada</span>
              </button>

              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-white/10 transition-colors"
              >
                <span>Assistir no YouTube</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Overlay de Legenda Dinâmica Flutuante sobre o vídeo */}
        {subMode !== "none" && activeSegment && !hasEmbedRestriction && (
          <div className="pointer-events-none absolute bottom-10 sm:bottom-12 inset-x-0 flex flex-col items-center justify-center px-3 sm:px-4">
            <div className="max-w-2xl rounded-xl sm:rounded-2xl bg-black/85 px-4 sm:px-6 py-2 sm:py-3 text-center shadow-2xl backdrop-blur-md border border-white/15 animate-in fade-in duration-200">
              {(subMode === "bilingual" || subMode === "en") && (
                <p className="text-sm sm:text-lg font-bold text-white tracking-wide leading-snug">
                  {activeSegment.text_en}
                </p>
              )}
              {(subMode === "bilingual" || subMode === "pt") && (
                <p className="text-xs sm:text-base font-medium text-emerald-400 mt-1 leading-snug">
                  {activeSegment.text_pt}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Barra de Controles de Exibição das Legendas no Vídeo (100% Responsiva) */}
      <div className="flex items-center justify-between border-t border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm px-3 sm:px-4 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Languages className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span className="font-semibold text-zinc-300 hidden sm:inline">
            Legendas:
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setSubMode("bilingual")}
            className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all ${
              subMode === "bilingual"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Bilíngue
          </button>
          <button
            type="button"
            onClick={() => setSubMode("en")}
            className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all ${
              subMode === "en"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="sm:hidden">EN</span>
            <span className="hidden sm:inline">Inglês</span>
          </button>
          <button
            type="button"
            onClick={() => setSubMode("pt")}
            className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all ${
              subMode === "pt"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="sm:hidden">PT</span>
            <span className="hidden sm:inline">Português</span>
          </button>
          <button
            type="button"
            onClick={() => setSubMode("none")}
            className={`rounded-lg p-1.5 font-semibold transition-all ${
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
