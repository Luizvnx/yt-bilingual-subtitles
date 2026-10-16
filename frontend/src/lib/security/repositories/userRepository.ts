import crypto from "crypto";
import { BaseRepository } from "./base";
import { CryptoService } from "../crypto";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  role: "user" | "admin";
  tier: "free" | "pro";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<UserRecord, "passwordHash">;

export class UserRepository extends BaseRepository<UserRecord> {
  constructor() {
    super("users_saas.json");
  }

  private sanitize(user: UserRecord): SafeUser {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  public async findByEmail(
    email: string,
    includePassword: boolean = false
  ): Promise<SafeUser | UserRecord | null> {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.readData();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) return null;
    return includePassword ? user : this.sanitize(user);
  }

  public async findById(
    userId: string,
    includePassword: boolean = false
  ): Promise<SafeUser | UserRecord | null> {
    const users = this.readData();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    return includePassword ? user : this.sanitize(user);
  }

  public async createUser(
    name: string,
    email: string,
    rawPassword: string,
    role: "user" | "admin" = "user",
    tier: "free" | "pro" = "free",
    avatar?: string
  ): Promise<SafeUser> {
    const cleanEmail = email.trim().toLowerCase();

    const existing = await this.findByEmail(cleanEmail);
    if (existing) {
      throw new Error("Este e-mail já está cadastrado no sistema.");
    }

    const passwordHash = await CryptoService.hashPassword(rawPassword);
    const nowIso = new Date().toISOString();

    const cleanName = name.replace(/<[^>]*>?/gm, "").trim() || "Usuário";

    const newUser: UserRecord = {
      id: `usr_${crypto.randomBytes(6).toString("hex")}`,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      avatar: avatar?.trim() || undefined,
      role,
      tier,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const users = this.readData();
    users.push(newUser);
    this.writeData(users);

    return this.sanitize(newUser);
  }

  public async updateProfile(
    userId: string,
    updates: { name?: string; avatar?: string }
  ): Promise<SafeUser | null> {
    const users = this.readData();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;

    if (updates.name && updates.name.trim()) {
      users[idx].name = updates.name.trim();
    }
    if (updates.avatar !== undefined) {
      users[idx].avatar = updates.avatar.trim() || undefined;
    }
    users[idx].updatedAt = new Date().toISOString();
    this.writeData(users);
    return this.sanitize(users[idx]);
  }

  public async verifyCredentials(
    email: string,
    rawPassword: string
  ): Promise<SafeUser | null> {
    const user = (await this.findByEmail(email, true)) as UserRecord | null;
    if (!user || !user.isActive) return null;

    const valid = await CryptoService.verifyPassword(
      rawPassword,
      user.passwordHash
    );
    if (!valid) return null;

    return this.sanitize(user);
  }

  public async updateTier(
    userId: string,
    newTier: "free" | "pro"
  ): Promise<boolean> {
    const users = this.readData();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return false;

    users[idx].tier = newTier;
    users[idx].updatedAt = new Date().toISOString();
    this.writeData(users);
    return true;
  }
}

export const userRepository = new UserRepository();
