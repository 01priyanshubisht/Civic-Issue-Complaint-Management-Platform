import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import CitizenDashboard from '../pages/CitizenDashboard';
import SubmitComplaint from '../pages/SubmitComplaint';
import AdminDashboard from '../pages/AdminDashboard';
import OfficerDashboard from '../pages/OfficerDashboard';
import ComplaintDetail from '../pages/ComplaintDetail';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/MainLayout';
import { useAuth } from '../context/AuthContext';

const AppRoutes = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center">Loading application...</div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'officer' ? '/officer' : '/dashboard'} />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'officer' ? '/officer' : '/dashboard'} />} />

      {/* Protected Routes with Layout */}
      <Route element={<MainLayout />}>
        
        {/* User (Citizen) Routes */}
        <Route element={<ProtectedRoute allowedRoles={['user', 'citizen']} />}>
          <Route path="/dashboard" element={<CitizenDashboard />} />
          <Route path="/submit" element={<SubmitComplaint />} />
          <Route path="/complaint/:id" element={<ComplaintDetail />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/complaint/:id" element={<ComplaintDetail />} />
        </Route>

        {/* Officer Routes */}
        <Route element={<ProtectedRoute allowedRoles={['officer']} />}>
          <Route path="/officer" element={<OfficerDashboard />} />
          <Route path="/officer/complaint/:id" element={<ComplaintDetail />} />
        </Route>

      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;
