/**
 * Utilitário de Pronúncia Nativa em Inglês (Text-to-Speech)
 * Garante que o sintetizador selecione estritamente uma voz nativa em inglês (en-US / en-GB),
 * impedindo que vozes em português (padrão do SO) tentem ler palavras em inglês com sotaque errado.
 */

let cachedEnglishVoice: SpeechSynthesisVoice | null = null;

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

  // 1. Prioridade máxima: Vozes de alta qualidade em inglês americano (Google US, Natural, David, Zira)
  const premiumEnUs = voices.find(
    (v) =>
      v.lang === "en-US" &&
      (v.name.includes("Google") ||
        v.name.includes("Natural") ||
        v.name.includes("David") ||
        v.name.includes("Zira") ||
        v.name.includes("Samantha"))
  );
  if (premiumEnUs) {
    cachedEnglishVoice = premiumEnUs;
    return premiumEnUs;
  }

  // 2. Qualquer voz en-US
  const enUs = voices.find((v) => v.lang === "en-US" || v.lang === "en_US");
  if (enUs) {
    cachedEnglishVoice = enUs;
    return enUs;
  }

  // 3. Voz em inglês britânico (en-GB)
  const enGb = voices.find((v) => v.lang.startsWith("en-GB") || v.lang.startsWith("en_GB"));
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

// Inicializa o cache de vozes assim que o navegador carrega a lista
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    getEnglishVoice();
  };
}

/**
 * Pronuncia uma palavra ou frase estritamente com pronúncia em inglês nativo.
 */
export function speakInEnglish(text: string, rate: number = 0.88): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const cleanText = text.trim();
  if (!cleanText) return;

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = rate;
    utterance.lang = "en-US";

    const voice = getEnglishVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("[TTS Error]:", err);
  }
}
