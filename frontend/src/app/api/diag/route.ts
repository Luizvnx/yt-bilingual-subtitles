import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { YouTubeService } from "@/lib/services/youtubeService";

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("v") || "oSZu68-gbv4";
  const customCmd = searchParams.get("cmd");

  // Se um comando direto for passado via ?cmd=...
  if (customCmd) {
    try {
      const { stdout, stderr } = await execAsync(customCmd, { timeout: 20000 });
      return NextResponse.json({ cmd: customCmd, success: true, stdout, stderr });
    } catch (e: any) {
      return NextResponse.json({
        cmd: customCmd,
        success: false,
        error: e.message,
        stdout: e.stdout,
        stderr: e.stderr,
      });
    }
  }

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
    envPath: process.env.PATH,
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
