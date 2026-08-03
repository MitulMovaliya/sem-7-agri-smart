import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import FarmerDashboard from '../features/dashboard/FarmerDashboard';
import Predictor from '../features/predictions/Predictor';
import Mandi from '../features/marketplace/Mandi';
import AIHelper from '../features/chat/AIHelper';
import AdminConsole from '../features/admin/AdminConsole';
import ApproveListingsPage from '../features/admin/ApproveListingsPage';
import AdminOrdersPage from '../features/admin/AdminOrdersPage';
import FarmsPage from '../features/farms/FarmsPage';
import CreateFarmPage from '../features/farms/CreateFarmPage';
import LandingPage from '../features/landing/LandingPage';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: ('farmer' | 'buyer' | 'admin')[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { profile, loading, session } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading AgriSmart Terminal...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile && allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/farmer'} replace />;
  }

  return children;
}

export default function AppRoutes() {
  const { profile, session, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading AgriSmart...</div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={session ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/farmer'} replace /> : <Login />} />
      <Route path="/register" element={session ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/farmer'} replace /> : <Register />} />

      {/* Farmer & Buyer Paths */}
      <Route
        path="/farmer"
        element={
          <ProtectedRoute allowedRoles={['farmer', 'buyer']}>
            <FarmerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/predict"
        element={
          <ProtectedRoute allowedRoles={['farmer']}>
            <Predictor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/mandi"
        element={
          <ProtectedRoute allowedRoles={['farmer', 'buyer']}>
            <Mandi />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/chat"
        element={
          <ProtectedRoute allowedRoles={['farmer', 'buyer']}>
            <AIHelper />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/farms"
        element={
          <ProtectedRoute allowedRoles={['farmer']}>
            <FarmsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/farms/create"
        element={
          <ProtectedRoute allowedRoles={['farmer']}>
            <CreateFarmPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Paths */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminConsole />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/approve-listings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ApproveListingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ml"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminConsole activeModule="ml" />
          </ProtectedRoute>
        }
      />


      {/* Fallback redirection to Landing Page */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
