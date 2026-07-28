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

# 1. Train Crop Recommendation Model
def train_crop_model():
    crop_path = os.path.join(DATA_DIR, "crop_recommendation.csv")
    data = pd.read_csv(crop_path)
    X = data[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
    y = data['label']
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Crop Recommendation Model trained on Kaggle dataset. Test Accuracy: {score * 100:.2f}%")
    
    joblib.dump(model, os.path.join(MODELS_DIR, "crop_rf.pkl"))
    joblib.dump(le, os.path.join(MODELS_DIR, "crop_encoder.pkl"))

# 2. Train Fertilizer Recommendation Model
def train_fertilizer_model():
    fert_path = os.path.join(DATA_DIR, "fertilizer_prediction.csv")
    data = pd.read_csv(fert_path)
    
    le_soil = LabelEncoder()
    data['Soil Type'] = le_soil.fit_transform(data['Soil Type'])
    
    le_crop = LabelEncoder()
    data['Crop Type'] = le_crop.fit_transform(data['Crop Type'])
    
    le_fert = LabelEncoder()
    data['Fertilizer Name'] = le_fert.fit_transform(data['Fertilizer Name'])
    
    X = data[['Temperature', 'Humidity', 'Moisture', 'Soil Type', 'Crop Type', 'N', 'P', 'K']]
    y = data['Fertilizer Name']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    model = XGBClassifier(n_estimators=50, max_depth=5, learning_rate=0.1, random_state=42, eval_metric='mlogloss')
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Fertilizer Recommendation Model trained on Kaggle dataset. Test Accuracy: {score * 100:.2f}%")
    
    joblib.dump(model, os.path.join(MODELS_DIR, "fertilizer_xgb.pkl"))
    joblib.dump(le_soil, os.path.join(MODELS_DIR, "fertilizer_soil_encoder.pkl"))
    joblib.dump(le_crop, os.path.join(MODELS_DIR, "fertilizer_crop_encoder.pkl"))
    joblib.dump(le_fert, os.path.join(MODELS_DIR, "fertilizer_label_encoder.pkl"))

# 3. Train Yield Prediction Model
def train_yield_model():
    yield_path = os.path.join(DATA_DIR, "india_crop_production.csv")
    data = pd.read_csv(yield_path)
    
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
    
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f"Yield Prediction Model trained on Kaggle dataset. Train R2: {train_score:.2f}, Test R2: {test_score:.2f}")
    
    joblib.dump(model, os.path.join(MODELS_DIR, "yield_xgb.pkl"))
    joblib.dump(le_state, os.path.join(MODELS_DIR, "yield_state_encoder.pkl"))
    joblib.dump(le_dist, os.path.join(MODELS_DIR, "yield_dist_encoder.pkl"))
    joblib.dump(le_season, os.path.join(MODELS_DIR, "yield_season_encoder.pkl"))
    joblib.dump(le_crop, os.path.join(MODELS_DIR, "yield_crop_encoder.pkl"))

# 4. Train Rainfall Forecasting Model
def train_rainfall_model():
    rainfall_path = os.path.join(DATA_DIR, "historical_rainfall.csv")
    data = pd.read_csv(rainfall_path)
    data['date'] = pd.to_datetime(data['date'])
    
    data['Year'] = data['date'].dt.year
    data['Month'] = data['date'].dt.month
    
    data['Lag1'] = data['rainfall'].shift(1)
    data['Lag2'] = data['rainfall'].shift(2)
    data['Lag12'] = data['rainfall'].shift(12)
    
    data = data.dropna().reset_index(drop=True)
    
    X = data[['Year', 'Month', 'Lag1', 'Lag2', 'Lag12']]
    y = data['rainfall']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    model = XGBRegressor(n_estimators=50, max_depth=4, learning_rate=0.1, random_state=42)
    model.fit(X_train, y_train)
    
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f"Rainfall Forecasting Model trained on Kaggle dataset. Train R2: {train_score:.2f}, Test R2: {test_score:.2f}")
    
    joblib.dump(model, os.path.join(MODELS_DIR, "rainfall_xgb.pkl"))
    last_12_vals = data['rainfall'].tail(12).tolist()
    joblib.dump(last_12_vals, os.path.join(MODELS_DIR, "rainfall_last_12.pkl"))

if __name__ == "__main__":
    train_crop_model()
    train_fertilizer_model()
    train_yield_model()
    train_rainfall_model()
