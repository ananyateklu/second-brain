import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Import TokenManager
// Since TokenManager is defined in AuthContext.tsx, we'll need to replicate the interface here
// In a production app, this would be in a shared location
interface ITokenManager {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(accessToken: string, refreshToken: string): void;
  clearTokens(): void;
}

// A mock implementation that will be replaced by the real one
let TokenManager: ITokenManager = {
  getAccessToken: () => null,
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setTokens: (refresh) => {
    localStorage.setItem('refresh_token', refresh);
  },
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

// Will be called by AuthContext to set the real TokenManager
export function setTokenManager(manager: ITokenManager) {
  TokenManager = manager;
}

// Create an Axios instance
const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:5127',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple simultaneous refresh token requests
let isRefreshing = false;
// Store pending requests that are waiting for token refresh
let pendingRequests: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

// Process pending requests after token refresh
const processPendingRequests = (token: string | null) => {
  pendingRequests.forEach(request => {
    if (token) {
      request.config.headers['Authorization'] = `Bearer ${token}`;
      request.resolve(api(request.config));
    } else {
      request.reject(new Error('Unable to refresh token'));
    }
  });
  pendingRequests = [];
};

// Add a request interceptor to include the Authorization header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = TokenManager.getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error instanceof Error ? error : new Error('Request failed'));
  }
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // If error is 401 (Unauthorized) and we haven't retried already
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve,
            reject,
            config: originalRequest
          });
        });
      }

      // Set the retry flag so we don't retry indefinitely
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = TokenManager.getRefreshToken();

        if (!refreshToken) {
          TokenManager.clearTokens();
          window.location.href = '/login';
          return Promise.reject(new Error('No refresh token available'));
        }

        // Request a new token
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh-token`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens
        TokenManager.setTokens(accessToken, newRefreshToken);

        // Process any pending requests
        processPendingRequests(accessToken);

        // Update the original request and retry
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);

        // Process pending requests with failure
        processPendingRequests(null);

        // Clear tokens and redirect to login
        TokenManager.clearTokens();
        window.location.href = '/login';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For errors other than 401, or if token refresh failed, reject normally
    return Promise.reject(error instanceof Error ? error : new Error('Response failed'));
  }
);

export default api;