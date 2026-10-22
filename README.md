# 🎬 YT Bilingual Subtitles | Estudo de Idiomas com YouTube

Aplicativo moderno de alta performance para transformar vídeos do YouTube em um **estúdio interativo e gamificado de aprendizado de idiomas com legendas bilíngues (inglês e português)** sincronizadas em tempo real. Construído com **Next.js 14 (App Router)**, **Tailwind CSS**, **OpenAI Whisper**, **Groq AI / Llama 3**, e infraestrutura de proxy **Cloudflare WARP (SOCKS5)** para contornar bloqueios de datacenter.

![Status](https://img.shields.io/badge/Status-Modernizado%20%26%20Gamificado-emerald)
![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black)
![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-3.4-38bdf8)
![Docker](https://img.shields.io/badge/Docker-Compose%20v2-2496ed)
![WARP](https://img.shields.io/badge/Cloudflare%20WARP-SOCKS5%20Sidecar-f38020)

---

## ✨ Principais Funcionalidades

### 🎮 Gamificação Imersiva & Trilha de Aprendizado
- **Trilha de Mundos (*World Island Strip*)**: Navegação fluida entre Mundos Temáticos (Mundo 1: Fundamentos a Mundo 4: Maestria Avançada) com botões táteis 3D estilo arcade.
- **Portal de Aventura Jade Cósmico**: Ficha viva com barra de progresso de imersão (*2h 45m* recomendadas) e contadores de XP e ofensiva sincronizados no HUD.
- **Arena do Boss Final**: Desafio culminante de cada mundo com relevo tátil 3D (`bg-rose-600 border-b-4 border-rose-800`), barra de vida/escudo de HP interativa e recompensas massivas de XP (`+150 XP`).

### 🎙️ Modos de Transcrição Amigáveis (Zero Layout Shift)
- Seleção instantânea sem oscilação de layout da barra de inserção:
  - **Equilibrado (Recomendado)**: Melhor relação entre velocidade e precisão no vocabulário (`whisper base`).
  - **Ultra Rápido**: Transcrição quase instantânea para vídeos longos (`whisper tiny`).
  - **Alta Precisão**: Máxima acurácia para sotaques desafiadores e áudios com ruído (`whisper small`).

### 🎧 Estúdio de Vídeo Multimodo (3 Layouts)
- **Modo Dividido (Padrão)**: Vídeo à esquerda e transcrição interativa à direita, com auto-scroll suave e iluminação na frase falada.
- **Modo Cinema**: Player de vídeo expandido ao máximo com transcrição compacta.
- **Modo Foco Leitura**: Transcrição bilíngue em largura total para estudo aprofundado e exportação.

### ⌨️ Atalhos Nacionais do Teclado
| Tecla | Ação |
| :--- | :--- |
| `Espaço` | Reproduzir / Pausar vídeo (com bypass em campos de digitação) |
| `R` | Repetir a sentença atual em reprodução |
| `Seta Esquerda (←)` | Voltar 5 segundos |
| `Seta Direita (→)` | Avançar 5 segundos |

### 📚 Prática & Exportação
- **Shadowing & Gravação**: Pratique pronúncia ouvindo o mesmo trecho repetidamente.
- **Exportação Multiformato**: Copie com 1 clique para Anki (`.apkg`) ou baixe em `.srt` e `.vtt`.
- **Dicionário Pop-up**: Clique em qualquer palavra em inglês para ver definição fonética e tradução contextual instantânea.

---

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos
- Node.js 18+ ou 20+
- Python 3.10+
- FFmpeg instalado no sistema

### 2. Instalação e Execução

Na raiz do projeto:
```bash
# Instalar dependências do frontend
cd frontend
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Abra o seu navegador em:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Ambientes & Deploy (Produção & Staging)

O projeto possui esteiras de deploy automatizadas com Docker Compose, isolamento de proxy Cloudflare WARP e portas dedicadas.

### Staging (Homologação)
- **Porta Web**: `3001`
- **Script de deploy**:
  ```bash
  bash deploy-stage.sh            # Atualiza branch stage ou atual e sobe
  bash deploy-stage.sh <branch>   # Sobe uma branch específica
  bash deploy-stage.sh logs       # Logs em tempo real
  bash deploy-stage.sh stop       # Para os containers de staging
  ```

### Produção
- **Porta Web**: `3000`
- **Script de deploy**:
  ```bash
  bash deploy.sh
  ```

---

## 🎨 Sistema de Design
Para detalhes sobre a paleta Gemini Cosmic Dark, relevo físico 3D (Duolingo Feather) e tokens tipográficos (Outfit + Inter), consulte o [DESIGN_SYSTEM.md](file:///d:/projetos/yt-bilingual-subtitles-app/DESIGN_SYSTEM.md).