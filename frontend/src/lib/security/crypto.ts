import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET_STRING =
  process.env.JWT_SECRET ||
  "bilingual-subtitles-saas-secret-key-2026-ultra-secure";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface TokenPayload {
  uid: string;
  role: string;
  tier: string;
  [key: string]: unknown;
}

/**
 * Serviço de Criptografia e Emissão de Tokens Criptografados.
 * Padrão de Projeto: Singleton / Service Layer.
 */
export class CryptoService {
  /**
   * Hashing seguro de senha com salt aleatório via bcryptjs.
   */
  static async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error("A senha deve ter pelo menos 8 caracteres.");
    }
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Comparação segura de senha em tempo constante.
   */
  static async verifyPassword(
    password: string,
    passwordHash: string
  ): Promise<boolean> {
    if (!password || !passwordHash) return false;
    return bcrypt.compare(password, passwordHash);
  }

  /**
   * Emissão de token JWT assinado criptograficamente.
   * Validade padrão: 7 dias.
   */
  static async generateAuthToken(
    userId: string,
    role: string = "user",
    tier: string = "free"
  ): Promise<string> {
    return new SignJWT({ uid: userId, role, tier })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);
  }

  /**
   * Validação de token JWT assinado. Retorna o payload decodificado ou null se inválido/expirado.
   */
  static async verifyAuthToken(token: string): Promise<TokenPayload | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as unknown as TokenPayload;
    } catch {
      return null;
    }
  }
}
