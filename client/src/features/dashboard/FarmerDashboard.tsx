import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface Product {
  id: string;
  crop_name: string;
  price_per_unit: number;
  quantity_unit: string;
}

export default function FarmerDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [listingsCount, setListingsCount] = useState(0);
  const [tickerProducts, setTickerProducts] = useState<Product[]>([]);
  const [weatherData, setWeatherData] = useState<{ temp: number; humidity: number; condition: string } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    fetchLiveWeather();
  }, [profile]);

  const fetchLiveWeather = async () => {
    setLoadingWeather(true);
    try {
      const token = localStorage.getItem('token');
      let url = '/api/predictions/weather?latitude=19.0760&longitude=72.8777';
      if (token) {
        const farmRes = await fetch('/api/farms', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (farmRes.ok) {
          const farms = await farmRes.json();
          if (farms && farms.length > 0 && farms[0].latitude && farms[0].longitude) {
            url = `/api/predictions/weather?farmId=${farms[0].id}`;
          }
        }
      }
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const res = await response.json();
        if (res.success && res.data) {
          const temp = res.data.temperature;
          const hum = res.data.humidity;
          let cond = 'Excellent';
          if (temp > 35) cond = 'Hot';
          else if (temp < 15) cond = 'Cool';
          else if (hum > 70) cond = 'High Humidity';

          setWeatherData({
            temp: Math.round(temp),
            humidity: Math.round(hum),
            condition: cond
          });
        }
      }
    } catch (err) {
      console.error("Error fetching weather:", err);
    } finally {
      setLoadingWeather(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // 1. Get listings count by calling our products route
      const productsResponse = await fetch(`/api/products?farmer_id=${profile?.id || ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setListingsCount(productsData.length || 0);
      }

      // Fetch all active products for the Mandi Price Ribbon
      const allProductsRes = await fetch('/api/products');
      if (allProductsRes.ok) {
        const allProducts = await allProductsRes.json();
        setTickerProducts(allProducts);
      }

      // 2. Get active orders count by calling our orders route
      const ordersResponse = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const activeOrders = ordersData.filter((order: any) => 
          !['completed', 'cancelled', 'rejected'].includes(order.status)
        );
        setActiveOrdersCount(activeOrders.length || 0);
      }
    } catch (err) {
      console.error("Error querying dashboard stats:", err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Mandi Price Ribbon */}
      <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', border: '1px solid var(--border)', padding: '6px', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface-tonal)', fontSize: '11px', fontWeight: 'bold' }}>
        <div style={{ display: 'inline-block', animation: 'marquee 15s linear infinite' }}>
          {tickerProducts.length > 0 ? (
            tickerProducts.map((p, idx) => (
              <span key={p.id || idx}>
                🌾 {p.crop_name.toUpperCase()}: ₹{p.price_per_unit.toLocaleString()}/{p.quantity_unit}
                {idx < tickerProducts.length - 1 ? ' | ' : ''}
              </span>
            ))
          ) : (
            <span>LIVE MARKET: No active listings available at present</span>
          )}
        </div>
      </div>

      {/* Quick Navigation Guide for Users */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>explore</span>
          <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Quick Navigation - Where would you like to go?</h2>
        </div>
        <div className="quick-nav-grid">
          <div className="quick-nav-card" onClick={() => navigate('/farmer/mandi')}>
            <div className="quick-nav-icon-wrapper">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>storefront</span>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Mandi Marketplace</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Buy & Sell crops directly</div>
            </div>
          </div>

          {profile?.role === 'farmer' && (
            <div className="quick-nav-card" onClick={() => navigate('/farmer/predict')}>
              <div className="quick-nav-icon-wrapper">
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>analytics</span>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Crop & Disease AI</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>AI yield & disease diagnosis</div>
              </div>
            </div>
          )}

          {profile?.role === 'farmer' && (
            <div className="quick-nav-card" onClick={() => navigate('/farmer/farms')}>
              <div className="quick-nav-icon-wrapper">
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>map</span>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>My Farm Fields</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Manage land & soil records</div>
              </div>
            </div>
          )}

          <div className="quick-nav-card" onClick={() => navigate('/farmer/chat')}>
            <div className="quick-nav-icon-wrapper">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>support_agent</span>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Ask AI Assistant</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Farming help in your language</div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Column (Weather & Quick Actions) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Weather Header Card */}
          <div className="card" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase' }}>Local Sowing Weather</span>
              <span className="material-symbols-outlined" style={{ color: 'var(--warning)', fontVariationSettings: "'FILL' 1" }}>partly_cloudy_day</span>
            </div>
            {loadingWeather ? (
              <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.8 }}>Fetching live weather data...</div>
            ) : weatherData ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                  <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff' }}>{weatherData.temp}°C</h2>
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>Humidity ({weatherData.humidity}%)</span>
                </div>
                <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                  Sowing conditions in your area: <strong style={{ color: 'var(--primary-tint)' }}>{weatherData.condition}</strong>
                </p>
              </>
            ) : (
              <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.8 }}>Weather data unavailable</div>
            )}
          </div>

          {/* Main Grid Quick Actions */}
          {profile?.role === 'buyer' ? (
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Marketplace Services</h3>
              <div className="dashboard-actions-grid">
                <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }} onClick={() => navigate('/farmer/mandi')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--primary)' }}>storefront</span>
                  <h4 style={{ fontSize: '13px', marginTop: '8px' }}>Browse Mandi</h4>
                </div>
                <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }} onClick={() => navigate('/farmer/chat')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--primary)' }}>support_agent</span>
                  <h4 style={{ fontSize: '13px', marginTop: '8px' }}>AI Assistant</h4>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>AI Predictive Services</h3>
              <div className="dashboard-actions-grid">
                <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }} onClick={() => navigate('/farmer/predict')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--primary)' }}>spa</span>
                  <h4 style={{ fontSize: '13px', marginTop: '8px' }}>Crop Advice</h4>
                </div>
                <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }} onClick={() => navigate('/farmer/predict')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--primary)' }}>science</span>
                  <h4 style={{ fontSize: '13px', marginTop: '8px' }}>Fertilizers</h4>
                </div>
                <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }} onClick={() => navigate('/farmer/predict')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--primary)' }}>show_chart</span>
                  <h4 style={{ fontSize: '13px', marginTop: '8px' }}>Yield Forecast</h4>
                </div>
                <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '24px' }} onClick={() => navigate('/farmer/predict')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--primary)' }}>thunderstorm</span>
                  <h4 style={{ fontSize: '13px', marginTop: '8px' }}>Rainfall Index</h4>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Trade Status Summary) */}
        <div>
          <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>My Trade Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => navigate('/farmer/mandi?tab=my-listings')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>MY CROP LISTINGS</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>arrow_forward</span>
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{listingsCount}</h2>
            </div>
            <div className="card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => navigate('/farmer/mandi?tab=orders')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ACTIVE ORDERS</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>arrow_forward</span>
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>{activeOrdersCount}</h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
