import os
from flask import Flask, request, jsonify
from lstm_model import DelayLstmService

app = Flask(__name__)
MODEL = os.path.join(os.path.dirname(__file__), "..", "model", "lstm_delay.keras")
SCALER = os.path.join(os.path.dirname(__file__), "..", "model", "scaler.pkl")

service = None
if os.path.exists(MODEL) and os.path.exists(SCALER):
    service = DelayLstmService(MODEL, SCALER)

@app.get("/health")
def health():
    return jsonify({"ok": True, "modelLoaded": service is not None})

@app.post("/predict")
def predict():
    global service
    if service is None:
        return jsonify({"message": "Model not trained. Run train.py first."}), 400
    data = request.get_json(force=True)
    sequence = data.get("sequence", [])
    if not sequence:
        return jsonify({"message": "sequence is required"}), 400
    return jsonify(service.predict(sequence))

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
