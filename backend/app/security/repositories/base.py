"""
Repositório Base com Princípio de Isolamento Multi-Tenant.
Padrão de Projeto: Repository Pattern.
Garante que todas as operações de dados sejam filtradas pelo proprietário (tenant_id / user_id),
eliminando vulnerabilidades de IDOR (Insecure Direct Object Reference).
"""
import os
import json
from abc import ABC
from threading import Lock
from typing import Any, Dict, List, Optional
from app.config import DATA_DIR

class BaseRepository(ABC):
    """
    Classe base para repositórios com controle de concorrência e isolamento de dados.
    """
    _file_locks: Dict[str, Lock] = {}

    def __init__(self, storage_filename: str):
        self.filepath = os.path.join(DATA_DIR, storage_filename)
        if storage_filename not in self._file_locks:
            self._file_locks[storage_filename] = Lock()
        self.lock = self._file_locks[storage_filename]

    def _read_data(self) -> List[Dict[str, Any]]:
        with self.lock:
            if not os.path.exists(self.filepath):
                return []
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []

    def _write_data(self, items: List[Dict[str, Any]]) -> None:
        with self.lock:
            os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
            # Escrita atômica temporária para evitar corrupção de arquivos
            temp_path = self.filepath + ".tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(items, f, ensure_ascii=False, indent=2)
            os.replace(temp_path, self.filepath)

    @staticmethod
    def enforce_tenant_scope(resource_user_id: str, authenticated_user_id: str) -> None:
        """
        Garante que o usuário autenticado só possa acessar/modificar recursos próprios.
        Lança PermissionError se houver tentativa de acesso cruzado.
        """
        if not authenticated_user_id or str(resource_user_id) != str(authenticated_user_id):
            raise PermissionError("Acesso negado: você não tem permissão para acessar este recurso.")
