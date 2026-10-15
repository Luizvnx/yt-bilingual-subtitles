import crypto from "crypto";
import { BaseRepository } from "./base";

export interface VocabularyRecord {
  id: string;
  userId: string;
  word: string;
  translationPt: string;
  phonetics?: string;
  partOfSpeech?: string;
  contextSentence?: string;
  createdAt: string;
}

export class VocabularyRepository extends BaseRepository<VocabularyRecord> {
  constructor() {
    super("vocabulary_saas.json");
  }

  public getByUserId(userId: string): VocabularyRecord[] {
    const all = this.readData();
    return all
      .filter((v) => v.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  public addWord(
    userId: string,
    word: string,
    translationPt: string,
    phonetics?: string,
    partOfSpeech?: string,
    contextSentence?: string
  ): VocabularyRecord {
    const all = this.readData();
    const cleanWord = word.trim().toLowerCase();

    // Se já foi salva pelo usuário, atualiza
    const existing = all.find(
      (v) => v.userId === userId && v.word.toLowerCase() === cleanWord
    );
    const nowIso = new Date().toISOString();

    if (existing) {
      existing.translationPt = translationPt;
      if (phonetics) existing.phonetics = phonetics;
      if (partOfSpeech) existing.partOfSpeech = partOfSpeech;
      if (contextSentence) existing.contextSentence = contextSentence;
      this.writeData(all);
      return existing;
    }

    const newRecord: VocabularyRecord = {
      id: `voc_${crypto.randomBytes(6).toString("hex")}`,
      userId,
      word: cleanWord,
      translationPt,
      phonetics,
      partOfSpeech,
      contextSentence,
      createdAt: nowIso,
    };

    all.unshift(newRecord);
    this.writeData(all);
    return newRecord;
  }

  public deleteWord(id: string, userId: string): boolean {
    const all = this.readData();
    const target = all.find((v) => v.id === id);
    if (!target) return false;

    // Garante que apenas o próprio dono da palavra pode deletá-la
    BaseRepository.enforceTenantScope(target.userId, userId);

    const filtered = all.filter((v) => v.id !== id);
    this.writeData(filtered);
    return true;
  }
}

export const vocabularyRepository = new VocabularyRepository();
