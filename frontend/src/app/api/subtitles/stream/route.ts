import { NextRequest } from "next/server";
import {
  validateAndExtractYouTubeId,
  checkRateLimit,
  getAuthTokenFromCookies,
  CryptoService,
  getClientIp,
} from "@/lib/security";
import { jobQueueService } from "@/lib/services/jobQueueService";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";

  // Rate limiting anti-abuso: máx 15 conexões por minuto
  const ip = getClientIp(request);
  const { allowed, retryAfter } = checkRateLimit(`stream:${ip}`, 15, 60);

  const encoder = new TextEncoder();

  if (!allowed) {
    const errorBody = `event: error\ndata: ${JSON.stringify({
      error: "Muitas requisições. Aguarde um minuto.",
      retryAfter,
    })}\n\n`;
    return new Response(errorBody, {
      status: 429,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  let videoId = "";
  try {
    if (!rawUrl.trim()) {
      throw new Error("Link do YouTube é obrigatório.");
    }
    videoId = validateAndExtractYouTubeId(rawUrl.trim());
  } catch (err: any) {
    const errorBody = `event: error\ndata: ${JSON.stringify({
      error: err?.message || "Link inválido.",
    })}\n\n`;
    return new Response(errorBody, {
      status: 400,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  let userId: string | undefined = undefined;
  let userTier: "free" | "pro" = "free";
  try {
    const token = await getAuthTokenFromCookies();
    if (token) {
      const payload = await CryptoService.verifyAuthToken(token);
      if (payload?.uid) {
        userId = payload.uid;
        userTier = (payload.tier as "free" | "pro") || "free";
      }
    }
  } catch {}

  // Usuários não logados não têm acesso a processar vídeos no streaming
  if (!userId) {
    const errorBody = `event: error\ndata: ${JSON.stringify({
      error: "Crie sua conta gratuita ou faça login para acessar os vídeos e estúdios de estudo.",
      code: "AUTH_REQUIRED",
      requireAuth: true,
    })}\n\n`;
    return new Response(errorBody, {
      status: 401,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {}
      };

      unsubscribe = jobQueueService.subscribe(videoId, (progress) => {
        if (progress.status === "completed") {
          sendEvent("complete", progress);
          setTimeout(() => {
            try {
              controller.close();
            } catch {}
          }, 1200);
        } else if (progress.status === "error") {
          sendEvent("error", {
            error: progress.error || "Erro no processamento do vídeo.",
          });
          setTimeout(() => {
            try {
              controller.close();
            } catch {}
          }, 1200);
        } else {
          sendEvent("progress", progress);
        }
      });

      // Dispara o processamento assíncrono (ou anexa ao job em andamento sem duplicação)
      jobQueueService.processVideo(videoId, userId, userTier).catch(() => {});
    },
    cancel() {
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
