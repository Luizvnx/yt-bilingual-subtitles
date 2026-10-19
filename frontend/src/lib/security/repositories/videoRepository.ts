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
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export class VideoRepository extends BaseRepository<VideoRecord> {
  constructor() {
    super("videos_saas.json");
  }

  public getAll(): VideoRecord[] {
    const videos = this.readData();
    return videos.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getById(id: string): VideoRecord | null {
    const videos = this.readData();
    return videos.find((v) => v.id === id || v.videoId === id) || null;
  }

  public saveVideo(data: Omit<VideoRecord, "createdAt" | "updatedAt">): VideoRecord {
    const videos = this.readData();
    const existingIndex = videos.findIndex(
      (v) => v.id === data.id || v.videoId === data.videoId
    );
    const nowIso = new Date().toISOString();

    if (existingIndex >= 0) {
      const updated: VideoRecord = {
        ...videos[existingIndex],
        ...data,
        updatedAt: nowIso,
      };
      videos[existingIndex] = updated;
      this.writeData(videos);
      return updated;
    }

    const created: VideoRecord = {
      ...data,
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
