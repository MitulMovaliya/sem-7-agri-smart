import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  rejection_reason?: string | null;
  createdAt?: string;
  profiles?: {
    full_name: string;
  };
}

export default function Mandi() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // Sell Wizard States
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellStep, setSellStep] = useState(1);
  const [cropName, setCropName] = useState('Rice');
  const [customCropName, setCustomCropName] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('quintal');
  const [grade, setGrade] = useState('A');
  const [price, setPrice] = useState('2200');
  const [desc, setDesc] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);

  // Sub-tabs & My Listings states
  const [activeTab, setActiveTab] = useState<'buy' | 'my-listings' | 'orders'>('buy');
  const [myListings, setMyListings] = useState<Product[]>([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'my-listings' || tabParam === 'listings') {
      setActiveTab('my-listings');
    }
  }, [searchParams]);

  // Image preview memory management
  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  const handleImageSelect = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file (PNG, JPG, WEBP, etc.).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit.");
      return;
    }
    setImageFile(file);
  };

  const CROP_CATEGORIES = [
    {
      category: 'Cereals & Grains',
      crops: ['Rice', 'Wheat', 'Maize', 'Barley', 'Bajra', 'Jowar', 'Ragi', 'Oats']
    },
    {
      category: 'Vegetables',
      crops: ['Potato', 'Tomato', 'Onion', 'Garlic', 'Brinjal', 'Chilli', 'Ginger', 'Turmeric', 'Cabbage', 'Cauliflower', 'Okra']
    },
    {
      category: 'Pulses & Legumes',
      crops: ['Chickpea (Chana)', 'Pigeon Pea (Arhar)', 'Moong (Green Gram)', 'Urad (Black Gram)', 'Lentil (Masoor)']
    },
    {
      category: 'Oilseeds',
      crops: ['Mustard', 'Soybean', 'Groundnut', 'Sunflower', 'Sesame']
    },
    {
      category: 'Cash & Commercial Crops',
      crops: ['Cotton', 'Sugarcane', 'Coffee', 'Tea', 'Rubber', 'Jute', 'Tobacco']
    },
    {
      category: 'Fruits',
      crops: ['Mango', 'Banana', 'Apple', 'Citrus', 'Papaya', 'Watermelon', 'Pomegranate', 'Grapes']
    }
  ];

  const POPULAR_QUICK_CROPS = ['Rice', 'Wheat', 'Maize', 'Potato', 'Tomato', 'Cotton', 'Sugarcane', 'Other'];

  useEffect(() => {
    fetchProducts();
    if (profile) {
      fetchOrders();
      fetchMyListings();
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

  const fetchMyListings = async () => {
    if (!profile) return;
    setMyListingsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/products?farmer_id=${profile.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyListings(data as Product[]);
      }
    } catch (err) {
      console.error("Error fetching my listings:", err);
    } finally {
      setMyListingsLoading(false);
    }
  };

  const handleDeleteListing = async (productId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this crop listing?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert("Listing deleted successfully.");
        fetchMyListings();
        fetchProducts();
      } else {
        const data = await response.json();
        alert("Failed to delete listing: " + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
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

    const finalCropName = cropName === 'Other' ? customCropName.trim() : cropName;
    if (!finalCropName) {
      alert("Please select or enter a valid crop name.");
      return;
    }

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
          crop_name: finalCropName,
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
        setImageFile(null);
        setCustomCropName('');
        fetchProducts();
        fetchMyListings();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="mandi-header-banner">
        <div>
          <h1 className="mandi-header-title">🌾 AgriSmart Mandi Marketplace</h1>
          <p className="mandi-header-subtitle">
            {profile?.role === 'farmer'
              ? 'List your harvest and trade directly with verified buyers across India'
              : 'Browse fresh produce directly from verified local farmers'}
          </p>
        </div>
        {profile?.role === 'farmer' && (
          <button
            className="btn btn-primary"
            onClick={() => setShowSellModal(true)}
            style={{
              height: '42px',
              padding: '0 20px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              backgroundColor: '#ffffff',
              color: '#013a13',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              border: 'none',
              fontWeight: '700'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', marginRight: '4px' }}>add_circle</span>
            <span>Sell New Crop</span>
          </button>
        )}
      </div>

      {/* Segmented Pill Tabs */}
      <div className="segmented-tabs">
        <button
          onClick={() => setActiveTab('buy')}
          className={`segmented-tab-item ${activeTab === 'buy' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>storefront</span>
          <span>Browse Mandi</span>
        </button>

        {profile?.role === 'farmer' && (
          <button
            onClick={() => setActiveTab('my-listings')}
            className={`segmented-tab-item ${activeTab === 'my-listings' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>inventory_2</span>
            <span>My Listings ({myListings.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('orders')}
          className={`segmented-tab-item ${activeTab === 'orders' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span>
          <span>My Orders ({orders.length})</span>
        </button>
      </div>

      {activeTab === 'my-listings' ? (
        /* My Crop Listings Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold' }}>My Posted Crops ({myListings.length})</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowSellModal(true)}
              style={{ height: '36px', padding: '0 14px', fontSize: '12px', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span> Sell New Crop
            </button>
          </div>

          {myListingsLoading ? (
            <div style={{ textAlign: 'center', padding: '36px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>Loading your crop listings...</div>
          ) : myListings.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>inventory</span>
              </div>
              <h3 className="empty-state-title">You haven't listed any crops for sale yet</h3>
              <p className="empty-state-subtitle">
                Post your agricultural harvest here to connect directly with buyers and receive competitive market prices.
              </p>
              <button
                onClick={() => setShowSellModal(true)}
                className="btn btn-primary"
                style={{ height: '40px', padding: '0 20px', marginTop: '8px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>add_circle</span>
                List Harvest Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myListings.map((p) => (
                <div key={p.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <img
                      src={p.images?.[0] || 'https://www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg'}
                      alt={p.crop_name}
                      style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: 'var(--radius)' }}
                    />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <strong style={{ fontSize: '16px' }}>{p.crop_name}</strong>
                        <span className={`status-badge ${
                          p.status === 'approved' ? 'approved' :
                          p.status === 'rejected' ? 'rejected' : 'pending'
                        }`}>
                          {p.status === 'approved' ? '🟢 Live / Approved' :
                           p.status === 'rejected' ? '🔴 Rejected' : '🟡 Pending Review'}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Grade: {p.quality_grade} | Quantity: {p.quantity} {p.quantity_unit} | Listed: {new Date(p.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                      <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 'bold', marginTop: '2px' }}>
                        ₹{p.price_per_unit} / {p.quantity_unit} <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Total: ₹{(p.price_per_unit * p.quantity).toLocaleString()})</span>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Note Display */}
                  {p.status === 'rejected' && (
                    <div style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--negative-bg)',
                      border: '1px solid #f5c6cb',
                      borderRadius: 'var(--radius)',
                      color: 'var(--negative)',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                        Admin Rejection Note:
                      </div>
                      <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                        {p.rejection_reason || 'Listing photo or details did not meet marketplace standards. Please delete this item and submit a new listing with clear information.'}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteListing(p.id)}
                      className="btn"
                      style={{ height: '32px', padding: '0 12px', fontSize: '11px', backgroundColor: 'var(--negative-bg)', color: 'var(--negative)' }}
                    >
                      Delete Listing
                    </button>
                    {p.status === 'rejected' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCropName(p.crop_name);
                          setQuantity(String(p.quantity));
                          setUnit(p.quantity_unit);
                          setGrade(p.quality_grade || 'A');
                          setPrice(String(p.price_per_unit));
                          setDesc(p.description || '');
                          setShowSellModal(true);
                        }}
                        className="btn btn-primary"
                        style={{ height: '32px', padding: '0 12px', fontSize: '11px' }}
                      >
                        Re-List Harvest ➔
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'buy' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search & Category Filter Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '20px' }}>search</span>
              <input
                type="text"
                className="input-field"
                placeholder="Search by crop name (e.g. Rice, Wheat, Potato)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '40px', height: '42px', borderRadius: '8px' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cancel</span>
                </button>
              )}
            </div>

            <div className="category-chip-list">
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginRight: '4px' }}>Categories:</span>
              {['All', 'Cereals & Grains', 'Vegetables', 'Pulses & Legumes', 'Oilseeds', 'Fruits', 'Cash & Commercial Crops'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`category-chip ${filterCategory === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              Loading marketplace listings...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>grass</span>
              </div>
              <h3 className="empty-state-title">No crop listings match your search</h3>
              <p className="empty-state-subtitle">
                {search || filterCategory !== 'All'
                  ? `No crops found matching "${search || filterCategory}". Try clearing your search filter or selecting another category.`
                  : 'There are currently no active harvest listings in the marketplace.'}
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                {(search || filterCategory !== 'All') && (
                  <button
                    onClick={() => { setSearch(''); setFilterCategory('All'); }}
                    className="btn btn-secondary"
                    style={{ height: '38px', padding: '0 16px' }}
                  >
                    Clear Search Filter
                  </button>
                )}
                {profile?.role === 'farmer' && (
                  <button
                    onClick={() => setShowSellModal(true)}
                    className="btn btn-primary"
                    style={{ height: '38px', padding: '0 16px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>add</span>
                    List Crop for Sale
                  </button>
                )}
              </div>
            </div>
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
        </div>
      ) : (
        /* Orders tab */
        <div className="orders-grid">
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>No orders registered yet</div>
              <div style={{ fontSize: '12px' }}>Your marketplace orders and cargo tracking will appear here.</div>
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="order-card">
                {/* Header */}
                <div className="order-card-header">
                  <div
                    className="order-id-badge"
                    title="Click to copy full Order ID"
                    onClick={() => {
                      navigator.clipboard.writeText(o.id);
                      alert(`Order ID copied: ${o.id}`);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>ORDER #{o.id.substring(0, 8)}</span>
                  </div>

                  <div className={`order-status-badge ${o.status || 'pending'}`}>
                    {o.status === 'pending' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    )}
                    {o.status === 'dispatched' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="3" width="15" height="13"></rect>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                      </svg>
                    )}
                    {(o.status === 'delivered' || o.status === 'completed') && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    )}
                    <span>{o.status}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="order-card-body">
                  {/* Crop Title & Meta */}
                  <div className="order-crop-header">
                    <div className="order-crop-info">
                      <div className="order-crop-avatar">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 7 0 6-4.5 11-10 11z"></path>
                          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
                        </svg>
                      </div>
                      <div className="order-crop-details">
                        <span className="order-crop-name">{o.products?.crop_name || 'Crop Item'}</span>
                        <span className="order-crop-meta">
                          {o.profiles?.full_name ? `Seller: ${o.profiles.full_name}` : 'Harvest Listing'}
                        </span>
                      </div>
                    </div>

                    <div className="order-quantity-pill">
                      📦 {o.quantity} {o.products?.quantity_unit || 'kg'}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="order-metrics-grid">
                    <div className="order-metric-box">
                      <span className="order-metric-label">Total Price</span>
                      <span className="order-metric-value order-price-text">
                        ₹{Number(o.total_price).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="order-metric-box">
                      <span className="order-metric-label">Payment Status</span>
                      <span className="order-metric-value" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: o.payment_status === 'confirmed' || o.payment_status === 'paid' ? '#16a34a' : '#d97706',
                            display: 'inline-block'
                          }}
                        />
                        <span style={{ textTransform: 'capitalize' }}>
                          {o.payment_status} ({o.payment_method || 'COD'})
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Stepper */}
                  <div className="order-stepper-container">
                    <div className="order-stepper-header">Order Progress</div>
                    <div className="order-stepper-wrapper">
                      <div className="order-stepper-line-bg">
                        <div
                          className="order-stepper-line-progress"
                          style={{
                            width:
                              o.status === 'completed' || o.status === 'delivered'
                                ? '100%'
                                : o.status === 'dispatched'
                                ? '50%'
                                : '0%'
                          }}
                        />
                      </div>

                      {/* Step 1: Confirmed */}
                      <div className={`order-step ${o.status === 'pending' ? 'active' : 'completed'}`}>
                        <div className="order-step-icon-node">
                          {o.status !== 'pending' ? '✓' : '1'}
                        </div>
                        <span className="order-step-text">Confirmed</span>
                      </div>

                      {/* Step 2: Dispatched */}
                      <div className={`order-step ${o.status === 'dispatched' ? 'active' : (o.status === 'delivered' || o.status === 'completed') ? 'completed' : ''}`}>
                        <div className="order-step-icon-node">
                          {(o.status === 'delivered' || o.status === 'completed') ? '✓' : '2'}
                        </div>
                        <span className="order-step-text">Dispatched</span>
                      </div>

                      {/* Step 3: Delivered */}
                      <div className={`order-step ${(o.status === 'delivered' || o.status === 'completed') ? 'completed active' : ''}`}>
                        <div className="order-step-icon-node">
                          {(o.status === 'delivered' || o.status === 'completed') ? '✓' : '3'}
                        </div>
                        <span className="order-step-text">Delivered</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer with action buttons */}
                {profile?.role === 'farmer' && (o.status === 'pending' || o.status === 'dispatched' || (o.status === 'delivered' && o.payment_status === 'unpaid')) && (
                  <div className="order-card-footer">
                    {o.status === 'pending' && (
                      <button
                        onClick={() => updateOrderStatus(o.id, 'dispatched')}
                        className="btn btn-primary"
                        style={{ height: '34px', fontSize: '12px', gap: '6px' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13"></rect>
                          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                          <circle cx="5.5" cy="18.5" r="2.5"></circle>
                          <circle cx="18.5" cy="18.5" r="2.5"></circle>
                        </svg>
                        Dispatch Cargo
                      </button>
                    )}

                    {o.status === 'dispatched' && (
                      <button
                        onClick={() => updateOrderStatus(o.id, 'delivered')}
                        className="btn btn-primary"
                        style={{ height: '34px', fontSize: '12px', gap: '6px' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Mark Delivered
                      </button>
                    )}

                    {o.status === 'delivered' && o.payment_status === 'unpaid' && (
                      <button
                        onClick={() => confirmPayment(o.id)}
                        className="btn btn-primary"
                        style={{ height: '34px', fontSize: '12px', backgroundColor: '#16a34a', borderColor: '#16a34a', gap: '6px' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="1" x2="12" y2="23"></line>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        Confirm Cash Received
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Sell Wizard Modal */}
      {showSellModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', backgroundColor: 'var(--surface)', padding: '24px', borderRadius: '8px' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div>
                <strong style={{ fontSize: '17px', color: 'var(--text-primary)' }}>Sell Harvest Wizard</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Step {sellStep} of 3</div>
              </div>
              <button onClick={() => setShowSellModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            {/* Step Progress Bar */}
            <div style={{ display: 'flex', gap: '6px', margin: '12px 0 16px 0' }}>
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor: sellStep >= s ? 'var(--primary)' : 'var(--border)',
                    transition: 'background-color 0.3s ease'
                  }}
                />
              ))}
            </div>

            <form onSubmit={handleSellSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sellStep === 1 && (
                <>
                  <div className="form-group">
                    <label className="form-label">Crop Name</label>
                    <select
                      className="input-field"
                      value={cropName}
                      onChange={(e) => setCropName(e.target.value)}
                    >
                      {CROP_CATEGORIES.map(cat => (
                        <optgroup key={cat.category} label={cat.category}>
                          {cat.crops.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      ))}
                      <option value="Other">✨ Other (Enter custom crop name)</option>
                    </select>

                    {/* Quick Selection Pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {POPULAR_QUICK_CROPS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCropName(c)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            borderRadius: '12px',
                            border: cropName === c ? '1px solid var(--primary)' : '1px solid var(--border)',
                            backgroundColor: cropName === c ? 'var(--positive-bg)' : 'var(--surface)',
                            color: cropName === c ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: cropName === c ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    {cropName === 'Other' && (
                      <div style={{ marginTop: '10px' }}>
                        <label className="form-label" style={{ marginBottom: '4px' }}>Specify Custom Crop Name</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Type crop name (e.g. Dragonfruit, Cardamom, Cocoa...)"
                          value={customCropName}
                          onChange={(e) => setCustomCropName(e.target.value)}
                          required={cropName === 'Other'}
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* Upload Harvest Photo Drag-and-Drop Dropzone with Preview */}
                  <div className="form-group">
                    <label className="form-label">Upload Harvest Photo</label>
                    {imagePreviewUrl ? (
                      <div style={{
                        position: 'relative',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backgroundColor: 'var(--surface-tonal)'
                      }}>
                        <img
                          src={imagePreviewUrl}
                          alt="Harvest Preview"
                          style={{
                            width: '72px',
                            height: '72px',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)'
                          }}
                        />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {imageFile?.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {imageFile ? (imageFile.size / (1024 * 1024)).toFixed(2) + ' MB' : ''}
                          </div>
                          <div style={{ marginTop: '6px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>
                              Change Photo
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                              />
                            </label>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImageFile(null)}
                          style={{
                            border: 'none',
                            background: 'var(--negative-bg)',
                            color: 'var(--negative)',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                          title="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (e.dataTransfer.files?.[0]) {
                            handleImageSelect(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => {
                          document.getElementById('harvest-photo-input')?.click();
                        }}
                        style={{
                          border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: isDragging ? 'var(--positive-bg)' : 'var(--surface-tonal)',
                          borderRadius: 'var(--radius)',
                          padding: '20px 16px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>
                          cloud_upload
                        </span>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          Click or drag & drop harvest photo
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Supports JPG, PNG, WEBP (Max 10MB)
                        </div>
                        <input
                          id="harvest-photo-input"
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (cropName === 'Other' && !customCropName.trim()) {
                        alert("Please specify the custom crop name.");
                        return;
                      }
                      setSellStep(2);
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Next ➔
                  </button>
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
                    <button type="button" onClick={() => setSellStep(3)} className="btn btn-primary" style={{ flex: 1 }}>Next ➔</button>
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

                  {/* Summary Box */}
                  <div style={{ padding: '12px', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface-tonal)', border: '1px solid var(--border)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Crop:</strong> {cropName === 'Other' ? customCropName : cropName} (Grade {grade})</div>
                    <div><strong>Quantity:</strong> {quantity} {unit}</div>
                    <div><strong>Expected Price:</strong> ₹{price} / {unit} (Total: ₹{(Number(price) * Number(quantity)).toLocaleString()})</div>
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
