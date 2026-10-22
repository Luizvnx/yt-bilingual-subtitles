"use client";

import React from "react";
import { VideoRecord } from "@/lib/security";
import { Play, Trash2, Clock, CheckCircle } from "lucide-react";

interface HistoryGridProps {
  videos: VideoRecord[];
  onSelectVideo: (video: VideoRecord) => void;
  onDeleteVideo: (id: string, e: React.MouseEvent) => void;
}

export function HistoryGrid({
  videos,
  onSelectVideo,
  onDeleteVideo,
}: HistoryGridProps) {
  if (!videos || videos.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm font-medium text-zinc-400">
          Nenhum vídeo processado ainda. Insira um link do YouTube acima para
          começar seus estudos!
        </p>
      </div>
    );
  }

  const formatDuration = (secs: number) => {
    if (!secs) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((vid) => (
        <div
          key={vid.id}
          onClick={() => onSelectVideo(vid)}
          className="group relative flex flex-col rounded-2xl border border-white/10 border-b-[4px] border-b-zinc-900 bg-[#0B0D14] overflow-hidden shadow-xl hover:border-indigo-500/40 hover:border-b-indigo-600 hover:-translate-y-1 active:translate-y-0.5 active:border-b-2 cursor-pointer transition-all duration-200"
        >
          {/* Top specular highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />

          {/* Thumbnail */}
          <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
            <img
              src={vid.thumbnail}
              alt={vid.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg border-b-[3px] border-b-indigo-800 group-hover:scale-110 transition-transform">
                <Play className="h-6 w-6 ml-0.5 fill-current" />
              </div>
            </div>

            {/* Duração badge */}
            <div className="absolute bottom-2 right-2 rounded-lg bg-black/85 px-2 py-0.5 text-[11px] font-mono font-bold text-zinc-300 border border-white/10 backdrop-blur-sm shadow-md">
              {formatDuration(vid.duration)}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col p-4 justify-between">
            <div>
              <h4 className="text-sm font-bold text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">
                {vid.title}
              </h4>
              <p className="text-xs text-zinc-400 mt-1 truncate">
                {vid.uploader || "Canal do YouTube"}
              </p>
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-2.5 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-display font-bold">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>{vid.segmentsCount || vid.segments?.length || 0} frases</span>
              </span>

              <button
                onClick={(e) => onDeleteVideo(vid.id, e)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all active:scale-95"
                title="Excluir do histórico"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
