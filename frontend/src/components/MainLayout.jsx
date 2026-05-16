import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'officer') return '/officer';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to={getDashboardLink()} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-lg tracking-wider">C</span>
                </div>
                <span className="font-semibold text-xl text-slate-900 tracking-tight">Civic Platform</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-6">
              <span className="text-sm font-medium text-slate-600 hidden sm:block">
                Welcome, {user?.name} <span className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded ml-1 font-semibold border border-slate-200 uppercase">{user?.role}</span>
              </span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-slate-600 hover:text-red-700 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
