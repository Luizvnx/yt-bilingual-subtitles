# yt-bilingual-subtitles

Aplicativo para baixar vídeos do YouTube e gerar legendas bilíngues (inglês e português) usando IA (Whisper). Ideal para quem deseja estudar idiomas com vídeos reais da internet.

## Funcionalidades

- Baixa o áudio de vídeos do YouTube em mp3.
- Transcreve o áudio automaticamente usando o modelo Whisper.
- Gera legendas em português e inglês simultaneamente.
- Retorna as legendas sincronizadas para facilitar o estudo de idiomas.

## Para quem é este projeto?

Para estudantes de inglês/português, professores, autodidatas e qualquer pessoa que queira aprender idiomas usando vídeos do YouTube com legendas bilíngues.

## Como funciona

1. O usuário informa a URL do vídeo do YouTube.
2. O sistema baixa o áudio do vídeo.
3. O áudio é transcrito e traduzido automaticamente.
4. As legendas são geradas e disponibilizadas em ambos os idiomas.

## Tecnologias utilizadas

- Python
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (para download de áudio)
- [Whisper](https://github.com/openai/whisper) (para transcrição e tradução)
- Flask (backend API)
- ffmpeg (processamento de áudio)

## Como rodar localmente

1. Clone este repositório.
2. Instale as dependências:
   ```bash
   pip install -r requirements.txt