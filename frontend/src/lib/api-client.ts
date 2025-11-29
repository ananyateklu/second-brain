/**
 * Enhanced API Client
 * Centralized HTTP client with typed responses, interceptors, and error handling
 */

import { useAuthStore } from '../store/auth-store';
import { ApiError, ApiErrorCode, RequestConfig } from '../types/api';
import { getApiBaseUrl, TIMEOUTS, RETRY } from './constants';

// ============================================
// Configuration
// ============================================

const API_BASE_URL = getApiBaseUrl();

/**
 * Default request configuration
 */
const defaultConfig: RequestConfig = {
  timeout: TIMEOUTS.API_REQUEST,
  retries: 0,
  retryDelay: RETRY.BASE_DELAY,
};

// ============================================
// Request Interceptors
// ============================================

type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
type ErrorInterceptor = (error: ApiError) => ApiError | Promise<never>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const errorInterceptors: ErrorInterceptor[] = [];

/**
 * Add a request interceptor
 */
export function addRequestInterceptor(interceptor: RequestInterceptor): () => void {
  requestInterceptors.push(interceptor);
  return () => {
    const index = requestInterceptors.indexOf(interceptor);
    if (index > -1) requestInterceptors.splice(index, 1);
  };
}

/**
 * Add a response interceptor
 */
export function addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
  responseInterceptors.push(interceptor);
  return () => {
    const index = responseInterceptors.indexOf(interceptor);
    if (index > -1) responseInterceptors.splice(index, 1);
  };
}

/**
 * Add an error interceptor
 */
export function addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
  errorInterceptors.push(interceptor);
  return () => {
    const index = errorInterceptors.indexOf(interceptor);
    if (index > -1) errorInterceptors.splice(index, 1);
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get authentication headers from the auth store
 */
function getAuthHeaders(): HeadersInit {
  const authStore = useAuthStore.getState();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authStore.token) {
    headers['Authorization'] = `Bearer ${authStore.token}`;
  }

  return headers;
}

/**
 * Map HTTP status to ApiErrorCode
 */
function getErrorCodeFromStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return ApiErrorCode.VALIDATION_ERROR;
    case 401:
      return ApiErrorCode.UNAUTHORIZED;
    case 403:
      return ApiErrorCode.FORBIDDEN;
    case 404:
      return ApiErrorCode.NOT_FOUND;
    case 409:
      return ApiErrorCode.ALREADY_EXISTS;
    case 503:
      return ApiErrorCode.SERVICE_UNAVAILABLE;
    default:
      return status >= 500 ? ApiErrorCode.INTERNAL_ERROR : ApiErrorCode.UNKNOWN;
  }
}

/**
 * Parse error message from response
 */
async function parseErrorMessage(response: Response): Promise<string> {
  const defaultMessage = `Failed to ${response.url.split('/').pop()?.split('?')[0] || 'complete request'}`;
  
  try {
    const errorData = await response.json();
    if (errorData.error) return errorData.error;
    if (errorData.message) return errorData.message;
    if (errorData.title) return errorData.title;
    return defaultMessage;
  } catch {
    return defaultMessage;
  }
}

/**
 * Handle unauthorized response - redirect to login
 */
function handleUnauthorized(): void {
  const authStore = useAuthStore.getState();
  if (authStore.isAuthenticated) {
    authStore.signOut();
  }
  window.location.href = '/login';
}

/**
 * Apply request interceptors
 */
async function applyRequestInterceptors(config: RequestInit): Promise<RequestInit> {
  let result = config;
  for (const interceptor of requestInterceptors) {
    result = await interceptor(result);
  }
  return result;
}

/**
 * Apply response interceptors
 */
async function applyResponseInterceptors(response: Response): Promise<Response> {
  let result = response;
  for (const interceptor of responseInterceptors) {
    result = await interceptor(result);
  }
  return result;
}

/**
 * Apply error interceptors
 */
async function applyErrorInterceptors(error: ApiError): Promise<never> {
  let currentError = error;
  for (const interceptor of errorInterceptors) {
    const result = await interceptor(currentError);
    if (result instanceof ApiError) {
      currentError = result;
    }
  }
  throw currentError;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number, baseDelay: number): number {
  const delay = baseDelay * Math.pow(RETRY.BACKOFF_FACTOR, attempt);
  return Math.min(delay, RETRY.MAX_DELAY);
}

// ============================================
// Core Request Handler
// ============================================

/**
 * Handle API response and extract data
 */
async function handleResponse<T>(response: Response): Promise<T> {
  // Apply response interceptors
  response = await applyResponseInterceptors(response);

  if (!response.ok) {
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      handleUnauthorized();
    }

    const errorMessage = await parseErrorMessage(response);
    const errorCode = getErrorCodeFromStatus(response.status);
    const error = new ApiError(errorMessage, errorCode, response.status, response.statusText);
    
    return applyErrorInterceptors(error);
  }

  // Handle empty responses (like DELETE)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return undefined as T;
}

