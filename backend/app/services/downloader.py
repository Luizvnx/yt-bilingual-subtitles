import os
import re
import yt_dlp
from app.config import DOWNLOAD_DIR, FFMPEG_PATH

def extract_video_id(url: str) -> str:
    """Extrai o ID do vídeo a partir de URLs do YouTube ou retorna um hash seguro."""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/|shorts\/|youtu.be\/)([0-9A-Za-z_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    # Se não encontrar ID de 11 caracteres, cria um nome seguro
    clean = re.sub(r'[^a-zA-Z0-9_-]', '_', url)
    return clean[:20]

def baixar_video(link: str) -> dict:
    """
    Baixa o vídeo do YouTube em formato MP4 (com áudio integrado)
    e retorna os metadados do vídeo e o caminho do arquivo local.
    """
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    video_id = extract_video_id(link)
    expected_file = os.path.join(DOWNLOAD_DIR, f"{video_id}.mp4")

    ydl_opts_meta = {
        'quiet': True,
        'skip_download': True,
        'no_warnings': True,
    }

    metadata = {
        "video_id": video_id,
        "title": "Vídeo do YouTube",
        "duration": 0,
        "thumbnail": "",
        "uploader": "",
        "url": link
    }

    # 1. Obter metadados
    try:
        with yt_dlp.YoutubeDL(ydl_opts_meta) as ydl:
            info = ydl.extract_info(link, download=False)
            if info:
                vid = info.get("id") or video_id
                metadata["video_id"] = vid
                metadata["title"] = info.get("title", metadata["title"])
                metadata["duration"] = info.get("duration", 0)
                metadata["thumbnail"] = info.get("thumbnail", "")
                metadata["uploader"] = info.get("uploader", "")
                expected_file = os.path.join(DOWNLOAD_DIR, f"{vid}.mp4")
    except Exception as e:
        print(f"[Downloader] Aviso ao extrair metadados prévios: {e}")

    # 2. Se o arquivo já existir localmente, reusa
    if os.path.exists(expected_file) and os.path.getsize(expected_file) > 1000:
        return {
            "video_path": expected_file,
            "filename": os.path.basename(expected_file),
            "video_id": metadata["video_id"],
            "metadata": metadata,
            "cached": True
        }

    # 3. Faz o download do MP4 (vídeo + áudio)
    ydl_opts = {
        'format': 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': os.path.join(DOWNLOAD_DIR, f"{metadata['video_id']}.%(ext)s"),
        'merge_output_format': 'mp4',
        'quiet': True,
        'no_warnings': True,
    }
    if FFMPEG_PATH:
        ydl_opts['ffmpeg_location'] = FFMPEG_PATH

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(link, download=True)
        if info:
            metadata["title"] = info.get("title", metadata["title"])
            metadata["duration"] = info.get("duration", metadata["duration"])
            metadata["thumbnail"] = info.get("thumbnail", metadata["thumbnail"])
            metadata["uploader"] = info.get("uploader", metadata["uploader"])

    # Se o yt-dlp salvou com extensão mp4
    target_mp4 = os.path.join(DOWNLOAD_DIR, f"{metadata['video_id']}.mp4")
    if not os.path.exists(target_mp4):
        # Procura por qualquer arquivo com o ID
        for f in os.listdir(DOWNLOAD_DIR):
            if f.startswith(metadata['video_id']):
                target_mp4 = os.path.join(DOWNLOAD_DIR, f)
                break

    if not os.path.exists(target_mp4):
        raise FileNotFoundError(f"Arquivo de vídeo não encontrado após download: {target_mp4}")

    return {
        "video_path": target_mp4,
        "filename": os.path.basename(target_mp4),
        "video_id": metadata["video_id"],
        "metadata": metadata,
        "cached": False
    }

# Função de compatibilidade caso algo ainda chame baixar_audio
def baixar_audio(link: str) -> str:
    res = baixar_video(link)
    return res["video_path"]