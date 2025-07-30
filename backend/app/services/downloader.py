import subprocess
import os

DOWNLOAD_DIR = "downloads"
FFMPEG_PATH = r"D:\Download\ffmpeg-2025-07-28-git-dc8e753f32-full_build\bin"

def baixar_audio(link: str) -> str:
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    output_path = os.path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s")

    cmd = [
        "yt-dlp",
        "-x", "--audio-format", "mp3",
        f"--ffmpeg-location={FFMPEG_PATH}",
        "-o", output_path,
        "--no-playlist",
        link
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, check=True)

    if result.returncode != 0:
        raise Exception(f"Erro no yt-dlp: {result.stderr}")

    return output_path
