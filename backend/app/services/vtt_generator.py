def generate_vtt_bilingual(legendas_pt, legendas_en, output_path: str) -> str:

    if len(legendas_pt) != len(legendas_en):
        raise ValueError("As listas de legendas PT e EN precisam ter o mesmo número de segmentos.")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        for pt, en in zip(legendas_pt, legendas_en):
            start = pt["start"].replace(",", ".")  # VTT exige ponto nos ms
            end = pt["end"].replace(",", ".")
            f.write(f"{start} --> {end}\n")
            f.write(pt["text"].replace("\n", " ").strip() + "\n")
            f.write(en["text"].replace("\n", " ").strip() + "\n\n")

    return output_path