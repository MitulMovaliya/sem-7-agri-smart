import pandas as pd
import numpy as np
import json
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import ExtraTreesClassifier

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(MODELS_DIR, exist_ok=True)

def train_crop_pipeline():
    dataset_path = os.path.join(DATA_DIR, "gujarat_crop_dataset.csv")
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")
        
    df = pd.read_csv(dataset_path)

    # 1. District-Taluka mapping & Seasonal Crop Rules
    district_taluka_map = df.groupby('District')['Taluka'].unique().apply(list).to_dict()
    season_crop_map = df.groupby('Season')['Crop'].unique().apply(list).to_dict()

    # 2. District Regional Crop Weight Matrix (Smooth Prior Probabilities)
    district_crop_counts = pd.crosstab(df['District'], df['Crop'])
    district_crop_probs = (district_crop_counts + 0.5).div((district_crop_counts + 0.5).sum(axis=1), axis=0)
    district_weight_matrix = district_crop_probs.to_dict(orient='index')

    with open(os.path.join(MODELS_DIR, 'district_taluka.json'), 'w') as f:
        json.dump(district_taluka_map, f)

    with open(os.path.join(MODELS_DIR, 'season_crop.json'), 'w') as f:
        json.dump(season_crop_map, f)

    with open(os.path.join(MODELS_DIR, 'district_weights.json'), 'w') as f:
        json.dump(district_weight_matrix, f)

    # 3. Features & Target
    X = df.drop(columns=['Crop'])
    y = df['Crop']

    categorical_cols = ['State', 'District', 'Taluka', 'Water_Source', 'Season', 'Soil_Type']
    numerical_cols = ['N', 'P', 'K', 'pH', 'Humidity']

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols)
        ]
    )

    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', ExtraTreesClassifier(
            n_estimators=300,
            max_depth=15,
            min_samples_split=4,
            random_state=42
        ))
    ])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model_pipeline.fit(X_train, y_train)

    score = model_pipeline.score(X_test, y_test)
    print(f"Hybrid Crop Model Pipeline trained. Test Accuracy: {score * 100:.2f}%")

    joblib.dump(model_pipeline, os.path.join(MODELS_DIR, 'crop_pipeline.pkl'))
    print("Crop pipeline and metadata assets saved successfully!")

if __name__ == "__main__":
    train_crop_pipeline()
