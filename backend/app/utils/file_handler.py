import os

def delete_file(file_path: str) -> bool:
    """
    Exclui um arquivo do sistema.
    Retorna True se conseguiu, False caso contrário.
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"Erro ao excluir arquivo {file_path}: {e}")
        return False
