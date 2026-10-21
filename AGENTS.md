# 🛡️ Diretrizes de Arquitetura, Histórico & Mapa de Verificação

Este documento é a **referência técnica mandatória** deste repositório. Qualquer agente de IA ou desenvolvedor humano **DEVE ler e respeitar este mapa** antes de alterar qualquer linha de código na infraestrutura, scripts de extração, rede ou Docker.

---

## 📜 1. Histórico do Problema & Como Foi Resolvido

### 1.1 O Desafio
* **Ambiente de Produção:** VPS Oracle Cloud Infrastructure (OCI) Ubuntu 24.04 em arquitetura ARM64 Ampere A1 (`137.131.164.202`).
* **Sintoma:** O processamento de vídeos do YouTube retornava apenas 1 segmento genérico com o título do vídeo (`segmentsCount: 1`), sem as falas reais do vídeo.
* **Causa Raiz:** O YouTube bloqueia requisições vindas de datacenters em nuvem (Oracle, AWS, GCP, Hetzner, DigitalOcean) exigindo autenticação/captcha:
  > *"Sign in to confirm you're not a bot. This helps protect our community."*

### 1.2 O que NÃO funcionou (Armadilhas Evitadas)
1. **Instalar WARP no Host da VPS via `warp-cli`:**
   - ❌ **Perigo Extremo:** No Ubuntu da Oracle Cloud, o cliente nativo do Cloudflare WARP modifica a tabela de rotas do kernel e quebra permanentemente o gateway de rede interna (VCN) e a conexão SSH, bloqueando o acesso do administrador ao servidor.
2. **Usar `urllib.request` do Python para proxies SOCKS5:**
   - ❌ `urllib.request.ProxyHandler` não tem suporte ao protocolo `socks5://` e causa falhas em tempo de execução.
3. **Diretório Incorreto no Deploy:**
   - ❌ O caminho do projeto no servidor é `/home/ubuntu/yt-bilingual-subtitles` (e **não** `/root/yt-bilingual-subtitles-app`).

### 1.3 A Solução Definitiva Adotada (Padrão Invidious/Piped)
1. **Container Docker Sidecar Isolado:**
   - Criado o serviço `warp` no `docker-compose.yml` usando a imagem `caomingjun/warp:latest`.
   - Adicionada a regra `device_cgroup_rules: ['c 10:200 rwm']` e capacidades `NET_ADMIN, MKNOD, AUDIT_WRITE` para permitir a interface `tun` no Ubuntu 24.04 (runc/systemd cgroup v2).
   - O proxy SOCKS5 roda internamente na porta `1080` da rede Docker `yt_network`, isolado do host e sem tocar nas rotas SSH da VPS.
2. **Comunicação Segura da Aplicação:**
   - A aplicação Next.js comunica com o proxy através da variável `YOUTUBE_PROXY=socks5://warp:1080`.
3. **Script Python com Resiliência Total (`scripts/extract_subs.py`):**
   - Usa `requests` com `pysocks` para suporte robusto a SOCKS5.
   - Possui teste de conectividade pré-voo (*pre-flight check*) com timeout de **1.8s** contra `https://www.cloudflare.com/cdn-cgi/trace`. Se o proxy falhar ou estiver inacessível, faz fallback imediato para requisição direta sem travar o app.
4. **Deploy Automatizado (`deploy.sh`):**
   - Auto-detecta privilégios de `sudo`, compatibilidade com `docker compose` (v2) e `docker-compose` (v1).

---

## 🗺️ 2. Mapa de Verificação Pré-Alteração (Checklist Obrigatório)

Antes de realizar commits ou alterações, execute esta validação mental:

```
[ ] Minha alteração mexe no docker-compose.yml?
    └── Se SIM: O serviço 'warp' e suas propriedades continuam intocados?
[ ] Minha alteração mexe na extração de legendas ou scripts python?
    └── Se SIM: Mantive o uso de `requests` com `pysocks` e o fallback?
[ ] Minha alteração mexe no Dockerfile?
    └── Se SIM: O virtualenv `/opt/venv` continua com `pysocks`, `requests[socks]`, `yt-dlp` e `quickjs`?
[ ] Minha alteração mexe no Frontend, CSS ou Componentes?
    └── Se SIM: Li o DESIGN_SYSTEM.md e evitei o padrão genérico de IA (bg-color/10)?
    └── Usei relevo físico 3D (border-b-4/border-b-[3px]) e Outfit (.font-display font-black)?
[ ] Minha instrução de deploy indica o diretório correto?
    └── O caminho DEVE ser obrigatoriamente `/home/ubuntu/yt-bilingual-subtitles`!
```

---

## 🚫 3. O que NÃO PODE Ser Alterado (Componentes Críticos)

> ⚠️ Alterar qualquer um destes itens quebrará a extração de legendas em produção na VPS.

1. **Serviço `warp` no `docker-compose.yml`:**
   - Não remover `image: caomingjun/warp:latest`.
   - Não remover `device_cgroup_rules: ['c 10:200 rwm']`.
   - Não remover `cap_add: [NET_ADMIN, MKNOD, AUDIT_WRITE]`.
   - Não remover os `sysctls` de IPv6 e source validation.
