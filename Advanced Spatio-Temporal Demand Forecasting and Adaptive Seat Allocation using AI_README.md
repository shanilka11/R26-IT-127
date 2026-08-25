# 🚆 CeylonRail AI — Spatio-Temporal Demand Forecasting & Adaptive Seat Allocation

<p align="center">
  <img src="https://img.shields.io/badge/AI-Spatio--Temporal%20Forecasting-0B3D91?style=for-the-badge" alt="AI">
  <img src="https://img.shields.io/badge/Deep%20Learning-LSTM-7C3AED?style=for-the-badge" alt="LSTM">
  <img src="https://img.shields.io/badge/Graph%20AI-GNN-0891B2?style=for-the-badge" alt="GNN">
  <img src="https://img.shields.io/badge/Optimization-MILP-059669?style=for-the-badge" alt="MILP">
  <img src="https://img.shields.io/badge/Research-IT4010-E11D48?style=for-the-badge" alt="IT4010">
</p>

<h1 align="center">🚆 CeylonRail AI</h1>

<h3 align="center">
  Advanced Spatio-Temporal Demand Forecasting & Adaptive Seat Allocation
</h3>

<p align="center">
  <strong>AI-powered railway capacity intelligence for Sri Lanka</strong>
</p>

<p align="center">
  Predict passenger demand across time and railway networks, then transform
  those predictions into intelligent, adaptive and fairness-aware seat
  allocation decisions.
</p>

---

## 🌟 At a Glance

| | |
|---|---|
| 🎓 **Research Project** | IT4010 Research Project |
| 🆔 **Project ID** | R26-IT-127 |
| 👩‍💻 **Researcher** | Senawirathna D.M.N.T |
| 🪪 **Student ID** | IT22151506 |
| 🧠 **Component** | Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI |
| 🏫 **University** | Sri Lanka Institute of Information Technology (SLIIT) |
| 👩‍🏫 **Supervisor** | Ms. Chathurangika Kahadawaarachchi |
| 🎯 **Domain** | AI & Data Science for Smart Transportation |

> **Core idea:** Don't just predict where and when passengers will travel — use those predictions to make better railway capacity decisions.

---

## 📌 Table of Contents

