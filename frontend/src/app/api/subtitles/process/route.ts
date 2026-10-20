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
import { CloudWhisperService } from "@/lib/services/cloudWhisperService";

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

    // 1. Validação Estrita de Autenticação no Backend (Conforme Requisito de Acesso)
    if (!userId) {
      return NextResponse.json(
        {
          error: "Crie sua conta gratuita ou faça login para acessar os vídeos e estúdios de estudo.",
          code: "AUTH_REQUIRED",
          requireAuth: true,
        },
        { status: 401 }
      );
    }

    // 2. Validação Prévia de Quota (se vídeo ainda não foi processado pelo usuário)
    const quotaCheckPre = usageRepository.checkQuota(
      userId,
      userTier,
      videoId
    );
    if (!quotaCheckPre.canProcess) {
      return NextResponse.json(
        {
          error: quotaCheckPre.reason,
          code: quotaCheckPre.code,
          requireUpgrade:
            quotaCheckPre.code === "QUOTA_EXCEEDED" ||
            quotaCheckPre.code === "DURATION_EXCEEDED",
          requireAuth: quotaCheckPre.code === "AUTH_REQUIRED",
          quota: quotaCheckPre,
        },
        { status: quotaCheckPre.code === "AUTH_REQUIRED" ? 401 : 403 }
      );
    }

    // 3. Verifica se o vídeo já foi processado anteriormente (Cache Instantâneo)
    const existing = videoRepository.getById(videoId);
    if (
      existing &&
      existing.title !== "Vídeo do YouTube" &&
      existing.segments &&
      existing.segments.length > 1
    ) {
      const checkable = existing.segments.filter(
        (s) => s.text_en && s.text_en.trim().length > 6
      );
      const translatedCount = checkable.filter(
        (s) =>
          s.text_pt &&
          s.text_pt.trim().toLowerCase() !== s.text_en.trim().toLowerCase()
      ).length;
      const isActuallyTranslated =
        checkable.length > 0 && (translatedCount / checkable.length) >= 0.85;

      if (isActuallyTranslated) {
        if (videoId === "kPa7bsKwL-c") {
          existing.embedVideoId = "zgaCZOQCpp8";
        } else if (videoId === "k2qgadSvNyU") {
          existing.embedVideoId = "ClhLNUPqv8Q";
        }
        return NextResponse.json({
          success: true,
          message: "Vídeo recuperado do cache instantaneamente!",
          cached: true,
          video: existing,
        });
      }
    }

    // 4. Extrai metadados do YouTube sem baixar o vídeo
    const metadata = await YouTubeService.getMetadata(videoId);

    // Validação de Quota e Duração Final
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
          requireAuth: quotaCheck.code === "AUTH_REQUIRED",
          quota: quotaCheck,
        },
        { status: quotaCheck.code === "AUTH_REQUIRED" ? 401 : 403 }
      );
    }

    // 1. Verificação prévia de bloqueio de reprodução / clipes com restrição de embed
    let embedVideoId: string | undefined = undefined;
    let targetVideoId = videoId;
    const isRestricted = await YouTubeService.checkEmbedRestricted(
      videoId,
      metadata.title,
      metadata.uploader
    );

    if (isRestricted) {
      const alt = await YouTubeService.resolvePlayableAlternative(
        videoId,
        metadata.title
      );
      if (alt && alt.id && alt.id !== videoId) {
        embedVideoId = alt.id;
        targetVideoId = alt.id;
        console.log(
          `[ProcessRoute] Vídeo ${videoId} possui restrição/bloqueio. Utilizando versão compatível ${targetVideoId} ("${alt.title}") para extração e reprodução.`
        );
      }
    }

    // 2. Extrai legendas da versão que REALMENTE será reproduzida (garantia de timing e sincronia 1:1)
    let segments = await YouTubeService.extractSubtitles(targetVideoId);
    console.log(`[ProcessRoute] Extração para ${targetVideoId}: ${segments.length} segmentos bilíngues obtidos.`);

    // 3. Valida se as legendas contêm falas reais
    const realSpokenCount = segments.filter((s) => {
      const clean = s.text_en
        ?.replace(/\[[^\]]+\]/g, "")
        ?.replace(/♪/g, "")
        ?.trim() || "";
      const words = clean.split(/\s+/).filter((w) => /[a-zA-Z]{2,}/.test(w));
      return words.length >= 2;
    }).length;

    // 4. Se não tiver legendas no YouTube (ou tiver menos de 2 falas reais), GERA com IA (Whisper)
    if (!segments.length || realSpokenCount < 2) {
      console.warn(`[ProcessRoute] Legendas insuficientes para ${targetVideoId}. Gerando com CloudWhisper...`);
      try {
        const whisperSegments = await CloudWhisperService.transcribeAudio(targetVideoId);
        if (whisperSegments && whisperSegments.length > 0) {
          const rawSegments = whisperSegments.map((s) => ({
            start: s.start,
            end: s.end,
            text_en: s.text,
          }));
          const mergedSegments = YouTubeService.mergeNaturalSentences(rawSegments);
          segments = await YouTubeService.enrichBilingualSegments(
            mergedSegments,
            "en"
          );
        }
      } catch (whisperErr: any) {
        console.warn("[ProcessRoute] Falha na transcrição Whisper:", whisperErr?.message);
      }
    }

    // 5. Fallback final apenas se vídeo não contiver absolutamente nenhuma fala nem IA configurada
    if (!segments.length) {
      console.warn(`[ProcessRoute] Nenhuma legenda extraída para ${videoId}. Gerando segmento de fallback com metadados.`);
      const isPtTitle = YouTubeService.detectLanguage(metadata.title) === "pt";
      let enTitle = metadata.title;
      let ptTitle = metadata.title;

      if (isPtTitle) {
        enTitle =
          (await YouTubeService.translateBatch([metadata.title], "pt", "en"))[0] ||
          metadata.title;
      } else {
        ptTitle =
          (await YouTubeService.translateBatch([metadata.title], "en", "pt"))[0] ||
          metadata.title;
      }

      segments = [
        {
          start: 0,
          end: Math.max(5, Math.min(metadata.duration, 15)),
          text_en: enTitle,
          text_pt: ptTitle,
        },
      ];
      (segments as any).detectedLang = isPtTitle ? "pt" : "en";
    }

    const detectedLang = (segments as any).detectedLang || "en";

    // 6. Salva no repositório de vídeos
    const finalSpokenCount = segments.filter((s) => {
      const clean = s.text_en
        ?.replace(/\[[^\]]+\]/g, "")
        ?.replace(/♪/g, "")
        ?.trim() || "";
      const words = clean.split(/\s+/).filter((w) => /[a-zA-Z]{2,}/.test(w));
      return words.length >= 2;
    }).length;
    const hasRealSpeech = finalSpokenCount >= 2;

    const savedRecord = videoRepository.saveVideo({
      id: videoId,
      videoId,
      embedVideoId,
      title: metadata.title,
      uploader: metadata.uploader,
      duration: metadata.duration,
      thumbnail: metadata.thumbnail,
      url: metadata.url,
      detectedLang,
      segmentsCount: segments.length,
      segments,
      hasRealSpeech,
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
