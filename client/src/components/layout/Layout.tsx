import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [reapplyDoc, setReapplyDoc] = React.useState('');
  const [uploadingDoc, setUploadingDoc] = React.useState(false);
  const [reapplyError, setReapplyError] = React.useState('');
  const [reapplyLoading, setReapplyLoading] = React.useState(false);

  if (!profile) return <>{children}</>;

  if (profile && profile.role !== 'admin' && profile.verification_status !== 'approved') {
    const handleReapplyDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingDoc(true);
      setReapplyError('');
      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload document.');
        }

        const data = await response.json();
        setReapplyDoc(data.url);
      } catch (err: any) {
        setReapplyError(err.message || 'Failed to upload verification document.');
      } finally {
        setUploadingDoc(false);
      }
    };

    const handleReapplySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!reapplyDoc) {
        setReapplyError('Please upload a document before submitting.');
        return;
      }

      setReapplyLoading(true);
      setReapplyError('');
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/reapply', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ verificationDoc: reapplyDoc })
        });

        if (!response.ok) {
          throw new Error('Failed to submit re-application.');
        }

        refreshProfile();
      } catch (err: any) {
        setReapplyError(err.message || 'An unexpected error occurred.');
      } finally {
        setReapplyLoading(false);
      }
    };

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '16px', backgroundColor: 'var(--background)' }}>
        <main className="card" style={{ width: '100%', maxWidth: '500px', padding: '32px', textAlign: 'center' }}>
          {profile.verification_status === 'pending' ? (
            <div>
              <div style={{ marginBottom: '16px', color: '#eab308' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>hourglass_empty</span>
              </div>
              <h1 className="page-title" style={{ marginBottom: '8px', fontSize: '20px' }}>Verification Pending</h1>
              <p className="page-subtitle" style={{ marginBottom: '24px', fontSize: '14px' }}>
                Your account is currently under review by our administration team. Please check back later.
              </p>
              {profile.verification_doc && (
                <div style={{ marginBottom: '24px', fontSize: '13px' }}>
                  <a href={profile.verification_doc} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                    View Uploaded Document
                  </a>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={refreshProfile} className="btn btn-primary" style={{ width: '100%', height: '40px' }}>
                  Check Status
                </button>
                <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', height: '40px' }}>
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '16px', color: 'var(--negative)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>cancel</span>
              </div>
              <h1 className="page-title" style={{ marginBottom: '8px', fontSize: '20px' }}>Verification Rejected</h1>
              <p className="page-subtitle" style={{ marginBottom: '16px', fontSize: '14px' }}>
                Unfortunately, your verification was not approved.
              </p>

              {profile.verification_note && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--negative-bg)',
                  color: 'var(--negative)',
                  fontSize: '13px',
                  borderRadius: 'var(--radius)',
                  textAlign: 'left',
                  marginBottom: '24px',
                  borderLeft: '4px solid var(--negative)'
                }}>
                  <strong>Admin Feedback:</strong> {profile.verification_note}
                </div>
              )}

              {reapplyError && (
                <div style={{ padding: '8px 16px', backgroundColor: 'var(--negative-bg)', color: 'var(--negative)', fontSize: '12px', borderRadius: 'var(--radius)', marginBottom: '16px' }}>
                  {reapplyError}
                </div>
              )}

              <form onSubmit={handleReapplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 'bold' }}>Re-upload Verification Document</label>
                  <input
                    type="file"
                    required
                    onChange={handleReapplyDocChange}
                    disabled={reapplyLoading || uploadingDoc}
                    style={{ display: 'block', width: '100%', marginTop: '4px' }}
                  />
                  {uploadingDoc && <span style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px', display: 'block' }}>Uploading document...</span>}
                  {reapplyDoc && <span style={{ fontSize: '12px', color: 'var(--positive)', marginTop: '4px', display: 'block' }}>✓ Document uploaded successfully</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '40px' }} disabled={reapplyLoading || uploadingDoc || !reapplyDoc}>
                    {reapplyLoading ? 'Submitting...' : 'Submit Re-application'}
                  </button>
                  <button type="button" onClick={logout} className="btn btn-secondary" style={{ width: '100%', height: '40px' }}>
                    Log Out
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  }

  const currentPath = location.pathname;

  // 1. Admin Layout (Desktop-First Sidebar)
  if (profile.role === 'admin') {
    return (
      <div className="app-container" style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        {/* Left Sidebar */}
        <aside
          style={{
            width: 'var(--sidebar-width)',
            backgroundColor: 'var(--surface-tonal)',
            borderRight: '1px solid var(--border)',
            position: 'fixed',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 16px',
            zIndex: 100
          }}
        >
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '18px', color: 'var(--primary)', fontWeight: 'bold' }}>AgriSmart Admin</h1>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
              Agro Trading Terminal
            </p>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <Link
              to="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                color: currentPath === '/admin' ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: currentPath === '/admin' ? 'var(--secondary-container)' : 'transparent',
                fontWeight: currentPath === '/admin' ? 'bold' : 'normal',
                textDecoration: 'none',
                borderRadius: 'var(--radius)'
              }}
            >
              <span className="material-symbols-outlined">group</span>
              <span>Users</span>
            </Link>
            <Link
              to="/admin/approve-listings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                color: currentPath === '/admin/approve-listings' ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: currentPath === '/admin/approve-listings' ? 'var(--secondary-container)' : 'transparent',
                fontWeight: currentPath === '/admin/approve-listings' ? 'bold' : 'normal',
                textDecoration: 'none',
                borderRadius: 'var(--radius)'
              }}
            >
              <span className="material-symbols-outlined">fact_check</span>
              <span>Approve Listings</span>
            </Link>
            <Link
              to="/admin/ml"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                color: currentPath === '/admin/ml' ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: currentPath === '/admin/ml' ? 'var(--secondary-container)' : 'transparent',
                fontWeight: currentPath === '/admin/ml' ? 'bold' : 'normal',
                textDecoration: 'none',
                borderRadius: 'var(--radius)'
              }}
            >
              <span className="material-symbols-outlined">analytics</span>
              <span>ML Monitor</span>
            </Link>
          </nav>


          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Log Out</span>
          </button>
        </aside>

        {/* Main Content */}
        <div style={{ marginLeft: 'var(--sidebar-width)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Top Header */}
          <header
            style={{
              height: 'var(--header-height)',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              position: 'sticky',
              top: 0,
              zIndex: 90
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>Admin Console</div>

            <div className="navbar-user-info">
              <span className="material-symbols-outlined" style={{ color: 'var(--text-secondary)', fontSize: '20px' }}>account_circle</span>
              <span className="navbar-user-name" style={{ fontWeight: '500', fontSize: '13px' }}>{profile.full_name || 'Agri User'}</span>
              <span className="navbar-user-role status-badge approved" style={{ fontSize: '9px', padding: '1px 6px', textTransform: 'capitalize' }}>{profile.role}</span>
            </div>
          </header>

          <main style={{ padding: '24px', flex: 1 }}>{children}</main>
        </div>
      </div>
    );
  }

  // 2. Farmer & Buyer Layout (Responsive Shell)
  return (
    <div className="farmer-layout">
      {/* Left Sidebar - Visible on Desktop only */}
      <aside className="farmer-sidebar">
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '18px' }}>AgriSmart</span>
          </div>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {profile.role === 'farmer' ? 'Farmer Portal' : 'Buyer Terminal'}
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <Link
            to="/farmer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              color: currentPath === '/farmer' ? 'var(--primary)' : 'var(--text-secondary)',
              backgroundColor: currentPath === '/farmer' ? 'var(--secondary-container)' : 'transparent',
              fontWeight: currentPath === '/farmer' ? 'bold' : 'normal',
              textDecoration: 'none',
              borderRadius: 'var(--radius)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/farmer' ? "'FILL' 1" : '' }}>home</span>
            <span>Home</span>
          </Link>
          {profile.role === 'farmer' && (
            <Link
              to="/farmer/farms"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                color: currentPath === '/farmer/farms' ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: currentPath === '/farmer/farms' ? 'var(--secondary-container)' : 'transparent',
                fontWeight: currentPath === '/farmer/farms' ? 'bold' : 'normal',
                textDecoration: 'none',
                borderRadius: 'var(--radius)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/farmer/farms' ? "'FILL' 1" : '' }}>map</span>
              <span>My Farms</span>
            </Link>
          )}
          {profile.role === 'farmer' && (
            <Link
              to="/farmer/predict"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                color: currentPath === '/farmer/predict' ? 'var(--primary)' : 'var(--text-secondary)',
                backgroundColor: currentPath === '/farmer/predict' ? 'var(--secondary-container)' : 'transparent',
                fontWeight: currentPath === '/farmer/predict' ? 'bold' : 'normal',
                textDecoration: 'none',
                borderRadius: 'var(--radius)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/farmer/predict' ? "'FILL' 1" : '' }}>analytics</span>
              <span>Predict</span>
            </Link>
          )}
          <Link
            to="/farmer/mandi"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              color: currentPath === '/farmer/mandi' ? 'var(--primary)' : 'var(--text-secondary)',
              backgroundColor: currentPath === '/farmer/mandi' ? 'var(--secondary-container)' : 'transparent',
              fontWeight: currentPath === '/farmer/mandi' ? 'bold' : 'normal',
              textDecoration: 'none',
              borderRadius: 'var(--radius)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/farmer/mandi' ? "'FILL' 1" : '' }}>storefront</span>
            <span>Mandi</span>
          </Link>
          <Link
            to="/farmer/chat"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              color: currentPath === '/farmer/chat' ? 'var(--primary)' : 'var(--text-secondary)',
              backgroundColor: currentPath === '/farmer/chat' ? 'var(--secondary-container)' : 'transparent',
              fontWeight: currentPath === '/farmer/chat' ? 'bold' : 'normal',
              textDecoration: 'none',
              borderRadius: 'var(--radius)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/farmer/chat' ? "'FILL' 1" : '' }}>support_agent</span>
            <span>Assistant</span>
          </Link>
        </nav>

        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Log Out</span>
        </button>
      </aside>

      {/* Main Content */}
      <div className="farmer-main">
        {/* Top Header */}
        <header className="farmer-header">
          {/* Logo visible only on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="mobile-logo-container">
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '16px' }}>AgriSmart</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            {/* User profile & location info visible on header */}
            <div className="navbar-user-info">
              <span className="material-symbols-outlined" style={{ color: 'var(--text-secondary)', fontSize: '20px' }}>account_circle</span>
              <span className="navbar-user-name" style={{ fontWeight: '500', fontSize: '13px' }}>{profile.full_name || 'Agri User'}</span>
              <span className="navbar-user-role status-badge approved" style={{ fontSize: '9px', padding: '1px 6px', textTransform: 'capitalize' }}>{profile.role}</span>
            </div>

            <span className="material-symbols-outlined" style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>notifications</span>
            
            {/* Log out icon on mobile header */}
            <button
              onClick={logout}
              className="mobile-logout-btn"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--negative)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="farmer-content">{children}</main>

        {/* Floating Chat FAB - visible on mobile only */}
        {currentPath !== '/farmer/chat' && (
          <button
            onClick={() => navigate('/farmer/chat')}
            className="farmer-chat-fab"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
          </button>
        )}

        {/* Bottom Navigation - visible on mobile only */}
        <nav className="farmer-bottom-nav">
          <Link
            to="/farmer"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              color: currentPath === '/farmer' ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/farmer' ? "'FILL' 1" : '' }}>home</span>
            <span style={{ fontSize: '10px', marginTop: '2px' }}>Home</span>
          </Link>

          <Link
            to="/farmer/farms"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              color: currentPath === '/farmer/farms' ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/farmer/farms' ? "'FILL' 1" : '' }}>map</span>
            <span style={{ fontSize: '10px', marginTop: '2px' }}>Farms</span>
          </Link>

          <Link
            to="/farmer/predict"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              color: currentPath === '/farmer/predict' ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/farmer/predict' ? "'FILL' 1" : '' }}>analytics</span>
            <span style={{ fontSize: '10px', marginTop: '2px' }}>Predict</span>
          </Link>

          <Link
            to="/farmer/mandi"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              color: currentPath === '/farmer/mandi' ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/farmer/mandi' ? "'FILL' 1" : '' }}>storefront</span>
            <span style={{ fontSize: '10px', marginTop: '2px' }}>Mandi</span>
          </Link>

          <Link
            to="/farmer/chat"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              color: currentPath === '/farmer/chat' ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: currentPath === '/farmer/chat' ? "'FILL' 1" : '' }}>support_agent</span>
            <span style={{ fontSize: '10px', marginTop: '2px' }}>Assistant</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
