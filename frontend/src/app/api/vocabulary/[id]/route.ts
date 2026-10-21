import { NextRequest, NextResponse } from "next/server";
import {
  getAuthTokenFromRequest,
  CryptoService,
  vocabularyRepository,
} from "@/lib/security";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = await getAuthTokenFromRequest(request);

  if (!token) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const payload = await CryptoService.verifyAuthToken(token);
  if (!payload?.uid) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  try {
    const ok = vocabularyRepository.deleteWord(id, payload.uid);
    if (!ok) {
      return NextResponse.json(
        { error: "Palavra não encontrada para exclusão." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Palavra removida do vocabulário.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Acesso negado." },
      { status: 403 }
    );
  }
}
