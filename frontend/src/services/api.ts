const RAW_API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
let cleanBase = RAW_API_BASE.trim().replace(/\/+$/, '');
if (cleanBase.startsWith('http') && !cleanBase.endsWith('/api')) {
  cleanBase = `${cleanBase}/api`;
}
const API_BASE = cleanBase;

const ACCESS_TOKEN_KEY = 'looser_token';
const REFRESH_TOKEN_KEY = 'looser_refresh_token';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** Stores a token pair returned by login / refresh / change-password / 2FA disable. */
export function saveSession(session: { token?: string; refreshToken?: string }) {
  if (session.token) localStorage.setItem(ACCESS_TOKEN_KEY, session.token);
  if (session.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

/** Clears local tokens and revokes the refresh token on the server (best effort). */
export function endSession() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  if (refreshToken) {
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      keepalive: true,
    }).catch(() => {});
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function performRefresh(): Promise<string | null> {
  const sentToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!sentToken) return null;

  // Network failures throw here on purpose: being offline must not log the user out.
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: sentToken }),
  });
  const data = await response.json().catch(() => null);

  if (response.ok && data?.token) {
    saveSession(data);
    window.dispatchEvent(new Event('auth:refreshed'));
    return data.token;
  }

  if (response.status === 401) {
    // Another tab may have rotated the token first; if so, adopt the pair it stored.
    if (data?.code === 'REFRESH_STALE') await sleep(1000);
    const currentToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (currentToken && currentToken !== sentToken) {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  }

  throw new ApiError(data?.error || `Session refresh failed with status ${response.status}`, response.status, data);
}

let inflightRefresh: Promise<string | null> | null = null;

/**
 * Returns a new access token, or null when the session is over. Concurrent callers share one
 * request so a burst of 401s only rotates the refresh token once.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!inflightRefresh) {
    inflightRefresh = performRefresh().finally(() => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
}

function handleSessionEnded() {
  endSession();
  window.dispatchEvent(new Event('auth:unauthorized'));
}

async function send(endpoint: string, options: RequestInit) {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const reauthToken = sessionStorage.getItem('looser_reauth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (reauthToken) {
    headers['x-reauth-token'] = reauthToken;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { response, data };
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let { response, data } = await send(endpoint, options);

  // TOKEN_EXPIRED / TOKEN_INVALID come only from the access-token check (not from wrong
  // passwords on login, reauth or note unlock), so they are safe to act on for any endpoint.
  const isAccessTokenFailure =
    response.status === 401 && (data?.code === 'TOKEN_EXPIRED' || data?.code === 'TOKEN_INVALID');

  if (isAccessTokenFailure) {
    let newToken: string | null = null;
    try {
      newToken = await refreshAccessToken();
    } catch {
      // Refresh endpoint unreachable: keep the session and surface the original error.
      throw new ApiError(data?.error || 'Session could not be refreshed', response.status, data);
    }

    if (!newToken) {
      handleSessionEnded();
      throw new ApiError('Session expired. Please sign in again.', 401, data);
    }

    ({ response, data } = await send(endpoint, options));
  }

  if (!response.ok) {
    throw new ApiError(data?.error || `Request failed with status ${response.status}`, response.status, data);
  }

  return data;
}

export const api = {
  get: <T = any>(url: string, options?: RequestInit) => request<T>(url, { ...options, method: 'GET' }),
  post: <T = any>(url: string, body?: any, options?: RequestInit) =>
    request<T>(url, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(url: string, body?: any, options?: RequestInit) =>
    request<T>(url, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(url: string, body?: any, options?: RequestInit) =>
    request<T>(url, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(url: string, body?: any, options?: RequestInit) =>
    request<T>(url, { ...options, method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};
