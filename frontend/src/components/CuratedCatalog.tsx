"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";

export interface CuratedItem {
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
}

export const CURATED_COLLECTION: CuratedItem[] = [
  // --- MÚSICAS ---
  {
    id: "the-lazy-song",
    videoId: "fLexgOxsZu0",
    url: "https://www.youtube.com/watch?v=fLexgOxsZu0",
    title: "The Lazy Song (Official Music Video)",
    creator: "Bruno Mars",
    category: "musica",
    level: "intermediario",
    levelLabel: "B1 • Intermediário",
    duration: "3:19",
    thumbnail: "https://i.ytimg.com/vi/fLexgOxsZu0/hqdefault.jpg",
    focus: "Gírias do cotidiano & Rotina",
    description: "Excelente para aprender expressões descontraídas de lazer com ritmo cadenciado.",
    tag: "Pop / Hits",
  },
  {
    id: "ed-sheeran-perfect",
    videoId: "2Vv-BfVoq4g",
    url: "https://www.youtube.com/watch?v=2Vv-BfVoq4g",
    title: "Perfect (Official Music Video)",
    creator: "Ed Sheeran",
    category: "musica",
    level: "iniciante",
    levelLabel: "A2 • Iniciante",
    duration: "4:23",
    thumbnail: "https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg",
    focus: "Pronúncia Britânica Limpa & Passado",
    description: "Voz pausada e dicção perfeita para quem quer treinar escuta e cantar junto.",
    tag: "Romântico / Acústico",
  },
  {
    id: "adele-someone-like-you",
    videoId: "hLQl3WQQoQ0",
    url: "https://www.youtube.com/watch?v=hLQl3WQQoQ0",
    title: "Someone Like You (Official Video)",
    creator: "Adele",
    category: "musica",
    level: "intermediario",
    levelLabel: "B1 • Intermediário",
    duration: "4:45",
    thumbnail: "https://i.ytimg.com/vi/hLQl3WQQoQ0/hqdefault.jpg",
    focus: "Conexão de Palavras (Linking Words)",
    description: "Interpretação marcante para treinar como nativos conectam o final e o início das palavras.",
    tag: "Clássico Global",
  },
  {
    id: "coldplay-viva-la-vida",
    videoId: "dvgZkm1xWPE",
    url: "https://www.youtube.com/watch?v=dvgZkm1xWPE",
    title: "Viva La Vida (Official Video)",
    creator: "Coldplay",
    category: "musica",
    level: "intermediario",
    levelLabel: "B2 • Intermediário+",
    duration: "4:02",
    thumbnail: "https://i.ytimg.com/vi/dvgZkm1xWPE/hqdefault.jpg",
    focus: "Vocabulário Literário & Histórico",
    description: "Letra rica em metáforas e estruturas gramaticais variadas para expandir seu vocabulário.",
    tag: "Rock Alternativo",
  },

  // --- SÉRIES & FILMES ---
  {
    id: "friends-joey-food",
    videoId: "QnS_14K9Ucw",
    url: "https://www.youtube.com/watch?v=QnS_14K9Ucw",
    title: "Joey Doesn't Share Food! (Cena Clássica)",
    creator: "Friends (NBC)",
    category: "serie",
    level: "intermediario",
    levelLabel: "B1 • Intermediário",
    duration: "2:45",
    thumbnail: "https://i.ytimg.com/vi/QnS_14K9Ucw/hqdefault.jpg",
    focus: "Humor, Diálogo Social & Restaurante",
    description: "Aprenda como se comunicar em encontros e restaurantes com a icônica cena de Joey Tribbiani.",
    tag: "Sitcom Clássica",
  },
  {
    id: "the-office-cpr",
    videoId: "yfZi_q6a7s0",
    url: "https://www.youtube.com/watch?v=yfZi_q6a7s0",
    title: "Treinamento de RCP com Stayin' Alive (Stress Relief)",
    creator: "The Office US",
    category: "serie",
    level: "avancado",
    levelLabel: "C1 • Avançado",
    duration: "4:12",
    thumbnail: "https://i.ytimg.com/vi/yfZi_q6a7s0/hqdefault.jpg",
    focus: "Diálogo Rápido & Conversas Múltiplas",
    description: "Cena hilária no escritório com ritmo frenético para testar compreensão avançada sem legendas em português.",
    tag: "Comédia de Escritório",
  },

  // --- DESENHOS & ANIMAÇÕES (IDEAL PARA INICIANTES) ---
  {
    id: "inside-out-emotions",
    videoId: "dOkyKyVFnSs",
    url: "https://www.youtube.com/watch?v=dOkyKyVFnSs",
    title: "Meet the Emotions (Apresentando as Emoções)",
    creator: "Disney • Pixar",
    category: "desenho",
    level: "iniciante",
    levelLabel: "A1 • Básico Total",
    duration: "3:10",
    thumbnail: "https://i.ytimg.com/vi/dOkyKyVFnSs/hqdefault.jpg",
    focus: "Emoções, Adjetivos & Vocabulário Base",
    description: "Falas nítidas, articuladas e visuais. O melhor ponto de partida para quem tem vocabulário inicial.",
    tag: "Animação Pixar",
  },
  {
    id: "kung-fu-panda-yesterday",
    videoId: "B1yQO4cZtYc",
    url: "https://www.youtube.com/watch?v=B1yQO4cZtYc",
    title: "Yesterday is History, Tomorrow is a Mystery",
    creator: "DreamWorks Animation",
    category: "desenho",
    level: "iniciante",
    levelLabel: "A2 • Iniciante",
    duration: "2:15",
    thumbnail: "https://i.ytimg.com/vi/B1yQO4cZtYc/hqdefault.jpg",
    focus: "Pausas, Entonação & Shadowing",
    description: "Diálogo calmo entre Po e Mestre Oogway. Frases curtas e inspiradoras fáceis de repetir.",
    tag: "Clássico da Animação",
  },
  {
    id: "peppa-pig-museum",
    videoId: "0p6B93s5J_w",
    url: "https://www.youtube.com/watch?v=0p6B93s5J_w",
    title: "The Aquarium Visit (Falas Claras & Objetos)",
    creator: "Peppa Pig Official",
    category: "desenho",
    level: "iniciante",
    levelLabel: "A1 • Básico",
    duration: "4:30",
    thumbnail: "https://i.ytimg.com/vi/0p6B93s5J_w/hqdefault.jpg",
    focus: "Vocabulário Visual Infantil sem Ansiedade",
    description: "O segredo dos poliglotas: frases simples com contexto visual direto para fixar sem esforço.",
    tag: "Inglês Britânico Básico",
  },

  // --- DIÁLOGOS PRÁTICOS ---
  {
    id: "ordering-coffee-shop",
    videoId: "P1tW-qK1ZNo",
    url: "https://www.youtube.com/watch?v=P1tW-qK1ZNo",
    title: "Como Pedir Café e Comida em Nova York",
    creator: "Real English Daily",
    category: "dialogo",
    level: "iniciante",
    levelLabel: "A2 • Vida Real",
    duration: "3:40",
    thumbnail: "https://i.ytimg.com/vi/P1tW-qK1ZNo/hqdefault.jpg",
    focus: "Cortesia, Pedidos & Pagamento",
    description: "Domine frases indispensáveis para viagens: 'Can I get...', 'To go or for here?' e gorjetas.",
    tag: "Inglês para Viagens",
  },
  {
    id: "job-interview-tell-me",
    videoId: "5v-wyR5emRw",
    url: "https://www.youtube.com/watch?v=5v-wyR5emRw",
    title: "Tell Me About Yourself (Entrevista de Emprego)",
    creator: "CareerVidz",
    category: "dialogo",
    level: "intermediario",
    levelLabel: "B2 • Profissional",
    duration: "5:20",
    thumbnail: "https://i.ytimg.com/vi/5v-wyR5emRw/hqdefault.jpg",
    focus: "Apresentação Pessoal & Carreira",
    description: "Aprenda o roteiro perfeito para responder à pergunta mais temida de processos seletivos.",
    tag: "Inglês para Negócios",
  },

  // --- TED TALKS & IDEIAS ---
  {
    id: "ted-ed-memory",
    videoId: "yOgXjm4Z3Co",
    url: "https://www.youtube.com/watch?v=yOgXjm4Z3Co",
    title: "Como Nosso Cérebro Cria e Perde Memórias",
    creator: "TED-Ed",
    category: "ted",
    level: "intermediario",
    levelLabel: "B2 • Ideias",
    duration: "4:55",
    thumbnail: "https://i.ytimg.com/vi/yOgXjm4Z3Co/hqdefault.jpg",
    focus: "Termos Conceituais & Narração Acadêmica",
    description: "Locução profissional impecável em ritmo claro sobre neurociência e aprendizado.",
    tag: "Educação & Ciência",
  },
  {
    id: "steve-jobs-stanford",
    videoId: "UF8uR6Z6KLc",
    url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc",
    title: "Stay Hungry, Stay Foolish (Discurso em Stanford)",
    creator: "Stanford University",
    category: "ted",
    level: "intermediario",
    levelLabel: "B2 • Oratória",
    duration: "5:00",
    thumbnail: "https://i.ytimg.com/vi/UF8uR6Z6KLc/hqdefault.jpg",
    focus: "Storytelling, Pausas & Oratória Inspiradora",
    description: "Aprenda a contar histórias pessoais em inglês com pausas estratégicas e impacto emocional.",
    tag: "Discurso Histórico",
  },
];