2. **Configuração de Proxy:**
   - Manter `YOUTUBE_PROXY: ${YOUTUBE_PROXY:-socks5://warp:1080}` apontando para o container `warp`.
3. **Compatibilidade SOCKS5:**
   - Nunca trocar a biblioteca `requests` por `urllib` nas rotas que utilizam proxy.
   - Não remover `pysocks` e `requests[socks]` do `frontend/Dockerfile`.
4. **Pre-flight Check com Timeout Rápido:**
   - O teste de conectividade do proxy em `scripts/extract_subs.py` deve ter timeout máximo de **2 segundos** para nunca atrasar as requisições normais caso o proxy oscile.
5. **Diretório do Servidor:**
   - Nunca instruir a execução de deploys fora de `/home/ubuntu/yt-bilingual-subtitles`.

---

## ✅ 4. O que PODE Ser Alterado e Evoluído Livremente

* **Frontend e UI/UX:**
  - Páginas Next.js em `frontend/src/app/**`.
  - Componentes React em `frontend/src/components/**`.
  - Estilos, temas Dark/Light, Tailwind CSS, fontes e ícones Lucide.
* **Recursos do Estúdio de Estudo:**
  - Sincronização de legendas, auto-scroll, dicionário pop-up e player do YouTube.
  - Exportação de Anki (`.apkg`), SRT e VTT.
* **Lógica de Negócio e Banco de Dados:**
  - Novos modelos e migrações no Prisma (`frontend/prisma/schema.prisma`).
  - Rotas de API e controllers em `frontend/src/app/api/**`.
  - Sistema de planos, assinaturas e webhooks do Stripe.
* **Provedores de Inteligência Artificial:**
  - Configuração de Groq API (`GROQ_API_KEY`) para acelerar traduções via Llama 3.
  - OpenAI Whisper para transcrições diretas de áudio quando ativado.
* **Domínio e SSL:**
  - Configuração de Nginx, Certbot e Cloudflare SSL na porta 443.

---

## 🧪 5. Ambiente de Homologação / Staging (`docker-compose.stage.yml`)

Para testar novas features, migrações de banco e alterações de layout antes de publicar em Produção, o repositório conta com um ambiente de STAGE totalmente isolado:

* **Portas Isoladas:**
  - Aplicação Web: `3001` (Produção usa `3000`).
  - PostgreSQL: `5434` (Produção usa `5433`).
* **Isolamento de Containers & Rede:**
  - Containers: `yt_subtitles_app_stage`, `yt_subtitles_postgres_stage`, `yt_subtitles_warp_stage`.
  - Rede Docker: `yt_network_stage`.
  - Volumes: `yt_app_data_stage`, `yt_postgres_data_stage`, `yt_warp_data_stage`.
* **Deploy Rápido de Stage:**
  ```bash
  # Na VPS (/home/ubuntu/yt-bilingual-subtitles):
  bash deploy-stage.sh            # Atualiza branch stage ou atual e sobe
  bash deploy-stage.sh <branch>   # Sobe uma branch específica para testes
  bash deploy-stage.sh logs       # Acompanha logs em tempo real
  bash deploy-stage.sh stop       # Desliga o stage para poupar memória
  ```
* **Acesso Web Stage:** `http://137.131.164.202:3001` (Exibe badge âmbar `STAGE` na Navbar).

---

## 🎨 6. Diretrizes Visuais & Sistema de Design (Gemini Dark + Duolingo 3D)

O projeto possui um guia de design canônico detalhado e obrigatório em [DESIGN_SYSTEM.md](file:///d:/projetos/yt-bilingual-subtitles-app/DESIGN_SYSTEM.md). Qualquer intervenção visual na aplicação Next.js **DEVE consultar e obedecer este guia**.

### 6.1 Regras de Ouro de UI/UX
1. **Banimento do Padrão Genérico de IA:**
   - ❌ **TERMINANTEMENTE PROIBIDO:** Criar pílulas ou cartões com fundo claro translúcido e texto/borda fina lavada (`bg-[color]-500/10 border-[color]-500/25 text-[color]-400`). Esse é o padrão padrão de chatbots de IA que descaracteriza o app.
2. **Afroldância Física 3D (Duolingo Feather):**
   - ✅ Botões, fichas de gamificação e cartões de mundo/seção devem ter relevo chanfrado sólido (`border-b-[3px]`, `border-b-[4px]` ou `border-b-[5px]`).
   - ✅ Resposta tátil ao clique: compressão mecânica no estado ativo (`active:translate-y-0.5 active:border-b`).
3. **Ambiente Gemini Cosmic Dark:**
   - ✅ Fundos cósmicos escuros e profundos (`#070A0F`, `#090A0F`, `#0B0D14`, `#0C0E14`).
   - ✅ Specular highlights translúcidos no topo (`border-t border-white/20`).
   - ✅ Auras e nébulas suaves difusas nos cantos (`blur-3xl opacity-25`), mantendo o contraste limpo.
4. **Tipografia Diferenciada:**
   - ✅ Contadores de XP, dias de ofensiva (Streak), números e títulos de seções usam **`Outfit`** (`.font-display font-black`).
   - ✅ Legendas, diálogos bilíngues e textos de apoio usam **`Inter`** (`font-sans font-medium`).


