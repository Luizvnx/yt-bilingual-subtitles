# 🎬 YT Bilingual Subtitles

Aplicativo completo para transformar vídeos do YouTube em um **estúdio interativo de aprendizado de inglês com legendas bilíngues (inglês e português)** sincronizadas em tempo real usando inteligência artificial (**OpenAI Whisper**).

![Demonstração](https://img.shields.io/badge/Status-Ativo%20e%20Modernizado-brightgreen)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Whisper](https://img.shields.io/badge/OpenAI-Whisper-blueviolet)
![yt-dlp](https://img.shields.io/badge/yt--dlp-2026.8%2B-red)

---

## ✨ Principais Funcionalidades

- **Download em Alta Definição (MP4)**: Baixa vídeos do YouTube com áudio e vídeo integrados via `yt-dlp` e `ffmpeg`.
- **Transcrição com Inteligência Artificial (Whisper)**: Detecta falas em inglês com alta precisão e gera marcações temporais exatas.
- **Tradução Bilíngue em Lote**: Traduz rapidamente as legendas em blocos para o português com fallback resiliente.
- **Player Interativo com Sincronização em Tempo Real**:
  - **Transcrição Lateral Dinâmica**: Acompanha o vídeo e destaca a frase atual com iluminação e rolagem suave automática (*Auto-scroll*).
  - **Clique para Pular**: Clique em qualquer frase da transcrição para pular o vídeo diretamente para aquele exato segundo.
  - **Legendas Customizadas no Vídeo**: Alterne entre modo Bilíngue (PT/EN), Apenas Inglês, Apenas Português ou Oculto.
  - **Prática de Pronúncia (*Shadowing*)**: Botão de repetição de frase para ouvir e praticar o mesmo trecho repetidamente.
  - **Controle de Velocidade**: Modos `0.75x`, `1.0x` e `1.25x` para treinar a escuta (*listening*).
  - **Filtro de Busca em Tempo Real**: Busque palavras em inglês ou português na transcrição completa.
  - **Copiar para o Anki/Notas**: 1 clique para copiar o par de frases (EN + PT) com timestamp.
- **Links Compartilháveis Diretos**: Cada vídeo possui seu link permanente local (ex: `http://localhost:5000/watch/<id>`).
- **Histórico e Biblioteca Local**: Acesso instantâneo a todos os vídeos já processados sem precisar baixar novamente.
- **Exportação Multiformato**: Baixe as legendas em `.srt` e `.vtt` (Bilíngue, Inglês ou Português).

---

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos

- Python 3.10 ou superior.
- [FFmpeg](https://ffmpeg.org/) instalado no sistema (ou configurado no `.env`).

### 2. Instalação das Dependências

Na raiz do projeto, execute:
```bash
pip install -r requirements.txt
```

*(Opcional) Verifique se o caminho do `ffmpeg` no arquivo `.env` está correto, caso não esteja no PATH global do Windows.*

### 3. Iniciar a Aplicação

Execute o servidor Flask:
```bash
python backend/app.py
```

Abra o seu navegador em:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 🎯 Como Usar para Estudar Inglês

1. Cole o link de qualquer vídeo do YouTube no campo principal.
2. Selecione o modelo de IA desejado:
   - **Whisper Base** (Padrão - muito rápido e preciso para inglês).
   - **Whisper Tiny** (Ultra-rápido).
   - **Whisper Small** (Maior precisão).
3. Clique em **"Gerar Legendas Bilíngues"**.
4. O aplicativo baixará o vídeo, transcreverá, traduzirá e abrirá o **Studio do Vídeo**.
5. Para salvar o link direto de estudo do vídeo, clique em **"Copiar Link"** (ex: `http://localhost:5000/watch/jNQXAC9IVRw`).

### ⌨️ Atalhos do Teclado

| Tecla | Ação |
| :--- | :--- |
| `Espaço` | Reproduzir / Pausar vídeo |
| `Seta Esquerda (←)` | Voltar 5 segundos |
| `Seta Direita (→)` | Avançar 5 segundos |
| `L` | Repetir a frase atual em reprodução |

---

## 📡 Endpoints da API

- `POST /subtitles/process`: Processa o vídeo a partir do payload `{"url": "...", "model": "base"}`.
- `GET /subtitles/history`: Retorna a lista de vídeos processados.
- `GET /subtitles/video/<video_id>`: Retorna os dados completos e legendas de um vídeo.
- `DELETE /subtitles/video/<video_id>`: Exclui o vídeo do histórico e do disco.
- `GET /media/video/<filename>`: Streaming do vídeo MP4 com suporte a HTTP 206 (byte-range).
- `GET /media/subtitle/<filename>`: Download de arquivos `.vtt` e `.srt`.