interface CuratedCatalogProps {
  onSelectVideo: (url: string) => void;
  isLoading?: boolean;
}

export function CuratedCatalog({ onSelectVideo, isLoading = false }: CuratedCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [selectedLevel, setSelectedLevel] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = [
    { id: "todos", label: "Todos os Vídeos", icon: Sparkles },
    { id: "musica", label: "Músicas", icon: Music },
    { id: "serie", label: "Séries & Cenas", icon: Film },
    { id: "desenho", label: "Desenhos (A1)", icon: Smile },
    { id: "dialogo", label: "Diálogos Reais", icon: MessageSquare },
    { id: "ted", label: "TED Talks", icon: Lightbulb },
  ];

  const levels = [
    { id: "todos", label: "Todos os Níveis" },
    { id: "iniciante", label: "🟢 Iniciante (A1-A2)" },
    { id: "intermediario", label: "🟡 Intermediário (B1-B2)" },
    { id: "avancado", label: "🟣 Avançado (C1-C2)" },
  ];

  const filteredItems = useMemo(() => {
    return CURATED_COLLECTION.filter((item) => {
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
    <section className="space-y-6 pt-4">
      {/* Header do Catálogo */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md mb-2">
            <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
            <span>Biblioteca Recomendada</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            O Que Você Quer Estudar Hoje?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            Clique em qualquer vídeo para abrir o estúdio interativo com legendas bilíngues sincronizadas e dicionário instantâneo com pronúncia nativa.
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

      {/* Filtro Secundário por Nível de Dificuldade */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500 flex items-center gap-1.5 font-medium mr-1">
          <Filter className="h-3 w-3" />
          Nível:
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

      {/* Grid de Cards de Vídeos Recomendados */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-12 text-center space-y-3">
          <Search className="h-8 w-8 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">
            Nenhum conteúdo encontrado para estes filtros
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Tente selecionar outra categoria ou limpe o termo de busca para ver todas as opções disponíveis.
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
          {filteredItems.map((item) => {
            const isBeginner = item.level === "iniciante";
            const isIntermediate = item.level === "intermediario";

            return (
              <div
                key={item.id}
                onClick={() => !isLoading && onSelectVideo(item.url)}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-zinc-900/60 hover:bg-zinc-900 hover:border-indigo-500/50 p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden"
              >
                {/* Imagem de Capa e Badges */}
                <div className="space-y-3">
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/60">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Overlay escuro ao passar o mouse com botão de play */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/40 scale-75 group-hover:scale-100 transition-transform">
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Badge de Duração no Canto Inferior Direito */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-300">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{item.duration}</span>
                    </div>

                    {/* Tag de Categoria */}
                    <div className="absolute top-2 left-2 rounded-md bg-zinc-950/80 backdrop-blur-md border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                      {item.tag}
                    </div>
                  </div>

                  {/* Detalhes do Conteúdo */}
                  <div className="space-y-1.5">
                    {/* Badge de Nível CEFR */}
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

                    <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Footer do Card com Foco de Aprendizado */}
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-medium text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                    🎯 {item.focus}
                  </span>

                  <span className="text-xs font-semibold text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>Estudar</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
