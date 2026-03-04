#!/usr/bin/env python
"""
Train XGBoost model on accident data
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import joblib
import os

# Load dataset
print("Loading dataset...")
df = pd.read_csv("andhra_pradesh_traffic_accidents_70k_realistic.csv")
print(f"Dataset shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")

# Check what columns we have
print("\nFirst few rows:")
print(df.head())
print("\nData types:")
print(df.dtypes)

# Select relevant features
# We'll use: latitude, longitude, hour, day, month, day_of_week, weather, traffic_density, road_type, accident_severity
# Extract date/time features from date_time column
if 'date_time' in df.columns:
    df['date_time'] = pd.to_datetime(df['date_time'])
    df['hour'] = df['date_time'].dt.hour
    df['day'] = df['date_time'].dt.day
    df['month'] = df['date_time'].dt.month
    df['day_of_week'] = df['date_time'].dt.dayofweek

# Select relevant features
# We'll use: latitude, longitude, hour, day, month, day_of_week, weather, traffic_density, road_type, accident_severity
feature_cols = ['latitude', 'longitude', 'hour', 'day', 'month', 'day_of_week', 'weather', 'traffic_density', 'road_type']
target_col = 'accident_severity'

# Check if target column exists
if target_col not in df.columns:
    print(f"\nError: '{target_col}' not in dataset. Available columns: {df.columns.tolist()}")
    exit(1)

# Remove rows with missing values in required columns
df_clean = df[feature_cols + [target_col]].dropna()
print(f"\nCleaned dataset shape: {df_clean.shape}")

# Encode categorical variables
weather_encoder = LabelEncoder()
traffic_encoder = LabelEncoder()
road_encoder = LabelEncoder()
target_encoder = LabelEncoder()

df_clean['weather_encoded'] = weather_encoder.fit_transform(df_clean['weather'].astype(str))
df_clean['traffic_encoded'] = traffic_encoder.fit_transform(df_clean['traffic_density'].astype(str))
df_clean['road_encoded'] = road_encoder.fit_transform(df_clean['road_type'].astype(str))
df_clean['target_encoded'] = target_encoder.fit_transform(df_clean[target_col].astype(str))

print(f"\nWeather classes: {weather_encoder.classes_}")
print(f"Traffic classes: {traffic_encoder.classes_}")
print(f"Road classes: {road_encoder.classes_}")
print(f"Target classes: {target_encoder.classes_}")

# Prepare features and target
X = df_clean[['latitude', 'longitude', 'hour', 'day', 'month', 'day_of_week', 'weather_encoded', 'traffic_encoded', 'road_encoded']]
X.columns = ['latitude', 'longitude', 'hour', 'day', 'month', 'day_of_week', 'weather', 'traffic_density', 'road_type']

y = df_clean['target_encoded']

print(f"\nFeature shape: {X.shape}")
print(f"Target shape: {y.shape}")
print(f"Target distribution:\n{y.value_counts()}")

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Train XGBoost
print("\nTraining XGBoost model...")
model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    random_state=42,
    num_class=3
)

model.fit(X_train, y_train, verbose=False)

# Evaluate
train_score = model.score(X_train, y_train)
test_score = model.score(X_test, y_test)
print(f"Train accuracy: {train_score:.4f}")
print(f"Test accuracy: {test_score:.4f}")

# Save model and encoders
print("\nSaving model and encoders...")
joblib.dump(model, "xgboost_accident_model.pkl")
joblib.dump(weather_encoder, "weather_encoder.pkl")
joblib.dump(traffic_encoder, "traffic_encoder.pkl")
joblib.dump(road_encoder, "road_encoder.pkl")

print("✅ Model and encoders saved successfully!")
