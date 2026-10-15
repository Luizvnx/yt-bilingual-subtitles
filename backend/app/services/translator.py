import json
import urllib.parse
import urllib.request
import re
from deep_translator import MyMemoryTranslator

_TRANSLATION_CACHE = {}

def _translate_google_raw(text: str, source: str = "en", target: str = "pt") -> str:
    """Traduz texto diretamente usando a API rápida e resiliente do Google."""
    # Normaliza códigos de idioma
    sl = "auto" if source in ["auto", "unknown"] else source[:2]
    tl = target[:2]

    url = (
        f"https://translate.googleapis.com/translate_a/single?"
        f"client=dict-chrome-ex&sl={sl}&tl={tl}&dt=t&q="
        + urllib.parse.quote(text)
    )
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*"
    }

    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        parts = []
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
            for part in data[0]:
                if part and len(part) > 0 and part[0]:
                    parts.append(part[0])
        return "".join(parts).strip()

def _translate_mymemory(text: str, source: str = "en", target: str = "pt") -> str:
    """Fallback usando MyMemoryTranslator."""
    src = "en-US" if source.startswith("en") else source
    tgt = "pt-BR" if target.startswith("pt") else target
    translator = MyMemoryTranslator(source=src, target=tgt)
    return translator.translate(text)

def traduzir_texto(text: str, source: str = "auto", target: str = "pt") -> str:
    """
    Traduz um texto individual com cache e fallback resiliente.
    """
    clean_text = text.strip()
    if not clean_text:
        return ""

    cache_key = f"{source}:{target}:{clean_text}"
    if cache_key in _TRANSLATION_CACHE:
        return _TRANSLATION_CACHE[cache_key]

    # Tentativa 1: Google Client
    try:
        translated = _translate_google_raw(clean_text, source=source, target=target)
        if translated:
            _TRANSLATION_CACHE[cache_key] = translated
            return translated
    except Exception as e:
        print(f"[Translator] Google raw falhou para '{clean_text[:20]}...': {e}")

    # Tentativa 2: MyMemory
    try:
        translated = _translate_mymemory(clean_text, source=source, target=target)
        if translated:
            _TRANSLATION_CACHE[cache_key] = translated
            return translated
    except Exception as e:
        print(f"[Translator] MyMemory fallback falhou: {e}")

    # Se tudo falhar, retorna o texto original
    return clean_text

def traduzir_lote(texts: list[str], source: str = "auto", target: str = "pt", chunk_size: int = 15) -> list[str]:
    """
    Traduz uma lista de textos em lotes (batch) para alta velocidade e eficiência.
    Reduz dezenas de requisições de rede para apenas 2 ou 3.
    """
    if not texts:
        return []

    results = []
    delimiter = "\n[[SPLIT]]\n"

    for i in range(0, len(texts), chunk_size):
        chunk = texts[i:i + chunk_size]
        joined = delimiter.join(chunk)

        try:
            translated_joined = _translate_google_raw(joined, source=source, target=target)
            # Redivide pelo delimitador (permitindo variações de espaçamento)
            parts = re.split(r'\s*\[\[SPLIT\]\]\s*', translated_joined)
            if len(parts) == len(chunk):
                results.extend([p.strip() for p in parts])
                continue
        except Exception as e:
            print(f"[Translator] Lote de {len(chunk)} itens falhou, caindo para tradução item a item: {e}")

        # Fallback para tradução item a item
        for item in chunk:
            results.append(traduzir_texto(item, source=source, target=target))

    return results
