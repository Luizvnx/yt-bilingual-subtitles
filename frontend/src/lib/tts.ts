/**
 * Utilitário de Pronúncia Nativa em Inglês (Text-to-Speech)
 * 
 * 1. Prioridade 1: Áudio nativo HD via endpoint /api/tts (Google TTS / Dictionary API).
 *    Garante pronúncia 100% autêntica em inglês americano, independentemente do sistema
 *    operacional ou idioma do computador do usuário (evita vozes em português do Windows como Maria/Daniel).
 * 
 * 2. Fallback: window.speechSynthesis com verificação estrita de idioma.
 *    Se e somente se uma voz nativa em inglês for encontrada localmente, utiliza o sintetizador.
 *    Se não houver voz em inglês no SO, NUNCA permite que uma voz em português leia palavras em inglês.
 */

let cachedEnglishVoice: SpeechSynthesisVoice | null = null;
let activeAudio: HTMLAudioElement | null = null;

export function getEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return null;
  }

  // Se já encontrou uma voz válida anteriormente, reutiliza
  if (cachedEnglishVoice && voices.includes(cachedEnglishVoice)) {
    return cachedEnglishVoice;
  }

  // 1. Prioridade máxima: Vozes de alta qualidade em inglês americano (Google US, Natural, David, Zira, Samantha)
  const premiumEnUs = voices.find(
    (v) =>
      v.lang.toLowerCase().replace("_", "-").startsWith("en-us") &&
      (v.name.includes("Google") ||
        v.name.includes("Natural") ||
        v.name.includes("David") ||
        v.name.includes("Zira") ||
        v.name.includes("Samantha") ||
        v.name.includes("Guy") ||
        v.name.includes("Jenny"))
  );
  if (premiumEnUs) {
    cachedEnglishVoice = premiumEnUs;
    return premiumEnUs;
  }

  // 2. Qualquer voz en-US
  const enUs = voices.find(
    (v) => v.lang.toLowerCase().replace("_", "-").startsWith("en-us")
  );
  if (enUs) {
    cachedEnglishVoice = enUs;
    return enUs;
  }

  // 3. Voz em inglês britânico (en-GB)
  const enGb = voices.find(
    (v) => v.lang.toLowerCase().replace("_", "-").startsWith("en-gb")
  );
  if (enGb) {
    cachedEnglishVoice = enGb;
    return enGb;
  }

  // 4. Qualquer voz cujo código comece com "en"
  const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  if (anyEn) {
    cachedEnglishVoice = anyEn;
    return anyEn;
  }

  return null;
}

// Inicializa o cache de vozes assim que o navegador disponibiliza a lista
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    getEnglishVoice();
  };
}

/**
 * Pronuncia uma palavra ou frase estritamente com pronúncia nativa em inglês.
 */
export function speakInEnglish(text: string, rate: number = 0.88): void {
  if (typeof window === "undefined") return;

  const cleanText = text.trim();
  if (!cleanText) return;

  // Interrompe qualquer áudio ou fala em andamento antes de reproduzir a nova
  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {}

  // 1. ESTRATÉGIA PRINCIPAL: Áudio nativo HD via API de TTS
  const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}`;
  const audio = new Audio(ttsUrl);
  activeAudio = audio;

  audio.play().catch(() => {
    // 2. ESTRATÉGIA DE FALLBACK: SpeechSynthesis com trava estrita de voz em inglês
    if (!("speechSynthesis" in window)) return;

    try {
      const voice = getEnglishVoice();
      // REGRA CRÍTICA: Se não houver voz nativa em inglês no computador, NÃO fale com voz em português
      if (!voice) {
        console.warn(
          "[TTS] Nenhuma voz em inglês encontrada no sistema. Voz padrão em português bloqueada."
        );
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-US";
      utterance.rate = rate;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("[TTS Fallback Error]:", err);
    }
  });
}
