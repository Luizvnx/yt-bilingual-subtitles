"""
Repositórios de Segurança e Dados Restritos.
Padrão de Projeto: Repository Pattern com Isolamento Estrito de Tenant.
"""
from .base import BaseRepository
from .user_repository import UserRepository
from .payment_repository import PaymentRepository

__all__ = ["BaseRepository", "UserRepository", "PaymentRepository"]
