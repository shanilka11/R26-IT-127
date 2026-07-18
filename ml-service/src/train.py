import os
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler
from tensorflow import keras

DATA = os.path.join(os.path.dirname(__file__), "..", "data", "train_history.csv")
MODEL = os.path.join(os.path.dirname(__file__), "..", "model", "lstm_delay.keras")
SCALER = os.path.join(os.path.dirname(__file__), "..", "model", "scaler.pkl")

os.makedirs(os.path.dirname(MODEL), exist_ok=True)

if not os.path.exists(DATA):
    rows = []
    for _ in range(3000):
        speed = np.random.uniform(20, 80)
        delay = max(0, np.random.normal(8, 6))
        target = max(0, 0.35 * delay + (60 - speed) * 0.25 + np.random.normal(0, 2))
        rows.append([speed, delay, target])
    pd.DataFrame(rows, columns=["speedKmh", "observedDelayMin", "targetDelayMin"]).to_csv(DATA, index=False)

_df = pd.read_csv(DATA)
if len(_df) < 64:
    extra = []
    for _ in range(1000):
        speed = np.random.uniform(20, 80)
        delay = max(0, np.random.normal(8, 6))
        target = max(0, 0.35 * delay + (60 - speed) * 0.25 + np.random.normal(0, 2))
        extra.append([speed, delay, target])
    _extra = pd.DataFrame(extra, columns=["speedKmh", "observedDelayMin", "targetDelayMin"])
    _df = pd.concat([_df, _extra], ignore_index=True)

X = _df[["speedKmh", "observedDelayMin"]].values
y = _df["targetDelayMin"].values

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
joblib.dump(scaler, SCALER)

seq_len = 12
X_seq, y_seq = [], []
for i in range(seq_len, len(X_scaled)):
    X_seq.append(X_scaled[i - seq_len:i])
    y_seq.append(y[i])
X_seq, y_seq = np.array(X_seq), np.array(y_seq)

model = keras.Sequential([
    keras.layers.Input(shape=(seq_len, 2)),
    keras.layers.LSTM(32),
    keras.layers.Dense(16, activation="relu"),
    keras.layers.Dense(1)
])
model.compile(optimizer="adam", loss="mse")
model.fit(X_seq, y_seq, epochs=8, batch_size=32, verbose=1)
model.save(MODEL)
print("Model saved:", MODEL)
