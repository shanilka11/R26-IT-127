# AI-Driven Intelligent Railway Operations System for Sri Lanka

## Project Overview
The AI-Driven Intelligent Railway Operations System is a research-based software solution designed to improve railway operations in Sri Lanka using Artificial Intelligence, Machine Learning, Data Analytics, and Optimization techniques.

The system focuses on intelligent ticket fraud detection, passenger demand forecasting, train scheduling optimization, and smart railway monitoring. The main aim of this project is to improve railway efficiency, reduce delays, minimize ticket fraud, support capacity management, and help railway authorities make data-driven operational decisions.

## Research Group
**Group ID:** R26-IT-127  
**Project Type:** 4th Year Research Project  
**Institution:** Sri Lanka Institute of Information Technology (SLIIT)

## Main Features
- AI-based railway ticket fraud detection
- Risk-aware passenger verification
- Passenger demand forecasting
- Train scheduling and capacity optimization
- Smart railway monitoring
- Predictive maintenance support
- Real-time dashboard visualization
- Data analytics and decision support

## System Components

### 1. Advanced Intelligent Ticket Fraud Detection and Risk-Aware Passenger Verification
This component focuses on detecting suspicious and fraudulent railway ticket activities using anomaly detection and classification techniques. It supports railway authorities by identifying high-risk passenger or ticket patterns.

### 2. Multi-Objective Train Scheduling and Capacity Management
This component focuses on optimizing train schedules and managing railway capacity. It aims to reduce delays, reduce overcrowding, and improve the utilization of trains and coaches.

### 3. AI-Based Passenger Demand Forecasting and Crowd Management
This component predicts passenger demand patterns using historical and operational railway data. It helps railway operators understand peak travel times and manage passenger crowds effectively.

### 4. Smart Railway Monitoring and Predictive Maintenance
This component focuses on monitoring railway operations and predicting possible maintenance issues. It supports early decision-making to reduce operational failures and improve service reliability.

## Research Objectives
- Detect fraudulent railway ticket activities
- Identify high-risk passenger verification patterns
- Predict passenger demand and crowd levels
- Optimize train schedules and capacity usage
- Improve railway operational efficiency
- Support intelligent railway monitoring
- Provide data-driven decision support for railway management

## Technologies Used

### Frontend
- React.js
- Vite
- Streamlit
- HTML
- CSS
- JavaScript

### Backend
- Python
- FastAPI

### Machine Learning / Data Analysis
- Scikit-learn
- Pandas
- NumPy
- Matplotlib

### Machine Learning & AI Techniques
- Isolation Forest
- One-Class SVM
- Autoencoder
- Random Forest
- Predictive Analytics
- Optimization Algorithms

## Repository Structure
project-root/
│
├── backend/
│   ├── main.py
│   ├── models/
│   ├── data/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── dashboard/
│   └── streamlit_app.py
│
└── README.md

## How to Run the Project
## Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload

## Backend runs on:
http://localhost:8000

## Frontend
cd frontend
npm install
npm run dev

## Frontend runs on:
http://localhost:5173

## Stremlit Dashboard
streamlit run streamlit_app.py

## API Endpoints
| Endpoint                  | Method | Description                                 |
| ------------------------- | ------ | ------------------------------------------- |
| /predict-fraud/         | POST   | Predicts railway ticket fraud risk          |
| /passenger-demand/      | POST   | Predicts passenger demand                   |
| /schedule-optimization/ | POST   | Provides optimized train scheduling support |
| /monitoring/            | GET    | Retrieves railway monitoring data           |

## Current PP1 Progress
## Component 1 – Fraud Detection
Dataset preparation completed
Data preprocessing completed
ML model training completed
Fraud prediction prototype completed
Dashboard development completed

## Component 2 – Train Scheduling Optimization
Scheduling workflow designed
Optimization objectives identified
Data analysis completed
Initial simulation planning completed

## Component 3 – Passenger Demand Forecasting
Passenger trend analysis completed
Demand prediction workflow prepared
Forecasting model research completed
Crowd management concept designed

## Component 4 – Smart Railway Monitoring
Monitoring architecture designed
Predictive maintenance workflow planned
Railway operational data analysis completed
Initial monitoring dashboard concept prepared

## System Architecture
Data Collection
       ↓
Data Preprocessing
       ↓
AI / ML Models
       ↓
Prediction & Optimization
       ↓
Dashboard Visualization
       ↓
Decision Support System

## Team Members
| Student ID | Name                   | Component                                                                           |
| ---------- | ---------------------- | ----------------------------------------------------------------------------------- |
| IT22217240 | Narasinghe N.K.B.N.N   | Multi-Objective Optimization Framework for Train Scheduling and Capacity Management |
| IT22051202 | Didulantha C.S.        | Intelligent Real-Time Train Tracking and Probabilistic Delay Prediction Framework   |
| IT22126610 | Muthukudaarachchi V.U  | Advanced Intelligent Ticket Fraud Detection and Risk-Aware Passenger Verification   |
| IT22151506 | D.M.N.T Senawirathna   | Advanced Spatio-Temporal Demand Forecasting and Adaptive Seat Allocation using AI   |

## Supervisor
Supervisor: Mrs. Chathurangika Kahandawaarachchi

## Future Improvements
Improve model accuracy using larger railway datasets
Add real-time railway data integration
Improve fraud risk scoring accuracy
Add advanced train scheduling simulations
Enhance passenger demand forecasting models
Improve dashboard analytics and visualization
Deploy the system as a complete web-based platform

## License
This project is developed for academic research purposes.

