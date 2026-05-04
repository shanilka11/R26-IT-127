import os
import json
from utils.evaluation_summary import build_evaluation_summary


BASE = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE, '..', 'sri_lanka_railway_dataset.csv')
MODEL_DIR = os.path.join(BASE, 'saved_models')


def main():
    res = build_evaluation_summary(DATA_PATH, MODEL_DIR, n_test_days=3)
    out_path = os.path.join(BASE, 'evaluation_summary_output.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(res, f, indent=2)
    print(json.dumps({
        'best_model': res['best_model'],
        'hybrid_mae_improvement_pct': res['improvements']['hybrid_mae_improvement_pct'],
        'hybrid_rmse_improvement_pct': res['improvements']['hybrid_rmse_improvement_pct'],
        'seat_utilization_increase_pct': res['improvements']['seat_utilization_increase_pct'],
        'summary_report': res['summary_report'],
    }, indent=2))


if __name__ == '__main__':
    main()
