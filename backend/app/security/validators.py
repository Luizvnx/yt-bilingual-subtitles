"""
Validação e Sanitização de Entrada e Saída (Input/Output Security).
Protege contra SSRF (Server-Side Request Forgery), XSS e injeção de parâmetros maliciosos.
"""
import re
import html
import urllib.parse
from typing import Optional
from pydantic import BaseModel, Field, field_validator

# Domínios e padrões oficiais permitidos para o YouTube
ALLOWED_YOUTUBE_HOSTS = {
    "www.youtube.com",
    "youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtube-nocookie.com"
}

# Regex restrito para IDs de vídeo do YouTube (exatamente 11 caracteres base64url)
YOUTUBE_ID_REGEX = re.compile(r"^[A-Za-z0-9_-]{11}$")

# Lista de hosts/redes bloqueadas para evitar SSRF (rede interna / loopback / metadados de cloud)
FORBIDDEN_HOSTS = {
    "localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254"
}

class SecurityValidationError(Exception):
    """Exceção levantada quando uma validação de segurança falha."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

def validate_and_extract_youtube_id(url: str) -> str:
    """
    Valida rigorosamente uma URL do YouTube para prevenir ataques de SSRF.
    Garante que a requisição apenas acesse domínios oficiais e formatos legítimos de vídeo.
    Retorna o ID de 11 caracteres validado.
    """
    if not url or not isinstance(url, str):
        raise SecurityValidationError("URL do vídeo inválida ou ausente.")

    url = url.strip()

    # Limite razoável de tamanho de URL para evitar DoS por buffer
    if len(url) > 500:
        raise SecurityValidationError("URL excede o comprimento máximo permitido.")

    # Se o usuário enviou diretamente o ID do vídeo (11 caracteres)
    if YOUTUBE_ID_REGEX.match(url):
        return url

    # Parseia a URL de forma estrita
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        raise SecurityValidationError("Formato de URL malformado.")

    # 1. Esquema deve ser estritamente https (ou http em dev)
    if parsed.scheme not in ("https", "http"):
        raise SecurityValidationError("Esquema de URL inválido. Apenas HTTPS é permitido.")

    # 2. Hostname deve pertencer à whitelist de domínios do YouTube
    hostname = (parsed.hostname or "").lower()
    if hostname in FORBIDDEN_HOSTS or hostname not in ALLOWED_YOUTUBE_HOSTS:
        raise SecurityValidationError(f"Domínio não autorizado: '{hostname}'. Apenas vídeos do YouTube são permitidos.")

    # 3. Extração do ID do vídeo
    video_id = None

    if hostname == "youtu.be":
        # Formato: https://youtu.be/<video_id>
        path_parts = parsed.path.strip("/").split("/")
        if path_parts and path_parts[0]:
            video_id = path_parts[0]
    else:
        # Formatos: /watch?v=<id>, /embed/<id>, /shorts/<id>
        if parsed.path == "/watch":
            query_params = urllib.parse.parse_qs(parsed.query)
            v_list = query_params.get("v")
            if v_list and len(v_list) > 0:
                video_id = v_list[0]
        elif parsed.path.startswith(("/embed/", "/shorts/", "/v/")):
            path_parts = parsed.path.strip("/").split("/")
            if len(path_parts) >= 2:
                video_id = path_parts[1]

    if not video_id or not YOUTUBE_ID_REGEX.match(video_id):
        raise SecurityValidationError("Não foi possível extrair um identificador válido de vídeo do YouTube (11 caracteres).")

    return video_id

def sanitize_text(text: str, max_length: int = 1000) -> str:
    """
    Sanitiza uma string de texto removendo caracteres nulos e limitando tamanho.
    Evita quebras de parser e ataques de injeção.
    """
    if not text:
        return ""
    # Remove null bytes
    clean = text.replace("\x00", "")
    # Corta no limite máximo
    if len(clean) > max_length:
        clean = clean[:max_length]
    return clean.strip()

def escape_html(text: str) -> str:
    """Escapa caracteres HTML para exibição segura em templates."""
    return html.escape(text or "", quote=True)


# ==========================================
# Schemas de Entrada usando Pydantic
# ==========================================

class ProcessVideoSchema(BaseModel):
    """Validação para a rota de processamento de vídeos."""
    url: str = Field(..., min_length=5, max_length=500, description="URL do vídeo do YouTube")
    model: Optional[str] = Field("base", description="Modelo do Whisper desejado")

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: Optional[str]) -> str:
        allowed_models = {"tiny", "base", "small", "medium", "large"}
        val = (v or "base").lower().strip()
        if val not in allowed_models:
            return "base"
        return val


class UserRegisterSchema(BaseModel):
    """Validação de payload para cadastro de novos usuários."""
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        email_regex = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        if not email_regex.match(clean):
            raise SecurityValidationError("Endereço de e-mail inválido.")
        return clean

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return sanitize_text(v, max_length=100)


class UserLoginSchema(BaseModel):
    """Validação de payload para login."""
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()
