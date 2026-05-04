import base64
from io import BytesIO
from typing import Optional

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

try:
    from .data_pipeline import preprocess
except ImportError:
    from utils.data_pipeline import preprocess


def _apply_filters(df: pd.DataFrame, start_date: Optional[str] = None, end_date: Optional[str] = None, period: str = 'all'):
    df = df.copy()

    if start_date:
        start = pd.to_datetime(start_date, errors='coerce')
        if pd.notnull(start):
            df = df[df['DateTime'] >= start]

    if end_date:
        end = pd.to_datetime(end_date, errors='coerce')
        if pd.notnull(end):
            end = end + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
            df = df[df['DateTime'] <= end]

    period = (period or 'all').lower()
    if period == 'peak':
        df = df[df['is_peak'] == 1]
    elif period == 'off-peak':
        df = df[df['is_peak'] == 0]

    return df


def build_od_matrix(df: pd.DataFrame, start_date: Optional[str] = None, end_date: Optional[str] = None, period: str = 'all', top_k: int = 10):
    df = preprocess(df)
    df = _apply_filters(df, start_date=start_date, end_date=end_date, period=period)

    if df.empty:
        raise ValueError('OD matrix has no rows after applying filters')

    matrix_df = (
        df.groupby(['Origin', 'Destination'])['Passenger_Count']
        .sum()
        .reset_index()
        .pivot(index='Origin', columns='Destination', values='Passenger_Count')
        .fillna(0)
    )

    # Sort by demand volume to make the heatmap easier to read.
    row_order = matrix_df.sum(axis=1).sort_values(ascending=False).index.tolist()
    col_order = matrix_df.sum(axis=0).sort_values(ascending=False).index.tolist()
    matrix_df = matrix_df.reindex(index=row_order, columns=col_order, fill_value=0)

    route_totals = (
        df.groupby(['Origin', 'Destination'])['Passenger_Count']
        .sum()
        .sort_values(ascending=False)
        .head(top_k)
    )

    top_routes = [
        {
            'route': f'{origin}->{destination}',
            'origin': origin,
            'destination': destination,
            'passenger_count': int(value),
        }
        for (origin, destination), value in route_totals.items()
    ]

    # Build heatmap image using seaborn/matplotlib for server-side visualization.
    fig, ax = plt.subplots(figsize=(max(8, len(col_order) * 0.55), max(6, len(row_order) * 0.45)))
    sns.heatmap(matrix_df, cmap='YlOrRd', ax=ax, linewidths=0.25, linecolor='white')
    ax.set_title('Origin-Destination Passenger Demand')
    ax.set_xlabel('Destination')
    ax.set_ylabel('Origin')
    plt.tight_layout()

    buffer = BytesIO()
    fig.savefig(buffer, format='png', dpi=160, bbox_inches='tight')
    plt.close(fig)
    heatmap_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

    total_passengers = int(df['Passenger_Count'].sum())
    route_count = int(route_totals.shape[0])

    return {
        'origins': list(matrix_df.index),
        'destinations': list(matrix_df.columns),
        'matrix': [[int(v) for v in row] for row in matrix_df.values.tolist()],
        'top_routes': top_routes,
        'filters': {
            'start_date': start_date,
            'end_date': end_date,
            'period': period,
        },
        'heatmap_base64': heatmap_base64,
        'total_passengers': total_passengers,
        'route_count': route_count,
    }
