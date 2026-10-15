"""
Middleware de Cabeçalhos de Segurança HTTP (OWASP / Best Practices).
Aplica proteção contra Clickjacking, MIME sniffing, XSS e define CSP estrito.
"""
from flask import Flask, Response

def register_security_headers(app: Flask):
    """
    Registra um hook 'after_request' para injetar cabeçalhos de segurança em todas as respostas HTTP.
    """
    @app.after_request
    def set_security_headers(response: Response) -> Response:
        # Previne que o navegador tente inferir (sniff) o MIME type
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Previne que o site seja embutido em frames externos (anti-Clickjacking)
        # Permite frames da mesma origem
        response.headers["X-Frame-Options"] = "SAMEORIGIN"

        # Proteção legada contra XSS refletido para navegadores mais antigos
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Política estrita de referrer para não vazar tokens ou parâmetros em links externos
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Política de permissões de hardware do navegador
        response.headers["Permissions-Policy"] = "microphone=(self), camera=(), geolocation=(), payment=()"

        # Content-Security-Policy (CSP)
        # Permite scripts e frames necessários para o player oficial do YouTube e fontes/ícones
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com https://cdn.jsdelivr.net",
            "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
            "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
            "img-src 'self' data: https://i.ytimg.com https://img.youtube.com https://*.ytimg.com",
            "connect-src 'self' https://www.youtube.com https://translate.googleapis.com",
            "media-src 'self' blob: data:",
            "object-src 'none'",
            "base-uri 'self'"
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        return response
