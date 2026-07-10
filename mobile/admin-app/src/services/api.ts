import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const KNOWN_NON_API_BASE_URLS = new Set([
  'https://swami-g-dashboard.vercel.app',
  'https://www.avdheshanandg.org',
]);

const PRODUCTION_API_FALLBACKS = [
  'https://admin.avdheshanandg.org',
];
// The backend dev port. 3031 first so a moved port is easy to update here.
const DEV_PORTS = ['3031', '3001', '3000'];
const LOCAL_DEV_API_FALLBACKS = ['10.0.2.2', '10.0.3.2', 'localhost', '127.0.0.1'].flatMap((host) =>
  DEV_PORTS.map((port) => `http://${host}:${port}`)
);

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
      KNOWN_NON_API_BASE_URLS.has(fromEnv) ||
      isLocalDevBaseUrl(fromEnv));

  const candidates: string[] = [];
  const push = (value?: string | null) => {
    const normalized = normalizeBaseUrl(value);
    if (!normalized || invalidBaseUrls.has(normalized) || candidates.includes(normalized)) return;
    candidates.push(normalized);
  };

  push(cachedWorkingBaseUrl);

  // Metro is served from the laptop running the backend, so the Expo host IP on
  // the backend dev port is the most reliable target — it survives IP changes
  // and a stale EXPO_PUBLIC_API_URL. Try it first in dev.
  if (__DEV__ && expoHost) {
    DEV_PORTS.forEach((port) => push(`http://${expoHost}:${port}`));
  }

  if (shouldPreferLocalDev) {
    LOCAL_DEV_API_FALLBACKS.forEach(push);
  }

  if (fromEnv && !KNOWN_NON_API_BASE_URLS.has(fromEnv)) {
    push(fromEnv);
  }

  PRODUCTION_API_FALLBACKS.forEach(push);

  if (!shouldPreferLocalDev && __DEV__) {
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

async function resolveWorkingBaseUrl(): Promise<string> {
  if (cachedWorkingBaseUrl) return cachedWorkingBaseUrl;

  const candidates = getCandidateBaseUrls();
  for (const candidate of candidates) {
    const ok = await probeBaseUrl(candidate);
    if (ok) return candidate;
  }

  throw new Error(
    'Admin API unavailable. Start the dashboard backend or set EXPO_PUBLIC_API_URL to a working admin API.'
  );
}

const api = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const baseUrl = await resolveWorkingBaseUrl();
  config.baseURL = `${baseUrl}/api`;

  const token = await SecureStore.getItemAsync('admin_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (isHtmlPayload(response.data)) {
      return Promise.reject(
        new Error('API returned HTML instead of JSON. Check EXPO_PUBLIC_API_URL or local backend.')
      );
    }

    if (response.data && typeof response.data === 'object') {
      if ('success' in response.data && 'data' in response.data) {
        response.data = response.data.data;
      } else if ('allPayments' in response.data) {
        response.data = response.data.allPayments;
      }
    }

    return response;
  },
  (error: AxiosError) => {
    const requestUrl = String(error.config?.url || '');
    const status = error.response?.status;
    const isAuthVerificationRequest = requestUrl.includes('/auth/verify');

    if ((status === 401 || status === 403) && isAuthVerificationRequest) {
      SecureStore.deleteItemAsync('admin_auth_token');
      SecureStore.deleteItemAsync('admin_auth_profile');
    }

    return Promise.reject(error);
  }
);

export function getResolvedAdminApiBaseUrl() {
  return cachedWorkingBaseUrl;
}

export default api;
