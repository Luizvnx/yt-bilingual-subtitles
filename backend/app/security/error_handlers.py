"""
Tratamento Centralizado de Erros de Segurança.
Padroniza respostas JSON de erro e previne o vazamento de stack traces e dados internos do servidor.
"""
from flask import Flask, jsonify
from app.security.validators import SecurityValidationError

def register_security_error_handlers(app: Flask):
    """
    Registra manipuladores de erro padronizados.
    """
    @app.errorhandler(SecurityValidationError)
    def handle_validation_error(e: SecurityValidationError):
        return jsonify({
            "error": e.message,
            "code": "VALIDATION_ERROR"
        }), e.status_code

    @app.errorhandler(PermissionError)
    def handle_permission_error(e: PermissionError):
        return jsonify({
            "error": str(e),
            "code": "PERMISSION_DENIED"
        }), 403

    @app.errorhandler(400)
    def handle_bad_request(e):
        return jsonify({
            "error": "Requisição inválida ou parâmetros ausentes.",
            "code": "BAD_REQUEST"
        }), 400

    @app.errorhandler(401)
    def handle_unauthorized(e):
        return jsonify({
            "error": "Autenticação necessária.",
            "code": "UNAUTHORIZED"
        }), 401

    @app.errorhandler(403)
    def handle_forbidden(e):
        return jsonify({
            "error": "Acesso proibido.",
            "code": "FORBIDDEN"
        }), 403

    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({
            "error": "Recurso não encontrado.",
            "code": "NOT_FOUND"
        }), 404

    @app.errorhandler(429)
    def handle_too_many_requests(e):
        return jsonify({
            "error": "Muitas requisições. Por favor, tente novamente mais tarde.",
            "code": "RATE_LIMIT_EXCEEDED"
        }), 429
