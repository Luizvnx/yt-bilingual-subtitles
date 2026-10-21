"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Zap,
  Trophy,
  ArrowRight,
  RotateCcw,
  Loader2,
  Volume2,
  Lightbulb,
  BookOpen,
  Lock,
  Crown,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  quote?: string;
}

interface VideoQuizProps {
  videoId: string;
  videoTitle: string;
  onSeek?: (seconds: number) => void;
  onAddXp?: (amount: number) => void;
  onBackToTranscript?: () => void;
  user?: any;
  onOpenAuth?: () => void;
  onOpenUpgrade?: () => void;
}

export function VideoQuiz({
  videoId,
  videoTitle,
  onSeek,
  onAddXp,
  onBackToTranscript,
  user,
  onOpenAuth,
  onOpenUpgrade,
}: VideoQuizProps) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isProRequired, setIsProRequired] = useState(false);
  const [isAuthRequired, setIsAuthRequired] = useState(false);

  const fetchQuiz = async () => {
    setLoading(true);
    setErrorMessage("");
    setIsProRequired(false);
    setIsAuthRequired(false);
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsCompleted(false);

    try {
      const res = await fetchWithAuth(`/api/subtitles/${videoId}/quiz`);
      const data = await res.json().catch(() => null);

      if (res.ok) {
        if (data?.quiz?.questions && Array.isArray(data.quiz.questions)) {
          setQuestions(data.quiz.questions);
        } else {
          setErrorMessage("Nenhum quiz disponível para este vídeo no momento.");
        }
      } else {
        if (data?.requireUpgrade || data?.code === "PRO_REQUIRED" || res.status === 403) {
          setIsProRequired(true);
        } else if (data?.requireAuth || data?.code === "AUTH_REQUIRED" || res.status === 401) {
          setIsAuthRequired(true);
        }
        setErrorMessage(data?.error || "Acesso exclusivo para membros assinantes.");
      }
    } catch {
      setErrorMessage("Erro de conexão ao carregar o quiz de IA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoId) {
      fetchQuiz();
    }
  }, [videoId]);

  const handleSelectOption = (index: number) => {
    if (selectedOption !== null) return; // Impede mudar de resposta
    setSelectedOption(index);

    const currentQ = questions[currentIndex];
    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      // Quiz finalizado
      setIsCompleted(true);
      const earnedXp = (score + (selectedOption === questions[currentIndex].correctIndex ? 1 : 0)) * 10;
      if (earnedXp > 0) {
        try {
          const currentXp = parseInt(localStorage.getItem("ytsubs_xp") || "0", 10);
          const newXp = currentXp + earnedXp;
          localStorage.setItem("ytsubs_xp", newXp.toString());
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("ytsubs_xp_updated", { detail: { xp: newXp } }));
          }
          if (onAddXp) onAddXp(earnedXp);
        } catch {}
      }
      // Se concluiu o quiz e há lição ativa, salva como concluída
      try {
        const activeLessonId = localStorage.getItem("ytsubs_current_lesson_id");
        if (activeLessonId) {
          const completedRaw = localStorage.getItem("ytsubs_completed");
          const completedSet = new Set(completedRaw ? JSON.parse(completedRaw) : []);
          completedSet.add(activeLessonId);
          localStorage.setItem("ytsubs_completed", JSON.stringify(Array.from(completedSet)));
        }
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-zinc-900/60 rounded-2xl border border-white/[0.08]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <p className="text-xs sm:text-sm font-semibold text-white">
          A IA está gerando perguntas interativas deste vídeo...
        </p>
        <p className="text-[11px] text-zinc-400 max-w-xs">
          Analisando as falas e vocabulário para criar seu desafio de fixação
        </p>
      </div>
    );
  }

  if (isProRequired) {
    return (
      <div className="p-6 text-center space-y-4 bg-zinc-900/90 rounded-2xl border border-amber-500/30 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white">
            Quiz com IA Exclusivo do Plano PRO
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            {errorMessage ||
              "O Quiz gerado por Inteligência Artificial testa sua audição e vocabulário com perguntas pedagógicas sob medida."}
          </p>
        </div>
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Crown className="h-4 w-4" />
            <span>Assinar Plano PRO</span>
          </button>
          {onBackToTranscript && (
            <button
              type="button"
              onClick={onBackToTranscript}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Voltar à Transcrição
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isAuthRequired) {
    return (
      <div className="p-6 text-center space-y-4 bg-zinc-900/90 rounded-2xl border border-indigo-500/30 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white">
            Acesso Restrito ao Quiz
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Faça login ou crie sua conta para acessar o Quiz com Inteligência Artificial.
          </p>
        </div>
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <span>Fazer Login / Criar Conta</span>
          </button>
          {onBackToTranscript && (
            <button
              type="button"
              onClick={onBackToTranscript}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Voltar à Transcrição
            </button>
          )}
        </div>
      </div>
    );
  }

  if (errorMessage || questions.length === 0) {
    return (
      <div className="p-6 text-center space-y-3 bg-zinc-900/60 rounded-2xl border border-white/[0.08]">
        <HelpCircle className="h-8 w-8 text-zinc-500 mx-auto" />
        <p className="text-xs sm:text-sm font-semibold text-zinc-300">
          {errorMessage || "Nenhuma pergunta disponível para este vídeo."}
        </p>
        <button
          type="button"
          onClick={fetchQuiz}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Tentar Novamente</span>
        </button>
      </div>
    );
  }

  if (isCompleted) {
    const total = questions.length;
    const finalScore = score;
    const earnedXp = finalScore * 10;

    return (
      <div className="p-6 sm:p-8 text-center space-y-4 bg-zinc-900/90 rounded-2xl sm:rounded-3xl border border-amber-500/30 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 shadow-lg shadow-amber-500/30">
          <Trophy className="h-9 w-9 fill-current" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-black text-white">
            {finalScore === total
              ? "Perfeito! Você dominou o vídeo!"
              : finalScore > 0
              ? "Muito bem! Bom aproveitamento!"
              : "Bom esforço! Revise o vídeo e tente de novo!"}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400">
            Você acertou <strong className="text-white">{finalScore}</strong> de{" "}
            <strong className="text-white">{total}</strong> perguntas deste estudo.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 px-4 py-2 text-xs font-bold text-amber-300">
          <Zap className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span>+{earnedXp} XP adicionados à sua ofensiva!</span>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={fetchQuiz}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Refazer Quiz</span>
          </button>

          {onBackToTranscript && (
            <button
              type="button"
              onClick={onBackToTranscript}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 active:scale-95 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Voltar à Transcrição</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isAnswered = selectedOption !== null;

  return (
    <div className="space-y-4 bg-zinc-900/80 rounded-2xl sm:rounded-3xl border border-white/[0.08] p-4 sm:p-6 backdrop-blur-xl shadow-xl">
      {/* Barra de Progresso do Quiz */}
      <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span className="font-semibold text-white">
            Desafio de Compreensão com IA
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-indigo-400">
            Pergunta {currentIndex + 1} de {questions.length}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
            <Zap className="h-3 w-3 fill-current" />
            +10 XP
          </span>
        </div>
      </div>

      {/* Enunciado da Pergunta */}
      <div className="space-y-2">
        <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
          {currentQ.question}
        </h4>

        {currentQ.quote && (
          <div className="inline-flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-1.5 italic">
            <span>"{currentQ.quote}"</span>
          </div>
        )}
      </div>

      {/* Opções de Resposta */}
      <div className="space-y-2 pt-1">
        {currentQ.options.map((option, optIdx) => {
          let btnStyle =
            "bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-white/[0.06] hover:border-white/20";

          if (isAnswered) {
            if (optIdx === currentQ.correctIndex) {
              btnStyle =
                "bg-emerald-500/15 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/30 font-semibold";
            } else if (optIdx === selectedOption) {
              btnStyle =
                "bg-red-500/15 text-red-300 border-red-500/50 ring-1 ring-red-500/30";
            } else {
              btnStyle = "bg-zinc-900/40 text-zinc-500 border-white/[0.02] opacity-60";
            }
          }

          const letters = ["A", "B", "C", "D"];

          return (
            <button
              key={optIdx}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelectOption(optIdx)}
              className={`w-full text-left p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 font-mono font-bold text-[11px] shrink-0 border border-white/10">
                  {letters[optIdx]}
                </span>
                <span>{option}</span>
              </div>

              {isAnswered && optIdx === currentQ.correctIndex && (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              )}
              {isAnswered &&
                selectedOption === optIdx &&
                optIdx !== currentQ.correctIndex && (
                  <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                )}
            </button>
          );
        })}
      </div>

      {/* Feedback e Explicação Pedagógica da IA */}
      {isAnswered && (
        <div className="rounded-2xl p-4 bg-zinc-950/80 border border-white/10 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2 text-xs">
            <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-white">Explicação da IA:</span>
              <p className="text-zinc-300 leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 active:scale-95 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <span>
                {currentIndex + 1 < questions.length
                  ? "Próxima Pergunta"
                  : "Ver Resultado"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
