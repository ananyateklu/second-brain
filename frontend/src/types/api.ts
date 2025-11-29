/**
 * API Response and Error Types
 * Centralized types for API communication patterns
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API Error codes for typed error handling
 */
export enum ApiErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Unknown
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom API Error class with typed error codes
 */
export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status?: number;
  public readonly statusText?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ApiErrorCode = ApiErrorCode.UNKNOWN,
    status?: number,
    statusText?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.statusText = statusText;
    this.details = details;
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return [
      ApiErrorCode.UNAUTHORIZED,
      ApiErrorCode.FORBIDDEN,
      ApiErrorCode.TOKEN_EXPIRED,
      ApiErrorCode.INVALID_CREDENTIALS,
    ].includes(this.code);
  }

  /**
   * Check if error is a validation error
   */
  isValidationError(): boolean {
    return [
      ApiErrorCode.VALIDATION_ERROR,
      ApiErrorCode.INVALID_INPUT,
    ].includes(this.code);
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(): boolean {
    return [
      ApiErrorCode.NETWORK_ERROR,
      ApiErrorCode.TIMEOUT,
      ApiErrorCode.SERVICE_UNAVAILABLE,
    ].includes(this.code);
  }

  /**
   * Create ApiError from HTTP status code
   */
  static fromStatus(status: number, message: string, statusText?: string): ApiError {
    let code: ApiErrorCode;
    
    switch (status) {
      case 400:
        code = ApiErrorCode.VALIDATION_ERROR;
        break;
      case 401:
        code = ApiErrorCode.UNAUTHORIZED;
        break;
      case 403:
        code = ApiErrorCode.FORBIDDEN;
        break;
      case 404:
        code = ApiErrorCode.NOT_FOUND;
        break;
      case 409:
        code = ApiErrorCode.ALREADY_EXISTS;
        break;
      case 503:
        code = ApiErrorCode.SERVICE_UNAVAILABLE;
        break;
      default:
        code = status >= 500 ? ApiErrorCode.INTERNAL_ERROR : ApiErrorCode.UNKNOWN;
    }
    
    return new ApiError(message, code, status, statusText);
  }
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * HTTP Methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request configuration options
 */
export interface RequestConfig {
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

