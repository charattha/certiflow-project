import axios from 'axios';

/**
 * Backend URL. Defaults to the Cloudflare Worker deployment; override via
 * VITE_API_URL at build time for local/docker environments.
 */
const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://certiflow-backend.certiflow.workers.dev';

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

// Auto-redirect to login when token is expired or invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 || error.response?.status === 401) {
      const errorMsg = error.response?.data?.error ?? '';
      const isTokenError =
        errorMsg.includes('Invalid or expired token') ||
        errorMsg.includes('Access denied') ||
        errorMsg.includes('No token provided');

      if (isTokenError) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return new Promise(() => {}); // suppress further error handling
      }
    }
    return Promise.reject(error);
  }
);

export default api;
