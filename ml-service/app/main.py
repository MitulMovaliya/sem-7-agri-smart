from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from contextlib import asynccontextmanager
import joblib
import numpy as np
import pandas as pd
import os
import logging
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("ml-service")

# Load models and encoders
MODELS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

crop_model = None
crop_encoder = None
fertilizer_model = None
fertilizer_soil_encoder = None
fertilizer_crop_encoder = None
fertilizer_label_encoder = None
yield_model = None
yield_state_encoder = None
yield_dist_encoder = None
yield_season_encoder = None
yield_crop_encoder = None
rainfall_model = None
rainfall_last_12 = None
embedding_model = None

def load_assets():
    global crop_model, crop_encoder, fertilizer_model, fertilizer_soil_encoder, fertilizer_crop_encoder, fertilizer_label_encoder
    global yield_model, yield_state_encoder, yield_dist_encoder, yield_season_encoder, yield_crop_encoder
    global rainfall_model, rainfall_last_12, embedding_model
    
    try:
        # Load Crop recommendation assets
        crop_model = joblib.load(os.path.join(MODELS_PATH, "crop_rf.pkl"))
        crop_encoder = joblib.load(os.path.join(MODELS_PATH, "crop_encoder.pkl"))
        
        # Load Fertilizer recommendation assets
        fertilizer_model = joblib.load(os.path.join(MODELS_PATH, "fertilizer_xgb.pkl"))
        fertilizer_soil_encoder = joblib.load(os.path.join(MODELS_PATH, "fertilizer_soil_encoder.pkl"))
        fertilizer_crop_encoder = joblib.load(os.path.join(MODELS_PATH, "fertilizer_crop_encoder.pkl"))
        fertilizer_label_encoder = joblib.load(os.path.join(MODELS_PATH, "fertilizer_label_encoder.pkl"))
        
        # Load Yield prediction assets
        yield_model = joblib.load(os.path.join(MODELS_PATH, "yield_xgb.pkl"))
        yield_state_encoder = joblib.load(os.path.join(MODELS_PATH, "yield_state_encoder.pkl"))
        yield_dist_encoder = joblib.load(os.path.join(MODELS_PATH, "yield_dist_encoder.pkl"))
        yield_season_encoder = joblib.load(os.path.join(MODELS_PATH, "yield_season_encoder.pkl"))
        yield_crop_encoder = joblib.load(os.path.join(MODELS_PATH, "yield_crop_encoder.pkl"))
        
        # Load Rainfall forecasting assets
        rainfall_model = joblib.load(os.path.join(MODELS_PATH, "rainfall_xgb.pkl"))
        rainfall_last_12 = joblib.load(os.path.join(MODELS_PATH, "rainfall_last_12.pkl"))
        
        # Load HuggingFace Embeddings Model
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        logger.info("All models and assets loaded successfully!")
    except Exception as e:
        logger.error(f"Error loading models on startup: {str(e)}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_assets()
    yield

# Initialize FastAPI
app = FastAPI(title="AgriSmart ML Service", version="1.0.0", lifespan=lifespan)

# Schemas for Input Validation
class CropInput(BaseModel):
    N: float = Field(..., description="Nitrogen ratio")
    P: float = Field(..., description="Phosphorus ratio")
    K: float = Field(..., description="Potassium ratio")
    temperature: float = Field(..., description="Temperature in °C")
    humidity: float = Field(..., description="Relative humidity %")
    ph: float = Field(..., description="Soil pH value")
    rainfall: float = Field(..., description="Rainfall in mm")

class FertilizerInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    Temperature: float
    Humidity: float
    Moisture: float
    Soil_Type: str = Field(..., alias="Soil Type")
    Crop_Type: str = Field(..., alias="Crop Type")
    N: float
    P: float
    K: float

class YieldInput(BaseModel):
    State: str
    District: str
    Season: str
    Crop: str
    Area: float
    Temperature: float
    Rainfall: float

class EmbeddingsRequest(BaseModel):
    text: str

class EmbeddingsResponse(BaseModel):
    embedding: List[float]

# 1. Crop Prediction Endpoint
@app.post("/predict/crop")
def predict_crop(inputs: CropInput):
    if crop_model is None or crop_encoder is None:
        raise HTTPException(status_code=500, detail="Crop recommendation model not loaded.")
    
    try:
        feat_arr = np.array([[inputs.N, inputs.P, inputs.K, inputs.temperature, inputs.humidity, inputs.ph, inputs.rainfall]])
        probs = crop_model.predict_proba(feat_arr)[0]
        
        # Get top 3 recommendations
        top_indices = np.argsort(probs)[::-1][:3]
        top_labels = crop_encoder.inverse_transform(top_indices)
        top_probs = probs[top_indices]
        
        recommendations = []
        for label, prob in zip(top_labels, top_probs):
            recommendations.append({
                "crop": label,
                "confidence": round(float(prob) * 100, 2)
            })
            
        return {
            "success": True,
            "prediction": recommendations[0]["crop"],
            "confidence": recommendations[0]["confidence"],
            "top_recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

# 2. Fertilizer Prediction Endpoint
@app.post("/predict/fertilizer")
def predict_fertilizer(inputs: FertilizerInput):
    if fertilizer_model is None:
        raise HTTPException(status_code=500, detail="Fertilizer prediction model not loaded.")
    
    try:
        # Encode categorical variables
        soil_enc = fertilizer_soil_encoder.transform([inputs.Soil_Type])[0]
        crop_enc = fertilizer_crop_encoder.transform([inputs.Crop_Type])[0]
        
        feat_arr = np.array([[inputs.Temperature, inputs.Humidity, inputs.Moisture, soil_enc, crop_enc, inputs.N, inputs.P, inputs.K]])
        pred = fertilizer_model.predict(feat_arr)[0]
        label = fertilizer_label_encoder.inverse_transform([pred])[0]
        
        # Calculate NPK Deficits
        ideal_npk = {"Rice": (90, 42, 42), "Maize": (70, 42, 20), "Wheat": (80, 40, 25), "Cotton": (110, 45, 20)}
        ideal = ideal_npk.get(inputs.Crop_Type, (50, 30, 30))
        
        return {
            "success": True,
            "prediction": label,
            "deficits": {
                "N": ideal[0] - inputs.N,
                "P": ideal[1] - inputs.P,
                "K": ideal[2] - inputs.K
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

# 3. Yield Prediction Endpoint
@app.post("/predict/yield")
def predict_yield(inputs: YieldInput):
    if yield_model is None:
        raise HTTPException(status_code=500, detail="Yield model not loaded.")
    
    try:
        state_enc = yield_state_encoder.transform([inputs.State])[0]
        dist_enc = yield_dist_encoder.transform([inputs.District])[0]
        season_enc = yield_season_encoder.transform([inputs.Season])[0]
        crop_enc = yield_crop_encoder.transform([inputs.Crop])[0]
        
        feat_arr = np.array([[state_enc, dist_enc, season_enc, crop_enc, inputs.Area, inputs.Temperature, inputs.Rainfall]])
        pred_yield = yield_model.predict(feat_arr)[0]
        pred_yield = max(0.1, float(pred_yield))
        
        total_prod = pred_yield * inputs.Area
        
        return {
            "success": True,
            "yield_per_hectare": round(pred_yield, 2),
            "estimated_production": round(total_prod, 2),
            "unit": "tonnes"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

# 4. Rainfall Forecasting Endpoint
@app.post("/predict/rainfall")
def predict_rainfall(year: int, month: int):
    if rainfall_model is None or rainfall_last_12 is None:
        raise HTTPException(status_code=500, detail="Rainfall model not loaded.")
    
    try:
        # Build features using historical lag references
        # In a real pipeline we calculate lag relative to the targeted Month/Year.
        # Here we mock lag values derived from recent averages for simplicity.
        lag1 = rainfall_last_12[-1]
        lag2 = rainfall_last_12[-2]
        lag12 = rainfall_last_12[-12]
        
        feat_arr = np.array([[year, month, lag1, lag2, lag12]])
        pred_rain = rainfall_model.predict(feat_arr)[0]
        pred_rain = max(0.0, float(pred_rain))
        
        # Categorize
        if pred_rain > 150:
            category = "Above Normal"
            advisory = "Prepare proper drainage channels. Good sowing moisture expected."
        elif pred_rain < 40:
            category = "Below Normal"
            advisory = "Risk of dry spell. Plan localized irrigation options."
        else:
            category = "Normal"
            advisory = "Nominal conditions. Proceed with sowing as scheduled."
            
        return {
            "success": True,
            "forecasted_rainfall": round(pred_rain, 2),
            "category": category,
            "advisory": advisory,
            "unit": "mm"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Forecasting error: {str(e)}")

# 5. RAG Embeddings Generation Endpoint
@app.post("/embeddings", response_model=EmbeddingsResponse)
def get_embeddings(payload: EmbeddingsRequest):
    if embedding_model is None:
        raise HTTPException(status_code=500, detail="Embeddings model not loaded.")
    
    try:
        vector = embedding_model.encode(payload.text)
        return {"embedding": vector.tolist()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Embeddings generation error: {str(e)}")

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "models_loaded": {
            "crop": crop_model is not None,
            "fertilizer": fertilizer_model is not None,
            "yield": yield_model is not None,
            "rainfall": rainfall_model is not None,
            "embeddings": embedding_model is not None
        }
    }