- [About the Component](#-about-the-component)
- [The Problem](#-the-problem)
- [Research Gap](#-research-gap)
- [Research Contribution](#-research-contribution)
- [Objectives](#-objectives)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [System Architecture](#-system-architecture)
- [Spatio-Temporal Forecasting](#-spatio-temporal-forecasting)
- [LSTM Temporal Model](#-lstm-temporal-model)
- [GNN Spatial Model](#-gnn-spatial-model)
- [Hybrid Spatio-Temporal Model](#-hybrid-spatio-temporal-model)
- [Adaptive Seat Allocation](#-adaptive-seat-allocation)
- [Optimization Model](#-optimization-model)
- [Dataset](#-dataset)
- [Data Processing Pipeline](#-data-processing-pipeline)
- [Evaluation](#-evaluation)
- [Functional Requirements](#-functional-requirements)
- [Non-Functional Requirements](#-non-functional-requirements)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Running the Component](#-running-the-component)
- [Research Workflow](#-research-workflow)
- [Experiment Scenarios](#-experiment-scenarios)
- [Expected Outcomes](#-expected-outcomes)
- [Stakeholders](#-stakeholders)
- [Privacy & Ethics](#-privacy--ethics)
- [Scalability & Security](#-scalability--security)
- [Commercial Potential](#-commercial-potential)
- [Risk Management](#-risk-management)
- [Research Timeline](#-research-timeline)
- [Project Information](#-project-information)
- [References](#-references)
- [Disclaimer](#-disclaimer)

---

# 🚆 About the Component

**CeylonRail AI** is the individual research component of the wider project
**"AI-Driven Intelligent Railway Operations System for Sri Lanka."**

This component focuses on:

> **Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI**

The proposed system combines:

```text
        PASSENGER DEMAND DATA
                 │
                 ▼
        ┌───────────────────┐
        │ Data Preprocessing│
        └─────────┬─────────┘
                  │
          ┌───────┴────────┐
          ▼                ▼
     Temporal          Spatial
      Modeling          Modeling
       (LSTM)             (GNN)
          │                │
          └───────┬────────┘
                  ▼
       Spatio-Temporal Forecast
                  │
                  ▼
        Predicted Railway Demand
                  │
                  ▼
       ┌──────────────────────┐
       │ Adaptive Seat        │
       │ Allocation (MILP)    │
       └──────────┬───────────┘
                  ▼
        Optimized Seat Plan
                  │
                  ▼
          Decision Dashboard
```

The proposal describes the forecasting and adaptive allocation modules as the
core contribution of this research component. fileciteturn5file0

---

# ❗ The Problem

Railway passenger demand is **not static**.

Demand changes according to:

- 🕐 Time of day
- 📅 Day of week
- 🌦️ Weather conditions
- 🎉 Public events and holidays
- 🗺️ Station location
- 🚆 Route connectivity
- 👥 Passenger travel behavior
- 📈 Peak and off-peak periods

Traditional railway planning approaches often depend on:

- Static scheduling
- Historical averages
- Fixed seat allocation
- Rule-based decisions

These approaches can lead to:

```text
PEAK PERIODS
    ↓
High demand
    ↓
Overcrowding
    ↓
Reduced passenger comfort
    ↓
Unmet demand

OFF-PEAK PERIODS
    ↓
Low demand
    ↓
Unused capacity
    ↓
Poor resource utilization
```

The proposal identifies the lack of integration between demand forecasting and
operational seat allocation as a central research problem. fileciteturn5file0

---

# 🔍 Research Gap

The research proposal identifies several important gaps.

### 1. Forecasting and allocation are often separated

Many approaches predict passenger demand without directly using those
predictions for seat allocation.

### 2. Traditional forecasting is mainly temporal

Models such as ARIMA and Prophet provide useful baselines but do not naturally
capture the spatial relationships between railway stations.

### 3. Temporal deep learning does not fully model railway networks

LSTM can capture temporal dependencies, but railway networks are inherently
graph-structured.

### 4. Spatial models alone are insufficient

Graph-based models capture station relationships, but temporal passenger-demand
patterns must also be modeled.

### 5. Existing allocation strategies can be static

Predefined rules and fixed allocation mechanisms may not react dynamically to
predicted changes in demand.

### 6. Developing-country constraints are often overlooked

The proposal specifically highlights challenges relevant to Sri Lanka, including:

- Limited origin-destination data
- Passenger privacy requirements
- Rigid reservation policies
- Data availability limitations
- Computational constraints

fileciteturn5file0

---

# 💡 Research Contribution

The proposed research addresses the gap through a **unified AI-driven
framework** that:

1. Constructs high-resolution Origin-Destination (OD) demand matrices.
2. Benchmarks ARIMA and Prophet against advanced models.
3. Uses LSTM for temporal demand modeling.
4. Uses GNN for spatial railway-network modeling.
5. Integrates temporal and spatial representations.
6. Passes predicted demand into an adaptive seat-allocation model.
7. Uses fairness-aware optimization constraints.
8. Evaluates both prediction accuracy and operational performance.

The proposal describes this integration of spatio-temporal forecasting with
fairness-aware adaptive seat allocation as the main novelty. fileciteturn5file0

---

# 🎯 Objectives

## Main Objective

To design and implement an AI-driven spatio-temporal demand forecasting and
adaptive seat allocation framework for railway transportation systems that
targets:

- **At least 15% MAE reduction** compared with existing/static baseline
  approaches.
- **At least 20% improvement in seat utilization** compared with static
  allocation methods.

These are **research targets**, not claimed achieved results. fileciteturn5file0

---

## Specific Objectives

### 01 — Data Collection & Preprocessing

Collect, integrate and preprocess multi-source railway data and target at least
**95% data completeness and consistency**.

### 02 — Spatio-Temporal Forecasting

Develop LSTM and GNN-based models for passenger-demand prediction and compare
them with ARIMA and Prophet.

### 03 — Adaptive Seat Allocation

Develop a **Mixed Integer Linear Programming (MILP)** model that dynamically
allocates seats according to predicted demand.

### 04 — Forecasting Evaluation

Evaluate forecasting performance using:

- MAE
- RMSE
- MAPE

under normal and peak-demand scenarios.

### 05 — Allocation Effectiveness

Evaluate:

- Seat utilization
- Passenger demand satisfaction
- Booking rejection rate
- Reduction in overcrowding

### 06 — Prototype Development

Develop and validate a prototype decision-support system integrating
forecasting and seat allocation through simulation experiments.

fileciteturn5file0

---

# ✨ Key Features

| Feature | Description |
|---|---|
| 📊 Demand Forecasting | Predict passenger demand across railway OD pairs |
| 🕐 Temporal Modeling | Learn daily, weekly and seasonal demand patterns |
| 🗺️ Spatial Modeling | Learn relationships between railway stations |
| 🧠 Hybrid AI | Combine LSTM and GNN representations |
| 💺 Adaptive Allocation | Allocate seats based on predicted demand |
| ⚖️ Fairness | Include fairness constraints in allocation |
| 📈 Analytics | Evaluate forecasting and operational metrics |
| 🚦 Peak Simulation | Test performance under high-demand conditions |
| 📉 Overcrowding Reduction | Target improved capacity distribution |
| 📊 Dashboard | Visualize forecasts, recommendations and metrics |

---

# 🔄 How It Works

```text
┌─────────────────────────────────────────────────────────┐
│                    1. DATA COLLECTION                   │
│                                                         │
│ Ticketing • Stations • Routes • Timetables • Weather  │
│ Holidays • Events • Historical Passenger Records      │
└─────────────────────────────┬───────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  2. DATA PREPROCESSING                  │
│                                                         │
│ Cleaning • Normalization • Feature Engineering         │
│ Missing Values • Temporal Features • OD Matrix         │
└─────────────────────────────┬───────────────────────────┘
                              ▼
                 ┌────────────┴────────────┐
                 ▼                         ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│     3A. TEMPORAL        │   │      3B. SPATIAL        │
│        MODEL            │   │         MODEL           │
│                         │   │                         │
│         LSTM            │   │          GNN            │
│                         │   │                         │
│ Daily / Weekly /        │   │ Stations / Routes /    │
│ Seasonal Patterns       │   │ Network Relationships  │
└────────────┬────────────┘   └────────────┬────────────┘
             │                             │
             └──────────────┬──────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│              4. SPATIO-TEMPORAL FORECAST               │
│                                                         │
│ Predicted passenger demand for OD pairs over time      │
└─────────────────────────────┬───────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────┐
│              5. ADAPTIVE SEAT ALLOCATION               │
│                                                         │
│ Predicted Demand + Capacity + Fairness + Policies      │
│                         ↓                               │
│                         MILP                           │
└─────────────────────────────┬───────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    6. OUTPUT                            │
│                                                         │
│ Optimized Seat Allocation • Utilization • Alerts      │
│ Demand Forecasts • Rejection Rate • Fairness Metrics  │
└─────────────────────────────────────────────────────────┘
```

The research methodology follows the sequence of problem identification, data
collection, preprocessing, forecasting, optimization, implementation and
evaluation. fileciteturn5file0

---

# 🏗️ System Architecture

The proposed architecture contains **five main layers**:

```text
                    ┌───────────────────────┐
                    │     DATA SOURCES      │
                    ├───────────────────────┤
                    │ Railway Ticketing     │
                    │ Passenger Records     │
                    │ Train Schedules       │
                    │ Route Data            │
                    │ Weather / Events      │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   DATA PROCESSING     │
                    ├───────────────────────┤
                    │ Cleaning              │
                    │ Feature Engineering   │
                    │ Normalization         │
                    │ OD Demand Matrices    │
                    └───────────┬───────────┘
                                │
                                ▼
             ┌─────────────────────────────────────┐
             │       FORECASTING MODULE             │
             ├─────────────────────────────────────┤
             │                                     │
             │   LSTM          GNN                 │
             │   Temporal      Spatial             │
             │       \          /                  │
             │        \        /                   │
             │       Hybrid Spatio-Temporal        │
             │              Model                  │
             └──────────────────┬──────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   MILP OPTIMIZATION   │
                    ├───────────────────────┤
                    │ Demand                │
                    │ Capacity              │
                    │ Fairness              │
                    │ Operational Rules     │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │ DECISION DASHBOARD    │
                    ├───────────────────────┤
                    │ Forecasts             │
                    │ Seat Recommendations  │
                    │ Metrics & Alerts      │
                    └───────────────────────┘
```

The architecture shown in the proposal on page 15 follows the same flow:
data collection → preprocessing → demand forecasting → optimization →
visualization/decision support. fileciteturn5file0

---

# 🧠 Spatio-Temporal Forecasting

Railway demand has two fundamental dimensions:

## ⏰ Temporal

Demand changes over time.

Examples:

```text
Morning Peak
     ↓
High commuter demand
     ↓
Midday
     ↓
Lower demand
     ↓
Evening Peak
     ↓
High commuter demand
```

The research uses **LSTM** to model temporal dependencies.

---

## 🗺️ Spatial

Railway stations are connected through routes and passenger movement.

A railway network can be represented as:

```text
        Station A
           │
           │
        Station B ───── Station D
           │
           │
        Station C
```

Where:

- **Nodes** = railway stations
- **Edges** = railway connections

The research uses **Graph Neural Networks (GNNs)** to learn these spatial
dependencies.

---

# 🔵 LSTM Temporal Model

### Purpose

The LSTM component captures time-dependent passenger-demand patterns.

### Inputs

- Historical passenger demand
- Date
- Time
- Day type
- Temporal features
- Seasonal indicators

### Learns

- Daily patterns
- Weekly patterns
- Seasonal patterns
- Long-term temporal dependencies

### Output

```text
Predicted Passenger Demand
```

The proposal specifies LSTM for temporal modeling of demand patterns such as
daily, weekly and seasonal variations. fileciteturn5file0

---

# 🟣 GNN Spatial Model

### Purpose

The GNN component captures relationships between railway stations.

### Graph Representation

```text
Node → Railway Station
Edge → Railway Connection
Weight → Network / Demand Relationship
```

### Input

```text
Railway Network Graph
```

### Output

```text
Spatial Demand Relationships
```

The proposal specifies GNNs for learning spatial dependencies between
interconnected railway stations. fileciteturn5file0

---

# 🧬 Hybrid Spatio-Temporal Model

The core forecasting concept combines:

```text
                ┌───────────────┐
                │ Passenger Data│
                └───────┬───────┘
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
        ┌─────────┐           ┌─────────┐
        │  LSTM   │           │   GNN   │
        │Temporal │           │ Spatial │
        └────┬────┘           └────┬────┘
             │                     │
             └──────────┬──────────┘
                        ▼
              ┌──────────────────┐
              │ Feature Fusion   │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ Demand Forecast  │
              └──────────────────┘
```

The proposal states that LSTM and GNN outputs are combined to generate demand
predictions across both time and space. fileciteturn5file0

---

# 📊 Baseline Models

The research does not rely only on advanced AI models.

It benchmarks against:

| Model | Role |
|---|---|
| **ARIMA** | Classical statistical baseline |
| **Prophet** | Time-series baseline |
| **LSTM** | Temporal deep-learning model |
| **GNN** | Spatial graph-learning model |
| **Hybrid Model** | Combined spatio-temporal forecasting |

This allows the research to determine whether the proposed approach provides
measurable improvement over established forecasting methods.

---

# 💺 Adaptive Seat Allocation

After demand forecasting, predicted demand becomes an input to the
optimization stage.

```text
Predicted Demand
       +
Train Capacity
       +
Route Demand
       +
Fairness Constraints
       +
Operational Policies
       ↓
     MILP
       ↓
Optimized Seat Allocation
```

### Main goals

- 🪑 Maximize seat utilization
- 🚫 Minimize overcrowding
- ⚖️ Ensure fair seat distribution
- 📉 Reduce unmet passenger demand
- 🚆 Respect train capacity
- 📋 Respect operational policies

These objectives and constraints are defined in the proposal's methodology. fileciteturn5file0

---

# 🧮 Optimization Model

The seat allocation problem is formulated as a **Mixed Integer Linear
Programming (MILP)** problem.

## Inputs

```text
Demand Forecast
Train Capacity
Route Demand
Fairness Parameters
Operational Constraints
```

## Optimization

```text
                ┌────────────────────┐
                │ Predicted Demand   │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Optimization Model │
                │       MILP         │
                └─────────┬──────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
         Capacity      Fairness     Operational
         Constraints   Constraints  Constraints
             │            │            │
             └────────────┼────────────┘
                          ▼
                 Optimal Allocation
```

For large-scale scenarios, the proposal also identifies **heuristic methods**
as a potential approach when exact optimization becomes computationally
expensive. fileciteturn5file0

---

# 📋 Dataset

The proposal defines a sample dataset containing both spatial and temporal
attributes.

| Attribute | Description |
|---|---|
| `Origin Station` | Starting station |
| `Destination Station` | Ending station |
| `Date` | Travel date |
| `Time` | Travel time |
| `Passenger Count` | Number of passengers |
| `Train ID` | Train identifier |
| `Weather Condition` | External demand factor |
| `Day Type` | Weekday/weekend indicator |

This dataset is used to construct **Origin-Destination demand matrices** for
model training. fileciteturn5file0

---

# 🧹 Data Processing Pipeline

```text
Raw Dataset
     │
     ▼
┌───────────────┐
│ Data Cleaning │
└───────┬───────┘
        ▼
┌──────────────────────┐
│ Missing Value Handle │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Feature Engineering  │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Normalization        │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ OD Matrix Generation │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Train / Test Split   │
└──────────┬───────────┘
           ▼
       Model Input
```

### Feature Engineering

The proposal specifically identifies features such as:

- Time of day
- Day of week
- Peak-hour indicators
- Seasonal patterns

fileciteturn5file0

---

# 📈 Evaluation

The system is evaluated using both **prediction metrics** and
**operational metrics**.

## 🔮 Forecasting Metrics

### MAE

**Mean Absolute Error**

Measures the average absolute prediction error.

### RMSE

**Root Mean Square Error**

Penalizes larger prediction errors more strongly.

### MAPE

**Mean Absolute Percentage Error**

Measures prediction error as a percentage.

---

## 🚆 Operational Metrics

| Metric | Purpose |
|---|---|
| Seat Utilization Rate | Measures effective use of available capacity |
| Passenger Demand Satisfaction | Measures how much demand is successfully accommodated |
| Booking Rejection Rate | Measures rejected/unmet booking demand |
| Overcrowding Reduction | Measures improvement in passenger capacity conditions |

---

# 🧪 Validation Strategy

The research uses three main validation approaches.

### 1. Baseline Comparison

```text
ARIMA
  VS
Prophet
  VS
LSTM
  VS
GNN
  VS
Hybrid Spatio-Temporal Model
```

### 2. Scenario-Based Simulation

```text
Normal Demand
      VS
Peak Demand
      VS
Off-Peak Demand
```

### 3. Sensitivity Analysis

Test how changes in passenger-demand conditions affect:

- Forecast accuracy
- Seat utilization
- Booking rejection
- Fairness
- Overcrowding

The validation strategy is defined in the proposal methodology. fileciteturn5file0

---

# 🎯 Research Targets

The proposal establishes the following measurable targets:

| Target | Proposed Goal |
|---|---:|
| Data completeness & consistency | ≥ 95% |
| MAE improvement | ≥ 15% |
| Seat utilization improvement | ≥ 20% |
| Forecasting evaluation | MAE, RMSE, MAPE |
| Allocation evaluation | Utilization, satisfaction, rejection, overcrowding |

> These values are **research objectives/targets** and are not presented as
> achieved results until experiments are completed.

fileciteturn5file0

---

# 🖥️ Decision-Support Dashboard

The proposed system includes a visualization and decision-support layer.

Expected dashboard capabilities include:

### 📊 Demand Forecast Visualization

Display predicted passenger demand across:

- Stations
- Routes
- OD pairs
- Time periods

### 💺 Seat Allocation Recommendations

Display optimized allocation results generated by the optimization engine.

### 📈 Performance Monitoring

Display:

- MAE
- RMSE
- MAPE
- Seat utilization
- Demand satisfaction
- Booking rejection
- Overcrowding indicators

### 🚨 Alerts

Potentially highlight:

- High-demand routes
- Capacity pressure
- Overcrowding risk
- Low utilization
- Unusual demand patterns

The proposal identifies demand prediction visualization, seat-allocation
recommendations, performance metrics and alerts as dashboard features. fileciteturn5file0

---

# ⚙️ Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | Upload/input railway operational data |
| FR2 | Preprocess uploaded datasets |
| FR3 | Generate temporal features |
| FR4 | Model spatial station relationships |
| FR5 | Generate OD passenger-demand forecasts |
| FR6 | Execute adaptive seat allocation |
| FR7 | Respect train capacity and operational constraints |
| FR8 | Support fairness in allocation |
| FR9 | Visualize forecasts and allocation results |
| FR10 | Monitor forecasting and operational metrics |
| FR11 | Store and retrieve historical forecasts and allocation results |

These functional requirements are defined in the proposal. fileciteturn5file0

---

# 🛡️ Non-Functional Requirements

| Category | Requirement |
|---|---|
| ⚡ Performance | Forecast query target of within 5 seconds under normal conditions |
| 📈 Scalability | Support growing railway networks and passenger data |
| 🔄 Reliability | Maintain consistent prediction performance and availability |
| 🔐 Security | Protect passenger and operational data |
| 🎨 Usability | Provide an intuitive dashboard |
| 🛠️ Maintainability | Support model retraining and component updates |
| 🌐 Availability | Target continuous access for authorized users |

The proposal specifies these quality requirements for the prototype system. fileciteturn5file0

---

# 🛠️ Technology Stack

The proposal identifies the following technologies and libraries.

## 🐍 Core

- **Python**

## 🧠 Deep Learning

- **TensorFlow** and/or **PyTorch**
- LSTM
- GNN

## 📊 Machine Learning

- **Scikit-learn**
- ARIMA / baseline forecasting workflow
- Prophet / baseline forecasting workflow

## 🗺️ Graph Modeling

- **NetworkX**
- **PyTorch Geometric**

## 📦 Data Processing

- **Pandas**
- **NumPy**

## 🧮 Optimization

- **PuLP**
- **OR-Tools**
- MILP
- Heuristic optimization for large-scale scenarios

These technologies are specified in the proposal's Tools and Platform section.
fileciteturn5file0

---

# 📁 Recommended Project Structure

```text
CeylonRail-AI/
│
├── README.md
│
├── data/
│   ├── raw/
│   ├── processed/
│   ├── external/
│   └── sample/
│
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_preprocessing.ipynb
│   ├── 03_arima_baseline.ipynb
│   ├── 04_prophet_baseline.ipynb
│   ├── 05_lstm_forecasting.ipynb
│   ├── 06_gnn_forecasting.ipynb
│   └── 07_model_comparison.ipynb
│
├── src/
│   ├── data/
│   │   ├── collection/
│   │   ├── preprocessing/
│   │   └── features/
│   │
│   ├── forecasting/
│   │   ├── arima/
│   │   ├── prophet/
│   │   ├── lstm/
│   │   ├── gnn/
│   │   └── hybrid/
│   │
│   ├── optimization/
│   │   ├── milp/
│   │   ├── heuristics/
│   │   └── constraints/
│   │
│   ├── evaluation/
│   │   ├── forecasting_metrics/
│   │   └── allocation_metrics/
│   │
│   └── utils/
│
├── models/
│   ├── checkpoints/
│   └── trained/
│
├── outputs/
│   ├── forecasts/
│   ├── allocations/
│   ├── metrics/
│   └── visualizations/
│
├── dashboard/
│
├── docs/
│   ├── architecture/
│   ├── methodology/
│   └── research/
│
├── requirements.txt
└── .gitignore
```

> This is a recommended organization for the component. The proposal defines
> the research architecture and technologies, but does not prescribe this
> exact repository directory structure.

---

# 💻 Installation

## 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd CeylonRail-AI
```

## 2. Create a Python Virtual Environment

### Windows

```bash
python -m venv .venv
```

Activate:

```bash
.venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

A typical research environment may include the libraries identified in the
proposal:

```text
pandas
numpy
scikit-learn
networkx
tensorflow / pytorch
torch-geometric
pulp / ortools
```

> Keep the actual `requirements.txt` synchronized with the packages used by
> the implementation.

---

# ▶️ Running the Component

Because the proposal defines the research architecture rather than a final
runtime command, the exact application entry point depends on the repository
implementation.

A typical research workflow can be executed as:

```bash
# 1. Activate environment
.venv\Scripts\activate

# 2. Prepare data
python src/data/preprocessing/<preprocessing_script>.py

# 3. Train forecasting model
python src/forecasting/<training_script>.py

# 4. Run demand prediction
python src/forecasting/<prediction_script>.py

# 5. Run adaptive allocation
python src/optimization/<allocation_script>.py

# 6. Evaluate results
python src/evaluation/<evaluation_script>.py
```

Replace the placeholder script names with the actual files in the repository.

---

# 🔬 Research Workflow

The component follows a **Design Science Research (DSR)** approach combined
with experimental evaluation.

```text
┌───────────────────────────┐
│ 1. Problem Identification │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 2. Literature Review      │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 3. Data Collection        │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 4. Data Preprocessing     │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 5. Baseline Models        │
│    ARIMA + Prophet        │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 6. LSTM Development       │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 7. GNN Development        │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 8. Hybrid Integration     │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 9. MILP Seat Allocation   │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 10. Module Integration    │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 11. Testing & Evaluation  │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 12. Results & Validation   │
└───────────────────────────┘
```

---

# 🧪 Experiment Scenarios

## 🟢 Normal Demand

Evaluate the system under regular passenger demand.

```text
Historical Demand
       ↓
Forecast
       ↓
Allocate
       ↓
Evaluate
```

## 🔴 Peak Demand

Evaluate performance when demand is significantly higher.

```text
High Demand
     ↓
Forecast
     ↓
Capacity Pressure
     ↓
Adaptive Allocation
     ↓
Fairness + Utilization Analysis
```

## 🔵 Off-Peak Demand

Evaluate whether the system can reduce unused capacity.

```text
Low Demand
    ↓
Forecast
    ↓
Allocation
    ↓
Utilization Analysis
```

## 🟣 Sensitivity Analysis

Vary demand conditions and observe changes in:

- Prediction accuracy
- Seat utilization
- Passenger satisfaction
- Booking rejection
- Overcrowding
- Fairness

---

# 📊 Expected Outcomes

The research expects the proposed framework to contribute toward:

### 🎯 Better Forecasting

Improved prediction of passenger demand across both time and railway-network
locations.

### 💺 Better Seat Utilization

More effective use of available seating capacity.

### 🚫 Reduced Overcrowding

Better allocation during peak demand.

### ⚖️ Fairer Allocation

Allocation decisions that incorporate fairness constraints.

### 📈 Better Decision Support

Providing railway operators with predictive and prescriptive insights.

### 🇱🇰 Sri Lanka-Specific Intelligence

A framework designed around the operational and data constraints of Sri
Lanka's railway environment.

These are **expected research outcomes**, not completed performance claims. fileciteturn5file0

---

# 👥 Stakeholders

The proposal identifies four primary stakeholder groups.

| Stakeholder | How the System Helps |
|---|---|
| 🚆 Railway Administrators | Operational planning and resource allocation |
| 📊 Transport Planners | Demand insights and capacity planning |
| 👥 Passengers | Improved seat availability and reduced overcrowding |
| 🛠️ System Administrators | System maintenance, updates and security |

---

# 💼 Commercial Potential

Although this is an academic research project, the proposal identifies
potential commercialization pathways.

## Target Market

- Sri Lanka Railway Department
- Urban transportation authorities
- Metro and rail operators
- Transportation planning agencies
- Smart-city initiatives

## Possible Revenue Models

### 💻 Software Licensing

Licensing the platform to railway or transportation authorities.

### ☁️ Software-as-a-Service

Cloud-based access through subscription plans.

### 📊 Consulting & Analytics

Customized transportation analytics and planning services.

### 🏢 Enterprise Deployment

Custom deployments for large transportation organizations.

---

# 🏆 Competitive Advantage

The proposed system differentiates itself through:

```text
Spatio-Temporal Forecasting
          +
LSTM
          +
GNN
          +
Adaptive Seat Allocation
          +
MILP Optimization
          +
Fairness Constraints
          +
Railway-Specific Context
```

Key advantages include:

- Integrated forecasting + allocation
- Advanced AI modeling
- Railway-network spatial intelligence
- Fairness-aware optimization
- Scalable architecture
- Decision-support capability
- Sri Lanka-specific context

fileciteturn5file0

---

# 🔐 Privacy & Ethics

Passenger data must be handled responsibly.

The research proposal specifies:

- Passenger data anonymization
- Removal of personally identifiable information
- Data aggregation
- Research-only use
- Secure storage
- Controlled access
- Compliance with relevant data-protection requirements
- Ethical approval where required

### 🚫 Never commit sensitive data

Do not upload:

```text
Personal passenger information
National ID numbers
Phone numbers
Payment information
Passwords
API keys
Private credentials
Confidential railway records
```

The proposal's ethical appendix explicitly states that passenger data should be
anonymized and that personally identifiable information should not be used. fileciteturn5file0

---

# 📈 Scalability & Security

## Scalability

The proposed architecture is designed to:

- Support larger railway networks
- Handle increasing passenger datasets
- Add new components modularly
- Support large-scale forecasting
- Use heuristic approaches where optimization becomes computationally heavy

## Security

The proposed system considers:

- Data anonymization
- Secure data storage
- Authentication
- Access control
- Controlled data access
- Data-protection compliance

---

# ⚠️ Risk Management

| Risk | Level | Mitigation |
|---|---|---|
| Limited railway datasets | 🔴 High | Public datasets + realistic simulation |
| Data quality problems | 🔴 High | Cleaning, normalization and validation |
| Privacy concerns | 🔴 High | Anonymization and ethical data handling |
| Model overfitting | 🟠 Medium | Regularization, validation and tuning |
| Limited computing resources | 🟠 Medium | Cloud/GPU resources |
| Model accuracy below target | 🟠 Medium | Compare multiple models |
| Railway integration challenges | 🟠 Medium | Modular architecture + incremental testing |
| Large-scale optimization | 🟢 Low | Heuristics / approximate solutions |

The risk levels and mitigation strategies are based on the proposal's risk
analysis. fileciteturn5file0

---

# 🗓️ Research Timeline

The proposal's 20-week component plan is:

| Task | Duration |
|---|---:|
| Literature Review | Weeks 1–2 |
| Data Collection & Preparation | Weeks 3–4 |
| Data Preprocessing & Feature Engineering | Weeks 5–6 |
| ARIMA / Prophet Baselines | Week 7 |
| LSTM Development | Weeks 8–9 |
| GNN Development | Weeks 10–11 |
| Spatio-Temporal Integration | Week 12 |
| MILP Seat Allocation | Weeks 13–14 |
| Forecasting + Allocation Integration | Week 15 |
| Testing & Evaluation | Weeks 16–17 |
| Performance Analysis | Week 18 |
| Documentation & Report | Weeks 19–20 |

This sequence is taken from the proposal's WBS on pages 24–25. fileciteturn5file0

---

# 💰 Research Budget

The proposal estimates a total research budget of:

## **LKR 130,000**

| Item | Estimated Cost |
|---|---:|
| ☁️ Cloud Computing | LKR 45,000 |
| 💾 Data Storage | LKR 10,000 |
| 🛠️ Software Tools & Libraries | LKR 15,000 |
| 💽 External Storage Device | LKR 12,000 |
| 📄 Research Materials | LKR 8,000 |
| 🌐 Internet & Data Access | LKR 10,000 |
| 👩‍💻 Human Effort | LKR 20,000 |
| 🧾 Contingency | LKR 10,000 |
| **Total** | **LKR 130,000** |

The budget is proposed for research planning and is not necessarily the actual
final expenditure. fileciteturn5file0

---

# 🧩 Project Work Breakdown

```text
Advanced Spatio-Temporal Demand Forecasting
        &
Adaptive Seat Allocation
                │
 ┌──────────────┼──────────────────┐
 ▼              ▼                  ▼
Research       Data               Models
 │             │                  │
 ├─ Literature ├─ Collection      ├─ ARIMA
 ├─ Gap        ├─ Cleaning        ├─ Prophet
 └─ Objectives ├─ Integration     ├─ LSTM
               └─ Features        └─ GNN
                                      │
                                      ▼
                              Spatio-Temporal
                                 Integration
                                      │
                                      ▼
                              MILP Optimization
                                      │
                                      ▼
                               Prototype System
                                      │
                                      ▼
                               Evaluation
                                      │
                                      ▼
                               Documentation
```

---

# 🌱 Sustainable Development

The research directly aligns with:

## 🏙️ SDG 11 — Sustainable Cities and Communities

The system aims to contribute to safer, more efficient and sustainable public
transportation by improving railway capacity utilization and reducing
overcrowding.

---

# 📚 Research References

The proposal references the following works:

1. G. E. P. Box, G. M. Jenkins, and G. C. Reinsel, *Time Series Analysis:
   Forecasting and Control*, Wiley, 2015.

2. L. Breiman, “Random Forests,” *Machine Learning*, vol. 45, no. 1,
   pp. 5–32, 2001.

3. H. Drucker, C. J. Burges, L. Kaufman, A. Smola, and V. Vapnik,
   “Support Vector Regression Machines,” NeurIPS, 1997.

4. S. Hochreiter and J. Schmidhuber, “Long Short-Term Memory,”
   *Neural Computation*, vol. 9, no. 8, pp. 1735–1780, 1997.

5. X. Ma, Z. Tao, Y. Wang, H. Yu, and Y. Wang,
   “Long short-term memory neural network for traffic speed prediction,”
   *Transportation Research Part C*, vol. 54, pp. 187–197, 2015.

6. T. Kipf and M. Welling,
   “Semi-Supervised Classification with Graph Convolutional Networks,”
   ICLR, 2017.

7. Y. Li, R. Yu, C. Shahabi, and Y. Liu,
   “Diffusion Convolutional Recurrent Neural Network,” ICLR, 2018.

8. B. Yu, H. Yin, and Z. Zhu,
   “Spatio-Temporal Graph Convolutional Networks,” IJCAI, 2018.

9. A. Vaswani et al.,
   “Attention Is All You Need,” NeurIPS, 2017.

10. C. Zheng, X. Fan, C. Wang, and J. Qi,
    “GMAN: A Graph Multi-Attention Network for Traffic Prediction,” AAAI,
    2020.

11. H. Yao, X. Tang, H. Wei, G. Zheng, and Z. Li,
    “Modeling Spatial-Temporal Dynamics for Traffic Prediction,” AAAI, 2018.

12. D. E. Goldberg,
    *Genetic Algorithms in Search Optimization and Machine Learning*,
    Addison-Wesley, 1989.

13. J. Kennedy and R. Eberhart,
    “Particle Swarm Optimization,” ICNN, 1995.

14. J.-F. Cordeau, G. Laporte, M. W. Savelsbergh, and D. Vigo,
    “Transportation Resource Allocation Models,” *Transportation Science*,
    vol. 41, no. 2, pp. 123–140, 2007.

The reference list above is reproduced from the submitted research proposal. fileciteturn5file0

---

# 🎓 Academic Information

| Field | Details |
|---|---|
| **Researcher** | Senawirathna D.M.N.T |
| **Student ID** | IT22151506 |
| **Degree** | B.Sc. (Hons) Degree in Information Technology |
| **Specialization** | Information Technology |
| **Module** | IT4010 Research Project |
| **Project ID** | R26-IT-127 |
| **Research Topic** | Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI |
| **Department** | Department of Information Technology |
| **University** | Sri Lanka Institute of Information Technology |
| **Supervisor** | Ms. Chathurangika Kahadawaarachchi |
| **Proposal Date** | March 2026 |

fileciteturn5file0

---

# 👩‍💻 Researcher

## Senawirathna D.M.N.T

**Student ID:** `IT22151506`

**Research Area:**

> AI-Driven Spatio-Temporal Railway Demand Forecasting and Adaptive Seat
> Allocation

**Focus:**

```text
Artificial Intelligence
        +
Deep Learning
        +
Graph Neural Networks
        +
Time-Series Forecasting
        +
Optimization
        +
Smart Transportation
```

---

# 👩‍🏫 Supervisor

**Ms. Chathurangika Kahadawaarachchi**

Supervisor for the undergraduate research dissertation. fileciteturn5file0

---

# 🚆 Final Vision

```text
                  TODAY
                    │
                    ▼
        Static Railway Planning
                    │
                    ▼
              Historical Data
                    │
                    ▼
                  ─────
                    │
                    ▼
                  FUTURE
                    │
                    ▼
          AI Demand Forecasting
                    │
                    ▼
          Railway Network Intelligence
                    │
                    ▼
          Adaptive Seat Allocation
                    │
                    ▼
             Fairer Capacity
                    │
                    ▼
            Reduced Overcrowding
                    │
                    ▼
          Better Passenger Experience
                    │
                    ▼
          🇱🇰 Smarter Sri Lankan
             Railway Operations
```

---

# ⭐ Why CeylonRail AI?

### **Predict. Understand. Optimize. Allocate.**

CeylonRail AI is designed around a simple principle:

> **A good forecast should not stop at prediction — it should support a better operational decision.**

By connecting **LSTM temporal learning**, **GNN spatial learning**, and
**MILP-based adaptive seat allocation**, the proposed framework bridges the
gap between passenger-demand prediction and railway capacity management.

---

<p align="center">

## 🚆 CeylonRail AI

### Advanced Spatio-Temporal Demand Forecasting & Adaptive Seat Allocation

**AI • Deep Learning • Graph Intelligence • Optimization**

<br>

🇱🇰 **Designed for Smarter Railway Transportation in Sri Lanka**

<br><br>

<strong>IT4010 Research Project • R26-IT-127</strong>

</p>

---

## 📄 Source

This README is based on the submitted **Project Proposal Report**:

> *Advanced Spatio Temporal Demand Forecasting and Adaptive Seat Allocation
> using AI*  
> **R26-IT-127 — IT22151506 — Senawirathna D.M.N.T**

fileciteturn5file0
