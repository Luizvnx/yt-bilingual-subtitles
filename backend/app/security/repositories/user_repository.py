"""
Repositório de Usuários com Acesso Restrito.
Padrão de Projeto: Repository Pattern.
Gerencia dados de identificação, credenciais criptografadas e papéis (roles).
Garante que o hash da senha jamais seja exposto em retornos de API.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from .base import BaseRepository
from app.security.crypto import CryptoService

class UserRepository(BaseRepository):
    """
    Repositório isolado para gerenciar contas de usuário.
    """
    def __init__(self):
        super().__init__("users.json")
        self.crypto = CryptoService()

    @staticmethod
    def _sanitize_user_output(user: Dict[str, Any]) -> Dict[str, Any]:
        """Remove campos sensíveis antes de retornar dados do usuário."""
        safe = user.copy()
        safe.pop("password_hash", None)
        return safe

    def get_by_email(self, email: str, include_password: bool = False) -> Optional[Dict[str, Any]]:
        clean_email = email.strip().lower()
        users = self._read_data()
        for u in users:
            if u.get("email", "").lower() == clean_email:
                return u if include_password else self._sanitize_user_output(u)
        return None

    def get_by_id(self, user_id: str, include_password: bool = False) -> Optional[Dict[str, Any]]:
        users = self._read_data()
        for u in users:
            if u.get("id") == user_id:
                return u if include_password else self._sanitize_user_output(u)
        return None

    def create_user(self, name: str, email: str, raw_password: str, role: str = "user", tier: str = "free") -> Dict[str, Any]:
        clean_email = email.strip().lower()

        # Verifica unicidade do email
        if self.get_by_email(clean_email):
            raise ValueError("Este e-mail já está cadastrado no sistema.")

        password_hash = self.crypto.hash_password(raw_password)
        now_iso = datetime.now(timezone.utc).isoformat()

        user_data = {
            "id": f"usr_{uuid.uuid4().hex[:12]}",
            "name": name.strip(),
            "email": clean_email,
            "password_hash": password_hash,
            "role": role,
            "tier": tier,
            "is_active": True,
            "created_at": now_iso,
            "updated_at": now_iso
        }

        users = self._read_data()
        users.append(user_data)
        self._write_data(users)

        return self._sanitize_user_output(user_data)

    def verify_credentials(self, email: str, raw_password: str) -> Optional[Dict[str, Any]]:
        """Valida e-mail e senha de forma segura contra timing attacks."""
        user = self.get_by_email(email, include_password=True)
        if not user:
            return None

        if not user.get("is_active", True):
            return None

        if self.crypto.verify_password(raw_password, user.get("password_hash", "")):
            return self._sanitize_user_output(user)

        return None

    def update_tier(self, user_id: str, new_tier: str) -> bool:
        users = self._read_data()
        updated = False
        for u in users:
            if u.get("id") == user_id:
                u["tier"] = new_tier
                u["updated_at"] = datetime.now(timezone.utc).isoformat()
                updated = True
                break
        if updated:
            self._write_data(users)
        return updated
