import { BaseRepository } from "./base";

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  quote?: string;
}

export interface QuizRecord {
  id: string; // videoId
  videoId: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export class QuizRepository extends BaseRepository<QuizRecord> {
  constructor() {
    super("quizzes_saas.json");
  }

  public getByVideoId(videoId: string): QuizRecord | null {
    const quizzes = this.readData();
    return quizzes.find((q) => q.videoId === videoId || q.id === videoId) || null;
  }

  public saveQuiz(data: Omit<QuizRecord, "createdAt" | "updatedAt">): QuizRecord {
    const quizzes = this.readData();
    const existingIndex = quizzes.findIndex(
      (q) => q.id === data.id || q.videoId === data.videoId
    );
    const nowIso = new Date().toISOString();

    if (existingIndex >= 0) {
      const updated: QuizRecord = {
        ...quizzes[existingIndex],
        ...data,
        updatedAt: nowIso,
      };
      quizzes[existingIndex] = updated;
      this.writeData(quizzes);
      return updated;
    }

    const newRecord: QuizRecord = {
      ...data,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    quizzes.push(newRecord);
    this.writeData(quizzes);
    return newRecord;
  }
}

export const quizRepository = new QuizRepository();
