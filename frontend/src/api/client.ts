import type { ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export class FetchError extends Error {
  public status: number;
  public data: ApiError;

  constructor(status: number, data: ApiError) {
    super(data.message);
    this.status = status;
    this.data = data;
  }
}

export const apiClient = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  if (USE_MOCKS) {
    return handleMockRequest<T>(endpoint, options);
  }

  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST'
    });
    
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setAccessToken(data.accessToken);
      headers.set('Authorization', `Bearer ${accessToken}`);
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } else {
      setAccessToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
        traceId: crypto.randomUUID()
      };
    }
    throw new FetchError(response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

async function handleMockRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
  console.log(`[MOCK] ${options.method || 'GET'} ${endpoint}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  if (endpoint === '/auth/login' || endpoint === '/auth/register') {
    return {
      accessToken: 'mock-jwt-token',
      user: {
        id: 'user-1',
        name: 'Mock User',
        email: 'test@example.com',
        role: 'CITIZEN'
      }
    } as T;
  }
  
  if (endpoint === '/auth/me') {
    return {
      id: 'user-1',
      name: 'Mock User',
      email: 'test@example.com',
      role: 'CITIZEN'
    } as T;
  }

  throw new Error(`Mock not implemented for ${endpoint}`);
}
