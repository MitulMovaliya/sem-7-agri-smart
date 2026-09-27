from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from contextlib import asynccontextmanager
import joblib
import numpy as np
import pandas as pd
import json
import os
import io
import logging
import difflib
from PIL import Image

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

try:
    from tensorflow.keras.models import load_model as keras_load_model
    from tensorflow.keras.applications.efficientnet import preprocess_input as efficientnet_preprocess_input
except Exception as tf_err:
    try:
        from keras.models import load_model as keras_load_model
        from keras.applications.efficientnet import preprocess_input as efficientnet_preprocess_input
    except Exception:
        keras_load_model = None
        efficientnet_preprocess_input = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("ml-service")

# Models path
MODELS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

# Global Assets - Crop Recommendation & Rainfall
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

# Global Assets - Fertilizer Predictor & Soil CNN
fertilizer_model = None
fertilizer_encoders = None
fertilizer_metadata = None

soil_cnn_model = None
soil_cnn_class_names = None

# Detailed Agronomic Usage, Application & Dosage Catalog
AGRONOMIC_GUIDE = {
    "Urea": {
        "trade_name": "Urea (46% N)",
        "category": "Straight Nitrogenous",
        "use": "Supplies readily available nitrogen to drive vigorous vegetative canopy expansion, leafy foliage growth, and rapid chlorophyll synthesis.",
        "how_to_use": "Apply in split doses (at sowing and tillering/active growth). Incorporate into moist soil or irrigate immediately after application to minimize nitrogen loss through ammonia volatilization.",
        "quantity_acre": "45 - 55 kg / acre",
        "quantity_hectare": "110 - 135 kg / hectare",
        "timing": "Split into 2-3 applications during vegetative tillering/branching"
    },
    "DAP": {
        "trade_name": "Di-Ammonium Phosphate (18-46-0)",
        "category": "Phosphatic Fertilizer",
        "use": "Supplies concentrated phosphorus alongside starter nitrogen to stimulate early root elongation, robust seedling establishment, and sturdy tillers.",
        "how_to_use": "Apply as a basal dose 3–5 cm below the seed zone during sowing or transplanting. Band placement is recommended to prevent phosphorus fixation.",
        "quantity_acre": "40 - 50 kg / acre",
        "quantity_hectare": "100 - 125 kg / hectare",
        "timing": "Single basal dose at sowing/planting"
    },
    "MOP": {
        "trade_name": "Muriate of Potash (0-0-60)",
        "category": "Potassic Fertilizer",
        "use": "Enhances crop drought, pest, and disease tolerance, regulates stomatal water balance, and improves grain filling, fruit size, and weight.",
        "how_to_use": "Apply basally at land preparation or in split top-dressings at flowering/fruiting stage for long-duration crops.",
        "quantity_acre": "25 - 35 kg / acre",
        "quantity_hectare": "60 - 85 kg / hectare",
        "timing": "Basal or split at early flowering stage"
    },
    "NPK": {
        "trade_name": "Complex NPK (Balanced)",
        "category": "Multi-Nutrient Complex",
        "use": "Delivers a balanced ratio of Nitrogen, Phosphorus, and Potassium for uniform vegetative, root, and reproductive development throughout the crop cycle.",
        "how_to_use": "Apply as basal placement during final plowing/sowing, or broadcast during early vegetative stages prior to irrigation.",
        "quantity_acre": "40 - 60 kg / acre",
        "quantity_hectare": "100 - 150 kg / hectare",
        "timing": "Basal application at sowing or early vegetative stage"
    },
    "Compost": {
        "trade_name": "Organic Compost / Well-Decomposed Farmyard Manure (FYM)",
        "category": "Organic Soil Conditioner",
        "use": "Restores soil organic carbon, enhances beneficial soil microbial biodiversity, buffers acidic soil pH, and substantially improves moisture retention capacity.",
        "how_to_use": "Broadcast evenly over the field 2–3 weeks before sowing and thoroughly mix into the top 15–20 cm of soil during primary tillage.",
        "quantity_acre": "2,000 - 3,500 kg / acre (or 800 - 1,000 kg vermicompost)",
        "quantity_hectare": "5.0 - 8.5 tonnes / hectare",
        "timing": "Pre-sowing basal field preparation"
    },
    "Zinc Sulphate": {
        "trade_name": "Zinc Sulphate Heptahydrate (21% Zn) / Monohydrate (33% Zn)",
        "category": "Micronutrient",
        "use": "Corrects zinc deficiency ('khaira' disease in rice, interveinal leaf chlorosis, stunted internodes), promoting enzyme activity and auxin synthesis in alkaline soils.",
        "how_to_use": "Soil application: Mix with dry soil or sand and broadcast as a basal dressing. Foliar application: Dissolve 5g/L water + 2.5g lime. Do NOT mix directly with phosphatic fertilizers like DAP in the same tank.",
        "quantity_acre": "8 - 10 kg / acre (Soil) or 1 - 1.5 kg / acre (Foliar spray)",
        "quantity_hectare": "20 - 25 kg / hectare (Soil application)",
        "timing": "Basal soil application or foliar spray at vegetative stage"
    },
    "SSP": {
        "trade_name": "Single Super Phosphate (16% P2O5, 11% S, 19% Ca)",
        "category": "Phosphatic & Secondary Nutrient",
        "use": "Supplies phosphorus, sulfur, and calcium; especially beneficial for oilseeds (boosts oil content), pulses (stimulates root nodulation), and root crops.",
        "how_to_use": "Apply as a basal dose directly in the furrows at planting time for maximum phosphorus bioavailability.",
        "quantity_acre": "80 - 120 kg / acre",
        "quantity_hectare": "200 - 300 kg / hectare",
        "timing": "Basal placement at the time of sowing"
    }
}

