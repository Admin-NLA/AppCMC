import axios from "axios";

// ✅ CORREGIDO: Ya NO agregamos /api aquí porque ya viene en VITE_API_URL
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Token automático en cada request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores globalmente
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      fullURL: error.config?.baseURL + error.config?.url, // ← Ver URL completa
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });

    // Si el token expiró, redirigir a login
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
        
    return Promise.reject(error);
  }
);

export default API;