import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface Product {
  id: string;
  farmer_id: string;
  crop_name: string;
  crop_category: string;
  quantity: number;
  quantity_unit: string;
  price_per_unit: number;
  description: string;
  quality_grade: string;
  images: string[];
  status: string;
  profiles?: {
    full_name: string;
  };
}

export default function Mandi() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory] = useState('All');

  // Sell Wizard States
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellStep, setSellStep] = useState(1);
  const [cropName, setCropName] = useState('Rice');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('quintal');
  const [grade, setGrade] = useState('A');
  const [price, setPrice] = useState('2200');
  const [desc, setDesc] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sellLoading, setSellLoading] = useState(false);

  // Active orders states
  const [activeTab, setActiveTab] = useState<'buy' | 'orders'>('buy');
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    if (profile) {
      fetchOrders();
    }
  }, [profile, activeTab]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data as Product[]);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSellLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Authentication token not found.");

      let imageUrl = 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg';

      // 1. Optional Image upload to local server
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.url;
        } else {
          console.warn("Failed to upload image, falling back to placeholder.");
        }
      }

      // 2. Insert product listing
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          crop_name: cropName,
          crop_category: 'Cereal',
          quantity: Number(quantity),
          quantity_unit: unit,
          price_per_unit: Number(price),
          quality_grade: grade,
          description: desc,
          images: [imageUrl]
        })
      });

      const resData = await response.json();
      setSellLoading(false);

      if (response.ok) {
        alert("Listing submitted successfully! (Awaiting admin approval)");
        setShowSellModal(false);
        setSellStep(1);
        fetchProducts();
      } else {
        alert("Failed to create product listing: " + (resData.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
      setSellLoading(false);
    }
  };

  // Buy Now direct purchase
  const handleBuyNow = async (product: Product) => {
    if (!profile) return;
    if (product.farmer_id === profile.id) {
      alert("You cannot buy your own listed crop.");
      return;
    }

    const confirmBuy = window.confirm(`Confirm purchase of ${product.quantity} ${product.quantity_unit} of ${product.crop_name} for ₹${product.price_per_unit * product.quantity}?`);
    if (!confirmBuy) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Authentication token not found.");

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: product.quantity,
          total_price: product.price_per_unit * product.quantity,
          payment_method: 'COD'
        })
      });

      const resData = await response.json();

      if (response.ok) {
        alert("Order created successfully! View status in 'My Orders' tab.");
        fetchProducts();
      } else {
        alert("Failed to place order: " + (resData.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Farmer updates order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Confirm payment received
  const confirmPayment = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ payment_status: 'confirmed', status: 'completed' })
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.crop_name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'All' || p.crop_category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('buy')}
          style={{
            flex: 1,
            padding: '12px 0',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'buy' ? '2px solid var(--primary)' : 'none',
            color: activeTab === 'buy' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'buy' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          Browse Mandi
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            flex: 1,
            padding: '12px 0',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '2px solid var(--primary)' : 'none',
            color: activeTab === 'orders' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'orders' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          My Orders
        </button>
      </div>

      {activeTab === 'buy' ? (
        <>
          {/* Sell Button Card */}
          {profile?.role === 'farmer' && (
            <button className="btn btn-primary" onClick={() => setShowSellModal(true)} style={{ width: '100%', height: '40px', gap: '8px' }}>
              <span className="material-symbols-outlined">add</span> Sell New Crop
            </button>
          )}

          {/* Search bar */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search by Crop or Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px' }}>Loading marketplace listings...</div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No active listings found in your area.</div>
          ) : (
            <div className="mandi-grid">
              {filteredProducts.map((p) => (
                <div key={p.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'center' }}>
                  <img
                    src={p.images?.[0] || 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg'}
                    alt={p.crop_name}
                    style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: 'var(--radius)' }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <strong style={{ fontSize: '15px' }}>{p.crop_name}</strong>
                      <span className={`status-badge approved`}>Grade {p.quality_grade}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Farmer: {p.profiles?.full_name || 'Verified Farmer'}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '4px' }}>
                      <span style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: 'bold' }}>
                        ₹{p.price_per_unit} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>/ {p.quantity_unit}</span>
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Total: {p.quantity} {p.quantity_unit}</span>
                    </div>
                  </div>
                  {profile?.role === 'buyer' && (
                    <button
                      onClick={() => handleBuyNow(p)}
                      className="btn btn-primary"
                      style={{ height: '36px', padding: '0 12px', fontSize: '12px' }}
                    >
                      Buy Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Orders tab */
        <div className="orders-grid">
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>No orders registered.</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="card" style={{ gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ORDER ID: ...{o.id.substring(0, 8)}</span>
                  <span className={`status-badge ${o.status === 'completed' ? 'approved' : 'pending'}`}>{o.status}</span>
                </div>
                
                <div style={{ fontSize: '13px' }}>
                  <strong>Crop:</strong> {o.products?.crop_name} ({o.quantity} {o.products?.quantity_unit})
                  <br />
                  <strong>Total price:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>₹{o.total_price}</span>
                  <br />
                  <strong>Payment status:</strong> <span style={{ textTransform: 'capitalize' }}>{o.payment_status} ({o.payment_method})</span>
                </div>

                {/* Status Pipeline Visual representation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: o.status === 'pending' ? 'bold' : 'normal', color: o.status === 'pending' ? 'var(--primary)' : '' }}>Confirmed</span>
                  <span>➔</span>
                  <span style={{ fontWeight: o.status === 'dispatched' ? 'bold' : 'normal', color: o.status === 'dispatched' ? 'var(--primary)' : '' }}>Dispatched</span>
                  <span>➔</span>
                  <span style={{ fontWeight: o.status === 'delivered' ? 'bold' : 'normal', color: o.status === 'delivered' ? 'var(--primary)' : '' }}>Delivered</span>
                </div>

                {/* Action buttons based on Role & Status */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  {profile?.role === 'farmer' && o.status === 'pending' && (
                    <button onClick={() => updateOrderStatus(o.id, 'dispatched')} className="btn btn-primary" style={{ height: '32px', fontSize: '11px' }}>
                      Dispatch Cargo
                    </button>
                  )}
                  {profile?.role === 'farmer' && o.status === 'dispatched' && (
                    <button onClick={() => updateOrderStatus(o.id, 'delivered')} className="btn btn-primary" style={{ height: '32px', fontSize: '11px' }}>
                      Mark Delivered
                    </button>
                  )}
                  {profile?.role === 'farmer' && o.status === 'delivered' && o.payment_status === 'unpaid' && (
                    <button onClick={() => confirmPayment(o.id)} className="btn btn-primary" style={{ height: '32px', fontSize: '11px', backgroundColor: 'var(--positive)' }}>
                      Confirm Cash Received
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sell Wizard Modal */}
      {showSellModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--surface)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <strong style={{ fontSize: '16px' }}>Sell Wizard (Step {sellStep}/3)</strong>
              <button onClick={() => setShowSellModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <form onSubmit={handleSellSubmit} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sellStep === 1 && (
                <>
                  <div className="form-group">
                    <label className="form-label">Crop Name</label>
                    <select className="input-field" value={cropName} onChange={(e) => setCropName(e.target.value)}>
                      {['Rice', 'Maize', 'Tomato', 'Potato', 'Wheat', 'Coffee'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Upload Harvest Photo</label>
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                  </div>
                  <button type="button" onClick={() => setSellStep(2)} className="btn btn-primary" style={{ width: '100%' }}>Next</button>
                </>
              )}

              {sellStep === 2 && (
                <>
                  <div className="form-group">
                    <label className="form-label">Total Quantity</label>
                    <input type="number" className="input-field" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select className="input-field" value={unit} onChange={(e) => setUnit(e.target.value)}>
                      <option value="kg">kg (kilograms)</option>
                      <option value="quintal">quintal</option>
                      <option value="tonne">tonne</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quality Grade</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {['A', 'B', 'C'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGrade(g)}
                          style={{
                            height: '36px',
                            border: grade === g ? '2px solid var(--primary)' : '1px solid var(--border)',
                            backgroundColor: grade === g ? 'var(--positive-bg)' : 'transparent',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Grade {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setSellStep(1)} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
                    <button type="button" onClick={() => setSellStep(3)} className="btn btn-primary" style={{ flex: 1 }}>Next</button>
                  </div>
                </>
              )}

              {sellStep === 3 && (
                <>
                  <div className="form-group">
                    <label className="form-label">Price per Unit (₹)</label>
                    <input type="number" className="input-field" value={price} onChange={(e) => setPrice(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes (Optional)</label>
                    <textarea className="input-field" style={{ height: '60px', padding: '8px' }} value={desc} onChange={(e) => setDesc(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setSellStep(2)} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={sellLoading}>
                      {sellLoading ? 'Submitting...' : 'List Crop'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
