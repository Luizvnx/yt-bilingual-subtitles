import subprocess
import os
from app.config import DOWNLOAD_DIR, FFMPEG_PATH

def baixar_audio(link: str) -> str:
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    output_template = os.path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s")

    cmd = [
        "yt-dlp",
        "-x", "--audio-format", "mp3",
        f"--ffmpeg-location={FFMPEG_PATH}",
        "-o", output_template,
        "--no-playlist",
        "--restrict-filenames",
        "--print", "after_move:filepath", 
        
        link
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise Exception(f"Erro no yt-dlp: {result.stderr}")

    file_path = result.stdout.strip()

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")

    return file_path