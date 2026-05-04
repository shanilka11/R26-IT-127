export const metricCards = [
  { title: "Total Trips Today", value: "128", delta: "+8.2%", tone: "positive" },
  { title: "Forecast Accuracy", value: "93.4%", delta: "+1.4%", tone: "positive" },
  { title: "Seat Utilization", value: "87.1%", delta: "+2.9%", tone: "positive" },
  { title: "Unmet Demand", value: "412", delta: "-6.7%", tone: "negative" }
]

export const forecastLabels = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]

export const actualDemand = [180, 260, 320, 298, 255, 231, 215, 228, 248, 269]
export const predictedDemand = [172, 251, 334, 303, 247, 238, 220, 224, 243, 276]

export const allocationRows = [
  { route: "Colombo->Kandy", demand: 540, allocated: 520, capacity: 520, utilization: "100%" },
  { route: "Colombo->Galle", demand: 380, allocated: 360, capacity: 400, utilization: "90%" },
  { route: "Kandy->Jaffna", demand: 290, allocated: 270, capacity: 300, utilization: "90%" },
  { route: "Galle->Matara", demand: 170, allocated: 160, capacity: 180, utilization: "88.9%" },
  { route: "Jaffna->Vavuniya", demand: 130, allocated: 120, capacity: 140, utilization: "85.7%" }
]

export const modelComparison = [
  { model: "ARIMA", mae: 22.9, rmse: 30.5, mape: 12.8 },
  { model: "LSTM", mae: 16.4, rmse: 22.1, mape: 8.7 },
  { model: "GNN", mae: 18.1, rmse: 24.8, mape: 9.9 },
  { model: "Hybrid", mae: 13.8, rmse: 19.3, mape: 7.1 }
]
