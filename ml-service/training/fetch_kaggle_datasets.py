import urllib.request
import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Authentic Kaggle Dataset Raw URLs
CROP_URL = "https://raw.githubusercontent.com/lk-learner/Crop-Recommendation/main/Crop_recommendation.csv"
FERTILIZER_URL = "https://raw.githubusercontent.com/Lanchavi/AgroTechh/main/Fertilizer%20Prediction.csv"
YIELD_URL = "https://raw.githubusercontent.com/Lanchavi/AgroTechh/main/crop_production.csv"
RAINFALL_URL = "https://raw.githubusercontent.com/Lanchavi/AgroTechh/main/rainfall%20in%20india%201901-2015.csv"

def download_file(url: str, dest_path: str):
    print(f"Downloading Kaggle dataset from {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response, open(dest_path, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Saved: {dest_path}")
    except Exception as e:
        raise RuntimeError(f"CRITICAL ERROR: Failed to download real Kaggle dataset from {url}: {e}")

def process_crop_dataset():
    target_path = os.path.join(DATA_DIR, "crop_recommendation.csv")
    download_file(CROP_URL, target_path)
    df = pd.read_csv(target_path)
    required_cols = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall', 'label']
    if not all(col in df.columns for col in required_cols):
        raise ValueError(f"Crop dataset is missing required Kaggle columns. Found: {list(df.columns)}")
    print(f"Processed real Kaggle Crop dataset: {len(df)} rows across {df['label'].nunique()} crop classes.")

def process_fertilizer_dataset():
    target_path = os.path.join(DATA_DIR, "fertilizer_prediction.csv")
    download_file(FERTILIZER_URL, target_path)
    df = pd.read_csv(target_path)
    
    # Standardize Kaggle column names
    rename_map = {
        'Nitrogen': 'N',
        'Phosphorous': 'P',
        'Potassium': 'K',
        'Temparature': 'Temperature',
        'Humidity ': 'Humidity'
    }
    df = df.rename(columns=rename_map)
    
    required_cols = ['Temperature', 'Humidity', 'Moisture', 'Soil Type', 'Crop Type', 'N', 'P', 'K', 'Fertilizer Name']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Fertilizer dataset missing required column '{col}'. Found: {list(df.columns)}")
            
    df[required_cols].to_csv(target_path, index=False)
    print(f"Processed real Kaggle Fertilizer dataset: {len(df)} rows.")

def process_yield_dataset():
    target_path = os.path.join(DATA_DIR, "india_crop_production.csv")
    raw_path = os.path.join(DATA_DIR, "raw_crop_production.csv")
    download_file(YIELD_URL, raw_path)
    df = pd.read_csv(raw_path)
    
    # Standardize Kaggle yield dataset: State_Name, District_Name, Crop_Year, Season, Crop, Area, Production
    df = df.dropna(subset=['Area', 'Production', 'State_Name', 'District_Name', 'Crop', 'Season'])
    df = df[df['Area'] > 0]
    
    df['Yield'] = df['Production'] / df['Area']
    df['Temperature'] = 25.0
    df['Rainfall'] = 150.0
    
    renamed = df.rename(columns={
        'State_Name': 'State',
        'District_Name': 'District'
    })
    
    final_cols = ['State', 'District', 'Season', 'Crop', 'Area', 'Temperature', 'Rainfall', 'Yield']
    renamed[final_cols].to_csv(target_path, index=False)
    if os.path.exists(raw_path):
        os.remove(raw_path)
    print(f"Processed real Kaggle Crop Yield dataset: {len(renamed)} records.")

def process_rainfall_dataset():
    target_path = os.path.join(DATA_DIR, "historical_rainfall.csv")
    raw_path = os.path.join(DATA_DIR, "raw_rainfall.csv")
    download_file(RAINFALL_URL, raw_path)
    df = pd.read_csv(raw_path)
    
    # Transform monthly columns (JAN, FEB, MAR...) into time-series rows
    months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    month_nums = {m: i+1 for i, m in enumerate(months)}
    
    # Filter for national / major subdivisions
    records = []
    for _, row in df.iterrows():
        year = int(row['YEAR'])
        for m in months:
            val = row[m]
            if pd.notna(val):
                m_num = month_nums[m]
                date_str = f"{year:04d}-{m_num:02d}-01"
                records.append({'date': date_str, 'rainfall': float(val)})
                
    time_series_df = pd.DataFrame(records).sort_values('date').reset_index(drop=True)
    # Aggregate monthly averages across subdivisions
    monthly_avg = time_series_df.groupby('date')['rainfall'].mean().reset_index()
    monthly_avg.to_csv(target_path, index=False)
    
    if os.path.exists(raw_path):
        os.remove(raw_path)
    print(f"Processed real Kaggle Historical Rainfall dataset: {len(monthly_avg)} monthly time-series points.")

if __name__ == "__main__":
    process_crop_dataset()
    process_fertilizer_dataset()
    process_yield_dataset()
    process_rainfall_dataset()
