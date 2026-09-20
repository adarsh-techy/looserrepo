const RAW_API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
let cleanBase = RAW_API_BASE.trim().replace(/\/+$/, '');
if (cleanBase.startsWith('http') && !cleanBase.endsWith('/api')) {
  cleanBase = `${cleanBase}/api`;
}
const API_BASE = cleanBase;

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

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('looser_token');
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

  if (!response.ok) {
    const isTokenFailure =
      response.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/reauth') &&
      !endpoint.includes('/auth/2fa') &&
      !endpoint.includes('/secret-notes/step') &&
      !endpoint.includes('/secret-notes/unlock') &&
      (data?.error === 'Invalid or expired token' || data?.error === 'Authentication token required' || endpoint === '/auth/profile');

    if (isTokenFailure) {
      localStorage.removeItem('looser_token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
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
