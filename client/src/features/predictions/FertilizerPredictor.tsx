import React, { useState, useEffect } from 'react';

interface Farm {
  id: string;
  name: string;
  crop_type?: string | null;
  state?: string | null;
  district?: string | null;
  soil_reports?: Array<{
    nitrogen?: number | null;
    phosphorus?: number | null;
    potassium?: number | null;
    ph?: number | null;
    organic_carbon?: number | null;
    ec?: number | null;
  }>;
}

interface FertilizerRecommendation {
  rank: number;
  fertilizer: string;
  trade_name: string;
  category: string;
  use: string;
  how_to_use: string;
  quantity_acre: string;
  quantity_hectare: string;
  timing: string;
  confidence: number;
}

interface PredictionResponse {
  success: boolean;
  champion_model: string;
  model_accuracy: string;
  top_recommendation: FertilizerRecommendation;
  rankings: FertilizerRecommendation[];
}

export default function FertilizerPredictor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  // Farms
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');

  // Form Field States (17 parameters)
  const [soilType, setSoilType] = useState('Loamy');
  const [cropType, setCropType] = useState('Rice');
  const [cropGrowthStage, setCropGrowthStage] = useState('Vegetative');
  const [season, setSeason] = useState('Kharif');
  const [irrigationType, setIrrigationType] = useState('Canal');
  const [previousCrop, setPreviousCrop] = useState('Wheat');

  const [soilPH, setSoilPH] = useState('6.8');
  const [soilMoisture, setSoilMoisture] = useState('45');
  const [organicCarbon, setOrganicCarbon] = useState('0.65');
  const [electricalConductivity, setElectricalConductivity] = useState('0.40');
  const [nitrogenLevel, setNitrogenLevel] = useState('140');
  const [phosphorusLevel, setPhosphorusLevel] = useState('40');
  const [potassiumLevel, setPotassiumLevel] = useState('180');

  const [temperature, setTemperature] = useState('28');
  const [humidity, setHumidity] = useState('65');
  const [rainfall, setRainfall] = useState('750');
  const [fertilizerLastSeason, setFertilizerLastSeason] = useState('50');

  // Options loaded from server
  const [options, setOptions] = useState<{
    Soil_Type?: string[];
    Crop_Type?: string[];
    Crop_Growth_Stage?: string[];
    Season?: string[];
    Irrigation_Type?: string[];
    Previous_Crop?: string[];
  }>({
    Soil_Type: ['Clay', 'Loamy', 'Sandy', 'Silt'],
    Crop_Type: ['Cotton', 'Maize', 'Potato', 'Rice', 'Sugarcane', 'Tomato', 'Wheat'],
    Crop_Growth_Stage: ['Flowering', 'Harvest', 'Sowing', 'Vegetative'],
    Season: ['Kharif', 'Rabi', 'Zaid'],
    Irrigation_Type: ['Canal', 'Drip', 'Rainfed', 'Sprinkler'],
    Previous_Crop: ['Cotton', 'Maize', 'Potato', 'Rice', 'Sugarcane', 'Tomato', 'Wheat'],
  });

  useEffect(() => {
    fetchOptions();
    fetchFarms();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/predictions/fertilizer-options');
      if (res.ok) {
        const data = await res.json();
        if (data.options) {
          setOptions(data.options);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch fertilizer options, using defaults.', err);
    }
  };

  const fetchFarms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/farms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFarms(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Failed to fetch user farms.', err);
    }
  };

  const handleFarmSelect = (farmId: string) => {
    setSelectedFarmId(farmId);
    if (!farmId) return;
    const farm = farms.find(f => f.id === farmId);
    if (!farm) return;

    if (farm.crop_type && options.Crop_Type?.includes(farm.crop_type)) {
      setCropType(farm.crop_type);
    }

    if (farm.soil_reports && farm.soil_reports.length > 0) {
      const latestReport = farm.soil_reports[0];
      if (latestReport.nitrogen != null) setNitrogenLevel(String(latestReport.nitrogen));
      if (latestReport.phosphorus != null) setPhosphorusLevel(String(latestReport.phosphorus));
      if (latestReport.potassium != null) setPotassiumLevel(String(latestReport.potassium));
      if (latestReport.ph != null) setSoilPH(String(latestReport.ph));
      if (latestReport.organic_carbon != null) setOrganicCarbon(String(latestReport.organic_carbon));
      if (latestReport.ec != null) setElectricalConductivity(String(latestReport.ec));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const token = localStorage.getItem('token');
    const payload = {
      Soil_Type: soilType,
      Crop_Type: cropType,
      Crop_Growth_Stage: cropGrowthStage,
      Season: season,
      Irrigation_Type: irrigationType,
      Previous_Crop: previousCrop,
      Soil_pH: parseFloat(soilPH),
      Soil_Moisture: parseFloat(soilMoisture),
      Organic_Carbon: parseFloat(organicCarbon),
      Electrical_Conductivity: parseFloat(electricalConductivity),
      Nitrogen_Level: parseFloat(nitrogenLevel),
      Phosphorus_Level: parseFloat(phosphorusLevel),
      Potassium_Level: parseFloat(potassiumLevel),
      Temperature: parseFloat(temperature),
      Humidity: parseFloat(humidity),
      Rainfall: parseFloat(rainfall),
      Fertilizer_Used_Last_Season: parseFloat(fertilizerLastSeason),
      farmId: selectedFarmId || undefined,
    };

    try {
      const res = await fetch('/api/predictions/fertilizer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.detail || 'Fertilizer prediction failed.');
      }

      const data: PredictionResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error executing fertilizer recommendation model.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>science</span>
            Fertilizer Recommendation System
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            17-Parameter Precision ML Engine + Agronomic Application Guidance
          </p>
        </div>

        <div style={{
          padding: '8px 16px',
          backgroundColor: 'var(--positive-bg)',
          color: 'var(--positive)',
          borderRadius: 'var(--radius)',
          fontSize: '13px',
          fontWeight: '600',
          border: '1px solid var(--positive)'
        }}>
          XGBoost Champion Model | Accuracy: 87.50%
        </div>
      </div>

      {/* Farm Quick Select */}
      {farms.length > 0 && (
        <div style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>nature_people</span>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Auto-Fill Soil & Crop Data From Saved Farm
            </label>
            <select
              value={selectedFarmId}
              onChange={(e) => handleFarmSelect(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                marginTop: '4px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)'
              }}
            >
              <option value="">Select a farm to auto-populate (Optional)</option>
              {farms.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.crop_type ? `(${f.crop_type})` : ''} {f.soil_reports?.length ? '• [Soil Report Available]' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          
          {/* Card 1: Soil Properties */}
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">layers</span>
              1. Soil Chemical & Physical Parameters
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Soil Type</label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                >
                  {options.Soil_Type?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Soil pH</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={soilPH}
                  onChange={(e) => setSoilPH(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Moisture (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={soilMoisture}
                  onChange={(e) => setSoilMoisture(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Organic Carbon (%)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={organicCarbon}
                  onChange={(e) => setOrganicCarbon(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>EC (dS/m)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={electricalConductivity}
                  onChange={(e) => setElectricalConductivity(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Nitrogen (N) kg/ha</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={nitrogenLevel}
                  onChange={(e) => setNitrogenLevel(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Phosphorus (P) kg/ha</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={phosphorusLevel}
                  onChange={(e) => setPhosphorusLevel(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Potassium (K) kg/ha</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={potassiumLevel}
                  onChange={(e) => setPotassiumLevel(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Environmental Conditions */}
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">thermostat</span>
              2. Environmental & Climate Conditions
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Relative Humidity (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={humidity}
                  onChange={(e) => setHumidity(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Annual/Seasonal Rainfall (mm)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={rainfall}
                  onChange={(e) => setRainfall(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Crop Cycle & Field Management */}
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">grass</span>
              3. Crop Cycle & Management Practices
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Target Crop Type</label>
                <select
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                >
                  {options.Crop_Type?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Growth Stage</label>
                <select
                  value={cropGrowthStage}
                  onChange={(e) => setCropGrowthStage(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                >
                  {options.Crop_Growth_Stage?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Season</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                >
                  {options.Season?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Irrigation Type</label>
                <select
                  value={irrigationType}
                  onChange={(e) => setIrrigationType(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                >
                  {options.Irrigation_Type?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Previous Crop</label>
                <select
                  value={previousCrop}
                  onChange={(e) => setPreviousCrop(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                >
                  {options.Previous_Crop?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Fertilizer Used Last Season (kg/acre)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={fertilizerLastSeason}
                  onChange={(e) => setFertilizerLastSeason(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginTop: '4px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--negative-bg)', color: 'var(--negative)', borderRadius: 'var(--radius)', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {loading ? (
            <>Processing XGBoost ML Inference...</>
          ) : (
            <>
              <span className="material-symbols-outlined">auto_awesome</span>
              Generate Optimal Fertilizer Recommendation
            </>
          )}
        </button>
      </form>

      {/* Results Display */}
      {result && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--positive)' }}>check_circle</span>
            Agronomic Analysis & Recommendations
          </h2>

          {/* Primary Winner Banner */}
          <div style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            borderRadius: 'var(--radius)',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>
                Top Recommended Fertilizer
              </span>
              <h3 style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px', color: '#ffffff' }}>
                {result.top_recommendation.trade_name}
              </h3>
              <p style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                Category: <strong>{result.top_recommendation.category}</strong>
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                {result.top_recommendation.confidence}%
              </div>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>Model Match Confidence</span>
            </div>
          </div>

          {/* Top 3 Rankings Breakdown */}
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Top 3 Fertilizer Rankings Breakdown
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {result.rankings.map((rec) => (
                <div key={rec.rank} style={{ borderBottom: rec.rank < result.rankings.length ? '1px dashed var(--border)' : 'none', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      #{rec.rank} {rec.trade_name}
                    </span>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      {rec.confidence}%
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    width: '100%',
                    backgroundColor: 'var(--surface-tonal)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${rec.confidence}%`,
                      backgroundColor: rec.rank === 1 ? 'var(--positive)' : 'var(--primary-light)',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Agronomic Guide Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined">psychology</span>
                Agricultural Purpose & Function
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {result.top_recommendation.use}
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined">precision_manufacturing</span>
                Application Method & Timing
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '8px' }}>
                <strong>How to Apply:</strong> {result.top_recommendation.how_to_use}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong>Optimal Stage:</strong> {result.top_recommendation.timing}
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined">scale</span>
                Recommended Dosage
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-tonal)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Per Acre:</span>
                  <strong>{result.top_recommendation.quantity_acre}</strong>
                </div>
                <div style={{ padding: '8px 12px', backgroundColor: 'var(--surface-tonal)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Per Hectare:</span>
                  <strong>{result.top_recommendation.quantity_hectare}</strong>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
