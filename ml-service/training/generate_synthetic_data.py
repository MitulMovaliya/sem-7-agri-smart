import pandas as pd
import numpy as np
import os

# Create data directory
os.makedirs("ml-service/data", exist_ok=True)

# Set random seed
np.random.seed(42)

# 1. Generate Crop Recommendation Dataset (2200 rows)
def generate_crop_data():
    crops = ['rice', 'maize', 'chickpea', 'kidneybeans', 'pigeonpeas', 'mothbeans',
             'mungbean', 'blackgram', 'lentil', 'pomegranate', 'banana', 'mango',
             'grapes', 'watermelon', 'muskmelon', 'apple', 'orange', 'papaya',
             'coconut', 'cotton', 'jute', 'coffee']
    
    rows = []
    # Generate realistic conditions for each crop
    crop_rules = {
        'rice': {'N': (80, 100), 'P': (35, 55), 'K': (35, 45), 'temp': (20, 30), 'hum': (80, 99), 'ph': (5.0, 7.0), 'rain': (180, 250)},
        'maize': {'N': (60, 80), 'P': (35, 50), 'K': (15, 25), 'temp': (18, 30), 'hum': (55, 75), 'ph': (5.5, 7.0), 'rain': (60, 110)},
        'chickpea': {'N': (20, 40), 'P': (55, 70), 'K': (75, 85), 'temp': (15, 25), 'hum': (14, 20), 'ph': (7.0, 8.5), 'rain': (35, 60)},
        'kidneybeans': {'N': (10, 30), 'P': (45, 60), 'K': (45, 55), 'temp': (15, 25), 'hum': (18, 25), 'ph': (5.5, 6.5), 'rain': (60, 100)},
        'pigeonpeas': {'N': (10, 30), 'P': (60, 75), 'K': (15, 25), 'temp': (25, 35), 'hum': (30, 65), 'ph': (5.0, 7.5), 'rain': (90, 180)},
        'mothbeans': {'N': (10, 30), 'P': (45, 60), 'K': (15, 25), 'temp': (25, 32), 'hum': (40, 60), 'ph': (3.5, 10.0), 'rain': (30, 70)},
        'mungbean': {'N': (10, 30), 'P': (35, 50), 'K': (15, 25), 'temp': (25, 35), 'hum': (80, 90), 'ph': (6.0, 7.2), 'rain': (35, 60)},
        'blackgram': {'N': (20, 40), 'P': (55, 70), 'K': (15, 25), 'temp': (25, 35), 'hum': (60, 75), 'ph': (6.5, 7.8), 'rain': (60, 75)},
        'lentil': {'N': (10, 30), 'P': (35, 50), 'K': (15, 25), 'temp': (15, 30), 'hum': (60, 70), 'ph': (5.5, 7.0), 'rain': (35, 55)},
        'pomegranate': {'N': (10, 30), 'P': (10, 30), 'K': (35, 45), 'temp': (18, 25), 'hum': (85, 95), 'ph': (5.5, 7.5), 'rain': (100, 115)},
        'banana': {'N': (80, 120), 'P': (70, 95), 'K': (45, 55), 'temp': (25, 30), 'hum': (75, 85), 'ph': (5.5, 6.5), 'rain': (90, 115)},
        'mango': {'N': (10, 40), 'P': (15, 40), 'K': (25, 35), 'temp': (27, 36), 'hum': (45, 55), 'ph': (4.5, 7.0), 'rain': (85, 100)},
        'grapes': {'N': (20, 40), 'P': (120, 145), 'K': (195, 205), 'temp': (15, 42), 'hum': (80, 85), 'ph': (5.5, 6.5), 'rain': (65, 75)},
        'watermelon': {'N': (80, 100), 'P': (5, 25), 'K': (45, 55), 'temp': (24, 27), 'hum': (80, 90), 'ph': (6.0, 7.0), 'rain': (40, 60)},
        'muskmelon': {'N': (80, 100), 'P': (5, 25), 'K': (45, 55), 'temp': (27, 30), 'hum': (90, 95), 'ph': (6.0, 6.8), 'rain': (20, 30)},
        'apple': {'N': (0, 40), 'P': (120, 145), 'K': (195, 205), 'temp': (21, 24), 'hum': (90, 95), 'ph': (5.5, 6.5), 'rain': (100, 125)},
        'orange': {'N': (10, 40), 'P': (5, 30), 'K': (5, 15), 'temp': (10, 35), 'hum': (90, 95), 'ph': (6.0, 8.0), 'rain': (100, 120)},
        'papaya': {'N': (30, 70), 'P': (45, 70), 'K': (45, 55), 'temp': (23, 44), 'hum': (90, 95), 'ph': (6.5, 7.0), 'rain': (150, 250)},
        'coconut': {'N': (10, 40), 'P': (5, 25), 'K': (25, 35), 'temp': (25, 30), 'hum': (90, 99), 'ph': (5.0, 6.5), 'rain': (130, 230)},
        'cotton': {'N': (100, 120), 'P': (35, 55), 'K': (15, 25), 'temp': (22, 26), 'hum': (75, 85), 'ph': (5.8, 8.0), 'rain': (60, 80)},
        'jute': {'N': (60, 100), 'P': (35, 55), 'K': (35, 45), 'temp': (23, 27), 'hum': (70, 90), 'ph': (6.0, 7.0), 'rain': (150, 200)},
        'coffee': {'N': (80, 120), 'P': (15, 35), 'K': (25, 35), 'temp': (23, 28), 'hum': (50, 65), 'ph': (6.0, 7.5), 'rain': (110, 190)},
    }
    
    # 100 samples per crop
    for crop in crops:
        rules = crop_rules[crop]
        for _ in range(100):
            n = np.random.uniform(*rules['N'])
            p = np.random.uniform(*rules['P'])
            k = np.random.uniform(*rules['K'])
            temp = np.random.uniform(*rules['temp'])
            hum = np.random.uniform(*rules['hum'])
            ph = np.random.uniform(*rules['ph'])
            rain = np.random.uniform(*rules['rain'])
            rows.append({
                'N': int(n), 'P': int(p), 'K': int(k),
                'temperature': round(temp, 2),
                'humidity': round(hum, 2),
                'ph': round(ph, 2),
                'rainfall': round(rain, 2),
                'label': crop
            })
            
    df = pd.DataFrame(rows)
    df.to_csv("ml-service/data/crop_recommendation.csv", index=False)
    print("Crop dataset created.")

