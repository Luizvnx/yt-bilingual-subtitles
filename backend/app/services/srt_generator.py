import os

def generate_srt_bilingual(legendas_pt, legendas_en, output_path: str) -> str:
    """
    Gera um .srt com duas linhas por bloco: 1) PT  2) EN.
    Assumimos que legendas_pt e legendas_en têm o MESMO timing (mesmo número de segmentos).
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        for i, (pt, en) in enumerate(zip(legendas_pt, legendas_en), start=1):
            f.write(f"{i}\n")
            f.write(f"{pt['start']} --> {pt['end']}\n")
            f.write(pt["text"].replace("\n", " ").strip() + "\n")
            f.write(en["text"].replace("\n", " ").strip() + "\n\n")

    return output_path


def generate_srt(legendas, output_path: str) -> str:
    """
    Alternativa: gera um .srt com um idioma apenas (caso queira PT e EN separados).
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(legendas, start=1):
            f.write(f"{i}\n")
            f.write(f"{seg['start']} --> {seg['end']}\n")
            f.write(seg["text"].replace("\n", " ").strip() + "\n\n")

    return output_path
