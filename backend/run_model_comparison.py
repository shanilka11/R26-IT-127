import os
import json
from utils.model_comparison import compare_models

BASE = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE, '..', 'sri_lanka_railway_dataset.csv')
MODEL_DIR = os.path.join(BASE, 'saved_models')

def main():
    res = compare_models(DATA_PATH, MODEL_DIR, n_test_days=5)
    out_path = os.path.join(BASE, 'model_comparison_output.json')
    with open(out_path, 'w') as f:
        json.dump(res, f, indent=2)
    print('Wrote', out_path)

if __name__ == '__main__':
    main()
