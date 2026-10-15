import { NextRequest, NextResponse } from "next/server";
import {
  getAuthTokenFromCookies,
  CryptoService,
  vocabularyRepository,
} from "@/lib/security";

export async function GET() {
  const token = await getAuthTokenFromCookies();
  if (!token) {
    return NextResponse.json(
      { error: "Você precisa estar conectado para acessar seu vocabulário." },
      { status: 401 }
    );
  }

  const payload = await CryptoService.verifyAuthToken(token);
  if (!payload?.uid) {
    return NextResponse.json(
      { error: "Sessão inválida ou expirada." },
      { status: 401 }
    );
  }

  const words = vocabularyRepository.getByUserId(payload.uid);
  return NextResponse.json({ success: true, words });
}

export async function POST(request: NextRequest) {
  const token = await getAuthTokenFromCookies();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Você precisa fazer login ou criar uma conta para salvar palavras no seu vocabulário pessoal.",
        code: "AUTH_REQUIRED",
      },
      { status: 401 }
    );
  }

  const payload = await CryptoService.verifyAuthToken(token);
  if (!payload?.uid) {
    return NextResponse.json(
      { error: "Sessão expirada. Faça login novamente.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { word, translationPt, phonetics, partOfSpeech, contextSentence } =
      body;

    if (!word || !translationPt) {
      return NextResponse.json(
        { error: "Palavra e tradução são obrigatórias." },
        { status: 400 }
      );
    }

    const saved = vocabularyRepository.addWord(
      payload.uid,
      word,
      translationPt,
      phonetics,
      partOfSpeech,
      contextSentence
    );

    return NextResponse.json(
      {
        success: true,
        message: "Palavra salva com sucesso no seu vocabulário!",
        word: saved,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao salvar palavra no vocabulário." },
      { status: 500 }
    );
  }
}
