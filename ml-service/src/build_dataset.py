import os
import pandas as pd
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW_CSV = os.path.join(ROOT, "data", "telemetry_export.csv")
OUT_CSV = os.path.join(ROOT, "data", "train_history.csv")

if not os.path.exists(RAW_CSV):
    raise SystemExit(f"Missing telemetry export CSV: {RAW_CSV}")

df = pd.read_csv(RAW_CSV)
if df.empty:
    raise SystemExit("Telemetry export is empty.")

for col in ["speedKmh", "observedDelayMin", "latitude", "longitude"]:
    if col not in df.columns:
        df[col] = 0.0

df["eventTime"] = pd.to_datetime(df.get("eventTime"), errors="coerce")
df = df.sort_values(["trainId", "eventTime"]).reset_index(drop=True)

df["speedKmh"] = pd.to_numeric(df["speedKmh"], errors="coerce").fillna(0.0).clip(lower=0)
df["observedDelayMin"] = pd.to_numeric(df["observedDelayMin"], errors="coerce").fillna(0.0).clip(lower=0)
df["targetDelayMin"] = (
    0.55 * df["observedDelayMin"]
    + 0.22 * np.maximum(0, 60 - df["speedKmh"])
    + np.random.normal(0, 1.5, size=len(df))
).clip(lower=0)

out = df[["speedKmh", "observedDelayMin", "targetDelayMin"]].copy()
os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
out.to_csv(OUT_CSV, index=False)
print(f"Real training dataset generated: {OUT_CSV} ({len(out)} rows)")

