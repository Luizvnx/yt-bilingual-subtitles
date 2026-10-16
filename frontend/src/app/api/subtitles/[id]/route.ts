import { NextRequest, NextResponse } from "next/server";
import {
  videoRepository,
  getAuthTokenFromCookies,
  CryptoService,
} from "@/lib/security";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = videoRepository.getById(id);

  if (!video) {
    return NextResponse.json(
      { error: "Vídeo não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    video,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = await getAuthTokenFromCookies();
  let userId: string | undefined = undefined;
  if (token) {
    const payload = await CryptoService.verifyAuthToken(token);
    if (payload?.uid) {
      userId = payload.uid;
    }
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Você precisa estar conectado para remover este vídeo." },
      { status: 401 }
    );
  }

  try {
    const ok = videoRepository.deleteById(id, userId);
    if (!ok) {
      return NextResponse.json(
        { error: "Vídeo não encontrado para exclusão." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Vídeo removido com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Permissão negada." },
      { status: 403 }
    );
  }
}
