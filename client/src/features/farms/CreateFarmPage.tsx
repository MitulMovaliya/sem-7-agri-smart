import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with Leaflet in React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

const districtsData: Record<string, string[]> = {
  'Maharashtra': ['Pune', 'Nashik', 'Nagpur', 'Aurangabad'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur'],
  'Rajasthan': ['Kota', 'Alwar', 'Jaipur', 'Jodhpur'],
  'Haryana': ['Karnal', 'Rohtak', 'Hisar', 'Panipat'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Patiala', 'Jalandhar']
};

function MapEvents({ onMapClick }: { onMapClick: (latlng: any) => void }) {
  useMapEvents({
    click(e: any) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function CreateFarmPage() {
  useAuth();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [crop, setCrop] = useState('');
  const [address, setAddress] = useState('');
  const [farmState, setFarmState] = useState('Maharashtra');
  const [farmDistrict, setFarmDistrict] = useState('Pune');
  
  // Soil parameters states
  const [ph, setPh] = useState('');
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [organicCarbon, setOrganicCarbon] = useState('');
  const [ec, setEc] = useState('');

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLocationDetails = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.address) {
          const addressInfo = data.address;
          const state = addressInfo.state || '';
          
          let district = addressInfo.state_district || addressInfo.district || addressInfo.county || addressInfo.city || addressInfo.town || addressInfo.suburb || '';
          if (district.endsWith(' District')) {
            district = district.replace(' District', '');
          }
          if (district.endsWith(' Division')) {
            district = district.replace(' Division', '');
          }
          
          if (state) setFarmState(state);
          if (district) setFarmDistrict(district);

          const displayName = data.display_name || '';
          if (displayName) {
            setAddress(displayName);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching location details:', err);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        await fetchLocationDetails(latitude, longitude);
      },
      (error) => {
        alert("Unable to retrieve your location: " + error.message);
      }
    );
  };

  const handleMapClick = async (latlng: any) => {
    setLat(latlng.lat);
    setLng(latlng.lng);
    await fetchLocationDetails(latlng.lat, latlng.lng);
  };

  const handleAddFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || lat === null || lng === null) {
      setFormError('Please enter a name and click on the map to select farm location.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/farms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          latitude: lat,
          longitude: lng,
          area_acres: area ? Number(area) : null,
          crop_type: crop || null,
          address: address || null,
          state: farmState,
          district: farmDistrict,
          ph: ph || null,
          nitrogen: nitrogen || null,
          phosphorus: phosphorus || null,
          potassium: potassium || null,
          organic_carbon: organicCarbon || null,
          ec: ec || null
        })
      });

      if (response.ok) {
        setFormSuccess('Farm registered successfully! Redirecting...');
        window.dispatchEvent(new Event('auth-state-change'));
        setTimeout(() => {
          navigate('/farmer/farms');
        }, 1500);
      } else {
        const errData = await response.json();
        setFormError(errData.error || 'Failed to add farm.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const defaultCenter: [number, number] = [18.5204, 73.8567];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Register New Farm</h2>
          <p className="page-subtitle">Locate your land on the map, provide dimensions, and add initial soil statistics.</p>
        </div>
        <button 
          onClick={() => navigate('/farmer/farms')} 
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
          Back to Farms
        </button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }} className="card">
        {formError && (
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--negative-bg)', color: 'var(--negative)', fontSize: '13px', borderRadius: 'var(--radius)' }}>
            {formError}
          </div>
        )}

        {formSuccess && (
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--positive-bg)', color: 'var(--positive)', fontSize: '13px', borderRadius: 'var(--radius)' }}>
            {formSuccess}
          </div>
        )}

        <form onSubmit={handleAddFarm} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Farm Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. North Fields / Mango Orchard"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Area (Acres)</label>
              <input
                type="number"
                step="0.01"
                className="input-field"
                placeholder="e.g. 2.5"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Current Crop</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Wheat / Rice"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">State *</label>
              <input
                type="text"
                list="states-list"
                className="input-field"
                placeholder="e.g. Maharashtra"
                value={farmState}
                onChange={(e) => setFarmState(e.target.value)}
                disabled={submitting}
                required
              />
              <datalist id="states-list">
                {Object.keys(districtsData).map((st) => (
                  <option key={st} value={st} />
                ))}
              </datalist>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">District *</label>
              <input
                type="text"
                list="districts-list"
                className="input-field"
                placeholder="e.g. Pune"
                value={farmDistrict}
                onChange={(e) => setFarmDistrict(e.target.value)}
                disabled={submitting}
                required
              />
              <datalist id="districts-list">
                {(districtsData[farmState] || []).map((dst) => (
                  <option key={dst} value={dst} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Address / Landmark</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Near village lake"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Soil Details Box */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--surface-tonal)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: 'var(--primary)' }}>Initial Soil Parameters (Optional)</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '8px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>pH</label>
                <input type="number" step="0.1" className="input-field" style={{ height: '32px' }} value={ph} onChange={(e) => setPh(e.target.value)} placeholder="6.5" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>N (Nitrogen)</label>
                <input type="number" className="input-field" style={{ height: '32px' }} value={nitrogen} onChange={(e) => setNitrogen(e.target.value)} placeholder="kg/ha" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>P (Phosphorus)</label>
                <input type="number" className="input-field" style={{ height: '32px' }} value={phosphorus} onChange={(e) => setPhosphorus(e.target.value)} placeholder="kg/ha" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>K (Potassium)</label>
                <input type="number" className="input-field" style={{ height: '32px' }} value={potassium} onChange={(e) => setPotassium(e.target.value)} placeholder="kg/ha" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Org Carbon</label>
                <input type="number" step="0.01" className="input-field" style={{ height: '32px' }} value={organicCarbon} onChange={(e) => setOrganicCarbon(e.target.value)} placeholder="%" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>EC</label>
                <input type="number" step="0.01" className="input-field" style={{ height: '32px' }} value={ec} onChange={(e) => setEc(e.target.value)} placeholder="dS/m" />
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ fontWeight: 'bold', margin: 0 }}>
                Select Location on Map *
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="btn btn-secondary"
                style={{ height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>my_location</span>
                Use Current Location
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Click anywhere on the map to pin the exact farm coordinate.
            </span>
            
            <div style={{ height: '250px', width: '100%', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapEvents onMapClick={handleMapClick} />
                {lat !== null && lng !== null ? (
                  <>
                    <MapController center={[lat, lng]} />
                    <Marker position={[lat, lng]} />
                  </>
                ) : null}
              </MapContainer>
            </div>

            {lat !== null && lng !== null && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--positive)', fontWeight: '600' }}>
                ✓ Selected Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: '40px', marginTop: '8px' }}
            disabled={submitting || lat === null || lng === null}
          >
            {submitting ? 'Registering Farm...' : 'Register Farm'}
          </button>
        </form>
      </div>
    </div>
  );
}
