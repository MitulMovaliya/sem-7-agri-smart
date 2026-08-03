from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from contextlib import asynccontextmanager
import joblib
import numpy as np
import pandas as pd
import json
import os
import logging
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("ml-service")

# Models path
MODELS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

# Global Assets
crop_pipeline = None
district_taluka_map = None
district_weights = None
season_crop_map = None

crop_model = None
crop_encoder = None
crop_soil_encoder = None
crop_district_encoder = None
crop_season_encoder = None

rainfall_model = None
rainfall_last_12 = None
rainfall_month_means = None
embedding_model = None

def load_assets():
    global crop_pipeline, district_taluka_map, district_weights, season_crop_map
    global crop_model, crop_encoder, crop_soil_encoder, crop_district_encoder, crop_season_encoder
    global rainfall_model, rainfall_last_12, rainfall_month_means, embedding_model
    
    try:
        # Load Hybrid Crop Recommendation Pipeline & Metadata
        pipeline_path = os.path.join(MODELS_PATH, "crop_pipeline.pkl")
        dist_taluka_path = os.path.join(MODELS_PATH, "district_taluka.json")
        dist_weights_path = os.path.join(MODELS_PATH, "district_weights.json")
        season_crop_path = os.path.join(MODELS_PATH, "season_crop.json")

        if os.path.exists(pipeline_path):
            crop_pipeline = joblib.load(pipeline_path)
            logger.info("crop_pipeline.pkl loaded successfully.")

        if os.path.exists(dist_taluka_path):
            with open(dist_taluka_path, "r") as f:
                district_taluka_map = json.load(f)

        if os.path.exists(dist_weights_path):
            with open(dist_weights_path, "r") as f:
                district_weights = json.load(f)

        if os.path.exists(season_crop_path):
            with open(season_crop_path, "r") as f:
                season_crop_map = json.load(f)

        # Load Legacy Crop Recommendation assets if present
        if os.path.exists(os.path.join(MODELS_PATH, "crop_rf.pkl")):
            crop_model = joblib.load(os.path.join(MODELS_PATH, "crop_rf.pkl"))
            crop_encoder = joblib.load(os.path.join(MODELS_PATH, "crop_encoder.pkl"))
            if os.path.exists(os.path.join(MODELS_PATH, "crop_soil_encoder.pkl")):
                crop_soil_encoder = joblib.load(os.path.join(MODELS_PATH, "crop_soil_encoder.pkl"))
            if os.path.exists(os.path.join(MODELS_PATH, "crop_district_encoder.pkl")):
                crop_district_encoder = joblib.load(os.path.join(MODELS_PATH, "crop_district_encoder.pkl"))
            if os.path.exists(os.path.join(MODELS_PATH, "crop_season_encoder.pkl")):
                crop_season_encoder = joblib.load(os.path.join(MODELS_PATH, "crop_season_encoder.pkl"))
        
        # Load Rainfall forecasting assets
        if os.path.exists(os.path.join(MODELS_PATH, "rainfall_xgb.pkl")):
            rainfall_model = joblib.load(os.path.join(MODELS_PATH, "rainfall_xgb.pkl"))
            rainfall_last_12 = joblib.load(os.path.join(MODELS_PATH, "rainfall_last_12.pkl"))
            month_means_path = os.path.join(MODELS_PATH, "rainfall_month_means.json")
            if os.path.exists(month_means_path):
                with open(month_means_path, "r") as f:
                    rainfall_month_means = json.load(f)
        
        # Load HuggingFace Embeddings Model
        if SentenceTransformer is not None:
            try:
                embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as emb_e:
                logger.warning(f"Could not load SentenceTransformer: {emb_e}")
        
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
    model_config = ConfigDict(populate_by_name=True)

    N: float = Field(..., description="Nitrogen content")
    P: float = Field(..., description="Phosphorus content")
    K: float = Field(..., description="Potassium content")
    pH: Optional[float] = Field(None, alias="ph", description="Soil pH value")
    ph: Optional[float] = Field(None, description="Soil pH value")
    temperature: Optional[float] = Field(28.0, description="Temperature in °C")
    humidity: Optional[float] = Field(None, alias="Humidity", description="Relative humidity %")
    Humidity: Optional[float] = Field(None, description="Relative humidity %")
    rainfall: Optional[float] = Field(700.0, description="Rainfall in mm")
    OC: Optional[float] = Field(0.6, description="Organic Carbon %")
    EC: Optional[float] = Field(0.3, description="Electrical Conductivity dS/m")
    Soil_Type: Optional[str] = Field("Medium Black", alias="soil_type", description="Soil Type")
    State: Optional[str] = Field("Gujarat", alias="state", description="State name")
    District: Optional[str] = Field("Ahmedabad", alias="district", description="District name")
    Taluka: Optional[str] = Field(None, alias="taluka", description="Taluka name")
    Water_Source: Optional[str] = Field("Canal", alias="water_source", description="Water Source")
    Season: Optional[str] = Field("Kharif", alias="season", description="Cropping Season")

