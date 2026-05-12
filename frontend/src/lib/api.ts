import axios from 'axios';

/**
 * Hardcoded backend URL for Cloudflare Worker deployment.
 */
const BACKEND_URL = 'https://certiflow-backend.certiflow.workers.dev';

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

export default api;
