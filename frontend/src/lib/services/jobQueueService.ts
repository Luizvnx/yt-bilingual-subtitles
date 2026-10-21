import { videoRepository, VideoRecord, usageRepository } from "../security";
import { YouTubeService } from "./youtubeService";
import { CloudWhisperService } from "./cloudWhisperService";

export type JobStatus = "pending" | "processing" | "completed" | "error";

export interface JobProgress {
  stage: number;
  message: string;
  status: JobStatus;
  video?: VideoRecord | null;
  error?: string;
}

export type JobListener = (progress: JobProgress) => void;

interface ActiveJob {
  videoId: string;
  status: JobStatus;
  stage: number;
  message: string;
  video: VideoRecord | null;
  error: string | null;
  listeners: Set<JobListener>;
}

/**
 * Gerenciador de Fila e Processamento Assíncrono de Vídeos (Fase 2 do Roadmap).
 * Evita duplicação de processamento quando múltiplos clientes conectam no mesmo vídeo
 * e permite que requisições longas mantenham progresso sincronizado.
 */
class JobQueueServiceSingleton {
  private activeJobs = new Map<string, ActiveJob>();

  public getJob(videoId: string): ActiveJob | undefined {
    return this.activeJobs.get(videoId);
  }

  public isProcessing(videoId: string): boolean {
    const job = this.activeJobs.get(videoId);
    return job?.status === "processing";
  }

  public subscribe(videoId: string, listener: JobListener): () => void {
    let job = this.activeJobs.get(videoId);
    if (!job) {
      job = {
        videoId,
        status: "pending",
        stage: 0,
        message: "Aguardando início do processamento...",
        video: null,
        error: null,
        listeners: new Set(),
      };
      this.activeJobs.set(videoId, job);
    }

    job.listeners.add(listener);

    // Envia o estado atual imediatamente
    listener({
      stage: job.stage,
      message: job.message,
      status: job.status,
      video: job.video,
      error: job.error || undefined,
    });

    return () => {
      job?.listeners.delete(listener);
      if (job && job.listeners.size === 0 && job.status !== "processing") {
        this.activeJobs.delete(videoId);
      }
    };
  }

  private notify(videoId: string, progress: Partial<JobProgress>) {
    const job = this.activeJobs.get(videoId);
    if (!job) return;

    if (progress.stage !== undefined) job.stage = progress.stage;
    if (progress.message !== undefined) job.message = progress.message;
    if (progress.status !== undefined) job.status = progress.status;
    if (progress.video !== undefined) job.video = progress.video;
    if (progress.error !== undefined) job.error = progress.error;

    for (const listener of job.listeners) {
      try {
        listener({
          stage: job.stage,
          message: job.message,
          status: job.status,
          video: job.video,
          error: job.error || undefined,
        });
      } catch {}
    }
  }

  /**
   * Inicia o processamento assíncrono do vídeo.
   * Se já estiver em processamento, não duplica a carga na CPU ou APIs.
   */
  public async processVideo(
    videoId: string,
    userId?: string,
    userTier: "free" | "pro" = "free"
  ): Promise<VideoRecord> {
    // 1. Verifica cache no repositório (com validação de qualidade de tradução)
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

      // Invalida cache antigo se possuir quebras artificiais de teleprompter (ex: "juice. Great. I'll be right")
      const hasBrokenTeleprompterCuts = existing.segments.some((s) =>
        /^[a-z]+[.,!?]\s+[A-Z]/.test(s.text_en.trim())
      );

      if (isActuallyTranslated && !hasBrokenTeleprompterCuts) {
        if (videoId === "kPa7bsKwL-c") {
          existing.embedVideoId = "zgaCZOQCpp8";
        } else if (videoId === "k2qgadSvNyU") {
          existing.embedVideoId = "ClhLNUPqv8Q";
        }
        this.notify(videoId, {
          stage: 100,
          message: "Estúdio pronto!",
          status: "completed",
          video: existing,
        });
        return existing;
      }
    }

    // 2. Se já estiver processando, aguarda a finalização
    const currentJob = this.activeJobs.get(videoId);
    if (currentJob && currentJob.status === "processing") {
      return new Promise((resolve, reject) => {
        const unsubscribe = this.subscribe(videoId, (progress) => {
          if (progress.status === "completed" && progress.video) {
            unsubscribe();
            resolve(progress.video);
          } else if (progress.status === "error") {
            unsubscribe();
            reject(new Error(progress.error || "Erro no processamento"));
          }
        });
      });
    }

    // 3. Inicia novo job
    this.notify(videoId, {
      stage: 10,
      message: "Validando link e consultando metadados...",
      status: "processing",
    });