# 2. Generate Fertilizer Prediction Dataset (1000 rows)
def generate_fertilizer_data():
    soils = ['Sandy', 'Loamy', 'Black', 'Red', 'Clayey']
    crops = ['Rice', 'Maize', 'Chickpea', 'Cotton', 'Wheat', 'Tobacco', 'Barley', 'Sugarcane', 'Oil seeds', 'Pulses', 'Groundnuts']
    fertilizers = ['Urea', 'DAP', '14-35-14', '28-28', '17-17-17', '20-20', '10-26-26']
    
    rows = []
    for _ in range(1000):
        soil = np.random.choice(soils)
        crop = np.random.choice(crops)
        fert = np.random.choice(fertilizers)
        
        # Balance N/P/K values based on fertilizer choice
        if fert == 'Urea':
            n = np.random.randint(70, 100)
            p = np.random.randint(10, 30)
            k = np.random.randint(10, 30)
        elif fert == 'DAP':
            n = np.random.randint(10, 30)
            p = np.random.randint(70, 100)
            k = np.random.randint(10, 30)
        elif fert == '10-26-26':
            n = np.random.randint(10, 30)
            p = np.random.randint(40, 60)
            k = np.random.randint(40, 60)
        elif fert == '14-35-14':
            n = np.random.randint(10, 30)
            p = np.random.randint(50, 70)
            k = np.random.randint(10, 30)
        elif fert == '17-17-17':
            n = np.random.randint(30, 50)
            p = np.random.randint(30, 50)
            k = np.random.randint(30, 50)
        elif fert == '20-20':
            n = np.random.randint(40, 60)
            p = np.random.randint(40, 60)
            k = np.random.randint(10, 30)
        elif fert == '28-28':
            n = np.random.randint(50, 80)
            p = np.random.randint(50, 80)
            k = np.random.randint(10, 30)
        else:
            n = np.random.randint(30, 60)
            p = np.random.randint(30, 60)
            k = np.random.randint(30, 60)
            
        temp = np.random.randint(15, 40)
        hum = np.random.randint(30, 95)
        moist = np.random.randint(20, 70)
            
        rows.append({
            'Temperature': temp,
            'Humidity': hum,
            'Moisture': moist,
            'Soil Type': soil,
            'Crop Type': crop,
            'N': n, 'P': p, 'K': k,
            'Fertilizer Name': fert
        })
        
    df = pd.DataFrame(rows)
    df.to_csv("ml-service/data/fertilizer_prediction.csv", index=False)
    print("Fertilizer dataset created.")