class CropSoilInput(BaseModel):
    ph: float = Field(..., description="Soil pH value")
    N: float = Field(..., description="Nitrogen content (kg/ha)")
    P: float = Field(..., description="Phosphorus content (kg/ha)")
    K: float = Field(..., description="Potassium content (kg/ha)")
    OC: float = Field(..., description="Organic Carbon %")
    EC: float = Field(..., description="Electrical Conductivity dS/m")

class EmbeddingsRequest(BaseModel):
    text: str

class EmbeddingsResponse(BaseModel):
    embedding: List[float]

def safe_encode_category(encoder, val: str, default_idx: int = 0) -> int:
    if encoder is None or not hasattr(encoder, "classes_"):
        return default_idx
    classes = [str(c).strip() for c in encoder.classes_]
    val_clean = str(val).strip()
    if val_clean in classes:
        return int(encoder.transform([val_clean])[0])
    val_lower = val_clean.lower()
    for idx, c in enumerate(classes):
        if c.lower() == val_lower:
            return idx
    for idx, c in enumerate(classes):
        if val_lower in c.lower() or c.lower() in val_lower:
            return idx
    return default_idx

import difflib

def resolve_location(requested_district: Optional[str], requested_taluka: Optional[str]):
    """
    Fuzzy resolves district and taluka against district_taluka_map.
    If district or taluka is not in the dataset/model features, finds the nearest matching one.
    """
    default_district = "Ahmedabad"
    default_taluka = "Viramgam"

    if not district_taluka_map:
        return (requested_district or default_district), (requested_taluka or default_taluka)

    known_districts = list(district_taluka_map.keys())

    # 1. Resolve District
    resolved_district = None
    if requested_district:
        req_d_clean = requested_district.strip()
        for d in known_districts:
            if d.lower() == req_d_clean.lower():
                resolved_district = d
                break
        if not resolved_district:
            matches = difflib.get_close_matches(req_d_clean, known_districts, n=1, cutoff=0.3)
            if matches:
                resolved_district = matches[0]
            else:
                for d in known_districts:
                    if req_d_clean.lower() in d.lower() or d.lower() in req_d_clean.lower():
                        resolved_district = d
                        break

    if not resolved_district:
        resolved_district = default_district

    # 2. Resolve Taluka within resolved_district
    valid_talukas = district_taluka_map.get(resolved_district, [default_taluka])
    resolved_taluka = None

    if requested_taluka:
        req_t_clean = requested_taluka.strip()
        for t in valid_talukas:
            if t.lower() == req_t_clean.lower():
                resolved_taluka = t
                break
        if not resolved_taluka:
            matches = difflib.get_close_matches(req_t_clean, valid_talukas, n=1, cutoff=0.3)
            if matches:
                resolved_taluka = matches[0]
            else:
                for t in valid_talukas:
                    if req_t_clean.lower() in t.lower() or t.lower() in req_t_clean.lower():
                        resolved_taluka = t
                        break
                else:
                    all_talukas = [t for t_list in district_taluka_map.values() for t in t_list]
                    global_matches = difflib.get_close_matches(req_t_clean, all_talukas, n=1, cutoff=0.3)
                    if global_matches:
                        matched_t = global_matches[0]
                        for d_name, t_list in district_taluka_map.items():
                            if matched_t in t_list:
                                resolved_district = d_name
                                resolved_taluka = matched_t
                                break

    if not resolved_taluka:
        resolved_taluka = valid_talukas[0] if valid_talukas else default_taluka

    return resolved_district, resolved_taluka

