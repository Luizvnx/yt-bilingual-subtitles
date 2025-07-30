from flask import Blueprint, request, jsonify


helloworld_bp = Blueprint("helloworld", __name__)

@helloworld_bp.route("/", methods=["GET"])
def helloworld():
    return jsonify({"message": "Hello, World!"})