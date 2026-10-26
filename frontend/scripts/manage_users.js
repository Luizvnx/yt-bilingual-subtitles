#!/usr/bin/env node

/**
 * Script de Gerenciamento de Usuários e Criação de Administradores
 * 
 * Uso:
 *   node scripts/manage_users.js list
 *   node scripts/manage_users.js create-admin <nome> <email> <senha>
 *   node scripts/manage_users.js promote <email>
 *   node scripts/manage_users.js set-tier <email> <free|pro>
 *   node scripts/manage_users.js reset-password <email> <nova-senha>
 *   node scripts/manage_users.js delete <email>
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let bcryptInstance = null;
function getBcrypt() {
  if (bcryptInstance) return bcryptInstance;
  const candidates = [
    "./bcrypt.js",
    path.join(__dirname, "bcrypt.js"),
    path.join(process.cwd(), "frontend", "scripts", "bcrypt.js"),
    path.join(process.cwd(), "scripts", "bcrypt.js"),
    "/app/scripts/bcrypt.js",
    "bcryptjs"
  ];
  for (const c of candidates) {
    try {
      bcryptInstance = require(c);
      if (bcryptInstance) return bcryptInstance;
    } catch {}
  }
  return null;
}

// Localiza o arquivo de dados (tanto dentro do Docker quanto no host)
const candidatePaths = [
  "/app/data/users_saas.json",
  path.join(process.cwd(), "data", "users_saas.json"),
  path.join(process.cwd(), "..", "data", "users_saas.json"),
  path.join(__dirname, "..", "..", "data", "users_saas.json"),
  path.join(__dirname, "..", "data", "users_saas.json"),
];

let dataFilePath = candidatePaths.find((p) => fs.existsSync(p));

if (!dataFilePath) {
  // Se não existir, define o caminho padrão no host ou container
  dataFilePath = fs.existsSync("/app/data")
    ? "/app/data/users_saas.json"
    : path.join(process.cwd(), "data", "users_saas.json");

  const dir = path.dirname(dataFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataFilePath, "[]", "utf-8");
}

function loadUsers() {
  try {
    const raw = fs.readFileSync(dataFilePath, "utf-8");
    return JSON.parse(raw) || [];
  } catch (err) {
    console.error("❌ Erro ao ler banco de dados de usuários:", err.message);
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("❌ Erro ao salvar usuários:", err.message);
    process.exit(1);
  }
}

async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(`
🛡️  GERENCIADOR DE USUÁRIOS & ADMINS - YT BILINGUAL SUBTITLES
==============================================================
Arquivo do banco: ${dataFilePath}

Comandos disponíveis:
  node manage_users.js list
      Lista todos os usuários, papéis (role) e planos (tier).

  node manage_users.js create-admin "<nome>" <email> <senha>
      Cria uma nova conta com privilégios de Administrador (Role: admin, Tier: pro).

  node manage_users.js promote <email>
      Promove uma conta existente para Administrador (Role: admin, Tier: pro).

  node manage_users.js demote <email>
      Remove privilégios de Administrador, voltando o papel para Usuário (Role: user).

  node manage_users.js set-role <email> <user|admin>
      Altera diretamente o papel do usuário para 'user' ou 'admin'.

  node manage_users.js set-tier <email> <free|pro>
      Altera o plano de um usuário para 'free' ou 'pro'.

  node manage_users.js reset-password <email> <nova-senha>
      Altera a senha de um usuário criptografando via bcrypt.

  node manage_users.js delete <email>
      Remove permanentemente a conta de um usuário.
`);
    process.exit(0);
  }

  const users = loadUsers();

  switch (command) {
    case "list": {
      console.log(`\n📋 USUÁRIOS CADASTRADOS (${users.length} contas):\n`);
      if (users.length === 0) {
        console.log("Nenhum usuário cadastrado ainda.");
        return;
      }

      console.table(
        users.map((u) => ({
          ID: u.id,
          Nome: u.name,
          Email: u.email,
          Role: u.role === "admin" ? "👑 ADMIN" : "👤 USER",
          Tier: u.tier === "pro" ? "💎 PRO" : "ESTUDANTE",
          Ativo: u.isActive ? "✅ Sim" : "❌ Não",
          CriadoEm: u.createdAt ? u.createdAt.split("T")[0] : "-",
        }))
      );
      break;
    }

    case "create-admin": {
      const [name, email, password] = args;
      if (!name || !email || !password) {
        console.error("❌ Uso: node manage_users.js create-admin \"<Nome>\" <email> <senha>");
        process.exit(1);
      }

      if (password.length < 8) {
        console.error("❌ A senha deve ter no mínimo 8 caracteres.");
        process.exit(1);
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        console.error(`❌ O email '${cleanEmail}' já existe (ID: ${existing.id}). Use o comando 'promote' para torná-lo admin.`);
        process.exit(1);
      }

      const bcrypt = getBcrypt();
      if (!bcrypt) {
        console.error("❌ Módulo de criptografia (bcrypt) não foi encontrado.");
        process.exit(1);
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const nowIso = new Date().toISOString();

      const newAdmin = {
        id: `usr_${crypto.randomBytes(6).toString("hex")}`,
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: "admin",
        tier: "pro",
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      users.push(newAdmin);
      saveUsers(users);

      console.log(`
✅ Conta Administrador criada com sucesso!
   ID:    ${newAdmin.id}
   Nome:  ${newAdmin.name}
   Email: ${newAdmin.email}
   Role:  👑 admin
   Tier:  💎 pro
`);
      break;
    }

    case "promote": {
      const [email] = args;
      if (!email) {
        console.error("❌ Uso: node manage_users.js promote <email>");
        process.exit(1);
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        console.error(`❌ Usuário com email '${cleanEmail}' não foi encontrado.`);
        process.exit(1);
      }

      user.role = "admin";
      user.tier = "pro";
      user.updatedAt = new Date().toISOString();
      saveUsers(users);

      console.log(`✅ Usuário '${user.name}' (${cleanEmail}) agora é 👑 ADMIN e 💎 PRO!`);
      break;
    }

    case "demote": {
      const [email] = args;
      if (!email) {
        console.error("❌ Uso: node manage_users.js demote <email>");
        process.exit(1);
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        console.error(`❌ Usuário com email '${cleanEmail}' não foi encontrado.`);
        process.exit(1);
      }

      user.role = "user";
      user.updatedAt = new Date().toISOString();
      saveUsers(users);

      console.log(`✅ Privilégios de Administrador removidos de '${user.name}' (${cleanEmail}). Papel atual: 👤 USER.`);
      break;
    }

    case "set-role": {
      const [email, role] = args;
      if (!email || !["user", "admin"].includes(role)) {
        console.error("❌ Uso: node manage_users.js set-role <email> <user|admin>");
        process.exit(1);
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        console.error(`❌ Usuário '${cleanEmail}' não encontrado.`);
        process.exit(1);
      }

      user.role = role;
      user.updatedAt = new Date().toISOString();
      saveUsers(users);

      const label = role === "admin" ? "👑 ADMIN" : "👤 USER";
      console.log(`✅ Papel do usuário '${user.name}' (${cleanEmail}) alterado para: ${label}`);
      break;
    }

    case "set-tier": {
      const [email, tier] = args;
      if (!email || !["free", "pro"].includes(tier)) {
        console.error("❌ Uso: node manage_users.js set-tier <email> <free|pro>");
        process.exit(1);
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        console.error(`❌ Usuário '${cleanEmail}' não encontrado.`);
        process.exit(1);
      }

      user.tier = tier;
      user.updatedAt = new Date().toISOString();
      saveUsers(users);

      console.log(`✅ Plano do usuário '${user.name}' (${cleanEmail}) atualizado para: ${tier.toUpperCase()}`);
      break;
    }

    case "reset-password": {
      const [email, newPassword] = args;
      if (!email || !newPassword) {
        console.error("❌ Uso: node manage_users.js reset-password <email> <nova-senha>");
        process.exit(1);
      }

      if (newPassword.length < 8) {
        console.error("❌ A senha deve ter no mínimo 8 caracteres.");
        process.exit(1);
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        console.error(`❌ Usuário '${cleanEmail}' não encontrado.`);
        process.exit(1);
      }

      const bcrypt = getBcrypt();
      if (!bcrypt) {
        console.error("❌ Módulo de criptografia (bcrypt) não foi encontrado.");
        process.exit(1);
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      user.updatedAt = new Date().toISOString();
      saveUsers(users);

      console.log(`✅ Senha do usuário '${user.name}' (${cleanEmail}) redefinida com sucesso!`);
      break;
    }

    case "delete": {
      const [email] = args;
      if (!email) {
        console.error("❌ Uso: node manage_users.js delete <email>");
        process.exit(1);
      }

      const cleanEmail = email.trim().toLowerCase();
      const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (idx === -1) {
        console.error(`❌ Usuário '${cleanEmail}' não encontrado.`);
        process.exit(1);
      }

      const [removed] = users.splice(idx, 1);
      saveUsers(users);
      console.log(`✅ Usuário '${removed.name}' (${cleanEmail}) removido com sucesso.`);
      break;
    }

    default:
      console.error(`❌ Comando desconhecido: '${command}'. Use 'help' para ver os comandos.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
