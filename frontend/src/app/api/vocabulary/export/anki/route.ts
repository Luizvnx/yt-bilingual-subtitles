import { NextResponse } from "next/server";
import {
  getAuthTokenFromCookies,
  CryptoService,
  vocabularyRepository,
} from "@/lib/security";

export async function GET() {
  const token = await getAuthTokenFromCookies();
  if (!token) {
    return NextResponse.json(
      { error: "Faça login para exportar seu vocabulário." },
      { status: 401 }
    );
  }

  const payload = await CryptoService.verifyAuthToken(token);
  if (!payload?.uid) {
    return NextResponse.json(
      { error: "Sessão inválida ou expirada." },
      { status: 401 }
    );
  }

  const words = vocabularyRepository.getByUserId(payload.uid);
  if (!words || words.length === 0) {
    return NextResponse.json(
      { error: "Você ainda não possui palavras salvas para exportar." },
      { status: 400 }
    );
  }

  try {
    // Carregamento dinâmico compatível com Turbopack / Next.js
    const nodeRequire = eval("require");
    const fs = nodeRequire("fs");
    const path = nodeRequire("path");
    const initSqlJs = nodeRequire("sql.js");
    const AnkiExport = nodeRequire("anki-apkg-export").default;

    const ext = "wasm";
    const wasmFilename = `sql-${ext}.${ext}`;

    const candidates = [
      path.join(process.cwd(), "frontend", "node_modules", "sql.js", "dist", wasmFilename),
      path.join(process.cwd(), "node_modules", "sql.js", "dist", wasmFilename),
    ];

    const validPath = candidates.find((p) => fs.existsSync(p));
    if (!validPath) {
      throw new Error("Arquivo sql-wasm não encontrado no servidor.");
    }

    const wasmBinary = fs.readFileSync(validPath);
    const SQL = await initSqlJs({ wasmBinary });
    const apkg = new AnkiExport("Inglês - YT Bilingual Subtitles", { sql: SQL });

    for (const item of words) {
      const frontHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 24px; background: #09090b; color: #ffffff; border-radius: 16px;">
  <div style="font-size: 30px; font-weight: 800; color: #818cf8; margin-bottom: 6px; letter-spacing: -0.5px;">
    ${item.word}
  </div>
  ${
    item.phonetics
      ? `<div style="font-family: ui-monospace, monospace; font-size: 14px; color: #a1a1aa; margin-bottom: 12px;">${item.phonetics}</div>`
      : ""
  }
  ${
    item.contextSentence
      ? `<div style="margin-top: 14px; padding: 12px 16px; background: #18181b; border: 1px solid #27272a; border-radius: 12px; color: #e4e4e7; font-size: 15px; font-style: italic; line-height: 1.5;">
          "${item.contextSentence}"
        </div>`
      : ""
  }
  <div style="margin-top: 16px; font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">
    YT Bilingual Subtitles
  </div>
</div>
      `.trim();

      const backHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 24px; background: #09090b; color: #ffffff; border-radius: 16px;">
  <div style="font-size: 24px; font-weight: 700; color: #34d399; margin-bottom: 8px;">
    ${item.translationPt}
  </div>
  ${
    item.partOfSpeech
      ? `<div style="display: inline-block; padding: 2px 8px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 6px; font-size: 11px; font-weight: 600; color: #a5b4fc; text-transform: uppercase;">
          ${item.partOfSpeech}
        </div>`
      : ""
  }
</div>
      `.trim();

      apkg.addCard(frontHtml, backHtml);
    }

    const zipBuffer = await apkg.save();

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition":
          'attachment; filename="meu_vocabulario_bilingual_subtitles.apkg"',
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (err: any) {
    console.error("[Anki Export Error]:", err);
    return NextResponse.json(
      { error: "Falha ao gerar o pacote do Anki." },
      { status: 500 }
    );
  }
}
