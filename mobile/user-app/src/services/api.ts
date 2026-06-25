import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const KNOWN_STALE_OR_NON_API_BASE_URLS = new Set([
  'https://swami-g-dashboard.vercel.app',
  'https://www.avdheshanandg.org',
]);

const PRODUCTION_API_FALLBACKS = ['https://admin.avdheshanandg.org'];
const LOCAL_DEV_API_FALLBACKS = [
  'http://10.0.2.2:3001',
  'http://10.0.2.2:3000',
  'http://10.0.3.2:3001',
  'http://10.0.3.2:3000',
  'http://localhost:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3000',
];

let cachedWorkingBaseUrl: string | null = null;
const invalidBaseUrls = new Set<string>();

function normalizeBaseUrl(url?: string | null): string | null {
  if (!url) return null;
  const normalized = url.trim().replace(/\/+$/, '');
  return normalized || null;
}

function isLocalDevBaseUrl(url?: string | null): boolean {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) return false;

  return (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('10.0.2.2') ||
    normalized.includes('10.0.3.2')
  );
}

function getExpoDevHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (!hostUri) return null;
  return String(hostUri).split(':')[0] || null;
}

function getCandidateBaseUrls(): string[] {
  const fromEnv = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  const expoHost = getExpoDevHost();
  const shouldPreferLocalDev =
    __DEV__ &&
    (!fromEnv ||
      KNOWN_STALE_OR_NON_API_BASE_URLS.has(fromEnv) ||
      isLocalDevBaseUrl(fromEnv));

  const candidates: string[] = [];
  const push = (value?: string | null) => {
    const normalized = normalizeBaseUrl(value);
    if (!normalized || invalidBaseUrls.has(normalized) || candidates.includes(normalized)) return;
    candidates.push(normalized);
  };

  push(cachedWorkingBaseUrl);

  if (shouldPreferLocalDev) {
    push(expoHost ? `http://${expoHost}:3001` : null);
    push(expoHost ? `http://${expoHost}:3000` : null);
    LOCAL_DEV_API_FALLBACKS.forEach(push);
  }

  if (fromEnv && !KNOWN_STALE_OR_NON_API_BASE_URLS.has(fromEnv)) {
    push(fromEnv);
  }

  PRODUCTION_API_FALLBACKS.forEach(push);

  if (!shouldPreferLocalDev && __DEV__) {
    push(expoHost ? `http://${expoHost}:3001` : null);
    push(expoHost ? `http://${expoHost}:3000` : null);
    LOCAL_DEV_API_FALLBACKS.forEach(push);
  }

  return candidates;
}

function isHtmlPayload(data: unknown): boolean {
  return typeof data === 'string' && /<!doctype html|<html/i.test(data);
}

async function probeBaseUrl(baseUrl: string): Promise<boolean> {
  try {
    const response = await axios.get(`${baseUrl}/api/health`, {
      timeout: 1800,
      headers: { Accept: 'application/json' },
    });

    if (isHtmlPayload(response.data)) {
      invalidBaseUrls.add(baseUrl);
      return false;
    }

    cachedWorkingBaseUrl = baseUrl;
    return true;
  } catch {
    invalidBaseUrls.add(baseUrl);
    return false;
  }
}

export async function resolveUserApiBaseUrl(): Promise<string> {
  if (cachedWorkingBaseUrl) return cachedWorkingBaseUrl;

  const candidates = getCandidateBaseUrls();
  for (const candidate of candidates) {
    const ok = await probeBaseUrl(candidate);
    if (ok) return candidate;
  }

  throw new Error(
    'User API unavailable. Start the dashboard backend or set EXPO_PUBLIC_API_URL to a working API.'
  );
}

const api = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use(async (config) => {
  const baseUrl = await resolveUserApiBaseUrl();
  config.baseURL = `${baseUrl}/api`;

  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap { success, data } wrapper from dashboard API
api.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html')) {
      return Promise.reject(
        new Error('API returned HTML instead of JSON. Check EXPO_PUBLIC_API_URL or local backend.')
      );
    }

    // Dashboard API wraps responses as { success: true, data: [...] }
    // Unwrap so screens can use response.data directly as the array/object
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('auth_token');
    }
    return Promise.reject(error);
  }
);

export function getResolvedUserApiBaseUrl() {
  return cachedWorkingBaseUrl;
}

export default api;
