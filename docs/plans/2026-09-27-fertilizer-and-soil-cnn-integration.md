# Fertilizer Recommendation & Soil CNN Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the `fertilizer-predictor` (17-parameter ML model + agronomic guide) and `agrismartcrop` (CNN soil classification + crop suitability model) from `C:\Users\mitul\Downloads\fertilizer-predictor final` into the existing AgriSmart system across `ml-service`, `server`, and `client`.

**Architecture:** Integrate the ML/DL artifacts directly into FastAPI `ml-service` with new endpoints `/predict/fertilizer` and `/predict/soil-image`. Expose secure proxy controllers and Sequelize DB logging in Express `server`. Build two brand-new React TypeScript frontend pages (`FertilizerPredictor.tsx` and `SoilCNNPredictor.tsx`) with dedicated navigation items in `Layout.tsx` and routes in `AppRoutes.tsx`.

**Tech Stack:** Python 3.11+, FastAPI, Keras/TensorFlow, Scikit-Learn, Joblib, Node.js, Express, TypeScript, Sequelize (PostgreSQL), React, Vite.

---

### Task 1: Copy ML Artifacts & Update `ml-service` Dependencies

**Files:**
- Create: `ml-service/models/fertilizer/`
- Create: `ml-service/models/soil_cnn/`
- Modify: `ml-service/requirements.txt`

**Step 1: Create directories and copy model files**
- Copy `best_model.pkl`, `label_encoders.pkl`, `metadata.json`, `scaler.pkl` from `C:\Users\mitul\Downloads\fertilizer-predictor final\fertilizer-predictor\models\` to `ml-service\models\fertilizer\`
- Copy `soil_efficientnet.keras`, `class_names.json`, `metrics.json` from `C:\Users\mitul\Downloads\fertilizer-predictor final\agrismartcrop\models\` to `ml-service\models\soil_cnn\`

**Step 2: Update requirements.txt**
Add `tensorflow>=2.15.0`, `Pillow>=10.0.0`, `python-multipart>=0.0.9` to `ml-service/requirements.txt`.

---

### Task 2: Implement FastAPI Endpoints in `ml-service/app/main.py`

**Files:**
- Modify: `ml-service/app/main.py`

**Step 1: Load Artifacts on Startup**
- Load fertilizer champion model, label encoders, metadata JSON, and define `AGRONOMIC_GUIDE` catalog.
- Load Keras model `soil_efficientnet.keras`, `class_names.json`, and `SOIL_CROPS` mapping.

**Step 2: Define Request/Response Schemas**
- `FertilizerInput`: 17 parameters (`Soil_Type`, `Crop_Type`, `Crop_Growth_Stage`, `Season`, `Irrigation_Type`, `Previous_Crop`, `Soil_pH`, `Soil_Moisture`, `Organic_Carbon`, `Electrical_Conductivity`, `Nitrogen_Level`, `Phosphorus_Level`, `Potassium_Level`, `Temperature`, `Humidity`, `Rainfall`, `Fertilizer_Used_Last_Season`).

**Step 3: Implement Endpoints**
- `POST /predict/fertilizer`: Predicts top-3 fertilizers with confidence % and detailed agronomic usage guidelines.
- `GET /predict/fertilizer-options`: Returns metadata dropdown options for the frontend form.
- `POST /predict/soil-image`: Accepts multipart `UploadFile`, preprocesses image (resize 224x224, EfficientNet preprocess_input), runs prediction, returns soil type confidence and recommended crops.

---

### Task 3: Implement Express Backend Controllers & Routes in `server`

**Files:**
- Modify: `server/src/components/Prediction/model/PredictionLogModel.ts`
- Create: `server/src/db/migrations/20260927000001-add-soil-image-to-prediction-enum.ts`
- Modify: `server/src/components/Prediction/v1/PredictionController.ts`
- Modify: `server/src/components/Prediction/v1/PredictionRoute.ts`

**Step 1: Database Model & Enum Update**
- Add `'soil_image'` to `modelType` in `PredictionLogModel.ts`.

**Step 2: Prediction Controller Methods**
- `getFertilizerPrediction`: Proxies 17 parameters to ML service `/predict/fertilizer`, logs in `PredictionLog`, returns prediction.
- `getFertilizerOptions`: Proxies dropdown options from ML service `/predict/fertilizer-options`.
- `getSoilImagePrediction`: Accepts uploaded image via multer/form-data, forwards to ML service `/predict/soil-image`, logs in `PredictionLog`, returns soil analysis & crop suitability.

**Step 3: Prediction Routes**
- `POST /api/v1/prediction/fertilizer`
- `GET /api/v1/prediction/fertilizer-options`
- `POST /api/v1/prediction/soil-image`

---

### Task 4: Build New React Frontend Components & Pages (`client`)

**Files:**
- Create: `client/src/features/predictions/FertilizerPredictor.tsx`
- Create: `client/src/features/predictions/SoilCNNPredictor.tsx`
- Modify: `client/src/routes/AppRoutes.tsx`
- Modify: `client/src/components/layout/Layout.tsx`

**Step 1: Create `FertilizerPredictor.tsx`**
- Interactive 17-parameter input form organized into 3 logical fieldsets: Soil Properties, Environmental Conditions, Crop & Field Details.
- Auto-fill from selected Farm.
- Champion Model & Accuracy header badge.
- Primary recommendation banner card with confidence score.
- Top-3 fertilizer breakdown with progress bars.
- Detailed Agronomic Guide tabs: Trade Name, Category, Agricultural Use, Application Method & Timing, Acre & Hectare Dosage.

**Step 2: Create `SoilCNNPredictor.tsx`**
- Drag-and-drop Image Upload dropzone with image preview and file size validation (max 10MB).
- Predicted Soil Type result card with confidence badge.
- Top soil matches confidence distribution bars.
- Recommended Crops grid cards showing crop name, suitability score bar, and agronomic rationale.

**Step 3: Register Routes & Sidebar Navigation**
- Add `/farmer/fertilizer-predict` and `/farmer/soil-analysis` in `AppRoutes.tsx`.
- Add links in `Layout.tsx` sidebar with distinct icons.

---

### Task 5: Verification & Testing

**Step 1: ML Service Verification**
- Test `/predict/fertilizer` and `/predict/soil-image` endpoints.

**Step 2: Server Verification**
- Test Express proxy endpoints and DB logging.

**Step 3: Frontend Build Verification**
- Run `npm run build` in `client`.
