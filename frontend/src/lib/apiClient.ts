/**
 * Utilitário para requisições autenticadas no frontend com dupla resiliência:
 * 1. Envia automaticamente cookies HTTP-Only (mesma origem)
 * 2. Envia fallback header Authorization: Bearer <token> se disponível em localStorage
 */

export function getClientAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("ytsubs_auth_token");
  } catch {
    return null;
  }
}

export function getClientAuthHeaders(): Record<string, string> {
  const token = getClientAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const authHeaders = getClientAuthHeaders();
  const mergedHeaders = {
    ...authHeaders,
    ...(init?.headers || {}),
  };

  return fetch(input, {
    ...init,
    headers: mergedHeaders,
    credentials: init?.credentials || "include",
  });
}
