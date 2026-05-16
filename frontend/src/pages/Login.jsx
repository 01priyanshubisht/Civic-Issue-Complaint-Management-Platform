import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await api.post('/auth/login', { email, password });
      
      // Backend returns: id, name, email, role, token
      const { token, ...userData } = res.data;
      login(token, userData);
      
      if (userData.role === 'admin') navigate('/admin');
      else navigate('/dashboard'); // default user/citizen dashboard
      
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
          <p className="text-sm text-slate-500 mt-2">Sign in to your account to continue</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500 transition" 
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500 transition" 
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
