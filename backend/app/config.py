from dotenv import load_dotenv
import os

load_dotenv()

DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR", "downloads")
FFMPEG_PATH = os.getenv("FFMPEG_PATH")