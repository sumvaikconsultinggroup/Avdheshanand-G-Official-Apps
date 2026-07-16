/**
 * Enterprise-grade API service with retry logic and RBAC header injection
 * for the Admin Mobile App.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─── Config ──────────────────────────────────────────────────────────
// Falls back to the one and only production backend for BOTH apps.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://avdheshanandg-dashboard.vercel.app';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

// ─── Create Axios Instance ──────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'agm-admin-app',
    'X-Client-Version': '2.0.1',
  },
});

// ─── Request Interceptor ────────────────────────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync('admin_auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore access failed — continue without token
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ─── Response Interceptor ───────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    // Unwrap standard { success, data } wrapper
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('admin_auth_token');
      } catch {
        // Ignore
      }
    }
    return Promise.reject(error);
  }
);

// ─── Retry with Exponential Backoff ─────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY_MS
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const axiosErr = error as AxiosError;
      const status = axiosErr?.response?.status;

      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        throw error;
      }

      if (attempt === retries) throw error;

      const backoff = delay * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
  throw new Error('Retry exhausted');
}

export const apiClient = {
  get: <T = unknown>(url: string, config?: object) =>
    withRetry(() => api.get<T>(url, config)),

  post: <T = unknown>(url: string, data?: unknown, config?: object) =>
    api.post<T>(url, data, config),

  put: <T = unknown>(url: string, data?: unknown, config?: object) =>
    api.put<T>(url, data, config),

  patch: <T = unknown>(url: string, data?: unknown, config?: object) =>
    api.patch<T>(url, data, config),

  delete: <T = unknown>(url: string, config?: object) =>
    api.delete<T>(url, config),
};

export default api;
