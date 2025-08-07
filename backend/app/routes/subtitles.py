from flask import Blueprint, request, jsonify
from app.services.downloader import baixar_audio
from app.services.transcriber import transcrever_audio
from app.services.translator import traduzir_texto


subtitles_bp = Blueprint("subtitles", __name__)

@subtitles_bp.route("/download", methods=["POST"])
def download():
    data = request.get_json()
    video_url = data.get("url")

    if not video_url:
        return jsonify({"error": "Missing Video URL"}), 400

    try:
        output_file = baixar_audio(video_url)
        return jsonify({"message": "Download completed", "file": output_file})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@subtitles_bp.route("/process", methods=["POST"])
def process_video():
    data = request.get_json()
    video_url = data.get("url")

    if not video_url:
        return jsonify({"error": "URL do vídeo é obrigatória"}), 400

    try:
        audio_path = baixar_audio(video_url)

        result = transcrever_audio(audio_path)
        detected_lang = result["detected_lang"]
        legendas = result["legendas"]

        legendas_pt = []
        legendas_en = []

        for seg in legendas:
            texto = seg["text"]

            if detected_lang == "pt":
                legendas_pt.append({**seg, "text": texto})
                legendas_en.append({**seg, "text": traduzir_texto(texto, source="pt", target="en")})
            else:
                legendas_en.append({**seg, "text": texto})
                legendas_pt.append({**seg, "text": traduzir_texto(texto, source="en", target="pt")})

        return jsonify({
            "message": "Processamento concluído",
            "detected_lang": detected_lang,
            "legendas_pt": legendas_pt,
            "legendas_en": legendas_en
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500