# Soil-only crop knowledge layer for CNN Soil Predictor
SOIL_CROPS = {
    "Alluvial soil": [
        ("Wheat", 0.96, "Alluvial soils are commonly productive for cereal crops when drainage and fertility are suitable."),
        ("Rice", 0.94, "Alluvial soils can support rice where water availability and drainage are appropriate."),
        ("Maize", 0.90, "Maize can perform well in fertile alluvial soils with adequate moisture."),
        ("Sugarcane", 0.88, "Sugarcane commonly uses fertile, deep soils with suitable water supply."),
        ("Pulses", 0.82, "Several pulse crops can be grown in suitable alluvial soils."),
        ("Mustard", 0.80, "Mustard can be grown in suitable fertile alluvial soils.")
    ],
    "Clayey soils": [
        ("Rice", 0.97, "Clay-rich soil can retain water, which is useful for rice under suitable field conditions."),
        ("Wheat", 0.88, "Wheat can be grown in fertile clayey soils with good drainage management."),
        ("Cotton", 0.84, "Cotton can grow in heavy soils when drainage and moisture are suitable."),
        ("Soybean", 0.82, "Soybean can use moisture-retentive soils with suitable drainage."),
        ("Sugarcane", 0.80, "Sugarcane can grow in deep fertile soils with sufficient moisture."),
        ("Maize", 0.76, "Maize can perform in clayey soils if compaction and drainage are managed.")
    ],
    "Laterite soil": [
        ("Cashew", 0.94, "Cashew is commonly associated with lateritic regions and well-drained conditions."),
        ("Tea", 0.90, "Tea can be cultivated in acidic, well-drained lateritic environments in suitable climates."),
        ("Coffee", 0.88, "Coffee is suitable in some well-drained lateritic highland environments."),
        ("Rubber", 0.82, "Rubber can be grown in suitable warm, humid lateritic regions."),
        ("Pineapple", 0.80, "Pineapple can tolerate acidic soils with suitable drainage and climate."),
        ("Groundnut", 0.70, "Groundnut can be grown in suitable well-drained lateritic soils.")
    ],
    "Loamy soil": [
        ("Wheat", 0.97, "Loamy soil offers a useful balance of drainage, water retention and workability for wheat."),
        ("Maize", 0.95, "Maize generally performs well in fertile, well-drained loamy soil."),
        ("Potato", 0.91, "Loamy soil can provide suitable structure for tuber development."),
        ("Vegetables", 0.88, "Many vegetables perform well in fertile loamy soil with suitable moisture."),
        ("Pulses", 0.84, "Loamy soils can support several pulse crops."),
        ("Cotton", 0.78, "Cotton can grow in suitable fertile loamy soils.")
    ],
    "Sandy loam": [
        ("Groundnut", 0.96, "Sandy loam is often suitable for groundnut because of its drainage and workable structure."),
        ("Carrot", 0.92, "Loose sandy-loam structure can support root development."),
        ("Potato", 0.89, "Sandy loam can provide drainage useful for potato production."),
        ("Watermelon", 0.86, "Watermelon can perform in well-drained sandy-loam soils with adequate irrigation."),
        ("Onion", 0.84, "Onion benefits from friable, well-drained soils."),
        ("Maize", 0.78, "Maize can grow in sandy loam with adequate nutrients and water.")
    ],
    "Sandy soil": [
        ("Groundnut", 0.94, "Groundnut is adapted to light, well-drained soils."),
        ("Watermelon", 0.91, "Watermelon can perform in warm, well-drained sandy soils with adequate water."),
        ("Carrot", 0.88, "Loose sandy soil can support straight root development."),
        ("Potato", 0.84, "Sandy soils can provide drainage useful for potato when fertility is adequate."),
        ("Millet", 0.80, "Some millet crops tolerate lighter, drought-prone soils."),
        ("Onion", 0.78, "Onion can be grown in well-drained lighter soils with appropriate fertility.")
    ]
}

