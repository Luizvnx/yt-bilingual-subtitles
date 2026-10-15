"""
Rate Limiter para Proteção contra Ataques de Força Bruta e DoS.
Padrão de Projeto: Decorator Pattern.
Aplica limitação de requisições por IP ou por usuário autenticado.
"""
import time
from functools import wraps
from typing import Dict, List
from flask import request, jsonify, g

class InMemoryRateLimiter:
    """
    Controlador de taxa baseado em janela deslizante (Sliding Window).
    Compatível com arquitetura local e pronto para chaveamento via Redis em produção.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InMemoryRateLimiter, cls).__new__(cls)
            cls._instance.requests_record: Dict[str, List[float]] = {}
        return cls._instance

    def is_allowed(self, key: str, limit: int, period_seconds: int) -> tuple[bool, int]:
        now = time.time()
        window_start = now - period_seconds

        # Limpa requisições mais antigas que a janela
        if key not in self.requests_record:
            self.requests_record[key] = []

        # Mantém apenas timestamps dentro da janela
        self.requests_record[key] = [t for t in self.requests_record[key] if t > window_start]

        if len(self.requests_record[key]) >= limit:
            oldest_timestamp = self.requests_record[key][0]
            retry_after = int(oldest_timestamp + period_seconds - now) + 1
            return False, max(1, retry_after)

        self.requests_record[key].append(now)
        return True, 0


def rate_limit(limit: int = 60, period_seconds: int = 60):
    """
    Decorator para proteger rotas contra abusos.
    Exemplo: @rate_limit(limit=5, period_seconds=60) permite até 5 requisições por minuto.
    """
    limiter = InMemoryRateLimiter()

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Identificador do cliente: ID do usuário autenticado (se houver) ou IP do cliente
            client_id = getattr(g, "current_user_id", None) or request.headers.get("X-Forwarded-For", request.remote_addr) or "unknown"
            route_key = f"{client_id}:{request.endpoint}"

            allowed, retry_after = limiter.is_allowed(route_key, limit, period_seconds)
            if not allowed:
                response = jsonify({
                    "error": "Muitas requisições. Limite de taxa excedido.",
                    "retry_after_seconds": retry_after
                })
                response.status_code = 429
                response.headers["Retry-After"] = str(retry_after)
                return response

            return f(*args, **kwargs)
        return decorated_function
    return decorator
