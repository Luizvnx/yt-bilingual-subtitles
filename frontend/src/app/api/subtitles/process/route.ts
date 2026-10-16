import { NextRequest, NextResponse } from "next/server";
import {
  ProcessVideoSchema,
  validateAndExtractYouTubeId,
  checkRateLimit,
  videoRepository,
  usageRepository,
  getAuthTokenFromCookies,
  CryptoService,
  getClientIp,
} from "@/lib/security";
import { YouTubeService } from "@/lib/services/youtubeService";

export async function POST(request: NextRequest) {
  // Rate limiting anti-abuso: máx 10 vídeos por minuto
  const ip = getClientIp(request);
  const { allowed, retryAfter } = checkRateLimit(`process:${ip}`, 10, 60);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "Muitas requisições de processamento. Aguarde um minuto.",
        retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const validated = ProcessVideoSchema.parse(body);

    // Validação estrita anti-SSRF: garante que o ID é legítimo do YouTube
    const videoId = validateAndExtractYouTubeId(validated.url);

    // Identifica usuário logado (se houver) para vincular ao histórico
    let userId: string | undefined = undefined;
    let userTier: "free" | "pro" = "free";
    const token = await getAuthTokenFromCookies();
    if (token) {
      const payload = await CryptoService.verifyAuthToken(token);
      if (payload?.uid) {
        userId = payload.uid;
        userTier = (payload.tier as "free" | "pro") || "free";
      }
    }

    // 1. Verifica se o vídeo já foi processado anteriormente (Cache Instantâneo)
    const existing = videoRepository.getById(videoId);
    if (existing && existing.segments && existing.segments.length > 0) {
      const checkable = existing.segments.filter(
        (s) => s.text_en && s.text_en.trim().length > 6
      );
      const translatedCount = checkable.filter(
        (s) =>
          s.text_pt &&
          s.text_pt.trim().toLowerCase() !== s.text_en.trim().toLowerCase()
      ).length;
      const isActuallyTranslated =
        checkable.length === 0 ||
        (translatedCount / checkable.length) >= 0.85;

      if (isActuallyTranslated) {
        return NextResponse.json({
          success: true,
          message: "Vídeo recuperado do cache instantaneamente!",
          cached: true,
          video: existing,
        });
      }
    }

    // 2. Extrai metadados do YouTube sem baixar o vídeo
    const metadata = await YouTubeService.getMetadata(videoId);

    // Validação de Quota e Duração (Fase 5 do Roadmap)
    const quotaCheck = usageRepository.checkQuota(
      userId,
      userTier,
      videoId,
      metadata.duration
    );
    if (!quotaCheck.canProcess) {
      return NextResponse.json(
        {
          error: quotaCheck.reason,
          code: quotaCheck.code,
          requireUpgrade:
            quotaCheck.code === "QUOTA_EXCEEDED" ||
            quotaCheck.code === "DURATION_EXCEEDED",
          quota: quotaCheck,
        },
        { status: 403 }
      );
    }

    // 3. Extrai legendas diretamente do YouTube e traduz de forma autônoma
    let segments = await YouTubeService.extractSubtitles(videoId);

    // Se o vídeo não possui legendas no YouTube, gera segmento inicial com metadados
    if (!segments.length) {
      const ptTitle = (
        await YouTubeService.translateBatch([metadata.title], "en", "pt")
      )[0] || metadata.title;

      segments = [
        {
          start: 0,
          end: Math.max(5, Math.min(metadata.duration, 15)),
          text_en: metadata.title,
          text_pt: ptTitle,
        },
      ];
    }

    // 4. Salva no repositório de vídeos
    const savedRecord = videoRepository.saveVideo({
      id: videoId,
      videoId,
      title: metadata.title,
      uploader: metadata.uploader,
      duration: metadata.duration,
      thumbnail: metadata.thumbnail,
      url: metadata.url,
      detectedLang: "en",
      segmentsCount: segments.length,
      segments,
      userId,
    });

    // Registra métrica de consumo para o usuário
    if (userId) {
      usageRepository.recordVideoUsage(userId, videoId, metadata.duration);
    }

    return NextResponse.json({
      success: true,
      message: "Vídeo pronto para estudo!",
      cached: false,
      video: savedRecord,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "URL inválida ou ausente.", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao processar vídeo." },
      { status: 400 }
    );
  }
}
