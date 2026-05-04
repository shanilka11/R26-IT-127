import os
import pickle
import numpy as np
import torch
import torch.nn as nn
from sklearn.preprocessing import StandardScaler
import pandas as pd

try:
    from torch_geometric.data import Data
    from torch_geometric.nn import GCNConv
    TORCH_GEOMETRIC_AVAILABLE = True
except Exception:
    Data = None
    GCNConv = None
    TORCH_GEOMETRIC_AVAILABLE = False


def _require_torch_geometric():
    if not TORCH_GEOMETRIC_AVAILABLE:
        raise ImportError(
            'torch_geometric is required for GNN functionality. Install it following the instructions at https://pytorch-geometric.readthedocs.io/en/latest/notes/installation.html.'
        )


def build_graph_from_df(df):
    """Construct graph nodes, edge_index, node features and targets from dataframe.
    Expects columns: Origin, Destination, Passenger_Count
    Node features: [total_demand, in_degree, out_degree]
    Target: total_demand (sum of passenger counts touching the node)
    Returns: nodes(list), edge_index(torch.LongTensor [2, E]), x(np.array [N, F]), y(np.array [N])
    """
    df = df.copy()
    if not set(['Origin', 'Destination', 'Passenger_Count']).issubset(df.columns):
        raise ValueError('Dataframe must contain Origin, Destination, Passenger_Count columns')

    # Normalize passenger count
    try:
        df['Passenger_Count'] = pd.to_numeric(df['Passenger_Count'], errors='coerce').fillna(0).astype(float)
    except Exception:
        df['Passenger_Count'] = df['Passenger_Count'].astype(float)

    stations = sorted(list(set(df['Origin'].unique()).union(set(df['Destination'].unique()))))
    idx = {s: i for i, s in enumerate(stations)}

    # edges
    edges = df[['Origin', 'Destination']].drop_duplicates().values.tolist()
    if len(edges) == 0:
        edge_index = torch.zeros((2, 0), dtype=torch.long)
    else:
        src = [idx[o] for o, d in edges]
        dst = [idx[d] for o, d in edges]
        edge_index = torch.tensor([src, dst], dtype=torch.long)

    # aggregate passenger counts per station (as origin + destination)
    total_demand = {s: 0.0 for s in stations}
    in_degree = {s: 0 for s in stations}
    out_degree = {s: 0 for s in stations}

    for _, row in df.iterrows():
        o = row['Origin']
        d = row['Destination']
        c = float(row['Passenger_Count'])
        if o in total_demand:
            total_demand[o] += c
            out_degree[o] += 1
        if d in total_demand:
            total_demand[d] += c
            in_degree[d] += 1

    # build feature matrix
    x = np.zeros((len(stations), 3), dtype=float)
    y = np.zeros((len(stations),), dtype=float)
    for s, i in idx.items():
        x[i, 0] = total_demand[s]
        x[i, 1] = in_degree[s]
        x[i, 2] = out_degree[s]
        y[i] = total_demand[s]

    # simple normalization (log + scale)
    x[:, 0] = np.log1p(x[:, 0])
    y = np.log1p(y)

    return stations, edge_index, x.astype(np.float32), y.astype(np.float32)


class GCNNet(nn.Module):
    def __init__(self, in_channels, hidden_channels=64, out_channels=1, dropout=0.2):
        super().__init__()
        _require_torch_geometric()
        self.conv1 = GCNConv(in_channels, hidden_channels)
        self.conv2 = GCNConv(hidden_channels, hidden_channels)
        self.lin = nn.Linear(hidden_channels, out_channels)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = torch.relu(x)
        x = self.dropout(x)
        x = self.conv2(x, edge_index)
        x = torch.relu(x)
        x = self.lin(x)
        return x.squeeze()


