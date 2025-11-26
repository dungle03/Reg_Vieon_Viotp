from flask import Flask, render_template, jsonify, request
from viotp import ViotpAPI
import os

app = Flask(__name__)


# Helper to get API instance from request token
def get_api():
    token = request.args.get("token")
    if not token:
        return None
    return ViotpAPI(token)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/balance")
def get_balance():
    api = get_api()
    if not api:
        return jsonify({"success": False, "message": "Token is required"}), 400
    return jsonify(api.get_balance())


@app.route("/api/networks")
def get_networks():
    api = get_api()
    if not api:
        return jsonify({"success": False, "message": "Token is required"}), 400
    return jsonify(api.get_networks())


@app.route("/api/services")
def get_services():
    api = get_api()
    if not api:
        return jsonify({"success": False, "message": "Token is required"}), 400
    country = request.args.get("country", "vn")
    return jsonify(api.get_services(country))


@app.route("/api/request")
def request_service():
    api = get_api()
    if not api:
        return jsonify({"success": False, "message": "Token is required"}), 400

    service_id = request.args.get("serviceId")
    network = request.args.get("network")
    prefix = request.args.get("prefix")
    except_prefix = request.args.get("exceptPrefix")
    number = request.args.get("number")
    country = request.args.get("country", "vn")

    if not service_id:
        return jsonify({"success": False, "message": "Service ID is required"}), 400

    return jsonify(
        api.request_service(service_id, network, prefix, except_prefix, number, country)
    )


@app.route("/api/session")
def get_session():
    api = get_api()
    if not api:
        return jsonify({"success": False, "message": "Token is required"}), 400

    request_id = request.args.get("requestId")
    if not request_id:
        return jsonify({"success": False, "message": "Request ID is required"}), 400

    return jsonify(api.get_session(request_id))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
