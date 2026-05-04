import numpy as np
import matplotlib.pyplot as plt
import os
from sklearn.metrics import mean_absolute_error


def mae(y_true, y_pred):
    return mean_absolute_error(y_true, y_pred)


def rmse(y_true, y_pred):
    return np.sqrt(np.mean((np.array(y_true) - np.array(y_pred)) ** 2))


def mape(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0
    if mask.sum() == 0:
        return np.nan
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100


def plot_actual_vs_predicted(ts_index, y_true, y_pred, out_path):
    plt.figure(figsize=(10, 5))
    plt.plot(ts_index, y_true, label='Actual')
    plt.plot(ts_index, y_pred, label='Predicted')
    plt.legend()
    plt.tight_layout()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    plt.savefig(out_path)
    plt.close()
