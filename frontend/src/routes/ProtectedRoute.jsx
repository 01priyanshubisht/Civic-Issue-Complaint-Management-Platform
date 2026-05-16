import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-gray-500">Loading auth state...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If the user doesn't have the right role, redirect to their default home
    return <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'officer' ? '/officer' : '/dashboard'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
