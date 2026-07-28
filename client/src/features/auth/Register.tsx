import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'farmer' | 'buyer'>('farmer');
  const [verificationDoc, setVerificationDoc] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const uploadFile = async (file: File) => {
    setUploadingDoc(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/register', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload document.');
      }

      const data = await response.json();
      setVerificationDoc(data.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload verification document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationDoc) {
      setError('Please upload a KYC verification document (e.g., Aadhaar / Land Registry).');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role,
          fullName,
          verificationDoc
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account.');
        setLoading(false);
        return;
      }

      // Store JWT token locally
      localStorage.setItem('token', data.token);
      
      // Dispatch authentication state change event
      window.dispatchEvent(new Event('auth-state-change'));

      navigate('/farmer');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '16px', paddingTop: '40px', paddingBottom: '40px' }}>
      <main className="card" style={{ width: '100%', maxWidth: '480px', padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '16px', color: 'var(--primary)' }}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '48px' }}>eco</span>
          </div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>Register to AgriSmart</h1>
          <p className="page-subtitle" style={{ margin: 0, textAlign: 'center' }}>Join the direct agricultural marketplace and predictive platform.</p>
        </div>

        {error && (
          <div style={{ padding: '8px 16px', backgroundColor: 'var(--negative-bg)', color: 'var(--negative)', fontSize: '12px', borderRadius: 'var(--radius)', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Role Card Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' }}>
            <div
              onClick={() => setRole('farmer')}
              style={{
                border: role === 'farmer' ? '2px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: role === 'farmer' ? 'var(--positive-bg)' : 'var(--surface)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)', marginBottom: '8px' }}>agriculture</span>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Farmer</div>
            </div>
            <div
              onClick={() => setRole('buyer')}
              style={{
                border: role === 'buyer' ? '2px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: role === 'buyer' ? 'var(--positive-bg)' : 'var(--surface)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)', marginBottom: '8px' }}>storefront</span>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Buyer</div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="Enter email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Choose password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>



          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Upload KYC Document (Aadhaar / Land Certificate / Business ID)</label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              style={{
                border: dragActive ? '2px dashed var(--primary)' : '2px dashed var(--border)',
                backgroundColor: dragActive ? 'var(--positive-bg)' : 'var(--surface-tonal)',
                borderRadius: 'var(--radius)',
                padding: '24px',
                textAlign: 'center',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '140px',
                marginTop: '4px'
              }}
              onClick={() => document.getElementById('file-upload-input')?.click()}
            >
              <input
                id="file-upload-input"
                type="file"
                style={{ display: 'none' }}
                onChange={handleDocChange}
                disabled={loading || uploadingDoc}
                accept=".jpg,.jpeg,.png,.pdf"
              />
              
              {uploadingDoc ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px', color: 'var(--primary)' }}>sync</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Uploading document...</span>
                </div>
              ) : verificationDoc ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--positive)' }}>check_circle</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Document Verified</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '280px', wordBreak: 'break-all' }}>
                    {verificationDoc.split('/').pop()}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVerificationDoc('');
                    }}
                    style={{
                      marginTop: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--negative)',
                      fontWeight: 'bold'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--text-secondary)' }}>upload_file</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Drag & drop your file here, or <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>browse</span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Supports JPG, PNG or PDF formats
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: '40px', marginTop: '8px' }}
            disabled={loading || uploadingDoc}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
