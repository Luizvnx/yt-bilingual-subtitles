import os

def generate_srt(segments: list[dict], output_path: str, mode: str = "bilingual") -> str:
    """
    Gera um arquivo de legenda no formato SRT padrão.
    modes disponíveis:
      - 'bilingual': 1ª linha em PT, 2ª linha em EN
      - 'en': apenas EN
      - 'pt': apenas PT
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(segments, start=1):
            f.write(f"{i}\n")
            f.write(f"{seg['start_srt']} --> {seg['end_srt']}\n")

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
def generate_srt_bilingual(legendas_pt, legendas_en, output_path: str) -> str:
    segments = []
    for pt, en in zip(legendas_pt, legendas_en):
        segments.append({
            "start_srt": pt.get("start_srt", pt.get("start", "")),
            "end_srt": pt.get("end_srt", pt.get("end", "")),
            "text_pt": pt.get("text", ""),
            "text_en": en.get("text", "")
        })
    return generate_srt(segments, output_path, mode="bilingual")
