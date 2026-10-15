import os
from flask import Blueprint, request, jsonify, render_template, send_from_directory, current_app
from app.config import DOWNLOAD_DIR, SUBTITLES_DIR
from app.services.downloader import baixar_video, extract_video_id
from app.services.transcriber import transcrever_audio
from app.services.translator import traduzir_lote, traduzir_texto
from app.services.srt_generator import generate_srt
from app.services.vtt_generator import generate_vtt
from app.services.storage import save_video_data, get_all_videos, get_video_by_id, delete_video

subtitles_bp = Blueprint("subtitles", __name__)

@subtitles_bp.route("/process", methods=["POST"])
def process_video():
    """
    Endpoint principal para processar o vídeo do YouTube:
    1. Baixa o vídeo MP4 em alta qualidade
    2. Transcreve o áudio em inglês com IA (Whisper)
    3. Traduz sincronizadamente para português
    4. Gera arquivos VTT e SRT (bilíngue, apenas inglês e apenas português)
    5. Salva no histórico e retorna todos os dados para o player interativo
    """
    data = request.get_json(silent=True) or {}
    video_url = data.get("url", "").strip()
    model_name = data.get("model", "base")

    if not video_url:
        return jsonify({"error": "URL do vídeo é obrigatória."}), 400

    try:
        # 1. Download do vídeo MP4
        print(f"[Process] Iniciando download do vídeo: {video_url}")
        dl_result = baixar_video(video_url)
        video_path = dl_result["video_path"]
        video_filename = dl_result["filename"]
        video_id = dl_result["video_id"]
        metadata = dl_result["metadata"]
        print(f"[Process] Vídeo pronto: {video_path} (ID: {video_id})")

        # 2. Transcrição com Whisper
        print(f"[Process] Transcrevendo áudio com Whisper (modelo: {model_name})...")
        trans_result = transcrever_audio(video_path, model_name=model_name)
        detected_lang = trans_result.get("detected_lang", "en")
        raw_segments = trans_result.get("segments", [])
        print(f"[Process] Transcrição concluída! Idioma detectado: {detected_lang}, {len(raw_segments)} segmentos.")

        if not raw_segments:
            return jsonify({
                "error": "Nenhuma fala detectada no áudio deste vídeo.",
                "video_id": video_id,
                "video_url": f"/media/video/{video_filename}"
            }), 422

        # 3. Tradução em lote das legendas
        original_texts = [seg["text"] for seg in raw_segments]

        if detected_lang == "pt":
            # Original é português -> traduz para inglês
            translated_texts = traduzir_lote(original_texts, source="pt", target="en")
            enriched_segments = []
            for seg, trans in zip(raw_segments, translated_texts):
                enriched_segments.append({
                    **seg,
                    "text_pt": seg["text"],
                    "text_en": trans
                })
        else:
            # Original é inglês (ou outro) -> traduz para português
            translated_texts = traduzir_lote(original_texts, source=detected_lang, target="pt")
            enriched_segments = []
            for seg, trans in zip(raw_segments, translated_texts):
                enriched_segments.append({
                    **seg,
                    "text_en": seg["text"],
                    "text_pt": trans
                })

        # 4. Geração de arquivos de legendas (VTT e SRT)
        base_name = video_id
        srt_bilingual_file = os.path.join(SUBTITLES_DIR, f"{base_name}_bilingual.srt")
        vtt_bilingual_file = os.path.join(SUBTITLES_DIR, f"{base_name}_bilingual.vtt")
        srt_en_file = os.path.join(SUBTITLES_DIR, f"{base_name}_en.srt")
        vtt_en_file = os.path.join(SUBTITLES_DIR, f"{base_name}_en.vtt")
        srt_pt_file = os.path.join(SUBTITLES_DIR, f"{base_name}_pt.srt")
        vtt_pt_file = os.path.join(SUBTITLES_DIR, f"{base_name}_pt.vtt")

        generate_srt(enriched_segments, srt_bilingual_file, mode="bilingual")
        generate_vtt(enriched_segments, vtt_bilingual_file, mode="bilingual")
        generate_srt(enriched_segments, srt_en_file, mode="en")
        generate_vtt(enriched_segments, vtt_en_file, mode="en")
        generate_srt(enriched_segments, srt_pt_file, mode="pt")
        generate_vtt(enriched_segments, vtt_pt_file, mode="pt")

        # 5. Salvar dados no histórico
        video_payload = {
            "id": video_id,
            "video_id": video_id,
            "title": metadata.get("title", "Vídeo do YouTube"),
            "uploader": metadata.get("uploader", ""),
            "duration": metadata.get("duration", 0),
            "thumbnail": metadata.get("thumbnail", ""),
            "url": video_url,
            "detected_lang": detected_lang,
            "video_filename": video_filename,
            "video_url": f"/media/video/{video_filename}",
            "watch_url": f"/watch/{video_id}",
            "srt_bilingual_url": f"/media/subtitle/{base_name}_bilingual.srt",
            "vtt_bilingual_url": f"/media/subtitle/{base_name}_bilingual.vtt",
            "srt_en_url": f"/media/subtitle/{base_name}_en.srt",
            "vtt_en_url": f"/media/subtitle/{base_name}_en.vtt",
            "srt_pt_url": f"/media/subtitle/{base_name}_pt.srt",
            "vtt_pt_url": f"/media/subtitle/{base_name}_pt.vtt",
            "segments_count": len(enriched_segments),
            "segments": enriched_segments
        }

        save_video_data(video_payload)
        print(f"[Process] Processamento concluído com sucesso para vídeo: {video_id}")

        return jsonify({
            "success": True,
            "message": "Processamento concluído com sucesso!",
            "video": video_payload
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erro ao processar vídeo: {str(e)}"}), 500

@subtitles_bp.route("/history", methods=["GET"])
def history():
    """Retorna lista de vídeos processados anteriormente."""
    videos = get_all_videos()
    return jsonify({"success": True, "videos": videos})

@subtitles_bp.route("/video/<video_id>", methods=["GET"])
def get_video(video_id):
    """Retorna os dados detalhados e legendas de um vídeo específico."""
    video = get_video_by_id(video_id)
    if not video:
        return jsonify({"error": "Vídeo não encontrado."}), 404
    return jsonify({"success": True, "video": video})

@subtitles_bp.route("/video/<video_id>", methods=["DELETE"])
def remove_video(video_id):
    """Remove um vídeo do histórico e apaga seus arquivos."""
    ok = delete_video(video_id)
    if not ok:
        return jsonify({"error": "Vídeo não encontrado para exclusão."}), 404
    return jsonify({"success": True, "message": "Vídeo excluído com sucesso."})