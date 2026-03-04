# 🚦 AI-Based Traffic Accident Prediction & Hotspot Detection System

## 📌 Project Overview

The **AI-Based Traffic Accident Prediction & Hotspot Detection System** is an intelligent road safety platform designed to predict accident severity and identify accident-prone locations using machine learning and spatial clustering techniques.

The system combines **Machine Learning, Geographic Analysis, and Mobile Technology** to help users and authorities understand accident risks and improve road safety.

The application provides:

* 📊 **Accident Severity Prediction using Machine Learning**
* 📍 **Accident Hotspot Detection using DBSCAN clustering**
* 📱 **Mobile Application for real-time predictions**
* 🧑‍💼 **Admin Dashboard for accident management**
* 🔔 **Automated alerts using n8n workflows**
* 🌐 **Flask REST APIs connecting backend and mobile app**

This project demonstrates how **AI can be used to improve transportation safety and assist decision-making in traffic management systems.**

# 🎯 Objectives

The main objectives of this project are:

1. Predict the **severity of traffic accidents** based on environmental and road conditions.
2. Identify **high-risk accident hotspots** using clustering algorithms.
3. Provide a **mobile interface** for real-time predictions.
4. Enable administrators to **manage accident records and recompute hotspots**.
5. Trigger **automatic alerts** for dangerous accident predictions.

# 🏗 System Architecture

The system follows a **three-layer architecture**:

```
Mobile Application (React Native / Expo)
        |
        | REST API Requests
        ↓
Flask Backend Server
        |
        | ML Prediction + Data Processing
        ↓
Machine Learning Model (XGBoost)
        |
        ↓
Dataset + Hotspot Detection (DBSCAN)
```

### Components

* **Frontend:** React Native mobile application
* **Backend:** Flask REST API
* **Machine Learning:** XGBoost classification model
* **Database:** SQLite (user authentication)
* **Clustering:** DBSCAN for hotspot detection
* **Automation:** n8n workflow alerts

---

# 🧠 Machine Learning Model

### Algorithm Used

**XGBoost Classifier**

XGBoost is used because it provides:

* High prediction accuracy
* Fast training performance
* Good handling of tabular data
* Robustness against overfitting

---

### Target Variable

The model predicts **Accident Severity**:

| Label | Meaning |
| ----- | ------- |
| 0     | Minor   |
| 1     | Serious |
| 2     | Fatal   |

---

### Input Features

The prediction model uses the following features:

| Feature         | Description                 |
| --------------- | --------------------------- |
| Latitude        | Accident location latitude  |
| Longitude       | Accident location longitude |
| Hour            | Hour of the day             |
| Day             | Day of month                |
| Month           | Month                       |
| Day of Week     | Day of the week             |
| Weather         | Weather condition           |
| Traffic Density | Traffic level               |
| Road Type       | Urban / Rural / Highway     |

Categorical variables are encoded using **Label Encoders**.

---

# 📍 Hotspot Detection

To detect accident-prone areas, the system uses **DBSCAN clustering**.

### Algorithm

**DBSCAN (Density-Based Spatial Clustering of Applications with Noise)**

### Why DBSCAN?

* Does not require predefined number of clusters
* Handles noise effectively
* Works well with geographic coordinates

### Output

The clustering process generates:

```
hotspots_dbscan.csv
```

Each cluster represents a **dangerous accident zone**.

---

# 📱 Mobile Application

The mobile app is built using:

* **React Native**
* **Expo Framework**
* **React Native Paper (Material Design)**

### Mobile Features

Users can:

* Register and login
* Predict accident severity
* View accident hotspots
* Monitor accident risk at locations
* Access profile and dashboard

---

# 🧑‍💼 Admin Dashboard

The system includes an **Admin Panel** for managing accident data and system monitoring.

### Admin Capabilities

Admins can:

✔ Add new accident records
✔ View accident hotspots
✔ Recompute hotspot clusters
✔ Monitor accident trends
✔ Manage users

---

### Admin Workflow

1. Admin logs into the dashboard.
2. Admin can add accident details including:

   * Location
   * Severity
3. Data is stored in the dataset CSV.
4. Admin can trigger **hotspot recomputation**.
5. The clustering script updates hotspot locations.

---

# 🔔 Alert System (n8n Integration)

The system integrates with **n8n automation workflows**.

When the prediction result is **Serious or Fatal**, the system triggers an alert.

### Alert Data Includes

* Latitude
* Longitude
* User email
* Phone number
* Timestamp

This enables **automated notification systems** for emergency response.

---

# 🌐 Backend System

The backend is developed using **Flask**.

### Backend Responsibilities

* Handle authentication
* Process prediction requests
* Serve hotspot data
* Trigger automation alerts
* Manage accident records

---

# 🔐 Authentication System

User authentication is implemented using:

* **SQLite database**
* Signup and login APIs
* Role-based access

### User Roles

| Role  | Permissions                          |
| ----- | ------------------------------------ |
| User  | Prediction, view hotspots            |
| Admin | Manage accidents, recompute hotspots |

---

# 📡 REST API Endpoints

### Authentication APIs

```
POST /api/signup
POST /api/login
```

---

### Prediction API

```
POST /api/predict
```

Returns:

```
{
  "severity": "Serious",
  "confidence": 0.87
}
```

---

### Hotspot API

```
GET /api/hotspots
```

Returns hotspot coordinates for visualization.

---

# 🗂 Project Structure

```
traffic_accident_prevention
│
├── mobile_app/                # React Native mobile application
│
├── templates/                 # HTML templates for web interface
│
├── static/                    # CSS and images
│
├── users.db                   # SQLite authentication database
│
├── app.py                     # Flask backend application
│
├── hotspot_dbscan.py          # DBSCAN hotspot detection script
│
├── hotspots_dbscan.csv        # Generated hotspot clusters
│
├── xgboost_accident_model.pkl # Trained ML model
│
├── weather_encoder.pkl
├── traffic_encoder.pkl
├── road_encoder.pkl
│
├── dataset/
│   └── andhra_pradesh_traffic_accidents_70k_realistic.csv
│
└── README.md
```

---

# ⚙ Installation

## Clone Repository

```
git clone https://github.com/yourusername/traffic-accident-prediction.git
cd traffic-accident-prediction
```

---

# 🐍 Backend Setup

Install dependencies:

```
pip install flask flask-cors pandas scikit-learn xgboost joblib requests
```

Run Flask server:

```
python app.py
```

Server runs on:

```
http://localhost:5000
```

---

# 📱 Mobile App Setup

Install dependencies:

```
npm install
```

Start Expo:

```
npx expo start
```

Run using:

* Expo Go mobile app
* Android emulator
* Web browser

---

# 📊 Dataset

Dataset used:

**Andhra Pradesh Traffic Accident Dataset**

Size:

```
70,000 records
```

Attributes include:

* accident location
* weather condition
* traffic density
* road type
* accident severity

---

# 🔮 Future Improvements

Future enhancements may include:

* Real-time traffic data integration
* Google Maps visualization
* AI-based driver warning system
* Deep learning accident prediction
* Government traffic analytics dashboard
* Integration with emergency services

---

# 👨‍💻 Author

**Sindhu Bugatha**
Software Engineering Student

---

# ⭐ Support

If you find this project useful, please consider **starring ⭐ the repository**.
