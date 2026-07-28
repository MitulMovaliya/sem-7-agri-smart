import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed. Please check credentials.');
        setLoading(false);
        return;
      }

      // Store JWT token locally
      localStorage.setItem('token', data.token);
      
      // Dispatch authentication state change event to sync useAuth hook
      window.dispatchEvent(new Event('auth-state-change'));

      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/farmer');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '16px' }}>
      <main className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '16px', color: 'var(--primary)' }}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '48px' }}>eco</span>
          </div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>Login to AgriSmart</h1>
          <p className="page-subtitle" style={{ margin: 0, textAlign: 'center' }}>The professional trading terminal for agriculture.</p>
        </div>

        {error && (
          <div style={{ padding: '8px 16px', backgroundColor: 'var(--negative-bg)', color: 'var(--negative)', fontSize: '12px', borderRadius: 'var(--radius)', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className="input-field"
              placeholder="Enter email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="input-field"
              placeholder="Enter password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: '40px', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>
              Register
            </Link>
          </p>
        </div>
      </main>
      <div className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#013a13 1px, transparent 1px)', backgroundSize: '24px 24px', position: 'fixed' }} />
    </div>
  );
}
