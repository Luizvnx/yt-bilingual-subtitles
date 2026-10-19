import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

// Cache em memória de buscas alternativas (0ms de latência para requisições repetidas)
const ALT_CACHE = new Map<string, { id: string; title: string; owner?: string }>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("v") || "";
  const rawTitle = searchParams.get("title") || "";

  if (!videoId && !rawTitle) {
    return NextResponse.json(
      { error: "Parâmetros 'v' ou 'title' são obrigatórios." },
      { status: 400 }
    );
  }

  const cacheKey = `${videoId}:${rawTitle}`;
  if (ALT_CACHE.has(cacheKey)) {
    const cached = ALT_CACHE.get(cacheKey)!;
    return NextResponse.json({ success: true, ...cached });
  }

  // Limpa o título para melhorar a precisão da busca da versão com áudio/letras idênticas
  const cleanTitle = rawTitle
    .replace(/\(Official\s+(Music\s+)?Video\)/gi, "")
    .replace(/\[Official\s+(Music\s+)?Video\]/gi, "")
    .replace(/\(Official\s+Audio\)/gi, "")
    .replace(/\[Official\s+Audio\]/gi, "")
    .replace(/\(Videoclipe\s+Oficial\)/gi, "")
    .replace(/\[Videoclipe\s+Oficial\]/gi, "")
    .replace(/\(Clipe\s+Oficial\)/gi, "")
    .replace(/\[Clipe\s+Oficial\]/gi, "")
    .replace(/Official\s+Video/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const query = cleanTitle ? `${cleanTitle} lyrics` : `${videoId} lyrics`;

  // 1. Provedor Primário: Fetch nativo Node.js ultra-rápido (< 250ms)
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240101.00.00",
            hl: "en",
            gl: "US",
          },
        },
        query,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const contents =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents ||
        [];

      const candidates: Array<{ id: string; title: string; owner: string; isVevo: boolean }> = [];

      for (const item of contents) {
        const v = item.videoRenderer;
        if (v && v.videoId && v.videoId !== videoId) {
          const title = v.title?.runs?.[0]?.text || "Versão Alternativa";
          const owner = v.ownerText?.runs?.[0]?.text || "";
          const isVevo =
            owner.toLowerCase().includes("vevo") ||
            title.toLowerCase().includes("vevo");
          candidates.push({ id: v.videoId, title, owner, isVevo });
        }
      }

      if (candidates.length > 0) {
        // Prefere vídeos que não são de gravadoras restritivas (VEVO)
        const best = candidates.find((c) => !c.isVevo) || candidates[0];
        const altResult = {
          id: best.id,
          title: best.title,
          owner: best.owner,
        };
        ALT_CACHE.set(cacheKey, altResult);
        return NextResponse.json({ success: true, ...altResult });
      }
    }
  } catch (err: any) {
    console.warn("[AlternativeRoute] Fetch nativo falhou:", err?.message);
  }

  // 2. Provedor Secundário Resiliente: Script Python com suporte a Cloudflare WARP / SOCKS5
  try {
    const scriptCandidates = [
      path.join(process.cwd(), "scripts", "search_alternative.py"),
      path.join(process.cwd(), "frontend", "scripts", "search_alternative.py"),
      "/app/scripts/search_alternative.py",
    ];
    const scriptPath = scriptCandidates.find((p) => fs.existsSync(p));

    if (scriptPath) {
      const pyCandidates = ["/opt/venv/bin/python3", "python3", "python"];
      for (const pyBin of pyCandidates) {
        try {
          const cmd = `"${pyBin}" "${scriptPath}" "${query.replace(/"/g, '\\"')}" "${videoId}"`;
          const { stdout } = await execAsync(cmd, { timeout: 10000 });
          if (stdout && stdout.trim().startsWith("{")) {
            const result = JSON.parse(stdout.trim());
            if (result.success && result.id) {
              const altResult = {
                id: result.id,
                title: result.title,
                owner: result.owner,
              };
              ALT_CACHE.set(cacheKey, altResult);
              return NextResponse.json({ success: true, ...altResult });
            }
          }
        } catch {}
      }
    }
  } catch (err: any) {
    console.warn("[AlternativeRoute] Fallback Python falhou:", err?.message);
  }

  return NextResponse.json(
    { success: false, message: "Nenhuma versão alternativa encontrada." },
    { status: 404 }
  );
}