def train_gcn_pyg(df, model_path, epochs=40, lr=1e-4, weight_decay=1e-5, hidden_channels=32, test_frac=0.2, device='cpu'):
    """Train GCN on station-level aggregated demand with stability improvements.
    Saves model, scalers and node mapping to model_path using pickle.
    Returns model, stations (list), pred_dict, actual_dict.
    """
    _require_torch_geometric()
    stations, edge_index, x_np, y_np = build_graph_from_df(df)

    # Normalize features and target using StandardScaler
    scaler_x = StandardScaler()
    x_scaled = scaler_x.fit_transform(x_np)

    scaler_y = StandardScaler()
    y_scaled = scaler_y.fit_transform(y_np.reshape(-1, 1)).squeeze()

    x = torch.tensor(x_scaled, dtype=torch.float32).to(device)
    y = torch.tensor(y_scaled, dtype=torch.float32).to(device)
    edge_index = edge_index.to(device)

    N = x.shape[0]
    indices = np.arange(N)
    np.random.shuffle(indices)
    split = int(N * (1 - test_frac))
    train_idx = torch.tensor(indices[:split], dtype=torch.long, device=device)
    test_idx = torch.tensor(indices[split:], dtype=torch.long, device=device)

    model = GCNNet(in_channels=x.shape[1], hidden_channels=hidden_channels).to(device)
    opt = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    loss_fn = nn.MSELoss()

    # early stopping params
    best_val = float('inf')
    patience = 5
    wait = 0

    for ep in range(1, epochs + 1):
        model.train()
        opt.zero_grad()
        out = model(x, edge_index)
        loss = loss_fn(out[train_idx], y[train_idx])
        loss.backward()
        # gradient clipping
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()

        # detect exploding loss
        if not np.isfinite(loss.item()):
            print(f"[GCN] Epoch {ep}: non-finite loss encountered ({loss.item()}); stopping.")
            break

        if ep % 5 == 0 or ep == 1:
            model.eval()
            with torch.no_grad():
                train_loss = float(loss_fn(out[train_idx], y[train_idx]).item())
                test_loss = float(loss_fn(out[test_idx], y[test_idx]).item()) if test_idx.numel() > 0 else 0.0
                # diagnostics: predictions (in scaled space)
                preds_scaled = out.cpu().numpy()
                # inverse scale to log1p space for diagnostics
                preds_log1p = scaler_y.inverse_transform(preds_scaled.reshape(-1, 1)).squeeze()
                preds_log1p_min = float(np.nanmin(preds_log1p))
                preds_log1p_max = float(np.nanmax(preds_log1p))
            print(f"[GCN] Epoch {ep}/{epochs} train_loss={train_loss:.6f} test_loss={test_loss:.6f} preds_log1p_min={preds_log1p_min:.4f} max={preds_log1p_max:.4f}")

            # early stopping on validation
            val_score = test_loss if test_idx.numel() > 0 else train_loss
            if val_score < best_val - 1e-6:
                best_val = val_score
                wait = 0
            else:
                wait += 1
                if wait >= patience:
                    print(f"[GCN] Early stopping at epoch {ep} (no improvement in {patience} checks)")
                    break

    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    save_obj = {
        'stations': stations,
        'state': model.state_dict(),
        'scaler_x': scaler_x,
        'scaler_y': scaler_y,
        'hidden_channels': hidden_channels,
    }
    with open(model_path, 'wb') as f:
        pickle.dump(save_obj, f)

    model.eval()
    with torch.no_grad():
        preds_scaled = model(x, edge_index).cpu().numpy()

    # preds_scaled -> inverse scale to log1p, clip, then expm1
    preds_log1p = scaler_y.inverse_transform(preds_scaled.reshape(-1, 1)).squeeze()
    preds_log1p = np.clip(preds_log1p, 0, 9.0)
    preds_exp = np.expm1(preds_log1p)
    preds_exp = np.nan_to_num(preds_exp, nan=0.0, posinf=1e6, neginf=0.0)

    # actuals: y_np is already log1p in build_graph; but we inverse-transform via scaler to be consistent
    actual_log1p = scaler_y.inverse_transform(y.cpu().numpy().reshape(-1, 1)).squeeze()
    actual_exp = np.expm1(actual_log1p)
    actual_exp = np.nan_to_num(actual_exp, nan=0.0, posinf=1e6, neginf=0.0)

    pred_dict = {s: float(preds_exp[i]) for i, s in enumerate(stations)}
    actual_dict = {s: float(actual_exp[i]) for i, s in enumerate(stations)}

    return model, stations, pred_dict, actual_dict


def predict_gcn_pyg(model_path, df=None, device='cpu'):
    """Load saved model and predict demand per station. If df provided, rebuild graph features from df; otherwise use saved mapping only (not recommended).
    Returns dict station->predicted_demand
    """
    _require_torch_geometric()
    if not os.path.exists(model_path):
        raise FileNotFoundError('Model file not found: ' + model_path)
    with open(model_path, 'rb') as f:
        obj = pickle.load(f)

    stations = obj.get('stations')
    state = obj.get('state')
    scaler_x = obj.get('scaler_x')
    scaler_y = obj.get('scaler_y')
    hidden_channels = obj.get('hidden_channels', None)
    if df is None:
        raise ValueError('Provide dataframe to rebuild node features for prediction')

    _stations, edge_index, x_np, y_np = build_graph_from_df(df)
    # ensure same station order
    if stations != _stations:
        # attempt to reorder or raise
        raise ValueError('Station ordering mismatch between saved model and provided dataframe')

    # use saved scalers to transform features
    if scaler_x is None or scaler_y is None:
        raise ValueError('Saved model is missing scalers')

    if hidden_channels is None:
        for key, tensor in state.items():
            if key.endswith('lin.weight') and hasattr(tensor, 'shape') and len(tensor.shape) == 2:
                hidden_channels = int(tensor.shape[0])
                break
        if hidden_channels is None:
            hidden_channels = 32

    x_scaled = scaler_x.transform(x_np)
    x = torch.tensor(x_scaled, dtype=torch.float32).to(device)
    edge_index = edge_index.to(device)

    model = GCNNet(in_channels=x.shape[1], hidden_channels=int(hidden_channels)).to(device)
    model.load_state_dict(state)
    model.eval()
    with torch.no_grad():
        preds_scaled = model(x, edge_index).cpu().numpy()

    # inverse scale to log1p
    preds_log1p = scaler_y.inverse_transform(preds_scaled.reshape(-1, 1)).squeeze()
    preds_log1p = np.clip(preds_log1p, 0, 9.0)
    preds_exp = np.expm1(preds_log1p)
    preds_exp = np.nan_to_num(preds_exp, nan=0.0, posinf=1e6, neginf=0.0)

    return {s: float(preds_exp[i]) for i, s in enumerate(stations)}
