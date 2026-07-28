import { useEffect, useState } from 'react';

interface OrderItem {
  id: string;
  product_id: string;
  buyer_id: string;
  farmer_id: string;
  quantity: number;
  total_price: number;
  status: 'pending' | 'dispatched' | 'delivered' | 'completed' | 'cancelled' | 'rejected';
  payment_status: 'unpaid' | 'confirmed';
  payment_method: string;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    crop_name: string;
    quantity_unit: string;
    price_per_unit: number;
  } | null;
  buyer?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  farmer?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, paymentFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (paymentFilter !== 'all') queryParams.append('payment_status', paymentFilter);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/orders?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        console.error('Failed to fetch admin orders');
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const updateStatus = async (orderId: string, newStatus?: string, newPaymentStatus?: string) => {
    setUpdatingId(orderId);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const body: any = {};
      if (newStatus) body.status = newStatus;
      if (newPaymentStatus) body.payment_status = newPaymentStatus;

      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updated);
        }
      } else {
        const err = await res.json();
        alert(`Failed to update order: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while updating order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter client-side if user types without pressing submit
  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      o.id.toLowerCase().includes(q) ||
      (o.products?.crop_name && o.products.crop_name.toLowerCase().includes(q)) ||
      (o.buyer?.full_name && o.buyer.full_name.toLowerCase().includes(q)) ||
      (o.buyer?.email && o.buyer.email.toLowerCase().includes(q)) ||
      (o.farmer?.full_name && o.farmer.full_name.toLowerCase().includes(q)) ||
      (o.farmer?.email && o.farmer.email.toLowerCase().includes(q))
    );
  });

  // KPI Computations
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const completedCount = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'status-badge approved';
      case 'dispatched':
        return 'status-badge';
      case 'pending':
        return 'status-badge pending';
      case 'cancelled':
      case 'rejected':
        return 'status-badge rejected';
      default:
        return 'status-badge';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 className="page-title" style={{ fontSize: '22px', marginBottom: '4px' }}>Order & Status Management</h1>
        <p className="page-subtitle" style={{ fontSize: '13px', margin: 0 }}>
          Monitor, filter, and modify order lifecycles and payment statuses across AgriSmart marketplace.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Total Orders
          </div>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0 0' }}>{totalOrders}</h2>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Gross Trade Volume
          </div>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0 0', color: 'var(--primary)' }}>
            ₹{totalRevenue.toLocaleString('en-IN')}
          </h2>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Pending Orders
          </div>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0 0', color: '#eab308' }}>{pendingCount}</h2>
        </div>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Delivered / Completed
          </div>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0 0', color: 'var(--positive)' }}>{completedCount}</h2>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by Crop, Order ID, Buyer, or Farmer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            />
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                color: 'var(--text-secondary)'
              }}
            >
              search
            </span>
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '36px', fontSize: '12px', padding: '0 16px' }}>
            Search
          </button>
          {(statusFilter !== 'all' || paymentFilter !== 'all' || searchQuery !== '') && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setPaymentFilter('all');
                setSearchQuery('');
              }}
              className="btn btn-secondary"
              style={{ height: '36px', fontSize: '12px' }}
            >
              Reset Filters
            </button>
          )}
        </form>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Order Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Status:</span>
            {['all', 'pending', 'dispatched', 'delivered', 'completed', 'cancelled', 'rejected'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  border: statusFilter === st ? '1px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: statusFilter === st ? 'var(--secondary-container)' : 'transparent',
                  color: statusFilter === st ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: statusFilter === st ? 'bold' : 'normal',
                  textTransform: 'capitalize'
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Payment Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Payment:</span>
            {['all', 'unpaid', 'confirmed'].map(p => (
              <button
                key={p}
                onClick={() => setPaymentFilter(p)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  border: paymentFilter === p ? '1px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: paymentFilter === p ? 'var(--secondary-container)' : 'transparent',
                  color: paymentFilter === p ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: paymentFilter === p ? 'bold' : 'normal',
                  textTransform: 'capitalize'
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading platform orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '8px' }}>
              receipt_long
            </span>
            <p style={{ margin: 0, fontSize: '14px' }}>No orders matching the criteria were found.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Crop Product</th>
                  <th>Buyer</th>
                  <th>Farmer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <span
                        title={order.id}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          backgroundColor: 'var(--surface-tonal)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)'
                        }}
                      >
                        #{order.id.slice(0, 8)}
                      </span>
                    </td>

                    <td>
                      <div>
                        <strong>{order.products?.crop_name || 'Crop Listing'}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {order.quantity} {order.products?.quantity_unit || 'units'} @ ₹{order.products?.price_per_unit || 0}/{order.products?.quantity_unit || 'unit'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        <span style={{ fontWeight: '500' }}>{order.buyer?.full_name || 'N/A'}</span>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{order.buyer?.email || ''}</div>
                      </div>
                    </td>

                    <td>
                      <div>
                        <span style={{ fontWeight: '500' }}>{order.farmer?.full_name || 'N/A'}</span>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{order.farmer?.email || ''}</div>
                      </div>
                    </td>

                    <td>
                      <strong style={{ color: 'var(--primary)' }}>
                        ₹{order.total_price?.toLocaleString('en-IN')}
                      </strong>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className={`status-badge ${order.payment_status === 'confirmed' ? 'approved' : 'pending'}`} style={{ width: 'fit-content', fontSize: '10px' }}>
                          {order.payment_status}
                        </span>
                        <button
                          disabled={updatingId === order.id}
                          onClick={() => updateStatus(order.id, undefined, order.payment_status === 'confirmed' ? 'unpaid' : 'confirmed')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '10px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0,
                            textAlign: 'left'
                          }}
                        >
                          Mark {order.payment_status === 'confirmed' ? 'Unpaid' : 'Confirmed'}
                        </button>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className={getStatusBadgeClass(order.status)} style={{ width: 'fit-content', textTransform: 'capitalize' }}>
                          {order.status}
                        </span>

                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          style={{
                            fontSize: '11px',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="pending">pending</option>
                          <option value="dispatched">dispatched</option>
                          <option value="delivered">delivered</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                          <option value="rejected">rejected</option>
                        </select>
                      </div>
                    </td>

                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    <td>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="btn btn-secondary"
                        style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '16px'
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              backgroundColor: 'var(--surface)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Order #{selectedOrder.id.slice(0, 8)}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Full UUID: {selectedOrder.id}</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Product Info */}
              <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Crop Information
                </span>
                <h4 style={{ margin: '4px 0 2px 0', color: 'var(--primary)' }}>{selectedOrder.products?.crop_name || 'Crop Item'}</h4>
                <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span>Quantity: <strong>{selectedOrder.quantity} {selectedOrder.products?.quantity_unit}</strong></span>
                  <span>Unit Price: <strong>₹{selectedOrder.products?.price_per_unit}</strong></span>
                  <span>Total: <strong style={{ color: 'var(--primary)' }}>₹{selectedOrder.total_price}</strong></span>
                </div>
              </div>

              {/* Buyer & Farmer Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Buyer Details
                  </span>
                  <div style={{ marginTop: '4px', fontWeight: 'bold', fontSize: '13px' }}>{selectedOrder.buyer?.full_name || 'N/A'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedOrder.buyer?.email || 'N/A'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>ID: {selectedOrder.buyer_id}</div>
                </div>

                <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Farmer Details
                  </span>
                  <div style={{ marginTop: '4px', fontWeight: 'bold', fontSize: '13px' }}>{selectedOrder.farmer?.full_name || 'N/A'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedOrder.farmer?.email || 'N/A'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>ID: {selectedOrder.farmer_id}</div>
                </div>
              </div>

              {/* Payment & Status Control */}
              <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Transaction & Status Management
                </span>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px' }}>Payment Method: <strong>{selectedOrder.payment_method}</strong></span>
                  <span className={`status-badge ${selectedOrder.payment_status === 'confirmed' ? 'approved' : 'pending'}`}>
                    Payment: {selectedOrder.payment_status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Change Order Status:</label>
                  <select
                    value={selectedOrder.status}
                    disabled={updatingId === selectedOrder.id}
                    onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      fontSize: '12px'
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Change Payment Status:</label>
                  <button
                    disabled={updatingId === selectedOrder.id}
                    onClick={() => updateStatus(selectedOrder.id, undefined, selectedOrder.payment_status === 'confirmed' ? 'unpaid' : 'confirmed')}
                    className="btn btn-secondary"
                    style={{ height: '32px', fontSize: '11px' }}
                  >
                    Mark as {selectedOrder.payment_status === 'confirmed' ? 'Unpaid' : 'Confirmed'}
                  </button>
                </div>
              </div>

              {/* Timestamps */}
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Created: {new Date(selectedOrder.created_at).toLocaleString()}</span>
                <span>Last Updated: {new Date(selectedOrder.updated_at).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-primary" style={{ height: '36px', padding: '0 16px', fontSize: '12px' }}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
