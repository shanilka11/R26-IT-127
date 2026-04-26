import pandas as pd
import numpy as np
import time
import joblib

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

# LOAD DATASET
df = pd.read_csv("backend/data/sri_lanka_railway_dataset.csv")

print("Dataset Loaded Successfully")
print(df.head())

# CREATE TRUE LABELS (Research Rules)
# 0 = Normal
# 1 = Suspicious
df["True_Label"] = 0

df.loc[
    (
        (df["Passenger_Count"] > 450)
        | ((df["Available_Seats"] < 60) & (df["Passenger_Count"] < 80))
        | ((df["Holiday"] == "Yes") & (df["Passenger_Count"] > 400))
    ),
    "True_Label"
] = 1

# FEATURES
features = [
    "Hour",
    "Passenger_Count",
    "Available_Seats",
    "Temperature",
    "Rainfall"
]

# Encode categorical columns
categorical_cols = ["Route", "Ticket_Type", "Class_Type"]

for col in categorical_cols:
    if col in df.columns:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        features.append(col)

X = df[features]


# TRAIN MODEL
model = IsolationForest(
    n_estimators=100,
    contamination=0.05,
    random_state=42
)

start_time = time.time()

model.fit(X)
pred = model.predict(X)

end_time = time.time()

# CONVERT PREDICTIONS
# 1 = Normal
# -1 = Suspicious
df["Pred_Label"] = pred
df["Pred_Label"] = df["Pred_Label"].map({1: 0, -1: 1})

# TEXT LABELS
df["Fraud_Label"] = df["Pred_Label"].map({0: "Normal", 1: "Suspicious"})

# RISK SCORE
scores = model.decision_function(X)

min_score = scores.min()
max_score = scores.max()

df["Risk_Score"] = ((max_score - scores) / (max_score - min_score)) * 100
df["Risk_Score"] = df["Risk_Score"].round(2)

# RISK LEVEL
def risk_level(score):
    if score >= 75:
        return "High"
    elif score >= 45:
        return "Medium"
    else:
        return "Low"

df["Risk_Level"] = df["Risk_Score"].apply(risk_level)

# METRICS
accuracy = accuracy_score(df["True_Label"], df["Pred_Label"])
precision = precision_score(df["True_Label"], df["Pred_Label"])
recall = recall_score(df["True_Label"], df["Pred_Label"])
f1 = f1_score(df["True_Label"], df["Pred_Label"])

speed = round(end_time - start_time, 4)

metrics_df = pd.DataFrame({
    "Metric": [
        "Accuracy",
        "Precision",
        "Recall",
        "F1 Score",
        "Detection Speed (sec)"
    ],
    "Value": [
        round(accuracy, 4),
        round(precision, 4),
        round(recall, 4),
        round(f1, 4),
        speed
    ]
})

# SAVE FILES
joblib.dump(model, "backend/models/fraud_model.pkl")

df.to_csv("backend/outputs/fraud_detection_results.csv", index=False)
metrics_df.to_csv("backend/outputs/model_metrics.csv", index=False)

# PRINT
print("\nFraud Detection Completed")
print(metrics_df)
print("\nSaved in outputs folder")