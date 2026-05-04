import os
import pickle
import numpy as np
from typing import Tuple

def train_baseline(ts, model_path):
    """Train a baseline forecasting model. Tries Prophet, falls back to ARIMA."""
    try:
        from prophet import Prophet
        df = ts.reset_index()
        df.columns = ['ds', 'y']
        m = Prophet()
        m.fit(df)
        with open(model_path, 'wb') as f:
            pickle.dump(('prophet', m), f)
        return ('prophet', m)
    except Exception:
        # Fallback to ARIMA
        try:
            from statsmodels.tsa.arima.model import ARIMA
            model = ARIMA(ts, order=(5,1,0)).fit()
            with open(model_path, 'wb') as f:
                pickle.dump(('arima', model), f)
            return ('arima', model)
        except Exception as e:
            raise RuntimeError('No baseline model available: ' + str(e))


def predict_baseline(model_tuple, periods: int):
    kind, model = model_tuple
    if kind == 'prophet':
        import pandas as pd
        future = model.make_future_dataframe(periods=periods)
        forecast = model.predict(future)
        return forecast['yhat'].values[-periods:]
    elif kind == 'arima':
        forecast = model.forecast(steps=periods)
        return np.array(forecast)
    else:
        raise ValueError('Unknown baseline model')
