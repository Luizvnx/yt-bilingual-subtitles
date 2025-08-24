from flask import Flask, request, render_template, jsonify

def create_app():
    app = Flask(__name__)

    @app.route("/")
    def index():
        return render_template("index.html")
   
    app.config['SECRET_KEY'] = "secret_key"
    

    from app.routes.subtitles import subtitles_bp
    app.register_blueprint(subtitles_bp, url_prefix="/subtitles")

    from app.routes.helloworld import helloworld_bp
    app.register_blueprint(helloworld_bp, url_prefix="/hello")

    return app
