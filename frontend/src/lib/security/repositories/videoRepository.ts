import { BaseRepository } from "./base";

export interface SubtitleSegment {
  id?: number;
  start: number;
  end: number;
  text_en: string;
  text_pt: string;
}

export interface VideoRecord {
  id: string;
  videoId: string;
  embedVideoId?: string;
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
  url: string;
  detectedLang: string;
  segmentsCount: number;
  segments: SubtitleSegment[];
  hasRealSpeech?: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export class VideoRepository extends BaseRepository<VideoRecord> {
  constructor() {
    super("videos_saas.json");
  }

  private sanitizeSegments(segments?: SubtitleSegment[]): SubtitleSegment[] {
    if (!segments || !Array.isArray(segments) || segments.length === 0) return [];
    const sorted = [...segments].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end > sorted[i + 1].start) {
        sorted[i].end = sorted[i + 1].start;
      }
      if (sorted[i].end < sorted[i].start + 0.3) {
        sorted[i].end = Math.round((sorted[i].start + 0.5) * 100) / 100;
      }
    }
    return sorted;
  }

  public getAll(): VideoRecord[] {
    const videos = this.readData();
    return videos
      .map((v) => ({
        ...v,
        segments: this.sanitizeSegments(v.segments),
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  public getById(id: string): VideoRecord | null {
    const videos = this.readData();
    const found = videos.find((v) => v.id === id || v.videoId === id) || null;
    if (found && found.segments) {
      found.segments = this.sanitizeSegments(found.segments);
    }
    return found;
  }

  public saveVideo(data: Omit<VideoRecord, "createdAt" | "updatedAt">): VideoRecord {
    const cleanData = {
      ...data,
      segments: this.sanitizeSegments(data.segments),
    };
    cleanData.segmentsCount = cleanData.segments.length;

    const videos = this.readData();
    const existingIndex = videos.findIndex(
      (v) => v.id === cleanData.id || v.videoId === cleanData.videoId
    );
    const nowIso = new Date().toISOString();

    if (existingIndex >= 0) {
      const updated: VideoRecord = {
        ...videos[existingIndex],
        ...cleanData,
        updatedAt: nowIso,
      };
      videos[existingIndex] = updated;
      this.writeData(videos);
      return updated;
    }

    const created: VideoRecord = {
      ...cleanData,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    videos.unshift(created);
    this.writeData(videos);
    return created;
  }

  public deleteById(id: string, userId?: string): boolean {
    const videos = this.readData();
    const target = videos.find((v) => v.id === id || v.videoId === id);
    if (!target) return false;

    // Se o vídeo pertence a um usuário específico, valida permissão
    if (target.userId) {
      if (!userId || target.userId !== userId) {
        throw new Error("Permissão negada. Você só pode remover vídeos do seu próprio histórico.");
      }
    }

    const filtered = videos.filter((v) => v.id !== id && v.videoId !== id);
    this.writeData(filtered);
    return true;
  }
}

export const videoRepository = new VideoRepository();