def recommend_soil_crops(soil_type: str, top_k: int = 5):
    items = SOIL_CROPS.get(soil_type, [])
    items = sorted(items, key=lambda x: x[1], reverse=True)[:top_k]
    return [
        {"crop": crop, "score": round(score, 3), "reason": reason}
        for crop, score, reason in items
    ]


def load_assets():
    global crop_pipeline, district_taluka_map, district_weights, season_crop_map
    global crop_model, crop_encoder, crop_soil_encoder, crop_district_encoder, crop_season_encoder
    global rainfall_model, rainfall_last_12, rainfall_month_means, embedding_model
    global fertilizer_model, fertilizer_encoders, fertilizer_metadata
    global soil_cnn_model, soil_cnn_class_names
    
    # 1. Load Hybrid Crop Recommendation Pipeline & Metadata
    try:
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
    except Exception as e:
        logger.error(f"Error loading Crop Recommendation assets: {str(e)}")

    # 2. Load Rainfall forecasting assets
    try:
        if os.path.exists(os.path.join(MODELS_PATH, "rainfall_xgb.pkl")):
            rainfall_model = joblib.load(os.path.join(MODELS_PATH, "rainfall_xgb.pkl"))
            rainfall_last_12 = joblib.load(os.path.join(MODELS_PATH, "rainfall_last_12.pkl"))
            month_means_path = os.path.join(MODELS_PATH, "rainfall_month_means.json")
            if os.path.exists(month_means_path):
                with open(month_means_path, "r") as f:
                    rainfall_month_means = json.load(f)
    except Exception as e:
        logger.error(f"Error loading Rainfall forecasting assets: {str(e)}")

    # 3. Load HuggingFace Embeddings Model
    try:
        if SentenceTransformer is not None:
            embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    except Exception as emb_e:
        logger.warning(f"Could not load SentenceTransformer: {emb_e}")

    # 4. Load Fertilizer Predictor ML Assets
    try:
        fert_dir = os.path.join(MODELS_PATH, "fertilizer")
        fert_model_path = os.path.join(fert_dir, "best_model.pkl")
        fert_encoders_path = os.path.join(fert_dir, "label_encoders.pkl")
        fert_meta_path = os.path.join(fert_dir, "metadata.json")

        if os.path.exists(fert_model_path) and os.path.exists(fert_encoders_path) and os.path.exists(fert_meta_path):
            fertilizer_model = joblib.load(fert_model_path)
            fertilizer_encoders = joblib.load(fert_encoders_path)
            with open(fert_meta_path, "r") as f:
                fertilizer_metadata = json.load(f)
            logger.info("Fertilizer model & metadata loaded successfully.")
    except Exception as e:
        logger.error(f"Error loading Fertilizer model assets: {str(e)}")

    # 5. Load Soil CNN EfficientNet Assets
    try:
        soil_dir = os.path.join(MODELS_PATH, "soil_cnn")
        soil_model_path = os.path.join(soil_dir, "soil_efficientnet.keras")
        soil_class_path = os.path.join(soil_dir, "class_names.json")

        if os.path.exists(soil_model_path) and os.path.exists(soil_class_path):
            if keras_load_model is not None:
                soil_cnn_model = keras_load_model(soil_model_path)
                with open(soil_class_path, "r", encoding="utf-8") as f:
                    soil_cnn_class_names = json.load(f)
                logger.info("Soil EfficientNet CNN model & class names loaded successfully.")
            else:
                logger.error("Keras load_model is not available in environment.")
        else:
            logger.warning("Soil CNN model file or class_names.json missing.")
    except Exception as e:
        logger.error(f"Error loading Soil CNN model assets: {str(e)}")

    logger.info("Asset loading routine completed.")

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

class FertilizerInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    Soil_Type: str = Field("Loamy", description="Soil Type")
    Crop_Type: str = Field("Rice", description="Crop Type")
    Crop_Growth_Stage: str = Field("Vegetative", description="Crop Growth Stage")
    Season: str = Field("Kharif", description="Season")
    Irrigation_Type: str = Field("Canal", description="Irrigation Type")
    Previous_Crop: str = Field("Wheat", description="Previous Crop")
    Soil_pH: float = Field(6.8, description="Soil pH")
    Soil_Moisture: float = Field(45.0, description="Soil Moisture %")
    Organic_Carbon: float = Field(0.65, description="Organic Carbon %")
    Electrical_Conductivity: float = Field(0.4, description="Electrical Conductivity dS/m")
    Nitrogen_Level: float = Field(140.0, description="Nitrogen Level")
    Phosphorus_Level: float = Field(40.0, description="Phosphorus Level")
    Potassium_Level: float = Field(180.0, description="Potassium Level")
    Temperature: float = Field(28.0, description="Temperature °C")
    Humidity: float = Field(65.0, description="Relative Humidity %")
    Rainfall: float = Field(750.0, description="Rainfall mm")
    Fertilizer_Used_Last_Season: float = Field(50.0, description="Fertilizer Used Last Season kg/acre")

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

def resolve_location(requested_district: Optional[str], requested_taluka: Optional[str]):
    default_district = "Ahmedabad"
    default_taluka = "Viramgam"

    if not district_taluka_map:
        return (requested_district or default_district), (requested_taluka or default_taluka)

    known_districts = list(district_taluka_map.keys())
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
def get_location_data():
    if district_taluka_map is None:
        raise HTTPException(status_code=404, detail="Location data metadata not loaded.")
    return {"districts": district_taluka_map}

# 1. Crop Prediction Endpoint
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

            model = crop_pipeline.named_steps['classifier']
            classes = model.classes_
            ml_probs = crop_pipeline.predict_proba(input_df)[0]

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

