import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface UserProfile {

  id: string;
  full_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  verification_status: 'pending' | 'approved' | 'rejected';
  verification_note: string | null;
  verification_doc: string | null;
  created_at: string;
}

interface ProductListing {
  id: string;
  crop_name: string;
  quantity: number;
  quantity_unit: string;
  price_per_unit: number;
  quality_grade: string;
  status: string;
  farmer_id: string;
  profiles?: {
    full_name: string;
  };
}

export default function AdminConsole({ activeModule = 'users' }: { activeModule?: 'users' | 'ml' }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pendingProducts, setPendingProducts] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, [activeModule]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      if (activeModule === 'users') {
        // 1. Fetch user directory
        const usersResponse = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }

        // 2. Fetch pending listings queue
        const productsResponse = await fetch('/api/admin/products/pending', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setPendingProducts(productsData);
        }
      }
    } catch (err) {
      console.error("Failed to load admin console data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Farmer KYC verification
  const verifyUser = async (userId: string, action: 'approved' | 'rejected', note?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: action, note })
      });

      if (response.ok) {
        alert(`User verification status set to ${action}!`);
        fetchAdminData();
      } else {
        const errorData = await response.json();
        alert("Failed to update user verification: " + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Moderate product listing (approve/reject)
  const moderateProduct = async (productId: string, action: 'approved' | 'rejected') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: action })
      });

      if (response.ok) {
        alert(`Product listing has been ${action}.`);
        fetchAdminData();
      } else {
        const errorData = await response.json();
        alert(`Failed to ${action} listing: ` + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {activeModule === 'users' ? (
        <>
          {/* Section: Pending Moderation Listings */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 className="page-title" style={{ fontSize: '18px', margin: 0 }}>Listing Moderation Queue</h2>
              <Link to="/admin/approve-listings" className="btn btn-secondary" style={{ fontSize: '11px', height: '28px', padding: '0 10px', textDecoration: 'none' }}>
                Open Approval Console →
              </Link>
            </div>

            {loading ? (
              <div>Loading queue...</div>
            ) : pendingProducts.length === 0 ? (
              <div style={{ padding: '16px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No crop listings awaiting moderation.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingProducts.map((p) => (
                  <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{p.crop_name}</strong> ({p.quantity} {p.quantity_unit}) at <strong style={{ color: 'var(--primary)' }}>₹{p.price_per_unit}</strong>
                      <br />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Farmer: {p.profiles?.full_name} | Quality: Grade {p.quality_grade}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => moderateProduct(p.id, 'approved')} className="btn btn-primary" style={{ height: '32px', fontSize: '11px', backgroundColor: 'var(--positive)' }}>
                        Approve
                      </button>
                      <button onClick={() => moderateProduct(p.id, 'rejected')} className="btn btn-secondary" style={{ height: '32px', fontSize: '11px', color: 'var(--negative)', borderColor: 'var(--negative)' }}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: User Directory */}
          <div style={{ marginTop: '16px' }}>
            <h2 className="page-title" style={{ fontSize: '18px', marginBottom: '12px' }}>User Directory & Verification</h2>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Document</th>
                    <th>KYC Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 'bold' }}>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                      <td>
                        {u.verification_doc ? (
                          <a href={u.verification_doc} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                            View KYC Doc
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>No Document</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${
                          u.verification_status === 'approved' ? 'approved' :
                          u.verification_status === 'rejected' ? 'rejected' : 'pending'
                        }`}>
                          {u.verification_status || (u.is_verified ? 'approved' : 'pending')}
                        </span>
                        {u.verification_note && (
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Note: {u.verification_note}
                          </div>
                        )}
                      </td>
                      <td>
                        {u.verification_status !== 'approved' && u.role !== 'admin' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => verifyUser(u.id, 'approved')}
                              className="btn btn-primary"
                              style={{ height: '28px', padding: '0 8px', fontSize: '11px', backgroundColor: 'var(--positive)' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const note = prompt("Enter reason for rejection:");
                                if (note !== null) {
                                  verifyUser(u.id, 'rejected', note);
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ height: '28px', padding: '0 8px', fontSize: '11px', color: 'var(--negative)', borderColor: 'var(--negative)' }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ML Monitor Dashboard */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 className="page-title">ML Monitor Dashboard</h2>
            <p className="page-subtitle">Real-time inference logs, latency metrics, and distribution drift details.</p>
          </div>

          {/* KPI Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
            <div className="card">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ACTIVE MODELS</span>
              <h2>4 / 4</h2>
            </div>
            <div className="card">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>AVG. ACCURACY</span>
              <h2 style={{ color: 'var(--positive)' }}>96.4%</h2>
            </div>
            <div className="card">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>AVG. LATENCY</span>
              <h2>42ms</h2>
            </div>
            <div className="card">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>STATUS</span>
              <h2 style={{ color: 'var(--positive)' }}>NOMINAL</h2>
            </div>
          </div>

          {/* Performance heatmap simulation */}
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>Model Performance (Test Accuracy)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div style={{ border: '1px solid var(--border)', padding: '16px', textAlign: 'center', borderRadius: 'var(--radius)' }}>
                <strong>Crop Rec</strong>
                <p style={{ color: 'var(--positive)', fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>98.2%</p>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Random Forest</span>
              </div>
              <div style={{ border: '1px solid var(--border)', padding: '16px', textAlign: 'center', borderRadius: 'var(--radius)' }}>
                <strong>Rainfall</strong>
                <p style={{ color: 'var(--positive)', fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>R² 0.84</p>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>XGBoost Regressor</span>
              </div>
            </div>
          </div>

          {/* System logs */}
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>ML Inference logs</h3>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                backgroundColor: 'var(--surface-tonal)',
                padding: '16px',
                borderRadius: 'var(--radius)',
                maxHeight: '160px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div>[10:44:21] INFO: Initializing batch inference for Yield_v4</div>
              <div>[10:44:23] SUCCESS: 1.2k records processed (0.02ms avg)</div>
              <div>[10:45:01] DEBUG: API Response 200 (OK) from Python ML Service in 12ms</div>
              <div style={{ color: 'var(--positive)' }}>[10:50:00] SUCCESS: Heartbeat nominal. Database connected.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
