import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { validateAndExtractYouTubeId } from "../security";
import { CloudWhisperService } from "./cloudWhisperService";

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

// Cache em memória de traduções para responder instantaneamente
const TRANSLATION_CACHE = new Map<string, string>();

/**
 * Serviço de Integração com o YouTube para o SaaS.
 * Utiliza o player do YouTube oficial no frontend e manipula apenas metadados e legendas leves.
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
   * Traduz um único texto com cadeia de fallbacks resiliente:
   * 1. Google Chrome Extension Translation (clients5)
   * 2. MyMemory Translated API
   * 3. Google GTX Single endpoint
   */
  private static async translateSingleText(
    text: string,
    source = "en",
    target = "pt"
  ): Promise<string> {
    const clean = text.trim();
    if (!clean) return clean;

    const cacheKey = `${source}:${target}:${clean}`;
    const cached = TRANSLATION_CACHE.get(cacheKey);
    if (
      cached &&
      (clean.length <= 4 ||
        cached.trim().toLowerCase() !== clean.trim().toLowerCase())
    ) {
      return cached;
    }

    // 1. Provedor Primário: Google Chrome Extension API
    try {
      const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${source}&tl=${target}&q=${encodeURIComponent(
        clean
      )}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        const json = await res.json();
        const trans = Array.isArray(json) ? json[0] : json;
        if (trans && typeof trans === "string" && trans.trim()) {
          const result = trans.trim();
          if (clean.length <= 4 || result.toLowerCase() !== clean.toLowerCase()) {
            TRANSLATION_CACHE.set(cacheKey, result);
          }
          return result;
        }
      }
    } catch {}

    // 2. Provedor Secundário: MyMemory Translated API
    try {
      const targetLang = target === "pt" ? "pt-BR" : target;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        clean
      )}&langpair=${source}|${targetLang}&de=bilingualstudy@app.io`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        const json = await res.json();
        const trans = json.responseData?.translatedText;
        if (
          trans &&
          typeof trans === "string" &&
          trans.trim() &&
          !trans.includes("MYMEMORY WARNING")
        ) {
          const result = trans.trim();
          if (clean.length <= 4 || result.toLowerCase() !== clean.toLowerCase()) {
            TRANSLATION_CACHE.set(cacheKey, result);
          }
          return result;
        }
      }
    } catch {}

    // 3. Provedor Terciário: Google GTX single
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(
        clean
      )}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && Array.isArray(json[0])) {
          const trans = json[0].map((item: any) => item[0]).join("");
          if (trans && typeof trans === "string" && trans.trim()) {
            const result = trans.trim();
            if (clean.length <= 4 || result.toLowerCase() !== clean.toLowerCase()) {
              TRANSLATION_CACHE.set(cacheKey, result);
            }
            return result;
          }
        }
      }
    } catch {}

    return clean;
  }

  /**
   * Tradução em lote de alta performance e à prova de falhas:
   * 1. Consulta cache em memória instantâneo.
   * 2. Agrupa sentenças usando delimitador " ||| " com clients5.google.com.
   * 3. Se um lote falhar ou retornar tamanho inconsistente, traduz em paralelo via translateSingleText.
   */
  static async translateBatch(
    texts: string[],
    source: string = "en",
    target: string = "pt"
  ): Promise<string[]> {
    if (!texts.length) return [];

    const results: string[] = new Array(texts.length);
    const indicesToFetch: number[] = [];
    const textsToFetch: string[] = [];

    // 1. Verifica cache em memória primeiro (ignora entradas não traduzidas)
    for (let i = 0; i < texts.length; i++) {
      const clean = texts[i].trim();
      if (!clean) {
        results[i] = "";
        continue;
      }
      const cacheKey = `${source}:${target}:${clean}`;
      const cached = TRANSLATION_CACHE.get(cacheKey);
      if (
        cached &&
        (clean.length <= 4 ||
          cached.trim().toLowerCase() !== clean.trim().toLowerCase())
      ) {
        results[i] = cached;
      } else {
        indicesToFetch.push(i);
        textsToFetch.push(clean);
      }
    }

    if (!textsToFetch.length) {
      return results;
    }

    // 2. Agrupa em lotes de 15 frases usando delimitador exclusivo " ||| "
    const CHUNK_SIZE = 15;
    const chunks: { indices: number[]; texts: string[] }[] = [];

    for (let i = 0; i < textsToFetch.length; i += CHUNK_SIZE) {
      chunks.push({
        indices: indicesToFetch.slice(i, i + CHUNK_SIZE),
        texts: textsToFetch.slice(i, i + CHUNK_SIZE),
      });
    }

    // Executa em paralelo até 3 chunks simultâneos
    const processChunk = async (chunk: { indices: number[]; texts: string[] }) => {
      const separator = " ||| ";
      const combined = chunk.texts.join(separator);

      // Tenta tradução em lote via clients5.google.com
      try {
        const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${source}&tl=${target}&q=${encodeURIComponent(
          combined
        )}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(7500),
        });

        if (res.ok) {
          const json = await res.json();
          const fullTranslated = Array.isArray(json) ? json[0] : json;

          if (fullTranslated && typeof fullTranslated === "string") {
            const parts = fullTranslated.split(/\s*\|\|\|\s*/);

            if (parts.length === chunk.indices.length) {
              for (let j = 0; j < chunk.indices.length; j++) {
                const originalIndex = chunk.indices[j];
                const originalText = chunk.texts[j];
                const transText = (parts[j] || "").trim() || originalText;

                results[originalIndex] = transText;
                if (
                  originalText.length <= 4 ||
                  transText.trim().toLowerCase() !==
                    originalText.trim().toLowerCase()
                ) {
                  TRANSLATION_CACHE.set(
                    `${source}:${target}:${originalText}`,
                    transText
                  );
                }
              }
              return;
            }
          }
        }
      } catch {
        // Se o lote falhar, segue para os fallbacks individuais
      }

      // Fallback: tradução individual resiliente em paralelo
      await Promise.all(
        chunk.indices.map(async (origIdx, j) => {
          const originalText = chunk.texts[j];
          const trans = await YouTubeService.translateSingleText(
            originalText,
            source,
            target
          );
          results[origIdx] = trans;
        })
      );
    };

    const MAX_CONCURRENT = 3;
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
      const batch = chunks.slice(i, i + MAX_CONCURRENT);
      await Promise.all(batch.map((c) => processChunk(c)));
    }

    return results;
  }

  /**
   * Extrai e formata legendas do YouTube em segundos, utilizando o formato json3 limpo.
   */
  static async extractSubtitles(
    videoId: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<SubtitleItem[]> {
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const baseDataDir = fs.existsSync(path.join(process.cwd(), "data"))
      ? path.join(process.cwd(), "data")
      : fs.existsSync(path.join(process.cwd(), "..", "data"))
      ? path.join(process.cwd(), "..", "data")
      : path.join(process.cwd(), "data");
    const tempDir = path.join(baseDataDir, "temp_subs");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPrefix = path.join(tempDir, `sub_${videoId}`);
    onProgress?.(40, "Consultando eventos de legendas sincronizadas do YouTube...");

    try {
      // 1. Tenta baixar em formato json3 (formato de eventos limpos sem repetição)
      await execAsync(
        `yt-dlp --write-auto-sub --write-sub --sub-lang en --skip-download --sub-format json3 -o "${tempPrefix}" "${canonicalUrl}"`,
        { timeout: 25000 }
      );

      // Procura arquivo json3
      const files = fs.readdirSync(tempDir);
      const json3Match = files.find(
        (f) => f.startsWith(`sub_${videoId}`) && f.endsWith(".json3")
      );

      if (json3Match) {
        const json3Path = path.join(tempDir, json3Match);
        const jsonContent = fs.readFileSync(json3Path, "utf-8");
        try {
          fs.unlinkSync(json3Path);
        } catch {}

        const parsedJson = JSON.parse(jsonContent);
        const rawSegments = YouTubeService.parseJson3Content(parsedJson);

        if (rawSegments.length > 0) {
          onProgress?.(60, `Identificadas ${rawSegments.length} falas. Agrupando frases naturais...`);
          // Agrupa pequenos fragmentos em frases naturais completas (mínimo 2.5s)
          const mergedSegments = YouTubeService.mergeNaturalSentences(rawSegments);

          // Tradução em lote rápida
          onProgress?.(75, `Traduzindo ${mergedSegments.length} frases bilíngues com IA...`);
          const englishTexts = mergedSegments.map((s) => s.text_en);
          const portugueseTexts = await YouTubeService.translateBatch(
            englishTexts,
            "en",
            "pt"
          );

          onProgress?.(92, "Sincronizando minutagem e estúdio bilíngue...");
          return mergedSegments.map((seg, idx) => ({
            ...seg,
            text_pt: portugueseTexts[idx] || seg.text_en,
          }));
        }
      }

      // 2. Fallback para VTT caso json3 não esteja disponível
      onProgress?.(50, "Tentando formato alternativo de legendas...");
      await execAsync(
        `yt-dlp --write-auto-sub --write-sub --sub-lang en --skip-download --sub-format vtt -o "${tempPrefix}" "${canonicalUrl}"`,
        { timeout: 25000 }
      );

      const filesVtt = fs.readdirSync(tempDir);
      const vttMatch = filesVtt.find(
        (f) => f.startsWith(`sub_${videoId}`) && f.endsWith(".vtt")
      );

      if (vttMatch) {
        const vttPath = path.join(tempDir, vttMatch);
        const vttContent = fs.readFileSync(vttPath, "utf-8");
        try {
          fs.unlinkSync(vttPath);
        } catch {}

        const rawSegments = YouTubeService.parseVttContent(vttContent);
        if (rawSegments.length > 0) {
          onProgress?.(65, `Agrupando ${rawSegments.length} falas em frases completas...`);
          const mergedSegments = YouTubeService.mergeNaturalSentences(rawSegments);
          const englishTexts = mergedSegments.map((s) => s.text_en);
          onProgress?.(80, `Traduzindo ${mergedSegments.length} frases em lote...`);
          const portugueseTexts = await YouTubeService.translateBatch(
            englishTexts,
            "en",
            "pt"
          );

          onProgress?.(92, "Sincronizando minutagem e estúdio bilíngue...");
          return mergedSegments.map((seg, idx) => ({
            ...seg,
            text_pt: portugueseTexts[idx] || seg.text_en,
          }));
        }
      }

      // 3. Fallback inteligente com Cloud Whisper (Groq) se o YouTube não possuir legendas nativas
      const whisperSegments = await CloudWhisperService.transcribeAudio(
        videoId,
        onProgress
      );

      if (whisperSegments.length > 0) {
        onProgress?.(
          78,
          `Agrupando ${whisperSegments.length} falas da IA em frases naturais...`
        );
        const rawSegments = whisperSegments.map((s) => ({
          start: s.start,
          end: s.end,
          text_en: s.text,
        }));
        const mergedSegments = YouTubeService.mergeNaturalSentences(rawSegments);
        const englishTexts = mergedSegments.map((s) => s.text_en);
        onProgress?.(
          85,
          `Traduzindo ${mergedSegments.length} frases da IA para o português...`
        );
        const portugueseTexts = await YouTubeService.translateBatch(
          englishTexts,
          "en",
          "pt"
        );

        onProgress?.(95, "Sincronizando estúdio bilíngue...");
        return mergedSegments.map((seg, idx) => ({
          ...seg,
          text_pt: portugueseTexts[idx] || seg.text_en,
        }));
      }

      return [];
    } catch (err) {
      console.error("[YouTubeService] Erro ao extrair legendas:", err);
      return [];
    }
  }

  /**
   * Parser direto e rápido de eventos JSON3 do YouTube (sem duplicação).
   */
  static parseJson3Content(data: any): Omit<SubtitleItem, "text_pt">[] {
    const events = data?.events || [];
    const segments: Omit<SubtitleItem, "text_pt">[] = [];

    for (const ev of events) {
      if (!ev.segs || !Array.isArray(ev.segs)) continue;

      const text = ev.segs
        .map((s: any) => s.utf8 || "")
        .join("")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!text || text === "\n") continue;

      const start = Math.round((ev.tStartMs || 0) / 10) / 100;
      const duration = Math.round((ev.dDurationMs || 0) / 10) / 100;
      const end = Math.round((start + duration) * 100) / 100;

      segments.push({
        start,
        end: Math.max(end, start + 0.5),
        text_en: text,
      });
    }

    return segments;
  }

  /**
   * Agrupa fragmentos curtos em frases naturais (3 a 6 segundos).
   * Melhora imensamente o estudo no player e reduz a quantidade de traduções em 60%.
   */
  static mergeNaturalSentences(
    raw: Omit<SubtitleItem, "text_pt">[]
  ): Omit<SubtitleItem, "text_pt">[] {
    if (!raw.length) return [];

    const merged: Omit<SubtitleItem, "text_pt">[] = [];
    let current = { ...raw[0] };

    for (let i = 1; i < raw.length; i++) {
      const next = raw[i];
      const duration = current.end - current.start;
      const endsWithPunct = /[.!?]$/.test(current.text_en);
      const gap = next.start - current.end;

      // Agrupa se a frase atual for muito curta (< 3.5s) e não terminar com pontuação forte
      if (duration < 4.0 && !endsWithPunct && gap < 1.0) {
        current.text_en = `${current.text_en} ${next.text_en}`.trim();
        current.end = next.end;
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
    return merged;
  }

  /**
   * Converte timestamp de VTT (HH:MM:SS.mmm) para segundos.
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
   * Parser de VTT com deduplicação.
   */
  static parseVttContent(content: string): Omit<SubtitleItem, "text_pt">[] {
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

      if (
        line &&
        !line.startsWith("WEBVTT") &&
        !line.startsWith("Kind:") &&
        !line.startsWith("Language:") &&
        !line.startsWith("NOTE") &&
        !/^\d+$/.test(line)
      ) {
        const cleanLine = line.replace(/<[^>]+>/g, "").trim();
        if (cleanLine && !currentTexts.includes(cleanLine)) {
          currentTexts.push(cleanLine);
        }
      }
    }

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
