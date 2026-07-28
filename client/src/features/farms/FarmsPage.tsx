import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

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

export default function FarmsPage() {
  useAuth();
  const navigate = useNavigate();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion open states
  const [expandedFarms, setExpandedFarms] = useState<Record<string, boolean>>({});

  // Active 3-dots dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Soil details update modal states
  const [updatingSoilFarm, setUpdatingSoilFarm] = useState<Farm | null>(null);
  const [newPh, setNewPh] = useState('');
  const [newN, setNewN] = useState('');
  const [newP, setNewP] = useState('');
  const [newK, setNewK] = useState('');
  const [newOC, setNewOC] = useState('');
  const [newEc, setNewEc] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Crop rotation update modal states
  const [updatingCropFarm, setUpdatingCropFarm] = useState<Farm | null>(null);
  const [newCrop, setNewCrop] = useState('');
  const [cropSubmitting, setCropSubmitting] = useState(false);

  useEffect(() => {
    fetchFarms();

    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchFarms = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/farms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFarms(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccordion = (farmId: string) => {
    setExpandedFarms(prev => ({
      ...prev,
      [farmId]: !prev[farmId]
    }));
  };

  const handleDeleteFarm = async (id: string) => {
    const confirm = window.confirm('Are you sure you want to delete this farm?');
    if (!confirm) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/farms/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Farm deleted successfully!');
        fetchFarms();
      } else {
        alert('Failed to delete farm.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSoilStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingSoilFarm) return;

    setModalSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/farms/${updatingSoilFarm.id}/soil-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ph: newPh || null,
          nitrogen: newN || null,
          phosphorus: newP || null,
          potassium: newK || null,
          organic_carbon: newOC || null,
          ec: newEc || null
        })
      });

      if (response.ok) {
        alert('Soil parameters updated successfully!');
        setUpdatingSoilFarm(null);
        setNewPh('');
        setNewN('');
        setNewP('');
        setNewK('');
        setNewOC('');
        setNewEc('');
        fetchFarms();
      } else {
        const err = await response.json();
        alert('Failed to update: ' + (err.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error updating soil statistics: ' + err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleUpdateCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingCropFarm) return;

    setCropSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/farms/${updatingCropFarm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          crop_type: newCrop || null
        })
      });

      if (response.ok) {
        alert('Farm crop updated successfully!');
        setUpdatingCropFarm(null);
        setNewCrop('');
        fetchFarms();
      } else {
        const err = await response.json();
        alert('Failed to update crop: ' + (err.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error updating crop: ' + err.message);
    } finally {
      setCropSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>My Farms</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>Manage farm lands, crop rotations & soil parameters</p>
        </div>
        <button 
          onClick={() => navigate('/farmer/farms/create')} 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            backgroundColor: '#059669', 
            color: '#ffffff', 
            padding: '8px 14px', 
            borderRadius: '6px', 
            fontSize: '12px', 
            fontWeight: 600, 
            border: 'none', 
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
          Register Farm
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '13px' }}>
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '24px', marginBottom: '6px' }}>sync</span>
          <p>Loading registered farms...</p>
        </div>
      ) : farms.length === 0 ? (
        <div style={{ padding: '40px', border: '1px dashed #e5e7eb', textAlign: 'center', color: '#6b7280', borderRadius: '8px', backgroundColor: '#ffffff' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#9ca3af', marginBottom: '8px' }}>agriculture</span>
          <h4 style={{ fontSize: '15px', color: '#111827', margin: 0 }}>No Farms Registered Yet</h4>
          <p style={{ margin: '6px 0 16px', fontSize: '12px' }}>Add your farm coordinates, crop details, and soil reports to get started.</p>
          <button onClick={() => navigate('/farmer/farms/create')} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            Register First Farm
          </button>
        </div>
      ) : (
        /* 2 Cards per Row minimal layout */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {farms.map((f) => {
            const hasReports = f.soil_reports && f.soil_reports.length > 0;
            const latestReport = hasReports ? f.soil_reports![0] : null;
            const isExpanded = !!expandedFarms[f.id];

            const locationText = (f.district || f.state)
              ? `${f.district || ''}${f.district && f.state ? ', ' : ''}${f.state || ''}`
              : f.address || `${f.latitude.toFixed(3)}, ${f.longitude.toFixed(3)}`;

            const formattedDate = new Date(f.created_at).toLocaleDateString('en-US');

            return (
              <div 
                key={f.id} 
                style={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '10px', 
                  border: '1px solid #e5e7eb', 
                  borderBottom: '3px solid #10b981',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  padding: '16px 20px', 
                  position: 'relative', 
                  display: 'flex', 
                  flexDirection: 'column'
                }}
              >
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Minimal Avatar Circle */}
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      backgroundColor: '#ecfdf5', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid #a7f3d0'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#059669' }}>
                        potted_plant
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0, lineHeight: 1.2 }}>
                        {f.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#6b7280', fontSize: '11px', marginTop: '3px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#9ca3af' }}>
                          location_on
                        </span>
                        <span>{locationText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Minimal Options Button */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === f.id ? null : f.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Options"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_vert</span>
                    </button>

                    {/* Popover Menu */}
                    {openMenuId === f.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '4px',
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                          border: '1px solid #e5e7eb',
                          zIndex: 50,
                          minWidth: '150px',
                          overflow: 'hidden',
                          padding: '4px 0'
                        }}
                      >
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            setUpdatingCropFarm(f);
                            setNewCrop(f.crop_type || '');
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#059669' }}>sync_alt</span>
                          Rotate Crop
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            setUpdatingSoilFarm(f);
                            if (latestReport) {
                              setNewPh(String(latestReport.ph || ''));
                              setNewN(String(latestReport.nitrogen || ''));
                              setNewP(String(latestReport.phosphorus || ''));
                              setNewK(String(latestReport.potassium || ''));
                              setNewOC(String(latestReport.organic_carbon || ''));
                              setNewEc(String(latestReport.ec || ''));
                            } else {
                              setNewPh('');
                              setNewN('');
                              setNewP('');
                              setNewK('');
                              setNewOC('');
                              setNewEc('');
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#059669' }}>science</span>
                          Update Soil Stats
                        </button>
                        <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '2px 0' }} />
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDeleteFarm(f.id);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#dc2626' }}>delete</span>
                          Delete Farm
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Minimal Thin Divider */}
                <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '12px 0' }} />

                {/* Compact Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center' }}>
                  {/* Current Crop */}
                  <div style={{ borderRight: '1px solid #f3f4f6', paddingRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '11px', fontWeight: 500 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>eco</span>
                      <span>Current Crop</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#059669', marginTop: '4px', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.crop_type || 'Unspecified'}
                    </div>
                  </div>

                  {/* Area */}
                  <div style={{ borderRight: '1px solid #f3f4f6', paddingLeft: '8px', paddingRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '11px', fontWeight: 500 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#9ca3af' }}>edit_note</span>
                      <span>Area</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.area_acres ? `${f.area_acres} Acres` : 'N/A'}
                    </div>
                  </div>

                  {/* Soil Health */}
                  <div style={{ paddingLeft: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '11px', fontWeight: 500 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>water_drop</span>
                      <span>Soil Health</span>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ecfdf5', 
                        color: '#059669', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontWeight: '600', 
                        fontSize: '11px',
                        border: '1px solid #a7f3d0'
                      }}>
                        pH {latestReport?.ph !== null && latestReport?.ph !== undefined ? latestReport.ph : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Minimal Thin Divider */}
                <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '12px 0' }} />

                {/* Footer Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Registration Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', fontSize: '11px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#9ca3af' }}>
                      calendar_month
                    </span>
                    <span>Registered on {formattedDate}</span>
                  </div>

                  {/* View Details Link */}
                  <button
                    onClick={() => toggleAccordion(f.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      color: '#059669',
                      fontWeight: '600',
                      fontSize: '12px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: '2px 0'
                    }}
                  >
                    <span>View Details</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                      {isExpanded ? 'expand_less' : 'arrow_forward'}
                    </span>
                  </button>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px border-dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#f9fafb', padding: '10px', borderRadius: '6px' }}>
                      <div>📍 <strong>Coordinates:</strong> {f.latitude.toFixed(5)}, {f.longitude.toFixed(5)}</div>
                      {f.address && <div>🏠 <strong>Address:</strong> {f.address}</div>}
                      <div>📅 <strong>Created:</strong> {new Date(f.created_at).toLocaleString()}</div>
                    </div>

                    <div style={{ fontWeight: '600', fontSize: '11px', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#059669' }}>analytics</span>
                      Soil Health Parameter Timeline
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                      {hasReports ? (
                        f.soil_reports!.map((report, idx) => (
                          <div key={report.id} style={{ fontSize: '11px', padding: '8px 10px', backgroundColor: '#f9fafb', borderRadius: '6px', borderLeft: idx === 0 ? '3px solid #10b981' : '3px solid #d1d5db' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', marginBottom: '3px', fontSize: '10px', color: '#6b7280' }}>
                              <span>Report #{f.soil_reports!.length - idx} ({report.source_type.toUpperCase()})</span>
                              <span>{new Date(report.created_at).toLocaleDateString()}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px' }}>
                              <div>🧪 <strong>pH:</strong> {report.ph ?? 'N/A'}</div>
                              <div>🧪 <strong>N:</strong> {report.nitrogen ?? 'N/A'}</div>
                              <div>🧪 <strong>P:</strong> {report.phosphorus ?? 'N/A'}</div>
                              <div>🧪 <strong>K:</strong> {report.potassium ?? 'N/A'}</div>
                              <div>🧪 <strong>OC:</strong> {report.organic_carbon ? report.organic_carbon + '%' : 'N/A'}</div>
                              <div>🧪 <strong>EC:</strong> {report.ec ?? 'N/A'}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '11px', color: '#9ca3af', padding: '6px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                          No soil reports logged yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Update Soil Stats Modal */}
      {updatingSoilFarm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '14px' }}>
              <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#111827' }}>
                <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '18px' }}>science</span>
                Update Soil Stats - {updatingSoilFarm.name}
              </strong>
              <button onClick={() => setUpdatingSoilFarm(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#6b7280' }}>✕</button>
            </div>

            <form onSubmit={handleUpdateSoilStats} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>pH</label>
                  <input type="number" step="0.1" className="input-field" required value={newPh} onChange={(e) => setNewPh(e.target.value)} placeholder="e.g. 6.5" style={{ height: '34px', fontSize: '12px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>N (Nitrogen)</label>
                  <input type="number" className="input-field" required value={newN} onChange={(e) => setNewN(e.target.value)} placeholder="e.g. 50 kg/ha" style={{ height: '34px', fontSize: '12px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>P (Phosphorus)</label>
                  <input type="number" className="input-field" required value={newP} onChange={(e) => setNewP(e.target.value)} placeholder="e.g. 40 kg/ha" style={{ height: '34px', fontSize: '12px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>K (Potassium)</label>
                  <input type="number" className="input-field" required value={newK} onChange={(e) => setNewK(e.target.value)} placeholder="e.g. 35 kg/ha" style={{ height: '34px', fontSize: '12px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Organic Carbon (%)</label>
                  <input type="number" step="0.01" className="input-field" value={newOC} onChange={(e) => setNewOC(e.target.value)} placeholder="e.g. 0.55" style={{ height: '34px', fontSize: '12px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>EC (dS/m)</label>
                  <input type="number" step="0.01" className="input-field" value={newEc} onChange={(e) => setNewEc(e.target.value)} placeholder="e.g. 0.85" style={{ height: '34px', fontSize: '12px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setUpdatingSoilFarm(null)} className="btn btn-secondary" style={{ flex: 1, height: '34px', fontSize: '12px' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '34px', fontSize: '12px', backgroundColor: '#059669' }} disabled={modalSubmitting}>
                  {modalSubmitting ? 'Saving...' : 'Save Parameters'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Crop (Crop Rotation) Modal */}
      {updatingCropFarm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '14px' }}>
              <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#111827' }}>
                <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '18px' }}>sync_alt</span>
                Rotate Crop - {updatingCropFarm.name}
              </strong>
              <button onClick={() => setUpdatingCropFarm(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#6b7280' }}>✕</button>
            </div>

            <form onSubmit={handleUpdateCrop} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Current Active Crop</label>
                <input 
                  type="text" 
                  className="input-field" 
                  required 
                  value={newCrop} 
                  onChange={(e) => setNewCrop(e.target.value)} 
                  placeholder="e.g. Wheat, Rice, Cotton" 
                  style={{ height: '34px', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setUpdatingCropFarm(null)} className="btn btn-secondary" style={{ flex: 1, height: '34px', fontSize: '12px' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '34px', fontSize: '12px', backgroundColor: '#059669' }} disabled={cropSubmitting}>
                  {cropSubmitting ? 'Saving...' : 'Update Crop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

