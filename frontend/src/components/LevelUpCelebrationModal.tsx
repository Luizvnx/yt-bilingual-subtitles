"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Trophy,
  Crown,
  Sparkles,
  Zap,
  Flame,
  ArrowRight,
  CheckCircle2,
  X,
  Play,
  Share2,
} from "lucide-react";

export interface LevelInfo {
  level: number;
  title: string;
  currentThreshold: number;
  nextThreshold: number;
  xpInLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

export function calculateLevel(xp: number): LevelInfo {
  const thresholds = [0, 100, 250, 450, 700, 1050, 1500, 2100, 2800, 3600, 4500];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const currentThreshold = thresholds[level - 1] || 0;
  const nextThreshold = thresholds[level] || currentThreshold + 500;
  const xpInLevel = Math.max(0, xp - currentThreshold);
  const xpForNextLevel = Math.max(1, nextThreshold - currentThreshold);
  const progressPercent = Math.min(100, Math.max(0, (xpInLevel / xpForNextLevel) * 100));

  const titles: Record<number, string> = {
    1: "Iniciante Curioso",
    2: "Praticante Dedicado",
    3: "Explorador da Língua",
    4: "Conversador Fluente",
    5: "Mestre Bilíngue",
    6: "Lenda Poliglota",
  };
  const title = titles[level] || `Lenda Nível ${level}`;

  return {
    level,
    title,
    currentThreshold,
    nextThreshold,
    xpInLevel,
    xpForNextLevel,
    progressPercent,
  };
}

interface LevelUpCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  } | null;
  earnedXp: number;
  previousXp: number;
  newXp: number;
  lessonTitle?: string;
  streak?: number;
  onContinue?: () => void;
  onReviewQuiz?: () => void;
}