# 3. Fertilizer Prediction Endpoints
@app.post("/predict/fertilizer")
def predict_fertilizer(inputs: FertilizerInput):
    if fertilizer_model is None or fertilizer_encoders is None or fertilizer_metadata is None:
        raise HTTPException(status_code=500, detail="Fertilizer recommendation model not loaded.")

    try:
        data = inputs.model_dump()
        cat_features = [
            "Soil_Type",
            "Crop_Type",
            "Crop_Growth_Stage",
            "Season",
            "Irrigation_Type",
            "Previous_Crop",
        ]
        input_dict = {}

        for col in cat_features:
            val = str(data.get(col, "")).strip()
            enc = fertilizer_encoders.get(col)
            if enc is None or val not in enc.classes_:
                matched = None
                if enc is not None:
                    for cl in enc.classes_:
                        if str(cl).strip().lower() == val.lower():
                            matched = cl
                            break
                if matched is None:
                    allowed = list(enc.classes_) if enc is not None else []
                    raise HTTPException(status_code=400, detail=f"Invalid {col}: '{val}'. Allowed options: {allowed}")
                val = matched
            input_dict[col] = [enc.transform([val])[0]]

        num_features = [
            "Soil_pH",
            "Soil_Moisture",
            "Organic_Carbon",
            "Electrical_Conductivity",
            "Nitrogen_Level",
            "Phosphorus_Level",
            "Potassium_Level",
            "Temperature",
            "Humidity",
            "Rainfall",
            "Fertilizer_Used_Last_Season",
        ]

        for col in num_features:
            raw_val = data.get(col)
            if raw_val is None:
                raise HTTPException(status_code=400, detail=f"Missing numeric parameter: {col}")
            input_dict[col] = [float(raw_val)]

        df_input = pd.DataFrame(input_dict)[fertilizer_metadata["feature_order"]]
        probs = fertilizer_model.predict_proba(df_input)[0]
        top3_indices = np.argsort(probs)[::-1][:3]

        target_enc = fertilizer_encoders["target"]
        predictions = []
        for idx in top3_indices:
            fert_name = target_enc.inverse_transform([idx])[0]
            guide = AGRONOMIC_GUIDE.get(fert_name, {
                "trade_name": fert_name,
                "category": "Fertilizer",
                "use": "Standard agronomic nutrient replenishment.",
                "how_to_use": "Apply according to local agricultural extension guidelines.",
                "quantity_acre": "Consult extension agronomist",
                "quantity_hectare": "Consult extension agronomist",
                "timing": "Crop growth cycle"
            })

            predictions.append({
                "rank": len(predictions) + 1,
                "fertilizer": fert_name,
                "trade_name": guide["trade_name"],
                "category": guide["category"],
                "use": guide["use"],
                "how_to_use": guide["how_to_use"],
                "quantity_acre": guide["quantity_acre"],
                "quantity_hectare": guide["quantity_hectare"],
                "timing": guide["timing"],
                "confidence": round(float(probs[idx]) * 100, 2)
            })

        return {
            "success": True,
            "status": "success",
            "champion_model": fertilizer_metadata.get("best_model", "XGBoost"),
            "model_accuracy": f"{fertilizer_metadata.get('accuracy', 0.875) * 100:.2f}%",
            "top_recommendation": predictions[0],
            "rankings": predictions,
            "recommendations": predictions
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(exc)}")

@app.get("/predict/fertilizer-options")
def get_fertilizer_options():
    if fertilizer_metadata is None:
        raise HTTPException(status_code=500, detail="Fertilizer metadata not loaded.")
    return {
        "success": True,
        "options": fertilizer_metadata.get("dropdown_options", {})
    }

# 4. Soil CNN Classification & Crop Suitability Endpoint
@app.post("/predict/soil-image")
async def predict_soil_image(file: UploadFile = File(...)):
    if soil_cnn_model is None or soil_cnn_class_names is None:
        raise HTTPException(status_code=500, detail="Soil CNN model not loaded.")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB").resize((224, 224))
        x = np.asarray(image, dtype=np.float32)
        if efficientnet_preprocess_input is not None:
            x = efficientnet_preprocess_input(x)
        x = np.expand_dims(x, 0)

        probs = soil_cnn_model.predict(x, verbose=0)[0]
        top3_indices = np.argsort(probs)[::-1][:3]

        top_matches = [
            {
                "soil_type": soil_cnn_class_names[int(i)],
                "confidence": round(float(probs[i]) * 100, 2)
            }
            for i in top3_indices
        ]

        predicted_soil_type = top_matches[0]["soil_type"]
        recommended_crops = recommend_soil_crops(predicted_soil_type, top_k=5)

        return {
            "success": True,
            "status": "success",
            "predicted_soil_type": predicted_soil_type,
            "confidence": top_matches[0]["confidence"],
            "top_matches": top_matches,
            "recommended_crops": recommended_crops
        }
    except Exception as exc:
        logger.error(f"Soil CNN prediction error: {str(exc)}")
        raise HTTPException(status_code=400, detail=f"Soil image classification error: {str(exc)}")

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
            "crop_hybrid": crop_pipeline is not None,
            "crop_legacy": crop_model is not None,
            "rainfall": rainfall_model is not None,
            "fertilizer": fertilizer_model is not None,
            "soil_cnn": soil_cnn_model is not None,
            "embeddings": embedding_model is not None
        }
    }
