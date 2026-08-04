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

interface MlStats {
  mlServiceStatus: 'online' | 'degraded' | 'offline';
  latencyMs: number;
  modelsLoaded: {
    crop_hybrid: boolean;
    crop_legacy: boolean;
    rainfall: boolean;
    embeddings: boolean;
  };
  totalInferences: number;
  modelCounts: {
    crop: number;
    rainfall: number;
  };
  avgConfidence: number | null;
}

interface MlLogItem {
  id: string;
  userId: string;
  farmId: string | null;
  modelType: 'crop' | 'rainfall' | 'fertilizer' | 'yield';
  inputData: any;
  predictionResult: any;
  confidence: number | null;
  createdAt: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
  farm?: {
    id: string;
    name: string;
    district: string;
    state: string;
  } | null;
}

export default function AdminConsole({ activeModule = 'users' }: { activeModule?: 'users' | 'ml' }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pendingProducts, setPendingProducts] = useState<ProductListing[]>([]);
  const [mlStats, setMlStats] = useState<MlStats | null>(null);
  const [mlLogs, setMlLogs] = useState<MlLogItem[]>([]);
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
      } else if (activeModule === 'ml') {
        // 1. Fetch ML Stats & Health
        const statsResponse = await fetch('/api/admin/ml/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setMlStats(statsData);
        }

        // 2. Fetch Real ML Logs
        const logsResponse = await fetch('/api/admin/ml/logs', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (logsResponse.ok) {
          const logsData = await logsResponse.json();
          setMlLogs(logsData);
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

  const formatInputSummary = (log: MlLogItem) => {
    const data = log.inputData || {};
    if (log.modelType === 'crop') {
      const parts = [];
      if (data.N !== undefined) parts.push(`N:${data.N}`);
      if (data.P !== undefined) parts.push(`P:${data.P}`);
      if (data.K !== undefined) parts.push(`K:${data.K}`);
      if (data.ph !== undefined) parts.push(`pH:${data.ph}`);
      if (data.district) parts.push(`Dist:${data.district}`);
      if (data.season) parts.push(`Season:${data.season}`);
      return parts.length > 0 ? parts.join(', ') : JSON.stringify(data);
    }
    if (log.modelType === 'rainfall') {
      return `Year: ${data.year ?? 'N/A'}, Month: ${data.month ?? 'N/A'}`;
    }
    return JSON.stringify(data);
  };

  const formatOutputSummary = (log: MlLogItem) => {
    const res = log.predictionResult || {};
    if (log.modelType === 'crop') {
      const cropName = res.prediction || 'Unknown';
      const conf = res.confidence !== undefined ? ` (${res.confidence}%)` : '';
      return `Recommended Crop: ${cropName}${conf}`;
    }
    if (log.modelType === 'rainfall') {
      const val = res.forecasted_rainfall !== undefined ? `${res.forecasted_rainfall} mm` : 'N/A';
      const cat = res.category ? ` [${res.category}]` : '';
      return `Forecast: ${val}${cat}`;
    }
    return typeof res === 'object' ? JSON.stringify(res) : String(res);
  };

  const loadedModelsCount = mlStats?.modelsLoaded
    ? Object.values(mlStats.modelsLoaded).filter(Boolean).length
    : 0;

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="page-title">ML Monitor Dashboard</h2>
              <p className="page-subtitle">Real-time ML service health, inference logs, and accuracy metrics.</p>
            </div>
            <button
              onClick={fetchAdminData}
              className="btn btn-secondary"
              style={{ fontSize: '12px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🔄 Refresh Health & Logs
            </button>
          </div>

          {/* KPI Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>LOADED MODELS</span>
              <h2>{loadedModelsCount} / 4</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Active ML Assets</span>
            </div>

            <div className="card">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>TOTAL INFERENCES</span>
              <h2>{mlStats?.totalInferences ?? 0}</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {mlStats?.modelCounts?.crop ?? 0} Crop | {mlStats?.modelCounts?.rainfall ?? 0} Rainfall
              </span>
            </div>

            <div className="card">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>AVG. CONFIDENCE</span>
              <h2 style={{ color: mlStats?.avgConfidence ? 'var(--positive)' : 'var(--text-primary)' }}>
                {mlStats?.avgConfidence != null ? `${(mlStats.avgConfidence * 100).toFixed(1)}%` : 'N/A'}
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Based on audit logs</span>
            </div>

            <div className="card">
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>SERVICE STATUS</span>
              <h2 style={{
                color: mlStats?.mlServiceStatus === 'online' ? 'var(--positive)' :
                       mlStats?.mlServiceStatus === 'degraded' ? 'orange' : 'var(--negative)'
              }}>
                {mlStats ? mlStats.mlServiceStatus.toUpperCase() : 'CHECKING...'}
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {mlStats?.latencyMs ? `Ping: ${mlStats.latencyMs}ms` : 'Port 8000'}
              </span>
            </div>
          </div>

          {/* Real Models Health Grid */}
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Registered Model Pipelines & Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Gujarat Crop Recommendation</strong>
                  <span className={`status-badge ${mlStats?.modelsLoaded?.crop_hybrid ? 'approved' : 'rejected'}`}>
                    {mlStats?.modelsLoaded?.crop_hybrid ? 'Loaded' : 'Unavailable'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Pipeline: RandomForest + District/Season Weighting
                </p>
                <div style={{ fontSize: '11px', marginTop: '8px', fontWeight: 'bold' }}>
                  Inferences Logged: {mlStats?.modelCounts?.crop ?? 0}
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Rainfall Forecasting</strong>
                  <span className={`status-badge ${mlStats?.modelsLoaded?.rainfall ? 'approved' : 'rejected'}`}>
                    {mlStats?.modelsLoaded?.rainfall ? 'Loaded' : 'Unavailable'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Pipeline: XGBoost Regressor (12-Month Lag Features)
                </p>
                <div style={{ fontSize: '11px', marginTop: '8px', fontWeight: 'bold' }}>
                  Inferences Logged: {mlStats?.modelCounts?.rainfall ?? 0}
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>RAG Vector Embeddings</strong>
                  <span className={`status-badge ${mlStats?.modelsLoaded?.embeddings ? 'approved' : 'rejected'}`}>
                    {mlStats?.modelsLoaded?.embeddings ? 'Loaded' : 'Unavailable'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Model: SentenceTransformer (all-MiniLM-L6-v2)
                </p>
                <div style={{ fontSize: '11px', marginTop: '8px', fontWeight: 'bold' }}>
                  Used by: Chat & Knowledge Base
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Legacy Crop Model</strong>
                  <span className={`status-badge ${mlStats?.modelsLoaded?.crop_legacy ? 'approved' : 'pending'}`}>
                    {mlStats?.modelsLoaded?.crop_legacy ? 'Loaded' : 'Standby'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Model: Scikit-Learn RandomForest (crop_rf.pkl)
                </p>
                <div style={{ fontSize: '11px', marginTop: '8px', fontWeight: 'bold' }}>
                  Role: Fallback model
                </div>
              </div>
            </div>
          </div>

          {/* Real ML Inference Logs */}
          <div className="card">
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Real-Time ML Inference Logs</h3>
            {loading ? (
              <div>Loading inference logs...</div>
            ) : mlLogs.length === 0 ? (
              <div style={{ padding: '24px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: 'var(--radius)' }}>
                No inference logs recorded yet. Real-time predictions will appear here as users request crop recommendations or rainfall forecasts.
              </div>
            ) : (
              <div className="data-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Model</th>
                      <th>User</th>
                      <th>Farm Location</th>
                      <th>Input Parameters</th>
                      <th>Model Output</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mlLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td>
                          <span className={`status-badge ${log.modelType === 'crop' ? 'approved' : 'pending'}`}>
                            {log.modelType.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          {log.user ? (
                            <div>
                              <strong>{log.user.full_name}</strong>
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{log.user.email}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>System / Guest</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          {log.farm ? `${log.farm.name} (${log.farm.district || ''})` : '-'}
                        </td>
                        <td style={{ fontSize: '11px', fontFamily: 'monospace', maxWidth: '200px', wordBreak: 'break-word' }}>
                          {formatInputSummary(log)}
                        </td>
                        <td style={{ fontSize: '12px', fontWeight: '500' }}>
                          {formatOutputSummary(log)}
                        </td>
                        <td style={{ fontSize: '11px', fontWeight: 'bold' }}>
                          {log.confidence != null ? `${(log.confidence * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
