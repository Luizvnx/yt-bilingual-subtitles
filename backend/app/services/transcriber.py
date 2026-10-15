import os
import whisper
import torch
from app.config import FFMPEG_PATH, WHISPER_DEFAULT_MODEL

# Cache de modelos carregados na memória
_LOADED_MODELS = {}

def get_whisper_model(model_name: str = None):
    """Carrega o modelo do Whisper sob demanda (lazy loading) e o reutiliza em cache."""
    name = model_name or WHISPER_DEFAULT_MODEL or "base"
    if name not in _LOADED_MODELS:
        print(f"[Whisper] Carregando modelo '{name}'...")
        _LOADED_MODELS[name] = whisper.load_model(name)
        print(f"[Whisper] Modelo '{name}' carregado com sucesso!")
    return _LOADED_MODELS[name]

def format_seconds_to_srt_time(seconds: float) -> str:
    """Converte segundos float para formato SRT: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"

def format_seconds_to_vtt_time(seconds: float) -> str:
    """Converte segundos float para formato VTT: HH:MM:SS.mmm"""
    return format_seconds_to_srt_time(seconds).replace(",", ".")

def format_seconds_to_display_time(seconds: float) -> str:
    """Converte segundos para formato simples de exibição: MM:SS"""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02}:{secs:02}"

def transcrever_audio(file_path: str, model_name: str = None) -> dict:
    """
    Transcreve um arquivo de áudio ou vídeo usando OpenAI Whisper.
    Retorna a língua detectada e uma lista detalhada de segmentos sincronizados.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Arquivo de mídia não encontrado: {file_path}")

    device_is_cuda = torch.cuda.is_available()
    model = get_whisper_model(model_name)

    # Transcrição (fp16=False se estiver rodando em CPU para evitar avisos)
    result = model.transcribe(
        file_path,
        fp16=device_is_cuda,
        verbose=False
    )

    detected_lang = result.get("language", "en")

    segments = []
    for idx, seg in enumerate(result.get("segments", []), start=1):
        start_sec = round(float(seg["start"]), 3)
        end_sec = round(float(seg["end"]), 3)
        clean_text = seg["text"].strip()

        if not clean_text:
            continue

        segments.append({
            "id": idx,
            "start": start_sec,
            "end": end_sec,
            "start_srt": format_seconds_to_srt_time(start_sec),
            "end_srt": format_seconds_to_srt_time(end_sec),
            "start_vtt": format_seconds_to_vtt_time(start_sec),
            "end_vtt": format_seconds_to_vtt_time(end_sec),
            "time_display": format_seconds_to_display_time(start_sec),
            "text": clean_text
        })

    # Compatibilidade com código antigo que esperava 'legendas'
    return {
        "detected_lang": detected_lang,
        "segments": segments,
        "legendas": segments
    }