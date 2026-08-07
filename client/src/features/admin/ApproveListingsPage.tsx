import { useEffect, useState } from 'react';

interface ProductListing {
  id: string;
  farmer_id: string;
  crop_name: string;
  crop_category?: string;
  quantity: number;
  quantity_unit: string;
  price_per_unit: number;
  quality_grade?: string;
  description?: string;
  images?: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  profiles?: {
    full_name: string;
  };
}

export default function ApproveListingsPage() {
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductListing | null>(null);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/admin/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        showToast('Failed to load listings data');
      }
    } catch (err) {
      console.error('Error fetching admin products:', err);
      showToast('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const moderateProduct = async (productId: string, action: 'approved' | 'rejected') => {
    let rejectionReason: string | null = null;
    if (action === 'rejected') {
      const inputReason = window.prompt("Enter rejection reason note for farmer (optional):", "Quality standards or details incomplete");
      if (inputReason === null) return; // User cancelled
      rejectionReason = inputReason.trim();
    }

    setModeratingId(productId);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: action, rejection_reason: rejectionReason })
      });

      if (response.ok) {
        showToast(`Listing ${action === 'approved' ? 'approved' : 'rejected'} successfully.`);
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, status: action, rejection_reason: rejectionReason } : p))
        );
        if (selectedProduct?.id === productId) {
          setSelectedProduct((prev) => (prev ? { ...prev, status: action, rejection_reason: rejectionReason } : null));
        }
      } else {
        const errorData = await response.json();
        showToast(`Failed to update listing: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while updating status');
    } finally {
      setModeratingId(null);
    }
  };

  // KPI Calculations
  const pendingCount = products.filter((p) => p.status === 'pending').length;
  const approvedCount = products.filter((p) => p.status === 'approved').length;
  const rejectedCount = products.filter((p) => p.status === 'rejected').length;
  const totalCount = products.length;

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesTab = activeTab === 'all' || p.status === activeTab;
    const matchesSearch =
      !searchQuery ||
      p.crop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.profiles?.full_name && p.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.crop_category && p.crop_category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.quality_grade && p.quality_grade.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            backgroundColor: 'var(--surface-tonal)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: '500'
          }}
        >
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '18px' }}>
            info
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '22px', fontWeight: 'bold' }}>
            Listing Approval & Moderation
          </h1>
          <p className="page-subtitle" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Review, verify, and approve farmer crop listings before they appear on the public Mandi marketplace.
          </p>
        </div>
        <button
          onClick={fetchProducts}
          className="btn btn-secondary"
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', height: '36px' }}
        >
          <span className={`material-symbols-outlined ${loading ? 'spin' : ''}`} style={{ fontSize: '16px' }}>
            refresh
          </span>
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div
          className="card"
          onClick={() => setActiveTab('pending')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid #f59e0b',
            backgroundColor: activeTab === 'pending' ? 'var(--secondary-container)' : 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              PENDING REVIEW
            </span>
            <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: '20px' }}>
              pending_actions
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: '#f59e0b' }}>
            {pendingCount}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Awaiting admin decision
          </span>
        </div>

        <div
          className="card"
          onClick={() => setActiveTab('approved')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid var(--positive)',
            backgroundColor: activeTab === 'approved' ? 'var(--secondary-container)' : 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              APPROVED LISTINGS
            </span>
            <span className="material-symbols-outlined" style={{ color: 'var(--positive)', fontSize: '20px' }}>
              check_circle
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: 'var(--positive)' }}>
            {approvedCount}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Live on marketplace
          </span>
        </div>

        <div
          className="card"
          onClick={() => setActiveTab('rejected')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid var(--negative)',
            backgroundColor: activeTab === 'rejected' ? 'var(--secondary-container)' : 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              REJECTED LISTINGS
            </span>
            <span className="material-symbols-outlined" style={{ color: 'var(--negative)', fontSize: '20px' }}>
              cancel
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: 'var(--negative)' }}>
            {rejectedCount}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Needs correction / rejected
          </span>
        </div>

        <div
          className="card"
          onClick={() => setActiveTab('all')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid var(--primary)',
            backgroundColor: activeTab === 'all' ? 'var(--secondary-container)' : 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              TOTAL SUBMISSIONS
            </span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>
              inventory_2
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: 'var(--text-primary)' }}>
            {totalCount}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            All crop records
          </span>
        </div>
      </div>

      {/* Control Bar: Tabs & Search Filter */}
      <div
        className="card"
        style={{
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const labels = {
              pending: `Pending Review (${pendingCount})`,
              approved: `Approved (${approvedCount})`,
              rejected: `Rejected (${rejectedCount})`,
              all: `All Listings (${totalCount})`
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: isActive ? 'bold' : 'normal',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              fontSize: '18px'
            }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Search crop, farmer, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '34px',
              paddingRight: searchQuery ? '30px' : '12px',
              height: '36px',
              fontSize: '12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--background)',
              color: 'var(--text-primary)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Listings Grid / List */}
      {loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <span className="material-symbols-outlined spin" style={{ fontSize: '32px', color: 'var(--primary)', marginBottom: '8px' }}>
            progress_activity
          </span>
          <div>Fetching listings queue...</div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '48px',
            textAlign: 'center',
            border: '2px dashed var(--border)',
            backgroundColor: 'transparent'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            inventory
          </span>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
            No Crop Listings Found
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {searchQuery
              ? `No crop listings match search query "${searchQuery}".`
              : activeTab === 'pending'
              ? 'Great job! There are no crop listings currently awaiting admin approval.'
              : `No ${activeTab} crop listings registered yet.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredProducts.map((product) => {
            const isModerating = moderatingId === product.id;
            const totalValuation = product.price_per_unit * product.quantity;
            const farmerName = product.profiles?.full_name || 'Farmer ID: ' + product.farmer_id;
            const hasImage = product.images && product.images.length > 0;

            return (
              <div
                key={product.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '16px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Crop Image Thumbnail */}
                <div
                  onClick={() => setSelectedProduct(product)}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--surface-tonal)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    position: 'relative'
                  }}
                  title="Click to inspect crop details and photos"
                >
                  {hasImage ? (
                    <>
                      <img
                        src={product.images![0]}
                        alt={product.crop_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {product.images!.length > 1 && (
                        <span style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          backgroundColor: 'rgba(0,0,0,0.75)',
                          color: '#fff',
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          📷 {product.images!.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--primary)' }}>
                      eco
                    </span>
                  )}
                </div>

                {/* Primary Listing Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3
                      onClick={() => setSelectedProduct(product)}
                      style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        margin: 0
                      }}
                    >
                      {product.crop_name}
                    </h3>

                    {product.crop_category && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--surface-tonal)',
                          color: 'var(--text-secondary)',
                          fontWeight: '500'
                        }}
                      >
                        {product.crop_category}
                      </span>
                    )}

                    {product.quality_grade && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          fontWeight: 'bold'
                        }}
                      >
                        Grade {product.quality_grade}
                      </span>
                    )}

                    <span
                      className={`status-badge ${
                        product.status === 'approved'
                          ? 'approved'
                          : product.status === 'rejected'
                          ? 'rejected'
                          : 'pending'
                      }`}
                      style={{ textTransform: 'capitalize', fontSize: '10px', padding: '2px 8px' }}
                    >
                      {product.status}
                    </span>
                  </div>

                  {/* Pricing & Quantity Info */}
                  <div style={{ marginTop: '6px', fontSize: '13px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Quantity: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {product.quantity} {product.quantity_unit}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Asking Price: </span>
                      <strong style={{ color: 'var(--primary)' }}>₹{product.price_per_unit}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}> / {product.quantity_unit}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Est. Valuation: </span>
                      <strong style={{ color: 'var(--positive)' }}>₹{totalValuation.toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
                      {farmerName}
                    </span>

                    {product.createdAt && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_today</span>
                        {new Date(product.createdAt).toLocaleDateString()}
                      </span>
                    )}

                    {product.description && (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                        "{product.description.length > 50 ? product.description.substring(0, 50) + '...' : product.description}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions & Inspect Button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="btn btn-secondary"
                    style={{ height: '30px', fontSize: '11px', padding: '0 10px', width: '100%' }}
                  >
                    View Details
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {product.status === 'pending' && (
                      <>
                        <button
                          onClick={() => moderateProduct(product.id, 'approved')}
                          disabled={isModerating}
                          className="btn btn-primary"
                          style={{
                            height: '32px',
                            fontSize: '11px',
                            padding: '0 12px',
                            backgroundColor: 'var(--positive)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                          Approve
                        </button>

                        <button
                          onClick={() => moderateProduct(product.id, 'rejected')}
                          disabled={isModerating}
                          className="btn btn-secondary"
                          style={{
                            height: '32px',
                            fontSize: '11px',
                            padding: '0 12px',
                            color: 'var(--negative)',
                            borderColor: 'var(--negative)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              borderRadius: '12px',
              backgroundColor: 'var(--surface)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                Crop Listing Inspection
              </h2>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Images Gallery */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Harvest Photos {selectedProduct.images && selectedProduct.images.length > 0 ? `(${selectedProduct.images.length})` : ''}</span>
                {selectedProduct.images && selectedProduct.images.length > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'none', fontWeight: 'normal' }}>
                    Click photo to open full-resolution view ↗
                  </span>
                )}
              </div>

              {selectedProduct.images && selectedProduct.images.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                  {selectedProduct.images.map((img, idx) => (
                    <a
                      key={idx}
                      href={img}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Click to view full-size photo in new tab"
                      style={{ position: 'relative', display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}
                    >
                      <img
                        src={img}
                        alt={`Crop photo ${idx + 1}`}
                        style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                      />
                      <span style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '4px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '4px'
                      }}>
                        Photo #{idx + 1}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    height: '80px',
                    backgroundColor: 'var(--surface-tonal)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '12px'
                  }}
                >
                  No photo uploaded for this listing.
                </div>
              )}
            </div>

            {/* Metadata Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '16px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>CROP NAME</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedProduct.crop_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>CATEGORY</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedProduct.crop_category || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>QUANTITY AVAILABLE</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedProduct.quantity} {selectedProduct.quantity_unit}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>ASKING PRICE</span>
                <strong style={{ color: 'var(--primary)' }}>₹{selectedProduct.price_per_unit} / {selectedProduct.quantity_unit}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>QUALITY GRADE</span>
                <strong style={{ color: 'var(--text-primary)' }}>Grade {selectedProduct.quality_grade || 'Standard'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>FARMER NAME</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedProduct.profiles?.full_name || selectedProduct.farmer_id}</strong>
              </div>
            </div>

            {selectedProduct.description && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', marginBottom: '4px' }}>DESCRIPTION</span>
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--surface-tonal)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)'
                  }}
                >
                  {selectedProduct.description}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setSelectedProduct(null)}
                className="btn btn-secondary"
                style={{ height: '36px', fontSize: '12px' }}
              >
                Close
              </button>

              {selectedProduct.status === 'pending' && (
                <>
                  <button
                    onClick={() => moderateProduct(selectedProduct.id, 'approved')}
                    disabled={moderatingId === selectedProduct.id}
                    className="btn btn-primary"
                    style={{ height: '36px', fontSize: '12px', backgroundColor: 'var(--positive)' }}
                  >
                    Approve Listing
                  </button>
                  <button
                    onClick={() => moderateProduct(selectedProduct.id, 'rejected')}
                    disabled={moderatingId === selectedProduct.id}
                    className="btn btn-secondary"
                    style={{ height: '36px', fontSize: '12px', color: 'var(--negative)', borderColor: 'var(--negative)' }}
                  >
                    Reject Listing
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
