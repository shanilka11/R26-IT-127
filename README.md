# 🚆 CeylonRail AI — Intelligent Ticket Fraud Detection & Risk-Aware Passenger Verification

<p align="center">
  <img src="https://img.shields.io/badge/AI-Anomaly%20Detection-0B3D91?style=for-the-badge" alt="AI">
  <img src="https://img.shields.io/badge/ML-Isolation%20Forest-059669?style=for-the-badge" alt="Isolation Forest">
  <img src="https://img.shields.io/badge/Semi--Supervised-One--Class%20SVM-7C3AED?style=for-the-badge" alt="One-Class SVM">
  <img src="https://img.shields.io/badge/Deep%20Learning-Autoencoder-0891B2?style=for-the-badge" alt="Autoencoder">
  <img src="https://img.shields.io/badge/Research-IT4010-E11D48?style=for-the-badge" alt="IT4010">
</p>

<h1 align="center">🚆 CeylonRail AI</h1>

<h3 align="center">
  Advanced Intelligent Ticket Fraud Detection & Risk-Aware Passenger Verification
</h3>

<p align="center">
  <strong>AI-powered railway fraud intelligence and risk-aware passenger verification for Sri Lanka</strong>
</p>

<p align="center">
  Detect unusual ticketing behavior, calculate transaction risk, explain why a transaction is suspicious,
  and help railway inspectors prioritize high-risk passengers instead of relying only on random checks.
</p>

---

## 🌟 At a Glance

| | |
|---|---|
| 🎓 **Research Project** | IT4010 Research Project |
| 🆔 **Project ID** | R26-IT-127 |
| 👨‍💻 **Researcher** | Muthukudaarachchi V.U |
| 🪪 **Student ID** | IT22126610 |
| 🧠 **Component** | Advanced Intelligent Ticket Fraud Detection and Risk-Aware Passenger Verification |
| 🏫 **University** | Sri Lanka Institute of Information Technology (SLIIT) |
| 👩‍🏫 **Supervisor** | Ms. Chathurangika Kahadawaarachchi |
| 🎯 **Domain** | AI, Machine Learning & Railway Fraud Analytics |
| 🧩 **Research Cluster** | SST — Software Systems and Technologies |

