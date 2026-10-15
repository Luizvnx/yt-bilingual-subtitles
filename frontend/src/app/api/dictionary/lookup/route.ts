import { NextRequest, NextResponse } from "next/server";
import { YouTubeService } from "@/lib/services/youtubeService";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawWord = searchParams.get("word") || "";
  const word = rawWord.trim().toLowerCase().replace(/[^a-zA-Z'-]/g, "");

  if (!word) {
    return NextResponse.json(
      { error: "Palavra é obrigatória." },
      { status: 400 }
    );
  }

  try {
    let phonetics = "";
    let audioUrl = "";
    let definitionEn = "";
    let partOfSpeech = "";

    // 1. Busca definição e fonética na Dictionary API gratuita
    try {
      const dictRes = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
          word
        )}`
      );
      if (dictRes.ok) {
        const dictData = await dictRes.json();
        if (Array.isArray(dictData) && dictData.length > 0) {
          const entry = dictData[0];
          phonetics = entry.phonetic || "";

          // Procura fonética em áudio
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
      // Ignora erro de dicionário externo
    }

    // 2. Tradução para o Português
    const ptTranslations = await YouTubeService.translateBatch([word], "en", "pt");
    const translationPt = ptTranslations[0] || word;

    return NextResponse.json({
      word,
      phonetics,
      audioUrl,
      partOfSpeech,
      definitionEn,
      translationPt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao buscar palavra." },
      { status: 500 }
    );
  }
}
