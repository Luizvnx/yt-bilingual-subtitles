import os
import json
from datetime import datetime
from app.config import DATA_DIR, DOWNLOAD_DIR, SUBTITLES_DIR

HISTORY_FILE = os.path.join(DATA_DIR, "history.json")

def _load_history() -> list[dict]:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Storage] Erro ao ler histórico: {e}")
        return []

def _save_history(items: list[dict]):
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Storage] Erro ao salvar histórico: {e}")

def get_all_videos() -> list[dict]:
    """Retorna todos os vídeos processados, ordenados pelo mais recente."""
    items = _load_history()
    # Filtra apenas itens que ainda possuem o arquivo de vídeo
    valid_items = []
    for item in items:
        valid_items.append(item)
    return sorted(valid_items, key=lambda x: x.get("created_at", ""), reverse=True)

def get_video_by_id(video_id: str) -> dict | None:
    """Busca um vídeo processado pelo seu ID."""
    items = _load_history()
    for item in items:
        if item.get("id") == video_id or item.get("video_id") == video_id:
            return item
    return None

def save_video_data(video_info: dict) -> dict:
    """Salva ou atualiza um vídeo no histórico."""
    items = _load_history()
    vid = video_info.get("id") or video_info.get("video_id")

    # Remove versão antiga se existir
    items = [it for it in items if (it.get("id") != vid and it.get("video_id") != vid)]

    if "created_at" not in video_info:
        video_info["created_at"] = datetime.now().isoformat()

    items.insert(0, video_info)
    _save_history(items)
    return video_info

def delete_video(video_id: str) -> bool:
    """Exclui um vídeo do histórico e remove arquivos associados."""
    items = _load_history()
    found = False
    new_items = []

    for it in items:
        if it.get("id") == video_id or it.get("video_id") == video_id:
            found = True
            # Tenta apagar arquivos
            video_filename = it.get("video_filename")
            if video_filename:
                vpath = os.path.join(DOWNLOAD_DIR, video_filename)
                if os.path.exists(vpath):
                    try:
                        os.remove(vpath)
                    except Exception:
                        pass
            # Remove legendas
            for sub_key in ["srt_bilingual", "vtt_bilingual", "srt_en", "vtt_en", "srt_pt", "vtt_pt"]:
                sub_path = it.get(sub_key)
                if sub_path and os.path.exists(sub_path):
                    try:
                        os.remove(sub_path)
                    except Exception:
                        pass
        else:
            new_items.append(it)

    if found:
        _save_history(new_items)
    return found
