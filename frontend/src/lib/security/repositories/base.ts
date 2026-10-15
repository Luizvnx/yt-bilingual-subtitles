import fs from "fs";
import path from "path";

/**
 * Repositório Base com Princípio de Isolamento Multi-Tenant.
 * Padrão de Projeto: Repository Pattern.
 * Garante que todas as operações sejam filtradas pelo proprietário (tenant_id / user_id),
 * eliminando vulnerabilidades de IDOR (Insecure Direct Object Reference).
 */
export abstract class BaseRepository<T extends { id: string }> {
  protected filepath: string;

  constructor(filename: string) {
    const dataDir = path.join(process.cwd(), "..", "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filepath = path.join(dataDir, filename);
  }

  protected readData(): T[] {
    if (!fs.existsSync(this.filepath)) {
      return [];
    }
    try {
      const raw = fs.readFileSync(this.filepath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  protected writeData(items: T[]): void {
    const tempPath = `${this.filepath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(items, null, 2), "utf-8");
    fs.renameSync(tempPath, this.filepath);
  }

  /**
   * Garante que o usuário autenticado só acesse recursos de sua titularidade.
   */
  public static enforceTenantScope(
    resourceUserId: string,
    authenticatedUserId: string
  ): void {
    if (
      !authenticatedUserId ||
      String(resourceUserId) !== String(authenticatedUserId)
    ) {
      throw new Error(
        "Acesso negado: você não tem permissão para acessar este recurso."
      );
    }
  }
}
