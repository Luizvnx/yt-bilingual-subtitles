"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { SubtitleSegment } from "@/lib/security";
import {
  EyeOff,
  Languages,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Loader2,
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
  onAlternativeSwitched?: (newVideoId: string) => void;
  onVideoEnded?: () => void;
}

export function YouTubePlayer({
  videoId,
  embedVideoId,
  title,
  segments,
  currentTime,
  onTimeUpdate,
  playerRef,
  onAlternativeSwitched,
  onVideoEnded,
}: YouTubePlayerProps) {
  const [subMode, setSubMode] = useState<"bilingual" | "en" | "pt" | "none">(
    "bilingual"
  );

  // Determina o ID de vídeo inicial reproduzível
  const initialId =
    embedVideoId ||
    (videoId === "kPa7bsKwL-c"
      ? "zgaCZOQCpp8"
      : videoId === "k2qgadSvNyU"
      ? "ClhLNUPqv8Q"
      : videoId);

  const [activeVideoId, setActiveVideoId] = useState(initialId);
  const [isUsingAlternative, setIsUsingAlternative] = useState(
    initialId !== videoId
  );
  const [altVideo, setAltVideo] = useState<{
    id: string;
    title: string;
  } | null>(
    initialId !== videoId
      ? { id: initialId, title: "Versão Sincronizada" }
      : null
  );
  const [isSearchingAlt, setIsSearchingAlt] = useState(false);
  const [hasEmbedRestriction, setHasEmbedRestriction] = useState(false);

  // Circuit breaker estrito anti-loop infinito (máximo 2 tentativas automáticas)
  const retryCountRef = useRef(0);
  const isSwitchingRef = useRef(false);
  // Registra apenas IDs que comprovadamente falharam com onError
  const failedVideoIdsRef = useRef<Set<string>>(new Set());

  // Callback ref para onTimeUpdate
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  // Callback ref e deduplicação de fim de vídeo
  const onVideoEndedRef = useRef(onVideoEnded);
  onVideoEndedRef.current = onVideoEnded;
  const endedFiredRef = useRef(false);

  // Atualiza activeVideoId se as props externas mudarem (ex: escolha de outra música na biblioteca)
  useEffect(() => {
    const target =
      embedVideoId ||
      (videoId === "kPa7bsKwL-c"
        ? "zgaCZOQCpp8"
        : videoId === "k2qgadSvNyU"
        ? "ClhLNUPqv8Q"
        : videoId);

    setActiveVideoId(target);
    setIsUsingAlternative(target !== videoId);
    setHasEmbedRestriction(false);
    retryCountRef.current = 0;
    isSwitchingRef.current = false;
    failedVideoIdsRef.current = new Set();
    endedFiredRef.current = false;
    setAltVideo(
      target !== videoId ? { id: target, title: "Versão Sincronizada" } : null
    );

    if (!videoId) return;

    // Pré-busca preventiva de versão alternativa em segundo plano
    const controller = new AbortController();
    fetch(
      `/api/subtitles/alternative?v=${videoId}&title=${encodeURIComponent(
        title || ""
      )}`,
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
  const switchToAlternative = useCallback(
    async (manual: boolean = false) => {
      // Se já temos uma versão alternativa em cache que não falhou, aplica imediatamente
      if (
        altVideo &&
        altVideo.id &&
        altVideo.id !== activeVideoId &&
        !failedVideoIdsRef.current.has(altVideo.id)
      ) {
        retryCountRef.current += 1;
        setActiveVideoId(altVideo.id);
        setIsUsingAlternative(true);
        setHasEmbedRestriction(false);
        setIsSearchingAlt(false);
        isSwitchingRef.current = false;
        onAlternativeSwitched?.(altVideo.id);
        return true;
      }

      // Bloqueio de concorrência e limite estrito do circuit breaker automático
      if (!manual && (isSwitchingRef.current || retryCountRef.current >= 3)) {
        console.warn(
          "[YouTubePlayer] Circuit breaker ativo: limite automático atingido."
        );
        setHasEmbedRestriction(true);
        setIsSearchingAlt(false);
        return false;
      }

      if (manual) {
        retryCountRef.current = 0; // Clique manual do usuário reinicia as tentativas
      }

      isSwitchingRef.current = true;
      setIsSearchingAlt(true);

      try {
        const failedArray = Array.from(failedVideoIdsRef.current);
        const excludeList = [videoId, activeVideoId, ...failedArray]
          .filter(Boolean)
          .join(",");

        const res = await fetch(
          `/api/subtitles/alternative?v=${videoId}&title=${encodeURIComponent(
            title || ""
          )}&exclude=${encodeURIComponent(excludeList)}`
        );

        if (res.ok) {
          const data = await res.json();
          // Procura o melhor candidato que ainda não tenha falhado
          let targetCandidate: { id: string; title: string } | null = null;
          if (data?.id && !failedVideoIdsRef.current.has(data.id)) {
            targetCandidate = data;
          } else if (Array.isArray(data?.candidates)) {
            const found = data.candidates.find(
              (c: any) => c.id && !failedVideoIdsRef.current.has(c.id)
            );
            if (found) targetCandidate = found;
          }

          if (
            targetCandidate &&
            targetCandidate.id &&
            targetCandidate.id !== activeVideoId
          ) {
            console.log(
              `[YouTubePlayer] Alternativa selecionada: ${targetCandidate.id}`
            );
            retryCountRef.current += 1;
            setActiveVideoId(targetCandidate.id);
            setAltVideo(targetCandidate);
            setIsUsingAlternative(true);
            setHasEmbedRestriction(false);
            onAlternativeSwitched?.(targetCandidate.id);
            return true;
          }
        }
      } catch (err) {
        console.warn("[YouTubePlayer] Erro na busca de alternativa:", err);
      } finally {
        isSwitchingRef.current = false;
        setIsSearchingAlt(false);
      }

      setHasEmbedRestriction(true);
      return false;
    },
    [videoId, activeVideoId, title]
  );

  const switchToAlternativeRef = useRef(switchToAlternative);
  switchToAlternativeRef.current = switchToAlternative;

  // Conecta YouTube IFrame API ao iframe JSX nativo com cancelamento estrito de callbacks órfãos
  useEffect(() => {
    let isCancelled = false;
    let pollInterval: NodeJS.Timeout | null = null;
    let ytInstance: any = null;

    const bindPlayer = () => {
      if (isCancelled) return;
      if (!window.YT || !window.YT.Player) return;

      const iframeEl = document.getElementById("youtube-iframe-player");
      if (!iframeEl) return;

      try {
        ytInstance = new window.YT.Player("youtube-iframe-player", {
          events: {
            onReady: () => {
              if (isCancelled) return;
              playerRef.current = ytInstance;
              if (pollInterval) clearInterval(pollInterval);
              pollInterval = setInterval(() => {
                if (isCancelled) return;
                if (
                  ytInstance &&
                  typeof ytInstance.getCurrentTime === "function"
                ) {
                  try {
                    const t = ytInstance.getCurrentTime();
                    if (typeof t === "number" && !isNaN(t)) {
                      onTimeUpdateRef.current(t);

                      // Detecção resiliente de fim de vídeo via duração
                      if (typeof ytInstance.getDuration === "function") {
                        const dur = ytInstance.getDuration();
                        if (dur > 0 && t >= dur - 0.5) {
                          if (!endedFiredRef.current) {
                            endedFiredRef.current = true;
                            onVideoEndedRef.current?.();
                          }
                        }
                      }
                    }
                  } catch {}
                }
              }, 100);
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;
              // 0 === YT.PlayerState.ENDED
              if (event?.data === 0) {
                if (!endedFiredRef.current) {
                  endedFiredRef.current = true;
                  onVideoEndedRef.current?.();
                }
              }
            },
            onError: (event: any) => {
              if (isCancelled) return;
              const errorCode = event?.data;
              console.warn(
                `[YouTubePlayer] Erro detectado no player: ${errorCode} no vídeo: ${activeVideoId}`
              );
              failedVideoIdsRef.current.add(activeVideoId);

              if (
                errorCode === 150 ||
                errorCode === 101 ||
                errorCode === 152 ||
                errorCode === 153 ||
                errorCode === 2
              ) {
                // Alterna automaticamente e de forma transparente sem exigir múltiplos cliques do usuário
                switchToAlternativeRef.current(false);
              }
            },
          },
        });
      } catch (err) {
        console.warn("[YouTubePlayer] Falha ao conectar YT.Player:", err);
      }
    };

    if (window.YT && window.YT.Player) {
      bindPlayer();
    } else {
      const existingScript = document.getElementById("youtube-iframe-script");
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-script";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = bindPlayer;
    }

    return () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
      playerRef.current = null;
    };
  }, [activeVideoId, playerRef]);

  // Deriva o segmento de legenda ativo com base no tempo atual
  // Prioriza o segmento mais recente que já iniciou caso haja qualquer resquício de sobreposição
  const activeSegment = useMemo(() => {
    if (!segments || segments.length === 0) return null;
    for (let i = segments.length - 1; i >= 0; i--) {
      const s = segments[i];
      if (currentTime >= s.start && currentTime <= s.end) {
        return s;
      }
    }
    return null;
  }, [segments, currentTime]);

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
                retryCountRef.current = 2; // Usuário solicitou explicitamente o vídeo original; impede auto-fallback em loop
                setActiveVideoId(videoId);
                setIsUsingAlternative(false);
                setHasEmbedRestriction(false);
              }}
              className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
            onClick={() => switchToAlternative(true)}
            disabled={isSearchingAlt}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition-all shadow-sm shadow-indigo-600/20 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${isSearchingAlt ? "animate-spin" : ""}`}
            />
            <span>{isSearchingAlt ? "Carregando..." : "Versão Compatível"}</span>
          </button>
        </div>
      ) : null}

      {/* Container de Vídeo IFrame Proporção 16:9 Estável */}
      <div className="relative aspect-video w-full bg-black">
        {/* IFrame Nativo JSX gerenciado pelo React (100% imune a desaparecimento e a loops) */}
        <iframe
          id="youtube-iframe-player"
          key={activeVideoId}
          src={`https://www.youtube.com/embed/${activeVideoId}?enablejsapi=1&rel=0&playsinline=1`}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

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

        {/* Fallback Glassmorphic Discreto se todas as alternativas falharem */}
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
                onClick={() => switchToAlternative(true)}
                disabled={isSearchingAlt}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    isSearchingAlt ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {isSearchingAlt
                    ? "Buscando versão compatível..."
                    : "Carregar Versão Sincronizada"}
                </span>
              </button>

              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-white/10 transition-colors"
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
            className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
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
            className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
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
            className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
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
            className={`rounded-lg p-1.5 font-semibold transition-all cursor-pointer ${
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
