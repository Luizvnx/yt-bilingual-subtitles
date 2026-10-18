"use client";

import React, { useEffect, useRef, useState } from "react";
import { SubtitleSegment } from "@/lib/security";
import {
  EyeOff,
  Languages,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Music2,
  AlertTriangle,
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
  segments: SubtitleSegment[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  playerRef: React.MutableRefObject<any>;
}

export function YouTubePlayer({
  videoId,
  segments,
  currentTime,
  onTimeUpdate,
  playerRef,
}: YouTubePlayerProps) {
  const [subMode, setSubMode] = useState<"bilingual" | "en" | "pt" | "none">(
    "bilingual"
  );
  const [hasEmbedRestriction, setHasEmbedRestriction] = useState(false);
  const [isVirtualPlaying, setIsVirtualPlaying] = useState(false);

  // Duração máxima calculada com base no último segmento de legenda
  const maxDuration =
    segments && segments.length > 0
      ? Math.max(...segments.map((s) => s.end || 0)) + 5
      : 300;

  // Carrega a API do YouTube IFrame sob demanda com proteção anti-restrição
  useEffect(() => {
    if (!videoId) return;
    setHasEmbedRestriction(false);
    setIsVirtualPlaying(false);

    let pollInterval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      // Destrói instância anterior se existir
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }

      try {
        const originUrl =
          typeof window !== "undefined" && window.location.origin
            ? window.location.origin
            : "http://localhost:3000";

        playerRef.current = new window.YT.Player("youtube-iframe-target", {
          videoId: videoId,
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
            onError: (event: any) => {
              const errorCode = event?.data;
              console.warn("[YouTubePlayer] Erro na reprodução:", errorCode);
              // Códigos 150, 101, 152, 153: Restrição de reprodução externa imposta pela gravadora / VEVO
              if (
                errorCode === 150 ||
                errorCode === 101 ||
                errorCode === 152 ||
                errorCode === 153 ||
                errorCode === 2
              ) {
                setHasEmbedRestriction(true);
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
  }, [videoId]);

  // Modo Virtual de Estudo: se o vídeo for restrito por VEVO, simula o relógio para sincronizar as legendas
  useEffect(() => {
    if (!hasEmbedRestriction || !isVirtualPlaying) return;

    const timer = setInterval(() => {
      onTimeUpdate(Math.min(maxDuration, currentTime + 0.2));
    }, 200);

    return () => clearInterval(timer);
  }, [hasEmbedRestriction, isVirtualPlaying, currentTime, maxDuration]);

  // Se o usuário clicar em seek enquanto o player estiver com restrição externa
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
      {/* Container de Vídeo IFrame Proporção 16:9 */}
      <div className="relative aspect-video w-full bg-black">
        <div id="youtube-iframe-target" className="h-full w-full" />

        {/* Overlay Especial: Quando o videoclipe possui restrição externa da gravadora (VEVO / Erro 150) */}
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
                  Suas legendas bilíngues e vocabulário estão 100% prontos ao lado!
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
                onClick={() => setHasEmbedRestriction(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline transition-colors"
              >
                Tentar carregar vídeo novamente
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
