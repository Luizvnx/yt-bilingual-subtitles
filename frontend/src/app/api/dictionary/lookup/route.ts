import { NextRequest, NextResponse } from "next/server";
import { YouTubeService } from "@/lib/services/youtubeService";

// Cache em memória de alta performance para o dicionário
const DICT_CACHE = new Map<string, any>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawWord = searchParams.get("word") || "";
  const word = rawWord.trim().toLowerCase().replace(/[^\p{L}'-]/gu, "");

  if (!word) {
    return NextResponse.json(
      { error: "Palavra é obrigatória." },
      { status: 400 }
    );
  }

  // 1. Resposta instantânea via cache (0ms)
  if (DICT_CACHE.has(word)) {
    return NextResponse.json(DICT_CACHE.get(word));
  }

  try {
    let phonetics = "";
    let audioUrl = "";
    let definitionEn = "";
    let partOfSpeech = "";

    // 2. Executa a busca de definição e a tradução em paralelo com timeout agressivo de 1.8s
    const fetchDictionary = async () => {
      try {
        const dictRes = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
            word
          )}`,
          { signal: AbortSignal.timeout(1800) }
        );
        if (dictRes.ok) {
          const dictData = await dictRes.json();
          if (Array.isArray(dictData) && dictData.length > 0) {
            const entry = dictData[0];
            phonetics = entry.phonetic || "";

            if (Array.isArray(entry.phonetics)) {
              for (const p of entry.phonetics) {
                if (!phonetics && p.text) phonetics = p.text;
                if (p.audio && !audioUrl) audioUrl = p.audio;
              }
            }

            if (Array.isArray(entry.meanings) && entry.meanings.length > 0) {
              const meaning = entry.meanings[0];
              partOfSpeech = meaning.partOfSpeech || "";
              if (meaning.definitions && meaning.definitions.length > 0) {
                definitionEn = meaning.definitions[0].definition || "";
              }
            }
          }
        }
      } catch {
        // Fallback silencioso
      }
    };

    const fetchTranslation = async () => {
      try {
        const ptTranslations = await YouTubeService.translateBatch([word], "en", "pt");
        if (ptTranslations[0] && ptTranslations[0].toLowerCase() !== word.toLowerCase()) {
          return ptTranslations[0];
        }
      } catch {}

      // Fallback para MyMemory se o Google falhar ou retornar a mesma palavra
      try {
        const myMemRes = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|pt`,
          { signal: AbortSignal.timeout(2000) }
        );
        if (myMemRes.ok) {
          const myMemData = await myMemRes.json();
          if (myMemData.responseData?.translatedText) {
            return myMemData.responseData.translatedText;
          }
        }
      } catch {}

      return word;
    };

    const [, translationPt] = await Promise.all([
      fetchDictionary(),
      fetchTranslation(),
    ]);

    const result = {
      word,
      phonetics: phonetics || `/${word}/`,
      audioUrl,
      partOfSpeech,
      definitionEn,
      translationPt,
    };

    // Guarda no cache
    DICT_CACHE.set(word, result);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      word,
      phonetics: `/${word}/`,
      audioUrl: "",
      partOfSpeech: "",
      definitionEn: "",
      translationPt: word,
    });
  }
}
