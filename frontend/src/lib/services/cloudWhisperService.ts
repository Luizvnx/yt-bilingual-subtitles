import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

/**
 * Serviço de Transcrição de Áudio em Nuvem via Groq Whisper ou OpenAI Whisper.
 * Usado como fallback ultra-rápido quando o vídeo do YouTube não possui legendas nativas.
 */
export class CloudWhisperService {
  /**
   * Transcreve a fala do áudio do YouTube usando inferência em nuvem em alta velocidade.
   */
  static async transcribeAudio(
    videoId: string,
    onProgress?: (stage: number, message: string) => void
  ): Promise<WhisperSegment[]> {
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!groqKey && !openaiKey) {
      console.warn(
        "[CloudWhisper] Nenhuma chave de IA em nuvem configurada (GROQ_API_KEY ou OPENAI_API_KEY)."
      );
      return [];
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const tempDir = path.join(os.tmpdir(), "yt_audio");
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
      } catch {}
    }

    const audioPath = path.join(tempDir, `audio_${videoId}.m4a`);

    try {
      onProgress?.(
        50,
        "Vídeo sem legendas nativas. Baixando faixa de áudio otimizada..."
      );

      // Baixa apenas o áudio compactado (bitrate leve 48k/64k) em 1 a 3 segundos
      await execAsync(
        `yt-dlp --no-cache-dir --no-warnings --force-ipv4 -x --audio-format m4a --audio-quality 8 --extractor-args "youtube:player_client=android,ios,web" -o "${audioPath}" "${canonicalUrl}"`,
        { timeout: 35000 }
      );

      if (!fs.existsSync(audioPath)) {
        throw new Error("Arquivo de áudio não pôde ser gerado.");
      }

      onProgress?.(
        68,
        "Transcrevendo fala em inglês com IA em nuvem (Groq Whisper)..."
      );

      const fileBuffer = fs.readFileSync(audioPath);
      const blob = new Blob([fileBuffer], { type: "audio/m4a" });
      const formData = new FormData();
      formData.append("file", blob, `audio_${videoId}.m4a`);

      let apiUrl = "https://api.groq.com/openai/v1/audio/transcriptions";
      let apiKey = groqKey;
      let model = "whisper-large-v3-turbo";

      if (!groqKey && openaiKey) {
        apiUrl = "https://api.openai.com/v1/audio/transcriptions";
        apiKey = openaiKey;
        model = "whisper-1";
      }

      formData.append("model", model);
      formData.append("response_format", "verbose_json");
      formData.append("language", "en");

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CloudWhisper API Error]:", errorText);
        return [];
      }

      const json = await response.json();
      const rawSegments = json.segments || [];

      return rawSegments.map((s: any, idx: number) => ({
        id: idx + 1,
        start: Math.round(Number(s.start || 0) * 100) / 100,
        end: Math.round(Number(s.end || 0) * 100) / 100,
        text: (s.text || "").trim(),
      }));
    } catch (err: any) {
      console.error("[CloudWhisper Error]:", err?.message);
      return [];
    } finally {
      // Regra estrita de Zero Storage de mídia: exclusão imediata do arquivo
      if (fs.existsSync(audioPath)) {
        try {
          fs.unlinkSync(audioPath);
        } catch {}
      }
    }
  }
}
