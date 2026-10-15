import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { validateAndExtractYouTubeId } from "../security";

const execAsync = promisify(exec);

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
  url: string;
}

export interface SubtitleItem {
  start: number;
  end: number;
  text_en: string;
  text_pt: string;
}

/**
 * Serviço de Integração com o YouTube para o SaaS.
 * Utiliza o player do YouTube oficial no frontend e manipula apenas metadados e áudio leve temporário.
 */
export class YouTubeService {
  /**
   * Obtém metadados de vídeo do YouTube sem fazer download do arquivo de vídeo.
   */
  static async getMetadata(urlOrId: string): Promise<YouTubeMetadata> {
    const videoId = validateAndExtractYouTubeId(urlOrId);
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      const { stdout } = await execAsync(
        `yt-dlp --dump-json --skip-download "${canonicalUrl}"`,
        { maxBuffer: 10 * 1024 * 1024, timeout: 15000 }
      );
      const data = JSON.parse(stdout);
      return {
        videoId,
        title: data.title || "Vídeo do YouTube",
        uploader: data.uploader || data.channel || "",
        duration: Math.round(data.duration || 0),
        thumbnail:
          data.thumbnail ||
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        url: canonicalUrl,
      };
    } catch {
      // Fallback gracioso com thumbnail padrão oficial
      return {
        videoId,
        title: "Vídeo do YouTube",
        uploader: "Canal do YouTube",
        duration: 0,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        url: canonicalUrl,
      };
    }
  }

  /**
   * Traduz um lote de textos de inglês para português de forma segura.
   */
  static async translateBatch(
    texts: string[],
    source: string = "en",
    target: string = "pt"
  ): Promise<string[]> {
    if (!texts.length) return [];

    const translated: string[] = [];

    // Processa em chunks de 5 frases para respeitar limites de taxa
    for (const text of texts) {
      const clean = text.trim();
      if (!clean) {
        translated.push("");
        continue;
      }
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(
          clean
        )}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && Array.isArray(json[0])) {
            const sentence = json[0].map((item: any) => item[0]).join("");
            translated.push(sentence.trim());
            continue;
          }
        }
        translated.push(clean);
      } catch {
        translated.push(clean);
      }
    }

    return translated;
  }

  /**
   * Converte timestamp de VTT (HH:MM:SS.mmm ou MM:SS.mmm) para segundos em float.
   */
  private static parseVttTime(timeStr: string): number {
    const parts = timeStr.trim().replace(",", ".").split(":");
    if (parts.length === 3) {
      return (
        parseFloat(parts[0]) * 3600 +
        parseFloat(parts[1]) * 60 +
        parseFloat(parts[2])
      );
    } else if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return 0;
  }

  /**
   * Extrai e faz o parse das legendas do YouTube em VTT de forma totalmente autônoma.
   */
  static async extractSubtitles(videoId: string): Promise<SubtitleItem[]> {
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const tempDir = path.join(process.cwd(), "..", "data", "temp_subs");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPrefix = path.join(tempDir, `sub_${videoId}`);

    try {
      // Baixa apenas a legenda oficial ou gerada automaticamente pelo YouTube
      await execAsync(
        `yt-dlp --write-auto-sub --write-sub --sub-lang en --skip-download --sub-format vtt -o "${tempPrefix}" "${canonicalUrl}"`,
        { timeout: 20000 }
      );

      // Procura o arquivo .vtt gerado
      const possibleFiles = [
        `${tempPrefix}.en.vtt`,
        `${tempPrefix}.vtt`,
      ];

      let vttPath = possibleFiles.find((f) => fs.existsSync(f));

      // Se não encontrou exato, procura por glob
      if (!vttPath) {
        const files = fs.readdirSync(tempDir);
        const match = files.find(
          (f) => f.startsWith(`sub_${videoId}`) && f.endsWith(".vtt")
        );
        if (match) {
          vttPath = path.join(tempDir, match);
        }
      }

      if (!vttPath) {
        return [];
      }

      const vttContent = fs.readFileSync(vttPath, "utf-8");
      // Remove arquivo temporário
      try {
        fs.unlinkSync(vttPath);
      } catch {}

      // Faz o parsing das frases
      const rawSegments = YouTubeService.parseVttContent(vttContent);
      if (!rawSegments.length) return [];

      // Traduz as legendas em lote para o Português
      const englishTexts = rawSegments.map((s) => s.text_en);
      const portugueseTexts = await YouTubeService.translateBatch(
        englishTexts,
        "en",
        "pt"
      );

      return rawSegments.map((seg, idx) => ({
        ...seg,
        text_pt: portugueseTexts[idx] || seg.text_en,
      }));
    } catch (err) {
      console.error("[YouTubeService] Erro ao extrair legendas via VTT:", err);
      return [];
    }
  }

  /**
   * Parser robusto de conteúdo WebVTT para segmentos estruturados.
   */
  static parseVttContent(
    content: string
  ): Omit<SubtitleItem, "text_pt">[] {
    const lines = content.split(/\r?\n/);
    const segments: Omit<SubtitleItem, "text_pt">[] = [];

    const timeRegex =
      /((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})/;

    let currentStart = 0;
    let currentEnd = 0;
    let currentTexts: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const match = line.match(timeRegex);
      if (match) {
        // Se já tínhamos uma legenda anterior acumulada, salva
        if (currentTexts.length > 0) {
          const cleanText = currentTexts
            .join(" ")
            .replace(/<[^>]+>/g, "")
            .trim();
          if (cleanText) {
            segments.push({
              start: currentStart,
              end: currentEnd,
              text_en: cleanText,
            });
          }
          currentTexts = [];
        }

        currentStart = YouTubeService.parseVttTime(match[1]);
        currentEnd = YouTubeService.parseVttTime(match[2]);
        continue;
      }

      // Linhas de texto válidas (ignora cabeçalhos WebVTT, números de índice ou metadados)
      if (
        line &&
        !line.startsWith("WEBVTT") &&
        !line.startsWith("Kind:") &&
        !line.startsWith("Language:") &&
        !line.startsWith("NOTE") &&
        !/^\d+$/.test(line)
      ) {
        // Remove tags HTML como <c> ou <00:00:01.000>
        const cleanLine = line.replace(/<[^>]+>/g, "").trim();
        if (cleanLine && !currentTexts.includes(cleanLine)) {
          currentTexts.push(cleanLine);
        }
      }
    }

    // Salva o último segmento pendente
    if (currentTexts.length > 0) {
      const cleanText = currentTexts.join(" ").replace(/<[^>]+>/g, "").trim();
      if (cleanText) {
        segments.push({
          start: currentStart,
          end: currentEnd,
          text_en: cleanText,
        });
      }
    }

    return segments;
  }
}

