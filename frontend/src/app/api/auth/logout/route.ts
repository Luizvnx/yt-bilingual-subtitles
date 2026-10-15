import { NextResponse } from "next/server";
import { clearAuthCookieOnResponse } from "@/lib/security";

export async function POST() {
  const response = NextResponse.json({
    message: "Sessão encerrada com sucesso.",
  });
  return clearAuthCookieOnResponse(response);
}
