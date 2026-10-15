import os

def generate_vtt(segments: list[dict], output_path: str, mode: str = "bilingual") -> str:
    """
    Gera um arquivo de legenda no formato WebVTT padrão para players de vídeo HTML5.
    modes disponíveis:
      - 'bilingual': 1ª linha em PT, 2ª linha em EN
      - 'en': apenas EN
      - 'pt': apenas PT
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("WEBVTT - Bilingual Subtitles\n\n")

        for i, seg in enumerate(segments, start=1):
            start = seg.get("start_vtt") or seg.get("start_srt", "").replace(",", ".")
            end = seg.get("end_vtt") or seg.get("end_srt", "").replace(",", ".")

            f.write(f"{i}\n")
            f.write(f"{start} --> {end}\n")

            text_en = seg.get("text_en", seg.get("text", "")).strip().replace("\n", " ")
            text_pt = seg.get("text_pt", "").strip().replace("\n", " ")

            if mode == "bilingual":
                f.write(f"{text_pt}\n")
                f.write(f"{text_en}\n\n")
            elif mode == "en":
                f.write(f"{text_en}\n\n")
            elif mode == "pt":
                f.write(f"{text_pt}\n\n")

    return output_path

# Compatibilidade com código legado
def generate_vtt_bilingual(legendas_pt, legendas_en, output_path: str) -> str:
    segments = []
    for pt, en in zip(legendas_pt, legendas_en):
        segments.append({
            "start_vtt": pt.get("start_vtt", pt.get("start", "").replace(",", ".")),
            "end_vtt": pt.get("end_vtt", pt.get("end", "").replace(",", ".")),
            "text_pt": pt.get("text", ""),
            "text_en": en.get("text", "")
        })
    return generate_vtt(segments, output_path, mode="bilingual")