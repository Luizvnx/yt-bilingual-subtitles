import os
from ..utils import format_time_srt

def salvar_srt(legendas, caminho_arquivo):
    """
    Salva uma lista de legendas no formato SRT.
    """
    with open(caminho_arquivo, "w", encoding="utf-8") as f:
        for i, seg in enumerate(legendas, start=1):
            f.write(f"{i}\n")
            f.write(f"{format_time_srt(seg['start_seconds'])} --> {format_time_srt(seg['end_seconds'])}\n")
            f.write(f"{seg['text']}\n\n")
