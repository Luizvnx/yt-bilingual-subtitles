"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles,
  Music,
  Film,
  Smile,
  MessageSquare,
  Lightbulb,
  Play,
  Clock,
  GraduationCap,
  ChevronRight,
  Search,
  Filter,
  Flame,
  Zap,
  Target,
  Trophy,
  Crown,
  Check,
  RotateCcw,
  Compass,
  Layers,
  Lock,
} from "lucide-react";

export interface CuratedLesson {
  id: string;
  videoId: string;
  url: string;
  title: string;
  creator: string;
  category: "musica" | "serie" | "desenho" | "dialogo" | "ted";
  level: "iniciante" | "intermediario" | "avancado";
  levelLabel: string;
  duration: string;
  thumbnail: string;
  focus: string;
  description: string;
  tag: string;
  xp: number;
}

export interface CuratedSection {
  id: number;
  title: string;
  subtitle: string;
  levelBadge: string;
  themeColor: "emerald" | "indigo" | "amber" | "purple";
  lessons: CuratedLesson[];
}

export const DUOLINGO_SECTIONS: CuratedSection[] = [
  {
    id: 1,
    title: "Seção 1: Primeiros Passos & Audição Básica",
    subtitle: "Treine seu ouvido com falas nítidas, situações reais e vocabulário essencial do zero",
    levelBadge: "Nível A1 • Básico",
    themeColor: "emerald",
    lessons: [
      {
        id: "supermarket-dialogue",
        videoId: "9dVoa-oXZec",
        url: "https://www.youtube.com/watch?v=9dVoa-oXZec",
        title: "Inglês Prático no Supermercado (Diálogo Real)",
        creator: "English Panda",
        category: "dialogo",
        level: "iniciante",
        levelLabel: "A1 • Básico",
        duration: "5:07",
        thumbnail: "https://i.ytimg.com/vi/9dVoa-oXZec/hqdefault.jpg",
        focus: "Compras, Alimentos & Perguntas no Caixa",
        description: "Diálogo prático e descontraído no supermercado para aprender a interagir em compras e mercados.",
        tag: "Conversação A1",
        xp: 25,
      },
      {
        id: "ordering-food-restaurant",
        videoId: "bgfdqVmVjfk",
        url: "https://www.youtube.com/watch?v=bgfdqVmVjfk",
        title: "Como Fazer Pedidos em Restaurantes & Cafés",
        creator: "Easy English",
        category: "dialogo",
        level: "iniciante",
        levelLabel: "A2 • Vida Real",
        duration: "4:45",
        thumbnail: "https://i.ytimg.com/vi/bgfdqVmVjfk/hqdefault.jpg",
        focus: "Cortesia, Pedidos & 'I prefer / How is your food'",
        description: "Diálogo natural e pausado entre amigos em um restaurante, com vocabulário prático e útil para viagens.",
        tag: "Inglês para Viagens",
        xp: 30,
      },
      {
        id: "ted-ed-bridge-riddle",
        videoId: "7yDmGnA8Hw0",
        url: "https://www.youtube.com/watch?v=7yDmGnA8Hw0",
        title: "O Enigma da Ponte: Desafio de Lógica & Animação",
        creator: "TED-Ed (Alex Gendler)",
        category: "desenho",
        level: "iniciante",
        levelLabel: "A2 • Animação",
        duration: "3:50",
        thumbnail: "https://i.ytimg.com/vi/7yDmGnA8Hw0/hqdefault.jpg",
        focus: "Narrativa, Pronúncia Pura & Conectivos",
        description: "Mais de 60 frases faladas com dicção perfeita e ritmo ideal para treinar audição e repetição em voz alta.",
        tag: "Animação TED-Ed",
        xp: 30,
      },
    ],
  },
  {
    id: 2,
    title: "Seção 2: Hits Populares & Músicas Claras",
    subtitle: "Aprenda com canções famosas que possuem vocabulário prático e pronúncia acessível",
    levelBadge: "Nível A2-B1 • Intermediário",
    themeColor: "indigo",
    lessons: [
      {
        id: "ed-sheeran-perfect",
        videoId: "2Vv-BfVoq4g",
        url: "https://www.youtube.com/watch?v=2Vv-BfVoq4g",
        title: "Perfect (Official Music Video)",
        creator: "Ed Sheeran",
        category: "musica",
        level: "iniciante",
        levelLabel: "A2 • Música",
        duration: "4:23",
        thumbnail: "https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg",
        focus: "Pronúncia Britânica Limpa & Passado",
        description: "Voz pausada e dicção impecável para treinar escuta e cantar junto.",
        tag: "Romântico / Acústico",
        xp: 35,
      },
      {
        id: "the-lazy-song",
        videoId: "fLexgOxsZu0",
        url: "https://www.youtube.com/watch?v=fLexgOxsZu0",
        title: "The Lazy Song (Clipe Oficial)",
        creator: "Bruno Mars",
        category: "musica",
        level: "intermediario",
        levelLabel: "B1 • Intermediário",
        duration: "3:19",
        thumbnail: "https://i.ytimg.com/vi/fLexgOxsZu0/hqdefault.jpg",
        focus: "Gírias do Cotidiano & Rotina",
        description: "Expressões descontraídas de lazer e rotina americana com ritmo cadenciado.",
        tag: "Pop / Hits",
        xp: 35,
      },
      {
        id: "maroon5-sugar",
        videoId: "09R8_2nJtjg",
        url: "https://www.youtube.com/watch?v=09R8_2nJtjg",
        title: "Sugar (Surpresa em Casamentos Reais)",
        creator: "Maroon 5",
        category: "musica",
        level: "intermediario",
        levelLabel: "B1 • Pop Global",
        duration: "5:01",
        thumbnail: "https://i.ytimg.com/vi/09R8_2nJtjg/hqdefault.jpg",
        focus: "Conversação Espontânea & Reações Reais",
        description: "Mais de 100 falas com introdução de diálogos reais antes e durante a música.",
        tag: "Hit Internacional",
        xp: 40,
      },
    ],
  },
  {
    id: 3,
    title: "Seção 3: Conexão Nativa & Ritmo Dinâmico",
    subtitle: "Domine como nativos conectam palavras com linking sounds e expandem metáforas",
    levelBadge: "Nível B1-B2 • Intermediário+",
    themeColor: "amber",
    lessons: [
      {
        id: "dua-lipa-new-rules",
        videoId: "jzbiRNaj_v0",
        url: "https://www.youtube.com/watch?v=jzbiRNaj_v0",
        title: "New Rules (Live Lounge BBC Radio 1)",
        creator: "Dua Lipa",
        category: "musica",
        level: "intermediario",
        levelLabel: "B2 • Música",
        duration: "3:40",
        thumbnail: "https://i.ytimg.com/vi/jzbiRNaj_v0/hqdefault.jpg",
        focus: "Voz Acústica Limpa, Phrasal Verbs & Ritmo",
        description: "Versão ao vivo na BBC Radio 1 com voz nítida, sem introduções de diálogos de clipe, perfeita para decodificação auditiva e canto em sincronia.",
        tag: "Pop Internacional",
        xp: 40,
      },
      {
        id: "ed-sheeran-shape-of-you",
        videoId: "JGwWNGJdvx8",
        url: "https://www.youtube.com/watch?v=JGwWNGJdvx8",
        title: "Shape of You (Clipe Oficial)",
        creator: "Ed Sheeran",
        category: "musica",
        level: "intermediario",
        levelLabel: "B2 • Ritmo Rápido",
        duration: "3:53",
        thumbnail: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg",
        focus: "Ritmo Dinâmico & Linking Sounds",
        description: "88 frases com métrica rápida para treinar o cérebro a decodificar sons rápidos.",
        tag: "Hit Global",
        xp: 45,
      },
      {
        id: "coldplay-viva-la-vida",
        videoId: "dvgZkm1xWPE",
        url: "https://www.youtube.com/watch?v=dvgZkm1xWPE",
        title: "Viva La Vida (Clipe Oficial)",
        creator: "Coldplay",
        category: "musica",
        level: "intermediario",
        levelLabel: "B2 • Poesia & Rock",
        duration: "4:02",
        thumbnail: "https://i.ytimg.com/vi/dvgZkm1xWPE/hqdefault.jpg",
        focus: "Vocabulário Literário & Passado Histórico",
        description: "Uma aula de poesia em inglês com metáforas históricas e vocabulário avançado.",
        tag: "Rock Alternativo",
        xp: 45,
      },
    ],
  },
  {
    id: 4,
    title: "Seção 4: Fluência, Negócios & Oratória Global",
    subtitle: "Prepare-se para entrevistas de emprego em multinacionais e discursos inspiradores",
    levelBadge: "Nível B2-C1 • Avançado",
    themeColor: "purple",
    lessons: [
      {
        id: "job-interview-tell-me",
        videoId: "TQHW7gGjrCQ",
        url: "https://www.youtube.com/watch?v=TQHW7gGjrCQ",
        title: "Tell Me About Yourself (Resposta Modelo de Sucesso)",
        creator: "Bill - The Company's Expert",
        category: "dialogo",
        level: "intermediario",
        levelLabel: "B2 • Carreira",
        duration: "5:15",
        thumbnail: "https://i.ytimg.com/vi/TQHW7gGjrCQ/hqdefault.jpg",
        focus: "Carreira, Apresentação & Entrevista de Emprego",
        description: "Estratégia e dicção profissional para responder à pergunta mais comum em entrevistas seletivas globais em 5 minutos.",
        tag: "Inglês para Negócios",
        xp: 50,
      },
      {
        id: "steve-jobs-secrets-of-life",
        videoId: "kYfNvmF0Bqw",
        url: "https://www.youtube.com/watch?v=kYfNvmF0Bqw",
        title: "Secrets of Life (O Segredo da Vida - Steve Jobs)",
        creator: "Silicon Valley Historical Association",
        category: "ted",
        level: "intermediario",
        levelLabel: "B2 • Oratória",
        duration: "1:40",
        thumbnail: "https://i.ytimg.com/vi/kYfNvmF0Bqw/hqdefault.jpg",
        focus: "Oratória Inspiradora, Pausas & Pronúncia Precisa",
        description: "O clássico conselho de Steve Jobs sobre não aceitar a vida como ela é e construir seu próprio impacto no mundo.",
        tag: "Discurso Histórico",
        xp: 55,
      },
      {
        id: "charlie-chaplin-speech",
        videoId: "J7GY1Xg6X20",
        url: "https://www.youtube.com/watch?v=J7GY1Xg6X20",
        title: "O Grande Ditador: Discurso Humanitário Histórico",
        creator: "Charlie Chaplin (Official)",
        category: "serie",
        level: "avancado",
        levelLabel: "C1 • Avançado",
        duration: "3:35",
        thumbnail: "https://i.ytimg.com/vi/J7GY1Xg6X20/hqdefault.jpg",
        focus: "Inglês Eloquente, Discurso Público & Filosofia",
        description: "Um dos discursos mais poderosos do cinema. Inglês britânico formal de alta eloquência.",
        tag: "Cinema Histórico",
        xp: 60,
      },
    ],
  },
];