    try {
      const metadata = await YouTubeService.getMetadata(videoId);

      // Validação de Quota e Duração (Fase 5 do Roadmap)
      const quotaCheck = usageRepository.checkQuota(
        userId,
        userTier,
        videoId,
        metadata.duration
      );
      if (!quotaCheck.canProcess) {
        throw new Error(quotaCheck.reason || "Limite de uso mensal atingido.");
      }

      // 1. Verificação prévia de bloqueio de reprodução / clipes com restrição de embed
      this.notify(videoId, {
        stage: 25,
        message: "Verificando permissões e compatibilidade de reprodução...",
      });

      let embedVideoId: string | undefined = undefined;
      let targetVideoId = videoId;
      const isRestricted = await YouTubeService.checkEmbedRestricted(
        videoId,
        metadata.title,
        metadata.uploader
      );

      if (isRestricted) {
        this.notify(videoId, {
          stage: 30,
          message: "Vídeo com restrição de reprodução externa. Buscando versão compatível...",
        });
        const alt = await YouTubeService.resolvePlayableAlternative(
          videoId,
          metadata.title
        );
        if (alt && alt.id && alt.id !== videoId) {
          embedVideoId = alt.id;
          targetVideoId = alt.id;
          console.log(
            `[JobQueueService] Vídeo ${videoId} possui restrição/bloqueio. Utilizando versão compatível ${targetVideoId} ("${alt.title}") para extração e reprodução.`
          );
        }
      }

      this.notify(videoId, {
        stage: 40,
        message: `Vídeo: "${metadata.title.slice(0, 45)}...". Extraindo falas sincronizadas...`,
      });

      // 2. Extrai legendas da versão que REALMENTE será reproduzida (garantia de timing e sincronia 1:1)
      let segments = await YouTubeService.extractSubtitles(
        targetVideoId,
        (stage, message) => {
          this.notify(videoId, { stage, message });
        }
      );

      // 3. Valida se as legendas contêm falas reais (mais de 2 falas com palavras completas, ignorando tags sonoras)
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
        this.notify(videoId, {
          stage: 65,
          message: "Legendas nativas indisponíveis. Gerando transcrição automática com IA (Whisper)...",
        });

        try {
          const whisperSegments = await CloudWhisperService.transcribeAudio(
            targetVideoId,
            (stage, message) => {
              this.notify(videoId, { stage, message });
            }
          );

          if (whisperSegments && whisperSegments.length > 0) {
            this.notify(videoId, {
              stage: 80,
              message: `Traduzindo ${whisperSegments.length} falas da IA para português...`,
            });
            const rawSegments = whisperSegments.map((s) => ({
              start: s.start,
              end: s.end,
              text_en: s.text,
            }));
            const mergedSegments = YouTubeService.mergeNaturalSentences(rawSegments);
            segments = await YouTubeService.enrichBilingualSegments(
              mergedSegments,
              "en",
              (stage, message) => {
                this.notify(videoId, { stage, message });
              }
            );
          }
        } catch (whisperErr: any) {
          console.warn("[JobQueueService] Falha na transcrição Whisper:", whisperErr?.message);
        }
      }

      // 5. Fallback final apenas se vídeo não contiver absolutamente nenhuma fala nem IA configurada
      if (!segments.length) {
        this.notify(videoId, {
          stage: 85,
          message: "Gerando segmento inicial contextual...",
        });
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

      this.notify(videoId, {
        stage: 95,
        message: "Gravando estúdio bilíngue na biblioteca...",
      });

      const detectedLang = (segments as any).detectedLang || "en";

      const finalSpokenCount = segments.filter((s) => {
        const clean = s.text_en
          ?.replace(/\[[^\]]+\]/g, "")
          ?.replace(/♪/g, "")
          ?.trim() || "";
        const words = clean.split(/\s+/).filter((w) => /[a-zA-Z]{2,}/.test(w));
        return words.length >= 2;
      }).length;
      const hasRealSpeech = finalSpokenCount >= 2;

      const saved = videoRepository.saveVideo({
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

      this.notify(videoId, {
        stage: 100,
        message: "Estúdio bilíngue pronto para estudo!",
        status: "completed",
        video: saved,
      });

      // Limpa job após 30 segundos
      setTimeout(() => {
        this.activeJobs.delete(videoId);
      }, 30000);

      return saved;
    } catch (err: any) {
      const msg = err?.message || "Ocorreu um erro ao processar o vídeo.";
      this.notify(videoId, {
        stage: 0,
        message: msg,
        status: "error",
        error: msg,
      });
      setTimeout(() => {
        this.activeJobs.delete(videoId);
      }, 10000);
      throw err;
    }
  }
}

export const jobQueueService = new JobQueueServiceSingleton();
