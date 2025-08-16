from flask import Blueprint, request, jsonify
from app.services.downloader import baixar_audio
from app.services.transcriber import transcrever_audio
from app.services.translator import traduzir_texto
from app.services.srt_generator import generate_srt_bilingual
import os
from app.config import DOWNLOAD_DIR


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

        # 2) transcrever
        result = transcrever_audio(audio_path)
        detected_lang = result["detected_lang"]
        legendas = result["legendas"]

        legendas_pt, legendas_en = [], []
        for seg in legendas:
            texto = seg["text"]
            if detected_lang == "pt":
                legendas_pt.append({**seg})
                legendas_en.append({**seg, "text": traduzir_texto(texto, "pt", "en")})
            else:
                legendas_en.append({**seg})
                legendas_pt.append({**seg, "text": traduzir_texto(texto, "en", "pt")})

        # 3) gerar SRT
        base = os.path.splitext(os.path.basename(audio_path))[0]
        srt_bilingue_path = os.path.join(DOWNLOAD_DIR, f"{base}_bilingue.srt")
        generate_srt_bilingual(legendas_pt, legendas_en, srt_bilingue_path)

        return jsonify({
            "message": "Processamento concluído",
            "detected_lang": detected_lang,
            "legendas_pt": legendas_pt,
            "legendas_en": legendas_en,
            "srt_bilingue": srt_bilingue_path
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500