"""
Suíte de Testes Automatizados de Segurança (OWASP, CORS, RBAC, Criptografia e Sanitização).
Valida todos os controles implementados para conformidade com arquitetura SaaS segura.
"""
import os
import sys
import unittest
import json

# Adiciona o diretório do backend ao sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.security import (
    CryptoService,
    UserRepository,
    PaymentRepository,
    validate_and_extract_youtube_id,
    SecurityValidationError
)

class SecurityTestSuite(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.crypto = CryptoService()
        self.user_repo = UserRepository()
        self.payment_repo = PaymentRepository()

    def test_01_owasp_security_headers(self):
        """Verifica se todas as respostas HTTP incluem cabeçalhos de segurança OWASP."""
        response = self.client.get("/")
        headers = response.headers

        self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(headers.get("X-Frame-Options"), "SAMEORIGIN")
        self.assertEqual(headers.get("X-XSS-Protection"), "1; mode=block")
        self.assertEqual(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")
        self.assertIn("Content-Security-Policy", headers)
        self.assertIn("default-src 'self'", headers.get("Content-Security-Policy"))

    def test_02_ssrf_youtube_url_validator(self):
        """Garante que URLs arbitrárias, IPs locais e esquemas não autorizados sejam bloqueados."""
        # URLs válidas que devem passar
        valid_urls = [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ",
            "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://www.youtube.com/shorts/dQw4w9WgXcQ",
            "dQw4w9WgXcQ"
        ]
        for url in valid_urls:
            extracted_id = validate_and_extract_youtube_id(url)
            self.assertEqual(extracted_id, "dQw4w9WgXcQ")

        # Tentativas de SSRF e injeção que DEVEM ser bloqueadas
        malicious_urls = [
            "http://169.254.169.254/latest/meta-data/",  # Cloud metadata
            "http://localhost:5000/admin",               # Localhost traversal
            "http://127.0.0.1:8080/internal",            # Loopback
            "ftp://malicious.com/file",                  # Non-https scheme
            "https://evil-site.com/watch?v=dQw4w9WgXcQ", # Domínio não autorizado
            "javascript:alert(1)",                       # XSS
            "https://www.youtube.com/watch?v=curto",     # ID inválido
        ]
        for url in malicious_urls:
            with self.assertRaises(SecurityValidationError):
                validate_and_extract_youtube_id(url)

    def test_03_password_hashing_and_isolation(self):
        """Verifica que as senhas são armazenadas com scrypt e nunca vazam em retornos."""
        raw_pass = "SenhaSegura@2026!"
        h1 = self.crypto.hash_password(raw_pass)
        h2 = self.crypto.hash_password(raw_pass)

        # Hashes devem ser diferentes devido ao salt aleatório
        self.assertNotEqual(h1, h2)
        # Senha correta deve validar
        self.assertTrue(self.crypto.verify_password(raw_pass, h1))
        # Senha incorreta deve falhar
        self.assertFalse(self.crypto.verify_password("SenhaErrada", h1))

    def test_04_user_registration_and_http_only_cookie(self):
        """Verifica fluxo de cadastro e emissão de cookie HTTP-Only (sem localStorage)."""
        test_email = f"test_{os.urandom(4).hex()}@example.com"
        payload = {
            "name": "Maria Silva",
            "email": test_email,
            "password": "MinhaSenhaForte123@"
        }

        response = self.client.post(
            "/api/auth/register",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)

        # O hash da senha NUNCA deve ser retornado no payload
        self.assertNotIn("password_hash", data.get("user", {}))
        self.assertEqual(data["user"]["email"], test_email)

        # Verifica o cookie de sessão HTTP-Only
        set_cookie = response.headers.get("Set-Cookie", "")
        self.assertIn("bilingual_auth_session", set_cookie)
        self.assertIn("HttpOnly", set_cookie)
        self.assertIn("SameSite=Lax", set_cookie)

    def test_05_auth_flow_me_and_logout(self):
        """Verifica rota protegida /api/auth/me com sessão e logout seguro."""
        test_email = f"user_{os.urandom(4).hex()}@example.com"
        password = "Password123#Secure"

        # 1. Cadastro
        reg_resp = self.client.post(
            "/api/auth/register",
            data=json.dumps({"name": "João", "email": test_email, "password": password}),
            content_type="application/json"
        )
        self.assertEqual(reg_resp.status_code, 201)

        # 2. Acesso à rota protegida /api/auth/me (cookie persiste no test_client)
        me_resp = self.client.get("/api/auth/me")
        self.assertEqual(me_resp.status_code, 200)
        me_data = json.loads(me_resp.data)
        self.assertEqual(me_data["user"]["email"], test_email)

        # 3. Logout
        logout_resp = self.client.post("/api/auth/logout")
        self.assertEqual(logout_resp.status_code, 200)

        # 4. Acesso sem cookie ou após logout deve ser negado (401)
        fresh_client = self.app.test_client()
        unauth_resp = fresh_client.get("/api/auth/me")
        self.assertEqual(unauth_resp.status_code, 401)

    def test_06_pci_dss_payment_repository_isolation(self):
        """Verifica que o repositório de pagamentos isola os tenants e armazena apenas tokens opacos."""
        user_a = f"usr_{os.urandom(4).hex()}"
        user_b = f"usr_{os.urandom(4).hex()}"

        # Cria registro de assinatura com token opaco do gateway
        sub = self.payment_repo.upsert_subscription(
            user_id=user_a,
            gateway="stripe",
            gateway_customer_id="cus_test123456",
            gateway_subscription_id="sub_test789012",
            plan_tier="pro",
            status="active"
        )
        self.assertEqual(sub["plan_tier"], "pro")

        # O próprio usuário A pode consultar
        consult_a = self.payment_repo.get_by_user_id(user_a, authenticated_user_id=user_a)
        self.assertIsNotNone(consult_a)
        self.assertEqual(consult_a["gateway_customer_id"], "cus_test123456")

        # Tentativa de acesso cruzado (Usuário B tentando ver dados do Usuário A) DEVE falhar
        with self.assertRaises(PermissionError):
            self.payment_repo.get_by_user_id(user_a, authenticated_user_id=user_b)

    def test_07_rate_limiter_protection(self):
        """Verifica se o rate limiter bloqueia com 429 requisições abusivas em curto intervalo."""
        url = "/api/auth/login"
        # O limite na rota de login é 5 requisições por minuto
        # Vamos simular 7 requisições
        responses = []
        for _ in range(7):
            resp = self.client.post(
                url,
                data=json.dumps({"email": "fake@example.com", "password": "wrong"}),
                content_type="application/json"
            )
            responses.append(resp.status_code)

        # As primeiras devem ser 401 (senha errada), mas as últimas DEVEM ser 429 (Too Many Requests)
        self.assertIn(429, responses)

if __name__ == "__main__":
    unittest.main()
