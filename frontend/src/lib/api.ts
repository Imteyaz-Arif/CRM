import axios from 'axios';

// In production, the backend serves the frontend, so we can use relative path '/api'.
// In development (Vite), we point to the backend server.
const isProd = import.meta.env.PROD;
export const api = axios.create({
  baseURL: isProd ? (import.meta.env.VITE_API_URL || '/api') : 'http://localhost:5000/api',
});