// Lista plana para a aba "Explorar Catálogo Livre"
export const ALL_LESSONS = DUOLINGO_SECTIONS.flatMap((sec) => sec.lessons);

interface CuratedCatalogProps {
  onSelectVideo: (url: string) => void;
  isLoading?: boolean;
  user?: any;
  onRequireLogin?: (message?: string) => void;
  onRequireUpgrade?: () => void;
}

export function CuratedCatalog({
  onSelectVideo,
  isLoading = false,
  user,
  onRequireLogin,
  onRequireUpgrade,
}: CuratedCatalogProps) {
  const isGuest = !user;
  // Modo de visualização: "path" (Trilha Duolingo) ou "grid" (Explorar Livre)
  const [viewMode, setViewMode] = useState<"path" | "grid">("path");
  const [activeSectionId, setActiveSectionId] = useState<number>(1);
  const [activeLessonPopover, setActiveLessonPopover] = useState<CuratedLesson | null>(null);

  // Estados de Gamificação salvos localmente
  const [streak, setStreak] = useState<number>(1);
  const [xp, setXp] = useState<number>(50);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // Filtros do Modo Grid
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [selectedLevel, setSelectedLevel] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Inicializa gamificação do localStorage
  useEffect(() => {
    try {
      const savedXp = localStorage.getItem("ytsubs_xp");
      const savedStreak = localStorage.getItem("ytsubs_streak");
      const savedCompleted = localStorage.getItem("ytsubs_completed");
      const lastActiveDate = localStorage.getItem("ytsubs_last_active");

      if (savedXp) setXp(parseInt(savedXp, 10));
      if (savedCompleted) {
        setCompletedIds(new Set(JSON.parse(savedCompleted)));
      }

      const todayStr = new Date().toDateString();
      if (lastActiveDate) {
        const lastDate = new Date(lastActiveDate);
        const diffDays = Math.floor(
          (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          // Continua streak
          const newStreak = savedStreak ? parseInt(savedStreak, 10) : 1;
          setStreak(newStreak);
        } else if (diffDays > 1) {
          // Quebrou streak
          setStreak(1);
          localStorage.setItem("ytsubs_streak", "1");
        } else if (savedStreak) {
          setStreak(parseInt(savedStreak, 10));
        }
      } else {
        localStorage.setItem("ytsubs_last_active", todayStr);
        localStorage.setItem("ytsubs_streak", "1");
      }

      const reloadProgress = () => {
        try {
          const savedXp = localStorage.getItem("ytsubs_xp");
          if (savedXp) setXp(parseInt(savedXp, 10));
          const savedCompleted = localStorage.getItem("ytsubs_completed");
          if (savedCompleted) {
            setCompletedIds(new Set(JSON.parse(savedCompleted)));
          }
        } catch {}
      };

      const handleXpUpdate = (e: any) => {
        try {
          if (e?.detail?.xp !== undefined) {
            setXp(e.detail.xp);
          }
          reloadProgress();
        } catch {}
      };

      const handleLessonCompleted = () => {
        reloadProgress();
      };

      window.addEventListener("ytsubs_xp_updated", handleXpUpdate);
      window.addEventListener("ytsubs_lesson_completed", handleLessonCompleted);
      window.addEventListener("storage", reloadProgress);
      return () => {
        window.removeEventListener("ytsubs_xp_updated", handleXpUpdate);
        window.removeEventListener("ytsubs_lesson_completed", handleLessonCompleted);
        window.removeEventListener("storage", reloadProgress);
      };
    } catch {}
  }, []);

  // Verifica se uma lição está desbloqueada na trilha progressiva
  const isLessonUnlocked = useCallback(
    (lessonId: string): boolean => {
      const idx = ALL_LESSONS.findIndex((l) => l.id === lessonId);
      if (idx <= 0) return true; // A primeira lição da trilha é sempre desbloqueada
      const prevLesson = ALL_LESSONS[idx - 1];
      // Desbloqueia apenas se a lição anterior já foi concluída ou se ela mesma já foi concluída
      return completedIds.has(prevLesson.id) || completedIds.has(lessonId);
    },
    [completedIds]
  );

  const getPreviousLesson = useCallback(
    (lessonId: string): CuratedLesson | null => {
      const idx = ALL_LESSONS.findIndex((l) => l.id === lessonId);
      return idx > 0 ? ALL_LESSONS[idx - 1] : null;
    },
    []
  );

  const handleStartLesson = (lesson: CuratedLesson) => {
    if (isGuest) {
      onRequireLogin?.(
        "Crie sua conta gratuita ou faça login para acessar as aulas do catálogo e salvar seu progresso!"
      );
      return;
    }

    if (!isLessonUnlocked(lesson.id)) {
      setActiveLessonPopover(lesson);
      return;
    }

    setActiveLessonPopover(null);
    if (typeof window !== "undefined") {
      localStorage.setItem("ytsubs_current_lesson_id", lesson.id);
    }
    onSelectVideo(lesson.url);
  };

  const categories = [
    { id: "todos", label: "Todos", icon: Sparkles },
    { id: "musica", label: "Músicas", icon: Music },
    { id: "serie", label: "Séries & Cenas", icon: Film },
    { id: "desenho", label: "Desenhos A1", icon: Smile },
    { id: "dialogo", label: "Diálogos Reais", icon: MessageSquare },
    { id: "ted", label: "TED Talks", icon: Lightbulb },
  ];

  const levels = [
    { id: "todos", label: "Todos os Níveis" },
    { id: "iniciante", label: "Iniciante (A1-A2)" },
    { id: "intermediario", label: "Intermediário (B1-B2)" },
    { id: "avancado", label: "Avançado (C1-C2)" },
  ];

  const currentSection = useMemo(() => {
    return (
      DUOLINGO_SECTIONS.find((s) => s.id === activeSectionId) ||
      DUOLINGO_SECTIONS[0]
    );
  }, [activeSectionId]);

  const filteredGridItems = useMemo(() => {
    return ALL_LESSONS.filter((item) => {
      const matchCategory =
        selectedCategory === "todos" || item.category === selectedCategory;
      const matchLevel =
        selectedLevel === "todos" || item.level === selectedLevel;
      const matchSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.focus.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCategory && matchLevel && matchSearch;
    });
  }, [selectedCategory, selectedLevel, searchQuery]);

  return (
    <section className="space-y-6 pt-2">
      {/* 1. BARRA SUPERIOR DE GAMIFICAÇÃO DUOLINGO (Streak, XP, Meta e Alternador de Modo) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-900/80 p-3 sm:p-4 backdrop-blur-xl shadow-2xl">
        {/* Métricas de Ofensiva (Streak) e XP */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Streak */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-400 font-bold text-xs sm:text-sm"
            title="Sua sequência de dias estudando inglês!"
          >
            <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 animate-pulse fill-orange-500" />
            <span>{streak} {streak === 1 ? "dia" : "dias"} de ofensiva</span>
          </div>

          {/* XP Total */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 font-bold text-xs sm:text-sm"
            title="Pontos de experiência acumulados com seus estudos"
          >
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 fill-amber-400" />
            <span>{xp} XP</span>
          </div>

          {/* Meta do Dia */}
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
            <Target className="h-4 w-4 text-emerald-400" />
            <span>
              Meta de Hoje:{" "}
              <strong className="text-white">
                {completedIds.size > 0 ? "1/1 Concluída" : "0/1 Vídeo"}
              </strong>
            </span>
          </div>
        </div>

        {/* Alternador de Modo: Trilha Duolingo vs. Explorar Catálogo Livre */}
        <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode("path")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "path"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Trilha de Estudo</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Explorar Todos</span>
          </button>
        </div>
      </div>

      {/* 2. MODO TRILHA DUOLINGO (The Learning Path) */}
      {viewMode === "path" && (
        <div className="space-y-6">
          {/* Navegador de Seções do Duolingo (A1 -> A2 -> B1 -> B2/C1) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {DUOLINGO_SECTIONS.map((sec) => {
              const isSelected = sec.id === activeSectionId;
              const isSectionUnlocked = sec.lessons.some((l) => isLessonUnlocked(l.id));
              const isSectionCompleted = sec.lessons.every((l) => completedIds.has(l.id));
              const hasCompleted = sec.lessons.some((l) => completedIds.has(l.id));

              let colorClasses = "border-white/10 text-zinc-400 hover:bg-zinc-900";
              if (isSelected) {
                if (sec.themeColor === "emerald") {
                  colorClasses =
                    "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 ring-2 ring-emerald-500/20";
                } else if (sec.themeColor === "indigo") {
                  colorClasses =
                    "border-indigo-500/60 bg-indigo-500/15 text-indigo-300 ring-2 ring-indigo-500/20";
                } else if (sec.themeColor === "amber") {
                  colorClasses =
                    "border-amber-500/60 bg-amber-500/15 text-amber-300 ring-2 ring-amber-500/20";
                } else {
                  colorClasses =
                    "border-purple-500/60 bg-purple-500/15 text-purple-300 ring-2 ring-purple-500/20";
                }
              }

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setActiveSectionId(sec.id);
                    setActiveLessonPopover(null);
                  }}
                  className={`flex flex-col text-left p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${colorClasses}`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span>SEÇÃO {sec.id}</span>
                    {isSectionCompleted ? (
                      <span className="flex items-center gap-0.5 text-emerald-400 text-[10px]">
                        <Check className="h-3 w-3" />
                        <span>Dominada</span>
                      </span>
                    ) : hasCompleted ? (
                      <span className="flex items-center gap-0.5 text-amber-400 text-[10px]">
                        <span>Em progresso</span>
                      </span>
                    ) : !isSectionUnlocked ? (
                      <span className="flex items-center gap-0.5 text-zinc-500 text-[10px]">
                        <Lock className="h-2.5 w-2.5" />
                        <span>Bloqueada</span>
                      </span>
                    ) : null}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1">
                    {sec.levelBadge}
                  </h4>
                  <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                    {sec.lessons.length} lições práticas
                  </p>
                </button>
              );
            })}
          </div>

          {/* Banner da Seção Ativa (Estilo Duolingo Banner com Ícones e Recompensas) */}
          <div
            className={`rounded-3xl p-5 sm:p-6 text-white border relative overflow-hidden shadow-2xl transition-all ${
              currentSection.themeColor === "emerald"
                ? "bg-gradient-to-r from-emerald-950/80 via-emerald-900/50 to-zinc-950 border-emerald-500/30 shadow-emerald-950/30"
                : currentSection.themeColor === "indigo"
                ? "bg-gradient-to-r from-indigo-950/80 via-indigo-900/50 to-zinc-950 border-indigo-500/30 shadow-indigo-950/30"
                : currentSection.themeColor === "amber"
                ? "bg-gradient-to-r from-amber-950/80 via-amber-900/50 to-zinc-950 border-amber-500/30 shadow-amber-950/30"
                : "bg-gradient-to-r from-purple-950/80 via-purple-900/50 to-zinc-950 border-purple-500/30 shadow-purple-950/30"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5 max-w-xl">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/80">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {currentSection.levelBadge}
                </span>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {currentSection.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300">
                  {currentSection.subtitle}
                </p>
              </div>

              {/* Dica da Trilha */}
              <div className="inline-flex items-center gap-2 rounded-2xl bg-black/40 border border-white/10 px-4 py-2.5 text-xs text-zinc-300 backdrop-blur-md shrink-0">
                <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  Ganhe até{" "}
                  <strong className="text-amber-300">
                    +{currentSection.lessons.reduce((acc, l) => acc + l.xp, 0)} XP
                  </strong>{" "}
                  nesta seção
                </span>
              </div>
            </div>
          </div>

          {/* O Caminho Serpenteante da Trilha (The Duolingo Snake Path) */}
          <div className="relative py-6 max-w-md mx-auto flex flex-col items-center">
            {/* Linha vertical conectora de fundo estilizada */}
            <div className="absolute top-10 bottom-10 w-1.5 bg-gradient-to-b from-white/15 via-white/20 to-white/5 rounded-full z-0" />

            {/* Nós Interativos da Trilha */}
            <div className="w-full space-y-10 sm:space-y-12 relative z-10">
              {currentSection.lessons.map((lesson, idx) => {
                const isCompleted = completedIds.has(lesson.id);
                const isUnlocked = isLessonUnlocked(lesson.id);
                const isLocked = !isUnlocked;
                // É o nó ativo atual da trilha (desbloqueado, mas ainda não concluído)
                const isCurrentStep = !isCompleted && isUnlocked;

                // Serpenteamento Duolingo: centro, esquerda, centro, direita
                const alignments = [
                  "justify-center",
                  "justify-start pl-6 sm:pl-10",
                  "justify-center",
                  "justify-end pr-6 sm:pr-10",
                ];
                const alignmentClass = alignments[idx % alignments.length];

                let IconComponent = Play;
                if (lesson.category === "musica") IconComponent = Music;
                else if (lesson.category === "serie") IconComponent = Film;
                else if (lesson.category === "desenho") IconComponent = Smile;
                else if (lesson.category === "dialogo") IconComponent = MessageSquare;
                else if (lesson.category === "ted") IconComponent = Lightbulb;

                // Cor do botão 3D da trilha
                let btnColor =
                  "bg-indigo-600 border-indigo-800 text-white shadow-indigo-600/30 hover:bg-indigo-500";
                if (isCompleted) {
                  btnColor =
                    "bg-emerald-600 border-emerald-800 text-white shadow-emerald-600/30 hover:bg-emerald-500";
                }

                return (
                  <div key={lesson.id} className={`flex ${alignmentClass} relative`}>
                    <div className={`relative group flex flex-col items-center ${isGuest ? "opacity-75 contrast-90" : ""}`}>
                      {/* Botão circular 3D Duolingo com efeito de clique e pulsação */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isGuest) {
                            onRequireLogin?.(
                              "Crie sua conta gratuita ou faça login para acessar as aulas do catálogo!"
                            );
                            return;
                          }
                          setActiveLessonPopover(lesson);
                        }}
                        className={`relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-b-[6px] transition-all cursor-pointer active:translate-y-1 active:border-b-0 shadow-xl ${
                          isGuest || isLocked
                            ? "bg-zinc-850 border-zinc-900 text-zinc-500 hover:bg-zinc-800 shadow-zinc-950/40"
                            : btnColor
                        }`}
                      >
                        {isGuest || isLocked ? (
                          <div className="flex flex-col items-center justify-center">
                            <Lock className="h-6 w-6 text-zinc-400" />
                            <span className="text-[9px] font-black text-zinc-400 mt-0.5 uppercase tracking-wide">
                              Bloqueado
                            </span>
                          </div>
                        ) : isCompleted ? (
                          <div className="relative flex items-center justify-center">
                            <Check className="h-8 w-8 stroke-[3.5] text-white" />
                            <span className="absolute -bottom-4 bg-emerald-950 border border-emerald-400 text-[10px] font-black px-1.5 py-0.2 rounded-full text-emerald-300">
                              FEITO
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <IconComponent className="h-7 w-7 text-white fill-white/20" />
                            <span className="text-[10px] font-black text-white/90 mt-0.5">
                              +{lesson.xp}XP
                            </span>
                          </div>
                        )}

                        {/* Halo pulsante apenas no nó ativo atual (desbloqueado e não feito) */}
                        {!isGuest && isCurrentStep && (
                          <span className="absolute -inset-1.5 rounded-full border-2 border-indigo-400 animate-ping pointer-events-none" />
                        )}
                      </button>

                      {/* Título flutuante abaixo do nó */}
                      <span className="mt-2 text-[11px] sm:text-xs font-bold text-zinc-300 max-w-[140px] text-center truncate drop-shadow-md">
                        {lesson.title}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Baú / Troféu de Conclusão da Seção (Marco Duolingo) */}
              <div className="flex justify-center pt-2">
                <div className="flex flex-col items-center p-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md text-center max-w-xs shadow-xl shadow-amber-500/10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 shadow-lg shadow-amber-500/30 mb-2">
                    <Crown className="h-8 w-8 fill-current" />
                  </div>
                  <h4 className="font-extrabold text-sm text-amber-300">
                    Marco da Seção {currentSection.id}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Complete todas as lições acima para dominar {currentSection.levelBadge}!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal / Popover de Prévia da Lição Selecionada na Trilha */}
          {activeLessonPopover && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-md rounded-3xl border border-white/15 bg-zinc-950 p-5 sm:p-6 shadow-2xl space-y-4">
                {/* Imagem de Capa com Badge de Duração */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black">
                  <img
                    src={activeLessonPopover.thumbnail}
                    alt={activeLessonPopover.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 rounded-lg bg-black/80 border border-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-200 backdrop-blur-md">
                    {activeLessonPopover.levelLabel}
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/80 px-2 py-0.5 text-[10px] font-mono font-semibold text-zinc-300">
                    {activeLessonPopover.duration}
                  </div>
                </div>

                {/* Detalhes da Lição */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{activeLessonPopover.creator}</span>
                    <span className="flex items-center gap-1 font-bold text-amber-400">
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      +{activeLessonPopover.xp} XP ao concluir
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    {activeLessonPopover.title}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {activeLessonPopover.description}
                  </p>

                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-xl">
                      <Target className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Foco: {activeLessonPopover.focus}</span>
                    </span>
                  </div>
                </div>

                {/* Botões de Ação estilo Duolingo */}
                {(() => {
                  const isPopLocked = !isGuest && !isLessonUnlocked(activeLessonPopover.id);
                  const prevPopLesson = getPreviousLesson(activeLessonPopover.id);

                  return (
                    <div className="space-y-3 pt-2">
                      {isPopLocked && (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2">
                          <Lock className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                          <span>
                            Complete a aula anterior{" "}
                            <strong>"{prevPopLesson?.title}"</strong> para desbloquear este próximo vídeo da trilha!
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveLessonPopover(null)}
                          className="w-1/3 py-3 rounded-2xl border border-white/10 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          Fechar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartLesson(activeLessonPopover)}
                          disabled={isLoading || isPopLocked}
                          className={`w-2/3 py-3 rounded-2xl text-xs sm:text-sm font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 border-b-4 ${
                            isPopLocked
                              ? "bg-zinc-800 border-zinc-900 text-zinc-500 opacity-60 cursor-not-allowed"
                              : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-95 shadow-emerald-500/25 border-emerald-800 cursor-pointer"
                          }`}
                        >
                          {isGuest ? (
                            <>
                              <Lock className="h-4 w-4" />
                              <span>FAZER LOGIN PARA ASSISTIR</span>
                            </>
                          ) : isPopLocked ? (
                            <>
                              <Lock className="h-4 w-4" />
                              <span>BLOQUEADO NA TRILHA</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 fill-current" />
                              <span>
                                {completedIds.has(activeLessonPopover.id)
                                  ? "REVISAR VÍDEO"
                                  : `COMEÇAR (+${activeLessonPopover.xp} XP)`}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MODO EXPLORAR CATÁLOGO LIVRE (Grid com Busca e Filtros) */}
      {viewMode === "grid" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header e Busca */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Explorar Todos os Vídeos & Conteúdos
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                Navegue livremente por gênero musical, trechos de séries clássicas ou diálogos da vida real.
              </p>
            </div>

            {/* Campo de Busca Rápida */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por artista, série ou tema..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          {/* Barra de Filtros por Categoria */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 font-semibold"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/[0.06]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filtro Secundário por Nível */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5 font-medium mr-1">
              <Filter className="h-3 w-3" />
              Nível CEFR:
            </span>
            {levels.map((lvl) => {
              const isActive = selectedLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-white/15 text-white font-semibold border border-white/20"
                      : "bg-zinc-900/50 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/80 border border-white/[0.04]"
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>

          {/* Grid de Cards */}
          {filteredGridItems.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-12 text-center space-y-3">
              <Search className="h-8 w-8 text-zinc-600 mx-auto" />
              <h3 className="text-sm font-semibold text-zinc-300">
                Nenhum conteúdo encontrado para estes filtros
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Tente selecionar outra categoria ou limpe o termo de busca.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("todos");
                  setSelectedLevel("todos");
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline cursor-pointer"
              >
                <span>Restaurar todos os filtros</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredGridItems.map((item) => {
                const isBeginner = item.level === "iniciante";
                const isIntermediate = item.level === "intermediario";
                const isDone = completedIds.has(item.id);
                const isUnlocked = isLessonUnlocked(item.id);
                const isCardLocked = isGuest || !isUnlocked;
                const prevItem = getPreviousLesson(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isLoading) return;
                      if (isGuest) {
                        onRequireLogin?.(
                          "Crie sua conta gratuita ou faça login para acessar os vídeos do catálogo!"
                        );
                        return;
                      }
                      handleStartLesson(item);
                    }}
                    className={`group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-zinc-900/60 hover:bg-zinc-900 hover:border-indigo-500/50 p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden ${
                      isCardLocked ? "opacity-75 hover:opacity-90 contrast-90" : ""
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/60">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Selo de Bloqueio com Cadeado para Não Logados ou Lições Bloqueadas */}
                        {isCardLocked && (
                          <div
                            className="absolute top-2 right-2 rounded-md bg-zinc-950/90 text-amber-400 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow-md z-20 backdrop-blur-md"
                            title={
                              isGuest
                                ? "Faça login para acessar"
                                : `Conclua "${prevItem?.title}" na trilha para liberar`
                            }
                          >
                            <Lock className="h-3 w-3" />
                            <span>{isGuest ? "Bloqueado" : "Trilha Bloqueada"}</span>
                          </div>
                        )}

                        {/* Overlay com Play */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/40 scale-75 group-hover:scale-100 transition-transform">
                            {isCardLocked ? (
                              <Lock className="h-5 w-5 text-amber-400" />
                            ) : (
                              <Play className="h-5 w-5 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        {/* Selo Concluído */}
                        {!isCardLocked && isDone && (
                          <div className="absolute top-2 right-2 rounded-md bg-emerald-500/90 text-white px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow-md">
                            <Check className="h-3 w-3" />
                            <span>Concluído</span>
                          </div>
                        )}

                        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-300">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{item.duration}</span>
                        </div>

                        <div className="absolute top-2 left-2 rounded-md bg-zinc-950/80 backdrop-blur-md border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                          {item.tag}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isBeginner
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                                : isIntermediate
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                                : "bg-purple-500/10 text-purple-300 border-purple-500/25"
                            }`}
                          >
                            {item.levelLabel}
                          </span>
                          <span className="text-[11px] text-zinc-500 truncate max-w-[120px]">
                            {item.creator}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                          {item.title}
                        </h4>

                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-[10px] font-medium text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md truncate max-w-[200px] inline-flex items-center gap-1">
                        <Target className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{item.focus}</span>
                      </span>

                      <span className="text-xs font-semibold text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>+{item.xp}XP</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
