import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookieOnResponse } from "@/lib/security";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    message: "Sessão encerrada com sucesso.",
  });
  return clearAuthCookieOnResponse(response, request);
}
