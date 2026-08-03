import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type Tab = 'crop' | 'rainfall';

interface SoilReport {
  id: string;
  source_type: 'pdf' | 'image' | 'manual';
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  ph: number | null;
  organic_carbon: number | null;
  ec: number | null;
  created_at: string;
}

interface Farm {
  id: string;
  farmer_id: string;
  name: string;
  latitude: number;
  longitude: number;
  area_acres: number | null;
  crop_type: string | null;
  address: string | null;
  state: string | null;
  district: string | null;
  created_at: string;
  soil_reports?: SoilReport[];
}

interface PredictionLog {
  id: string;
  modelType: 'crop' | 'fertilizer' | 'yield' | 'rainfall';
  inputData: any;
  predictionResult: any;
  confidence: number | null;
  createdAt: string;
  farmId: string | null;
  farm?: {
    name: string;
    district?: string;
    state?: string;
  };
}

interface ProcessedHistoryLog extends PredictionLog {
  isGroupedRainfall?: boolean;
  rainfallMonths?: PredictionLog[];
  displayMonthRange?: string;
  avgRainfallVal?: string;
  categoryVal?: string;
}

export default function Predictor() {
  const [activeTab, setActiveTab] = useState<Tab>('crop');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // OCR states
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  // Farms list state
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [weatherLoaded, setWeatherLoaded] = useState(false);

  // Form states - Crop
  const [cropN, setCropN] = useState('200');
  const [cropP, setCropP] = useState('45');
  const [cropK, setCropK] = useState('300');
  const [cropPH, setCropPH] = useState('7.2');
  const [cropOC, setCropOC] = useState('0.55');
  const [cropEC, setCropEC] = useState('0.40');
  const [cropTemp, setCropTemp] = useState('28');
  const [cropHum, setCropHum] = useState('60');
  const [cropRain, setCropRain] = useState('700');
  const [cropState, setCropState] = useState('Gujarat');
  const [cropDistrict, setCropDistrict] = useState('Ahmedabad');
  const [cropTaluka, setCropTaluka] = useState('Viramgam');
  const [cropSeason, setCropSeason] = useState('Kharif');
  const [cropSoil, setCropSoil] = useState('Medium Black');
  const [cropWaterSource, setCropWaterSource] = useState('Canal');
  const [districtTalukaMap, setDistrictTalukaMap] = useState<Record<string, string[]>>({});

  const DEFAULT_DISTRICTS = [
    'Ahmedabad', 'Amreli', 'Anand', 'Arvalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad',
    'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhumi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar',
    'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
    'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'
  ];

  useEffect(() => {
    fetchFarms();
    fetchHistory();
    fetchWeatherForContext();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/predictions/locations');
      if (response.ok) {
        const data = await response.json();
        if (data.districts) {
          setDistrictTalukaMap(data.districts);
        }
      }
    } catch (err) {
      console.error("Failed to load location metadata", err);
    }
  };

  // Form states - Rainfall
  const [rainfallTrend, setRainfallTrend] = useState<any[]>([]);
  const [fetchingRainfall, setFetchingRainfall] = useState(false);

  // History state & filter
  const [history, setHistory] = useState<PredictionLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'crop' | 'rainfall'>('all');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Soil details inline modal states
  const [showSoilModal, setShowSoilModal] = useState(false);
  const [modalPh, setModalPh] = useState('');
  const [modalN, setModalN] = useState('');
  const [modalP, setModalP] = useState('');
  const [modalK, setModalK] = useState('');
  const [modalOC, setModalOC] = useState('');
  const [modalEc, setModalEc] = useState('');
  const [soilSubmitting, setSoilSubmitting] = useState(false);

  const getHeaders = async () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchFarms = async () => {
    try {
      const headers = await getHeaders();
      const response = await fetch('/api/farms', { headers });
      if (response.ok) {
        const data = await response.json();
        setFarms(data);
      }
    } catch (err) {
      console.error("Failed to load farms", err);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const headers = await getHeaders();
      const response = await fetch('/api/predictions/history', { headers });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchWeatherForContext = async (farmId?: string) => {
    try {
      const headers = await getHeaders();
      let url = '/api/predictions/weather';
      if (farmId) {
        url += `?farmId=${farmId}`;
      } else {
        url += `?latitude=19.0760&longitude=72.8777`;
      }
      const response = await fetch(url, { headers });
      if (response.ok) {
        const res = await response.json();
        if (res.success && res.data) {
          setCropTemp(String(res.data.temperature));
          setCropHum(String(res.data.humidity));
          // Do not overwrite annual seasonal rainfall (mm) with live hourly rainfall (0 mm)
          if (res.data.rainfall && Number(res.data.rainfall) >= 100) {
            setCropRain(String(res.data.rainfall));
          }
          setWeatherLoaded(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeFarm = farms.find(f => f.id === selectedFarmId);
  const activeLatestSoilReport = activeFarm?.soil_reports && activeFarm.soil_reports.length > 0
    ? activeFarm.soil_reports[0]
    : null;

  const handleFarmChange = async (farmId: string) => {
    setSelectedFarmId(farmId);
    setResult(null);
    setRainfallTrend([]);

    if (!farmId) {
      fetchWeatherForContext();
      return;
    }

    const farm = farms.find(f => f.id === farmId);
    if (!farm) return;

    const latestReport = farm.soil_reports && farm.soil_reports.length > 0 ? farm.soil_reports[0] : null;
    if (latestReport) {
      if (latestReport.nitrogen !== null) {
        setCropN(String(latestReport.nitrogen));
      }
      if (latestReport.phosphorus !== null) {
        setCropP(String(latestReport.phosphorus));
      }
      if (latestReport.potassium !== null) {
        setCropK(String(latestReport.potassium));
      }
      if (latestReport.ph !== null) {
        setCropPH(String(latestReport.ph));
      }
      if (latestReport.organic_carbon !== null) {
        setCropOC(String(latestReport.organic_carbon));
      }
      if (latestReport.ec !== null) {
        setCropEC(String(latestReport.ec));
      }
    }

    if (farm.state) {
      setCropState(farm.state);
    }
    if (farm.district) {
      setCropDistrict(farm.district);
      const validTals = districtTalukaMap[farm.district];
      if (validTals && validTals.length > 0) {
        if (farm.address) {
          const match = validTals.find(t => farm.address?.toLowerCase().includes(t.toLowerCase()));
          setCropTaluka(match || validTals[0]);
        } else {
          setCropTaluka(validTals[0]);
        }
      }
    }

    fetchWeatherForContext(farm.id);
  };

  const handleDistrictChange = (newDistrict: string) => {
    setCropDistrict(newDistrict);
    const validTals = districtTalukaMap[newDistrict];
    if (validTals && validTals.length > 0) {
      setCropTaluka(validTals[0]);
    } else {
      setCropTaluka('');
    }
  };

  const handleSoilCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrSuccess(false);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const headers = await getHeaders();
        
        const response = await fetch('/api/soil/extract', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type,
            farmId: selectedFarmId || null
          })
        });

        const resData = await response.json();
        setOcrLoading(false);

        if (resData.success && resData.data) {
          const nutrients = resData.data;
          
          if (selectedFarmId) {
            await fetchFarms();
            setOcrSuccess(true);
          } else {
            if (nutrients.nitrogen) {
              setCropN(String(nutrients.nitrogen));
            }
            if (nutrients.phosphorus) {
              setCropP(String(nutrients.phosphorus));
            }
            if (nutrients.potassium) {
              setCropK(String(nutrients.potassium));
            }
            if (nutrients.ph) setCropPH(String(nutrients.ph));
            if (nutrients.organic_carbon) setCropOC(String(nutrients.organic_carbon));
            if (nutrients.ec) setCropEC(String(nutrients.ec));
            setOcrSuccess(true);
          }
        } else {
          alert("Could not extract soil card details. Please enter manually.");
        }
      };
    } catch (err) {
      console.error(err);
      setOcrLoading(false);
      alert("Error reading file.");
    }
  };

  const runPrediction = async () => {
    setLoading(true);
    setResult(null);

    try {
      const headers = await getHeaders();
      let endpoint = '';
      let body: any = { farmId: selectedFarmId || null };

      let finalN = Number(cropN);
      let finalP = Number(cropP);
      let finalK = Number(cropK);
      let finalPH = Number(cropPH);
      let finalOC = Number(cropOC);
      let finalEC = Number(cropEC);

      if (selectedFarmId && activeLatestSoilReport) {
        finalN = Number(activeLatestSoilReport.nitrogen ?? cropN);
        finalP = Number(activeLatestSoilReport.phosphorus ?? cropP);
        finalK = Number(activeLatestSoilReport.potassium ?? cropK);
        finalPH = Number(activeLatestSoilReport.ph ?? cropPH);
        if (activeLatestSoilReport.organic_carbon !== null) finalOC = Number(activeLatestSoilReport.organic_carbon);
        if (activeLatestSoilReport.ec !== null) finalEC = Number(activeLatestSoilReport.ec);
      }

      if (activeTab === 'crop') {
        endpoint = '/api/predictions/crop';
        body = {
          ...body,
          N: finalN,
          P: finalP,
          K: finalK,
          ph: finalPH,
          OC: finalOC,
          EC: finalEC,
          temperature: Number(cropTemp),
          humidity: Number(cropHum),
          rainfall: Number(cropRain),
          district: activeFarm?.district || cropDistrict || 'Ahmedabad',
          taluka: cropTaluka || undefined,
          state: activeFarm?.state || cropState || 'Gujarat',
          season: cropSeason || 'Kharif',
          soil_type: cropSoil || 'Medium Black',
          water_source: cropWaterSource || 'Canal'
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      setResult(data);
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert("Failed to fetch prediction.");
    } finally {
      setLoading(false);
    }
  };

  const runRainfallForecast = async () => {
    setFetchingRainfall(true);
    setRainfallTrend([]);
    setResult(null);
    try {
      const headers = await getHeaders();
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const monthsToFetch = [];
      for (let i = 0; i < 6; i++) {
        let m = currentMonth + i;
        let y = currentYear;
        if (m > 12) {
          m = m - 12;
          y = y + 1;
        }
        monthsToFetch.push({ year: y, month: m });
      }

      const forecasts: any[] = [];
      let prevLag1: number | null = null;
      let prevLag2: number | null = null;

      for (const item of monthsToFetch) {
        const payload: any = {
          year: item.year,
          month: item.month,
          farmId: selectedFarmId || null
        };
        if (prevLag1 !== null) payload.lag1 = prevLag1;
        if (prevLag2 !== null) payload.lag2 = prevLag2;

        const response = await fetch('/api/predictions/rainfall', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch forecast for month ${item.month}`);
        }
        const data = await response.json();
        const monthName = new Date(item.year, item.month - 1).toLocaleString('default', { month: 'long' });
        
        forecasts.push({
          month: `${monthName} ${item.year}`,
          rainfall: data.forecasted_rainfall,
          category: data.category,
          advisory: data.advisory
        });

        prevLag2 = prevLag1;
        prevLag1 = data.forecasted_rainfall;
      }

      setRainfallTrend(forecasts);
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      alert("Failed to retrieve rainfall forecasts: " + err.message);
    } finally {
      setFetchingRainfall(false);
    }
  };

  const handleAddSoilReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId) return;

    setSoilSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/farms/${selectedFarmId}/soil-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ph: modalPh || null,
          nitrogen: modalN || null,
          phosphorus: modalP || null,
          potassium: modalK || null,
          organic_carbon: modalOC || null,
          ec: modalEc || null
        })
      });

      if (response.ok) {
        setShowSoilModal(false);
        setModalPh('');
        setModalN('');
        setModalP('');
        setModalK('');
        setModalOC('');
        setModalEc('');
        await fetchFarms();
      } else {
        const err = await response.json();
        alert('Failed to add: ' + (err.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSoilSubmitting(false);
    }
  };

  // Group 6-month rainfall entries into a single consolidated history row
  const processAndGroupHistory = (rawLogs: PredictionLog[]): ProcessedHistoryLog[] => {
    const processed: ProcessedHistoryLog[] = [];
    const rainfallBatches: { [key: string]: PredictionLog[] } = {};

    for (const log of rawLogs) {
      if (log.modelType === 'rainfall') {
        const timeKey = Math.floor(new Date(log.createdAt).getTime() / 15000); // 15s window
        const batchKey = `${log.farmId || 'manual'}_${timeKey}`;
        if (!rainfallBatches[batchKey]) {
          rainfallBatches[batchKey] = [];
        }
        rainfallBatches[batchKey].push(log);
      } else {
        processed.push(log);
      }
    }

    for (const batchKey in rainfallBatches) {
      const batch = rainfallBatches[batchKey];
      if (batch.length > 1) {
        batch.sort((a, b) => {
          const yDiff = (a.inputData?.year || 0) - (b.inputData?.year || 0);
          if (yDiff !== 0) return yDiff;
          return (a.inputData?.month || 0) - (b.inputData?.month || 0);
        });

        const first = batch[0];
        const last = batch[batch.length - 1];
        const totalRainfall = batch.reduce((sum, item) => sum + (item.predictionResult?.forecasted_rainfall || 0), 0);
        const avgRainfall = (totalRainfall / batch.length).toFixed(2);

        processed.push({
          id: `group_${first.id}`,
          modelType: 'rainfall',
          inputData: { ...first.inputData, monthRange: `${first.inputData?.month}/${first.inputData?.year} – ${last.inputData?.month}/${last.inputData?.year}` },
          predictionResult: {
            forecasted_rainfall: avgRainfall,
            category: first.predictionResult?.category || 'Forecast'
          },
          confidence: null,
          createdAt: first.createdAt,
          farmId: first.farmId,
          farm: first.farm,
          isGroupedRainfall: true,
          rainfallMonths: batch,
          displayMonthRange: `${first.inputData?.month}/${first.inputData?.year} – ${last.inputData?.month}/${last.inputData?.year}`,
          avgRainfallVal: avgRainfall,
          categoryVal: first.predictionResult?.category || ''
        });
      } else if (batch.length === 1) {
        processed.push(batch[0]);
      }
    }

    return processed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const processedLogs = processAndGroupHistory(history);

  const filteredHistory = processedLogs.filter(h => {
    if (historyFilter === 'all') return true;
    return h.modelType === historyFilter;
  });

  const getHistoryCount = (type: string) => {
    if (type === 'all') return processedLogs.length;
    return processedLogs.filter(h => h.modelType === type).length;
  };

  const isFarmSelected = !!selectedFarmId;

  // AgriSmart Farm Primary Green Theme Palette
  const zStyle = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cardBg: "#ffffff",
    canvasBg: "#f8f9fb",
    border: "#e5e7eb",
    borderDark: "#d1d5db",
    textPrimary: "#111827",
    textMuted: "#6b7280",
    primaryGreen: "#013a13",
    primaryGreenHover: "#1e5128",
    primaryGreenLightBg: "#e6f4ea",
    primaryGreenBorder: "#b8f1b9",
    green: "#013a13",
    orange: "#d97706",
    purple: "#7c3aed",
    blue: "#2563eb",
    readOnlyBg: "#f9fafb",
    readOnlyBorder: "#e5e7eb"
  };

  return (
    <div style={{ fontFamily: zStyle.fontFamily, display: 'flex', flexDirection: 'column', gap: '20px', color: zStyle.textPrimary }}>
      {/* AgriSmart Header Banner */}
      <div className="mandi-header-banner">
        <div>
          <h1 className="mandi-header-title">🌱 Precision Crop & Disease AI Predictor</h1>
          <p className="mandi-header-subtitle">Machine learning models for crop advice & weather forecasting</p>
        </div>
        {weatherLoaded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', padding: '6px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>thermostat</span>
            <span>Live Weather Synced</span>
          </div>
        )}
      </div>

      {/* Farm Selection Bar */}
      <div style={{ background: zStyle.cardBg, border: `1px solid ${zStyle.border}`, borderRadius: '4px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: zStyle.textMuted }}>
              Select Farm
            </label>
            {isFarmSelected ? (
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: zStyle.primaryGreen, background: zStyle.primaryGreenLightBg, padding: '2px 6px', borderRadius: '2px', border: `1px solid ${zStyle.primaryGreenBorder}` }}>
                Inputs Auto-Filled
              </span>
            ) : (
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: zStyle.textMuted, background: '#f3f4f6', padding: '2px 6px', borderRadius: '2px' }}>
                Manual Input Mode
              </span>
            )}
          </div>
          <select 
            style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '3px', border: `1px solid ${zStyle.borderDark}`, fontSize: '13px', fontWeight: 500, color: zStyle.textPrimary, backgroundColor: '#ffffff', outline: 'none' }}
            value={selectedFarmId} 
            onChange={(e) => handleFarmChange(e.target.value)}
          >
            <option value="">-- Choose a farm (or enter parameters manually) --</option>
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.district || 'N/A'}, {f.state || 'N/A'})</option>
            ))}
          </select>
        </div>

        {isFarmSelected && activeFarm && (
          <div style={{ display: 'flex', gap: '16px', borderLeft: `1px solid ${zStyle.border}`, paddingLeft: '16px', fontSize: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', color: zStyle.textMuted, display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Location</span>
              <strong style={{ fontWeight: 600 }}>{activeFarm.district || 'N/A'}, {activeFarm.state || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: zStyle.textMuted, display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Area</span>
              <strong style={{ fontWeight: 600 }}>{activeFarm.area_acres ? `${activeFarm.area_acres} Acres` : 'N/A'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: zStyle.textMuted, display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Crop</span>
              <strong style={{ fontWeight: 600 }}>{activeFarm.crop_type || 'N/A'}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Primary Green Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${zStyle.border}`, background: zStyle.cardBg }}>
        {(['crop', 'rainfall'] as Tab[]).map((tab) => {
          const labels: Record<Tab, string> = {
            crop: 'Crop Recommendation',
            rainfall: 'Rainfall Forecast'
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setResult(null); }}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? `2px solid ${zStyle.primaryGreen}` : '2px solid transparent',
                color: isActive ? zStyle.primaryGreen : zStyle.textMuted,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                transition: 'all 0.15s ease'
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Workspace */}
      <div className="predictor-container">
        {/* Left Form Panel */}
        <div style={{ flex: 1, background: zStyle.cardBg, border: `1px solid ${zStyle.border}`, borderRadius: '4px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Active Farm Soil Stats Panel */}
          {isFarmSelected && activeTab === 'crop' && (
            <div style={{ border: `1px solid ${zStyle.border}`, borderRadius: '3px', padding: '14px', backgroundColor: zStyle.readOnlyBg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: zStyle.textMuted }}>
                  Farm Soil Parameters (Auto-filled)
                </span>
                <button
                  onClick={() => setShowSoilModal(true)}
                  style={{ height: '26px', padding: '0 10px', fontSize: '11px', fontWeight: 600, color: zStyle.primaryGreen, border: `1px solid ${zStyle.primaryGreen}`, borderRadius: '3px', background: '#ffffff', cursor: 'pointer' }}
                >
                  Update Soil Stats
                </button>
              </div>

              {activeLatestSoilReport ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ padding: '8px', background: '#ffffff', border: `1px solid ${zStyle.border}`, borderRadius: '3px' }}>
                    <div style={{ fontSize: '10px', color: zStyle.textMuted, fontWeight: 600 }}>NITROGEN (N)</div>
                    <strong style={{ fontSize: '15px', color: zStyle.textPrimary }}>{activeLatestSoilReport.nitrogen ?? 'N/A'}</strong>
                    <span style={{ fontSize: '9px', color: zStyle.textMuted, display: 'block' }}>kg/ha</span>
                  </div>
                  <div style={{ padding: '8px', background: '#ffffff', border: `1px solid ${zStyle.border}`, borderRadius: '3px' }}>
                    <div style={{ fontSize: '10px', color: zStyle.textMuted, fontWeight: '600' }}>PHOSPHORUS (P)</div>
                    <strong style={{ fontSize: '15px', color: zStyle.textPrimary }}>{activeLatestSoilReport.phosphorus ?? 'N/A'}</strong>
                    <span style={{ fontSize: '9px', color: zStyle.textMuted, display: 'block' }}>kg/ha</span>
                  </div>
                  <div style={{ padding: '8px', background: '#ffffff', border: `1px solid ${zStyle.border}`, borderRadius: '3px' }}>
                    <div style={{ fontSize: '10px', color: zStyle.textMuted, fontWeight: '600' }}>POTASSIUM (K)</div>
                    <strong style={{ fontSize: '15px', color: zStyle.textPrimary }}>{activeLatestSoilReport.potassium ?? 'N/A'}</strong>
                    <span style={{ fontSize: '9px', color: zStyle.textMuted, display: 'block' }}>kg/ha</span>
                  </div>
                  <div style={{ padding: '8px', background: '#ffffff', border: `1px solid ${zStyle.border}`, borderRadius: '3px' }}>
                    <div style={{ fontSize: '10px', color: zStyle.textMuted, fontWeight: '600' }}>SOIL pH</div>
                    <strong style={{ fontSize: '15px', color: zStyle.textPrimary }}>{activeLatestSoilReport.ph ?? 'N/A'}</strong>
                    <span style={{ fontSize: '9px', color: zStyle.textMuted, display: 'block' }}>pH</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '3px', color: '#92400e', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>No soil report logged yet for this farm.</span>
                  <button onClick={() => setShowSoilModal(true)} style={{ padding: '4px 8px', fontSize: '11px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer', fontWeight: 600 }}>
                    Add Parameters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 1: Crop Recommendation */}
          {activeTab === 'crop' && (
            <>
              {!isFarmSelected && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: zStyle.textMuted }}>
                      Soil Parameters
                    </span>
                    <label style={{ fontSize: '11px', color: zStyle.primaryGreen, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>photo_camera</span>
                      Scan Soil Card
                      <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleSoilCardUpload} />
                    </label>
                  </div>

                  {ocrLoading && <div style={{ fontSize: '12px', color: zStyle.textMuted, marginBottom: '8px' }}>Scanning soil card...</div>}
                  {ocrSuccess && <div style={{ fontSize: '12px', color: zStyle.primaryGreen, fontWeight: 600, marginBottom: '8px' }}>Nutrients extracted into fields</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                    <div>
                      <label className="form-label">Nitrogen (N)</label>
                      <input type="number" className="input-field" value={cropN} onChange={(e) => setCropN(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Phosphorus (P)</label>
                      <input type="number" className="input-field" value={cropP} onChange={(e) => setCropP(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Potassium (K)</label>
                      <input type="number" className="input-field" value={cropK} onChange={(e) => setCropK(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Soil pH</label>
                      <input type="number" step="0.1" className="input-field" value={cropPH} onChange={(e) => setCropPH(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Regional & Seasonal Context */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: zStyle.textMuted }}>
                    Regional & Seasonal Parameters
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="form-label">District</label>
                    <select className="input-field" value={cropDistrict} onChange={(e) => handleDistrictChange(e.target.value)}>
                      {(Object.keys(districtTalukaMap).length > 0 ? Object.keys(districtTalukaMap) : DEFAULT_DISTRICTS).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Taluka</label>
                    {districtTalukaMap[cropDistrict] && districtTalukaMap[cropDistrict].length > 0 ? (
                      <select className="input-field" value={cropTaluka} onChange={(e) => setCropTaluka(e.target.value)}>
                        {districtTalukaMap[cropDistrict].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" className="input-field" value={cropTaluka} onChange={(e) => setCropTaluka(e.target.value)} placeholder="e.g. Viramgam" />
                    )}
                  </div>
                  <div>
                    <label className="form-label">Season</label>
                    <select className="input-field" value={cropSeason} onChange={(e) => setCropSeason(e.target.value)}>
                      <option value="Kharif">Kharif (Monsoon)</option>
                      <option value="Rabi">Rabi (Winter)</option>
                      <option value="Summer">Summer (Zaid)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Soil Type</label>
                    <select className="input-field" value={cropSoil} onChange={(e) => setCropSoil(e.target.value)}>
                      <option value="Medium Black">Medium Black</option>
                      <option value="Deep Black">Deep Black</option>
                      <option value="Alluvial">Alluvial</option>
                      <option value="Sandy Loam">Sandy Loam</option>
                      <option value="Red Soil">Red Soil</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Water Source</label>
                    <select className="input-field" value={cropWaterSource} onChange={(e) => setCropWaterSource(e.target.value)}>
                      <option value="Canal">Canal</option>
                      <option value="Borewell">Borewell</option>
                      <option value="Rainfed">Rainfed</option>
                      <option value="Drip">Drip</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Climate Averages */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: zStyle.textMuted }}>
                    Climate Averages
                  </span>
                  <span style={{ fontSize: '10px', color: zStyle.textMuted }}>
                    Auto-synced for location
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="form-label">Temperature (°C)</label>
                    <input type="number" className="input-field" value={cropTemp} readOnly style={{ backgroundColor: zStyle.readOnlyBg, cursor: 'not-allowed' }} title="Synced from API weather data" />
                  </div>
                  <div>
                    <label className="form-label">Humidity (%)</label>
                    <input type="number" className="input-field" value={cropHum} readOnly style={{ backgroundColor: zStyle.readOnlyBg, cursor: 'not-allowed' }} title="Synced from API weather data" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tab 2: Rainfall Forecast */}
          {activeTab === 'rainfall' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: zStyle.primaryGreen, marginBottom: '8px' }}>water_drop</span>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>6-Month Rainfall Trend Forecast</h3>
              <p style={{ fontSize: '12px', color: zStyle.textMuted, maxWidth: '380px', margin: '0 auto' }}>
                Calculates monthly rainfall estimates and agricultural advisories for the upcoming 6 months.
              </p>
            </div>
          )}

          {/* Primary Green Action Button */}
          {activeTab === 'rainfall' ? (
            <button 
              onClick={runRainfallForecast} 
              style={{ width: '100%', height: '40px', backgroundColor: zStyle.primaryGreen, color: '#ffffff', border: 'none', borderRadius: '3px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}
              disabled={fetchingRainfall}
            >
              {fetchingRainfall ? 'Generating Forecast...' : 'Run Rainfall Forecast'}
            </button>
          ) : (
            <button 
              onClick={runPrediction} 
              style={{ width: '100%', height: '40px', backgroundColor: zStyle.primaryGreen, color: '#ffffff', border: 'none', borderRadius: '3px', fontWeight: 600, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: loading ? 0.7 : 1 }} 
              disabled={loading || (isFarmSelected && !activeLatestSoilReport && activeTab === 'crop')}
            >
              {loading ? 'Running Prediction...' : 'Run Prediction'}
            </button>
          )}
        </div>

        {/* Right Result Section */}
        {(result || rainfallTrend.length > 0) && (
          <div style={{ flex: 1, background: zStyle.cardBg, border: `1px solid ${zStyle.border}`, borderLeft: `4px solid ${zStyle.primaryGreen}`, borderRadius: '4px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '300px' }}>
            <div style={{ borderBottom: `1px solid ${zStyle.border}`, paddingBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: zStyle.textMuted }}>
                Prediction Result
              </span>
            </div>

            {activeTab === 'crop' && result && (
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', color: zStyle.textMuted, display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Recommended Sowing Crop</span>
                  <strong style={{ fontSize: '22px', color: zStyle.primaryGreen, textTransform: 'capitalize', fontWeight: 700 }}>
                    {result.prediction}
                  </strong>
                  <span style={{ fontSize: '12px', color: zStyle.textMuted, display: 'block', marginTop: '2px' }}>
                    Confidence Level: <strong style={{ color: zStyle.textPrimary }}>{result.confidence}%</strong>
                  </span>
                </div>

                {result.top_recommendations && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: zStyle.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>Top Sowing Alternatives</span>
                    {result.top_recommendations.map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '85px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.crop}</span>
                        <div style={{ flex: 1, height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${item.confidence}%`, height: '100%', backgroundColor: idx === 0 ? zStyle.primaryGreen : '#10b981', transition: 'width 0.3s ease' }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '45px', textAlign: 'right' }}>{item.confidence}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rainfall' && rainfallTrend.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: zStyle.textMuted }}>
                  6-Month Rainfall Projection (mm)
                </span>
                <div style={{ width: '100%', height: '160px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rainfallTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#666' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#666' }} width={30} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '3px', border: `1px solid ${zStyle.border}` }} />
                      <Bar dataKey="rainfall" fill={zStyle.primaryGreen} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {rainfallTrend.map((t, idx) => (
                    <div key={idx} style={{ fontSize: '11px', padding: '8px', background: zStyle.readOnlyBg, border: `1px solid ${zStyle.border}`, borderRadius: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>{t.month}</span>
                        <span style={{ color: zStyle.primaryGreen }}>{t.rainfall} mm ({t.category})</span>
                      </div>
                      <span style={{ fontSize: '10px', color: zStyle.textMuted, display: 'block', marginTop: '2px' }}>{t.advisory}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modern High-Density Zerodha-Style Past Prediction Logs */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: zStyle.textPrimary, margin: 0 }}>
              Prediction History Log
            </h2>
            <span style={{ fontSize: '12px', color: zStyle.textMuted }}>High-density record of previous model executions</span>
          </div>

          {/* Primary Green Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {([
              { key: 'all', label: 'All' },
              { key: 'crop', label: 'Crops' },
              { key: 'rainfall', label: 'Rainfall' }
            ] as const).map((filter) => {
              const isSel = historyFilter === filter.key;
              const count = getHistoryCount(filter.key);
              return (
                <button
                  key={filter.key}
                  onClick={() => setHistoryFilter(filter.key)}
                  style={{
                    height: '28px',
                    padding: '0 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    backgroundColor: isSel ? zStyle.primaryGreen : '#ffffff',
                    color: isSel ? '#ffffff' : zStyle.textMuted,
                    border: isSel ? `1px solid ${zStyle.primaryGreen}` : `1px solid ${zStyle.border}`,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{filter.label}</span>
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '1px 5px', 
                    borderRadius: '10px', 
                    background: isSel ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                    color: isSel ? '#ffffff' : zStyle.textMuted 
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {historyLoading ? (
          <div style={{ color: zStyle.textMuted, padding: '20px 0', fontSize: '13px', textAlign: 'center', background: zStyle.cardBg, border: `1px solid ${zStyle.border}`, borderRadius: '4px' }}>
            Loading prediction logs...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ padding: '28px', border: `1px solid ${zStyle.border}`, textAlign: 'center', color: zStyle.textMuted, borderRadius: '4px', background: zStyle.cardBg, fontSize: '13px' }}>
            No prediction logs available matching this filter.
          </div>
        ) : (
          <div style={{ background: zStyle.cardBg, border: `1px solid ${zStyle.border}`, borderRadius: '4px', overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${zStyle.border}`, textAlign: 'left', color: zStyle.textMuted }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, width: '120px' }}>DATE</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, width: '160px' }}>MODEL TYPE</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, width: '150px' }}>FARM</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>KEY INPUTS</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>PREDICTION OUTPUT</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, width: '80px', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h) => {
                  let modelTagColor = zStyle.primaryGreen;
                  let modelLabel = 'Crop';
                  let inputSummary = '';
                  let outputVal = '';

                  if (h.modelType === 'rainfall') {
                    modelTagColor = zStyle.blue;
                    if (h.isGroupedRainfall) {
                      modelLabel = 'Rainfall (6-Mo)';
                      inputSummary = `Period: ${h.displayMonthRange}`;
                      outputVal = `Avg: ${h.avgRainfallVal} mm (${h.categoryVal})`;
                    } else {
                      modelLabel = 'Rainfall';
                      inputSummary = `Target: ${h.inputData?.month || '-'}/${h.inputData?.year || '-'}`;
                      outputVal = `${h.predictionResult?.forecasted_rainfall || 0} mm (${h.predictionResult?.category || ''})`;
                    }
                  } else {
                    modelTagColor = zStyle.primaryGreen;
                    modelLabel = 'Crop';
                    inputSummary = `N:${h.inputData?.N ?? '-'} P:${h.inputData?.P ?? '-'} K:${h.inputData?.K ?? '-'} | pH:${h.inputData?.ph ?? '-'}`;
                    
                    const rawConf = h.confidence ?? h.predictionResult?.confidence;
                    let confDisplay = '';
                    if (rawConf !== null && rawConf !== undefined && !isNaN(Number(rawConf))) {
                      const numConf = Number(rawConf);
                      const percentConf = (numConf <= 1.0 && numConf > 0) ? numConf * 100 : numConf;
                      confDisplay = ` (${percentConf.toFixed(2)}%)`;
                    }
                    outputVal = `${h.predictionResult?.prediction || 'N/A'}${confDisplay}`;
                  }

                  const isExpanded = expandedHistoryId === h.id;

                  return (
                    <React.Fragment key={h.id}>
                      <tr 
                        style={{ 
                          borderBottom: `1px solid ${zStyle.border}`, 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? '#ecfdf5' : 'transparent',
                          transition: 'background-color 0.15s ease'
                        }}
                        onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                      >
                        <td style={{ padding: '12px 16px', color: zStyle.textMuted }}>
                          {new Date(h.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            fontSize: '11px', 
                            fontWeight: 700, 
                            textTransform: 'uppercase', 
                            color: modelTagColor, 
                            background: `${modelTagColor}15`, 
                            padding: '4px 10px', 
                            borderRadius: '3px',
                            border: `1px solid ${modelTagColor}30`,
                            lineHeight: 1
                          }}>
                            {modelLabel}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                          {h.farm ? h.farm.name : <span style={{ color: zStyle.textMuted, fontWeight: 400 }}>Manual Entry</span>}
                        </td>
                        <td style={{ padding: '12px 16px', color: zStyle.textMuted }}>
                          {inputSummary}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: modelTagColor, fontWeight: 600 }}>
                            {outputVal}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button 
                            style={{ 
                              background: 'none', 
                              border: `1px solid ${zStyle.border}`, 
                              borderRadius: '3px', 
                              padding: '3px 8px', 
                              fontSize: '11px', 
                              color: zStyle.primaryGreen, 
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details Drawer */}
                      {isExpanded && (
                        <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${zStyle.border}` }}>
                          <td colSpan={6} style={{ padding: '14px 20px' }}>
                            {h.isGroupedRainfall && h.rainfallMonths ? (
                              <div style={{ background: '#ffffff', padding: '14px', border: `1px solid ${zStyle.border}`, borderRadius: '3px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: zStyle.textMuted, display: 'block', marginBottom: '10px' }}>
                                  6-Month Seasonal Forecast Breakdown ({h.displayMonthRange})
                                </span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                                  {h.rainfallMonths.map((mItem, idx) => (
                                    <div key={idx} style={{ padding: '10px 8px', background: zStyle.readOnlyBg, border: `1px solid ${zStyle.border}`, borderRadius: '3px', textAlign: 'center' }}>
                                      <div style={{ fontWeight: 600, fontSize: '11px', color: zStyle.textMuted }}>{mItem.inputData?.month}/{mItem.inputData?.year}</div>
                                      <div style={{ color: zStyle.primaryGreen, fontWeight: 700, fontSize: '14px', margin: '2px 0' }}>{mItem.predictionResult?.forecasted_rainfall} mm</div>
                                      <div style={{ fontSize: '10px', color: zStyle.textMuted }}>{mItem.predictionResult?.category}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '11px' }}>
                                <div style={{ background: '#ffffff', padding: '12px', border: `1px solid ${zStyle.border}`, borderRadius: '3px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: zStyle.textMuted, display: 'block', marginBottom: '6px' }}>Input Parameters Record</span>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    {Object.entries(h.inputData || {}).map(([k, v]) => (
                                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${zStyle.border}`, paddingBottom: '2px' }}>
                                        <span style={{ color: zStyle.textMuted }}>{k}:</span>
                                        <strong style={{ color: zStyle.textPrimary }}>{typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}</strong>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div style={{ background: '#ffffff', padding: '12px', border: `1px solid ${zStyle.border}`, borderRadius: '3px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: zStyle.textMuted, display: 'block', marginBottom: '6px' }}>Output Details</span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div>
                                      <span style={{ color: zStyle.textMuted }}>Primary Result: </span>
                                      <strong style={{ color: modelTagColor }}>{outputVal}</strong>
                                    </div>
                                    {h.modelType === 'rainfall' && h.predictionResult?.advisory && (
                                      <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: `1px solid ${zStyle.border}` }}>
                                        <span style={{ color: zStyle.textMuted, display: 'block', fontSize: '10px', fontWeight: 700 }}>AGRICULTURAL ADVISORY:</span>
                                        <span>{h.predictionResult.advisory}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inline Modal: Log Soil Report */}
      {showSoilModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '4px', border: `1px solid ${zStyle.border}`, padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${zStyle.border}`, paddingBottom: '10px', marginBottom: '14px' }}>
              <strong style={{ fontSize: '14px', fontWeight: 600 }}>Log Soil Report - {activeFarm?.name}</strong>
              <button onClick={() => setShowSoilModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', color: zStyle.textMuted }}>✕</button>
            </div>

            <form onSubmit={handleAddSoilReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">pH</label>
                  <input type="number" step="0.1" className="input-field" required value={modalPh} onChange={(e) => setModalPh(e.target.value)} placeholder="6.5" />
                </div>
                <div>
                  <label className="form-label">Nitrogen (N)</label>
                  <input type="number" className="input-field" required value={modalN} onChange={(e) => setModalN(e.target.value)} placeholder="kg/ha" />
                </div>
                <div>
                  <label className="form-label">Phosphorus (P)</label>
                  <input type="number" className="input-field" required value={modalP} onChange={(e) => setModalP(e.target.value)} placeholder="kg/ha" />
                </div>
                <div>
                  <label className="form-label">Potassium (K)</label>
                  <input type="number" className="input-field" required value={modalK} onChange={(e) => setModalK(e.target.value)} placeholder="kg/ha" />
                </div>
                <div>
                  <label className="form-label">Org Carbon (%)</label>
                  <input type="number" step="0.01" className="input-field" value={modalOC} onChange={(e) => setModalOC(e.target.value)} placeholder="0.5" />
                </div>
                <div>
                  <label className="form-label">EC (dS/m)</label>
                  <input type="number" step="0.01" className="input-field" value={modalEc} onChange={(e) => setModalEc(e.target.value)} placeholder="0.8" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowSoilModal(false)} style={{ flex: 1, height: '36px', border: `1px solid ${zStyle.border}`, background: '#ffffff', borderRadius: '3px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, height: '36px', border: 'none', background: zStyle.primaryGreen, color: '#ffffff', borderRadius: '3px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }} disabled={soilSubmitting}>
                  {soilSubmitting ? 'Saving...' : 'Save Soil Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
