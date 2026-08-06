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

export default api;
