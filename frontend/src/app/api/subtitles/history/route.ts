import { NextResponse } from "next/server";
import { videoRepository } from "@/lib/security";

export async function GET() {
  const videos = videoRepository.getAll();
  return NextResponse.json({
    success: true,
    videos,
  });
}
