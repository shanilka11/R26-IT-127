# 🚆 CeylonRail AI

<p align="center">
  <img src="https://img.shields.io/badge/Research-IT4010-2563EB?style=for-the-badge" alt="IT4010 Research Project">
  <img src="https://img.shields.io/badge/Project-R26--IT--127-0F766E?style=for-the-badge" alt="Project ID">
  <img src="https://img.shields.io/badge/AI-Railway%20Intelligence-0B3D91?style=for-the-badge" alt="AI Railway Intelligence">
  <img src="https://img.shields.io/badge/Platform-Sri%20Lanka%20Railways-166534?style=for-the-badge" alt="Sri Lanka Railways">
</p>

<h1 align="center">🚆 CeylonRail AI</h1>

<h3 align="center">AI-Driven Intelligent Railway Operations System for Sri Lanka</h3>

<p align="center">
  <strong>Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI</strong>
</p>

<p align="center">
  An intelligent, data-driven railway decision-support platform designed to
  improve passenger demand forecasting, capacity management, seat utilization,
  and passenger fairness in Sri Lankan railway operations.
</p>

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Research Problem](#-research-problem)
- [Research Objective](#-research-objective)
- [Research Scope](#-research-scope)
- [Research Component](#-research-component)
- [Key Features](#-key-features)
- [Overall System](#-overall-system)
- [System Architecture](#-system-architecture)
- [AI and Machine Learning](#-ai-and-machine-learning)
- [Adaptive Seat Allocation](#-adaptive-seat-allocation)
- [Data Pipeline](#-data-pipeline)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Installation Requirements](#-installation-requirements)
- [Installation Guide](#-installation-guide)
- [Run Guide](#-run-guide)
- [Three-Terminal Workflow](#-three-terminal-workflow)
- [Environment Verification](#-environment-verification)
- [Common Issues](#-common-issues)
- [Research Methodology](#-research-methodology)
- [Evaluation Framework](#-evaluation-framework)
- [Research Data](#-research-data)
- [Privacy and Ethical Considerations](#-privacy-and-ethical-considerations)
- [Research Gap](#-research-gap)
- [Research Novelty](#-research-novelty)
- [Sustainable Development Goals](#-sustainable-development-goals)
- [Research Team](#-research-team)
- [Supervisor](#-supervisor)
- [Academic Information](#-academic-information)
- [Documentation](#-documentation)
- [Future Improvements](#-future-improvements)
- [Disclaimer](#-disclaimer)
- [References](#-references)
- [Project Vision](#-project-vision)

---

# 🚆 About the Project

**CeylonRail AI** is an academic research and software development project
developed for the **IT4010 Research Project – 2026 January** at the
**Sri Lanka Institute of Information Technology (SLIIT)**.

The overall research project is titled:

> **AI-Driven Intelligent Railway Operations System for Sri Lanka**

The project proposes an integrated AI-driven decision-support framework for
improving railway operational efficiency, passenger service quality, revenue
protection, and data-driven decision making.

This repository focuses on the research component:

> **Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI**

The component investigates how historical, contextual, and railway-network
data can be used to predict passenger demand and support adaptive seat
allocation while considering capacity, operational constraints, and fairness.

---

# ❗ Research Problem

Railway transportation in Sri Lanka serves millions of passengers and remains
an important and affordable mode of transportation. However, several
operational challenges affect service quality and resource utilization.

Major challenges include:

- 📉 Inaccurate passenger demand estimation
- 🚆 Unpredictable passenger volumes
- 💺 Inefficient or static seat allocation
- 👥 Overcrowding during peak travel periods
- 📊 Limited predictive decision-support capabilities
- 🔄 Reactive rather than proactive operational management
- ⚖️ Lack of fairness-aware capacity allocation
- 📈 Limited integration between forecasting and operational decisions

Traditional approaches rely heavily on static timetables, historical
assumptions, and rule-based allocation.

CeylonRail AI investigates a transition from:

```text
STATIC / REACTIVE PLANNING
          ↓
DATA-DRIVEN PREDICTION
          ↓
INTELLIGENT CAPACITY MANAGEMENT
          ↓
ADAPTIVE DECISION SUPPORT
```

---

# 🎯 Research Objective

## Main Objective

To design and implement an integrated, AI-driven decision-support system that
improves operational efficiency, passenger service quality, and fraud
mitigation in Sri Lanka Railways while ensuring fairness and robustness under
uncertainty.

The wider research project integrates:

- Passenger demand forecasting
- Adaptive seat allocation
- Real-time train tracking
- Probabilistic delay prediction
- Intelligent fraud detection
- Multi-objective train scheduling
- Capacity optimization

---

# 🔬 Research Scope

The overall project consists of four major research components.

| Component | Research Area |
|---|---|
| 01 | Advanced Intelligent Ticket Fraud Detection and Risk-Aware Passenger Verification |
| 02 | Intelligent Real-Time Train Tracking and Probabilistic Delay Prediction |
| 03 | Multi-Objective Optimization Framework for Train Scheduling and Capacity Management |
| 04 | Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI |

This repository's primary research focus is **Component 04**.

---

# 🧠 Research Component

## Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI

The research component contains two tightly connected areas.

### 01. Spatio-Temporal Passenger Demand Forecasting

The system collects, integrates, and preprocesses multiple sources of railway
data to construct high-resolution Origin-Destination (OD) demand matrices.

The forecasting stage investigates:

- Historical passenger demand
- Ticketing information
- Origin-Destination relationships
- Railway routes
- Station characteristics
- Calendar information
- Seasonal events
- Route characteristics
- Peak and off-peak patterns

### 02. Adaptive Seat Allocation

Predicted demand is used to formulate an adaptive seat allocation problem
subject to:

- Train capacity
- Predicted passenger demand
- Fairness criteria
- Operational policies
- Capacity constraints
- Allocation objectives

The proposed allocation problem can be solved using **integer linear
programming and heuristic optimization techniques**.

---

# ✨ Key Features

## 📊 AI Passenger Demand Forecasting

The research evaluates both traditional statistical models and advanced
deep-learning approaches.

### Baseline Models

- ARIMA
- Prophet

### Deep Learning Models

- LSTM
- GRU
- Temporal Convolutional Networks (Temporal CNN)

The models are evaluated to determine their suitability for railway
passenger-demand forecasting.

---

## 🗺️ Spatio-Temporal Analytics

The system considers both temporal and spatial characteristics.

### Temporal Factors

- Daily patterns
- Weekly patterns
- Seasonal patterns
- Holidays
- Calendar events
- Peak periods
- Off-peak periods

### Spatial Factors

- Railway stations
- Railway routes
- Origin-Destination pairs
- Station connectivity
- Route characteristics
- Railway network relationships

---

## 💺 Adaptive Seat Allocation

The system uses predicted demand to support adaptive capacity allocation.

```text
                 PREDICTED DEMAND
                        │
                        ▼
              ┌───────────────────┐
              │ Capacity Analysis │
              └─────────┬─────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
      Capacity       Fairness     Operational
      Constraints    Criteria     Policies
          │             │             │
          └─────────────┼─────────────┘
                        ▼
               Optimization Model
                        │
                        ▼
                Adaptive Allocation
                        │
                        ▼
                 Simulation & KPI
```

---

# ⚖️ Fairness-Aware Allocation

The allocation process is not designed only to maximize seat utilization.

It investigates the trade-off between:

```text
Passenger Demand
       +
Available Capacity
       +
Passenger Fairness
       +
Operational Constraints
       +
Seat Utilization
       ↓
Adaptive Seat Allocation
```

This provides a research basis for evaluating whether predictive capacity
management can improve resource utilization without sacrificing fairness.

---

# 🏗️ Overall System

The wider research framework receives multiple operational data sources and
passes them through intelligent modules.

```text
┌──────────────────────────────────────────────────────┐
│                    INPUT DATA                        │
├──────────────────────────────────────────────────────┤
│ Historical / Simulated Ticketing Data                │
│ GPS and Station Timestamp Data                       │
│ Timetable and Rolling Stock Data                     │
│ Calendar Events and Seasonal Indicators              │
└──────────────────────────┬───────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                  INTELLIGENT MODULES                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Spatio-Temporal Demand Forecasting                  │
│  Adaptive Seat Allocation                            │
│  Probabilistic Delay Prediction                      │
│  Intelligent Fraud Detection                         │
│  Multi-Objective Scheduling                          │
│                                                      │
└──────────────────────────┬───────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                      OUTPUTS                         │
├──────────────────────────────────────────────────────┤
│ Demand-Aware Seat Allocation Plans                   │
│ Uncertainty-Aware Arrival Predictions                │
│ Risk-Scored Inspection Recommendations               │
│ Optimized Train Schedules                             │
│ Trade-Off Visualizations                              │
└──────────────────────────────────────────────────────┘
```

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │      DATA SOURCES    │
                         ├──────────────────────┤
                         │ Ticketing Data       │
                         │ Train Data           │
                         │ Timetable Data       │
                         │ GPS / Station Data   │
                         │ Calendar Data        │
                         │ Seasonal Data        │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   DATA PROCESSING    │
                         ├──────────────────────┤
                         │ Cleaning             │
                         │ Integration          │
                         │ Feature Engineering  │
                         │ Normalization        │
                         │ OD Matrix Creation   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────┐
                 │       AI / ML PROCESSING         │
                 ├──────────────────────────────────┤
                 │ ARIMA                            │
                 │ Prophet                          │
                 │ LSTM                             │
                 │ GRU                              │
                 │ Temporal CNN                     │
                 │ Network / Graph Analytics        │
                 └────────────────┬─────────────────┘
                                  │
                                  ▼
                         ┌──────────────────────┐
                         │ ADAPTIVE ALLOCATION  │
                         ├──────────────────────┤
                         │ Demand Constraints   │
                         │ Capacity Constraints │
                         │ Fairness Criteria    │
                         │ Optimization          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     EVALUATION       │
                         ├──────────────────────┤
                         │ MAE                  │
                         │ RMSE                 │
                         │ MAPE                 │
                         │ R²                   │
                         │ Utilization          │
                         │ Fairness             │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   CEYLONRAIL AI      │
                         │     DASHBOARD        │
                         └──────────────────────┘
```

---

# 🔄 Data Pipeline

```text
Raw Railway Data
       │
       ▼
Data Collection
       │
       ▼
Data Cleaning
       │
       ▼
Data Integration
       │
       ▼
Feature Engineering
       │
       ▼
OD Demand Matrix
       │
       ▼
Train / Validation / Test Split
       │
       ▼
Model Training
       │
       ▼
Demand Prediction
       │
       ▼
Adaptive Seat Allocation
       │
       ▼
Simulation
       │
       ▼
Evaluation
       │
       ▼
Research Findings
```

---

# 🤖 AI and Machine Learning

## Forecasting Models

| Model | Category | Research Purpose |
|---|---|---|
| ARIMA | Statistical | Baseline time-series forecasting |
| Prophet | Statistical | Baseline forecasting with temporal patterns |
| LSTM | Deep Learning | Sequence-based demand forecasting |
| GRU | Deep Learning | Efficient sequence forecasting |
| Temporal CNN | Deep Learning | Temporal pattern extraction |

---

# 📈 Model Evaluation

The forecasting models can be evaluated using:

### MAE — Mean Absolute Error

Measures the average absolute difference between predicted and actual demand.

### RMSE — Root Mean Squared Error

Penalizes larger prediction errors more strongly.

### MAPE — Mean Absolute Percentage Error

Measures prediction error relative to actual demand.

### R² — Coefficient of Determination

Measures how much variation in the target is explained by the model.

---

# 💺 Seat Allocation Evaluation

Adaptive allocation strategies can be compared against static allocation
strategies using:

| Metric | Description |
|---|---|
| Seat Utilization | Percentage/use of available seating capacity |
| Booking Rejection Rate | Proportion of rejected booking demand |
| Fairness Index | Measures fairness of allocation |
| MAE | Demand prediction error |
| RMSE | Demand prediction error |
| MAPE | Percentage prediction error |

Experiments include normal-demand and peak-demand scenarios.

---

# 🧪 Research Methodology

The research follows a structured experimental methodology.

```text
1. Data Collection
       ↓
2. Data Preprocessing
       ↓
3. Feature Engineering
       ↓
4. Dataset Construction
       ↓
5. Baseline Model Development
       ↓
6. Advanced Model Development
       ↓
7. Model Evaluation
       ↓
8. Demand Forecasting
       ↓
9. Adaptive Seat Allocation
       ↓
10. Simulation Experiments
       ↓
11. Comparative Analysis
       ↓
12. Research Findings
```

---

# 📦 Technology Stack

## Frontend

- React-based web application
- JavaScript
- Data visualization
- Dashboard components
- Forecasting visualizations
- Research analytics interfaces

## Backend

- Node.js
- JavaScript
- API services
- Application logic
- Communication with Python services

## AI / Data Processing

- Python
- Statistical forecasting
- Machine learning
- Deep learning
- Data preprocessing
- Model evaluation
- Optimization and simulation

## Development Tools

- Visual Studio Code
- Git
- GitHub / GitHub Desktop
- Node.js
- Python

---

# 📁 Project Structure

```text
CeylonRail/
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── public/
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── data/
│   ├── raw/
│   ├── processed/
│   ├── predictions/
│   └── graph/
│
├── models/
│   ├── forecasting/
│   ├── allocation/
│   └── ...
│
├── evaluation/
│   ├── metrics/
│   ├── charts/
│   ├── comparisons/
│   └── reports/
│
├── docs/
│   ├── proposal/
│   ├── architecture/
│   ├── methodology/
│   └── diagrams/
│
└── README.md
```

> The exact directory structure may evolve as implementation progresses.
> The installation and run commands below follow the supplied project guide.

---

# ⚙️ Installation Requirements

## 🖥️ Supported Operating System

The supplied development environment is intended for:

- Windows 10 — 64-bit
- Windows 11 — 64-bit

---

## 📋 Required Software

| Software | Version | Purpose |
|---|---:|---|
| Python | 3.10.5 | AI / Python services |
| Node.js | 20.19.5 | Frontend and backend |
| npm | Included with Node.js | JavaScript packages |
| Visual Studio Code | Recommended | Development |
| Git | Recommended | Version control |
| GitHub Desktop | Optional | Git/GitHub management |

---

# 🐍 Install Python

Required:

```text
Python 3.10.5
```

Official installer:

```text
https://www.python.org/ftp/python/3.10.5/python-3.10.5-amd64.exe
```

### ⚠️ Important

During installation, make sure this option is selected:

```text
☑ Add Python 3.10 to PATH
```

After installation:

```bash
python --version
```

Expected:

```text
Python 3.10.5
```

---

# 🟢 Install Node.js

Required:

```text
Node.js 20.19.5
```

Official installer:

```text
https://nodejs.org/dist/v20.19.5/node-v20.19.5-x64.msi
```

Verify:

```bash
node --version
```

Expected:

```text
v20.19.5
```

Also verify npm:

```bash
npm --version
```

---

# 💻 Recommended Development Software

## Visual Studio Code

Recommended for:

- Frontend development
- Backend development
- Python development
- Terminal management
- Git integration

Download:

```text
https://code.visualstudio.com/
```

## GitHub Desktop

Optional but recommended for Git/GitHub workflow.

Download:

```text
https://desktop.github.com/
```

---

# 📥 Clone the Repository

Open Command Prompt, PowerShell, Git Bash, or the VS Code terminal.

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

Enter the project:

```bash
cd CeylonRail
```

---

# 📦 Install Project Dependencies

## 1. Frontend

Navigate to:

```bash
cd frontend
```

Install dependencies:

```bash
npm i --legacy-peer-deps
```

---

## 2. Backend

Open a new terminal and navigate to:

```bash
cd CeylonRail/backend
```

Install dependencies:

```bash
npm i --legacy-peer-deps
```

---

## 3. Python / AI Service

Open another terminal:

```bash
cd CeylonRail/backend/public
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

---

# 🚀 Run Guide

CeylonRail AI uses three application processes:

```text
┌──────────────────┐
│     FRONTEND     │
│    npm start     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     BACKEND      │
│     nodemon      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  PYTHON / AI     │
│  python main.py  │
└──────────────────┘
```

Open **three terminals**.

---

# 🟦 Terminal 01 — Frontend

```bash
cd CeylonRail/frontend
npm start
```

---

# 🟩 Terminal 02 — Backend

Open a second terminal:

```bash
cd CeylonRail/backend
nodemon
```

---

# 🟨 Terminal 03 — Python / AI Service

Open a third terminal:

```bash
cd CeylonRail/backend/public
python main.py
```

---

# 🧩 Three-Terminal Workflow

```text
┌─────────────────────────────────────────────┐
│                  VS CODE                    │
├─────────────────────────────────────────────┤
│                                             │
│ Terminal 01                                 │
│ ├── cd frontend                             │
│ └── npm start                               │
│                                             │
│ Terminal 02                                 │
│ ├── cd backend                              │
│ └── nodemon                                 │
│                                             │
│ Terminal 03                                 │
│ ├── cd backend/public                       │
│ └── python main.py                          │
│                                             │
└─────────────────────────────────────────────┘
```

---

# ⚡ Quick Start

After completing the initial installation, use:

### Terminal 1

```bash
cd frontend
npm start
```

### Terminal 2

```bash
cd backend
nodemon
```

### Terminal 3

```bash
cd backend/public
python main.py
```

---

# 🔍 Environment Verification

Before starting the project, check the required versions.

### Python

```bash
python --version
```

Expected:

```text
Python 3.10.5
```

### Node.js

```bash
node --version
```

Expected:

```text
v20.19.5
```

### npm

```bash
npm --version
```

---

# ❗ Common Issues

## Python is not recognized

If you see:

```text
'python' is not recognized as an internal or external command
```

Reinstall Python and make sure:

```text
☑ Add Python to PATH
```

is enabled.

Then restart Command Prompt or VS Code.

---

## Node.js is not recognized

If you see:

```text
'node' is not recognized as an internal or external command
```

reinstall Node.js and restart the terminal.

Verify:

```bash
node --version
npm --version
```

---

## npm Dependency Conflicts

If normal installation produces dependency conflicts, use:

```bash
npm i --legacy-peer-deps
```

for both frontend and backend.

---

## Python Dependency Errors

Make sure you are inside:

```text
backend/public
```

Then run:

```bash
pip install -r requirements.txt
```

---

## nodemon Not Found

If `nodemon` is not recognized, install it globally:

```bash
npm install -g nodemon
```

Then restart the terminal and run:

```bash
nodemon
```

---

# 🛑 Stop the Application

To stop any running service:

```text
CTRL + C
```

Stop each service from its corresponding terminal.

---

# 📊 Research Data

The research may use:

- Historical railway ticketing records
- Simulated passenger demand datasets
- Railway timetable information
- Railway route information
- Station information
- Calendar information
- Seasonal events
- GPS / timestamped train movement data where applicable

Data can be anonymized, aggregated, simulated, and augmented for research
experiments where required.

---

# 🧮 Data Preparation

The research data-processing workflow includes:

```text
Raw Data
   ↓
Cleaning
   ↓
Integration
   ↓
Feature Engineering
   ↓
Encoding / Transformation
   ↓
Normalization
   ↓
OD Demand Matrix
   ↓
Train / Validation / Test Data
   ↓
Model Training
```

Synthetic datasets may be generated for scenarios where historical coverage
is insufficient, including peak-demand scenarios and other controlled
experiments.

---

# 🔐 Privacy and Ethical Considerations

The research follows privacy and ethical principles for passenger-related
data.

Key requirements include:

- Removal of personally identifiable information (PII)
- Anonymization of passenger-related datasets
- Aggregation where appropriate
- Use of synthetic data where necessary
- Ethical clearance for research involving passenger-related datasets
- Fairness assessment of automated decision modules
- Bias-risk assessment for passenger-facing applications

No unnecessary personal or payment information should be included in the
research datasets.

---

# 🔬 Research Gap

The research identifies several limitations in existing approaches:

- Lack of integrated forecasting and optimization frameworks
- Limited integration of passenger demand forecasting with operational
  decision making
- Lack of uncertainty-aware railway decision support
- Limited fairness-aware capacity allocation
- Limited Sri Lanka-specific intelligent railway capacity-management research

The proposed framework addresses these gaps by connecting predictive analytics,
adaptive allocation, simulation, and evaluation.

---

# 🏆 Research Novelty

The proposed component introduces a:

> **Sri Lanka-specific spatio-temporal demand forecasting framework tightly
> coupled with an adaptive, fairness-aware seat allocation mechanism.**

The research explicitly investigates trade-offs between:

```text
Demand Uncertainty
        +
Passenger Fairness
        +
Seat Utilization
        +
Operational Constraints
```

The framework therefore moves beyond simple passenger-demand prediction toward
using predictions as inputs for intelligent capacity-management decisions.

---

# 📈 Experimental Scenarios

The research can evaluate allocation strategies under:

### Normal Demand

```text
Normal Passenger Demand
        ↓
Forecast
        ↓
Allocate
        ↓
Evaluate
```

### Peak Demand

```text
High Passenger Demand
        ↓
Forecast
        ↓
Capacity Pressure
        ↓
Adaptive Allocation
        ↓
Fairness / Utilization Analysis
```

### Controlled Simulation

Simulation can be used to compare alternative allocation strategies under
controlled conditions.

---

# 📊 Evaluation Framework

## Forecasting

```text
ARIMA
  │
  ├── MAE
  ├── RMSE
  ├── MAPE
  └── R²

Prophet
  │
  ├── MAE
  ├── RMSE
  ├── MAPE
  └── R²

LSTM / GRU / Temporal CNN
  │
  ├── MAE
  ├── RMSE
  ├── MAPE
  └── R²
```

## Allocation

```text
Static Allocation
       │
       ├── Seat Utilization
       ├── Booking Rejection
       └── Fairness

             VS

Adaptive Allocation
       │
       ├── Seat Utilization
       ├── Booking Rejection
       └── Fairness
```

---

# 🌱 Sustainable Development Goals

The overall research project contributes to:

## 🏗️ SDG 9 — Industry, Innovation and Infrastructure

Promoting intelligent and data-driven transportation infrastructure.

## 🏙️ SDG 11 — Sustainable Cities and Communities

Supporting efficient, accessible, and sustainable public transportation.

## 🌍 SDG 13 — Climate Action

Improving railway utilization and supporting sustainable transportation
through more efficient operations.

---

# 👥 Research Team

| Registration No. | Member | Research Component |
|---|---|---|
| IT22126610 | Muthukudaarachchi V.U | Advanced Intelligent Ticket Fraud Detection and Risk-Aware Passenger Verification |
| IT22051202 | Didulantha C S | Intelligent Real-Time Train Tracking and Probabilistic Delay Prediction Framework |
| IT22217240 | Narasinghe N.K.B.N.N | Multi-Objective Optimization Framework for Train Scheduling and Capacity Management |
| IT22151506 | D.M.N.T Senawirathna | Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI |

---

# 👩‍🏫 Supervisor

**Ms. Chathurangika Kahadawaarachchi**

---

# 🎓 Academic Information

| Category | Details |
|---|---|
| University | Sri Lanka Institute of Information Technology (SLIIT) |
| Degree | B.Sc. (Hons) in Information Technology |
| Module | IT4010 Research Project |
| Intake | 2026 January |
| Project ID | R26-IT-127 |
| Research Group | SST – Software Systems & Technologies |
| Specialization | Information Technology |
| Overall Topic | AI-Driven Intelligent Railway Operations System for Sri Lanka |
| Research Component | Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI |

---

# 📚 Project Documentation

The project documentation can include:

- Research Proposal
- Topic Assessment Form
- System Architecture
- Research Methodology
- Gantt Chart
- Work Breakdown Structure
- Dataset Documentation
- Model Documentation
- Evaluation Reports
- Experimental Results
- Research Findings

Recommended proposal diagrams:

```text
docs/
│
├── system_architecture.png
├── methodology_diagram.png
├── gantt_chart.png
└── wbs_diagram.png
```

---

# 🗺️ Research Documentation Diagrams

The project proposal includes the following supporting diagrams:

### System Architecture Diagram

Shows the relationship between railway data sources, intelligent processing
modules, the advanced booking/tracking system, and end users.

### Research Methodology Diagram

Shows the planned research workflow and experimental process.

### Gantt Chart

Shows the project timeline and planned research activities.

### Work Breakdown Structure

Shows the decomposition of project activities and responsibilities.

---

# 🔮 Future Improvements

Potential future development directions include:

- Real-time railway data integration
- Live GPS-based passenger and train information
- Real-time passenger demand updates
- Real-time adaptive seat allocation
- Advanced graph neural network forecasting
- Expanded railway network simulation
- Cloud-based deployment
- Advanced optimization algorithms
- Passenger-facing intelligent services
- Integration with other intelligent railway modules
- Larger-scale real-world validation

These are future research/development directions and should not be interpreted
as currently implemented features unless they are present in the source code.

---

# 🤝 Contribution

This is primarily an academic research project.

For project-team development:

1. Create a feature branch.
2. Implement and test the change.
3. Keep research experiments reproducible.
4. Document datasets and model changes.
5. Update evaluation results where applicable.
6. Submit changes for team review.
7. Merge only after validation.

Example:

```bash
git checkout -b feature/demand-forecasting
```

After development:

```bash
git add .
git commit -m "Add demand forecasting improvement"
git push origin feature/demand-forecasting
```

---

# 🔒 Data and Repository Security

Do **not** commit:

```text
.env
*.key
*.pem
passwords
API keys
private credentials
personal passenger data
confidential datasets
```

Use environment variables for secrets where required.

Example:

```text
.env
```

should be included in `.gitignore`.

---

# 📝 Research Reproducibility

For every major experiment, record:

- Dataset version
- Data preprocessing method
- Feature configuration
- Model architecture
- Hyperparameters
- Training configuration
- Evaluation metrics
- Experiment scenario
- Generated outputs

This allows research results to be reproduced and compared.

---

# ⚠️ Disclaimer

CeylonRail AI is an **academic research project** developed for the
IT4010 Research Project.

It is **not an official Sri Lanka Railways operational system**.

Predictions, simulations, optimization results, and recommendations generated
by the system are intended for:

- Academic research
- Experimental evaluation
- Demonstration
- Research analysis

They should not be interpreted as official railway operational decisions.

---

# 📖 References

The official research proposal references the following areas and works:

1. J. G. de Gooijer and R. J. Hyndman,  
   **“25 years of time series forecasting,”**  
   *International Journal of Forecasting*, vol. 22, no. 3, pp. 443–473, 2006.

2. S. Bandara et al.,  
   **“Passenger demand analysis in Sri Lanka Railways,”**  
   *Transportation Research Procedia*, vol. 48, pp. 1234–1245, 2020.

3. M. Ghofrani et al.,  
   **“Big data analytics in railway transportation systems,”**  
   *Transportation Research Part C*, vol. 90, pp. 226–246, 2018.

4. A. Dal Pozzolo et al.,  
   **“Adversarial drift detection in fraud,”**  
   *IEEE Transactions on Neural Networks and Learning Systems*, vol. 29,
   no. 10, pp. 1–14, 2017.

5. R. Corman et al.,  
   **“Railway traffic management in complex networks,”**  
   *Journal of Rail Transport Planning & Management*, vol. 4, no. 2,
   pp. 1–13, 2014.

---

# ⭐ Project Vision

<p align="center">

## 🚆 From Static Railway Planning

### ↓

## 📊 Data-Driven Demand Prediction

### ↓

## 🧠 Intelligent Capacity Management

### ↓

## ⚖️ Fair Adaptive Allocation

### ↓

## 🇱🇰 Smarter Railway Operations for Sri Lanka

</p>

---

# ❤️ CeylonRail AI

<p align="center">

<strong>
AI-Driven Intelligent Railway Operations System for Sri Lanka
</strong>

<br><br>

Research Project — IT4010  
Sri Lanka Institute of Information Technology

<br><br>

🚆 **Predict • Optimize • Allocate • Improve**

<br><br>

🇱🇰 **Built for Research • Innovation • Intelligent Transportation**

</p>
