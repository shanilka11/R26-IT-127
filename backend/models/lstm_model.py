import os
import pickle
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import StandardScaler


class LSTMModel(nn.Module):
    def __init__(self, input_size=1, hidden_size=64, num_layers=2, out_size=1):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, out_size)

    def forward(self, x):
        out, _ = self.lstm(x)
        out = out[:, -1, :]
        return self.fc(out)


def create_sequences(data, seq_len=24):
    xs, ys = [], []
    for i in range(len(data) - seq_len):
        xs.append(data[i:i+seq_len])
        ys.append(data[i+seq_len])
    return np.array(xs), np.array(ys)


def _build_series_scaler(series):
    scaler = StandardScaler()
    values = np.array(series, dtype=float).reshape(-1, 1)
    scaler.fit(values)
    return scaler


def save_lstm_bundle(model_path, model, scaler, seq_len, scaler_path=None):
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    payload = {
        'state_dict': model.state_dict(),
        'seq_len': int(seq_len),
    }
    with open(model_path, 'wb') as f:
        pickle.dump(payload, f)

    if scaler_path:
        os.makedirs(os.path.dirname(scaler_path), exist_ok=True)
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
    else:
        # Backward-compatible path when no explicit scaler file is provided.
        payload['scaler'] = scaler
        with open(model_path, 'wb') as f:
            pickle.dump(payload, f)


def load_lstm_bundle(model_path, device='cpu', scaler_path=None):
    with open(model_path, 'rb') as f:
        payload = pickle.load(f)

    model = LSTMModel().to(device)
    scaler = None
    seq_len = 24

    if isinstance(payload, dict) and 'state_dict' in payload:
        model.load_state_dict(payload['state_dict'])
        scaler = payload.get('scaler')
        seq_len = int(payload.get('seq_len', seq_len))
    else:
        # Backward compatibility with older checkpoints that only stored the raw state_dict.
        model.load_state_dict(payload)

    if scaler_path and os.path.exists(scaler_path):
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)

    return model, scaler, seq_len


def train_lstm(series, model_path, seq_len=24, epochs=20, batch_size=32, lr=1e-3, device='cpu', scaler_path=None):
    arr = np.array(series).astype(float)
    if arr.size < 2:
        raise ValueError('LSTM training requires at least two observations')
    seq_len = max(1, min(int(seq_len), arr.size - 1))
    scaler = _build_series_scaler(arr)
    scaled = scaler.transform(arr.reshape(-1, 1)).squeeze()

    X, y = create_sequences(scaled, seq_len)
    X = X.reshape((-1, seq_len, 1))
    y = y.reshape((-1, 1))

    ds = TensorDataset(torch.tensor(X, dtype=torch.float32), torch.tensor(y, dtype=torch.float32))
    dl = DataLoader(ds, batch_size=batch_size, shuffle=True)

    model = LSTMModel()
    model.to(device)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()

    for epoch in range(epochs):
        model.train()
        for xb, yb in dl:
            xb, yb = xb.to(device), yb.to(device)
            pred = model(xb)
            loss = loss_fn(pred, yb)
            opt.zero_grad()
            loss.backward()
            opt.step()

    save_lstm_bundle(model_path, model, scaler, seq_len, scaler_path=scaler_path)
    return model


def predict_lstm(model, history, seq_len=24, n_steps=7, device='cpu', scaler=None):
    model.eval()
    preds = []
    history_arr = np.array(history, dtype=float).reshape(-1, 1)

    if history_arr.shape[0] < 2:
        raise ValueError('LSTM prediction requires at least two observations')

    if scaler is None:
        scaler = _build_series_scaler(history_arr)

    scaled_history = scaler.transform(history_arr).squeeze()
    seq_len = max(1, min(int(seq_len), scaled_history.shape[0]))
    cur = scaled_history[-seq_len:].reshape(1, seq_len, 1)
    with torch.no_grad():
        for _ in range(n_steps):
            t = torch.tensor(cur, dtype=torch.float32).to(device)
            out_scaled = model(t).cpu().numpy().ravel()[0]
            out_real = scaler.inverse_transform(np.array([[out_scaled]])).ravel()[0]
            preds.append(out_real)
            # roll
            cur = np.roll(cur, -1)
            cur[0, -1, 0] = out_scaled
    return np.array(preds)
