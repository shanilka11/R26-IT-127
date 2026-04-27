import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="Railway Fraud Dashboard", layout="wide")

st.title("🚆 Sri Lanka Railway Fraud Detection Dashboard")

df = pd.read_csv("backend/outputs/fraud_detection_results.csv")
metrics_df = pd.read_csv("backend/outputs/model_metrics.csv")
comparison_df = pd.read_csv("backend/outputs/model_comparison.csv")

metrics = dict(zip(metrics_df["Metric"], metrics_df["Value"]))

best_model = comparison_df.sort_values(by="F1 Score", ascending=False).iloc[0]["Model"]

st.subheader("🏆 Best Performing Model")
st.success(f"Best Performing Model: {best_model}")
st.info("Selection Criteria: Highest F1 Score")

st.subheader("📌 Best Model Performance Summary")

m1, m2, m3, m4, m5 = st.columns(5)

m1.metric("Accuracy", f"{metrics.get('Accuracy', 0) * 100:.2f}%")
m2.metric("Precision", f"{metrics.get('Precision', 0) * 100:.2f}%")
m3.metric("Recall", f"{metrics.get('Recall', 0) * 100:.2f}%")
m4.metric("F1 Score", f"{metrics.get('F1 Score', 0) * 100:.2f}%")
m5.metric("Detection Speed", f"{metrics.get('Detection Speed (sec)', 0):.3f} sec")

st.markdown("---")

st.subheader("🧪 Model Comparison Results")
st.dataframe(comparison_df, use_container_width=True)

comparison_long = comparison_df.melt(
    id_vars="Model",
    value_vars=["Accuracy", "Precision", "Recall", "F1 Score"],
    var_name="Metric",
    value_name="Score"
)

comparison_chart = px.bar(
    comparison_long,
    x="Model",
    y="Score",
    color="Metric",
    barmode="group",
    title="Model Comparison: Accuracy, Precision, Recall and F1 Score"
)

st.plotly_chart(comparison_chart, use_container_width=True)

speed_chart = px.bar(
    comparison_df,
    x="Model",
    y="Detection Speed (sec)",
    color="Model",
    title="Detection Speed Comparison"
)

st.plotly_chart(speed_chart, use_container_width=True)

st.markdown("---")

st.sidebar.header("🔍 Search & Filter")

train_ids = ["All"] + sorted(df["Train_ID"].dropna().unique().tolist())
selected_train = st.sidebar.selectbox("Select Train ID", train_ids)

routes = ["All"] + sorted(df["Route"].dropna().unique().tolist())
selected_route = st.sidebar.selectbox("Select Route", routes)

filtered_df = df.copy()

if selected_train != "All":
    filtered_df = filtered_df[filtered_df["Train_ID"] == selected_train]

if selected_route != "All":
    filtered_df = filtered_df[filtered_df["Route"] == selected_route]

st.subheader("📊 Transaction Summary")

col1, col2, col3, col4 = st.columns(4)

col1.metric("Total Records", len(filtered_df))
col2.metric("Suspicious", len(filtered_df[filtered_df["Fraud_Label"] == "Suspicious"]))
col3.metric("Normal", len(filtered_df[filtered_df["Fraud_Label"] == "Normal"]))
col4.metric("High Risk", len(filtered_df[filtered_df["Risk_Level"] == "High"]))

st.markdown("---")

st.subheader("📊 Risk Level Distribution")

risk_data = filtered_df["Risk_Level"].value_counts().reset_index()
risk_data.columns = ["Risk_Level", "Count"]

risk_chart = px.bar(
    risk_data,
    x="Risk_Level",
    y="Count",
    color="Risk_Level",
    title="Low / Medium / High Risk Count"
)

st.plotly_chart(risk_chart, use_container_width=True)

st.subheader("🥧 Fraud Status Distribution")

fraud_chart = px.pie(
    filtered_df,
    names="Fraud_Label",
    title="Normal vs Suspicious Transactions"
)

st.plotly_chart(fraud_chart, use_container_width=True)

st.subheader("📈 Monthly Fraud Trend")

month_order = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

monthly_data = (
    filtered_df[filtered_df["Fraud_Label"] == "Suspicious"]
    .groupby("Month")
    .size()
    .reset_index(name="Suspicious_Count")
)

monthly_data["Month"] = pd.Categorical(
    monthly_data["Month"],
    categories=month_order,
    ordered=True
)

monthly_data = monthly_data.sort_values("Month")

monthly_chart = px.line(
    monthly_data,
    x="Month",
    y="Suspicious_Count",
    markers=True,
    title="Monthly Suspicious Transaction Trend"
)

st.plotly_chart(monthly_chart, use_container_width=True)

st.subheader("🚨 Top High Risk Records")

high_risk = filtered_df.sort_values(by="Risk_Score", ascending=False).head(20)
st.dataframe(high_risk, use_container_width=True)

suspicious_df = filtered_df[filtered_df["Fraud_Label"] == "Suspicious"]
csv = suspicious_df.to_csv(index=False).encode("utf-8")

st.download_button(
    label="⬇️ Download Suspicious Records CSV",
    data=csv,
    file_name="suspicious_railway_transactions.csv",
    mime="text/csv"
)

st.subheader("📄 Full Filtered Result Data")
st.dataframe(filtered_df, use_container_width=True)

st.markdown("---")
st.subheader("🤖 Live Fraud Risk Prediction")

st.write("Enter new passenger transaction details and predict fraud risk instantly.")

p1, p2, p3 = st.columns(3)

with p1:
    input_hour = st.number_input("Hour", min_value=0, max_value=23, value=8)
    input_passenger_count = st.number_input("Passenger Count", min_value=0, value=250)
    input_available_seats = st.number_input("Available Seats", min_value=0, value=150)

with p2:
    input_temperature = st.number_input("Temperature", min_value=0, max_value=50, value=30)
    input_rainfall = st.number_input("Rainfall", min_value=0, value=0)
    input_route = st.selectbox("Route for Prediction", sorted(df["Route"].dropna().unique().tolist()))

with p3:
    input_ticket_type = st.selectbox("Ticket Type for Prediction", sorted(df["Ticket_Type"].dropna().unique().tolist()))
    input_class_type = st.selectbox("Class Type for Prediction", sorted(df["Class_Type"].dropna().unique().tolist()))

if st.button("Predict Fraud Risk"):
    risk_score = 0

    if input_passenger_count > df["Passenger_Count"].mean():
        risk_score += 25

    if input_available_seats < df["Available_Seats"].mean():
        risk_score += 20

    if input_hour in [6, 7, 8, 17, 18, 19]:
        risk_score += 15

    if input_rainfall > 20:
        risk_score += 10

    if input_ticket_type == df["Ticket_Type"].mode()[0]:
        risk_score += 10

    if input_class_type == df["Class_Type"].mode()[0]:
        risk_score += 10

    if risk_score >= 70:
        prediction = "Suspicious"
        risk_level = "High"
    elif risk_score >= 45:
        prediction = "Potential Risk"
        risk_level = "Medium"
    else:
        prediction = "Normal"
        risk_level = "Low"

    st.success("Prediction Completed")

    r1, r2, r3 = st.columns(3)
    r1.metric("Prediction", prediction)
    r2.metric("Risk Score", f"{risk_score}/100")
    r3.metric("Risk Level", risk_level)