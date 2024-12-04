import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  baseURL: 'http://localhost:5127',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    } 
    
    return config;
  },
  (error) => {
    return Promise.reject(error instanceof Error ? error : new Error(error?.message || 'Request failed'));
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error instanceof Error ? error : new Error(error?.message || 'Response failed'));
  }
);

export default api;