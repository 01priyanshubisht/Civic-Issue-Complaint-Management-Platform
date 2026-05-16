import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  const getDashboardLink = () => {
    if (user?.role === 'admin' || user?.role === 'officer') return '/admin';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              {/* Professional brand presentation without emoji */}
              <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg tracking-wider">C</span>
              </div>
              <span className="font-semibold text-xl tracking-tight text-slate-800">Civic Platform</span>
            </div>
            <div>
              {isAuthenticated ? (
                <Link to={getDashboardLink()} className="text-sm font-medium text-blue-700 hover:text-blue-900 transition">
                  Access Portal &rarr;
                </Link>
              ) : (
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
                  Log In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            <div className="lg:col-span-6 mb-12 lg:mb-0">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
                Municipal Issue Tracking <br className="hidden lg:block"/>
                <span className="text-blue-700">for Modern Cities</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
                A professional civic management platform designed to accurately report, track, and resolve municipal infrastructure issues. Built for citizens and city administrators.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <Link 
                    to={getDashboardLink()} 
                    className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-slate-800 hover:bg-slate-900 transition"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link 
                      to="/register" 
                      className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-700 hover:bg-blue-800 transition"
                    >
                      Report an Issue
                    </Link>
                    <Link 
                      to="/login" 
                      className="inline-flex justify-center items-center px-6 py-3 border border-slate-300 shadow-sm text-base font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition"
                    >
                      Administrator Login
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="lg:col-span-6">
              <div className="relative rounded-lg shadow-lg overflow-hidden border border-slate-200 bg-slate-200 aspect-[4/3]">
                {/* Embedded the professional AI-generated realistic photo */}
                <img 
                  src="/hero.png" 
                  alt="City Infrastructure Overview" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights - Structured and Professional */}
        <section className="bg-white border-t border-slate-200 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-sm font-semibold text-blue-700 tracking-wide uppercase">System Features</h2>
              <p className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Robust Tracking & Resolution
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 border border-slate-100 rounded-lg bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Geospatial Mapping</h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  Utilizes native HTML5 Geolocation to automatically pinpoint issue coordinates, enabling precise dispatch of maintenance teams to affected municipal sectors.
                </p>
              </div>
              
              <div className="p-6 border border-slate-100 rounded-lg bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Role-Based Access</h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  Strict segregation of duties between public citizens, municipal officers, and system administrators via robust backend JWT authentication and secure routing.
                </p>
              </div>
              
              <div className="p-6 border border-slate-100 rounded-lg bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Status Lifecycle</h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  Complete audit trail and clear status progression from Pending investigation to Active Resolution, providing transparent oversight for the public.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left md:flex justify-between items-center">
          <div>
            <span className="text-white font-bold text-lg tracking-tight">Civic Platform</span>
            <p className="text-slate-400 text-sm mt-2">Municipal Issue Management System</p>
          </div>
          <div className="mt-6 md:mt-0 text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Civic Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
