import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier, XGBRegressor
import os

# Create models directory
os.makedirs("ml-service/models", exist_ok=True)

# 1. Train Crop Recommendation Model
def train_crop_model():
    data = pd.read_csv("ml-service/data/crop_recommendation.csv")
    X = data[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
    y = data['label']
    
    # Save the label mapping
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Crop Recommendation Model trained. Accuracy: {score * 100:.2f}%")
    
    # Serialize model and label encoder
    joblib.dump(model, "ml-service/models/crop_rf.pkl")
    joblib.dump(le, "ml-service/models/crop_encoder.pkl")

# 2. Train Fertilizer Recommendation Model
def train_fertilizer_model():
    data = pd.read_csv("ml-service/data/fertilizer_prediction.csv")
    
    # Label encode categorical columns
    le_soil = LabelEncoder()
    data['Soil Type'] = le_soil.fit_transform(data['Soil Type'])
    
    le_crop = LabelEncoder()
    data['Crop Type'] = le_crop.fit_transform(data['Crop Type'])
    
    le_fert = LabelEncoder()
    data['Fertilizer Name'] = le_fert.fit_transform(data['Fertilizer Name'])
    
    X = data[['Temperature', 'Humidity', 'Moisture', 'Soil Type', 'Crop Type', 'N', 'P', 'K']]
    y = data['Fertilizer Name']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    model = XGBClassifier(n_estimators=50, max_depth=5, learning_rate=0.1, random_state=42, use_label_encoder=False, eval_metric='mlogloss')
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Fertilizer Recommendation Model trained. Accuracy: {score * 100:.2f}%")
    
    joblib.dump(model, "ml-service/models/fertilizer_xgb.pkl")
    joblib.dump(le_soil, "ml-service/models/fertilizer_soil_encoder.pkl")
    joblib.dump(le_crop, "ml-service/models/fertilizer_crop_encoder.pkl")
    joblib.dump(le_fert, "ml-service/models/fertilizer_label_encoder.pkl")

# 3. Train Yield Prediction Model
def train_yield_model():
    data = pd.read_csv("ml-service/data/india_crop_production.csv")
    
    le_state = LabelEncoder()
    data['State'] = le_state.fit_transform(data['State'])
    
    le_dist = LabelEncoder()
    data['District'] = le_dist.fit_transform(data['District'])
    
    le_season = LabelEncoder()
    data['Season'] = le_season.fit_transform(data['Season'])
    
    le_crop = LabelEncoder()
    data['Crop'] = le_crop.fit_transform(data['Crop'])
    
    X = data[['State', 'District', 'Season', 'Crop', 'Area', 'Temperature', 'Rainfall']]
    y = data['Yield']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42)
    model.fit(X_train, y_train)
    
    # Calculate R2 score
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f"Yield Prediction Model trained. Train R2: {train_score:.2f}, Test R2: {test_score:.2f}")
    
    joblib.dump(model, "ml-service/models/yield_xgb.pkl")
    joblib.dump(le_state, "ml-service/models/yield_state_encoder.pkl")
    joblib.dump(le_dist, "ml-service/models/yield_dist_encoder.pkl")
    joblib.dump(le_season, "ml-service/models/yield_season_encoder.pkl")
    joblib.dump(le_crop, "ml-service/models/yield_crop_encoder.pkl")

# 4. Train Rainfall Forecasting Model
def train_rainfall_model():
    data = pd.read_csv("ml-service/data/historical_rainfall.csv")
    data['date'] = pd.to_datetime(data['date'])
    
    # Feature engineering for monthly time series
    data['Year'] = data['date'].dt.year
    data['Month'] = data['date'].dt.month
    
    # Lag features
    data['Lag1'] = data['rainfall'].shift(1)
    data['Lag2'] = data['rainfall'].shift(2)
    data['Lag12'] = data['rainfall'].shift(12)
    
    # Drop rows with NaN due to shifting
    data = data.dropna().reset_index(drop=True)
    
    X = data[['Year', 'Month', 'Lag1', 'Lag2', 'Lag12']]
    y = data['rainfall']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    model = XGBRegressor(n_estimators=50, max_depth=4, learning_rate=0.1, random_state=42)
    model.fit(X_train, y_train)
    
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f"Rainfall Forecasting Model trained. Train R2: {train_score:.2f}, Test R2: {test_score:.2f}")
    
    joblib.dump(model, "ml-service/models/rainfall_xgb.pkl")
    # Save the last 12 values for lag feature calculations during live inference
    last_12_vals = data['rainfall'].tail(12).tolist()
    joblib.dump(last_12_vals, "ml-service/models/rainfall_last_12.pkl")

if __name__ == "__main__":
    train_crop_model()
    train_fertilizer_model()
    train_yield_model()
    train_rainfall_model()
