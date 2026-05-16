import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState(''); // Optional hidden field
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const payload = { name, email, password };
      if (adminSecret) {
        payload.adminSecret = adminSecret;
      }

      const res = await api.post('/auth/register', payload);
      
      // Backend returns: id, name, email, role, token
      const { token, ...userData } = res.data;
      login(token, userData);
      
      if (userData.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
          <p className="text-sm text-slate-500 mt-2">Join to report and track civic issues</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500 transition" 
              placeholder="John Doe"
              required
            />
          </div>
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
              minLength="6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Secret (Optional)</label>
            <input 
              type="password" 
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500 transition bg-slate-50" 
              placeholder="Leave blank for regular user"
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