/**
 * Make a fetch request with retry support
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  config: RequestConfig
): Promise<T> {
  const { retries = 0, retryDelay = RETRY.BASE_DELAY, timeout } = config;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = timeout
        ? setTimeout(() => controller.abort(), timeout)
        : undefined;

      // Merge signals if one was provided
      const signal = config.signal
        ? mergeAbortSignals(config.signal, controller.signal)
        : controller.signal;

      const response = await fetch(url, {
        ...options,
        signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      return await handleResponse<T>(response);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort or client errors
      if (
        error instanceof Error &&
        (error.name === 'AbortError' ||
          (error instanceof ApiError && error.status && error.status < 500))
      ) {
        throw error;
      }

      // If we have retries left, wait and try again
      if (attempt < retries) {
        await sleep(calculateBackoff(attempt, retryDelay));
        continue;
      }
    }
  }

  // If we get here, all retries failed
  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError(
    lastError?.message || 'Request failed after retries',
    ApiErrorCode.NETWORK_ERROR
  );
}

/**
 * Merge multiple abort signals
 */
function mergeAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort());
  }

  return controller.signal;
}

// ============================================
// Public API Client
// ============================================

/**
 * Enhanced API client with typed methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    headers: HeadersInit = {},
    config: Partial<RequestConfig> = {}
  ): Promise<T> {
    const mergedConfig = { ...defaultConfig, ...config };
    let requestInit: RequestInit = {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...headers,
      },
    };

    requestInit = await applyRequestInterceptors(requestInit);

    return fetchWithRetry<T>(`${API_BASE_URL}${endpoint}`, requestInit, mergedConfig);
  },

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    headers: HeadersInit = {},
    config: Partial<RequestConfig> = {}
  ): Promise<T> {
    const mergedConfig = { ...defaultConfig, ...config };
    let requestInit: RequestInit = {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    };

    requestInit = await applyRequestInterceptors(requestInit);

    return fetchWithRetry<T>(`${API_BASE_URL}${endpoint}`, requestInit, mergedConfig);
  },

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body: unknown,
    headers: HeadersInit = {},
    config: Partial<RequestConfig> = {}
  ): Promise<T> {
    const mergedConfig = { ...defaultConfig, ...config };
    let requestInit: RequestInit = {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        ...headers,
      },
      body: JSON.stringify(body),
    };

    requestInit = await applyRequestInterceptors(requestInit);

    return fetchWithRetry<T>(`${API_BASE_URL}${endpoint}`, requestInit, mergedConfig);
  },

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body: unknown,
    headers: HeadersInit = {},
    config: Partial<RequestConfig> = {}
  ): Promise<T> {
    const mergedConfig = { ...defaultConfig, ...config };
    let requestInit: RequestInit = {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        ...headers,
      },
      body: JSON.stringify(body),
    };

    requestInit = await applyRequestInterceptors(requestInit);

    return fetchWithRetry<T>(`${API_BASE_URL}${endpoint}`, requestInit, mergedConfig);
  },

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    headers: HeadersInit = {},
    config: Partial<RequestConfig> = {}
  ): Promise<T> {
    const mergedConfig = { ...defaultConfig, ...config };
    let requestInit: RequestInit = {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        ...headers,
      },
    };

    requestInit = await applyRequestInterceptors(requestInit);

    return fetchWithRetry<T>(`${API_BASE_URL}${endpoint}`, requestInit, mergedConfig);
  },

  /**
   * Stream request (for SSE endpoints)
   */
  async stream(
    endpoint: string,
    body?: unknown,
    headers: HeadersInit = {},
    signal?: AbortSignal
  ): Promise<Response> {
    const authStore = useAuthStore.getState();
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...headers,
    };

    if (authStore.token) {
      requestHeaders['Authorization'] = `Bearer ${authStore.token}`;
    }

    let requestInit: RequestInit = {
      method: 'POST',
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal,
      credentials: 'include',
    };

    requestInit = await applyRequestInterceptors(requestInit);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestInit);

    if (!response.ok) {
      const errorMessage = await parseErrorMessage(response);
      const errorCode = getErrorCodeFromStatus(response.status);
      throw new ApiError(errorMessage, errorCode, response.status, response.statusText);
    }

    return response;
  },

  /**
   * Get the raw URL for an endpoint (useful for SSE/streaming)
   */
  getUrl(endpoint: string): string {
    return `${API_BASE_URL}${endpoint}`;
  },

  /**
   * Get auth headers (useful for external requests)
   */
  getAuthHeaders,
};

// ============================================
// Re-export ApiError for convenience
// ============================================

export { ApiError, ApiErrorCode } from '../types/api';
