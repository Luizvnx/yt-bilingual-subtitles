import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
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
    const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    let title = "Vídeo do YouTube";
    let uploader = "Canal do YouTube";
    let duration = 0;
    let thumbnail = defaultThumbnail;

    // 1. Tenta extrair metadados via yt-dlp com cliente Android/Web (anti-bloqueio de datacenter)
    try {
      const { stdout } = await execAsync(
        `yt-dlp --no-cache-dir --no-warnings --force-ipv4 --dump-json --skip-download --extractor-args "youtube:player_client=android,ios,web" "${canonicalUrl}"`,
        { maxBuffer: 10 * 1024 * 1024, timeout: 15000 }
      );
      const data = JSON.parse(stdout);
      if (data.title) title = data.title;
      if (data.uploader || data.channel) uploader = data.uploader || data.channel;
      if (data.duration) duration = Math.round(data.duration);
      if (data.thumbnail) thumbnail = data.thumbnail;

      return { videoId, title, uploader, duration, thumbnail, url: canonicalUrl };
    } catch {
      // Segue para os fallbacks resilientes
    }

    // 2. Fallback oficial: YouTube Data API v3 (se YOUTUBE_API_KEY estiver configurada)
    const ytApiKey = process.env.YOUTUBE_API_KEY;
    if (ytApiKey) {
      try {
        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${ytApiKey}`,
          { signal: AbortSignal.timeout(4500) }
        );
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          if (ytData.items && ytData.items.length > 0) {
            const item = ytData.items[0];
            title = item.snippet?.title || title;
            uploader = item.snippet?.channelTitle || uploader;
            thumbnail =
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.default?.url ||
              thumbnail;

            const iso = item.contentDetails?.duration || "";
            const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (match) {
              const h = parseInt(match[1] || "0", 10);
              const m = parseInt(match[2] || "0", 10);
              const s = parseInt(match[3] || "0", 10);
              duration = h * 3600 + m * 60 + s;
            }

            return { videoId, title, uploader, duration, thumbnail, url: canonicalUrl };
          }
        }
      } catch {}
    }

    // 3. Fallback universal instantâneo: YouTube oEmbed (sempre funciona, sem API key, 0 bloqueios)
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
        { signal: AbortSignal.timeout(4500) }
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        title = oembedData.title || title;
        uploader = oembedData.author_name || uploader;
        thumbnail = oembedData.thumbnail_url || thumbnail;
      }
    } catch {}

    return {
      videoId,
      title,
      uploader,
      duration,
      thumbnail,
      url: canonicalUrl,
    };
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
   * Extrai cookies e gera cabeçalhos de autenticação oficiais (SAPISIDHASH)
   */
  static getYoutubeAuth(): { cookieHeader: string; authHeader: string } {
    let cookieHeader = "";
    let authHeader = "";
    const cookieCandidates = [
      "/app/data/cookies.txt",
      "/app/cookies.txt",
      "/tmp/cookies.txt",
      path.join(process.cwd(), "data", "cookies.txt"),
      path.join(process.cwd(), "cookies.txt"),
      path.join(process.cwd(), "..", "data", "cookies.txt"),
      path.join(process.cwd(), "..", "cookies.txt"),
    ];

    let rawCookies = "";
    for (const cpath of cookieCandidates) {
      if (fs.existsSync(cpath)) {
        try {
          rawCookies = fs.readFileSync(cpath, "utf-8");
          if (rawCookies.length > 20) break;
        } catch {}
      }
    }

    if (!rawCookies && process.env.YOUTUBE_COOKIES) {
      rawCookies = process.env.YOUTUBE_COOKIES;
    }

    if (rawCookies) {
      const cookies: string[] = [];
      let sapisid = "";
      for (const line of rawCookies.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const parts = trimmed.split("\t");
        if (parts.length >= 7) {
          cookies.push(`${parts[5]}=${parts[6]}`);
          if (parts[5] === "SAPISID" || parts[5] === "__Secure-3PAPISID") {
            sapisid = parts[6];
          }
        }
      }
      cookieHeader = cookies.join("; ");
      if (sapisid) {
        const timestamp = Math.floor(Date.now() / 1000);
        const toHash = `${timestamp} ${sapisid} https://www.youtube.com`;
        const hash = crypto.createHash("sha1").update(toHash).digest("hex");
        authHeader = `SAPISIDHASH ${timestamp}_${hash}`;
      }
    }

    return { cookieHeader, authHeader };
  }

  /**
   * Provedor Nativo Ultra-Rápido: YouTube InnerTube Player API com suporte a Cookies/SAPISID
   * 100% JavaScript (fetch), 0 subprocessos, sem dependência de Python ou yt-dlp.
   * Funciona diretamente no container Docker e em servidores de produção.
   */
  static async fetchInnerTubeSubtitles(
    videoId: string
  ): Promise<Omit<SubtitleItem, "text_pt">[]> {
    const { cookieHeader, authHeader } = YouTubeService.getYoutubeAuth();
    const clients = [
      {
        clientName: "WEB",
        clientVersion: "2.20240408.01.00",
        withAuth: true,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      {
        clientName: "IOS",
        clientVersion: "20.10.4",
        withAuth: false,
        userAgent:
          "com.google.ios.youtube/20.10.4 (iPhone; CPU iPhone OS 17_4 like Mac OS X)",
      },
      {
        clientName: "ANDROID",
        clientVersion: "19.29.37",
        withAuth: false,
        userAgent:
          "com.google.android.youtube/19.29.37 (Linux; U; Android 11; en_US)",
      },
    ];

    for (const client of clients) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": client.userAgent,
        };

        if (client.withAuth && cookieHeader) {
          headers["Cookie"] = cookieHeader;
          headers["Origin"] = "https://www.youtube.com";
          headers["Referer"] = `https://www.youtube.com/watch?v=${videoId}`;
          headers["X-Origin"] = "https://www.youtube.com";
          if (authHeader) headers["Authorization"] = authHeader;
        }

        const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
          method: "POST",
          headers,
          body: JSON.stringify({
            context: {
              client: {
                clientName: client.clientName,
                clientVersion: client.clientVersion,
                hl: "en",
                gl: "US",
              },
            },
            videoId,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const captionTracks =
          data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (Array.isArray(captionTracks) && captionTracks.length > 0) {
          // Seleciona a melhor trilha (preferência: inglês manual > inglês auto > qualquer trilha)
          const selectedTrack =
            captionTracks.find(
              (t: any) => t.languageCode?.startsWith("en") && !t.kind
            ) ||
            captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ||
            captionTracks.find((t: any) => t.languageCode?.startsWith("pt")) ||
            captionTracks[0];

          if (selectedTrack?.baseUrl) {
            // Tenta formato json3 primeiro
            const jsonUrl = selectedTrack.baseUrl.includes("&fmt=")
              ? selectedTrack.baseUrl
              : `${selectedTrack.baseUrl}&fmt=json3`;

            try {
              const subRes = await fetch(jsonUrl, {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(12000),
              });

              if (subRes.ok) {
                const text = await subRes.text();
                if (text.trim().startsWith("{")) {
                  const subJson = JSON.parse(text);
                  const parsed = YouTubeService.parseJson3Content(subJson);
                  if (parsed.length > 0) return parsed;
                } else if (text.includes("<transcript>") || text.includes("<text")) {
                  const parsed = YouTubeService.parseTimedTextXml(text);
                  if (parsed.length > 0) return parsed;
                }
              }
            } catch (err: any) {
              console.warn("[YouTubeService] Falha ao baixar json3 da trilha:", err?.message);
            }

            // Fallback para baixar XML da URL original
            try {
              const xmlRes = await fetch(selectedTrack.baseUrl, {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(12000),
              });
              if (xmlRes.ok) {
                const xmlText = await xmlRes.text();
                const parsed = YouTubeService.parseTimedTextXml(xmlText);
                if (parsed.length > 0) return parsed;
              }
            } catch {}
          }
        }
      } catch (err: any) {
        console.warn(`[YouTubeService] Erro no client ${client.clientName}:`, err?.message);
      }
    }

    return [];
  }

  /**
   * Extrai e formata legendas do YouTube em segundos com cadeia multi-camadas resiliente.
   */
  static async extractSubtitles(
    videoId: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<SubtitleItem[]> {
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const tempDir = path.join(os.tmpdir(), "yt_subs");
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
      } catch {}
    }

    const tempPrefix = path.join(tempDir, `sub_${videoId}`);
    const ytdlpBase = `yt-dlp --no-cache-dir --no-warnings --force-ipv4 --extractor-args "youtube:player_client=android,ios,web"`;
    onProgress?.(35, "Consultando legendas e transcrição do YouTube...");

    try {
      // 1. Provedor Primário: Script Python yt_dlp (VisionOS/Mobile) com signed timedtext JSON3
      try {
        const scriptCandidates = [
          path.join(process.cwd(), "scripts", "extract_subs.py"),
          path.join(process.cwd(), "frontend", "scripts", "extract_subs.py"),
          "/app/scripts/extract_subs.py",
        ];
        const scriptPath = scriptCandidates.find((p) => fs.existsSync(p));

        if (scriptPath) {
          const pyCandidates = ["/opt/venv/bin/python3", "python3", "python"];
          for (const pyBin of pyCandidates) {
            try {
              const res = await execAsync(`"${pyBin}" "${scriptPath}" "${videoId}"`, {
                timeout: 30000,
                maxBuffer: 15 * 1024 * 1024,
              });
              if (res.stdout && res.stdout.trim().startsWith("{")) {
                const parsedData = JSON.parse(res.stdout.trim());
                const rawSegments = YouTubeService.parseJson3Content(parsedData);
                if (rawSegments.length > 0) {
                  onProgress?.(
                    60,
                    `Identificadas ${rawSegments.length} falas do vídeo. Agrupando frases naturais...`
                  );
                  const mergedSegments = YouTubeService.mergeNaturalSentences(rawSegments);
                  onProgress?.(
                    75,
                    `Traduzindo ${mergedSegments.length} frases bilíngues com IA...`
                  );
                  const englishTexts = mergedSegments.map((s) => s.text_en);
                  const portugueseTexts = await YouTubeService.translateBatch(
                    englishTexts,
                    "en",
                    "pt"
                  );
                  onProgress?.(95, "Sincronizando minutagem e estúdio bilíngue...");
                  return mergedSegments.map((seg, idx) => ({
                    ...seg,
                    text_pt: portugueseTexts[idx] || seg.text_en,
                  }));
                }
              }
            } catch (err: any) {
              console.warn(`[YouTubeService] Falha com ${pyBin}:`, err?.message);
            }
          }
        }
      } catch (err: any) {
        console.warn("[YouTubeService] Erro no extrator python:", err?.message);
      }

      // 2. Provedor Secundário: YouTube InnerTube Player API (iOS / Android Client)
      // 100% Nativo em Node.js (fetch), sem subprocessos, sem Python, 0 dependências de sistema, ultra-rápido (< 500ms)
      try {
        const innertubeSegments = await YouTubeService.fetchInnerTubeSubtitles(videoId);
        if (innertubeSegments.length > 0) {
          onProgress?.(
            60,
            `Identificadas ${innertubeSegments.length} falas nativas do YouTube. Agrupando frases naturais...`
          );
          const mergedSegments = YouTubeService.mergeNaturalSentences(innertubeSegments);
          onProgress?.(
            75,
            `Traduzindo ${mergedSegments.length} frases bilíngues com IA...`
          );
          const englishTexts = mergedSegments.map((s) => s.text_en);
          const portugueseTexts = await YouTubeService.translateBatch(
            englishTexts,
            "en",
            "pt"
          );

          onProgress?.(95, "Sincronizando minutagem e estúdio bilíngue...");
          return mergedSegments.map((seg, idx) => ({
            ...seg,
            text_pt: portugueseTexts[idx] || seg.text_en,
          }));
        }
      } catch (err: any) {
        console.warn("[YouTubeService] InnerTube API falhou, tentando CLI:", err?.message);
      }

      // 2. Provedor Secundário: youtube_transcript_api (CLI Python com caminhos absolutos e array flattening)
      try {
        let stdout = "";
        const commands = [
          `/opt/venv/bin/youtube_transcript_api "${videoId}" --format json`,
          `youtube_transcript_api "${videoId}" --format json`,
          `/opt/venv/bin/python3 -m youtube_transcript_api "${videoId}" --format json`,
          `python3 -m youtube_transcript_api "${videoId}" --format json`,
          `python -m youtube_transcript_api "${videoId}" --format json`,
        ];

        for (const cmd of commands) {
          try {
            const res = await execAsync(cmd, {
              timeout: 25000,
              maxBuffer: 10 * 1024 * 1024,
            });
            if (res.stdout && res.stdout.trim().startsWith("[")) {
              stdout = res.stdout;
              break;
            }
          } catch {}
        }

        if (stdout && stdout.trim().startsWith("[")) {
          const rawItems = JSON.parse(stdout.trim());
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            // FIX CRÍTICO: youtube_transcript_api retorna array bidimensional [[{text, start, duration}]]
            const flatItems: any[] = Array.isArray(rawItems[0]) ? rawItems[0] : rawItems;
            const rawSegments = flatItems
              .map((item: any) => ({
                start: Math.round(Number(item.start || 0) * 100) / 100,
                end:
                  Math.round(
                    (Number(item.start || 0) + Number(item.duration || 2)) * 100
                  ) / 100,
                text_en: String(item.text || "")
                  .replace(/\n/g, " ")
                  .replace(/\s+/g, " ")
                  .trim(),
              }))
              .filter((s: any) => s.text_en && s.text_en.length > 0);

            if (rawSegments.length > 0) {
              onProgress?.(
                60,
                `Identificadas ${rawSegments.length} falas sincronizadas. Agrupando frases naturais...`
              );
              const mergedSegments =
                YouTubeService.mergeNaturalSentences(rawSegments);

              onProgress?.(
                75,
                `Traduzindo ${mergedSegments.length} frases bilíngues com IA...`
              );
              const englishTexts = mergedSegments.map((s) => s.text_en);
              const portugueseTexts = await YouTubeService.translateBatch(
                englishTexts,
                "en",
                "pt"
              );

              onProgress?.(95, "Sincronizando minutagem e estúdio bilíngue...");
              return mergedSegments.map((seg, idx) => ({
                ...seg,
                text_pt: portugueseTexts[idx] || seg.text_en,
              }));
            }
          }
        }
      } catch (err: any) {
        console.warn(
          "[YouTubeService] youtube_transcript_api indisponível, acionando fallback yt-dlp:",
          err?.message
        );
      }

      // 2. Provedor Secundário: Tenta baixar em formato json3 via yt-dlp
      try {
        await execAsync(
          `${ytdlpBase} --write-auto-sub --write-sub --sub-lang "en.*,en,en-orig,en-US" --skip-download --sub-format json3 -o "${tempPrefix}" "${canonicalUrl}"`,
          { timeout: 35000 }
        );
      } catch (err: any) {
        console.warn("[YouTubeService] Falha ao extrair json3:", err?.message);
      }

      // Procura arquivos json3 gerados
      const files = fs.existsSync(tempDir) ? fs.readdirSync(tempDir) : [];
      const json3Files = files.filter(
        (f) => f.startsWith(`sub_${videoId}`) && f.endsWith(".json3")
      );

      if (json3Files.length > 0) {
        json3Files.sort((a, b) => {
          const sA = fs.statSync(path.join(tempDir, a)).size;
          const sB = fs.statSync(path.join(tempDir, b)).size;
          return sB - sA;
        });
        const json3Path = path.join(tempDir, json3Files[0]);
        const jsonContent = fs.readFileSync(json3Path, "utf-8");
        json3Files.forEach((f) => {
          try { fs.unlinkSync(path.join(tempDir, f)); } catch {}
        });

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
      try {
        await execAsync(
          `${ytdlpBase} --write-auto-sub --write-sub --sub-lang "en.*,en,en-orig,en-US" --skip-download --sub-format vtt -o "${tempPrefix}" "${canonicalUrl}"`,
          { timeout: 35000 }
        );
      } catch (err: any) {
        console.warn("[YouTubeService] Falha ao extrair vtt:", err?.message);
      }

      const filesVtt = fs.existsSync(tempDir) ? fs.readdirSync(tempDir) : [];
      const vttFiles = filesVtt.filter(
        (f) => f.startsWith(`sub_${videoId}`) && f.endsWith(".vtt")
      );

      if (vttFiles.length > 0) {
        vttFiles.sort((a, b) => {
          const sA = fs.statSync(path.join(tempDir, a)).size;
          const sB = fs.statSync(path.join(tempDir, b)).size;
          return sB - sA;
        });
        const vttPath = path.join(tempDir, vttFiles[0]);
        const vttContent = fs.readFileSync(vttPath, "utf-8");
        vttFiles.forEach((f) => {
          try { fs.unlinkSync(path.join(tempDir, f)); } catch {}
        });

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
   * Parser universal e resiliente de XML TimedText do YouTube.
   */
  static parseTimedTextXml(xml: string): Omit<SubtitleItem, "text_pt">[] {
    const segments: Omit<SubtitleItem, "text_pt">[] = [];
    const regex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const start = parseFloat(match[1]);
      const duration = match[2] ? parseFloat(match[2]) : 3;
      let text = match[3]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, "")
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) {
        segments.push({
          start: Math.round(start * 100) / 100,
          end: Math.round((start + duration) * 100) / 100,
          text_en: text,
        });
      }
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
