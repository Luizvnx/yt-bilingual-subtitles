"""
Módulo de Configuração de CORS Estrito e Seguro.
Define políticas restritivas para proteger o SaaS contra acessos não autorizados entre origens.
"""
import os
from flask import Flask
from flask_cors import CORS

def init_cors(app: Flask) -> CORS:
    """
    Inicializa o CORS com políticas restritivas baseadas em lista de permissões (whitelist).
    Evita o uso de '*' que permite requisições arbitrárias de qualquer site externo.
    """
    # Lista de origens permitidas via variável de ambiente (separadas por vírgula)
    # Por padrão, permite apenas o domínio local em desenvolvimento
    raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000")
    allowed_origins = [orig.strip() for orig in raw_origins.split(",") if orig.strip()]

    # Métodos HTTP estritamente permitidos
    allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

    # Cabeçalhos permitidos em requisições
    allowed_headers = [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "X-CSRF-Token"
    ]

    cors = CORS(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins,
                "methods": allowed_methods,
                "allow_headers": allowed_headers,
                "supports_credentials": True,  # Permite envio seguro de cookies HTTP-Only
                "max_age": 86400  # Cache de preflight por 24 horas
            },
            r"/subtitles/*": {
                "origins": allowed_origins,
                "methods": allowed_methods,
                "allow_headers": allowed_headers,
                "supports_credentials": True,
                "max_age": 86400
            }
        }
    )

    app.config["ALLOWED_ORIGINS"] = allowed_origins
    return cors
