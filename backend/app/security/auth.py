"""
Módulo de Autenticação, Autorização e Gestão de Sessões Seguras.
Padrão de Projeto: Decorator Pattern + Middleware Context.
Garante que credenciais trafeguem exclusivamente via Cookies HTTP-Only, Secure e SameSite,
eliminando a necessidade de armazenamento vulnerável no localStorage do navegador.
"""
import os
from functools import wraps
from typing import Optional, Dict, Any, Callable
from flask import request, jsonify, g, make_response, Response
from app.security.crypto import CryptoService
from app.security.repositories.user_repository import UserRepository

AUTH_COOKIE_NAME = "bilingual_auth_session"
COOKIE_MAX_AGE = 86400 * 7  # 7 dias

crypto_service = CryptoService()
user_repo = UserRepository()

def extract_token_from_request() -> Optional[str]:
    """
    Extrai o token de autenticação priorizando o Cookie HTTP-Only.
    Possui fallback para o cabeçalho Authorization: Bearer <token> para clientes de API.
    """
    # 1. Prioridade: Cookie HTTP-Only seguro (protege contra XSS no navegador)
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if token:
        return token

    # 2. Fallback: Cabeçalho Authorization Bearer
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()

    return None

def get_current_user() -> Optional[Dict[str, Any]]:
    """
    Identifica o usuário atual a partir do token criptográfico e valida no repositório.
    Armazena no contexto global da requisição (flask.g) para evitar re-consultas.
    """
    if hasattr(g, "current_user") and g.current_user is not None:
        return g.current_user

    token = extract_token_from_request()
    if not token:
        g.current_user = None
        g.current_user_id = None
        return None

    payload = crypto_service.verify_auth_token(token)
    if not payload or not payload.get("uid"):
        g.current_user = None
        g.current_user_id = None
        return None

    user = user_repo.get_by_id(payload["uid"])
    if not user or not user.get("is_active", True):
        g.current_user = None
        g.current_user_id = None
        return None

    g.current_user = user
    g.current_user_id = user["id"]
    return user

def set_auth_cookie(response: Response, token: str) -> Response:
    """
    Injeta o cookie de sessão com todas as diretivas de segurança ativadas:
    - HttpOnly: impede acesso via scripts maliciosos (anti-XSS).
    - Secure: exige conexão HTTPS em produção.
    - SameSite=Lax: previne ataques de Cross-Site Request Forgery (CSRF).
    """
    is_prod = os.getenv("FLASK_ENV") == "production"
    response.set_cookie(
        AUTH_COOKIE_NAME,
        token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=is_prod,
        samesite="Lax",
        path="/"
    )
    return response

def clear_auth_cookie(response: Response) -> Response:
    """Remove o cookie de autenticação no logout."""
    response.delete_cookie(AUTH_COOKIE_NAME, path="/")
    return response


# ==========================================
# Decorators de Autorização (RBAC)
# ==========================================

def require_auth(f: Callable):
    """
    Decorator que exige autenticação válida para acessar a rota.
    Retorna 401 Unauthorized se o usuário não estiver autenticado.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({
                "error": "Não autorizado. É necessário fazer login para acessar este recurso.",
                "code": "AUTH_REQUIRED"
            }), 401
        return f(*args, **kwargs)
    return decorated

def require_role(required_role: str):
    """
    Decorator para controle de acesso baseado em papel (RBAC).
    Exemplo: @require_role("admin")
    """
    def decorator(f: Callable):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Não autenticado.", "code": "AUTH_REQUIRED"}), 401

            if user.get("role") != required_role:
                return jsonify({
                    "error": f"Acesso proibido. Esta ação requer permissão de '{required_role}'.",
                    "code": "FORBIDDEN"
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator

def require_tier(required_tier: str):
    """
    Decorator para controle de acesso baseado no plano (ex: 'pro').
    Exemplo: @require_tier("pro")
    """
    def decorator(f: Callable):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Não autenticado.", "code": "AUTH_REQUIRED"}), 401

            if user.get("tier") != required_tier and user.get("role") != "admin":
                return jsonify({
                    "error": f"Recurso exclusivo para assinantes do plano {required_tier.upper()}.",
                    "code": "UPGRADE_REQUIRED",
                    "required_tier": required_tier
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator

def optional_auth(f: Callable):
    """
    Carrega o usuário na requisição se o token estiver presente, mas não bloqueia a rota caso não esteja.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        get_current_user()
        return f(*args, **kwargs)
    return decorated
