import os

def delete_file(file_path: str) -> bool:
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"Erro ao excluir arquivo {file_path}: {e}")
        return False
