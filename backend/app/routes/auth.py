"""
Rotas de Autenticação e Gestão de Contas (SaaS Multi-Tenant).
Aplica rate limiting, validação de schemas, e emissão de cookies de sessão seguros (HttpOnly).
"""
from flask import Blueprint, request, jsonify, make_response
from app.security import (
    UserRegisterSchema,
    UserLoginSchema,
    UserRepository,
    PaymentRepository,
    CryptoService,
    rate_limit,
    require_auth,
    get_current_user,
    set_auth_cookie,
    clear_auth_cookie,
    SecurityValidationError
)

auth_bp = Blueprint("auth", __name__)
user_repo = UserRepository()
payment_repo = PaymentRepository()
crypto_service = CryptoService()

@auth_bp.route("/register", methods=["POST"])
@rate_limit(limit=5, period_seconds=60)
def register():
    """
    Endpoint para cadastro de novo usuário.
    Gera credenciais seguras e emite cookie de sessão HTTP-Only.
    """
    payload = request.get_json(silent=True) or {}
    try:
        data = UserRegisterSchema(**payload)
    except Exception as e:
        return jsonify({"error": "Dados inválidos.", "details": str(e)}), 400

    try:
        user = user_repo.create_user(
            name=data.name,
            email=data.email,
            raw_password=data.password,
            role="user",
            tier="free"
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 409

    token = crypto_service.generate_auth_token(user_id=user["id"], role=user["role"], tier=user["tier"])

    resp = make_response(jsonify({
        "message": "Conta criada com sucesso!",
        "user": user
    }), 201)

    return set_auth_cookie(resp, token)


@auth_bp.route("/login", methods=["POST"])
@rate_limit(limit=5, period_seconds=60)
def login():
    """
    Endpoint para autenticação de usuário.
    Protegido por rate-limiter contra ataques de força bruta.
    """
    payload = request.get_json(silent=True) or {}
    try:
        data = UserLoginSchema(**payload)
    except Exception as e:
        return jsonify({"error": "E-mail ou senha em formato inválido.", "details": str(e)}), 400

    user = user_repo.verify_credentials(data.email, data.password)
    if not user:
        return jsonify({"error": "E-mail ou senha incorretos."}), 401

    token = crypto_service.generate_auth_token(user_id=user["id"], role=user["role"], tier=user["tier"])

    resp = make_response(jsonify({
        "message": "Login efetuado com sucesso!",
        "user": user
    }))

    return set_auth_cookie(resp, token)


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Encerra a sessão removendo o cookie seguro."""
    resp = make_response(jsonify({"message": "Sessão encerrada com sucesso."}))
    return clear_auth_cookie(resp)


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_profile():
    """
    Retorna o perfil do usuário autenticado.
    Garante que nenhuma credencial ou segredo vaze.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Usuário não encontrado."}), 404

    # Busca status atualizado do plano
    plan_tier = payment_repo.get_active_subscription_tier(user["id"])
    user["tier"] = plan_tier

    return jsonify({
        "user": user
    })
