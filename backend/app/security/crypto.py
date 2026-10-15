"""
Criptografia, Hashing de Senhas e Gerador de Tokens Seguros.
Utiliza Werkzeug Security (scrypt/pbkdf2) e itsdangerous para tokens assinados criptograficamente.
"""
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from app.config import SECRET_KEY

class CryptoService:
    """
    Serviço centralizado para hashing de senhas e geração de tokens assinados.
    Padrão de Projeto: Singleton / Service Layer.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CryptoService, cls).__new__(cls)
            secret = SECRET_KEY or os.getenv("SECRET_KEY", "bilingual_subtitles_fallback_secret_key")
            cls._instance.serializer = URLSafeTimedSerializer(secret, salt="yt-bilingual-auth-salt")
        return cls._instance

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Gera hash criptográfico seguro com salt aleatório usando scrypt.
        Resistente a ataques de força bruta e Rainbow Tables.
        """
        if not password or len(password) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres.")
        return generate_password_hash(password, method="scrypt")

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Compara a senha em tempo constante para evitar ataques de timing."""
        if not password or not password_hash:
            return False
        return check_password_hash(password_hash, password)

    def generate_auth_token(self, user_id: str, role: str = "user", tier: str = "free") -> str:
        """
        Gera um token assinado contendo a identidade do usuário.
        Padrão Factory para criação de credenciais efêmeras.
        """
        payload = {
            "uid": user_id,
            "role": role,
            "tier": tier,
            "iat": datetime.now(timezone.utc).timestamp()
        }
        return self.serializer.dumps(payload)

    def verify_auth_token(self, token: str, max_age_seconds: int = 86400 * 7) -> Optional[Dict[str, Any]]:
        """
        Valida o token criptográfico e garante que não expirou nem foi adulterado.
        Retorna o payload se válido, ou None se inválido/expirado.
        """
        if not token:
            return None
        try:
            payload = self.serializer.loads(token, max_age=max_age_seconds)
            return payload
        except (SignatureExpired, BadSignature):
            return None
