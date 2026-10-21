# 🎨 Sistema de Design & Definições Visuais (Design System)

> **Documento Canônico de UI/UX** deste repositório.
> Toda e qualquer alteração de interface, novos componentes ou refatorações visuais **DEVEM seguir rigorosamente estas definições**.
> **Proibido regredir para layouts genéricos de IA.**

---

## 🌌 1. Identidade & Filosofia Visual

A identidade visual do aplicativo é a fusão equilibrada de dois mundos complementares:

1. **Google Gemini Aesthetic (Cosmic Dark & Obsidian Luxury):**
   - Fundos ultra escuros, profundos e cósmicos (`#070A0F`, `#090A0F`, `#0B0D14`, `#0C0E14`, `#10131C`).
   - Efeito de profundidade e vidro escuro (*glassmorphism* avançado) com `backdrop-blur-2xl` e sombras ricas (`shadow-[0_12px_40px_rgba(0,0,0,0.7)]`).
   - **Specular Highlights:** Filetes finos de luz translúcida no topo dos elementos (`border-t border-white/20` ou `inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent`).
   - **Luz Ambiente (Aurora Borealis / Nebula):** Gradientes radiais suaves e difusos (`blur-3xl opacity-20` a `opacity-30`) posicionados nos cantos dos containers temáticos (esmeralda, âmbar, índigo), sem poluir ou clarear a legibilidade do fundo.

2. **Duolingo Dopaminergic Mechanics (Feather Design System):**
   - **Afroldância Física 3D (Tactile Bevel):** Botões, cartões de lição e fichas de métricas possuem chanfro inferior físico (`border-b-[3px]`, `border-b-[4px]` ou `border-b-[5px]`).
   - **Resposta Mecânica ao Clique:** Ao clicar ou tocar, o elemento se comprime fisicamente (`active:translate-y-0.5 active:border-b` ou `active:border-b-2`), reproduzindo a sensação tátil de um brinquedo ou console arcade.
   - **Cores Saturadas e Enérgicas:** Ícones e números utilizam cores vivas, brilhantes e de alto contraste, despertando foco e recompensa imediata.

---

## 🚫 2. Anti-Padrões PROIBIDOS (O "Visual Genérico de IA")

Qualquer pull request ou código gerado por IA que apresente estes padrões será **rejeitado**:

| ❌ Anti-Padrão Genérico de IA | ✅ Padrão Obrigatório do Projeto |
| :--- | :--- |
| **Pílulas translúcidas lavadas:** `bg-orange-500/10 border-orange-500/25 text-orange-400` | **Token 3D com profundidade:** Base obsidiana, chanfro inferior sólido `border-b-[3px] border-orange-600`, brasão com ícone iluminado neon e texto em branco puro `font-display font-black`. |
| **Cartões retangulares 1px sem relevo:** Caixas opacas sem vida e sem profundidade | **Game Quest Cards 3D:** Cartão com chanfro `border-b-[5px]`, filete specular superior, badge sólido e micro-barras táteis segmentadas. |
| **Troféus e recompensas apagados:** Texto simples cinza com borda tênue | **Baú / Troféu Dourado 3D:** Container chanfrado `border-b-4 border-amber-600 bg-gradient-to-b from-amber-500/25 via-zinc-950 to-black` com taça dourada em relevo. |
| **Tipografia sem peso e monotônica:** Números e labels todos no mesmo tamanho pequeno | **Tipografia de Alto Contraste:** Números grandes em destaque com `font-display font-black text-lg`, acompanhados de micro-rótulos em uppercase tracking largo (`text-[9px] uppercase tracking-widest text-zinc-400`). |

---

## 🔤 3. Tipografia & Escala de Texto

Configurada em `frontend/src/app/layout.tsx` e `frontend/src/app/globals.css`:

* **`Outfit` (`var(--font-outfit)`, classe `.font-display`):**
  - Uso: Contadores de XP, dias de ofensiva (Streak), títulos de mundos/seções, marcos de conquista e botões de ação arcade.
  - Pesos: `font-black` (900) e `font-extrabold` (800).
* **`Inter` (`var(--font-inter)`, classe padrão `font-sans`):**
  - Uso: Textos corridos, diálogos de legenda bilíngue, transcrições, tooltips e micro-descrições.
  - Pesos: `font-medium` (500) e `font-normal` (400).

---

## 🎨 4. Paleta de Cores e Tokens do Sistema

### 4.1 Fundo & Superfícies Cósmicas (Gemini Dark)
* **Background Raiz:** `#070A0F`
* **Card Base Elevado:** `#0B0D14` / `#0C0E14` (com `border border-white/10`)
* **Specular Highlight Line:** `h-px bg-gradient-to-r from-transparent via-white/25 to-transparent`
* **Surface Inactive / Muted:** `#090A0F` com borda `border-zinc-850 border-b-[4px] border-b-zinc-900`

