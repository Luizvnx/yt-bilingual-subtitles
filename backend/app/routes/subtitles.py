from flask import Blueprint, request, jsonify
from app.services.downloader import baixar_audio

subtitles_bp = Blueprint("subtitles", __name__)

@subtitles_bp.route("/download", methods=["POST"])
def download():
    data = request.get_json()
    video_url = data.get("url")

    if not video_url:
        return jsonify({"error": "URL do vídeo é obrigatória"}), 400

    try:
        output_file = baixar_audio(video_url)
        return jsonify({"message": "Download concluído", "file": output_file})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
