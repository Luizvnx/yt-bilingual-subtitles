import { z } from "zod";

// Domínios oficiais permitidos para o YouTube (prevenção anti-SSRF)
export const ALLOWED_YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
]);

// Regex estrito para IDs de vídeo do YouTube (exatamente 11 caracteres base64url)
export const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

// Hosts/redes bloqueadas para prevenir SSRF (rede interna / loopback / metadados de nuvem)
const FORBIDDEN_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254",
]);

/**
 * Validador estrito de URL do YouTube para prevenir ataques de SSRF (Server-Side Request Forgery).
 * Garante que apenas domínios legítimos do Google/YouTube sejam aceitos e extrai o ID canônico de 11 caracteres.
 */
export function validateAndExtractYouTubeId(inputUrl: string): string {
  if (!inputUrl || typeof inputUrl !== "string") {
    throw new Error("URL do vídeo inválida ou ausente.");
  }

  const url = inputUrl.trim();

  // Limite de segurança de tamanho
  if (url.length > 500) {
    throw new Error("URL excede o comprimento máximo permitido.");
  }

  // Se o usuário passou diretamente o ID de 11 caracteres
  if (YOUTUBE_ID_REGEX.test(url)) {
    return url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Formato de URL malformado.");
  }

  // 1. Esquema deve ser estritamente https (ou http em dev)
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Esquema de protocolo inválido. Apenas HTTPS é permitido.");
  }

  // 2. Hostname deve pertencer à whitelist oficial
  const hostname = parsed.hostname.toLowerCase();
  if (FORBIDDEN_HOSTS.has(hostname) || !ALLOWED_YOUTUBE_HOSTS.has(hostname)) {
    throw new Error(
      `Domínio não autorizado: '${hostname}'. Apenas vídeos do YouTube são permitidos.`
    );
  }

  // 3. Extração do ID do vídeo
  let videoId: string | null = null;

  if (hostname === "youtu.be") {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      videoId = parts[0];
    }
  } else {
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (
      parsed.pathname.startsWith("/embed/") ||
      parsed.pathname.startsWith("/shorts/") ||
      parsed.pathname.startsWith("/v/")
    ) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        videoId = parts[1];
      }
    }
  }

  if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
    throw new Error(
      "Não foi possível extrair um identificador válido de vídeo do YouTube (11 caracteres)."
    );
  }

  return videoId;
}

// Schemas Zod de Entrada e Validação
export const ProcessVideoSchema = z.object({
  url: z.string().min(5).max(500),
  model: z.enum(["tiny", "base", "small", "medium", "large"]).default("base"),
});

export const UserRegisterSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("Endereço de e-mail inválido").max(255),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(128),
});

export const UserLoginSchema = z.object({
  email: z.string().email("E-mail em formato inválido").max(255),
  password: z.string().min(1, "A senha é obrigatória").max(128),
});
