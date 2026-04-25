import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder
import joblib

# Load dataset
df = pd.read_csv("data/sri_lanka_railway_dataset.csv")

print("Dataset Loaded Successfully")
print(df.head())

# Select useful columns
features = [
    "Hour",
    "Passenger_Count",
    "Available_Seats",
    "Temperature",
    "Rainfall"
]

# Encode categorical columns if exists
categorical_cols = ["Route", "Ticket_Type", "Class_Type"]

for col in categorical_cols:
    if col in df.columns:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        features.append(col)

# Prepare data
X = df[features]

# Train Isolation Forest model
model = IsolationForest(
    n_estimators=100,
    contamination=0.05,
    random_state=42
)

model.fit(X)

# Predictions
df["Fraud_Label"] = model.predict(X)

# Convert labels
df["Fraud_Label"] = df["Fraud_Label"].map({1: "Normal", -1: "Suspicious"})

# Risk Score
scores = model.decision_function(X)
min_score = scores.min()
max_score = scores.max()

df["Risk_Score"] = ((max_score - scores) / (max_score - min_score)) * 100
df["Risk_Score"] = df["Risk_Score"].round(2)

# Risk Level
def risk_level(score):
    if score >= 75:
        return "High"
    elif score >= 45:
        return "Medium"
    else:
        return "Low"

df["Risk_Level"] = df["Risk_Score"].apply(risk_level)

# Save model
joblib.dump(model, "models/fraud_model.pkl")

# Save output
df.to_csv("outputs/fraud_detection_results.csv", index=False)

print("Fraud Detection Completed")
print(df[["Fraud_Label", "Risk_Score", "Risk_Level"]].head())
print("Results saved in outputs folder")