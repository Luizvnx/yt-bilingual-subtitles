import os
import shutil
from dotenv import load_dotenv

# Carrega variáveis do arquivo .env (se existir)
load_dotenv()

# Diretórios principais
# backend/app/config.py -> BASE_DIR é backend, PROJECT_ROOT é a raiz do repositório
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR")
if not DOWNLOAD_DIR:
    DOWNLOAD_DIR = os.path.join(PROJECT_ROOT, "downloads")
elif not os.path.isabs(DOWNLOAD_DIR):
    DOWNLOAD_DIR = os.path.join(PROJECT_ROOT, DOWNLOAD_DIR)

SUBTITLES_DIR = os.path.join(PROJECT_ROOT, "subtitles")
DATA_DIR = os.path.join(PROJECT_ROOT, "data")

# Garante que as pastas essenciais existam
for d in [DOWNLOAD_DIR, SUBTITLES_DIR, DATA_DIR]:
    os.makedirs(d, exist_ok=True)

# FFmpeg
FFMPEG_PATH = os.getenv("FFMPEG_PATH")
if not FFMPEG_PATH or not os.path.exists(FFMPEG_PATH):
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        FFMPEG_PATH = system_ffmpeg

if FFMPEG_PATH and os.path.exists(FFMPEG_PATH):
    ffmpeg_dir = os.path.dirname(FFMPEG_PATH)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

# Modelo Whisper padrão
WHISPER_DEFAULT_MODEL = os.getenv("WHISPER_DEFAULT_MODEL", "base")
PORT = int(os.getenv("PORT", 5000))
SECRET_KEY = os.getenv("SECRET_KEY", "bilingual_subtitles_secret_key_2026")