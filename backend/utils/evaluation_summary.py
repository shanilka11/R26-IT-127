import os
import json
import numpy as np
import pandas as pd

try:
    from .data_pipeline import load_dataset, preprocess
    from .model_comparison import compare_models
    from ..optimization.allocate import allocate_seats
except ImportError:
    from utils.data_pipeline import load_dataset, preprocess
    from utils.model_comparison import compare_models
    from optimization.allocate import allocate_seats


def _safe_pct_improvement(baseline_value, improved_value):
    baseline_value = float(baseline_value)
    improved_value = float(improved_value)
    if baseline_value <= 0 or not np.isfinite(baseline_value) or not np.isfinite(improved_value):
        return 0.0
    return max(0.0, ((baseline_value - improved_value) / baseline_value) * 100.0)


def _build_static_allocation(route_rows):
    """Simple non-optimized baseline allocation.
    Equal seat share across routes, capped by route capacity.
    """
    if not route_rows:
        return []

    route_count = len(route_rows)
    total_capacity = sum(float(r.get('capacity', 0) or 0) for r in route_rows)
    equal_share = total_capacity / route_count if route_count else 0.0

    out = []
    for row in route_rows:
        demand = float(row.get('demand', 0) or 0)
        capacity = float(row.get('capacity', 0) or 0)
        allocated = min(capacity, equal_share)
        unmet = max(0.0, demand - allocated)
        out.append({
            'route': row.get('route'),
            'demand': demand,
            'capacity': capacity,
            'allocated': allocated,
            'unmet': unmet,
        })
    return out


def build_evaluation_summary(csv_path: str, model_dir: str, n_test_days: int = 7):
    comparison = compare_models(csv_path, model_dir, n_test_days=n_test_days, use_cached=True)
    metrics_df = pd.DataFrame(comparison['table'])

    if metrics_df.empty:
        raise ValueError('Model comparison returned no rows')

    # Normalize names coming from comparison table
    metrics_df['model_key'] = metrics_df['model'].astype(str).str.lower()
    metrics_lookup = {row['model_key']: row for _, row in metrics_df.iterrows()}

    baseline_row = metrics_lookup.get('baseline')
    lstm_row = metrics_lookup.get('lstm')
    gnn_row = metrics_lookup.get('gnn')
    hybrid_row = metrics_lookup.get('hybrid')

    if baseline_row is None or lstm_row is None or gnn_row is None or hybrid_row is None:
        raise ValueError('Comparison table is missing one or more models')

    # improvement relative to baseline, expressed as percent lower error
    mae_improvements = {
        'LSTM': _safe_pct_improvement(baseline_row['MAE'], lstm_row['MAE']),
        'GNN': _safe_pct_improvement(baseline_row['MAE'], gnn_row['MAE']),
        'Hybrid': _safe_pct_improvement(baseline_row['MAE'], hybrid_row['MAE']),
    }
    rmse_improvements = {
        'LSTM': _safe_pct_improvement(baseline_row['RMSE'], lstm_row['RMSE']),
        'GNN': _safe_pct_improvement(baseline_row['RMSE'], gnn_row['RMSE']),
        'Hybrid': _safe_pct_improvement(baseline_row['RMSE'], hybrid_row['RMSE']),
    }

    best_model_by_mae = min(metrics_df.to_dict(orient='records'), key=lambda r: float(r['MAE']))

    # seat allocation evaluation on latest route snapshot
    df = preprocess(load_dataset(csv_path))
    df['date_only'] = df['DateTime'].dt.date
    latest_date = df['date_only'].max()
    latest_df = df[df['date_only'] == latest_date]
    grouped = (
        latest_df.groupby(['Origin', 'Destination'])['Passenger_Count']
        .sum()
        .sort_values(ascending=False)
        .head(8)
    )

    route_rows = []
    for (origin, destination), demand_val in grouped.items():
        demand_int = int(demand_val)
        capacity = int(max(demand_int + 20, demand_int * 1.1))
        route_rows.append({
            'route': f'{origin}->{destination}',
            'demand': demand_int,
            'capacity': capacity,
        })

    static_allocation = _build_static_allocation(route_rows)
    optimized_input_cap = pd.DataFrame.from_dict({r['route']: r['capacity'] for r in route_rows}, orient='index', columns=['capacity'])
    optimized_input_demand = pd.Series({r['route']: r['demand'] for r in route_rows})
    optimized_alloc, optimized_unmet = allocate_seats(optimized_input_cap, optimized_input_demand)

    static_capacity_total = sum(float(r['capacity']) for r in static_allocation)
    static_allocated_total = sum(float(r['allocated']) for r in static_allocation)
    static_utilization = (static_allocated_total / static_capacity_total * 100.0) if static_capacity_total > 0 else 0.0

    optimized_capacity_total = float(sum(route_rows[idx]['capacity'] for idx in range(len(route_rows))))
    optimized_allocated_total = float(sum(float(v) for v in optimized_alloc.values()))
    optimized_utilization = (optimized_allocated_total / optimized_capacity_total * 100.0) if optimized_capacity_total > 0 else 0.0

    seat_utilization_increase = _safe_pct_improvement(static_utilization, optimized_utilization)

    summary_lines = [
        f"Hybrid model improved MAE by {mae_improvements['Hybrid']:.2f}%",
        f"Hybrid model improved RMSE by {rmse_improvements['Hybrid']:.2f}%",
        f"Seat utilization increased by {seat_utilization_increase:.2f}%",
        f"Best model by MAE: {best_model_by_mae['model']}",
    ]

    summary = {
        'best_model': best_model_by_mae['model'],
        'best_model_metrics': {
            'MAE': float(best_model_by_mae['MAE']),
            'RMSE': float(best_model_by_mae['RMSE']),
            'MAPE': float(best_model_by_mae['MAPE']),
        },
        'improvements': {
            'mae': mae_improvements,
            'rmse': rmse_improvements,
            'hybrid_mae_improvement_pct': float(mae_improvements['Hybrid']),
            'hybrid_rmse_improvement_pct': float(rmse_improvements['Hybrid']),
            'seat_utilization_increase_pct': float(seat_utilization_increase),
        },
        'seat_allocation': {
            'static_utilization_pct': float(static_utilization),
            'optimized_utilization_pct': float(optimized_utilization),
            'static_allocation': static_allocation,
            'optimized_allocation': [{
                'route': route,
                'allocated': float(value),
                'capacity': float(route_rows[idx]['capacity']),
                'demand': float(route_rows[idx]['demand']),
                'unmet': float(optimized_unmet.get(route, 0.0)),
            } for idx, (route, value) in enumerate(optimized_alloc.items())],
        },
        'summary_report': summary_lines,
        'comparison_table': comparison['table'],
        'per_day': comparison['per_day'],
        'latest_route_date': str(latest_date),
    }

    return summary


def save_evaluation_summary(csv_path: str, model_dir: str, output_path: str, n_test_days: int = 7):
    summary = build_evaluation_summary(csv_path, model_dir, n_test_days=n_test_days)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)
    return summary
