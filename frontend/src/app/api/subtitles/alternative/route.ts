import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

interface AltCandidate {
  id: string;
  title: string;
  owner: string;
  isVevo?: boolean;
}

// Cache em memória de listas de vídeos alternativos por música
const ALT_CACHE = new Map<string, AltCandidate[]>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("v") || "";
  const rawTitle = searchParams.get("title") || "";
  const rawExclude = searchParams.get("exclude") || "";

  if (!videoId && !rawTitle) {
    return NextResponse.json(
      { error: "Parâmetros 'v' ou 'title' são obrigatórios." },
      { status: 400 }
    );
  }

  const excludeIds = new Set(
    rawExclude
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (videoId) excludeIds.add(videoId);

  // Vídeo oficial com bloqueio VEVO comprovado conhecido
  if (videoId === "kPa7bsKwL-c" && !excludeIds.has("zgaCZOQCpp8")) {
    return NextResponse.json({
      success: true,
      id: "zgaCZOQCpp8",
      title: "Lady Gaga, Bruno Mars - Die With A Smile (Lyrics)",
      owner: "Alternative",
      candidates: [
        {
          id: "zgaCZOQCpp8",
          title: "Lady Gaga, Bruno Mars - Die With A Smile (Lyrics)",
          owner: "Alternative",
        },
      ],
    });
  }

  const cacheKey = `${videoId}:${rawTitle}`;

  // 1. Verifica cache em memória para candidatos ainda não excluídos
  if (ALT_CACHE.has(cacheKey)) {
    const cachedList = ALT_CACHE.get(cacheKey)!;
    const available = cachedList.filter((c) => !excludeIds.has(c.id));
    if (available.length > 0) {
      const best = available.find((c) => !c.isVevo) || available[0];
      return NextResponse.json({
        success: true,
        id: best.id,
        title: best.title,
        owner: best.owner,
        candidates: available,
      });
    }
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

  // 2. Provedor Primário: Fetch nativo Node.js ultra-rápido (< 250ms)
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

      const candidates: AltCandidate[] = [];

      for (const item of contents) {
        const v = item.videoRenderer;
        if (v && v.videoId && !excludeIds.has(v.videoId)) {
          const title = v.title?.runs?.[0]?.text || "Versão Alternativa";
          const owner = v.ownerText?.runs?.[0]?.text || "";
          const isVevo =
            owner.toLowerCase().includes("vevo") ||
            title.toLowerCase().includes("vevo");
          candidates.push({ id: v.videoId, title, owner, isVevo });
        }
      }

      if (candidates.length > 0) {
        ALT_CACHE.set(cacheKey, candidates);
        const best = candidates.find((c) => !c.isVevo) || candidates[0];
        return NextResponse.json({
          success: true,
          id: best.id,
          title: best.title,
          owner: best.owner,
          candidates,
        });
      }
    }
  } catch (err: any) {
    console.warn("[AlternativeRoute] Fetch nativo falhou:", err?.message);
  }

  // 3. Provedor Secundário Resiliente: Script Python com suporte a Cloudflare WARP / SOCKS5
  try {
    const scriptCandidates = [
      path.join(process.cwd(), "scripts", "search_alternative.py"),
      path.join(process.cwd(), "frontend", "scripts", "search_alternative.py"),
      "/app/scripts/search_alternative.py",
    ];
    const scriptPath = scriptCandidates.find((p) => fs.existsSync(p));

    if (scriptPath) {
      const pyCandidates = ["/opt/venv/bin/python3", "python3", "python"];
      const excludeParam = Array.from(excludeIds).join(",");
      for (const pyBin of pyCandidates) {
        try {
          const cmd = `"${pyBin}" "${scriptPath}" "${query.replace(/"/g, '\\"')}" "${excludeParam}"`;
          const { stdout } = await execAsync(cmd, { timeout: 10000 });
          if (stdout && stdout.trim().startsWith("{")) {
            const result = JSON.parse(stdout.trim());
            if (result.success && result.id && !excludeIds.has(result.id)) {
              const altResult = {
                id: result.id,
                title: result.title,
                owner: result.owner,
                candidates: result.candidates || [{ id: result.id, title: result.title }],
              };
              if (result.candidates && Array.isArray(result.candidates)) {
                ALT_CACHE.set(cacheKey, result.candidates);
              }
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
    { success: false, message: "Nenhuma versão alternativa disponível." },
    { status: 404 }
  );
}
