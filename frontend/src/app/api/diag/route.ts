import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { YouTubeService } from "@/lib/services/youtubeService";
import { YOUTUBE_ID_REGEX } from "@/lib/security/validators";

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  // Em produção, diagnóstico é restrito ou exige chave secreta interna
  if (process.env.NODE_ENV === "production") {
    const diagKey = request.headers.get("x-diag-key") || new URL(request.url).searchParams.get("key");
    const expectedKey = process.env.DIAG_SECRET_KEY;
    if (!expectedKey || diagKey !== expectedKey) {
      return NextResponse.json(
        { error: "Endpoint de diagnóstico indisponível." },
        { status: 404 }
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const rawVideoId = searchParams.get("v") || "oSZu68-gbv4";
  const videoId = YOUTUBE_ID_REGEX.test(rawVideoId) ? rawVideoId : "oSZu68-gbv4";

  let gitCommit = "unknown";
  try {
    const { stdout } = await execAsync("git rev-parse HEAD", { timeout: 3000 });
    gitCommit = stdout.trim();
  } catch {}

  const results: Record<string, any> = {
    videoId,
    gitCommit,
    cwd: process.cwd(),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
  };

  // 1. Teste do Script Python Oficial (extract_subs.py com yt_dlp visionos)
  const scriptCandidates = [
    path.join(process.cwd(), "scripts", "extract_subs.py"),
    path.join(process.cwd(), "frontend", "scripts", "extract_subs.py"),
    "/app/scripts/extract_subs.py",
  ];
  const foundScript = scriptCandidates.find((p) => fs.existsSync(p));
  results.extractSubsScript = {
    found: !!foundScript,
    path: foundScript || "NOT FOUND",
  };

  if (foundScript) {
    const pyCandidates = ["/opt/venv/bin/python3", "python3", "python"];
    results.pyScriptTests = {};
    for (const pyBin of pyCandidates) {
      try {
        const { stdout, stderr } = await execAsync(`"${pyBin}" "${foundScript}" "${videoId}"`, {
          timeout: 25000,
          maxBuffer: 15 * 1024 * 1024,
        });
        const hasEvents = stdout.includes('"events"');
        results.pyScriptTests[pyBin] = {
          success: hasEvents,
          stdoutLength: stdout.length,
          snippet: stdout.slice(0, 200),
          stderr: stderr.slice(0, 200),
        };
        if (hasEvents) break;
      } catch (e: any) {
        results.pyScriptTests[pyBin] = { success: false, error: e.message?.slice(0, 200) };
      }
    }
  }

  // 2. Teste do Fluxo Completo de Extração e Tradução
  try {
    const subtitles = await YouTubeService.extractSubtitles(videoId);
    results.fullExtraction = {
      success: subtitles.length > 0,
      segmentsCount: subtitles.length,
      sample: subtitles.slice(0, 2),
    };
  } catch (e: any) {
    results.fullExtraction = { success: false, error: e.message };
  }

  return NextResponse.json(results);
}
