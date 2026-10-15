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
          className="group relative flex flex-col rounded-2xl border border-white/10 bg-zinc-950/80 overflow-hidden shadow-xl hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer transition-all"
        >
          {/* Thumbnail */}
          <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
            <img
              src={vid.thumbnail}
              alt={vid.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg">
                <Play className="h-6 w-6 ml-0.5 fill-current" />
              </div>
            </div>

            {/* Duração badge */}
            <div className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-[11px] font-mono text-zinc-300 backdrop-blur-sm">
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

            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{vid.segmentsCount || vid.segments?.length || 0} frases</span>
              </span>

              <button
                onClick={(e) => onDeleteVideo(vid.id, e)}
                className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-red-400 transition-colors"
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