> **Core idea:** Don't inspect every passenger randomly — use anomaly detection and explainable risk scores to focus verification on the transactions that require the most attention.

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
- [Railway Fraud Taxonomy](#-railway-fraud-taxonomy)
- [Feature Engineering](#-feature-engineering)
- [Isolation Forest](#-isolation-forest)
- [One-Class SVM](#-one-class-svm)
- [Autoencoder-Based Anomaly Detection](#-autoencoder-based-anomaly-detection)
- [Anomaly Detection Model Comparison](#-anomaly-detection-model-comparison)
- [Risk-Aware Passenger Verification](#-risk-aware-passenger-verification)
- [Risk-Scoring & Explanation Framework](#-risk-scoring--explanation-framework)
- [Dataset](#-dataset)
- [Data Processing Pipeline](#-data-processing-pipeline)
- [Evaluation](#-evaluation)
- [Validation Strategy](#-validation-strategy)
- [Research Targets](#-research-targets)
- [Decision-Support Dashboard](#-decision-support-dashboard)
- [Functional Requirements](#-functional-requirements)
- [Non-Functional Requirements](#-non-functional-requirements)
- [Technology Stack](#-technology-stack)
- [Recommended Project Structure](#-recommended-project-structure)
- [Installation](#-installation)
- [Running the Component](#-running-the-component)
- [Research Workflow](#-research-workflow)
- [Experiment Scenarios](#-experiment-scenarios)
- [Expected Outcomes](#-expected-outcomes)
- [Stakeholders](#-stakeholders)
- [Commercial Potential](#-commercial-potential)
- [Competitive Advantage](#-competitive-advantage)
- [Privacy & Ethics](#-privacy--ethics)
- [Scalability & Security](#-scalability--security)
- [Risk Management](#-risk-management)
- [Research Timeline](#-research-timeline)
- [Research Budget](#-research-budget)
- [Project Work Breakdown](#-project-work-breakdown)
- [Sustainable Development](#-sustainable-development)
- [Research References](#-research-references)
- [Academic Information](#-academic-information)
- [Researcher](#-researcher)
- [Supervisor](#-supervisor)
- [Final Vision](#-final-vision)
- [Why CeylonRail AI?](#-why-ceylonrail-ai)
- [Source](#-source)

---

# 🚆 About the Component

**CeylonRail AI** is the individual research component of the wider project
**"AI-Driven Intelligent Railway Operations System for Sri Lanka."**

This component focuses on:

> **Advanced Intelligent Ticket Fraud Detection and Risk-Aware Passenger Verification**

The proposed system combines:

```text
        RAILWAY TICKET TRANSACTION DATA
                    │
                    ▼
        ┌─────────────────────────┐
        │   Data Preprocessing    │
        └────────────┬────────────┘
                     │
                     ▼
        ┌─────────────────────────┐
        │   Feature Engineering   │
        │ Behavioral • Temporal  │
        │ Contextual             │
        └────────────┬────────────┘
                     │
           ┌─────────┼─────────┐
           ▼         ▼         ▼
      Isolation   One-Class  Autoencoder
       Forest        SVM
           │         │         │
           └─────────┼─────────┘
                     ▼
             Anomaly Detection
                     │
                     ▼
          Risk Scoring + Explanation
                     │
                     ▼
          High-Risk Passenger List
                     │
                     ▼
       Inspector / Passenger Verification
```

The proposal identifies anomaly detection, risk scoring, explainability, and risk-aware passenger verification as the core contribution of this research component.

---

# ❗ The Problem

Railway ticket fraud is difficult to identify effectively using only manual and random ticket inspection.

Common suspicious behaviors include:

- 🎫 Ticket reuse
- 🪪 Unauthorized or abnormal concession usage
- 🔁 Suspicious ticket resale
- 🧍 Unusual passenger travel behavior
- 🕐 Abnormal temporal usage patterns
- 🗺️ Unusual route-based behavior

Traditional ticket inspection often depends on:

- Manual ticket checks
- Random passenger selection
- Limited analytical support
- Identity or ticket validity checks without behavioral analysis
- Lack of risk-based prioritization

These limitations can lead to:

```text
RANDOM INSPECTION
       ↓
Large Passenger Volume
       ↓
Limited Inspector Time
       ↓
Complex Fraud Patterns Missed
       ↓
Revenue Loss + Operational Inefficiency
```

The proposed research addresses this problem by moving from purely random inspection toward a **data-driven, anomaly-based and risk-aware verification process**.

---

# 🔍 Research Gap

The research proposal identifies several important gaps.

### 1. Railway analytics often focus on operations rather than fraud

Many transportation systems focus on tracking, scheduling, information services, and general operational efficiency without specifically targeting fraudulent passenger transactions.

### 2. Labeled railway fraud datasets are limited

Fraud cases are relatively rare, and complete labeled datasets containing both legitimate and fraudulent railway transactions may not be available for supervised model training.

### 3. Ticket inspection remains highly manual and random

Inspectors often lack analytical tools that identify which passenger transactions are more likely to require verification.

### 4. Behavioral, temporal, and contextual patterns are underused

Travel frequency, route behavior, time-based travel patterns, and concession usage can provide useful indicators of suspicious activity but are not sufficiently integrated into many existing approaches.

### 5. Explainability is limited

A practical fraud detection system should not only flag a suspicious transaction; inspectors also need to understand **why** the transaction was considered risky.

### 6. Detection accuracy and inspector workload are rarely evaluated together

Increasing the number of flagged passengers may improve detection but can also increase inspection workload. The proposal therefore evaluates the trade-off between fraud detection performance and operational inspection effort.

---

# 💡 Research Contribution

The proposed research addresses the gap through a **proactive, explainable, anomaly-driven railway fraud detection framework** that:

1. Develops a railway ticket fraud taxonomy.
2. Generates synthetic or anonymized railway ticket transaction data for model development and testing.
3. Extracts behavioral, temporal, and contextual passenger features.
4. Applies Isolation Forest for unsupervised anomaly detection.
5. Applies One-Class SVM for semi-supervised anomaly detection.
6. Applies Autoencoder-based anomaly detection for reconstruction-error analysis.
7. Generates transaction-level anomaly/risk scores.
8. Explains the factors contributing to suspicious transactions.
9. Prioritizes high-risk passengers for railway inspectors.
10. Evaluates the trade-off between fraud detection performance and inspector workload.

The main novelty is not only detecting anomalous ticket usage, but also connecting detection results to **risk-aware passenger verification and practical inspector workload management**.

---

# 🎯 Objectives

## Main Objective

To develop an intelligent railway ticket fraud detection and risk-aware passenger verification system that identifies suspicious ticketing behaviors using anomaly detection techniques and supports railway inspectors through a risk-scoring decision-support mechanism.

---

## Specific Objectives

### 01 — Railway Fraud Taxonomy & Dataset Preparation

Design a comprehensive railway ticket fraud taxonomy covering behaviors such as ticket reuse, abnormal concession usage, and suspicious ticket resale, then prepare synthetic or anonymized transaction data for model development and evaluation.

### 02 — Passenger Behavior Feature Engineering

Extract behavioral, temporal, and contextual features including travel frequency, time-based travel patterns, concession usage, and route-based behavior.

### 03 — Anomaly Detection Model Implementation

Implement and compare:

- Isolation Forest
- One-Class Support Vector Machine (One-Class SVM)
- Autoencoder-based anomaly detection

### 04 — Risk Scoring & Explanation

Assign risk levels to suspicious ticket transactions and identify the important factors contributing to each anomaly so inspectors can understand and act on the result.

### 05 — Performance & Inspector Workload Evaluation

Evaluate the framework using precision, recall, F1-score, ROC-AUC, and different risk-threshold scenarios to study the balance between fraud detection effectiveness and inspector workload.

---

# ✨ Key Features

| Feature | Description |
|---|---|
| 🎫 Transaction Monitoring | Analyze railway ticket transaction behavior |
| 🧩 Fraud Taxonomy | Categorize ticket reuse, concession misuse, resale, and related patterns |
| 🧹 Data Preprocessing | Clean, normalize, and prepare transaction data |
| 🧠 Behavioral Analytics | Model passenger travel frequency and usage behavior |
| 🕐 Temporal Analytics | Analyze time-based ticket usage patterns |
| 🗺️ Contextual Analytics | Analyze route and travel-context information |
| 🌲 Isolation Forest | Detect rare abnormal ticket transactions |
| 🔵 One-Class SVM | Learn the boundary of normal ticket behavior |
| 🧬 Autoencoder | Identify anomalies through reconstruction error |
| ⚠️ Risk Scoring | Assign Low, Medium, or High fraud-risk levels |
| 💡 Explainability | Highlight the factors contributing to a suspicious result |
| 👮 Inspector Assistance | Prioritize high-risk passengers for verification |
| 📊 Analytics Dashboard | Show risk, anomalies, trends, and inspection information |
| 🔗 System Integration | Operate inside the wider AI-Driven Intelligent Railway Operations System |

---

# 🔄 How It Works

```text
┌─────────────────────────────────────────────────────────┐
│                    1. DATA COLLECTION                   │
│                                                         │
│ Ticket ID • Passenger Category • Route • Date/Time     │
│ Concession Type • Usage History • Transaction Details  │
└─────────────────────────────┬───────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  2. DATA PREPROCESSING                  │
│                                                         │
│ Cleaning • Missing Values • Normalization              │
│ Structured Dataset Preparation                         │
└─────────────────────────────┬───────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  3. FEATURE ENGINEERING                 │
│                                                         │
│ Behavioral • Temporal • Contextual • Route Features   │
│ Travel Frequency • Concession Usage Patterns           │
└─────────────────────────────┬───────────────────────────┘
                              ▼
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│  Isolation Forest │ │   One-Class SVM   │ │    Autoencoder    │
└─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────┐
│                4. ANOMALY DETECTION                    │
│                                                         │
│ Identify unusual or suspicious ticket usage patterns   │
└─────────────────────────────┬───────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────┐
│            5. RISK SCORING & EXPLANATION               │
│                                                         │
│ Risk Score • Risk Level • Contributing Features        │
└─────────────────────────────┬───────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────┐
│               6. INSPECTOR DECISION SUPPORT            │
│                                                         │
│ Alerts • Prioritized Passengers • Verification Support │
└─────────────────────────────────────────────────────────┘
```

---

# 🏗️ System Architecture

The component follows a layered fraud-analysis architecture.

```text
                 ┌───────────────────────────────┐
                 │ RAILWAY TICKETING SYSTEM     │
                 │ Ticket Transaction Data      │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────┐
                 │ DATA PREPROCESSING            │
                 │ Cleaning • Structuring        │
                 │ Missing Values • Normalizing  │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────┐
                 │ FEATURE ENGINEERING           │
                 │ Behavioral • Temporal         │
                 │ Contextual • Route Features   │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
        ┌──────────────────────────────────────────────┐
        │          ANOMALY DETECTION ENGINE            │
        │                                              │
        │ Isolation Forest • One-Class SVM • Autoencoder│
        └───────────────────────┬──────────────────────┘
                                │
                                ▼
                 ┌───────────────────────────────┐
                 │ RISK SCORING & EXPLANATION    │
                 │ Score • Risk Level • Factors  │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────┐
                 │ INSPECTOR DECISION SUPPORT    │
                 │ Alerts • Verification List    │
                 │ Dashboard • Reports           │
                 └───────────────────────────────┘
```

---

# 🎫 Railway Fraud Taxonomy

A core part of the research is defining a railway-specific fraud taxonomy before model development.

```text
Railway Ticket Fraud
       │
       ├── Ticket Reuse
       │     └── Repeated or abnormal reuse of the same ticket
       │
       ├── Abnormal Concession Usage
       │     └── Suspicious use of concession categories or benefits
       │
       └── Suspicious Ticket Resale
             └── Unusual transaction or usage patterns indicating resale
```

The taxonomy guides:

- Synthetic/anonymized dataset generation
- Feature engineering
- Anomaly simulation
- Model training and testing
- Risk explanation
- Inspector verification scenarios

---

# 🧠 Feature Engineering

The proposed framework represents passenger ticket behavior using three major feature groups.

## 👤 Behavioral Features

Examples include:

- Travel frequency patterns
- Repeated ticket usage
- Passenger category behavior
- Concession usage frequency
- Transaction behavior over time

## 🕐 Temporal Features

Examples include:

- Ticket purchase time
- Travel time
- Day-based behavior
- Repeated usage within unusual time intervals
- Abnormal frequency over a defined period

## 🗺️ Contextual Features

Examples include:

- Travel route
- Origin/destination context
- Passenger category
- Concession type
- Ticket usage context

These features are used to represent normal travel behavior and provide the input required by the anomaly detection models.

---

# 🌲 Isolation Forest

### Purpose

Isolation Forest is used to identify unusual ticket transactions by isolating observations through randomly generated decision trees.

### Why It Fits the Research

Fraud cases are expected to be rare compared with legitimate transactions. Isolation Forest is suitable for detecting sparse anomalies without requiring a large labeled fraud dataset.

### Input

```text
Behavioral + Temporal + Contextual Ticket Features
```

### Output

```text
Anomaly Score / Normal-or-Suspicious Decision
```

---

# 🔵 One-Class SVM

### Purpose

One-Class Support Vector Machine learns a boundary around primarily normal observations and identifies transactions outside that boundary as anomalies.

### Why It Fits the Research

The method is useful when normal ticket behavior is more available than labeled fraudulent behavior.

### Input

```text
Mostly Normal Ticket Transaction Feature Vectors
```

### Output

```text
Normal Transaction
        OR
Anomalous Transaction
```

---

# 🧬 Autoencoder-Based Anomaly Detection

### Purpose

An Autoencoder learns to reconstruct normal transaction patterns through a compressed internal representation.

### Detection Logic

```text
Normal Transaction
      ↓
Low Reconstruction Error
      ↓
Likely Normal

Suspicious Transaction
      ↓
High Reconstruction Error
      ↓
Potential Anomaly
```

The reconstruction error can contribute to anomaly severity and downstream risk scoring.

---

# 📊 Anomaly Detection Model Comparison

The research compares multiple anomaly detection approaches instead of depending on a single model.

| Model | Learning Style | Main Role |
|---|---|---|
| **Isolation Forest** | Unsupervised | Detect rare and isolated abnormal patterns |
| **One-Class SVM** | Semi-supervised / one-class | Learn a boundary around normal behavior |
| **Autoencoder** | Unsupervised deep learning | Detect anomalies through reconstruction error |

The comparison supports selection of the most effective approach for identifying suspicious railway ticket transaction behavior.

---

# 👮 Risk-Aware Passenger Verification

After anomaly detection, the system converts model outputs into information that railway inspectors can use operationally.

```text
Detected Anomaly
       +
Anomaly Severity
       +
Passenger / Ticket Context
       +
Contributing Features
       ↓
Risk Score
       ↓
Low / Medium / High Risk
       ↓
Prioritized Passenger Verification
```

### Main goals

- 🎯 Focus inspector attention on suspicious transactions
- 🚫 Reduce dependence on purely random ticket checks
- 📉 Reduce unnecessary inspections where possible
- 💡 Explain why a passenger transaction was flagged
- 📈 Improve operational efficiency
- 💰 Support reduction of revenue loss caused by ticket fraud

---

# 🧮 Risk-Scoring & Explanation Framework

The risk-scoring layer converts anomaly detection outputs into an interpretable decision-support result.

## Inputs

```text
Anomaly Detection Output
Behavioral Features
Temporal Features
Contextual Features
Transaction Information
```

## Risk Processing

```text
                 ┌──────────────────────┐
                 │   Anomaly Output     │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │  Risk Score Engine   │
                 └──────────┬───────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
           Low Risk      Medium Risk     High Risk
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                 Contributing Features
                            │
                            ▼
                 Inspector Explanation
```

Different score thresholds can be tested to determine how many transactions are flagged and how that choice affects both fraud detection performance and inspector workload.

---

# 📋 Dataset

Because of passenger privacy restrictions and the limited availability of real labeled fraud data, the study uses **synthetic or anonymized railway ticket transaction datasets**.

A practical dataset for this component can contain fields such as:

| Attribute | Description |
|---|---|
| `Ticket ID` | Ticket or transaction identifier |
| `Passenger Category` | Passenger type/category |
| `Route` | Railway route associated with the transaction |
| `Travel Date` | Date of intended/recorded travel |
| `Travel Time` | Time information associated with usage |
| `Concession Type` | Concession category where applicable |
| `Usage History` | Previous ticket-use behavior |
| `Transaction Context` | Contextual information for analysis |
| `Fraud Scenario` | Synthetic/anonymized scenario label for evaluation where available |

The dataset should simulate both normal passenger travel and suspicious patterns such as ticket reuse, abnormal concession usage, and suspicious ticket resale.

---

# 🧹 Data Processing Pipeline

```text
Raw / Synthetic Ticket Dataset
            │
            ▼
┌───────────────────────────┐
│       Data Cleaning       │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│   Missing Value Handling  │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│       Normalization       │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│     Feature Engineering   │
│ Behavioral / Temporal /  │
│ Contextual               │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│    Model-Ready Dataset    │
└─────────────┬─────────────┘
              ▼
     Anomaly Detection Models
```

---

# 📈 Evaluation

The proposed system is evaluated using **fraud detection metrics** and an **inspector workload analysis**.

## 🔎 Fraud Detection Metrics

### Precision

Measures the proportion of transactions flagged as fraud/suspicious that are actually fraudulent in the evaluation data.

### Recall

Measures the ability of the model to identify fraudulent transactions.

### F1-Score

Provides a balanced measure of precision and recall.

### ROC-AUC

Measures the model's ability to distinguish between normal and fraudulent transactions across different decision thresholds.

---

## 👮 Operational Metrics

| Metric | Purpose |
|---|---|
| Flagged Transaction Count | Measures the number of passengers/transactions requiring inspection |
| Inspector Workload | Estimates operational effort created by a selected risk threshold |
| Detection Coverage | Measures how effectively fraud scenarios are captured |
| False Positive Level | Measures unnecessary passenger inspections |
| Risk Threshold Effect | Shows how threshold changes affect detection and workload |

---

# 🧪 Validation Strategy

The research uses three main validation approaches.

### 1. Model Comparison

```text
Isolation Forest
      VS
One-Class SVM
      VS
Autoencoder
```

The models are compared using precision, recall, F1-score, and ROC-AUC.

### 2. Fraud Scenario Testing

```text
Normal Ticket Usage
        VS
Ticket Reuse
        VS
Abnormal Concession Usage
        VS
Suspicious Ticket Resale
```

### 3. Risk-Threshold & Workload Analysis

Different risk thresholds are tested to examine:

- Number of passengers flagged
- Fraud detection performance
- False-positive behavior
- Inspector workload
- Practical inspection efficiency

---

# 🎯 Research Targets

The proposal defines the following research goals and evaluation targets.

| Research Goal | Evaluation Focus |
|---|---|
| Build a railway fraud taxonomy | Coverage of key fraud behaviors |
| Prepare synthetic/anonymized data | Realistic normal and fraudulent scenarios |
| Detect abnormal ticket usage | Isolation Forest, One-Class SVM, Autoencoder |
| Generate explainable risk scores | Risk level + contributing features |
| Support inspector prioritization | High-risk passenger identification |
| Evaluate fraud detection | Precision, Recall, F1-score, ROC-AUC |
| Balance accuracy and workload | Risk-threshold scenario analysis |

> These are **research objectives and evaluation goals**. They should not be presented as achieved results until experimental testing is completed.

---

# 🖥️ Decision-Support Dashboard

The proposed system includes a dashboard and passenger-verification interface to support railway inspectors and administrators.

### ⚠️ Transaction Risk Explanation

Display:

- Transaction summary
- Passenger category
- Travel route
- Risk score
- Fraud probability / anomaly severity where applicable
- Top contributing factors
- Model information

### 👮 Passenger Ticket Verification

Display:

- Ticket input/search
- Verification result
- Passenger category
- Travel route
- Ticket purchase information
- Risk assessment
- Recommended actions

### 📊 Fraud Detection Dashboard

Display:

- Total ticket transactions
- Detected anomalies
- High-risk passenger alerts
- Overall model performance
- Ticket transactions over time
- Fraud-type distribution
- Passenger-category distribution

### 🚨 Alerts

Potentially highlight:

- High-risk transactions
- Ticket reuse patterns
- Abnormal concession usage
- Suspicious resale behavior
- Unusual route activity
- Unusual travel-frequency patterns

---

# ⚙️ Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | Allow inspectors to view real-time and historical passenger ticket transactions |
| FR2 | Automatically flag suspicious ticket transactions using anomaly detection models |
| FR3 | Present a risk score and explanatory information for suspicious transactions |
| FR4 | Provide a prioritized list of high-risk passengers for verification |
| FR5 | Allow administrators to manage the fraud taxonomy and synthetic/anonymized datasets |
| FR6 | Generate reports on detected fraud, risk distribution, and inspection effectiveness |

---

# 🛡️ Non-Functional Requirements

| Category | Requirement |
|---|---|
| ⚡ Performance | Generate risk scores and alerts within approximately 2 seconds per transaction |
| 🔐 Security | Anonymize and encrypt passenger data to protect privacy and prevent unauthorized access |
| 🎨 Usability | Provide clear dashboards, alerts, risk scores, and explanations for inspectors |
| 📈 Scalability | Handle transaction data from thousands of passengers without major performance degradation |
| 🔄 Reliability & Availability | Target 99% uptime and recovery support for continuous monitoring and alerting |
| 🛠️ Maintainability | Allow model, feature-set, and fraud-taxonomy updates without full system redeployment |

---

# 🛠️ Technology Stack

The proposal and budget identify the following technology categories for this component.

## 🐍 Core Development

- **Python**
- **PyCharm Professional / Anaconda** as possible development environments

## 📊 Machine Learning

- **Scikit-learn**
- Isolation Forest
- One-Class SVM

## 🧠 Deep Learning

- **TensorFlow** and/or **PyTorch**
- Autoencoder-based anomaly detection

## ☁️ Cloud & Storage

- Google Cloud / AWS / Azure as possible cloud environments
- Cloud storage and compute for large dataset experiments
- Local/external storage for datasets, results, and model checkpoints

## 🖥️ Application Layer

- Dashboard / passenger verification interface
- Reporting and analytical visualization layer
- Integration with railway ticket transaction data sources

---

# 📁 Recommended Project Structure

```text
CeylonRail-AI-Fraud-Detection/
│
├── README.md
│
├── data/
│   ├── raw/
│   ├── synthetic/
│   ├── anonymized/
│   ├── processed/
│   └── sample/
│
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_data_preprocessing.ipynb
│   ├── 03_feature_engineering.ipynb
│   ├── 04_isolation_forest.ipynb
│   ├── 05_one_class_svm.ipynb
│   ├── 06_autoencoder.ipynb
│   └── 07_model_comparison.ipynb
│
├── src/
│   ├── data/
│   │   ├── generation/
│   │   ├── preprocessing/
│   │   └── features/
│   │
│   ├── models/
│   │   ├── isolation_forest/
│   │   ├── one_class_svm/
│   │   └── autoencoder/
│   │
│   ├── risk_scoring/
│   │   ├── scoring/
│   │   ├── thresholds/
│   │   └── explanations/
│   │
│   ├── evaluation/
│   │   ├── detection_metrics/
│   │   └── workload_analysis/
│   │
│   └── utils/
│
├── models/
│   ├── checkpoints/
│   └── trained/
│
├── outputs/
│   ├── anomalies/
│   ├── risk_scores/
│   ├── reports/
│   └── visualizations/
│
├── dashboard/
│
├── integration/
│   └── demand-seat-allocation/
│
├── docs/
│   ├── architecture/
│   ├── methodology/
│   └── research/
│
├── requirements.txt
└── .gitignore
```

> This is a recommended organization for the component. The proposal defines the research architecture and technologies but does not prescribe this exact repository directory structure.

---

# 💻 Installation

## 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd CeylonRail-AI-Fraud-Detection
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

A typical research environment may include:

```text
scikit-learn
numpy
pandas
tensorflow and/or torch
matplotlib
joblib
```

Use the actual `requirements.txt` in the repository as the authoritative dependency list.

---

# ▶️ Running the Component

The exact commands depend on the final repository implementation. A typical workflow is:

```bash
# 1. Activate environment
.venv\Scripts\activate

# 2. Prepare / preprocess ticket transaction data
python src/data/preprocessing/prepare_data.py

# 3. Train or load anomaly detection models
python src/models/train_models.py

# 4. Generate anomaly results
python src/models/run_detection.py

# 5. Generate risk scores and explanations
python src/risk_scoring/generate_risk_scores.py

# 6. Evaluate models and workload trade-offs
python src/evaluation/evaluate.py
```

> Replace the example script names above with the actual filenames used in the implementation.

---

# 🔬 Research Workflow

```text
Problem Identification
        │
        ▼
Literature Review
        │
        ▼
Railway Fraud Taxonomy
        │
        ▼
Synthetic / Anonymized Dataset Preparation
        │
        ▼
Data Cleaning & Preprocessing
        │
        ▼
Behavioral / Temporal / Contextual Feature Engineering
        │
        ▼
Isolation Forest + One-Class SVM + Autoencoder
        │
        ▼
Anomaly Detection
        │
        ▼
Risk Scoring & Explanation
        │
        ▼
Inspector Decision-Support Prototype
        │
        ▼
Performance Evaluation
        │
        ▼
Risk Threshold / Inspector Workload Analysis
        │
        ▼
Integration with Wider Railway Operations Platform
```

---

# 🧪 Experiment Scenarios

## 🟢 Normal Ticket Usage

Evaluate whether legitimate passenger transactions are correctly treated as normal.

```text
Normal Travel Pattern
        ↓
Expected Low Anomaly Score
        ↓
Low Risk
```

## 🔴 Ticket Reuse Scenario

Simulate repeated or unusual use of a ticket and evaluate whether the models detect the pattern as suspicious.

```text
Repeated Ticket Usage
        ↓
Anomaly Detection
        ↓
Elevated Risk Score
```

## 🟠 Abnormal Concession Usage

Test unusual concession usage patterns and evaluate whether risk explanations correctly highlight concession-related factors.

## 🟣 Suspicious Ticket Resale

Simulate abnormal resale-like transaction behavior and test the ability of the framework to identify unusual usage patterns.

## 🔵 Risk-Threshold Sensitivity Analysis

Change the risk threshold and compare:

- Precision
- Recall
- F1-score
- ROC-AUC
- Number of passengers flagged
- Inspector workload

---

# 📊 Expected Outcomes

### 🎯 Better Fraud Identification

Identify suspicious railway ticket transactions that may be difficult to detect through random manual inspection.

### ⚠️ Risk-Based Prioritization

Provide risk scores that help inspectors focus on higher-risk passengers first.

### 💡 Better Explainability

Show the main factors contributing to suspicious transaction behavior.

### 👮 Improved Inspector Efficiency

Support a more targeted inspection process rather than relying only on random checks.

### 📉 Reduced Unnecessary Inspection Work

Use risk-threshold analysis to study the balance between fraud detection and the number of passengers requiring verification.

### 🇱🇰 Sri Lanka-Specific Railway Intelligence

Provide a railway-focused fraud detection framework that can be evaluated in the context of Sri Lankan railway operations.

---

# 👥 Stakeholders

| Stakeholder | Role / Benefit |
|---|---|
| 🚆 Railway Authorities / Management | Monitor ticket fraud, improve ticketing efficiency, reduce revenue loss |
| 👮 Railway Ticket Inspectors | Receive prioritized alerts and risk-aware verification support |
| 👥 Railway Passengers | Benefit indirectly from fairer and more efficient ticket inspection |
| 🛠️ System Administrators | Maintain datasets, fraud taxonomy, models, and system configuration |
| 📊 Data Analysts | Analyze ticket transactions, anomalies, risk distributions, and model performance |
| 💻 Railway IT Teams | Integrate and maintain the component within railway ticketing infrastructure |

---

# 💼 Commercial Potential

The component can be developed as a software solution for railway authorities and other transportation organizations that manage passenger ticketing operations.

## Target Market

- Railway authorities
- Public transportation operators
- Transport fraud-prevention teams
- Transportation IT departments
- Organizations managing large-scale passenger ticketing systems

## Possible Revenue Models

### 💻 Software Licensing

Licensed fraud detection software integrated into an organization's ticketing platform.

### ☁️ Software-as-a-Service

Subscription-based fraud analytics and monitoring service.

### 📊 Custom Analytics Services

Advanced fraud analysis for organizations with large transaction volumes.

### 🏢 Enterprise Deployment

Custom deployment, integration, maintenance, staff training, and support for transportation authorities.

---

# 🏆 Competitive Advantage

The proposed system differentiates itself through:

```text
Railway-Specific Fraud Taxonomy
          +
Behavioral / Temporal / Contextual Features
          +
Isolation Forest
          +
One-Class SVM
          +
Autoencoder
          +
Explainable Risk Scoring
          +
Inspector Workload Analysis
          +
Risk-Aware Passenger Verification
```

Key advantages include:

- Anomaly detection without depending entirely on historical fraud labels
- Multiple anomaly detection approaches for comparative evaluation
- Railway-specific suspicious behavior modeling
- Explainable risk scoring for inspector decision-making
- Risk-threshold analysis that considers practical inspection workload
- Scalable and modular integration with ticketing systems
- Integration within the wider AI-Driven Intelligent Railway Operations System

---

# 🔐 Privacy & Ethics

Passenger ticket data must be handled responsibly.

The proposal specifies:

- Use of synthetic or anonymized railway ticket transaction datasets
- Protection of passenger privacy
- Removal of personally identifiable information where applicable
- Secure handling of transaction data
- Ethical data processing for model development and evaluation

### 🚫 Never commit sensitive data

Do not upload:

```text
Passenger names or personally identifiable information
National ID / NIC numbers
Phone numbers
Payment information
Passwords
API keys
Private credentials
Confidential railway transaction records
Unanonymized passenger datasets
```

---

# 📈 Scalability & Security

## Scalability

The proposed architecture is designed to:

- Handle increasing ticket transaction volumes
- Process data from thousands of passengers
- Support scalable anomaly detection
- Allow model and feature updates
- Integrate modularly with existing ticket transaction systems
- Use cloud compute/storage when required for large-scale experiments

## Security

The proposed system considers:

- Passenger data anonymization
- Encryption of sensitive data
- Controlled access to transaction information
- Secure storage
- Protection against unauthorized access
- Safe model and dataset management

---

# ⚠️ Risk Management

| Risk | Level | Mitigation |
|---|---|---|
| Limited availability of real railway ticket fraud datasets | 🔴 High | Generate anonymized or synthetic ticket transaction datasets with realistic fraud scenarios |
| Imbalanced data with rare fraudulent transactions | 🔴 High | Use Isolation Forest, One-Class SVM, and Autoencoder methods that do not require large labeled fraud datasets |
| Model accuracy below expected performance | 🔴 High | Improve feature engineering, tune model parameters, and perform iterative evaluation |
| False positives causing unnecessary inspections | 🟠 Medium | Use risk thresholds and evaluate precision, recall, F1-score, ROC-AUC, and inspector workload |
| Poor-quality or incomplete ticket data | 🟠 Medium | Apply cleaning, missing-value handling, normalization, and validation |
| Difficulty interpreting model outputs | 🟠 Medium | Provide anomaly severity and contributing-feature explanations |
| Passenger data privacy concerns | 🟠 Medium | Use anonymization and remove personally identifiable information |
| Integration challenges with existing ticketing systems | 🟠 Medium | Use modular architecture and defined interfaces to transaction data sources |
| Inspector resistance to automated tools | 🟢 Low | Provide a simple interface and clear risk explanations |
| Increasing transaction volumes affecting performance | 🟠 Medium | Design scalable data processing and anomaly detection workflows |

---

# 🗓️ Research Timeline

The proposal Gantt chart covers the research process from group registration and topic selection through final submission.

| Stage | Timeline / Milestone |
|---|---|
| Group Registration | Initial project stage |
| Topic Selection | Initial project stage |
| TAF Documentation | Before January 2026 submission |
| TAF Submission | 05 January 2026 |
| Proposal Report | 15 March 2026 |
| Proposal Presentation | 16 March 2026 |
| Implementation | Main development period during 2026 |
| Progress Presentation I | 04–06 May 2026 |
| Research Paper | 2026 research period |
| Testing & Finalization | Before final project completion |
| Progress Presentation II | 12–14 October 2026 |
| Web Assessment | 08 October 2026 |
| Final Presentation & Viva | 01 December 2026 |
| Final Report | Final project stage |

---

# 💰 Research Budget

## **LKR 650,000 — Total Estimated Cost**

| Category | Item | Estimated Cost |
|---|---|---:|
| Hardware | Development Workstation — Core i7, 16 GB RAM, 512 GB SSD | LKR 250,000 |
| Hardware | Additional 1 TB HDD / SSD storage | LKR 30,000 |
| Software | Python IDE — PyCharm Professional / Anaconda | LKR 20,000 |
| Software | ML Libraries — scikit-learn, TensorFlow, PyTorch | Free / Open Source |
| Cloud Services | Google Cloud / AWS / Azure storage and compute | LKR 50,000 |
| Human Effort | 200 hours × LKR 1,500/hour | LKR 300,000 |
| **Total** |  | **LKR 650,000** |

---

# 🧩 Project Work Breakdown

```text
Advanced Intelligent Ticket Fraud Detection System
│
├── Problem Analysis & Literature Review
│   ├── Study railway ticket fraud problems
│   ├── Review existing ticket verification systems
│   └── Review fraud detection / anomaly detection research
│
├── Railway Fraud Taxonomy
│   ├── Identify ticket reuse scenarios
│   ├── Identify concession misuse scenarios
│   └── Identify suspicious resale scenarios
│
├── Dataset Preparation
│   ├── Define transaction structure
│   ├── Generate synthetic / anonymized data
│   └── Prepare normal and suspicious behavior scenarios
│
├── Feature Engineering
│   ├── Behavioral features
│   ├── Temporal features
│   └── Contextual / route features
│
├── Anomaly Detection Models
│   ├── Isolation Forest
│   ├── One-Class SVM
│   └── Autoencoder
│
├── Risk Scoring Framework
│   ├── Generate anomaly / risk scores
│   ├── Define risk thresholds
│   └── Explain contributing features
│
├── Inspector Decision Support
│   ├── Prioritized suspicious passenger list
│   ├── Verification dashboard
│   └── Alerts / reports
│
└── Evaluation & Documentation
    ├── Precision / Recall / F1 / ROC-AUC
    ├── Inspector workload trade-off
    ├── System testing
    └── Final report
```

---

# 🌱 Sustainable Development

The proposed research aligns with United Nations Sustainable Development Goals identified in the proposal.

## 🏭 SDG 9 — Industry, Innovation and Infrastructure

The project contributes by introducing intelligent, data-driven technologies to improve railway management, ticketing analytics, and transportation infrastructure efficiency.

## 🏙️ SDG 11 — Sustainable Cities and Communities

The project supports safer, fairer, and more efficient public transportation by improving the transparency and effectiveness of ticket inspection and fraud prevention.

---

# 📚 Research References

1. M. Farhan, A. H. Nur, R. Sulaiman, U. Butt, and S. Zaman, “Blockchain-Based Railway Ticketing: Enhancing Security and Efficiency with QR Codes and Smart Contract,” in *Proc. 2025 4th Int. Conf. Comput. Inf. Technol. (ICCIT)*, 2025.

2. P. Singh and M. Singh, “Fraud Detection by Monitoring Customer Behavior and Activities,” *Int. J. Comput. Appl.*, vol. 111, no. 11, 2015.

3. L. Kirme, V. Jha, P. Chauhan, S. R. Mohanty, and R. Ghode, “Smart Verification of Passenger Using AI,” *Int. J. Trend Sci. Res. Dev.*, vol. 5, no. 1, 2020.

4. S. Patil, S. Trivedi, J. Jani, S. J. Shah, and P. Kanani, “Digitized Railway Ticket Verification Using Facial Recognition,” in *Proc. Int. Conf. Intell. Comput. Control Syst.*, 2021.

5. S. Gobhinath, S. Karthikeyan, A. Prakash, B. Balamurugan, and N. Gokul, “A Prototype Development of Digirail-Ticket Verification and Seat Allocation,” 2020.

6. S. S. Mhamane and P. Shriram, “Railway Ticket Verification and Dynamic Seat Allocation Using Aadhar Card,” in *Proc. Int. Congr. Inf. Commun. Technol.*, 2018.

7. S. Nawghare, R. K. Somkunwar, and Z. Shaikh, “Indian Railways Smart Ticketing Validation System with Improved Alert Approach,” in *Proc. 2023 Int. Conf. Sustain. Comput. Smart Syst. (ICSCSS)*, 2023.

8. S. Reddy, P. Sidhardha, and M. Posonai, “Fool Proof Ticketing System Management for Railway,” in *Proc. Int. Conf. Commun. Electron. Syst.*, 2021.

9. Y. Gorane and R. D. Joshi, “Railway Accident Reduction by Passenger Detection Using Machine Learning Techniques,” in *Proc. 2024 IEEE 9th Int. Conf. Convergence Technol. (I2CT)*, 2024.

10. H. Alawad, S. Kaewunruen, and M. An, “Utilizing Big Data for Enhancing Passenger Safety in Railway Stations,” 2019.

The reference list above follows the submitted research proposal.

---

# 🎓 Academic Information

| Field | Details |
|---|---|
| **Researcher** | Muthukudaarachchi V.U |
| **Student ID** | IT22126610 |
| **Degree** | B.Sc. (Hons) Degree in Information Technology |
| **Specialization** | Information Technology |
| **Module** | IT4010 Research Project |
| **Project ID** | R26-IT-127 |
| **Research Topic** | Advanced Intelligent Ticket Fraud Detection and Risk-Aware Passenger Verification |
| **Research Cluster** | SST — Software Systems and Technologies |
| **Department** | Department of Information Technology |
| **University** | Sri Lanka Institute of Information Technology |
| **Supervisor** | Ms. Chathurangika Kahadawaarachchi |
| **Proposal Date** | March 2026 |

---

# 👨‍💻 Researcher

## Muthukudaarachchi V.U

**Student ID:** `IT22126610`

**Research Area:**

> AI-Driven Railway Ticket Fraud Detection and Risk-Aware Passenger Verification

**Focus:**

```text
Artificial Intelligence
        +
Machine Learning
        +
Anomaly Detection
        +
Behavior Analytics
        +
Risk Scoring
        +
Explainable Decision Support
        +
Smart Transportation
```

---

# 👩‍🏫 Supervisor

**Ms. Chathurangika Kahadawaarachchi**

Supervisor for the undergraduate research dissertation.

---

# 🚆 Final Vision

```text
                  TODAY
                    │
                    ▼
        Manual / Random Ticket Inspection
                    │
                    ▼
             Limited Fraud Insight
                    │
                    ▼
                  ─────
                    │
                    ▼
                  FUTURE
                    │
                    ▼
          Intelligent Transaction Analysis
                    │
                    ▼
             Anomaly Detection
                    │
                    ▼
          Explainable Risk Scoring
                    │
                    ▼
         Risk-Aware Passenger Verification
                    │
                    ▼
          More Focused Inspector Work
                    │
                    ▼
           Reduced Ticket Fraud Risk
                    │
                    ▼
          🇱🇰 Smarter Sri Lankan
             Railway Operations
```

---

# ⭐ Why CeylonRail AI?

### **Detect. Explain. Prioritize. Verify.**

CeylonRail AI is designed around a simple principle:

> **A fraud alert should not stop at detecting an anomaly — it should explain the risk and support a practical inspection decision.**

By combining **Isolation Forest**, **One-Class SVM**, **Autoencoder-based anomaly detection**, and an **explainable risk-scoring framework**, the proposed component bridges the gap between ticket transaction analytics and real-world railway passenger verification.

Its integration with the **Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation** component strengthens the wider R26-IT-127 platform by combining passenger-demand intelligence with ticket-fraud intelligence inside the same railway operations ecosystem.

---

<p align="center">

## 🚆 CeylonRail AI

### Advanced Intelligent Ticket Fraud Detection & Risk-Aware Passenger Verification

**AI • Machine Learning • Anomaly Detection • Risk Scoring • Explainable Decision Support**

<br>

🇱🇰 **Designed for Smarter Railway Transportation in Sri Lanka**

<br><br>

<strong>IT4010 Research Project • R26-IT-127</strong>

</p>

---

## 📄 Source

This README is based on the submitted **Project Proposal Report**:

> *Advanced Intelligent Ticket Fraud Detection and Risk-Aware Passenger Verification*  
> **R26-IT-127 — IT22126610 — Muthukudaarachchi V.U**

Integrated research component reference:

> *Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI*  
> **R26-IT-127 — IT22151506 — Senawirathna D.M.N.T**

---
