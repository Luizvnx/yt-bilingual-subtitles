import { NextRequest, NextResponse } from "next/server";

// Cache em memória de alta performance para pronúncias em áudio MP3 (0ms)
const TTS_AUDIO_CACHE = new Map<string, ArrayBuffer>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawText = searchParams.get("text") || "";
  const text = rawText.trim().slice(0, 150); // Limite de 150 caracteres para pronúncia de palavras/frases

  if (!text) {
    return NextResponse.json({ error: "Texto obrigatório para pronúncia." }, { status: 400 });
  }

  const cacheKey = text.toLowerCase();

  // 1. Resposta instantânea se já estiver no cache em memória
  if (TTS_AUDIO_CACHE.has(cacheKey)) {
    const cachedBuffer = TTS_AUDIO_CACHE.get(cacheKey)!;
    return new Response(cachedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=604800, immutable", // Cache de 7 dias no navegador
      },
    });
  }

  // 2. Busca pronúncia nativa autêntica em inglês americano via Google TTS
  try {
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(
      text
    )}`;

    const res = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const audioBuffer = await res.arrayBuffer();
      if (audioBuffer && audioBuffer.byteLength > 200) {
        // Armazena no cache em memória (mantém tamanho sob controle)
        if (TTS_AUDIO_CACHE.size > 2000) {
          const firstKey = TTS_AUDIO_CACHE.keys().next().value;
          if (firstKey) TTS_AUDIO_CACHE.delete(firstKey);
        }
        TTS_AUDIO_CACHE.set(cacheKey, audioBuffer);

        return new Response(audioBuffer, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=604800, immutable",
          },
        });
      }
    }
  } catch (err) {
    // Fallback para provedor secundário
  }

  // 3. Fallback: Free Dictionary API (áudio humano gravado)
  try {
    const dictRes = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`,
      { signal: AbortSignal.timeout(2500) }
    );

    if (dictRes.ok) {
      const dictData = await dictRes.json();
      if (Array.isArray(dictData) && dictData.length > 0) {
        const entry = dictData[0];
        let audioUrl = "";
        if (Array.isArray(entry.phonetics)) {
          for (const p of entry.phonetics) {
            if (p.audio && p.audio.startsWith("http")) {
              audioUrl = p.audio;
              break;
            }
          }
        }

        if (audioUrl) {
          const audioFetch = await fetch(audioUrl, { signal: AbortSignal.timeout(3000) });
          if (audioFetch.ok) {
            const audioBuffer = await audioFetch.arrayBuffer();
            TTS_AUDIO_CACHE.set(cacheKey, audioBuffer);
            return new Response(audioBuffer, {
              status: 200,
              headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=604800, immutable",
              },
            });
          }
        }
      }
    }
  } catch (err) {
    // Fallback silencioso
  }

  return NextResponse.json({ error: "Não foi possível carregar o áudio nativo." }, { status: 502 });
}
