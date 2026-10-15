"""
Pacote Central de Segurança da Aplicação (YT Bilingual Subtitles SaaS).
Reúne e exporta utilitários de CORS, Headers OWASP, Validação/Sanitização, Criptografia,
Rate Limiting, RBAC e Repositórios Seguros.
"""
from .cors import init_cors
from .headers import register_security_headers
from .error_handlers import register_security_error_handlers
from .validators import (
    validate_and_extract_youtube_id,
    sanitize_text,
    escape_html,
    SecurityValidationError,
    ProcessVideoSchema,
    UserRegisterSchema,
    UserLoginSchema
)
from .crypto import CryptoService
from .rate_limiter import rate_limit
from .auth import (
    require_auth,
    require_role,
    require_tier,
    optional_auth,
    get_current_user,
    set_auth_cookie,
    clear_auth_cookie
)
from .repositories import UserRepository, PaymentRepository

__all__ = [
    "init_cors",
    "register_security_headers",
    "register_security_error_handlers",
    "validate_and_extract_youtube_id",
    "sanitize_text",
    "escape_html",
    "SecurityValidationError",
    "ProcessVideoSchema",
    "UserRegisterSchema",
    "UserLoginSchema",
    "CryptoService",
    "rate_limit",
    "require_auth",
    "require_role",
    "require_tier",
    "optional_auth",
    "get_current_user",
    "set_auth_cookie",
    "clear_auth_cookie",
    "UserRepository",
    "PaymentRepository",
]
