import { NextRequest, NextResponse } from "next/server";
import {
  videoRepository,
  quizRepository,
  QuizQuestion,
  getAuthTokenFromCookies,
  CryptoService,
} from "@/lib/security";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do vídeo é obrigatório." }, { status: 400 });
  }

  // 1. Verificação Estrita de Autenticação e Plano PRO no Backend
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

  if (!userId) {
    return NextResponse.json(
      {
        error: "Faça login ou crie sua conta para acessar o Quiz com IA.",
        code: "AUTH_REQUIRED",
        requireAuth: true,
      },
      { status: 401 }
    );
  }

  if (userTier !== "pro") {
    return NextResponse.json(
      {
        error: "O Quiz com IA é exclusivo para assinantes do Plano PRO. Faça upgrade para desbloquear quizzes pedagógicos ilimitados!",
        code: "PRO_REQUIRED",
        requireUpgrade: true,
      },
      { status: 403 }
    );
  }

  // 2. Verifica se já existe um quiz gerado e salvo para este vídeo (compartilhado entre todos os usuários)
  const existingQuiz = quizRepository.getByVideoId(id);
  if (existingQuiz && existingQuiz.questions && existingQuiz.questions.length > 0) {
    return NextResponse.json({
      success: true,
      cached: true,
      quiz: existingQuiz,
    });
  }

  // 2. Busca o vídeo e as legendas no repositório
  const video = videoRepository.getById(id);
  if (!video || !video.segments || video.segments.length === 0) {
    return NextResponse.json(
      { error: "Vídeo ou legendas não encontrados para gerar o quiz." },
      { status: 404 }
    );
  }

  // 3. Prepara trecho relevante das legendas para a IA
  const sampleSegments = video.segments
    .filter((s) => s.text_en && s.text_en.trim().length > 10 && !s.text_en.startsWith("["))
    .slice(0, 35);

  if (sampleSegments.length < 2) {
    return NextResponse.json(
      { error: "Legendas insuficientes para gerar perguntas com IA." },
      { status: 400 }
    );
  }

  const transcriptContext = sampleSegments
    .map((s, idx) => `[${idx + 1}] EN: "${s.text_en}" | PT: "${s.text_pt}"`)
    .join("\n");

  let generatedQuestions: QuizQuestion[] = [];

  // 4. Geração via Groq API (Llama 3) se a chave estiver configurada
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const prompt = `Você é um tutor especialista de inglês para falantes de português.
Com base nas seguintes legendas do vídeo "${video.title}", gere EXATAMENTE 3 perguntas de múltipla escolha para testar a compreensão auditiva e o vocabulário do aluno.

Regras Obrigatórias:
1. As perguntas e opções devem ser simples, claras e estimulantes para quem está estudando inglês.
2. Cada pergunta deve ter exatamente 4 opções de resposta (em português ou inglês com tradução).
3. Especifique "correctIndex" (0, 1, 2 ou 3) indicando a opção correta.
4. Inclua uma breve explicação pedagógica em português ("explanation").
5. Inclua a citação original em inglês ("quote") que comprova a resposta.
6. Retorne ESTRITAMENTE um JSON no formato:
{
  "questions": [
    {
      "id": 1,
      "question": "Pergunta clara em português?",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctIndex": 0,
      "explanation": "Explicação em português...",
      "quote": "Frase em inglês..."
    }
  ]
}

Legendas:
${transcriptContext}`;

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "Você é um gerador de quizzes pedagógicos de inglês que responde exclusivamente em JSON válido.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 1200,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const content = groqData.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.questions) && parsed.questions.length >= 2) {
            generatedQuestions = parsed.questions.map((q: any, i: number) => ({
              id: i + 1,
              question: q.question,
              options: q.options,
              correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
              explanation: q.explanation || "Resposta correta de acordo com as falas do vídeo.",
              quote: q.quote || "",
            }));
          }
        }
      }
    } catch (err: any) {
      console.warn("[QuizAPI] Falha na chamada da Groq API:", err?.message);
    }
  }

  // 5. Fallback Heurístico Inteligente caso a IA externa não esteja disponível
  if (generatedQuestions.length < 2) {
    const pool = sampleSegments.slice(0, 12);
    const selected = pool.slice(0, 3);

    generatedQuestions = selected.map((seg, i) => {
      const correctOption = seg.text_pt;
      // Gera opções incorretas a partir de outros segmentos
      const otherOptions = sampleSegments
        .filter((s) => s.text_pt !== correctOption)
        .map((s) => s.text_pt)
        .slice(0, 3);

      const allOptions = [correctOption, ...otherOptions];
      // Embaralha as opções de forma determinística
      const shuffled = allOptions.sort(() => 0.5 - Math.random());
      const correctIdx = shuffled.indexOf(correctOption);

      return {
        id: i + 1,
        question: `Qual o significado da fala: "${seg.text_en}"?`,
        options: shuffled,
        correctIndex: correctIdx >= 0 ? correctIdx : 0,
        explanation: `No vídeo, esta fala é traduzida como "${seg.text_pt}".`,
        quote: seg.text_en,
      };
    });
  }

  // 6. Salva no QuizRepository para ficar disponível permanentemente para todos os usuários
  const savedQuiz = quizRepository.saveQuiz({
    id: video.videoId,
    videoId: video.videoId,
    title: video.title,
    questions: generatedQuestions,
  });

  return NextResponse.json({
    success: true,
    cached: false,
    quiz: savedQuiz,
  });
}
