from flask import Flask

def create_app():
    app = Flask(__name__)

    # Configurações futuras (ex: banco, API keys)
    app.config['SECRET_KEY'] = "sua_secret_key_aqui"

    # Registro de rotas (Blueprints)
    from app.routes.subtitles import subtitles_bp
    app.register_blueprint(subtitles_bp, url_prefix="/subtitles")

    from app.routes.helloworld import helloworld_bp
    app.register_blueprint(helloworld_bp, url_prefix="/hello")

    return app