export function LevelUpCelebrationModal({
  isOpen,
  onClose,
  user,
  earnedXp,
  previousXp,
  newXp,
  lessonTitle,
  streak = 1,
  onContinue,
  onReviewQuiz,
}: LevelUpCelebrationModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startLevel = useMemo(() => calculateLevel(previousXp), [previousXp]);
  const endLevel = useMemo(() => calculateLevel(newXp), [newXp]);
  const isLevelUp = endLevel.level > startLevel.level;

  // Estados animados
  const [displayedPercent, setDisplayedPercent] = useState<number>(
    startLevel.progressPercent
  );
  const [displayedXp, setDisplayedXp] = useState<number>(previousXp);
  const [displayedLevel, setDisplayedLevel] = useState<number>(startLevel.level);
  const [hasLeveledUp, setHasLeveledUp] = useState<boolean>(false);
  const [showLevelUpBanner, setShowLevelUpBanner] = useState<boolean>(false);

  // Sintetizador Web Audio API de celebração
  const playCelebrationSound = (isMajor = false) => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const notes = isMajor ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isMajor ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.38);
      });
    } catch {}
  };

  // Motor de Partículas de Confetes no Canvas
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      "#10B981", // emerald
      "#F59E0B", // amber
      "#6366F1", // indigo
      "#EC4899", // pink
      "#3B82F6", // blue
      "#FBBF24", // gold
      "#A855F7", // purple
    ];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
      shape: "rect" | "circle" | "star";
    }

    const particles: Particle[] = [];
    const count = 90;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() * 80 - 40),
        y: canvas.height * 0.45 + (Math.random() * 40 - 20),
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        shape: Math.random() > 0.4 ? "rect" : Math.random() > 0.5 ? "circle" : "star",
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravidade
        p.vx *= 0.98; // resistência do ar
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, p.opacity - 0.006);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Estrela simples de 4 pontas
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 4, 0);
          ctx.lineTo(0, p.size / 2);
          ctx.lineTo(-p.size / 4, 0);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen]);

  // Animação de preenchimento da barra circular e números de XP
  useEffect(() => {
    if (!isOpen) return;

    // Reseta estados para animação
    setDisplayedPercent(startLevel.progressPercent);
    setDisplayedXp(previousXp);
    setDisplayedLevel(startLevel.level);
    setHasLeveledUp(false);
    setShowLevelUpBanner(false);

    // Toca som inicial de XP ganho
    const soundTimeout = setTimeout(() => {
      playCelebrationSound(false);
    }, 200);

    // Se houve LEVEL UP
    if (isLevelUp) {
      // 1. Preenche a barra até 100%
      const fillTimer = setTimeout(() => {
        setDisplayedPercent(100);
        setDisplayedXp(startLevel.nextThreshold);
      }, 400);

      // 2. Dispara a comemoração de Level Up ao atingir 100%
      const levelUpTimer = setTimeout(() => {
        setHasLeveledUp(true);
        setShowLevelUpBanner(true);
        setDisplayedLevel(endLevel.level);
        playCelebrationSound(true);

        // 3. Reseta a barra para 0% e preenche o progresso residual do novo nível
        setTimeout(() => {
          setDisplayedPercent(0);
          setTimeout(() => {
            setDisplayedPercent(endLevel.progressPercent);
            setDisplayedXp(newXp);
          }, 150);
        }, 400);
      }, 1400);

      return () => {
        clearTimeout(soundTimeout);
        clearTimeout(fillTimer);
        clearTimeout(levelUpTimer);
      };
    } else {
      // Preenchimento contínuo suave dentro do mesmo nível
      const fillTimer = setTimeout(() => {
        setDisplayedPercent(endLevel.progressPercent);
        setDisplayedXp(newXp);
      }, 400);

      return () => {
        clearTimeout(soundTimeout);
        clearTimeout(fillTimer);
      };
    }
  }, [isOpen, previousXp, newXp, startLevel, endLevel, isLevelUp]);

  if (!isOpen) return null;

  // Parâmetros do Círculo SVG de Progresso
  const circleSize = 180;
  const strokeWidth = 10;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * displayedPercent) / 100;

  const currentLevelInfo = hasLeveledUp ? endLevel : startLevel;
  const userInitials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "VC";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-300">
      {/* Canvas de Partículas / Confetes */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />

      {/* Cartão Central de Celebração */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-black/95 p-6 sm:p-8 shadow-2xl shadow-indigo-500/20 text-center space-y-6 animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Fechar no canto */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Efeito Glow de Fundo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-gradient-to-br from-amber-500/30 via-emerald-500/20 to-indigo-500/30 blur-3xl pointer-events-none" />

        {/* 1. CABEÇALHO CELEBRATÓRIO */}
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Vídeo Concluído!</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {showLevelUpBanner ? (
              <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent animate-pulse drop-shadow-md">
                🎉 SUBIU DE NÍVEL! 🎉
              </span>
            ) : (
              "Excelente Trabalho!"
            )}
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 line-clamp-1 max-w-xs mx-auto">
            {lessonTitle || "Você concluiu mais uma etapa do seu aprendizado!"}
          </p>
        </div>

        {/* 2. FOTO DO USUÁRIO COM A BARRA CIRCULAR DE PROGRESSÃO (XP RING) */}
        <div className="relative flex justify-center items-center py-2">
          {/* Brilho pulsante em caso de Level Up */}
          {showLevelUpBanner && (
            <div className="absolute h-48 w-48 rounded-full bg-amber-400/30 blur-xl animate-ping pointer-events-none" />
          )}

          <div className="relative flex items-center justify-center">
            {/* SVG da Barra Circular */}
            <svg
              width={circleSize}
              height={circleSize}
              className="transform -rotate-90 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]"
            >
              <defs>
                <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#FBBF24" />
                </linearGradient>
              </defs>

              {/* Trilho de Fundo */}
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Barra de Progresso Animada */}
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                stroke="url(#xpGradient)"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Foto do Usuário no Centro */}
            <div className="absolute inset-[15px] rounded-full overflow-hidden border-2 border-white/20 bg-zinc-900 shadow-inner flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || "Foto do Usuário"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-tr from-indigo-900 via-indigo-700 to-purple-800 flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-2xl">
                  {userInitials}
                </div>
              )}

              {/* Halo sutil interno */}
              <div className="absolute inset-0 rounded-full ring-1 ring-white/10 pointer-events-none" />
            </div>

            {/* Selo Flutuante de Nível no Rodapé da Foto */}
            <div className="absolute -bottom-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black text-xs px-3 py-1 rounded-full shadow-lg border border-yellow-200/50 flex items-center gap-1">
              <Crown className="h-3.5 w-3.5 fill-current" />
              <span>NÍVEL {displayedLevel}</span>
            </div>
          </div>
        </div>

        {/* 3. TÍTULO DO NÍVEL & STATUS DE XP */}
        <div className="space-y-2 relative z-10 pt-1">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              +{earnedXp} XP
            </span>
            <div className="h-6 w-px bg-white/20" />
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              {currentLevelInfo.title}
            </span>
          </div>

          {/* Barra de XP textual */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-zinc-400 px-2">
              <span>Total: {displayedXp} XP</span>
              <span>
                Próximo Nível: {currentLevelInfo.nextThreshold} XP
              </span>
            </div>
            <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-emerald-500 via-amber-400 to-yellow-400 h-full transition-all duration-700 ease-out"
                style={{ width: `${displayedPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4. CARDS DE RECOMPENSAS ADICIONAIS (Ofensiva & Trilha) */}
        <div className="grid grid-cols-2 gap-2.5 pt-1 text-left">
          <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 shrink-0">
              <Flame className="h-5 w-5 fill-current animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-black text-white">
                {streak} {streak === 1 ? "Dia" : "Dias"}
              </div>
              <div className="text-[10px] text-orange-300/80 font-medium">
                Ofensiva Mantida!
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
              <Sparkles className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Próxima Aula</div>
              <div className="text-[10px] text-indigo-300/80 font-medium">
                Desbloqueada!
              </div>
            </div>
          </div>
        </div>

        {/* 5. BOTÕES DE AÇÃO */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onContinue) onContinue();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 active:scale-98 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-b-4 border-emerald-800"
          >
            <span>CONTINUAR TRILHA</span>
            <ArrowRight className="h-5 w-5" />
          </button>

          {onReviewQuiz && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReviewQuiz();
              }}
              className="w-full py-2.5 rounded-2xl border border-white/10 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400 fill-current" />
              <span>Desafiar com Quiz IA (+30 XP)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
