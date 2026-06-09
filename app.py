import json

from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename

from config import PROVIDERS, MODELS, ALLOWED_EXTENSIONS
from counter import MODEL_LIMITS
from services import analyze_files, analyze_conversation

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB


def _allowed_file(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in ALLOWED_EXTENSIONS


@app.context_processor
def inject_globals():
    return {
        "providers": PROVIDERS,
        "models": MODELS,
        "model_limits": MODEL_LIMITS,
        "allowed_extensions": ALLOWED_EXTENSIONS,
    }


@app.route("/")
def index():
    return render_template("input.html")


@app.route("/input")
def input_mode():
    return render_template("input.html")


@app.route("/chat")
def chat_mode():
    return render_template("chat.html")


@app.route("/api/analyze/files", methods=["POST"])
def api_analyze_files():
    provider = request.form.get("provider", "Universal Mode")
    model = request.form.get("model", MODELS[provider][0])
    uploaded = request.files.getlist("files")

    file_list = []
    for f in uploaded:
        if f and f.filename and _allowed_file(f.filename):
            file_list.append((secure_filename(f.filename), f.read()))

    if not file_list:
        return jsonify({"error": "No valid files uploaded."}), 400

    try:
        result = analyze_files(file_list, provider, model)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyze/chat", methods=["POST"])
def api_analyze_chat():
    provider = request.form.get("provider", "Standard Estimate")
    model = request.form.get("model", MODELS[provider][0])

    try:
        conversation = json.loads(request.form.get("conversation", "[]"))
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid conversation data."}), 400

    if not conversation:
        return jsonify({"error": "Conversation is empty. Add at least one message."}), 400

    uploaded_files = request.files.getlist("files")
    file_map = {}
    for f in uploaded_files:
        if f and f.filename:
            key = f.filename
            file_map[key] = f.read()

    messages = []
    for msg in conversation:
        role = msg.get("role", "user")
        text = msg.get("text", "")
        files = []
        for ref in msg.get("file_refs", []):
            if ref in file_map:
                files.append((secure_filename(ref), file_map[ref]))
        if text.strip() or files:
            messages.append({"role": role, "text": text, "files": files})

    if not messages:
        return jsonify({"error": "No content to count."}), 400

    try:
        result = analyze_conversation(messages, provider, model)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5050)
