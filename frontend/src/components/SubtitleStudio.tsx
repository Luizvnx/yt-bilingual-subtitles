"use client";

import React, { useRef, useEffect, useState } from "react";
import { SubtitleSegment } from "@/lib/security";
import {
  Search,
  RotateCcw,
  Copy,
  Check,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Mic,
  Square,
  X,
} from "lucide-react";

interface SubtitleStudioProps {
  segments: SubtitleSegment[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  onWordClick: (word: string, event: React.MouseEvent) => void;
}

export function SubtitleStudio({
  segments,
  currentTime,
  onSeek,
  onWordClick,
}: SubtitleStudioProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Estados para Shadowing e Gravação de Voz (Fase 4.5)
  const [activeShadowingIndex, setActiveShadowingIndex] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudios, setRecordedAudios] = useState<{ [index: number]: string }>({});
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState<number | null>(null);
  const [micError, setMicError] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Encontra o índice da frase atual
  const activeIndex = segments.findIndex(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  // Rolagem suave automática (*Auto-scroll*)
  useEffect(() => {
    if (!autoScroll || !activeSegmentRef.current || !scrollContainerRef.current)
      return;

    activeSegmentRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex, autoScroll]);

  // Filtro de busca
  const filteredSegments = segments.filter((seg) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      seg.text_en.toLowerCase().includes(term) ||
      seg.text_pt.toLowerCase().includes(term)
    );
  });

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Limpeza de áudios ao desmontar componente
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (userAudioPlayerRef.current) {
        userAudioPlayerRef.current.pause();
      }
      Object.values(recordedAudios).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [recordedAudios]);

  // Inicia gravação de voz para treino de Shadowing
  const startRecording = async (index: number) => {
    setMicError("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta gravação de áudio nativa.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudios((prev) => ({ ...prev, [index]: audioUrl }));
        setIsRecording(false);
        setRecordingSeconds(0);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Erro ao acessar microfone:", err);
      setMicError(
        "Permissão de microfone negada. Conceda permissão no navegador para treinar sua pronúncia."
      );
      setIsRecording(false);
    }
  };

  // Para a gravação atual
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // Reproduz / pausa o áudio gravado pelo aluno
  const togglePlayUserAudio = (index: number) => {
    const audioUrl = recordedAudios[index];
    if (!audioUrl) return;

    if (isPlayingUserAudio === index) {
      if (userAudioPlayerRef.current) {
        userAudioPlayerRef.current.pause();
        userAudioPlayerRef.current.currentTime = 0;
      }
      setIsPlayingUserAudio(null);
    } else {
      if (userAudioPlayerRef.current) {
        userAudioPlayerRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      userAudioPlayerRef.current = audio;
      setIsPlayingUserAudio(index);

      audio.onended = () => {
        setIsPlayingUserAudio(null);
      };

      audio.play().catch(() => {
        setIsPlayingUserAudio(null);
      });
    }
  };

  const copyToAnki = (seg: SubtitleSegment, index: number) => {
    const text = `Front: ${seg.text_en}\nBack: ${seg.text_pt}\nTime: ${formatTime(
      seg.start
    )}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Divide o texto da frase em palavras individuais interativas
  const renderInteractiveSentence = (text: string) => {
    const tokens = text.split(/(\s+|[.,!?;:"'()]+)/);
    return tokens.map((token, idx) => {
      const isWord = /^[a-zA-Z0-9'-]+$/.test(token);
      if (!isWord) {
        return <span key={idx}>{token}</span>;
      }
      return (
        <span
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            onWordClick(token, e);
          }}
          className="cursor-pointer rounded px-0.5 hover:bg-indigo-500/30 hover:text-indigo-200 hover:underline transition-colors decoration-indigo-400 underline-offset-2"
          title="Clique para traduzir, ouvir pronúncia e salvar"
        >
          {token}
        </span>
      );
    });
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-zinc-950/70 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Topo do Studio: Busca e Opções */}
      <div className="border-b border-white/10 p-4 space-y-3 bg-zinc-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Transcrição Bilíngue Interativa
            </h3>
          </div>
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-zinc-400 border border-white/5">
            {segments.length} frases
          </span>
        </div>

        {/* Input de Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar palavra ou frase (inglês ou português)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Toggle Auto-scroll & Dica */}
        <div className="flex items-center justify-between text-xs pt-1 select-none">
          <button
            type="button"
            role="switch"
            aria-checked={autoScroll}
            onClick={() => setAutoScroll((prev) => !prev)}
            className="flex items-center gap-2.5 cursor-pointer group focus:outline-none"
          >
            {/* Custom Pill Switch */}
            <div
              className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                autoScroll
                  ? "bg-indigo-600 shadow-sm shadow-indigo-500/30"
                  : "bg-zinc-800 border border-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out shadow-sm ${
                  autoScroll ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
              Rolagem automática
            </span>
          </button>

          <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
            Clique em qualquer palavra para abrir o dicionário
          </span>
        </div>
      </div>

      {/* Lista de Frases Sincronizadas */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-white/5"
      >
        {filteredSegments.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            Nenhuma frase encontrada para a busca informada.
          </div>
        ) : (
          filteredSegments.map((seg, idx) => {
            const isActive =
              currentTime >= seg.start && currentTime <= seg.end;
            return (
              <div
                key={idx}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => onSeek(seg.start)}
                className={`group relative rounded-2xl p-3.5 transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-transparent border-l-4 border-l-indigo-500 pl-4 shadow-lg shadow-indigo-500/10"
                    : "hover:bg-white/5 border-l-4 border-l-transparent"
                }`}
              >
                {/* Linha Superior: Timestamp e Ações */}
                <div className="flex items-center justify-between mb-1.5 text-xs text-zinc-400">
                  <span
                    className={`font-mono text-[11px] ${
                      isActive ? "text-indigo-400 font-bold" : "text-zinc-500"
                    }`}
                  >
                    {formatTime(seg.start)} - {formatTime(seg.end)}
                  </span>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Shadowing / Treino de Pronúncia */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveShadowingIndex(
                          activeShadowingIndex === idx ? null : idx
                        );
                      }}
                      className={`rounded p-1 transition-colors ${
                        activeShadowingIndex === idx
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-400 hover:bg-white/10 hover:text-white"
                      }`}
                      title="Treinar Pronúncia (Gravar voz)"
                    >
                      <Mic className="h-3.5 w-3.5" />
                    </button>

                    {/* Shadowing / Repetir Frase */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(seg.start);
                      }}
                      className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                      title="Repetir esta frase (Shadowing)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>

                    {/* Copiar para o Anki */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToAnki(seg, idx);
                      }}
                      className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                      title="Copiar par bilíngue para o Anki"
                    >
                      {copiedIndex === idx ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Frase em Inglês com palavras clicáveis */}
                <p
                  className={`text-sm font-semibold leading-relaxed tracking-wide ${
                    isActive ? "text-white" : "text-zinc-200"
                  }`}
                >
                  {renderInteractiveSentence(seg.text_en)}
                </p>

                {/* Frase em Português */}
                <p className="text-xs font-medium text-emerald-400/90 mt-1 leading-normal">
                  {seg.text_pt}
                </p>

                {/* Painel Interativo de Shadowing / Treino de Fala */}
                {activeShadowingIndex === idx && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 rounded-xl border border-indigo-500/30 bg-zinc-900/90 p-3 text-xs space-y-2.5 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                        <Mic className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Treino de Fala & Shadowing</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (isRecording) stopRecording();
                          setActiveShadowingIndex(null);
                        }}
                        className="rounded p-1 text-zinc-500 hover:text-white hover:bg-white/10"
                        title="Fechar treino"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {micError && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-[11px] text-red-300">
                        {micError}
                      </div>
                    )}

                    {/* Estado 1: Gravando */}
                    {isRecording ? (
                      <div className="flex items-center justify-between bg-zinc-950/80 border border-red-500/30 rounded-xl p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                          <span className="font-mono text-red-300 text-xs font-semibold">
                            Gravando ({recordingSeconds}s)...
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors"
                        >
                          <Square className="h-3 w-3 fill-current" />
                          <span>Finalizar</span>
                        </button>
                      </div>
                    ) : recordedAudios[idx] ? (
                      /* Estado 2: Áudio gravado - Comparação A/B */
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Botão Ouvir Minha Gravação */}
                          <button
                            type="button"
                            onClick={() => togglePlayUserAudio(idx)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all ${
                              isPlayingUserAudio === idx
                                ? "bg-indigo-600 text-white shadow-indigo-500/30 ring-1 ring-indigo-400"
                                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700"
                            }`}
                          >
                            {isPlayingUserAudio === idx ? (
                              <Pause className="h-3 w-3 fill-current" />
                            ) : (
                              <Play className="h-3 w-3 fill-current" />
                            )}
                            <span>{isPlayingUserAudio === idx ? "Pausar" : "Minha Voz"}</span>
                          </button>

                          {/* Botão Ouvir Nativo do Vídeo */}
                          <button
                            type="button"
                            onClick={() => onSeek(seg.start)}
                            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors"
                            title="Ouvir como o nativo pronuncia no vídeo"
                          >
                            <Volume2 className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Áudio Original</span>
                          </button>

                          {/* Botão Regravar */}
                          <button
                            type="button"
                            onClick={() => startRecording(idx)}
                            className="flex items-center gap-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/60 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors ml-auto"
                            title="Gravar novamente"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Regravar</span>
                          </button>
                        </div>

                        <p className="text-[11px] text-zinc-400 leading-normal">
                          Compare a entonação e clareza da sua voz com o áudio nativo do vídeo.
                        </p>
                      </div>
                    ) : (
                      /* Estado 3: Pronto para Gravar */
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-zinc-400">
                          Ouça o nativo no vídeo e repita para calibrar sua fala.
                        </p>

                        <button
                          type="button"
                          onClick={() => startRecording(idx)}
                          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 active:scale-95 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all"
                        >
                          <span className="h-2 w-2 rounded-full bg-red-400" />
                          <span>Gravar Pronúncia</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