# 3. Generate India Crop Production Dataset (3000 rows)
def generate_yield_data():
    states = ['Maharashtra', 'Madhya Pradesh', 'Rajasthan', 'Haryana', 'Punjab']
    districts = {
        'Maharashtra': ['Pune', 'Nashik', 'Nagpur', 'Aurangabad'],
        'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur'],
        'Rajasthan': ['Kota', 'Alwar', 'Jaipur', 'Jodhpur'],
        'Haryana': ['Karnal', 'Rohtak', 'Hisar', 'Panipat'],
        'Punjab': ['Ludhiana', 'Amritsar', 'Patiala', 'Jalandhar']
    }
    seasons = ['Kharif', 'Rabi', 'Whole Year']
    crops = ['Rice', 'Maize', 'Wheat', 'Chana', 'Soybean', 'Cotton', 'Mustard']
    
    rows = []
    for _ in range(3000):
        state = np.random.choice(states)
        dist = np.random.choice(districts[state])
        season = np.random.choice(seasons)
        crop = np.random.choice(crops)
        area = np.random.uniform(1.0, 500.0)
        temp = np.random.uniform(15.0, 38.0)
        rain = np.random.uniform(50.0, 350.0)
        
        # Calculate yield with some rules
        base_yield = 1.2
        if crop == 'Rice':
            base_yield = 2.5 if rain > 150 else 1.5
        elif crop == 'Wheat':
            base_yield = 3.2 if temp < 25 else 2.0
        elif crop == 'Cotton':
            base_yield = 1.8 if temp > 28 else 1.0
            
        yield_val = base_yield + np.random.normal(0, 0.2)
        yield_val = max(0.2, yield_val)
        
        rows.append({
            'State': state,
            'District': dist,
            'Season': season,
            'Crop': crop,
            'Area': round(area, 2),
            'Temperature': round(temp, 2),
            'Rainfall': round(rain, 2),
            'Yield': round(yield_val, 2)
        })
        
    df = pd.DataFrame(rows)
    df.to_csv("ml-service/data/india_crop_production.csv", index=False)
    print("India crop production dataset created.")

# 4. Generate Historical Rainfall Index Dataset (for time-series forecasting)
def generate_rainfall_data():
    date_range = pd.date_range(start="2015-01-01", end="2025-12-01", freq="MS")
    rows = []
    for date in date_range:
        month = date.month
        # Seasonal rainfall index representing monsoons (June-Sept)
        if month in [6, 7, 8, 9]:
            base_rain = 180 + np.random.normal(50, 40)
        elif month in [10, 11, 5]:
            base_rain = 30 + np.random.normal(15, 10)
        else:
            base_rain = 5 + np.random.normal(2, 2)
        
        base_rain = max(0.0, base_rain)
        rows.append({
            'date': date.strftime('%Y-%m-%d'),
            'rainfall': round(base_rain, 2)
        })
        
    df = pd.DataFrame(rows)
    df.to_csv("ml-service/data/historical_rainfall.csv", index=False)
    print("Historical rainfall dataset created.")

if __name__ == "__main__":
    generate_crop_data()
    generate_fertilizer_data()
    generate_yield_data()
    generate_rainfall_data()
