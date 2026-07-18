import joblib
import numpy as np
from tensorflow import keras

class DelayLstmService:
    def __init__(self, model_path, scaler_path):
        self.model = keras.models.load_model(model_path)
        self.scaler = joblib.load(scaler_path)

    def predict(self, sequence):
        arr = np.array([[x.get("speedKmh", 0), x.get("observedDelayMin", 0)] for x in sequence], dtype=float)
        arr = self.scaler.transform(arr)
        arr = arr.reshape(1, arr.shape[0], arr.shape[1])
        pred = float(self.model.predict(arr, verbose=0)[0][0])
        prob = max(0.0, min(1.0, pred / 30.0))
        return {
            "predictedDelayMin": round(pred, 2),
            "probabilityDelayed": round(prob, 4),
            "confidenceLow": round(max(0.0, pred - 3.5), 2),
            "confidenceHigh": round(pred + 3.5, 2)
        }
