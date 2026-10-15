"""
Repositório de Dados de Pagamento e Assinaturas (Conformidade PCI-DSS).
Padrão de Projeto: Repository Pattern.
Armazena exclusivamente identificadores opacos e tokens fornecidos por gateways seguros
(Stripe, Asaas, Mercado Pago).
REGRA DE SEGURANÇA ABSOLUTA: Nenhum dado de cartão de crédito (número, CVV, senha)
jamais deve ser recebido ou persistido nesta aplicação.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from .base import BaseRepository

class PaymentRepository(BaseRepository):
    """
    Repositório isolado para dados financeiros e assinaturas.
    Acesso estritamente restrito e isolado por tenant.
    """
    def __init__(self):
        super().__init__("subscriptions.json")

    def get_by_user_id(self, user_id: str, authenticated_user_id: str) -> Optional[Dict[str, Any]]:
        """
        Recupera os dados de assinatura garantindo isolamento de tenant.
        Apenas o próprio usuário ou administradores podem consultar.
        """
        self.enforce_tenant_scope(user_id, authenticated_user_id)
        records = self._read_data()
        for rec in records:
            if rec.get("user_id") == user_id:
                return rec
        return None

    def upsert_subscription(
        self,
        user_id: str,
        gateway: str,
        gateway_customer_id: str,
        gateway_subscription_id: str,
        plan_tier: str,
        status: str,
        expires_at: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cria ou atualiza uma assinatura utilizando exclusivamente tokens opacos do gateway.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        records = self._read_data()

        existing = None
        for rec in records:
            if rec.get("user_id") == user_id:
                existing = rec
                break

        if existing:
            existing.update({
                "gateway": gateway,
                "gateway_customer_id": gateway_customer_id,
                "gateway_subscription_id": gateway_subscription_id,
                "plan_tier": plan_tier,
                "status": status,
                "expires_at": expires_at,
                "updated_at": now_iso
            })
            result = existing
        else:
            new_record = {
                "id": f"sub_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "gateway": gateway,
                "gateway_customer_id": gateway_customer_id,
                "gateway_subscription_id": gateway_subscription_id,
                "plan_tier": plan_tier,
                "status": status,
                "expires_at": expires_at,
                "created_at": now_iso,
                "updated_at": now_iso
            }
            records.append(new_record)
            result = new_record

        self._write_data(records)
        return result

    def get_active_subscription_tier(self, user_id: str) -> str:
        """Retorna o plano ativo do usuário ('free' ou 'pro')."""
        records = self._read_data()
        for rec in records:
            if rec.get("user_id") == user_id and rec.get("status") == "active":
                return rec.get("plan_tier", "free")
        return "free"