### 4.2 Cores Dopaminérgicas de Gamificação
* 🔥 **Ofensiva / Fogo (Duolingo Streak):**
  - Gradiente do Brasão: `from-orange-600 via-orange-500 to-amber-400`
  - Chanfro 3D: `border-orange-500/40 border-b-[3px] border-b-orange-600`
  - Glow / Neon: `shadow-[0_0_12px_rgba(249,115,22,0.7)]`
* ⚡ **Experiência / Raio (Gold XP):**
  - Gradiente do Brasão: `from-amber-500 via-amber-400 to-yellow-300`
  - Chanfro 3D: `border-amber-500/40 border-b-[3px] border-b-amber-600`
  - Texto Destaque: `text-amber-300 font-display font-black`
  - Glow / Neon: `shadow-[0_0_12px_rgba(245,158,11,0.7)]`
* 🦉 **Domínio / Conquista (Duo Emerald):**
  - Base: `border-2 border-emerald-400 border-b-[5px] border-b-emerald-600`
  - Badge Sólido: `bg-emerald-500 text-emerald-950 font-display font-black`
  - Barra de Progresso Ativa: `bg-gradient-to-r from-emerald-500 to-teal-400`
* 🚀 **Exploração / Futuro (Cyber Indigo):**
  - Base: `border-2 border-indigo-400 border-b-[5px] border-b-indigo-600`
  - Badge Sólido: `bg-indigo-500 text-white font-display font-black`

---

## 🧱 5. Anatomia de Componentes Padrão (Snippets de Referência)

### 5.1 Token Gamificado 3D (Ofensiva / XP)
```tsx
<div className="group flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-gradient-to-b from-orange-500/15 via-zinc-900/90 to-zinc-950 border border-orange-500/40 border-b-[3px] border-b-orange-600 shadow-[0_4px_16px_rgba(249,115,22,0.2)] transition-all active:translate-y-0.5 active:border-b select-none">
  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 text-white shadow-[0_0_12px_rgba(249,115,22,0.7)] shrink-0 border-b border-orange-700">
    <Flame className="h-4.5 w-4.5 fill-white text-white drop-shadow" />
  </div>
  <div className="flex flex-col text-left">
    <div className="flex items-baseline gap-1">
      <span className="font-display font-black text-white text-base leading-none">1</span>
      <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 leading-none">dia</span>
    </div>
    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 leading-tight mt-0.5">Ofensiva</span>
  </div>
</div>
```

### 5.2 Botão Alternador Arcade (Segmented Control 3D)
```tsx
<button
  type="button"
  onClick={() => setMode("path")}
  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-display font-black text-xs transition-all cursor-pointer bg-emerald-500 text-emerald-950 shadow-[0_4px_14px_rgba(16,185,129,0.4)] border-b-[3px] border-emerald-700 active:translate-y-0.5 active:border-b"
>
  <Compass className="h-4 w-4" />
  <span>Trilha de Estudo</span>
</button>
```

### 5.3 Baú de Troféu de Recompensa (3D Golden Chest)
```tsx
<div className="relative group shrink-0 rounded-2xl bg-gradient-to-b from-amber-500/25 via-zinc-950 to-black p-3.5 sm:px-5 sm:py-4 border-2 border-amber-400/50 border-b-4 border-b-amber-600 shadow-[0_10px_30px_rgba(245,158,11,0.25)] flex items-center gap-3.5">
  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-zinc-950 shadow-[0_0_16px_rgba(245,158,11,0.7)] shrink-0 border-b-2 border-amber-700">
    <Trophy className="h-6 w-6 fill-current stroke-[2.5]" />
  </div>
  <div className="flex flex-col">
    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300/90 leading-tight">Recompensa da Seção</span>
    <span className="font-display font-black text-lg sm:text-xl text-white leading-tight mt-0.5">
      +85 XP <span className="text-xs text-amber-400 font-extrabold uppercase tracking-wide">Bônus</span>
    </span>
  </div>
</div>
```

---

## ✅ 6. Checklist Visual Pré-Commit (Mandatório)

Antes de aprovar qualquer alteração de interface:

1. [ ] **Eliminação de AI-Pills:** O componente utiliza `bg-[color]-500/10 border-[color]-500/25`? Se SIM, **refatore para o padrão 3D tátil**.
2. [ ] **Sensação Mecânica / Relevo:** Os botões e cartões interativos possuem `border-b-[3px]` a `border-b-[5px]` e compressão `active:translate-y-0.5`?
3. [ ] **Tipografia:** Números de contagem, XP e títulos de impacto utilizam `.font-display font-black` (`Outfit`)?
4. [ ] **Contraste & Fundo:** O fundo respeita o dark cósmico do Gemini (`#070A0F` a `#0C0E14`) com reflexos speculares no topo?
5. [ ] **Micro-Progresso Visual:** Se o elemento envolve lições ou progresso, ele oferece feedback granular de avanço (barras segmentadas ou anéis de status)?
