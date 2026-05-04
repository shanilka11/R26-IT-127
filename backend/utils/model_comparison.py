import os
import json
import pickle
import numpy as np
import pandas as pd
from typing import Dict

try:
    from .data_pipeline import load_dataset, preprocess
    from .eval import mae, rmse, mape
    from ..models.arima_prophet import train_baseline, predict_baseline
    from ..models.lstm_model import train_lstm, predict_lstm, load_lstm_bundle
    from ..models.gnn_pyg import train_gcn_pyg, predict_gcn_pyg
except ImportError:
    from utils.data_pipeline import load_dataset, preprocess
    from utils.eval import mae, rmse, mape
    from models.arima_prophet import train_baseline, predict_baseline
    from models.lstm_model import train_lstm, predict_lstm, load_lstm_bundle
    from models.gnn_pyg import train_gcn_pyg, predict_gcn_pyg


def compare_models(csv_path: str, model_dir: str, n_test_days: int = 7, seq_len: int = 14, device='cpu', use_cached: bool = False) -> Dict:
    df = load_dataset(csv_path)
    df = preprocess(df)

    # ensure date_only column
    df['date_only'] = df['DateTime'].dt.date
    dates = sorted(df['date_only'].unique())
    if len(dates) < n_test_days + 1:
        n_test_days = max(1, len(dates) // 4)

    test_dates = dates[-n_test_days:]

    actuals = []
    preds_baseline = []
    preds_lstm = []
    preds_gnn = []
    preds_hybrid = []

    for d in test_dates:
        # split
        df_train = df[df['date_only'] < d].copy()
        df_test = df[df['date_only'] == d].copy()

        # actual total demand on day d
        actual = float(df_test['Passenger_Count'].sum())
        actuals.append(actual)

        # Baseline: train on daily totals up to day-1
        train_series = df_train.set_index('DateTime').resample('D')['Passenger_Count'].sum()
        if len(train_series) < 3:
            # fallback: use mean
            pred_b = float(train_series.mean() if len(train_series) > 0 else 0.0)
        else:
            # If use_cached and a global baseline exists, try to use it
            model_path = os.path.join(model_dir, f'baseline_{d}.pkl')
            if use_cached:
                arima_path = os.path.join(model_dir, 'arima.pkl')
                if os.path.exists(arima_path):
                    with open(arima_path, 'rb') as f:
                        arima_model = pickle.load(f)
                    pred_arr = arima_model.forecast(steps=1)
                    pred_b = float(pred_arr[0])
                else:
                    pred_b = float(train_series.tail(1).values[0])
            else:
                model_tuple = train_baseline(train_series, model_path)
                pred_arr = predict_baseline(model_tuple, periods=1)
                pred_b = float(pred_arr[0])
        preds_baseline.append(pred_b)

        # LSTM: train on daily totals
        arr = train_series.values.astype(float)
        if len(arr) < 5:
            pred_l = pred_b
        else:
            model_path = os.path.join(model_dir, f'lstm_{d}.pth')
            # adjust seq_len if too long
            seq = min(seq_len, max(3, len(arr)//2))
            if use_cached:
                cached_path = os.path.join(model_dir, 'lstm.pth')
                scaler_path = os.path.join(model_dir, 'scaler.pkl')
                if os.path.exists(cached_path):
                    model, scaler, cached_seq_len = load_lstm_bundle(cached_path, scaler_path=scaler_path)
                    seq = min(seq, cached_seq_len)
                    pred_arr = predict_lstm(model, arr, seq_len=seq, n_steps=1, scaler=scaler)
                    pred_l = float(pred_arr[0])
                else:
                    pred_l = pred_b
            else:
                model = train_lstm(arr, model_path, seq_len=seq, epochs=10)
                pred_arr = predict_lstm(model, arr, seq_len=seq, n_steps=1)
                pred_l = float(pred_arr[0])
        preds_lstm.append(pred_l)

        # GNN: train on df_train and predict day d by passing df_test
        model_path = os.path.join(model_dir, f'gnn_{d}.pkl')
        try:
            if use_cached:
                cached_path = os.path.join(model_dir, 'gnn.pkl')
                if os.path.exists(cached_path):
                    pred_gnn_dict = predict_gcn_pyg(cached_path, df_test, device=device)
                    pred_g = float(sum(pred_gnn_dict.values()))
                else:
                    pred_g = pred_b
            else:
                _, stations, pred_dict, _ = train_gcn_pyg(df_train, model_path, epochs=20, device=device)
                pred_gnn_dict = predict_gcn_pyg(model_path, df_test, device=device)
                pred_g = float(sum(pred_gnn_dict.values()))
        except Exception:
            pred_g = pred_b
        preds_gnn.append(pred_g)

        # Hybrid: simple weighted combine of LSTM (temporal) and GNN (spatial)
        alpha = 0.7
        pred_h = alpha * pred_l + (1 - alpha) * pred_g
        preds_hybrid.append(pred_h)

    # compute metrics
    results = {}
    methods = {
        'Baseline': preds_baseline,
        'LSTM': preds_lstm,
        'GNN': preds_gnn,
        'Hybrid': preds_hybrid,
    }

    for name, preds in methods.items():
        results[name] = {
            'MAE': mae(actuals, preds),
            'RMSE': rmse(actuals, preds),
            'MAPE': mape(actuals, preds),
        }

    # dataframe summary
    df_res = pd.DataFrame(results).T.reset_index().rename(columns={'index': 'model'})

    out = {
        'metrics': results,
        'table': df_res.to_dict(orient='records'),
        'per_day': {
            'dates': [str(d) for d in test_dates],
            'actuals': actuals,
            'baseline': preds_baseline,
            'lstm': preds_lstm,
            'gnn': preds_gnn,
            'hybrid': preds_hybrid,
        }
    }

    return out
