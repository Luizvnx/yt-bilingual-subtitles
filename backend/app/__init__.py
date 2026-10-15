import os
from flask import Flask, render_template, send_from_directory, abort
from flask_cors import CORS
from app.config import DOWNLOAD_DIR, SUBTITLES_DIR, SECRET_KEY
from app.services.storage import get_video_by_id

def create_app():
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config["SECRET_KEY"] = SECRET_KEY
    CORS(app)

    # Rota raiz (Interface principal)
    @app.route("/")
    def index():
        return render_template("index.html")

    # Rota direta para assistir um vídeo já processado: /watch/<video_id>
    @app.route("/watch/<video_id>")
    def watch(video_id):
        video_data = get_video_by_id(video_id)
        return render_template("index.html", initial_video_id=video_id, initial_video=video_data)

    # Rota para servir os arquivos de vídeo baixados (com suporte a streaming HTTP 206)
    @app.route("/media/video/<path:filename>")
    def serve_video(filename):
        return send_from_directory(DOWNLOAD_DIR, filename, conditional=True)

    # Rota para servir as legendas (VTT e SRT)
    @app.route("/media/subtitle/<path:filename>")
    def serve_subtitle(filename):
        # Procura em subtitles primeiro, depois em downloads
        if os.path.exists(os.path.join(SUBTITLES_DIR, filename)):
            return send_from_directory(SUBTITLES_DIR, filename, mimetype="text/vtt" if filename.endswith(".vtt") else "text/plain")
        if os.path.exists(os.path.join(DOWNLOAD_DIR, filename)):
            return send_from_directory(DOWNLOAD_DIR, filename, mimetype="text/vtt" if filename.endswith(".vtt") else "text/plain")
        abort(404)

    # Registra Blueprints
    from app.routes.subtitles import subtitles_bp
    app.register_blueprint(subtitles_bp, url_prefix="/subtitles")
    app.register_blueprint(subtitles_bp, name="api", url_prefix="/api")

    from app.routes.helloworld import helloworld_bp
    app.register_blueprint(helloworld_bp, url_prefix="/hello")

    return app
