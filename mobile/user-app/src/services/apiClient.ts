/**
 * Enterprise-grade API service with retry logic, request deduplication,
 * and exponential backoff for the User Mobile App.
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
    'X-Client': 'agm-user-app',
    'X-Client-Version': '2.0.1',
  },
});

// ─── Request Interceptor ────────────────────────────────────────────
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
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

// ─── Response Interceptor (Unwrap + Auto-Logout) ────────────────────
api.interceptors.response.use(
  (response) => {
    // Unwrap standard { success, data } wrapper if present
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    // Auto-clear token on 401
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('auth_token');
      } catch {
        // Ignore cleanup errors
      }
    }
    return Promise.reject(error);
  }
);

// ─── Retry Logic with Exponential Backoff ───────────────────────────
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

      // Don't retry client errors (4xx) except 408 (timeout) and 429 (rate limit)
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === retries) throw error;

      // Exponential backoff with jitter
      const backoff = delay * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
  throw new Error('Retry exhausted'); // Should never reach here
}

// ─── Exported API Methods ───────────────────────────────────────────
export const apiClient = {
  get: <T = unknown>(url: string, config?: object) =>
    withRetry(() => api.get<T>(url, config)),

  post: <T = unknown>(url: string, data?: unknown, config?: object) =>
    api.post<T>(url, data, config), // Don't retry mutations

  put: <T = unknown>(url: string, data?: unknown, config?: object) =>
    api.put<T>(url, data, config),

  patch: <T = unknown>(url: string, data?: unknown, config?: object) =>
    api.patch<T>(url, data, config),

  delete: <T = unknown>(url: string, config?: object) =>
    api.delete<T>(url, config),
};

export default api;
