import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './LandingPage.css';

export default function LandingPage() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'predict' | 'mandi'>('predict');

  const handleDashboardRedirect = () => {
    if (session && profile) {
      if (profile.role === 'admin') navigate('/admin');
      else navigate('/farmer');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-container">
      {/* Background Glow */}
      <div className="landing-bg-glow"></div>
      <div className="landing-grid-pattern"></div>

      {/* Navigation Header */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <div className="landing-brand" onClick={() => navigate('/')}>
            <div className="landing-brand-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>eco</span>
            </div>
            <span className="landing-brand-title">AgriSmart</span>
          </div>

          <ul className="landing-nav-links">
            <li><a href="#features" className="landing-nav-link">Features</a></li>
            <li><a href="#portals" className="landing-nav-link">Portals</a></li>
            <li><a href="#about" className="landing-nav-link">About</a></li>
          </ul>

          <div className="landing-nav-actions">
            {session && profile ? (
              <button onClick={handleDashboardRedirect} className="btn-landing-primary">
                <span>Go to Dashboard</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-landing-secondary">
                  <span>Sign In</span>
                </Link>
                <Link to="/register" className="btn-landing-primary">
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero-minimal">
        <div className="hero-minimal-badge">
          <span>Smart Agriculture & Digital Agro Marketplace</span>
        </div>

        <h1 className="hero-minimal-title">
          Empowering Farming with <br />
          <span className="hero-title-accent">AI Crop Intelligence & Direct Trade</span>
        </h1>

        <p className="hero-subtitle-minimal">
          AgriSmart provides data-driven soil analytics, ML crop recommendations, farm record management, and a direct mandi marketplace connecting farmers with crop buyers.
        </p>

        <div className="hero-cta-group">
          {session && profile ? (
            <button onClick={handleDashboardRedirect} className="btn-landing-primary btn-hero-lg">
              <span className="material-symbols-outlined">space_dashboard</span>
              <span>Open Dashboard</span>
            </button>
          ) : (
            <>
              <Link to="/register" className="btn-landing-primary btn-hero-lg">
                <span>Get Started</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
              </Link>
              <Link to="/login" className="btn-landing-secondary btn-hero-lg">
                <span>Sign In</span>
              </Link>
            </>
          )}
        </div>

        {/* Hero Product Visual Mockup */}
        <div className="hero-mockup-wrapper">
          <div className="hero-mockup-card">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span className="mockup-dot red"></span>
                <span className="mockup-dot yellow"></span>
                <span className="mockup-dot green"></span>
              </div>

              <div className="mockup-nav-tabs">
                <button
                  className={`mockup-tab-btn ${activeTab === 'predict' ? 'active' : ''}`}
                  onClick={() => setActiveTab('predict')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>psychology</span>
                  <span>Crop Predictor</span>
                </button>
                <button
                  className={`mockup-tab-btn ${activeTab === 'mandi' ? 'active' : ''}`}
                  onClick={() => setActiveTab('mandi')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>storefront</span>
                  <span>Mandi Marketplace</span>
                </button>
              </div>

              <div style={{ fontSize: '11px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                <span>Feature Preview</span>
              </div>
            </div>

            <div className="mockup-content">
              {activeTab === 'predict' ? (
                <div className="mockup-predict-grid">
                  <div className="mockup-form-preview">
                    <div className="mockup-form-row">
                      <span>Nitrogen (N): <strong>90 kg/ha</strong></span>
                      <span>Phosphorus (P): <strong>42 kg/ha</strong></span>
                    </div>
                    <div className="mockup-form-row">
                      <span>Potassium (K): <strong>43 kg/ha</strong></span>
                      <span>Soil pH: <strong>6.5</strong></span>
                    </div>
                    <div className="mockup-form-row">
                      <span>Temperature: <strong>25°C</strong></span>
                      <span>Rainfall: <strong>200 mm</strong></span>
                    </div>
                  </div>

                  <div className="mockup-result-preview">
                    <span className="result-tag">Recommended Crop</span>
                    <div className="result-crop-name">Wheat (HD-2967)</div>
                    <p className="result-desc">Optimal soil N-P-K nutrient balance detected for high grain yield.</p>
                  </div>
                </div>
              ) : (
                <div className="mockup-mandi-grid">
                  <div className="mandi-sample-card">
                    <div className="mandi-sample-title">Sharbati Wheat (Grade A)</div>
                    <div className="mandi-sample-detail">Quantity: 150 Quintals | Location: Punjab</div>
                    <div className="mandi-sample-price">₹2,350 / Quintal</div>
                  </div>

                  <div className="mandi-sample-card">
                    <div className="mandi-sample-title">Basmati Rice 1121</div>
                    <div className="mandi-sample-detail">Quantity: 200 Quintals | Location: Haryana</div>
                    <div className="mandi-sample-price">₹4,200 / Quintal</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section id="features" className="landing-section-minimal">
        <div className="section-header-minimal">
          <h2 className="section-title-minimal">Core Platform Features</h2>
          <p className="section-subtitle-minimal">
            Essential tools for smart farming and direct agricultural trade.
          </p>
        </div>

        <div className="minimal-features-grid">
          <div className="minimal-feature-card">
            <div className="minimal-feature-icon">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <h3 className="minimal-feature-title">Crop & Soil Intelligence</h3>
            <p className="minimal-feature-desc">
              Input Nitrogen, Phosphorus, Potassium, soil pH, and climate factors to receive machine learning crop recommendations for optimal yield.
            </p>
          </div>

          <div className="minimal-feature-card">
            <div className="minimal-feature-icon">
              <span className="material-symbols-outlined">storefront</span>
            </div>
            <h3 className="minimal-feature-title">Digital Mandi Marketplace</h3>
            <p className="minimal-feature-desc">
              List harvested crops for direct buyer offers with transparent market prices and order status management.
            </p>
          </div>

          <div className="minimal-feature-card">
            <div className="minimal-feature-icon">
              <span className="material-symbols-outlined">landscape</span>
            </div>
            <h3 className="minimal-feature-title">Farm Management</h3>
            <p className="minimal-feature-desc">
              Register and organize farm profiles, track field details, acreage, and maintain structured records across seasons.
            </p>
          </div>

          <div className="minimal-feature-card">
            <div className="minimal-feature-icon">
              <span className="material-symbols-outlined">support_agent</span>
            </div>
            <h3 className="minimal-feature-title">24/7 AI Assistant</h3>
            <p className="minimal-feature-desc">
              Interactive AI assistant offering guidance for crop care, disease prevention, pest diagnostics, and general farming queries.
            </p>
          </div>
        </div>
      </section>

      {/* Portals Access Section */}
      <section id="portals" className="landing-section-minimal">
        <div className="section-header-minimal">
          <h2 className="section-title-minimal">Get Started with AgriSmart</h2>
          <p className="section-subtitle-minimal">
            Choose your path as a farmer or produce buyer.
          </p>
        </div>

        <div className="roles-grid">
          <div className="role-card">
            <div>
              <div className="role-title">
                <span className="material-symbols-outlined" style={{ color: '#34d399' }}>eco</span>
                <span>Farmer Portal</span>
              </div>
              <p className="role-desc">
                Tools for farmers to analyze soil, manage farm records, predict optimal crops, and sell produce directly.
              </p>

              <ul className="role-feature-list">
                <li className="role-feature-item">
                  <span className="material-symbols-outlined role-check-icon">check_circle</span>
                  <span>Run ML crop & NPK nutrient predictions</span>
                </li>
                <li className="role-feature-item">
                  <span className="material-symbols-outlined role-check-icon">check_circle</span>
                  <span>Create and manage farm profiles & field details</span>
                </li>
                <li className="role-feature-item">
                  <span className="material-symbols-outlined role-check-icon">check_circle</span>
                  <span>Post produce listings on Mandi for buyers</span>
                </li>
                <li className="role-feature-item">
                  <span className="material-symbols-outlined role-check-icon">check_circle</span>
                  <span>Get 24/7 advisory support from AI Assistant</span>
                </li>
              </ul>
            </div>

            <Link to={session ? "/farmer" : "/register"} className="btn-landing-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <span>Access Farmer Portal</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </Link>
          </div>

          <div className="role-card">
            <div>
              <div className="role-title">
                <span className="material-symbols-outlined" style={{ color: '#34d399' }}>storefront</span>
                <span>Buyer Portal</span>
              </div>
              <p className="role-desc">
                Dedicated workspace for agricultural buyers and traders to discover produce and connect with farmers.
              </p>

              <ul className="role-feature-list">
                <li className="role-feature-item">
                  <span className="material-symbols-outlined role-check-icon">check_circle</span>
                  <span>Browse verified produce listings by crop type</span>
                </li>
                <li className="role-feature-item">
                  <span className="material-symbols-outlined role-check-icon">check_circle</span>
                  <span>Place direct offers and purchase harvest produce</span>
                </li>
                <li className="role-feature-item">
                  <span className="material-symbols-outlined role-check-icon">check_circle</span>
                  <span>Track orders and trade history seamlessly</span>
                </li>
                <li className="role-feature-item">
                  <span className="material-symbols-outlined role-check-icon">check_circle</span>
                  <span>Transparent seller profiles and verified documentation</span>
                </li>
              </ul>
            </div>

            <Link to={session ? "/farmer/mandi" : "/login"} className="btn-landing-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              <span>Access Buyer Portal</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="landing-footer-minimal">
        <div className="footer-container-minimal">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#10b981', fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span style={{ fontWeight: '700', color: '#ffffff' }}>AgriSmart</span>
          </div>

          <div>
            <span>&copy; {new Date().getFullYear()} AgriSmart Platform. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
