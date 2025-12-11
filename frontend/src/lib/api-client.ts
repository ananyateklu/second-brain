/**
 * Enhanced API Client
 * Centralized HTTP client with typed responses, interceptors, and error handling
 */

// Import directly from bound-store to avoid circular dependency
// auth-store re-exports useBoundStore, but importing it causes a cycle
import { useBoundStore } from '../store/bound-store';
import { ApiError, ApiErrorCode, RequestConfig } from '../types/api';
import { getApiBaseUrl, TIMEOUTS, RETRY, isBackendReadyForRequests, waitForBackendReady } from './constants';

// ============================================
// Configuration
// ============================================

// Get API URL dynamically (don't cache - Tauri sets it after module load)
const getApiUrl = () => getApiBaseUrl();

/**
 * Ensure backend is ready before making requests.
 * Throws an error if backend is not ready within timeout.
 */
async function ensureBackendReady(): Promise<void> {
  if (isBackendReadyForRequests()) {
    return;
  }

  // Wait for backend to be ready (with shorter timeout for individual requests)
  try {
    await waitForBackendReady(10000);
  } catch {
    throw new ApiError(
      'Backend is not ready. Please wait for the application to initialize.',
      ApiErrorCode.SERVICE_UNAVAILABLE,
      503
    );
  }
}

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
 * Normalize HeadersInit to a plain object
 */
function normalizeHeaders(headers: HeadersInit): Record<string, string> {
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    const result: Record<string, string> = {};
    headers.forEach(([key, value]) => {
      result[key] = value;
    });
    return result;
  }
  return headers;
}

/**
 * Get authentication headers from the auth store
 */
function getAuthHeaders(): Record<string, string> {
  const authStore = useBoundStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authStore.token !== null && authStore.token.length > 0 && {
      Authorization: `Bearer ${authStore.token}`,
    }),
  };

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
  const defaultMessage = `Failed to ${response.url.split('/').pop()?.split('?')[0] ?? 'complete request'}`;

  try {
    const errorData = await response.json() as { error?: string; message?: string; title?: string };
    if (typeof errorData.error === 'string' && errorData.error.length > 0) {
      return errorData.error;
    }
    if (typeof errorData.message === 'string' && errorData.message.length > 0) {
      return errorData.message;
    }
    if (typeof errorData.title === 'string' && errorData.title.length > 0) {
      return errorData.title;
    }
    return defaultMessage;
  } catch {
    return defaultMessage;
  }
}

/**
 * Handle unauthorized response - redirect to login
 */
function handleUnauthorized(): void {
  const authStore = useBoundStore.getState();
  if (authStore.isAuthenticated) {
    authStore.signOut();
  }
  // Use hash-based URL for Tauri production, regular URL otherwise
  const isTauriProduction = '__TAURI_INTERNALS__' in window && import.meta.env.PROD;
  window.location.href = isTauriProduction ? '/#/login' : '/login';
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
  if (contentType?.includes('application/json') === true) {
    return response.json() as Promise<T>;
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
      const timeoutId = timeout !== undefined && timeout > 0
        ? setTimeout(() => { controller.abort(); }, timeout)
        : undefined;

      // Merge signals if one was provided
      const signal = config.signal
        ? mergeAbortSignals(config.signal, controller.signal)
        : controller.signal;

      const response = await fetch(url, {
        ...options,
        signal,
      });

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      return await handleResponse<T>(response);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort or client errors
      if (
        error instanceof Error &&
        (error.name === 'AbortError' ||
          (error instanceof ApiError && error.status !== undefined && error.status < 500))
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
    lastError?.message ?? 'Request failed after retries',
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
    signal.addEventListener('abort', () => { controller.abort(); });
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
    await ensureBackendReady();

    const mergedConfig = { ...defaultConfig, ...config };
    const requestInit: RequestInit = {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...normalizeHeaders(headers),
      },
    };

    const modifiedInit = await applyRequestInterceptors(requestInit);

    return fetchWithRetry<T>(`${getApiUrl()}${endpoint}`, modifiedInit, mergedConfig);
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
    await ensureBackendReady();

    const mergedConfig = { ...defaultConfig, ...config };
    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...normalizeHeaders(headers),
      },
      ...(body !== null && body !== undefined && { body: JSON.stringify(body) }),
    };

    const modifiedInit = await applyRequestInterceptors(requestInit);

    return fetchWithRetry<T>(`${getApiUrl()}${endpoint}`, modifiedInit, mergedConfig);
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
    await ensureBackendReady();

    const mergedConfig = { ...defaultConfig, ...config };
    const requestInit: RequestInit = {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        ...normalizeHeaders(headers),
      },
      body: JSON.stringify(body),
    };

    const modifiedInit = await applyRequestInterceptors(requestInit);

    return fetchWithRetry<T>(`${getApiUrl()}${endpoint}`, modifiedInit, mergedConfig);
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
    await ensureBackendReady();

    const mergedConfig = { ...defaultConfig, ...config };
    const requestInit: RequestInit = {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        ...normalizeHeaders(headers),
      },
      body: JSON.stringify(body),
    };

    const modifiedInit = await applyRequestInterceptors(requestInit);

    return fetchWithRetry<T>(`${getApiUrl()}${endpoint}`, modifiedInit, mergedConfig);
  },

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    headers: HeadersInit = {},
    config: Partial<RequestConfig> = {}
  ): Promise<T> {
    await ensureBackendReady();

    const mergedConfig = { ...defaultConfig, ...config };
    const requestInit: RequestInit = {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        ...normalizeHeaders(headers),
      },
    };

    const modifiedInit = await applyRequestInterceptors(requestInit);

    return fetchWithRetry<T>(`${getApiUrl()}${endpoint}`, modifiedInit, mergedConfig);
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
    await ensureBackendReady();

    const authStore = useBoundStore.getState();
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...normalizeHeaders(headers),
      ...(authStore.token !== null && authStore.token.length > 0 && {
        Authorization: `Bearer ${authStore.token}`,
      }),
    };

    const requestInit: RequestInit = {
      method: 'POST',
      headers: requestHeaders,
      ...(body !== null && body !== undefined && { body: JSON.stringify(body) }),
      ...(signal !== undefined && { signal }),
      credentials: 'include',
    };

    const modifiedInit = await applyRequestInterceptors(requestInit);

    const response = await fetch(`${getApiUrl()}${endpoint}`, modifiedInit);

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
    return `${getApiUrl()}${endpoint}`;
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
