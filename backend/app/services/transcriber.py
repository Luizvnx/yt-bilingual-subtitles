import whisper
import os
import subprocess
from app.config import FFMPEG_PATH


os.environ["PATH"] += os.pathsep + os.path.dirname(FFMPEG_PATH)

# (tiny, base, small, medium, large)
model = whisper.load_model("small")

def format_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02}:{minutes:02}:{secs:02}"

def transcrever_audio(file_path: str) -> dict:

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")

    # Testa ffmpeg
    try:
        subprocess.run([FFMPEG_PATH, "-version"], check=True, capture_output=True)
    except Exception as e:
        raise RuntimeError(f"Erro ao executar ffmpeg: {e}")

    result = model.transcribe(file_path)

    detected_lang = result.get("language", "unknown")
    legendas = []
    for seg in result["segments"]:
        legendas.append({
            "start": format_time(seg["start"]),
            "end": format_time(seg["end"]),
            "text": seg["text"].strip()
        })

    return {
        "detected_lang": detected_lang,
        "legendas": legendas
    }