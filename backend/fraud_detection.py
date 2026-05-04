import pandas as pd
import numpy as np
import time
import joblib

from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

# Load dataset
df = pd.read_csv("backend/data/sri_lanka_railway_dataset.csv")

print("Dataset Loaded Successfully")
print(df.head())

# Create research-based true labels
df["True_Label"] = 0

df.loc[
    (
        (df["Passenger_Count"] > 450)
        | ((df["Available_Seats"] < 60) & (df["Passenger_Count"] < 80))
        | ((df["Holiday"] == "Yes") & (df["Passenger_Count"] > 400))
    ),
    "True_Label"
] = 1

# Feature selection
features = [
    "Hour",
    "Passenger_Count",
    "Available_Seats",
    "Temperature",
    "Rainfall"
]

categorical_cols = ["Route", "Ticket_Type", "Class_Type"]

for col in categorical_cols:
    if col in df.columns:
        encoder = LabelEncoder()
        df[col] = encoder.fit_transform(df[col])
        features.append(col)

X = df[features]

# Scale features for SVM and Autoencoder
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Evaluation function
def evaluate_model(model_name, true_labels, predicted_labels, speed):
    return {
        "Model": model_name,
        "Accuracy": round(accuracy_score(true_labels, predicted_labels), 4),
        "Precision": round(precision_score(true_labels, predicted_labels, zero_division=0), 4),
        "Recall": round(recall_score(true_labels, predicted_labels, zero_division=0), 4),
        "F1 Score": round(f1_score(true_labels, predicted_labels, zero_division=0), 4),
        "Detection Speed (sec)": round(speed, 4)
    }

results = []

# 1. ISOLATION FOREST
print("\nTraining Isolation Forest...")

isolation_model = IsolationForest(
    n_estimators=100,
    contamination=0.05,
    random_state=42
)

start_time = time.time()
isolation_model.fit(X_scaled)
if_pred_raw = isolation_model.predict(X_scaled)
end_time = time.time()

if_pred = pd.Series(if_pred_raw).map({1: 0, -1: 1}).values

df["IF_Pred_Label"] = if_pred
df["IF_Fraud_Label"] = pd.Series(if_pred).map({0: "Normal", 1: "Suspicious"})

if_speed = end_time - start_time
results.append(evaluate_model("Isolation Forest", df["True_Label"], if_pred, if_speed))

# Risk score for Isolation Forest
if_scores = isolation_model.decision_function(X_scaled)
df["IF_Risk_Score"] = ((if_scores.max() - if_scores) / (if_scores.max() - if_scores.min())) * 100
df["IF_Risk_Score"] = df["IF_Risk_Score"].round(2)

# 2. ONE-CLASS SVM
print("\nTraining One-Class SVM...")

svm_model = OneClassSVM(
    kernel="rbf",
    gamma="scale",
    nu=0.05
)

# To avoid slow training, train using a sample
sample_size = min(10000, len(X_scaled))
sample_indices = np.random.choice(len(X_scaled), sample_size, replace=False)
X_svm_train = X_scaled[sample_indices]

start_time = time.time()
svm_model.fit(X_svm_train)
svm_pred_raw = svm_model.predict(X_scaled)
end_time = time.time()

svm_pred = pd.Series(svm_pred_raw).map({1: 0, -1: 1}).values

df["SVM_Pred_Label"] = svm_pred
df["SVM_Fraud_Label"] = pd.Series(svm_pred).map({0: "Normal", 1: "Suspicious"})

svm_speed = end_time - start_time
results.append(evaluate_model("One-Class SVM", df["True_Label"], svm_pred, svm_speed))

# 3. AUTOENCODER
print("\nTraining Autoencoder...")

autoencoder = MLPRegressor(
    hidden_layer_sizes=(16, 8, 16),
    activation="relu",
    solver="adam",
    max_iter=50,
    random_state=42
)

start_time = time.time()
autoencoder.fit(X_scaled, X_scaled)
X_reconstructed = autoencoder.predict(X_scaled)
end_time = time.time()

reconstruction_error = np.mean((X_scaled - X_reconstructed) ** 2, axis=1)

threshold = np.percentile(reconstruction_error, 95)

ae_pred = (reconstruction_error > threshold).astype(int)

df["AE_Pred_Label"] = ae_pred
df["AE_Fraud_Label"] = pd.Series(ae_pred).map({0: "Normal", 1: "Suspicious"})
df["AE_Reconstruction_Error"] = reconstruction_error.round(4)

ae_speed = end_time - start_time
results.append(evaluate_model("Autoencoder", df["True_Label"], ae_pred, ae_speed))

# MODEL COMPARISON
comparison_df = pd.DataFrame(results)

best_model_row = comparison_df.sort_values(by="F1 Score", ascending=False).iloc[0]
best_model_name = best_model_row["Model"]

print("\nBest Model:", best_model_name)

# Select final prediction based on best model
if best_model_name == "Isolation Forest":
    df["Pred_Label"] = df["IF_Pred_Label"]
    df["Fraud_Label"] = df["IF_Fraud_Label"]
    df["Risk_Score"] = df["IF_Risk_Score"]

elif best_model_name == "One-Class SVM":
    df["Pred_Label"] = df["SVM_Pred_Label"]
    df["Fraud_Label"] = df["SVM_Fraud_Label"]
    df["Risk_Score"] = df["IF_Risk_Score"]

else:
    df["Pred_Label"] = df["AE_Pred_Label"]
    df["Fraud_Label"] = df["AE_Fraud_Label"]
    df["Risk_Score"] = (
        (reconstruction_error - reconstruction_error.min())
        / (reconstruction_error.max() - reconstruction_error.min())
    ) * 100
    df["Risk_Score"] = df["Risk_Score"].round(2)

# Risk level
def risk_level(score):
    if score >= 75:
        return "High"
    elif score >= 45:
        return "Medium"
    else:
        return "Low"

df["Risk_Level"] = df["Risk_Score"].apply(risk_level)

# Save best model metrics for dashboard top cards
model_metrics_df = best_model_row.drop(labels=["Model"]).reset_index()
model_metrics_df.columns = ["Metric", "Value"]

# Save files
joblib.dump(isolation_model, "backend/models/isolation_forest_model.pkl")
joblib.dump(svm_model, "backend/models/one_class_svm_model.pkl")
joblib.dump(autoencoder, "backend/models/autoencoder_model.pkl")
joblib.dump(scaler, "backend/models/scaler.pkl")

df.to_csv("backend/outputs/fraud_detection_results.csv", index=False)
comparison_df.to_csv("backend/outputs/model_comparison.csv", index=False)
model_metrics_df.to_csv("backend/outputs/model_metrics.csv", index=False)

print("\nModel Comparison Completed")
print(comparison_df)

print("\nFinal Best Model Metrics")
print(model_metrics_df)

print("\nSaved all outputs in backend/outputs folder")