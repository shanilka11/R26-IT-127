import os
import pandas as pd
import numpy as np
from datetime import datetime


# Column mapping: maps alternative column names to the standardized name
COLUMN_MAPPING = {
    'origin': 'Origin',
    'origin_station': 'Origin',
    'destination': 'Destination',
    'destination_station': 'Destination',
    'passenger_count': 'Passenger_Count',
    'date': 'Date',
    'time': 'Time',
    'train_id': 'Train_ID',
    'datetime': 'DateTime',
}


def _normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize column names by:
    1. Stripping whitespace
    2. Converting to lowercase for mapping lookup
    3. Renaming to standardized names
    4. Handling case-insensitive matches
    
    This ensures backward compatibility with both old (Origin, Destination)
    and new (Origin_Station, Destination_Station) column names.
    """
    df = df.copy()
    
    # Strip whitespace from all column names
    df.columns = df.columns.str.strip()
    
    # Create a mapping from current column names to standardized names
    rename_dict = {}
    for col in df.columns:
        col_lower = col.lower()
        if col_lower in COLUMN_MAPPING:
            standardized = COLUMN_MAPPING[col_lower]
            # Only rename if not already the standardized name
            if col != standardized:
                rename_dict[col] = standardized
    
    # Rename columns
    if rename_dict:
        df = df.rename(columns=rename_dict)
        print(f"[DEBUG] Column names normalized: {rename_dict}")
    else:
        print("[DEBUG] No column renaming needed")
    
    return df


def _validate_required_columns(df: pd.DataFrame) -> None:
    """
    Validate that required columns exist after normalization.
    Raises ValueError with helpful message if columns are missing.
    """
    required_columns = ['Origin', 'Destination', 'Passenger_Count']
    missing = [col for col in required_columns if col not in df.columns]
    
    if missing:
        available = df.columns.tolist()
        raise ValueError(
            f"Missing required columns: {missing}\n"
            f"Available columns: {available}\n"
            f"Please ensure your dataset has Origin/Origin_Station, "
            f"Destination/Destination_Station, and Passenger_Count columns."
        )


def load_dataset(csv_path: str) -> pd.DataFrame:
    """Load CSV dataset and normalize column names immediately."""
    df = pd.read_csv(csv_path)
    df = _normalize_column_names(df)
    _validate_required_columns(df)
    print(f"[DEBUG] Dataset loaded from {csv_path} with {len(df)} rows")
    print(f"[DEBUG] Columns after normalization: {df.columns.tolist()}")
    return df


def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """
    Preprocess dataframe:
    1. Normalize column names
    2. Validate required columns
    3. Clean and handle missing values
    4. Engineer features
    
    Expects columns: Origin, Destination, Date, Time, Passenger_Count, Train_ID
    (or alternative names which will be auto-mapped)
    """
    df = df.copy()
    
    # Normalize column names (handles both old and new naming conventions)
    df = _normalize_column_names(df)
    _validate_required_columns(df)
    
    # Drop fully empty rows
    df.dropna(how='all', inplace=True)

    # Fill missing Passenger_Count with 0 (assume no passengers recorded)
    if 'Passenger_Count' in df.columns:
        df['Passenger_Count'] = pd.to_numeric(df['Passenger_Count'], errors='coerce').fillna(0).astype(int)

    # Combine Date and Time into datetime
    if 'Date' in df.columns and 'Time' in df.columns:
        def to_dt(row):
            try:
                return pd.to_datetime(str(row['Date']) + ' ' + str(row['Time']))
            except Exception:
                return pd.NaT

        df['DateTime'] = df.apply(to_dt, axis=1)
    else:
        # try to parse a single datetime column
        if 'DateTime' in df.columns:
            df['DateTime'] = pd.to_datetime(df['DateTime'], errors='coerce')

    # Drop rows with invalid datetime
    df = df[df['DateTime'].notnull()].copy()

    # Feature engineering
    df['hour'] = df['DateTime'].dt.hour
    df['day'] = df['DateTime'].dt.day
    df['weekday'] = df['DateTime'].dt.weekday
    # Define peak hours (example: 6-9 and 16-19)
    df['is_peak'] = df['hour'].apply(lambda h: 1 if (6 <= h <= 9) or (16 <= h <= 19) else 0)

    # Fill missing categorical fields
    for c in ['Origin', 'Destination', 'Train_ID']:
        if c in df.columns:
            df[c] = df[c].fillna('UNKNOWN')

    print(f"[DEBUG] Preprocessing complete: {len(df)} rows after validation and cleaning")
    return df


def create_od_demand_matrix(df: pd.DataFrame, time_freq='D'):
    """
    Aggregate passenger count per Origin-Destination per time window.
    
    Args:
        df: Preprocessed dataframe with normalized column names
        time_freq: Time frequency for aggregation (default 'D' for daily)
    
    Returns:
        Pivot table with DateTime as index, OD pairs as columns, Passenger_Count as values
    """
    df = df.copy()
    
    # Validate required columns
    required = ['DateTime', 'Origin', 'Destination', 'Passenger_Count']
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(
            f"create_od_demand_matrix: Missing required columns {missing}. "
            f"Available: {df.columns.tolist()}"
        )
    
    df.set_index('DateTime', inplace=True)
    # Pivot table: index = time windows, columns = (Origin,Destination)
    agg = df.groupby([pd.Grouper(freq=time_freq), 'Origin', 'Destination'])['Passenger_Count'].sum().reset_index()
    agg['OD'] = agg['Origin'].astype(str) + '->' + agg['Destination'].astype(str)
    pivot = agg.pivot(index='DateTime', columns='OD', values='Passenger_Count').fillna(0)
    
    print(f"[DEBUG] OD matrix created: {pivot.shape[0]} time periods, {pivot.shape[1]} OD pairs")
    return pivot
