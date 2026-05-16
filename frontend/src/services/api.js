import axios from 'axios';

// Create a centralized Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept outgoing requests to attach the JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept incoming responses to handle global authentication errors
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // Force logout on 401 Unauthorized
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export default api;
