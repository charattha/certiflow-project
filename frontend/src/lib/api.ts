import axios from 'axios';

/**
 * Centralized axios instance that reads VITE_API_URL from the environment.
 *
 * - In development: VITE_API_URL is not set, so it defaults to '' (empty string),
 *   which means all requests use the Vite dev proxy (see vite.config.ts).
 * - In production (Cloudflare Pages): VITE_API_URL must be set to the deployed
 *   backend URL, e.g. https://certiflow-backend.railway.app
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // Always send cookies (httpOnly JWT) with requests
});

export default api;
