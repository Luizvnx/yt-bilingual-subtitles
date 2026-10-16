import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { YouTubeService } from "@/lib/services/youtubeService";

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("v") || "oSZu68-gbv4";

  const results: Record<string, any> = {
    videoId,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    envPath: process.env.PATH,
  };

  // 1. Teste do Provedor Nativo InnerTube (Zero dependências externas)
  try {
    const rawInnerTube = await YouTubeService.fetchInnerTubeSubtitles(videoId);
    results.innerTube = {
      success: rawInnerTube.length > 0,
      segmentsCount: rawInnerTube.length,
      sample: rawInnerTube.slice(0, 2),
    };
  } catch (e: any) {
    results.innerTube = { success: false, error: e.message };
  }

  // 2. Teste do Provedor CLI Python (youtube_transcript_api)
  const cliCommands = [
    `/opt/venv/bin/youtube_transcript_api "${videoId}" --format json`,
    `youtube_transcript_api "${videoId}" --format json`,
    `/opt/venv/bin/python3 -m youtube_transcript_api "${videoId}" --format json`,
    `python3 -m youtube_transcript_api "${videoId}" --format json`,
  ];

  results.cliTests = {};
  for (const cmd of cliCommands) {
    try {
      const { stdout } = await execAsync(cmd, { timeout: 10000 });
      results.cliTests[cmd] = {
        success: stdout.trim().startsWith("["),
        outputSnippet: stdout.trim().slice(0, 100),
      };
      if (stdout.trim().startsWith("[")) break;
    } catch (e: any) {
      results.cliTests[cmd] = { success: false, error: e.message?.slice(0, 200) };
    }
  }

  // 3. Teste do Fluxo Completo de Extração e Tradução
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
