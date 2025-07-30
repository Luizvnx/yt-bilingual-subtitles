def traduzir_texto(text: str, target_lang: str = "en") -> str:
    """
    Traduz um texto para o idioma alvo.
    TODO: integrar com API (Google, DeepL, etc.)
    """
    return f"[{target_lang}] {text}"
