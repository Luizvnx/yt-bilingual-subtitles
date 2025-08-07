from deep_translator import GoogleTranslator



def traduzir_texto(text: str, source: str = "auto", target: str = "en") -> str:
    """
    Traduz texto usando Google Translator (via deep-translator).
    """
    return GoogleTranslator(source=source, target=target).translate(text)
