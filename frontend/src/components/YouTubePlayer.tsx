"use client";

import React, { useEffect, useRef, useState } from "react";
import { SubtitleSegment } from "@/lib/security";
import { Eye, EyeOff, Languages } from "lucide-react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [subMode, setSubMode] = useState<"bilingual" | "en" | "pt" | "none">(
    "bilingual"
  );
  const [activeSegment, setActiveSegment] = useState<SubtitleSegment | null>(
    null
  );

  // Carrega a API do YouTube IFrame sob demanda
  useEffect(() => {
    if (!videoId) return;

    let pollInterval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      // Destrói instância anterior se existir
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player("youtube-iframe-target", {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            // Polling de sincronização em tempo real (100ms)
            pollInterval = setInterval(() => {
              if (
                playerRef.current &&
                typeof playerRef.current.getCurrentTime === "function"
              ) {
                const time = playerRef.current.getCurrentTime();
                if (typeof time === "number") {
                  onTimeUpdate(time);
                }
              }
            }, 100);
          },
          onStateChange: (event: any) => {
            // Eventos de play/pause
          },
        },
      });
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
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Atualiza o segmento de legenda ativo com base no tempo atual
  useEffect(() => {
    if (!segments || !segments.length) {
      setActiveSegment(null);
      return;
    }
    const current = segments.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    );
    setActiveSegment(current || null);
  }, [currentTime, segments]);

  return (
    <div className="relative flex flex-col rounded-3xl border border-white/10 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Container de Vídeo IFrame Proporção 16:9 */}
      <div className="relative aspect-video w-full bg-black">
        <div id="youtube-iframe-target" className="h-full w-full" />

        {/* Overlay de Legenda Dinâmica Flutuante sobre o vídeo */}
        {subMode !== "none" && activeSegment && (
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
