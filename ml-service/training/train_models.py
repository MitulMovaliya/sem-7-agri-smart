import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier, XGBRegressor
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(MODELS_DIR, exist_ok=True)

# 1. Train Crop Recommendation Model (Gujarat Dataset)
def train_crop_model():
    crop_path = os.path.join(DATA_DIR, "Gujarat_Crop_Recommendation_Dataset.csv")
    if not os.path.exists(crop_path):
        raise FileNotFoundError(f"Gujarat Crop Recommendation Dataset not found at {crop_path}")
        
    data = pd.read_csv(crop_path)
    
    le_crop = LabelEncoder()
    y_encoded = le_crop.fit_transform(data['Crop'])
    
    le_soil = LabelEncoder()
    data['Soil_Type_enc'] = le_soil.fit_transform(data['Soil_Type'])
    
    le_district = LabelEncoder()
    data['District_enc'] = le_district.fit_transform(data['District'])
    
    le_season = LabelEncoder()
    data['Season_enc'] = le_season.fit_transform(data['Season'])
    
    feature_cols = [
        'pH', 'EC', 'Organic_Carbon', 'Nitrogen', 'Phosphorus', 'Potassium',
        'Rainfall_mm', 'Temperature_C', 'Soil_Type_enc', 'District_enc', 'Season_enc'
    ]
    
    X = data[feature_cols]
    y = y_encoded
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Crop Recommendation Model trained on Gujarat Crop Recommendation Dataset. Test Accuracy: {score * 100:.2f}%")
    
    joblib.dump(model, os.path.join(MODELS_DIR, "crop_rf.pkl"))
    joblib.dump(le_crop, os.path.join(MODELS_DIR, "crop_encoder.pkl"))
    joblib.dump(le_soil, os.path.join(MODELS_DIR, "crop_soil_encoder.pkl"))
    joblib.dump(le_district, os.path.join(MODELS_DIR, "crop_district_encoder.pkl"))
    joblib.dump(le_season, os.path.join(MODELS_DIR, "crop_season_encoder.pkl"))

# 2. Train Rainfall Forecasting Model
def train_rainfall_model():
    import json
    rainfall_path = os.path.join(DATA_DIR, "historical_rainfall.csv")
    if not os.path.exists(rainfall_path):
        print(f"Skipping Rainfall Model: {rainfall_path} not found.")
        return
    data = pd.read_csv(rainfall_path)
    data['date'] = pd.to_datetime(data['date'])
    
    data['Year'] = data['date'].dt.year
    data['Month'] = data['date'].dt.month
    
    month_means_dict = data.groupby('Month')['rainfall'].mean().to_dict()
    data['Month_Mean'] = data['Month'].map(month_means_dict)
    
    data['Lag1'] = data['rainfall'].shift(1)
    data['Lag2'] = data['rainfall'].shift(2)
    data['Lag12'] = data['rainfall'].shift(12)
    
    data = data.dropna().reset_index(drop=True)
    
    X = data[['Month', 'Month_Mean', 'Lag1', 'Lag2', 'Lag12']]
    y = data['rainfall']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    model = XGBRegressor(n_estimators=100, max_depth=3, learning_rate=0.05, random_state=42)
    model.fit(X_train, y_train)
    
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f"Rainfall Forecasting Model trained. Train R2: {train_score:.2f}, Test R2: {test_score:.2f}")
    
    joblib.dump(model, os.path.join(MODELS_DIR, "rainfall_xgb.pkl"))
    last_12_vals = data['rainfall'].tail(12).tolist()
    joblib.dump(last_12_vals, os.path.join(MODELS_DIR, "rainfall_last_12.pkl"))
    with open(os.path.join(MODELS_DIR, "rainfall_month_means.json"), "w") as f:
        json.dump({str(k): float(v) for k, v in month_means_dict.items()}, f, indent=2)

if __name__ == "__main__":
    train_crop_model()
    train_rainfall_model()

