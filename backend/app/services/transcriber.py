import whisper
import os

# (tiny, base, small, medium, large)
model = whisper.load_model("small")

def format_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02}:{minutes:02}:{secs:02}"

def transcrever_audio(file_path: str) -> dict:
    """
    Transcreve áudio usando Whisper e retorna dicionário com:
      - detected_lang: idioma detectado (ISO code, ex: 'pt', 'en')
      - legendas: lista de legendas com timestamps
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")

    result = model.transcribe(file_path)  # detecta idioma automaticamente

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
