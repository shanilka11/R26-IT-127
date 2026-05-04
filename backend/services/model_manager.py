import os
import pickle
import threading
import time
import logging
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from prophet import Prophet

try:
    from ..utils.data_pipeline import load_dataset, preprocess, create_od_demand_matrix
    from ..models.lstm_model import train_lstm, predict_lstm, load_lstm_bundle
    from ..models.gnn_pyg import train_gcn_pyg, predict_gcn_pyg
    from ..models.hybrid_model import combine_predictions
    from ..utils.model_comparison import compare_models
except ImportError:
    from utils.data_pipeline import load_dataset, preprocess, create_od_demand_matrix
    from models.lstm_model import train_lstm, predict_lstm, load_lstm_bundle
    from models.gnn_pyg import train_gcn_pyg, predict_gcn_pyg
    from models.hybrid_model import combine_predictions
    from utils.model_comparison import compare_models


logger = logging.getLogger('railway_ai')


class ModelManager:
    def __init__(self, data_path: str, saved_models_dir: str):
        self.data_path = data_path
        self.saved_models_dir = saved_models_dir
        self.models: Dict[str, Any] = {}
        self._lock = threading.Lock()
        self._data_cache: Dict[str, Any] = {'mtime': None, 'df': None, 'pivot': None}
        self._comparison_cache: Dict[Tuple[Any, int], Dict[str, Any]] = {}
        self._comparison_cache_ttl_sec = 600
        self._predict_cache: Dict[Tuple[str, int], Dict[str, Any]] = {}
        self._predict_cache_ttl_sec = 300

        os.makedirs(self.saved_models_dir, exist_ok=True)
        self.paths = {
            'arima': os.path.join(self.saved_models_dir, 'arima.pkl'),
            'prophet': os.path.join(self.saved_models_dir, 'prophet.pkl'),
            'lstm': os.path.join(self.saved_models_dir, 'lstm.pth'),
            'gnn': os.path.join(self.saved_models_dir, 'gnn.pkl'),
            'hybrid': os.path.join(self.saved_models_dir, 'hybrid.pkl'),
            'scaler': os.path.join(self.saved_models_dir, 'scaler.pkl'),
        }

    def _dataset_mtime(self):
        return os.path.getmtime(self.data_path) if os.path.exists(self.data_path) else None

    def _get_cached_data(self, force_refresh: bool = False):
        mtime = self._dataset_mtime()
        if force_refresh or self._data_cache['df'] is None or self._data_cache['mtime'] != mtime:
            if not os.path.exists(self.data_path):
                raise FileNotFoundError(f'Dataset not found: {self.data_path}')
            df = load_dataset(self.data_path)
            df = preprocess(df)
            pivot = create_od_demand_matrix(df, time_freq='D')
            self._data_cache.update({'mtime': mtime, 'df': df, 'pivot': pivot})
            logger.info('[MODEL_MANAGER] Dataset cache refreshed')
        return self._data_cache['df'], self._data_cache['pivot']

    def _all_model_files_exist(self) -> bool:
        return all(os.path.exists(path) for path in self.paths.values())

    def load_or_train_models(self):
        with self._lock:
            logger.info('[MODEL_MANAGER] Initializing models')
            self._get_cached_data(force_refresh=True)
            if self._all_model_files_exist():
                logger.info('[MODEL_MANAGER] All model files exist, loading from disk')
                self._load_all_models()
            else:
                logger.info('[MODEL_MANAGER] Missing model files, training all models once')
                self._train_all_models()
                self._load_all_models()

    def _train_all_models(self):
        df, pivot = self._get_cached_data(force_refresh=False)
        if pivot.empty:
            raise ValueError('Cannot train models because OD pivot is empty')

        ts = pivot.iloc[:, 0].astype(float)

        self._train_arima(ts)
        self._train_prophet(ts)
        self._train_lstm(ts)
        self._train_gnn(df)
        self._train_hybrid()

        logger.info('[MODEL_MANAGER] All models trained and persisted')

    def _load_all_models(self):
        with open(self.paths['arima'], 'rb') as f:
            self.models['arima'] = pickle.load(f)

        with open(self.paths['prophet'], 'rb') as f:
            self.models['prophet'] = pickle.load(f)

        lstm_model, scaler, seq_len = load_lstm_bundle(self.paths['lstm'], scaler_path=self.paths['scaler'])
        self.models['lstm'] = {
            'model': lstm_model,
            'scaler': scaler,
            'seq_len': int(seq_len),
        }
        self.models['scaler'] = scaler

        with open(self.paths['gnn'], 'rb') as f:
            self.models['gnn'] = pickle.load(f)

        with open(self.paths['hybrid'], 'rb') as f:
            self.models['hybrid'] = pickle.load(f)

        logger.info('[MODEL_MANAGER] Models loaded into memory cache')

    def _train_arima(self, ts: pd.Series):
        logger.info('[MODEL_MANAGER] Training ARIMA model')
        arima_model = ARIMA(ts, order=(5, 1, 0)).fit()
        with open(self.paths['arima'], 'wb') as f:
            pickle.dump(arima_model, f)

    def _train_prophet(self, ts: pd.Series):
        logger.info('[MODEL_MANAGER] Training Prophet model')
        prophet_df = ts.reset_index()
        prophet_df.columns = ['ds', 'y']
        prophet_model = Prophet()
        prophet_model.fit(prophet_df)
        with open(self.paths['prophet'], 'wb') as f:
            pickle.dump(prophet_model, f)

    def _train_lstm(self, ts: pd.Series):
        logger.info('[MODEL_MANAGER] Training LSTM model')
        train_lstm(
            ts.values,
            self.paths['lstm'],
            scaler_path=self.paths['scaler'],
            epochs=20,
        )

    def _train_gnn(self, df: pd.DataFrame):
        logger.info('[MODEL_MANAGER] Training GNN model')
        train_gcn_pyg(df, self.paths['gnn'], epochs=150)

    def _train_hybrid(self):
        logger.info('[MODEL_MANAGER] Saving hybrid ensemble metadata')
        hybrid_payload = {
            'name': 'hybrid_lstm_gnn',
            'alpha': 0.7,
            'components': ['lstm', 'gnn'],
            'trained_at': time.time(),
        }
        with open(self.paths['hybrid'], 'wb') as f:
            pickle.dump(hybrid_payload, f)

    def get_model(self, name: str):
        if name not in self.models:
            raise KeyError(f'Model {name} is not loaded')
        return self.models[name]

    def predict_arima(self, periods: int):
        model = self.get_model('arima')
        out = model.forecast(steps=periods)
        return np.asarray(out, dtype=float)

    def predict_prophet(self, periods: int):
        model = self.get_model('prophet')
        _, pivot = self._get_cached_data(force_refresh=False)
        ts = pivot.iloc[:, 0].astype(float)
        hist_df = ts.reset_index()
        hist_df.columns = ['ds', 'y']
        # Prophet model already fit; use future dataframe from history horizon length
        future = model.make_future_dataframe(periods=periods)
        forecast = model.predict(future)
        return forecast['yhat'].values[-periods:].astype(float)

    def predict_lstm(self, periods: int):
        # caching key
        key = ('lstm', int(periods))
        now = time.time()
        cached = self._predict_cache.get(key)
        if cached and (now - float(cached.get('created_at', 0))) < self._predict_cache_ttl_sec:
            logger.info('[MODEL_MANAGER] Returning cached LSTM predictions')
            return np.asarray(cached['preds'], dtype=float)

        lstm_bundle = self.get_model('lstm')
        _, pivot = self._get_cached_data(force_refresh=False)
        history = pivot.iloc[:, 0].astype(float).values
        seq_len = int(lstm_bundle.get('seq_len', 24))
        if len(history) < max(2, seq_len):
            # Safe fallback using latest observations
            recent = history[-max(1, periods):].tolist() if len(history) > 0 else [0.0]
            if len(recent) < periods:
                recent += [float(recent[-1])] * (periods - len(recent))
            return np.asarray(recent[:periods], dtype=float)

        preds = predict_lstm(
            lstm_bundle['model'],
            history,
            seq_len=seq_len,
            n_steps=periods,
            scaler=lstm_bundle.get('scaler'),
        )
        pred_min = float(np.min(preds)) if len(preds) > 0 else float('nan')
        pred_max = float(np.max(preds)) if len(preds) > 0 else float('nan')
        logger.info(f'[MODEL_MANAGER] LSTM prediction min={pred_min:.2f} max={pred_max:.2f}')
        # cache prediction
        self._predict_cache[key] = {'created_at': now, 'preds': preds.tolist()}
        return np.asarray(preds, dtype=float)

    def get_forecast_bundle(self, model: str = 'lstm', periods: int = 7):
        # returns labels, actual, predicted, model name
        _, pivot = self._get_cached_data(force_refresh=False)
        labels = [idx.strftime('%Y-%m-%d') for idx in pivot.index[-periods:]]
        actual = [float(v) for v in pivot.iloc[:, 0].tail(periods).values]
        model = model.lower()
        if model == 'lstm':
            preds = self.predict_lstm(periods)
            predicted = [float(v) for v in preds.tolist()]
        elif model == 'gnn':
            preds_dict = self.predict_gnn()
            total = float(sum(preds_dict.values())) if preds_dict else 0.0
            predicted = [total for _ in range(periods)]
        elif model == 'hybrid':
            preds = self.predict_hybrid(periods)
            predicted = [float(v) for v in preds.tolist()]
        elif model in ('arima', 'prophet'):
            if model == 'arima':
                preds = self.predict_arima(periods)
            else:
                preds = self.predict_prophet(periods)
            predicted = [float(v) for v in preds.tolist()]
        else:
            predicted = [0.0 for _ in range(periods)]

        return {
            'labels': labels,
            'actual': actual,
            'predicted': predicted,
            'model': model,
        }

    def predict_gnn(self):
        df, _ = self._get_cached_data(force_refresh=False)
        pred_dict = predict_gcn_pyg(self.paths['gnn'], df)
        return pred_dict

    def predict_hybrid(self, periods: int):
        hybrid_cfg = self.get_model('hybrid')
        alpha = float(hybrid_cfg.get('alpha', 0.7))
        lstm_preds = self.predict_lstm(periods)
        gnn_preds = self.predict_gnn()
        gnn_total = float(sum(gnn_preds.values())) if isinstance(gnn_preds, dict) else 0.0
        hybrid = combine_predictions(lstm_preds, [gnn_total], alpha=alpha)
        return np.asarray(hybrid, dtype=float)

    def get_comparison_cached(self, n_test_days: int = 7):
        key = (self._dataset_mtime(), int(n_test_days))
        now = time.time()
        cached = self._comparison_cache.get(key)
        if cached and (now - float(cached['created_at'])) < self._comparison_cache_ttl_sec:
            logger.info('[MODEL_MANAGER] Returning cached model comparison')
            return cached['payload']

        logger.info('[MODEL_MANAGER] Computing model comparison')
        payload = compare_models(self.data_path, self.saved_models_dir, n_test_days=n_test_days, use_cached=True)
        self._comparison_cache[key] = {'created_at': now, 'payload': payload}
        return payload

    def get_historical(self, periods: int):
        _, pivot = self._get_cached_data(force_refresh=False)
        ts = pivot.iloc[:, 0].tail(periods)
        labels = [idx.strftime('%Y-%m-%d') for idx in ts.index]
        values = [float(v) for v in ts.values]
        od = pivot.columns[0] if len(pivot.columns) > 0 else 'Unknown OD'
        return {'od': od, 'labels': labels, 'values': values}

    def get_route_demand(self, top_k: int = 8):
        df, _ = self._get_cached_data(force_refresh=False)
        tmp = df.copy()
        tmp['date_only'] = tmp['DateTime'].dt.date
        latest_date = tmp['date_only'].max()
        latest_df = tmp[tmp['date_only'] == latest_date]
        grouped = (
            latest_df.groupby(['Origin', 'Destination'])['Passenger_Count']
            .sum()
            .sort_values(ascending=False)
            .head(top_k)
        )

        routes = []
        for (origin, destination), demand_val in grouped.items():
            demand_int = int(demand_val)
            capacity = int(max(demand_int + 20, demand_int * 1.1))
            routes.append({
                'route': f'{origin}->{destination}',
                'demand': demand_int,
                'capacity': capacity,
            })

        return {'date': str(latest_date), 'routes': routes}
