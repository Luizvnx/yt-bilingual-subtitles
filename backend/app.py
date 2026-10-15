import os
import sys

# Garante que o diretório backend esteja no path de execução
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from app import create_app
from app.config import PORT

app = create_app()

if __name__ == "__main__":
    print(f"[Server] YT Bilingual Subtitles running at http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=True)