@app.get("/get-location-data")
@app.get("/predict/crop-location-data")
def get_location_data():
    if district_taluka_map is None:
        raise HTTPException(status_code=404, detail="Location data metadata not loaded.")
    return {"districts": district_taluka_map}

# 1. Crop Prediction Endpoint (Hybrid Pipeline & Metadata)
@app.post("/predict/crop")
def predict_crop(inputs: CropInput):
    ph_val = inputs.pH if inputs.pH is not None else (inputs.ph if inputs.ph is not None else 6.5)
    humidity_val = inputs.Humidity if inputs.Humidity is not None else (inputs.humidity if inputs.humidity is not None else 60.0)
    
    district, taluka = resolve_location(inputs.District, inputs.Taluka)
    logger.info(f"Location resolved: Requested District='{inputs.District}', Taluka='{inputs.Taluka}' -> Matched District='{district}', Taluka='{taluka}'")

    season = inputs.Season or "Kharif"
    water_source = inputs.Water_Source or "Canal"
    soil_type = inputs.Soil_Type or "Medium Black"
    state = inputs.State or "Gujarat"

    # Use Crop Pipeline if available
    if crop_pipeline is not None:
        try:
            input_df = pd.DataFrame([{
                'State': state,
                'District': district,
                'Taluka': taluka,
                'N': float(inputs.N),
                'P': float(inputs.P),
                'K': float(inputs.K),
                'pH': float(ph_val),
                'Humidity': float(humidity_val),
                'Water_Source': water_source,
                'Season': season,
                'Soil_Type': soil_type
            }])

            # 1. ML Base Probabilities
            model = crop_pipeline.named_steps['classifier']
            classes = model.classes_
            ml_probs = crop_pipeline.predict_proba(input_df)[0]

            # 2. Apply District Regional Weighting Layer
            dist_priors = district_weights.get(district, {}) if district_weights else {}
            adjusted_scores = []

            for crop, prob in zip(classes, ml_probs):
                weight = dist_priors.get(crop, 0.05) ** 0.5
                final_score = prob * weight
                adjusted_scores.append(final_score)

            total_score = sum(adjusted_scores)
            if total_score > 0:
                norm_probs = [s / total_score for s in adjusted_scores]
            else:
                norm_probs = ml_probs

            crop_df = pd.DataFrame({
                'crop': classes,
                'probability': norm_probs
            }).sort_values(by='probability', ascending=False)

            # 3. Filter Seasonally Valid Crops
            valid_crops = season_crop_map.get(season, list(classes)) if season_crop_map else list(classes)
            filtered = crop_df[crop_df['crop'].isin(valid_crops)]

            if len(filtered) < 5:
                remaining = crop_df[~crop_df['crop'].isin(filtered['crop'])]
                filtered = pd.concat([filtered, remaining])

            top_5 = filtered.head(5)

            recommendations = []
            for idx, row in enumerate(top_5.iterrows(), start=1):
                crop_data = row[1]
                recommendations.append({
                    'priority': idx,
                    'crop': str(crop_data['crop']).title(),
                    'confidence': round(float(crop_data['probability']) * 100, 2)
                })

            return {
                "success": True,
                "status": "success",
                "model_used": "Gujarat Hybrid Crop Recommendation Model (ExtraTrees + Regional Priors)",
                "prediction": recommendations[0]["crop"],
                "confidence": recommendations[0]["confidence"],
                "recommendations": recommendations,
                "top_recommendations": recommendations
            }
        except Exception as e:
            logger.error(f"Error in crop pipeline prediction: {str(e)}")

    # Fallback to Random Forest model if crop_pipeline is missing or errored
    if crop_model is not None and crop_encoder is not None:
        try:
            ec = inputs.EC if inputs.EC is not None else 0.3
            oc = inputs.OC if inputs.OC is not None else 0.6
            rainfall = inputs.rainfall if (inputs.rainfall is not None and inputs.rainfall >= 100) else 700.0
            temperature = inputs.temperature if inputs.temperature is not None else 28.0

            soil_enc = safe_encode_category(crop_soil_encoder, soil_type)
            district_enc = safe_encode_category(crop_district_encoder, district)
            season_enc = safe_encode_category(crop_season_encoder, season)

            feat_df = pd.DataFrame([{
                'pH': ph_val,
                'EC': ec,
                'Organic_Carbon': oc,
                'Nitrogen': inputs.N,
                'Phosphorus': inputs.P,
                'Potassium': inputs.K,
                'Rainfall_mm': rainfall,
                'Temperature_C': temperature,
                'Soil_Type_enc': soil_enc,
                'District_enc': district_enc,
                'Season_enc': season_enc
            }])
            probs = crop_model.predict_proba(feat_df)[0]
            
            top_indices = np.argsort(probs)[::-1][:5]
            top_labels = crop_encoder.inverse_transform(top_indices)
            top_probs = probs[top_indices]
            
            recommendations = [
                {"priority": idx + 1, "crop": str(label).title(), "confidence": round(float(prob) * 100, 2)}
                for idx, (label, prob) in enumerate(zip(top_labels, top_probs))
            ]
            
            return {
                "success": True,
                "status": "success",
                "model_used": "Gujarat Crop Recommendation Model (RandomForest)",
                "prediction": recommendations[0]["crop"],
                "confidence": recommendations[0]["confidence"],
                "recommendations": recommendations,
                "top_recommendations": recommendations
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

    raise HTTPException(status_code=500, detail="Crop recommendation model not loaded.")

# 1b. Dedicated Crop Soil Endpoint
@app.post("/predict/crop-soil")
def predict_crop_soil(inputs: CropSoilInput):
    crop_input = CropInput(
        ph=inputs.ph,
        N=inputs.N,
        P=inputs.P,
        K=inputs.K,
        OC=inputs.OC,
        EC=inputs.EC
    )
    return predict_crop(crop_input)

# 2. Rainfall Forecasting Endpoint
@app.post("/predict/rainfall")
def predict_rainfall(year: int, month: int, lag1: Optional[float] = None, lag2: Optional[float] = None, lag12: Optional[float] = None):
    if rainfall_model is None:
        raise HTTPException(status_code=500, detail="Rainfall model not loaded.")
    
    try:
        m_str = str(month)
        default_means = {
            "1": 18.98, "2": 21.80, "3": 27.35, "4": 43.12, "5": 85.74, "6": 230.23,
            "7": 347.19, "8": 290.22, "9": 197.37, "10": 95.51, "11": 39.87, "12": 18.87
        }
        means_map = rainfall_month_means if rainfall_month_means else default_means
        month_mean = float(means_map.get(m_str, 50.0))

        # Dynamic lag fallback
        if lag1 is None:
            lag1 = float(rainfall_last_12[-1]) if (rainfall_last_12 and len(rainfall_last_12) > 0) else month_mean
        if lag2 is None:
            lag2 = float(rainfall_last_12[-2]) if (rainfall_last_12 and len(rainfall_last_12) > 1) else month_mean
        if lag12 is None:
            lag12 = month_mean

        feat_arr = np.array([[month, month_mean, lag1, lag2, lag12]])
        pred_rain = float(rainfall_model.predict(feat_arr)[0])
        pred_rain = max(0.0, float(pred_rain))
        
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

# 3. RAG Embeddings Generation Endpoint
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
            "crop_hybrid": crop_pipeline is not None,
            "crop_legacy": crop_model is not None,
            "rainfall": rainfall_model is not None,
            "embeddings": embedding_model is not None
        }
    }
