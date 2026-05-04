import numpy as np


def combine_predictions(pred_lstm, pred_gnn, alpha=0.7):
    """Combine LSTM and GNN predictions with a weighted average.

    The default research formula is:
        hybrid = 0.7 * lstm + 0.3 * gnn

    pred_gnn may be a numeric sequence or a dict of station->demand.
    When a dict is provided, the GNN signal is reduced to its mean demand.
    """
    lstm_arr = np.asarray(pred_lstm, dtype=float).reshape(-1)

    if isinstance(pred_gnn, dict):
        gnn_signal = float(np.mean(list(pred_gnn.values()))) if pred_gnn else 0.0
        gnn_arr = np.full(lstm_arr.shape, gnn_signal, dtype=float)
    else:
        gnn_arr = np.asarray(pred_gnn, dtype=float).reshape(-1)
        if gnn_arr.size == 1 and lstm_arr.size > 1:
            gnn_arr = np.repeat(gnn_arr, lstm_arr.size)
        elif gnn_arr.size != lstm_arr.size:
            gnn_arr = np.resize(gnn_arr, lstm_arr.size)

    return alpha * lstm_arr + (1.0 - alpha) * gnn_arr
