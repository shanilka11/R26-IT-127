import os
import json
from models.gnn_pyg import train_gcn_pyg, predict_gcn_pyg
import pandas as pd


BASE = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE, '..', 'sri_lanka_railway_dataset.csv')
MODEL_PATH = os.path.join(BASE, 'saved_models', 'gnn_test.pkl')


def main():
    if not os.path.exists(DATA_PATH):
        print('Dataset not found at', DATA_PATH)
        return

    df = pd.read_csv(DATA_PATH)
    # normalize column names to expected
    if 'Origin_Station' in df.columns and 'Destination_Station' in df.columns:
        df = df.rename(columns={'Origin_Station': 'Origin', 'Destination_Station': 'Destination'})

    # Ensure required cols
    for c in ['Origin', 'Destination', 'Passenger_Count']:
        if c not in df.columns:
            print('Missing column in dataset:', c)
            return

    print('Starting quick GCN train (epochs=30)')
    model, stations, preds, actuals = train_gcn_pyg(df, MODEL_PATH, epochs=30)

    print('\nSample predictions (station: pred vs actual)')
    # ensure numeric and finite
    import numpy as np
    pred_vals = np.array([preds[s] for s in stations], dtype=float)
    actual_vals = np.array([actuals[s] for s in stations], dtype=float)
    pred_vals = np.nan_to_num(pred_vals, nan=0.0, posinf=1e6, neginf=0.0)
    actual_vals = np.nan_to_num(actual_vals, nan=0.0, posinf=1e6, neginf=0.0)

    count = 0
    for i, s in enumerate(stations):
        print(f"{s}: {pred_vals[i]:.1f}  (actual {actual_vals[i]:.1f})")
        count += 1
        if count >= 10:
            break

    print(f"\nPredictions min={float(pred_vals.min()):.1f} max={float(pred_vals.max()):.1f}")
    print(f"Actuals min={float(actual_vals.min()):.1f} max={float(actual_vals.max()):.1f}")

    # Save sample to json
    out = {'preds_sample': {s: preds[s] for s in stations[:10]}, 'actuals_sample': {s: actuals[s] for s in stations[:10]}}
    with open(os.path.join(BASE, 'gnn_test_output.json'), 'w') as f:
        json.dump(out, f, indent=2)

    print('\nWrote sample output to backend/gnn_test_output.json')


if __name__ == '__main__':
    main()
